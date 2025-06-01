/**
 * Utility functions for browser environment detection and safe localStorage access
 */

/**
 * Check if the code is running in a browser environment
 * @returns boolean indicating if code is running in browser
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Safely get an item from localStorage
 * @param key The key to retrieve from localStorage
 * @param defaultValue Optional default value if key doesn't exist or we're not in a browser
 * @returns The value from localStorage or the default value
 */
export const safeLocalStorageGet = (key: string, defaultValue: string | null = null): string | null => {
  if (!isBrowser()) {
    return defaultValue;
  }
  
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return defaultValue;
  }
};

/**
 * Safely set an item in localStorage
 * @param key The key to set in localStorage
 * @param value The value to store
 * @returns boolean indicating success
 */
export const safeLocalStorageSet = (key: string, value: string): boolean => {
  if (!isBrowser()) {
    return false;
  }
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('Error setting localStorage:', error);
    return false;
  }
}; 