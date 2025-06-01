import { useState, useCallback } from 'react';
import { useTokenBalance } from './UseTokenBalance';
import sciAbi from '@/app/abi/Sci.json';
import usdcAbi from '@/app/abi/Usdc.json';
import govResAbi from '@/app/abi/GovernorResearch.json';
import sciManagerAbi from '@/app/abi/SciManager.json';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { useWallet } from '@/app/context/WalletContext';
import { CompleteProposalType, ExecutionOptions } from '@/app/utils/interfaces';
import useActionState from './UseActionState';
import enumerateExecutionOptions from '../governance/EnumerateExecutionOptions';
import { useGovernance } from '@/app/context/GovernanceContext';
import Copy from '@/app/components/general/CopyButton';
import { Abi, formatUnits, parseUnits } from 'viem';
import { publicClient } from '@/app/config/viem';

export default function useExecuteProposal(
  index,
  handleError,
  handleRpcError,
  proposalInfo,
  onOptimisticUpdate,
  onStatusChange
) {
  const [isLoadingExecution, setIsLoadingExecution] = useState(false);
  const [executionTransactionHash, setExecutionTransactionHash] = useState('');
  const [executionInitiated, setExecutionInitiated] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  const networkInfo = useNetworkInfo();
  const wallet = useWallet();
  const governance = useGovernance();
  const proposal = proposalInfo as CompleteProposalType;


  const sciBalanceTreasury = useTokenBalance(
    18,
    0,
    networkInfo?.researchFundingWallet,
    networkInfo?.sci,
    sciAbi as Abi
  );

  const usdcBalanceTreasury = useTokenBalance(
    6,
    0,
    networkInfo?.researchFundingWallet,
    networkInfo?.usdc,
    usdcAbi as Abi
  );

  const {
    transactionDetails,
    electionDetails,
    impeachmentDetails,
    loading,
  } = useActionState(proposal?.action as `0x${string}`, proposal?.executionOption);

  const handleCopy = (input) => {
    navigator.clipboard
      .writeText(input)
      .then(() => {
        console.log('Copy successful:', input);
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text:', err);
        setCopySuccess('Failed to copy');
      });
  };

  interface ApprovalResult {
    sciApproved: boolean;
    usdcApproved: boolean;
    error?: string;
  }

  const checkAdminApproval = useCallback(async (): Promise<ApprovalResult> => {
    if (!transactionDetails) {
      return {
        sciApproved: false,
        usdcApproved: false,
        error: 'Transaction details are missing',
      };
    }

    if (!networkInfo?.researchFundingWallet) {
      return {
        sciApproved: false,
        usdcApproved: false,
        error: 'Research funding wallet is missing from network info',
      };
    }

    if (!wallet?.state?.provider) {
      return {
        sciApproved: false,
        usdcApproved: false,
        error: 'Provider is not available',
      };
    }

    try {
      let hasSciApproval = true;
      let hasUsdcApproval = true;

      if (
        transactionDetails?.amountSci &&
        Number(transactionDetails?.amountSci) > 0
      ) {

        const owner = networkInfo?.researchFundingWallet;
        const spender = proposal?.action;

        // Validate addresses
        if (!owner || !spender || !networkInfo.sci) {
          console.error('Missing required addresses:', { owner, spender, tokenAddress: networkInfo.sci });
          return {
            sciApproved: false,
            usdcApproved: false,
            error: `Missing required addresses for SCI allowance check. Please check owner and spender addresses.`,
          };
        }

        // Validate address format
        if (
          !/^0x[a-fA-F0-9]{40}$/.test(owner) ||
          !/^0x[a-fA-F0-9]{40}$/.test(spender) ||
          !/^0x[a-fA-F0-9]{40}$/.test(networkInfo.sci)
        ) {
          console.error('Invalid address format:', { owner, spender, tokenAddress: networkInfo.sci });
          return {
            sciApproved: false,
            usdcApproved: false,
            error: `Invalid address format for SCI allowance check. Please verify all addresses.`,
          };
        }

        console.log('Checking SCI allowance:', {
          tokenAddress: networkInfo.sci,
          owner,
          spender,
          requiredAmount: transactionDetails?.amountSci
        });

        try {
          // First verify the contract exists and has the allowance function
          const code = await publicClient.getCode({
            address: networkInfo.sci as `0x${string}`,
          });

          if (!code || code === '0x') {
            console.error('No contract code found at SCI token address');
            return {
              sciApproved: false,
              usdcApproved: false,
              error: `No contract found at SCI token address ${networkInfo.sci}`,
            };
          }

          const sciAllowance = await publicClient.readContract({
            address: networkInfo.sci as `0x${string}`,
            abi: sciAbi,
            functionName: 'allowance',
            args: [owner as `0x${string}`, spender as `0x${string}`],
          }) as bigint;

          const currentSciAllowance = Number(formatUnits(sciAllowance, 18));
          console.log('Current SCI allowance:', {
            allowance: currentSciAllowance,
            owner,
            spender
          });
          hasSciApproval = currentSciAllowance >= transactionDetails?.amountSci;
          
          if (!hasSciApproval) {
            return {
              sciApproved: false,
              usdcApproved: false,
              error: `Insufficient SCI allowance for proposal action contract. Owner: ${owner.slice(0, 6)}...${owner.slice(-4)}, Action Contract: ${spender.slice(0, 6)}...${spender.slice(-4)}. Current: ${currentSciAllowance.toFixed(2)} SCI, Required: ${transactionDetails?.amountSci} SCI`,
            };
          }
        } catch (error) {
          console.error('Error checking SCI allowance:', error);
          const errorMessage = JSON.stringify(error);
          let specificError = 'Unknown error occurred';
          
          if (errorMessage.includes('execution reverted')) {
            specificError = 'Contract call reverted - token contract may not be compatible with ERC20 standard';
          } else if (errorMessage.includes('network')) {
            specificError = 'Network connection issue';
          }

          console.error('Detailed SCI allowance error:', {
            error,
            owner,
            spender,
            tokenAddress: networkInfo.sci,
            specificError
          });

          return {
            sciApproved: false,
            usdcApproved: false,
            error: `Error checking SCI allowance (${specificError}). Token: ${networkInfo.sci.slice(0, 6)}...${networkInfo.sci.slice(-4)}, Owner: ${owner.slice(0, 6)}...${owner.slice(-4)}, Action Contract: ${spender.slice(0, 6)}...${spender.slice(-4)}`,
          };
        }
      }

      if (
        transactionDetails?.amountUsdc &&
        Number(transactionDetails?.amountUsdc) > 0
      ) {
        const owner = networkInfo?.researchFundingWallet;
        const spender = proposal?.action;

        // Log all relevant addresses and amounts for debugging
        console.log('USDC Allowance Check Configuration:', {
          tokenContract: networkInfo.usdc,
          owner: owner,
          spender: spender,
          requiredAmount: transactionDetails?.amountUsdc,
          requiredAmountRaw: parseUnits(String(transactionDetails?.amountUsdc), 6).toString()
        });

        try {
          // First verify the USDC contract exists
          const code = await publicClient.getCode({
            address: networkInfo.usdc as `0x${string}`,
          });

          if (!code || code === '0x') {
            console.error('No contract code found at USDC token address');
            return {
              sciApproved: false,
              usdcApproved: false,
              error: `No contract found at USDC token address ${networkInfo.usdc}`,
            };
          }

          // Get the current allowance
          const allowanceResult = await publicClient.readContract({
            address: networkInfo.usdc as `0x${string}`,
            abi: usdcAbi as Abi,
            functionName: 'allowance',
            args: [owner as `0x${string}`, spender as `0x${string}`],
          }) as bigint;

          // Calculate required amount in raw units (6 decimals for USDC)
          const requiredAmountRaw = parseUnits(String(transactionDetails?.amountUsdc), 6);

          // Log detailed allowance information
          console.log('USDC Allowance Details:', {
            rawAllowance: allowanceResult.toString(),
            formattedAllowance: formatUnits(allowanceResult, 6),
            requiredAmountRaw: requiredAmountRaw.toString(),
            requiredAmountFormatted: transactionDetails?.amountUsdc,
            hasEnoughAllowance: allowanceResult >= requiredAmountRaw,
            comparisonCheck: {
              allowanceValue: allowanceResult,
              requiredValue: requiredAmountRaw,
              difference: allowanceResult - requiredAmountRaw
            }
          });

          hasUsdcApproval = allowanceResult >= requiredAmountRaw;
          
          if (!hasUsdcApproval) {
            return {
              sciApproved: false,
              usdcApproved: false,
              error: `Insufficient USDC allowance for proposal action contract. Owner: ${owner.slice(0, 6)}...${owner.slice(-4)}, Action Contract: ${spender.slice(0, 6)}...${spender.slice(-4)}. Current: ${formatUnits(allowanceResult, 6)} USDC, Required: ${transactionDetails?.amountUsdc} USDC`,
            };
          }
        } catch (error) {
          console.error('Error checking USDC allowance:', error);
          const errorMessage = JSON.stringify(error);
          let specificError = 'Unknown error occurred';
          
          if (errorMessage.includes('execution reverted')) {
            specificError = 'Contract call reverted - Please verify contract addresses and permissions';
          } else if (errorMessage.includes('network')) {
            specificError = 'Network connection issue';
          }

          console.error('Detailed USDC allowance error:', {
            error,
            owner,
            spender,
            tokenAddress: networkInfo.usdc,
            specificError,
            errorMessage
          });

          return {
            sciApproved: false,
            usdcApproved: false,
            error: `Error checking USDC allowance (${specificError}). Token: ${networkInfo.usdc.slice(0, 6)}...${networkInfo.usdc.slice(-4)}, Owner: ${owner.slice(0, 6)}...${owner.slice(-4)}, Action Contract: ${spender.slice(0, 6)}...${spender.slice(-4)}`,
          };
        }
      }

      return { sciApproved: hasSciApproval, usdcApproved: hasUsdcApproval };
    } catch (error) {
      console.error('Error checking allowances:', error);
      return {
        sciApproved: false,
        usdcApproved: false,
        error: 'Error occurred while checking allowances',
      };
    }
  }, [
    networkInfo?.researchFundingWallet,
    networkInfo?.sci,
    networkInfo?.usdc,
    proposal?.action,
    transactionDetails,
    wallet?.state?.provider,
  ]);

  const checkEligibilityToExecute = useCallback(async (): Promise<boolean> => {
    if (
      enumerateExecutionOptions(proposal?.executionOption) ===
        ExecutionOptions.Transaction &&
      !transactionDetails
    ) {
      handleError('Transaction details are missing.');
      return false;
    }

    try {
      // Check if it's a Transaction-based proposal
      if (
        enumerateExecutionOptions(proposal?.executionOption) ===
        ExecutionOptions.Transaction
      ) {
        const requestedBalanceSci = transactionDetails?.amountSci;
        const requestedBalanceUsdc = transactionDetails?.amountUsdc;

        const hasSufficientSci =
          Number(sciBalanceTreasury) >= Number(requestedBalanceSci);
        const hasSufficientUsdc =
          Number(usdcBalanceTreasury) >= Number(requestedBalanceUsdc);

        if (
          Number(requestedBalanceSci) === 0 &&
          Number(requestedBalanceUsdc) === 0
        ) {
          handleError('SCI and USDC should not be 0');
          return false;
        }

        if (!hasSufficientUsdc && requestedBalanceUsdc) {
          handleError(
            `Insufficient USDC balance in research funding wallet for potential execution, contact DAO admin.`
          );
          return false;
        }

        if (!hasSufficientSci && requestedBalanceSci) {
          handleError(
            `Insufficient SCI balance in research funding wallet for potential execution, contact DAO admin.`
          );
          return false;
        }

        const approvalResult = await checkAdminApproval();

        if (approvalResult.error) {
          handleError(approvalResult.error);
          return false;
        }

        const { sciApproved, usdcApproved } = approvalResult;

        if (!sciApproved && !usdcApproved) {
          handleError(
            `The DAO's multi-sig wallet has not yet approved the proposal contract for the required SCI and USDC amount.`
          );
          return false;
        } else if (!sciApproved) {
          handleError(
            `The DAO's multi-sig wallet has not yet approved the proposal contract for the required SCI amount.`
          );
          return false;
        } else if (!usdcApproved) {
          handleError(
            `The DAO's multi-sig wallet has not yet approved the proposal contract for the required USDC amount.`
          );
          return false;
        }

        return true;
      }

      if (
        enumerateExecutionOptions(proposal?.executionOption) ===
        ExecutionOptions.Election
      ) {
        if (
          !governance?.govResParams?.ddThreshold ||
          !electionDetails ||
          !networkInfo?.sciManager ||
          !wallet?.state?.provider
        )
          return false;

        for (let i = 0; i < electionDetails?.electedWallets?.length; i++) {
          const lockedSci = await publicClient.readContract({
            address: networkInfo.sciManager as `0x${string}`,
            abi: sciManagerAbi,
            functionName: 'getLockedSci',
            args: [electionDetails?.electedWallets[i]],
          }) as bigint;

          if (Number(formatUnits(lockedSci, 18)) <= Number(governance?.govResParams?.ddThreshold)) {
            handleError(
              <>
                <div className="flex w-full flex-col">
                  <span className="flex w-full flex-col">
                    Insufficient SCI locked by elected scientist, contact{' '}
                  </span>
                  <span
                    className="flex  "
                    onClick={() =>
                      handleCopy(electionDetails?.electedWallets[i])
                    }
                    title="Click to copy full address"
                  >
                    <span className="cursor-pointer font-acuminSemiBold text-steelBlue hover:text-tropicalBlue underline">
                      {electionDetails?.electedWallets[i].slice(0, 4) +
                        '...' +
                        electionDetails?.electedWallets[i].slice(-4)}
                      <Copy />
                    </span>
                    &nbsp;
                    <span>to top up.</span>
                  </span>
                </div>
                {copySuccess && (
                  <span className="relative ml-2 text-green-500">
                    {copySuccess}
                  </span>
                )}
              </>
            );
            return false;
          }
        }
        return true;
      }

      if (
        enumerateExecutionOptions(proposal?.executionOption) ===
        ExecutionOptions.Impeachment
      ) {
        if (
          !impeachmentDetails ||
          !networkInfo?.governorResearch ||
          !wallet?.state?.provider
        )
          return false;



        for (let i = 0; i < impeachmentDetails?.impeachedWallets?.length; i++) {
          const hasDueDiligenceRole = await publicClient.readContract({
            address: networkInfo.governorResearch as `0x${string}`,
            abi: govResAbi,
            functionName: 'checkDueDiligenceRole',
            args: [impeachmentDetails?.impeachedWallets[i]],
          }) as boolean;

          if (!hasDueDiligenceRole) {
            handleError(
              `${impeachmentDetails?.impeachedWallets[i]} does not have the due diligence role.`
            );
            return false;
          }
        }
        return true;
      }

      if (
        enumerateExecutionOptions(proposal?.executionOption) ===
        ExecutionOptions.ParameterChange
      ) {
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error checking potential execution:', err);
      try {
        // Create a safe copy of the error by replacing BigInt values with strings
        const safeError = JSON.parse(
          JSON.stringify(
            err,
            (key, value) => 
              typeof value === 'bigint' ? value.toString() : value
          )
        );
        handleRpcError(safeError);
      } catch (jsonError) {
        console.error('Error serializing error object:', jsonError);
        handleError('Error checking execution eligibility');
      }
      return false;
    }
  }, [
    checkAdminApproval,
    copySuccess,
    electionDetails,
    governance?.govResParams?.ddThreshold,
    handleError,
    handleRpcError,
    impeachmentDetails,
    networkInfo?.governorResearch,
    networkInfo?.sciManager,
    proposal?.executionOption,
    sciBalanceTreasury,
    transactionDetails,
    usdcBalanceTreasury,
    wallet?.state?.provider,
  ]);

  const executeProposal = useCallback(async () => {
    if (loading) {
      console.log('Transaction details are still loading...');
      return;
    }

    const eligibleToExecute = await checkEligibilityToExecute();
    if (networkInfo && wallet?.state?.provider && eligibleToExecute) {
      console.log(`Eligible to execute: ${eligibleToExecute}`);

      try {
        setIsLoadingExecution(true);

        if (!wallet.state.publicClient || !wallet.state.walletClient) {
          handleError('Wallet not properly connected');
          return;
        }
        
        const { request } = await wallet.state.publicClient.simulateContract({
          address: networkInfo.governorResearch as `0x${string}`,
          abi: govResAbi,
          functionName: 'execute',
          args: [index],
          account: wallet.state.address,
        });

        const hash = await wallet.state.walletClient.writeContract(request);

        setExecutionTransactionHash(
          `${networkInfo?.explorerLink}/tx/${hash}`
        );
        setExecutionInitiated(true);
        
        // Call the status change callback if provided
        if (onStatusChange && typeof onStatusChange === 'function') {
          console.log('Calling onStatusChange callback after execution');
          onStatusChange();
        }
      } catch (err) {
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
          handleError('Error executing the proposal');
        }
        
        console.error('Error executing the proposal:', err);
      } finally {
        setIsLoadingExecution(false);
      }
    }
  }, [
    wallet,
    networkInfo,
    loading,
    checkEligibilityToExecute,
    handleError,
    handleRpcError,
    index,
    onStatusChange
  ]);

  return {
    executeProposal,
    isLoadingExecution,
    executionTransactionHash,
    executionInitiated,
    setExecutionInitiated,
  };
}
