'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useProposals } from '@/app/context/ProposalsContext';
import { CompleteProposalType } from '@/app/utils/interfaces';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import 'react-datepicker/dist/react-datepicker.css';
import { useRouter } from 'next/navigation';
import { ProposalCard } from '@/app/components/governance/ProposalCard';
import { ProposalFilters } from '@/app/components/governance/ProposalFilters';
import { Pagination } from '@/app/components/general/Pagination';
import { LoadingSpinner } from '@/app/components/general/LoadingSpinner';



// Add custom styles for the date picker
const datePickerStyles = `
  .react-datepicker-wrapper {
    width: 100%;
  }
  .react-datepicker__input-container {
    width: 100%;
    position: relative;
  }
  .react-datepicker__input-container input {
    width: 100%;
    height: 2.5rem;
    appearance: none;
    border-radius: 0.5rem;
    border: 1px solid #1A2B6B;
    background-color: #000B3B;
    padding: 0 2.5rem 0 1rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
  .react-datepicker__input-container input:focus {
    outline: none;
    border-color: #2D7FEA;
  }
  .react-datepicker__close-icon {
    padding-right: 1rem;
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
  }
  .react-datepicker__close-icon::after {
    background-color: #FF4444 !important;
    font-size: 14px;
    height: 16px;
    width: 16px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .react-datepicker__close-icon:hover::after {
    background-color: #FF6666 !important;
  }
  .react-datepicker {
    font-family: inherit;
    background-color: #000B3B;
    border: 1px solid #1A2B6B;
    border-radius: 0.5rem;
    color: white;
  }
  .react-datepicker__header {
    background-color: #000B3B; /* bg-seaBlue-1075 */
    border-bottom: 1px solid rgba(45, 127, 234, 0.3);
  }
  .react-datepicker__current-month,
  .react-datepicker__day-name,
  .react-datepicker-time__header {
    color: white;
  }
  .react-datepicker__day {
    color: white;
  }
  .react-datepicker__day:hover {
    background-color: rgba(45, 127, 234, 0.3);
  }
  .react-datepicker__day--selected,
  .react-datepicker__day--in-range {
    background-color: #2D7FEA;
    color: white;
  }
  .react-datepicker__day--keyboard-selected {
    background-color: rgba(45, 127, 234, 0.5);
  }
  .react-datepicker__day--disabled {
    color: rgba(255, 255, 255, 0.3);
  }
  .react-datepicker__triangle {
    display: none;
  }
  .react-datepicker-popper {
    z-index: 10;
  }
  .react-datepicker__month-select,
  .react-datepicker__year-select {
    background-color: #000B3B;
    color: white;
    border: 1px solid rgba(45, 127, 234, 0.3);
    border-radius: 0.25rem;
    padding: 0.25rem;
  }
  .react-datepicker__month-select option,
  .react-datepicker__year-select option {
    background-color: #000B3B;
    color: white;
  }
`;

