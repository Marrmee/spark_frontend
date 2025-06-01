'use client';

import React, { useState, useLayoutEffect, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

// Create a dedicated portal container for tooltips
let tooltipPortalContainer: HTMLDivElement | null = null;

// Function to get or create the tooltip portal container
const getTooltipPortalContainer = () => {
  if (!tooltipPortalContainer && typeof document !== 'undefined') {
    tooltipPortalContainer = document.createElement('div');
    tooltipPortalContainer.id = 'tooltip-portal-container';
    tooltipPortalContainer.style.position = 'fixed';
    tooltipPortalContainer.style.top = '0';
    tooltipPortalContainer.style.left = '0';
    tooltipPortalContainer.style.width = '100%';
    tooltipPortalContainer.style.height = '0';
    tooltipPortalContainer.style.overflow = 'visible';
    tooltipPortalContainer.style.zIndex = '9999999'; // Ultra high z-index
    tooltipPortalContainer.style.pointerEvents = 'none';
    document.body.appendChild(tooltipPortalContainer);
  }
  return tooltipPortalContainer;
};

interface InfoToolTipProps {
  children: React.ReactNode;
  position?: 'bottom' | 'top' | 'left' | 'right';
  width?: number;
}

export default function InfoToolTip({ 
  children, 
  position = 'bottom',
  width = 512 
}: InfoToolTipProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalPosition, setModalPosition] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const updateModalPosition = useCallback(() => {
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const modalWidth = width; // Default width or custom width
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Calculate position based on the specified direction
      let topPosition, leftPosition;

      switch (position) {
        case 'top':
          topPosition = tooltipRect.top - 40; // Increased padding (was -8)
          leftPosition = tooltipRect.left + tooltipRect.width / 2 - modalWidth / 2;
          break;
        case 'left':
          topPosition = tooltipRect.top + tooltipRect.height / 2 + 5; // Added +5 to shift down
          leftPosition = tooltipRect.left - modalWidth - 20; // Increased padding (was -8)
          break;
        case 'right':
          topPosition = tooltipRect.top + tooltipRect.height / 2 + 5; // Added +5 to shift down
          leftPosition = tooltipRect.right + 20; // Increased padding (was 8)
          break;
        case 'bottom':
        default:
          topPosition = tooltipRect.bottom + 20; // Increased padding (was 2)
          leftPosition = tooltipRect.left + tooltipRect.width / 2 - modalWidth / 2;
          break;
      }

      // Define max height for the modal (e.g., 60% of viewport height)
      const maxAllowedModalHeight = screenHeight * 0.6;

      // Adjust topPosition to keep modal within vertical viewport bounds
      if (topPosition + maxAllowedModalHeight > screenHeight - 20) { // 20px bottom padding
        topPosition = screenHeight - maxAllowedModalHeight - 20;
      }
      topPosition = Math.max(20, topPosition); // 20px top padding

      // Ensure the modal stays within horizontal screen bounds (existing logic)
      const rightEdge = leftPosition + modalWidth;
      if (rightEdge > screenWidth) {
        leftPosition -= rightEdge - screenWidth + 20; // Increased padding (was 8)
      }

      if (leftPosition < 20) {
        leftPosition = 20; // Increased padding (was 8)
      }

      setModalPosition({
        position: 'fixed',
        top: `${topPosition}px`,
        left: `${leftPosition}px`,
        maxWidth: `${modalWidth}px`,
        zIndex: 999999,
      });
    }
  }, [position, width]);

  useEffect(() => {
    const handleResize = () => {
      updateModalPosition();
    };

    window.addEventListener('resize', handleResize);

    // Clean up the event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateModalPosition]);

  useLayoutEffect(() => {
    const currentTooltipRef = tooltipRef.current;
    observerRef.current = new ResizeObserver(updateModalPosition);

    if (currentTooltipRef) {
      observerRef.current.observe(currentTooltipRef);
    }

    return () => {
      if (observerRef.current && currentTooltipRef) {
        observerRef.current.unobserve(currentTooltipRef);
        observerRef.current.disconnect();
      }
    };
  }, [updateModalPosition]);

  useEffect(() => {
    if (showModal) {
      updateModalPosition();
    }
  }, [showModal, updateModalPosition]);

  const modalContent = (
    <div
      style={{
        ...modalPosition,
        zIndex: 999999, // Ensure extremely high z-index
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // Enhanced shadow for better visibility
        pointerEvents: 'auto', // Enable pointer events for the tooltip content
        maxHeight: '60vh', // Added maxHeight for scrollability
        overflowY: 'auto', // Added overflowY for scrollability
      }}
      className="mt-[0.1rem] animate-fadeIn rounded-lg border-[1px] 
      border-seaBlue-800/30 bg-gradient-to-b from-seaBlue-1000/95 
      to-seaBlue-1100/95 p-3 sm:p-5 
      text-center text-xs sm:text-base shadow-lg
      shadow-seaBlue-900/20 ring-1
      ring-seaBlue-500/20
      backdrop-blur-md backdrop-filter
      max-w-[256px] sm:max-w-[512px]"
    >
      {children}
    </div>
  );

  return (
    <div
      ref={tooltipRef}
      className="relative inline-flex items-center justify-center text-[#4C7BEA] 
      transition-colors duration-200 hover:text-[#6B91EE]"
      onMouseEnter={() => {
        setShowModal(true);
      }}
      onMouseLeave={() => setShowModal(false)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="hover:glow-blue-500 h-[16px] w-4 sm:w-5 translate-y-[1px]"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
          className="fill-[#4C7BEA]/10"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M12 16V11M12 8V8.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showModal &&
        ReactDOM.createPortal(
          modalContent,
          getTooltipPortalContainer() || document.body
        )}
    </div>
  );
}
