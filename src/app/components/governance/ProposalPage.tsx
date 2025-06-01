'use client';

import styles from './../general/Button.module.css';
import { useNetworkInfo } from '../../context/NetworkInfoContext';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import InfoToolTip from '../general/InfoToolTip';
import ConnectWallet from '../general/ConnectWallet';
import { useWallet } from '@/app/context/WalletContext';
import ErrorDisplay from '../general/ErrorDisplay';
import { useGovernance } from '@/app/context/GovernanceContext';
import { publicClient } from '@/app/config/viem';
import { Address, type Abi, zeroAddress } from 'viem';
import govExecAbi from '@/app/abi/GovernorExecutor.json';
import CountdownTimer from '../general/Countdown';
import getExecutionOptionsClasses from './GetExecutionOptionsClasses';
import currentGovernanceParameterValue from './GetCurrentParameterValue';
import getDescriptiveParamNames from '@/app/components/governance/GetDescriptiveParamNames';
import { useEnsName } from '../hooks/UseEnsName';
import useActionState from '../hooks/UseActionState';
import Comments from '../general/Comments';
import MetadataCard from './MetadataCard';
import ProposalContent from './ProposalContent';
import ParameterChangeHistory from '@/app/components/governance/ParameterChangeHistory';
import { useBatchEnsNames } from '../hooks/UseEnsName';
const govExecAbiViem = govExecAbi as Abi;

interface VoterListProps {
  voters: { user: string; amount: string }[];
  type: 'supporters' | 'opposers';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkInfo: any;
}

