/**
 * Spark Platform - EIP712 Constants and Types
 * 
 * Defines EIP-712 structured data types for secure, human-readable signature requests
 * in the Spark NDA attestation system.
 */

// EIP712 Domain Information
export const EIP712_DOMAIN_NAME_SPARK_USER_AGREEMENTS = 'Spark User Agreements';
export const EIP712_DOMAIN_VERSION_SPARK_USER_AGREEMENTS = '1';

// Agreement Type Hash Constants (these should match the contract constants)
// These will be fetched from the AttestationVault contract dynamically
export const PLATFORM_NDA_TYPE_HASH_BYTES32 = '0x86e6fc6e1b76c8767c48b5f5a1b6a0a3b1e2c8b0e5f5a1b6a0a3b1e2c8b0e5f5'; // Placeholder - will be fetched from contract
export const PLATFORM_IDEATOR_TERMS_TYPE_HASH_BYTES32 = '0x27e9fc6e1b76c8767c48b5f5a1b6a0a3b1e2c8b0e5f5a1b6a0a3b1e2c8b0e5f6'; // Placeholder - will be fetched from contract

// EIP712 Type Definitions
export const EIP712_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' }
  ],
  SparkUserDocumentAttestation: [
    { name: 'userSignedDocumentHash', type: 'bytes32' },
    { name: 'agreementTypeId', type: 'bytes32' }
  ],
  SparkIdeaNdaAttestation: [
    { name: 'userSignedDocumentHash', type: 'bytes32' },
    { name: 'ideaId', type: 'bytes32' }
  ]
};

// Type definitions for TypeScript
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
}

export interface SparkUserDocumentAttestation {
  userSignedDocumentHash: `0x${string}`;
  agreementTypeId: `0x${string}`;
}

export interface SparkIdeaNdaAttestation {
  userSignedDocumentHash: `0x${string}`;
  ideaId: `0x${string}`;
}

export type SparkAttestationMessage = SparkUserDocumentAttestation | SparkIdeaNdaAttestation;

// Helper function to create EIP712 domain
export const createSparkEIP712Domain = (
  chainId: number,
  verifyingContract: `0x${string}`
): EIP712Domain => ({
  name: EIP712_DOMAIN_NAME_SPARK_USER_AGREEMENTS,
  version: EIP712_DOMAIN_VERSION_SPARK_USER_AGREEMENTS,
  chainId,
  verifyingContract
});

// Helper function to get agreement type hash by name
export const getAgreementTypeHash = (agreementType: string): `0x${string}` | null => {
  switch (agreementType) {
    case 'PLATFORM_NDA':
      return PLATFORM_NDA_TYPE_HASH_BYTES32 as `0x${string}`;
    case 'PLATFORM_IDEATOR_TERMS':
      return PLATFORM_IDEATOR_TERMS_TYPE_HASH_BYTES32 as `0x${string}`;
    default:
      return null;
  }
};

// Contract interface for attestation vault
interface AttestationVaultContract {
  PLATFORM_NDA_TYPE?: () => Promise<string>;
  IDEATOR_TERMS_TYPE?: () => Promise<string>;
  [key: string]: unknown;
}

// Contract constants fetching function
export const fetchContractConstants = async (
  attestationVaultContract: AttestationVaultContract
): Promise<{
  platformNdaTypeHash: `0x${string}`;
  ideatorTermsTypeHash: `0x${string}`;
}> => {
  try {
    // These should be called from the actual contract when available
    const platformNdaTypeHash = await attestationVaultContract.PLATFORM_NDA_TYPE?.() || PLATFORM_NDA_TYPE_HASH_BYTES32;
    const ideatorTermsTypeHash = await attestationVaultContract.IDEATOR_TERMS_TYPE?.() || PLATFORM_IDEATOR_TERMS_TYPE_HASH_BYTES32;
    
    return {
      platformNdaTypeHash: platformNdaTypeHash as `0x${string}`,
      ideatorTermsTypeHash: ideatorTermsTypeHash as `0x${string}`
    };
  } catch (error) {
    console.warn('Failed to fetch contract constants, using defaults:', error);
    return {
      platformNdaTypeHash: PLATFORM_NDA_TYPE_HASH_BYTES32 as `0x${string}`,
      ideatorTermsTypeHash: PLATFORM_IDEATOR_TERMS_TYPE_HASH_BYTES32 as `0x${string}`
    };
  }
}; 