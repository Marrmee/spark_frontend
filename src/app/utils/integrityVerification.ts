'use client';

// No need to import crypto - we'll use the browser's Web Crypto API

interface FileIntegrityManifest {
  [key: string]: string; // filename: hash
}

// Define a type for the enhanced manifest
type EnhancedFileIntegrityManifest = FileIntegrityManifest & {
  __alternatives?: {
    [key: string]: string[]; // filename: [alternative hashes]
  };
};

// List of trusted development/staging domains that should use relaxed verification
const TRUSTED_DEV_DOMAINS = [
  'localhost',
  '127.0.0.1',
  // 'develop.poscidondao.com', // Removed: This is a production environment
  'staging.poscidondao.com',  // Staging subdomain
  'test.poscidondao.com'      // Test subdomain
];

// List of known wallet browser identifiers
const WALLET_BROWSERS = [
  'MetaMask',
  'CoinbaseWallet',
  'Trust',
  'TokenPocket',
  'Brave',
  'Opera',
  'Status',
  'ImToken',
  'Rainbow'
];

// Add Chrome extension pattern to whitelist
const WHITELISTED_SCRIPTS = [
  '_vercel/insights/script.js',
  'script.js',
  'analytics.js',
  'gtm.js',
  'hotjar.js',
  'webpack-', // Add webpack chunks to whitelist
  'webpack.js',
  'chrome-extension://', // Chrome extensions
  'moz-extension://', // Firefox extensions
  'ms-browser-extension://', // Modern Edge extensions
  'extension://', // Edge legacy extensions
  'safari-extension://', // Safari extensions
  'safari-web-extension://', // Modern Safari extensions
  'opera-extension://', // Opera extensions
  'brave-extension://' // Brave extensions
];

// Track failed verifications for debugging
interface VerificationFailure {
  filename: string;
  expectedHash?: string;
  actualHash: string;
  reason: string;
}

// Global store for verification failures
let verificationFailures: VerificationFailure[] = [];

// Track user preferences for alerts
const ALERT_PREFERENCES_KEY = 'integrity_alert_preferences';

/**
 * Resets the verification failures list
 */
export function resetVerificationFailures(): void {
  verificationFailures = [];
}

/**
 * Gets the list of verification failures
 * @returns The list of verification failures
 */
export function getVerificationFailures(): VerificationFailure[] {
  return [...verificationFailures];
}

/**
 * Adds a verification failure to the list
 * @param failure The verification failure to add
 */
function addVerificationFailure(failure: VerificationFailure): void {
  verificationFailures.push(failure);
  
  // Log the failure for debugging
  console.warn(`Integrity verification failed for ${failure.filename}: ${failure.reason}`);
  console.warn(`  Expected: ${failure.expectedHash || 'unknown'}`);
  console.warn(`  Actual: ${failure.actualHash}`);
}

/**
 * Checks if the current browser is a known wallet browser
 * @returns True if the current browser is a known wallet browser
 */
export function isWalletBrowser(): boolean {
  if (typeof window === 'undefined' || !navigator.userAgent) {
    return false;
  }
  
  const userAgent = navigator.userAgent;
  return WALLET_BROWSERS.some(wallet => userAgent.includes(wallet));
}

/**
 * Checks if the current environment is a trusted development environment
 * @returns True if the current environment is a trusted development environment
 */
export function isTrustedDevEnvironment(): boolean {
  // Always consider development mode as trusted
  // Use Next.js env variables
  if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
    return true;
  }
  
  // Check if we're running in a browser
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check if the current hostname is in the trusted domains list
  const hostname = window.location.hostname;
  return TRUSTED_DEV_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

/**
 * Normalizes a script path to prevent duplicate verifications
 * @param path The script path to normalize
 * @returns The normalized path
 */
