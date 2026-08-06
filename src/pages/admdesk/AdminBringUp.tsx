// src/pages/dept-head/AdminBringUp.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchDocuments,
  clearError,
  fetchDocumentById,
  respondToDocument,
  deleteDocument,
  sendFollowUp,
  createFollowUp,
  completeFollowUp,
  cancelFollowUp,
  addFollowUpComment,
  fetchFollowUpThread,
} from '../../store/slices/documentSlice';
import { selectCurrentUser, fetchCurrentUser } from '../../store/slices/userSlice';
import { fetchUsers, selectAllUsers, selectUsersListLoading } from '../../store/slices/userSlice';
import type { 
  Document as DocType, 
  RoutePriority, 
  FollowUpStatus,
  DocumentAnnotation,
  BringUpStatus,
  FollowUp,
  FollowUpWithComments,
  SendFollowUpInput,
  CreateFollowUpInput,
  CompleteFollowUpInput,
  CancelFollowUpInput,
  AddFollowUpCommentInput,
  FollowUpPriority,
} from '../../types/documents.types';

import type { RootState } from '../../store/store';

// ─── Selectors ────────────────────────────────────────────────────────────────

const selectAllDocuments = (state: RootState): DocType[] => state.documents.documents;
const selectDocLoading = (state: RootState): boolean => state.documents.loading;
const selectDocError = (state: RootState): string | null => state.documents.error;

const PAGE_SIZE = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const formatDateDisplay = (dateStr: string | Date): string => {
  const d = typeof dateStr === 'string' ? parseDate(dateStr) : dateStr;
  if (!d) return 'Invalid date';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
};

const formatDateTime = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));

const getFileExtension = (url: string | null): string => {
  if (!url) return '';
  const fileName = url.split('/').pop() || '';
  return fileName.split('.').pop()?.toLowerCase() || '';
};

type BringUpBucket = 'overdue' | 'today' | 'upcoming';

const getBucket = (dateStr: string): BringUpBucket => {
  const d = parseDate(dateStr);
  if (!d) return 'upcoming';
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  if (target.getTime() < today.getTime()) return 'overdue';
  if (target.getTime() === today.getTime()) return 'today';
  return 'upcoming';
};

const BUCKET_LABEL: Record<BringUpBucket, string> = {
  overdue: 'Overdue',
  today: 'Due Today',
  upcoming: 'Upcoming',
};

const BUCKET_COLOR: Record<BringUpBucket, string> = {
  overdue: 'bg-[#FFF5F5] text-[#E53E3E] border-[#FEB2B2]',
  today: 'bg-[#FFF9E6] text-[#A37F0C] border-[#FEEBC8]',
  upcoming: 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]',
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({ 
  size = 'sm', 
  className = '' 
}) => (
  <svg
    className={`animate-spin ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} ${className}`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

// ─── Bring Up Status Badge ────────────────────────────────────────────────────

const BRING_UP_STATUS_STYLES: Record<BringUpStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  overdue: 'bg-red-100 text-red-700 border border-red-200',
};

const BRING_UP_STATUS_LABELS: Record<BringUpStatus, string> = {
  pending: 'PENDING',
  completed: 'COMPLETED',
  overdue: 'OVERDUE',
};

const BringUpStatusBadge: React.FC<{ status: BringUpStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${BRING_UP_STATUS_STYLES[status]}`}
  >
    {BRING_UP_STATUS_LABELS[status]}
  </span>
);

// ─── PriorityBadge ──────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<RoutePriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-50 text-blue-700',
  urgent: 'bg-red-50 text-red-700',
};

const PRIORITY_DOT: Record<RoutePriority, string> = {
  low: 'bg-slate-400',
  normal: 'bg-blue-500',
  urgent: 'bg-red-500',
};

const PRIORITY_LABEL: Record<RoutePriority, string> = {
  low: 'Low',
  normal: 'Normal',
  urgent: 'Urgent',
};

const PriorityBadge: React.FC<{ priority: RoutePriority }> = ({ priority }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      PRIORITY_BADGE[priority] ?? 'bg-slate-100 text-slate-600'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[priority] ?? 'bg-slate-400'}`} />
    {PRIORITY_LABEL[priority] ?? priority}
  </span>
);

// ─── Follow-Up Status Badge ──────────────────────────────────────────────────

const FOLLOW_UP_STATUS_STYLES: Record<FollowUpStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-stone-100 text-stone-500 border border-stone-200',
};

const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: 'PENDING',
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

const FollowUpStatusBadge: React.FC<{ status: FollowUpStatus }> = ({ status }) => {
  const style = FOLLOW_UP_STATUS_STYLES[status] || 'bg-slate-100 text-slate-500';
  const label = FOLLOW_UP_STATUS_LABELS[status] || status.toUpperCase();
  
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
};

// ─── Follow-Up Priority Badge ─────────────────────────────────────────────────

const FOLLOW_UP_PRIORITY_STYLES: Record<FollowUpPriority, string> = {
  low: 'bg-stone-100 text-stone-500',
  normal: 'bg-blue-100 text-blue-700',
  urgent: 'bg-red-100 text-red-700',
};

