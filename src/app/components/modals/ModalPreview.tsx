'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import {
  faExternalLinkAlt,
  faCheck,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './../general/Button.module.css';
import ModalUI from './ModalUI';
import TermModal from '../general/TermModal';
import Link from 'next/link';
import InfoToolTip from '../general/InfoToolTip';
import { LoadingSpinner } from '../general/LoadingSpinner';

export default function ModalPreview({
  handler,
  func,
  amount,
  asset,
  gasFee,
  approved,
  message,
  purpose,
  feeCurrency,
  interactingContract,
  explorerLink,
  loading,
}) {
  const wallet = useWallet();
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 2600);
  const [transactionState, setTransactionState] = useState('idle'); // idle, submitting, confirming, success, error

  // Wrap the function to track transaction state
  const handleTransaction = async () => {
    try {
      setTransactionState('submitting');
      const result = await func();

      // Handle different result types
      if (result === true) {
        // Explicit success
        setTransactionState('success');
      } else if (result === false) {
        // Explicit failure
        setTransactionState('error');
        setTimeout(() => {
          setTransactionState('idle');
        }, 3000);
      } else if (result && typeof result === 'object' && 'hash' in result) {
        // Transaction hash returned - waiting for confirmation
        setTransactionState('confirming');
      } else {
        // No explicit result, assume transaction is still processing
        // but don't change state - let the loading prop drive the state
        console.log('Transaction in progress, waiting for completion');
      }
    } catch (error) {
      console.error('Transaction error:', error);
      setTransactionState('error');
      setTimeout(() => {
        setTransactionState('idle');
      }, 3000);
    }
  };

  // Reset transaction state when modal is closed
  useEffect(() => {
    return () => {
      setTransactionState('idle');
    };
  }, []);

  // Update transaction state based on loading prop
  useEffect(() => {
    if (loading && transactionState === 'idle') {
      setTransactionState('submitting');
    } else if (!loading && transactionState === 'submitting') {
      // If loading is false but we're still in submitting state, reset to idle
      // This handles cases where the parent component resets loading without completing a transaction
      setTransactionState('idle');
    }
  }, [loading, transactionState]);

  // Handle transaction state transitions
  useEffect(() => {
    // If we're in the confirming state and loading is false, it means the transaction completed
    if (transactionState === 'confirming' && !loading) {
      setTransactionState('success');
    }
  }, [loading, transactionState]);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 2750);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const walletAddressToDisplay = isSmallScreen
    ? wallet?.state?.address?.slice(0, 4) +
      '...' +
      wallet?.state?.address?.slice(38, 42)
    : wallet?.state?.address;

  const contractAddressToDisplay = isSmallScreen
    ? interactingContract.slice(0, 4) +
      '...' +
      interactingContract.slice(38, 42)
    : interactingContract;

  const renderButton = () => {
    const buttonText =
      purpose === 'Approve' ? `Approve ${asset}` : `Submit ${asset} ${purpose}`;

    switch (transactionState) {
      case 'submitting':
        return (
          <button
            className={`${styles.primary} cursor-not-allowed opacity-90`}
            disabled
          >
            <span className="animate-pulse">Submitting transaction...</span>
            <LoadingSpinner />
          </button>
        );
      case 'confirming':
        return (
          <button
            className={`${styles.primary} cursor-not-allowed opacity-90`}
            disabled
          >
            <span className="animate-pulse">Waiting for confirmation...</span>
            <LoadingSpinner />
          </button>
        );
      case 'success':
        return (
          <button
            className={`${styles.primary} bg-green-600 hover:bg-green-700`}
            onClick={() => handler(false)}
          >
            <span>Transaction successful!</span>
            <FontAwesomeIcon icon={faCheck} className="ml-2 h-5 w-5" />
          </button>
        );
      case 'error':
        return (
          <button
            className={`${styles.primary} bg-red-600 hover:bg-red-700`}
            onClick={() => setTransactionState('idle')}
          >
            <span>Transaction failed. Try again</span>
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="ml-2 h-5 w-5"
            />
          </button>
        );
      default:
        return (
          <button 
            className={styles.primary} 
            onClick={handleTransaction}
            disabled={loading}
          >
            {loading ? (
              <>
                <span>Preparing transaction...</span>
                <LoadingSpinner />
              </>
            ) : (
              buttonText
            )}
          </button>
        );
    }
  };

  return (
    <>
      {asset === 'ETH' ? (
        <ModalUI
          handler={handler}
          glowColorAndBorder={
            'border-highlightRed hover:shadow-glow-highlightRed-intermediate'
          }
        >
          <section className="mb-4 flex w-full flex-col gap-4 sm:w-[30rem]">
            <h3 className="flex-0 mx-2 whitespace-nowrap">{purpose} Summary</h3>
            <hr className="border-b-[1px]" />
            <div className="flex justify-between">
              <span>Connected with: </span>
              <span>
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-steelBlue hover:text-tropicalBlue"
                  href={`${explorerLink}/address/${wallet.state.address}`}
                >
                  {walletAddressToDisplay}&nbsp;
                  <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                </Link>
              </span>
            </div>
            <div className="flex justify-between">
              <span>{purpose} contract: </span>
              <span>
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-steelBlue hover:text-tropicalBlue"
                  href={`${explorerLink}/address/${interactingContract}`}
                >
                  {contractAddressToDisplay}&nbsp;
                  <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                </Link>
              </span>
            </div>
            <div className="flex justify-between">
              <span>Est. gas fees:</span>
              <span>
                <TermModal term={`${Number(gasFee).toFixed(9)} ${asset}`}>
                  These are the fees that need to be paid to network validators
                  to ensure network security.
                </TermModal>
              </span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>{' '}
              <span>
                {(Number(amount) - Number(gasFee)).toFixed(3)} {feeCurrency}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total (amount + fees):</span>{' '}
              {purpose == 'Donation' ? (
                <TermModal
                  term={`${Number(Number(amount).toLocaleString()).toFixed(3)} ${feeCurrency}`}
                >
                  Of your total donated amount, 95% will be used to fund
                  personalized medicine research directly, and 5% will be sent
                  to PoSciDonDAO&apos;s treasury.
                </TermModal>
              ) : (
                <span>
                  {Number(Number(amount).toLocaleString()).toFixed(3)}{' '}
                  {feeCurrency}
                </span>
              )}
            </div>
            <hr className="border-b-[1px]" />
          </section>
          <div className="my-2 flex w-full flex-col items-center justify-center">
            {renderButton()}
          </div>
        </ModalUI>
      ) : approved ? (
        <ModalUI
          handler={handler}
          glowColorAndBorder={
            'border-highlightRed hover:shadow-glow-highlightRed-intermediate'
          }
        >
          <section className="mb-4 flex w-full flex-col gap-4 sm:w-[30rem]">
            <h3 className="mx-2 mx-auto flex w-full items-center justify-center whitespace-nowrap">
              {purpose} Summary
            </h3>
            <hr className="border-b-[1px]" />
            {message && <span className="">{message}</span>}
            <div className="flex justify-between">
              <span>Connected with: </span>
              <Link
                className="text-steelBlue hover:text-tropicalBlue"
                target="_blank"
                rel="noopener noreferrer"
                href={`${explorerLink}/address/${wallet.state.address}`}
              >
                {walletAddressToDisplay}&nbsp;
                <FontAwesomeIcon
                  className="text-steelBlue hover:text-tropicalBlue"
                  icon={faExternalLinkAlt}
                  size="xs"
                />
              </Link>
            </div>
            <div className="flex justify-between">
              <span>{purpose} contract: </span>
              <Link
                className="text-steelBlue hover:text-tropicalBlue"
                target="_blank"
                rel="noopener noreferrer"
                href={`${explorerLink}/address/${interactingContract}`}
              >
                {contractAddressToDisplay}&nbsp;
                <FontAwesomeIcon
                  className="text-steelBlue hover:text-tropicalBlue"
                  icon={faExternalLinkAlt}
                  size="xs"
                />
              </Link>
            </div>
            <div className="flex justify-between">
              <span>Est. gas fees:</span>
              <TermModal term={`${Number(gasFee).toFixed(9)} ${feeCurrency}`}>
                These are the fees that need to be paid to network validators to
                ensure network security.
              </TermModal>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              {purpose == 'Donation' ? (
                <TermModal term={`${Number(amount).toLocaleString()} ${asset}`}>
                  Of your total donated amount, 95% will be used to fund
                  personalized medicine research directly, and 5% will be sent
                  to PoSciDonDAO&apos;s treasury.
                </TermModal>
              ) : (
                <span>
                  {Number(amount).toLocaleString()} {asset}
                </span>
              )}
            </div>
            <hr className="border-b-[1px]" />
          </section>
          <div className="my-2 flex w-full flex-col items-center justify-center">
            {renderButton()}
          </div>
        </ModalUI>
      ) : (
        <ModalUI
          handler={handler}
          glowColorAndBorder={
            'border-highlightRed hover:shadow-glow-highlightRed-intermediate'
          }
        >
          <section className="mb-4 flex w-full flex-col gap-4 sm:w-[30rem]">
            <h3 className="flex-0 mx-2 whitespace-nowrap">Approval Summary</h3>
            <hr className="border-b-[1px]" />
            <div className="flex justify-between">
              <span>Connected with: </span>
              <Link
                className="text-steelBlue hover:text-tropicalBlue"
                target="_blank"
                rel="noopener noreferrer"
                href={`${explorerLink}/address/${wallet.state.address}`}
              >
                {walletAddressToDisplay}&nbsp;
                <FontAwesomeIcon
                  className="text-steelBlue hover:text-tropicalBlue"
                  icon={faExternalLinkAlt}
                  size="xs"
                />
              </Link>
            </div>
            <div className="flex justify-between">
              <span>{asset} contract: </span>
              <Link
                className="text-steelBlue hover:text-tropicalBlue"
                target="_blank"
                rel="noopener noreferrer"
                href={`${explorerLink}/address/${interactingContract}`}
              >
                {contractAddressToDisplay}&nbsp;
                <FontAwesomeIcon
                  className="text-steelBlue hover:text-tropicalBlue"
                  icon={faExternalLinkAlt}
                  size="xs"
                />
              </Link>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>
                {Number(amount).toLocaleString()} {asset}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Est. gas fees:</span>
              <TermModal term={`${Number(gasFee).toFixed(9)} ${feeCurrency}`}>
                These are the fees that need to be paid to network validators to
                ensure network security.
              </TermModal>
            </div>
            <div className="flex flex-row items-center justify-center text-base text-highlightRed">
              <span className="">Transaction confirmation after approval</span>
              <div className="pl-1">
                <InfoToolTip>
                  Approving is the act of giving the smart contract the
                  permission to move your assets from your wallet to a
                  PoSciDonDAO address. Once approved, you will need to confirm
                  another transaction to actually, for example, donate or lock
                  your assets.
                </InfoToolTip>
              </div>
            </div>

            <hr className="border-b-[1px]" />
          </section>
          <div className="my-2 flex w-full flex-col items-center justify-center">
            {renderButton()}
          </div>
        </ModalUI>
      )}
    </>
  );
}
