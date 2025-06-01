import React from 'react';
import Card from '../components/general/Card';
import { Metadata, Viewport } from 'next';
import Unlock from '../components/general/Unlock';

const url = new URL('https://protocol.poscidondao.com/lock');

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata: Metadata = {
  metadataBase: url,
  title: 'PoSciDonDAO | Unlock SCI',
  description: `Unlock your SCI tokens to reduce your voting power in the PoSciDonDAO Ecosystem`,
  alternates: {
    canonical: url,
  },
  robots: 'index, follow',
};

export default function UnlockPage() {
  return (
    <Card>
      <Unlock />
    </Card>
  );
}
