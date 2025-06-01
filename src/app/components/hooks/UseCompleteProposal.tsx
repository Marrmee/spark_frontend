import { useCallback, useState } from 'react';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { useWallet } from '@/app/context/WalletContext';
import { Address } from 'viem';

export default function useCompleteProposal(
  index: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: any,
  contractAddress: Address,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRpcError: (error: any) => void,
  handleError: (message: string) => void,
  onOptimisticUpdate?: () => void,
  onStatusChange?: () => void
) {
  const [isLoadingCompletion, setIsLoadingCompletion] = useState(false);
  const [completionTransactionHash, setCompletionTransactionHash] =
    useState('');
  const [completionInitiated, setCompletionInitiated] = useState(false);
  const networkInfo = useNetworkInfo();
  const wallet = useWallet();

  const completeProposal = useCallback(async () => {
    if (
      !networkInfo ||
      !wallet?.state?.walletClient ||
      !wallet?.state?.publicClient
    ) {
      handleError('Wallet not properly connected');
      return;
    }

    try {
      if (
        wallet.state.address?.toLowerCase() !== networkInfo.admin.toLowerCase()
      ) {
        handleError('Only admin can complete proposals with off-chain actions');
        return;
      }

      setIsLoadingCompletion(true);
      
      // Call the optimistic update callback if provided
      onOptimisticUpdate?.();

      const { request } = await wallet.state.publicClient.simulateContract({
        address: contractAddress,
        abi: abi,
        functionName: 'complete',
        args: [BigInt(index)],
        account: wallet.state.address,
      });

      const hash = await wallet.state.walletClient.writeContract(request);

      setCompletionTransactionHash(`${networkInfo.explorerLink}/tx/${hash}`);

      // Wait for transaction confirmation
      const receipt = await wallet.state.publicClient.waitForTransactionReceipt(
        { hash }
      );
      if (receipt.status === 'success') {
        setCompletionInitiated(true);
        
        // Call the status change callback if provided
        onStatusChange?.();
      }
    } catch (err) {
      // Safely handle the error object to prevent BigInt serialization issues
      const errorMessage = 'Error completing the proposal';
      
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
        handleError(errorMessage);
      }
      
      console.error('Error completing the proposal:', err);
    } finally {
      setIsLoadingCompletion(false);
    }
  }, [
    networkInfo,
    wallet,
    contractAddress,
    abi,
    index,
    handleRpcError,
    handleError,
    onOptimisticUpdate,
    onStatusChange,
  ]);

  return {
    completeProposal,
    isLoadingCompletion,
    completionTransactionHash,
    completionInitiated,
    setCompletionInitiated,
  };
}
