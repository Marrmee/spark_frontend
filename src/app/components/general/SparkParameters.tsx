'use client';

import { useGovernance } from '@/app/context/GovernanceContext';
import InfoToolTip from '@/app/components/general/InfoToolTip';
import { useState, useEffect } from 'react';

function ParameterCard({
  label,
  value,
  description,
}: {
  label: string;
  value: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-seaBlue-1025 bg-seaBlue-1075 p-2 sm:p-4">
      <div className="flex items-center gap-2">
        <p className="mb-1 text-xs text-gray-400 sm:text-sm">{label}</p>
        <div className="mb-2 flex items-center">
          <InfoToolTip>
            <p>{description}</p>
          </InfoToolTip>
        </div>
      </div>
      <div className="text-sm font-medium sm:text-base">{value}</div>
    </div>
  );
}

function formatTime(seconds: string, isSmallScreen: boolean): string {
  if (!seconds) return '0 seconds';
  const sec = parseInt(seconds, 10);
  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;
  const ONE_WEEK = 604800;

  if (sec < 60) {
    return `${Math.floor(sec)} ${isSmallScreen ? 'sec.' : 'second(s)'}`;
  } else if (sec < ONE_HOUR) {
    const minutes = Math.floor(sec / 60);
    const minuteLabel = isSmallScreen ? 'min.' : 'minute(s)';
    return `${minutes} ${minuteLabel}`;
  } else if (sec < ONE_DAY) {
    const hours = Math.floor(sec / ONE_HOUR);
    const hourLabel = isSmallScreen ? 'h.' : 'hour(s)';
    return `${hours} ${hourLabel}`;
  } else if (sec < ONE_WEEK) {
    // Less than a week - use hours for precision as requested
    const hours = Math.floor(sec / ONE_HOUR);
    const hourLabel = isSmallScreen ? 'h.' : 'hour(s)';
    return `${hours} ${hourLabel}`;
  } else {
    // A week or more - use days
    const days = Math.floor(sec / ONE_DAY);
    const dayLabel = isSmallScreen ? 'd.' : 'day(s)';
    return `${days} ${dayLabel}`;
  }
}

export default function GovernanceParameters() {
  const governance = useGovernance();
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 450);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-seaBlue-1100 px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ParameterCard
            label="PROPOSAL LIFETIME"
            value={formatTime(
              governance.govResParams?.proposalLifetime || '0',
              isSmallScreen
            )}
            description="Duration a proposal remains active for voting. Must be between 1 day and 30 days, and cannot exceed the vote lock time."
          />
          <ParameterCard
            label="QUORUM"
            value={`${Number(governance.govResParams?.quorum).toLocaleString()} vote(s)`}
            description="Minimum number of votes required for proposal validation. Must be at least 1 for Research governance."
          />
          <ParameterCard
            label="VOTE LOCK TIME"
            value={formatTime(
              governance.govResParams?.voteLockTime || '0',
              isSmallScreen
            )}
            description="Time tokens remain locked after voting. Must be between 1 day and 60 days, and cannot be shorter than the proposal lifetime."
          />
          <ParameterCard
            label="PROPOSAL LOCK TIME"
            value={formatTime(
              governance.govResParams?.proposeLockTime || '0',
              isSmallScreen
            )}
            description="Duration tokens remain locked after creating a proposal, and waiting period before proposing again. Must be between 1 day and 30 days."
          />
          <ParameterCard
            label="VOTE CHANGE TIME"
            value={formatTime(
              governance.govResParams?.voteChangeTime || '0',
              isSmallScreen
            )}
            description="Time window to change a vote after casting it. Must be between 1 hour and the proposal lifetime."
          />
          <ParameterCard
            label="VOTE CHANGE CUT-OFF"
            value={formatTime(
              governance.govResParams?.voteChangeCutOff || '0',
              isSmallScreen
            )}
            description="Time before proposal ends when vote changes are no longer allowed. Must be between 1 hour and the proposal lifetime."
          />
          <ParameterCard
            label="DUE DILIGENCE THRESHOLD"
            value={`${Number(governance.govResParams?.ddThreshold).toLocaleString()} SCI`}
            description="The minimum number of tokens (must be at least 10 SCI at all times) required to qualify for the Due Diligence role in Research Funding governance."
          />
        </div>
      </div>
    </div>
  );
}
