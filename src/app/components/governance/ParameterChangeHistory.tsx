import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLongArrowRight,
  faRotateRight,
  faChevronDown,
  faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import { useProposals } from '@/app/context/ProposalsContext';
import currentGovernanceParameterValue from './GetCurrentParameterValue';
import { formatEther } from 'viem';

// Define the props interface for ParameterChangeHistory
interface ParameterChangeHistoryProps {
  parameterChangeDetails: {
    param: string;
    data: string;
    gov: string;
    timestamp?: string | null;
  } | null;
  governance;
  networkInfo;
  convertTime: (seconds: string | number) => string;
  proposalStatus: string;
  proposalStartTimestamp?: string | null;
}

export default function ParameterChangeHistory({
  parameterChangeDetails,
  governance,
  networkInfo,
  convertTime,
  proposalStatus,
  proposalStartTimestamp,
}: ParameterChangeHistoryProps) {
  // Get the proposals context for parameter update events and history
  const {
    parameterUpdateEvents,
    fetchParameterUpdateEvent,
    getParameterValueAtTime,
    fetchParameterHistory,
  } = useProposals();

  // Only fetch historical value for parameter change proposals
  const isParameterChangeForResearch =
    parameterChangeDetails?.gov.toLowerCase() ===
    networkInfo?.governorResearch.toLowerCase();

  const isParameterChange =
    parameterChangeDetails?.param && parameterChangeDetails?.data;

  // Only show history for executed proposals
  const isExecuted = proposalStatus === 'executed';

  // Generate a unique key for this proposal's parameter
  const proposalKey = useMemo(() => {
    if (!parameterChangeDetails?.param) return '';
    return `${parameterChangeDetails.gov}_${parameterChangeDetails.param}`;
  }, [parameterChangeDetails]);

  // State for loading
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [isLoadingHistoricalValue, setIsLoadingHistoricalValue] =
    useState(false);
  const [historicalValue, setHistoricalValue] = useState<string | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [parameterHistory, setParameterHistory] = useState<
    Array<{
      oldValue: string | null;
      newValue: string | null;
      timestamp: string | null;
    }>
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Add a cache for historical values to prevent repeated API calls
  const historicalValueCache = useRef<Record<string, string | null>>({});

  // Fetch parameter update event when needed
  useEffect(() => {
    if (!isParameterChange || !proposalKey) return;

    let isMounted = true;

    const fetchEvent = async () => {
      if (!isMounted) return;

      setIsLoadingEvent(true);
      try {
        await fetchParameterUpdateEvent(
          proposalKey,
          parameterChangeDetails.param,
          isExecuted
        );
      } catch (error) {
        console.error('Error fetching parameter update event:', error);
      } finally {
        if (isMounted) {
          setIsLoadingEvent(false);
        }
      }
    };

    fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [
    fetchParameterUpdateEvent,
    isParameterChange,
    isExecuted,
    parameterChangeDetails,
    proposalKey,
  ]);

  // Fetch historical value at proposal creation time
  useEffect(() => {
    // Only proceed if this is a parameter change proposal AND it has been executed
    if (
      !isParameterChange ||
      !isExecuted ||
      !parameterChangeDetails?.gov ||
      !parameterChangeDetails?.param
    )
      return;

    // Use either the timestamp from parameterChangeDetails or the proposalStartTimestamp
    const timestamp =
      parameterChangeDetails?.timestamp || proposalStartTimestamp;
    if (!timestamp) {
      console.warn(
        '[ParameterChangeHistory] No timestamp available for proposal'
      );
      return;
    }

    // Check if we've already fetched this value to prevent repeated API calls
    const cacheKey = `${parameterChangeDetails.gov}_${parameterChangeDetails.param}_${timestamp}`;
    if (historicalValueCache.current[cacheKey] !== undefined) {
      // console.log(
      //   `[ParameterChangeHistory] Using cached historical value for ${cacheKey}`
      // );
      setHistoricalValue(historicalValueCache.current[cacheKey]);
      return;
    }

    // const timestampDate = new Date(Number(timestamp) * 1000);
    // console.log(
    //   `[ParameterChangeHistory] Proposal timestamp: ${timestamp}, date: ${timestampDate.toISOString()}`
    // );

    let isMounted = true;

    const fetchHistoricalValue = async () => {
      if (!isMounted) return;

      setIsLoadingHistoricalValue(true);
      try {
        // console.log(
        //   `[ParameterChangeHistory] Fetching historical value for parameter ${parameterChangeDetails.param} at timestamp: ${timestamp}, date: ${timestampDate.toISOString()}`
        // );

        // Get the value at the time the proposal was created
        const value = await getParameterValueAtTime(
          parameterChangeDetails.gov,
          parameterChangeDetails.param,
          timestamp
        );

        // console.log(
        //   `[ParameterChangeHistory] Received historical value: ${value}`
        // );

        if (isMounted) {
          setHistoricalValue(value);
          // Cache the result to prevent repeated API calls
          historicalValueCache.current[cacheKey] = value;
        }
      } catch (error) {
        console.error(
          '[ParameterChangeHistory] Error fetching historical parameter value:',
          error
        );
      } finally {
        if (isMounted) {
          setIsLoadingHistoricalValue(false);
        }
      }
    };

    fetchHistoricalValue();

    return () => {
      isMounted = false;
    };
  }, [
    getParameterValueAtTime,
    isParameterChange,
    isExecuted,
    parameterChangeDetails?.gov,
    parameterChangeDetails?.param,
    parameterChangeDetails?.timestamp,
    proposalStartTimestamp,
  ]);

  // Fetch complete parameter history when requested
  const loadFullHistory = useCallback(async () => {
    if (!parameterChangeDetails?.gov || !parameterChangeDetails?.param) return;

    setIsLoadingHistory(true);
    try {
      const history = await fetchParameterHistory(
        parameterChangeDetails.gov,
        parameterChangeDetails.param
      );

      // Sort history by timestamp (newest first for display)
      const sortedHistory = [...history].sort((a, b) => {
        return Number(b.timestamp || 0) - Number(a.timestamp || 0);
      });

      setParameterHistory(sortedHistory);
      setShowFullHistory(true);
    } catch (error) {
      console.error('Error fetching parameter history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [fetchParameterHistory, parameterChangeDetails]);

  // Get the event data for this proposal
  const eventData = useMemo(() => {
    if (!proposalKey || !parameterUpdateEvents[proposalKey]) {
      return {
        oldValue: null,
        newValue: null,
        timestamp: null,
        eventFound: false,
        isLoading: isLoadingEvent,
        error: null,
      };
    }
    return parameterUpdateEvents[proposalKey];
  }, [parameterUpdateEvents, proposalKey, isLoadingEvent]);

  // Extract event data
  const { oldValue, timestamp, isLoading, error } = eventData;

  // Format a value based on parameter type
  const formatParameterValue = useCallback(
    (value: string | null) => {
      if (!value) return 'N/A';
      // console.log('[ParameterChangeHistory line 254] value if research:', isParameterChangeForResearch, value);
      try {
        // For numerical values that represent token amounts (SCI)
        if (
          (!isParameterChangeForResearch &&
            parameterChangeDetails?.param === 'quorum') ||
          parameterChangeDetails?.param === 'opThreshold' ||
          parameterChangeDetails?.param === 'votingRightsThreshold' ||
          parameterChangeDetails?.param === 'lockedTokenMultiplierBase'
        ) {
          // Check if the value already includes "SCI"
          if (value.includes('SCI')) {
            // Extract the numerical part and format it
            const numericPart = value.replace(/[^0-9.]/g, '');
            return `${Number(numericPart).toLocaleString()} SCI`;
          }
          // Try to parse the value as a number
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            return `${numValue.toLocaleString()} SCI`;
          }

          // If we can't parse it, return as is
          return value;
        }

        if (
          isParameterChangeForResearch &&
          parameterChangeDetails?.param === 'quorum'
        ) {
          console.log('[ParameterChangeHistory] value for research quorum:', value);
          // Check if the value is a very small decimal (likely formatted with formatEther)
          return value;
        }
        // For voting streak, format as a number
        if (
          parameterChangeDetails?.param === 'maxVotingStreak' ||
          parameterChangeDetails?.param === 'maxLockedTokenMultiplier'
        ) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            return numValue.toLocaleString();
          }
          return value;
        }

        // For time values, return as is (they're already formatted by convertTime)
        return value;
      } catch (error) {
        console.error(
          '[ParameterChangeHistory] Error formatting value:',
          error
        );
        return value;
      }
    },
    [parameterChangeDetails?.param, isParameterChangeForResearch]
  );

  // Only get current value for parameter change proposals
  const currentValue = useMemo(() => {
    if (!isParameterChange) return null;
    const rawValue = currentGovernanceParameterValue(
      String(parameterChangeDetails?.param),
      governance?.govResParams
    );

    // Format the current value
    return formatParameterValue(rawValue);
  }, [
    isParameterChange,
    parameterChangeDetails,
    governance,
    formatParameterValue,
  ]);

  // Format the proposed value
  const proposedValue = useMemo(() => {
    if (!parameterChangeDetails?.data) return null;

    if (
      (!isParameterChangeForResearch &&
        parameterChangeDetails?.param === 'quorum') ||
      parameterChangeDetails?.param === 'opThreshold' ||
      parameterChangeDetails?.param === 'ddThreshold' ||
      parameterChangeDetails?.param === 'votingRightsThreshold' ||
      parameterChangeDetails?.param === 'lockedTokenMultiplierBase'
    ) {
      return `${Number(formatEther(BigInt(parameterChangeDetails?.data))).toLocaleString()} SCI`;
    } else if (
      isParameterChangeForResearch &&
      parameterChangeDetails?.param === 'quorum'
    ) {
      // For research quorum, don't use formatEther - just display the raw integer value
      try {
        // Check if the value is a very large integer (already in wei format)
        // Look for 18 or more digits
        const valueStr = parameterChangeDetails?.data.toString() || '0';
        if (/^\d{18,}$/.test(valueStr.replace(/[^\d]/g, ''))) {
          // This is likely a raw wei value that needs to be converted
          const bigIntValue = BigInt(valueStr);
          const normalValue = Number(bigIntValue / BigInt(1e18));
          // console.log('[ParameterChangeHistory] Converting proposed value from wei:', valueStr, 'to:', normalValue);
          return `${normalValue.toLocaleString()} vote(s)`;
        }
        return `${Number(parameterChangeDetails?.data).toLocaleString()} vote(s)`;
      } catch (error) {
        console.error(
          '[ParameterChangeHistory] Error formatting proposed value:',
          error
        );
        return `${Number(parameterChangeDetails?.data).toLocaleString()} vote(s)`;
      }
    } else if (
      parameterChangeDetails?.param === 'maxVotingStreak' ||
      parameterChangeDetails?.param === 'maxLockedTokenMultiplier'
    ) {
      return Number(parameterChangeDetails?.data).toLocaleString();
    } else {
      return convertTime(String(parameterChangeDetails?.data));
    }
  }, [parameterChangeDetails, convertTime, isParameterChangeForResearch]);

  // Skip rendering if not a parameter change proposal
  if (!isParameterChange) return null;

  // For non-executed proposals, only show current value and proposed value
  if (!isExecuted) {
    return (
      <div className="flex flex-col items-start text-xs sm:text-base">
        <div className="flex items-center">
          <span>Current value: {currentValue}</span>
          <FontAwesomeIcon
            icon={faLongArrowRight}
            style={{ fontSize: '0.75rem', margin: '0 8px' }}
            className="mx-2 text-gray-500 sm:mx-4 sm:text-base"
          />
          <span className="font-medium text-neonGreen">{proposedValue}</span>
        </div>
      </div>
    );
  }

  // Show loading state when fetching event data
  if (isLoading || isLoadingEvent || isLoadingHistoricalValue) {
    return (
      <div className="flex items-center">
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#2D7FEA] border-t-transparent"></span>
        <span>Loading parameter history...</span>
      </div>
    );
  }

  // Show error state if there was an error fetching the event
  if (error) {
    console.error('Error in ParameterChangeHistory:', error);
    return (
      <div className="flex flex-col items-start text-xs sm:text-base">
        <div className="flex items-center text-amber-500">
          <span>Using current value: {currentValue}</span>
          <FontAwesomeIcon
            icon={faLongArrowRight}
            style={{ fontSize: '0.75rem', margin: '0 8px' }}
            className="mx-2 text-gray-500 sm:mx-4 sm:text-base"
          />
          <span className="font-medium text-neonGreen">{proposedValue}</span>
        </div>
        <div className="mt-1 text-xs text-red-400">
          <div className="flex items-center">
            <span>
              Note: Historical value unavailable.{' '}
              {error.includes('HTTP request failed') ||
              error.includes('API request failed')
                ? 'API request failed. Please try again later.'
                : error.includes('Blockchain service')
                  ? 'Blockchain service is temporarily unavailable.'
                  : error}
            </span>
            <button
              className="ml-2 flex items-center text-blue-400 underline hover:text-blue-500"
              onClick={() => {
                setIsLoadingEvent(true);
                fetchParameterUpdateEvent(
                  proposalKey,
                  parameterChangeDetails.param,
                  isExecuted
                ).finally(() => {
                  setIsLoadingEvent(false);
                });
              }}
            >
              <span>Retry</span>
              <FontAwesomeIcon icon={faRotateRight} className="ml-1 h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If we have a historical value from the parameter history, use that
  // Otherwise, fall back to the oldValue from the event
  const displayHistoricalValue = formatParameterValue(
    historicalValue || oldValue
  );

  // Show the parameter change with historical value
  return (
    <div className="flex flex-col items-start text-xs sm:text-base">
      <div className="flex items-center">
        <span>
          {historicalValue || oldValue
            ? `Historical value: ${displayHistoricalValue}`
            : 'Historical value not available'}
        </span>
        <FontAwesomeIcon
          icon={faLongArrowRight}
          style={{ fontSize: '0.75rem', margin: '0 8px' }}
          className="mx-2 text-gray-500 sm:mx-4 sm:text-base"
        />
        <span className="font-medium text-neonGreen">{proposedValue}</span>
      </div>

      {timestamp && (
        <div className="mt-1 text-xs text-gray-400">
          Last updated: {new Date(Number(timestamp) * 1000).toLocaleString()}
        </div>
      )}

      {!showFullHistory && (
        <button
          onClick={loadFullHistory}
          disabled={isLoadingHistory}
          className="mt-2 flex items-center text-xs text-blue-400 hover:text-blue-500"
        >
          {isLoadingHistory ? (
            <>
              <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></span>
              <span>Loading history...</span>
            </>
          ) : (
            <>
              <span>View complete parameter history</span>
              <FontAwesomeIcon icon={faChevronDown} className="ml-1 h-3 w-3" />
            </>
          )}
        </button>
      )}

      {showFullHistory && parameterHistory.length > 0 && (
        <div className="mt-2 w-full">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Parameter Change History</h4>
            <button
              onClick={() => setShowFullHistory(false)}
              className="text-xs text-blue-400 hover:text-blue-500"
            >
              <FontAwesomeIcon icon={faChevronUp} className="mr-1 h-3 w-3" />
              <span>Hide</span>
            </button>
          </div>

          <div className="mt-2 max-h-60 overflow-y-auto rounded border border-gray-700 bg-gray-800 p-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-1 text-left">Date</th>
                  <th className="pb-1 text-left">From</th>
                  <th className="pb-1 text-left">To</th>
                </tr>
              </thead>
              <tbody>
                {parameterHistory.map((entry, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-700 last:border-0"
                  >
                    <td className="py-1">
                      {entry.timestamp
                        ? new Date(
                            Number(entry.timestamp) * 1000
                          ).toLocaleString()
                        : 'Unknown'}
                    </td>
                    <td className="py-1">
                      {formatParameterValue(entry.oldValue)}
                    </td>
                    <td className="py-1 font-medium">
                      {formatParameterValue(entry.newValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showFullHistory && parameterHistory.length === 0 && (
        <div className="mt-2 text-xs text-gray-400">
          No parameter change history found.
        </div>
      )}
    </div>
  );
}
