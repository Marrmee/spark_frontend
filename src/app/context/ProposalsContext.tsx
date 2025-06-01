'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { CompleteProposalType } from '@/app/utils/interfaces';
import { getProposal } from '@/app/components/governance/GetProposal';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getAllProposals } from '@/app/components/governance/GetAllProposals';
import { useGovernance } from './GovernanceContext';
import { useNetworkInfo } from './NetworkInfoContext';
import govResAbi from '@/app/abi/GovernorResearch.json';
import { publicClient } from '@/app/config/viem';
import { Abi, decodeEventLog } from 'viem';

const LOCAL_STORAGE_CACHE_KEY_RES_BASE = 'poscidondao_research_proposals_cache';

// Cache duration constants
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const REFRESH_COOLDOWN = 15 * 1000; // 15 seconds

// Cache entry interface
interface CacheEntry {
  timestamp: number;
  data: CompleteProposalType[];
  contractAddress?: string; // Add contract address to cache entry
}

// Parameter update event interfaces
interface ParameterUpdateEvent {
  paramName: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string | null;
  eventFound: boolean;
  isLoading: boolean;
  error: string | null;
}

// Individual parameter change entry interface
interface ParameterChangeHistoryEntry {
  paramName: string;
  governorAddress: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string | null;
  blockNumber: string | null;
}

// Parameter update events map for caching events by proposal index
interface ParameterUpdateEventsMap {
  [key: string]: ParameterUpdateEvent;
}

// Map for storing parameter history
type ParameterHistoryMap = {
  [governorAndParam: string]: ParameterChangeHistoryEntry[];
};

interface ProposalsContextType {
  researchProposals: CompleteProposalType[] | null;
  isLoading: boolean;
  error: string | null;
  refreshProposals: () => Promise<{
    success: boolean;
    reason?: string;
    timeLeft?: number;
  }>;
  getProposalByIndex: (index: number) => CompleteProposalType | undefined;
  fetchSingleProposal: (index: number, forceFresh?: boolean) => Promise<CompleteProposalType | undefined>;
  getFilteredProposals: (
    page?: number,
    pageSize?: number,
    searchIndex?: string,
    statusFilter?: string,
    typeFilter?: string,
    startDate?: string | null,
    endDate?: string | null,
    contentSearchTerm?: string | null
  ) => {
    proposals: CompleteProposalType[] | null;
    totalPages: number;
  };
  clearProposals: () => void;
  // Parameter update event functions
  parameterUpdateEvents: ParameterUpdateEventsMap;
  fetchParameterUpdateEvent: (proposalId: string, paramName: string, isExecuted: boolean) => Promise<ParameterUpdateEvent>;
  // Add parameter history functions
  parameterHistory: ParameterHistoryMap;
  fetchParameterHistory: (governorAddress: string, paramName: string) => Promise<ParameterChangeHistoryEntry[]>;
  getParameterValueAtTime: (governorAddress: string, paramName: string, timestamp: string | null) => Promise<string | null>;
}

const ProposalsContext = createContext<ProposalsContextType | undefined>(undefined);

