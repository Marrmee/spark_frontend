import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { publicClient } from '@/app/config/viem';

// Global cache and queue management
const ensCache: { [address: string]: { name: string | null; timestamp: number } } = {};
const ENS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const GLOBAL_ENS_MAP = new Map<string, string | null>();

// Create a single shared mainnet client
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL_ETHEREUM)
});

// Batch ENS resolution hook
export function useBatchEnsNames(addresses: string[]) {
  const [ensNames, setEnsNames] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!addresses || addresses.length === 0) {
      setEnsNames({});
      return;
    }

    const fetchEnsNames = async () => {
      setLoading(true);
      const newEnsNames: Record<string, string | null> = {};

      try {
        // Process addresses in batches to avoid overwhelming the RPC
        const batchSize = 10;
        for (let i = 0; i < addresses.length; i += batchSize) {
          const batch = addresses.slice(i, i + batchSize);
          
          const promises = batch.map(async (address) => {
            if (!address || address.length !== 42) return { address, name: null };
            
            try {
              const name = await publicClient.getEnsName({
                address: address as `0x${string}`,
              });
              return { address, name };
            } catch (error) {
              console.debug(`Failed to resolve ENS for ${address}:`, error);
              return { address, name: null };
            }
          });

          const results = await Promise.allSettled(promises);
          
          results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              newEnsNames[result.value.address] = result.value.name;
            }
          });
        }
      } catch (error) {
        console.error('Error fetching batch ENS names:', error);
      }

      setEnsNames(newEnsNames);
      setLoading(false);
    };

    fetchEnsNames();
  }, [addresses]);

  return { ensNames, loading };
}

// Single ENS resolution hook
export function useEnsName(address: string | undefined) {
  const [ensName, setEnsName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolveName = async () => {
      if (!address) return;

      try {
        // Check cache first
        const cached = ensCache[address];
        if (cached && Date.now() - cached.timestamp < ENS_CACHE_DURATION) {
          if (mounted) {
            setEnsName(cached.name);
          }
          return;
        }

        // Check global map
        const globalCached = GLOBAL_ENS_MAP.get(address);
        if (globalCached !== undefined) {
          if (mounted) {
            setEnsName(globalCached);
          }
          return;
        }

        const name = await mainnetClient.getEnsName({
          address: address as `0x${string}`
        });

        // Update caches
        ensCache[address] = { name, timestamp: Date.now() };
        GLOBAL_ENS_MAP.set(address, name);

        if (mounted) {
          setEnsName(name);
        }
      } catch (error) {
        console.error('Error resolving ENS name:', error);
        if (mounted) {
          setEnsName(null);
        }
      }
    };

    resolveName();
    return () => {
      mounted = false;
    };
  }, [address]);

  return ensName;
}
