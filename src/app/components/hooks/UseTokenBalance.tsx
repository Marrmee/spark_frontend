import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { 
  formatUnits,  
  Address, 
  decodeEventLog,
  getContract,
  Abi
} from 'viem';
import donationAbi from '@/app/abi/Donation.json';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { publicClient } from '@/app/config/viem';

type DonatedEvent = {
  user: Address;
  token: Address;
  amount: bigint;
};

type TransferEvent = {
  from: Address;
  to: Address;
  amount: bigint;
};

// Simple debounce function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);
  
  // Update the callback ref whenever it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay] // Now we only depend on delay, not the callback function
  );
};

export const useTokenBalance = (
  decimals: number,
  displayDecimals: number,
  address: Address | undefined,
  contractAddress: Address | undefined,
  abi: Abi
) => {
  const [balanceToken, setBalanceToken] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(0);
  const refreshCooldown = 5000; // 5 second cooldown
  const networkInfo = useNetworkInfo();

  const contractToken = useMemo(() => {
    if (!contractAddress || !abi) return null;
    return getContract({
      address: contractAddress,
      abi,
      client: publicClient
    });
  }, [contractAddress, abi]);

  const contractDonation = useMemo(() => {
    if (!networkInfo?.donation || !donationAbi) return null;
    return getContract({
      address: networkInfo.donation as Address,
      abi: donationAbi as Abi,
      client: publicClient
    });
  }, [networkInfo?.donation]);

  const fetchBalance = useCallback(async () => {
    if (!address || !contractToken) {
      setBalanceToken(null);
      return;
    }

    // Check if we're within the cooldown period
    const now = Date.now();
    if (now - lastRefresh < refreshCooldown) {
      return;
    }
    setLastRefresh(now);

    try {
      const balance = await publicClient.readContract({
        address: contractToken.address,
        abi: contractToken.abi,
        functionName: 'balanceOf',
        args: [address]
      }) as bigint;

      const formattedBalance = Number(
        formatUnits(balance, decimals)
      ).toFixed(displayDecimals);
      
      setBalanceToken(formattedBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Don't update state on error - keep previous value
    }
  }, [contractToken, address, decimals, displayDecimals, lastRefresh, refreshCooldown]);

  // Create debounced version of fetchBalance
  const debouncedFetchBalance = useDebounce(fetchBalance, 1000);

  // Set initial balance
  useEffect(() => {
    if (address && contractToken) {
      fetchBalance();
    }
  }, [address, contractToken, fetchBalance]);

  // Add polling interval
  useEffect(() => {
    if (!address || !contractToken) return;
    
    // Set up polling interval (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchBalance();
    }, 30000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [address, contractToken, fetchBalance]);

  useEffect(() => {
    if (!address || !contractToken || !contractDonation || !networkInfo) return;

    const addressLower = address.toLowerCase();
    const unwatchCallbacks: (() => void)[] = [];
    
    if (contractDonation) {
      const unwatch = publicClient.watchContractEvent({
        address: contractDonation.address,
        abi: contractDonation.abi as Abi,
        eventName: 'Donated',
        args: {
          user: addressLower as `0x${string}`
        },
        onLogs: async (logs) => {
          for (const log of logs) {
            const decodedLog = decodeEventLog({
              abi: contractDonation.abi,
              data: log.data,
              topics: log.topics
            });

            const args = decodedLog.args as unknown as DonatedEvent;
            if (!args) continue;

            if (args.token === networkInfo.usdc) {
              debouncedFetchBalance();
            }
          }
        }
      });
      unwatchCallbacks.push(unwatch);
    }

    if (contractToken) {
      const unwatchTransfer = publicClient.watchContractEvent({
        address: contractToken.address,
        abi: contractToken.abi as Abi,
        eventName: 'Transfer',
        onLogs: async (logs) => {
          for (const log of logs) {
            const decodedLog = decodeEventLog({
              abi: contractToken.abi,
              data: log.data,
              topics: log.topics
            });

            const args = decodedLog.args as unknown as TransferEvent;
            if (!args) continue;

            const adminLower = networkInfo.admin?.toLowerCase();
            const fundingWalletLower = networkInfo.researchFundingWallet?.toLowerCase();
            const fromLower = args.from.toLowerCase();
            const toLower = args.to.toLowerCase();

            if (
              (adminLower && toLower === adminLower) ||
              (fundingWalletLower && toLower === fundingWalletLower) ||
              fromLower === addressLower ||
              toLower === addressLower
            ) {
              debouncedFetchBalance();
            }
          }
        }
      });
      unwatchCallbacks.push(unwatchTransfer);
    }

    return () => {
      unwatchCallbacks.forEach(unwatch => unwatch());
    };
  }, [contractToken, contractDonation, address, debouncedFetchBalance, networkInfo]);

  return balanceToken;
};
