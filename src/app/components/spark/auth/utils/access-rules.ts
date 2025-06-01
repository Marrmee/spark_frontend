/**
 * Spark Platform - Access Control Rules
 * 
 * Defines the comprehensive access control matrix for the Spark platform.
 * Each rule specifies what content and features are accessible at each NDA attestation level.
 */

import { AccessControlRule, NDAAthestationLevel } from '../types/access-control';

export const ACCESS_CONTROL_RULES: Record<NDAAthestationLevel, AccessControlRule> = {
  [NDAAthestationLevel.NONE]: {
    level: NDAAthestationLevel.NONE,
    description: 'No NDA attestation - Public access only',
    grantedAccess: [
      'Public idea summaries',
      'Platform overview content',
      'General documentation',
      'Public statistics',
      'Platform announcements'
    ],
    requirement: 'Wallet connection required',
    contractMethod: null,
    icon: '🔓',
    color: 'bg-gray-100 text-gray-800'
  },
  
  [NDAAthestationLevel.PLATFORM_NDA]: {
    level: NDAAthestationLevel.PLATFORM_NDA,
    description: 'Platform NDA signed - Basic platform features',
    grantedAccess: [
      'Platform feature access',
      'Basic idea browsing',
      'Community discussions',
      'User profiles',
      'Notification settings'
    ],
    requirement: 'Sign Platform NDA to access',
    contractMethod: 'hasAttestedToPlatformNda',
    icon: '📝',
    color: 'bg-blue-100 text-blue-800'
  },
  
  [NDAAthestationLevel.IDEATOR_TERMS]: {
    level: NDAAthestationLevel.IDEATOR_TERMS,
    description: 'Ideator Terms signed - Idea submission enabled',
    grantedAccess: [
      'Idea submission',
      'Draft idea management',
      'Ideator dashboard',
      'Submission history',
      'Revenue tracking'
    ],
    requirement: 'Sign Ideator Terms Agreement to submit ideas',
    contractMethod: 'hasAttestedToIdeatorTerms',
    icon: '💡',
    color: 'bg-green-100 text-green-800'
  },
  
  [NDAAthestationLevel.BOTH_PLATFORM]: {
    level: NDAAthestationLevel.BOTH_PLATFORM,
    description: 'Both platform agreements signed - Full platform access',
    grantedAccess: [
      'Full platform features',
      'Draft ideas access',
      'Idea submission and management',
      'Advanced analytics',
      'Premium features',
      'Governance participation'
    ],
    requirement: 'Both Platform NDA and Ideator Terms signed',
    contractMethod: 'hasAttestedToBothPlatformAgreementTypes',
    icon: '⭐',
    color: 'bg-purple-100 text-purple-800'
  },
  
  [NDAAthestationLevel.IDEA_SPECIFIC_NDA]: {
    level: NDAAthestationLevel.IDEA_SPECIFIC_NDA,
    description: 'Idea-specific NDA signed - Protected idea content access',
    grantedAccess: [
      'Specific idea detailed content',
      'Pending/Approved/Rejected idea status',
      'Confidential research data',
      'IP documentation',
      'Technical specifications',
      'Due diligence materials'
    ],
    requirement: 'Sign idea-specific NDA via DocuSign',
    contractMethod: 'hasUserAttestedToIdeaNda',
    icon: '🔐',
    color: 'bg-orange-100 text-orange-800'
  }
};

/**
 * Get access rule for a specific attestation level
 */
export const getAccessRule = (level: NDAAthestationLevel): AccessControlRule => {
  return ACCESS_CONTROL_RULES[level];
};

/**
 * Get all available access levels in hierarchy order
 */
export const getAccessLevelHierarchy = (): NDAAthestationLevel[] => {
  return [
    NDAAthestationLevel.NONE,
    NDAAthestationLevel.PLATFORM_NDA,
    NDAAthestationLevel.IDEATOR_TERMS,
    NDAAthestationLevel.BOTH_PLATFORM,
    NDAAthestationLevel.IDEA_SPECIFIC_NDA
  ];
};

/**
 * Check if a user's attestation level satisfies the required access level
 */
export const satisfiesAccessLevel = (
  userLevels: NDAAthestationLevel[],
  requiredLevel: NDAAthestationLevel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ideaId?: string
): boolean => {
  // For idea-specific NDA, we need to check the specific idea attestation
  if (requiredLevel === NDAAthestationLevel.IDEA_SPECIFIC_NDA) {
    // This will be validated separately with the idea ID
    return userLevels.includes(NDAAthestationLevel.IDEA_SPECIFIC_NDA);
  }
  
  // For other levels, check if user has the required level
  return userLevels.includes(requiredLevel);
};

/**
 * Get missing requirements for a user to access a specific level
 */
export const getMissingRequirements = (
  userLevels: NDAAthestationLevel[],
  requiredLevel: NDAAthestationLevel
): string[] => {
  const missingRequirements: string[] = [];
  const rule = getAccessRule(requiredLevel);
  
  if (!userLevels.includes(requiredLevel)) {
    missingRequirements.push(rule.requirement);
  }
  
  return missingRequirements;
};

/**
 * Get the highest access level a user currently has
 */
export const getHighestAccessLevel = (userLevels: NDAAthestationLevel[]): NDAAthestationLevel => {
  const hierarchy = getAccessLevelHierarchy();
  
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    if (userLevels.includes(hierarchy[i])) {
      return hierarchy[i];
    }
  }
  
  return NDAAthestationLevel.NONE;
};

/**
 * Check if an access level requires on-chain verification
 */
export const requiresOnChainVerification = (level: NDAAthestationLevel): boolean => {
  const rule = getAccessRule(level);
  return rule.contractMethod !== null;
};

/**
 * Get user-friendly access level name
 */
export const getAccessLevelDisplayName = (level: NDAAthestationLevel): string => {
  const names = {
    [NDAAthestationLevel.NONE]: 'Public Access',
    [NDAAthestationLevel.PLATFORM_NDA]: 'Platform Member',
    [NDAAthestationLevel.IDEATOR_TERMS]: 'Idea Contributor',
    [NDAAthestationLevel.BOTH_PLATFORM]: 'Full Member',
    [NDAAthestationLevel.IDEA_SPECIFIC_NDA]: 'Idea Reviewer'
  };
  
  return names[level] || 'Unknown';
};

/**
 * Validate if access levels array is properly formatted
 */
export const validateAccessLevels = (levels: NDAAthestationLevel[]): boolean => {
  const validLevels = Object.values(NDAAthestationLevel);
  return levels.every(level => validLevels.includes(level));
}; 