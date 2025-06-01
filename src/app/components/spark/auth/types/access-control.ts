/**
 * Spark Platform - NDA Access Control Types
 * 
 * Defines the access control hierarchy based on NDA attestations.
 * All access levels are verified on-chain through the AttestationVault contract.
 */

export enum NDAAthestationLevel {
  NONE = 'none',
  PLATFORM_NDA = 'platform_nda',
  IDEATOR_TERMS = 'ideator_terms',
  IDEA_SPECIFIC_NDA = 'idea_specific_nda',
  BOTH_PLATFORM = 'both_platform'  // Platform NDA + Ideator Terms
}

export interface AccessControlRule {
  level: NDAAthestationLevel;
  description: string;
  grantedAccess: string[];
  requirement: string;
  contractMethod: string | null;
  icon?: string;
  color?: string;
}

export interface UserAccessStatus {
  userAddress: string;
  attestationLevels: NDAAthestationLevel[];
  lastChecked: number;
  loading: boolean;
  error?: string;
}

export interface AccessVerificationResult {
  hasAccess: boolean;
  requiredLevel?: NDAAthestationLevel;
  userLevel?: NDAAthestationLevel;
  missingRequirements?: string[];
  loading: boolean;
  error?: string;
}

export interface NDAAgreementContent {
  id: string;
  title: string;
  content: string;
  version: string;
  lastUpdated: string;
  ipfsHash?: string;
}

export interface NDAAgreementSignature {
  userAddress: string;
  agreementId: string;
  signature: string;
  timestamp: number;
  transactionHash?: string;
  blockNumber?: number;
}

export interface IdeaNDAData {
  ideaId: string;
  ideaTitle: string;
  ideatorAddress: string;
  ndaContent: string;
  docusignEnvelopeId?: string;
  requirements: string[];
}

export interface AccessGateProps {
  children: React.ReactNode;
  requiredAccess: NDAAthestationLevel | NDAAthestationLevel[];
  ideaId?: string;
  fallback?: React.ReactNode;
  showPrompt?: boolean;
  className?: string;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}

export interface ProtectedContentProps {
  children: React.ReactNode;
  requiredAccess: NDAAthestationLevel | NDAAthestationLevel[];
  ideaId?: string;
  encryptedContent?: boolean;
  decryptionKey?: string;
  className?: string;
}

// Transaction types for NDA attestations
export interface AttestationTransaction {
  type: 'platform_nda' | 'ideator_terms' | 'idea_nda';
  userAddress: string;
  ideaId?: string;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  gasUsed?: number;
  error?: string;
}

// Error types for access control
export enum AccessControlError {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  CONTRACT_NOT_INITIALIZED = 'CONTRACT_NOT_INITIALIZED',
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  INSUFFICIENT_ACCESS = 'INSUFFICIENT_ACCESS',
  ATTESTATION_FAILED = 'ATTESTATION_FAILED',
  SIGNATURE_REJECTED = 'SIGNATURE_REJECTED',
  IDEA_NOT_FOUND = 'IDEA_NOT_FOUND',
  NDA_CONTENT_UNAVAILABLE = 'NDA_CONTENT_UNAVAILABLE',
  DOCUSIGN_ERROR = 'DOCUSIGN_ERROR'
}

export interface AccessControlErrorInfo {
  code: AccessControlError;
  message: string;
  details?: unknown;
  recoverable: boolean;
  suggestedAction?: string;
} 