import { getNetworkInfo } from '@/app/utils/serverConfig';
import { 
  Address, 
  formatEther,
  Abi
} from 'viem';
import govResAbi from '@/app/abi/GovernorResearch.json';
import { publicClient } from '@/app/config/viem';

const safeBigintToString = (value: bigint, shouldFormatEther = false): string => {
  try {
    return shouldFormatEther ? formatEther(value) : value.toString();
  } catch (error) {
    console.error('Error converting bigint to string:', error);
    return '0';
  }
};

// Function to fetch Governor Research Parameters
export const getGovernanceResearchParameters = async (
) => {
  try {
    const networkInfo = await getNetworkInfo();
    const govParams = await publicClient.readContract({
      address: networkInfo?.governorResearch as Address,
      abi: govResAbi as Abi,
      functionName: 'getGovernanceParameters'
    }) as {
      proposalLifetime: bigint;
      quorum: bigint;
      voteLockTime: bigint;
      proposeLockTime: bigint;
      voteChangeTime: bigint;
      voteChangeCutOff: bigint;
      ddThreshold: bigint;
    };

    const {
      proposalLifetime,
      quorum,
      voteLockTime,
      proposeLockTime,
      voteChangeTime,
      voteChangeCutOff,
      ddThreshold
    } = govParams;
    console.log('quorum for research', safeBigintToString(quorum));
    return {
      proposalLifetime: safeBigintToString(proposalLifetime),
      quorum: safeBigintToString(quorum),
      voteLockTime: safeBigintToString(voteLockTime),
      proposeLockTime: safeBigintToString(proposeLockTime),
      voteChangeTime: safeBigintToString(voteChangeTime),
      voteChangeCutOff: safeBigintToString(voteChangeCutOff),
      ddThreshold: safeBigintToString(ddThreshold, true),
    };
  } catch (err) {
    console.error('Error getting governance research parameters:', err);
  }
};
