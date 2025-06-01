import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Simple in-memory rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
const requestTimestamps: number[] = [];

export const POST = async (request: NextRequest) => {
  const CMC_API_KEY = process.env.CMC_API_KEY;

  // Log API key availability (without revealing the actual key)
  console.log(`CoinMarketCap API Key available: ${Boolean(CMC_API_KEY)}`);

  // Implement rate limiting
  const now = Date.now();
  // Remove timestamps older than the window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
    requestTimestamps.shift();
  }
  
  // Check if we've exceeded the rate limit
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    console.log(`Rate limit exceeded: ${requestTimestamps.length} requests in the last minute`);
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please try again later.',
      rateLimitReset: requestTimestamps[0] + RATE_LIMIT_WINDOW - now
    }, { status: 429 });
  }
  
  // Add current timestamp to the list
  requestTimestamps.push(now);

  // Parse the request body and handle any errors
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    console.error('Error parsing request JSON:', error);
    return NextResponse.json({ 
      error: 'Invalid request: Request body must be valid JSON',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }

  // Accept either a single token symbol or an array of token symbols
  const tokenSymbols = Array.isArray(requestBody?.tokenSymbols)
    ? requestBody.tokenSymbols
    : [requestBody?.tokenSymbol || 'ETH']; // Default to ETH if no symbol provided

  console.log(`Fetching prices for tokens: ${tokenSymbols.join(', ')}`);

  // Join all symbols with commas for the API request
  const symbolsParam = tokenSymbols.join(',');
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbolsParam}&convert=USD`;

  try {
    console.log(`Making request to CoinMarketCap API for ${symbolsParam}...`);
    const response = await axios.get(url, {
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY
      },
    });

    if (response.status !== 200) {
      console.error(
        `CoinMarketCap API returned non-200 status: ${response.status} - ${response.statusText}`
      );
      throw new Error(`CoinMarketCap API error: ${response.statusText}`);
    }

    const data = response.data;
    console.log(`CoinMarketCap API response structure: ${JSON.stringify(Object.keys(data))}`);
    
    // Extract prices for all requested tokens
    const prices = {};
    let hasValidPrices = false;
    
    for (const symbol of tokenSymbols) {
      const price = data?.data?.[symbol]?.quote?.USD?.price;
      console.log(`Price extracted for ${symbol}: ${price}`);
      
      if (price) {
        // Format price to exactly 2 decimal places
        prices[symbol] = Number(Number(price).toFixed(2));
        hasValidPrices = true;
      } else {
        console.error(`Price data is unavailable for ${symbol}`);
        prices[symbol] = null;
      }
    }
    
    if (!hasValidPrices) {
      console.error(`No valid price data available for any requested tokens. Response data:`, data);
      throw new Error('Price data is unavailable for all requested tokens');
    }

    // Cache the response for 5 minutes
    return NextResponse.json({ prices }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=300'
      }
    });
  } catch (error) {
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        }
      });
    } else {
      console.error('Non-Axios error fetching price:', error);
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch price',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
