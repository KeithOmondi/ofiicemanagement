// src/pages/documents/FollowUpModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchFollowUpThread,
  addFollowUpComment,
  completeFollowUp,
  cancelFollowUp,
} from '../../store/slices/documentSlice';
import type {
  FollowUpComment,
  FollowUpStatus,
  FollowUpPriority,
  CompleteFollowUpInput,
} from '../../types/documents.types';

// ─── Sub-components ──────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({
  className = 'h-4 w-4',
}) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const STATUS_STYLES: Record<FollowUpStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-stone-100 text-stone-500 border border-stone-200',
};

const STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: 'PENDING',
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

const StatusBadge: React.FC<{ status: FollowUpStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-widest whitespace-nowrap ${STATUS_STYLES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

const PRIORITY_STYLES: Record<FollowUpPriority, string> = {
  low: 'bg-stone-100 text-stone-500',
  normal: 'bg-blue-100 text-blue-700',
  urgent: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<FollowUpPriority, string> = {
  low: 'LOW',
  normal: 'NORMAL',
  urgent: 'URGENT',
};

const PriorityBadge: React.FC<{ priority: FollowUpPriority }> = ({ priority }) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-widest whitespace-nowrap ${PRIORITY_STYLES[priority]}`}>
    {PRIORITY_LABELS[priority]}
  </span>
);

const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

interface CommentItemProps {
  comment: FollowUpComment;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const [showFile, setShowFile] = useState(false);

  return (
    <div className="flex gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 hover:bg-stone-100 transition-colors">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {comment.user_name?.charAt(0).toUpperCase() || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm font-semibold text-stone-700">{comment.user_name || 'Unknown User'}</span>
          <span className="text-[11px] text-stone-400">{formatDateTime(comment.created_at)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800 leading-relaxed">{comment.comment}</p>
        {comment.file_url && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setShowFile(!showFile)}
              className="inline-flex items-center gap-1.5 rounded border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {showFile ? 'Hide attachment' : 'View attachment'}
            </button>
            {showFile && (
              <a href={comment.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                Open in new tab
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface FollowUpModalProps {
  followUpId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

const FollowUpModal: React.FC<FollowUpModalProps> = ({
  followUpId,
  onClose,
  onUpdate,
}) => {
  const dispatch = useAppDispatch();
  const { currentFollowUp, followUpComments, loading } = useAppSelector((state) => state.documents);
  const { user } = useAppSelector((state) => state.auth);

  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const isAssignedToMe = currentFollowUp?.assigned_to === user?.id;
  const canComplete = isAssignedToMe || isSuperAdmin;
  const canCancel = currentFollowUp?.created_by === user?.id || isAssignedToMe || isSuperAdmin;
  const isCompleted = currentFollowUp?.status === 'completed';
  const isCancelled = currentFollowUp?.status === 'cancelled';
  const isActive = !isCompleted && !isCancelled;
  const isOverdue = isActive && currentFollowUp && new Date(currentFollowUp.due_date) < new Date();

  useEffect(() => {
    if (followUpId) {
      dispatch(fetchFollowUpThread(followUpId));
    }
  }, [dispatch, followUpId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await dispatch(addFollowUpComment({ followUpId, input: { comment: comment.trim() } })).unwrap();
      setComment('');
      await dispatch(fetchFollowUpThread(followUpId));
      toast.success('Comment added successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (isProcessing || !currentFollowUp) return;
    setIsProcessing(true);
    try {
      await dispatch(completeFollowUp({ followUpId, input: {} as CompleteFollowUpInput })).unwrap();
      await dispatch(fetchFollowUpThread(followUpId));
      toast.success('Follow-up completed successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to complete follow-up');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim() || isProcessing || !currentFollowUp) return;
    setIsProcessing(true);
    try {
      await dispatch(cancelFollowUp({ followUpId, input: { cancellation_reason: cancelReason.trim() } })).unwrap();
      await dispatch(fetchFollowUpThread(followUpId));
      setShowCancelModal(false);
      setCancelReason('');
      toast.success('Follow-up cancelled successfully');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to cancel follow-up');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && comment.trim() && !isSubmitting) {
      handleSubmitComment(e);
    }
  };

  // ─── Render content ─────────────────────────────────────────────────────────
  const renderContent = () => {
    if (loading && !currentFollowUp) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner className="h-10 w-10" />
          <p className="mt-4 text-sm text-stone-500">Loading follow-up details...</p>
        </div>
      );
    }

    if (!currentFollowUp) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <svg className="h-12 w-12 text-stone-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-stone-600 font-medium">Follow-up not found</p>
          <p className="text-xs text-stone-400 mt-1">The follow-up may have been deleted.</p>
          <button onClick={onClose} className="mt-4 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            Close
          </button>
        </div>
      );
    }

    return (
      <>
        {/* Header with status badges - similar to image */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 shrink-0 bg-white rounded-t-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="text-base font-bold text-stone-900 truncate">{currentFollowUp.title}</h2>
            </div>
            <StatusBadge status={currentFollowUp.status} />
            <PriorityBadge priority={currentFollowUp.priority} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700">⚠️ OVERDUE</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isActive && canComplete && (
              <button onClick={handleComplete} disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {isProcessing ? <Spinner className="h-3 w-3" /> : '✓'}
                {isProcessing ? 'Processing...' : 'Complete'}
              </button>
            )}
            {isActive && canCancel && (
              <button onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-300">
                ✕ Cancel
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Details - styled like the image with PENDING NORMAL, Assigned To, Priority, Due Date, Created By */}
        <div className="px-6 py-4 bg-white border-b border-stone-100 shrink-0">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">ASSIGNED TO</span>
              <p className="text-stone-800 font-medium mt-0.5">{currentFollowUp.assigned_to_name || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">PRIORITY</span>
              <p className="mt-0.5"><PriorityBadge priority={currentFollowUp.priority} /></p>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">DUE DATE</span>
              <p className={`font-medium mt-0.5 ${isOverdue ? 'text-red-600' : 'text-stone-800'}`}>{formatDate(currentFollowUp.due_date)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">CREATED BY</span>
              <p className="text-stone-800 font-medium mt-0.5">{currentFollowUp.created_by_name || 'Unknown'}</p>
            </div>
          </div>
          
          {/* Description section */}
          {currentFollowUp.description && (
            <div className="mt-4">
              <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">DESCRIPTION</span>
              <p className="mt-1 text-sm text-stone-700 whitespace-pre-wrap bg-stone-50 p-3 rounded-lg border border-stone-100">
                {currentFollowUp.description}
              </p>
            </div>
          )}
          
          {/* Status info */}
          {currentFollowUp.completed_at && (
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase">COMPLETED</span>
              <p className="text-sm text-emerald-700">{formatDateTime(currentFollowUp.completed_at)}
                {currentFollowUp.completion_notes && <span className="block mt-1 text-emerald-600">Notes: {currentFollowUp.completion_notes}</span>}
              </p>
            </div>
          )}
          {currentFollowUp.cancelled_at && (
            <div className="mt-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">CANCELLED</span>
              <p className="text-sm text-stone-700">{formatDateTime(currentFollowUp.cancelled_at)}
                {currentFollowUp.cancellation_reason && <span className="block mt-1 text-stone-600">Reason: {currentFollowUp.cancellation_reason}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Comments section - styled like the image */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-stone-50/50 min-h-[200px] max-h-[300px]">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Comments ({followUpComments.length})</span>
          </div>
          
          {followUpComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="h-12 w-12 text-stone-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-stone-400">No comments yet</p>
              <p className="text-xs text-stone-400 mt-1">Be the first to add a comment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUpComments.map((c) => <CommentItem key={c.id} comment={c} />)}
            </div>
          )}
        </div>

        {/* Comment Form - styled like the image */}
        <div className="px-6 py-4 border-t border-stone-200 bg-white rounded-b-xl shrink-0">
          <form onSubmit={handleSubmitComment}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">ADD COMMENT</span>
              <span className="text-[10px] text-stone-400 ml-auto">Press <kbd className="px-1.5 py-0.5 bg-stone-100 rounded text-[9px] font-mono border border-stone-200">Ctrl+Enter</kbd> to send</span>
            </div>
            
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder={isCompleted || isCancelled ? 'This follow-up is closed. No more comments allowed.' : 'Type your comment...'}
              disabled={isCompleted || isCancelled}
              className="w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-stone-50 disabled:text-stone-400 transition-shadow"
            />
            
            <div className="mt-3 flex items-center justify-end gap-2">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-5 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!comment.trim() || isSubmitting || isCompleted || isCancelled}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? <><Spinner className="h-3.5 w-3.5" /> Sending…</> : 'Send Comment'}
              </button>
            </div>
          </form>
        </div>

        {/* Cancel Confirmation Modal - using portal */}
        {showCancelModal && createPortal(
          <div 
            className="fixed inset-0 z-[1001] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCancelModal(false);
                setCancelReason('');
              }
            }}
          >
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-sm font-bold text-stone-900">Cancel Follow-Up</h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to cancel "{currentFollowUp.title}"?
              </p>
              <div className="mt-4">
                <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                  Cancellation Reason *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  placeholder="Why is this follow-up being cancelled?"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => { setShowCancelModal(false); setCancelReason(''); }} 
                  className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelSubmit}
                  disabled={!cancelReason.trim() || isProcessing}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors"
                >
                  {isProcessing ? <Spinner className="h-3.5 w-3.5" /> : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  };

  // ─── Render with portal - matching the image style ──────────────────────
  return createPortal(
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] rounded-xl bg-white shadow-2xl border border-stone-100 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>,
    document.body
  );
};

export default FollowUpModal;