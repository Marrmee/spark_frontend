import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { recordRequestResult, shouldAllowRequest } from '@/app/utils/circuitBreaker';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

// Service name for monitoring
const SERVICE_NAME = 'invalidate-cache';

/**
 * API endpoint to invalidate Redis cache for proposals
 * This endpoint requires authentication in production
 */
export const POST = async (request: NextRequest) => {
  const startTime = Date.now();
  let success = false;
  
  try {
    // Check circuit breaker
    const circuitCheck = await shouldAllowRequest(SERVICE_NAME);
    if (!circuitCheck.allowed) {
      // Circuit is open, return service unavailable
      return NextResponse.json(
        { 
          error: 'Service temporarily unavailable',
          circuitState: circuitCheck.state,
          retryAfter: Math.ceil(circuitCheck.remainingTimeMs / 1000)
        },
        { 
          status: 503,
          headers: {
            'Retry-After': Math.ceil(circuitCheck.remainingTimeMs / 1000).toString(),
            'X-Circuit-State': circuitCheck.state
          }
        }
      );
    }
    
    // Parse request body
    const { type, targetIndex, action, newIndex } = await request.json();
    
    if (!type || (type !== 'operations' && type !== 'research' && type !== 'all')) {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "operations", "research", or "all"' },
        { status: 400 }
      );
    }
    
    // Handle new proposal scenario efficiently
    if (action === 'newProposal' && newIndex !== undefined) {
      console.log(`🔄 API: Handling new proposal ${newIndex} for ${type}`);
      
      // Special handler for new proposals to avoid invalidating all proposals
      try {
        // 1. Get the current indices list
        const indicesKey = type === 'operations' ? 'operations_sc_indices' : 'research_sc_indices';
        const currentIndices = await redis.get<number[]>(indicesKey) || [];
        
        // 2. Add the new index if not already present
        if (!currentIndices.includes(newIndex)) {
          currentIndices.push(newIndex);
          // Sort in descending order (newest first)
          currentIndices.sort((a, b) => b - a);
          
          // 3. Update the indices list in Redis
          await redis.set(indicesKey, currentIndices);
          console.log(`✅ API: Updated ${indicesKey} with new proposal index ${newIndex}`);
        }
        
        // 4. Only invalidate first page cache which would show the newest proposals
        const firstPageCachePattern = `proposals:${type === 'operations' ? 'ops' : 'res'}:startIndex=*:endIndex=*`;
        const firstPageKeys = await redis.keys(firstPageCachePattern);
        
        if (firstPageKeys.length > 0) {
          await Promise.all(firstPageKeys.map(key => redis.del(key)));
          console.log(`✅ API: Invalidated ${firstPageKeys.length} first page cache entries`);
        }
        
        // 5. Also purge cacheLayer first page if available
        try {
          const { purgeCache } = await import('@/app/utils/cacheLayer');
          await purgeCache(`cache:*${type === 'operations' ? 'ops' : 'res'}*page=1*`);
          console.log(`✅ API: Purged cacheLayer first page entries`);
        } catch (error) {
          // cacheLayer might not be fully implemented yet
          console.log('Note: cacheLayer purging not available for new proposal');
        }
        
        success = true; // Mark operation as successful
        return NextResponse.json(
          { 
            success: true, 
            message: `Successfully handled new proposal ${newIndex} for ${type}`,
            timestamp: Date.now()
          },
          { 
            status: 200,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }
        );
      } catch (error) {
        console.error('Error handling new proposal cache:', error);
        // Continue with normal cache invalidation as fallback
        console.log('Falling back to standard cache invalidation');
      }
    }
    
    console.log(`🧹 API: Invalidating cache for ${type} proposals${targetIndex !== undefined ? ` (targeting index ${targetIndex})` : ''}`);
    
    // If targetIndex is provided, only invalidate that specific proposal
    if (targetIndex !== undefined) {
      const keys: string[] = [];
      
      if (type === 'operations' || type === 'all') {
        keys.push(`proposal_ops_${targetIndex}`);
        // Also target cacheLayer entries
        const dedupKeys = await redis.keys(`*ops*${targetIndex}*`);
        keys.push(...dedupKeys);
      }
      
      if (type === 'research' || type === 'all') {
        keys.push(`proposal_res_${targetIndex}`);
        // Also target cacheLayer entries
        const dedupKeys = await redis.keys(`*res*${targetIndex}*`);
        keys.push(...dedupKeys);
      }
      
      // Delete the targeted keys
      if (keys.length > 0) {
        await Promise.all(keys.map(key => redis.del(key)));
        console.log(`✅ API: Targeted invalidation of proposal ${targetIndex} (${keys.length} keys)`);
      }
      
      // Also purge cacheLayer if available
      try {
        // Import and use purgeCache if available
        const { purgeCache } = await import('@/app/utils/cacheLayer');
        
        if (type === 'operations' || type === 'all') {
          await purgeCache(`cache:*ops*${targetIndex}*`);
        }
        if (type === 'research' || type === 'all') {
          await purgeCache(`cache:*res*${targetIndex}*`);
        }
        console.log(`✅ API: Purged cacheLayer for targeted proposal ${targetIndex}`);
      } catch (error) {
        // cacheLayer might not be fully implemented yet
        console.log('Note: cacheLayer purging not available:', error);
      }
      
      success = true; // Mark operation as successful
      return NextResponse.json(
        { 
          success: true, 
          message: `Successfully invalidated cache for ${type} proposal with index ${targetIndex}`,
          timestamp: Date.now()
        },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }
    
    // Regular full invalidation continues below
    // Get all Redis keys
    let keys: string[] = [];
    
    if (type === 'operations' || type === 'all') {
      // Get operations proposal keys
      const opsIndices = await redis.get<number[]>('operations_sc_indices') || [];
      const opsKeys = opsIndices.map(index => `proposal_ops_${index}`);
      keys = [...keys, ...opsKeys, 'operations_sc_indices'];
      
      // Also clear any operations-related deduplication keys
      const dedupKeys = await redis.keys('proposals:ops:*');
      keys = [...keys, ...dedupKeys];
    }
    
    if (type === 'research' || type === 'all') {
      // Get research proposal keys
      const resIndices = await redis.get<number[]>('research_sc_indices') || [];
      const resKeys = resIndices.map(index => `proposal_res_${index}`);
      keys = [...keys, ...resKeys, 'research_sc_indices'];
      
      // Also clear any research-related deduplication keys
      const dedupKeys = await redis.keys('proposals:res:*');
      keys = [...keys, ...dedupKeys];
    }
    
    // Delete all keys in batches
    if (keys.length > 0) {
      // Delete in batches of 50 to avoid overwhelming Redis
      const batchSize = 50;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        if (batch.length > 0) {
          await Promise.all(batch.map(key => redis.del(key)));
        }
      }
      
      console.log(`✅ API: Successfully invalidated ${keys.length} cache entries for ${type} proposals`);
    } else {
      console.log(`ℹ️ API: No cache entries found for ${type} proposals`);
    }
    
    success = true; // Mark operation as successful
    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully invalidated ${keys.length} cache entries for ${type} proposals`,
        timestamp: Date.now()
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    
    // Log the error
    console.error('Error invalidating cache:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to invalidate cache';
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } finally {
    // Always record the request result for the circuit breaker
    try {
      await recordRequestResult(SERVICE_NAME, success);
      
      // Log performance metrics
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`⚠️ API: Slow request to ${SERVICE_NAME} - ${duration}ms`);
      }
    } catch (error) {
      console.error('Failed to record request result:', error);
    }
  }
}