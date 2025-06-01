'use client';

import React from 'react';

interface ContentRefreshOverlayProps {
  isVisible: boolean;
  className?: string;
}

export default function ContentRefreshOverlay({ isVisible, className = '' }: ContentRefreshOverlayProps) {
  if (!isVisible) return null;
  
  return (
    <div className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 ${className}`}>
      <div className="bg-seaBlue-1100 p-6 rounded-lg shadow-lg flex flex-col items-center">
        <div className="animate-spin h-10 w-10 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-lg text-gray-300">Refreshing proposal data...</p>
      </div>
    </div>
  );
} 