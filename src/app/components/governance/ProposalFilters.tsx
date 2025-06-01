import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faList,
  faTableCells,
  faTimes,
  faFilter,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import CustomDatePicker from '../general/CustomDatePicker';

interface ProposalFiltersProps {
  searchIndex: string;
  setSearchIndex: (value: string) => void;
  contentSearchTerm: string;
  setContentSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  sortOrder: string;
  setSortOrder: (value: string) => void;
  proposalsPerPage: number;
  setProposalsPerPage: (value: number) => void;
  startDate: Date | null;
  setStartDate: (value: Date | null) => void;
  endDate: Date | null;
  setEndDate: (value: Date | null) => void;
  onClearFilters: () => void;
  isFiltering: boolean;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshCooldown?: number | null;
}

const ViewModeDropdown = ({
  viewMode,
  setViewMode,
}: {
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-12 w-full items-center justify-between rounded-lg border border-seaBlue-800/30 bg-[#020B2D] px-4 text-sm text-white focus:border-[#2D7FEA] focus:outline-none"
      >
        <div className="flex items-center">
          <FontAwesomeIcon
            icon={viewMode === 'grid' ? faTableCells : faList}
            className="mr-2 h-4 w-4"
          />
          <span>{viewMode === 'grid' ? 'Grid' : 'List'}</span>
        </div>
        <div className="pointer-events-none flex items-center">
          <svg
            className="h-4 w-4 fill-current text-gray-400"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-seaBlue-800/30 bg-[#020B2D] shadow-lg">
          <button
            onClick={() => {
              setViewMode('grid');
              setIsOpen(false);
            }}
            className={`flex w-full items-center px-4 py-2 text-sm ${
              viewMode === 'grid'
                ? 'bg-steelBlue/20 text-steelBlue'
                : 'text-white hover:bg-seaBlue-800/30'
            }`}
          >
            <FontAwesomeIcon icon={faTableCells} className="mr-2 h-4 w-4" />
            Grid
          </button>
          <button
            onClick={() => {
              setViewMode('list');
              setIsOpen(false);
            }}
            className={`flex w-full items-center px-4 py-2 text-sm ${
              viewMode === 'list'
                ? 'bg-steelBlue/20 text-steelBlue'
                : 'text-white hover:bg-seaBlue-800/30'
            }`}
          >
            <FontAwesomeIcon icon={faList} className="mr-2 h-4 w-4" />
            List
          </button>
        </div>
      )}
    </div>
  );
};

