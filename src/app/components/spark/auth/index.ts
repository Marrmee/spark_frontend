/**
 * Spark Platform - Authentication & NDA System
 * 
 * Main exports for Module 01: Authentication & NDA System
 * 
 * This module provides comprehensive NDA-based access control for the Spark platform,
 * including on-chain attestation verification, content protection, and user-friendly
 * signing interfaces.
 */

// Main Components
export { default as AccessGate } from './AccessGate';

// Access Control Components
export { default as AccessRequiredPrompt } from './components/AccessControl/AccessRequiredPrompt';
export { default as UnauthorizedAccess } from './components/AccessControl/UnauthorizedAccess';
export { default as AccessVerificationLoader } from './components/AccessControl/AccessVerificationLoader';

// NDA Signature Components
export { default as PlatformNDASignature } from './components/NDASignature/PlatformNDASignature';
export { default as IdeatorTermsSignature } from './components/NDASignature/IdeatorTermsSignature';
export { default as IdeaNDASignature } from './components/NDASignature/IdeaNDASignature';

// Hooks
export { useAttestationVault } from './hooks/useAttestationVault';

// Types and Enums
export {
  NDAAthestationLevel
} from './types/access-control';

export type {
  AccessControlRule,
  UserAccessStatus,
  AccessVerificationResult,
  NDAAgreementContent,
  NDAAgreementSignature,
  IdeaNDAData,
  AccessGateProps,
  ProtectedContentProps,
  AttestationTransaction,
  AccessControlError,
  AccessControlErrorInfo
} from './types/access-control';

// Utilities
export {
  ACCESS_CONTROL_RULES,
  getAccessRule,
  getAccessLevelHierarchy,
  satisfiesAccessLevel,
  getMissingRequirements,
  getHighestAccessLevel,
  requiresOnChainVerification,
  getAccessLevelDisplayName,
  validateAccessLevels
} from './utils/access-rules';

// Examples (for development and testing)
export { default as AccessGateExample } from './examples/AccessGateExample'; 