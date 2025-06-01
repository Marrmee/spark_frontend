'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import ReactDOM from 'react-dom';

interface TermModalProps {
  term: string;
  children: ReactNode;
}

export default function TermModal({ term, children }: TermModalProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalPosition, setModalPosition] = useState({});
  const termRef = useRef<HTMLSpanElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const updateModalPosition = () => {
    const termRect = termRef.current?.getBoundingClientRect();
    if (termRect) {
      const modalWidth = 256; // Assuming 16rem = 256px
      const screenWidth = window.innerWidth;
      let leftPosition =
        termRect.left + termRect.width / 2 - modalWidth / 2 + window.scrollX;
      const rightEdge = leftPosition + modalWidth;

      if (rightEdge > screenWidth) {
        leftPosition -= rightEdge - screenWidth + 20;
      }

      if (leftPosition < 0) {
        leftPosition = 20;
      }

      setModalPosition({
        position: 'absolute',
        top: `${termRect.bottom + window.scrollY}px`,
        left: `${leftPosition}px`,
        maxWidth: '18rem',
        zIndex: 1000,
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      updateModalPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const currentTermRef = termRef.current;
    observerRef.current = new ResizeObserver(updateModalPosition);
    if (currentTermRef) {
      observerRef.current.observe(currentTermRef);
    }

    return () => {
      if (observerRef.current && currentTermRef) {
        observerRef.current.unobserve(currentTermRef);
        observerRef.current.disconnect();
      }
    };
  }, []);

  const modalContent = (
    <div
      style={modalPosition}
      className="mt-[0.1rem] animate-fadeIn rounded-lg border-[1px] 
      border-seaBlue-800/30 bg-gradient-to-b from-seaBlue-1000/95 
      to-seaBlue-1100/95 p-2 sm:p-4
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
    <div className="group relative">
      <span
        ref={termRef}
        className="inline-flex cursor-pointer items-center justify-center"
        onMouseEnter={() => {
          setShowModal(true);
          updateModalPosition();
        }}
        onMouseLeave={() => setShowModal(false)}
      >
        <span className="break-all text-steelBlue transition-colors duration-200 hover:text-tropicalBlue">{term}</span>
      </span>
      {showModal && ReactDOM.createPortal(modalContent, document.getElementById('modal-root')!)}
    </div>
  );
}