export const ProposalFilters = ({
  searchIndex,
  setSearchIndex,
  contentSearchTerm,
  setContentSearchTerm,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  sortOrder,
  setSortOrder,
  proposalsPerPage,
  setProposalsPerPage,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onClearFilters,
  isFiltering,
  viewMode,
  setViewMode,
  onRefresh,
  isRefreshing,
  refreshCooldown,
}: ProposalFiltersProps) => {
  // Default to expanded on desktop, collapsed on mobile
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Count active filters to show in the toggle button
  const activeFilterCount = [
    searchIndex !== '',
    statusFilter !== 'all',
    typeFilter !== 'all',
    startDate !== null,
    endDate !== null,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto w-full space-y-4">
      {/* Always visible search bar and filter toggle */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search bar - always visible on all screen sizes */}
        <div className="relative flex-grow md:max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search content..."
              value={contentSearchTerm}
              onChange={(e) => setContentSearchTerm(e.target.value)}
              className="h-12 w-full appearance-none rounded-lg border border-seaBlue-800/30 bg-[#020B2D] pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-[#2D7FEA] focus:outline-none"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Filter toggle and view controls */}
        <div className="flex items-center justify-between gap-3">
          {/* Filter toggle button */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center justify-between rounded-lg border border-seaBlue-800/30 bg-[#020B2D] px-4 py-3 text-sm text-white focus:border-[#2D7FEA] focus:outline-none"
          >
            <div className="flex items-center">
              <FontAwesomeIcon icon={faFilter} className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              <span className="sm:hidden">Filters</span>
              {activeFilterCount > 0 && <span className="ml-1">({activeFilterCount})</span>}
            </div>
            <div className="pointer-events-none flex items-center">
              <svg
                className="h-4 w-4 fill-current text-gray-400"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </button>
          
          {/* View Mode */}
          <div className="w-24">
            <ViewModeDropdown viewMode={viewMode} setViewMode={setViewMode} />
          </div>
          
          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing || refreshCooldown !== null}
              className={`flex h-12 items-center justify-center rounded-lg border-[1px] border-seaBlue-800/30 bg-[#020B2D] px-3 text-sm transition-colors duration-200 focus:outline-none sm:px-4 ${
                isRefreshing || refreshCooldown !== null
                  ? 'cursor-not-allowed text-gray-500'
                  : 'text-white hover:bg-seaBlue-800/30'
              }`}
              title={refreshCooldown ? `Refresh available in ${refreshCooldown}s` : 'Refresh proposals'}
            >
              <svg
                className={`h-4 w-4 sm:mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">
                {isRefreshing
                  ? 'Refreshing...'
                  : refreshCooldown
                  ? `${refreshCooldown}s`
                  : 'Refresh'}
              </span>
            </button>
          )}
          
          {/* Clear Filters Button */}
          {(isFiltering || contentSearchTerm !== '') && (
            <button
              onClick={onClearFilters}
              className="flex h-12 items-center justify-center rounded-lg border border-seaBlue-800 bg-[#020B2D] px-3 text-sm text-white transition-colors duration-200 hover:bg-seaBlue-800/30 focus:outline-none sm:px-4"
            >
              <FontAwesomeIcon icon={faTimes} className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Filter Content */}
      <div className={`${filtersExpanded ? 'block' : 'hidden'} rounded-lg border border-seaBlue-800/30 bg-[#020B2D]/50 p-4`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search by Index */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by index..."
              value={searchIndex}
              onChange={(e) => setSearchIndex(e.target.value)}
              className="h-12 w-full appearance-none rounded-lg border border-seaBlue-800/30 bg-[#020B2D] px-4 text-sm text-white placeholder-gray-400 focus:border-[#2D7FEA] focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 w-full appearance-none rounded-lg border border-seaBlue-800/30 bg-[#020B2D] px-4 text-sm text-white focus:border-[#2D7FEA] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active_ongoing">Active (Ongoing)</option>
              <option value="active_ended">Active (Ended)</option>
              <option value="active">Active (All)</option>
              <option value="scheduled">Scheduled</option>
              <option value="executed">Executed</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
              <svg
                className="h-4 w-4 fill-current text-gray-400"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-12 w-full appearance-none rounded-lg border border-seaBlue-800/30 bg-[#020B2D] px-4 text-sm text-white focus:border-[#2D7FEA] focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="transaction">Transaction</option>
              <option value="notExecutable">Not Executable</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
              <svg
                className="h-4 w-4 fill-current text-gray-400"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Second row of filters */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Sort Order */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-12 w-full appearance-none rounded-lg border border-seaBlue-800/30 bg-[#020B2D] px-4 text-sm text-white focus:border-[#2D7FEA] focus:outline-none"
            >
              <option value="recent">Recent</option>
              <option value="chronological">Chronological</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
              <svg
                className="h-4 w-4 fill-current text-gray-400"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Items per page */}
          <div className="relative">
            <select
              value={proposalsPerPage}
              onChange={(e) => setProposalsPerPage(Number(e.target.value))}
              className="h-12 w-full appearance-none rounded-lg border border-seaBlue-800/30 bg-[#020B2D] px-4 text-sm text-white focus:border-[#2D7FEA] focus:outline-none"
            >
              <option value={4}>4 per page</option>
              <option value={8}>8 per page</option>
              <option value={12}>12 per page</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
              <svg
                className="h-4 w-4 fill-current text-gray-400"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Date range label */}
          <div className="flex items-center md:hidden">
            <span className="text-sm text-white">Date Range</span>
          </div>
        </div>

        {/* Date pickers */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2">
          <div className="relative w-full">
            <CustomDatePicker
              selected={startDate}
              onChange={setStartDate}
              placeholderText="Start Date"
            />
          </div>
          <div className="relative">
            <CustomDatePicker
              selected={endDate}
              onChange={setEndDate}
              placeholderText="End Date"
              minDate={startDate || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
