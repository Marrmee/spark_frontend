'use client';

import React, { useEffect, useState } from 'react';

/**
 * A minimal reCAPTCHA badge that complies with Google's terms of service
 * This component should be included on any page that uses reCAPTCHA
 * Responsive design to be less intrusive on mobile devices
 */
const MinimalCaptchaBadge: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Hide the default reCAPTCHA badge when this component mounts
  useEffect(() => {
    // Add CSS to hide the default reCAPTCHA badge
    const style = document.createElement('style');
    style.innerHTML = `
      .grecaptcha-badge { 
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);

    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);

    return () => {
      // Clean up when component unmounts
      document.head.removeChild(style);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-2 right-2 z-10">
      {isMobile && !isExpanded ? (
        // Collapsed mobile view - just a small icon
        <button 
          onClick={toggleExpanded}
          className="bg-seaBlue-1100 border border-seaBlue-800/30 rounded-full p-1.5 shadow-sm"
          aria-label="Show reCAPTCHA information"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            className="w-3.5 h-3.5 text-blue-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      ) : (
        // Expanded view (default on desktop, optional on mobile)
        <div className="text-xs bg-seaBlue-1100 border border-seaBlue-800/30 py-1 px-3 rounded-sm flex items-center shadow-sm">
          {isMobile && (
            <button 
              onClick={toggleExpanded}
              className="mr-1.5 text-gray-400"
              aria-label="Hide reCAPTCHA information"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                className="w-3 h-3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <span className="text-gray-400">Protected by</span>{' '}
          <a 
            href="https://www.google.com/recaptcha/about/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 mx-1 font-medium"
          >
            reCAPTCHA
          </a>
          <span className="text-gray-400 mx-1">-</span>
          <a 
            href="https://policies.google.com/privacy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            Privacy
          </a>
          <span className="text-gray-400 mx-1">-</span>
          <a 
            href="https://policies.google.com/terms" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            Terms
          </a>
        </div>
      )}
    </div>
  );
};

export default MinimalCaptchaBadge; 