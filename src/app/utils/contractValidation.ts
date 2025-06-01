/**
 * Utilities for validating smart contract interactions
 * These functions help ensure that contract interactions are secure
 */

import { validateTransactionSecurity } from './securityUtils';
import { SecurityEventType, logSecurityEvent } from './securityMonitoring';

/**
 * Known risky function signatures that should be validated carefully
 */
export const RISKY_FUNCTION_SIGNATURES = {
  // Token approvals
  APPROVE: '0x095ea7b3',
  INCREASE_ALLOWANCE: '0x39509351',
  // Ownership transfers
  TRANSFER_OWNERSHIP: '0xf2fde38b',
  // Contract upgrades
  UPGRADE_TO: '0x3659cfe6',
  UPGRADE_TO_AND_CALL: '0x4f1ef286',
  // Admin functions
  SET_ADMIN: '0x704b6c02',
  ADD_ADMIN: '0x70480275',
  // Governance
  EXECUTE: '0xfe0d94c1',
  QUEUE: '0xddf0b009'
};

/**
 * Validates a contract interaction before execution
 * @param contractAddress The address of the contract
 * @param functionSignature The function signature being called
 * @param params The parameters for the function call
 * @param value The ETH value being sent
 * @param userAddress The user's address
 * @returns Validation result with warnings and critical issues
 */
export async function validateContractInteraction(
  contractAddress: string,
  functionSignature: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[],
  value: string,
  userAddress?: string
): Promise<{
  isValid: boolean;
  warnings: string[];
  criticalIssues: string[];
}> {
  // First validate the transaction parameters
  const transactionValidation = validateTransactionSecurity({
    to: contractAddress,
    value,
    data: functionSignature + (params ? encodeParams(params) : ''),
  });
  
  const warnings = [...transactionValidation.warnings];
  const criticalIssues = [...transactionValidation.criticalIssues];
  
  // Check for risky function signatures
  if (isRiskyFunction(functionSignature)) {
    warnings.push(`Function signature ${functionSignature} is potentially risky`);
    
    // Additional checks for specific functions
    if (functionSignature === RISKY_FUNCTION_SIGNATURES.APPROVE) {
      // Check for unlimited approvals
      const approvalAmount = params[1]?.toString() || '';
      if (approvalAmount.includes('ffffffff')) {
        criticalIssues.push('Unlimited token approval detected');
      }
    }
    
    if (functionSignature === RISKY_FUNCTION_SIGNATURES.TRANSFER_OWNERSHIP) {
      warnings.push('Ownership transfer detected - verify the new owner address');
    }
    
    if (
      functionSignature === RISKY_FUNCTION_SIGNATURES.UPGRADE_TO ||
      functionSignature === RISKY_FUNCTION_SIGNATURES.UPGRADE_TO_AND_CALL
    ) {
      criticalIssues.push('Contract upgrade detected - verify the new implementation');
    }
  }
  
  // Log security event for critical issues
  if (criticalIssues.length > 0 && userAddress) {
    await logSecurityEvent(
      SecurityEventType.TRANSACTION_SECURITY_ISSUE,
      {
        contractAddress,
        functionSignature,
        issues: criticalIssues,
        userAddress
      },
      'high',
      userAddress
    );
  }
  
  return {
    isValid: criticalIssues.length === 0,
    warnings,
    criticalIssues
  };
}

/**
 * Checks if a function signature is in the list of risky functions
 * @param signature The function signature to check
 * @returns Whether the function is risky
 */
function isRiskyFunction(signature: string): boolean {
  return Object.values(RISKY_FUNCTION_SIGNATURES).includes(signature);
}

/**
 * Simple helper to encode parameters (placeholder - would use actual ABI encoding)
 * @param params The parameters to encode
 * @returns Encoded parameters string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function encodeParams(params: any[]): string {
  // This is a placeholder - in a real implementation, you would use
  // proper ABI encoding based on the function signature and parameter types
  return params.map(p => p.toString()).join('');
}

/**
 * Validates a governance proposal before submission
 * @param proposalData The proposal data
 * @param userAddress The user's address
 * @returns Validation result
 */
export async function validateGovernanceProposal(
  proposalData: {
    targets: string[];
    values: string[];
    calldatas: string[];
    description: string;
  },
  userAddress?: string
): Promise<{
  isValid: boolean;
  warnings: string[];
  criticalIssues: string[];
}> {
  const warnings: string[] = [];
  const criticalIssues: string[] = [];
  
  // Check for empty proposal
  if (
    !proposalData.targets.length ||
    !proposalData.values.length ||
    !proposalData.calldatas.length
  ) {
    criticalIssues.push('Proposal contains no actions');
  }
  
  // Check for mismatched arrays
  if (
    proposalData.targets.length !== proposalData.values.length ||
    proposalData.targets.length !== proposalData.calldatas.length
  ) {
    criticalIssues.push('Mismatched proposal parameters');
  }
  
  // Validate each action in the proposal
  for (let i = 0; i < proposalData.targets.length; i++) {
    const target = proposalData.targets[i];
    const value = proposalData.values[i];
    const calldata = proposalData.calldatas[i];
    
    // Extract function signature (first 10 characters of calldata)
    const functionSignature = calldata.slice(0, 10);
    
    // Validate the individual contract interaction
    const validation = await validateContractInteraction(
      target,
      functionSignature,
      [], // We don't decode the parameters here
      value,
      userAddress
    );
    
    warnings.push(...validation.warnings.map(w => `Action ${i + 1}: ${w}`));
    criticalIssues.push(...validation.criticalIssues.map(c => `Action ${i + 1}: ${c}`));
  }
  
  return {
    isValid: criticalIssues.length === 0,
    warnings,
    criticalIssues
  };
} 