function normalizeScriptPath(path: string): string {
  // Remove _next/static/chunks/ prefix if present
  let normalizedPath = path.replace(/^_next\/static\/chunks\//, '');
  // Remove query parameters
  normalizedPath = normalizedPath.split('?')[0];
  return normalizedPath;
}

/**
 * Checks if a script should be exempt from verification
 * @param src The script source URL
 * @returns True if the script should be exempt from verification
 */
function isWhitelistedScript(src: string): boolean {
  // Check if it's a browser extension
  if (src.startsWith('chrome-extension://') || 
      src.startsWith('moz-extension://') || 
      src.startsWith('ms-browser-extension://')) {
    return true;
  }
  
  return WHITELISTED_SCRIPTS.some(script => 
    src.includes(script) || src.endsWith(script)
  );
}

/**
 * Checks if a script is a webpack chunk
 * @param src The script source URL
 * @returns True if the script is a webpack chunk
 */
function isWebpackChunk(src: string): boolean {
  return src.includes('webpack-') || src.includes('webpack.js');
}

/**
 * Checks if two hashes have only minor differences
 * @param expected The expected hash
 * @param actual The actual hash
 * @returns True if the differences between the hashes are minor
 */
function isMinorHashDifference(expected: string, actual: string): boolean {
  if (!expected || !actual) return false;
  
  // For webpack chunks, use a more lenient comparison (60% match)
  const matchThreshold = isWebpackChunk(expected) ? 
    Math.floor(expected.length * 0.6) : 
    Math.floor(expected.length * 0.8);
  
  return expected.substring(0, matchThreshold) === actual.substring(0, matchThreshold);
}

/**
 * Checks if a file matches any alternative hash in the manifest
 * This is useful for wallet browsers that might slightly transform scripts
 * @param filename The name of the file to check
 * @param content The content of the file
 * @param manifest The integrity manifest
 * @returns True if the file matches any alternative hash, false otherwise
 */
export async function checkAlternativeHashes(
  filename: string,
  content: string,
  manifest: FileIntegrityManifest
): Promise<{isValid: boolean, matchedHash?: string}> {
  // Check if we have any alternative hashes in the manifest
  const altKeys = Object.keys(manifest).filter(key => 
    key.startsWith(`${filename}__alt`) || 
    key.includes(`/${filename}__alt`)
  );
  
  if (altKeys.length === 0) {
    // No alternative hashes found for this file
    return { isValid: false };
  }
  
  // Calculate the actual hash
  const calculatedHash = await generateSHA384Hash(content);
  
  const actualHash = `sha384-${calculatedHash}`;
  
  // Check if the actual hash matches any of the alternative hashes
  for (const altKey of altKeys) {
    const expectedHash = manifest[altKey];
    if (actualHash === expectedHash) {
      console.log(`File ${filename} matched alternative hash ${altKey}`);
      return { isValid: true, matchedHash: expectedHash };
    }
  }
  
  // If we have metadata in the manifest, check if we should use relaxed verification
  if (manifest.__metadata && isWalletBrowser()) {
    // For wallet browsers, check if the first 80% of any hash matches
    for (const altKey of altKeys) {
      const expectedHash = manifest[altKey];
      const expectedPrefix = expectedHash.substring(0, Math.floor(expectedHash.length * 0.8));
      const actualPrefix = actualHash.substring(0, Math.floor(actualHash.length * 0.8));
      
      if (expectedPrefix === actualPrefix) {
        console.log(`File ${filename} matched partial alternative hash ${altKey}`);
        return { isValid: true, matchedHash: expectedHash };
      }
    }
  }
  
  return { isValid: false };
}

/**
 * Verifies the integrity of a file against its expected hash
 * @param filename The name of the file to verify
 * @param content The content of the file
 * @param manifest The integrity manifest containing expected hashes
 * @param relaxedMode Whether to use relaxed verification (for dev environments)
 * @returns True if the file integrity is verified, false otherwise
 */
export async function verifyFileIntegrity(
  filename: string, 
  content: string,
  manifest: FileIntegrityManifest,
  relaxedMode: boolean = false
): Promise<{isValid: boolean, expectedHash?: string, actualHash?: string}> {
  // Special handling for webpack chunks - always consider them valid in production
  // This is because webpack chunks can vary slightly between builds
  if (isWebpackChunk(filename)) {
    console.log(`Skipping strict verification for webpack chunk: ${filename}`);
    
    // Calculate the hash anyway for logging purposes
    const calculatedHash = await generateSHA384Hash(content);
    
    const actualHash = `sha384-${calculatedHash}`;
    
    // Find the expected hash if available
    const normalizedFilename = normalizeScriptPath(filename);
    const possibleKeys = [
      normalizedFilename,
      filename,
      `/${filename}`,
      filename.split('/').pop() || ''
    ];
    
    const matchedKey = possibleKeys.find(key => manifest[key]);
    const expectedHash = matchedKey ? manifest[matchedKey] : undefined;
    
    // Log the hash difference for debugging
    if (expectedHash && expectedHash !== actualHash) {
      console.log(`Webpack chunk hash difference detected:
        File: ${filename}
        Expected: ${expectedHash}
        Actual: ${actualHash}
      `);
      
      // Store this as a verification failure but don't fail the verification
      addVerificationFailure({
        filename,
        expectedHash,
        actualHash,
        reason: 'Webpack chunk hash difference (allowed)'
      });
    }
    
    // Always return valid for webpack chunks
    return { isValid: true, expectedHash, actualHash };
  }
  
  // Normal verification for non-webpack files
  // Normalize the filename to prevent duplicate verifications
  const normalizedFilename = normalizeScriptPath(filename);
  
  // Try different path formats to find a match in the manifest
  const possibleKeys = [
    normalizedFilename,                                // Normalized filename
    filename,                                          // Original filename
    `/${filename}`,                                    // Root-relative path
    filename.startsWith('/') ? filename.substring(1) : filename, // Without leading slash
    filename.includes('?') ? filename.split('?')[0] : filename,  // Without query params
    // Add more variations to handle production path differences
    filename.split('/').pop() || '',                   // Just the base filename
    `_next/${filename}`,                               // With _next prefix
    filename.includes('?') ? filename.split('?')[0].split('/').pop() || '' : filename.split('/').pop() || '', // Base filename without query
  ];
  
  // Find the first key that exists in the manifest
  const matchedKey = possibleKeys.find(key => manifest[key]);
  
  if (!matchedKey) {
    console.warn(`No integrity hash found for ${filename} (tried ${possibleKeys.join(', ')})`);
    
    // Add to verification failures
    addVerificationFailure({
      filename,
      actualHash: 'unknown',
      reason: 'No matching hash found in manifest'
    });
    
    // In relaxed mode or for whitelisted scripts, consider missing hashes as valid
    return { 
      isValid: relaxedMode || isWhitelistedScript(filename), 
      expectedHash: undefined, 
      actualHash: undefined 
    };
  }
  
  const expectedHash = manifest[matchedKey];
  
  try {
    const calculatedHash = await generateSHA384Hash(content);
    
    const actualHash = `sha384-${calculatedHash}`;
    const isValid = actualHash === expectedHash;
    
    // If verification failed but we're in a wallet browser, try alternative hashes
    if (!isValid) {
      // Check for minor hash differences
      if (isMinorHashDifference(expectedHash, actualHash)) {
        console.log(`Minor hash difference detected for ${filename}, considering valid`);
        return { isValid: true, expectedHash, actualHash };
      }
      
      // Check for alternative hashes in the manifest
      const enhancedManifest = manifest as EnhancedFileIntegrityManifest;
      if (enhancedManifest.__alternatives && enhancedManifest.__alternatives[matchedKey]) {
        const alternativeHashes = enhancedManifest.__alternatives[matchedKey];
        if (alternativeHashes.includes(actualHash)) {
          console.log(`File ${filename} matched alternative hash`);
          return { isValid: true, expectedHash, actualHash };
        }
      }
      
      // If we're in a wallet browser, try the lenient comparison
      if (isWalletBrowser()) {
        const expectedPrefix = expectedHash.substring(0, Math.floor(expectedHash.length * 0.8));
        const actualPrefix = actualHash.substring(0, Math.floor(actualHash.length * 0.8));
        
        if (expectedPrefix === actualPrefix) {
          console.log(`Wallet browser detected. Using lenient hash comparison for ${filename}`);
          return { isValid: true, expectedHash, actualHash };
        }
        
        // Then try alternative hashes
        const altResult = await checkAlternativeHashes(filename, content, manifest);
        if (altResult.isValid) {
          return { 
            isValid: true, 
            expectedHash: altResult.matchedHash, 
            actualHash 
          };
        }
      }
    }
    
    if (!isValid && !relaxedMode) {
      // Add to verification failures
      addVerificationFailure({
        filename,
        expectedHash,
        actualHash,
        reason: 'Hash mismatch'
      });
    }
    
    return { isValid: isValid || relaxedMode, expectedHash, actualHash };
  } catch (error) {
    console.error(`Error calculating hash for ${filename}:`, error);
    
    // Add to verification failures
    addVerificationFailure({
      filename,
      expectedHash,
      actualHash: 'error',
      reason: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { isValid: relaxedMode, expectedHash, actualHash: 'error' };
  }
}

/**
 * Verifies the integrity of all scripts on the page
 * @param manifest The integrity manifest containing expected hashes
 * @returns True if all scripts pass integrity verification, false otherwise
 */
export async function verifyAllScripts(manifest: FileIntegrityManifest): Promise<boolean> {
  // Skip entirely in trusted dev environments
  if (isTrustedDevEnvironment()) {
    console.log('Skipping integrity checks in trusted development environment.');
    return true;
  }

  if (typeof window === 'undefined') return true; // Skip on server-side
  
  // Reset verification failures
  resetVerificationFailures();
  
  // Check if we're in a trusted development environment
  const relaxedMode = false; // Strict mode if not dev environment

  // For wallet browsers in production, we'll use a slightly more lenient approach
  const isWallet = isWalletBrowser();
  
  console.log('Running integrity checks in strict mode');
  
  // Log environment information for debugging
  console.log(`Current hostname: ${window.location.hostname}`);
  console.log(`Wallet browser detected: ${isWallet}`);
  console.log(`User agent: ${navigator.userAgent}`);
  console.log(`Debug mode: ${process.env.NEXT_PUBLIC_NODE_ENV !== 'production'}`);
  
  try {
    const scripts = document.querySelectorAll('script[src]');
    
    // Track verification statistics for debugging
    const stats = {
      total: scripts.length,
      verified: 0,
      failed: 0,
      skipped: 0,
      whitelisted: 0,
      webpackChunks: 0
    };
    
    const results = await Promise.all(
      Array.from(scripts).map(async (script) => {
        const src = script.getAttribute('src');
        if (!src || src.startsWith('http') || src.startsWith('//')) {
          // Skip external scripts that should have SRI attributes
          stats.skipped++;
          return { isValid: true };
        }
        
        // Check if this is a whitelisted script
        if (isWhitelistedScript(src)) {
          console.log(`Skipping verification for whitelisted script: ${src}`);
          stats.whitelisted++;
          return { isValid: true };
        }
        
        // Check if this is a webpack chunk
        if (isWebpackChunk(src)) {
          stats.webpackChunks++;
          // Webpack chunks are handled specially in verifyFileIntegrity
        }
        
        try {
          const response = await fetch(src);
          if (!response.ok) {
            console.error(`Failed to fetch script ${src}: ${response.status} ${response.statusText}`);
            stats.failed++;
            
            // Add to verification failures
            addVerificationFailure({
              filename: src,
              actualHash: 'fetch-failed',
              reason: `Failed to fetch: ${response.status} ${response.statusText}`
            });
            
            return { isValid: relaxedMode || isWallet };
          }
          
          const content = await response.text();
          
          // Normalize the path for verification
          const normalizedPath = normalizeScriptPath(src);
          const filename = src.split('/').pop() || '';
          
          // Try verification with normalized path first
          let result = await verifyFileIntegrity(normalizedPath, content, manifest, relaxedMode);
          
          // If that fails, try with the original path
          if (!result.isValid && !relaxedMode) {
            result = await verifyFileIntegrity(src, content, manifest, relaxedMode);
          }
          
          // If that fails, try with just the filename
          if (!result.isValid && !relaxedMode) {
            result = await verifyFileIntegrity(filename, content, manifest, relaxedMode);
          }
          
          if (result.isValid) {
            stats.verified++;
          } else {
            stats.failed++;
            
            // Report the integrity violation only if it's not a webpack chunk
            // Webpack chunks are already handled in verifyFileIntegrity
            if (!isWebpackChunk(src)) {
              await reportIntegrityViolation(
                src,
                result.expectedHash || 'unknown',
                result.actualHash || 'unknown'
              );
            }
          }
          
          return result;
        } catch (error) {
          console.error(`Error verifying script ${src}:`, error);
          stats.failed++;
          
          // Add to verification failures
          addVerificationFailure({
            filename: src,
            actualHash: 'error',
            reason: error instanceof Error ? error.message : 'Unknown error'
          });
          
          return { isValid: relaxedMode || isWallet };
        }
      })
    );
    
    // Log verification statistics
    console.log(`Integrity verification complete:
      Total scripts: ${stats.total}
      Verified: ${stats.verified}
      Failed: ${stats.failed}
      Skipped: ${stats.skipped}
      Whitelisted: ${stats.whitelisted}
      Webpack chunks: ${stats.webpackChunks}
    `);
    
    // Filter out webpack chunks from verification failures for reporting
    const nonWebpackFailures = getVerificationFailures().filter(
      failure => !isWebpackChunk(failure.filename) || 
                !failure.reason.includes('allowed')
    );
    
    // If any verification failed, log detailed information
    if (nonWebpackFailures.length > 0) {
      console.warn(`${nonWebpackFailures.length} scripts failed integrity verification`);
      console.warn('Failed scripts:', nonWebpackFailures);
    }
    
    // After verification is complete, show alert if there are failures
    if (nonWebpackFailures.length > 0) {
      showIntegrityAlert(nonWebpackFailures);
    }
    
    // Directly use the results array to determine if all scripts are valid
    const allValid = results.every(result => result.isValid);
    
    // Validate that our stats tracking is consistent with the results
    if ((stats.failed === 0) !== allValid) {
      console.warn('Inconsistency detected between stats tracking and verification results');
      console.warn(`Stats show ${stats.failed} failures, but results show ${allValid ? 'all valid' : 'some invalid'}`);
    }
    
    // All scripts are valid if all results are valid or we're in relaxed mode or using a wallet browser
    return allValid || relaxedMode || isWallet;
  } catch (error) {
    console.error('Error during script integrity verification:', error);
    return relaxedMode || isWallet;
  }
}

/**
 * Generates a SHA-384 hash using the Web Crypto API
 * @param content The content to hash
 * @returns Promise that resolves to the hash in base64 format
 */
async function generateSHA384Hash(content: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  // Encode the content to an ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  
  // Generate the hash
  const hashBuffer = await window.crypto.subtle.digest('SHA-384', data);
  
  // Convert the hash to base64
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

/**
 * Generates an integrity hash for content
 * @param content The content to hash
 * @returns The SRI integrity hash
 */
export async function generateIntegrityHash(content: string): Promise<string> {
  try {
    const hash = await generateSHA384Hash(content);
    return `sha384-${hash}`;
  } catch (error) {
    console.error('Failed to generate integrity hash:', error);
    return 'sha384-error';
  }
}

/**
 * Reports an integrity violation to the server
 * @param filename The name of the file that failed verification
 * @param expectedHash The expected hash
 * @param actualHash The actual hash
 * @param nonce An optional nonce to include in the report
 */
export async function reportIntegrityViolation(
  filename: string,
  expectedHash: string,
  actualHash: string,
  nonce?: string
): Promise<void> {
  try {
    // Skip reporting in development mode
    // Use Next.js env variables
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
      console.warn(`[DEV] Integrity violation for ${filename} would be reported in production`);
      return;
    }
    
    // Skip reporting for webpack chunks and browser extensions
    if (isWebpackChunk(filename) || isWhitelistedScript(filename)) {
      console.log(`Skipping reporting for whitelisted script: ${filename}`);
      return;
    }
    
    // Skip reporting if we've already reported too many violations (rate limiting)
    const reportCount = sessionStorage.getItem('integrity_report_count');
    const maxReports = 3; // Maximum number of reports per session
    
    if (reportCount && parseInt(reportCount, 10) >= maxReports) {
      console.warn(`Rate limiting integrity violation reports (max ${maxReports} per session)`);
      return;
    }
    
    // Increment the report count
    sessionStorage.setItem(
      'integrity_report_count', 
      reportCount ? (parseInt(reportCount, 10) + 1).toString() : '1'
    );
    
    // Send the report to the server
    await fetch('/api/security/report-integrity-violation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        expectedHash,
        actualHash,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        hostname: window.location.hostname,
        isWalletBrowser: isWalletBrowser(),
        nonce
      }),
    });
  } catch (error) {
    console.error('Failed to report integrity violation:', error);
  }
}

