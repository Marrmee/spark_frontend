'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWallet } from '@/app/context/WalletContext';
import { Comment } from '@/app/utils/interfaces';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faThumbsUp,
  faThumbsDown,
  faReply,
  faTrash,
  faSpinner,
  faFlag,
} from '@fortawesome/free-solid-svg-icons';
import { useBatchEnsNames } from '../hooks/UseEnsName';
import { useNotification } from '@/app/context/NotificationContext';
// @typescript-eslint/no-unused-vars
import { enhancedSanitizeInput } from '@/app/utils/securityUtils';
import { enhancedScamCheck } from '@/app/utils/securityChecks';
import {
  SecurityEventType,
  logSecurityEvent,
} from '@/app/utils/securityMonitoring';
import { useEcosystemBalances } from '../hooks/UseEcosystemBalances';
import { useNetworkInfo } from '@/app/context/NetworkInfoContext';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

type CommentProps = {
  comment: Comment;
  onReply: (parentId: number, content: string) => Promise<boolean>;
  onReaction: (commentId: number, reactionType: 'like' | 'dislike') => void;
  onDelete: (commentId: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReport: (commentId: number, reason: string) => Promise<any>;
  ensNames: Map<string, string | null>;
  level?: number;
  deletingCommentId?: number | null;
};

function CommentComponent({
  comment,
  onReply,
  onReaction,
  onDelete,
  onReport,
  ensNames,
  level = 0,
  deletingCommentId,
}: CommentProps) {
  const wallet = useWallet();
  const isAuthor =
    wallet?.state?.address?.toLowerCase() ===
    comment.author_address.toLowerCase();
  const formattedDate = new Date(comment.created_at).toLocaleDateString();
  const isDeleted = comment.content === '[deleted]';
  const isHidden = comment.moderation_status === 'hidden';
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const { addNotification } = useNotification();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Create a stable key for this comment's expanded state
  const commentKey = useMemo(
    () => `comment-${comment.id}-expanded`,
    [comment.id]
  );

  // Initialize expanded state from localStorage if available
  useEffect(() => {
    const savedState = localStorage.getItem(commentKey);
    if (savedState === 'true') {
      setShowAllReplies(true);
    }
  }, [commentKey]);

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    if (showAllReplies) {
      localStorage.setItem(commentKey, 'true');
    } else {
      localStorage.removeItem(commentKey);
    }
  }, [showAllReplies, commentKey]);

  // Get ENS name from the map
  const ensName = ensNames.get(comment.author_address);
  const displayName = isDeleted
    ? `${ensNames.get(comment.author_address) || `${comment.author_address.slice(0, 6)}...${comment.author_address.slice(-4)}`}`
    : ensName ||
      `${comment.author_address.slice(0, 6)}...${comment.author_address.slice(-4)}`;

  // Constants
  const INITIAL_REPLIES_TO_SHOW = 2;
  const hasReplies =
    Array.isArray(comment.replies) && comment.replies.length > 0;
  const totalReplies = comment.total_replies || 0;
  const directReplies = comment.replies?.length || 0;

  // Calculate visible replies
  const visibleReplies = useMemo(() => {
    if (!hasReplies || !comment.replies) return [];
    if (level > 0) return comment.replies; // Show all replies for nested comments
    return showAllReplies
      ? comment.replies
      : comment.replies.slice(0, INITIAL_REPLIES_TO_SHOW);
  }, [comment.replies, showAllReplies, hasReplies, level]);

  // Check if all direct replies are deleted
  const allRepliesDeleted = useMemo(() => {
    if (!comment.replies || comment.replies.length === 0) {
      // If there are no replies, consider them "all deleted" for the purpose of hiding the parent
      return true;
    }
    return comment.replies.every(reply => reply.content === '[deleted]');
  }, [comment.replies]);

  // Determine if the current comment is the one being deleted
  const isCurrentlyDeleting = comment.id === deletingCommentId;

  // Determine if the entire comment block should be hidden
  const shouldHideComment = isDeleted && allRepliesDeleted;

  // Enhanced debug logging - only for top-level comments
  useEffect(() => {
    if (level === 0) {
      console.log('Comment Debug:', {
        commentId: comment.id,
        content: comment.content.slice(0, 20) + '...',
        totalReplies,
        directReplies,
        showingReplies: visibleReplies?.length || 0,
        hasMoreThanTwo: totalReplies > INITIAL_REPLIES_TO_SHOW,
        isExpanded: showAllReplies,
      });
    }
  }, [
    comment.id,
    comment.content,
    totalReplies,
    directReplies,
    visibleReplies,
    showAllReplies,
    level,
  ]);

  // Add component mount/update tracking - only for top-level comments
  useEffect(() => {
    if (level === 0) {
      console.log('Top-Level Comment Update:', {
        commentId: comment.id,
        isMount: true,
        stateValues: {
          showAllReplies,
          showReplyForm,
          repliesCount: comment.replies?.length || 0,
        },
      });

      return () => {
        console.log('Top-Level Comment Unmount:', {
          commentId: comment.id,
        });
      };
    }
  }, [
    comment.id,
    level,
    comment.replies?.length,
    showAllReplies,
    showReplyForm,
  ]);

  // Debug logs for comments with many replies - only for top-level comments
  useEffect(() => {
    if (level === 0 && comment.replies && comment.replies.length > 3) {
      console.log('Top-Level Comment with many replies:', {
        id: comment.id,
        content: comment.content.slice(0, 20) + '...',
        repliesCount: comment.replies.length,
      });
    }
  }, [comment.id, level, comment.replies, comment.content]); // Only run once per comment

  const handleReportInComponent = async () => {
    if (!wallet?.state?.address || !reportReason.trim()) return;

    setIsReporting(true);
    try {
      const data = await onReport(comment.id, reportReason.trim());
      
      if (data?.error) {
        addNotification(
          data.details || data.error,
          data.details ? 'error' : 'warning'
        );
      } else if (data?.success) {
        addNotification('Comment reported successfully', 'success');
        setIsReportModalOpen(false);
        setReportReason('');
      } else {
        addNotification('Unknown error occurred while reporting', 'error');
      }
    } catch (error) {
      console.error('Error reporting comment:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to report comment',
        'error'
      );
    } finally {
      setIsReporting(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet?.state?.address || !replyContent.trim()) return;

    setIsSubmittingReply(true);
    try {
      // Check for scams in the reply content
      const scamCheck = enhancedScamCheck(replyContent);
      if (scamCheck.detected) {
        addNotification(
          `Potential scam detected: ${scamCheck.patterns.join(', ')}`,
          'error'
        );

        // Log the security event
        await logSecurityEvent(
          SecurityEventType.SCAM_DETECTED,
          {
            content: 'comment_reply',
            patterns: scamCheck.patterns,
            commentId: comment.id,
          },
          scamCheck.severity
        );

        // Clear the content when profanity/scam is detected
        setReplyContent('');
        setIsSubmittingReply(false);
        // Focus the textarea for easier editing
        replyTextareaRef.current?.focus();
        return;
      }

      // Use enhanced sanitization
      const sanitizationResult = await enhancedSanitizeInput(
        replyContent.trim(),
        {
          maxLength: 1000, // Adjust as needed
          allowHtml: false,
          checkForScams: true,
        }
      );

      if (!sanitizationResult.isValid) {
        addNotification(
          `Input validation failed: ${sanitizationResult.issues.join(', ')}`,
          'error'
        );
        // Clear the content when validation fails
        setReplyContent('');
        setIsSubmittingReply(false);
        // Focus the textarea for easier editing
        replyTextareaRef.current?.focus();
        return;
      }

      // Call onReply and get the result
      const success = await onReply(
        comment.id,
        sanitizationResult.sanitizedInput
      );

      // Clear content after successful submission
      setReplyContent('');

      // Only close the form if submission was successful
      if (success) {
        setShowReplyForm(false);
      } else {
        // Focus the textarea for easier editing if there was an error
        replyTextareaRef.current?.focus();
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      addNotification('Failed to submit reply', 'error');
      // Don't clear content on general errors
      // Focus the textarea for easier editing
      replyTextareaRef.current?.focus();
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReplyClick = () => {
    if (!wallet?.state?.address) {
      addNotification(
        'Please connect your wallet to reply to comments',
        'warning'
      );
      return;
    }
    setShowReplyForm(!showReplyForm);
  };

  const handleReactionWithAuth = (
    commentId: number,
    reactionType: 'like' | 'dislike'
  ) => {
    if (!wallet?.state?.address) {
      addNotification(
        'Please connect your wallet to react to comments',
        'warning'
      );
      return;
    }
    onReaction(commentId, reactionType);
  };

  // Hide the component completely if it's deleted and all its replies are also deleted
  if (shouldHideComment) {
    return null;
  }

  if (isHidden) {
    return (
      <div className={`mb-3 ${level > 0 ? 'ml-4 sm:ml-8' : ''}`}>
        <div className="rounded-lg border border-seaBlue-1025 bg-seaBlue-1075 p-3 sm:p-4">
          <p className="text-sm italic text-gray-400 sm:text-base">
            This comment has been hidden by a moderator
          </p>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 sm:mt-4">
            {comment.replies.map((reply) => (
              <CommentComponent
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onReaction={onReaction}
                onDelete={onDelete}
                onReport={onReport}
                ensNames={ensNames}
                level={level + 1}
                deletingCommentId={deletingCommentId}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`mb-3 ${level === 1 ? 'ml-4 sm:ml-8' : level > 1 ? 'ml-0' : ''}`}
    >
      <div className="relative rounded-lg border border-seaBlue-1025 bg-seaBlue-1075 p-3 sm:p-4">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          {/* Info Container: stacks vertically on mobile, rows/wraps on desktop */}
          <div className="flex flex-col items-start sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            {/* Author + Date Group: always inline */}
            <div className="flex items-center gap-2">
              <span
                className={`text-sm sm:text-base ${isDeleted ? 'text-gray-400' : 'text-[#2D7FEA]'}`}
              >
                {displayName}
              </span>
              <span className="text-xs text-gray-400 sm:text-sm">
                {formattedDate}
              </span>
            </div>
            {/* Replying To: below Author/Date on mobile, inline on desktop */}
            {level > 0 && comment.parent_author_address && (
              <span className="text-xs text-gray-400 sm:text-sm">
                replying to{' '}
                {ensNames.get(comment.parent_author_address) ||
                  `${comment.parent_author_address.slice(0, 6)}...${comment.parent_author_address.slice(-4)}`}
              </span>
            )}
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-2 sm:static sm:right-auto sm:top-auto sm:mt-0">
            {!isDeleted && !isAuthor && wallet?.state?.address && (
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="text-gray-400 hover:text-highlightRed"
                title="Report comment"
              >
                <FontAwesomeIcon
                  icon={faFlag}
                  className="text-sm sm:text-base"
                />
              </button>
            )}
            {!isDeleted && isAuthor && (
              <button
                onClick={() => {
                  if (isCurrentlyDeleting) return; // Prevent multiple clicks
                  onDelete(comment.id);
                }}
                className={`text-highlightRed hover:text-red-400 ${isCurrentlyDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isCurrentlyDeleting}
                title={isCurrentlyDeleting ? "Deleting..." : "Delete comment"}
              >
                {isCurrentlyDeleting ? (
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin text-sm sm:text-base"
                    />
                    <span className="ml-1.5 text-xs sm:text-sm">Deleting...</span>
                  </div>
                ) : (
                  <FontAwesomeIcon
                    icon={faTrash}
                    className="text-sm sm:text-base"
                  />
                )}
              </button>
            )}
          </div>
        </div>
        <p
          className={`mb-3 whitespace-pre-wrap text-sm sm:mb-4 sm:text-base ${isDeleted ? 'italic text-gray-400' : ''}`}
        >
          {isDeleted ? 'Comment deleted' : decodeHtmlEntities(comment.content)}
        </p>
        {!isDeleted && (
          <div className="flex items-center gap-3 text-sm sm:gap-4 sm:text-base">
            <button
              onClick={() => handleReactionWithAuth(comment.id, 'like')}
              className={`flex items-center gap-1 sm:gap-2 ${
                comment.reactions?.userReaction === 'like'
                  ? 'text-neonGreen hover:text-gray-400'
                  : 'text-gray-400 hover:text-neonGreen'
              }`}
              title={
                comment.reactions?.userReaction === 'like'
                  ? 'Remove like'
                  : 'Like'
              }
            >
              <FontAwesomeIcon
                icon={faThumbsUp}
                className="text-sm sm:text-base"
              />
              <span>{comment.reactions?.likes || 0}</span>
            </button>
            <button
              onClick={() => handleReactionWithAuth(comment.id, 'dislike')}
              className={`flex items-center gap-1 sm:gap-2 ${
                comment.reactions?.userReaction === 'dislike'
                  ? 'text-highlightRed hover:text-gray-400'
                  : 'text-gray-400 hover:text-highlightRed'
              }`}
              title={
                comment.reactions?.userReaction === 'dislike'
                  ? 'Remove dislike'
                  : 'Dislike'
              }
            >
              <FontAwesomeIcon
                icon={faThumbsDown}
                className="text-sm sm:text-base"
              />
              <span>{comment.reactions?.dislikes || 0}</span>
            </button>
            <button
              onClick={handleReplyClick}
              className="flex items-center gap-1 text-gray-400 hover:text-[#2D7FEA] sm:gap-2"
            >
              <FontAwesomeIcon
                icon={faReply}
                className="text-sm sm:text-base"
              />
              <span>Reply</span>
            </button>
          </div>
        )}
      </div>

      {/* Inline Reply Form */}
      {showReplyForm && wallet?.state?.address && (
        <div className="ml-4 mt-3 sm:ml-8">
          <form onSubmit={handleReplySubmit} className="space-y-3">
            <div className="text-sm text-gray-400">
              Replying to {displayName}
            </div>
            <textarea
              ref={replyTextareaRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="min-h-[100px] w-full rounded-lg border border-seaBlue-1025 bg-seaBlue-1075 p-3 text-white placeholder-gray-400 focus:border-[#2D7FEA] focus:outline-none"
              required
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmittingReply}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#2D7FEA] px-4 py-2 text-white hover:bg-[#4B9BFF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingReply ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin"
                    />
                    Posting...
                  </>
                ) : (
                  'Post Reply'
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowReplyForm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comments List */}
      {hasReplies && (
        <div className="mt-3">
          {/* View replies button - show first */}
          {level === 0 && directReplies > 0 && !showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="mb-2 ml-4 text-sm text-[#2D7FEA] hover:text-[#4B9BFF] sm:ml-8"
            >
              {`View ${totalReplies} ${totalReplies === 1 ? 'reply' : 'replies'}`}
            </button>
          )}

          {/* Show replies */}
          {(level > 0 || showAllReplies) &&
            visibleReplies.map((reply) => (
              <CommentComponent
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onReaction={onReaction}
                onDelete={onDelete}
                onReport={onReport}
                ensNames={ensNames}
                level={level + 1}
                deletingCommentId={deletingCommentId}
              />
            ))}

          {/* Show less button */}
          {level === 0 && directReplies > 0 && showAllReplies && (
            <button
              onClick={() => setShowAllReplies(false)}
              className="ml-4 mt-2 text-sm text-[#2D7FEA] hover:text-[#4B9BFF] sm:ml-8"
            >
              Show less replies
            </button>
          )}
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-seaBlue-1075 p-4 sm:p-6">
            <h3 className="mb-4 text-base font-bold sm:text-lg">
              Report Comment
            </h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Please provide a reason for reporting this comment..."
              className="mb-4 min-h-[100px] w-full rounded-lg border border-seaBlue-1025 bg-seaBlue-1100 p-3 text-sm text-white placeholder-gray-400 sm:text-base"
              required
            />
            <div className="flex justify-end gap-3 sm:gap-4">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="rounded-lg border border-seaBlue-1025 px-3 py-2 text-sm text-gray-400 hover:bg-seaBlue-1025 sm:px-4 sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleReportInComponent}
                disabled={isReporting || !reportReason.trim()}
                className="flex items-center gap-2 rounded-lg bg-highlightRed px-3 py-2 text-sm text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-base"
              >
                {isReporting ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin"
                    />
                    Reporting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type CommentsProps = {
  proposalIndex: number;
  proposalType: string;
};

export default function Comments({
  proposalIndex,
  proposalType,
}: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingMainComment, setIsPostingMainComment] = useState(false);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const wallet = useWallet();
  const networkInfo = useNetworkInfo();
  const { addNotification } = useNotification();
  const notifyRef = useRef(addNotification);
  const mainCommentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { executeRecaptcha } = useGoogleReCaptcha();

  // Collect all unique addresses
  const uniqueAddresses = useMemo(() => {
    const addresses = new Set<string>();

    function collectAddresses(comment: Comment) {
      addresses.add(comment.author_address);
      if (comment.replies) {
        comment.replies.forEach(collectAddresses);
      }
    }

    comments.forEach(collectAddresses);
    return Array.from(addresses);
  }, [comments]);

  // Use the batch ENS resolution hook
  const ensNames = useBatchEnsNames(uniqueAddresses);

  // Get locked SCI from the ecosystem balances hook
  const { lockedSci } = useEcosystemBalances(
    wallet?.state?.address || undefined,
    '',
    '',
    networkInfo?.sciManager
  );

  // Update ref when addNotification changes
  useEffect(() => {
    notifyRef.current = addNotification;
  }, [addNotification]);

  // Check locked tokens
  const checkLockedTokens = async (): Promise<boolean> => {
    try {
      // Since users need to be logged in to comment/reply,
      // we only need to check the current user's locked tokens
      const lockedAmount = parseFloat(lockedSci);
      return lockedAmount >= 10;
    } catch (error) {
      console.error('Error parsing locked SCI amount:', error);
      return false;
    }
  };

  const fetchComments = useCallback(async () => {
    try {
      const userAddress = wallet?.state?.address?.toLowerCase() || '';
      const response = await fetch(
        `/api/comments?proposalIndex=${proposalIndex}&proposalType=${proposalType}&userAddress=${userAddress}`
      );
      const data = await response.json();

      if (data.error) {
        notifyRef.current(data.error, 'error');
        setComments([]);
      } else if (Array.isArray(data)) {
        setComments(data);
      } else {
        notifyRef.current('Invalid response format', 'error');
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      notifyRef.current('Failed to fetch comments', 'error');
      setComments([]);
    }
  }, [proposalIndex, proposalType, wallet?.state?.address]);

  useEffect(() => {
    let mounted = true;

    const doFetch = async () => {
      if (!mounted || isFetching) return;
      setIsFetching(true);
      await fetchComments();
      if (mounted) {
        setIsFetching(false);
      }
    };

    doFetch();

    return () => {
      mounted = false;
    };
  }, [fetchComments, isFetching]);

  // Generate reCAPTCHA token for a specific action
  const generateRecaptchaToken = async (action: string): Promise<string | null> => {
    if (!executeRecaptcha) {
      console.warn('[Comments] reCAPTCHA not yet available');
      addNotification(
        'Security verification not available. Please try again.',
        'error'
      );
      return null;
    }

    setIsGeneratingToken(true);
    try {
      console.log(`[Comments] Generating reCAPTCHA token for ${action}`);
      const token = await executeRecaptcha(action);
      console.log('[Comments] reCAPTCHA token generated');
      return token;
    } catch (error) {
      console.error('[Comments] Error generating reCAPTCHA token:', error);
      addNotification(
        'Could not perform security verification. Please try again.',
        'error'
      );
      return null;
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleReply = async (parentId: number, content: string) => {
    if (!wallet?.state?.address) {
      addNotification('Please connect your wallet to post comments', 'warning');
      return false; // Return false to indicate failure
    }

    if (parentId === 0) {
      setIsVerifyingCaptcha(true);
      setIsPostingMainComment(false); // Ensure posting is false when verification starts
    }
    // For replies, CommentComponent handles its own button state.

    try {
      // Check for scams in the content
      const scamCheck = enhancedScamCheck(content);
      if (scamCheck.detected) {
        addNotification(
          `Potential scam detected: ${scamCheck.patterns.join(', ')}`,
          'error'
        );

        // Log the security event
        await logSecurityEvent(
          SecurityEventType.SCAM_DETECTED,
          {
            content: 'comment',
            patterns: scamCheck.patterns,
            proposalIndex,
            proposalType,
          },
          scamCheck.severity
        );

        // Clear the content when profanity/scam is detected in the main comment form
        if (parentId === 0) {
          setNewComment('');
          mainCommentTextareaRef.current?.focus();
        }

        // setIsLoading(false); // Old: will be handled by finally
        return false; // Return false to indicate failure
      }

      // Use enhanced sanitization
      const sanitizationResult = await enhancedSanitizeInput(content, {
        maxLength: 1000, // Adjust as needed
        allowHtml: false,
        checkForScams: true,
      });

      if (!sanitizationResult.isValid) {
        addNotification(
          `Input validation failed: ${sanitizationResult.issues.join(', ')}`,
          'error'
        );

        // Clear the content when validation fails in the main comment form
        if (parentId === 0) {
          setNewComment('');
          mainCommentTextareaRef.current?.focus();
        }

        // setIsLoading(false); // Old: will be handled by finally
        return false; // Return false to indicate failure
      }

      // Check if user has enough locked tokens
      const hasEnoughTokens = await checkLockedTokens();
      if (!hasEnoughTokens) {
        addNotification(
          'You need to lock at least 10 SCI tokens to post comments. Visit the lock page to lock your tokens.',
          'error'
        );
        // Focus the textarea if it's the main comment form
        if (parentId === 0) {
          mainCommentTextareaRef.current?.focus();
        }
        // No explicit setIsPostingMainComment(false) here, relies on finally. Original had no setIsLoading here.
        return false; // Return false to indicate failure
      }

      // Generate reCAPTCHA token for moderation
      const moderationToken = await generateRecaptchaToken('post_comment_moderation');
      if (!moderationToken) {
        if (parentId === 0) {
          mainCommentTextareaRef.current?.focus();
        }
        // setIsLoading(false); // Old: will be handled by finally
        return false; // Return false to indicate failure
      }

      // First check content with AI moderation
      const moderationResponse = await fetch('/api/comments/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: sanitizationResult.sanitizedInput,
          action: 'check',
          recaptchaToken: moderationToken, // Use moderation-specific token
        }),
      });

      const moderationResult = await moderationResponse.json();

      if (moderationResult.error || moderationResult.flagged) {
        let errorMessage = typeof moderationResult.details === 'string' 
          ? moderationResult.details 
          : moderationResult.details?.message || 
            moderationResult.error || 
            'Content flagged by moderation';

        if (moderationResult.moderationDetails) {
          const { highRiskContent, mediumRiskContent } =
            moderationResult.moderationDetails;
          if (highRiskContent) {
            errorMessage += '\nHigh-risk content detected.';
          }
          if (mediumRiskContent) {
            errorMessage += '\nPotentially inappropriate content detected.';
          }
        }

        addNotification(errorMessage, 'error');

        // Clear the content when moderation flags content in the main comment form
        if (parentId === 0) {
          setNewComment('');
          mainCommentTextareaRef.current?.focus();
        }

        // setIsLoading(false); // Old: will be handled by finally
        return false; // Return false to indicate failure
      }

      // Generate a fresh reCAPTCHA token for the actual comment submission
      const submissionToken = await generateRecaptchaToken('post_comment_submission');
      if (!submissionToken) {
        if (parentId === 0) {
          mainCommentTextareaRef.current?.focus();
        }
        // setIsLoading(false); // Old: will be handled by finally
        return false; // Return false to indicate failure
      }
      
      if (parentId === 0) {
        setIsVerifyingCaptcha(false); // Verification complete for main comment
        setIsPostingMainComment(true);  // Now Posting for main comment
      }

      // const timestamp = Math.floor(Date.now() / 1000);
      // const nonce = `0x${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      // const messageData = {
      //   action: 'post_comment',
      //   content:
      //     sanitizationResult.sanitizedInput.slice(0, 50) +
      //     (sanitizationResult.sanitizedInput.length > 50 ? '...' : ''),
      //   parentId,
      //   proposalIndex,
      //   proposalType,
      //   timestamp,
      //   nonce,
      //   userAddress: wallet.state.address.toLowerCase(),
      // };

      // Create a human-readable message
      // const readableMessage =
      //   `I am posting a comment${parentId ? ' as a reply' : ''} on proposal #${proposalIndex}:\n\n` +
      //   `"${sanitizationResult.sanitizedInput.slice(0, 50)}${sanitizationResult.sanitizedInput.length > 50 ? '...' : ''}"` +
      //   `\n\nTimestamp: ${new Date(timestamp * 1000).toLocaleString()}` +
      //   `\nNonce: ${nonce.slice(0, 10)}...` +
      //   `\nWallet: ${wallet.state.address.slice(0, 6)}...${wallet.state.address.slice(-4)}` +
      //   `\n\nSecurity Data: ${Buffer.from(JSON.stringify(messageData)).toString('base64')}`;

      // const signature = await wallet.state.walletClient?.signMessage({
      //   message: readableMessage,
      //   account: wallet.state.address,
      // });

      // if (!signature) {
      //   addNotification('Failed to sign message', 'error');

      //   // Clear the content when signature fails in the main comment form
      //   if (parentId === 0) {
      //     setNewComment('');
      //     mainCommentTextareaRef.current?.focus();
      //   }

      //   setIsLoading(false);
      //   return false; // Return false to indicate failure
      // }

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalIndex,
          proposalType,
          content: sanitizationResult.sanitizedInput,
          parentId,
          authorAddress: wallet.state.address,
          // signature,
          // message: readableMessage,
          // messageData,
          // timestamp,
          // nonce,
          recaptchaToken: submissionToken, // Use submission-specific token
        }),
      });

      const data = await response.json();
      if (data.error) {
        addNotification(
          data.details || data.error,
          data.details ? 'error' : 'warning'
        );

        // Clear the content when API returns an error in the main comment form
        if (parentId === 0) {
          setNewComment('');
          mainCommentTextareaRef.current?.focus();
        }

        // setIsLoading(false); // Old: will be handled by finally
        return false; // Return false to indicate failure
      } else if (Array.isArray(data)) {
        setComments(data);
        addNotification('Reply posted successfully', 'success');
        if (parentId === 0) {
          setNewComment(''); // Only clear the main comment input on successful post
        }
        // States reset in finally
        return true; // Return true to indicate success
      } else {
        addNotification('Invalid response format', 'error');

        // Clear the content when API returns invalid format in the main comment form
        if (parentId === 0) {
          setNewComment('');
          mainCommentTextareaRef.current?.focus();
        }
        // States reset in finally
        return false; // Return false to indicate failure
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to post reply',
        'error'
      );

      // Clear the content when there's an error in the main comment form
      if (parentId === 0) {
        setNewComment('');
        mainCommentTextareaRef.current?.focus();
      }
      // States reset in finally
      return false; // Return false to indicate failure
    } finally {
      setIsPostingMainComment(false); // Replaces original setIsLoading(false)
      if (parentId === 0) {
        setIsVerifyingCaptcha(false); // Reset this only if it was set for a main comment
      }
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!wallet?.state?.address) {
      addNotification(
        'Please connect your wallet to delete comments',
        'warning'
      );
      return;
    }
    setDeletingCommentId(commentId); // Set deleting ID
    try {
      // Generate reCAPTCHA token
      const recaptchaToken = await generateRecaptchaToken('delete_comment');
      if (!recaptchaToken) {
        return; // Exit if token generation failed
      }

      // const timestamp = Math.floor(Date.now() / 1000);
      // const nonce = `0x${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      // const messageData = {
      //   action: 'delete_comment',
      //   commentId,
      //   timestamp,
      //   nonce,
      //   userAddress: wallet.state.address.toLowerCase(),
      // };

      // Create a human-readable message
      // const readableMessage =
      //   `I am deleting comment #${commentId}\n\n` +
      //   `Timestamp: ${new Date(timestamp * 1000).toLocaleString()}\n` +
      //   `Nonce: ${nonce.slice(0, 10)}...\n` +
      //   `Wallet: ${wallet.state.address.slice(0, 6)}...${wallet.state.address.slice(-4)}` +
      //   `\n\nSecurity Data: ${Buffer.from(JSON.stringify(messageData)).toString('base64')}`;

      // const signature = await wallet.state.walletClient?.signMessage({
      //   message: readableMessage,
      //   account: wallet.state.address,
      // });

      // if (!signature) {
      //   addNotification('Failed to sign message', 'error');
      //   return;
      // }

      const response = await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          authorAddress: wallet.state.address,
          // signature,
          // message: readableMessage,
          // messageData,
          // timestamp,
          // nonce,
          recaptchaToken, // Add token to the request
        }),
      });

      const data = await response.json();
      if (data.error) {
        addNotification(data.error, 'error');
      } else if (Array.isArray(data)) {
        setComments(data);
        addNotification('Comment deleted successfully', 'success');
      } else {
        addNotification('Invalid response format', 'error');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to delete comment',
        'error'
      );
    } finally {
      setDeletingCommentId(null); // Reset deleting ID
    }
  };

  const handleReport = async (commentId: number, reason: string) => {
    if (!wallet?.state?.address || !reason.trim()) return;

    console.log("[DEBUG] Starting comment report process for comment ID:", commentId);
    
    // Generate reCAPTCHA token with explicit debugging
    console.log("[DEBUG] Attempting to generate reCAPTCHA token");
    const recaptchaToken = await generateRecaptchaToken('report_comment');
    console.log("[DEBUG] reCAPTCHA token generated:", recaptchaToken ? "SUCCESS" : "FAILED");
    
    if (!recaptchaToken) {
      console.error("[DEBUG] Failed to generate reCAPTCHA token");
      return { 
        error: 'Security verification failed', 
        details: 'Unable to generate security token. Please try refreshing the page.'
      };
    }

    try {
      // const timestamp = Math.floor(Date.now() / 1000);
      // const nonce = `0x${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      // const messageData = {
      //   action: 'report_comment',
      //   commentId,
      //   reason:
      //     reason.trim().slice(0, 50) +
      //     (reason.length > 50 ? '...' : ''),
      //   timestamp,
      //   nonce,
      //   userAddress: wallet.state.address.toLowerCase(),
      // };

      // Create a human-readable message
      // const readableMessage =
      //   `I am reporting comment #${commentId}\n\n` +
      //   `Reason: "${reason.trim().slice(0, 50)}${reason.length > 50 ? '...' : ''}"` +
      //   `\n\nTimestamp: ${new Date(timestamp * 1000).toLocaleString()}\n` +
      //   `Nonce: ${nonce.slice(0, 10)}...\n` +
      //   `Wallet: ${wallet.state.address.slice(0, 6)}...${wallet.state.address.slice(-4)}` +
      //   `\n\nSecurity Data: ${Buffer.from(JSON.stringify(messageData)).toString('base64')}`;

      // console.log("[DEBUG] Requesting wallet signature");
      // const signature = await wallet.state.walletClient?.signMessage({
      //   message: readableMessage,
      //   account: wallet.state.address,
      // });

      // if (!signature) {
      //   console.error("[DEBUG] Failed to obtain wallet signature");
      //   addNotification('Failed to sign message', 'error');
      //   return { error: 'Failed to sign message' };
      // }
      
      // console.log("[DEBUG] Signature obtained successfully");

      // Try with explicit application name header to satisfy RLS policies
      console.log("[DEBUG] Sending report request to API");
      const response = await fetch('/api/comments/moderate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          action: 'report',
          reason: reason.trim(),
          authorAddress: wallet.state.address,
          // signature,
          // message: readableMessage,
          // messageData,
          // timestamp,
          // nonce,
          recaptchaToken
        }),
      });
      
      console.log("[DEBUG] API response status:", response.status);

      if (response.status === 403) {
        console.error('[DEBUG] Permission denied when reporting comment. Status:', response.status);
        
        // Try to read the response body for more details
        try {
          const errorData = await response.json();
          console.error('[DEBUG] Error response details:', errorData);
          
          return { 
            error: 'Permission denied when reporting comment', 
            details: errorData.details || errorData.error || 'Please try again later or contact support if the issue persists.'
          };
        } catch (jsonError) {
          console.error('[DEBUG] Could not parse error response:', jsonError);
          return { 
            error: 'Permission denied when reporting comment', 
            details: 'Please try again later or contact support if the issue persists.'
          };
        }
      }

      console.log("[DEBUG] Parsing API response");
      const data = await response.json();
      console.log("[DEBUG] API response data:", data);
      return data;
    } catch (error) {
      console.error('[DEBUG] Error reporting comment:', error);
      return { 
        error: 'Failed to report comment', 
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  };

  const handleReaction = async (
    commentId: number,
    reactionType: 'like' | 'dislike'
  ) => {
    if (!wallet?.state?.address) {
      addNotification(
        'Please connect your wallet to react to comments',
        'warning'
      );
      return;
    }

    try {
      // Generate reCAPTCHA token with more specific action name
      const recaptchaToken = await generateRecaptchaToken('comment_reaction_submit');
      if (!recaptchaToken) {
        return; // Exit if token generation failed
      }

      // const timestamp = Math.floor(Date.now() / 1000);
      // const nonce = `0x${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)}`;
      // const messageData = {
      //   action: reactionType === 'like' ? 'like_comment' : 'dislike_comment',
      //   commentId,
      //   reactionType,
      //   timestamp,
      //   nonce,
      //   userAddress: wallet.state.address.toLowerCase(),
      // };

      // Create a human-readable message
      // const readableMessage =
      //   `I am ${reactionType === 'like' ? 'liking' : 'disliking'} comment #${commentId}\n\n` +
      //   `Timestamp: ${new Date(timestamp * 1000).toLocaleString()}\n` +
      //   `Nonce: ${nonce.slice(0, 10)}...\n` +
      //   `Wallet: ${wallet.state.address.slice(0, 6)}...${wallet.state.address.slice(-4)}` +
      //   `\n\nSecurity Data: ${Buffer.from(JSON.stringify(messageData)).toString('base64')}`;

      // const signature = await wallet.state.walletClient?.signMessage({
      //   message: readableMessage,
      //   account: wallet.state.address,
      // });

      // if (!signature) {
      //   addNotification('Failed to sign message', 'error');
      //   return;
      // }

      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userAddress: wallet.state.address,
          reactionType,
          // signature,
          // message: readableMessage,
          // messageData,
          // timestamp,
          // nonce,
          recaptchaToken, // Add token to the request
        }),
      });

      const data = await response.json();
      if (data.error) {
        addNotification(data.error, 'error');
      } else if (Array.isArray(data)) {
        setComments(data);
        addNotification(
          `${reactionType === 'like' ? 'Liked' : 'Disliked'} comment successfully`,
          'success'
        );
      } else {
        addNotification('Invalid response format', 'error');
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to update reaction',
        'error'
      );
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="mb-4 flex items-center justify-center text-center text-lg font-bold sm:mb-8 sm:text-2xl">
        Discussion
      </h2>

      {/* Main Comment Form */}
      {wallet?.state?.address ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            // Sanitize the main comment content before submission
            const success = await handleReply(0, newComment);
            // newComment will be cleared by handleReply on success
            if (!success) {
              // Focus the textarea for easier editing if there was an error
              mainCommentTextareaRef.current?.focus();
            }
          }}
          className="mb-6"
        >
          <div className="flex flex-col gap-4 text-sm sm:text-base">
            <textarea
              ref={mainCommentTextareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[100px] rounded-lg border border-seaBlue-1025 bg-seaBlue-1075 p-3 text-white placeholder-gray-400 focus:border-[#2D7FEA] focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isVerifyingCaptcha || isPostingMainComment || isGeneratingToken}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#2D7FEA] px-4 py-2 font-semibold text-white hover:bg-[#4B9BFF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifyingCaptcha ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  Verifying...
                </>
              ) : isPostingMainComment ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Comment'
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-center text-sm text-gray-400 sm:text-base">
          Log in to join the discussion
        </p>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {Array.isArray(comments) &&
          comments.map((comment) => (
            <CommentComponent
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onReaction={handleReaction}
              onDelete={handleDelete}
              onReport={handleReport}
              ensNames={new Map(Object.entries(ensNames.ensNames))}
              deletingCommentId={deletingCommentId}
            />
          ))}
        {(!comments || comments.length === 0) && (
          <p className="text-center text-sm text-gray-400 sm:text-base">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
}
