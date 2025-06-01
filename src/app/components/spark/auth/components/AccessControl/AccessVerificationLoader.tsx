/**
 * Spark Platform - Access Verification Loader
 * 
 * Loading component displayed while verifying NDA attestations.
 * Follows existing PoSciDonDAO design system patterns.
 */

'use client';

import React from 'react';

interface AccessVerificationLoaderProps {
  className?: string;
  message?: string;
}

const AccessVerificationLoader: React.FC<AccessVerificationLoaderProps> = ({
  className = '',
  message = 'Verifying access permissions...'
}) => {
  return (
    <div className={`access-verification-loader ${className}`}>
      <div className="flex flex-col items-center justify-center p-8 bg-seaBlue-100 border border-seaBlue-300 rounded-lg shadow-md">
        {/* Animated spinner - matches existing spinner pattern */}
        <div className="flex items-center justify-center mb-6">
          <div className="mx-2 block h-8 w-8 animate-spin rounded-full border-4 border-[#1B2885] border-t-transparent"></div>
        </div>
        
        {/* Loading message */}
        <div className="text-center">
          <h3 className="text-lg font-acuminSemiBold text-seaBlue-700 mb-3">
            Access Verification
          </h3>
          <p className="text-sm text-seaBlue-600 max-w-xs">
            {message}
          </p>
        </div>
        
        {/* Security indicator - matches existing icon patterns */}
        <div className="mt-6 flex items-center text-xs text-seaBlue-600 bg-seaBlue-50 px-3 py-2 rounded-md">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="font-acuminMedium">Checking blockchain attestations</span>
        </div>
      </div>
    </div>
  );
};

export default AccessVerificationLoader; 