'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { CompleteProposalType } from '@/app/utils/interfaces';
import { useProposals } from '@/app/context/ProposalsContext';
import {
  Address,
  type Abi,
  decodeEventLog,
  zeroAddress,
} from 'viem';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { CustomError } from '@/app/utils/rpcErrorInterfaces';
import { getLatestBlockTimestamp } from '@/app/components/governance';
import ProposalPage from '@/app/components/governance/ProposalPage';
import Modal from '@/app/components/modals/Modal';
import ModalVoting from '@/app/components/modals/ModalVoting';
import Loading from '@/app/components/general/Loading';
import useCancelProposal from '@/app/components/hooks/UseCancelProposal';
import useVoteEligibility from '@/app/components/hooks/UseVoteEligibility';
import useExecuteProposal from '@/app/components/hooks/UseExecuteProposal';
import useScheduleProposal from '@/app/components/hooks/UseScheduleProposal';
import useCompleteProposal from '@/app/components/hooks/UseCompleteProposal';
import govResearchAbi from '@/app/abi/GovernorResearch.json';
import { useNotification } from '@/app/context/NotificationContext';
import ContentRefreshOverlay from '@/app/components/general/ContentRefreshOverlay';
import { publicClient } from '@/app/config/viem';
type Props = {
  params: {
    index: string;
  };
};

