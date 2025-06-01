'use client';

import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ModalSubmissionProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  ideaId: string | number;
}

const ModalSubmission: React.FC<ModalSubmissionProps> = ({ isOpen, onClose, title, ideaId }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out animate-fadeIn">
      <div className="relative mx-4 w-full max-w-md transform rounded-2xl border border-seaBlue-700/50 bg-gradient-to-br from-seaBlue-1000 to-seaBlue-1050 p-6 text-white shadow-2xl shadow-seaBlue-900/30 transition-all duration-300 ease-in-out animate-scaleUp">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-seaBlue-400 hover:text-seaBlue-200 transition-colors"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-seafoamGreen bg-seafoamGreen/20 text-seafoamGreen shadow-glow-seafoamGreen-limited">
            <CheckCircle size={40} strokeWidth={1.5} />
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight animate-gradient-x bg-gradient-to-r from-seafoamGreen via-emerald-400 to-white bg-clip-text text-transparent">
            Submission Successful!
          </h2>
          <p className="mb-2 text-sm text-seaBlue-200">
            Your idea, <strong className="font-semibold text-orange-400">&ldquo;{title}&rdquo;</strong>, has been submitted.
          </p>
          <p className="mb-6 text-sm text-seaBlue-300">
            Reference ID: <span className="font-mono text-seaBlue-100">{ideaId}</span>
          </p>
          <button
            onClick={onClose}
            className="group relative w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 rounded-full text-white font-semibold text-base transition-all duration-300 hover:shadow-glow-fieryRed-limited overflow-hidden"
          >
            <span className="relative z-10">
              Got it!
            </span>
            <span className="absolute inset-0 origin-left scale-x-0 transform bg-gradient-to-r from-orange-500 to-orange-400 transition-transform duration-500 group-hover:scale-x-100"></span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalSubmission; 