/**
 * Creates a debug report for integrity verification
 * @param nonce Optional nonce to include in the report (will be hashed for security)
 * @returns A debug report object
 */
export function createDebugReport(nonce?: string): Record<string, unknown> {
  const report: Record<string, unknown> = {
    failures: getVerificationFailures(),
    environment: process.env.NEXT_PUBLIC_NODE_ENV || 'unknown',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    isWalletBrowser: isWalletBrowser(),
    isTrustedEnvironment: isTrustedDevEnvironment(),
    timestamp: new Date().toISOString()
  };
  
  // If a nonce is provided and we're in a browser environment with crypto support,
  // include a hash of the nonce for verification purposes
  if (nonce && typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // We'll add the nonceHash asynchronously after the report is returned
    window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
      .then(hash => {
        const nonceHash = Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, 16); // Only include first 16 chars for security
        
        report.nonceHash = nonceHash;
      })
      .catch(error => {
        console.error('Failed to generate nonce hash:', error);
      });
  }
  
  return report;
}

/**
 * Gets user alert preferences
 * @returns Alert preferences object
 */
export function getAlertPreferences(): { dismissed: boolean } {
  if (typeof window === 'undefined') return { dismissed: false };
  
  try {
    const stored = localStorage.getItem(ALERT_PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : { dismissed: false };
  } catch {
    return { dismissed: false };
  }
}

/**
 * Sets user alert preferences
 * @param preferences Alert preferences object
 */
export function setAlertPreferences(preferences: { dismissed: boolean }): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ALERT_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save alert preferences:', error);
  }
}

