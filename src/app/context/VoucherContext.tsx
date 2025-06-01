'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useWallet } from './WalletContext';

// Define types for the voucher data
interface VoucherData {
  voucherId: string | null;
  verificationUrl: string | null;
  status: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  expiresAt: string | null;
}

// Define the context state
interface VoucherContextState {
  isLoading: boolean;
  error: string | null;
  voucher: VoucherData;
  getVoucher: (address: string) => Promise<void>;
  resetVoucher: () => void;
}

// Create initial state
const initialVoucherData: VoucherData = {
  voucherId: null,
  verificationUrl: null,
  status: null,
  isVerified: false,
  verifiedAt: null,
  expiresAt: null,
};

// Create context with default values
const VoucherContext = createContext<VoucherContextState | undefined>(undefined);

// Props for the provider component
interface VoucherProviderProps {
  children: ReactNode;
}

export function VoucherProvider({ children }: VoucherProviderProps) {
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<VoucherData>(initialVoucherData);

  // Function to fetch voucher data from the API
  const getVoucher = useCallback(async (address: string) => {
    if (!address) {
      setError('No wallet address provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/get-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: address }),
      });

      if (response.ok) {
        const data = await response.json();
        setVoucher({
          voucherId: data.voucher || null,
          verificationUrl: data.verificationUrl || null,
          status: data.status || null,
          isVerified: data.isVerified || false,
          verifiedAt: data.verifiedAt || null,
          expiresAt: data.expiresAt || null,
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to get voucher');
        // Reset voucher data on error
        setVoucher(initialVoucherData);
      }
    } catch (error) {
      console.error('Error fetching voucher:', error);
      setError('Failed to fetch voucher');
      // Reset voucher data on error
      setVoucher(initialVoucherData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to reset voucher data
  const resetVoucher = useCallback(() => {
    setVoucher(initialVoucherData);
    setError(null);
  }, []);

  // Automatically fetch voucher when wallet address changes
  useEffect(() => {
    if (wallet?.state?.address) {
      getVoucher(wallet.state.address);
    } else {
      // Reset voucher if wallet is disconnected
      resetVoucher();
    }
  }, [wallet?.state?.address, getVoucher, resetVoucher]);

  // Provide the context value
  const contextValue: VoucherContextState = {
    isLoading,
    error,
    voucher,
    getVoucher,
    resetVoucher,
  };

  return (
    <VoucherContext.Provider value={contextValue}>
      {children}
    </VoucherContext.Provider>
  );
}

// Custom hook to use the context
export function useVoucher() {
  const context = useContext(VoucherContext);
  
  if (context === undefined) {
    throw new Error('useVoucher must be used within a VoucherProvider');
  }
  
  return context;
} 