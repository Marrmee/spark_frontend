import { 
  Address, 
  Abi
} from 'viem';
import { getCustomPublicClient } from '@/app/config/viem';

export const getVoteLockEnd = async (
  contractAddress: Address,
  abi: Abi,
  userAddress: Address
): Promise<bigint> => {
  try {
    if (contractAddress) {
      const customPublicClient = await getCustomPublicClient();

      const voteLockEndTime = await customPublicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'getVoteLockEnd',
        args: [userAddress]
      }) as bigint;

      console.log('Timestamp of the vote lock end:', String(voteLockEndTime));
      return voteLockEndTime;
    }
    throw new Error('Contract address is required');
  } catch (error) {
    console.error('Error getting vote lock end:', error);
    throw error;
  }
};
