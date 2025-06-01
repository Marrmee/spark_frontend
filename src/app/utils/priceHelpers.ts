'use client';

// Cache keys
const CACHE_KEY = 'cachedTokenPrices';
const CACHE_TIMESTAMP_KEY = 'cachedTokenPricesTimestamp';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes

/**
 * Fetches prices for multiple tokens in a single API call
 * @param tokenSymbols Array of token symbols to fetch prices for
 * @param forceRefresh Whether to force a refresh from the API
 * @returns Object with token prices or null values if prices couldn't be fetched
 */
export async function fetchTokenPrices(
  tokenSymbols: string[],
  forceRefresh = false
): Promise<Record<string, number | null>> {
  try {
    // Check if we have valid cached data
    if (!forceRefresh) {
      const cachedData = getCachedPrices(tokenSymbols);
      if (cachedData) {
        console.log('Using cached token prices');
        // Ensure cached prices have exactly two decimal places
        const formattedCachedPrices: Record<string, number | null> = {};
        for (const symbol of tokenSymbols) {
          if (cachedData[symbol] !== null) {
            formattedCachedPrices[symbol] = Number(cachedData[symbol]?.toFixed(2));
          } else {
            formattedCachedPrices[symbol] = null;
          }
        }
        return formattedCachedPrices;
      }
    }
    
    // No valid cache or force refresh, fetch from API
    console.log(`Fetching prices for: ${tokenSymbols.join(', ')}...`);
    const response = await fetch('/api/fetch-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tokenSymbols }),
      // Add cache busting parameter if forcing refresh
      cache: forceRefresh ? 'no-store' : 'default'
    });

    if (!response.ok) {
      // If we get a rate limit error, try to use cached data
      if (response.status === 429) {
        const cachedData = getCachedPrices(tokenSymbols, true); // Use expired cache
        if (cachedData) {
          console.log('Rate limited, using expired cached token prices');
          // Ensure cached prices have exactly two decimal places
          const formattedCachedPrices: Record<string, number | null> = {};
          for (const symbol of tokenSymbols) {
            if (cachedData[symbol] !== null) {
              formattedCachedPrices[symbol] = Number(cachedData[symbol]?.toFixed(2));
            } else {
              formattedCachedPrices[symbol] = null;
            }
          }
          return formattedCachedPrices;
        }
      }
      throw new Error(`Error fetching prices: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.prices) {
      // Format prices to exactly 2 decimal places
      const formattedPrices: Record<string, number | null> = {};
      
      for (const symbol of tokenSymbols) {
        if (data.prices[symbol]) {
          // Ensure exactly 2 decimal places by using toFixed(2) and converting back to number
          formattedPrices[symbol] = Number(Number(data.prices[symbol]).toFixed(2));
        } else {
          formattedPrices[symbol] = null;
        }
      }
      
      // Cache the prices
      cachePrices(formattedPrices);
      
      return formattedPrices;
    }
    
    throw new Error('No price data returned from API');
  } catch (error) {
    console.error('Error fetching token prices:', error);
    
    // Try to use cached data as fallback
    const cachedData = getCachedPrices(tokenSymbols, true); // Use expired cache
    if (cachedData) {
      console.log('Error fetching prices, using cached token prices as fallback');
      // Ensure cached prices have exactly two decimal places
      const formattedCachedPrices: Record<string, number | null> = {};
      for (const symbol of tokenSymbols) {
        if (cachedData[symbol] !== null) {
          formattedCachedPrices[symbol] = Number(cachedData[symbol]?.toFixed(2));
        } else {
          formattedCachedPrices[symbol] = null;
        }
      }
      return formattedCachedPrices;
    }
    
    // Return null values for all requested tokens
    return tokenSymbols.reduce((acc, symbol) => {
      acc[symbol] = null;
      return acc;
    }, {} as Record<string, null>);
  }
}

/**
 * Gets cached prices for the specified tokens
 * @param tokenSymbols Array of token symbols to get prices for
 * @param allowExpired Whether to allow expired cache
 * @returns Object with token prices or null if no valid cache
 */
function getCachedPrices(
  tokenSymbols: string[],
  allowExpired = false
): Record<string, number | null> | null {
  try {
    const cachedPrices = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (cachedPrices && cachedTimestamp) {
      const parsedPrices = JSON.parse(cachedPrices);
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();
      
      // Check if cache is still valid or we're allowing expired cache
      if (allowExpired || now - timestamp < CACHE_MAX_AGE) {
        // Extract only the requested tokens
        const result: Record<string, number | null> = {};
        for (const symbol of tokenSymbols) {
          result[symbol] = parsedPrices[symbol] ?? null;
        }
        return result;
      }
    }
  } catch (error) {
    console.error('Error getting cached prices:', error);
  }
  
  return null;
}

/**
 * Caches the provided prices
 * @param prices Object with token prices
 */
function cachePrices(prices: Record<string, number | null>): void {
  try {
    // Get existing cached prices
    const existingCache = localStorage.getItem(CACHE_KEY);
    const mergedPrices = existingCache 
      ? { ...JSON.parse(existingCache), ...prices } 
      : prices;
    
    // Ensure all prices have exactly 2 decimal places
    for (const token in mergedPrices) {
      if (mergedPrices[token] !== null) {
        mergedPrices[token] = Number(Number(mergedPrices[token]).toFixed(2));
      }
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(mergedPrices));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error caching prices:', error);
  }
}

/**
 * Formats a price value for display
 * @param price Price value to format
 * @param defaultValue Default value to return if price is null or undefined
 * @returns Formatted price string
 */
export function formatPrice(price: number | null | undefined, defaultValue = '$0.00'): string {
  if (price === null || price === undefined) {
    return defaultValue;
  }
  
  // Ensure price has exactly 2 decimal places
  const formattedPrice = Number(price).toFixed(2);
  
  return `$${Number(formattedPrice).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
} 