export default function checkEligibilityToScheduleOrCancel(
  fetchedTimestamp: number,
  proposalEndTimestamp: number,
  proposalStatus: string,
  votesTotal: number,
  votesFor: number,
  fetchedQuorum: number
) {
  console.log('votesTotal', votesTotal);
  console.log('votesFor', votesFor);
  console.log('fetchedQuorum', fetchedQuorum);

  const proposalOngoing = fetchedTimestamp < proposalEndTimestamp;
  const quorumReached = votesTotal >= fetchedQuorum;
  const votesAgainst = votesTotal - votesFor;
  const isProposalActive = proposalStatus === 'active';
  const isProposalCanceled = proposalStatus === 'canceled';
  const isVotesForGreaterThanVotesAgainst = votesFor > votesAgainst;

  let schedulable = false;
  let cancelable = false;
  let proposalInvalid = false;
  let proposalRejected = false;

  if (!isProposalActive && !isProposalCanceled) {
    return { schedulable, cancelable, proposalInvalid, proposalRejected };
  }

  // Check if proposal is ongoing or finished, and handle quorum proposalStatus
  if (proposalOngoing) {
    if (!quorumReached) {
      return { schedulable, cancelable, proposalInvalid, proposalRejected };
    } else {
      return { schedulable, cancelable, proposalInvalid, proposalRejected };
    }
  }

  // If proposal is finished and quorum is not reached --> cancelable
  if (!quorumReached) {
    cancelable = true;
    proposalInvalid = true;
    return { schedulable, cancelable, proposalInvalid, proposalRejected };
  }

  // Proposal is finished, quorum is reached
  if (isVotesForGreaterThanVotesAgainst) {
    schedulable = true;
  } else {
    cancelable = true;
    proposalRejected = true;
  }

  return { schedulable, cancelable, proposalInvalid, proposalRejected };
}
