/**
 * Utility functions for managing browser cache and storage
 */

// Check if we're running in the browser
const isBrowser = typeof window !== 'undefined';

/**
 * Attempts to clear browser caches that might be affecting CSP
 * This is a best-effort function as browsers restrict what JavaScript can clear
 */
export async function clearBrowserCaches(): Promise<boolean> {
  if (!isBrowser) return false;
  
  try {
    // Clear localStorage items related to WalletConnect
    const keysToRemove = [
      'walletconnect',
      'WALLETCONNECT_DEEPLINK_CHOICE',
      'wc@2',
      'wagmi.store',
      'wagmi.wallet',
      'wagmi.connected',
      'wagmi.injected',
      'wagmi.walletconnect',
      'csp-version'
    ];

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove ${key} from localStorage:`, e);
      }
    });

    // Store the current CSP version in localStorage
    try {
      localStorage.setItem('csp-version', '1.0.1');
    } catch (e) {
      console.warn('Failed to set CSP version in localStorage:', e);
    }

    // Clear service worker caches if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          return caches.delete(cacheName);
        })
      );
      console.log('Cache storage cleared');
    }

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('Service workers unregistered');
    }

    return true;
  } catch (error) {
    console.error('Error clearing browser caches:', error);
    return false;
  }
}

/**
 * Checks if the browser needs a refresh based on CSP version
 * @returns True if refresh is needed
 */
export function needsRefreshForCSP(): boolean {
  if (!isBrowser) return false;
  
  try {
    const storedVersion = localStorage.getItem('csp-version');
    const currentVersion = '1.0.1'; // Keep in sync with CSP_VERSION in securityHeaders.ts
    
    // If no stored version or versions don't match, refresh is needed
    if (!storedVersion || storedVersion !== currentVersion) {
      return true;
    }
    
    return false;
  } catch (e) {
    // If we can't access localStorage, assume refresh is needed
    return true;
  }
}

/**
 * Performs a hard refresh of the page
 * This bypasses the cache and reloads all resources
 */
export function performHardRefresh(): void {
  if (!isBrowser) return;
  
  // Force a hard refresh by using location.reload()
  // Note: The boolean parameter is deprecated in modern browsers
  // but we're using the most compatible approach
  try {
    // Try modern approach first
    window.location.reload();
  } catch (e) {
    console.warn('Error during page reload:', e);
    // Fallback to alternative refresh method
    window.location.href = window.location.href;
  }
} 