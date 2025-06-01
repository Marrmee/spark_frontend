import { useCallback, useState } from 'react';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { useWallet } from '@/app/context/WalletContext';
import { type Address, Abi } from 'viem';

export default function useCancelProposal(
  index: number,
  abi: Abi,
  contractAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRpcError: (error: any) => void,
  handleError: (message: string) => void,
  onOptimisticUpdate?: () => void,
  onStatusChange?: () => void
) {
  const [isLoadingCancellation, setIsLoadingCancellation] = useState(false);
  const [cancellationTransactionHash, setCancellationTransactionHash] =
    useState('');
  const [cancellationInitiated, setCancellationInitiated] = useState(false);
  const networkInfo = useNetworkInfo();
  const wallet = useWallet();

  const cancelProposal = useCallback(async () => {
    if (networkInfo && wallet.state.publicClient && wallet?.state?.walletClient && wallet.state.address) {
      try {
        setIsLoadingCancellation(true);
        
        // Call optimistic update callback if provided
        onOptimisticUpdate?.();

        const hash = await wallet.state.walletClient.writeContract({
          address: contractAddress as Address,
          abi,
          functionName: 'cancelRejected',
          args: [BigInt(index)],
          account: wallet.state.address,
          chain: wallet.state.publicClient.chain
        });
        
        const receipt = await wallet.state.publicClient.waitForTransactionReceipt({ hash });
        
        setCancellationTransactionHash(
          `${networkInfo?.explorerLink}/tx/${hash}`
        );
        if (receipt?.status === 'success') {
          setCancellationInitiated(true);
          // Call status change callback after successful cancellation
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
          handleError('Error canceling the proposal');
        }
        
        console.error('Error canceling the proposal:', err);
      } finally {
        setIsLoadingCancellation(false);
      }
    }
  }, [networkInfo, wallet, contractAddress, abi, index, handleRpcError, handleError, onOptimisticUpdate, onStatusChange]);

  return {
    cancelProposal,
    isLoadingCancellation,
    cancellationTransactionHash,
    cancellationInitiated,
    setCancellationInitiated,
  };
}
