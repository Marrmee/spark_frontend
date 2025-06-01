import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { createPool } from '@vercel/postgres';

// Create a pool for security events
const securityPool = createPool({
  connectionString: process.env.SIGNATURE_POSTGRES_URL,
});

interface SecurityEvent {
  id?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  environment?: string;
  userId?: string;
}

/**
 * Validates a security event object
 * @param event The event to validate
 * @returns Validation result
 */
function validateSecurityEvent(event: SecurityEvent): {
  isValid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!event.type) {
    errors.push('Event type is required');
  }
  if (!event.severity) {
    errors.push('Event severity is required');
  }
  if (!event.details || typeof event.details !== 'object') {
    errors.push('Event details must be an object');
  }

  // Validate severity
  if (event.severity && !['low', 'medium', 'high', 'critical'].includes(event.severity)) {
    errors.push('Invalid severity level');
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Determines if an event requires immediate action
 * @param event The security event
 * @returns Whether immediate action is required
 */
function requiresImmediateAction(event: SecurityEvent): boolean {
  // Events that always require immediate action
  if (event.severity === 'critical') {
    return true;
  }

  // Check for specific high-risk event types
  const highRiskTypes = [
    'unauthorized_access',
    'data_breach',
    'malicious_activity',
    'ddos_attack',
    'circuit_reset',
  ];

  if (event.severity === 'high' && highRiskTypes.includes(event.type)) {
    return true;
  }

  return false;
}

/**
 * Gets recommended actions for a security event
 * @param event The security event
 * @returns Array of recommended actions
 */
function getRecommendedActions(event: SecurityEvent): string[] {
  const actions: string[] = [];

  switch (event.severity) {
    case 'critical':
      actions.push('Immediately block source IP');
      actions.push('Alert security team');
      actions.push('Begin incident response');
      break;
    case 'high':
      actions.push('Investigate source IP');
      actions.push('Monitor for pattern');
      actions.push('Consider temporary block');
      break;
    case 'medium':
      actions.push('Log for analysis');
      actions.push('Monitor frequency');
      break;
    case 'low':
      actions.push('Log for reference');
      break;
  }

  return actions;
}

export const POST = async (request: NextRequest) => {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
        
    // Parse the event data
    let event: SecurityEvent;
    try {
      event = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    // Validate the event
    const validation = validateSecurityEvent(event);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid event data', details: validation.errors },
        { status: 400 }
      );
    }
    
    // Add IP and user agent if not already present
    if (!event.ipAddress) {
      event.ipAddress = ip;
    }
    
    if (!event.userAgent) {
      event.userAgent = userAgent;
    }
    
    // Set timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }
    
    // Set environment if not provided
    if (!event.environment) {
      event.environment = process.env.NODE_ENV || 'development';
    }
    
    // Add a unique ID if not provided
    if (!event.id) {
      event.id = uuidv4();
    }
    
    // Check if immediate action is required
    const needsImmediateAction = requiresImmediateAction(event);
    const recommendedActions = getRecommendedActions(event);
    
    // Log the security event to console
    console.log('SECURITY EVENT:', {
      ...event,
      needsImmediateAction,
      recommendedActions,
    });
    
    // Store the event in the database
    try {
      await securityPool.sql`
        INSERT INTO security_events (
          id, 
          event_type, 
          severity, 
          details, 
          ip_address, 
          user_agent, 
          user_id,
          timestamp,
          environment
        ) VALUES (
          ${event.id}, 
          ${event.type === 'circuit_reset' ? 'circuit_reset' : event.type}, 
          ${event.severity}, 
          ${JSON.stringify(event.details)}, 
          ${event.ipAddress}, 
          ${event.userAgent}, 
          ${event.userId || null}, 
          ${event.timestamp},
          ${event.environment}
        )
      `;
      
      console.log(`Security event ${event.id} stored in database`);
    } catch (dbError) {
      console.error('Failed to store security event in database:', dbError);
      // Continue execution - we don't want to fail the API call if DB storage fails
    }
    
    return NextResponse.json({
      success: true,
      eventId: event.id,
      needsImmediateAction,
      recommendedActions,
    });
  } catch (error) {
    console.error('Error logging security event:', error);
    return NextResponse.json(
      { error: 'Failed to log security event' },
      { status: 500 }
    );
  }
}