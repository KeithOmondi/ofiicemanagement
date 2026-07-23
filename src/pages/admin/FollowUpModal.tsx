// src/pages/documents/FollowUpModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchFollowUpThread,
  addFollowUpComment,
  completeFollowUp,
  cancelFollowUp,
  updateFollowUp,
} from '../../store/slices/documentSlice';
import { fetchUsers, selectAllUsers, selectUsersListLoading } from '../../store/slices/userSlice';
import type { FollowUpStatus, FollowUpComment } from '../../types/documents.types';
import { format } from 'date-fns';

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);



// ─── Follow-Up Status Badge ───────────────────────────────────────────────────

const FOLLOW_UP_STATUS_STYLES: Record<FollowUpStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-stone-100 text-stone-500 border border-stone-200',
  filed_away: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: 'PENDING',
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  filed_away: 'FILED AWAY',
};

const FollowUpStatusBadge: React.FC<{ status: FollowUpStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-widest whitespace-nowrap ${FOLLOW_UP_STATUS_STYLES[status]}`}>
    {FOLLOW_UP_STATUS_LABELS[status]}
  </span>
);

// ─── Follow-Up Priority Badge ─────────────────────────────────────────────────

const FOLLOW_UP_PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-stone-100 text-stone-500',
  normal: 'bg-blue-100 text-blue-700',
  urgent: 'bg-red-100 text-red-700',
};

const FollowUpPriorityBadge: React.FC<{ priority: string }> = ({ priority }) => (
  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-widest whitespace-nowrap ${FOLLOW_UP_PRIORITY_STYLES[priority] || 'bg-stone-100 text-stone-500'}`}>
    {priority.toUpperCase()}
  </span>
);

// ─── Format Date Helper ──────────────────────────────────────────────────────

