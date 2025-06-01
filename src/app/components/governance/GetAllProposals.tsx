'use server';

import { Redis } from '@upstash/redis';
import { CompleteProposalType } from '@/app/utils/interfaces';
import { getProposal } from './GetProposal';

const isMainnet = process.env.NEXT_PUBLIC_NETWORK_ENV === 'mainnet';

// Initialize Redis publicClient for caching
const redis = new Redis({
  url: isMainnet ? process.env.UPSTASH_REDIS_REST_URL! : process.env.UPSTASH_REDIS_REST_URL_DEV!,
  token: isMainnet ? process.env.UPSTASH_REDIS_REST_TOKEN! : process.env.UPSTASH_REDIS_REST_TOKEN_DEV!,
});

// Cache TTL constants
const TEMP_CACHE_TTL = 900; // 15 minutes in seconds
const LONG_CACHE_TTL = 86400 * 7; // 7 days in seconds
const PERMANENT_STATUSES = ['completed', 'executed', 'canceled'];

// New function to get individual proposal cache key
const getProposalCacheKey = (index: number): string => {
  return `proposal_res_${index}`;
};

// New function to check if a proposal is in a permanent state
const isProposalPermanent = (status: string): boolean => {
  return PERMANENT_STATUSES.includes(status.toLowerCase());
};

/**
 * Safely perform a Redis operation with fallback
 * This function handles Redis errors gracefully and provides fallback values
 */
async function safeRedisOperation<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string
): Promise<{ result: T; redisAvailable: boolean }> {
  try {
    const result = await operation();
    return { result, redisAvailable: true };
  } catch (error) {
    console.warn(`⚠️ BACKEND: Redis operation '${operationName}' failed:`, error);
    return { result: fallbackValue, redisAvailable: false };
  }
}

/**
 * Check if Redis is available
 * This helps determine if we should attempt Redis operations or go straight to fallback
 */
async function checkRedisAvailability(): Promise<boolean> {
  try {
    // Simple ping operation to check connectivity
    await redis.ping();
    return true;
  } catch (error) {
    console.warn('⚠️ BACKEND: Redis unavailable:', error);
    return false;
  }
}

