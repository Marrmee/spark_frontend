/**
 * Spark Platform - useAttestationVault Hook
 * 
 * Custom hook for interacting with the AttestationVault smart contract.
 * Provides functions to check NDA attestations and verify user access levels.
 */

import { useCallback, useState } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { useNotification } from '@/app/context/NotificationContext';
import { NDAAthestationLevel } from '../types/access-control';
import { readContract } from 'viem/actions';
import AttestationVaultABIFile from '@/app/abi/AttestationVault.json';

const AttestationVaultABI = AttestationVaultABIFile;

export interface AttestationStatus {
  isValid: boolean;
  requiredLevel: NDAAthestationLevel;
  userLevels: NDAAthestationLevel[];
  missingRequirements: string[];
  lastChecked: Date;
}

export interface UseAttestationVaultReturn {
  checkAttestationStatus: (
    userAddress: string,
    requiredLevel: NDAAthestationLevel,
    ideaId?: string
  ) => Promise<AttestationStatus>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refreshAttestations: (userAddress: string) => Promise<NDAAthestationLevel[]>;
}

export const useAttestationVault = (): UseAttestationVaultReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state: walletState } = useWallet();
  const networkInfo = useNetworkInfo();
  const { addNotification } = useNotification();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Check if user has attested to platform NDA
   */
  const checkPlatformNdaAttestation = useCallback(
    async (userAddress: string): Promise<boolean> => {
      if (!networkInfo?.attestationVault || !walletState.publicClient) {
        return false;
      }

      try {
        const result = await readContract(walletState.publicClient, {
          address: networkInfo.attestationVault as `0x${string}`,
          abi: AttestationVaultABI,
          functionName: 'hasAttestedToPlatformNda',
          args: [userAddress as `0x${string}`],
        });

        return Boolean(result);
      } catch (error) {
        console.error('Error checking platform NDA attestation:', error);
        return false;
      }
    },
    [networkInfo?.attestationVault, walletState.publicClient]
  );

  /**
   * Check if user has attested to ideator terms
   */
  const checkIdeatorTermsAttestation = useCallback(
    async (userAddress: string): Promise<boolean> => {
      if (!networkInfo?.attestationVault || !walletState.publicClient) {
        return false;
      }

      try {
        const result = await readContract(walletState.publicClient, {
          address: networkInfo.attestationVault as `0x${string}`,
          abi: AttestationVaultABI,
          functionName: 'hasAttestedToIdeatorTerms',
          args: [userAddress as `0x${string}`],
        });

        return Boolean(result);
      } catch (error) {
        console.error('Error checking ideator terms attestation:', error);
        return false;
      }
    },
    [networkInfo?.attestationVault, walletState.publicClient]
  );

  /**
   * Check if user has both platform agreements
   */
  const checkBothPlatformAttestations = useCallback(
    async (userAddress: string): Promise<boolean> => {
      if (!networkInfo?.attestationVault || !walletState.publicClient) {
        return false;
      }

      try {
        const result = await readContract(walletState.publicClient, {
          address: networkInfo.attestationVault as `0x${string}`,
          abi: AttestationVaultABI,
          functionName: 'hasAttestedToBothPlatformAgreementTypes',
          args: [userAddress as `0x${string}`],
        });

        return Boolean(result);
      } catch (error) {
        console.error('Error checking both platform attestations:', error);
        return false;
      }
    },
    [networkInfo?.attestationVault, walletState.publicClient]
  );

  /**
   * Check if user has attested to idea-specific NDA
   */
  const checkIdeaNdaAttestation = useCallback(
    async (userAddress: string, ideaId: string): Promise<boolean> => {
      if (!networkInfo?.attestationVault || !walletState.publicClient || !ideaId) {
        return false;
      }

      try {
        // Convert ideaId to bytes32 format
        const ideaIdBytes32 = ideaId.startsWith('0x') 
          ? ideaId 
          : `0x${ideaId.padStart(64, '0')}`;

        const result = await readContract(walletState.publicClient, {
          address: networkInfo.attestationVault as `0x${string}`,
          abi: AttestationVaultABI,
          functionName: 'hasUserAttestedToIdeaNda',
          args: [userAddress as `0x${string}`, ideaIdBytes32 as `0x${string}`],
        });

        return Boolean(result);
      } catch (error) {
        console.error('Error checking idea NDA attestation:', error);
        return false;
      }
    },
    [networkInfo?.attestationVault, walletState.publicClient]
  );

  /**
   * Get all attestation levels for a user
   */
  const refreshAttestations = useCallback(
    async (userAddress: string): Promise<NDAAthestationLevel[]> => {
      if (!userAddress) {
        return [NDAAthestationLevel.NONE];
      }

      try {
        const levels: NDAAthestationLevel[] = [NDAAthestationLevel.NONE];

        // Check each attestation type
        const [hasPlatformNda, hasIdeatorTerms, hasBothPlatform] = await Promise.all([
          checkPlatformNdaAttestation(userAddress),
          checkIdeatorTermsAttestation(userAddress),
          checkBothPlatformAttestations(userAddress),
        ]);

        if (hasPlatformNda) {
          levels.push(NDAAthestationLevel.PLATFORM_NDA);
        }

        if (hasIdeatorTerms) {
          levels.push(NDAAthestationLevel.IDEATOR_TERMS);
        }

        if (hasBothPlatform) {
          levels.push(NDAAthestationLevel.BOTH_PLATFORM);
        }

        // Note: IDEA_SPECIFIC_NDA needs to be checked per idea
        // This is handled separately in checkAttestationStatus

        return levels;
      } catch (error) {
        console.error('Error refreshing attestations:', error);
        setError('Failed to check attestation status');
        return [NDAAthestationLevel.NONE];
      }
    },
    [checkPlatformNdaAttestation, checkIdeatorTermsAttestation, checkBothPlatformAttestations]
  );

  /**
   * Main function to check attestation status for access control
   */
  const checkAttestationStatus = useCallback(
    async (
      userAddress: string,
      requiredLevel: NDAAthestationLevel,
      ideaId?: string
    ): Promise<AttestationStatus> => {
      setIsLoading(true);
      setError(null);

      try {
        // Get user's current attestation levels
        const userLevels = await refreshAttestations(userAddress);

        // For idea-specific NDA, check that separately
        if (requiredLevel === NDAAthestationLevel.IDEA_SPECIFIC_NDA && ideaId) {
          const hasIdeaNda = await checkIdeaNdaAttestation(userAddress, ideaId);
          if (hasIdeaNda) {
            userLevels.push(NDAAthestationLevel.IDEA_SPECIFIC_NDA);
          }
        }

        // Check if user satisfies the required level
        const isValid = userLevels.includes(requiredLevel);

        // Determine missing requirements
        const missingRequirements: string[] = [];
        if (!isValid) {
          switch (requiredLevel) {
            case NDAAthestationLevel.PLATFORM_NDA:
              missingRequirements.push('Platform NDA attestation required');
              break;
            case NDAAthestationLevel.IDEATOR_TERMS:
              missingRequirements.push('Ideator Terms attestation required');
              break;
            case NDAAthestationLevel.BOTH_PLATFORM:
              missingRequirements.push('Both Platform NDA and Ideator Terms required');
              break;
            case NDAAthestationLevel.IDEA_SPECIFIC_NDA:
              missingRequirements.push('Idea-specific NDA attestation required');
              break;
          }
        }

        const status: AttestationStatus = {
          isValid,
          requiredLevel,
          userLevels,
          missingRequirements,
          lastChecked: new Date(),
        };

        return status;
      } catch (error) {
        console.error('Error checking attestation status:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to check attestation status';
        setError(errorMessage);
        addNotification(errorMessage, 'error');

        return {
          isValid: false,
          requiredLevel,
          userLevels: [NDAAthestationLevel.NONE],
          missingRequirements: ['Unable to verify attestation status'],
          lastChecked: new Date(),
        };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshAttestations, checkIdeaNdaAttestation, addNotification]
  );

  return {
    checkAttestationStatus,
    isLoading,
    error,
    clearError,
    refreshAttestations,
  };
}; 