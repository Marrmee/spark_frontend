'use client';

import {
  parseEther,
  formatEther,
  Address,
} from 'viem';
import type { Abi } from 'viem';
import { useNetworkInfo } from '../../context/NetworkInfoContext';
import { useState, useEffect } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { getProposeLockEnd } from '../governance/GetProposeLockEnd';
import { getVoteLockEnd } from '../governance/GetVoteLockEnd';
import { getLatestBlockTimestamp } from '../governance/GetLatestBlockTimestamp';
import { CustomError } from '@/app/utils/rpcErrorInterfaces';
import { useEcosystemBalances } from '../hooks/UseEcosystemBalances';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import Input from './Input';
import ModalPreview from '../modals/ModalPreview';
import Modal from '../modals/Modal';
import styles from './Button.module.css';
import ConnectWallet from './ConnectWallet';
import Link from 'next/link';
import SciTokenAndVotes from '@/app/components/balances/SciTokenAndVotes';
import sciManagerAbi from '@/app/abi/SciManager.json';
import { convertSecondsToReadableTime } from './ConvertSecondsToTime';
import { useGovernance } from '@/app/context/GovernanceContext';
import { useNotification } from '@/app/context/NotificationContext';
import CountdownTimer from './Countdown';
import ActionButtonWrapper from './ActionButtonWrapper';
import { usePriceContext } from '@/app/context/PriceContext';

