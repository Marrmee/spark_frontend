'use client';

import { ReactNode, useEffect } from 'react';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

/**
 * Provider component that sets up Google reCAPTCHA v3 context for child components.
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components that need access to reCAPTCHA
 * @returns {JSX.Element} - Provider component with children
 */
const RecaptchaProvider = ({ children }: { children: ReactNode }) => {
  const reCaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? '';

  useEffect(() => {
    console.log('[RecaptchaProvider] Initializing with site key:', 
      reCaptchaKey ? 'Key present' : 'No key found');
  }, [reCaptchaKey]);

  if (!reCaptchaKey) {
    console.error('[RecaptchaProvider] No reCAPTCHA site key found in environment variables');
    return <>{children}</>;
  }

  // Add a global callback for script loading
  const callbackName = 'onRecaptchaLoaded';
  if (typeof window !== 'undefined') {
    window[callbackName] = () => console.log('[RecaptchaProvider] reCAPTCHA script loaded');
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={reCaptchaKey}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head',
        id: 'recaptcha-script',
        onLoadCallbackName: callbackName,
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
};

export default RecaptchaProvider; 