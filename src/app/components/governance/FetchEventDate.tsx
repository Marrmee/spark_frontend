import { Address, parseAbiItem, decodeEventLog, Abi } from 'viem';
import { returnProposalStatus } from './ReturnProposalStatus';
import govResAbi from '@/app/abi/GovernorResearch.json';
import { getCustomPublicClient } from '@/app/config/viem';
const govResAbiViem = govResAbi as Abi;

type StatusUpdatedEvent = {
  proposalId: bigint;
  status: number;
};

export const fetchEventDate = async (
  status: string,
  index: number,
  contractAddress: Address
): Promise<string> => {
  try {
    const customPublicClient = await getCustomPublicClient();

    const abi = govResAbiViem;
    // Get all StatusUpdated events for this proposal
    const logs = await customPublicClient.getLogs({
      address: contractAddress,
      event: parseAbiItem(
        'event StatusUpdated(uint256 indexed proposalId, uint8 status)'
      ),
      args: {
        proposalId: BigInt(index),
      },
      fromBlock: BigInt(0),
    });

    if (logs.length === 0) {
      return 'Event not found';
    }

    // Sort logs by block number in descending order
    const sortedLogs = [...logs].sort(
      (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
    );

    for (const log of sortedLogs) {
      const decodedLog = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      });

      const args = decodedLog.args as unknown as StatusUpdatedEvent;
      if (!args || typeof args.status === 'undefined') continue;

      if (returnProposalStatus(args.status) === status) {
        const block = await customPublicClient.getBlock({
          blockNumber: log.blockNumber,
        });
        const result = new Date(Number(block.timestamp) * 1000).toLocaleString(
          'en-US',
          {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'GMT',
            timeZoneName: 'short',
          }
        );
        // Manually replace GMT with UTC
        return result.replace('GMT', 'UTC');
      }
    }

    console.warn(
      `No StatusUpdated event found with the status: ${status}`
    );
    return 'Event not found';
  } catch (error) {
    console.error('Error fetching event date:', error);
    return 'Error fetching date';
  }
};
