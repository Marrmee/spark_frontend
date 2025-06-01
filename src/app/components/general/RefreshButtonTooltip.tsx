'use client';

import React, { useState, useEffect } from 'react';

interface RefreshButtonTooltipProps {
  isVisible: boolean;
  timeLeft: string;
}

export default function RefreshButtonTooltip({ isVisible, timeLeft }: RefreshButtonTooltipProps) {
  const [mounted, setMounted] = useState(false);

  // Only run on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isVisible) return null;
  
  return (
    <div 
      className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 z-50"
    >
      <div
        className="bg-gray-800 text-white px-3 py-2 rounded shadow-lg text-sm whitespace-nowrap"
      >
        Cooldown active: {timeLeft} remaining
        <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 left-1/2 -translate-x-1/2 -bottom-1"></div>
      </div>
    </div>
  );
} 