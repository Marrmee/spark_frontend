'use server';

import { NextRequest, NextResponse } from 'next/server';
import { parseAbiItem, decodeEventLog, Address } from 'viem';
import { getNetworkInfo } from '@/app/utils/serverConfig';
import { getCustomPublicClient } from '@/app/config/viem';

/**
 * @deprecated This endpoint is deprecated. Proposer information is now included in the proposal object returned by getProposal.
 * It will be removed in a future release. Please update your code to use the proposer field from the proposal object.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const index = searchParams.get('index');

    if (!index) {
      return NextResponse.json(
        { error: 'Index parameter is required' },
        { status: 400 }
      );
    }

    const networkInfo = await getNetworkInfo();
    const customPublicClient = await getCustomPublicClient();

    const contractAddress = networkInfo?.governorResearch as Address;

    if (!contractAddress) {
      console.error('Governor Research contract address not configured');
      return NextResponse.json(
        { error: 'Contract address not configured for research governance' },
        { status: 500 }
      );
    }

    // Define event signature for research governance
    const eventSignature = 'event Proposed(uint256 indexed index, address indexed user, string info, uint256 startTimestamp, uint256 endTimestamp, address action, bool executable)';

    // Get proposer address from contract with retries
    let proposerAddress: Address | null = null;
    try {
      // Get the Proposed event for this proposal index
      const proposalLogs = await customPublicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem(eventSignature),
        args: {
          index: BigInt(index),
        },
        fromBlock: BigInt(0),
        toBlock: 'latest',
      });

      if (!proposalLogs || proposalLogs.length === 0) {
        throw new Error('Proposal event not found');
      }

      const proposalLog = proposalLogs[0];
      const decodedProposalLog = decodeEventLog({
        abi: [parseAbiItem(eventSignature)],
        data: proposalLog.data,
        topics: proposalLog.topics,
      });

      // Get the proposer from the event
      proposerAddress = decodedProposalLog.args.user as Address;
    } catch (contractError) {
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!proposerAddress) {
      throw new Error('Failed to get proposer address from contract');
    }

    return NextResponse.json({ proposerAddress });
  } catch (error) {
    console.error('Error fetching proposer:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch proposer';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