export function ProposalsProvider({ children }: { children: ReactNode }) {
  const [researchProposals, setResearchProposals] = useState<CompleteProposalType[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parameterUpdateEvents, setParameterUpdateEvents] = useState<ParameterUpdateEventsMap>({});
  const [parameterHistory, setParameterHistory] = useState<ParameterHistoryMap>({});

  const governance = useGovernance();
  const networkInfo = useNetworkInfo();

  // Track initialization status and last refresh times
  const [initializedIndices, setInitializedIndices] = useState<{
    research: number | null;
  }>({
    research: null,
  });

  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState<{
    research: number | null;
  }>({
    research: null,
  });

  // Track if proposals need to be invalidated when contract addresses change
  const lastKnownContractAddresses = useRef<{
    governorResearch?: string;
  }>({});

  const clearProposalsAndCache = useCallback(async () => {
    console.log(`🧹 FRONTEND: Clearing Research proposals cache`);
    
    setIsLoading(true);
    setError(null);

    setResearchProposals(null);

    // Clear local storage cache
    try {
      const baseKey = LOCAL_STORAGE_CACHE_KEY_RES_BASE;
      const keys = Object.keys(localStorage).filter(key => key.startsWith(baseKey));
      
      keys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log(`🧹 FRONTEND: Cleared ${keys.length} cached entries from localStorage`);
    } catch (storageError) {
      console.warn('Failed to clear localStorage cache:', storageError);
    }

    // Attempt to invalidate server-side cache
    try {
      const response = await fetch('/api/invalidate-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'research',
        }),
      });

      if (response.ok) {
        console.log(`✅ FRONTEND: Server-side cache invalidation successful for Research proposals`);
      } else {
        console.warn(`⚠️ FRONTEND: Server-side cache invalidation failed for Research proposals`);
      }
    } catch (invalidationError) {
      console.warn('Server-side cache invalidation failed:', invalidationError);
    }

    // Reset initialization flags
    setInitializedIndices(prev => ({ ...prev, research: null }));
    
    console.log(`✅ FRONTEND: Research proposals cleared successfully`);
    
    setIsLoading(false);
  }, [setResearchProposals, setIsLoading]);

  // Load proposals from cache
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadFromCache = useCallback((): CompleteProposalType[] | null => {
    try {
      // Check if contract address has changed
      const currentContractAddress = networkInfo?.governorResearch;

      const baseKey = LOCAL_STORAGE_CACHE_KEY_RES_BASE;
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith(baseKey));
      
      if (cacheKeys.length === 0) {
        console.log(`📭 FRONTEND: No cached Research proposals found`);
        return null;
      }

      // Get the most recent cache entry
      const latestCacheKey = cacheKeys.sort().pop();
      if (!latestCacheKey) {
        console.log(`📭 FRONTEND: No valid cache key found for Research proposals`);
        return null;
      }

      const cachedData = localStorage.getItem(latestCacheKey);
      if (!cachedData) {
        console.log(`📭 FRONTEND: No cached data found for Research proposals`);
        return null;
      }

      const { timestamp, data, contractAddress }: CacheEntry = JSON.parse(cachedData);
      
      // Check if contract address has changed (invalidate cache if it has)
      if (contractAddress && contractAddress !== currentContractAddress) {
        console.log(`🔄 FRONTEND: Cache invalidated due to contract address change for Research`);
        // Clear invalid cache entries
        cacheKeys.forEach(key => localStorage.removeItem(key));
        return null;
      }

      // Check if cache is still valid (within CACHE_DURATION)
      const now = Date.now();
      if (now - timestamp > CACHE_DURATION) {
        console.log(`🕒 FRONTEND: Cache expired for Research proposals`);
        // Remove expired cache entries
        cacheKeys.forEach(key => localStorage.removeItem(key));
        return null;
      }

      console.log(`✅ FRONTEND: Loaded ${data.length} Research proposals from cache`);
      return data;
    } catch (error) {
      console.error('Error loading Research proposals from cache:', error);
      return null;
    }
  }, [networkInfo?.governorResearch]);

  // Save proposals to cache
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const saveToCache = useCallback((proposals: CompleteProposalType[]) => {
    try {
      const now = Date.now();
      const currentContractAddress = networkInfo?.governorResearch;

      const baseKey = LOCAL_STORAGE_CACHE_KEY_RES_BASE;
      const cacheKey = `${baseKey}_${now}`;
      
      const cacheEntry: CacheEntry = {
        timestamp: now,
        data: proposals,
        contractAddress: currentContractAddress,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      
      // Clean up old cache entries (keep only the latest 3)
      const cacheKeys = Object.keys(localStorage)
        .filter(key => key.startsWith(baseKey))
        .sort();
      
      if (cacheKeys.length > 3) {
        const keysToRemove = cacheKeys.slice(0, -3);
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }

      console.log(`💾 FRONTEND: Cached ${proposals.length} Research proposals`);
    } catch (error) {
      console.warn('Failed to save Research proposals to cache:', error);
    }
  }, [networkInfo?.governorResearch]);

  const getProposalByIndex = useCallback((index: number): CompleteProposalType | undefined => {
    const proposals = researchProposals;
    return proposals?.find(proposal => proposal.index === index);
  }, [researchProposals]);

  const fetchSingleProposal = useCallback(async (index: number, forceFresh: boolean = false) => {
    // Check if we already have this proposal and don't need to force fetch
    if (!forceFresh) {
      const existing = getProposalByIndex(index);
      if (existing) {
        console.log(`📋 FRONTEND: Using existing proposal ${index} from state`);
        return existing;
      }
    }

    if (!networkInfo) {
      console.warn('Network info not available for fetching single proposal');
      return undefined;
    }

    const contractAddress = networkInfo.governorResearch as `0x${string}`;

    if (!contractAddress) {
      console.warn('Contract address not available for Research');
      return undefined;
    }

    try {
      console.log(`🔄 FRONTEND: Fetching single proposal ${index} from blockchain`);
      
      const proposal = await getProposal(
        index
      );

      // Update the proposals list with this new/updated proposal
      setResearchProposals(prev => {
        if (!prev) return [proposal];

        const updateProposals = (prevProposals: CompleteProposalType[] | null) => {
          if (!prevProposals) return [proposal];
          
          const existingIndex = prevProposals.findIndex(p => p.index === proposal.index);
          if (existingIndex >= 0) {
            // Update existing proposal
            const updated = [...prevProposals];
            updated[existingIndex] = proposal;
            return updated.sort((a, b) => b.index - a.index);
          } else {
            // Add new proposal
            return [...prevProposals, proposal].sort((a, b) => b.index - a.index);
          }
        };

        return updateProposals(prev);
      });

      return proposal;
    } catch (error) {
      console.error(`Error fetching single proposal ${index}:`, error);
      return undefined;
    }
  }, [networkInfo, getProposalByIndex]);

  const getFilteredProposals = useCallback((
    page: number = 1,
    pageSize: number = 5,
    searchIndex?: string,
    statusFilter: string = 'all',
    typeFilter: string = 'all',
    startDate?: string | null,
    endDate?: string | null,
    contentSearchTerm?: string | null
  ) => {
    const allProposals = researchProposals;
    
    // Return early with clear error state if no proposals are available
    if (!allProposals) {
      console.log(`⚠️ FRONTEND: No Research proposals available for filtering`);
      return { proposals: null, totalPages: 0 };
    }

    // Create a safe copy of the proposals array to avoid mutation issues
    let filtered = [...allProposals];
    
    // Log the initial count for debugging
    console.log(`🔍 FRONTEND: Filtering ${filtered.length} Research proposals`);

    // Search by index - direct match
    if (searchIndex && searchIndex.trim() !== '') {
      const parsedIndex = parseInt(searchIndex.trim());
      if (!isNaN(parsedIndex)) {
        filtered = filtered.filter(p => p.index === parsedIndex);
        console.log(`🔍 FRONTEND: Filtered to ${filtered.length} proposals with index ${parsedIndex}`);
        return { proposals: filtered, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) };
      } else {
        console.log(`⚠️ FRONTEND: Invalid search index: ${searchIndex}`);
        return { proposals: [], totalPages: 0 };
      }
    }

    // Content search - if provided
    if (contentSearchTerm && contentSearchTerm.trim() !== '') {
      const searchTerm = contentSearchTerm.trim().toLowerCase();
      filtered = filtered.filter(p => 
        (p.title && p.title.toLowerCase().includes(searchTerm)) || 
        (p.summary && p.summary.toLowerCase().includes(searchTerm)) || 
        (p.body && p.body.toLowerCase().includes(searchTerm))
      );
      console.log(`🔍 FRONTEND: Filtered to ${filtered.length} proposals containing "${searchTerm}"`);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p?.status?.toLowerCase() === statusFilter.toLowerCase());
      console.log(`🔍 FRONTEND: Filtered to ${filtered.length} proposals with status "${statusFilter}"`);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.executionOption?.toLowerCase() === typeFilter.toLowerCase());
      console.log(`🔍 FRONTEND: Filtered to ${filtered.length} proposals with type "${typeFilter}"`);
    }

    // Date filter - start date
    if (startDate) {
      try {
        const startDateObj = new Date(startDate);
        filtered = filtered.filter(p => {
          try {
            const proposalDate = new Date(p.proposalStartDate.replace(' GMT', ''));
            return proposalDate >= startDateObj;
          } catch (e) {
            console.error(`Error comparing dates for proposal ${p.index}:`, e);
            return true; // Include by default if there's an error
          }
        });
        console.log(`🔍 FRONTEND: Filtered to ${filtered.length} proposals after ${startDateObj.toISOString()}`);
      } catch (e) {
        console.error('Error parsing start date:', e);
      }
    }
    
    // Date filter - end date
    if (endDate) {
      try {
        const endDateObj = new Date(endDate);
        filtered = filtered.filter(p => {
          try {
            const proposalDate = new Date(p.proposalStartDate.replace(' GMT', ''));
            return proposalDate <= endDateObj;
          } catch (e) {
            console.error(`Error comparing dates for proposal ${p.index}:`, e);
            return true; // Include by default if there's an error
          }
        });
        console.log(`🔍 FRONTEND: Filtered to ${filtered.length} proposals before ${endDateObj.toISOString()}`);
      } catch (e) {
        console.error('Error parsing end date:', e);
      }
    }

    // Sort in descending order for display (newest first)
    filtered.sort((a, b) => b.index - a.index);

    // Handle empty results
    if (filtered.length === 0) {
      console.log(`ℹ️ FRONTEND: No proposals match the current filters`);
      return { proposals: [], totalPages: 0 };
    }

    // Calculate pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    
    // Validate page number
    const validatedPage = Math.max(1, Math.min(page, totalPages));
    if (validatedPage !== page) {
      console.log(`⚠️ FRONTEND: Adjusted page from ${page} to ${validatedPage} (totalPages: ${totalPages})`);
    }
    
    const start = (validatedPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filtered.length);
    
    // Ensure we don't exceed array bounds
    if (start >= filtered.length) {
      console.log(`⚠️ FRONTEND: Start index ${start} exceeds filtered length ${filtered.length}, adjusting`);
      const adjustedStart = Math.max(0, filtered.length - pageSize);
      const adjustedEnd = filtered.length;
      const paginatedProposals = filtered.slice(adjustedStart, adjustedEnd);
      return { 
        proposals: paginatedProposals, 
        totalPages 
      };
    }
    
    const paginatedProposals = filtered.slice(start, end);
    console.log(`📋 FRONTEND: Returning ${paginatedProposals.length} proposals for page ${validatedPage}/${totalPages}`);

    return { proposals: paginatedProposals, totalPages };
  }, [researchProposals]);

  const refreshProposals = useCallback(async () => {
    // Check if we're already loading
    if (isLoading) {
      return { success: false, reason: 'Already loading proposals' };
    }

    // Set loading state to true at the beginning of the refresh
    setIsLoading(true);
    
    try {
      // Check if we're within the cooldown period
      const currentTime = Date.now();
      const lastRefresh = lastRefreshTimestamp.research;
      
      if (lastRefresh && (currentTime - lastRefresh) < REFRESH_COOLDOWN) {
        const timeLeftSeconds = Math.ceil((REFRESH_COOLDOWN - (currentTime - lastRefresh)) / 1000);
        const minutes = Math.floor(timeLeftSeconds / 60);
        const seconds = timeLeftSeconds % 60;
        
        const timeLeftFormatted = minutes > 0 
          ? `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}` 
          : `${seconds} second${seconds !== 1 ? 's' : ''}`;
        
        console.log(`⏳ FRONTEND: Refresh cooldown active for Research proposals. Please wait ${timeLeftFormatted}.`);
        
        // Return object with success: false to indicate refresh was not performed
        return {
          success: false,
          reason: 'cooldown',
          timeLeft: timeLeftSeconds
        };
      }
      
      console.log(`🔄 FRONTEND: Refreshing Research proposals`);
      await fetchSingleProposal(0, true);
      
      // Update the last refresh timestamp
      setLastRefreshTimestamp(prev => ({
        ...prev,
        research: Date.now()
      }));
      
      console.log(`✅ FRONTEND: Successfully refreshed Research proposals`);
      return { success: true };
    } catch (error) {
      console.error(`Error refreshing Research proposals:`, error);
      setError(`Failed to refresh proposals: ${error.message}`);
      return { success: false, reason: error.message };
    } finally {
      // Ensure loading state is set to false when done, regardless of success or failure
      setIsLoading(false);
    }
  }, [fetchSingleProposal, lastRefreshTimestamp, isLoading]);

  // Check for contract address changes and clear proposals if needed
  useEffect(() => {
    if (!networkInfo?.governorResearch) return;
    
    const prevAddresses = lastKnownContractAddresses.current;
    const currentResearchAddress = networkInfo.governorResearch;
    
    // Check if Research contract address has changed
    if ((prevAddresses.governorResearch && 
        currentResearchAddress && 
        prevAddresses.governorResearch.toLowerCase() !== currentResearchAddress.toLowerCase()) ||
        // Also clear if we have proposals but the governance index is 0
        (researchProposals && researchProposals.length > 0 && governance?.indexGovRes === 0)) {
      console.log('🔄 FRONTEND: Research Governor contract address changed or reset, clearing proposals');
      clearProposalsAndCache();
    }
    
    // Update stored addresses
    lastKnownContractAddresses.current = {
      governorResearch: currentResearchAddress
    };
    
  }, [networkInfo?.governorResearch, clearProposalsAndCache, researchProposals, governance?.indexGovRes]);

  // Initial fetch of proposals - only once per type when governance indices are available
  useEffect(() => {
    if (governance?.indexGovRes !== undefined && networkInfo?.governorResearch) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const prevIndexKey = 'res-prev-index';
      const prevIndex = initializedIndices.research;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const initKey = `res-${governance.indexGovRes}`;
      
      // If we have a previous index and it's less than the current index,
      // we only need to fetch the new proposals
      const onlyFetchNew = prevIndex !== null && prevIndex !== undefined && prevIndex < governance.indexGovRes;
      
      if (!initializedIndices.research || onlyFetchNew) {
        fetchSingleProposal(0, true);
      }
    }
  }, [governance?.indexGovRes, fetchSingleProposal, networkInfo, initializedIndices.research]);

  // Set up event listeners for proposal updates
  useEffect(() => {
    if (!networkInfo) return;

    const eventTimeouts: { [key: string]: NodeJS.Timeout } = {};
    let unwatchRes: (() => void) | undefined;

    const watchEvents = async () => {
      const governorAddress = networkInfo.governorResearch;
      
      // Skip if contract address is not available
      if (!governorAddress) {
        console.log(`⚠️ FRONTEND: Skipping event watch - Research contract address not available`);
        return () => {};
      }
      
      const abi = govResAbi;

      try {
        const unwatch = publicClient.watchContractEvent({
          address: governorAddress as `0x${string}`,
          abi: abi as Abi, // Force type to avoid deep instantiation
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onLogs: async (logs: any[]) => {
            const uniqueIndices = new Set(
              logs.map(log => {
                try {
                  const decoded = decodeEventLog({
                    abi,
                    data: log.data,
                    topics: log.topics,
                  }) as unknown as { args: { index?: bigint } };
                  return decoded.args?.index ? Number(decoded.args.index) : null;
                } catch (error) {
                  console.error('Error decoding event log:', error);
                  return null;
                }
              }).filter((index): index is number => index !== null)
            );

            // Clear any pending timeouts for these indices
            Array.from(uniqueIndices).forEach(index => {
              const timeoutKey = `res-${index}`;
              if (eventTimeouts[timeoutKey]) {
                clearTimeout(eventTimeouts[timeoutKey]);
              }
            });

            // Set a new timeout for batch updating
            const timeoutKey = `res-batch`;
            if (eventTimeouts[timeoutKey]) {
              clearTimeout(eventTimeouts[timeoutKey]);
            }

            eventTimeouts[timeoutKey] = setTimeout(async () => {
              try {
                // Batch update all affected proposals
                // REMOVED: Automatic fetching of single proposals on event
                // const updates = await Promise.all(
                //   Array.from(uniqueIndices).map(index => 
                //     fetchSingleProposal(index, false)
                //   )
                // );

                // Update state once with all changes
                // REMOVED: State update based on automatic fetches
                // if (isOperations) {
                //   setOperationsProposals(prev => {
                //     if (!prev) return updates.filter((u): u is CompleteProposalType => u !== undefined);
                //     const newProposals = [...prev];
                //     updates.forEach(update => {
                //       if (update) {
                //         const index = newProposals.findIndex(p => p.index === update.index);
                //         if (index >= 0) {
                //           newProposals[index] = update;
                //         } else {
                //           newProposals.push(update);
                //         }
                //       }
                //     });
                //     return newProposals;
                //   });
                // } else {
                //   setResearchProposals(prev => {
                //     if (!prev) return updates.filter((u): u is CompleteProposalType => u !== undefined);
                //     const newProposals = [...prev];
                //     updates.forEach(update => {
                //       if (update) {
                //         const index = newProposals.findIndex(p => p.index === update.index);
                //         if (index >= 0) {
                //           newProposals[index] = update;
                //         } else {
                //           newProposals.push(update);
                //         }
                //       }
                //     });
                //     return newProposals;
                //   });
                
                // Invalidate server cache for affected proposals
                try {
                  // New: Invalidate server cache for each affected proposal
                  await Promise.all(Array.from(uniqueIndices).map(index => 
                    fetch('/api/invalidate-cache', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        type: 'research',
                        targetIndex: index
                      }),
                    })
                  ));
                  console.log(`✅ FRONTEND: Server-side cache invalidated for ${uniqueIndices.size} proposals after blockchain event`);
                } catch (error) {
                  console.warn('Error invalidating cache after event:', error);
                }
              } catch (error) {
                console.error('Error updating proposals:', error);
              }
            }, 1000); // 1 second debounce
          },
        });

        return unwatch;
      } catch (error) {
        console.error(`Error setting up event listener for Research governor:`, error);
        return () => {};
      }
    };

    const setupWatchers = async () => {
      // Clean up any existing watchers
      if (unwatchRes) unwatchRes();
      
      // Set up new watchers
      unwatchRes = await watchEvents();
    };

    setupWatchers();

    // Clean up function
    return () => {
      Object.values(eventTimeouts).forEach(clearTimeout);
      if (unwatchRes) unwatchRes();
    };
  }, [networkInfo, fetchSingleProposal]);

  // Add the missing functions for parameter events and history
  const fetchParameterUpdateEvent = useCallback(async (proposalId: string, paramName: string, isExecuted: boolean): Promise<ParameterUpdateEvent> => {
    console.log(`[fetchParameterUpdateEvent] Starting fetch for proposalId: ${proposalId}, paramName: ${paramName}, isExecuted: ${isExecuted}`);
    
    // Check if we already have this event cached
    if (parameterUpdateEvents[proposalId] && parameterUpdateEvents[proposalId].paramName === paramName) {
      console.log(`[fetchParameterUpdateEvent] Using cached event for proposalId: ${proposalId}`);
      return parameterUpdateEvents[proposalId];
    }

    // Create initial event state
    const initialEvent: ParameterUpdateEvent = {
      paramName,
      oldValue: null,
      newValue: null,
      timestamp: null,
      eventFound: false,
      isLoading: true,
      error: null
    };

    // Update state with loading status
    setParameterUpdateEvents(prev => ({
      ...prev,
      [proposalId]: initialEvent
    }));

    // If not executed, return with just the initial state
    if (!isExecuted) {
      console.log(`[fetchParameterUpdateEvent] Proposal not executed, skipping event fetch for proposalId: ${proposalId}`);
      const notExecutedEvent: ParameterUpdateEvent = {
        ...initialEvent,
        isLoading: false,
        eventFound: false
      };
      
      setParameterUpdateEvents(prev => ({
        ...prev,
        [proposalId]: notExecutedEvent
      }));
      
      return notExecutedEvent;
    }

    // Check if networkInfo is available
    if (!networkInfo) {
      console.error(`[fetchParameterUpdateEvent] Network info not available for proposalId: ${proposalId}`);
      const noNetworkEvent: ParameterUpdateEvent = {
        ...initialEvent,
        isLoading: false,
        eventFound: false,
        error: 'Network info not available'
      };
      
      setParameterUpdateEvents(prev => ({
        ...prev,
        [proposalId]: noNetworkEvent
      }));
      
      return noNetworkEvent;
    }

    try {
      // Use the API route for parameter update events
      const apiUrl = `/api/parameter-updated-event?paramName=${encodeURIComponent(paramName)}&governorResearchAddress=${encodeURIComponent(networkInfo.governorResearch)}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Create the event data
      const eventData: ParameterUpdateEvent = {
        paramName,
        oldValue: data.historicalValue,
        newValue: null,
        timestamp: data.timestamp,
        eventFound: data.eventFound,
        isLoading: false,
        error: null
      };
      
      // Update state with the event data
      setParameterUpdateEvents(prev => ({
        ...prev,
        [proposalId]: eventData
      }));
      
      return eventData;
    } catch (error) {
      console.error(`[fetchParameterUpdateEvent] Error fetching parameter update event:`, error);
      
      const errorEvent: ParameterUpdateEvent = {
        ...initialEvent,
        isLoading: false,
        eventFound: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setParameterUpdateEvents(prev => ({
        ...prev,
        [proposalId]: errorEvent
      }));
      
      return errorEvent;
    }
  }, [parameterUpdateEvents, networkInfo]);

  const fetchParameterHistory = useCallback(async (governorAddress: string, paramName: string): Promise<ParameterChangeHistoryEntry[]> => {
    console.log(`[fetchParameterHistory] Starting fetch for governorAddress: ${governorAddress}, paramName: ${paramName}`);
    
    // Generate a cache key for this parameter
    const cacheKey = `${governorAddress}_${paramName}`;
    
    // Check if we already have this history cached in state
    if (parameterHistory[cacheKey] && parameterHistory[cacheKey].length > 0) {
      console.log(`[fetchParameterHistory] Using cached history for ${cacheKey}`);
      return parameterHistory[cacheKey];
    }
    
    try {
      // Use the API route for parameter history
      const apiUrl = `/api/parameter-history?governorAddress=${encodeURIComponent(governorAddress)}&paramName=${encodeURIComponent(paramName)}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validate the response data
      if (!Array.isArray(data)) {
        console.error('❌ FRONTEND: Invalid parameter history data format:', data);
        throw new Error('Invalid parameter history data format received from server');
      }

      // Store the history in state
      setParameterHistory(prev => ({
        ...prev,
        [cacheKey]: data
      }));

      return data;
    } catch (error) {
      console.error(`[fetchParameterHistory] Error fetching parameter history:`, error);
      return [];
    }
  }, [parameterHistory]);

  const getParameterValueAtTime = useCallback(async (governorAddress: string, paramName: string, timestamp: string | null): Promise<string | null> => {
    console.log(`[getParameterValueAtTime] Starting fetch for governorAddress: ${governorAddress}, paramName: ${paramName}, timestamp: ${timestamp}`);
    
    // If timestamp is null, use current time
    const targetTimestamp = timestamp ? Number(timestamp) : Math.floor(Date.now() / 1000);
    
    try {
      // Use the API route for parameter value at time
      const apiUrl = `/api/parameter-value-at-time?governorAddress=${encodeURIComponent(governorAddress)}&paramName=${encodeURIComponent(paramName)}&timestamp=${encodeURIComponent(targetTimestamp.toString())}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.historicalValue;
    } catch (error) {
      console.error(`[getParameterValueAtTime] Error fetching parameter value:`, error);
      return null;
    }
  }, []);

  const value = {
    researchProposals,
    isLoading,
    error,
    refreshProposals,
    getProposalByIndex,
    fetchSingleProposal,
    getFilteredProposals,
    clearProposals: clearProposalsAndCache,
    parameterUpdateEvents,
    fetchParameterUpdateEvent,
    parameterHistory,
    fetchParameterHistory,
    getParameterValueAtTime,
  };

  return (
    <ProposalsContext.Provider value={value}>
      {children}
    </ProposalsContext.Provider>
  );
}

export const useProposals = () => {
  const context = useContext(ProposalsContext);
  if (context === undefined) {
    throw new Error('useProposals must be used within a ProposalsProvider');
  }
  return context;
}