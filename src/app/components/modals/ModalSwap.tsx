'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './../general/Button.module.css';
import ModalUI from './ModalUI';
import TermModal from '../general/TermModal';
import Link from 'next/link';

export default function ModalSwap({
  handler,
  func,
  amount,
  amountSci,
  asset,
  gasFee,
  purpose,
  feeCurrency,
  interactingContract,
  explorerLink,
  loading,
  isSimulationSuccessful = true,
}) {
  const wallet = useWallet();
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 2600);
  const [accepted, setAccepted] = useState(false);

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

  return (
    <ModalUI
      handler={handler}
      glowColorAndBorder={'border-highlightRed hover:shadow-glow-highlightRed-intermediate'}
    >
      <section className="flex w-full flex-col gap-4 sm:min-w-[25rem]">
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
              <FontAwesomeIcon icon={faExternalLinkAlt} />
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
              <FontAwesomeIcon icon={faExternalLinkAlt} />
            </Link>
          </span>
        </div>
        <div className="flex justify-between">
          <span>Est. gas fees:</span>
          <span>
            <TermModal term={`${Number(gasFee).toFixed(9)} ${feeCurrency}`}>
              These are the fees that need to be paid to network validators to
              ensure network security.
            </TermModal>
          </span>
        </div>
        {asset === 'ETH' ? (
          <>
            <div className="flex justify-between">
              <span>Amount:</span>{' '}
              <span>
                {' '}
                {(Number(amount) - Number(gasFee)).toFixed(3)} {feeCurrency}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Total (amount + fees):</span>{' '}
              <span>
                {amount} {asset}{' '}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>Amount:</span>{' '}
            <span>
              {' '}
              {Number(amount)} {asset}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Receive:</span> <span> {Number(amountSci).toFixed(3)} SCI</span>
        </div>
        <hr className="border-b-[1px]" />

      </section>
      <div className="flex w-full flex-col items-center justify-center">
        <div className="my-2 flex items-start justify-start text-left">
          <input
            type="checkbox"
            id="acceptTerms"
            className="mr-2 mt-1"
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <label
            htmlFor="acceptTerms"
            className="text-sm text-highlightRed sm:text-base"
          >
            Confirm you&apos;re NOT an OFAC or US person
          </label>
        </div>
        {loading ? (
          <button className={`${styles.primary} `}>
            <span className="animate-pulse">Awaiting transaction...</span>
            <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
          </button>
        ) : (
          <>
          <button
            className={styles.primary}
            onClick={func}
            disabled={!accepted || !isSimulationSuccessful}
          >
            {isSimulationSuccessful 
              ? `Submit ${asset} ${purpose}` 
              : "Transaction Will Fail"}
          </button>
         
                  {!isSimulationSuccessful && (
                    <div className="mt-2 p-1 text-highlightRed">
                      <p className="text-sm sm:text-base">
                        This transaction will revert. Please contact support.
                      </p>
                    </div>
                  )}
                  </>
        )}
      </div>
    </ModalUI>
  );
}
