import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

// Cache tiers
export enum CacheTier {
  MEMORY = 'memory',
  REDIS = 'redis',
  NONE = 'none'
}

// Cache priority levels
export enum CachePriority {
  LOW = 'low',       // Non-critical data, can be lost
  MEDIUM = 'medium', // Important but not critical
  HIGH = 'high',     // Critical data that needs persistence
  CRITICAL = 'critical' // Must be stored in Redis
}

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: {
    [CachePriority.LOW]: 60,      // 1 minute
    [CachePriority.MEDIUM]: 300,  // 5 minutes
    [CachePriority.HIGH]: 1800,   // 30 minutes
    [CachePriority.CRITICAL]: 3600 // 1 hour
  },
  MEMORY_CACHE_SIZE: 100, // Maximum items in memory cache
  MEMORY_CACHE_ENABLED: true,
  REDIS_CACHE_ENABLED: true
};

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  priority: CachePriority;
}

// In-memory cache storage (LRU-like implementation)
class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = CACHE_CONFIG.MEMORY_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  // Get item from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.delete(key);
      return null;
    }
    
    // Move to end of Map to implement LRU behavior
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.data as T;
  }

  // Set item in cache
  set<T>(key: string, data: T, ttlSeconds: number, priority: CachePriority): void {
    // If cache is full, remove oldest entry (first in Map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      priority
    });
  }

  // Delete item from cache
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all items from cache
  clear(): void {
    this.cache.clear();
  }
}

// Singleton Redis client
let redisClient: Redis | null = null;

// Get Redis client (lazy initialization)
function getRedisClient(): Redis | null {
  if (!redisClient && CACHE_CONFIG.REDIS_CACHE_ENABLED) {
    const isMainnet = process.env.NEXT_PUBLIC_NETWORK_ENV === 'mainnet';

    const url = isMainnet ? process.env.UPSTASH_REDIS_REST_URL! : process.env.UPSTASH_REDIS_REST_URL_DEV!;
    const token = isMainnet ? process.env.UPSTASH_REDIS_REST_TOKEN! : process.env.UPSTASH_REDIS_REST_TOKEN_DEV!;
    
    if (!url || !token) {
      console.error('Redis URL or token not configured');
      return null;
    }
    
    try {
      redisClient = new Redis({
        url,
        token,
        retry: {
          retries: 3,
          backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 3000)
        }
      });
      console.log('Redis client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      return null;
    }
  }
  
  return redisClient;
}

// Memory cache instance
const memoryCache = new MemoryCache();

// Generate cache key
//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const normalizedParams = Object.entries(params)
    .filter(([value]) => value !== undefined && value !== null)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join('|');
  
  const hash = createHash('md5').update(normalizedParams).digest('hex');
  return `${prefix}:${hash}`;
}

// Determine which cache tier to use based on priority
function determineCacheTier(priority: CachePriority): CacheTier {
  if (priority === CachePriority.CRITICAL) {
    return CacheTier.REDIS;
  }
  
  if (priority === CachePriority.LOW && CACHE_CONFIG.MEMORY_CACHE_ENABLED) {
    return CacheTier.MEMORY;
  }
  
  if ((priority === CachePriority.MEDIUM || priority === CachePriority.HIGH) && 
      CACHE_CONFIG.REDIS_CACHE_ENABLED) {
    return CacheTier.REDIS;
  }
  
  if (CACHE_CONFIG.MEMORY_CACHE_ENABLED) {
    return CacheTier.MEMORY;
  }
  
  return CacheTier.NONE;
}

// Get TTL based on priority
function getTTL(priority: CachePriority, customTTL?: number): number {
  if (customTTL !== undefined) {
    return customTTL;
  }
  
  return CACHE_CONFIG.DEFAULT_TTL[priority];
}

