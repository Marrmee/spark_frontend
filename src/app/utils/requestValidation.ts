import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from './securityMonitoring';
import { SecurityEventType } from './securityMonitoring';

// Configuration constants
export const REQUEST_LIMITS = {
  MAX_BODY_SIZE: 1024 * 1024, // 1MB
  MAX_HEADER_SIZE: 16384, // 16KB (increased from 8KB)
  MAX_CAPTCHA_TOKEN_SIZE: 32768, // 32KB for captcha tokens
  MAX_URL_LENGTH: 2048, // 2KB
  MAX_REQUEST_TIME: 30000, // 30 seconds
  MIN_REQUEST_INTERVAL: 100, // 100ms (prevent rapid-fire requests)
} as const;

// Content type whitelist
export const ALLOWED_CONTENT_TYPES = new Set([
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
]);

// Track request timestamps per IP
const requestTimestamps: Map<string, number[]> = new Map();

/**
 * Validates and sanitizes request headers
 * @param headers Request headers to validate
 * @returns Validation result
 */
function validateHeaders(headers: Headers): { 
  valid: boolean; 
  error?: string;
} {
  // Special handling for captcha token
  const captchaToken = headers.get('x-captcha-token');
  let captchaTokenSize = 0;
  
  if (captchaToken) {
    captchaTokenSize = captchaToken.length;
    // Check if captcha token exceeds its own limit
    if (captchaTokenSize > REQUEST_LIMITS.MAX_CAPTCHA_TOKEN_SIZE) {
      return { 
        valid: false, 
        error: 'Captcha token size exceeds limit' 
      };
    }
  }
  
  // Create a copy of headers without the captcha token for size calculation
  const headerEntries = Array.from(headers.entries()).filter(
    ([key]) => key.toLowerCase() !== 'x-captcha-token'
  );
  
  // Check header size (excluding captcha token)
  const headerSize = JSON.stringify(headerEntries).length;
  if (headerSize > REQUEST_LIMITS.MAX_HEADER_SIZE) {
    return { 
      valid: false, 
      error: 'Header size exceeds limit' 
    };
  }

  // Validate content type
  const contentType = headers.get('content-type');
  if (contentType && !ALLOWED_CONTENT_TYPES.has(contentType.split(';')[0])) {
    return { 
      valid: false, 
      error: 'Invalid content type' 
    };
  }

  return { valid: true };
}

/**
 * Validates request timing and prevents rapid-fire requests
 * @param ip Client IP address
 * @returns Validation result
 */
function validateTiming(ip: string): { 
  valid: boolean; 
  error?: string;
} {
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];

  // Remove timestamps older than MAX_REQUEST_TIME
  const recentTimestamps = timestamps.filter(
    ts => now - ts < REQUEST_LIMITS.MAX_REQUEST_TIME
  );

  // Check minimum interval between requests
  if (recentTimestamps.length > 0) {
    const lastRequest = recentTimestamps[recentTimestamps.length - 1];
    if (now - lastRequest < REQUEST_LIMITS.MIN_REQUEST_INTERVAL) {
      return { 
        valid: false, 
        error: 'Request rate too high' 
      };
    }
  }

  // Update timestamps
  recentTimestamps.push(now);
  requestTimestamps.set(ip, recentTimestamps);

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [ip, timestamps] of requestTimestamps.entries()) {
      const validTimestamps = timestamps.filter(
        ts => now - ts < REQUEST_LIMITS.MAX_REQUEST_TIME
      );
      if (validTimestamps.length === 0) {
        requestTimestamps.delete(ip);
      } else {
        requestTimestamps.set(ip, validTimestamps);
      }
    }
  }

  return { valid: true };
}

/**
 * Validates request URL
 * @param url Request URL to validate
 * @returns Validation result
 */
