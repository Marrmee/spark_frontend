import {
  Address,
  Abi,
  parseAbiItem,
  decodeEventLog
} from 'viem';
import { fetchProposalDetails } from './FetchProposalDetails';
import { returnProposalStatus } from '@/app/components/governance/';
import checkEligibilityToScheduleOrCancel from './CheckEligibilityToScheduleOrCancel';
import { getLatestBlockTimestamp } from '@/app/components/governance/GetLatestBlockTimestamp';
import govResAbi from '@/app/abi/GovernorResearch.json';
import { fetchEventDate } from './FetchEventDate';
import { fetchLatestTxHash } from './FetchLatestTxHash';
import { getNetworkInfo } from '@/app/utils/serverConfig';
import { CompleteProposalType } from '@/app/utils/interfaces';
import { getCustomPublicClient } from '@/app/config/viem';
const govResAbiViem = govResAbi as Abi;

// Helper function to convert string to bytes32
// function stringToBytes32(str: string): `0x${string}` {
//   const strBytes = new TextEncoder().encode(str);
//   const bytes32 = new Uint8Array(32);
//   bytes32.set(strBytes);
//   const hex = Array.from(bytes32)
//     .map((b) => b.toString(16).padStart(2, '0'))
//     .join('');
//   return `0x${hex}` as `0x${string}`;
// }

