'use client';

import dynamic from 'next/dynamic';

// Dynamically import the CspRefreshPrompt component with no SSR
const CspRefreshPrompt = dynamic(
  () => import('./CspRefreshPrompt'),
  { ssr: false }
);

/**
 * Client component wrapper for CspRefreshPrompt
 * This allows us to use dynamic import with ssr: false in a client component
 */
const ClientCspRefreshPrompt = () => {
  return <CspRefreshPrompt />;
};

export default ClientCspRefreshPrompt; 