function validateUrl(url: string): { 
  valid: boolean; 
  error?: string;
} {
  if (url.length > REQUEST_LIMITS.MAX_URL_LENGTH) {
    return { 
      valid: false, 
      error: 'URL exceeds maximum length' 
    };
  }

  try {
    const parsedUrl = new URL(url);
    
    // First validate the URL structure
    if (!parsedUrl.protocol || !['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        valid: false,
        error: 'Invalid URL protocol'
      };
    }

    // Validate hostname structure
    const hostnameRegex = /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]))*$/;
    const isValidHostname = hostnameRegex.test(parsedUrl.hostname) || 
                          parsedUrl.hostname === 'localhost' ||
                          /^127\.0\.0\.1$/.test(parsedUrl.hostname);
    
    if (!isValidHostname) {
      return {
        valid: false,
        error: 'Invalid hostname'
      };
    }

    // Validate path for security issues
    const pathAndQuery = parsedUrl.pathname + parsedUrl.search;
    const suspiciousPatterns = [
      /\.\./,                // Directory traversal
      /<[^>]*>/,            // HTML/Script injection
      /\x00/,               // Null bytes
      /[\n\r\t]/,           // Control characters
      /[<>]/,               // HTML tags
      /javascript:/i,       // JavaScript protocol
      /data:/i,             // Data protocol
      /vbscript:/i,         // VBScript protocol
      /file:/i,             // File protocol
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(pathAndQuery)) {
        return { 
          valid: false, 
          error: `Malicious pattern detected: ${pattern}` 
        };
      }
    }

    // Validate port if specified
    if (parsedUrl.port) {
      const port = parseInt(parsedUrl.port, 10);
      // Allow standard HTTP/HTTPS ports and development ports (3000-3999)
      const allowedPorts = [80, 443, ...Array.from({length: 1000}, (_, i) => i + 3000)];
      if (!allowedPorts.includes(port)) {
        return {
          valid: false,
          error: 'Invalid port'
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format'
    };
  }
}

/**
 * Validates request body size and content
 * @param request Next.js request object
 * @returns Validation result
 */
async function validateBody(request: NextRequest): Promise<{ 
  valid: boolean; 
  error?: string;
}> {
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  
  if (contentLength > REQUEST_LIMITS.MAX_BODY_SIZE) {
    return { 
      valid: false, 
      error: 'Request body too large' 
    };
  }

  // For requests with bodies, check actual size
  if (request.body) {
    try {
      const body = await request.clone().text();
      if (body.length > REQUEST_LIMITS.MAX_BODY_SIZE) {
        return { 
          valid: false, 
          error: 'Request body exceeds size limit' 
        };
      }
    } catch (error) {
      return { 
        valid: false, 
        error: 'Invalid request body' 
      };
    }
  }

  return { valid: true };
}

/**
 * Main request validation middleware
 * @param request Next.js request object
 * @returns Response if validation fails, null otherwise
 */
export async function validateRequest(
  request: NextRequest
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const url = request.url;
  const method = request.method;
  const isDev = process.env.NODE_ENV === 'development';
  const isLocalhost = ip === '::1' || ip === '127.0.0.1' || request.headers.get('host')?.includes('localhost');

  // Skip validation for preflight requests
  if (method === 'OPTIONS') {
    return null;
  }
  
  // Skip validation in development mode for localhost
  if (isDev && isLocalhost) {
    console.log(`🔧 [Request Validation] Development mode: Bypassing validation for localhost`);
    return null;
  }

  // Validate headers
  const headerValidation = validateHeaders(request.headers);
  if (!headerValidation.valid) {
    // Calculate header sizes for debugging
    const captchaToken = request.headers.get('x-captcha-token');
    const captchaTokenSize = captchaToken ? captchaToken.length : 0;
    const otherHeadersSize = JSON.stringify(
      Array.from(request.headers.entries()).filter(
        ([key]) => key.toLowerCase() !== 'x-captcha-token'
      )
    ).length;
    const totalHeaderSize = JSON.stringify(Array.from(request.headers.entries())).length;
    
    // Log detailed header size information
    console.warn(`Header size details: captcha=${captchaTokenSize}B, other=${otherHeadersSize}B, total=${totalHeaderSize}B`);
    
    await logSecurityEvent(
      SecurityEventType.INVALID_INPUT,
      {
        ip,
        url,
        error: headerValidation.error,
        headers: Array.from(request.headers.entries()),
        headerSizes: {
          captchaToken: captchaTokenSize,
          otherHeaders: otherHeadersSize,
          total: totalHeaderSize
        }
      }
    );
    return NextResponse.json(
      { error: 'Invalid request headers' },
      { status: 400 }
    );
  }

  // Validate timing
  const timingValidation = validateTiming(ip);
  if (!timingValidation.valid) {
    await logSecurityEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      {
        ip,
        url,
        error: timingValidation.error
      },
      'medium'
    );
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Validate URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    await logSecurityEvent(
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      {
        ip,
        url,
        error: urlValidation.error
      },
      'high'
    );
    return NextResponse.json(
      { error: 'Invalid request URL' },
      { status: 400 }
    );
  }

  // Validate body for methods that may have one
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const bodyValidation = await validateBody(request);
    if (!bodyValidation.valid) {
      await logSecurityEvent(
        SecurityEventType.INVALID_INPUT,
        {
          ip,
          url,
          error: bodyValidation.error
        },
        'medium'
      );
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  }

  return null;
} 