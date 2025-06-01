/**
 * Spark Platform - Access Required Prompt
 * 
 * Component that prompts users to sign required NDAs for access.
 * Follows existing PoSciDonDAO design system patterns.
 */

'use client';

import React, { useState } from 'react';
import { NDAAthestationLevel } from '../../types/access-control';
import { ACCESS_CONTROL_RULES } from '../../utils/access-rules';
import AttestationModal from '@/app/components/general/AttestationModal';

interface AccessRequiredPromptProps {
  requiredLevel: NDAAthestationLevel;
  ideaId?: string;
  ideaTitle?: string;
  onSuccess: () => void;
  currentUserAddress?: string;
  className?: string;
}

const AccessRequiredPrompt: React.FC<AccessRequiredPromptProps> = ({
  requiredLevel,
  ideaId,
  ideaTitle,
  onSuccess,
  currentUserAddress,
  className = ''
}) => {
  const [showAttestationModal, setShowAttestationModal] = useState(false);

  // Get rule configuration for the required level
  const ruleConfig = ACCESS_CONTROL_RULES[requiredLevel];
  
  const handleAttestationSuccess = () => {
    setShowAttestationModal(false);
    onSuccess();
  };

  const getRequiredNdaType = () => {
    if (requiredLevel === NDAAthestationLevel.IDEA_SPECIFIC_NDA && ideaId) {
      return 'IDEA_SPECIFIC_NDA';
    }
    return 'PLATFORM_NDA';
  };

  const getAccessDescription = () => {
    switch (requiredLevel) {
      case NDAAthestationLevel.PLATFORM_NDA:
        return 'This content requires signing the Spark Platform NDA to proceed.';
      case NDAAthestationLevel.IDEA_SPECIFIC_NDA:
        return 'This idea requires signing an idea-specific NDA to view details.';
      case NDAAthestationLevel.IDEATOR_TERMS:
        return 'This feature requires accepting the Spark Ideator Terms and Conditions.';
      default:
        return 'Access to this content requires completing additional agreements.';
    }
  };

  const getActionButtonText = () => {
    switch (requiredLevel) {
      case NDAAthestationLevel.PLATFORM_NDA:
        return 'Sign Platform NDA';
      case NDAAthestationLevel.IDEA_SPECIFIC_NDA:
        return 'Sign Idea NDA';
      case NDAAthestationLevel.IDEATOR_TERMS:
        return 'Accept Terms';
      default:
        return 'Complete Agreement';
    }
  };

  return (
    <div className={`access-required-prompt ${className}`}>
      <div className="flex flex-col items-center justify-center p-8 bg-seaBlue-1075 border border-seaBlue-1025 rounded-lg shadow-md">
        {/* Access icon */}
        <div className="flex items-center justify-center mb-6 w-16 h-16 bg-[#2D7FEA] bg-opacity-20 rounded-full">
          <svg className="w-8 h-8 text-[#2D7FEA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Main content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-acuminSemiBold text-white mb-3">
            Access Agreement Required
          </h3>
          <p className="text-sm text-gray-300 max-w-md leading-relaxed">
            {getAccessDescription()}
          </p>
        </div>

        {/* Required level info */}
        <div className="mb-6 px-4 py-2 bg-seaBlue-1025 border border-seaBlue-800 rounded-md">
          <span className="text-xs font-acuminMedium text-[#2D7FEA] uppercase tracking-wide">
            {ruleConfig?.description || requiredLevel}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={() => setShowAttestationModal(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#2D7FEA] px-6 py-3 text-white font-acuminSemiBold hover:bg-[#4B9BFF] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#2D7FEA] focus:ring-offset-2 focus:ring-offset-seaBlue-1075"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {getActionButtonText()}
          </button>
        </div>

        {/* Help text */}
        <p className="mt-4 text-xs text-gray-400 text-center max-w-sm">
          By proceeding, you acknowledge that you understand the terms and agree to comply with the confidentiality requirements.
        </p>

        {/* User info (if provided) */}
        {currentUserAddress && (
          <div className="mt-4 text-xs text-gray-500">
            Wallet: {currentUserAddress.slice(0, 6)}...{currentUserAddress.slice(-4)}
          </div>
        )}
      </div>

      {/* Attestation Modal */}
      {showAttestationModal && (
        <AttestationModal
          isOpen={showAttestationModal}
          onClose={() => setShowAttestationModal(false)}
          onAttestationSuccess={handleAttestationSuccess}
          agreementType={getRequiredNdaType()}
          ideaId={ideaId}
          ideaTitle={ideaTitle}
        />
      )}
    </div>
  );
};

export default AccessRequiredPrompt; 