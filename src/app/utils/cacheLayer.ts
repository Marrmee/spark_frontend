import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { logSecurityEvent } from './securityMonitoring';
import { SecurityEventType } from './securityMonitoring';

const isMainnet = process.env.NEXT_PUBLIC_NETWORK_ENV === 'mainnet';

// Initialize Redis publicClient for caching
const redis = new Redis({
  url: isMainnet ? process.env.UPSTASH_REDIS_REST_URL! : process.env.UPSTASH_REDIS_REST_URL_DEV!,
  token: isMainnet ? process.env.UPSTASH_REDIS_REST_TOKEN! : process.env.UPSTASH_REDIS_REST_TOKEN_DEV!,
});

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 300, // 5 minutes
  MAX_TTL: 3600, // 1 hour
  MIN_TTL: 60, // 1 minute
  STALE_WHILE_REVALIDATE: 60, // 1 minute
  MAX_CACHE_SIZE: 1024 * 1024 * 10, // 10MB
  CACHE_BYPASS_THRESHOLD: process.env.NODE_ENV === 'development' ? Infinity : 10, // Unlimited in development
  CACHE_POISONING_THRESHOLD: process.env.NODE_ENV === 'development' ? Infinity : 5, // Unlimited in development
} as const;

interface CacheEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  hash: string;
  timestamp: number;
  ttl: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  bypassAttempts: number;
  poisoningAttempts: number;
}

/**
 * Generate a secure cache key
 * @param request Next.js request object
 * @returns Cache key
 */
function generateCacheKey(request: NextRequest): string {
  const url = new URL(request.url);
  const components = [
    url.pathname,
    url.search,
    request.headers.get('accept') || '',
    request.headers.get('accept-encoding') || '',
    request.headers.get('accept-language') || '',
  ];

  // Create a deterministic key
  return createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}

/**
 * Generate a content hash for cache validation
 * @param content Content to hash
 * @returns Content hash
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateContentHash(content: any): string {
  return createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
}

/**
 * Check if request is cacheable
 * @param request Next.js request object
 * @returns Whether the request can be cached
 */
function isCacheable(request: NextRequest): boolean {
  // Only cache GET and HEAD requests
  if (!['GET', 'HEAD'].includes(request.method)) {
    return false;
  }

  const url = new URL(request.url);

  // Don't cache authenticated requests
  if (request.headers.get('authorization')) {
    return false;
  }

  // Don't cache requests with certain query parameters
  const noCacheParams = ['token', 'auth', 'key', 'secret'];
  for (const param of noCacheParams) {
    if (url.searchParams.has(param)) {
      return false;
    }
  }

  // Don't cache certain paths
  const noCachePaths = [
    '/api/auth',
    '/api/admin',
  ];
  if (noCachePaths.some(path => url.pathname.startsWith(path))) {
    return false;
  }

  return true;
}

/**
 * Monitor cache bypass attempts
 * @param ip Client IP
 * @returns Whether bypass attempt is detected
 */
async function monitorCacheBypass(ip: string): Promise<boolean> {
  // Skip monitoring in development
  if (process.env.NODE_ENV === 'development') {
    return false;
  }

  const key = `cache_bypass:${ip}`;
  const uniqueKeys = await redis.incr(key);
  await redis.expire(key, 3600); // 1 hour window

  if (uniqueKeys > CACHE_CONFIG.CACHE_BYPASS_THRESHOLD) {
    await logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      {
        ip,
        uniqueKeys,
        type: 'cache_bypass_attempt',
      },
      'medium'
    );
    return true;
  }

  return false;
}

/**
 * Monitor cache poisoning attempts
 * @param ip Client IP
 * @returns Whether poisoning attempt is detected
 */
async function monitorCachePoisoning(ip: string): Promise<boolean> {
  // Skip monitoring in development
  if (process.env.NODE_ENV === 'development') {
    return false;
  }

  const key = `cache_poison:${ip}`;
  const attempts = await redis.incr(key);
  await redis.expire(key, 3600); // 1 hour window

  if (attempts > CACHE_CONFIG.CACHE_POISONING_THRESHOLD) {
    await logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      {
        ip,
        attempts,
        type: 'cache_poisoning_attempt',
      },
      'high'
    );
    return true;
  }

  return false;
}

