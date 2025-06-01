import { NextRequest, NextResponse } from 'next/server';
import { generateSecurityHeaders } from './app/utils/securityHeaders';


// List of allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://develop.poscidondao.com',
  'https://protocol.poscidondao.com',
  'https://silksecure.net',
];

// Generate a cryptographically secure random nonce
async function generateNonce(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// Debug mode for development - set to true to log CSP issues
const DEBUG_CSP = process.env.NODE_ENV === 'development';

export async function middleware(request: NextRequest) {
  try {
    const path = new URL(request.url).pathname;
    // Generate a nonce for CSP using Web Crypto API
    const nonce = await generateNonce();
    
    // Generate security headers
    const securityHeaders = generateSecurityHeaders(nonce);
    
    // Create base response
    const response = NextResponse.next();

    // In development, we can optionally log request details for debugging
    if (DEBUG_CSP) {
      console.log(`[Middleware] Processing request for: ${path}`);
      
      // Log request headers for debugging
      if (path.startsWith('/api/fetch-leaderboard')) {
        console.log('[Middleware] Leaderboard API request headers:', Object.fromEntries([...request.headers.entries()]));
      }
    }

    // Apply all security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Apply CORS headers if needed
    const origin = request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    // Skip remaining checks for OPTIONS requests
    if (request.method === 'OPTIONS') {
      return response;
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
