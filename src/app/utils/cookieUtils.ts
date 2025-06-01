// cookieUtils.ts
export function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + date.toUTCString();
  
  // Add security flags to cookies
  const secureFlag = location.protocol === 'https:' ? 'Secure;' : '';
  const cookieString = `${name}=${value};${expires};path=/;${secureFlag}HttpOnly;SameSite=Strict`;
  
  document.cookie = cookieString;
}

export function getCookie(name: string) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Validates a cookie that contains a nonce
 * @param name The name of the cookie
 * @param expectedNonce The expected nonce value
 * @returns True if the cookie exists and contains the correct nonce
 */
export function validateCookieNonce(name: string, expectedNonce: string): boolean {
  const cookieValue = getCookie(name);
  if (!cookieValue) return false;
  
  // Check if the cookie value contains the nonce
  // Format is "value:nonce"
  const parts = cookieValue.split(':');
  if (parts.length !== 2) return false;
  
  const [, nonce] = parts;
  
  // Use constant-time comparison to prevent timing attacks
  if (!nonce || !expectedNonce) return false;
  
  let result = 0;
  const nonceLength = nonce.length;
  const expectedLength = expectedNonce.length;
  
  if (nonceLength !== expectedLength) return false;
  
  for (let i = 0; i < nonceLength; i++) {
    result |= nonce.charCodeAt(i) ^ expectedNonce.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Gets the value part of a cookie without the nonce
 * @param name The name of the cookie
 * @returns The value part of the cookie, or null if the cookie doesn't exist
 */
export function getCookieValue(name: string): string | null {
  const cookieValue = getCookie(name);
  if (!cookieValue) return null;
  
  // Check if the cookie value contains a nonce
  const parts = cookieValue.split(':');
  if (parts.length !== 2) return cookieValue; // Return the whole value if it doesn't have the expected format
  
  return parts[0]; // Return just the value part
}
