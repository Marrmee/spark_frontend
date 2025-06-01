import React from 'react';
import Card from '../components/general/Card';
import Lock from '../components/general/Lock';
import { Metadata, Viewport } from 'next';

const url = new URL('https://protocol.poscidondao.com/lock');

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata: Metadata = {
  metadataBase: url,
  title: 'PoSciDonDAO | Lock SCI',
  description: `Lock your SCI tokens to gain voting power in the PoSciDonDAO Ecosystem`,
  alternates: {
    canonical: url,
  },
  robots: 'index, follow',
};

export default function LockPage() {
  return (
    <Card>
      <Lock />
    </Card>
  );
}