export const getProposal = async (
  index: number
): Promise<CompleteProposalType> => {
  console.log('getProposal called with:', {
    index,
    indexType: typeof index,
  });

  // Ensure index is a number
  const proposalIndex = Number(index);
  if (isNaN(proposalIndex)) {
    console.error('Invalid index provided to getProposal:', index);
    throw new Error(`Invalid proposal index: ${index}`);
  }

  console.log('Using normalized proposalIndex:', proposalIndex);

  const networkInfo = await getNetworkInfo();
  const customPublicClient = await getCustomPublicClient();

  const contractAddress = networkInfo?.governorResearch as Address;
  const abi = govResAbiViem;

  // Define event signatures for Proposed event
  const resProposedEventSignature = 'event Proposed(uint256 indexed index, address indexed user, string info, uint256 startTimestamp, uint256 endTimestamp, address action, bool executable)';
  const eventSignatureForProposer = resProposedEventSignature;

  // Concurrently fetch initial data
  const [
    proposalIndexExistsBigInt,
    latestBlockTimestampNumber,
    proposerLogs,
  ] = await Promise.all([
    customPublicClient.readContract({
      address: contractAddress,
      abi,
      functionName: 'getProposalIndex',
    }) as Promise<bigint>,
    getLatestBlockTimestamp().then(Number), // Convert to number directly
    customPublicClient.getLogs({
      address: contractAddress,
      event: parseAbiItem(eventSignatureForProposer),
      args: {
        index: BigInt(proposalIndex),
      },
      fromBlock: BigInt(0), // Consider optimizing fromBlock if contract deployment block is known
      toBlock: 'latest',
    }),
  ]);

  // Process proposer logs
  let proposerAddress = '';
  if (proposerLogs && proposerLogs.length > 0) {
    try {
      const decodedProposalLog = decodeEventLog({
        abi: [parseAbiItem(eventSignatureForProposer)],
        data: proposerLogs[0].data,
        topics: proposerLogs[0].topics,
      });
      proposerAddress = decodedProposalLog.args.user as string;
    } catch (error) {
      console.error('Error decoding proposer event log:', error);
      // Continue with empty proposer address if there's an error
    }
  }

  // Check if the proposal index exists
  const latestAvailableIndex = Math.max(0, Number(proposalIndexExistsBigInt) - 1);
  if (proposalIndex > latestAvailableIndex) {
    throw new Error(
      `Proposal index ${proposalIndex} does not exist. Latest proposal index is ${latestAvailableIndex}`
    );
  }

  // Fetch core proposal information
  const proposalInfo = (await customPublicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'getProposal',
    args: [BigInt(proposalIndex)],
  })) as {
    info: string;
    startTimestamp: bigint;
    endTimestamp: bigint;
    status: number;
    action: string;
    votesFor: bigint;
    votesAgainst: bigint;
    votesTotal: bigint;
    quorumSnapshot: bigint;
    executable: boolean;
    quadraticVoting: boolean;
  };

  if (!proposalInfo) {
    throw new Error(`Failed to fetch proposal ${proposalIndex}`);
  }

  const ipfsGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL;
  const ipfsLink = `${ipfsGateway}${proposalInfo.info}`;
  const proposalDetails = await fetchProposalDetails(ipfsLink);

  // Determine proposal status for conditional fetching
  const currentStatusString = returnProposalStatus(proposalInfo.status);

  // Concurrently fetch execution hash and event date
  const [executionTxHash, eventDate] = await Promise.all([
    currentStatusString === 'executed' // status 2 maps to 'executed'
      ? fetchLatestTxHash(proposalIndex)
      : Promise.resolve(''), // Resolve with empty string if not executed
    fetchEventDate(
      currentStatusString,
      proposalIndex,
      contractAddress
    ),
  ]);

  let schedulable = false,
    cancelable = false,
    proposalInvalid = false,
    proposalRejected = false;

  try {
    console.log(
      `quorum for eligibility check is ${proposalInfo.quorumSnapshot}`
    );
    // latestBlockTimestampNumber is already fetched and available
    const endTimestamp = Number(proposalInfo.endTimestamp);
    // currentStatusString is already determined

    const votesTotal = Number(proposalInfo.votesTotal);
    const votesFor = Number(proposalInfo.votesFor);

    const eligibility = checkEligibilityToScheduleOrCancel(
      latestBlockTimestampNumber,
      endTimestamp,
      currentStatusString,
      votesTotal,
      votesFor,
      Number(proposalInfo.quorumSnapshot)
    );
    console.log('Invalid?', eligibility.proposalInvalid);
    console.log('Rejected?', eligibility.proposalRejected);

    ({ schedulable, cancelable, proposalInvalid, proposalRejected } =
      eligibility);
  } catch (error) {
    console.error('Error checking eligibility for proposal:', error);
    proposalInvalid = true; // Default to invalid on error
  }

  console.log('quorum for research', proposalInfo.quorumSnapshot);

  const convertTimestampToDate = (
    timestamp: number,
    includeTime: boolean = false
  ): string => {
    const date = new Date(timestamp * 1000);
    let result;
    if (includeTime) {
      result = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'GMT',
        timeZoneName: 'short',
      });
    } else {
      result = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'GMT',
        timeZoneName: 'short',
      });
    }
    return result;
  };
  console.log('Date', convertTimestampToDate(Number(proposalInfo.startTimestamp)));

  const result: CompleteProposalType = {
    index: proposalIndex,
    info: String(ipfsLink),
    title: String(proposalDetails?.title || 'N/A'),
    body: String(proposalDetails?.body || 'No body available'),
    summary: String(proposalDetails?.summary || 'No summary available'),
    executionOption: String(proposalDetails?.executionOption),
    startTimestamp: Number(proposalInfo.startTimestamp),
    endTimestamp: Number(proposalInfo.endTimestamp),
    status: currentStatusString, // Use the already determined status string
    action: proposalInfo.action,
    votesFor: String(proposalInfo.votesFor),
    votesAgainst: String(proposalInfo.votesAgainst),
    votesTotal: String(proposalInfo.votesTotal),
    quorumSnapshot: String(proposalInfo.quorumSnapshot),
    executable: Boolean(proposalInfo.executable),
    quadraticVoting: Boolean(proposalInfo.quadraticVoting),
    proposalStartDate: convertTimestampToDate(
      Number(proposalInfo.startTimestamp)
    ),
    proposalEndDate: convertTimestampToDate(Number(proposalInfo.endTimestamp)),
    startDateWithTime: convertTimestampToDate(
      Number(proposalInfo.startTimestamp),
      true
    ),
    endDateWithTime: convertTimestampToDate(
      Number(proposalInfo.endTimestamp),
      true
    ),
    executionTxHash, // Assign from concurrently fetched value
    schedulable,
    cancelable,
    proposalInvalid,
    proposalRejected,
    eventDate, // Assign from concurrently fetched value
    proposer: proposerAddress, // Assign from concurrently fetched value
  };

  // Add detailed logging before return
  console.log(`GetProposal index: ${proposalIndex} return value:`, {
    quorumSnapshot: String(proposalInfo.quorumSnapshot),
    quadraticVoting: proposalInfo.quadraticVoting,
    resultIndex: result.index,
    proposer: result.proposer,
  });

  return result;
};
