enum ProposalStatus {
  Active,
  Scheduled,
  Executed,
  Completed, //Completed status only for proposals that cannot be executed
  Canceled,
}

export const returnProposalStatus = (status): string => {
  if (status == ProposalStatus.Active) {
    return 'active';
  } else if (status == ProposalStatus.Scheduled) {
    return 'scheduled';
  } else if (status == ProposalStatus.Executed) {
    return 'executed';
  } else if (status == ProposalStatus.Completed) {
    return 'completed';
  } else if (status == ProposalStatus.Canceled) {
    return 'canceled';
  } else {
    return 'inexistent status';
  }
};