const formatDateTime = (dateStr: string): string => {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy · hh:mm aa');
  } catch {
    return dateStr;
  }
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'No date';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface FollowUpModalProps {
  followUpId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

const FollowUpModal: React.FC<FollowUpModalProps> = ({ followUpId, onClose, onUpdate }) => {
  const dispatch = useAppDispatch();
  const { currentFollowUp, followUpComments, loading } = useAppSelector((state) => state.documents);
  const { user } = useAppSelector((state) => state.auth);
  const users = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  // ── Local state ────────────────────────────────────────────────────────────

  const [commentText, setCommentText] = useState('');
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ── Edit state ─────────────────────────────────────────────────────────────

  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'normal' | 'urgent'>('normal');
  const [editStatus, setEditStatus] = useState<FollowUpStatus>('pending');

  // ── Fetch data ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      await dispatch(fetchFollowUpThread(followUpId)).unwrap();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to load follow-up');
    }
  }, [dispatch, followUpId]);

  // ✅ FIX: Split into separate effects - one for data fetching, one for form population
  // This avoids cascading renders

  // Effect 1: Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Effect 2: Fetch users (only once)
  useEffect(() => {
    dispatch(fetchUsers({ is_active: true, limit: 100 }));
  }, [dispatch]);

  // Effect 3: Populate edit form when data loads (no state updates in render)
  useEffect(() => {
    if (currentFollowUp) {
      // Set edit form values directly without triggering additional state updates
      const timer = setTimeout(() => {
        setEditNotes(currentFollowUp.notes || '');
        setEditAssignedTo(currentFollowUp.assigned_to || '');
        setEditDueDate(currentFollowUp.due_date ? currentFollowUp.due_date.split('T')[0] : '');
        setEditPriority(currentFollowUp.priority || 'normal');
        setEditStatus(currentFollowUp.status || 'pending');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentFollowUp]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await dispatch(
        addFollowUpComment({
          followUpId,
          input: { comment: commentText.trim() },
          file: commentFile || undefined,
        })
      ).unwrap();

      setCommentText('');
      setCommentFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Comment added successfully');
      await fetchData();
      onUpdate?.();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    try {
      await dispatch(completeFollowUp({ followUpId, input: {} })).unwrap();
      toast.success('Follow-up completed successfully');
      await fetchData();
      onUpdate?.();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to complete follow-up');
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Please provide a reason for cancelling this follow-up:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('Cancellation reason is required');
      return;
    }
    try {
      await dispatch(cancelFollowUp({ followUpId, input: { cancellation_reason: reason.trim() } })).unwrap();
      toast.success('Follow-up cancelled successfully');
      await fetchData();
      onUpdate?.();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to cancel follow-up');
    }
  };

  const handleUpdate = async () => {
    if (!editNotes.trim() || !editAssignedTo) {
      toast.error('Notes and assigned user are required');
      return;
    }

    try {
      await dispatch(
        updateFollowUp({
          followUpId,
          input: {
            notes: editNotes.trim(),
            assigned_to: editAssignedTo,
            due_date: editDueDate || null,
            priority: editPriority,
            status: editStatus,
          },
        })
      ).unwrap();
      toast.success('Follow-up updated successfully');
      setIsEditing(false);
      await fetchData();
      onUpdate?.();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to update follow-up');
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    if (droppedFile.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit');
      return;
    }
    setCommentFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit');
      e.target.value = '';
      return;
    }
    setCommentFile(selectedFile);
  };

  const clearFile = () => {
    setCommentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Compute permissions ────────────────────────────────────────────────────

  const isAssignedToMe = currentFollowUp?.assigned_to === user?.id;
  const isCreator = currentFollowUp?.created_by === user?.id;
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = isAssignedToMe || isCreator || isSuperAdmin;
  const canComplete = isAssignedToMe || isSuperAdmin;
  const canCancel = isAssignedToMe || isCreator || isSuperAdmin;

  const isCompleted = currentFollowUp?.status === 'completed';
  const isCancelled = currentFollowUp?.status === 'cancelled';
  const isFiledAway = currentFollowUp?.status === 'filed_away';
  const isActive = !isCompleted && !isCancelled && !isFiledAway;
  const isOverdue = currentFollowUp?.due_date && new Date(currentFollowUp.due_date) < new Date() && isActive;

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && !currentFollowUp) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 shadow-xl">
          <Spinner className="h-8 w-8 text-[#1E4620]" />
          <p className="text-sm text-stone-500">Loading follow-up...</p>
        </div>
      </div>,
      document.body
    );
  }

  if (!currentFollowUp) {
    return null;
  }

  const followUp = currentFollowUp;
  const comments = followUpComments || [];

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] rounded-xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="text-base font-semibold text-slate-900 truncate">
                Follow-Up Details
              </h2>
            </div>
            <FollowUpStatusBadge status={followUp.status} />
            <FollowUpPriorityBadge priority={followUp.priority} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                ⚠️ OVERDUE
              </span>
            )}
            {isFiledAway && (
              <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                📁 FILED AWAY
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isActive && canComplete && (
              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-1 rounded bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition-colors"
              >
                ✓ Complete
              </button>
            )}
            {isActive && canCancel && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1 rounded bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                ✕ Cancel
              </button>
            )}
            {canEdit && !isEditing && !isCompleted && !isCancelled && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 rounded bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
              >
                ✎ Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Body ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ── Edit Form ────────────────────────────────────────────────── */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                  Notes *
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
                  placeholder="What needs to be done or what was done..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                  Assign To *
                </label>
                <select
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none disabled:bg-stone-50"
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

              <div>
                <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                  Due Date <span className="font-normal text-stone-400 normal-case">(optional)</span>
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  {editDueDate ? 'This follow-up will have a due date.' : 'Leave blank to file away.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as 'low' | 'normal' | 'urgent')}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as FollowUpStatus)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="filed_away">Filed Away</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a18] transition-colors inline-flex items-center justify-center gap-2"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            /* ── View Mode ────────────────────────────────────────────────── */
            <>
              {/* Notes */}
              <div>
                <h3 className="text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                  Notes
                </h3>
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm text-slate-800 whitespace-pre-wrap">
                  {followUp.notes || <span className="text-slate-400 italic">No notes provided</span>}
                </div>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-stone-400">Assigned to</span>
                  <p className="font-medium text-stone-800 truncate">{followUp.assigned_to_name || 'Unassigned'}</p>
                </div>
                <div>
                  <span className="text-stone-400">Created by</span>
                  <p className="font-medium text-stone-800 truncate">{followUp.created_by_name || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-stone-400">Due date</span>
                  <p className={`font-medium truncate ${isOverdue ? 'text-red-600' : 'text-stone-800'}`}>
                    {followUp.due_date ? formatDate(followUp.due_date) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-400">Priority</span>
                  <p className="font-medium text-stone-800 truncate capitalize">{followUp.priority}</p>
                </div>
                <div>
                  <span className="text-stone-400">Created at</span>
                  <p className="font-medium text-stone-800 truncate">{formatDateTime(followUp.created_at)}</p>
                </div>
                {followUp.completed_at && (
                  <div>
                    <span className="text-stone-400">Completed at</span>
                    <p className="font-medium text-stone-800 truncate">{formatDateTime(followUp.completed_at)}</p>
                  </div>
                )}
                {followUp.cancelled_at && (
                  <div>
                    <span className="text-stone-400">Cancelled at</span>
                    <p className="font-medium text-stone-800 truncate">{formatDateTime(followUp.cancelled_at)}</p>
                  </div>
                )}
              </div>

              {/* Completion notes */}
              {followUp.completion_notes && (
                <div>
                  <h3 className="text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                    Completion Notes
                  </h3>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 whitespace-pre-wrap">
                    {followUp.completion_notes}
                  </div>
                </div>
              )}

              {/* Cancellation reason */}
              {followUp.cancellation_reason && (
                <div>
                  <h3 className="text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                    Cancellation Reason
                  </h3>
                  <div className="rounded-lg bg-stone-100 border border-stone-200 p-3 text-sm text-stone-700 whitespace-pre-wrap">
                    {followUp.cancellation_reason}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Comments Section ──────────────────────────────────────────── */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700">
                Comments ({comments.length})
              </span>
            </div>
          </div>

          {/* ── Comments List ────────────────────────────────────────────── */}
          <div className="max-h-[200px] overflow-y-auto space-y-2 mb-3">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No comments yet.</p>
            ) : (
              comments.map((comment: FollowUpComment) => (
                <div key={comment.id} className="flex gap-2.5 rounded-lg bg-white border border-slate-100 p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {(comment.user_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="text-xs font-semibold text-slate-700">{comment.user_name || 'Unknown'}</span>
                      <span className="text-[10px] text-slate-400">{formatDateTime(comment.created_at)}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700">{comment.comment}</p>
                    {comment.file_url && (
                      <div className="mt-1.5">
                        <a
                          href={comment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Attachment
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Add Comment Form ────────────────────────────────────────── */}
          {!isCompleted && !isCancelled && (
            <form onSubmit={handleAddComment}>
              <div className="flex items-start gap-2.5">
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    placeholder="Add a comment…"
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                  {/* File drop area */}
                  <div
                    className={`mt-1.5 relative border-2 border-dashed rounded-lg p-2 transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : commentFile
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={handleFileDrop}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-700 flex-shrink-0">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          {commentFile ? 'Change file' : 'Attach file'}
                          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                        </label>
                        {commentFile && (
                          <>
                            <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">
                              {commentFile.name}
                            </span>
                            <span className="text-[9px] text-slate-400 flex-shrink-0">
                              ({(commentFile.size / 1024).toFixed(1)} KB)
                            </span>
                            <button
                              type="button"
                              onClick={clearFile}
                              className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5 rounded hover:bg-red-50 transition-colors"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isDragging ? (
                          <span className="text-[10px] font-medium text-blue-600">Drop file here</span>
                        ) : (
                          !commentFile && <span className="text-[9px] text-slate-400">or drag & drop</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!commentText.trim() || isSubmitting}
                  className="shrink-0 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 mt-0.5"
                >
                  {isSubmitting ? <Spinner className="h-3.5 w-3.5" /> : 'Post'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FollowUpModal;