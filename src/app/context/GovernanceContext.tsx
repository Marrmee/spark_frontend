'use client';

import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import { useNetworkInfo } from './NetworkInfoContext';
import {
  GovernanceResearchParameters,
} from '@/app/utils/interfaces';
import { useTokenBalance } from '../components/hooks/UseTokenBalance';
import govResAbi from '@/app/abi/GovernorResearch.json';
import sciAbi from '@/app/abi/Sci.json';
import sciManagerAbi from '@/app/abi/SciManager.json';
import { 
  Address, 
  decodeEventLog,
  Abi
} from 'viem';
import { publicClient } from '@/app/config/viem';

const govResAbiViem = govResAbi as Abi;
const sciAbiViem = sciAbi as Abi;
const sciManagerAbiViem = sciManagerAbi as Abi;

// Interface for parameter update events
interface ParameterUpdateEvent {
  paramName: string;
  oldValue: string | null;
  timestamp: string | null;
  eventFound: boolean | null;
  isLoading: boolean;
  error: string | null;
}

// Parameter update events map for caching events by proposal index
type ParameterUpdateEventsMap = {
  [proposalIndex: string]: ParameterUpdateEvent;
};

type GovernanceContextType = {
  indexGovRes: number;
  isLoadingProposalIndices: boolean;
  totalLocked: number;
  isLoadingTotalLocked: boolean;
  totalSupplySci: number;
  isLoadingTotalSupplySci: boolean;
  govResParams: GovernanceResearchParameters | undefined;
  isEmergency: boolean;
  isLoadingParams: boolean;
  parameterUpdateEvents: ParameterUpdateEventsMap;
  fetchParameterUpdateEvent: (proposalIndex: string, paramName: string, isExecuted: boolean) => Promise<ParameterUpdateEvent>;
  fetchOffchainProposalCount: () => Promise<void>;
  offchainProposalCount: number;
  isLoadingOffchainCount: boolean;
};

const GovernanceContext = createContext<GovernanceContextType | undefined>(undefined);

type ProposalIndexProviderProps = {
  children: React.ReactNode;
};

