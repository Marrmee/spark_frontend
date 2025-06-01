import styles from './../general/Button.module.css';
import { useState, useEffect } from 'react';

interface FinalizeConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    requiredUpvotesThreshold: number;
    upvoteDeadlineDays: number; // Placeholder for now
  }
  
  export function ModalFinalizeConfirmation({
    isOpen,
    onClose,
    onConfirm,
    isLoading,
    requiredUpvotesThreshold,
    upvoteDeadlineDays,
  }: FinalizeConfirmationModalProps) {
    const [understoodImmutability, setUnderstoodImmutability] = useState(false);
    const [understoodUpvoteRequirement, setUnderstoodUpvoteRequirement] =
      useState(false);
    const [understoodNotificationRequirement, setUnderstoodNotificationRequirement] = useState(false);
  
    useEffect(() => {
      // Reset checkboxes when modal opens
      if (isOpen) {
        setUnderstoodImmutability(false);
        setUnderstoodUpvoteRequirement(false);
        setUnderstoodNotificationRequirement(false);
      }
    }, [isOpen]);
  
    const canConfirm = understoodImmutability && understoodUpvoteRequirement && understoodNotificationRequirement;
  
    if (!isOpen) return null;
  
    return (
      <div className=" fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="w-full max-w-lg rounded-lg border-[1px] border-tropicalBlue bg-seaBlue-1075 p-6 shadow-glow-tropicalBlue-intermediate sm:max-w-[36rem]">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-lg font-semibold sm:text-xl">
              Confirm Draft Finalization
            </h2>
            <button
              className="text-2xl font-bold text-highlightRed/80 transition-colors hover:text-highlightRed"
              onClick={onClose}
              aria-label="Close"
              disabled={isLoading}
            >
              &times;
            </button>
          </div>
  
          <div className="space-y-4 pb-6">
            <p className="text-sm text-seaBlue-100 sm:text-base">
              Please review and confirm the following before proceeding:
            </p>
  
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="understoodImmutabilityCheck"
                checked={understoodImmutability}
                onChange={() =>
                  setUnderstoodImmutability(!understoodImmutability)
                }
                className="mt-1 h-5 w-5 accent-highlightRed disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              />
              <label
                htmlFor="understoodImmutabilityCheck"
                className="text-sm text-seaBlue-100 sm:text-base"
              >
                I understand that finalizing this proposal will end the draft
                phase. The proposal content (title, summary, body, execution
                details) will become{' '}
                <span className="font-bold text-highlightRed">immutable</span> and
                cannot be edited further.
              </label>
            </div>
  
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="understoodUpvoteRequirementCheck"
                checked={understoodUpvoteRequirement}
                onChange={() =>
                  setUnderstoodUpvoteRequirement(!understoodUpvoteRequirement)
                }
                className="mt-1 h-5 w-5 accent-highlightRed disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              />
              <label
                htmlFor="understoodUpvoteRequirementCheck"
                className="text-sm text-seaBlue-100 sm:text-base"
              >
                I understand that after finalizing, this proposal must receive at
                least{' '}
                <span className="font-bold text-highlightRed">
                  {requiredUpvotesThreshold?.toLocaleString() ?? 'N/A'} upvotes
                </span>{' '}
                within{' '}
                <span className="font-bold text-highlightRed">
                  {upvoteDeadlineDays} days
                </span>{' '}
                to become eligible for conversion to an on-chain proposal.
              </label>
            </div>
  
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="understoodNotificationRequirementCheck"
                checked={understoodNotificationRequirement}
                onChange={() => setUnderstoodNotificationRequirement(!understoodNotificationRequirement)}
                className="mt-1 h-5 w-5 accent-highlightRed disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              />
              <label
                htmlFor="understoodNotificationRequirementCheck"
                className="text-sm text-seaBlue-100 sm:text-base"
              >
                I commit to notifying the community about this proposal on <span className="font-bold text-highlightRed">X (formerly Twitter)</span> and in both{' '}
                <span className="font-bold text-highlightRed">Discord</span> and{' '}
                <span className="font-bold text-highlightRed">Telegram</span> channels
                to encourage upvoting.
              </label>
            </div>
          </div>
  
          <div className="flex flex-col items-center justify-end gap-4 sm:flex-row">
            <button
              onClick={onClose}
              className={`${styles.secondary} w-full sm:w-auto`}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`${styles.primary} w-full sm:w-auto ${!canConfirm || isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
              disabled={!canConfirm || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="mr-2 block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Finalizing...
                </>
              ) : (
                'Confirm and Start Voting'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }