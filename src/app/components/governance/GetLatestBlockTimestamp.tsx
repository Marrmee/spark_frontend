import { publicClient } from '@/app/config/viem';

export const getLatestBlockTimestamp = async (): Promise<bigint> => {
  const block = await publicClient.getBlock({
    blockTag: 'latest'
  });
  return block.timestamp;
};
