import { getCustomPublicClient } from '@/app/config/viem';
import { getNetworkInfo } from '@/app/utils/serverConfig';
import { NextResponse } from 'next/server';
import { 
  parseAbiItem, 
  Address,
  decodeEventLog
} from 'viem';

const govResAbi = [
  {
    name: 'DUE_DILIGENCE_ROLE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bytes32' }]
  },
  {
    type: 'event',
    name: 'RoleGranted',
    inputs: [
      { type: 'bytes32', name: 'role', indexed: true },
      { type: 'address', name: 'account', indexed: true },
      { type: 'address', name: 'sender', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'RoleRevoked',
    inputs: [
      { type: 'bytes32', name: 'role', indexed: true },
      { type: 'address', name: 'account', indexed: true },
      { type: 'address', name: 'sender', indexed: true }
    ]
  }
] as const;

export async function GET() {
  try {
    const networkInfo = await getNetworkInfo();
    const customPublicClient = await getCustomPublicClient();

    if (!networkInfo) {
      console.error('Network info not available');
      return NextResponse.json(
        { error: 'Network info not available' },
        { status: 500 }
      );
    }

    const governorResearchAddress = networkInfo.governorResearch;
    if (!governorResearchAddress) {
      console.error('Governor Research address not configured');
      return NextResponse.json(
        { error: 'Governor Research address not configured' },
        { status: 500 }
      );
    }

    console.log('Fetching DUE_DILIGENCE_ROLE...');
    const DUE_DILIGENCE_ROLE = await customPublicClient.readContract({
      address: governorResearchAddress as Address,
      abi: govResAbi,
      functionName: 'DUE_DILIGENCE_ROLE'
    }) as `0x${string}`;
    console.log('DUE_DILIGENCE_ROLE:', DUE_DILIGENCE_ROLE);

    console.log('Fetching grant logs...');
    const grantLogs = await customPublicClient.getLogs({
      address: governorResearchAddress as Address,
      event: parseAbiItem('event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)'),
      args: {
        role: DUE_DILIGENCE_ROLE
      },
      fromBlock: BigInt(0)
    });
    console.log('Found', grantLogs.length, 'grant logs');

    console.log('Fetching revoke logs...');
    const revokeLogs = await customPublicClient.getLogs({
      address: governorResearchAddress as Address,
      event: parseAbiItem('event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)'),
      args: {
        role: DUE_DILIGENCE_ROLE
      },
      fromBlock: BigInt(0)
    });
    console.log('Found', revokeLogs.length, 'revoke logs');

    // Combine all logs and sort them by block number and transaction index
    const allLogs = [...grantLogs, ...revokeLogs].sort((a, b) => {
      // First compare block numbers
      if (a.blockNumber !== b.blockNumber) {
        return Number(a.blockNumber - b.blockNumber);
      }
      // If in same block, compare transaction indices
      if (a.transactionIndex !== b.transactionIndex) {
        return Number(a.transactionIndex - b.transactionIndex);
      }
      // If in same transaction, grant should come before revoke
      const aIsGrant = a.topics[0] === grantLogs[0]?.topics[0];
      const bIsGrant = b.topics[0] === grantLogs[0]?.topics[0];
      return aIsGrant === bIsGrant ? 0 : aIsGrant ? -1 : 1;
    });

    // Track the current state of each address
    const addressStates = new Map<string, boolean>();

    // Process logs in chronological order
    for (const log of allLogs) {
      try {
        const { args, eventName } = decodeEventLog({
          abi: govResAbi,
          data: log.data,
          topics: log.topics,
          strict: true
        });
        
        if (args && typeof args === 'object' && 'account' in args) {
          const address = args.account as Address;
          // Update state based on event type
          addressStates.set(address, eventName === 'RoleGranted');
        }
      } catch (error) {
        console.error('Error decoding log:', error, 'Log:', log);
      }
    }

    // Filter only addresses that currently have the role
    const addressesWithRole = Array.from(addressStates.entries())
      .filter(([, hasRole]) => hasRole)
      .map(([address]) => address);

    console.log('Final addresses with role:', addressesWithRole);
    return NextResponse.json({
      addresses: addressesWithRole,
    });
  } catch (error) {
    console.error('Error in fetch-due-diligence route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
