'use publicClient';

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { formatUnits, getContract, type Log } from 'viem';
import sciManagerAbi from '@/app/abi/SciManager.json';
import sciAbi from '@/app/abi/Sci.json';
import poAbi from '@/app/abi/Po.json';
import { publicClient } from '@/app/config/viem';

interface TransferEventLog extends Log {
  args: {
    from: string;
    to: string;
  };
}

interface UserEventLog extends Log {
  args: {
    user: string;
  };
}

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

export const useEcosystemBalances = (
  address: string | undefined,
  poToken: string | undefined,
  sciToken: string | undefined,
  sciManager: string | undefined
) => {
  const [po, setPo] = useState('0');
  const [sci, setSci] = useState('0');
  const [lockedSci, setLockedSci] = useState('0');
  const [votingRights, setVotingRights] = useState('0');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(0);
  const refreshCooldown = 5000; // 5 seconds cooldown between refreshes

  // Create contract instances using Viem
  const poTokenContract = useMemo(
    () =>
      poToken
        ? getContract({
            address: poToken as `0x${string}`,
            abi: poAbi,
            client: publicClient,
          })
        : null,
    [poToken]
  );

  const sciTokenContract = useMemo(
    () =>
      sciToken
        ? getContract({
            address: sciToken as `0x${string}`,
            abi: sciAbi,
            client: publicClient,
          })
        : null,
    [sciToken]
  );

  const sciManagerContract = useMemo(
    () =>
      sciManager
        ? getContract({
            address: sciManager as `0x${string}`,
            abi: sciManagerAbi,
            client: publicClient,
          })
        : null,
    [sciManager]
  );

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    // Check if we're within the cooldown period
    const now = Date.now();
    if (now - lastRefresh < refreshCooldown) {
      return;
    }
    
    setLoading(true);
    setLastRefresh(now);

    try {
      // Use Promise.all to batch requests
      const promises: Promise<unknown>[] = [];
      
      if (poTokenContract && poToken) {
        promises.push(
          publicClient.readContract({
            address: poToken as `0x${string}`,
            abi: poAbi,
            functionName: 'balanceOf',
            args: [address, BigInt(0)],
          }).then(result => setPo(String(result as bigint)))
          .catch(error => {
            console.error('Error fetching PO balance:', error);
            // Don't update state on error - keep previous value
          })
        );
      }

      if (sciTokenContract && sciToken) {
        promises.push(
          publicClient.readContract({
            address: sciToken as `0x${string}`,
            abi: sciAbi,
            functionName: 'balanceOf',
            args: [address],
          }).then(result => setSci(formatUnits(result as bigint, 18)))
          .catch(error => {
            console.error('Error fetching SCI balance:', error);
            // Don't update state on error - keep previous value
          })
        );
      }

      if (sciManagerContract && sciManager) {
        promises.push(
          publicClient.readContract({
            address: sciManager as `0x${string}`,
            abi: sciManagerAbi,
            functionName: 'getLockedSci',
            args: [address],
          }).then(result => setLockedSci(formatUnits(result as bigint, 18)))
          .catch(error => {
            console.error('Error fetching locked SCI:', error);
            // Don't update state on error - keep previous value
          })
        );

        promises.push(
          publicClient.readContract({
            address: sciManager as `0x${string}`,
            abi: sciManagerAbi,
            functionName: 'getLatestUserRights',
            args: [address],
          }).then(result => setVotingRights(formatUnits(result as bigint, 18)))
          .catch(error => {
            console.error('Error fetching voting rights:', error);
            // Don't update state on error - keep previous value
          })
        );
      }

      // Wait for all promises to resolve
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  }, [
    poToken,
    sciToken,
    sciManager,
    address,
    poTokenContract,
    sciTokenContract,
    sciManagerContract,
    lastRefresh,
    refreshCooldown
  ]);

  // Create debounced version of fetchBalance with shorter delay to ensure quick updates
  const debouncedFetchBalance = useDebounce(fetchBalance, 500);

  // Fetch balances when component mounts or dependencies change
  useEffect(() => {
    if (address) {
      fetchBalance(); // Use direct fetch on initial mount for immediate data
    }
  }, [address, fetchBalance]);

  // Set up a polling interval for background updates
  useEffect(() => {
    if (!address) return;
    
    // Set up polling interval - check every 30 seconds
    const intervalId = setInterval(() => {
      fetchBalance();
    }, 30000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [address, fetchBalance]);

  // Watch for events that affect balances
  useEffect(() => {
    if (!address) return;

    const unwatchCallbacks: (() => void)[] = [];
    const addressLower = address.toLowerCase();

    if (sciToken) {
      // Monitor Transfer events for this token
      const unwatchTransfer = publicClient.watchContractEvent({
        address: sciToken as `0x${string}`,
        abi: sciAbi,
        eventName: 'Transfer',
        onLogs: (logs) => {
          // Check if any log is relevant to this user
          const isRelevant = logs.some((log) => {
            const transferLog = log as TransferEventLog;
            if (!transferLog.args) return false;
            
            const from = transferLog.args.from?.toLowerCase();
            const to = transferLog.args.to?.toLowerCase();
            
            return from === addressLower || to === addressLower;
          });
          
          if (isRelevant) {
            debouncedFetchBalance();
          }
        },
      });
      unwatchCallbacks.push(unwatchTransfer);
    }

    if (poToken) {
      // Monitor TransferSingle events for PO token
      const unwatchTransferSingle = publicClient.watchContractEvent({
        address: poToken as `0x${string}`,
        abi: poAbi,
        eventName: 'TransferSingle',
        onLogs: () => {
          // For simplicity, update balances on any TransferSingle event
          // This is less frequent so we can afford to be less selective
          debouncedFetchBalance();
        },
      });
      unwatchCallbacks.push(unwatchTransferSingle);
    }

    if (sciManager) {
      // Monitor Locked events
      const unwatchLocked = publicClient.watchContractEvent({
        address: sciManager as `0x${string}`,
        abi: sciManagerAbi,
        eventName: 'Locked',
        onLogs: (logs) => {
          // Check if any log is relevant to this user
          const isRelevant = logs.some((log) => {
            const userLog = log as UserEventLog;
            if (!userLog.args) return false;
            
            const user = userLog.args.user?.toLowerCase();
            return user === addressLower;
          });
          
          if (isRelevant) {
            debouncedFetchBalance();
          }
        },
      });
      
      // Monitor Freed events
      const unwatchFreed = publicClient.watchContractEvent({
        address: sciManager as `0x${string}`,
        abi: sciManagerAbi,
        eventName: 'Freed',
        onLogs: (logs) => {
          // Check if any log is relevant to this user
          const isRelevant = logs.some((log) => {
            const userLog = log as UserEventLog;
            if (!userLog.args) return false;
            
            const user = userLog.args.user?.toLowerCase();
            return user === addressLower;
          });
          
          if (isRelevant) {
            debouncedFetchBalance();
          }
        },
      });

      unwatchCallbacks.push(unwatchLocked, unwatchFreed);
    }

    return () => {
      unwatchCallbacks.forEach((unwatch) => unwatch());
    };
  }, [address, poToken, sciToken, sciManager, debouncedFetchBalance]);

  return { po, sci, lockedSci, votingRights, loading };
};
