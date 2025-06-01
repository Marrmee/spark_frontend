/**
 * Spark Platform - Idea-Specific NDA Signature Component
 * 
 * Handles the signing process for idea-specific NDAs.
 * Integrates with DocuSign for enhanced security and legal compliance.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAttestationVault } from '../../hooks/useAttestationVault';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';

interface IdeaDetails {
  id: string;
  title: string;
  description: string;
  ideatorAddress: string;
  submissionDate: string;
  category: string;
}

interface IdeaNDASignatureProps {
  ideaId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const IdeaNDASignature: React.FC<IdeaNDASignatureProps> = ({
  ideaId,
  onSuccess,
  onCancel
}) => {
  const { state: walletState } = useWallet();
  const networkInfo = useNetworkInfo();
  const { 
    isLoading: hookLoading,
    error: hookError,
    clearError
  } = useAttestationVault();
  
  const [isSigning, setIsSigning] = useState(false);
  const [ideaDetails, setIdeaDetails] = useState<IdeaDetails | null>(null);
  const [ndaContent, setNdaContent] = useState('');
  const [docusignUrl, setDocusignUrl] = useState('');
  const [step, setStep] = useState<'loading' | 'review' | 'docusign' | 'complete'>('loading');

  const loadIdeaDetails = useCallback(async () => {
    try {
      if (!networkInfo?.sparkIdeaRegistry || !walletState.publicClient) {
        throw new Error('Network configuration not available');
      }

      // For now, create the idea details object since we don't have SparkIdeaRegistry ABI
      // This would be replaced with actual contract call when registry is available
      const ideaDetails: IdeaDetails = {
        id: ideaId,
        title: `Research Idea #${ideaId}`,
        description: 'Confidential research proposal requiring NDA signature',
        ideatorAddress: '0x742d35Cc6aB8323958F8D8877056b3b7b2F31B1A',
        submissionDate: new Date().toISOString(),
        category: 'Research Proposal'
      };
      
      setIdeaDetails(ideaDetails);
      
      // Generate dynamic NDA content based on actual idea data
      const ndaText = `
IDEA-SPECIFIC NON-DISCLOSURE AGREEMENT
Idea ID: ${ideaId}

This Idea-Specific Non-Disclosure Agreement ("Agreement") is entered into between PoSciDonDAO and the reviewer accessing confidential information for Idea #${ideaId}.

1. SPECIFIC CONFIDENTIAL INFORMATION
This agreement covers access to:
- Detailed research methodology for Idea #${ideaId}: "${ideaDetails.title}"
- Technical specifications and implementation details
- Preliminary research data and findings
- Proprietary algorithms or processes
- Commercial potential and market analysis

2. PURPOSE OF DISCLOSURE
Information is disclosed solely for:
- Peer review and evaluation
- Due diligence assessment
- Funding decision purposes
- Platform governance voting

3. RESTRICTIONS
Reviewer agrees to:
- Maintain strict confidentiality of all disclosed information
- Use information only for evaluation purposes
- Not reproduce, distribute, or share information
- Not use information for competing research
- Delete/destroy information upon request

4. TERM AND TERMINATION
- Agreement effective upon DocuSign completion
- Remains in effect for the duration of review process
- Obligations survive termination of access

5. LEGAL COMPLIANCE
This agreement is legally binding and enforceable under applicable laws.

IMPORTANT: Completion requires DocuSign signature followed by on-chain attestation.
      `;
      
      setNdaContent(ndaText);
      setStep('review');
      
    } catch (error) {
      console.error('Failed to load idea details:', error);
      throw new Error('Unable to load idea details');
    }
  }, [ideaId, networkInfo?.sparkIdeaRegistry, walletState.publicClient]);

  useEffect(() => {
    loadIdeaDetails();
  }, [loadIdeaDetails]);

  const handleStartDocuSign = async () => {
    setStep('docusign');
    setIsSigning(true);
    
    try {
      if (!walletState.address) {
        throw new Error('Wallet not connected');
      }

      // Call new embedded DocuSign API endpoint
      const docusignResponse = await fetch('/api/docusign/create-embedded-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaId,
          userAddress: walletState.address,
          ndaContent,
        }),
      });

      if (!docusignResponse.ok) {
        const errorData = await docusignResponse.json();
        throw new Error(errorData.details || 'Failed to create DocuSign envelope');
      }

      const { envelopeId, signingUrl } = await docusignResponse.json();
      setDocusignUrl(signingUrl);
      
      // Poll for DocuSign completion
      pollDocuSignStatus(envelopeId);
      
    } catch (error) {
      console.error('Failed to initiate DocuSign:', error);
      setIsSigning(false);
      throw error;
    }
  };

  const pollDocuSignStatus = async (envelopeId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`/api/docusign/check-status?envelopeId=${envelopeId}`);
        const { status, completed } = await statusResponse.json();
        
        if (completed || status === 'completed') {
          clearInterval(pollInterval);
          await handleDocuSignComplete(`envelope_${envelopeId}_completed`);
        }
      } catch (error) {
        console.error('Error polling DocuSign status:', error);
        clearInterval(pollInterval);
        setIsSigning(false);
      }
    }, 3000);

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isSigning) {
        setIsSigning(false);
        console.error('DocuSign polling timeout');
      }
    }, 600000);
  };

  const handleDocuSignComplete = async (docusignSignature: string) => {
    try {
      if (!networkInfo?.attestationVault || !walletState.address) {
        throw new Error('Wallet or network not properly configured');
      }

      console.log('DocuSign completed, submitting on-chain attestation');
      
      // Convert ideaId to bytes32 format
      const ideaIdBytes32 = ideaId.startsWith('0x') 
        ? ideaId 
        : `0x${ideaId.padStart(64, '0')}`;
      
      // Call the attestation function through API endpoint that handles contract interaction
      // This avoids complex viem TypeScript issues while maintaining real functionality
      const attestationResponse = await fetch('/api/attestation/idea-nda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ideaId: ideaIdBytes32,
          signature: docusignSignature,
          walletAddress: walletState.address,
          contractAddress: networkInfo.attestationVault,
        }),
      });

      if (!attestationResponse.ok) {
        throw new Error('Failed to submit attestation');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { transactionHash, status } = await attestationResponse.json();
      
      if (status === 'success') {
        setStep('complete');
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        throw new Error('Attestation transaction failed');
      }
    } catch (error) {
      console.error('Failed to submit on-chain attestation:', error);
      throw error;
    } finally {
      setIsSigning(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading idea details...</p>
          </div>
        );

      case 'review':
        return (
          <>
            {/* Idea Information */}
            <div className="p-6 border-b border-gray-200">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="font-semibold text-orange-900">
                      {ideaDetails?.title || `Idea #${ideaId}`}
                    </h3>
                    <p className="text-sm text-orange-700 mt-1">
                      {ideaDetails?.description || 'Confidential research idea requiring specific NDA'}
                    </p>
                    <div className="text-xs text-orange-600 mt-2 space-y-1">
                      <p>Idea ID: {ideaId}</p>
                      <p>Category: {ideaDetails?.category || 'Research'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* NDA Content */}
            <div className="p-6 max-h-64 overflow-y-auto">
              <h4 className="font-medium text-gray-900 mb-3">NDA Agreement</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {ndaContent || 'Loading NDA content...'}
                </pre>
              </div>
            </div>

            {/* DocuSign Notice */}
            <div className="border-t border-gray-100 p-4 bg-yellow-50">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-600 text-lg">📋</span>
                <div className="text-sm">
                  <p className="font-medium text-yellow-900">DocuSign Required</p>
                  <p className="text-yellow-700 mt-1">
                    This NDA requires legal signature via DocuSign. You&apos;ll be prompted to enter your 
                    email and full name during the signing process, followed by on-chain attestation.
                  </p>
                </div>
              </div>
            </div>
          </>
        );

      case 'docusign':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">DocuSign in Progress</h3>
            <p className="text-gray-600 text-center mb-4">
              Please complete the DocuSign process. You&apos;ll be asked to enter your email and full name, 
              then provide your electronic signature.
            </p>
            {docusignUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full max-w-md">
                <p className="text-sm text-blue-700 mb-2">DocuSign URL:</p>
                <p className="text-xs font-mono text-blue-600 break-all">{docusignUrl}</p>
              </div>
            )}
            <div className="mt-4">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">NDA Signed Successfully</h3>
            <p className="text-green-700 text-center">
              You now have access to the confidential content for Idea #{ideaId}.
            </p>
          </div>
        );
    }
  };

  // Show error state if hook has error
  if (hookError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-hidden">
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-600">
                <h3 className="font-semibold mb-2">Configuration Error</h3>
                <p className="text-sm mb-4">{hookError}</p>
                <button
                  onClick={clearError}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!networkInfo?.attestationVault) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-hidden">
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-600">
                <h3 className="font-semibold mb-2">Configuration Error</h3>
                <p className="text-sm">
                  AttestationVault contract address not configured. Please check network settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Idea-Specific NDA
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSigning}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Sign this NDA to access confidential information for Idea #{ideaId}.
          </p>
        </div>

        {/* Dynamic Content */}
        {renderContent()}

        {/* Actions */}
        {step === 'review' && (
          <div className="border-t border-gray-200 p-6 flex space-x-3">
            <button
              onClick={onCancel}
              disabled={isSigning}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleStartDocuSign}
              disabled={isSigning || !ndaContent || hookLoading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {(isSigning || hookLoading) && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>
                {isSigning ? 'Starting...' : 'Sign with DocuSign'}
              </span>
            </button>
          </div>
        )}

        {/* Contract Info */}
        {step !== 'loading' && (
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <div className="text-xs text-gray-600 text-center">
              <p>Contract: {networkInfo.attestationVault}</p>
              <p>Network: Base Sepolia Testnet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdeaNDASignature; 