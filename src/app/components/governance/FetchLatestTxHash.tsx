import { 
  Address, 
  parseAbiItem
} from 'viem';
import { getNetworkInfo } from '@/app/utils/serverConfig';
import { getCustomPublicClient } from '@/app/config/viem';
export const fetchLatestTxHash = async (
  index: number
): Promise<string> => {
  try {
    const networkInfo = await getNetworkInfo();
    const customPublicClient = await getCustomPublicClient();

    const contractAddress = networkInfo?.governorResearch as Address;

    if (!contractAddress) {
      console.error('Governor Research contract address not found');
      return '';
    }

    // Get all StatusUpdated events for this proposal
    const logs = await customPublicClient.getLogs({
      address: contractAddress,
      event: parseAbiItem('event StatusUpdated(uint256 indexed proposalId, uint8 status)'),
      args: {
        proposalId: BigInt(index)
      },
      fromBlock: BigInt(0)
    });

    if (logs.length > 0) {
      // Sort logs by block number to find the latest event
      const sortedLogs = [...logs].sort((a, b) => 
        Number(b.blockNumber) - Number(a.blockNumber)
      );
      const latestLog = sortedLogs[0];
      console.log('Latest TxHash:', latestLog.transactionHash);
      return latestLog.transactionHash;
    }

    return '';
  } catch (error) {
    console.error(
      `Error fetching latest StatusUpdated tx hash for proposal ${index}:`,
      error
    );
    return '';
  }
};
