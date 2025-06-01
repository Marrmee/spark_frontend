import React from 'react';

interface StatusMessageProps {
  status: string;
}

// Status message component
export const StatusMessage: React.FC<StatusMessageProps> = ({ status }) => {
  const getStatusText = () => {
    // Convert status to lowercase for case-insensitive comparison
    const statusLower = status.toLowerCase();
    if (statusLower === 'active') return 'Active';
    if (statusLower === 'draft') return 'Draft';
    if (statusLower === 'voting') return 'Voting';
    if (statusLower === 'scheduled') return 'Scheduled';
    if (statusLower === 'executed') return 'Executed';
    if (statusLower === 'completed') return 'Completed';
    if (statusLower === 'onchain') return 'On-chain';
    if (statusLower === 'rejected') return 'Rejected';
    if (statusLower === 'invalid') return 'Invalid';
    if (statusLower === 'canceled') return 'Canceled';

    // Default case - should not happen with proper data
    console.log(`Unknown proposal status: ${status}`);
    return 'Active'; // Or perhaps a more generic default like 'Unknown'?
  };

  return (
    <div className="flex items-center justify-center text-xs sm:text-base">
      <span>{getStatusText()}</span>
    </div>
  );
}; 