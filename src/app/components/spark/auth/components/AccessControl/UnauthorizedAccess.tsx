/**
 * Spark Platform - Unauthorized Access Component
 * 
 * Component displayed when users lack the required NDA attestations for content access.
 * Follows existing PoSciDonDAO design system patterns.
 */

'use client';

import React from 'react';
import { NDAAthestationLevel } from '../../types/access-control';
import { ACCESS_CONTROL_RULES, getAccessLevelDisplayName } from '../../utils/access-rules';

interface UnauthorizedAccessProps {
  requiredAccess: NDAAthestationLevel | NDAAthestationLevel[];
  userAddress?: string;
  onRetry?: () => void;
  className?: string;
}

const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({
  requiredAccess,
  userAddress,
  onRetry,
  className = ''
}) => {
  const requiredLevels = Array.isArray(requiredAccess) ? requiredAccess : [requiredAccess];
  const primaryLevel = requiredLevels[0];
  const primaryRule = ACCESS_CONTROL_RULES[primaryLevel];

  const getAccessMessage = () => {
    if (requiredLevels.length === 1) {
      return `This content requires ${getAccessLevelDisplayName(primaryLevel)} access.`;
    }
    return `This content requires one of the following access levels: ${requiredLevels.map(getAccessLevelDisplayName).join(', ')}.`;
  };

  const getActionSuggestion = () => {
    switch (primaryLevel) {
      case NDAAthestationLevel.PLATFORM_NDA:
        return 'Please sign the Platform NDA to access this content.';
      case NDAAthestationLevel.IDEATOR_TERMS:
        return 'Please accept the Ideator Terms to access this feature.';
      case NDAAthestationLevel.IDEA_SPECIFIC_NDA:
        return 'Please sign the required idea-specific NDA to view this content.';
      case NDAAthestationLevel.BOTH_PLATFORM:
        return 'Please complete both platform agreements to access this content.';
      default:
        return 'Please complete the required agreements to access this content.';
    }
  };

  return (
    <div className={`unauthorized-access ${className}`}>
      <div className="flex flex-col items-center justify-center p-8 bg-seaBlue-1075 border border-highlightRed border-opacity-50 rounded-lg shadow-md">
        {/* Unauthorized icon */}
        <div className="flex items-center justify-center mb-6 w-16 h-16 bg-highlightRed bg-opacity-20 rounded-full">
          <svg className="w-8 h-8 text-highlightRed" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        </div>

        {/* Main content */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-acuminSemiBold text-white mb-3">
            Access Restricted
          </h3>
          <p className="text-sm text-gray-300 max-w-md leading-relaxed mb-4">
            {getAccessMessage()}
          </p>
          <p className="text-sm text-gray-400 max-w-md leading-relaxed">
            {getActionSuggestion()}
          </p>
        </div>

        {/* Required access level indicator */}
        <div className="mb-6 px-4 py-2 bg-seaBlue-1025 border border-highlightRed border-opacity-30 rounded-md">
          <span className="text-xs font-acuminMedium text-highlightRed uppercase tracking-wide">
            {primaryRule.description}
          </span>
        </div>

        {/* Access requirements list */}
        <div className="mb-6 bg-seaBlue-1025 border border-seaBlue-800 rounded-md p-4 max-w-md w-full">
          <h4 className="text-sm font-acuminSemiBold text-white mb-3">
            Required Access:
          </h4>
          <ul className="space-y-2">
            {requiredLevels.map((level) => {
              const rule = ACCESS_CONTROL_RULES[level];
              return (
                <li key={level} className="flex items-start text-xs text-gray-300">
                  <span className="text-highlightRed mr-2 mt-1">•</span>
                  <div>
                    <span className="font-acuminMedium">{getAccessLevelDisplayName(level)}</span>
                    <span className="text-gray-400 block">{rule.requirement}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#2D7FEA] px-6 py-3 text-white font-acuminSemiBold hover:bg-[#4B9BFF] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#2D7FEA] focus:ring-offset-2 focus:ring-offset-seaBlue-1075"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Again
            </button>
          )}
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 rounded-lg border border-seaBlue-800 px-6 py-3 text-gray-300 font-acuminSemiBold hover:bg-seaBlue-1025 hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-seaBlue-800 focus:ring-offset-2 focus:ring-offset-seaBlue-1075"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </div>

        {/* User info (if provided) */}
        {userAddress && (
          <div className="mt-6 text-xs text-gray-500 text-center">
            Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
          </div>
        )}

        {/* Help text */}
        <p className="mt-4 text-xs text-gray-400 text-center max-w-sm">
          Access permissions are verified on-chain to ensure secure content protection. 
          Complete the required agreements to unlock this content.
        </p>
      </div>
    </div>
  );
};

export default UnauthorizedAccess; 