'use client';

import { useEffect, useRef } from 'react';
import { extensionConnection } from '@/app/utils/extensionConnection';
import Script from 'next/script';
import { validateNonce } from '@/app/utils/securityUtils';

/**
 * ServiceWorkerRegistration component
 * 
 * This component handles service worker registration and cleanup.
 * It ensures that any stale service workers are properly unregistered
 * to prevent conflicts with wallet connections.
 */
interface ServiceWorkerRegistrationProps {
  nonce: string;
}

export default function ServiceWorkerRegistration({ nonce }: ServiceWorkerRegistrationProps) {
  // Keep track of retry attempts to avoid infinite loops
  const retryAttemptsRef = useRef(0);
  const maxRetries = 3;
  
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Store the nonce in sessionStorage for service worker validation
    // This helps prevent unauthorized service worker operations
    sessionStorage.setItem('sw_nonce', nonce);

    const cleanupServiceWorkers = async () => {
      try {
        // Get all service worker registrations
        const registrations = await navigator.serviceWorker.getRegistrations();
        
        // Check if there are any service workers to clean up
        if (registrations.length > 0) {
          console.log(`Found ${registrations.length} service worker registrations to clean up`);
          
          // Unregister all service workers
          const unregisterPromises = registrations.map(registration => {
            console.log(`Unregistering service worker for: ${registration.scope}`);
            return registration.unregister();
          });
          
          await Promise.all(unregisterPromises);
          console.log('Service worker cleanup completed');
          
          // Clear any related localStorage items that might be causing issues
          // Add nonce to any new items for later validation
          const keysToRemove = ['walletconnect', 'WALLETCONNECT_DEEPLINK_CHOICE', 'silk_'];
          keysToRemove.forEach(keyPrefix => {
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith(keyPrefix)) {
                console.log(`Removing localStorage item: ${key}`);
                localStorage.removeItem(key);
              }
            });
          });
          
          // Store cleanup timestamp with nonce for validation
          localStorage.setItem('sw_cleanup_timestamp', `${Date.now()}:${nonce}`);
        } else {
          console.log('No service workers to clean up');
        }
      } catch (error) {
        console.error('Error cleaning up service workers:', error);
      }
    };

    // Handle Silk wallet ping timeouts
    const handleSilkWalletPingTimeout = () => {
      // Create a global error handler for Silk wallet ping timeouts
      const originalOnError = window.onerror;
      
      window.onerror = function(message, source, lineno, colno, error) {
        // Check if the error is related to Silk wallet ping timeout
        if (message && (
            (typeof message === 'string' && message.includes('Wallet ping timed out')) ||
            (error && error.message && error.message.includes('Wallet ping timed out'))
          )) {
          console.warn('Intercepted Silk wallet ping timeout error');
          
          // Only retry if we haven't exceeded max retries
          if (retryAttemptsRef.current < maxRetries) {
            retryAttemptsRef.current++;
            console.log(`Attempting to recover from Silk wallet timeout (Attempt ${retryAttemptsRef.current}/${maxRetries})`);
            
            // Clear any stale wallet connection data
            const silkKeys = Object.keys(localStorage).filter(key => key.startsWith('silk_'));
            silkKeys.forEach(key => localStorage.removeItem(key));
            
            // Try to reset iframe communication
            const silkIframes = document.querySelectorAll('iframe[src*="silk"]');
            silkIframes.forEach(iframe => {
              // Remove and re-add the iframe to reset communication
              const parent = iframe.parentNode;
              if (parent) {
                const newIframe = iframe.cloneNode(true);
                parent.replaceChild(newIframe, iframe);
              }
            });
            
            // Store retry attempt with nonce for validation
            localStorage.setItem('silk_retry_attempt', `${retryAttemptsRef.current}:${nonce}`);
            
            // Prevent the error from propagating
            return true;
          }
        }
        
        // Call the original error handler for other errors
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        
        // Let other errors propagate normally
        return false;
      };
      
      // Also listen for unhandled promise rejections related to wallet timeouts
      const handleUnhandledRejection = (event) => {
        if (event.reason && 
            (event.reason.message?.includes('Wallet ping timed out') || 
             event.reason.toString().includes('Wallet ping timed out'))) {
          console.warn('Intercepted unhandled promise rejection for wallet ping timeout');
          
          // Only retry if we haven't exceeded max retries
          if (retryAttemptsRef.current < maxRetries) {
            retryAttemptsRef.current++;
            console.log(`Attempting to recover from wallet timeout (Attempt ${retryAttemptsRef.current}/${maxRetries})`);
            
            // Prevent the error from showing in console
            event.preventDefault();
            
            // Store retry attempt with nonce for validation
            localStorage.setItem('wallet_retry_attempt', `${retryAttemptsRef.current}:${nonce}`);
            
            // Attempt to retry the wallet connection
            setTimeout(() => {
              // If window.ethereum exists, try to request accounts again
              if (window.ethereum) {
                window.ethereum.request({ method: 'eth_requestAccounts' })
                  .catch(err => console.warn('Retry attempt failed:', err));
              }
              
              // For Silk wallet, try to find and click the connect button again
              const buttons = document.querySelectorAll('button');
              const connectButtons = Array.from(buttons).filter(btn => {
                const testId = btn.getAttribute('data-testid');
                const text = btn.textContent?.toLowerCase() || '';
                return (testId && testId.toLowerCase().includes('connect')) || 
                       text.includes('connect');
              });
              
              if (connectButtons.length > 0) {
                // Click the first matching connect button
                (connectButtons[0] as HTMLButtonElement).click();
              }
            }, 1000);
          }
        }
      };
      
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      
      return () => {
        window.onerror = originalOnError;
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    };

    // Validate any existing service worker data using the nonce
    const validateServiceWorkerData = () => {
      const storedNonce = sessionStorage.getItem('sw_nonce');
      if (storedNonce && !validateNonce(storedNonce, nonce)) {
        console.warn('Service worker nonce validation failed, clearing potentially compromised data');
        // Clear potentially compromised data
        ['sw_cleanup_timestamp', 'silk_retry_attempt', 'wallet_retry_attempt'].forEach(key => {
          localStorage.removeItem(key);
        });
        sessionStorage.removeItem('sw_nonce');
      }
    };

    // Set up extension connection
    extensionConnection.connect('poscidondao');

    // Validate existing service worker data
    validateServiceWorkerData();

    // Clean up service workers on component mount
    cleanupServiceWorkers();

    // Set up the error handlers
    const cleanup = handleSilkWalletPingTimeout();

    // Cleanup function
    return () => {
      if (cleanup) cleanup();
      extensionConnection.disconnect('poscidondao');
    };
  }, [nonce]); // Add nonce to dependency array to ensure effect runs if nonce changes

  // This component renders a script with the nonce for service worker operations
  return (
    <Script
      id="service-worker-operations"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          // This script helps with service worker operations
          window.validateServiceWorker = function(storedData) {
            if (!storedData) return false;
            const parts = storedData.split(':');
            if (parts.length !== 2) return false;
            
            // The second part should be the nonce
            const storedNonce = parts[1];
            const currentNonce = "${nonce}";
            
            // Simple validation - in production would use constant-time comparison
            return storedNonce === currentNonce;
          };
        `
      }}
    />
  );
} 