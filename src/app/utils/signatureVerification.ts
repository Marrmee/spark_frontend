import { verifyTypedData, type Address, type Hex } from 'viem';

interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number | bigint;
  verifyingContract?: Address;
  salt?: Hex;
}

interface TypedDataTypes {
  [key: string]: Array<{ name: string; type: string }>;
}

/**
 * Verifies a typed data signature
 * @param domain The domain data
 * @param types The type definitions
 * @param primaryType The primary type name
 * @param message The message to verify
 * @param signature The signature to verify
 * @param address The signer's address
 * @returns True if the signature is valid, false otherwise
 */
export async function verifyTypedDataSignature(
  domain: TypedDataDomain,
  types: TypedDataTypes,
  primaryType: string,
  message: Record<string, unknown>,
  signature: Hex,
  address: Address
): Promise<boolean> {
  try {
    const recoveredAddress = await verifyTypedData({
      domain,
      types,
      primaryType,
      message,
      signature,
      address,
    });
    return recoveredAddress;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
} 