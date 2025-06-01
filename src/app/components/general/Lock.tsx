'use client';

import { useNetworkInfo } from '../../context/NetworkInfoContext';
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { CustomError } from '@/app/utils/rpcErrorInterfaces';
import { useEcosystemBalances } from '../hooks/UseEcosystemBalances';
import Input from './Input';
import ModalPreview from '../modals/ModalPreview';
import Modal from '../modals/Modal';
import styles from './Button.module.css';
import ConnectWallet from './ConnectWallet';
import Link from 'next/link';
import SciTokenAndVotes from '@/app/components/balances/SciTokenAndVotes';
import sciAbi from '@/app/abi/Sci.json';
import sciManagerAbi from '@/app/abi/SciManager.json';
import { useNotification } from '@/app/context/NotificationContext';
import ActionButtonWrapper from './ActionButtonWrapper';
import { parseEther, formatEther, Address } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { useVoucher } from '../../context/VoucherContext';

export default function Lock() {
  const [allowance, setAllowance] = useState(0);
  const [gasFee, setGasFee] = useState('');
  const [approvalGasFee, setApprovalGasFee] = useState('');
  const [amount, setInputAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [approvalPreviewSci, setApprovalPreviewSci] = useState(false);
  const [lockingPreviewSci, setLockingPreviewSci] = useState(false);
  const [lockingInitiated, setLockingInitiated] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const wallet = useWallet();
  const networkInfo = useNetworkInfo();
  const { sci } = useEcosystemBalances(
    wallet?.state?.address ?? '',
    '',
    networkInfo?.sci,
    networkInfo?.sciManager
  );
  const { addNotification } = useNotification();
  const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);
  const { voucher, isLoading: isVoucherLoading } = useVoucher();

  // Check if user is unique (either phone or govId verification)
  const isUnique = wallet?.state?.isUniquePhone || wallet?.state?.isUniqueGovId;

  // Add effect to ensure uniqueness check is performed when component mounts
  useEffect(() => {
    // Only perform check if wallet is connected, verified, but uniqueness hasn't been checked yet
    if (
      wallet?.state?.address &&
      wallet?.state?.isVerified &&
      !wallet?.state?.uniquenessChecked &&
      wallet?.checkUniqueness
    ) {
      console.log('Explicitly performing uniqueness check in Lock component');
      wallet.checkUniqueness(wallet.state.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wallet?.state?.address,
    wallet?.state?.isVerified,
    wallet?.state?.uniquenessChecked,
    wallet?.checkUniqueness,
  ]);

  // Reset loading state when modals are closed
  useEffect(() => {
    if (!approvalPreviewSci && !lockingPreviewSci) {
      setLoading(false);
    }
  }, [approvalPreviewSci, lockingPreviewSci]);

  const handlePreviewError = useCallback(
    (message: string) => {
      addNotification(message, 'error');
    },
    [addNotification]
  );

  const handleRpcError = useCallback(
    (errorObj: CustomError | Error) => {
      if (
        errorObj instanceof Error &&
        errorObj.message.includes('Do not know how to serialize a BigInt')
      ) {
        addNotification(
          'Error processing transaction. Please try again.',
          'error'
        );
      } else if ('shortMessage' in errorObj) {
        addNotification(errorObj.shortMessage, 'error');
      } else {
        addNotification(
          errorObj instanceof Error ? errorObj.message : 'An error occurred',
          'error'
        );
      }
    },
    [addNotification]
  );

  const fetchAllowance = useCallback(async () => {
    if (
      wallet?.state?.address &&
      networkInfo?.sci &&
      wallet.state.publicClient
    ) {
      try {
        const allowanceBigInt = (await wallet.state.publicClient.readContract({
          address: networkInfo.sci as Address,
          abi: sciAbi,
          functionName: 'allowance',
          args: [wallet.state.address, networkInfo.sciManager],
        })) as bigint;

        // Convert BigInt to string first, then to number to avoid serialization issues
        const allowanceString = formatEther(allowanceBigInt);
        setAllowance(Number(allowanceString));
      } catch (error) {
        console.error('Error fetching allowance:', error);
        // Handle specific Silk wallet error
        if (error?.message?.includes('Do not know how to serialize a BigInt')) {
          handlePreviewError('Error fetching allowance. Please try again.');
        }
      }
    }
  }, [
    wallet?.state?.address,
    networkInfo?.sci,
    networkInfo?.sciManager,
    wallet.state.publicClient,
    handlePreviewError,
  ]);

  useEffect(() => {
    if (!wallet?.state?.address) return;
    fetchAllowance();
  }, [fetchAllowance, wallet?.state?.address]);

  const handlePreview = async (amount: number) => {
    if (!networkInfo || !wallet?.state?.address) {
      handlePreviewError('Ensure you are logged in');
      return;
    }
    try {
      setLoading(true);
      const sciAmount = parseEther(String(amount));
      const parsedSciBalance = parseEther(String(sci));

      // Compare BigInts directly without converting to Number
      if (sciAmount > parsedSciBalance) {
        handlePreviewError(`Insufficient balance`);
      } else if (amount === 0 || String(amount) === '') {
        handlePreviewError(`Cannot lock 0 tokens`);
      } else {
        await estimateGasFeesApprovalSci(amount);
        setApprovalPreviewSci(true);
      }
    } catch (err) {
      handleRpcError(err instanceof Error ? err : new Error(String(err)));
      console.error('Error in handlePreview:', err);
    } finally {
      setLoading(false);
    }
  };

  async function estimateGasFeesApprovalSci(amount: number) {
    const publicClient = wallet?.state?.publicClient;
    if (
      wallet?.state?.walletClient &&
      wallet?.state?.address &&
      networkInfo?.sci &&
      publicClient
    ) {
      try {
        setLoading(true);
        const sciAmount = parseEther(String(amount));

        const gasEstimate = await publicClient.estimateContractGas({
          address: networkInfo.sci as Address,
          abi: sciAbi,
          functionName: 'approve',
          args: [networkInfo.sciManager, sciAmount],
          account: wallet.state.address,
        });

        const gasPrice = await publicClient.getGasPrice();

        const fee = BigInt(gasEstimate) * BigInt(gasPrice);
        const feeString = formatEther(fee);
        setApprovalGasFee(feeString);
      } catch (err) {
        handleRpcError(err instanceof Error ? err : new Error(String(err)));
        console.error('Gas estimation error:', err);
      } finally {
        setLoading(false);
      }
    }
  }

  async function approveSci(amount: number) {
    const publicClient = wallet?.state?.publicClient;
    if (
      wallet?.state?.walletClient &&
      networkInfo?.sci &&
      publicClient &&
      publicClient.chain
    ) {
      try {
        setLoading(true);
        const sciAmount = parseEther(String(amount));
        console.log('Is this being called?');
        const { request } = await publicClient.simulateContract({
          address: networkInfo.sci as Address,
          abi: sciAbi,
          functionName: 'approve',
          args: [networkInfo.sciManager, sciAmount],
          account: wallet.state.address as Address,
        });
        console.log(request);
        const hash = await wallet.state.walletClient.writeContract(request);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
          // Add success notification
          addNotification(
            'SCI token approval successful! Preparing locking preview...',
            'success'
          );

          await estimateGasFeesLockingSci(amount);
          setApprovalPreviewSci(false);
          setLockingPreviewSci(true);

          return true;
        }
        return false;
      } catch (err) {
        handleRpcError(err instanceof Error ? err : new Error(String(err)));
        console.error('Approval error:', err);
        return false;
      } finally {
        setLoading(false);
      }
    }
    return false;
  }

  async function estimateGasFeesLockingSci(amount: number) {
    const publicClient = wallet?.state?.publicClient;
    if (
      wallet?.state?.walletClient &&
      networkInfo?.sciManager &&
      publicClient
    ) {
      try {
        // Don't set loading state here since it's managed by the calling function
        const sciAmount = parseEther(String(amount));

        const gasEstimate = await publicClient.estimateContractGas({
          address: networkInfo.sciManager as Address,
          abi: sciManagerAbi,
          functionName: 'lock',
          args: [sciAmount],
          account: wallet.state.address as Address,
        });

        const gasPrice = await publicClient.getGasPrice();
        const fee = BigInt(gasEstimate) * BigInt(gasPrice);
        const feeString = formatEther(fee);
        setGasFee(feeString);
      } catch (err) {
        handleRpcError(err instanceof Error ? err : new Error(String(err)));
        console.error('Gas estimation error:', err);
        // Close the locking preview modal if gas estimation fails
        setLockingPreviewSci(false);
        throw err;
      }
    }
  }

  async function lock(amount: number) {
    const publicClient = wallet?.state?.publicClient;
    if (
      wallet?.state?.walletClient &&
      wallet?.state?.address &&
      networkInfo?.sciManager &&
      publicClient &&
      publicClient.chain
    ) {
      try {
        setLoading(true);
        const sciAmount = parseEther(String(amount));

        const { request } = await publicClient.simulateContract({
          address: networkInfo.sciManager as Address,
          abi: sciManagerAbi,
          functionName: 'lock',
          args: [sciAmount],
          account: wallet.state.address as Address,
        });

        const hash = await wallet.state.walletClient.writeContract(request);

        if (wallet?.state?.isSmartContractWallet && hash) {
          setTransactionHash(`${networkInfo?.explorerLink}/tx/${hash}`);
          setLockingPreviewSci(false);
          setLockingInitiated(true);

          // Reset input amount after successful transaction
          setInputAmount(0);

          // Add success notification
          addNotification('SCI tokens locked successfully!', 'success');

          return true;
        } else {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash,
          });
          if (receipt.status === 'success') {
            setTransactionHash(`${networkInfo?.explorerLink}/tx/${hash}`);
            setLockingPreviewSci(false);
            setLockingInitiated(true);

            // Reset input amount after successful transaction
            setInputAmount(0);

            // Add success notification
            addNotification('SCI tokens locked successfully!', 'success');

            return true;
          }
        }
        return false;
      } catch (err) {
        handleRpcError(err instanceof Error ? err : new Error(String(err)));
        console.error('Lock error:', err);
        return false;
      } finally {
        setLoading(false);
      }
    }
    return false;
  }

  // Function to refresh TVL data after successful locking

  const handleLockingPreview = async () => {
    try {
      setLoading(true);
      if (amount == 0) {
        handlePreviewError('Cannot lock 0 tokens');
      } else {
        await estimateGasFeesLockingSci(amount);
        setLockingPreviewSci(true);
      }
    } catch (err) {
      const error = JSON.parse(JSON.stringify(err));
      console.log(error);
    } finally {
      setLoading(false);
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
        LOCK SCI
      </h1>
      <p className="text-sm sm:text-base">
        Lock your SCI tokens to obtain voting power
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
        className={`
              flex 
              w-full 
              items-center 
              justify-center
              rounded-lg 
              border-[1px] 
              border-seaBlue-700   
              p-2
              px-4
              ${!wallet?.state?.isVerified ? 'mt-2' : ''}
        `}
      >
        <SciTokenAndVotes />
      </div>
      <Input amount={amount} setInputAmount={setInputAmount} max={sci} />
      {wallet.state.address && wallet?.state?.isVerified ? (
        <>
          <ActionButtonWrapper
            isLoading={loading}
            loadingText={
              allowance >= amount
                ? 'Fetching Locking Preview...'
                : 'Fetching Approval Preview...'
            }
          >
            {allowance >= amount ? (
              <button className={styles.primary} onClick={handleLockingPreview}>
                Preview Locking SCI
              </button>
            ) : (
              <button
                className={styles.primary}
                onClick={() => {
                  console.log(amount);
                  handlePreview(amount);
                }}
              >
                Preview Approval Locking SCI
              </button>
            )}
          </ActionButtonWrapper>
        </>
      ) : (
        <div className="w-full">
          <ConnectWallet isNavBar={false} toggleAccountMenu={() => null} />
        </div>
      )}
      {approvalPreviewSci && (
        <ModalPreview
          handler={setApprovalPreviewSci}
          func={async () => await approveSci(amount)}
          // error={''}
          // rpcError={rpcError?.shortMessage}
          amount={amount}
          asset={'SCI'}
          gasFee={approvalGasFee}
          approved={false}
          message={'Approval successful, awaiting locking...'}
          purpose={`Approve`}
          feeCurrency={'ETH'}
          explorerLink={networkInfo?.explorerLink}
          interactingContract={networkInfo?.sci}
          loading={loading}
        />
      )}
      {lockingPreviewSci && (
        <ModalPreview
          handler={setLockingPreviewSci}
          func={async () => await lock(amount)}
          // error={''}
          // rpcError={rpcError?.shortMessage}
          amount={amount}
          asset={'SCI'}
          gasFee={gasFee}
          approved={true}
          message={''}
          purpose={`Locking`}
          feeCurrency={'ETH'}
          explorerLink={networkInfo?.explorerLink}
          interactingContract={networkInfo?.sciManager}
          loading={loading}
        />
      )}
      {lockingInitiated && (
        <Modal
          transactionHash={transactionHash}
          handler={() => {
            setLockingInitiated(false);
            // Reset input amount when modal is closed
            setInputAmount(0);
          }}
          title={'Tokens locked successfully'}
          subtitle={'We are eternally grateful for your support!'}
        >
          {isUnique ? (
            <div>
              And{' '}
              <Link
                className="text-steelBlue hover:text-tropicalBlue"
                href="/governance/operations/"
              >
                start voting on proposals
              </Link>{' '}
              to have a say in the future of PoSciDonDAO &#128305;
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <p className="mb-2 text-highlightRed">
                Verification required to vote!
              </p>
              <p className="mb-2">
                Verify account with phone or ID{' '}
                <button
                  className="inline-flex items-center text-steelBlue hover:text-tropicalBlue"
                  onClick={() => {
                    if (!wallet.state.address) return;

                    setIsLoadingVoucher(true);
                    try {
                      console.log('Using existing voucher data:', voucher);
                      
                      if (voucher.verificationUrl && voucher.voucherId) {
                        // Try to open the verification URL
                        console.log('Opening URL with voucher:', `${voucher.verificationUrl}`);
                        const popupWindow = window.open(`${voucher.verificationUrl}`, '_blank');
                        
                        // Check if popup was blocked
                        if (!popupWindow || popupWindow.closed || typeof popupWindow.closed === 'undefined') {
                          console.error('Popup was blocked by the browser');
                          
                          // Show a more visible direct link option with instructions
                          const directLinkElement = document.getElementById('lock-direct-verification-link');
                          if (directLinkElement) {
                            directLinkElement.classList.add('animate-pulse', 'text-highlightRed', 'font-bold');
                            setTimeout(() => {
                              directLinkElement.classList.remove('animate-pulse', 'text-highlightRed', 'font-bold');
                            }, 5000);
                          }
                          
                          // Create a clickable link with the voucher URL
                          const verifyLinkElement = document.getElementById('lock-verification-url-with-voucher');
                          if (verifyLinkElement) {
                            verifyLinkElement.setAttribute('href', voucher.verificationUrl);
                            verifyLinkElement.textContent = 'Click here to verify';
                            verifyLinkElement.style.display = 'inline';
                          }
                          
                          // Show notification to the user
                          addNotification('Popup blocked! Please use the direct link below.', 'error');
                        }
                      } else {
                        console.error('Missing verificationUrl or voucherId:', voucher);
                        // Fallback to default URL
                        window.open(
                          'https://silksecure.net/holonym/diff-wallet/phone/issuance/prereqs',
                          '_blank'
                        );
                      }
                    } catch (error) {
                      console.error('Error opening verification URL:', error);
                      // Fallback to default URL
                      window.open(
                        'https://silksecure.net/holonym/diff-wallet/phone/issuance/prereqs',
                        '_blank'
                      );
                    } finally {
                      setIsLoadingVoucher(false);
                    }
                  }}
                  disabled={isLoadingVoucher || isVoucherLoading}
                >
                  here
                  {isLoadingVoucher || isVoucherLoading ? (
                    <span className="ml-1">Loading...</span>
                  ) : (
                    <FontAwesomeIcon
                      icon={faExternalLinkAlt}
                      size="xs"
                      className="ml-1"
                    />
                  )}
                </button>
              </p>
              <p>
                <span className="text-gray-400" id="lock-direct-verification-link">Direct link: </span>
                <a 
                  href="https://silksecure.net/holonym/diff-wallet/phone/issuance/prereqs" 
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-steelBlue hover:text-tropicalBlue"
                  id="lock-verification-url-with-voucher"
                >
                  silksecure.net <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                </a>
                <span className="text-gray-400 text-xs ml-2">(use if button above doesn&apos;t work)</span>
              </p>
            </div>
          )}
        </Modal>
      )}
      {/* Add price information */}
      {/* {sciPrice > 0 && amount > 0 && (
        <div className="mt-2 text-center text-sm text-gray-400">
          Value: ${(amount * sciPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )} */}
    </section>
  );
}
