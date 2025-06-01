'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { fetchTokenPrices } from '@/app/utils/priceHelpers';
import { isBrowser } from '@/app/utils/browserUtils';

// Custom event for price updates
const PRICE_UPDATE_EVENT = 'price-updated';

// Cache settings
const CACHE_KEY = 'cachedTokenPrices';
const CACHE_TIMESTAMP_KEY = 'cachedTokenPricesTimestamp';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes
const FETCH_DEBOUNCE = 10000; // 10 seconds between fetches

interface PriceContextType {
  prices: Record<string, number | null>;
  isLoading: boolean;
  lastUpdated: number | null;
  refreshPrices: (tokens?: string[]) => Promise<void>;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function usePriceContext() {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePriceContext must be used within a PriceProvider');
  }
  return context;
}

interface PriceProviderProps {
  children: ReactNode;
  initialTokens?: string[];
}

export function PriceProvider({ children, initialTokens = ['SCI', 'ETH'] }: PriceProviderProps) {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [trackedTokens, setTrackedTokens] = useState<string[]>(initialTokens);
  const [hasFetchedInitially, setHasFetchedInitially] = useState(false);
  
  // Use a ref to track the last fetch time to prevent rapid successive fetches
  const lastFetchTimeRef = useRef<number>(0);
  // Use a ref to track if a fetch is in progress
  const fetchInProgressRef = useRef<boolean>(false);

  // Load cached prices from localStorage
  const loadCachedPrices = useCallback(() => {
    if (!isBrowser()) return false;
    
    try {
      const cachedPrices = localStorage.getItem(CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedPrices && cachedTimestamp) {
        const parsedPrices = JSON.parse(cachedPrices);
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < CACHE_MAX_AGE) {
          console.log('PriceContext: Using cached prices', parsedPrices);
          setPrices(parsedPrices);
          setLastUpdated(timestamp);
          setIsLoading(false);
          setHasFetchedInitially(true);
          return true;
        } else {
          console.log('PriceContext: Cached prices expired');
        }
      }
    } catch (error) {
      console.error('PriceContext: Error loading cached prices', error);
    }
    
    return false;
  }, []);

  // Fetch fresh prices
  const fetchFreshPrices = useCallback(async (tokens: string[] = trackedTokens, force = false) => {
    if (!isBrowser() || tokens.length === 0) return;
    
    // Check if we should skip this fetch
    const now = Date.now();
    if (!force && (fetchInProgressRef.current || now - lastFetchTimeRef.current < FETCH_DEBOUNCE)) {
      console.log('PriceContext: Skipping fetch - too soon or fetch in progress');
      return;
    }
    
    // Set fetch in progress flag
    fetchInProgressRef.current = true;
    lastFetchTimeRef.current = now;
    
    try {
      console.log('PriceContext: Fetching fresh prices for', tokens);
      setIsLoading(true);
      
      const freshPrices = await fetchTokenPrices(tokens);
      console.log('PriceContext: Received fresh prices', freshPrices);
      
      // Update state with fresh prices, preserving any existing prices for other tokens
      setPrices(prevPrices => {
        const newPrices = { ...prevPrices };
        
        // Update only the tokens we fetched
        for (const token of tokens) {
          // Ensure price has exactly 2 decimal places
          if (freshPrices[token] !== null) {
            newPrices[token] = Number(Number(freshPrices[token]).toFixed(2));
          } else {
            newPrices[token] = null;
          }
        }
        
        return newPrices;
      });
      
      // Update tracked tokens if needed
      setTrackedTokens(prevTokens => {
        const newTokens = new Set([...prevTokens, ...tokens]);
        return Array.from(newTokens);
      });
      
      // Update last updated timestamp
      const timestamp = Date.now();
      setLastUpdated(timestamp);
      
      // Cache the prices
      localStorage.setItem(CACHE_KEY, JSON.stringify(freshPrices));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
      
      // Dispatch event for other components
      const event = new CustomEvent(PRICE_UPDATE_EVENT, {
        detail: { 
          prices: freshPrices,
          tokens,
          timestamp
        }
      });
      window.dispatchEvent(event);
      
      // Mark that we've fetched initially
      setHasFetchedInitially(true);
    } catch (error) {
      console.error('PriceContext: Error fetching fresh prices', error);
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [trackedTokens]);

  // Public method to refresh prices
  const refreshPrices = useCallback(async (tokens?: string[]) => {
    // Force refresh only if cache is expired or we're explicitly requesting specific tokens
    const now = Date.now();
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const cacheAge = cachedTimestamp ? now - parseInt(cachedTimestamp, 10) : Infinity;
    
    if (tokens || cacheAge > CACHE_MAX_AGE) {
      await fetchFreshPrices(tokens, true);
    } else {
      console.log('PriceContext: Skipping refresh - cache still valid');
    }
  }, [fetchFreshPrices]);

  // Initialize prices on mount - only once
  useEffect(() => {
    if (hasFetchedInitially) return;
    
    // First try to load from cache
    const loadedFromCache = loadCachedPrices();
    
    // If not loaded from cache, fetch fresh data
    if (!loadedFromCache) {
      fetchFreshPrices();
    }
  }, [fetchFreshPrices, hasFetchedInitially, loadCachedPrices]);

  // Listen for price update events
  useEffect(() => {
    if (!isBrowser()) return;
    
    const handlePriceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { prices: updatedPrices } = customEvent.detail || {};
      
      if (updatedPrices) {
        console.log('PriceContext: Received price update event', updatedPrices);
        
        // Update state with updated prices
        setPrices(prevPrices => {
          const newPrices = { ...prevPrices };
          
          // Ensure all prices have exactly 2 decimal places
          for (const token in updatedPrices) {
            if (updatedPrices[token] !== null) {
              newPrices[token] = Number(Number(updatedPrices[token]).toFixed(2));
            } else {
              newPrices[token] = null;
            }
          }
          
          return newPrices;
        });
        setLastUpdated(Date.now());
      }
    };
    
    window.addEventListener(PRICE_UPDATE_EVENT, handlePriceUpdate);
    
    return () => {
      window.removeEventListener(PRICE_UPDATE_EVENT, handlePriceUpdate);
    };
  }, []);

  const value = {
    prices,
    isLoading,
    lastUpdated,
    refreshPrices
  };

  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
} 