export default function ClientResearchProposalPage({ params }: Props) {
  const proposalIndex = Number(params.index);
  const networkInfo = useNetworkInfo();
  const [isProposalLoading, setIsProposalLoading] = useState(true);
  const [proposal, setProposal] = useState<CompleteProposalType | null>(null);
  const [votePreview, setVotePreview] = useState(false);
  const { addNotification } = useNotification();
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const {
    researchProposals,
    isLoading,
    refreshProposals,
    fetchSingleProposal,
    clearProposals
  } = useProposals();

  const [topVotersFor, setTopVotersFor] = useState<
    { user: string; amount: string }[] | undefined
  >([]);
  const [topVotersAgainst, setTopVotersAgainst] = useState<
    { user: string; amount: string }[] | undefined
  >([]);
  const [isLoadingVoters, setIsLoadingVoters] = useState(false);
  const hasLoadedVotersRef = useRef(false);
  const proposalRef = useRef(proposal);
  const statusUpdateTimeoutRef = useRef<NodeJS.Timeout>();
  const [isContentRefreshing, setIsContentRefreshing] = useState(false);

  // Move error handling outside component to prevent recreation
  const handleError = useMemo(
    () => (message: string) => {
      addNotification(message, 'error');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  ); // Empty dependency array as this function should be stable

  const handleRpcError = useMemo(
    () => (errorObj: CustomError) => {
      if (errorObj?.shortMessage) {
        addNotification(errorObj.shortMessage, 'error');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  ); // Empty dependency array as this function should be stable

  // Function to fetch top voters
  const fetchTopVoters = useCallback(async () => {
    if (isLoadingVoters) return;
    setIsLoadingVoters(true);

    try {
      const response = await fetch(
        `/api/fetch-top-voters?proposalIndex=${proposalIndex}`
      );
      if (response.ok) {
        const data = await response.json();
        setTopVotersFor(data.topVotersFor);
        setTopVotersAgainst(data.topVotersAgainst);
      }
    } catch (err) {
      console.error('Error fetching voters:', err);
    } finally {
      setIsLoadingVoters(false);
    }
  }, [proposalIndex, isLoadingVoters]);

  // Main useEffect for proposal data
  useEffect(() => {
    if (!researchProposals) return;

    // Find proposal by matching index instead of using array index
    const fetchedProposal = researchProposals.find(
      (p) => p.index === proposalIndex
    );
    if (!fetchedProposal) return;

    setProposal(fetchedProposal);
    setIsProposalLoading(false);

    // Update timestamp for active proposals
    if (fetchedProposal.status === 'active') {
      getLatestBlockTimestamp()
        .then((timestamp) => setCurrentTimestamp(Number(timestamp)))
        .catch((err) => console.error('Error fetching timestamp:', err));
    }

    // Initial fetch of top voters if proposal has ended
    const currentTime = Math.floor(Date.now() / 1000);
    const hasEnded = Number(fetchedProposal.endTimestamp) < currentTime;
    if (hasEnded && !hasLoadedVotersRef.current) {
      hasLoadedVotersRef.current = true;
      fetchTopVoters();
    }
  }, [researchProposals, proposalIndex, fetchTopVoters]);

  // Update ref when proposal changes
  useEffect(() => {
    proposalRef.current = proposal;
  }, [proposal]);

  // Set up event listeners for proposal updates
  useEffect(() => {
    if (!publicClient || !networkInfo?.governorResearch) return;

    let isSubscribed = true;

    const unwatch = publicClient.watchContractEvent({
      address: networkInfo.governorResearch as Address,
      abi: govResearchAbi as Abi,
      eventName: 'StatusUpdated',
      onLogs: async (logs) => {
        if (!isSubscribed) return;

        // Clear any existing timeout
        if (statusUpdateTimeoutRef.current) {
          clearTimeout(statusUpdateTimeoutRef.current);
        }

        // Debounce the update
        statusUpdateTimeoutRef.current = setTimeout(async () => {
          for (const log of logs) {
            const { args } = decodeEventLog({
              abi: govResearchAbi as Abi,
              data: log.data,
              topics: log.topics,
            });
            if (
              args &&
              'index' in args &&
              args.index === BigInt(proposalIndex)
            ) {
              const currentTime = Math.floor(Date.now() / 1000);
              const currentProposal = proposalRef.current;
              if (
                currentProposal &&
                Number(currentProposal.endTimestamp) < currentTime &&
                !hasLoadedVotersRef.current
              ) {
                hasLoadedVotersRef.current = true;
                await fetchTopVoters();
              }
            }
          }
        }, 500); // 500ms debounce
      },
    });

    return () => {
      isSubscribed = false;
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
      }
      unwatch();
    };
  }, [
    networkInfo?.governorResearch,
    proposalIndex,
    fetchTopVoters,
  ]); // Removed proposal dependency

  // Set up event listeners for vote updates
  useEffect(() => {
    if (!publicClient || !networkInfo?.governorResearch) return;

    let isSubscribed = true;

    const unwatch = publicClient.watchContractEvent({
      address: networkInfo.governorResearch as Address,
      abi: govResearchAbi as Abi,
      eventName: 'Voted',
      onLogs: async (logs) => {
        if (!isSubscribed) return;

        // Clear any existing timeout
        if (statusUpdateTimeoutRef.current) {
          clearTimeout(statusUpdateTimeoutRef.current);
        }

        // Debounce the update
        statusUpdateTimeoutRef.current = setTimeout(async () => {
          for (const log of logs) {
            const { args } = decodeEventLog({
              abi: govResearchAbi as Abi,
              data: log.data,
              topics: log.topics,
            });
            if (
              args &&
              'index' in args &&
              args.index === BigInt(proposalIndex)
            ) {
              const currentTime = Math.floor(Date.now() / 1000);
              const currentProposal = proposalRef.current;
              if (
                currentProposal &&
                Number(currentProposal.endTimestamp) < currentTime &&
                !hasLoadedVotersRef.current
              ) {
                hasLoadedVotersRef.current = true;
                await fetchTopVoters();
              }
            }
          }
        }, 500); // 500ms debounce
      },
    });

    return () => {
      isSubscribed = false;
      if (statusUpdateTimeoutRef.current) {
        clearTimeout(statusUpdateTimeoutRef.current);
      }
      unwatch();
    };
  }, [
    networkInfo?.governorResearch,
    proposalIndex,
    fetchTopVoters,
  ]);

  const {
    executeProposal,
    executionTransactionHash,
    executionInitiated,
    setExecutionInitiated,
    isLoadingExecution
  } = useExecuteProposal(
    proposalIndex,
    handleError,
    handleRpcError,
    proposal,
    undefined, // onOptimisticUpdate
    () => {
      // Inline function to avoid circular dependency
      console.log('Execution status change callback triggered');
      setTimeout(() => refreshProposalData(), 2000);
    }
  );

  const {
    cancelProposal,
    cancellationTransactionHash,
    cancellationInitiated,
    setCancellationInitiated,
    isLoadingCancellation
  } = useCancelProposal(
    proposalIndex,
    govResearchAbi as Abi,
    networkInfo?.governorResearch || zeroAddress,
    handleRpcError,
    handleError,
    undefined, // onOptimisticUpdate
    () => {
      // Inline function to avoid circular dependency
      console.log('Cancellation status change callback triggered');
      setTimeout(() => refreshProposalData(), 2000);
    }
  );

  // Function to refresh the proposal data
  const refreshProposalData = useCallback(async () => {
    try {
      console.log('Refreshing proposal data after status change...');
      setIsProposalLoading(true);

      // Add a small delay to allow the blockchain to update
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // First refresh all proposals to update the global state
      const refreshResult = await refreshProposals();
      
      // Check if refresh was successful or handle cooldown
      if (!refreshResult.success && refreshResult.reason === 'cooldown') {
        const timeLeftSeconds = refreshResult.timeLeft || 0;
        const minutes = Math.floor(timeLeftSeconds / 60);
        const seconds = timeLeftSeconds % 60;
        
        const timeLeftFormatted = minutes > 0 
          ? `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}` 
          : `${seconds} second${seconds !== 1 ? 's' : ''}`;
        
        addNotification(`Please wait ${timeLeftFormatted} before refreshing again.`, 'warning');
      }

      // Then fetch this specific proposal to get the latest data
      // Make multiple attempts if needed, as the blockchain might take time to update
      let updatedProposal: CompleteProposalType | undefined = undefined;
      let attempts = 0;
      const maxAttempts = 3;

      // Determine what status we're expecting based on current proposal
      const isExpectingCompletion =
        proposal?.status.toLowerCase() === 'scheduled' &&
        proposal?.action === zeroAddress;
      const expectedStatus = isExpectingCompletion ? 'completed' : 'scheduled';

      while (
        (!updatedProposal ||
          !updatedProposal.status.toLowerCase().includes(expectedStatus)) &&
        attempts < maxAttempts
      ) {
        attempts++;
        console.log(`Attempt ${attempts} to fetch updated proposal data...`);

        // Add a delay between attempts
        if (attempts > 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Use forceFresh=true to bypass all caching
        updatedProposal = await fetchSingleProposal(proposalIndex, true);

        if (updatedProposal) {
          console.log(
            `Attempt ${attempts} result - Updated proposal data:`,
            updatedProposal
          );

          // If the status is now what we expect, we're good
          if (updatedProposal.status.toLowerCase().includes(expectedStatus)) {
            console.log(
              `✅ Proposal successfully updated to ${expectedStatus} status`
            );
            break;
          }
        }
      }

      if (updatedProposal) {
        setProposal(updatedProposal);
      }

      // Update timestamp
      const timestamp = await getLatestBlockTimestamp();
      setCurrentTimestamp(Number(timestamp));

      // Check the actual status of the updated proposal
      if (updatedProposal) {
        const actualStatus = updatedProposal.status.toLowerCase();

        if (actualStatus.includes('canceled')) {
          // Handle cancelled proposal notification
          addNotification(`Proposal canceled successfully!`, 'success');
        } else if (actualStatus.includes('completed')) {
          // Handle completed proposal notification
          addNotification(`Proposal completed successfully!`, 'success');
        } else if (actualStatus.includes('scheduled')) {
          // Handle scheduled proposal notification
          addNotification(`Proposal scheduled successfully!`, 'success');
        } else {
          // If status doesn't match expected, suggest a manual refresh
          // Determine what message to show based on the action that was taken
          if (cancellationInitiated || cancellationTransactionHash) {
            addNotification(
              `Proposal canceled. Please refresh the page if status is not updated.`,
              'info'
            );
          } else if (isExpectingCompletion) {
            addNotification(
              `Proposal completed. Please refresh the page if status is not updated.`,
              'info'
            );
          } else {
            addNotification(
              `Proposal scheduled. Please refresh the page if status is not updated.`,
              'info'
            );
          }
        }
      } else {
        // If we still don't have the updated proposal, suggest a manual refresh
        // Determine what message to show based on the action that was taken
        if (cancellationInitiated || cancellationTransactionHash) {
          addNotification(
            `Proposal canceled. Please refresh the page if status is not updated.`,
            'info'
          );
        } else if (isExpectingCompletion) {
          addNotification(
            `Proposal completed. Please refresh the page if status is not updated.`,
            'info'
          );
        } else {
          addNotification(
            `Proposal scheduled. Please refresh the page if status is not updated.`,
            'info'
          );
        }
      }
    } catch (error) {
      console.error('Error refreshing proposal data:', error);
      addNotification(
        'Transaction successful, but there was an error refreshing the data. Please refresh the page.',
        'warning'
      );
    } finally {
      setIsProposalLoading(false);
    }
  }, [
    proposalIndex,
    refreshProposals,
    fetchSingleProposal,
    addNotification,
    proposal,
    cancellationInitiated,
    cancellationTransactionHash,
  ]);

  const {
    scheduleProposal,
    schedulingTransactionHash,
    schedulingInitiated,
    setSchedulingInitiated,
    isLoadingScheduling
  } = useScheduleProposal(
    proposalIndex,
    govResearchAbi as Abi,
    networkInfo?.governorResearch || zeroAddress,
    handleRpcError,
    handleError,
    undefined, // onOptimisticUpdate
    () => {
      // Inline function to avoid circular dependency
      console.log('Scheduling status change callback triggered');
      setTimeout(() => refreshProposalData(), 2000);
    }
  );

  const {
    completeProposal,
    completionTransactionHash,
    completionInitiated,
    setCompletionInitiated,
    isLoadingCompletion
  } = useCompleteProposal(
    proposalIndex,
    govResearchAbi as Abi,
    networkInfo?.governorResearch || zeroAddress,
    handleRpcError,
    handleError,
    undefined, // onOptimisticUpdate
    () => {
      // Inline function to avoid circular dependency
      console.log('Completion status change callback triggered');
      setTimeout(() => refreshProposalData(), 2000);
    }
  );

  const {
    eligibleToVote,
    timeLeftToChangeVote,
    isLoadingEligibility,
    userVoteData,
  } = useVoteEligibility(
    proposalIndex,
    govResearchAbi as Abi,
    networkInfo?.governorResearch || zeroAddress,
    Number(proposal?.endTimestamp)
  );

  // Add a function to refresh the proposal data
  const handleRefreshProposal = async () => {
    try {
      // Only set content refreshing to true, not the whole proposal loading
      setIsContentRefreshing(true);
      
      // First refresh all proposals to update the global state
      console.log('Refreshing all research proposals...');
      const refreshResult = await refreshProposals();
      
      // Check if refresh was successful or handle cooldown
      if (!refreshResult.success && refreshResult.reason === 'cooldown') {
        const timeLeftSeconds = refreshResult.timeLeft || 0;
        const minutes = Math.floor(timeLeftSeconds / 60);
        const seconds = timeLeftSeconds % 60;
        
        const timeLeftFormatted = minutes > 0 
          ? `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}` 
          : `${seconds} second${seconds !== 1 ? 's' : ''}`;
        
        addNotification(`Please wait ${timeLeftFormatted} before refreshing again.`, 'warning');
        setIsContentRefreshing(false);
        return;
      }
      
      // Clear the cache for research proposals
      await clearProposals();
      
      // Fetch fresh data for this proposal
      const refreshedProposal = await fetchSingleProposal(Number(params.index), true);
      
      if (refreshedProposal) {
        setProposal(refreshedProposal);
        console.log('Successfully refreshed proposal data with quorum:', refreshedProposal.quorumSnapshot);
        addNotification('Proposal data refreshed successfully', 'success');
      }
    } catch (error) {
      console.error('Error refreshing proposal:', error);
      addNotification('Failed to refresh proposal data. Please try again.', 'error');
    } finally {
      setIsContentRefreshing(false);
    }
  };

  return (
    <div>
      {isProposalLoading || isLoading ? (
        <Loading />
      ) : (
        proposal && (
          <>
            <ContentRefreshOverlay isVisible={isContentRefreshing} />
            <ProposalPage
              index={Number(params.index)}
              info={proposal.info}
              summary={proposal.summary}
              title={proposal.title}
              body={proposal.body}
              status={proposal.status}
              action={proposal.action}
              startTimestamp={proposal.startTimestamp}
              endTimestamp={proposal.endTimestamp}
              startDateWithTime={proposal.startDateWithTime}
              endDateWithTime={proposal.endDateWithTime}
              votesFor={proposal.votesFor}
              votesTotal={proposal.votesTotal}
              executionOption={proposal.executionOption}
              quadraticVoting={proposal.quadraticVoting}
              currentTimestamp={currentTimestamp}
              executionTransactionHash={proposal.executionTxHash}
              eventDate={proposal.eventDate}
              schedulable={proposal.schedulable}
              cancelable={proposal.cancelable}
              proposalInvalid={proposal.proposalInvalid}
              proposalRejected={proposal.proposalRejected}
              executable={proposal.executable}
              votePreviewhandler={setVotePreview}
              scheduleProposal={scheduleProposal}
              executeProposal={executeProposal}
              completeProposal={completeProposal}
              cancelProposal={cancelProposal}
              proposer={proposal?.proposer || ''}
              topVotersFor={topVotersFor}
              topVotersAgainst={topVotersAgainst}
              eligibleToVote={eligibleToVote}
              userVoteData={userVoteData}
              timeLeftToChangeVote={timeLeftToChangeVote}
              isLoadingEligibility={isLoadingEligibility}
              loading={isLoading}
              quorumSnapshot={proposal?.quorumSnapshot ? Number(proposal.quorumSnapshot) : 0}
              handleRefresh={handleRefreshProposal}
              isLoadingScheduling={isLoadingScheduling}
              isLoadingExecution={isLoadingExecution}
              isLoadingCompletion={isLoadingCompletion}
              isLoadingCancellation={isLoadingCancellation}
            />
          </>
        )
      )}
      {votePreview && (
        <div className="z-10">
          <ModalVoting
            handler={setVotePreview}
            index={proposalIndex}
            proposalEndTimestamp={proposal?.endTimestamp}
            isLoadingEligibility={isLoadingEligibility}
            userVoteData={userVoteData}
            timeLeftToChangeVote={timeLeftToChangeVote}
            eligibleToVote={eligibleToVote}
          />
        </div>
      )}
      {schedulingInitiated && (
        <div className="z-10">
          <Modal
            transactionHash={schedulingTransactionHash}
            handler={setSchedulingInitiated}
            title={`RP-${proposalIndex} has successfully passed!`}
            subtitle={
              proposal?.action !== zeroAddress
                ? 'Awaiting execution by DAO...'
                : 'Awaiting completion by DAO...'
            }
          >
            <div></div>
          </Modal>
        </div>
      )}
      {executionInitiated && (
        <div className="z-10">
          <Modal
            transactionHash={executionTransactionHash}
            handler={setExecutionInitiated}
            title={`Successfully executed RP-${proposalIndex}`}
            subtitle={''}
          >
            <p></p>
          </Modal>
        </div>
      )}
      {completionInitiated && (
        <div className="z-10">
          <Modal
            transactionHash={completionTransactionHash}
            handler={setCompletionInitiated}
            title={`RP-${proposalIndex} has been completed!`}
            subtitle={''}
          >
            <div></div>
          </Modal>
        </div>
      )}
      {cancellationInitiated && (
        <div className="z-10">
          <Modal
            transactionHash={cancellationTransactionHash}
            handler={setCancellationInitiated}
            title={`RP-${proposalIndex} has been canceled!`}
            subtitle={''}
          >
            <div></div>
          </Modal>
        </div>
      )}
    </div>
  );
}
