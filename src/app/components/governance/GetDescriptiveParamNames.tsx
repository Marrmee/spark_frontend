const getDescriptiveParamNames = (
  selectedParameter: string
): string => {
  switch (selectedParameter) {
    case 'proposalLifetime':
      return 'Proposal Lifetime — Duration a proposal remains active for voting';
    case 'quorum':
      return 'Quorum — Minimum number of votes required for proposal validation';
    case 'voteLockTime':
      return 'Vote Lock Time — Time tokens remain locked after voting';
    case 'proposeLockTime':
      return 'Proposal Lock Time — The duration tokens remain locked after creating a proposal, as well as the waiting period before proposing again';
    case 'voteChangeTime':
      return 'Vote Change Time — Time window to change a vote after casting it';
    case 'voteChangeCutOff':
      return 'Vote Change Cut-Off — Time before proposal ends when vote changes are no longer allowed';
    case 'ddThreshold':
      return 'Proposal Threshold — Minimum tokens required to propose funding for research and become a Due Diligence member';
    default:
      return 'Unknown parameter';
  }
};

export default getDescriptiveParamNames;