export const getAllProposals = async (
  startIndex: number,
  endIndex: number,
  statusFilter: string = 'all',
  typeFilter: string = 'all',
  startDate?: string | null,
  endDate?: string | null,
  fetchOnlyNew: boolean = false
): Promise<CompleteProposalType[]> => {
  console.log(`🌍 BACKEND: Running in ${isMainnet ? 'mainnet' : 'testnet'} mode.`);
  console.log(`📊 BACKEND: Requesting ${startIndex - endIndex + 1} proposals (startIndex: ${startIndex}, endIndex: ${endIndex}). Filter: status=${statusFilter}, type=${typeFilter}, newOnly=${fetchOnlyNew}`);

  // List cache keys
  const indexCacheKey = `research_sc_indices`;

  // Helper function to check if a proposal matches the filters
  const matchesFilters = (proposal: CompleteProposalType) => {
    const matchesStatus = statusFilter === 'all' || proposal.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === 'all' || proposal.executionOption.toLowerCase() === typeFilter.toLowerCase();
    
    // Date range filtering
    let matchesDateRange = true;
    if (startDate) {
      try {
        const proposalStart = new Date(proposal.proposalStartDate.replace(' GMT', ''));
        const filterStart = new Date(startDate);
        matchesDateRange = matchesDateRange && proposalStart >= filterStart;
      } catch (error) {
        console.error(`Error comparing start dates for proposal ${proposal.index}:`, error);
        // If there's an error parsing dates, include the proposal by default
        return true;
      }
    }
    if (endDate) {
      try {
        const proposalStart = new Date(proposal.proposalStartDate.replace(' GMT', ''));
        const filterEnd = new Date(endDate);
        matchesDateRange = matchesDateRange && proposalStart <= filterEnd;
      } catch (error) {
        console.error(`Error comparing end dates for proposal ${proposal.index}:`, error);
        // If there's an error parsing dates, include the proposal by default
        return true;
      }
    }
    
    return matchesStatus && matchesType && matchesDateRange;
  };

  // Determine optimal batch size based on the range
  const range = startIndex - endIndex + 1;
  // Adjust batch size dynamically based on the range
  // For smaller ranges, use larger batches; for larger ranges, use smaller batches
  const DYNAMIC_BATCH_SIZE = 10;
  console.log(`🔄 BACKEND: Using dynamic batch size of ${DYNAMIC_BATCH_SIZE} for range of ${range} proposals`);

  // Check Redis availability first
  const redisAvailable = await checkRedisAvailability();
  if (!redisAvailable) {
    console.log('🔴 BACKEND: REDIS UNAVAILABLE. Fetching all data from source.');
  } else {
    console.log('🟢 BACKEND: Redis IS AVAILABLE.');
  }

  // If we're only fetching new proposals, we can optimize the process
  if (fetchOnlyNew) {
    console.log(`🔍 BACKEND: FETCHING ONLY NEW PROPOSALS - Research proposals from index ${endIndex} to ${startIndex}`);
    const proposals: CompleteProposalType[] = [];
    
    // Get the list of cached indices (safely)
    let cachedIndices: number[] = [];
    if (redisAvailable) {
      const { result, redisAvailable: stillAvailable } = await safeRedisOperation(
        () => redis.get<number[]>(indexCacheKey),
        [] as number[],
        'get cached indices'
      );
      
      if (stillAvailable) {
        cachedIndices = result || [];
      }
    }
    
    // Determine which indices we need to fetch
    const indicesToFetch: number[] = [];
    for (let i = startIndex; i >= endIndex; i--) {
      if (!redisAvailable || !cachedIndices.includes(i)) {
        indicesToFetch.push(i);
      }
    }
    
    console.log(`🔍 BACKEND: Need to fetch ${indicesToFetch.length} new proposals`);
    
    // Fetch cached proposals first (only if Redis is available)
    if (redisAvailable) {
      const cachedProposalPromises: Promise<CompleteProposalType | null>[] = [];
      for (let i = startIndex; i >= endIndex; i--) {
        if (cachedIndices.includes(i)) {
          cachedProposalPromises.push(
            (async () => {
              const cacheKey = getProposalCacheKey(i);
              const { result: cachedProposal, redisAvailable: stillAvailable } = await safeRedisOperation(
                () => redis.get<CompleteProposalType>(cacheKey),
                null,
                `get cached proposal ${i}`
              );
              
              if (stillAvailable && cachedProposal) {
                console.log(`📋 BACKEND: Using cached proposal for index ${i}`);
                if (matchesFilters(cachedProposal)) {
                  // Add the cached proposal directly
                  proposals.push({ ...cachedProposal });
                }
                return cachedProposal;
              } else {
                // If Redis failed or proposal not found, add to fetch list
                if (!indicesToFetch.includes(i)) {
                  indicesToFetch.push(i);
                }
                return null;
              }
            })()
          );
        }
      }
      
      // Wait for all cached proposals to be retrieved
      try {
        await Promise.all(cachedProposalPromises);
      } catch (error) {
        console.error(`❌ BACKEND: Error fetching cached proposals:`, error);
        // Continue with fetching missing proposals even if there's an error with cached ones
      }
    }
    
    // Batch fetch only the new proposals
    for (let i = 0; i < indicesToFetch.length; i += DYNAMIC_BATCH_SIZE) {
      const batchIndices = indicesToFetch.slice(i, i + DYNAMIC_BATCH_SIZE);
      const batchPromises: Promise<CompleteProposalType | null>[] = [];
      const batchStartTime = Date.now();

      console.log(`🔄 BACKEND: Fetching batch of new proposals - indices ${batchIndices.join(', ')}`);

      for (const index of batchIndices) {
        batchPromises.push(
          (async () => {
            try {
              const proposal = await getProposal(index);
              // Add the proposal directly since getProposal now returns CompleteProposalType with quorum as number
              proposals.push(proposal);
              console.log(`✅ BACKEND: Successfully fetched new proposal with index ${index}`);

              // Cache the proposal individually (only if Redis is available)
              if (redisAvailable) {
                const cacheKey = getProposalCacheKey(index);
                const isPermanent = isProposalPermanent(proposal.status);
                
                const { redisAvailable: stillAvailable } = await safeRedisOperation(
                  async () => {
                    if (isPermanent) {
                      await redis.set(cacheKey, proposal);
                      console.log(`💾 BACKEND: Cached permanent proposal ${index} indefinitely`);
                    } else {
                      await redis.set(cacheKey, proposal, { ex: TEMP_CACHE_TTL });
                      console.log(`💾 BACKEND: Cached temporary proposal ${index} for 15 minutes`);
                    }
                    return true;
                  },
                  false,
                  `cache proposal ${index}`
                );
                
                // Update the indices cache if Redis is still available
                if (stillAvailable && !cachedIndices.includes(index)) {
                  await safeRedisOperation(
                    async () => {
                      cachedIndices.push(index);
                      await redis.set(indexCacheKey, cachedIndices, { ex: LONG_CACHE_TTL });
                      return true;
                    },
                    false,
                    `update indices cache for ${index}`
                  );
                }
              } else {
                console.log(`⚠️ BACKEND: Skipping cache for proposal ${index} as Redis is unavailable`);
              }

              return proposal;
            } catch (error) {
              console.error(`❌ BACKEND: Error fetching new proposal ${index}:`, error);
              // If the error is about proposal index not existing, we can safely ignore it
              if (error instanceof Error && error.message.includes('does not exist')) {
                console.log(`ℹ️ BACKEND: Skipping proposal ${index} as it does not exist yet`);
              }
              return null;
            }
          })()
        );
      }

      if (batchPromises.length > 0) {
        try {
          await Promise.all(batchPromises);
          const batchDuration = Date.now() - batchStartTime;
          console.log(`⏱️ BACKEND (New): Batch fetch for indices [${batchIndices.join(', ')}] took ${batchDuration}ms successfully.`);
        } catch (error) {
          const batchDuration = Date.now() - batchStartTime;
          console.error(`⏱️❌ BACKEND (New): Batch fetch for indices [${batchIndices.join(', ')}] FAILED after ${batchDuration}ms. Error:`, error);
          // Continue with the next batch even if this one fails
        }
      }
    }

    console.log(`✅ BACKEND: Completed fetching ${proposals.length} new proposals`);
    
    // Filter proposals based on the provided filters
    const filteredProposals = proposals.filter(matchesFilters);
    
    return filteredProposals.sort((a, b) => b.index - a.index);
  }

  console.log(`📚 BACKEND: FETCHING ALL PROPOSALS - Research proposals from index ${startIndex} to ${endIndex}`);

  // Get the list of cached indices (safely)
  let cachedIndices: number[] = [];
  if (redisAvailable) {
    const { result, redisAvailable: stillAvailable } = await safeRedisOperation(
      () => redis.get<number[]>(indexCacheKey),
      [] as number[],
      'get cached indices for all proposals'
    );
    
    if (stillAvailable) {
      cachedIndices = result || [];
    }
  }
  
  // Check which indices we need to fetch
  const indicesToFetch: number[] = [];
  const cachedIndices_: number[] = [];
  
  for (let i = startIndex; i >= endIndex; i--) {
    if (redisAvailable && cachedIndices.includes(i)) {
      cachedIndices_.push(i);
    } else {
      indicesToFetch.push(i);
    }
  }
  
  console.log(`📋 BACKEND: Found ${cachedIndices_.length} cached proposals, need to fetch ${indicesToFetch.length} new ones`);
  
  // Fetch cached proposals first (only if Redis is available and we have cached indices)
  const proposals: CompleteProposalType[] = [];
  
  if (redisAvailable && cachedIndices_.length > 0) {
    const cachedProposalPromises: Promise<void>[] = [];
    
    for (const index of cachedIndices_) {
      cachedProposalPromises.push(
        (async () => {
          const cacheKey = getProposalCacheKey(index);
          const { result: cachedProposal, redisAvailable: stillAvailable } = await safeRedisOperation(
            () => redis.get<CompleteProposalType>(cacheKey),
            null,
            `get cached proposal ${index} for all proposals`
          );
          
          if (stillAvailable && cachedProposal) {
            // Check if we need to refresh non-permanent proposals
            if (!isProposalPermanent(cachedProposal.status)) {
              // For non-permanent proposals, check if they need to be refreshed
              // This is a good place to implement a refresh strategy based on time
              // For now, we'll just use the cached version
            }
            
            if (matchesFilters(cachedProposal)) {
              // Add the cached proposal directly
              proposals.push({ ...cachedProposal });
            }
          } else {
            // If the proposal is in the index list but not found in cache or Redis failed,
            // add it to the list to fetch
            if (!indicesToFetch.includes(index)) {
              indicesToFetch.push(index);
            }
            
            // Remove from cached indices if Redis is still available
            if (stillAvailable) {
              await safeRedisOperation(
                async () => {
                  const updatedIndices = cachedIndices.filter(i => i !== index);
                  await redis.set(indexCacheKey, updatedIndices, { ex: LONG_CACHE_TTL });
                  cachedIndices = updatedIndices;
                  return true;
                },
                false,
                `update indices after missing proposal ${index}`
              );
            }
          }
        })()
      );
    }
    
    try {
      await Promise.all(cachedProposalPromises);
    } catch (error) {
      console.error(`❌ BACKEND: Error fetching cached proposals:`, error);
      // Continue with fetching missing proposals even if there's an error with cached ones
    }
  }
  
  // If we have indices to fetch, fetch them in batches
  if (indicesToFetch.length > 0) {
    console.log(`🔄 BACKEND: Fetching ${indicesToFetch.length} missing proposals...`);
    
    // Batch fetch the missing proposals
    for (let i = 0; i < indicesToFetch.length; i += DYNAMIC_BATCH_SIZE) {
      const batchIndices = indicesToFetch.slice(i, i + DYNAMIC_BATCH_SIZE);
      const batchPromises: Promise<void>[] = [];
      const batchStartTime = Date.now();
      
      for (const index of batchIndices) {
        batchPromises.push(
          (async () => {
            try {
              const proposal = await getProposal(index);
              
              if (matchesFilters(proposal)) {
                // Add the proposal directly since getProposal now returns CompleteProposalType with quorum as number
                proposals.push({ ...proposal });
              }
              
              // Cache the proposal individually (only if Redis is available)
              if (redisAvailable) {
                const cacheKey = getProposalCacheKey(index);
                const isPermanent = isProposalPermanent(proposal.status);
                
                const { redisAvailable: stillAvailable } = await safeRedisOperation(
                  async () => {
                    if (isPermanent) {
                      await redis.set(cacheKey, proposal);
                      console.log(`💾 BACKEND: Cached permanent proposal ${index} indefinitely`);
                    } else {
                      await redis.set(cacheKey, proposal, { ex: TEMP_CACHE_TTL });
                      console.log(`💾 BACKEND: Cached temporary proposal ${index} for 5 minutes`);
                    }
                    return true;
                  },
                  false,
                  `cache proposal ${index} for all proposals`
                );
                
                // Update the indices cache if Redis is still available
                if (stillAvailable && !cachedIndices.includes(index)) {
                  await safeRedisOperation(
                    async () => {
                      cachedIndices.push(index);
                      await redis.set(indexCacheKey, cachedIndices, { ex: LONG_CACHE_TTL });
                      return true;
                    },
                    false,
                    `update indices cache for ${index} in all proposals`
                  );
                }
              } else {
                console.log(`⚠️ BACKEND: Skipping cache for proposal ${index} as Redis is unavailable`);
              }
            } catch (error) {
              console.error(`❌ BACKEND: Error fetching proposal ${index}:`, error);
              // If the error is about proposal index not existing, we can safely ignore it
              if (error instanceof Error && error.message.includes('does not exist')) {
                console.log(`ℹ️ BACKEND: Skipping proposal ${index} as it does not exist yet`);
              }
            }
          })()
        );
      }
      
      try {
        await Promise.all(batchPromises);
        const batchDuration = Date.now() - batchStartTime;
        console.log(`⏱️ BACKEND (All): Batch fetch for indices [${batchIndices.join(', ')}] took ${batchDuration}ms successfully.`);
      } catch (error) {
        const batchDuration = Date.now() - batchStartTime;
        console.error(`⏱️❌ BACKEND (All): Batch fetch for indices [${batchIndices.join(', ')}] FAILED after ${batchDuration}ms. Error:`, error);
        // Continue with the next batch even if this one fails
      }
    }
  }
  
  console.log(`✅ BACKEND: Completed fetching ${proposals.length} proposals`);
  
  // Sort proposals by index (descending)
  return proposals.sort((a, b) => b.index - a.index);
};

