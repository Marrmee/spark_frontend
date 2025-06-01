import { useCallback, useState } from 'react';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { useWallet } from '@/app/context/WalletContext';
import { Abi, type Address } from 'viem';

export default function useScheduleProposal(
  index: number,
  abi: Abi,
  contractAddress: string,
  handleRpcError: (error) => void,
  handleError: (message: string) => void,
  onOptimisticUpdate?: () => void,
  onStatusChange?: () => void
) {
  const [isLoadingScheduling, setIsLoadingScheduling] = useState(false);
  const [schedulingTransactionHash, setSchedulingTransactionHash] = useState('');
  const [schedulingInitiated, setSchedulingInitiated] = useState(false);
  const networkInfo = useNetworkInfo();
  const wallet = useWallet();

  const scheduleProposal = useCallback(async () => {
    if (wallet.state.publicClient && networkInfo && wallet?.state?.walletClient && wallet.state.address) {
      try {
        setIsLoadingScheduling(true);
        
        onOptimisticUpdate?.();

        const hash = await wallet.state.walletClient.writeContract({
          address: contractAddress as Address,
          abi,
          functionName: 'schedule',
          args: [BigInt(index)],
          account: wallet.state.address,
          chain: wallet.state.publicClient.chain
        });
        
        const receipt = await wallet.state.publicClient?.waitForTransactionReceipt({ hash });
        
        setSchedulingTransactionHash(
          `${networkInfo?.explorerLink}/tx/${hash}`
        );
        
        if (receipt?.status === 'success') {
          setSchedulingInitiated(true);
          onStatusChange?.();
        }
      } catch (err) {
        // Safely handle the error object to prevent BigInt serialization issues
        try {
          // Create a safe copy of the error by replacing BigInt values with strings
          const safeError = JSON.parse(
            JSON.stringify(
              err,
              (key, value) => 
                typeof value === 'bigint' ? value.toString() : value
            )
          );
          
          // Check if it's a user rejection
          if (safeError?.code === 4001 || safeError?.code === 'ACTION_REJECTED') {
            handleError('Transaction was rejected by the user');
          } else {
            handleRpcError(safeError);
          }
        } catch (jsonError) {
          // If JSON serialization fails, provide a fallback error message
          console.error('Error serializing error object:', jsonError);
          handleError('Error scheduling the proposal');
        }
        
        console.error('Error scheduling the proposal:', err);
      } finally {
        setIsLoadingScheduling(false);
      }
    }
  }, [networkInfo, wallet, contractAddress, abi, index, handleRpcError, handleError, onOptimisticUpdate, onStatusChange]);

  return {
    scheduleProposal,
    isLoadingScheduling,
    schedulingTransactionHash,
    schedulingInitiated,
    setSchedulingInitiated,
  };
}