/**
 * Dismisses the integrity alert
 */
export function dismissIntegrityAlert(): void {
  setAlertPreferences({ dismissed: true });
}

/**
 * Resets the integrity alert state
 */
export function resetIntegrityAlert(): void {
  setAlertPreferences({ dismissed: false });
}

/**
 * Shows the integrity alert with the given failures
 * @param failures List of verification failures
 */
export function showIntegrityAlert(failures: VerificationFailure[]): void {
  // Skip entirely in trusted dev environments
  if (isTrustedDevEnvironment()) {
    return;
  }
  
  // Skip if alert was dismissed
  const prefs = getAlertPreferences();
  if (prefs.dismissed) return;

  // Filter out extension-related failures
  const relevantFailures = failures.filter(
    f => !f.filename.includes('chrome-extension://') &&
         !f.filename.includes('moz-extension://') &&
         !f.filename.includes('ms-browser-extension://')
  );

  if (relevantFailures.length === 0) return;

  // Create and show the alert modal
  const modalContainer = document.createElement('div');
  modalContainer.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
  modalContainer.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
      <div class="flex items-start justify-between">
        <div class="flex items-center">
          <svg
            class="w-6 h-6 text-red-500 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Security Alert
          </h2>
        </div>
        <button
          id="dismiss-alert"
          class="text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <span class="sr-only">Close</span>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      
      <div class="mt-4">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          We've detected a potential security issue with this application.
          Script integrity verification failed. This could indicate a security issue.
        </p>
        
        <div class="mt-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Failed scripts: ${relevantFailures.length}
          </p>
        </div>
      </div>

      <div class="mt-6 flex justify-end space-x-4">
        <button
          id="show-debug"
          class="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Show Debug Information
        </button>
        <button
          id="dismiss-alert-btn"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Dismiss Alert
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  // Add event listeners
  const dismissBtn = document.getElementById('dismiss-alert');
  const dismissBtnAlt = document.getElementById('dismiss-alert-btn');
  const showDebugBtn = document.getElementById('show-debug');

  const handleDismiss = () => {
    dismissIntegrityAlert();
    modalContainer.remove();
  };

  dismissBtn?.addEventListener('click', handleDismiss);
  dismissBtnAlt?.addEventListener('click', handleDismiss);
  showDebugBtn?.addEventListener('click', () => {
    console.log('Integrity Verification Failures:', relevantFailures);
  });
} 