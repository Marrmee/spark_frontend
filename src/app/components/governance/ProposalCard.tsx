import { CompleteProposalType } from '@/app/utils/interfaces';
import getExecutionOptionsClasses from './GetExecutionOptionsClasses';
import { useState } from 'react';
import { getTextContentFromHtml } from '@/app/utils/textUtils';
import { StatusMessage } from './StatusMessage';

interface ProposalCardProps {
  proposal: CompleteProposalType;
  onClick: () => void;
  address?: `0x${string}`;
  viewMode: 'grid' | 'list';
}

export function ProposalCard({
  proposal,
  onClick,
  viewMode,
}: ProposalCardProps) {
  const [dynamicTimestamp] = useState(Date.now() / 1000);
  const isProposalLive = dynamicTimestamp < Number(proposal.endTimestamp);

  // Extract plain text from HTML body content
  const plainTextBody = getTextContentFromHtml(proposal.body);

  // Helper function for status styles
  function getStatusStyles(status: string) {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-neonGreen';
      case 'executed':
      case 'completed':
        return 'text-[#2D7FEA]';
      case 'canceled':
        return 'text-highlightRed';
      case 'scheduled':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  }

  function formatCamelCase(str: string) {
    return str?.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  // Calculate percentage for progress bar and display
  const calculatePercentage = () => {
    console.log('Calculating percentage for proposal:', proposal.index);
    console.log('Is proposal live?', isProposalLive);
    console.log('Proposal status:', proposal.status);
    console.log('Votes total:', Number(proposal.votesTotal));
    console.log('Votes for:', Number(proposal.votesFor));
    console.log('Quorum:', Number(proposal.quorumSnapshot));

    if (isProposalLive) {
      console.log('Returning 0% - proposal is still live');
      return 0;
    }
    if (Number(proposal.votesTotal) === 0) {
      console.log('Returning 0% - no votes cast');
      return 0;
    }

    const calculatedPercentage =
      (Number(proposal.votesTotal) / Number(proposal.quorumSnapshot)) * 100;
    console.log('Calculated percentage:', calculatedPercentage);
    return calculatedPercentage;
  };

  const percentage = calculatePercentage();
  console.log('Final percentage:', percentage);

  return (
    <div onClick={onClick} className="group block w-full cursor-pointer">
      <div
        className={`rounded-2xl border border-seaBlue-800/30 bg-[#020B2D] transition-all duration-300 hover:shadow-glow-tropicalBlue-moderate ${
          viewMode === 'grid' ? 'h-full p-6' : 'p-4'
        }`}
      >
        {viewMode === 'grid' ? (
          // Grid View Layout
          <div className="flex h-full flex-col">
            {/* Header with dates */}
            <div className="mb-6 flex justify-between text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-sm">Posted:</span>
                <span className="text-xs">
                  {new Date(
                    proposal.proposalStartDate.replace(' GMT', '')
                  ).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Ends:</span>
                <span className="text-xs">
                  {new Date(
                    proposal.proposalEndDate.replace(' GMT', '')
                  ).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Title and content */}
            <div className="flex-grow">
              <h2 className="mb-4 line-clamp-2 text-lg font-semibold text-white transition-colors duration-300 group-hover:text-[#2D7FEA]">
                <span className="truncate text-seaBlue-600">
                  RF-{proposal.index}: {proposal.title}
                </span>
              </h2>
              <p className="mb-6 line-clamp-3 text-sm text-gray-400">
                {plainTextBody}
              </p>
            </div>

            {/* Status and execution type */}
            <div className="mb-6 flex w-full items-center justify-between">
              <div
                className={`rounded-full py-1 pr-4 text-xs ${getStatusStyles(proposal.status)}`}
              >
                <StatusMessage
                  status={
                    proposal.status.toLowerCase() == 'canceled' &&
                    proposal.proposalInvalid
                      ? 'Invalid'
                      : proposal.status.toLowerCase() == 'canceled' &&
                          proposal.proposalRejected
                        ? 'Rejected'
                        : proposal.status
                  }
                />
              </div>
              <div
                className={`rounded-full px-4 py-1 text-xs ${getExecutionOptionsClasses(proposal.executionOption)}`}
              >
                {formatCamelCase(proposal.executionOption)}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-400/30">
                {!isProposalLive && (
                  <div
                    className="absolute h-full bg-[#2D7FEA] transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                )}
              </div>
              {/* Vote counts */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <>
                  {proposal.status === 'active' &&
                  dynamicTimestamp < proposal.endTimestamp ? (
                    <span className="text-gray-400">
                      HIDDEN{' '}
                      {/* <InfoToolTip>
                      <p>
                        Whether the proposal has reached the required number of
                        votes. This status will be revealed after the proposal
                        end date is reached.
                      </p>
                    </InfoToolTip> */}
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span>
                          {Number(proposal.votesTotal).toLocaleString()} /{' '}
                          {Number(proposal.quorumSnapshot).toLocaleString()}
                        </span>
                        {/* <InfoToolTip position="bottom" width={300}>
                        {quadraticVoting ? (
                          <div>
                            <p>
                              Quadratic voting quorum:{' '}
                              {quorumSnapshot.toLocaleString()}
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
                            Required quorum: {quorumSnapshot.toLocaleString()}
                          </p>
                        )}
                        <div className="mt-2">
                          <p className="mb-1 text-xs text-gray-500">
                            Quorum value from proposal creation time
                          </p>
                        </div>
                      </InfoToolTip> */}
                      </div>
                    </>
                  )}
                </>
                <span>
                  {isProposalLive ? null : `${percentage.toFixed(1)}%`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          // List View Layout
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Index and Title */}
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="min-w-[60px] sm:min-w-[100px]">
                <span className="text-sm font-medium text-gray-400">
                  <span className="truncate text-seaBlue-300">
                    RF-{proposal.index}
                  </span>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-medium text-white transition-colors duration-300 group-hover:text-[#2D7FEA]">
                  {proposal.title}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-8">
              {/* Status */}
              <div
                className={`text-xs sm:text-sm ${getStatusStyles(proposal.status)} w-[100px] text-center`}
              >
                <StatusMessage status={proposal.status} />
              </div>

              {/* Type */}
              <div
                className={`w-[180px] rounded-full px-3 py-1 text-center text-xs ${getExecutionOptionsClasses(proposal.executionOption)}`}
              >
                {formatCamelCase(proposal.executionOption)}
              </div>

              {/* Progress */}
              <div className="flex min-w-[120px] items-center gap-2 sm:min-w-[150px]">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-400/30">
                  {!isProposalLive && (
                    <div
                      className="absolute h-full bg-[#2D7FEA] transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  )}
                </div>
                <span className="min-w-[50px] text-right text-xs text-gray-400">
                  {isProposalLive ? null : `${percentage.toFixed(1)}%`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