const VoterList = ({ voters, type, networkInfo }: VoterListProps) => {
  // Pre-fetch all ENS names at once
  const allAddresses = useMemo(
    () => voters.map((voter) => voter.user),
    [voters]
  );
  
  // Use batch ENS name resolution
  const ensNames = useBatchEnsNames(allAddresses);

  const isSupporter = type === 'supporters';
  const titleClass = isSupporter ? 'text-neonGreen' : 'text-highlightRed';
  const amountClass = isSupporter ? 'text-neonGreen' : 'text-highlightRed';
  const title = isSupporter ? 'TOP SUPPORTERS' : 'TOP OPPOSERS';

  return (
    <div className="rounded-xl border border-seaBlue-1025 bg-seaBlue-1075/50 p-6">
      <h4 className={`mb-4 text-sm font-medium ${titleClass} sm:text-lg`}>
        {title}
      </h4>
      <ul className="space-y-3">
        {voters.map((voter, index) => {
          const voterEns = ensNames[voter.user];
          const voterDisplay =
            voterEns || `${voter.user.slice(0, 4)}...${voter.user.slice(-4)}`;

          return (
            <li
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <Link
                href={`${networkInfo?.explorerLink}/address/${voter.user}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#2D7FEA] transition-colors hover:text-[#4B9BFF]"
              >
                {voterDisplay}
                <FontAwesomeIcon icon={faExternalLinkAlt} className="h-3 w-3" />
              </Link>
              <span className={`font-medium ${amountClass}`}>
                {Number(voter.amount).toLocaleString()} votes
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// Helper function for status colors
function getStatusStyles(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'text-neonGreen';
    case 'executed':
    case 'completed':
      return 'text-[#2D7FEA]';
    case 'canceled':
      return 'text-highlightRed';
    default:
      return 'text-gray-400';
  }
}

function formatCamelCase(text: string) {
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
    .toLowerCase();
}

export default function ProposalPage({
  index,
  info,
  summary,
  title,
  body,
  status,
  action,
  startTimestamp,
  endTimestamp,
  startDateWithTime,
  endDateWithTime,
  votesFor,
  votesTotal,
  executionOption,
  quadraticVoting,
  currentTimestamp,
  executionTransactionHash,
  eventDate,
  schedulable,
  cancelable,
  proposalInvalid,
  proposalRejected,
  executable,
  votePreviewhandler,
  scheduleProposal,
  executeProposal,
  completeProposal,
  cancelProposal,
  proposer,
  topVotersFor,
  topVotersAgainst,
  eligibleToVote,
  userVoteData,
  timeLeftToChangeVote,
  isLoadingEligibility,
  loading,
  quorumSnapshot,
  handleRefresh,
  isLoadingScheduling,
  isLoadingExecution,
  isLoadingCompletion,
  isLoadingCancellation,
}) {
  const networkInfo = useNetworkInfo();
  const wallet = useWallet();
  const governance = useGovernance();
  const [scheduledTime, setScheduledTime] = useState(0);
  const [isLoadingScheduledTime, setIsLoadingScheduledTime] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const hasInitiatedFetchRef = useRef(false);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const {
    transactionDetails,
    electionDetails,
    impeachmentDetails,
    parameterChangeDetails: actionParameterChangeDetails,
  } = useActionState(action, executionOption);
  const [timestamp, setTimestamp] = useState(currentTimestamp);
  const [dynamicTimestamp, setDynamicTimestamp] = useState(currentTimestamp);
  // Debug flag to control logging verbosity
  const DEBUG_SCHEDULED_TIME = false;

  // Add state for refresh button cooldown
  const [isRefreshCooldown, setIsRefreshCooldown] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
  const [cooldownTimerId, setCooldownTimerId] = useState<NodeJS.Timeout | null>(
    null
  );

  // Update dynamic timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      setDynamicTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Research governance doesn't have voting delay, so we remove that logic entirely

  useEffect(() => {
    if (
      status === 'scheduled' &&
      executable &&
      scheduledTime > 0 &&
      timestamp < scheduledTime
    ) {
      const timer = setInterval(() => {
        setTimestamp((prevTimestamp) => {
          const newTimestamp = prevTimestamp + 1;
          if (newTimestamp >= scheduledTime) {
            clearInterval(timer);
          }
          return newTimestamp;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
      };
    }
  }, [status, executable, scheduledTime, timestamp]);

  useEffect(() => {
    const fetchScheduledTime = async () => {
      if (!networkInfo?.governorExecutor || !action) {
        DEBUG_SCHEDULED_TIME &&
          console.log(
            'Missing governorExecutor or action address, cannot fetch scheduled time'
          );
        setFetchError(true);
        return;
      }

      try {
        setIsLoadingScheduledTime(true);
        setFetchError(false);
        DEBUG_SCHEDULED_TIME &&
          console.log('Fetching scheduled time for action:', action);
        const scheduledTime = (await publicClient.readContract({
          address: networkInfo.governorExecutor as Address,
          abi: govExecAbiViem,
          functionName: 'scheduledTime',
          args: [action as Address],
        })) as bigint;

        DEBUG_SCHEDULED_TIME &&
          console.log('Scheduled time fetched successfully:', scheduledTime);
        setScheduledTime(Number(scheduledTime));

        // If scheduled time is 0, it might be a temporary issue, set fetch error
        if (Number(scheduledTime) === 0) {
          console.warn('Scheduled time is 0, might need to retry');
          setFetchError(true);
        } else {
          // We got a valid scheduled time, no need to retry
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error fetching scheduled time:', error);
        setFetchError(true);
      } finally {
        setIsLoadingScheduledTime(false);
      }
    };

    // Only fetch if the proposal is scheduled and executable, and we haven't already initiated a fetch
    // or if critical dependencies have changed (which resets the ref)
    if (status === 'scheduled' && executable && !hasInitiatedFetchRef.current) {
      DEBUG_SCHEDULED_TIME &&
        console.log(
          'Proposal is scheduled and executable, fetching scheduled time...'
        );
      hasInitiatedFetchRef.current = true;
      fetchScheduledTime();

      // Set up periodic retries only if we need to
      retryIntervalRef.current = setInterval(() => {
        if (scheduledTime === 0 && !isLoadingScheduledTime) {
          DEBUG_SCHEDULED_TIME &&
            console.log('Retrying scheduled time fetch...');
          fetchScheduledTime();
        } else if (scheduledTime > 0) {
          // If we have a valid scheduled time, clear the interval
          if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
            retryIntervalRef.current = null;
          }
        }
      }, 30000); // Retry every 30 seconds
    }

    // Cleanup function
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, [
    networkInfo?.governorExecutor,
    DEBUG_SCHEDULED_TIME,
    scheduledTime,
    isLoadingScheduledTime,
    action,
    status,
    executable,
  ]);

  // Reset the fetch flag if critical dependencies change
  useEffect(() => {
    hasInitiatedFetchRef.current = false;
  }, [networkInfo?.governorExecutor, action, status, executable]);

  // Set up a separate, less frequent refresh for scheduled time
  // This ensures we catch any updates to the scheduled time without excessive API calls
  useEffect(() => {
    // Only set up refresh if we have a valid scheduled time and the proposal is still scheduled
    if (
      status === 'scheduled' &&
      executable &&
      scheduledTime > 0 &&
      networkInfo?.governorExecutor
    ) {
      const refreshInterval = setInterval(
        () => {
          // Only refresh if we're not already loading
          if (!isLoadingScheduledTime) {
            const refreshScheduledTime = async () => {
              try {
                // Don't set loading state or show logs for background refresh
                const newScheduledTime = (await publicClient.readContract({
                  address: networkInfo.governorExecutor as Address,
                  abi: govExecAbiViem,
                  functionName: 'scheduledTime',
                  args: [action as Address],
                })) as bigint;

                // Only update if the time has changed
                if (Number(newScheduledTime) !== scheduledTime) {
                  DEBUG_SCHEDULED_TIME &&
                    console.log('Scheduled time updated:', newScheduledTime);
                  setScheduledTime(Number(newScheduledTime));
                }
              } catch (error) {
                // Silent fail for background refresh
                DEBUG_SCHEDULED_TIME &&
                  console.debug(
                    'Background refresh of scheduled time failed:',
                    error
                  );
              }
            };

            refreshScheduledTime();
          }
        },
        2 * 60 * 1000
      ); // Check every 2 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [
    status,
    executable,
    DEBUG_SCHEDULED_TIME,
    scheduledTime,
    isLoadingScheduledTime,
    networkInfo?.governorExecutor,
    action,
  ]);

  const ensName = useEnsName(proposer);
  const addressToDisplay =
    ensName ||
    (proposer ? `${proposer?.slice(0, 4)}...${proposer?.slice(-4)}` : '');

  const ipfsLinkToDisplay = info?.slice(0, 4) + '...' + info?.slice(-4);

  const actionAddressToDisplay =
    action?.slice(0, 4) + '...' + action?.slice(-4);

  const formatTimeLeft = (timeLeft: number) => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    if (hours > 0) {
      return `${hours}h ${minutes < 10 ? `0${minutes}` : minutes}m ${seconds < 10 ? `0${seconds}` : seconds}s`;
    } else {
      return `${minutes}m ${seconds < 10 ? `0${seconds}` : seconds}s`;
    }
  };

  function convertTime(totalSeconds: number): string {
    if (totalSeconds < 0) {
      return 'Invalid time';
    }

    let seconds = totalSeconds;

    // const months = Math.floor(seconds / (30.44 * 24 * 3600)); // Average month = 30.44 days
    // seconds %= Math.floor(30.44 * 24 * 3600);

    // const weeks = Math.floor(seconds / (7 * 24 * 3600)); // 1 week = 7 days
    // seconds %= 7 * 24 * 3600;

    const days = Math.floor(seconds / (24 * 3600)); // 1 day = 24 hours
    seconds %= 24 * 3600;

    const hours = Math.floor(seconds / 3600); // 1 hour = 3600 seconds
    seconds %= 3600;

    const minutes = Math.floor(seconds / 60); // 1 minute = 60 seconds
    const secs = Math.floor(seconds % 60); // Use Math.floor for remaining seconds too

    const timeParts: string[] = [];

    if (days > 0) {
      timeParts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    if (hours > 0) {
      timeParts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      timeParts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    }
    if (secs > 0 || timeParts.length === 0) { // Show seconds if it's the only part or if > 0
      timeParts.push(`${secs} second${secs > 1 ? 's' : ''}`);
    }

    let detailedDisplay = '';
    if (timeParts.length === 0) { // Should only happen if totalSeconds was 0 and handled above
      detailedDisplay = '0 seconds';
    } else if (timeParts.length === 1) {
      detailedDisplay = timeParts[0];
    } else {
      const lastPart = timeParts.pop();
      detailedDisplay = timeParts.join(', ') + ' and ' + lastPart;
    }

    // Parenthetical Summary Logic
    let parentheticalSummary = '';
    if (timeParts.length > 1) { // Only add parenthesis if detailed display has more than one part
      let largestUnitInDetailedDisplay = '';
      if (days > 0) largestUnitInDetailedDisplay = 'days';
      else if (hours > 0) largestUnitInDetailedDisplay = 'hours';
      else if (minutes > 0) largestUnitInDetailedDisplay = 'minutes';
      // No need to check for seconds, as it won't trigger this specific parenthetical logic

      switch (largestUnitInDetailedDisplay) {
        case 'days':
          const totalHoursFloat = totalSeconds / 3600;
          const hoursDisplay = totalHoursFloat % 1 === 0 ? totalHoursFloat.toString() : totalHoursFloat.toFixed(1);
          parentheticalSummary = ` (${hoursDisplay} ${parseFloat(hoursDisplay) === 1.0 ? 'hour' : 'hours'})`;
          break;
        case 'hours':
          const totalMinutes = Math.floor(totalSeconds / 60);
          parentheticalSummary = ` (${totalMinutes} ${totalMinutes === 1 ? 'minute' : 'minutes'})`;
          break;
        case 'minutes':
          // For minutes as the largest unit, the summary is total seconds.
          // totalSeconds is already the value we need.
          parentheticalSummary = ` (${totalSeconds} ${totalSeconds === 1 ? 'second' : 'seconds'})`;
          break;
        // No default needed, if largestUnitInDetailedDisplay is empty, no summary is added here.
      }
    }

    return detailedDisplay + parentheticalSummary;
  }

  // Function to handle refresh with cooldown
  const handleRefreshWithCooldown = useCallback(() => {
    if (isRefreshCooldown) return;

    // Call the original refresh handler
    if (handleRefresh) {
      handleRefresh();
    } else {
      window.location.reload();
    }

    // Start cooldown
    setIsRefreshCooldown(true);
    setCooldownTimeLeft(120); // 2 minutes in seconds

    // Set up timer to update countdown
    const timer = setInterval(() => {
      setCooldownTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRefreshCooldown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // Use 1000ms (1 second) interval

    setCooldownTimerId(timer);
  }, [isRefreshCooldown, handleRefresh]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerId) clearInterval(cooldownTimerId);
    };
  }, [cooldownTimerId]);

  // Format the cooldown time for display
  const formatCooldownTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }, []);

  // Create an enhanced version with the timestamp
  const parameterChangeDetails = useMemo(() => {
    if (!actionParameterChangeDetails) return null;

    return {
      ...actionParameterChangeDetails,
      timestamp: startTimestamp, // Add the proposal start timestamp
    };
  }, [actionParameterChangeDetails, startTimestamp]);

  // Add debugging for title and summary
  useEffect(() => {
    if (title) {
      console.debug(
        `Title content (first 100 chars): ${title.substring(0, 100)}...`
      );
    }
    if (summary) {
      console.debug(
        `Summary content (first 100 chars): ${summary.substring(0, 100)}...`
      );
    }
  }, [title, summary]);

  const isParameterChangeForResearch =
    parameterChangeDetails?.gov === networkInfo?.governorResearch;

  return (
    <div className="min-h-screen bg-seaBlue-1100 text-white">
      {/* Navigation */}
      <nav className="px-1 py-2 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex w-full items-center justify-between text-xs sm:text-base">
            {/* Back to Overview */}
            <Link
              href={
                '/governance/research/on-chain'
              }
              className="group inline-flex items-center text-[#2D7FEA] transition-all duration-200 hover:text-[#4B9BFF]"
            >
              <span className="mr-2 transform transition-transform group-hover:-translate-x-1">
                ←
              </span>
              <span>Back to Overview</span>
            </Link>

            {/* Proposal Navigation */}
            <div className="flex items-center gap-4 sm:gap-8">
              {Number(index - 1) >= 0 && (
                <Link
                  className="group inline-flex items-center text-[#2D7FEA] transition-all duration-200 hover:text-[#4B9BFF]"
                  href={
                    `/governance/research/proposals/${Number(index) - 1}`
                  }
                >
                  <span className="mr-2 transform transition-transform group-hover:-translate-x-1">
                    ←
                  </span>
                  <span>Previous</span>
                </Link>
              )}

              {Number(index) !==
                Number(
                  governance?.indexGovRes - 1
                ) && (
                <Link
                  className="group inline-flex items-center text-[#2D7FEA] transition-all duration-200 hover:text-[#4B9BFF]"
                  href={
                    `/governance/research/proposals/${Number(index) + 1}`
                  }
                >
                  <span>Next</span>
                  <span className="ml-2 transform transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Title with Refresh Button */}
      <div className="mx-auto mb-4 flex max-w-7xl items-center justify-center px-4 sm:mb-8 sm:px-6">
        <h1 className="font-acuminSemiBold text-lg uppercase sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl">
          {`Research Funding Proposal-${index}`}
        </h1>
        <button
          onClick={handleRefreshWithCooldown}
          disabled={isRefreshCooldown}
          className={`ml-3 flex items-center gap-1 rounded px-2 py-1 text-xs ${
            isRefreshCooldown
              ? 'cursor-not-allowed bg-gray-500 text-gray-300'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          title={
            isRefreshCooldown
              ? `Cooldown: ${formatCooldownTime(cooldownTimeLeft)}`
              : 'Refresh Data'
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 ${isRefreshCooldown ? 'animate-none' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="hidden sm:inline">
            {isRefreshCooldown
              ? `${formatCooldownTime(cooldownTimeLeft)}`
              : 'Refresh'}
          </span>
        </button>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl space-y-4 px-1 pb-16 sm:space-y-8 sm:px-6 sm:pb-24">
        {/* Metadata Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetadataCard
            label="START DATE"
            value={startDateWithTime}
          />
          <MetadataCard
            label="END DATE"
            value={endDateWithTime}
          />
          <MetadataCard
            label="PROPOSER"
            value={
              <div className="flex items-center gap-2">
                <Link
                  href={`${networkInfo?.explorerLink}/address/${proposer}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#2D7FEA] transition-colors hover:text-[#4B9BFF]"
                >
                  {addressToDisplay}
                  <FontAwesomeIcon
                    icon={faExternalLinkAlt}
                    className="h-3 w-3"
                  />
                </Link>
                <InfoToolTip>
                  <p>
                    This is the address of the member that created the proposal.
                  </p>
                </InfoToolTip>
              </div>
            }
          />
          {action !== zeroAddress && (
            <MetadataCard
              label="ACTION ADDRESS"
              value={
                <div className="flex items-center gap-2">
                  <Link
                    href={`${networkInfo?.explorerLink}/address/${action}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#2D7FEA] transition-colors hover:text-[#4B9BFF]"
                  >
                    {actionAddressToDisplay}
                    <FontAwesomeIcon
                      icon={faExternalLinkAlt}
                      className="h-3 w-3"
                    />{' '}
                  </Link>
                  <InfoToolTip>
                    <p>
                      This is the smart contract address of the on-chain action
                      that will be executed if the proposal is passed.
                    </p>
                  </InfoToolTip>
                </div>
              }
            />
          )}
          {info && (
            <MetadataCard
              label="IPFS LINK"
              value={
                <div className="flex items-center gap-2">
                  <Link
                    href={`${info}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#2D7FEA] transition-colors hover:text-[#4B9BFF]"
                  >
                    {ipfsLinkToDisplay}
                    <FontAwesomeIcon
                      icon={faExternalLinkAlt}
                      className="h-3 w-3"
                    />{' '}
                  </Link>
                  <InfoToolTip>
                    <p>This is the IPFS link to the proposal details.</p>
                  </InfoToolTip>
                </div>
              }
            />
          )}
          <MetadataCard
            label="VOTING METHOD"
            value={
              <span
                className={
                  quadraticVoting ? 'text-purple-500' : 'text-tropicalBlue'
                }
              >
                {quadraticVoting ? 'QUADRATIC' : 'LINEAR'}{' '}
                <InfoToolTip>
                  {quadraticVoting ? (
                    <p>
                      Voting power is the square root of the tokens locked, making the
                      system more democratic
                    </p>
                  ) : (
                    <p>Voting power is directly proportional to the tokens locked</p>
                  )}
                </InfoToolTip>
              </span>
            }
          />
          <MetadataCard
            label="EXECUTION TYPE"
            value={
              <>
                <span
                  className={`${getExecutionOptionsClasses(executionOption)} rounded-md p-1`}
                >
                  {formatCamelCase(executionOption).toUpperCase()}
                </span>
                &nbsp;&nbsp;
                <InfoToolTip>
                  {executionOption.toLowerCase() == 'transaction' && (
                    <p>This proposal will execute a transaction if passed</p>
                  )}
                  {executionOption.toLowerCase() == 'election' && (
                    <p>This proposal will elect new scientists if passed</p>
                  )}
                  {executionOption.toLowerCase() == 'impeachment' && (
                    <p>This proposal will remove scientists if passed</p>
                  )}
                  {executionOption.toLowerCase() == 'parameterchange' && (
                    <p>
                      This proposal will modify governance parameters if passed
                    </p>
                  )}
                  {executionOption.toLowerCase() == 'notexecutable' && (
                    <p>
                      This proposal will result in an off-chain action if passed
                    </p>
                  )}
                </InfoToolTip>
              </>
            }
          />
          <MetadataCard
            label="QUORUM"
            value={
              <>
                {status === 'active' && dynamicTimestamp < endTimestamp ? (
                  <span className="text-gray-400">
                    HIDDEN{' '}
                    <InfoToolTip>
                      <p>
                        The number of votes submitted relative to the quorum
                        threshold will be revealed after the proposal end date
                        is reached.
                      </p>
                    </InfoToolTip>
                  </span>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span>
                        {Number(votesTotal).toLocaleString()} /{' '}
                        {Number(quorumSnapshot).toLocaleString()}
                      </span>
                      <InfoToolTip position="bottom" width={300}>
                        {quadraticVoting ? (
                          <div>
                            <p>
                              Quadratic voting quorum:{' '}
                              {Number(quorumSnapshot).toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              For quadratic voting, the quorum value has already
                              been square-rooted.
                              <br />
                              This is the final required votes threshold.
                            </p>
                          </div>
                        ) : (
                          <p>
                            Required quorum: {Number(quorumSnapshot).toLocaleString()}
                          </p>
                        )}
                        <div className="mt-2">
                          <p className="mb-1 text-xs text-gray-500">
                            Quorum value from proposal creation time
                          </p>
                        </div>
                      </InfoToolTip>
                    </div>
                  </>
                )}
              </>
            }
          />
          <MetadataCard
            label="QUORUM STATUS"
            value={
              <div className="flex items-center gap-2 uppercase">
                {status === 'active' && dynamicTimestamp < endTimestamp ? (
                  <span className="text-gray-400">
                    HIDDEN{' '}
                    <InfoToolTip>
                      <p>
                        Whether the proposal has reached the required number of
                        votes. This status will be revealed after the proposal
                        end date is reached.
                      </p>
                    </InfoToolTip>
                  </span>
                ) : (
                  <>
                    {dynamicTimestamp < endTimestamp ? (
                      Number(votesTotal) >=
                      (quadraticVoting
                        ? Number(Math.sqrt(quorumSnapshot))
                        : Number(quorumSnapshot)) ? (
                        <span className="text-neonGreen">Reached</span>
                      ) : (
                        <span className="text-orange-400">Awaiting votes</span>
                      )
                    ) : Number(votesTotal) >=
                      (quadraticVoting
                        ? Number(Math.sqrt(quorumSnapshot))
                        : Number(quorumSnapshot)) ? (
                      <span className="text-neonGreen">Reached</span>
                    ) : (
                      <span className="text-highlightRed">Failed</span>
                    )}
                  </>
                )}
              </div>
            }
          />
          {/* Add Verdict MetadataCard */}
          <MetadataCard
            label="VERDICT"
            value={
              <div className="flex items-center gap-2 uppercase">
                {status === 'active' && dynamicTimestamp < endTimestamp ? (
                  <span className="text-gray-400">
                    HIDDEN{' '}
                    <InfoToolTip>
                      <p>
                        The final verdict will be revealed after the proposal end date
                        is reached.
                      </p>
                    </InfoToolTip>
                  </span>
                ) : (
                  <>
                    {dynamicTimestamp < endTimestamp ? (
                      <span className="text-orange-400">In Progress</span>
                    ) : Number(votesTotal) >=
                      (quadraticVoting
                        ? Number(Math.sqrt(quorumSnapshot))
                        : Number(quorumSnapshot)) ? (
                      <span className={Number(votesFor) > Number(votesTotal - votesFor) ? 'text-neonGreen' : 'text-highlightRed'}>
                        {Number(votesFor) > Number(votesTotal - votesFor) ? 'PASSED' : 'REJECTED'}
                      </span>
                    ) : (
                      <span className="text-highlightRed">INVALID - FAILED QUORUM</span>
                    )}
                  </>
                )}
              </div>
            }
          />
          <MetadataCard
            label="STATUS"
            value={
              <span className={`font-medium ${getStatusStyles(status)}`}>
                {status.toUpperCase()}
              </span>
            }
          />
          {status === 'active' && dynamicTimestamp < endTimestamp && (
            <MetadataCard
              label="TIME LEFT TO VOTE"
              value={
                <div className="flex items-center gap-2">
                  <CountdownTimer endTimestamp={endTimestamp} />
                </div>
              }
            />
          )}
        </div>

        {/* Proposal Details Card */}
        <div className="rounded-2xl border border-seaBlue-1025 bg-seaBlue-1075 p-4 sm:p-8">
          <h2 className="mb-4 flex items-center justify-center text-center text-lg font-bold sm:mb-8 sm:text-2xl">
            PROPOSAL DETAILS
          </h2>

          <div className="space-y-4 sm:space-y-8">
            {/* Title */}
            <div>
              <h3 className="mb-2 text-center text-xs font-medium text-gray-400 sm:text-sm">
                TITLE
              </h3>
              <ProposalContent
                content={title}
                type="title"
                className="w-full"
              />
            </div>

            {/* Summary */}
            {summary && (
              <div>
                <h3 className="mb-2 text-center text-xs font-medium text-gray-400 sm:text-sm">
                  SUMMARY
                </h3>
                <ProposalContent
                  content={summary}
                  type="summary"
                  className="prose prose-sm prose-invert w-full sm:prose lg:prose-lg prose-p:text-white"
                />
              </div>
            )}

            {/* Content */}
            <div>
              <h3 className="mb-2 text-center text-xs font-medium text-gray-400 sm:text-sm">
                CONTENT
              </h3>
              <ProposalContent
                content={body}
                type="body"
                className="prose prose-sm prose-invert w-full sm:prose lg:prose-lg prose-p:text-white"
              />
            </div>
          </div>
        </div>

        {/* Action Details Card */}
        {action !== zeroAddress && (
          <div className="rounded-2xl border border-seaBlue-1025 bg-seaBlue-1075 p-3 sm:p-8">
            <h2 className="mb-3 flex items-center justify-center text-center text-lg font-bold sm:mb-8 sm:text-2xl">
              ACTION DETAILS
            </h2>
            <div className="grid grid-cols-1">
              {/* Transaction Details */}
              {transactionDetails && (
                <div className="rounded-xl border border-seaBlue-1025 bg-seaBlue-1075/50 p-6">
                  <h4 className="mb-4 text-base font-medium text-[#2D7FEA] sm:text-lg">
                    TRANSACTION DETAILS
                  </h4>
                  <div className="space-y-3 text-sm sm:text-base">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Target Wallet:</span>
                      <Link
                        href={`${networkInfo?.explorerLink}/address/${transactionDetails.targetWallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[#2D7FEA] transition-colors hover:text-[#4B9BFF]"
                      >
                        {transactionDetails.targetWallet.slice(0, 4)}...
                        {transactionDetails.targetWallet.slice(-4)}
                        <FontAwesomeIcon
                          icon={faExternalLinkAlt}
                          className="h-3 w-3"
                        />
                      </Link>
                    </div>
                    {transactionDetails.amountUsdc > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">USDC Amount:</span>
                        <span>
                          {transactionDetails.amountUsdc.toLocaleString()} USDC
                        </span>
                      </div>
                    )}
                    {transactionDetails.amountSci > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">SCI Amount:</span>
                        <span>
                          {transactionDetails.amountSci.toLocaleString()} SCI
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Election Details */}
              {electionDetails && (
                <div className="rounded-xl border border-seaBlue-1025 bg-seaBlue-1075/50 p-6">
                  <h4 className="mb-4 text-base font-medium text-orange-400 sm:text-lg">
                    ELECTION DETAILS
                  </h4>
                  <div className="space-y-3 text-sm sm:text-base">
                    {electionDetails.electedWallets.map((wallet, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-400">
                          Candidate {index + 1}:
                        </span>
                        <Link
                          href={`${networkInfo?.explorerLink}/address/${wallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[#2D7FEA] transition-colors hover:text-[#4B9BFF]"
                        >
                          {wallet.slice(0, 4)}...{wallet.slice(-4)}
                          <FontAwesomeIcon
                            icon={faExternalLinkAlt}
                            className="h-3 w-3"
                          />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Impeachment Details */}
              {impeachmentDetails && (
                <div className="rounded-xl border border-seaBlue-1025 bg-seaBlue-1075/50 p-6">
                  <h4 className="mb-4 text-base font-medium text-highlightRed sm:text-lg">
                    IMPEACHMENT DETAILS
                  </h4>
                  <div className="space-y-3 text-sm sm:text-base">
                    {impeachmentDetails.impeachedWallets.map(
                      (wallet, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-gray-400">
                            Scientist {index + 1}:
                          </span>
                          <Link
                            href={`${networkInfo?.explorerLink}/address/${wallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[#2D7FEA] transition-colors hover:text-[#4B9BFF]"
                          >
                            {wallet.slice(0, 4)}...{wallet.slice(-4)}
                            <FontAwesomeIcon
                              icon={faExternalLinkAlt}
                              className="h-3 w-3"
                            />
                          </Link>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Parameter Change Details */}
              {parameterChangeDetails && (
                <div className="rounded-xl border border-seaBlue-1025 bg-seaBlue-1075 p-4 sm:p-8">
                  <h4 className="mb-4 text-sm font-medium text-[#2D7FEA] sm:mb-6 sm:text-lg">
                    RESEARCH PARAMETER CHANGES
                  </h4>
                  <div className="space-y-6 text-sm sm:space-y-8 sm:text-base">
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <span className="text-sm font-medium sm:text-base">
                        Parameter:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base">
                          {getDescriptiveParamNames(
                            parameterChangeDetails.param
                          )}
                        </span>
                        <InfoToolTip>
                          <div className="space-y-3">
                            <p className="text-xs sm:text-sm">
                              Current Value:{' '}
                              {currentGovernanceParameterValue(
                                parameterChangeDetails.param,
                                governance?.govResParams
                              )}
                            </p>
                            <p className="text-xs sm:text-sm">
                              Proposed Value:{' '}
                              {isParameterChangeForResearch &&
                                parameterChangeDetails?.param === 'quorum'
                                ? `${parameterChangeDetails?.data} vote(s)`
                                : convertTime(
                                    Number(parameterChangeDetails?.data) || 0
                                  )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {getDescriptiveParamNames(
                                parameterChangeDetails.param
                              )}
                            </p>
                          </div>
                        </InfoToolTip>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col justify-between gap-3 border-t border-seaBlue-1025 pt-4 sm:flex-row sm:items-center">
                      <span className="text-sm font-medium sm:text-base">
                        {status === 'executed'
                          ? 'Parameter change history:'
                          : 'Parameter change:'}{' '}
                      </span>
                      <ParameterChangeHistory
                        parameterChangeDetails={parameterChangeDetails}
                        governance={governance}
                        networkInfo={networkInfo}
                        convertTime={(value) => convertTime(Number(value) || 0)}
                        proposalStatus={status}
                        proposalStartTimestamp={startTimestamp}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voting Statistics Card */}
        {dynamicTimestamp > endTimestamp && (
          <div className="rounded-2xl border border-seaBlue-1025 bg-seaBlue-1075 p-4 sm:p-8">
            <h2 className="mb-4 flex items-center justify-center text-center text-lg font-bold sm:mb-8 sm:text-2xl">
              VOTING STATISTICS
            </h2>

            <div className="mb-4 sm:mb-8">
              <div className="flex justify-center gap-4 sm:gap-8">
                <div className="text-center">
                  <span className="text-lg font-bold text-neonGreen sm:text-2xl">
                    {Number(votesFor).toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-400 sm:text-base">
                    VOTES FOR
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-highlightRed sm:text-2xl">
                    {Number(votesTotal - votesFor).toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-400 sm:text-base">
                    VOTES AGAINST
                  </p>
                </div>
              </div>
            </div>

            {(topVotersFor?.length > 0 || topVotersAgainst?.length > 0) && (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Always maintain a left column, even if empty */}
                <div className="md:col-span-1">
                  {topVotersFor?.length > 0 && (
                    <VoterList
                      voters={topVotersFor}
                      type="supporters"
                      networkInfo={networkInfo}
                    />
                  )}
                </div>

                {/* Always place opposers in the right column */}
                <div className="md:col-span-1">
                  {topVotersAgainst?.length > 0 && (
                    <VoterList
                      voters={topVotersAgainst}
                      type="opposers"
                      networkInfo={networkInfo}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Voting Information */}
        {
          <div className="rounded-2xl border border-seaBlue-1025 bg-seaBlue-1075 p-4 sm:p-8">
            <h2 className="mb-4 flex items-center justify-center text-center text-lg font-bold sm:mb-8 sm:text-2xl">
              VOTING INFORMATION
            </h2>

            <div className="space-y-4 text-sm sm:space-y-6 sm:text-base">
              {/* Loading State */}
              {isLoadingEligibility ? (
                <div className="flex items-center justify-center">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent" />
                </div>
              ) : (
                <>
                  {userVoteData?.voted ? (
                    <div className="flex flex-col items-center gap-2">
                      <span>
                        You voted{' '}
                        {userVoteData.previousSupport ? (
                          <span>
                            <span className="font-medium text-neonGreen">
                              FOR
                            </span>{' '}
                            this proposal with{' '}
                            {userVoteData.previousVoteAmount.toLocaleString()}{' '}
                            vote(s)
                          </span>
                        ) : (
                          <span>
                            {' '}
                            <span className="font-medium text-highlightRed">
                              AGAINST
                            </span>{' '}
                            this proposal with{' '}
                            {userVoteData.previousVoteAmount.toLocaleString()}{' '}
                            vote(s)
                          </span>
                        )}
                      </span>

                      {eligibleToVote && timeLeftToChangeVote > 0 && (
                        <div>
                          <span className="text-sm text-orange-500 sm:text-base">
                            {formatTimeLeft(
                              Math.min(
                                timeLeftToChangeVote,
                                Math.max(
                                  0,
                                  endTimestamp -
                                    Number(
                                      governance?.govResParams
                                        ?.voteChangeCutOff
                                    ) -
                                    dynamicTimestamp
                                )
                              )
                            )}{' '}
                          </span>
                          left to change vote
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {!wallet?.state?.address && !wallet?.state?.isVerified ? (
                        <div className="text-center">
                          <span className="text-highlightRed">
                            Log in to view your vote information
                          </span>
                        </div>
                      ) : eligibleToVote && status === 'active' ? (
                        <div className="text-center">
                          <span className="text-neonGreen">
                            You are eligible to vote on this proposal
                          </span>
                        </div>
                      ) : !userVoteData?.voted &&
                        (status === 'scheduled' ||
                          endTimestamp < dynamicTimestamp) ? (
                        <div className="text-center">
                          <span className="text-highlightRed">
                            You did not vote on this proposal
                          </span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-highlightRed">
                            You are not eligible to vote on this proposal
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        }

        {/* Add Comments section */}
        <div className="rounded-2xl border border-seaBlue-1025 bg-seaBlue-1075 p-4 sm:p-8">
          <Comments
            proposalIndex={index}
            proposalType="research"
          />
        </div>

        {/* Sticky voting section */}
        <div className="sticky bottom-0 flex w-full flex-col items-center justify-center rounded-2xl border border-seaBlue-1025 bg-seaBlue-1075 px-3 py-4 text-sm sm:px-4 sm:py-8 sm:text-base">
          {status === 'executed' ? (
            <div className="flex w-full flex-col items-center gap-4">
              <button
                className={`
                  w-full 
                  rounded-lg 
                  border-[1px] 
                  border-neonGreen
                  bg-seaBlue-1075
                  py-3
                  font-acuminSemiBold 
                  text-neonGreen 
                  shadow-glow-neonGreen-limited
                `}
                disabled
              >
                Executed
              </button>
              {eventDate && executionTransactionHash && (
                <p className="text-center">
                  <span className="text-neonGreen">
                    Executed on {eventDate}.
                  </span>{' '}
                  <span>
                    View transaction{' '}
                    <Link
                      className="text-steelBlue hover:text-tropicalBlue"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`${networkInfo?.explorerLink}/tx/${executionTransactionHash}`}
                    >
                      here{' '}
                      <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                    </Link>
                  </span>
                </p>
              )}
            </div>
          ) : status === 'completed' ? (
            <div className="flex w-full flex-col items-center gap-4">
              <button
                className={`
                  x 
                  w-full rounded-lg
                  border-[1px] 
                  border-neonGreen
                  bg-seaBlue-1075
                  py-3
                  font-acuminSemiBold 
                  text-neonGreen 
                  shadow-glow-neonGreen-limited
                `}
                disabled
              >
                Completed
              </button>
              {eventDate && (
                <p className="text-center text-neonGreen">
                  Completed on {eventDate}.
                </p>
              )}
            </div>
          ) : status === 'canceled' ? (
            <div className="flex w-full flex-col items-center gap-4">
              <button
                className={`
                  w-full 
                  rounded-lg 
                  border-[1px] 
                  border-highlightRed
                  bg-seaBlue-1075
                  py-3
                  font-acuminSemiBold 
                  text-highlightRed 
                  shadow-glow-highlightRed-limited
                `}
                disabled
              >
                {proposalInvalid ? 'Invalid' : proposalRejected ? 'Rejected' : 'Canceled'}
              </button>
              {eventDate && (
                <p className="text-center text-highlightRed">
                  {proposalInvalid ? 'Invalidated' : proposalRejected ? 'Rejected' : 'Canceled'} on {eventDate}.
                </p>
              )}
            </div>
          ) : wallet?.state?.address &&
            wallet?.state?.chainId ===
              `0x${networkInfo?.chainId.toString(16)}` &&
            wallet?.state?.isVerified ? (
            <>
              {wallet?.state?.isConnected ? (
                <>
                  {loading ||
                  isLoadingScheduling ||
                  isLoadingExecution ||
                  isLoadingCompletion ||
                  isLoadingCancellation ? (
                    <button className={styles.primary} disabled>
                      <span className="mr-2">
                        {isLoadingScheduling && 'Scheduling proposal...'}
                        {isLoadingExecution && 'Executing proposal...'}
                        {isLoadingCompletion && 'Completing proposal...'}
                        {isLoadingCancellation && 'Canceling proposal...'}
                        {!isLoadingScheduling &&
                          !isLoadingExecution &&
                          !isLoadingCompletion &&
                          !isLoadingCancellation &&
                          'Confirm transaction in your wallet'}
                      </span>
                      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    </button>
                  ) : schedulable &&
                    status !== 'scheduled' &&
                    dynamicTimestamp > endTimestamp ? (
                    <button
                      className={styles.primary}
                      onClick={async () => await scheduleProposal(index)}
                    >
                      Schedule
                    </button>
                  ) : status === 'scheduled' &&
                    executable &&
                    isLoadingScheduledTime ? (
                    <button className={styles.primary} disabled>
                      <span className="mr-2">Loading execution time...</span>
                      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    </button>
                  ) : status === 'scheduled' &&
                    executable &&
                    scheduledTime > 0 &&
                    dynamicTimestamp >= scheduledTime ? (
                    <button
                      className={styles.primary}
                      onClick={async () => await executeProposal(index)}
                    >
                      Execute
                    </button>
                  ) : status === 'scheduled' && executable ? (
                    <div className="flex w-full flex-col text-center">
                      {scheduledTime > 0 && dynamicTimestamp < scheduledTime ? (
                        <div className="flex flex-col items-center gap-4">
                          <span className="text-sm sm:text-base">
                            Time until execution is available:
                          </span>
                          <CountdownTimer
                            endTimestamp={scheduledTime}
                            className="w-full text-sm sm:text-base"
                          />
                        </div>
                      ) : (
                        // Display waiting message when scheduled time is not yet available
                        <span className="text-sm">
                          Waiting for execution details...
                        </span>
                      )}

                      {fetchError && (
                        <button
                          className="mt-2 rounded-lg border border-[#2D7FEA] px-4 py-2 text-sm text-[#2D7FEA] hover:bg-[#2D7FEA]/10"
                          onClick={() => {
                            setIsLoadingScheduledTime(true);
                            setFetchError(false);
                            if (!networkInfo?.governorExecutor) {
                              console.error(
                                'Governor executor address not available'
                              );
                              setFetchError(true);
                              setIsLoadingScheduledTime(false);
                              return;
                            }
                            publicClient
                              .readContract({
                                address:
                                  networkInfo.governorExecutor as Address,
                                abi: govExecAbiViem,
                                functionName: 'scheduledTime',
                                args: [action as Address],
                              })
                              .then((time) => {
                                console.log('Scheduled time (retry):', time);
                                setScheduledTime(Number(time as bigint));
                                setFetchError(false);
                              })
                              .catch((error) => {
                                console.error(
                                  'Error fetching scheduled time (retry):',
                                  error
                                );
                                setFetchError(true);
                              })
                              .finally(() => {
                                setIsLoadingScheduledTime(false);
                              });
                          }}
                        >
                          Retry
                        </button>
                      )}
                      {/* <span className="mt-2 text-xs text-gray-400">
                        (Auto-refreshing every 30 seconds)
                      </span> */}
                    </div>
                  ) : status === 'scheduled' && !executable ? (
                    <button
                      className={styles.primary}
                      onClick={async () => await completeProposal(index)}
                    >
                      Complete
                    </button>
                  ) : cancelable && proposalInvalid ? (
                    <button
                      className={styles.primary}
                      onClick={async () => await cancelProposal(index)}
                    >
                      Cancel Invalid Proposal
                    </button>
                  ) : cancelable && proposalRejected ? (
                    <button
                      className={styles.primary}
                      onClick={async () => await cancelProposal(index)}
                    >
                      Cancel Rejected Proposal
                    </button>
                  ) : status === 'active' && dynamicTimestamp > endTimestamp &&
                    !schedulable ? (
                    <div className="flex w-full flex-col gap-4">
                      <button className={styles.primary} disabled>
                        Voting Period Ended
                      </button>
                      <p className="text-center text-orange-400">
                        Proposal is being processed...
                      </p>
                    </div>
                  ) : eligibleToVote ? (
                    <div className="flex w-full flex-col gap-4">
                      <button
                        className={styles.primary}
                        onClick={votePreviewhandler}
                      >
                        {userVoteData?.voted ? 'Change Vote' : 'Vote'}
                      </button>
                    </div>
                  ) : (
                    !eligibleToVote && (
                      <ErrorDisplay
                        error={'Voting window passed, vote cannot be changed'}
                      />
                    )
                  )}
                </>
              ) : (
                <ConnectWallet
                  isNavBar={false}
                  toggleAccountMenu={() => null}
                />
              )}
            </>
          ) : (
            <ConnectWallet isNavBar={false} toggleAccountMenu={() => null} />
          )}
          {!eventDate && status === 'scheduled' && action !== zeroAddress ? (
            <p className="pt-4 text-neonGreen xs:text-sm sm:text-base">
              Awaiting Proposal Execution...
            </p>
          ) : !eventDate && status === 'scheduled' && action === zeroAddress ? (
            <p className="pt-4 text-neonGreen xs:text-sm sm:text-base">
              Awaiting Proposal Completion...
            </p>
          ) : !eventDate && schedulable ? (
            <p className="pt-4 text-neonGreen xs:text-sm sm:text-base">
              Proposal Passed, Awaiting Scheduling...
            </p>
          ) : !eventDate && cancelable && proposalInvalid ? (
            <p className="pt-4 text-highlightRed xs:text-sm sm:text-base">
              Proposal Invalid, Awaiting Cancellation...
            </p>
          ) : !eventDate && cancelable && proposalRejected ? (
            <p className="pt-4 text-highlightRed xs:text-sm sm:text-base">
              Proposal Rejected, Awaiting Cancellation...
            </p>
          ) : null}
          {!eventDate && status === 'scheduled' && action === zeroAddress ? (
            <p className="pt-4 text-neonGreen xs:text-sm sm:text-base">
              Awaiting Proposal Completion...
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
