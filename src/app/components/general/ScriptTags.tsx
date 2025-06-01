'use client';

import Script from 'next/script';

interface ScriptTagsProps {
  nonce: string;
  GMT_ID: string;
}

export default function ScriptTags({ nonce, GMT_ID }: ScriptTagsProps) {
  return (
    <>
      <Script
        id="anti-clickjacking"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `if (window.top !== window.self) { window.top.location = window.self.location; }`
        }}
      />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GMT_ID}`}
        strategy="lazyOnload"
        nonce={nonce}
      />
      <Script
        id="google-analytics"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GMT_ID}', {
              page_path: window.location.pathname,
            });
          `
        }}
      />
    </>
  );
}
