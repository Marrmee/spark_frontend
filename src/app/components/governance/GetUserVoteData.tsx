import { Address, Abi } from 'viem';
import { UserVoteDataGovRes } from '@/app/utils/interfaces';
import govResAbi from '@/app/abi/GovernorResearch.json';
import { publicClient } from '@/app/config/viem';

export const getUserVoteData = async (
  index: number,
  address: Address,
  networkInfo
): Promise<UserVoteDataGovRes | undefined> => {
  if (!publicClient || !address) {
    console.error('Client and address are required but not provided.');
    return undefined;
  }

  try {
    const contractAddress = networkInfo?.governorResearch;

    if (!contractAddress) {
      throw new Error('Contract address is missing for research governance');
    }

    const abi = govResAbi;

    // Get proposal index
    const proposalIndex = (await publicClient.readContract({
      address: contractAddress as Address,
      abi: abi as Abi,
      functionName: 'getProposalIndex',
    })) as bigint;

    if (Number(index) > Number(proposalIndex)) {
      throw new Error('Proposal does not exist');
    }

    // Call getUserVoteData
    const rawVoteData = await publicClient.readContract({
      address: contractAddress as Address,
      abi: abi as Abi,
      functionName: 'getUserVoteData',
      args: [address, BigInt(index)],
    });

    if (!rawVoteData) {
      throw new Error('No vote data returned from the contract.');
    }

    const voteData = rawVoteData as {
      voted: boolean;
      initialVoteTimestamp: bigint;
      previousSupport: boolean;
      previousVoteAmount: bigint;
    };

    const researchVoteData: UserVoteDataGovRes = {
      type: 'research',
      voted: voteData.voted,
      initialVoteTimestamp: Number(voteData.initialVoteTimestamp),
      previousSupport: voteData.previousSupport,
      previousVoteAmount: voteData.previousVoteAmount
        ? Number(voteData.previousVoteAmount)
        : 0,
    };

    return researchVoteData;
  } catch (error) {
    console.error('Error fetching user vote data:', error.message || error);
    return undefined;
  }
};
