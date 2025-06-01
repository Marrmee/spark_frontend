'use client';

import React, { useEffect, useState } from 'react';
import { clearBrowserCaches, needsRefreshForCSP, performHardRefresh } from '@/app/utils/cacheCleaner';

/**
 * Component that detects CSP issues and prompts the user to refresh
 * This helps resolve issues with cached CSP policies
 */
const CspRefreshPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [cspErrors, setCspErrors] = useState<string[]>([]);
  const [hasCheckedVersion, setHasCheckedVersion] = useState(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Check if already dismissed for this session
    const isDismissed = sessionStorage.getItem('cspPromptDismissed') === 'true';
    if (isDismissed) return;

    // Check if we need a refresh based on CSP version
    const checkCspVersion = () => {
      if (!hasCheckedVersion) {
        const needsRefresh = needsRefreshForCSP();
        if (needsRefresh) {
          setShowPrompt(true);
        }
        setHasCheckedVersion(true);
      }
    };

    // Run the check after a short delay to ensure the page is fully loaded
    const timeoutId = setTimeout(checkCspVersion, 1000);

    // Listen for CSP violation reports
    const handleCspViolation = (e: SecurityPolicyViolationEvent) => {
      // Only show the prompt for connect-src violations which are likely related to our issue
      if (e.violatedDirective === 'connect-src' || e.violatedDirective === 'script-src') {
        const violationMessage = `CSP violation: ${e.violatedDirective} from ${e.blockedURI}`;
        console.warn(violationMessage);
        
        setCspErrors(prev => {
          // Only add unique errors
          if (!prev.includes(violationMessage)) {
            return [...prev, violationMessage];
          }
          return prev;
        });
        
        // Only show if not dismissed
        if (!sessionStorage.getItem('cspPromptDismissed')) {
          setShowPrompt(true);
        }
      }
    };

    document.addEventListener('securitypolicyviolation', handleCspViolation);

    return () => {
      document.removeEventListener('securitypolicyviolation', handleCspViolation);
      clearTimeout(timeoutId);
    };
  }, [hasCheckedVersion]);

  const handleClearAndRefresh = async () => {
    setIsClearing(true);
    try {
      await clearBrowserCaches();
      // Short delay to ensure everything is cleared
      setTimeout(() => {
        performHardRefresh();
      }, 500);
    } catch (error) {
      console.error('Error during cache clearing:', error);
      setIsClearing(false);
    }
  };

  const handleDismiss = () => {
    // Save dismissal in session storage
    sessionStorage.setItem('cspPromptDismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Connection Issues Detected</h2>
        
        <p className="text-gray-300 mb-4">
          We have detected some connection issues that may be caused by outdated browser data.
          Clearing your cache and refreshing the page can help resolve these issues.
        </p>
        
        {cspErrors.length > 0 && (
          <div className="mb-4 max-h-32 overflow-y-auto bg-gray-900 p-2 rounded text-xs text-gray-400">
            <p className="font-semibold mb-1">Technical details:</p>
            <ul className="list-disc pl-4">
              {cspErrors.slice(0, 3).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
              {cspErrors.length > 3 && (
                <li>...and {cspErrors.length - 3} more errors</li>
              )}
            </ul>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={handleClearAndRefresh}
            disabled={isClearing}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium disabled:opacity-50 flex-1"
          >
            {isClearing ? 'Clearing...' : 'Clear Cache & Refresh'}
          </button>
          
          <button
            onClick={handleDismiss}
            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md font-medium flex-1"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default CspRefreshPrompt; 