import { createPublicClient, http, PublicClient } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { getNetworkInfo } from '../utils/serverConfig';

// Use NEXT_PUBLIC_NETWORK_ENV instead of NODE_ENV for network selection
const isMainnet = process.env.NEXT_PUBLIC_NETWORK_ENV === 'mainnet';
// Define supported chains
// export const supportedChains = [baseSepolia, base];
const rpcUrl = isMainnet ? process.env.NEXT_PUBLIC_RPC_URL_MAINNET! : process.env.NEXT_PUBLIC_RPC_URL_TESTNET!;
// Create public client for reading from the blockchain
export const publicClient: PublicClient<
  ReturnType<typeof http>,
  typeof base | typeof baseSepolia,
  undefined
> = createPublicClient({
  chain: isMainnet ? base : baseSepolia,
  transport: http(rpcUrl),
});

// Create custom public client using server-side network info
export const getCustomPublicClient = async (): Promise<PublicClient<
  ReturnType<typeof http>,
  typeof base | typeof baseSepolia,
  undefined
>> => {
  const networkInfo = await getNetworkInfo();
  return createPublicClient({
    chain: isMainnet ? base : baseSepolia,
    transport: http(networkInfo.providerUrl),
  });
};

// Network configuration
// export const networkConfig = {
//   baseSepolia: {
//     chainId: '0x14a04',
//     chainName: 'Base Sepolia',
//     nativeCurrency: {
//       name: 'ETH',
//       symbol: 'ETH',
//       decimals: 18,
//     },
//     rpcUrls: [isMainnet ? process.env.NEXT_PUBLIC_RPC_URL_MAINNET! : process.env.NEXT_PUBLIC_RPC_URL_TESTNET! || ''],
//     blockExplorerUrls: ['https://sepolia.basescan.org/'],
//   },
//   base: {
//     chainId: '0x2105',
//     chainName: 'Base',
//     nativeCurrency: {
//       name: 'ETH',
//       symbol: 'ETH',
//       decimals: 18,
//     },
//     rpcUrls: [isMainnet ? process.env.NEXT_PUBLIC_RPC_URL_MAINNET! : process.env.NEXT_PUBLIC_RPC_URL_TESTNET! || ''],
//     blockExplorerUrls: ['https://basescan.org'],
//   },
// }; 