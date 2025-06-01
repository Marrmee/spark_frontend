/**
 * Security headers utilities for the application
 * These functions help ensure consistent security headers across the application
 */

// CSP version for cache busting - increment this when making CSP changes
const CSP_VERSION = '1.0.10';

/**
 * Generates comprehensive security headers for the application
 * @param nonce CSP nonce for script execution
 * @returns Object containing security headers
 */
export function generateSecurityHeaders(nonce: string): Record<string, string> {
  try {
    // Essential service domains grouped by function
    const walletConnect = [
      'https://*.walletconnect.com',
      'https://*.walletconnect.org',
      'https://rpc.walletconnect.org',
      'https://rpc.walletconnect.org/v1/*',
      'wss://*.walletconnect.org',
      'https://explorer-api.walletconnect.com',
      'https://relay.walletconnect.com',
      'https://relay.walletconnect.org',
      'wss://relay.walletconnect.com',
      'wss://relay.walletconnect.org'
    ].join(' ');

    const rpcEndpoints = [
      'https://*.alchemy.com',
      'https://*.infura.io',
      'https://*.quiknode.pro',
      'https://*.publicnode.com',
      'https://*.merkle.io',
      'https://eth-sepolia.g.alchemy.com',
      'https://base-sepolia.g.alchemy.com',
      'https://mainnet.base.org',
      'https://base.publicnode.com',
      'https://developer-access-mainnet.base.org',
      'https://sepolia.base.org',
      'https://base-sepolia.drpc.org/'
    ].join(' ');

    const essentialServices = [
      'https://*.poscidondao.com',
      'https://*.silksecure.net',
      'https://*.metamask.io',
      'wss://*.metamask.io',
      'https://*.pinata.cloud',
      'https://*.thegraph.com',
      'https://pro-api.coinmarketcap.com',
      'https://api.coinmarketcap.com',
      'https://api.clusters.xyz',
      'https://api.decentscan.xyz',
      'https://api.peanut.to',
      'https://api.zerocomputing.com',
      'https://box-v2.api.decent.xyz'
    ].join(' ');

    // Analytics services
    const analyticsServices = [
      'https://*.googletagmanager.com',
      'https://*.google-analytics.com',
      'https://*.doubleclick.net'
    ].join(' ');

    // reCAPTCHA services
    const recaptchaServices = [
      'https://www.google.com',
      'https://www.google.com/recaptcha/',
      'https://www.google.com/recaptcha/api/',
      'https://www.google.com/recaptcha/api2/',
      'https://www.google.com/recaptcha/api2/anchor',
      'https://www.google.com/recaptcha/api2/bframe',
      'https://www.google.com/recaptcha/api2/reload',
      'https://www.google.com/recaptcha/api2/userverify',
      'https://www.google.com/recaptcha/api2/clr',
      'https://www.gstatic.com/recaptcha/',
      'https://www.gstatic.cn/recaptcha/',
      'https://recaptcha.google.com',
      'https://recaptcha.net',
      'https://www.recaptcha.net'
    ].join(' ');

    // Base script-src directive without unsafe-eval or unsafe-inline
    const baseScriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live/_next-live/feedback/feedback.js https://*.vercel.live https://*.vercel-scripts.com https://*.silksecure.net https://*.walletconnect.com https://*.walletconnect.org ${analyticsServices} blob:;`;
    
    // Add unsafe-eval only in development mode, but never unsafe-inline
    const scriptSrc = process.env.NODE_ENV === 'development' 
      ? `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic' https://vercel.live/_next-live/feedback/feedback.js https://*.vercel.live https://*.vercel-scripts.com https://*.silksecure.net https://*.walletconnect.com https://*.walletconnect.org ${analyticsServices} blob:;`
      : baseScriptSrc;

    // Comprehensive CSP with all necessary domains
    const csp = [
      "default-src 'self';",
      scriptSrc,
      // Allow inline styles in development
      process.env.NODE_ENV === 'development' 
        ? "style-src 'self' 'unsafe-inline' fonts.googleapis.com;"
        : `style-src 'self' 'unsafe-inline';`,
      "font-src 'self' data: fonts.gstatic.com;",
      `img-src 'self' data: blob: https: http: ${walletConnect} ${rpcEndpoints} ${essentialServices} ${analyticsServices} ${recaptchaServices};`,
      `connect-src 'self' data: ws: wss: ${walletConnect} ${rpcEndpoints} ${essentialServices} ${analyticsServices} ${recaptchaServices} https://api.web3modal.org localhost:* 127.0.0.1:* https://*.poscidondao.com https://*.silksecure.net https://*.walletconnect.com https://*.walletconnect.org https://*.infura.io https://*.alchemy.com https://*.merkle.io https://*.base.org https://*.publicnode.com https://*.drpc.org;`,
      `frame-src 'self' https://www.google.com https://staging-silkysignon.com https://*.vercel.live https://silksecure.net https://*.silksecure.net https://*.walletconnect.com https://*.walletconnect.org https://rpc.walletconnect.org https://rpc.walletconnect.org/v1/*;`,
      "object-src 'none';",
      "base-uri 'self';",
      "form-action 'self';",
      `frame-ancestors 'self' https://www.google.com https://staging-silkysignon.com https://silkysignon.com https://silksecure.net https://*.silksecure.net https://*.silkysignon.com https://*.walletconnect.com https://*.walletconnect.org https://rpc.walletconnect.org https://rpc.walletconnect.org/v1/*;`,
      "manifest-src 'self' https://*.poscidondao.com;",
      "media-src 'self' https://red-improved-cod-476.mypinata.cloud/ipfs/bafybeic75anhtbuyfq6scsgcgpxtrlremls6x4s2uc5zbpoqcl5igpjdga;",
      "worker-src 'self' blob:;",
      "upgrade-insecure-requests;",
      "block-all-mixed-content;"
    ].join(' ');
    
    return {
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-DNS-Prefetch-Control': 'on',
      'X-Download-Options': 'noopen',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'X-CSP-Version': CSP_VERSION
    };
  } catch (error) {
    console.error('Failed to generate security headers:', error);
    throw error;
  }
}

