export enum Payment {
  Usdc,
  Sci,
  SciUsdc,
  None,
}

//follows propose func documentation in GovOps
export enum ExecutionOptions {
  NotExecutable,
  Transaction,
  Election,
  Impeachment,
  ParameterChange,
}

export interface ProposalSubType {
  title: string;
  body: string;
  summary: string;
  action: string;
  executionOption: string;
  quadraticVoting: boolean;
}

export interface ProposalFromSmartContractType {
  startTimestamp: number;
  endTimestamp: number;
  status: string;
  action: string;
  votesFor: string;
  votesAgainst: string;
  votesTotal: string;
  executable: boolean;
  quadraticVoting: boolean;
}

export type ProposedType = {
  id: string;
  info: string;
  startTimestamp: string;
  endTimestamp: string;
  executable: boolean;
  quadraticVoting: boolean;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
};

export type StatusUpdatedType = {
  id: string;
  status: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
};

export type VotesUpdatedType = {
  id: string;
  votesFor: string;
  votesAgainst: string;
  votesTotal: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
};

export type FormattedProposal = {
  index: number;
  info: string;
  title: string;
  body: string;
  summary: string;
  executionOption: string;
  startTimestamp: number;
  endTimestamp: number;
  status: string;
  action: string;
  votesFor: string;
  votesAgainst: string;
  votesTotal: string;
  executable: boolean;
  quadraticVoting: boolean;
  schedulable: boolean;
  cancelable: boolean;
  proposalInvalid: boolean;
  proposalRejected: boolean;
};

export type CompleteProposalType = {
  index: number;
  info: string;
  title: string;
  body: string;
  summary: string;
  executionOption: string;
  startTimestamp: number;
  endTimestamp: number;
  status: string;
  action: string;
  votesFor: string;
  votesAgainst: string;
  votesTotal: string;
  executable: boolean;
  quadraticVoting: boolean;
  proposalStartDate: string;
  proposalEndDate: string;
  startDateWithTime: string;
  endDateWithTime: string;
  eventDate: string;
  schedulable: boolean;
  cancelable: boolean;
  proposalInvalid: boolean;
  proposalRejected: boolean;
  executionTxHash: string;
  quorumSnapshot: string;
  proposer: string;
};

export type Comment = {
  id: number;
  proposal_index: number;
  proposal_type: string;
  author_address: string;
  content: string;
  parent_id: number | null;
  parent_author_address: string | null;
  created_at: Date;
  updated_at: Date;
  moderation_status: string;
  is_edited: boolean;
  reactions?: {
      likes: number;
      dislikes: number;
      userReaction: 'like' | 'dislike' | null;
  };
  replies?: Comment[];
  total_replies?: number;
}; 

export type OffchainComment = {
  id: number;
  proposal_index: number;
  author_address: string;
  content: string;
  parent_id: number | null;
  parent_author_address: string | null;
  created_at: Date;
  updated_at: Date;
  moderation_status: string;
  is_edited: boolean;
  reactions?: {
      likes: number;
      dislikes: number;
      userReaction: 'like' | 'dislike' | null;
  };
  replies?: OffchainComment[];
  total_replies?: number;
}; 

export interface MessageData {
  action: string;
  timestamp: number;
  nonce: string;
  userAddress: string;
  commentId?: number;
  content?: string;
  parentId?: number;
  proposalIndex?: number;
  proposalType?: string;
  reactionType?: 'like' | 'dislike';
  reason?: string;
}

export type ExecutionDetails = 
    | { type: 'transaction'; details: TransactionDetails }
    | { type: 'election'; details: ElectionDetails }
    | { type: 'impeachment'; details: ImpeachmentDetails }
    | { type: 'parameterChange'; details: ParameterChangeDetails }
    | { type: 'notExecutable'; details: Record<string, never> };

// Types for off-chain proposals
export type ExecutionOption = 'transaction' | 'election' | 'impeachment' | 'parameterChange' | 'notExecutable';

export const OFFCHAIN_PROPOSAL_STATUSES = {
  DRAFT: 'draft',
  VOTING: 'voting',
  PENDING_CONVERSION: 'pending_conversion',
  ONCHAIN: 'onchain',
  CANCELED: 'canceled',
  REJECTED: 'rejected'
} as const;

export type OffchainProposalStatus = typeof OFFCHAIN_PROPOSAL_STATUSES[keyof typeof OFFCHAIN_PROPOSAL_STATUSES];

export type TransactionDetails = {
    targetWallet: string;
    amountUsdc?: number;
    amountSci?: number;
};

export type ElectionDetails = {
    electedWallets: string[];
};

export type ImpeachmentDetails = {
    impeachedWallets: string[];
};

export type ParameterChangeDetails = {
    gov: string;
    param: string;
    data: string | number;
};

export interface OffchainProposalType {
  id: number;
  index: number;
  title: string;
  summary?: string;
  body: string;
  proposer: string;
  executionOption: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executionDetails: any;
  createdAt?: number | string;
  updatedAt?: number | string;
  endTimestamp?: number | string;
  finalizedAt?: number | string;
  draftDeadlineTimestamp?: number | string;
  status?: string;
  upvotes: number;
  upvoters?: string[];
  quadraticVoting: boolean;
  onchainProposalId?: number | null;
  convertedAt?: number | string;
  requiredUpvotesThreshold?: number;
  transactionHash?: string | null;
}

export interface UserVoteDataGovRes {
  type: 'research';
  voted: boolean;
  initialVoteTimestamp: number;
  previousSupport: boolean;
  previousVoteAmount: number;
}

export const PROPOSAL_STATUSES = {
  ACTIVE: 'Active',
  SCHEDULED: 'Scheduled',
  EXECUTED: 'Executed',
  COMPLETED: 'Completed',
  CANCELED: 'Canceled'
} as const;

export type ProposalStatus = typeof PROPOSAL_STATUSES[keyof typeof PROPOSAL_STATUSES];

export interface GovernanceResearchParameters {
  proposalLifetime: string;
  quorum: string;
  voteLockTime: string;
  proposeLockTime: string;
  voteChangeTime: string;
  voteChangeCutOff: string;
  ddThreshold: string;
}

export interface ActionDetails {
  // ... existing code ...
}
