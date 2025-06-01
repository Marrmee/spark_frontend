import { createPool } from '@vercel/postgres';
import { logSecurityEvent } from './securityMonitoring';
import { SecurityEventType } from './securityMonitoring';

// PostgreSQL connection state tracking
const pgConnectionState = {
  isConnected: false,
  lastConnectionAttempt: 0,
  connectionFailures: 0,
  maxRetryInterval: 60000, // 1 minute max retry interval
  baseRetryInterval: 1000, // 1 second base retry interval
};

const connectionString = process.env.CIRCUIT_BREAKER_POSTGRES_URL;

const circuitPool = createPool({
  connectionString,
});

// Initialize PostgreSQL connection with validation
const initializePostgresConnection = async (): Promise<boolean> => {
  // Skip if we've attempted a connection recently (within 5 seconds)
  const now = Date.now();
  if (now - pgConnectionState.lastConnectionAttempt < 5000) {
    return pgConnectionState.isConnected;
  }

  pgConnectionState.lastConnectionAttempt = now;

  try {
    // Initialize PostgreSQL client if not already initialized

    // Create circuit breaker table if it doesn't exist
    await circuitPool.sql`
        CREATE TABLE IF NOT EXISTS circuit_breaker_schema.circuit_breaker (
          service_name TEXT PRIMARY KEY,
          state TEXT NOT NULL,
          failure_rate FLOAT NOT NULL DEFAULT 0,
          timestamp BIGINT NOT NULL,
          success_count INT NOT NULL DEFAULT 0,
          failure_count INT NOT NULL DEFAULT 0,
          total_count INT NOT NULL DEFAULT 0,
          half_open_requests INT NOT NULL DEFAULT 0
        )
      `;

    // Test connection by pinging PostgreSQL
    const pingResult = await circuitPool.sql`SELECT 1 as ping`;
    const isConnected = pingResult.rows[0].ping === 1;

    // Update connection state
    if (isConnected) {
      if (!pgConnectionState.isConnected) {
        console.log('Successfully connected to PostgreSQL');

        // Log reconnection event if we were previously disconnected
        if (pgConnectionState.connectionFailures > 0) {
          logSecurityEvent(
            SecurityEventType.CIRCUIT_RESET,
            {
              connectionFailures: pgConnectionState.connectionFailures,
              downtime: now - pgConnectionState.lastConnectionAttempt,
              message: `PostgreSQL connection restored after ${pgConnectionState.connectionFailures} failed attempts`,
            },
            'medium'
          );
        }

        pgConnectionState.connectionFailures = 0;
      }
      pgConnectionState.isConnected = true;
    } else {
      throw new Error('PostgreSQL ping failed');
    }

    return isConnected;
  } catch (error) {
    // Increment failure count and log error
    pgConnectionState.connectionFailures++;
    pgConnectionState.isConnected = false;

    // Log the error with detailed information
    console.error('PostgreSQL connection error:', error);

    // Log security event for PostgreSQL connection failure
    if (
      pgConnectionState.connectionFailures === 1 ||
      pgConnectionState.connectionFailures % 10 === 0
    ) {
      logSecurityEvent(
        SecurityEventType.CIRCUIT_RESET,
        {
          error: error instanceof Error ? error.message : String(error),
          connectionFailures: pgConnectionState.connectionFailures,
          message: `PostgreSQL connection failed (attempt ${pgConnectionState.connectionFailures})`,
        },
        'high'
      );
    }

    return false;
  }
};