/**
 * Validates security headers to ensure they meet minimum requirements
 * @param headers The headers to validate
 * @returns Validation result with missing or invalid headers
 */
export function validateSecurityHeaders(headers: Record<string, string>): {
  isValid: boolean;
  missingHeaders: string[];
  invalidHeaders: { header: string; reason: string }[];
} {
  const missingHeaders: string[] = [];
  const invalidHeaders: { header: string; reason: string }[] = [];
  
  // Required security headers
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Strict-Transport-Security'
  ];
  
  // Check for missing headers
  for (const header of requiredHeaders) {
    if (!headers[header]) {
      missingHeaders.push(header);
    }
  }
  
  // Validate specific headers
  if (headers['X-Content-Type-Options'] && headers['X-Content-Type-Options'] !== 'nosniff') {
    invalidHeaders.push({
      header: 'X-Content-Type-Options',
      reason: 'Value must be "nosniff"'
    });
  }
  
  if (headers['X-Frame-Options'] && !['DENY', 'SAMEORIGIN'].includes(headers['X-Frame-Options'])) {
    invalidHeaders.push({
      header: 'X-Frame-Options',
      reason: 'Value must be "DENY" or "SAMEORIGIN"'
    });
  }
  
  if (headers['Strict-Transport-Security'] && !headers['Strict-Transport-Security'].includes('max-age=')) {
    invalidHeaders.push({
      header: 'Strict-Transport-Security',
      reason: 'Must include max-age directive'
    });
  }
  
  return {
    isValid: missingHeaders.length === 0 && invalidHeaders.length === 0,
    missingHeaders,
    invalidHeaders
  };
}

export const getSecurityHeaders = (options?: {
  cache?: boolean;
  circuitState?: string;
  retryAfter?: number;
}) => {
  const headers: Record<string, string> = {
    // Prevent browsers from incorrectly detecting non-scripts as scripts
    'X-Content-Type-Options': 'nosniff',
    
    // Only allow being included in iframes from same origin
    'X-Frame-Options': 'SAMEORIGIN',
    
    // XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // HTTPS only
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    
    // Restrict where resources can be loaded from
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
    
    // Prevent browsers from MIME-sniffing the content type
    'X-Download-Options': 'noopen',
    
    // Disable client-side caching by default
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  // Add circuit breaker headers if provided
  if (options?.circuitState) {
    headers['X-Circuit-State'] = options.circuitState;
  }
  if (options?.retryAfter) {
    headers['Retry-After'] = options.retryAfter.toString();
  }

  // Override cache headers if caching is enabled
  if (options?.cache) {
    headers['Cache-Control'] = 'public, max-age=300'; // Cache for 5 minutes
    delete headers['Pragma'];
    delete headers['Expires'];
  }

  return headers;
}; 