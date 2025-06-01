'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '../../context/NetworkInfoContext';
import { getLatestBlockTimestamp } from '../governance/GetLatestBlockTimestamp';
import { CustomError } from '@/app/utils/rpcErrorInterfaces';
import { useGovernance } from '@/app/context/GovernanceContext';
import { useNotification } from '@/app/context/NotificationContext';
import styles from '../general/Button.module.css';
import Modal from './Modal';
import ModalUI from './ModalUI';
import ErrorDisplay from '../general/ErrorDisplay';
import ConnectWallet from '../general/ConnectWallet';
import govResAbi from '@/app/abi/GovernorResearch.json';
import { Abi } from 'viem';

export default function ModalVoting({
  handler,
  index,
  proposalEndTimestamp,
  eligibleToVote,
  timeLeftToChangeVote,
  userVoteData,
  isLoadingEligibility,
}) {
  const wallet = useWallet();
  const governance = useGovernance();
  const networkInfo = useNetworkInfo();
  const [transactionHash, setTransactionHash] = useState('');
  const [voteInitiated, setVoteInitiated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voteCooldown, setVoteCooldown] = useState(false);
  const [currentBlockTimestamp, setCurrentBlockTimestamp] = useState(0);
  const [understoodChangeTime, setUnderstoodChangeTime] = useState(
    userVoteData?.voted ? true : false
  );

  const { addNotification } = useNotification();
  const [countdownTime, setCountdownTime] = useState(0);
  const [changeTimeDisplay, setChangeTimeDisplay] = useState(
    Number(
      Math.min(
        Number(governance?.govResParams?.voteChangeTime),
        Number(
          proposalEndTimestamp -
            Number(governance?.govResParams?.voteChangeCutOff) -
            Math.floor(Date.now() / 1000)
        )
      )
    )
  );

  const handleVotingError = useCallback(
    (message: string) => {
      addNotification(message, 'error');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleRpcError = (errorObj: CustomError) => {
    if (errorObj?.shortMessage) {
      if (
        errorObj.metaMessages?.some((msg) =>
          msg.includes('InvalidSignatureProvided')
        )
      ) {
        addNotification(
          'Please wait a moment before changing your vote. Your previous transaction is still being processed.',
          'error'
        );
      } else {
        addNotification(errorObj.shortMessage, 'error');
      }
    }
  };

  useEffect(() => {
    const fetchTimestamp = async () => {
      const timestamp = await getLatestBlockTimestamp();
      setCurrentBlockTimestamp(Number(timestamp));
    };
    fetchTimestamp();
  }, []);

  useEffect(() => {
    // Initialize countdown time
    setCountdownTime(
      Math.min(
        timeLeftToChangeVote,
        Math.max(
          0,
          proposalEndTimestamp -
            Number(governance?.govResParams?.voteChangeCutOff) -
            currentBlockTimestamp
        )
      )
    );

    // Set up countdown interval
    const timer = setInterval(() => {
      setCountdownTime((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, [
    timeLeftToChangeVote,
    proposalEndTimestamp,
    governance?.govResParams?.voteChangeCutOff,
    currentBlockTimestamp,
  ]);

  useEffect(() => {
    if (
      eligibleToVote &&
      !userVoteData?.voted &&
      proposalEndTimestamp -
        Number(governance?.govResParams?.voteChangeCutOff) <
        currentBlockTimestamp
    ) {
      setUnderstoodChangeTime(true);
    }
  }, [
    currentBlockTimestamp,
    proposalEndTimestamp,
    governance?.govResParams?.voteChangeCutOff,
    eligibleToVote,
    userVoteData?.voted,
  ]);

  // Update the change time display every minute
  useEffect(() => {
    const updateChangeTime = () => {
      setChangeTimeDisplay(
        Number(
          Math.min(
            Number(governance?.govResParams?.voteChangeTime),
            Number(
              proposalEndTimestamp -
                Number(governance?.govResParams?.voteChangeCutOff) -
                Math.floor(Date.now() / 1000)
            )
          )
        )
      );
    };

    // Update immediately
    updateChangeTime();

    // Then update every second
    const timer = setInterval(updateChangeTime, 1000);

    return () => clearInterval(timer);
  }, [
    governance?.govResParams?.voteChangeTime,
    proposalEndTimestamp,
    governance?.govResParams?.voteChangeCutOff,
  ]);

  async function voteResearchFunding(support: boolean) {
    if (
      !wallet?.state?.walletClient ||
      !networkInfo?.governorResearch ||
      !wallet?.state?.publicClient
    ) {
      console.error('Wallet or network information is missing');
      return;
    }

    if (!eligibleToVote) {
      handleVotingError('Vote cannot be changed.');
      return;
    }

    // Check if there's a pending transaction or cooldown
    if (isLoading || voteCooldown) {
      addNotification(
        'Please wait a moment before submitting another vote.',
        'error'
      );
      return;
    }

    try {
      setIsLoading(true);
      setVoteCooldown(true);

      // Use direct simulateContract call instead of creating a contract instance
      const { request } = await wallet.state.publicClient.simulateContract({
        address: networkInfo.governorResearch as `0x${string}`,
        abi: govResAbi as Abi,
        functionName: 'vote',
        args: [BigInt(index), support],
        account: wallet.state.address as `0x${string}`,
      });

      const vote = await wallet.state.walletClient.writeContract({
        ...request,
        account: wallet.state.address,
      });

      if (wallet?.state?.isSmartContractWallet && vote) {
        setTransactionHash(`${networkInfo?.explorerLink}/tx/${vote}`);
        setVoteInitiated(true);
      } else {
        const voteResult =
          await wallet.state.publicClient.waitForTransactionReceipt({
            hash: vote,
          });
        if (voteResult.status === 'success') {
          setTransactionHash(`${networkInfo?.explorerLink}/tx/${vote}`);
          setVoteInitiated(true);
        }
      }
    } catch (err) {
      const error = handleBigIntError(err);
      handleRpcError(error);
      console.error(error);
    } finally {
      setIsLoading(false);

      // Set a cooldown period to prevent rapid voting attempts
      setTimeout(() => {
        setVoteCooldown(false);
      }, 5000); // 5 second cooldown
    }
  }

  // Helper function to safely handle errors with BigInt values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBigIntError = (error: any): CustomError => {
    try {
      // Try to convert the error to a string representation
      return JSON.parse(
        JSON.stringify(error, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );
    } catch (jsonError) {
      // If JSON serialization fails, return a simplified error object
      return {
        shortMessage: error?.shortMessage || 'An error occurred during voting',
        name: error?.name || 'VotingError',
        details:
          error?.details ||
          error?.shortMessage ||
          'Error details not available',
      };
    }
  };

  const formatTimeLeft = (timeLeft: number) => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds < 10 ? `0${seconds}` : seconds}s`;
  };

  const convertSecondsToReadableTime = (seconds: number): string => {
    const months = Math.floor(seconds / (30.44 * 24 * 3600)); // Average month = 30.44 days
    seconds %= Math.floor(30.44 * 24 * 3600);

    const weeks = Math.floor(seconds / (7 * 24 * 3600)); // 1 week = 7 days
    seconds %= 7 * 24 * 3600;

    const days = Math.floor(seconds / (24 * 3600)); // 1 day = 24 hours
    seconds %= 24 * 3600;

    const hours = Math.floor(seconds / 3600); // 1 hour = 3600 seconds
    seconds %= 3600;

    const minutes = Math.floor(seconds / 60); // 1 minute = 60 seconds
    const secs = seconds % 60; // Remaining seconds

    // Build the readable time string
    if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    if (secs > 0) return `${secs} second${secs > 1 ? 's' : ''}`;

    return '0 seconds'; // Handle case where input is 0
  };

  return (
    <ModalUI
      handler={handler}
      glowColorAndBorder={
        'border-tropicalBlue border-[1px] hover:shadow-glow-tropicalBlue-intermediate'
      }
    >
      <div className="flex w-full flex-col sm:w-[36rem]">
        <section className="mb-6 flex flex-col items-center justify-between">
          <h2 className="max-w-11/12 mx-2 flex min-w-[17rem] items-center justify-center whitespace-nowrap text-center">
            Vote on RFP-{index}
          </h2>
          <p className="pt-4 text-center text-gray-400 xs:text-2xs xs+:text-sm sm:text-base">
            Every DD member has only 1 vote.
          </p>
        </section>

        <div className="space-y-4">
          {eligibleToVote && timeLeftToChangeVote > 0 && (
            <div className="flex flex-col gap-2">
              <span>
                Current choice:{' '}
                {userVoteData?.previousSupport ? (
                  <span className="font-acuminSemiBold text-seafoamGreen">
                    For
                  </span>
                ) : (
                  <span className="font-acuminSemiBold text-highlightRed">
                    Against
                  </span>
                )}
              </span>
              <span>
                Time left to change vote:
                <span className="font-acuminSemiBold text-orange-500">
                  &nbsp;
                  {formatTimeLeft(countdownTime)}
                </span>
              </span>
            </div>
          )}

          {!wallet?.state?.walletClient ? (
            <div className="mt-6">
              <ConnectWallet
                isNavBar={false}
                toggleAccountMenu={() => null}
              />
            </div>
          ) : (
            <section className="mt-6">
              {isLoading ? (
                <button
                  className={`${styles.primary} xs:px-2 xs:py-2 xs:text-sm sm:px-6 sm:py-8 sm:text-base md:text-lg xl:text-xl`}
                >
                  <span className="animate-pulse">Awaiting vote...</span>
                  <span className="mx-2 block h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
                </button>
              ) : (
                <>
                  {isLoadingEligibility ? (
                    <p className="animate-pulse text-highlightRed">
                      Checking voting eligibility...
                    </p>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      {!userVoteData?.voted &&
                        currentBlockTimestamp >
                          proposalEndTimestamp -
                            Number(governance?.govResParams?.voteChangeCutOff) && (
                          <div className="flex items-center text-left text-sm sm:text-base">
                            <input
                              type="checkbox"
                              id="understoodEndPhase"
                              checked={understoodChangeTime}
                              onChange={() =>
                                setUnderstoodChangeTime(!understoodChangeTime)
                              }
                            />
                            <label htmlFor="understoodEndPhase" className="ml-2">
                              <p>
                                You understand that votes cast during the end
                                phase are final and cannot be changed.
                              </p>
                            </label>
                          </div>
                        )}

                      {eligibleToVote ? (
                        <>
                          {!userVoteData?.voted && (
                            <div className="flex flex-col gap-4">
                              <div className="flex items-center text-left text-sm sm:text-base">
                                <input
                                  type="checkbox"
                                  id="understoodChangeTime"
                                  checked={understoodChangeTime}
                                  onChange={() =>
                                    setUnderstoodChangeTime(!understoodChangeTime)
                                  }
                                />
                                <label
                                  htmlFor="understoodChangeTime"
                                  className="ml-2"
                                >
                                  <span>
                                    You understand that you can ONLY change your
                                    vote within{' '}
                                    <span className="font-acuminSemiBold text-highlightRed">
                                      {convertSecondsToReadableTime(
                                        changeTimeDisplay
                                      )}{' '}
                                    </span>
                                    after your initial vote.
                                  </span>
                                </label>
                              </div>
                            </div>
                          )}
                          <div className="flex w-full items-center justify-between gap-4 sm:gap-6">
                            <button
                              className="
                                flex 
                                h-12 
                                w-full
                                items-center
                                justify-center
                                whitespace-nowrap  
                                rounded-lg
                                border-[1px]
                                border-neonGreen
                                bg-seaBlue-700 
                                hover:bg-seaBlue-500
                                hover:shadow-glow-neonGreen-limited
                                disabled:cursor-not-allowed
                                disabled:border-gray-400
                                disabled:bg-gray-400
                                disabled:opacity-60
                                xs:px-2
                                xs:py-2
                                xs:text-sm
                                sm:px-6
                                sm:py-8
                                sm:text-base
                                md:text-lg
                                xl:text-xl
                                "
                              onClick={() => voteResearchFunding(true)}
                              disabled={
                                !understoodChangeTime || isLoading || voteCooldown
                              }
                            >
                              {voteCooldown && !isLoading
                                ? 'Please wait...'
                                : 'Vote For'}
                            </button>
                            <button
                              className="
                                flex 
                                h-12 
                                w-full
                                items-center
                                justify-center
                                whitespace-nowrap 
                                rounded-lg
                                border-[1px]
                                border-highlightRed
                                bg-seaBlue-700
                                transition-all
                                duration-300 
                                ease-in-out 
                                hover:cursor-pointer 
                                hover:bg-seaBlue-500 
                                hover:shadow-glow-highlightRed-limited
                                disabled:cursor-not-allowed
                                disabled:border-gray-400
                                disabled:bg-gray-400
                                disabled:opacity-60
                                xs:px-2
                                xs:py-2
                                xs:text-sm
                                sm:px-6
                                sm:py-8
                                sm:text-base
                                md:text-lg
                                xl:text-xl
                                "
                              onClick={() => voteResearchFunding(false)}
                              disabled={
                                !understoodChangeTime || isLoading || voteCooldown
                              }
                            >
                              {voteCooldown && !isLoading
                                ? 'Please wait...'
                                : 'Vote Against'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full">
                          <ErrorDisplay error={'Vote cannot be changed'} />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </div>
      {voteInitiated && (
        <div className="z-40">
          <Modal
            transactionHash={transactionHash}
            handler={setVoteInitiated}
            title={`Vote successful!`}
            subtitle={''}
          >
            <></>
          </Modal>
        </div>
      )}
    </ModalUI>
  );
}
