import { useState, useEffect, useCallback } from 'react';
import { 
  Address, 
  Abi, 
  decodeEventLog,
} from 'viem';
import { publicClient } from '@/app/config/viem';
import { useWallet } from '@/app/context/WalletContext';
import { getUserVoteData } from '../governance/GetUserVoteData';
import { getLatestBlockTimestamp } from '../governance/GetLatestBlockTimestamp';
import { UserVoteDataGovRes } from '@/app/utils/interfaces';
import { useGovernance } from '@/app/context/GovernanceContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { useEcosystemBalances } from './UseEcosystemBalances';

type VotedEvent = {
  id: number;
  user: Address;
  support: boolean;
  amount: bigint;
};

export default function useVoteEligibility(
  index: number,
  abi: Abi,
  contractAddress: Address,
  proposalEndTimestamp: number
) {
  const [eligibleToVote, setEligibleToVote] = useState<boolean>();
  const [timeLeftToChangeVote, setTimeLeftToChangeVote] = useState(0);
  const [userVoteData, setUserVoteData] = useState<UserVoteDataGovRes>();
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(true);
  const [votingRightsThresholdReached, setVotingRightsThresholdReached] = useState(true);
  
  const networkInfo = useNetworkInfo();
  const wallet = useWallet();
  const governance = useGovernance();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lockedSci } = useEcosystemBalances(
    wallet?.state?.address || undefined,
    '',
    '',
    networkInfo?.sciManager
  );

  const checkEligibilityToVote = useCallback(async () => {
    if (!contractAddress || !wallet?.state?.address) {
      return;
    }

    try {
      const voteData = await getUserVoteData(
        index,
        wallet.state.address as `0x${string}`,
        networkInfo
      );

      if (!voteData) {
        return null;
      }

      const latestBlockTimestamp = await getLatestBlockTimestamp();

      const voteChangeTime = governance?.govResParams?.voteChangeTime;
      const voteChangeCutOff = governance?.govResParams?.voteChangeCutOff;

      const timeLeftToChangeVote = Math.max(
        0,
        Number(voteData.initialVoteTimestamp) +
        Number(voteChangeTime) -
        Number(latestBlockTimestamp)
      );

      const eligible =
        // Condition 1: User hasn't voted and is within the vote change cutoff period
        (!voteData.voted &&
          Number(latestBlockTimestamp) >= proposalEndTimestamp - Number(voteChangeCutOff) &&
          Number(latestBlockTimestamp) <= proposalEndTimestamp) ||
        // Condition 2: User has voted and can still change their vote (if applicable)
        (voteData.voted &&
          Number(latestBlockTimestamp) <= proposalEndTimestamp - Number(voteChangeCutOff) &&
          timeLeftToChangeVote > 0) ||
        // Condition 3: User hasn't voted and current time is before the vote change cutoff
        (!voteData.voted &&
          Number(latestBlockTimestamp) < proposalEndTimestamp - Number(voteChangeCutOff));

      // Research governance doesn't have voting rights threshold, so always true
      const votingRightsThresholdReached = true;

      return {
        eligible,
        timeLeftToChangeVote,
        userVoteData: voteData,
        votingRightsThresholdReached,
      };
    } catch (err) {
      console.error('Error fetching eligibility', err);
      return null;
    }
  }, [
    contractAddress,
    index,
    proposalEndTimestamp,
    wallet?.state?.address,
    governance,
    networkInfo,
  ]);

  useEffect(() => {
    let isMounted = true;
    const fetchEligibility = async () => {
      setIsLoadingEligibility(true);
      const eligibility = await checkEligibilityToVote();
      if (eligibility && isMounted) {
        setEligibleToVote(eligibility.eligible);
        setTimeLeftToChangeVote(eligibility.timeLeftToChangeVote);
        setUserVoteData(eligibility.userVoteData);
        setVotingRightsThresholdReached(eligibility.votingRightsThresholdReached);
      }
      setIsLoadingEligibility(false);
    };

    fetchEligibility();

    return () => {
      isMounted = false;
    };
  }, [checkEligibilityToVote]);

  useEffect(() => {
    const interval = timeLeftToChangeVote > 0
      ? setInterval(
          () => setTimeLeftToChangeVote((prev) => Math.max(0, prev - 1)),
          1000
        )
      : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeLeftToChangeVote]);

  // Add the event listener for the Voted event
  useEffect(() => {
    if (!contractAddress || !wallet?.state?.address) return;

    const unwatch = publicClient.watchContractEvent({
      address: contractAddress,
      abi,
      eventName: 'Voted',
      onLogs: async (logs) => {
        for (const log of logs) {
          const decodedLog = decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics
          });

          const args = decodedLog.args as unknown as VotedEvent;
          if (!args) continue;

          if (args.user.toLowerCase() === wallet.state.address?.toLowerCase()) {
            console.log(args.id, args.user, args.support, args.amount);
            const eligibility = await checkEligibilityToVote();
            if (eligibility) {
              setEligibleToVote(eligibility.eligible);
              setTimeLeftToChangeVote(eligibility.timeLeftToChangeVote);
              setUserVoteData(eligibility.userVoteData);
            }
          }
        }
      }
    });

    return () => {
      unwatch();
    };
  }, [
    abi,
    contractAddress,
    wallet?.state?.address,
    checkEligibilityToVote
  ]);

  return {
    eligibleToVote,
    timeLeftToChangeVote,
    userVoteData,
    isLoadingEligibility,
    votingRightsThresholdReached,
  };
}