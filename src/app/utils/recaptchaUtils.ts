/**
 * Utilities for reCAPTCHA verification
 * Contains reusable functions for verifying reCAPTCHA tokens across the application
 */

// Cooldown period in milliseconds (2 minutes)
const COOLDOWN_PERIOD = 2 * 60 * 1000;

// Store for tracking verification attempts
const verificationAttempts = new Map<string, { timestamp: number; count: number }>();

const isMainnet = process.env.NEXT_PUBLIC_NETWORK_ENV === 'mainnet';

const RECAPTCHA_SCORE_THRESHOLD = isMainnet ? 0.5 : 0.3;

/**
 * Checks if a user is in cooldown period
 * @param userIdentifier The user identifier (e.g., IP address)
 * @returns Object containing cooldown status and remaining time
 */
export function checkCooldown(userIdentifier: string): { inCooldown: boolean; remainingTime: number } {
  const now = Date.now();
  const userAttempts = verificationAttempts.get(userIdentifier);

  if (!userAttempts) {
    return { inCooldown: false, remainingTime: 0 };
  }

  const timeSinceLastAttempt = now - userAttempts.timestamp;
  const remainingTime = Math.max(0, COOLDOWN_PERIOD - timeSinceLastAttempt);

  return {
    inCooldown: remainingTime > 0 && userAttempts.count >= 3,
    remainingTime
  };
}

/**
 * Update verification attempts record for a user
 * @param userIdentifier User identifier (e.g. IP address)
 */
export function incrementAttempts(userIdentifier: string): void {
  const attempts = verificationAttempts.get(userIdentifier) || { timestamp: Date.now(), count: 0 };
  verificationAttempts.set(userIdentifier, {
    timestamp: Date.now(),
    count: attempts.count + 1
  });
}

/**
 * Reset verification attempts for a user
 * @param userIdentifier User identifier (e.g. IP address)
 */
export function resetAttempts(userIdentifier: string): void {
  verificationAttempts.delete(userIdentifier);
}

/**
 * Verifies a reCAPTCHA token with Google's reCAPTCHA API
 * @param token The reCAPTCHA token to verify
 * @returns Object containing success status and score if successful
 */
export async function verifyRecaptchaToken(token: string): Promise<{ success: boolean; score?: number; error?: string }> {
  try {
    // Google reCAPTCHA verification endpoint
    const url = 'https://www.google.com/recaptcha/api/siteverify';
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secret) {
      console.error('reCAPTCHA secret key is not configured');
      return { success: false, error: 'reCAPTCHA is not properly configured' };
    }
    
    // Prepare data for the request
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    
    // Make the verification request to Google
    const response = await fetch(url, {
      method: 'POST',
      body: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    // Parse the response
    const data = await response.json();
    
    if (!data.success) {
      console.error('reCAPTCHA verification failed:', data['error-codes']);
      return { 
        success: false, 
        error: Array.isArray(data['error-codes']) 
          ? data['error-codes'].join(', ') 
          : 'Unknown verification error' 
      };
    }
    
    return { success: true, score: data.score };
  } catch (error) {
    console.error('Error verifying reCAPTCHA token:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Verification error: ${errorMessage}` };
  }
}

/**
 * Performs reCAPTCHA verification and returns appropriate error response if verification fails
 * Useful for API routes to keep code DRY
 * 
 * @param token The reCAPTCHA token to verify
 * @param userIdentifier Optional user identifier for rate limiting (e.g. IP address)
 * @returns Object with verified status and potential error response
 */
export async function validateRecaptcha(
  token: string | undefined,
  userIdentifier?: string
): Promise<{
  verified: boolean;
  errorResponse?: {
    error: string;
    status: number;
    remainingTime?: number;
  };
}> {
  // Add debugging information
  console.log('[DEBUG reCAPTCHA] Starting validation with token length:', token?.length || 0);
  console.log('[DEBUG reCAPTCHA] User identifier provided:', userIdentifier ? 'YES' : 'NO');
  
  // Check if token exists
  if (!token) {
    console.error('[DEBUG reCAPTCHA] Missing reCAPTCHA token');
    return {
      verified: false,
      errorResponse: {
        error: 'Missing reCAPTCHA verification',
        status: 400
      }
    };
  }
  
  // Check cooldown if userIdentifier is provided
  if (userIdentifier) {
    console.log('[DEBUG reCAPTCHA] Checking cooldown for user:', userIdentifier);
    const { inCooldown, remainingTime } = checkCooldown(userIdentifier);
    console.log('[DEBUG reCAPTCHA] Cooldown status:', inCooldown ? `In cooldown (${remainingTime}ms remaining)` : 'Not in cooldown');
    
    if (inCooldown) {
      const waitTimeMinutes = Math.ceil(remainingTime / 60000);
      return {
        verified: false,
        errorResponse: {
          error: `Too many verification attempts. Please wait ${waitTimeMinutes} minute${waitTimeMinutes > 1 ? 's' : ''} before trying again.`,
          status: 429,
          remainingTime
        }
      };
    }
  }
  
  // Verify the token
  console.log('[DEBUG reCAPTCHA] Verifying token with Google reCAPTCHA API');
  const verification = await verifyRecaptchaToken(token);
  console.log('[DEBUG reCAPTCHA] Verification result:', verification);
  
  if (!verification.success) {
    console.error('[DEBUG reCAPTCHA] Token verification failed:', verification.error);
    if (userIdentifier) {
      incrementAttempts(userIdentifier);
      console.log('[DEBUG reCAPTCHA] Incremented attempts for user', userIdentifier);
    }
    
    return {
      verified: false,
      errorResponse: {
        error: verification.error || 'Security verification failed',
        status: 403
      }
    };
  }
  
  // Score check - more lenient threshold (0.3)
  const isHuman = verification.score && verification.score >= RECAPTCHA_SCORE_THRESHOLD;
  console.log('[DEBUG reCAPTCHA] Score check:', verification.score, 'Threshold:', RECAPTCHA_SCORE_THRESHOLD, 'Is human:', isHuman);
  
  if (!isHuman) {
    console.error('[DEBUG reCAPTCHA] Score below threshold:', verification.score);
    if (userIdentifier) {
      incrementAttempts(userIdentifier);
      const { remainingTime } = checkCooldown(userIdentifier);
      const attempts = verificationAttempts.get(userIdentifier);
      const waitTimeMinutes = Math.ceil(remainingTime / 60000);
      
      console.log('[DEBUG reCAPTCHA] User attempts after increment:', attempts?.count);
      
      return {
        verified: false,
        errorResponse: {
          error: attempts && attempts.count >= 2 
            ? `Verification failed. Please wait ${waitTimeMinutes} minute${waitTimeMinutes > 1 ? 's' : ''} before trying again.`
            : 'Verification failed. Please try again in a few seconds.',
          status: 403,
          remainingTime: attempts && attempts.count >= 2 ? remainingTime : 5000
        }
      };
    } else {
      return {
        verified: false,
        errorResponse: {
          error: 'Verification failed due to suspicious bot activity: ' + verification.score,
          status: 403
        }
      };
    }
  }
  
  // Reset attempts on successful verification if userIdentifier is provided
  if (userIdentifier) {
    resetAttempts(userIdentifier);
    console.log('[DEBUG reCAPTCHA] Reset attempts for user', userIdentifier);
  }
  
  console.log('[DEBUG reCAPTCHA] Verification successful, score:', verification.score);
  return { verified: true };
} 