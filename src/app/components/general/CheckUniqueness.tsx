'use server';

import fetch from 'node-fetch';
import { getNetworkInfo, getPrivateKey } from '@/app/utils/serverConfig';
import { createWalletClient, http, keccak256, encodePacked, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { optimism } from 'viem/chains';

const NETWORKS = ['ethereum', 'optimism', 'avalanche', 'aurora'];

// Circuit IDs for different verification types
const GOV_ID_CIRCUIT_ID =
  "0x729d660e1c02e4e419745e617d643f897a538673ccf1051e093bbfa58b0a120b";
const PHONE_CIRCUIT_ID =
  "0xbce052cf723dca06a21bd3cf838bc518931730fb3db7859fc9cc86f0d5483495";
// Issuer addresses
// const GOV_ID_ISSUER_ADDRESS =
//   "0x03fae82f38bf01d9799d57fdda64fad4ac44e4c2c2f16c5bf8e1873d0a3e1993";
// const PHONE_ISSUER_ADDRESS =
//   "0x40b8810cbaed9647b54d18cc98b720e1e8876be5d8e7089d3c079fc61c30a4";
// Hub contract address on Optimism
const HUB_CONTRACT_ADDRESS = '0x2AA822e264F8cc31A2b9C22f39e5551241e94DfB';

// ABI excerpt for the Hub contract on Optimism - just the functions we need
const hubAbi = [
  {
    inputs: [
      { internalType: 'address', name: 'sbtOwner', type: 'address' },
      { internalType: 'bytes32', name: 'circuitId', type: 'bytes32' }
    ],
    name: 'getSBT',
    outputs: [
      { 
        components: [
          { internalType: 'uint256', name: 'expiry', type: 'uint256' },
          { internalType: 'uint256[]', name: 'publicValues', type: 'uint256[]' },
          { internalType: 'bool', name: 'revoked', type: 'bool' }
        ],
        internalType: 'struct SBT',
        name: 'sbt',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

// Type definition for SBT expiry data - using string for timestamp to avoid BigInt serialization issues
type SbtExpiryData = {
  timestamp: string;
  date: Date;
  isExpired: boolean;
} | null;

// Type definition for SBT data
type SbtData = {
  expiry: bigint;
  publicValues: bigint[];
  revoked: boolean;
} | null;

// Helper function to serialize a response object with BigInt values
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function serializeResponse(obj: any): Promise<any> {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = [];
    for (const item of obj) {
      result.push(await serializeResponse(item));
    }
    return result;
  }
  
  if (typeof obj === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    for (const key in obj) {
      result[key] = await serializeResponse(obj[key]);
    }
    return result;
  }
  
  return obj;
}

// Function to get SBT data from Optimism
async function getSbtData(userAddress: string, circuitId: string): Promise<SbtData> {
  console.log(`[DEBUG] getSbtData: Starting for user ${userAddress} with circuitId ${circuitId}`);
  try {
    // Check if RPC URL is defined
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL_OPTIMISM;
    if (!rpcUrl) {
      console.log(`[DEBUG] getSbtData: NEXT_PUBLIC_RPC_URL_OPTIMISM is not defined`);
      return null;
    }
    
    console.log(`[DEBUG] getSbtData: Using RPC URL: ${rpcUrl}`);
    console.log(`[DEBUG] getSbtData: Using Hub contract at ${HUB_CONTRACT_ADDRESS}`);
    
    // Create a public client for Optimism
    const optimismClient = createPublicClient({
      chain: optimism,
      transport: http(rpcUrl),
    });

    // Validate the client was created successfully
    if (!optimismClient) {
      console.log(`[DEBUG] getSbtData: Failed to create optimism client`);
      return null;
    }

    console.log(`[DEBUG] getSbtData: Successfully created optimism client`);
    console.log(`[DEBUG] getSbtData: Calling getSBT with args:`, [userAddress, circuitId]);

    // Call the getSBT function on the Hub contract
    const sbtData = await optimismClient.readContract({
      address: HUB_CONTRACT_ADDRESS as `0x${string}`,
      abi: hubAbi,
      functionName: 'getSBT',
      args: [userAddress, circuitId],
    });

    console.log(`[DEBUG] getSbtData: Raw SBT data:`, JSON.stringify(sbtData, (_, v) => 
      typeof v === 'bigint' ? v.toString() : v));

    // Return the entire SBT data
    if (sbtData) {
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expiry: (sbtData as any).expiry,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        publicValues: (sbtData as any).publicValues,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        revoked: (sbtData as any).revoked
      };
    }
    
    return null;
  } catch (error) {
    console.log(`[DEBUG] getSbtData: Error for user ${userAddress}:`, error);
    console.log(`[DEBUG] getSbtData: Error message:`, error.message);
    
    // Check if the error message indicates SBT expiry
    if (error.message && typeof error.message === 'string' && 
        (error.message.includes("SBT is expired") || error.message.includes("does not exist"))) {
      console.log(`[DEBUG] getSbtData: SBT is expired or does not exist`);
    }
    
    return null;
  }
}

// Function to get SBT expiry date from Optimism
async function getSbtExpiryDate(userAddress: string, circuitId: string): Promise<SbtExpiryData> {
  console.log(`[DEBUG] getSbtExpiryDate: Starting for user ${userAddress} with circuitId ${circuitId}`);
  try {
    const sbtData = await getSbtData(userAddress, circuitId);
    
    if (sbtData && sbtData.expiry) {
      const expiryTimestamp = sbtData.expiry;
      const expiryData = {
        timestamp: expiryTimestamp.toString(), // Convert BigInt to string to avoid serialization issues
        date: new Date(Number(expiryTimestamp) * 1000),
        isExpired: Number(expiryTimestamp) * 1000 < Date.now()
      };
      console.log(`[DEBUG] getSbtExpiryDate: Processed expiry data:`, 
        {
          timestamp: expiryTimestamp.toString(),
          date: expiryData.date.toISOString(),
          isExpired: expiryData.isExpired
        }
      );
      return expiryData;
    }
    
    console.log(`[DEBUG] getSbtExpiryDate: No valid SBT data found for user ${userAddress}`);
    return null;
  } catch (error) {
    console.log(`[DEBUG] getSbtExpiryDate: Error for user ${userAddress}:`, error);
    console.log(`SBT not found or expired: ${error.message}`);
    return null;
  }
}

// // Function to validate SBT for Gov ID
// async function validateGovIdSbt(userAddress: string, actionId: string): Promise<{ isValid: boolean, expiryData: SbtExpiryData }> {
//   console.log(`[DEBUG] validateGovIdSbt: Starting for user ${userAddress}`);
  
//   try {
//     const sbtData = await getSbtData(userAddress, GOV_ID_CIRCUIT_ID);
    
//     if (!sbtData) {
//       console.log(`[DEBUG] validateGovIdSbt: No SBT data found`);
//       return { isValid: false, expiryData: null };
//     }
    
//     const expiry = sbtData.expiry;
//     const publicValues = sbtData.publicValues;
//     const expiryDate = new Date(Number(expiry) * 1000);
//     const isExpired = Number(expiry) * 1000 < Date.now();
    
//     console.log(`[DEBUG] validateGovIdSbt: SBT expiry: ${expiryDate.toISOString()}, isExpired: ${isExpired}`);
    
//     if (isExpired) {
//       console.log(`[DEBUG] validateGovIdSbt: SBT is expired`);
//       return { 
//         isValid: false, 
//         expiryData: {
//           timestamp: expiry.toString(),
//           date: expiryDate,
//           isExpired: true
//         }
//       };
//     }
    
//     // Check if publicValues has at least 5 elements
//     if (publicValues.length < 5) {
//       console.log(`[DEBUG] validateGovIdSbt: Invalid publicValues length`);
//       return { 
//         isValid: false, 
//         expiryData: {
//           timestamp: expiry.toString(),
//           date: expiryDate,
//           isExpired: false
//         }
//       };
//     }
    
//     // Convert action ID to BigInt for comparison
//     const actionIdInSBT = publicValues[2].toString();
//     console.log(`[DEBUG] validateGovIdSbt: actionIdInSBT: ${actionIdInSBT}, requested: ${actionId}`);
    
//     // Format issuer address from public values
//     const issuerAddress = `0x${publicValues[4].toString(16).padStart(40, '0')}`;
//     console.log(`[DEBUG] validateGovIdSbt: issuerAddress: ${issuerAddress}, expected: ${GOV_ID_ISSUER_ADDRESS}`);
    
//     const actionIdIsValid = actionId == actionIdInSBT;
//     const issuerIsValid = GOV_ID_ISSUER_ADDRESS.toLowerCase() === issuerAddress.toLowerCase();
    
//     const isValid = !isExpired && issuerIsValid && actionIdIsValid;
//     console.log(`[DEBUG] validateGovIdSbt: isValid: ${isValid}`);
    
//     return { 
//       isValid,
//       expiryData: {
//         timestamp: expiry.toString(),
//         date: expiryDate,
//         isExpired
//       }
//     };
//   } catch (error) {
//     console.log(`[DEBUG] validateGovIdSbt: Error:`, error);
//     console.log(`[DEBUG] validateGovIdSbt: Error message:`, error.message);
//     return { isValid: false, expiryData: null };
//   }
// }

// // Function to validate SBT for Phone
// async function validatePhoneSbt(userAddress: string, actionId: string): Promise<{ isValid: boolean, expiryData: SbtExpiryData }> {
//   console.log(`[DEBUG] validatePhoneSbt: Starting for user ${userAddress}`);
  
//   try {
//     const sbtData = await getSbtData(userAddress, PHONE_CIRCUIT_ID);
    
//     if (!sbtData) {
//       console.log(`[DEBUG] validatePhoneSbt: No SBT data found`);
//       return { isValid: false, expiryData: null };
//     }
    
//     const expiry = sbtData.expiry;
//     const publicValues = sbtData.publicValues;
//     const expiryDate = new Date(Number(expiry) * 1000);
//     const isExpired = Number(expiry) * 1000 < Date.now();
    
//     console.log(`[DEBUG] validatePhoneSbt: SBT expiry: ${expiryDate.toISOString()}, isExpired: ${isExpired}`);
    
//     if (isExpired) {
//       console.log(`[DEBUG] validatePhoneSbt: SBT is expired`);
//       return { 
//         isValid: false, 
//         expiryData: {
//           timestamp: expiry.toString(),
//           date: expiryDate,
//           isExpired: true
//         }
//       };
//     }
    
//     // Check if publicValues has at least 5 elements
//     if (publicValues.length < 5) {
//       console.log(`[DEBUG] validatePhoneSbt: Invalid publicValues length`);
//       return { 
//         isValid: false, 
//         expiryData: {
//           timestamp: expiry.toString(),
//           date: expiryDate,
//           isExpired: false
//         }
//       };
//     }
    
//     // Convert action ID to BigInt for comparison
//     const actionIdInSBT = publicValues[2].toString();
//     console.log(`[DEBUG] validatePhoneSbt: actionIdInSBT: ${actionIdInSBT}, requested: ${actionId}`);
    
//     // Format issuer address from public values
//     const issuerAddress = `0x${publicValues[4].toString(16).padStart(40, '0')}`;
//     console.log(`[DEBUG] validatePhoneSbt: issuerAddress: ${issuerAddress}, expected: ${PHONE_ISSUER_ADDRESS}`);
    
//     const actionIdIsValid = actionId == actionIdInSBT;
//     const issuerIsValid = PHONE_ISSUER_ADDRESS.toLowerCase() === issuerAddress.toLowerCase();
    
//     const isValid = !isExpired && issuerIsValid && actionIdIsValid;
//     console.log(`[DEBUG] validatePhoneSbt: isValid: ${isValid}`);
    
//     return { 
//       isValid,
//       expiryData: {
//         timestamp: expiry.toString(),
//         date: expiryDate,
//         isExpired
//       }
//     };
//   } catch (error) {
//     console.log(`[DEBUG] validatePhoneSbt: Error:`, error);
//     console.log(`[DEBUG] validatePhoneSbt: Error message:`, error.message);
//     return { isValid: false, expiryData: null };
//   }
// }

// Helper function to check phone uniqueness through API with improved error handling
const checkPhoneUniquenessViaAPI = async (userAddress: string, actionId: string) => {
  console.log(`[DEBUG] checkPhoneUniqueness: Checking networks:`, NETWORKS);
  
  // Try optimism first since it's most likely to work
  try {
    const optimismNetwork = 'optimism';
    const apiUrl = `https://api.holonym.io/sybil-resistance/phone/${optimismNetwork}?user=${userAddress}&action-id=${actionId}`;
    console.log(`[DEBUG] checkPhoneUniqueness: Checking ${optimismNetwork} with URL:`, apiUrl);
    
    // Use timeout option for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(apiUrl, { 
        // Type cast the signal to any to avoid the type mismatch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signal: controller.signal as any
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log(`[DEBUG] checkPhoneUniqueness: ${optimismNetwork} response:`, responseData);
        if (responseData.result === true) {
          return true; // Early return if we get a positive result
        }
      }
    } catch (fetchError) {
      console.log(`[DEBUG] checkPhoneUniqueness: ${optimismNetwork} fetch error:`, fetchError);
      // Continue to other networks
    }
  } catch (error) {
    console.log(`[DEBUG] checkPhoneUniqueness: optimism error:`, error);
    // Continue to other networks
  }
  
  // If optimism didn't work or returned false, try to check at least one other network
  let foundValidResult = false;
  
  for (const network of NETWORKS.filter(n => n !== 'optimism')) {
    if (foundValidResult) break;
    
    const apiUrl = `https://api.holonym.io/sybil-resistance/phone/${network}?user=${userAddress}&action-id=${actionId}`;
    console.log(`[DEBUG] checkPhoneUniqueness: Checking ${network} with URL:`, apiUrl);
    
    // Use timeout option for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for other networks
    
    try {
      const response = await fetch(apiUrl, { 
        // Type cast the signal to any to avoid the type mismatch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signal: controller.signal as any
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log(`[DEBUG] checkPhoneUniqueness: ${network} response:`, responseData);
        if (responseData.result === true) {
          foundValidResult = true;
          break;
        }
      }
    } catch (fetchError) {
      console.log(`[DEBUG] checkPhoneUniqueness: ${network} fetch error:`, fetchError);
      // Try next network
    }
  }
  
  return foundValidResult;
};

// Helper function to check gov ID uniqueness through API with improved error handling
const checkGovIdUniquenessViaAPI = async (userAddress: string, actionId: string) => {
  console.log(`[DEBUG] checkGovIdUniqueness: Checking networks:`, NETWORKS);
  
  // Try optimism first since it's most likely to work
  try {
    const optimismNetwork = 'optimism';
    const apiUrl = `https://api.holonym.io/sybil-resistance/gov-id/${optimismNetwork}?user=${userAddress}&action-id=${actionId}`;
    console.log(`[DEBUG] checkGovIdUniqueness: Checking ${optimismNetwork} with URL:`, apiUrl);
    
    // Use timeout option for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(apiUrl, { 
        // Type cast the signal to any to avoid the type mismatch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signal: controller.signal as any
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log(`[DEBUG] checkGovIdUniqueness: ${optimismNetwork} response:`, responseData);
        if (responseData.result === true) {
          return true; // Early return if we get a positive result
        }
      }
    } catch (fetchError) {
      console.log(`[DEBUG] checkGovIdUniqueness: ${optimismNetwork} fetch error:`, fetchError);
      // Continue to other networks
    }
  } catch (error) {
    console.log(`[DEBUG] checkGovIdUniqueness: optimism error:`, error);
    // Continue to other networks
  }
  
  // If optimism didn't work or returned false, try to check at least one other network
  let foundValidResult = false;
  
  for (const network of NETWORKS.filter(n => n !== 'optimism')) {
    if (foundValidResult) break;
    
    const apiUrl = `https://api.holonym.io/sybil-resistance/gov-id/${network}?user=${userAddress}&action-id=${actionId}`;
    console.log(`[DEBUG] checkGovIdUniqueness: Checking ${network} with URL:`, apiUrl);
    
    // Use timeout option for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for other networks
    
    try {
      const response = await fetch(apiUrl, { 
        // Type cast the signal to any to avoid the type mismatch
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signal: controller.signal as any
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log(`[DEBUG] checkGovIdUniqueness: ${network} response:`, responseData);
        if (responseData.result === true) {
          foundValidResult = true;
          break;
        }
      }
    } catch (fetchError) {
      console.log(`[DEBUG] checkGovIdUniqueness: ${network} fetch error:`, fetchError);
      // Try next network
    }
  }
  
  return foundValidResult;
};

export const checkPhoneUniqueness = async (userAddress) => {
  console.log(`[DEBUG] checkPhoneUniqueness: Starting for user ${userAddress}`);
  
  const networkInfo = await getNetworkInfo();
  console.log(`[DEBUG] checkPhoneUniqueness: Network info:`, networkInfo);
  
  const rawPrivateKey = await getPrivateKey();
  const formattedKey = rawPrivateKey.startsWith('0x')
    ? rawPrivateKey
    : `0x${rawPrivateKey}`;
  const privateKey = formattedKey as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  console.log(`[DEBUG] checkPhoneUniqueness: Account address:`, account.address);
  
  const walletClient = createWalletClient({
    account,
    transport: http(networkInfo.providerUrl),
  });

  // First check uniqueness through API calls
  console.log(`[DEBUG] checkPhoneUniqueness: Checking uniqueness through API`);
  const actionId = '123456789'; // Using the same action ID as in the API calls
  
  let isUniquePhone = false;
  let phoneSbtExpiry: SbtExpiryData = null;
  
  try {
    // First check API for uniqueness
    isUniquePhone = await checkPhoneUniquenessViaAPI(userAddress, actionId);
    console.log('[DEBUG] checkPhoneUniqueness: API uniqueness result:', isUniquePhone);
    
    // Only fetch SBT expiry if the user is unique
    if (isUniquePhone) {
      console.log(`[DEBUG] checkPhoneUniqueness: User is unique, fetching SBT expiry`);
      try {
        phoneSbtExpiry = await getSbtExpiryDate(userAddress, PHONE_CIRCUIT_ID);
        
        // If we couldn't get a valid expiry, create a fallback
        if (!phoneSbtExpiry) {
          console.log(`[DEBUG] checkPhoneUniqueness: Using fallback expiry data`);
          const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
          const expiryDate = new Date(oneYearFromNow * 1000);
          phoneSbtExpiry = {
            timestamp: oneYearFromNow.toString(),
            date: expiryDate,
            isExpired: false
          };
        }
      } catch (expiryError) {
        console.log(`[DEBUG] checkPhoneUniqueness: Error fetching expiry:`, expiryError);
        // Create fallback expiry
        const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
        const expiryDate = new Date(oneYearFromNow * 1000);
        phoneSbtExpiry = {
          timestamp: oneYearFromNow.toString(),
          date: expiryDate,
          isExpired: false
        };
      }
    }
  } catch (error) {
    console.log('[DEBUG] checkPhoneUniqueness: API check failed with error:', error);
    // Default to false on API failure
    isUniquePhone = false;
  }

  const timestampPhone = Math.floor(Date.now() / 1000);
  console.log(`[DEBUG] checkPhoneUniqueness: Using timestamp:`, timestampPhone);

  // Create message hash
  const messageHashBytes = keccak256(
    encodePacked(
      ['address', 'bool', 'uint256'],
      [
        userAddress,
        isUniquePhone,
        BigInt(timestampPhone),
      ]
    )
  );
  console.log(`[DEBUG] checkPhoneUniqueness: Message hash:`, messageHashBytes);

  // Sign the hash
  const signaturePhone = await walletClient.signMessage({
    message: { raw: messageHashBytes },
  });
  console.log(`[DEBUG] checkPhoneUniqueness: Generated signature:`, signaturePhone);

  // Serialize the response data to ensure no Date or BigInt serialization issues
  const response = { 
    isUniquePhone, 
    signaturePhone, 
    timestampPhone, 
    phoneSbtExpiry: phoneSbtExpiry ? {
      timestamp: phoneSbtExpiry.timestamp,
      date: phoneSbtExpiry.date.toISOString(),
      isExpired: phoneSbtExpiry.isExpired
    } : null
  };

  console.log(`[DEBUG] checkPhoneUniqueness: Returning final result`);
  return response;
};

export const checkGovIdUniqueness = async (userAddress) => {
  console.log(`[DEBUG] checkGovIdUniqueness: Starting for user ${userAddress}`);
  
  const networkInfo = await getNetworkInfo();
  console.log(`[DEBUG] checkGovIdUniqueness: Network info:`, networkInfo);
  
  const rpcUrl = networkInfo?.providerUrl;

  const rawPrivateKey = await getPrivateKey();
  const formattedKey = rawPrivateKey.startsWith('0x')
    ? rawPrivateKey
    : `0x${rawPrivateKey}`;
  const privateKey = formattedKey as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  console.log(`[DEBUG] checkGovIdUniqueness: Account address:`, account.address);
  
  const walletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
  });

  // First check uniqueness through API calls
  console.log(`[DEBUG] checkGovIdUniqueness: Checking uniqueness through API`);
  const actionId = '123456789'; // Using the same action ID as in the API calls
  
  let isUniqueGovId = false;
  let govIdSbtExpiry: SbtExpiryData = null;
  
  try {
    // First check API for uniqueness
    isUniqueGovId = await checkGovIdUniquenessViaAPI(userAddress, actionId);
    console.log('[DEBUG] checkGovIdUniqueness: API uniqueness result:', isUniqueGovId);
    
    // Only fetch SBT expiry if the user is unique
    if (isUniqueGovId) {
      console.log(`[DEBUG] checkGovIdUniqueness: User is unique, fetching SBT expiry`);
      try {
        govIdSbtExpiry = await getSbtExpiryDate(userAddress, GOV_ID_CIRCUIT_ID);
        
        // If we couldn't get a valid expiry, create a fallback
        if (!govIdSbtExpiry) {
          console.log(`[DEBUG] checkGovIdUniqueness: Using fallback expiry data`);
          const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
          const expiryDate = new Date(oneYearFromNow * 1000);
          govIdSbtExpiry = {
            timestamp: oneYearFromNow.toString(),
            date: expiryDate,
            isExpired: false
          };
        }
      } catch (expiryError) {
        console.log(`[DEBUG] checkGovIdUniqueness: Error fetching expiry:`, expiryError);
        // Create fallback expiry
        const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
        const expiryDate = new Date(oneYearFromNow * 1000);
        govIdSbtExpiry = {
          timestamp: oneYearFromNow.toString(),
          date: expiryDate,
          isExpired: false
        };
      }
    }
  } catch (error) {
    console.log('[DEBUG] checkGovIdUniqueness: API check failed with error:', error);
    // Default to false on API failure
    isUniqueGovId = false;
  }

  const timestampGovId = Math.floor(Date.now() / 1000);
  console.log(`[DEBUG] checkGovIdUniqueness: Using timestamp:`, timestampGovId);

  // Create message hash
  const messageHashBytes = keccak256(
    encodePacked(
      ['address', 'bool', 'uint256'],
      [
        userAddress,
        isUniqueGovId,
        BigInt(timestampGovId),
      ]
    )
  );
  console.log(`[DEBUG] checkGovIdUniqueness: Message hash:`, messageHashBytes);

  // Sign the hash
  const signatureGovId = await walletClient.signMessage({
    message: { raw: messageHashBytes },
  });
  console.log(`[DEBUG] checkGovIdUniqueness: Generated signature:`, signatureGovId);

  // Serialize the response data to ensure no Date or BigInt serialization issues
  const response = { 
    isUniqueGovId, 
    signatureGovId, 
    timestampGovId, 
    govIdSbtExpiry: govIdSbtExpiry ? {
      timestamp: govIdSbtExpiry.timestamp,
      date: govIdSbtExpiry.date.toISOString(),
      isExpired: govIdSbtExpiry.isExpired
    } : null
  };

  console.log(`[DEBUG] checkGovIdUniqueness: Returning final result`);
  return response;
};
