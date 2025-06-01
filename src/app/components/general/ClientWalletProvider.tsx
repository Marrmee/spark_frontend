'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Loading from './Loading';
// Dynamically import WalletProvider only on the client-side
const DynamicWalletProvider = dynamic(
  () => import('@/app/context/WalletContext').then(mod => mod.WalletProvider),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '20px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loading />
      </div>
    ),
  }
);

interface ClientWalletProviderProps {
  children: React.ReactNode;
}

const ClientWalletProvider: React.FC<ClientWalletProviderProps> = ({ children }) => {
  return <DynamicWalletProvider>{children}</DynamicWalletProvider>;
};

export default ClientWalletProvider; 