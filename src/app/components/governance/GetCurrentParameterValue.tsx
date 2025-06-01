import {
  GovernanceResearchParameters,
} from '@/app/utils/interfaces';

function formatTime(seconds: string): string {
  const sec = parseInt(seconds, 10);
  const isSmallScreen = window.innerWidth < 450;
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

function formatTokens(value: string): string {
  return `${Number(value).toLocaleString()} SCI`;
}

function formatDDMembers(value: string): string {
  return `${value} vote(s)`;
}

const currentGovernanceParameterValue = (
  selectedParameter: string,
  governanceResParams: GovernanceResearchParameters | undefined
): string | null => {
  if (governanceResParams) {
    switch (selectedParameter) {
      case 'proposalLifetime':
        return formatTime(governanceResParams.proposalLifetime);
      case 'quorum':
        return formatDDMembers(governanceResParams.quorum);
      case 'voteLockTime':
        return formatTime(governanceResParams.voteLockTime);
      case 'proposeLockTime':
        return formatTime(governanceResParams.proposeLockTime);
      case 'voteChangeTime':
        return formatTime(governanceResParams.voteChangeTime);
      case 'voteChangeCutOff':
        return formatTime(governanceResParams.voteChangeCutOff);
      case 'ddThreshold':
        return formatTokens(governanceResParams.ddThreshold);
      default:
        return '0';
    }
  }
  return '0';
};

export default currentGovernanceParameterValue;