
import { publicClient } from '@/app/config/viem';
import { Abi } from 'viem';

export const getProposeLockEnd = async (
  contractAddress: `0x${string}`,
  abi: Abi | readonly unknown[],
  userAddress: `0x${string}`
) => {
  try {
    if (contractAddress) {


      const proposeLockEnd = await publicClient.readContract({
        address: contractAddress,
        abi: abi,
        functionName: 'getProposeLockEnd',
        args: [userAddress],
      });

      return proposeLockEnd;
    }
  } catch (err) {
    console.error('Error getting next proposal index:', err);
    if (err instanceof Error) {
      throw new Error(err.message);
    }
    throw err;
  }
};