export default function Unlock() {
  const [gasFee, setGasFee] = useState('');
  const [amount, setInputAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unlockingPreviewSci, setUnlockingPreviewSci] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [unlockingInitiated, setUnlockingInitiated] = useState(false);
  const [lockEndTime, setLockEndTime] = useState<number>();
  const [dynamicTimestamp, setDynamicTimestamp] = useState(0);
  const wallet = useWallet();
  const networkInfo = useNetworkInfo();
  const governance = useGovernance();
  const { addNotification } = useNotification();
  const { prices } = usePriceContext();
  const sciPrice = prices.SCI ?? 0;

  const handlePreviewError = (message: string) => {
    addNotification(message, 'error');
  };

  const handleRpcError = (errorObj: CustomError) => {
    if (errorObj?.shortMessage) {
      addNotification(errorObj.shortMessage, 'error');
    }
  };


  useEffect(() => {
    const interval = setInterval(() => {
      setDynamicTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchLockEnd = async () => {
      if (networkInfo?.sciManager && wallet?.state?.address) {
        const fetchedLatestBlockTimestamp = await getLatestBlockTimestamp();
        const fetchedProposeLockEndTime = Number(
          await getProposeLockEnd(
            networkInfo?.sciManager,
            sciManagerAbi,
            wallet.state.address
          )
        );
        const fetchedVoteLockEndTime = Number(
          await getVoteLockEnd(
            networkInfo?.sciManager,
            sciManagerAbi as Abi,
            wallet.state.address
          )
        );
        let endTime;
        if (fetchedLatestBlockTimestamp) {
          if (fetchedProposeLockEndTime > fetchedLatestBlockTimestamp) {
            endTime = fetchedProposeLockEndTime;
          } else if (fetchedVoteLockEndTime > fetchedLatestBlockTimestamp) {
            endTime = fetchedVoteLockEndTime;
          } else {
            endTime = 0;
          }
        } else {
          return null;
        }
        setLockEndTime(endTime);
      }
    };
    fetchLockEnd();
  }, [networkInfo?.sciManager, wallet?.state?.address]);

  const { lockedSci } = useEcosystemBalances(
    wallet?.state?.address ?? '',
    '',
    '',
    networkInfo?.sciManager
  );

  const handlePreview = async (amount: number) => {
    console.log('handlePreview called with amount:', amount);
    if (!networkInfo || !wallet?.state?.address || !wallet?.state?.publicClient) {
      console.log('Preview rejected - missing networkInfo or wallet address');
      handlePreviewError('Ensure you are logged in');
      return;
    }
    try {
      setLoading(true);
      console.log('Checking eligibility to unlock...');
      const waitingTime = await checkEligibilityToUnlock();
      console.log('Waiting time:', waitingTime);

      if (waitingTime && waitingTime > 0) {
        handlePreviewError(
          `Wait ${convertSecondsToReadableTime(Number(waitingTime))} to unlock`
        );
      } else {
        console.log('Fetching locked SCI balance...');
        const lockedSci = await wallet.state.publicClient.readContract({
          address: networkInfo.sciManager as Address,
          abi: sciManagerAbi as Abi,
          functionName: 'getLockedSci',
          args: [wallet.state.address]
        }) as bigint;
        console.log('Locked SCI balance:', lockedSci.toString());

        if (Number(lockedSci) < Number(parseEther(String(amount)))) {
          handlePreviewError(`Insufficient locked token balance.`);
        } else if (amount === 0) {
          handlePreviewError(`Cannot unlock 0 tokens.`);
        } else {
          console.log('Starting gas fee estimation...');
          await estimateGasFeesUnlockingSci(amount);
          setUnlockingPreviewSci(true);
        }
      }
    } catch (err) {
      console.error('Error in handlePreview:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibilityToUnlock = async () => {
    try {
      if (!governance?.isEmergency) {
        const proposalLockEnd = Number(await getProposeLockEnd(
          networkInfo?.sciManager ?? '0x0',
          sciManagerAbi as Abi,
          wallet.state.address ?? '0x0'
        ));
        const voteLockEndTime = Number(await getVoteLockEnd(
          networkInfo?.sciManager ?? '0x0',
          sciManagerAbi as Abi,
          wallet.state.address ?? '0x0'
        ));
        const currentBlockTimestamp = Number(await getLatestBlockTimestamp());

        if (currentBlockTimestamp) {
          if (proposalLockEnd > currentBlockTimestamp) {
            return proposalLockEnd - currentBlockTimestamp;
          } else if (voteLockEndTime > currentBlockTimestamp) {
            return voteLockEndTime - currentBlockTimestamp;
          }
          return 0;
        }
      } else {
        return null;
      }
    } catch (err) {
      console.error('Error checking eligibility to unlock:', err);
      const error = JSON.parse(JSON.stringify(err));
      handlePreviewError(error?.shortMessage);
      handleRpcError(error);
      return null;
    }
  };

  async function estimateGasFeesUnlockingSci(amount: number) {
    console.log('Starting gas fee estimation with amount:', amount);
    console.log('Wallet state:', {
      hasWalletClient: !!wallet?.state?.walletClient,
      address: wallet?.state?.address,
      sciManager: networkInfo?.sciManager,
    });

    if (!wallet?.state?.publicClient || !wallet?.state?.walletClient || !wallet?.state?.address || !networkInfo?.sciManager) {
      console.log('Missing required dependencies for gas estimation');
      return;
    }

    try {
      setLoading(true);
      console.log('Converting amount to wei:', amount);
      const sciAmount = parseEther(String(amount));
      console.log('Amount in wei:', sciAmount.toString());
      
      console.log('Simulating contract call...');
      try {
        const { request } = await wallet.state.publicClient.simulateContract({
          address: networkInfo.sciManager as Address,
          abi: sciManagerAbi as Abi,
          functionName: 'free',
          args: [sciAmount],
          account: wallet.state.address,
        });
        console.log('Simulation successful, request:', request);

        console.log('Estimating gas...');
        const estimatedGas = await wallet.state.publicClient.estimateContractGas({
          address: networkInfo.sciManager as Address,
          abi: sciManagerAbi as Abi,
          functionName: 'free',
          args: [sciAmount],
          account: wallet.state.address
        });
        console.log('Estimated gas:', estimatedGas.toString());

        console.log('Fetching gas price...');
        const gasPrice = await wallet.state.publicClient.getGasPrice();
        console.log('Current gas price:', gasPrice.toString());

        const fee = estimatedGas * gasPrice;
        console.log('Calculated fee in wei:', fee.toString());
        console.log('Calculated fee in ETH:', formatEther(BigInt(fee)));

        setGasFee(formatEther(BigInt(fee)));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (simulationErr: any) {
        console.error('Contract simulation failed:', simulationErr);
        // Check for specific error conditions
        if (simulationErr.message?.includes('insufficient funds')) {
          handlePreviewError('Insufficient funds to cover gas costs');
        } else if (simulationErr.message?.includes('execution reverted')) {
          const revertReason = simulationErr.message.split('execution reverted:')[1]?.trim() || 'Unknown reason';
          handlePreviewError(`Transaction would fail: ${revertReason}`);
        } else {
          handlePreviewError('Unable to estimate gas: The transaction would fail');
        }
        throw simulationErr; // Re-throw to trigger the outer catch block
      }
    } catch (err) {
      console.error('Detailed gas estimation error:', err);
      let error;
      if (err instanceof Error) {
        error = JSON.parse(JSON.stringify(err, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ));
        // Don't show the error again if it was already handled in the simulation catch block
        if (!err.message?.includes('execution reverted') && !err.message?.includes('insufficient funds')) {
          handleRpcError(error);
        }
      } else {
        error = { shortMessage: 'Failed to estimate gas fees' };
        handleRpcError(error);
      }
      console.error('Processed error:', error);
      setGasFee('');
    } finally {
      setLoading(false);
      console.log('Gas fee estimation completed');
    }
  }

  async function unlockSci(amount: number) {
    if (!wallet?.state?.walletClient || !wallet?.state?.address || !networkInfo?.sciManager || !wallet?.state?.publicClient) return;

    try {
      setLoading(true);
      const sciAmount = parseEther(String(amount));

      const { request } = await wallet.state.publicClient.simulateContract({
        address: networkInfo.sciManager as Address,
        abi: sciManagerAbi as Abi,
        functionName: 'free',
        args: [sciAmount],
        account: wallet.state.address,
      });

      const hash = await wallet.state.walletClient.writeContract(request);
      console.log('Unlock transaction submitted with hash:', hash);

      if (wallet?.state?.isSmartContractWallet && hash) {
        setTransactionHash(`${networkInfo?.explorerLink}/tx/${hash}`);
        setUnlockingPreviewSci(false);
        setUnlockingInitiated(true);
        
        // For smart contract wallets, we need to wait a moment before refreshing TVL
        // as the transaction might not be immediately processed
        setTimeout(async () => {
          await refreshTVLData();
        }, 2000); // Wait 2 seconds before refreshing
      } else {
        // For regular wallets, wait for transaction receipt
        const receipt = await wallet.state.publicClient.waitForTransactionReceipt({ hash });
        console.log('Unlock transaction receipt:', receipt);
        
        if (receipt.status === 'success') {
          setTransactionHash(`${networkInfo?.explorerLink}/tx/${hash}`);
          setUnlockingPreviewSci(false);
          setUnlockingInitiated(true);
          
          // Refresh TVL data after successful unlocking
          await refreshTVLData();
          
          // Force a UI update by dispatching a custom event
          const forceUpdateEvent = new CustomEvent('force-tvl-update', {
            detail: { source: 'unlock-operation' }
          });
          window.dispatchEvent(forceUpdateEvent);
        } else {
          console.error('Transaction failed:', receipt);
          addNotification('Transaction failed. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error unlocking SCI:', error);

      // Handle RPC errors
      if ((error as CustomError)?.shortMessage) {
        handleRpcError(error as CustomError);
      } else {
        addNotification(
          `Error unlocking SCI: ${(error as Error).message}`,
          'error'
        );
      }

      return false;
    } finally {
      setLoading(false);
    }
  }

  // Function to refresh TVL data after successful unlocking
  const refreshTVLData = async () => {
    try {
      console.log('Refreshing TVL data after unlocking...');

      // Dispatch a force update event
      const event = new CustomEvent('force-tvl-update', {
        detail: {
          source: 'unlock-operation',
          timestamp: Date.now(),
        },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error refreshing TVL data:', error);
    }
  };

  return (
    <section className="flex w-full flex-col text-center">
      <h1
        className="
      mb-1
      flex
      w-full
      items-center
      justify-center
      font-acuminSemiBold 
      text-4xl
      uppercase
      sm:text-5xl 
      "
      >
        UNLOCK SCI
      </h1>
      <p className="mb-1 text-sm sm:text-base">
        Unlock SCI tokens to reduce voting power
      </p>

      {wallet?.state?.address && wallet?.state?.isVerified && (
        <div className="mb-2 flex justify-center">
          <Link
            href={`${networkInfo?.explorerLink}/address/${wallet?.state?.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-[#4a8eff] transition-colors duration-200 hover:text-[#6ba5ff]"
          >
            View on Explorer{' '}
            <FontAwesomeIcon
              icon={faExternalLinkAlt}
              className="ml-1"
              size="xs"
            />
          </Link>
        </div>
      )}

      <div
        className="
                    flex 
                    w-full 
                    items-center
                    justify-center
                    rounded-lg
                    border-[1px] 
                    border-seaBlue-700                       
                    p-2
                    px-4
                    "
      >
        <SciTokenAndVotes />
      </div>
      <Input amount={amount} setInputAmount={setInputAmount} max={lockedSci} />
      {wallet?.state?.address && wallet?.state?.isVerified ? (
        <>
          {sciPrice > 0 && amount > 0 && (
            <div className="mt-[-8px] mb-2 text-center text-sm text-gray-400">
              Value: $
              {(amount * sciPrice).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          )}

          {loading ? (
            <button className={`${styles.primary}`}>
              <span className="animate-pulse">Fetching Preview...</span>
              <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
            </button>
          ) : !governance?.isEmergency &&
            lockEndTime &&
            lockEndTime > dynamicTimestamp ? (
            <div className="mt-[-4px] flex w-full flex-col items-center justify-center gap-2 text-sm sm:text-base">
              Time until unlock:
              <CountdownTimer
                endTimestamp={lockEndTime}
                className="w-full rounded-lg border-seaBlue-1025 bg-seaBlue-900 py-3 text-sm sm:text-base"
              />
            </div>
          ) : (
            <ActionButtonWrapper
              isLoading={loading}
              loadingText="Fetching Unlock Preview..."
            >
              <button
                className={styles.primary}
                onClick={() => handlePreview(amount)}
              >
                Preview Unlocking SCI
              </button>
            </ActionButtonWrapper>
          )}
        </>
      ) : (
        <div className="w-full">
          <ConnectWallet isNavBar={false} toggleAccountMenu={() => null} />
        </div>
      )}
      {unlockingPreviewSci && (
        <ModalPreview
          handler={setUnlockingPreviewSci}
          func={async () => await unlockSci(amount)}
          // error={''}
          // rpcError={rpcError?.shortMessage}
          amount={amount}
          asset={'SCI'}
          gasFee={gasFee}
          approved={true}
          message={``}
          purpose={`Unlocking`}
          feeCurrency={'ETH'}
          explorerLink={networkInfo?.explorerLink}
          interactingContract={networkInfo?.sciManager}
          loading={loading}
        />
      )}
      {unlockingInitiated && (
        <Modal
          transactionHash={transactionHash}
          handler={setUnlockingInitiated}
          title={'Tokens unlocked successfully'}
          subtitle={'We are sad to see you leave!'}
        >
          <div>
            Lock your tokens again{' '}
            <Link
              className="text-steelBlue hover:text-tropicalBlue"
              rel="noopener noreferrer"
              href="/lock"
            >
              here
            </Link>{' '}
          </div>
          <div>
            <Link
              className="text-steelBlue hover:text-tropicalBlue"
              target="_blank"
              rel="noopener noreferrer"
              href="https://discord.gg/75SrHpcNSZ"
            >
              Join our discord{' '}
              <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
            </Link>{' '}
            to stay up to date
          </div>
        </Modal>
      )}
    </section>
  );
}