const FollowUpPriorityBadge: React.FC<{ priority: FollowUpPriority }> = ({ priority }) => (
  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${FOLLOW_UP_PRIORITY_STYLES[priority]}`}>
    {priority.toUpperCase()}
  </span>
);

// ─── StickyNote ─────────────────────────────────────────────────────────────




// ─── FOLLOW-UP MODAL (Chat-style - for Dept Head) ───────────────────────────

interface FollowUpModalProps {
  document: DocType;
  onClose: () => void;
  onSend: (input: SendFollowUpInput) => Promise<FollowUp>;
  onCreate: (input: CreateFollowUpInput) => Promise<FollowUp>;
  onComplete: (followUpId: string, input: CompleteFollowUpInput) => Promise<void>;
  onCancel: (followUpId: string, input: CancelFollowUpInput) => Promise<void>;
  onAddComment: (followUpId: string, input: AddFollowUpCommentInput) => Promise<void>;
  onViewThread: (followUpId: string) => Promise<FollowUpWithComments | null>;
  currentUserId: string;
}

const FollowUpModalComponent: React.FC<FollowUpModalProps> = ({
  document,
  onClose,
  onSend,
  //onCreate,
  onComplete,
  //onCancel,
  onAddComment,
  onViewThread,
  currentUserId,
}) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<FollowUpPriority>('normal');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);
  const [threadData, setThreadData] = useState<FollowUpWithComments | null>(null);
  const [replyComment, setReplyComment] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const followUps = document.follow_ups || [];
  const activeFollowUps = followUps.filter(f => f.status !== 'completed' && f.status !== 'cancelled');

  useEffect(() => {
    dispatch(fetchUsers({ is_active: true, limit: 100 }));
  }, [dispatch]);

  const handleViewThread = async (followUpId: string) => {
    try {
      const result = await onViewThread(followUpId);
      if (result) {
        setThreadData(result);
        setSelectedFollowUpId(followUpId);
        setShowNewForm(false);
      }
    } catch {
      toast.error('Failed to load thread');
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUpId || !replyComment.trim() || isReplying) return;
    setIsReplying(true);
    try {
      await onAddComment(selectedFollowUpId, { comment: replyComment.trim() });
      setReplyComment('');
      const result = await onViewThread(selectedFollowUpId);
      if (result) setThreadData(result);
      toast.success('Reply sent');
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    try {
      const notes = prompt('Enter completion notes:');
      if (notes === null) return;
      if (!notes.trim()) {
        toast.error('Completion notes are required');
        return;
      }
      await onComplete(followUpId, { completion_notes: notes.trim() });
      toast.success('Follow-up completed');
      const result = await onViewThread(followUpId);
      if (result) setThreadData(result);
    } catch {
      toast.error('Failed to complete follow-up');
    }
  };

  const handleSend = async () => {
    if (!notes.trim() || !assignedTo) {
      setError('Please fill in notes and assign a user');
      return;
    }
    setError(null);
    setIsSending(true);
    try {
      const result = await onSend({
        document_id: document.id,
        mark_id: document.active_mark?.id,
        notes: notes.trim(),
        assigned_to: assignedTo,
      });
      setNotes('');
      setAssignedTo('');
      setDueDate('');
      setPriority('normal');
      setShowNewForm(false);
      toast.success('Follow-up sent');
      if (result && result.id) {
        const refreshed = await onViewThread(result.id);
        if (refreshed) {
          setThreadData(refreshed);
          setSelectedFollowUpId(result.id);
        }
      }
      onClose();
    } catch {
      setError('Failed to send follow-up');
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseThread = () => {
    setSelectedFollowUpId(null);
    setThreadData(null);
    setShowNewForm(false);
  };

  // ─── Render chat thread ──────────────────────────────────────────────────────

  if (selectedFollowUpId && threadData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-600 rounded-t-xl">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={handleCloseThread}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">
                  {threadData.notes}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-blue-100">
                  <span>To: {threadData.assigned_to_name || 'Unassigned'}</span>
                  {threadData.due_date && (
                    <>
                      <span>·</span>
                      <span>Due: {formatDateDisplay(threadData.due_date)}</span>
                    </>
                  )}
                  <span>·</span>
                  <FollowUpStatusBadge status={threadData.status} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {threadData.status !== 'completed' && threadData.status !== 'cancelled' && threadData.assigned_to === currentUserId && (
                <button
                  onClick={() => handleCompleteFollowUp(threadData.id)}
                  className="rounded bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                >
                  Complete
                </button>
              )}
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px] bg-slate-50">
            {/* Initial message (admin/super admin) */}
            <div className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {threadData.created_by_name?.charAt(0) || 'A'}
              </div>
              <div className="max-w-[80%]">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-stone-700">
                    {threadData.created_by_name || 'Admin'}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {formatDateDisplay(threadData.created_at)}
                  </span>
                </div>
                <div className="rounded-lg bg-blue-100 px-4 py-2 text-sm text-stone-800">
                  {threadData.notes}
                </div>
              </div>
            </div>

            {/* Replies */}
            {threadData.comments.map((c) => {
              const isUser = c.user_id === currentUserId;
              return (
                <div key={c.id} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    isUser ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {c.user_name?.charAt(0) || 'U'}
                  </div>
                  <div className={`max-w-[80%] ${isUser ? 'items-end' : ''}`}>
                    <div className={`flex items-center gap-2 mb-0.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold text-stone-700">
                        {c.user_name || 'User'}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {formatDateDisplay(c.created_at)}
                      </span>
                    </div>
                    <div className={`rounded-lg px-4 py-2 text-sm text-stone-800 ${
                      isUser ? 'bg-emerald-100' : 'bg-blue-100'
                    }`}>
                      {c.comment}
                    </div>
                  </div>
                </div>
              );
            })}

            {threadData.comments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-stone-400">No replies yet</p>
                <p className="text-xs text-stone-300">Be the first to respond</p>
              </div>
            )}
          </div>

          {/* Chat Input - only if assigned to current user and not completed/cancelled */}
          {threadData.status !== 'completed' && threadData.status !== 'cancelled' && threadData.assigned_to === currentUserId && (
            <div className="px-4 py-3 border-t bg-white rounded-b-xl">
              <form onSubmit={handleReply} className="flex gap-2">
                <input
                  type="text"
                  value={replyComment}
                  onChange={(e) => setReplyComment(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!replyComment.trim() || isReplying}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isReplying ? <Spinner className="h-4 w-4" /> : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Read-only view if not assigned to current user */}
          {threadData.status !== 'completed' && threadData.status !== 'cancelled' && threadData.assigned_to !== currentUserId && (
            <div className="px-4 py-3 border-t bg-stone-50 rounded-b-xl text-center">
              <p className="text-xs text-stone-400">This follow-up is assigned to {threadData.assigned_to_name || 'another user'}</p>
            </div>
          )}

          {/* Completed/Cancelled status */}
          {(threadData.status === 'completed' || threadData.status === 'cancelled') && (
            <div className="px-4 py-3 border-t bg-stone-50 rounded-b-xl text-center">
              <p className="text-xs text-stone-400">
                {threadData.status === 'completed' ? '✅ This follow-up has been completed' : '❌ This follow-up has been cancelled'}
                {threadData.completion_notes && (
                  <span className="block mt-1 text-stone-500 font-medium">
                    "{threadData.completion_notes}"
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main modal (list + new form) ──────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-xl bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-600 rounded-t-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Follow Up
          </h2>
          <div className="flex items-center gap-2">
            {!showNewForm && (
              <button
                onClick={() => setShowNewForm(true)}
                className="rounded bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition-colors"
              >
                + New
              </button>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Active Follow-ups List */}
        {activeFollowUps.length > 0 && !showNewForm && (
          <div className="px-4 py-3 border-b max-h-[200px] overflow-y-auto">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span>Active Follow-ups</span>
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                {activeFollowUps.length}
              </span>
            </h3>
            <div className="space-y-2">
              {activeFollowUps.map((f) => (
                <div
                  key={f.id}
                  onClick={() => handleViewThread(f.id)}
                  className="flex items-center justify-between rounded-lg border border-stone-200 p-3 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-800 truncate">
                        {f.notes}
                      </span>
                      <FollowUpStatusBadge status={f.status} />
                      <FollowUpPriorityBadge priority={f.priority} />
                      {f.assigned_to === currentUserId && (
                        <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
                          ASSIGNED TO ME
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400">
                      <span>From: {f.created_by_name || 'Admin'}</span>
                      <span>·</span>
                      <span>To: {f.assigned_to_name || 'Unassigned'}</span>
                      {f.due_date && (
                        <>
                          <span>·</span>
                          <span>Due: {formatDateDisplay(f.due_date)}</span>
                        </>
                      )}
                      {f.comment_count && f.comment_count > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-blue-600">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {f.comment_count}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewThread(f.id); }}
                      className="rounded bg-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
                    >
                      Open Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No active follow-ups */}
        {activeFollowUps.length === 0 && !showNewForm && (
          <div className="px-4 py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2 text-sm text-stone-500">No active follow-ups</p>
            <p className="text-xs text-stone-400">Create a new follow-up to get started</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              + New Follow-up
            </button>
          </div>
        )}

        {/* New Follow-up Form */}
        {showNewForm && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                New Follow-up
              </h3>
              <button
                onClick={() => setShowNewForm(false)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                ✕ Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                  Notes *
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="What needs to be done or followed up..."
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                  Assign To *
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-stone-50"
                  disabled={usersLoading}
                >
                  <option value="">
                    {usersLoading ? 'Loading users…' : '— Select User —'}
                  </option>
                  {users.filter(u => u.is_active).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} — {u.pj_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                    Due Date <span className="font-normal text-stone-400 normal-case">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!notes.trim() || !assignedTo || isSending}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {isSending ? <Spinner className="h-3.5 w-3.5" /> : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                  {isSending ? 'Sending...' : 'Send Follow-up'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── DocumentPreviewPanel ──────────────────────────────────────────────────


// ─── DocumentPreviewPanel ──────────────────────────────────────────────────

interface DocumentPreviewPanelProps {
  document: DocType & { annotations?: DocumentAnnotation[] };
  onClose: () => void;
  onRespond: () => void;
  onViewFollowUpThread: (followUpId: string) => void;
  onDelete?: (docId: string) => void;
  currentUserId: string;
}

const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({ 
  document, 
  onClose, 
  onRespond,
  onViewFollowUpThread,
  onDelete,
  currentUserId,
}) => {
  const fileUrl = document.file_url;
  const ext = getFileExtension(fileUrl);
  const followUps = document.follow_ups || [];
  const hasFollowUps = followUps.length > 0;
  
  // Get the most recent active follow-up
  const activeFollowUp = followUps
    .filter(f => f.status !== 'completed' && f.status !== 'cancelled')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || followUps[0];

  const activeFollowUps = followUps.filter(f => f.status !== 'completed' && f.status !== 'cancelled');

  // ─── Check if document can be deleted ──────────────────────────────────────
  const canDelete = followUps.length > 0 && followUps.every(
    f => f.status === 'completed' || f.status === 'cancelled'
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(document.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  // ─── Count active follow-ups assigned to current user ──────────────────────
  const myActiveFollowUps = activeFollowUps.filter(f => f.assigned_to === currentUserId);

  // ─── Render preview based on file type ─────────────────────────────────────
  const renderPreview = () => {
    const isComposed = document.type === 'memo' || document.type === 'letter';
    const isPdf = document.mime_type === 'application/pdf' || ext === 'pdf';
    const fileName = document.original_name || document.title;

    if (isComposed && fileUrl && isPdf) {
      return (
        <iframe
          src={`${fileUrl}#toolbar=0`}
          title={document.title}
          className="w-full h-full min-h-[600px] border-0 rounded-sm"
        />
      );
    }

    if (isComposed && document.body) {
      return (
        <div className="h-full overflow-y-auto p-4 sm:p-8">
          <div
            className="mx-auto max-w-[794px] bg-white shadow-sm rounded-sm px-8 py-10 sm:px-16 sm:py-14 text-sm"
            dangerouslySetInnerHTML={{ __html: document.body }}
          />
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
          <svg className="h-16 w-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-slate-400">No file attached to this document.</p>
        </div>
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={`${fileUrl}#toolbar=0`}
          title={document.title}
          className="w-full h-full min-h-[600px] border-0 rounded-sm"
        />
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px] p-8">
          <img
            src={fileUrl}
            alt={document.title}
            className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded shadow-sm"
          />
        </div>
      );
    }

    if (['txt', 'csv', 'log', 'xml', 'json', 'md', 'html', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp'].includes(ext)) {
      return (
        <div className="flex flex-col h-full min-h-[400px]">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600">{fileName}</span>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
              Open in new tab
            </a>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-white">
            <iframe src={fileUrl} title={document.title} className="w-full h-full border-0 rounded-sm" />
          </div>
        </div>
      );
    }

    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv'].includes(ext)) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px] p-8">
          <video controls className="max-w-full max-h-[calc(100vh-300px)] rounded shadow-sm">
            <source src={fileUrl} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 gap-4">
          <svg className="h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-sm text-slate-600 font-medium">{fileName}</p>
          {document.file_size_bytes && (
            <p className="text-xs text-slate-400">{formatFileSize(document.file_size_bytes)}</p>
          )}
          <audio controls className="w-full max-w-md">
            <source src={fileUrl} />
            Your browser does not support the audio tag.
          </audio>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
            Open in new tab
          </a>
        </div>
      );
    }

    if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
      const officeViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      return (
        <div className="flex flex-col h-full min-h-[400px]">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600">{fileName}</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400">Powered by Google Docs Viewer</span>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                Open in new tab
              </a>
            </div>
          </div>
          <iframe src={officeViewerUrl} title={document.title} className="w-full flex-1 border-0 rounded-sm" />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 gap-4">
        <svg className="h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-slate-600 font-medium">{fileName}</p>
        {document.file_size_bytes && (
          <p className="text-xs text-slate-400">{formatFileSize(document.file_size_bytes)}</p>
        )}
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-sm text-slate-500 text-center max-w-md">
            This file type{' '}
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              .{ext || 'unknown'}
            </span>{' '}
            cannot be previewed directly in the browser.
          </p>
          <div className="flex gap-3">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in New Tab
            </a>
            <a
              href={fileUrl}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        </div>
      </div>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
        
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 truncate max-w-md">
              {document.title}
            </span>
            
            {/* ─── Bring Up Status ────────────────────────────────────────── */}
            {document.bring_up_status && (
              <BringUpStatusBadge status={document.bring_up_status} />
            )}
            
            {/* ─── Registrar's Note Indicator ──────────────────────────────── */}
            {document.active_mark?.instructions && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Note
              </span>
            )}

            {/* ─── Follow-ups Indicator ────────────────────────────────────── */}
            {hasFollowUps && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {activeFollowUps.length} active
                {myActiveFollowUps.length > 0 && (
                  <span className="ml-0.5 text-emerald-600">
                    ({myActiveFollowUps.length} for me)
                  </span>
                )}
              </span>
            )}

            {/* ─── File info ────────────────────────────────────────────────── */}
            {document.original_name && (
              <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded truncate max-w-[120px]">
                {document.original_name}
              </span>
            )}
            {document.file_size_bytes && (
              <span className="text-xs text-slate-400">
                ({formatFileSize(document.file_size_bytes)})
              </span>
            )}
          </div>
          
          {/* ─── Actions ────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Respond button */}
            <button
              onClick={onRespond}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Respond
            </button>

            {/* Follow-ups button */}
            {hasFollowUps && activeFollowUp && (
              <button
                onClick={() => onViewFollowUpThread(activeFollowUp.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Chat
              </button>
            )}

            {/* Download button */}
            {document.file_url && (
              <a
                href={document.file_url}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            )}

            {/* Delete button */}
            {canDelete && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}

            {/* Close button */}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Delete Document</h3>
                  <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-4">
                Are you sure you want to delete <span className="font-semibold">"{document.title}"</span>?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Registrar's Note (Sticky) ───────────────────────────────────── */}
        {document.active_mark?.instructions && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
            <div className="flex items-start gap-2">
              <svg className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-amber-800">
                    Registrar's Note
                  </span>
                  {document.bring_up_date && (
                    <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      📅 {formatDateDisplay(document.bring_up_date)}
                    </span>
                  )}
                  {document.bring_up_status && (
                    <BringUpStatusBadge status={document.bring_up_status} />
                  )}
                </div>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">
                  {document.active_mark.instructions}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Document Content ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden bg-slate-100 relative">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

// ─── Response Modal ────────────────────────────────────────────────────────

interface ResponseModalProps {
  document: DocType;
  onClose: () => void;
  onResponseSubmitted: () => void;
}

const ResponseModal: React.FC<ResponseModalProps> = ({ document, onClose, onResponseSubmitted }) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const currentDocument = useAppSelector((state: RootState) => state.documents.currentDocument);

  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchDocumentById(document.id));
  }, [dispatch, document.id]);

  const responses = currentDocument?.id === document.id ? currentDocument.responses ?? [] : [];
  const isPendingResponse = document.status === 'pending_review' && document.assigned_to === currentUser?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await dispatch(
        respondToDocument({
          id: document.id,
          input: { note: note.trim() },
          file: file ?? undefined,
        })
      ).unwrap();

      toast.success(`Response #${result.response.response_number} added successfully`);
      setNote('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      dispatch(fetchDocumentById(document.id));
      onResponseSubmitted();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to add response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.size > 25 * 1024 * 1024) {
        toast.error('File size exceeds 25MB limit');
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 25 * 1024 * 1024) {
        toast.error('File size exceeds 25MB limit');
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const TYPE_BADGE: Record<string, string> = {
    memo: 'bg-blue-100 text-blue-700',
    letter: 'bg-indigo-100 text-indigo-700',
    judgment: 'bg-purple-100 text-purple-700',
    ruling: 'bg-pink-100 text-pink-700',
    order: 'bg-amber-100 text-amber-700',
    correspondence: 'bg-green-100 text-green-700',
    upload: 'bg-gray-100 text-gray-700',
    ticket: "text-purple-500",
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-xl bg-white shadow-2xl border border-slate-100 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h2 className="text-base font-semibold text-slate-900">Response Thread</h2>
            </div>
            {isPendingResponse && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 animate-pulse">
                ⚠️ Response Required
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Document:</span>
            <span className="text-sm font-medium text-slate-900 truncate">{document.title}</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[document.type] ?? 'bg-slate-100 text-slate-700'}`}>
              {document.type}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">
              Status: <span className={`font-medium ${document.status === 'pending_review' ? 'text-red-600' : 'text-slate-700'}`}>
                {document.is_draft ? 'draft' : document.status.replace(/_/g, ' ')}
              </span>
            </span>
            <span className="text-xs text-slate-500">
              Responses: <span className="font-medium text-slate-700">{responses.length}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-[200px] max-h-[300px]">
          {responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-slate-400">No responses yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your response below</p>
            </div>
          ) : (
            responses.map((r) => (
              <div key={r.id} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {r.response_number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-xs font-semibold text-slate-700">{r.responded_by_name}</span>
                    <span className="text-[11px] text-slate-400">{formatDateTime(r.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{r.note}</p>
                  {r.file_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {r.original_name || 'View attachment'}
                        {r.file_size_bytes && (
                          <span className="text-[10px] text-slate-400">({formatFileSize(r.file_size_bytes)})</span>
                        )}
                      </a>
                      <a
                        href={r.file_url}
                        download
                        className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Add Response {responses.length > 0 ? `#${responses.length + 1}` : '#1'}
              </span>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={isPendingResponse
                ? 'Type your response to the request for more information…'
                : 'Type your response…'}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div
              className={`mt-2 relative border-2 border-dashed rounded-lg p-3 transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : file
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-blue-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 flex-shrink-0">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {file ? 'Change file' : 'Attach a file (optional)'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                  {file && (
                    <>
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                {isDragging && (
                  <span className="text-xs font-medium text-blue-600 flex-shrink-0">Drop file here</span>
                )}
                {!file && !isDragging && (
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    or drag & drop
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Max file size: 25 MB. Supported: PDF, DOCX, XLSX, JPG, PNG, MP4, MP3
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!note.trim() || isSubmitting}
                className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  isPendingResponse
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-60`}
              >
                {isSubmitting && <Spinner />}
                {isSubmitting ? 'Sending…' : isPendingResponse ? '📤 Send Response' : 'Send Response'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Row ───────────────────────────────────────────────────────────────────

interface BringUpRowProps {
  document: DocType & { annotations?: DocumentAnnotation[] };
  bucket: BringUpBucket;
  currentUserId?: string;
  onRespond: (doc: DocType) => void;
  onPreview: (doc: DocType) => void;
  onDelete?: (docId: string) => void;
  onViewFollowUpThread: (followUpId: string) => void;
}

const BringUpRow: React.FC<BringUpRowProps> = ({
  document,
  bucket,
  currentUserId,
  onRespond,
  onPreview,
  onDelete,
  onViewFollowUpThread,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const mark = document.active_mark;
  const bringUpDate = document.bring_up_date;
  if (!bringUpDate) return null;

  const needsResponse = document.status === 'pending_review' && document.assigned_to === currentUserId;
  const followUps = document.follow_ups || [];
  const activeFollowUps = followUps.filter(f => f.status !== 'completed' && f.status !== 'cancelled');
  const annotations = document.annotations || [];
  const hasAnnotations = annotations.length > 0;
  const hasSuperAdminRemarks = !!mark?.instructions;
  const hasUrgentAnnotations = annotations.some((a: DocumentAnnotation) => a.is_urgent);
  const isBringUpCompleted = document.bring_up_status === 'completed';

  const canDelete = followUps.length > 0 && followUps.every(
    f => f.status === 'completed' || f.status === 'cancelled'
  );

  const handleDelete = () => {
    if (onDelete) {
      onDelete(document.id);
      setShowDeleteConfirm(false);
    }
  };

  // Get status indicators
  const statusIndicators = [];
  if (needsResponse) statusIndicators.push({ label: 'Response Needed', color: 'red' });
  if (activeFollowUps.length > 0) statusIndicators.push({ label: `${activeFollowUps.length} Follow-up${activeFollowUps.length > 1 ? 's' : ''}`, color: 'blue' });
  if (hasAnnotations) statusIndicators.push({ label: `${annotations.length} Annotation${annotations.length > 1 ? 's' : ''}`, color: 'purple' });
  if (hasSuperAdminRemarks) statusIndicators.push({ label: 'Registrar\'s Note', color: 'amber' });

  // Determine if the row should be grayed out (completed)
  const isTerminal = isBringUpCompleted;

  return (
    <>
      <div 
        className={`group rounded-xl border transition-all duration-200 ${
          isTerminal 
            ? 'bg-slate-50/50 border-slate-200 opacity-70' 
            : 'bg-white border-slate-100 hover:shadow-md hover:border-slate-200'
        } ${expanded ? 'border-amber-200 shadow-md' : ''}`}
      >
        {/* ─── Main Row ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onPreview(document)}>
            {/* Title & Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-semibold truncate ${isTerminal ? 'text-slate-500' : 'text-slate-800'}`}>
                {document.title}
              </p>
              
              {/* Bucket Badge */}
              {!isTerminal && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${BUCKET_COLOR[bucket]}`}>
                  {BUCKET_LABEL[bucket]}
                </span>
              )}

              {/* Bring Up Status Badge */}
              {document.bring_up_status && (
                <BringUpStatusBadge status={document.bring_up_status} />
              )}

              {/* Status Indicators - Compact pills */}
              {statusIndicators.map((ind, idx) => (
                <span 
                  key={idx}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    ind.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
                    ind.color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    ind.color === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {ind.color === 'red' && '⚠️'}
                  {ind.color === 'blue' && '📋'}
                  {ind.color === 'purple' && '💬'}
                  {ind.color === 'amber' && '📝'}
                  {ind.label}
                </span>
              ))}
            </div>

            {/* Quick Info - Department & Assignee */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {mark?.marked_to_dept_name && (
                <span className="flex items-center gap-1">
                  <span className="text-slate-400">Dept:</span>
                  <span className="text-slate-700 font-medium">{mark.marked_to_dept_name}</span>
                </span>
              )}
              {mark?.assigned_to_name && (
                <span className="flex items-center gap-1">
                  <span className="text-slate-400">Assigned to:</span>
                  <span className="text-slate-700 font-medium">{mark.assigned_to_name}</span>
                </span>
              )}
              {mark?.priority && mark.priority !== 'normal' && (
                <PriorityBadge priority={mark.priority} />
              )}
              <span className="text-slate-400">·</span>
              <span className="text-slate-400">Due: {formatDateDisplay(bringUpDate)}</span>
            </div>

            {/* ─── Registrar's Note Preview (collapsible) ────────────────── */}
            {hasSuperAdminRemarks && !isTerminal && (
              <div 
                className="mt-2 flex items-start gap-2 cursor-pointer hover:bg-amber-50/50 rounded-md p-1.5 -ml-1.5 transition-colors"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              >
                <svg className={`h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-700 font-medium">
                    <span className="font-semibold">Registrar's Note:</span>
                    <span className="ml-1 font-normal line-clamp-1">
                      {mark.instructions}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* ─── Expanded Details ──────────────────────────────────────── */}
            {expanded && !isTerminal && (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                {/* Full Registrar's Note */}
                {hasSuperAdminRemarks && (
                  <div className="bg-amber-50/70 rounded-lg p-3 border border-amber-100">
                    <div className="flex items-start gap-2">
                      <svg className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-amber-800">Registrar's Instructions</span>
                          <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                            {mark.marked_by_name || 'Registrar'}
                          </span>
                          {document.bring_up_date && (
                            <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                              📅 {formatDateDisplay(document.bring_up_date)}
                            </span>
                          )}
                          {document.bring_up_status && (
                            <BringUpStatusBadge status={document.bring_up_status} />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-stone-700 whitespace-pre-wrap">
                          {mark.instructions}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Annotations */}
                {hasAnnotations && (
                  <div className="bg-purple-50/70 rounded-lg p-3 border border-purple-100">
                    <div className="flex items-start gap-2">
                      <svg className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-purple-800">
                            Annotations ({annotations.length})
                          </span>
                          {hasUrgentAnnotations && (
                            <span className="text-[10px] text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                              ⚠️ Urgent
                            </span>
                          )}
                        </div>
                        <div className="mt-1 space-y-1.5">
                          {annotations.slice(-2).map((annotation: DocumentAnnotation) => (
                            <div key={annotation.id} className="text-xs bg-white rounded-md p-2 border border-purple-100">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-purple-700">
                                  {annotation.annotated_by_name || 'Unknown'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatDateDisplay(annotation.created_at)}
                                </span>
                              </div>
                              <p className="text-stone-700 mt-0.5">
                                {annotation.comment}
                                {annotation.is_urgent && (
                                  <span className="ml-2 text-red-500 font-medium">[URGENT]</span>
                                )}
                              </p>
                            </div>
                          ))}
                          {annotations.length > 2 && (
                            <p className="text-[10px] text-purple-500 text-center">
                              +{annotations.length - 2} more annotations
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow-ups Summary */}
                {followUps.length > 0 && (
                  <div className="bg-blue-50/70 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-start gap-2">
                      <svg className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-blue-800">
                            Follow-ups ({followUps.length})
                          </span>
                          <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            {activeFollowUps.length} active
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {followUps.slice(0, 2).map((f) => (
                            <div key={f.id} className="inline-flex items-center gap-1.5 bg-white rounded-md px-2.5 py-1 border border-blue-100 text-xs">
                              <span className="text-stone-700 truncate max-w-[120px]">
                                {f.notes}
                              </span>
                              <FollowUpStatusBadge status={f.status} />
                            </div>
                          ))}
                          {followUps.length > 2 && (
                            <span className="inline-flex items-center text-xs text-blue-600 font-medium">
                              +{followUps.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Actions ───────────────────────────────────────────────────── */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {needsResponse && (
              <button
                onClick={() => onRespond(document)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Respond
              </button>
            )}
            
            <button
              onClick={() => onPreview(document)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#A37F0C] hover:bg-[#856404] transition shadow-sm"
            >
              Open File
            </button>

            {/* ─── Follow-up button ───────────────────────────────────────── */}
            {followUps.length > 0 && (
              <button
                onClick={() => {
                  const active = followUps.find(f => f.status !== 'completed' && f.status !== 'cancelled');
                  onViewFollowUpThread(active ? active.id : followUps[0].id);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition shadow-sm"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Follow-ups
                {activeFollowUps.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                    {activeFollowUps.length}
                  </span>
                )}
              </button>
            )}

            {canDelete && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}

            {/* Expand/Collapse toggle */}
            {((hasSuperAdminRemarks || hasAnnotations || followUps.length > 0)) && !isTerminal && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
              >
                {expanded ? 'Show less' : 'Show more'}
                <svg className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Document</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4">
              Are you sure you want to delete <span className="font-semibold">"{document.title}"</span>?
              All follow-ups and annotations will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminBringUp: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const documents = useAppSelector(selectAllDocuments);
  const loading = useAppSelector(selectDocLoading);
  const error = useAppSelector(selectDocError);

  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseDocument, setResponseDocument] = useState<DocType | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocType | null>(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);
  const [isFetchingDocument, setIsFetchingDocument] = useState(false);
  const [selectedFollowUpDocument, setSelectedFollowUpDocument] = useState<DocType | null>(null);

  useEffect(() => {
    if (!currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser]);

  const fetchDocs = useCallback(() => {
    if (!currentUser) return;
    dispatch(
      fetchDocuments({
        page: 1,
        limit: PAGE_SIZE,
        has_bring_up_date: true,
      })
    );
  }, [dispatch, currentUser]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // ─── Filter documents with bring_up_date at document level ──────────────
  const grouped = useMemo(() => {
    const withBringUp = documents.filter((d) => !!d.bring_up_date);

    const buckets: Record<BringUpBucket, DocType[]> = {
      overdue: [],
      today: [],
      upcoming: [],
    };

    withBringUp.forEach((doc) => {
      // Only show documents that are NOT completed
      if (doc.bring_up_status === 'completed') {
        return;
      }
      const bucket = getBucket(doc.bring_up_date!);
      buckets[bucket].push(doc);
    });

    (Object.keys(buckets) as BringUpBucket[]).forEach((key) => {
      buckets[key].sort((a, b) => {
        const aDate = parseDate(a.bring_up_date!)?.getTime() ?? 0;
        const bDate = parseDate(b.bring_up_date!)?.getTime() ?? 0;
        return aDate - bDate;
      });
    });

    return buckets;
  }, [documents]);

  const totalCount = grouped.overdue.length + grouped.today.length + grouped.upcoming.length;

  const handleRespond = (doc: DocType) => {
    setResponseDocument(doc);
    setShowResponseModal(true);
  };

  const handleResponseSubmitted = () => {
    fetchDocs();
  };

  const handlePreview = useCallback(async (doc: DocType) => {
    setIsFetchingDocument(true);
    try {
      const result = await dispatch(fetchDocumentById(doc.id)).unwrap();
      setSelectedDocument(result);
      setSelectedFollowUpDocument(result);
    } catch (error) {
      console.error('Failed to fetch document details:', error);
      setSelectedDocument(doc);
      setSelectedFollowUpDocument(doc);
      toast.error('Could not load full document details');
    } finally {
      setIsFetchingDocument(false);
    }
  }, [dispatch]);

  const handleViewFollowUpThread = (followUpId: string) => {
    setSelectedFollowUpId(followUpId);
    setShowFollowUpModal(true);
  };

  // ─── Follow-Up handlers ─────────────────────────────────────────────────────

  const handleSendFollowUp = async (input: SendFollowUpInput): Promise<FollowUp> => {
    const result = await dispatch(sendFollowUp(input)).unwrap();
    if (selectedDocument) {
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
      setSelectedFollowUpDocument(refreshed);
    }
    fetchDocs();
    return result;
  };

  const handleCreateFollowUp = async (input: CreateFollowUpInput): Promise<FollowUp> => {
    const result = await dispatch(createFollowUp(input)).unwrap();
    if (selectedDocument) {
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
      setSelectedFollowUpDocument(refreshed);
    }
    fetchDocs();
    return result;
  };

  const handleCompleteFollowUp = async (followUpId: string, input: CompleteFollowUpInput): Promise<void> => {
    await dispatch(completeFollowUp({ followUpId, input })).unwrap();
    if (selectedDocument) {
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
      setSelectedFollowUpDocument(refreshed);
    }
    fetchDocs();
  };

  const handleCancelFollowUp = async (followUpId: string, input: CancelFollowUpInput): Promise<void> => {
    await dispatch(cancelFollowUp({ followUpId, input })).unwrap();
    if (selectedDocument) {
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
      setSelectedFollowUpDocument(refreshed);
    }
    fetchDocs();
  };

  const handleAddFollowUpComment = async (followUpId: string, input: AddFollowUpCommentInput): Promise<void> => {
    await dispatch(addFollowUpComment({ followUpId, input })).unwrap();
  };

  const handleViewFollowUpThreadData = async (followUpId: string): Promise<FollowUpWithComments | null> => {
    const result = await dispatch(fetchFollowUpThread(followUpId)).unwrap();
    return result || null;
  };

  // ─── Delete handler ──────────────────────────────────────────────────────────
  const handleDeleteDocument = useCallback(async (docId: string) => {
    try {
      await dispatch(deleteDocument(docId)).unwrap();
      toast.success('Document deleted successfully');
      if (selectedDocument?.id === docId) {
        setSelectedDocument(null);
        setSelectedFollowUpDocument(null);
      }
      fetchDocs();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to delete document');
    }
  }, [dispatch, selectedDocument, fetchDocs]);

  return (
    <div className="min-h-screen bg-[#F4F7F4]">
      <Toaster position="top-right" />

      {showResponseModal && responseDocument &&
        createPortal(
          <ResponseModal
            document={responseDocument}
            onClose={() => {
              setShowResponseModal(false);
              setResponseDocument(null);
            }}
            onResponseSubmitted={handleResponseSubmitted}
          />,
          document.body
        )}

      {selectedDocument &&
        createPortal(
          <DocumentPreviewPanel
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onRespond={() => {
              setSelectedDocument(null);
              handleRespond(selectedDocument);
            }}
            onViewFollowUpThread={handleViewFollowUpThread}
            onDelete={handleDeleteDocument}
            currentUserId={currentUser?.id || ''}
          />,
          document.body
        )}

      {showFollowUpModal && selectedFollowUpId && selectedFollowUpDocument &&
        createPortal(
          <FollowUpModalComponent
            document={selectedFollowUpDocument}
            onClose={() => {
              setShowFollowUpModal(false);
              setSelectedFollowUpId(null);
            }}
            onSend={handleSendFollowUp}
            onCreate={handleCreateFollowUp}
            onComplete={handleCompleteFollowUp}
            onCancel={handleCancelFollowUp}
            onAddComment={handleAddFollowUpComment}
            onViewThread={handleViewFollowUpThreadData}
            currentUserId={currentUser?.id || ''}
          />,
          document.body
        )}

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-[#1E3F20]">Bring Up Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading documents…' : `${totalCount} active document${totalCount !== 1 ? 's' : ''} with a bring-up deadline assigned`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1E3F20]" />
          </div>
        ) : totalCount === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">No active documents with bring-up deadlines.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(['overdue', 'today', 'upcoming'] as BringUpBucket[]).map((bucket) =>
              grouped[bucket].length === 0 ? null : (
                <div key={bucket} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <h2 className="text-xs font-bold text-[#1E3F20] uppercase tracking-widest">
                      {BUCKET_LABEL[bucket]}
                    </h2>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                      {grouped[bucket].length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {grouped[bucket].map((doc) => (
                      <BringUpRow
                        key={doc.id}
                        document={doc}
                        bucket={bucket}
                        currentUserId={currentUser?.id}
                        onRespond={handleRespond}
                        onPreview={handlePreview}
                        onDelete={handleDeleteDocument}
                        onViewFollowUpThread={handleViewFollowUpThread}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {isFetchingDocument && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-stone-900/30 backdrop-blur-sm">
          <div className="rounded-xl bg-white p-6 shadow-xl flex flex-col items-center gap-3">
            <Spinner className="h-8 w-8 text-[#1E3F20]" />
            <p className="text-sm text-stone-600 font-medium">Loading document details...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBringUp;