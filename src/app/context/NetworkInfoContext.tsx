'use client';

import React, {
  useContext,
  createContext,
  useState,
  useEffect,
  useMemo,
} from 'react';

export type NetworkInfoType = {
  chainId: number;
  usdc: `0x${string}`;
  donation: `0x${string}`;
  po: `0x${string}`;
  sci: `0x${string}`;
  poToSciExchange: `0x${string}`;
  sciManager: `0x${string}`;
  governorResearch: `0x${string}`;
  explorerLink: string;
  admin: `0x${string}`;
  researchFundingWallet: `0x${string}`;
  governorExecutor: `0x${string}`;
  governorGuard: `0x${string}`;
  don?: `0x${string}`;
  requiredUpvotesThreshold: number;
  offchainVotingDurationDays?: number;
  proposalCooldownDays: number;
  draftDurationDays: number;
  
  // Spark core contract addresses
  attestationVault: `0x${string}`;
  sparkIdeaRegistry: `0x${string}`;
  sparkBridge: `0x${string}`;
  sparkIpNft: `0x${string}`;
  mintIpNft: `0x${string}`;
  fundAndMintIpNft: `0x${string}`;
  copyleftIpPool: `0x${string}`;
  transactionResearch: `0x${string}`;
  actionFactoryResearch: `0x${string}`;
};

const NetworkInfoContext = createContext<NetworkInfoType | undefined>(undefined);

type NetworkInfoProviderProps = {
  children: React.ReactNode;
};

export const useNetworkInfo = () => useContext(NetworkInfoContext);

export const NetworkInfoProvider: React.FC<NetworkInfoProviderProps> = ({
  children,
}) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfoType>();
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryTime, setNextRetryTime] = useState<number | null>(null);

  useEffect(() => {
    async function fetchNetworkInfo() {
      // If we have a next retry time, check if we should wait
      if (nextRetryTime && Date.now() < nextRetryTime) {
        const timeToWait = nextRetryTime - Date.now();
        setTimeout(() => {
          setNextRetryTime(null);
          setRetryCount(0);
        }, timeToWait);
        return;
      }

      const storedNetworkInfo = localStorage.getItem('networkInfo');
      if (storedNetworkInfo) {
        try {
          const parsedInfo = JSON.parse(storedNetworkInfo);
          if (JSON.stringify(networkInfo) !== JSON.stringify(parsedInfo)) {
            setNetworkInfo(parsedInfo);
          }
        } catch (error) {
          console.error('Error parsing stored network info:', error);
          localStorage.removeItem('networkInfo');
        }
      }

      try {
        const response = await fetch('/api/network-info');
        if (response.ok) {
          const fetchedNetworkInfo = await response.json() as NetworkInfoType;
          if (JSON.stringify(networkInfo) !== JSON.stringify(fetchedNetworkInfo)) {
            setNetworkInfo(fetchedNetworkInfo);
            // Store in localStorage for future use
            localStorage.setItem('networkInfo', JSON.stringify(fetchedNetworkInfo));
          }
          // Reset retry count on success
          setRetryCount(0);
          setNextRetryTime(null);
        } else if (response.status === 429) {
          // Handle rate limit
          const retryAfter = response.headers.get('Retry-After');
          const resetTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default to 60s if no header
          setNextRetryTime(Date.now() + resetTime);
          console.warn('Rate limit exceeded, will retry after:', new Date(Date.now() + resetTime));
        } else {
          throw new Error(`Failed to fetch network info: ${response.status}`);
        }
      } catch (error) {
        console.error('Error fetching network info:', error);
        // Implement exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30s
        setRetryCount(prev => prev + 1);
        setNextRetryTime(Date.now() + backoffTime);
        console.warn('Will retry after:', new Date(Date.now() + backoffTime));
      }
    }

    if (!networkInfo || (nextRetryTime && Date.now() >= nextRetryTime)) {
      fetchNetworkInfo();
    }
  }, [networkInfo, retryCount, nextRetryTime]);

  const memoizedNetworkInfo = useMemo(() => networkInfo, [networkInfo]);

  return (
    <NetworkInfoContext.Provider value={memoizedNetworkInfo}>
      {children}
    </NetworkInfoContext.Provider>
  );
};
