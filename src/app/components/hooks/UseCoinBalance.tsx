import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import donationAbi from '@/app/abi/Donation.json';
import { type Address, formatEther, decodeEventLog, zeroAddress } from 'viem';
import { publicClient } from '@/app/config/viem';

export const useCoinBalance = (address: string | undefined, displayedDecimals: number) => {
  const [coinBalance, setCoinBalance] = useState<string | null>(null);
  const networkInfo = useNetworkInfo();


  const donationContract = useMemo(() => {
    if (!networkInfo || !publicClient) return null;

    return {
      address: networkInfo.donation as Address,
      abi: donationAbi,
      publicClient
    };
  }, [networkInfo]);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setCoinBalance(null);
      return;
    }

    const balance = await publicClient?.getBalance({ address: address as Address });
    if (balance) {
      const formattedBalance = Number(
        formatEther(balance)
      ).toFixed(displayedDecimals);
      setCoinBalance(formattedBalance);
    }
  }, [address, displayedDecimals]);

  useEffect(() => {
    const onDonated = async (user: Address, token: Address, amount: bigint) => {
      if (
        user.toLowerCase() === (address as string).toLowerCase() &&
        token === zeroAddress
      ) {
        console.log('Donation:', token, amount);
        await fetchBalance();
      }
    };

    if (!networkInfo || !publicClient || !donationContract) return;

    // Add event listener for Donated
    if (donationContract && address) {
      const unwatch = publicClient.watchContractEvent({
        ...donationContract,
        eventName: 'Donated',
        onLogs: (logs) => {
          logs.forEach((log) => {
            const parsedLog = decodeEventLog({
              abi: donationAbi,
              data: log.data,
              topics: log.topics
            });
            if (parsedLog.eventName === 'Donated' && parsedLog.args) {
              const args = parsedLog.args as [Address, Address, bigint];
              onDonated(...args);
            }
          });
        }
      });

      return () => {
        unwatch();
      };
    }
  }, [
    address,
    donationContract,
    networkInfo,
    fetchBalance,
  ]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return coinBalance || '0';
};
