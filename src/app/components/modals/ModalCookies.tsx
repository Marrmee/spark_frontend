'use client';

import React, { useEffect } from 'react';
import { setCookie, getCookieValue } from '@/app/utils/cookieUtils';
import Link from 'next/link';
import Script from 'next/script';

interface ModalCookiesProps {
  nonce: string;
}

const ModalCookie: React.FC<ModalCookiesProps> = ({ nonce }) => {
  useEffect(() => {
    if (!getCookieValue('cookiesAccepted')) {
      document.getElementById('cookies-modal')!.style.display = 'flex';
      document.getElementById('cookies-backdrop')!.style.display = 'block';
    }
  }, []);

  const handleAccept = () => {
    setCookie('cookiesAccepted', `true:${nonce}`, 365);
    document.getElementById('cookies-modal')!.style.display = 'none';
    document.getElementById('cookies-backdrop')!.style.display = 'none';
  };

  return (
    <>
      <Script
        id="cookie-modal-script"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            function handleCookieAccept() {
              document.getElementById('cookies-modal').style.display = 'none';
              document.getElementById('cookies-backdrop').style.display = 'none';
            }
          `
        }}
      />
      <div
        id="cookies-backdrop"
        className="fixed inset-0 z-40 max-w-full bg-black bg-opacity-50"
        style={{ display: 'none' }}
      ></div>
      <div
        id="cookies-modal"
        className="fixed 
        bottom-0 
        right-0 
        z-50  
        flex 
        w-full 
        max-w-[35rem] 
        items-start 
        rounded-lg 
        border-[1px] 
        border-orange-500 
        bg-seaBlue-950 
        sm:w-[35rem]
        "
        style={{ display: 'none' }}
      >
        <div className="rounded-lg p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold">Cookies Policy</h2>
          <p className="mb-4">
            We use cookies to improve your experience on our site. By continuing
            to use our site, you accept our use of cookies.
          </p>
          <p className="mb-4">
            By accepting, you also agree to our{' '}
            <Link href="/privacy-policy" className="text-steelBlue hover:text-tropicalBlue underline">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms-of-service" className="text-steelBlue hover:text-tropicalBlue underline">
              Terms of Service
            </Link>
            .
          </p>
          <button
            onClick={handleAccept}
            className="rounded bg-seaBlue-1000 px-4 py-2 text-white hover:bg-blue-600"
            data-nonce={nonce}
          >
            Accept
          </button>
        </div>
      </div>
    </>
  );
};

export default ModalCookie;
