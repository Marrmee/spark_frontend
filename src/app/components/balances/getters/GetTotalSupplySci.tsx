import { 
  Address, 
  formatEther 
} from 'viem';
import sciAbi from '@/app/abi/Sci.json';
import { getNetworkInfo } from '@/app/utils/serverConfig';
import { getCustomPublicClient } from '@/app/config/viem';

export const getTotalSupplySci = async (
): Promise<string> => {
  try {
    const networkInfo = await getNetworkInfo();
    if (!networkInfo?.sci) {
      throw new Error('Missing required parameters');
    }

    const customPublicClient = await getCustomPublicClient();

    const data = await customPublicClient.readContract({
      address: networkInfo?.sci as Address,
      abi: sciAbi,
      functionName: 'totalSupply'
    }) as bigint;

    console.log(Number(data));
    return Number(formatEther(data)).toFixed(1);
  } catch (err) {
    console.error('Error getting total supply SCI:', err);
    return '0';
  }
};