// Safe PostgreSQL operation with fallback
const safePgOperation = async <T>(
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> => {
  try {
    // Try to initialize PostgreSQL connection
    const isConnected = await initializePostgresConnection();

    // If connected, perform the PostgreSQL operation
    if (isConnected && circuitPool) {
      return await operation();
    }

    // If not connected, use fallback
    return await fallback();
  } catch (error) {
    console.error('PostgreSQL operation failed:', error);

    // Use fallback on error
    return await fallback();
  }
};

// Force PostgreSQL reconnection (for admin use)
export const forcePostgresReconnect = (): boolean => {
  // Reset connection state to force reconnection
  pgConnectionState.lastConnectionAttempt = 0;
  pgConnectionState.isConnected = false;

  // Attempt reconnection
  initializePostgresConnection()
    .then((success) => {
      console.log(
        `PostgreSQL reconnection ${success ? 'successful' : 'failed'}`
      );
    })
    .catch((error) => {
      console.error('PostgreSQL reconnection error:', error);
    });

  return true;
};

// Get PostgreSQL connection status
export const getPostgresConnectionStatus = () => {
  return {
    isConnected: pgConnectionState.isConnected,
    lastConnectionAttempt: pgConnectionState.lastConnectionAttempt,
    connectionFailures: pgConnectionState.connectionFailures,
  };
};

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

// In-memory circuit state storage (fallback when PostgreSQL is unavailable)
const inMemoryCircuitStates: Record<
  string,
  {
    state: CircuitState;
    failureRate: number;
    timestamp: number;
    remainingTimeMs: number;
  }
> = {};

// Circuit breaker configuration
const FAILURE_THRESHOLD = 0.5; // 50% failure rate
const RECOVERY_TIMEOUT = 30000; // 30 seconds
const HALF_OPEN_MAX_REQUESTS = 3; // Number of requests to allow in HALF_OPEN state

// Get circuit state from PostgreSQL or in-memory fallback
export const getCircuitState = async (
  serviceName: string
): Promise<CircuitState> => {
  return safePgOperation(
    async () => {
      if (!circuitPool) return CircuitState.CLOSED;

      const result = await circuitPool.sql`
        SELECT state FROM circuit_breaker_schema.circuit_breaker WHERE service_name = ${serviceName}
      `;

      if (result.rows.length > 0) {
        return result.rows[0].state as CircuitState;
      }

      return CircuitState.CLOSED;
    },
    () => {
      // In-memory fallback
      return inMemoryCircuitStates[serviceName]?.state || CircuitState.CLOSED;
    }
  );
};

// Set circuit state in PostgreSQL and in-memory
export const setCircuitState = async (
  serviceName: string,
  state: CircuitState,
  failureRate: number = 0
): Promise<void> => {
  // Update in-memory state
  inMemoryCircuitStates[serviceName] = {
    state,
    failureRate,
    timestamp: Date.now(),
    remainingTimeMs: state === CircuitState.OPEN ? RECOVERY_TIMEOUT : 0,
  };

  // Update PostgreSQL state if available
  await safePgOperation(
    async () => {
      if (!circuitPool) return;

      const now = Date.now();

      // Upsert circuit state
      await circuitPool.sql`
        INSERT INTO circuit_breaker_schema.circuit_breaker (service_name, state, failure_rate, timestamp)
        VALUES (${serviceName}, ${state}, ${failureRate}, ${now})
        ON CONFLICT (service_name) 
        DO UPDATE SET 
          state = ${state}, 
          failure_rate = ${failureRate}, 
          timestamp = ${now}
      `;

      // Reset half_open_requests when transitioning to HALF_OPEN
      if (state === CircuitState.HALF_OPEN) {
        await circuitPool.sql`
          UPDATE circuit_breaker_schema.circuit_breaker 
          SET half_open_requests = 0 
          WHERE service_name = ${serviceName}
        `;
      }
    },
    () => {
      // No-op fallback - already updated in-memory
    }
  );

  // Log state change
  logSecurityEvent(
    SecurityEventType.CIRCUIT_RESET,
    {
      serviceName,
      state,
      failureRate,
      timestamp: Date.now(),
      message: `Circuit breaker for ${serviceName} changed to ${state}`,
    },
    state === CircuitState.OPEN ? 'high' : 'medium'
  );
};

// Record success for a service
export const recordSuccess = async (serviceName: string): Promise<void> => {
  const state = await getCircuitState(serviceName);

  if (state === CircuitState.HALF_OPEN) {
    // If in HALF_OPEN state and successful, transition back to CLOSED
    await setCircuitState(serviceName, CircuitState.CLOSED);
  }

  // Update success count in PostgreSQL if available
  await safePgOperation(
    async () => {
      if (!circuitPool) return;

      const now = Date.now();
      await circuitPool.sql`
        INSERT INTO circuit_breaker_schema.circuit_breaker (service_name, state, success_count, total_count, timestamp, failure_rate)
        VALUES (${serviceName}, ${CircuitState.CLOSED}, 1, 1, ${now}, 0)
        ON CONFLICT (service_name) 
        DO UPDATE SET 
          success_count = circuit_breaker_schema.circuit_breaker.success_count + 1,
          total_count = circuit_breaker_schema.circuit_breaker.total_count + 1,
          timestamp = ${now}
      `;
    },
    () => {
      // No-op fallback - we primarily care about failures
    }
  );
};

// Record failure for a service
export const recordFailure = async (serviceName: string): Promise<void> => {
  const state = await getCircuitState(serviceName);

  if (state === CircuitState.OPEN) {
    // Already open, nothing to do
    return;
  }

  if (state === CircuitState.HALF_OPEN) {
    // If in HALF_OPEN state and failed, go back to OPEN
    await setCircuitState(serviceName, CircuitState.OPEN);
    return;
  }

  // Update failure rate and check threshold
  const failureRate = await safePgOperation(
    async () => {
      if (!circuitPool) return 0;

      const now = Date.now();
      // Update failure and total counts
      await circuitPool.sql`
        INSERT INTO circuit_breaker_schema.circuit_breaker (service_name, state, failure_count, total_count, timestamp, failure_rate)
        VALUES (${serviceName}, ${CircuitState.CLOSED}, 1, 1, ${now}, 1.0)
        ON CONFLICT (service_name) 
        DO UPDATE SET 
          failure_count = circuit_breaker_schema.circuit_breaker.failure_count + 1,
          total_count = circuit_breaker_schema.circuit_breaker.total_count + 1,
          timestamp = ${now}
      `;

      // Calculate failure rate
      const result = await circuitPool.sql`
        SELECT failure_count, total_count 
        FROM circuit_breaker_schema.circuit_breaker 
        WHERE service_name = ${serviceName}
      `;

      if (result.rows.length > 0) {
        const failures = result.rows[0].failure_count;
        const total = result.rows[0].total_count || 1; // Avoid division by zero
        const rate = failures / total;

        // Update failure rate
        await circuitPool.sql`
          UPDATE circuit_breaker_schema.circuit_breaker 
          SET failure_rate = ${rate} 
          WHERE service_name = ${serviceName}
        `;

        return rate;
      }

      return 0;
    },
    () => {
      // In-memory fallback - simplified
      const currentState = inMemoryCircuitStates[serviceName] || {
        state: CircuitState.CLOSED,
        failureRate: 0,
        timestamp: Date.now(),
        remainingTimeMs: 0,
      };

      // Increment failure rate by 0.1 for each failure (simplified approach)
      const newFailureRate = Math.min(currentState.failureRate + 0.1, 1.0);
      inMemoryCircuitStates[serviceName] = {
        ...currentState,
        failureRate: newFailureRate,
      };

      return newFailureRate;
    }
  );

  // If failure rate exceeds threshold, open the circuit
  if (failureRate >= FAILURE_THRESHOLD) {
    await setCircuitState(serviceName, CircuitState.OPEN, failureRate);
  }
};

// Check if a service is available (circuit is not OPEN)
export const isServiceAvailable = async (
  serviceName: string
): Promise<boolean> => {
  const state = await getCircuitState(serviceName);

  if (state === CircuitState.CLOSED) {
    return true;
  }

  if (state === CircuitState.OPEN) {
    // Check if recovery timeout has elapsed
    const timestamp = await safePgOperation(
      async () => {
        if (!circuitPool) return 0;

        const result = await circuitPool.sql`
          SELECT timestamp 
          FROM circuit_breaker_schema.circuit_breaker 
          WHERE service_name = ${serviceName}
        `;

        return result.rows.length > 0 ? parseInt(result.rows[0].timestamp) : 0;
      },
      () => inMemoryCircuitStates[serviceName]?.timestamp || 0
    );

    const now = Date.now();
    const elapsed = now - timestamp;

    // Update remaining time in in-memory state
    if (inMemoryCircuitStates[serviceName]) {
      inMemoryCircuitStates[serviceName].remainingTimeMs = Math.max(
        0,
        RECOVERY_TIMEOUT - elapsed
      );
    }

    // If recovery timeout has elapsed, transition to HALF_OPEN
    if (elapsed >= RECOVERY_TIMEOUT) {
      await setCircuitState(serviceName, CircuitState.HALF_OPEN);
      return true; // Allow the request to go through
    }

    return false; // Circuit is OPEN and timeout hasn't elapsed
  }

  if (state === CircuitState.HALF_OPEN) {
    // In HALF_OPEN state, allow a limited number of requests
    const requestCount = await safePgOperation(
      async () => {
        if (!circuitPool) return 0;

        // Increment half_open_requests counter
        const result = await circuitPool.sql`
          UPDATE circuit_breaker_schema.circuit_breaker 
          SET half_open_requests = half_open_requests + 1 
          WHERE service_name = ${serviceName}
          RETURNING half_open_requests
        `;

        return result.rows.length > 0 ? result.rows[0].half_open_requests : 0;
      },
      () => {
        // In-memory fallback
        const currentState = inMemoryCircuitStates[serviceName];
        if (!currentState) return 0;

        // Simple counter for half-open requests
        currentState.remainingTimeMs = (currentState.remainingTimeMs || 0) + 1;
        return currentState.remainingTimeMs;
      }
    );

    return requestCount <= HALF_OPEN_MAX_REQUESTS;
  }

  return true; // Default to available
};

// Get all circuit statuses
export const getAllCircuitStatuses = async (): Promise<
  Record<
    string,
    {
      state: CircuitState;
      failureRate: number;
      timestamp: number;
      remainingTimeMs: number;
    }
  >
> => {
  return safePgOperation(
    async () => {
      if (!circuitPool) return inMemoryCircuitStates;

      // Get all circuits
      const result = await circuitPool.sql`
        SELECT service_name, state, failure_rate, timestamp 
        FROM circuit_breaker_schema.circuit_breaker
      `;

      const now = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statuses: Record<string, any> = {};

      for (const row of result.rows) {
        const serviceName = row.service_name;
        const state = row.state as CircuitState;
        const timestamp = parseInt(row.timestamp);
        const failureRate = parseFloat(row.failure_rate);

        // Calculate remaining time for OPEN circuits
        let remainingTimeMs = 0;
        if (state === CircuitState.OPEN) {
          const elapsed = now - timestamp;
          remainingTimeMs = Math.max(0, RECOVERY_TIMEOUT - elapsed);
        }

        statuses[serviceName] = {
          state,
          failureRate,
          timestamp,
          remainingTimeMs,
        };

        // Update in-memory state for fallback
        inMemoryCircuitStates[serviceName] = statuses[serviceName];
      }

      return statuses;
    },
    () => {
      // Return in-memory circuit states
      return inMemoryCircuitStates;
    }
  );
};

// Refresh circuit states from PostgreSQL periodically
let refreshInterval: NodeJS.Timeout | null = null;

// Start the refresh interval if in a browser environment
if (typeof window !== 'undefined') {
  refreshInterval = setInterval(async () => {
    try {
      await getAllCircuitStatuses();
    } catch (error) {
      console.error('Error refreshing circuit states:', error);
    }
  }, 60000); // Refresh every minute
}

// Cleanup function for the refresh interval
export const cleanupCircuitBreaker = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

// Record the result of a request (success or failure)
export const recordRequestResult = async (
  serviceName: string,
  success: boolean
): Promise<void> => {
  if (success) {
    await recordSuccess(serviceName);
  } else {
    await recordFailure(serviceName);
  }
};

// Check if a request should be allowed based on circuit breaker state
export const shouldAllowRequest = async (
  serviceName: string
): Promise<{
  allowed: boolean;
  state: CircuitState;
  remainingTimeMs: number;
}> => {
  const state = await getCircuitState(serviceName);
  const allowed = await isServiceAvailable(serviceName);

  // Get remaining time for OPEN circuits
  let remainingTimeMs = 0;
  if (state === CircuitState.OPEN) {
    const timestamp = await safePgOperation(
      async () => {
        if (!circuitPool) return 0;

        const result = await circuitPool.sql`
          SELECT timestamp 
          FROM circuit_breaker_schema.circuit_breaker 
          WHERE service_name = ${serviceName}
        `;

        return result.rows.length > 0 ? parseInt(result.rows[0].timestamp) : 0;
      },
      () => inMemoryCircuitStates[serviceName]?.timestamp || 0
    );

    const elapsed = Date.now() - timestamp;
    remainingTimeMs = Math.max(0, RECOVERY_TIMEOUT - elapsed);
  }

  return {
    allowed,
    state,
    remainingTimeMs,
  };
};

// Initialize PostgreSQL connection on module load
initializePostgresConnection().catch((error) => {
  console.error('Initial PostgreSQL connection failed:', error);
});
