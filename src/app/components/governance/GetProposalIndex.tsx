import { getNetworkInfo } from '@/app/utils/serverConfig';
import { Address } from 'viem';
import govResAbi from '@/app/abi/GovernorResearch.json';
import { getCustomPublicClient } from '@/app/config/viem';

export const getProposalIndex = async (
): Promise<number> => {
  try {
    const networkInfo = await getNetworkInfo();
    const contractAddress = networkInfo?.governorResearch;
    const abi = govResAbi;
    const customPublicClient = await getCustomPublicClient();

    const data = (await customPublicClient.readContract({
      address: contractAddress as Address,
      abi,
      functionName: 'getProposalIndex',
    })) as bigint;

    return Number(data);
  } catch (err) {
    console.error('Error getting next proposal index:', err);
    const error = JSON.parse(JSON.stringify(err));
    console.log(error);
    return 0;
  }
};
