import styles from '../general/Button.module.css';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';

interface ProposalConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function ProposalConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: ProposalConfirmationModalProps) {
  // Add cleanup effect when modal closes
  useEffect(() => {
    // Force cleanup when component unmounts
    const cleanup = setTimeout(() => {
      // This is an empty cleanup function that helps ensure any stale references are cleared
    }, 0);
    
    return () => clearTimeout(cleanup);
  }, []);

  if (!isOpen) return null;

  // Use createPortal to render the modal outside the normal DOM hierarchy
  return createPortal(
    <div 
      className="fixed inset-0 z-20 flex items-center justify-center px-4 sm:px-6"
      // Add data attributes to signal to extensions not to inject UI here
      data-extension-ignore="true"
      data-iframe-ignore="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-seaBlue-1100/80 backdrop-blur-sm transition-opacity"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Modal */}
      <div 
        className="relative z-50 w-full max-w-md transform overflow-hidden rounded-lg border border-seaBlue-1025 hover:shadow-glow-highlightRed-intermediate bg-seaBlue-1075 p-6 text-left shadow-xl transition-all sm:max-w-xl md:max-w-2xl sm:p-8"
        data-extension-ignore="true"
      >
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-center text-lg font-semibold leading-6 text-seaBlue-100 sm:text-2xl">
            READY TO SUBMIT YOUR PROPOSAL?
          </h3>
        </div>

        {/* Content */}
        <div className="mb-4 sm:mb-8">
          <p className="mb-3 text-sm text-seaBlue-100 sm:mb-6 sm:text-base">
            Please review these important points before proceeding:
          </p>
          <ul className="space-y-4 sm:space-y-6">
            <li className="flex items-center space-x-4 sm:space-x-5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-seaBlue-800 border border-seaBlue-600 shadow-sm">
                <span className="text-sm font-medium text-seaBlue-100">1</span>
              </div>
              <div className="flex-1">
                <span className="text-sm text-seaBlue-100 sm:text-base">
                  Once submitted, the proposal content <span className="font-medium text-highlightRed">cannot be modified</span>
                </span>
              </div>
            </li>
            <li className="flex items-center space-x-4 sm:space-x-5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-seaBlue-800 border border-seaBlue-600 shadow-sm">
                <span className="text-sm font-medium text-seaBlue-100">2</span>
              </div>
              <div className="flex-1">
                <span className="text-sm text-seaBlue-100 sm:text-base">
                  Your tokens will be <span className="font-medium text-highlightRed">locked</span> for the specified period
                </span>
              </div>
            </li>
            <li className="flex items-center space-x-4 sm:space-x-5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-seaBlue-800 border border-seaBlue-600 shadow-sm">
                <span className="text-sm font-medium text-seaBlue-100">3</span>
              </div>
              <div className="flex-1">
                <span className="text-sm text-seaBlue-100 sm:text-base">
                  The proposal will be <span className="font-medium text-highlightRed">publicly visible</span> on the Base network
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-2 sm:flex-row w-full sm:gap-4">
          {!isLoading && (
            <button
              type="button"
              onClick={onClose}
              className={`${styles.secondary} w-full sm:px-8 border-seaBlue-1025 bg-seaBlue-300 text-seaBlue-1025 `}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`${styles.primary} bg-[#1B2885] hover:bg-[#263AAD] w-full sm:px-8 flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-seaBlue-100 border-t-transparent" />
                <span>Submitting Proposal...</span>
              </>
            ) : (
              'Submit Proposal'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
} 