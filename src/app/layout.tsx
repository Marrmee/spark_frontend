import React from 'react';
import './globals.css';
import localFont from 'next/font/local';
import NavBar from './components/general/NavBar';
import { Metadata, Viewport } from 'next';
import dotenv from 'dotenv';
import { NetworkInfoProvider } from './context/NetworkInfoContext';
import ModalCookie from './components/modals/ModalCookies';
import QueryProviders from '@/app/QueryProviders';
import { headers } from 'next/headers';
import { NotificationProvider } from './context/NotificationContext';
import { Analytics } from '@vercel/analytics/react';
import ScriptTags from './components/general/ScriptTags';
import IntegrityVerifier from './components/IntegrityVerifier';
import ServiceWorkerRegistration from './components/general/ServiceWorkerRegistration';
import ClientCspRefreshPrompt from './components/general/ClientCspRefreshPrompt';
import Script from 'next/dist/client/script';
import { PriceProvider } from './context/PriceContext';
import RecaptchaProvider from './components/general/RecaptchaProvider';
import MinimalCaptchaBadge from './components/general/MinimalCaptchaBadge';
import ClientWalletProvider from './components/general/ClientWalletProvider';

// Font Awesome Imports & Config
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { VoucherProvider } from './context/VoucherContext';
config.autoAddCss = false; // Prevent Font Awesome from dynamically adding CSS

dotenv.config();

const atamiDisplay = localFont({
  src: './AtamiDisplayRegular.otf',
  variable: '--font-atamiDisplay',
  preload: true,
  display: 'swap',
});

const proximaNova = localFont({
  src: './ProximaNovaRegular.otf',
  variable: '--font-proximaNova',
  preload: true,
  display: 'swap',
});

const proximaNovaExtraBold = localFont({
  src: './ProximaNovaExtrabold.otf',
  variable: '--font-proximaNovaBold',
  preload: true,
  display: 'swap',
});

const proximaNovaSemiBold = localFont({
  src: './ProximaNovaSemibold.otf',
  variable: '--font-proximaNovaSemiBold',
  preload: true,
  display: 'swap',
});

const proximaNovaItalic = localFont({
  src: './ProximaNovaRegularItalic.otf',
  variable: '--font-proximaNovaItalic',
  preload: true,
  display: 'swap',
});

const acuminMediumItalic = localFont({
  src: './AcuminProMediumItalic.otf',
  variable: '--font-acuminMediumItalic',
  preload: true,
  display: 'swap',
});

const acuminBold = localFont({
  src: './AcuminProBold.otf',
  variable: '--font-acuminBold',
  preload: true,
  display: 'swap',
});

const acuminSemiBold = localFont({
  src: './AcuminProSemiBold.otf',
  variable: '--font-acuminSemiBold',
  preload: true,
  display: 'swap',
});

const acuminMedium = localFont({
  src: './AcuminProMedium.otf',
  variable: '--font-acuminRegular',
  preload: true,
  display: 'swap',
});

const GMT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS ?? '';

export const metadata: Metadata = {
  metadataBase: new URL('https://spark.poscidon.com/'),
  title: {
    template: '%s | Spark',
    default:
      "Spark | Submit and Review Innovative Ideas",
  },
  description: `A platform for inventors to submit ideas and for committees to review them.`,
  applicationName: 'Spark',
  authors: [{ name: 'Spark Team' }],
  keywords: [
    'Idea Submission',
    'Innovation',
    'Collaboration',
    'Review Platform',
    'Vouchers',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
      },
      {
        rel: 'icon',
        type: 'image/png',
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
      },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    title: "Spark Protocol",
    description: 'Submit and Review Innovative Ideas',
    siteName: 'Spark Protocol',
    images: [
      {
        url: 'https://protocol.poscidondao.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Spark Protocol',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Spark Protocol",
    description: 'Submit and Review Innovative Ideas',
    images: ['https://spark.poscidon.com/spark-protocol.png'],
    site: 'Poscidon',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000314',
  colorScheme: 'dark',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';

  return (
    <html lang="en" className="dark">
      <head>
        <ScriptTags nonce={nonce} GMT_ID={GMT_ID} />
        <Script
          id="price-preload"
          nonce={nonce} // Use empty string as fallback
          dangerouslySetInnerHTML={{
            __html: `
              // Preload price data as soon as possible
              (function() {
                try {
                  // Check if we need to refresh the cache
                  const cachedPrices = localStorage.getItem('cachedTokenPrices');
                  const cachedPricesTimestamp = localStorage.getItem('cachedTokenPricesTimestamp');
                  
                  const currentTime = Date.now();
                  const pricesCacheAge = cachedPricesTimestamp ? currentTime - parseInt(cachedPricesTimestamp) : Infinity;
                  
                  // If cache is older than 30 minutes or doesn't exist, preload the data
                  if (pricesCacheAge > 30 * 60 * 1000 || !cachedPrices) {
                    console.log('Preloading token prices...');
                    fetch('/api/fetch-price', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tokenSymbols: ['SCI', 'ETH'] })
                    })
                    .then(response => response.json())
                    .then(data => {
                      if (data.prices) {
                        // Format prices to exactly 2 decimal places
                        const formattedPrices = {};
                        for (const symbol in data.prices) {
                          if (data.prices[symbol] !== null) {
                            formattedPrices[symbol] = Number(Number(data.prices[symbol]).toFixed(2));
                          } else {
                            formattedPrices[symbol] = null;
                          }
                        }
                        
                        localStorage.setItem('cachedTokenPrices', JSON.stringify(formattedPrices));
                        localStorage.setItem('cachedTokenPricesTimestamp', currentTime.toString());
                        console.log('Token prices preloaded successfully');
                      }
                    })
                    .catch(e => console.error('Error preloading token prices:', e));
                  } else {
                    console.log('Using cached token prices, cache age: ' + (pricesCacheAge / 1000 / 60).toFixed(2) + ' minutes');
                  }
                } catch (e) {
                  // Silently fail - this is just preloading
                  console.error('Error in preload script:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`
          bg-seaBlue-1100
          bg-contain
          bg-center
          bg-no-repeat
          text-gray-300
          ${atamiDisplay.variable}
          ${proximaNova.variable}   
          ${proximaNovaExtraBold.variable}  
          ${proximaNovaSemiBold.variable}  
          ${proximaNovaItalic.variable}   
          ${acuminMediumItalic.variable}
          ${acuminBold.variable}
          ${acuminSemiBold.variable}
          ${acuminMedium.variable}
          font-acuminMedium
          antialiased
        `}
      >
        <QueryProviders>
          <NetworkInfoProvider>
            <NotificationProvider>
              <ClientWalletProvider>
                <VoucherProvider>
                  <PriceProvider>
                    <RecaptchaProvider>
                      <NavBar />
                      <IntegrityVerifier nonce={nonce} />
                      <ServiceWorkerRegistration nonce={nonce} />
                      <div id="modal-root"></div>
                      <MinimalCaptchaBadge />
                      {children}
                      <ModalCookie nonce={nonce} />
                      <ClientCspRefreshPrompt />
                    </RecaptchaProvider>
                  </PriceProvider>
                </VoucherProvider>
              </ClientWalletProvider>
            </NotificationProvider>
          </NetworkInfoProvider>
        </QueryProviders>
        <Analytics />
      </body>
    </html>
  );
}
