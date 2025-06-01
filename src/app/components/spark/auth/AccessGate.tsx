/**
 * Spark Platform - AccessGate Component
 * 
 * Core access control wrapper that verifies NDA attestations before granting content access.
 * All protected content on the Spark platform should be wrapped with this component.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { NDAAthestationLevel } from './types/access-control';
import { useAttestationVault } from './hooks/useAttestationVault';
import AccessRequiredPrompt from './components/AccessControl/AccessRequiredPrompt';
import UnauthorizedAccess from './components/AccessControl/UnauthorizedAccess';
import AccessVerificationLoader from './components/AccessControl/AccessVerificationLoader';

interface AccessGateProps {
  children: React.ReactNode;
  requiredAccess: NDAAthestationLevel | NDAAthestationLevel[];
  ideaId?: string;
  fallback?: React.ReactNode;
  showPrompt?: boolean;
  className?: string;
}

interface AccessStatus {
  hasAccess: boolean;
  requiredLevel?: NDAAthestationLevel;
  loading: boolean;
  error?: string;
}

export const AccessGate: React.FC<AccessGateProps> = ({
  children,
  requiredAccess,
  ideaId,
  fallback,
  showPrompt = true,
  className
}) => {
  const { state: walletState } = useWallet();
  const networkInfo = useNetworkInfo();
  const { checkAttestationStatus } = useAttestationVault();
  
  const [accessStatus, setAccessStatus] = useState<AccessStatus>({
    hasAccess: false,
    loading: true
  });

  const verifyAccess = useCallback(async () => {
    // Reset state
    setAccessStatus({ hasAccess: false, loading: true });

    // Check wallet connection
    if (!walletState.address) {
      setAccessStatus({ 
        hasAccess: false, 
        loading: false,
        error: 'Wallet not connected'
      });
      return;
    }

    // Check network configuration
    if (!networkInfo?.attestationVault) {
      setAccessStatus({ 
        hasAccess: false, 
        loading: false,
        error: 'Network configuration not loaded'
      });
      return;
    }

    try {
      const requiredLevels = Array.isArray(requiredAccess) ? requiredAccess : [requiredAccess];
      
      // Check each required access level
      for (const level of requiredLevels) {
        const attestationStatus = await checkAttestationStatus(walletState.address, level, ideaId);
        
        if (attestationStatus.isValid) {
          setAccessStatus({ hasAccess: true, loading: false });
          return;
        }
      }

      // Find the first required level the user doesn't have
      const missingLevel = requiredLevels[0];
      setAccessStatus({ 
        hasAccess: false, 
        requiredLevel: missingLevel,
        loading: false 
      });

    } catch (error) {
      console.error('Access verification failed:', error);
      setAccessStatus({ 
        hasAccess: false, 
        loading: false,
        error: error instanceof Error ? error.message : 'Access verification failed'
      });
    }
  }, [walletState.address, requiredAccess, ideaId, networkInfo, checkAttestationStatus]);

  useEffect(() => {
    verifyAccess();
  }, [verifyAccess]);

  // Show loading state
  if (accessStatus.loading) {
    return (
      <div className={className}>
        <AccessVerificationLoader />
      </div>
    );
  }

  // Show error state
  if (accessStatus.error) {
    return (
      <div className={className}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Access Verification Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{accessStatus.error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={verifyAccess}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Retry Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grant access if authorized
  if (accessStatus.hasAccess) {
    return <div className={className}>{children}</div>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  // Show access required prompt if configured
  if (showPrompt && accessStatus.requiredLevel) {
    return (
      <div className={className}>
        <AccessRequiredPrompt
          requiredLevel={accessStatus.requiredLevel}
          ideaId={ideaId}
          onSuccess={verifyAccess}
          currentUserAddress={walletState.address || undefined}
        />
      </div>
    );
  }

  // Show unauthorized access screen
  return (
    <div className={className}>
      <UnauthorizedAccess 
        requiredAccess={requiredAccess} 
        userAddress={walletState.address || undefined}
        onRetry={verifyAccess}
      />
    </div>
  );
};

export default AccessGate; 