/**
 * Update cache metrics
 * @param metric Metric to update
 */
async function updateMetrics(metric: keyof CacheMetrics): Promise<void> {
  try {
    await redis.hincrby('cache_metrics', metric, 1);
  } catch (error) {
    console.error('Error updating cache metrics:', error);
  }
}

/**
 * Cache middleware for protecting against DDOS
 * @param request Next.js request object
 * @param handler Request handler function
 * @returns Cached response or handler result
 */
export async function cacheLayer(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

  // Check if request is cacheable
  if (!isCacheable(request)) {
    return handler();
  }

  // Generate cache key
  const cacheKey = generateCacheKey(request);

  try {
    // Check for cache bypass attempts
    if (await monitorCacheBypass(ip)) {
      return NextResponse.json(
        { error: 'Too many unique requests' },
        { status: 429 }
      );
    }

    // Try to get from cache
    const cached = await redis.get<CacheEntry>(cacheKey);
    
    if (cached) {
      await updateMetrics('hits');
      
      // Validate cache integrity
      const validHash = generateContentHash(cached.data) === cached.hash;
      if (!validHash) {
        // Potential cache poisoning
        await redis.del(cacheKey);
        if (await monitorCachePoisoning(ip)) {
          return NextResponse.json(
            { error: 'Invalid cache detected' },
            { status: 400 }
          );
        }
      } else {
        // Check if we need to revalidate
        const age = Date.now() - cached.timestamp;
        if (age > cached.ttl * 1000) {
          // Stale content, revalidate in background
          handler().then(async response => {
            const content = await response.json();
            const entry: CacheEntry = {
              data: content,
              hash: generateContentHash(content),
              timestamp: Date.now(),
              ttl: CACHE_CONFIG.DEFAULT_TTL,
            };
            await redis.set(cacheKey, JSON.stringify(entry), {
              ex: entry.ttl,
            });
          }).catch(console.error);
        }

        // Return cached content
        return NextResponse.json(cached.data, {
          headers: {
            'Cache-Control': `public, max-age=${CACHE_CONFIG.DEFAULT_TTL}`,
            'X-Cache': 'HIT',
          },
        });
      }
    }

    // Cache miss
    await updateMetrics('misses');
    
    // Get fresh content
    const response = await handler();
    const content = await response.clone().json();

    // Check content size
    const contentSize = JSON.stringify(content).length;
    if (contentSize > CACHE_CONFIG.MAX_CACHE_SIZE) {
      return response;
    }

    // Store in cache
    const entry: CacheEntry = {
      data: content,
      hash: generateContentHash(content),
      timestamp: Date.now(),
      ttl: CACHE_CONFIG.DEFAULT_TTL,
    };

    await redis.set(cacheKey, JSON.stringify(entry), {
      ex: entry.ttl,
    });

    // Add cache headers
    response.headers.set(
      'Cache-Control',
      `public, max-age=${CACHE_CONFIG.DEFAULT_TTL}`
    );
    response.headers.set('X-Cache', 'MISS');

    return response;
  } catch (error) {
    console.error('Cache layer error:', error);
    // On error, bypass cache
    return handler();
  }
}

/**
 * Purge cache entries
 * @param pattern Cache key pattern to purge
 */
export async function purgeCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redis.del(key)));
      console.log(`Purged ${keys.length} cache entries matching ${pattern}`);
    }
  } catch (error) {
    console.error('Error purging cache:', error);
  }
}

/**
 * Get cache metrics
 * @returns Cache metrics
 */
export async function getCacheMetrics(): Promise<CacheMetrics> {
  try {
    const metrics = await redis.hgetall<Record<string, string>>('cache_metrics') || {};
    return {
      hits: parseInt(metrics.hits || '0', 10),
      misses: parseInt(metrics.misses || '0', 10),
      bypassAttempts: parseInt(metrics.bypassAttempts || '0', 10),
      poisoningAttempts: parseInt(metrics.poisoningAttempts || '0', 10),
    };
  } catch (error) {
    console.error('Error getting cache metrics:', error);
    return {
      hits: 0,
      misses: 0,
      bypassAttempts: 0,
      poisoningAttempts: 0,
    };
  }
} 