// Get item from cache
export async function getCachedData<T>(
  key: string,
  priority: CachePriority = CachePriority.MEDIUM
): Promise<T | null> {
  try {
    const tier = determineCacheTier(priority);
    
    // Try memory cache first if available
    if (CACHE_CONFIG.MEMORY_CACHE_ENABLED && tier !== CacheTier.NONE) {
      try {
        const memoryData = memoryCache.get<T>(key);
        if (memoryData !== null) {
          return memoryData;
        }
      } catch (memoryError) {
        console.error(`Memory cache get error for key ${key}:`, memoryError);
        // Continue to try Redis if memory cache fails
      }
    }
    
    // Try Redis if needed
    if (tier === CacheTier.REDIS && CACHE_CONFIG.REDIS_CACHE_ENABLED) {
      const redis = getRedisClient();
      if (redis) {
        try {
          const redisData = await redis.get(key);
          if (redisData) {
            // Also store in memory cache for faster access next time
            if (CACHE_CONFIG.MEMORY_CACHE_ENABLED && priority !== CachePriority.CRITICAL) {
              try {
                memoryCache.set(key, redisData, getTTL(priority), priority);
              } catch (memorySetError) {
                console.error(`Memory cache set error for key ${key}:`, memorySetError);
                // Continue even if memory cache set fails
              }
            }
            return redisData as T;
          }
        } catch (error) {
          console.error(`Redis get error for key ${key}:`, error);
          // Continue and return null if Redis fails
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Unexpected error in getCachedData for key ${key}:`, error);
    return null;
  }
}

// Set item in cache
export async function setCachedData<T>(
  key: string,
  data: T,
  priority: CachePriority = CachePriority.MEDIUM,
  ttlSeconds?: number
): Promise<boolean> {
  try {
    const tier = determineCacheTier(priority);
    const finalTTL = getTTL(priority, ttlSeconds);
    
    if (tier === CacheTier.NONE) {
      return false;
    }
    
    let memorySuccess = false;
    
    // Set in memory cache if appropriate
    if (CACHE_CONFIG.MEMORY_CACHE_ENABLED && 
        (tier === CacheTier.MEMORY || priority !== CachePriority.CRITICAL)) {
      try {
        memoryCache.set(key, data, finalTTL, priority);
        memorySuccess = true;
      } catch (memoryError) {
        console.error(`Memory cache set error for key ${key}:`, memoryError);
        // Continue to try Redis if memory cache fails
      }
    }
    
    // Set in Redis if appropriate
    if (tier === CacheTier.REDIS && CACHE_CONFIG.REDIS_CACHE_ENABLED) {
      const redis = getRedisClient();
      if (redis) {
        try {
          await redis.set(key, data, { ex: finalTTL });
          return true;
        } catch (error) {
          console.error(`Redis set error for key ${key}:`, error);
          return memorySuccess; // Return true if at least memory cache worked
        }
      }
    }
    
    return memorySuccess;
  } catch (error) {
    console.error(`Unexpected error in setCachedData for key ${key}:`, error);
    return false;
  }
}

// Delete item from cache
export async function deleteCachedData(key: string): Promise<boolean> {
  let success = true;
  
  // Delete from memory cache
  if (CACHE_CONFIG.MEMORY_CACHE_ENABLED) {
    memoryCache.delete(key);
  }
  
  // Delete from Redis
  if (CACHE_CONFIG.REDIS_CACHE_ENABLED) {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(key);
      } catch (error) {
        console.error(`Redis delete error for key ${key}:`, error);
        success = false;
      }
    }
  }
  
  return success;
}

// Clear cache by prefix
export async function clearCacheByPrefix(prefix: string): Promise<boolean> {
  let success = true;
  
  // Clear from Redis
  if (CACHE_CONFIG.REDIS_CACHE_ENABLED) {
    const redis = getRedisClient();
    if (redis) {
      try {
        const keys = await redis.keys(`${prefix}:*`);
        if (keys.length > 0) {
          // Delete in batches to avoid overwhelming Redis
          const batchSize = 50;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            if (batch.length > 0) {
              await Promise.all(batch.map(key => redis.del(key)));
            }
          }
        }
      } catch (error) {
        console.error(`Redis clear error for prefix ${prefix}:`, error);
        success = false;
      }
    }
  }
  
  return success;
}

// Cached fetch with improved error handling
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  priority: CachePriority = CachePriority.MEDIUM,
  ttlSeconds?: number
): Promise<T> {
  try {
    // Try to get from cache first
    const cachedData = await getCachedData<T>(key, priority);
    if (cachedData !== null) {
      return cachedData;
    }
    
    // If not in cache, fetch fresh data
    const freshData = await fetchFn();
    
    // Store in cache for future requests
    try {
      await setCachedData(key, freshData, priority, ttlSeconds);
    } catch (cacheError) {
      console.error(`Failed to cache data for key ${key}:`, cacheError);
      // Continue even if caching fails - at least return the fresh data
    }
    
    return freshData;
  } catch (error) {
    console.error(`Error in cachedFetch for key ${key}:`, error);
    // If there's an error with the cache, try the fetch function directly
    return fetchFn();
  }
} 