export const Proposals = () => {
  const router = useRouter();
  const { state } = useWallet();
  const { getFilteredProposals, isLoading, error, refreshProposals } = useProposals();
  const networkInfo = useNetworkInfo();

  // State for filters and pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(4); // Always start with at least 4 per page
  const [searchIndex, setSearchIndex] = useState<string>('');
  const [contentSearchTerm, setContentSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('recent');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState<number | null>(null);

  // Adjust page size based on screen width
  useEffect(() => {
    const handleResize = () => {
      // Set page size on mobile devices to match dropdown options
      if (window.innerWidth < 640) {
        // Only update if user hasn't manually selected a different value
        // or if current value is the default mobile value of 2
        if (pageSize === 2 || (pageSize !== 8 && pageSize !== 12)) {
          setPageSize(4);
        }
      } else {
        // For larger screens, set to 4 if it's currently 2
        if (pageSize === 2) {
          setPageSize(4);
        }
      }
    };

    // Set initial page size
    handleResize();

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize);
  }, [pageSize]);

  // Calculate if we're currently filtering
  const isFiltering = useMemo(() => {
    return (
      statusFilter !== 'all' ||
      typeFilter !== 'all' ||
      startDate !== null ||
      endDate !== null ||
      searchIndex !== '' ||
      contentSearchTerm !== ''
    );
  }, [statusFilter, typeFilter, startDate, endDate, searchIndex, contentSearchTerm]);

  // Get filtered and paginated proposals
  const { proposals, totalPages } = getFilteredProposals(
    page,
    pageSize,
    searchIndex,
    statusFilter,
    typeFilter,
    startDate ? startDate.toISOString() : null,
    endDate ? endDate.toISOString() : null,
    contentSearchTerm
  );

  // Clear local error when proposals are successfully loaded
  useEffect(() => {
    if (proposals && proposals.length > 0) {
      setLocalError(null);
    }
  }, [proposals]);

  // Apply sorting and filter out invalid proposals (content check)
  const filteredProposals = useMemo(() => {
    if (!proposals) return null;

    const filtered = [...proposals].filter(proposal => {
      // Check if proposal has valid content
      return proposal.title && proposal.title !== 'N/A' && 
             proposal.body && proposal.body !== 'No body available' &&
             proposal.summary && proposal.summary !== 'No summary available';
    });

    // Apply sorting
    filtered.sort((a, b) =>
      sortOrder === 'recent' ? b.index - a.index : a.index - b.index
    );

    return filtered;
  }, [proposals, sortOrder]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchIndex, statusFilter, typeFilter, contentSearchTerm, startDate, endDate]);

  // Handle cooldown timer
  useEffect(() => {
    if (refreshCooldown && refreshCooldown > 0) {
      const timer = setInterval(() => {
        setRefreshCooldown(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            clearInterval(timer);
            return null;
          }
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [refreshCooldown]);

  const handleProposalClick = (proposal: CompleteProposalType) => {
    router.push(`/governance/research/proposals/${proposal.index}`);
  };

  const handleClearFilters = () => {
    setSearchIndex('');
    setContentSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setSortOrder('recent');
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setLocalError(null);
    
    try {
      const result = await refreshProposals();
      if (!result.success) {
        if (result.reason === 'cooldown' && result.timeLeft) {
          setRefreshCooldown(result.timeLeft);
          setLocalError(`Please wait ${Math.floor(result.timeLeft / 60)} minutes and ${result.timeLeft % 60} seconds before refreshing again.`);
        } else {
          setLocalError('Failed to refresh proposals. Please try again later.');
        }
      }
    } catch (err) {
      console.error('Error retrying proposal fetch:', err);
      setLocalError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsRetrying(false);
    }
  };

  // Show error message if there's a local error or context error
  const displayError = localError || error;

  // Handle refreshing proposals
  const handleRefresh = async () => {
    if (isRetrying || refreshCooldown) return;
    
    try {
      const result = await refreshProposals();
      if (!result.success) {
        if (result.reason === 'cooldown' && result.timeLeft) {
          setRefreshCooldown(result.timeLeft);
          // Start countdown timer
          const timer = setInterval(() => {
            setRefreshCooldown((prevTime) => {
              if (prevTime && prevTime <= 1) {
                clearInterval(timer);
                return null;
              }
              return prevTime ? prevTime - 1 : null;
            });
          }, 1000);
        }
      } else {
        setRefreshCooldown(null);
      }
    } catch (error) {
      console.error('Error refreshing proposals:', error);
    }
  };

  // Check if refresh is available (network info and contract address)
  const isRefreshAvailable = Boolean(networkInfo?.governorResearch);

  // Render error state with retry button
  if (displayError && !isLoading && (!proposals || proposals.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 max-w-md">
          <h3 className="text-xl font-semibold text-red-400 mb-3">Unable to Load Proposals</h3>
          <p className="text-white/80 mb-6">{displayError}</p>
          <button
            onClick={handleRetry}
            disabled={isRetrying || refreshCooldown !== null || !isRefreshAvailable}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              isRetrying || refreshCooldown !== null || !isRefreshAvailable
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-seaBlue-900 hover:bg-seaBlue-800 text-white'
            }`}
          >
            {isRetrying ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Retrying...
              </span>
            ) : refreshCooldown !== null ? (
              `Retry in ${refreshCooldown}s`
            ) : (
              'Retry'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      <style>{datePickerStyles}</style>
      <div className="flex items-center justify-between min-w-full">
        <ProposalFilters
          searchIndex={searchIndex}
          setSearchIndex={setSearchIndex}
          contentSearchTerm={contentSearchTerm}
          setContentSearchTerm={setContentSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          proposalsPerPage={pageSize}
          setProposalsPerPage={setPageSize}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          onClearFilters={handleClearFilters}
          isFiltering={isFiltering}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onRefresh={handleRefresh}
          isRefreshing={isRetrying}
          refreshCooldown={refreshCooldown}
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filteredProposals && filteredProposals.length > 0 ? (
        <>
          <div
            className={
              viewMode === 'grid'
                ? 'grid w-full grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8'
                : 'flex flex-col gap-4'
            }
          >
            {filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal.index}
                proposal={proposal}
                onClick={() => handleProposalClick(proposal)}
                address={state.address || undefined}
                viewMode={viewMode}
              />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
            {!isFiltering && totalPages > 1 && (
              <div className="w-full flex justify-center sm:justify-start">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
            {filteredProposals.length > 0 && (
              <div className="text-sm text-gray-400 text-center sm:text-right w-full pb-4">
                Showing {filteredProposals.length} of {proposals?.length || 0} proposals
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchIndex
              ? `Proposal with index ${searchIndex} does not exist.`
              : contentSearchTerm
              ? `No proposals found containing "${contentSearchTerm}"`
              : isFiltering
              ? `No ${
                  statusFilter !== 'all'
                    ? statusFilter.toLowerCase().replace(/_/g, ' ') + ' '
                    : ''
                }${
                  typeFilter !== 'all' ? typeFilter.toLowerCase() + ' ' : ''
                }proposals found`
              : 'No proposals available'}
          </p>
          {isFiltering && (
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 bg-seaBlue-900 hover:bg-seaBlue-800 text-white rounded-md transition-colors"
            >
              Clear Filters
            </button>
          )}
          {!isFiltering && proposals && proposals.length > 0 && (
            <button
              onClick={handleRefresh}
              disabled={isRetrying || refreshCooldown !== null || !isRefreshAvailable}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isRetrying || refreshCooldown !== null || !isRefreshAvailable
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-seaBlue-900 hover:bg-seaBlue-800 text-white'
              }`}
            >
              {isRetrying ? 'Refreshing...' : refreshCooldown !== null ? `Refresh in ${refreshCooldown}s` : 'Refresh Proposals'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
