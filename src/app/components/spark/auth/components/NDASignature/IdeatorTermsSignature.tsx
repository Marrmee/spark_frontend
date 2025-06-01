/**
 * Spark Platform - Ideator Terms Signature Component
 * 
 * Handles the signing process for the Ideator Terms agreement.
 * Integrates with DocuSign for enhanced security and legal compliance.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAttestationVault } from '../../hooks/useAttestationVault';
import { useWallet } from '@/app/context/WalletContext';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';

interface IdeatorTermsSignatureProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const IdeatorTermsSignature: React.FC<IdeatorTermsSignatureProps> = ({
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
  const [termsContent, setTermsContent] = useState('');
  const [docusignUrl, setDocusignUrl] = useState('');
  const [step, setStep] = useState<'loading' | 'review' | 'docusign' | 'complete'>('loading');

  useEffect(() => {
    loadTermsContent();
  }, []);

  const loadTermsContent = async () => {
    try {
      // Load Ideator Terms content
      const content = `
SPARK PLATFORM IDEATOR TERMS AGREEMENT

This Ideator Terms Agreement ("Agreement") governs the submission and management of ideas on the Spark platform.

1. IDEA SUBMISSION RIGHTS
By signing this agreement, you gain the right to:
- Submit research ideas to the platform for evaluation
- Manage your idea submissions and track their status
- Participate in the ideation and peer review process
- Receive proper attribution for your intellectual contributions
- Access ideator-specific platform features and tools

2. INTELLECTUAL PROPERTY OWNERSHIP
- You retain full ownership of your submitted ideas and intellectual property
- You grant Spark platform limited, non-exclusive rights for evaluation and potential funding
- Ideas may be subject to additional IP protection mechanisms upon approval
- Revenue sharing terms apply for funded and commercialized ideas
- Platform maintains confidentiality of your submissions until explicit consent

3. SUBMISSION REQUIREMENTS AND STANDARDS
You agree to:
- Submit only original ideas or ideas you have legal rights to submit
- Provide accurate, complete, and truthful information in all submissions
- Comply with platform submission guidelines and quality standards
- Maintain confidentiality of other users' ideas during review process
- Disclose any potential conflicts of interest or prior commitments

4. REVIEW AND EVALUATION PROCESS
- Ideas undergo rigorous peer review and due diligence evaluation
- Review outcomes include: Approved for funding, Rejected, or Pending further review
- Approved ideas may receive funding, development support, and commercialization assistance
- You may be required to sign additional agreements for funded ideas
- Appeal process available for disputed review outcomes

5. COMPENSATION AND REVENUE SHARING
- Revenue sharing applies to successfully commercialized ideas
- Specific compensation terms depend on funding agreements and idea complexity
- Transparent tracking and distribution through blockchain mechanisms
- Additional incentives for high-quality submissions and platform participation

6. IDEATOR RESPONSIBILITIES
You agree to:
- Respond promptly to review feedback and requests for clarification
- Participate in good faith during the evaluation process
- Maintain professional conduct in all platform interactions
- Support the collaborative nature of the research community

7. TERMINATION AND WITHDRAWAL
- This agreement remains in effect for all active idea submissions
- You may withdraw ideas subject to existing review obligations and agreements
- Platform reserves right to suspend access for violations of terms

By signing this agreement via DocuSign, you acknowledge understanding and agreement to these ideator terms.

IMPORTANT: Completion requires DocuSign signature followed by on-chain attestation.
      `;
      
      setTermsContent(content);
      setStep('review');
      
    } catch (error) {
      console.error('Failed to load terms content:', error);
      throw new Error('Unable to load terms content');
    }
  };

  const handleStartDocuSign = async () => {
    setStep('docusign');
    setIsSigning(true);
    
    try {
      if (!walletState.address) {
        throw new Error('Wallet not connected');
      }

      // Call DocuSign API endpoint for Ideator Terms
      const docusignResponse = await fetch('/api/docusign/create-embedded-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agreementType: 'PLATFORM_IDEATOR_TERMS',
          userAddress: walletState.address,
          ndaContent: termsContent,
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
      
      // Call the attestation function through API endpoint
      const attestationResponse = await fetch('/api/attestation/ideator-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading ideator terms...</p>
          </div>
        );

      case 'review':
        return (
          <>
            {/* Ideator Information */}
            <div className="p-6 border-b border-gray-200">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="font-semibold text-green-900">
                      Ideator Terms Agreement
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Terms and conditions for submitting ideas and participating in the ideation process.
                    </p>
                    <div className="text-xs text-green-600 mt-2 space-y-1">
                      <p>Agreement Type: Ideator Terms</p>
                      <p>Scope: Idea submission and management</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms Content */}
            <div className="p-6 max-h-64 overflow-y-auto">
              <h4 className="font-medium text-gray-900 mb-3">Terms Agreement</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {termsContent || 'Loading terms content...'}
                </pre>
              </div>
            </div>

            {/* Benefits highlight */}
            <div className="border-t border-gray-100 p-4 bg-green-50">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-green-900">Ideator Benefits</p>
                  <div className="text-green-700 mt-1">
                    <p>After signing, you can:</p>
                    <ul className="text-xs mt-1 space-y-1 list-disc list-inside">
                      <li>Submit research ideas for evaluation</li>
                      <li>Track idea status and reviews</li>
                      <li>Receive funding for approved ideas</li>
                      <li>Participate in revenue sharing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* DocuSign Notice */}
            <div className="border-t border-gray-100 p-4 bg-yellow-50">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-600 text-lg">📋</span>
                <div className="text-sm">
                  <p className="font-medium text-yellow-900">DocuSign Required</p>
                  <p className="text-yellow-700 mt-1">
                    This agreement requires legal signature via DocuSign. You&apos;ll be prompted to enter your 
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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">DocuSign in Progress</h3>
            <p className="text-gray-600 text-center mb-4">
              Please complete the DocuSign process. You&apos;ll be asked to enter your email and full name, 
              then provide your electronic signature.
            </p>
            {docusignUrl && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full max-w-md">
                <p className="text-sm text-green-700 mb-2">DocuSign URL:</p>
                <p className="text-xs font-mono text-green-600 break-all">{docusignUrl}</p>
              </div>
            )}
            <div className="mt-4">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
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
            <h3 className="text-lg font-semibold text-green-900 mb-2">Ideator Terms Signed Successfully</h3>
            <p className="text-green-700 text-center">
              You can now submit ideas and participate in the ideation process on Spark platform.
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
              Ideator Terms Agreement
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
            Sign this agreement to submit ideas and participate in the ideation process.
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
              disabled={isSigning || !termsContent || hookLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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

export default IdeatorTermsSignature; 