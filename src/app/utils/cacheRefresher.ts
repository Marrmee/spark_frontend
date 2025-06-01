import { Redis } from '@upstash/redis';

const isMainnet = process.env.NEXT_PUBLIC_NETWORK_ENV === 'mainnet';

// Initialize Redis publicClient for caching
const redis = new Redis({
  url: isMainnet ? process.env.UPSTASH_REDIS_REST_URL! : process.env.UPSTASH_REDIS_REST_URL_DEV!,
  token: isMainnet ? process.env.UPSTASH_REDIS_REST_TOKEN! : process.env.UPSTASH_REDIS_REST_TOKEN_DEV!,
});

// Function to refresh active proposals
export async function refreshActiveProposals(): Promise<void> {
  try {
    // Get operations indices
    const opsIndices = await redis.get<number[]>('operations_sc_indices') || [];
    // Get research indices
    const resIndices = await redis.get<number[]>('research_sc_indices') || [];
    
    // Get all proposals to check their status
    const opsPromises = opsIndices.map(index => 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      redis.get<any>(`proposal_ops_${index}`)
    );
    const resPromises = resIndices.map(index => 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      redis.get<any>(`proposal_res_${index}`)
    );
    
    const [opsProposals, resProposals] = await Promise.all([
      Promise.all(opsPromises),
      Promise.all(resPromises)
    ]);
    
    // Find active proposals that need refreshing
    const activeOpsIndices = opsIndices.filter((_, i) => 
      opsProposals[i] && !['completed', 'executed', 'canceled'].includes(opsProposals[i]?.status)
    );
    
    const activeResIndices = resIndices.filter((_, i) => 
      resProposals[i] && !['completed', 'executed', 'canceled'].includes(resProposals[i]?.status)
    );
    
    // Delete the cache for active proposals to force refresh
    const keysToDelete = [
      ...activeOpsIndices.map(index => `proposal_ops_${index}`),
      ...activeResIndices.map(index => `proposal_res_${index}`)
    ];
    
    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map(key => redis.del(key)));
      console.log(`🔄 Refreshed ${keysToDelete.length} active proposals`);
    }
  } catch (error) {
    console.error('Error in automatic cache refresh:', error);
  }
} 