export const GovernanceProvider: React.FC<ProposalIndexProviderProps> = ({
  children,
}) => {
  const [indexGovRes, setIndexGovRes] = useState(0);
  const [isLoadingProposalIndices, setIsLoadingProposalIndices] =
    useState<boolean>(false);
  const [totalLocked, setTotalLocked] = useState(0);
  const [isLoadingTotalLocked, setIsLoadingTotalLocked] =
    useState<boolean>(false);
  const [totalSupplySci, setTotalSupplySci] = useState(0);
  const [isLoadingTotalSupplySci, setIsLoadingTotalSupplySci] =
    useState<boolean>(false);
  const [govResParams, setGovResParams] =
    useState<GovernanceResearchParameters>();
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [isLoadingParams, setIsLoadingParams] = useState<boolean>(false);
  const [parameterUpdateEvents, setParameterUpdateEvents] = useState<ParameterUpdateEventsMap>({});
  const [offchainProposalCount, setOffchainProposalCount] = useState(0);
  const [isLoadingOffchainCount, setIsLoadingOffchainCount] = useState<boolean>(false);

  const networkInfo = useNetworkInfo();
  const hedgeyAddress = '0x2CDE9919e81b20B4B33DD562a48a84b54C48F00C' as Address;
  const liquidityPool = '0x0962a51e121aa8371Cd4bb0458B7e5A08c1cbd29' as Address;


  const balanceTreasury = useTokenBalance(
    18,
    3,
    networkInfo?.admin as Address,
    networkInfo?.sci as Address,
    sciAbiViem
  );

  const balanceHedgey = useTokenBalance(
    18,
    3,
    hedgeyAddress,
    networkInfo?.sci as Address,
    sciAbiViem
  );
  const balanceLiquidityPool = useTokenBalance(
    18,
    3,
    liquidityPool,
    networkInfo?.sci as Address,
    sciAbiViem
  );

  // Use a ref to prevent multiple fetches
  const fetchingTotalLockedRef = useRef<boolean>(false);

  useEffect(() => {
    const fetchIsEmergency = async () => {
      if (networkInfo?.sciManager) {
        try {
          const data = await publicClient.readContract({
            address: networkInfo.sciManager as Address,
            abi: sciManagerAbiViem,
            functionName: 'emergency'
          });
          setIsEmergency(Boolean(data));
        } catch (error) {
          console.error('Error fetching emergency status:', error);
        }
      }
    };

    fetchIsEmergency();
  }, [networkInfo?.sciManager]);
  
  const fetchProposalIndices = useCallback(async () => {
    try {
      setIsLoadingProposalIndices(true);
      
      // Use API call instead of direct blockchain calls
      const response = await fetch('/api/proposal-indices');
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update indices if they're different from current values
        setIndexGovRes((prevIndex) =>
          data.indices.governorResearch !== prevIndex
            ? data.indices.governorResearch
            : prevIndex
        );
      } else {
        throw new Error(data.error || 'API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Error fetching proposal indices:', error);
      // Only reset indices to 0 if we couldn't get new values
      if (indexGovRes === 0) {
        setIndexGovRes(0);
      }
    } finally {
      setIsLoadingProposalIndices(false);
    }
  }, [indexGovRes]);

  useEffect(() => {
    fetchProposalIndices();
  }, [networkInfo, fetchProposalIndices]);

  // Update the fetchTotalLocked function
  const fetchTotalLocked = useCallback(async () => {
    // Use a ref to prevent multiple fetches
    if (fetchingTotalLockedRef.current) return;
    fetchingTotalLockedRef.current = true;
    
    try {
      setIsLoadingTotalLocked(true);
      
      // Use API call instead of direct blockchain call
      const response = await fetch('/api/total-locked');
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTotalLocked(data.totalLocked);
      } else {
        throw new Error(data.error || 'API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Error fetching total locked:', error);
    } finally {
      setIsLoadingTotalLocked(false);
      fetchingTotalLockedRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchTotalLocked();
  }, [networkInfo, fetchTotalLocked]);

  useEffect(() => {
    if (networkInfo) {
      const fetchGovernanceParameters = async () => {
        try {
          setIsLoadingParams(true);
          
          // Use API endpoint instead of direct blockchain calls
          const response = await fetch('/api/governance-parameters?type=research');
          
          if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            const fetchedGovResParams = data.parameters.research;
            setGovResParams(fetchedGovResParams);
          } else {
            throw new Error(data.error || 'API returned unsuccessful response');
          }
        } catch (err) {
          console.error('Error fetching governance parameters:', err);
        } finally {
          setIsLoadingParams(false);
        }
      };
      fetchGovernanceParameters();
    }
  }, [networkInfo]);

  // Update the fetchTotalSupplySci function to use the API
  useEffect(() => {
    const fetchTotalSupplySci = async () => {
      if (
        networkInfo &&
        balanceTreasury &&
        balanceHedgey &&
        balanceLiquidityPool
      ) {
        try {
          setIsLoadingTotalSupplySci(true);
          
          // Call the API endpoint instead of the direct function
          const response = await fetch('/api/total-supply-sci');
          
          if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            // Calculate the circulating supply by subtracting non-circulating balances
            const totalSupply =
              Number(data.totalSupplySci) -
              Number(balanceTreasury) -
              Number(balanceHedgey) -
              Number(balanceLiquidityPool);
            
            console.log('Fetched Total Supply (SCI):', data.totalSupplySci);
            console.log('Admin Balance:', balanceTreasury);
            console.log('Hedgey Balance:', balanceHedgey);
            console.log('Calculated Total Supply:', totalSupply);
            
            setTotalSupplySci(Number(totalSupply));
          } else {
            throw new Error(data.error || 'API returned unsuccessful response');
          }
        } catch (err) {
          console.error('Error fetching total supply SCI:', err);
        } finally {
          setIsLoadingTotalSupplySci(false);
        }
      }
    };
    fetchTotalSupplySci();
  }, [networkInfo, balanceTreasury, balanceHedgey, balanceLiquidityPool]);

  useEffect(() => {
    if (!networkInfo) return;

    const watchGovResProposals = publicClient.watchContractEvent({
      address: networkInfo.governorResearch as Address,
      abi: govResAbiViem,
      eventName: 'ProposalCreated',
      onLogs: async (logs) => {
        for (const log of logs) {
          const decodedLog = decodeEventLog({
            abi: govResAbiViem,
            data: log.data,
            topics: log.topics
          });

          const args = decodedLog.args;
          if (!args) continue;

          await fetchProposalIndices();
        }
      }
    });

    return () => {
      watchGovResProposals();
    };
  }, [networkInfo, fetchProposalIndices]);


  const fetchParameterUpdateEvent = async (proposalIndex: string, paramName: string, isExecuted: boolean): Promise<ParameterUpdateEvent> => {
    // Check if we already have this event cached
    if (parameterUpdateEvents[proposalIndex] && parameterUpdateEvents[proposalIndex].paramName === paramName) {
      return parameterUpdateEvents[proposalIndex];
    }

    // Create initial event state
    const initialEvent: ParameterUpdateEvent = {
      paramName,
      oldValue: null,
      timestamp: null,
      eventFound: null,
      isLoading: true,
      error: null
    };

    // Update state with loading status
    setParameterUpdateEvents(prev => ({
      ...prev,
      [proposalIndex]: initialEvent
    }));

    // If not executed, return with just the initial state
    if (!isExecuted) {
      const notExecutedEvent: ParameterUpdateEvent = {
        ...initialEvent,
        isLoading: false,
        eventFound: false
      };
      
      setParameterUpdateEvents(prev => ({
        ...prev,
        [proposalIndex]: notExecutedEvent
      }));
      
      return notExecutedEvent;
    }

    // Check if networkInfo is available
    if (!networkInfo) {
      const noNetworkEvent: ParameterUpdateEvent = {
        ...initialEvent,
        isLoading: false,
        eventFound: false,
        error: 'Network info not available'
      };
      
      setParameterUpdateEvents(prev => ({
        ...prev,
        [proposalIndex]: noNetworkEvent
      }));
      
      return noNetworkEvent;
    }

    // Check if governorResearch address is available
    if (!networkInfo.governorResearch) {
      const noGovResEvent: ParameterUpdateEvent = {
        ...initialEvent,
        isLoading: false,
        eventFound: false,
        error: 'Governor research address not available'
      };
      
      setParameterUpdateEvents(prev => ({
        ...prev,
        [proposalIndex]: noGovResEvent
      }));
      
      return noGovResEvent;
    }

    try {
      // Extract the governor address from the proposalIndex if it's in the format "governorAddress_paramName"
      // This is needed because the proposalKey in ParameterChangeHistory is created as `${parameterChangeDetails.gov}_${parameterChangeDetails.param}`
      let governorResearchAddress = networkInfo.governorResearch;
      
      // If proposalIndex contains an underscore and starts with 0x, it might be in the format "governorAddress_paramName"
      if (proposalIndex.includes('_') && proposalIndex.startsWith('0x')) {
        const [extractedAddress] = proposalIndex.split('_');
        // Validate that it's a valid address
        if (extractedAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          governorResearchAddress = extractedAddress as `0x${string}`;
          console.log(`[fetchParameterUpdateEvent] Extracted governor address from proposalIndex: ${governorResearchAddress}`);
        }
      }
      
      console.log(`[fetchParameterUpdateEvent] Fetching parameter update event from API for:`, {
        paramName,
        governorResearchAddress
      });
      
      // Use the API route instead of direct blockchain calls
      const apiUrl = `/api/parameter-updated-event?paramName=${encodeURIComponent(paramName)}&governorResearchAddress=${encodeURIComponent(governorResearchAddress)}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Create the event data
      const eventData: ParameterUpdateEvent = {
        paramName,
        oldValue: data.historicalValue,
        timestamp: data.timestamp,
        eventFound: data.eventFound,
        isLoading: false,
        error: null
      };
      
      // Update state with the event data
      setParameterUpdateEvents(prev => ({
        ...prev,
        [proposalIndex]: eventData
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
        [proposalIndex]: errorEvent
      }));
      
      return errorEvent;
    }
  };

  // Add fetch function for off-chain proposal count
  const fetchOffchainProposalCount = useCallback(async () => {
    setIsLoadingOffchainCount(true);
    try {
      // Assume endpoint '/api/off-chain-proposals/count' exists
      const response = await fetch('/api/off-chain-proposals/count');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setOffchainProposalCount(data.count); // Assuming the API returns { success: true, count: number }
      } else {
        throw new Error(data.error || 'Failed to fetch off-chain proposal count');
      }
    } catch (error) {
      console.error('Error fetching off-chain proposal count:', error);
      setOffchainProposalCount(0); // Reset on error
    } finally {
      setIsLoadingOffchainCount(false);
    }
  }, []);

  useEffect(() => {
    fetchOffchainProposalCount();
  }, [fetchOffchainProposalCount]);

  return (
    <GovernanceContext.Provider
      value={{
        indexGovRes,
        isLoadingProposalIndices,
        totalLocked,
        isLoadingTotalLocked,
        totalSupplySci,
        isLoadingTotalSupplySci,
        govResParams,
        isEmergency,
        isLoadingParams,
        parameterUpdateEvents,
        fetchParameterUpdateEvent,
        fetchOffchainProposalCount,
        offchainProposalCount,
        isLoadingOffchainCount,
      }}
    >
      {children}
    </GovernanceContext.Provider>
  );
};

export const useGovernance = (): GovernanceContextType => {
  const context = useContext(GovernanceContext);
  if (context === undefined) {
    throw new Error('useGovernance must be used within a GovernanceProvider');
  }
  return context;
};
