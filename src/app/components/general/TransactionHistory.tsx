'use client';

import React, { useEffect, useState } from 'react';
import { zeroAddress } from 'viem';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { useWallet } from '@/app/context/WalletContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import ErrorDisplay from './ErrorDisplay';

interface Transaction {
  id?: number;
  from?: string;
  asset?: string;
  amount?: string;
  transactionHash: string;
  event: string;
  contract?: string;
  timestamp?: number;
  index?: number;
}

const TransactionHistory = ({ contracts }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const networkInfo = useNetworkInfo();
  const wallet = useWallet();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const returnAsset = (contractAddress?: string) => {
    if (contractAddress === networkInfo?.usdc) {
      return 'USDC';
    } else if (contractAddress === zeroAddress) {
      return 'ETH';
    } else if (contractAddress === networkInfo?.sci) {
      return 'SCI';
    } else if (contractAddress === networkInfo?.po) {
      return 'PO';
    }
  };

  const returnAction = (event?: string) => {
    if (event === 'Donated(address,address,uint256)') {
      return 'Donated';
    } else if (event === 'Swapped(address,address,uint256,uint256)') {
      return 'Swapped';
    } else if (event === 'Locked(address,address,uint256)') {
      return 'Locked';
    } else if (event === 'Freed(address,address,uint256)') {
      return 'Freed';
    } else if (event === 'Proposed(uint256,address,string,uint256,uint256,address,bool)') {
      return 'Proposed';
    } else if (event === 'Voted(uint256,address,bool,uint256)') {
      return 'Voted';
    } else if (event === 'Exchanged(address,uint256,uint256)') {
      return 'Exchanged';
    } else if (event === 'Claimed(address,uint256)') {
      return 'Claimed';
    } else if (event === 'Attested(address,address,uint256)') {
      return 'Attested';  
    }
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!wallet?.state?.address) return;

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/fetch-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: wallet.state.address,
            contracts: contracts
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch transactions');
        }

        setTransactions(data.transactions);
      } catch (err) {
        const error = JSON.parse(JSON.stringify(err));
        setError(error.shortMessage || error.message);
        console.error('Error fetching transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (wallet?.state?.address && contracts.length) {
      fetchTransactions();
    }
  }, [wallet?.state?.address, contracts]);

  return (
    <main className="mb-8 flex w-full flex-col items-center justify-center overflow-y-auto py-4 sm:px-8 px-4">
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 rounded-full bg-steelBlue p-4 text-white shadow-lg transition-all hover:bg-tropicalBlue"
          aria-label="Scroll to top"
        >
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
      )}
      <h1
        className="
      mb-2
      flex
      w-full
      items-center
      justify-center
      text-center 
      font-acuminSemiBold
      text-2xl 
      uppercase
      md:text-4xl 
      lg:text-5xl
      "
      >
        Transaction History
      </h1>
      {isLoading ? (
        <span className="mt-20 flex items-center justify-center">
          <span className="animate-pulse sm:text-lg">Loading transactions...</span>
          <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
        </span>
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : transactions.length > 0 ? (
        <section className="flex w-full flex-col items-center justify-center">
          <div className="mx-auto flex w-full max-w-full items-center justify-between py-2">
            <div className="w-1/12 text-left text-xs sm:text-base">#</div>
            <div className="w-3/12 text-left text-xs sm:text-base">Action</div>
            <div className="w-6/12 text-center text-xs sm:text-base">Value</div>
            <div className="w-4/12 text-right text-xs sm:text-base">Hash</div>
          </div>
          <div className="mx-auto w-full max-w-full">
            <hr className="w-full border-b-[1px] border-gray-400" />
          </div>
          <ul className="mx-auto w-full max-w-full text-center">
            {transactions.map((tx, index) => (
              <li key={index} className="flex items-center justify-between">
                <div className="flex w-full flex-col">
                  {returnAction(tx.event) === 'Voted' ? (
                    <div className="my-4 flex">
                      <div className="flex w-1/12 items-center justify-start text-xs sm:text-base">
                        {index + 1}.
                      </div>
                      <div className="flex w-3/12 items-center justify-start text-xs sm:text-base">
                        {returnAction(tx.event)}{' '}
                        {tx.contract === networkInfo?.governorResearch
                          ? `(RFP-${tx.index ?? 0})`
                          : `(OP-${tx.index ?? 0})`}
                      </div>
                      <div className="flex w-6/12 items-center justify-center text-xs sm:text-base">
                        {tx.contract === networkInfo?.governorResearch
                          ? `${Number(tx.amount)} vote`
                          : `${Number(
                            Number(tx.amount).toFixed(0)
                          ).toLocaleString()} votes`}
                      </div>
                      <div className="flex w-4/12 items-center justify-end">
                        <Link
                          className="flex items-center text-steelBlue hover:text-tropicalBlue text-xs sm:text-base"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`${networkInfo?.explorerLink}/tx/${tx.transactionHash}`}
                        >
                          {tx.transactionHash.slice(0, 3) +
                            '...' +
                            tx.transactionHash.slice(-3)}
                          &nbsp;
                          <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                        </Link>
                      </div>
                    </div>
                  ) : returnAction(tx.event) === 'Proposed' ? (
                    <div className="my-4 flex justify-between">
                      <div className="flex w-1/12 items-center justify-start text-xs sm:text-base">
                        {index + 1}.
                      </div>
                      <div className="flex w-full items-center justify-start sm:w-5/12 text-xs sm:text-base">
                        {returnAction(tx.event)}{' '}
                        {tx.contract === networkInfo?.governorResearch
                          ? `(RFP-${tx.index ?? 0})`
                          : `(OP-${tx.index ?? 0})`}
                      </div>
                      <div className="flex w-0 items-center justify-center sm:w-4/12"></div>
                      <div className="flex w-4/12 items-center justify-end">
                        <Link
                          className="flex items-center text-steelBlue hover:text-tropicalBlue text-xs sm:text-base"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`${networkInfo?.explorerLink}/tx/${tx.transactionHash}`}
                        >
                          {tx.transactionHash.slice(0, 3) +
                            '...' +
                            tx.transactionHash.slice(-3)}
                          &nbsp;
                          <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                        </Link>
                      </div>
                    </div>
                  ) : returnAction(tx.event) === 'Claimed' ? (
                    <div className="my-4 flex">
                      <div className="flex w-1/12 items-center justify-start text-xs sm:text-base">
                        {index + 1}.
                      </div>
                      <div className="justify-starts flex w-3/12 items-center text-xs sm:text-base">
                        {returnAction(tx.event)}
                      </div>
                      <div className="flex w-6/12 items-center justify-center text-xs sm:text-base">
                        {Number(tx.amount).toLocaleString()} PO
                      </div>
                      <div className="flex w-4/12 items-center justify-end">
                        <Link
                          className="flex items-center text-steelBlue hover:text-tropicalBlue text-xs sm:text-base"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`${networkInfo?.explorerLink}/tx/${tx.transactionHash}`}
                        >
                          {tx.transactionHash.slice(0, 3) +
                            '...' +
                            tx.transactionHash.slice(-3)}
                          &nbsp;
                          <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="my-4 flex">
                      <div className="flex w-1/12 items-center justify-start text-xs sm:text-base">
                        {index + 1}.
                      </div>
                      <div className="justify-starts flex w-3/12 items-center text-xs sm:text-base">
                        {returnAction(tx.event)}
                      </div>
                      <div className="flex w-6/12 items-center justify-center text-xs sm:text-base">
                        {Number(tx.amount) > 10 && window?.innerWidth < 400
                          ? Number(
                            Number(tx.amount).toFixed(0)
                          ).toLocaleString()
                          : Number(tx.amount).toLocaleString()}{' '}
                        {returnAsset(tx.asset)}
                      </div>
                      <div className="flex w-4/12 items-center justify-end">
                        <Link
                          className="flex items-center text-steelBlue hover:text-tropicalBlue text-xs sm:text-base"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`${networkInfo?.explorerLink}/tx/${tx.transactionHash}`}
                        >
                          {tx.transactionHash.slice(0, 3) +
                            '...' +
                            tx.transactionHash.slice(-3)}
                          &nbsp;
                          <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                        </Link>
                      </div>
                    </div>
                  )}
                  <hr className="w-full border-b-[1px] border-gray-800" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="my-2 text-highlightRed">No transactions found.</p>
      )}
    </main>
  );
};

export default TransactionHistory;
