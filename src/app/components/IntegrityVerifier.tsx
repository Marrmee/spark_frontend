'use client';

import { useEffect, useState } from 'react';
import { verifyAllScripts, reportIntegrityViolation, isTrustedDevEnvironment, isWalletBrowser, getVerificationFailures, createDebugReport } from '../utils/integrityVerification';
import { SecurityEventType, logSecurityEvent } from '@/app/utils/securityMonitoring';
import { validateNonce } from '@/app/utils/securityUtils';

interface IntegrityManifest {
  [key: string]: string; // filename: hash
}

interface IntegrityVerifierProps {
  nonce?: string;
}

/**
 * Component that verifies the integrity of JavaScript files on the client side
 * This helps detect if any JavaScript files have been tampered with, similar to
 * what happened in the Safe Wallet hack
 */
const IntegrityVerifier: React.FC<IntegrityVerifierProps> = ({ nonce }) => {
  const [integrityStatus, setIntegrityStatus] = useState<'loading' | 'verified' | 'failed'>('loading');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isRelaxedMode, setIsRelaxedMode] = useState<boolean>(false);
  const [isWallet, setIsWallet] = useState<boolean>(false);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Enable debug mode with a special URL parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const debug = urlParams.get('integrity_debug') === 'true';
      setDebugMode(debug);
    }
  }, []);

  useEffect(() => {
    async function checkIntegrity() {
      try {
        // Check if we're in a trusted development environment
        const relaxedMode = isTrustedDevEnvironment();
        setIsRelaxedMode(relaxedMode);
        
        // Check if we're in a wallet browser
        const walletBrowser = isWalletBrowser();
        setIsWallet(walletBrowser);
        
        // // Skip integrity checks in development mode
        // const isDevelopment = process.env.NODE_ENV_NO === 'development';

        // // ADDED: Skip integrity checks completely until manifest issue is fixed
        // if (isDevelopment) {
        //   console.log('Skipping integrity checks temporarily');
        //   setIntegrityStatus('verified');
          
        //   // Store the verification result with nonce for validation
        //   if (typeof window !== 'undefined') {
        //     sessionStorage.setItem('integrity_status', `verified:${nonce}`);
        //   }
        //   return;
        // }
        
        // Validate any previously stored integrity status using the nonce
        if (typeof window !== 'undefined') {
          const storedStatus = sessionStorage.getItem('integrity_status');
          if (storedStatus) {
            const [storedNonce] = storedStatus.split(':');
            
            // If the nonce doesn't match, clear the stored status as it might be compromised
            if (storedNonce && nonce && !validateNonce(storedNonce, nonce)) {
              console.warn('Integrity status nonce validation failed, clearing potentially compromised data');
              sessionStorage.removeItem('integrity_status');
              // Force a new integrity check
            }
          }
        }
        
        // Log the environment information
        console.log(`Running integrity checks in ${relaxedMode ? 'relaxed' : 'strict'} mode`);
        console.log(`Current hostname: ${window.location.hostname}`);
        console.log(`Wallet browser detected: ${walletBrowser}`);
        console.log(`User agent: ${navigator.userAgent}`);
        console.log(`Debug mode: ${debugMode}`);
        
        // Fetch the integrity manifest
        const manifestResponse = await fetch('/integrity-manifest.json');
        if (!manifestResponse.ok) {
          const error = `Failed to load integrity manifest: ${manifestResponse.status} ${manifestResponse.statusText}`;
          
          // Log the security event with nonce hash for verification
          await logSecurityEvent(
            SecurityEventType.INTEGRITY_VIOLATION,
            {
              error,
              manifestUrl: '/integrity-manifest.json',
              status: manifestResponse.status,
              relaxedMode,
              isWalletBrowser: walletBrowser,
              userAgent: navigator.userAgent,
              nonceHash: crypto.subtle ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce)).then(hash => 
                Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
              ) : undefined
            },
            relaxedMode || walletBrowser ? 'medium' : 'high'
          );
          
          // In relaxed mode or wallet browsers, don't fail on manifest loading issues
          if (relaxedMode || walletBrowser) {
            console.warn(error);
            setIntegrityStatus('verified');
            
            // Store the verification result with nonce for validation
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('integrity_status', `verified:${nonce}`);
            }
            return;
          }
          
          throw new Error(error);
        }
        
        const manifest: IntegrityManifest = await manifestResponse.json();
        
        // Verify all scripts against the manifest
        const isVerified = await verifyAllScripts(manifest);
        
        if (isVerified) {
          setIntegrityStatus('verified');
          
          // Store the verification result with nonce for validation
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('integrity_status', `verified:${nonce}`);
          }
        } else {
          // Get detailed failure information
          const failures = getVerificationFailures();
          
          // Create a debug report
          const report = createDebugReport(nonce);
          setDebugInfo(report);
          
          // In relaxed mode or wallet browsers, we log warnings but don't show the error UI
          if (relaxedMode || walletBrowser) {
            console.warn(`Script integrity verification failed, but running in ${relaxedMode ? 'relaxed mode' : 'wallet browser mode'}`);
            console.warn('Verification failures:', failures);
            setIntegrityStatus('verified');
            
            // Store the verification result with nonce for validation
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('integrity_status', `verified:${nonce}`);
            }
            
            // Log the event with lower severity
            await logSecurityEvent(
              SecurityEventType.INTEGRITY_VIOLATION,
              {
                error: `Script integrity verification failed (${relaxedMode ? 'relaxed mode' : 'wallet browser'})`,
                manifestUrl: '/integrity-manifest.json',
                userAgent: navigator.userAgent,
                hostname: window.location.hostname,
                isWalletBrowser: walletBrowser,
                timestamp: new Date().toISOString(),
                failures,
                nonceHash: report.nonceHash
              },
              'medium'
            );
          } else {
            setIntegrityStatus('failed');
            
            // Create a more detailed error message
            const failureDetails = failures.map(f => 
              `${f.filename}: ${f.reason}`
            ).join('\n');
            
            setErrorDetails(
              `Script integrity verification failed. This could indicate a security issue.\n\n` +
              `Failed scripts:\n${failureDetails}`
            );
            
            // Log the security event with more details
            await logSecurityEvent(
              SecurityEventType.INTEGRITY_VIOLATION,
              {
                error: 'Script integrity verification failed',
                manifestUrl: '/integrity-manifest.json',
                userAgent: navigator.userAgent,
                hostname: window.location.hostname,
                isWalletBrowser: walletBrowser,
                timestamp: new Date().toISOString(),
                failures,
                nonceHash: report.nonceHash
              },
              'critical'
            );
            
            // Report the integrity violation
            if (failures.length > 0) {
              // Report the first failure with details
              const firstFailure = failures[0];
              await reportIntegrityViolation(
                firstFailure.filename,
                firstFailure.expectedHash || 'unknown',
                firstFailure.actualHash,
                nonce
              );
            } else {
              // Generic report if no specific failures
              await reportIntegrityViolation(
                'multiple-files',
                'unknown',
                'unknown',
                nonce
              );
            }
          }
        }
      } catch (error) {
        // Check if we're in a trusted development environment or wallet browser
        const relaxedMode = isTrustedDevEnvironment();
        const walletBrowser = isWalletBrowser();
        
        // If we're in development mode, trusted environment, or wallet browser, don't show errors
        const isDevelopment = process.env.NEXT_PUBLIC_NODE_ENV === 'development';
        if (isDevelopment || relaxedMode || walletBrowser) {
          const environmentType = isDevelopment
            ? 'development mode' 
            : relaxedMode 
              ? 'trusted environment' 
              : 'wallet browser';
          
          console.log(`Integrity verification error in ${environmentType} (expected):`, error);
          setIntegrityStatus('verified');
          
          // Store the verification result with nonce for validation
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('integrity_status', `verified:${nonce}`);
          }
          return;
        }
        
        console.error('Integrity verification error:', error);
        setIntegrityStatus('failed');
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setErrorDetails(errorMessage);
        
        // Log the security event
        await logSecurityEvent(
          SecurityEventType.INTEGRITY_VIOLATION,
          {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : 'No stack trace',
            userAgent: navigator.userAgent,
            hostname: window.location.hostname,
            isWalletBrowser: walletBrowser,
            timestamp: new Date().toISOString(),
            nonceHash: crypto.subtle ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce)).then(hash => 
              Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
            ) : undefined
          },
          'high'
        );
      }
    }
    
    checkIntegrity();
  }, [debugMode, nonce]); // Add nonce to dependency array to ensure effect runs if nonce changes
  
  // Only render something visible if there's an integrity failure or in debug mode
  if (integrityStatus === 'loading') {
    return null;
  }
  
  if (integrityStatus === 'verified' && !debugMode) {
    return null;
  }
  
  // Debug mode UI
  if (debugMode && debugInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 overflow-auto">
        <div className="max-w-4xl w-full rounded-lg bg-white p-6 m-4 text-left shadow-xl max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Integrity Verification Debug</h2>
            <button 
              onClick={() => setDebugMode(false)}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
          
          <div className="mb-4 p-2 bg-gray-100 rounded">
            <p className="font-semibold">Environment: <span className="font-normal">{debugInfo.environment}</span></p>
            <p className="font-semibold">Hostname: <span className="font-normal">{debugInfo.hostname}</span></p>
            <p className="font-semibold">Wallet Browser: <span className="font-normal">{debugInfo.isWalletBrowser ? 'Yes' : 'No'}</span></p>
            <p className="font-semibold">Trusted Environment: <span className="font-normal">{debugInfo.isTrustedEnvironment ? 'Yes' : 'No'}</span></p>
            <p className="font-semibold">Status: <span className={`font-normal ${integrityStatus === 'failed' ? 'text-red-600' : 'text-green-600'}`}>
              {integrityStatus === 'failed' ? 'Failed' : 'Verified'}
            </span></p>
            {debugInfo.nonceHash && (
              <p className="font-semibold">Verification ID: <span className="font-normal">{debugInfo.nonceHash}</span></p>
            )}
          </div>
          
          {debugInfo.failures && debugInfo.failures.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-600">Verification Failures ({debugInfo.failures.length})</h3>
              <div className="overflow-auto max-h-[50vh] border border-gray-300 rounded">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Hash</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Hash</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {debugInfo.failures.map((failure: any, index: number) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-sm text-gray-900 font-mono break-all">{failure.filename}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{failure.reason}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 font-mono break-all">{failure.expectedHash || 'N/A'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 font-mono break-all">{failure.actualHash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Troubleshooting Steps</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Check if the manifest was generated after the final build</li>
                  <li>Verify that the CDN is not modifying JavaScript files</li>
                  <li>Ensure the build process is consistent between environments</li>
                  <li>Try regenerating the integrity manifest</li>
                  <li>Check for binary files that might be incorrectly processed</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-green-50 text-green-800 rounded">
              No integrity verification failures detected.
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-2">Raw Debug Data</h3>
            <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-[200px] text-xs">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }
  
  // Error UI
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
        <div className="max-w-md rounded-lg bg-red-50 p-6 text-center shadow-xl">
          <div className="mb-4 text-5xl">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-red-700">Security Alert</h2>
          <p className="mb-4 text-red-700">
            We&apos;ve detected a potential security issue with this application.
            {errorDetails && (
              <span className="block mt-2 text-sm text-left whitespace-pre-line">{errorDetails}</span>
            )}
          </p>
          <p className="text-sm text-gray-700">
            For your safety, please close this window and contact support.
          </p>
          {(isRelaxedMode || isWallet) && (
            <p className="mt-4 text-xs text-gray-500">
              Note: You are in a {isRelaxedMode ? 'development/staging environment' : 'wallet browser'} where this warning can be ignored.
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-red-200">
            <button
              onClick={() => setDebugMode(true)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            >
              Show Debug Information
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default IntegrityVerifier; 