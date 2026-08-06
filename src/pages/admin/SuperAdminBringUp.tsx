// src/pages/documents/SuperAdminBringUp.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchBringUps,
  markDocument,
  clearError,
  fetchDocumentById,
  updateMark,
  updateBringUp,
  completeBringUp,
  sendFollowUp,
  createFollowUp,
  completeFollowUp,
  cancelFollowUp,
  addFollowUpComment,
  fetchFollowUpThread,
  selectBringUpDocuments,
} from '../../store/slices/documentSlice';
import { hasRole } from '../../store/slices/authSlice';
import {
  fetchUsers,
  selectAllUsers,
  selectUsersListLoading,
} from '../../store/slices/userSlice';
import {
  fetchDepartments,
  selectAllDepartments,
  selectDepartmentsListLoading,
} from '../../store/slices/departmentsSlice';
import type {
  Document,
  DocumentStatus,
  DocumentType,
  BringUpStatus,
  FollowUpStatus,
  FollowUpPriority,
  CreateFollowUpInput,
  SendFollowUpInput,
  CompleteFollowUpInput,
  CancelFollowUpInput,
  AddFollowUpCommentInput,
  CompleteBringUpInput,
  FollowUpWithComments,
  FollowUp,
} from '../../types/documents.types';
import { format } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: 'bg-stone-100 text-stone-500 border border-stone-200',
  uploaded: 'bg-blue-50 text-blue-700 border border-blue-100',
  pending_review: 'bg-amber-50 text-amber-700 border border-amber-100',
  dept_assigned: 'bg-violet-50 text-violet-700 border border-violet-100',
  user_assigned: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  marked: 'bg-violet-50 text-violet-700 border border-violet-100',
  in_progress: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  filed: 'bg-stone-100 text-stone-500 border border-stone-200',
  ready_to_release: 'bg-amber-50 text-amber-700 border border-amber-200',
  released: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'DRAFT',
  uploaded: 'UPLOADED',
  pending_review: 'PENDING',
  dept_assigned: 'DEPT ASSIGNED',
  user_assigned: 'USER ASSIGNED',
  marked: 'MARKED',
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  filed: 'FILED',
  ready_to_release: 'READY TO RELEASE',
  released: 'RELEASED',
};

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${STATUS_STYLES[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
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

// ─── Follow-Up Status Badge ───────────────────────────────────────────────────

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

const FollowUpStatusBadge: React.FC<{ status: FollowUpStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${FOLLOW_UP_STATUS_STYLES[status]}`}>
    {FOLLOW_UP_STATUS_LABELS[status]}
  </span>
);

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

// ─── Doc Icon ─────────────────────────────────────────────────────────────────

const DOC_ICON_COLORS: Record<DocumentType, string> = {
  memo: 'text-amber-500',
  letter: 'text-stone-400',
  certificate: 'text-amber-600',
  judgment: 'text-amber-600',
  ruling: 'text-violet-600',
  order: 'text-blue-600',
  correspondence: 'text-teal-600',
  upload: 'text-stone-400',
  ticket: 'text-purple-500',
};

const DocIcon: React.FC<{ type: DocumentType; className?: string }> = ({
  type,
  className = '',
}) => (
  <svg
    className={`${DOC_ICON_COLORS[type] ?? 'text-stone-400'} ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({
  className = 'h-3.5 w-3.5',
}) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ─── formatFileSize ───────────────────────────────────────────────────────────

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)}KB` : `${(kb / 1024).toFixed(1)}MB`;
};

// ─── List Item ───────────────────────────────────────────────────────────────

// ─── List Item ───────────────────────────────────────────────────────────────

// ─── List Item ───────────────────────────────────────────────────────────────

interface ListItemProps {
  document: Document;
  selected: boolean;
  onSelect: () => void;
  hasResponse?: boolean;
}

const ListItem: React.FC<ListItemProps> = ({
  document,
  selected,
  onSelect,
  hasResponse = false,
}) => {
  const mark = document.active_mark;
  const showMarkInfo = mark && (document.status === 'marked' || document.status === 'dept_assigned' || document.status === 'user_assigned');

  // ─── Check for active follow-ups ──────────────────────────────────────────
  const followUps = document.follow_ups || [];
  const activeFollowUps = followUps.filter(f => f.status !== 'completed' && f.status !== 'cancelled');
  const hasActiveFollowUp = activeFollowUps.length > 0;
  const hasUnreadMessages = activeFollowUps.some(f => f.comment_count && f.comment_count > 0);

  return (
    <div
      onClick={onSelect}
      className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
        selected
          ? 'bg-[#1E4620]/5 border-l-2 border-[#1E4620]'
          : hasResponse
            ? 'hover:bg-blue-50/50 border-l-2 border-blue-300/50 bg-blue-50/20'
            : 'hover:bg-stone-50 border-l-2 border-transparent'
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        <DocIcon type={document.type} className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <p
              className={`text-xs font-semibold leading-snug truncate ${
                selected ? 'text-[#1E4620]' : 'text-stone-800'
              }`}
            >
              {document.title}
            </p>
            
            {/* ─── Follow-up indicator next to title ──────────────────────── */}
            {hasActiveFollowUp && (
              <span 
                className={`inline-flex items-center gap-0.5 flex-shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium border ${
                  hasUnreadMessages 
                    ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
                title={`${activeFollowUps.length} active follow-up${activeFollowUps.length > 1 ? 's' : ''}${hasUnreadMessages ? ' - new replies' : ''}`}
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {activeFollowUps.length}
                {hasUnreadMessages && (
                  <span className="text-red-600 font-bold">!</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {hasResponse && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-medium text-blue-700 border border-blue-200">
                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
                {document.response_count || 1}
              </span>
            )}
            <StatusBadge status={document.status} />
            {document.bring_up_status && (
              <BringUpStatusBadge status={document.bring_up_status} />
            )}
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400 flex-wrap">
          <span>
            {document.created_at
              ? format(new Date(document.created_at), 'yyyy-MM-dd')
              : '—'}
          </span>
          {document.file_size_bytes && (
            <>
              <span>·</span>
              <span>{formatFileSize(document.file_size_bytes)}</span>
            </>
          )}
          <span>·</span>
          <span className="truncate">
            {document.reference_no || document.created_by_name || 'RHC'}
          </span>
          {document.bring_up_date && (
            <>
              <span>·</span>
              <span className="text-amber-600 font-medium">
                📅 {formatDateDisplay(document.bring_up_date)}
              </span>
            </>
          )}
        </div>

        {document.is_signed && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Signed
            {document.is_sent && <span className="ml-1 text-blue-500">· Sent</span>}
          </div>
        )}

        {showMarkInfo && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-violet-600">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                clipRule="evenodd"
              />
            </svg>
            Marked to: {mark.marked_to_dept_name}
            {mark.assigned_to_name && (
              <span className="ml-1">→ {mark.assigned_to_name}</span>
            )}
          </div>
        )}

        {/* ─── Active follow-up preview (shows the latest message) ─────────── */}
        {hasActiveFollowUp && (
          <div className="mt-1 flex items-center gap-1 text-[9px] text-blue-600 truncate">
            <svg className="h-2.5 w-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="truncate">
              {activeFollowUps.length === 1 
                ? activeFollowUps[0].notes 
                : `${activeFollowUps.length} active follow-ups`}
            </span>
            {hasUnreadMessages && (
              <span className="flex-shrink-0 text-red-500 font-semibold">
                · New replies
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sticky Note (DATE ONLY) ────────────────────────────────────────────────

interface StickyNoteProps {
  authorName: string;
  initialText: string;
  initialDate?: string | null;
  canEdit: boolean;
  onSave?: (text: string, date: string | null) => void;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  authorName,
  initialText,
  initialDate = null,
  canEdit,
  onSave,
}) => {
  const normalizeDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  };

  const [text, setText] = useState(initialText);
  const [date, setDate] = useState<string | null>(normalizeDate(initialDate));
  const [editing, setEditing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 24, y: 24 });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('textarea,button,a,input')) return;
      dragging.current = true;
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      e.preventDefault();
    },
    [pos],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleSave = () => {
    setEditing(false);
    onSave?.(text, date);
  };

  const handleCancel = () => {
    setText(initialText);
    setDate(normalizeDate(initialDate));
    setEditing(false);
  };

  const handleQuickDateChange = (newDate: string | null) => {
    setDate(newDate);
    setShowDatePicker(false);
    onSave?.(text, newDate);
  };

  const isOverdue = (dateStr: string): boolean => {
    const d = parseDate(dateStr);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isToday = (dateStr: string): boolean => {
    const d = parseDate(dateStr);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const showDateChip = date && parseDate(date) !== null;

  if (minimized) {
    return (
      <button
        style={{ left: pos.x, top: pos.y }}
        className="absolute z-30 flex items-center gap-1.5 rounded-full bg-[#F5C24C] border border-[#E8A840] shadow-md px-3 py-1.5 text-[11px] font-bold text-[#7A4E0D] hover:bg-[#f0bb40] transition-colors cursor-pointer select-none"
        onClick={() => setMinimized(false)}
        title="Expand note"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Note
      </button>
    );
  }

  return (
    <div
      ref={noteRef}
      style={{ left: pos.x, top: pos.y, width: 240 }}
      className="absolute z-30 flex flex-col rounded-md shadow-xl select-none"
      onMouseDown={onMouseDown}
    >
      <div className="flex justify-center -mb-1 pointer-events-none">
        <div className="w-10 h-3 rounded-sm bg-[#F5C24C]/60 border border-[#E8A840]/40 shadow-sm" />
      </div>

      <div
        className="rounded-md overflow-hidden"
        style={{
          background: '#FEF08A',
          boxShadow: '2px 4px 12px rgba(0,0,0,0.18), inset 0 -2px 0 rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="flex items-center justify-between px-2.5 pt-2 pb-1.5 cursor-grab active:cursor-grabbing"
          style={{ background: '#FDE047' }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className="h-3 w-3 text-[#7A4E0D] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 2a1 1 0 011 1v1h1a2 2 0 012 2v1a2 2 0 01-2 2h-.5l.5 9H6l.5-9H6a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 012 0v1h6V3a1 1 0 011-1z" />
            </svg>
            <span className="text-[10px] font-bold text-[#7A4E0D] tracking-wide truncate">
              {authorName}
            </span>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {canEdit && !editing && (
              <>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setShowDatePicker((v) => !v)}
                  className="p-0.5 rounded text-[#7A4E0D]/60 hover:text-[#7A4E0D] hover:bg-[#FDE047]/80 transition-colors"
                  title="Set bring‑up date"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setEditing(true)}
                  className="p-0.5 rounded text-[#7A4E0D]/60 hover:text-[#7A4E0D] hover:bg-[#FDE047]/80 transition-colors"
                  title="Edit note"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                  </svg>
                </button>
              </>
            )}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setMinimized(true)}
              className="p-0.5 rounded text-[#7A4E0D]/60 hover:text-[#7A4E0D] hover:bg-[#FDE047]/80 transition-colors"
              title="Minimise"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-2.5 pb-2.5 pt-1.5">
          {editing ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                autoFocus
                rows={6}
                className="w-full resize-none rounded border-0 bg-transparent text-[11px] text-stone-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#E8A840] placeholder:text-stone-400"
                placeholder="Add a note…"
                style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
              />

              <div
                className="mt-2 flex items-center gap-2"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <label className="text-[10px] font-medium text-[#7A4E0D]/70 whitespace-nowrap">
                  📅 Bring‑up date:
                </label>
                <input
                  type="date"
                  value={date || ''}
                  onChange={(e) => setDate(e.target.value || null)}
                  className="flex-1 rounded border border-[#E8A840] bg-white/70 px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E8A840]"
                />
              </div>

              <div
                className="flex justify-end gap-1.5 mt-2"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleCancel}
                  className="px-2 py-0.5 rounded text-[10px] font-medium text-[#7A4E0D]/70 hover:bg-[#FDE047] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-2 py-0.5 rounded bg-[#7A4E0D] text-[10px] font-semibold text-white hover:bg-[#5c3a09] transition-colors"
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                className="text-[11px] text-stone-800 leading-relaxed whitespace-pre-wrap break-words min-h-[48px]"
                style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
              >
                {text || <span className="italic text-stone-400">No note yet.</span>}
              </p>

              {showDateChip && (
                <div
                  className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium border ${
                    isToday(date!)
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : isOverdue(date!)
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  <span>📅</span>
                  <span>Bring up: {formatDateDisplay(date!)}</span>
                </div>
              )}

              {showDatePicker && canEdit && (
                <div
                  className="mt-2 p-2 bg-white rounded border border-[#E8A840] shadow-sm"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={date || ''}
                      onChange={(e) => handleQuickDateChange(e.target.value || null)}
                      className="flex-1 rounded border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                      autoFocus
                    />
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="text-[10px] text-stone-400 hover:text-stone-600"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[9px] text-stone-400 mt-1">
                    Select a date and it saves automatically.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-2.5 pb-1.5 flex items-center justify-between">
          <span className="text-[9px] text-[#7A4E0D]/50 font-medium">
            {format(new Date(), 'dd MMM yyyy')}
          </span>
          <div
            className="w-4 h-4 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.10) 50%)',
              borderRadius: '0 0 4px 0',
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Annotations Panel ────────────────────────────────────────────────────────

const AnnotationCard: React.FC<{
  title: string;
  department: string;
  assignee: string;
  comment: string;
  urgent: boolean;
  visibleInSummary: boolean;
  timestamp: string;
}> = ({
  title,
  department,
  assignee,
  comment,
  urgent,
  visibleInSummary,
  timestamp,
}) => (
  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-[10px]">
    <div className="flex items-start justify-between gap-2 mb-1">
      <span className="font-semibold text-stone-700 truncate">{title}</span>
      {urgent && <span className="text-red-600 font-bold shrink-0">Urgent</span>}
    </div>
    <p className="text-stone-500 mb-1">
      Marked to: <span className="text-stone-700">{department}</span>
    </p>
    {assignee !== '—' && (
      <p className="text-stone-500 mb-1">
        Assigned to: <span className="text-stone-700">{assignee}</span>
      </p>
    )}
    {comment && (
      <div className="border-l-2 border-[#C29B38] pl-2 mb-1">
        <span className="text-stone-500">Registrar's Comment: </span>
        <span className="text-stone-700">{comment}</span>
      </div>
    )}
    <div className="flex items-center justify-between text-stone-400 gap-2 flex-wrap">
      <span>{timestamp}</span>
      {visibleInSummary && (
        <span className="text-[#1E4620] font-medium">Visible in Summary</span>
      )}
    </div>
  </div>
);

const AnnotationsPanel: React.FC<{ document: Document }> = ({ document: doc }) => (
  <div className="bg-white border-t border-stone-200 flex-shrink-0">
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-stone-100 gap-2">
      <span className="text-xs font-semibold text-[#1E4620]">
        Registrar's Annotations
      </span>
    </div>
    <div className="px-3 sm:px-4 py-3 max-h-[140px] overflow-y-auto">
      {doc.active_mark ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnnotationCard
            title={doc.title}
            department={doc.active_mark.marked_to_dept_name}
            assignee={doc.active_mark.assigned_to_name ?? '—'}
            comment={doc.active_mark.instructions ?? 'Marked for action.'}
            urgent={doc.active_mark.priority === 'urgent'}
            visibleInSummary={false}
            timestamp={
              doc.active_mark.marked_at
                ? format(new Date(doc.active_mark.marked_at), 'dd MMM yyyy · hh:mm aa')
                : ''
            }
          />
        </div>
      ) : (
        <p className="text-[10px] text-stone-400 italic">No annotations yet.</p>
      )}
    </div>
  </div>
);

// ─── Document Fallback ────────────────────────────────────────────────────────

const DocumentFallback: React.FC<{ document: Document }> = ({ document: doc }) => (
  <div className="px-5 sm:px-16 py-8 sm:py-14">
    <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-8">
      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-stone-200 bg-stone-50 flex items-center justify-center text-stone-300">
        <svg viewBox="0 0 40 40" className="w-7 h-7 sm:w-10 sm:h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="20" cy="20" r="18" />
          <path d="M20 8 L22 15 L30 15 L24 20 L26 28 L20 23 L14 28 L16 20 L10 15 L18 15 Z" />
        </svg>
      </div>
      <div className="h-12 sm:h-16 w-px bg-stone-200" />
      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-stone-200 bg-stone-50 flex items-center justify-center text-stone-300">
        <svg viewBox="0 0 40 40" className="w-7 h-7 sm:w-10 sm:h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="20" cy="20" r="18" />
          <path d="M10 25 L20 10 L30 25" />
          <line x1="8" y1="25" x2="32" y2="25" />
          <line x1="20" y1="25" x2="20" y2="30" />
        </svg>
      </div>
    </div>
    <div className="text-center mb-2">
      <p className="text-[10px] text-stone-400 tracking-widest uppercase">Republic of Kenya</p>
      <p className="text-xs sm:text-sm font-bold text-stone-900 tracking-wide mt-0.5 uppercase">Office of the Registrar High Court</p>
    </div>
    <div className="border-t-2 border-stone-700 mt-4 mb-6" />
    <h2 className="text-center text-sm sm:text-base font-bold tracking-widest uppercase text-stone-800 mb-6 sm:mb-8">
      {doc.type === 'memo' ? 'MEMO' : 'LETTER'}
    </h2>
    <div className="text-sm text-stone-300 italic text-center py-8 sm:py-12">
      Document body will appear here…
    </div>
  </div>
);

// ─── File Preview ─────────────────────────────────────────────────────────────

const FilePreview: React.FC<{ document: Document }> = ({ document: doc }) => {
  const fileUrl = doc.file_url;

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] p-6 sm:p-8">
        <DocIcon type={doc.type} className="h-12 w-12 sm:h-14 sm:w-14 text-stone-300 mb-3" />
        <p className="text-sm text-stone-400 text-center">No file attached to this document.</p>
      </div>
    );
  }

  const ext = (fileUrl.split('/').pop() ?? '').split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'pdf') {
    return (
      <iframe
        src={`${fileUrl}#toolbar=0`}
        title={doc.title}
        className="w-full h-full min-h-[500px] sm:min-h-[800px] border-0"
      />
    );
  }

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] sm:min-h-[400px] p-4 sm:p-8">
        <img
          src={fileUrl}
          alt={doc.title}
          className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded shadow-sm"
        />
      </div>
    );
  }

  if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
    return (
      <iframe
        src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
        title={doc.title}
        className="w-full flex-1 min-h-[500px] sm:min-h-[800px] border-0"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] p-6 sm:p-8 gap-4">
      <DocIcon type={doc.type} className="h-12 w-12 sm:h-14 sm:w-14 text-stone-300" />
      <p className="text-sm text-stone-600 font-medium text-center break-all">
        {doc.original_name || doc.title}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E4620] px-4 py-2 text-xs font-medium text-white hover:bg-[#163a18]">
          Open in New Tab
        </a>
        <a href={fileUrl} download className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
          Download
        </a>
      </div>
    </div>
  );
};

// ─── COMPLETE MODAL (with required note) ─────────────────────────────────────

interface CompleteModalProps {
  document: Document;
  onClose: () => void;
  onComplete: (input: CompleteBringUpInput) => Promise<void>;
  isCompleting: boolean;
}

const CompleteModal: React.FC<CompleteModalProps> = ({
  document,
  onClose,
  onComplete,
  isCompleting,
}) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please provide notes/instructions for completing this bring up');
      return;
    }
    setError(null);
    try {
      await onComplete({ notes: notes.trim() });
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to complete bring up');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Complete Bring Up
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 mb-4">
          <p><strong>Document:</strong> {document.title}</p>
          <p className="mt-1">
            <strong>Current Bring Up Date:</strong> {document.bring_up_date ? formatDateDisplay(document.bring_up_date) : 'Not set'}
          </p>
          <p className="mt-1 text-amber-600">
            ⚠️ This will mark the bring up as completed and send the document back to the user.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Instructions / Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Provide instructions on what was done or what needs to be done..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
              required
              autoFocus
            />
            <p className="text-[10px] text-stone-400 mt-1">
              These notes will be sent to the user when the document is returned.
            </p>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCompleting || !notes.trim()}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isCompleting ? <Spinner className="h-3.5 w-3.5" /> : null}
              {isCompleting ? 'Completing...' : 'Complete & Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── FOLLOW-UP MODAL (Chat style) ────────────────────────────────────────────

interface FollowUpModalProps {
  document: Document;
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
  onComplete,
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
    const assignedUserId = threadData.assigned_to;
    const isCurrentUserAssigned = currentUserId === assignedUserId;

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
              {threadData.status !== 'completed' && threadData.status !== 'cancelled' && (
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

          {/* Chat Messages - FIXED ALIGNMENT */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px] bg-slate-50">
            {/* Initial message - always on the left */}
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

            {/* Replies - aligned based on who sent them */}
            {threadData.comments.map((c) => {
              const isCurrentUser = c.user_id === currentUserId;
              const isAssignedUser = c.user_id === assignedUserId;
              // If current user is the assigned user, their messages go on the right
              // If current user is NOT the assigned user, the assigned user's messages go on the right
              const shouldBeOnRight = isCurrentUser || (isAssignedUser && !isCurrentUserAssigned);
              
              return (
                <div 
                  key={c.id} 
                  className={`flex items-start gap-2.5 ${shouldBeOnRight ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    shouldBeOnRight ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {c.user_name?.charAt(0) || 'U'}
                  </div>
                  <div className={`max-w-[80%] ${shouldBeOnRight ? 'items-end' : ''}`}>
                    <div className={`flex items-center gap-2 mb-0.5 ${shouldBeOnRight ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold text-stone-700">
                        {c.user_name || 'User'}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {formatDateDisplay(c.created_at)}
                      </span>
                    </div>
                    <div className={`rounded-lg px-4 py-2 text-sm text-stone-800 ${
                      shouldBeOnRight ? 'bg-emerald-100' : 'bg-blue-100'
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

          {/* Chat Input */}
          {threadData.status !== 'completed' && threadData.status !== 'cancelled' && (
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
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400">
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

// ─── Document Editor (SIMPLIFIED - only 4 buttons) ─────────────────────────

interface DocumentEditorProps {
  document: Document;
  currentUserName: string;
  isSuperAdmin: boolean;
  onBack: () => void;
  onUpdateMark?: (markId: string, text: string, date: string | null) => void;
  onOpenComplete: () => void;
  onOpenFollowUp: () => void;
  onMark: () => void;
  isCompleting: boolean;
  onDownload?: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  currentUserName,
  isSuperAdmin,
  onBack,
  onUpdateMark,
  onOpenComplete,
  onOpenFollowUp,
  onMark,
  isCompleting,
  onDownload,
}) => {
  const formattedDate = document.created_at
    ? format(new Date(document.created_at), 'dd MMM yyyy')
    : '—';

  const hasMarkNote = !!document.active_mark?.instructions;
  const [showNote, setShowNote] = useState(hasMarkNote);

  const stickyNoteText = document.active_mark?.instructions ?? '';
  const stickyNoteDate = document.bring_up_date ?? null;
  const noteAuthor = document.active_mark
    ? (document.created_by_name ?? currentUserName)
    : currentUserName;

  const handleStickyNoteSave = (text: string, date: string | null) => {
    if (document.active_mark && onUpdateMark) {
      onUpdateMark(document.active_mark.id, text, date);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (document.file_url) {
      window.open(document.file_url, '_blank');
    } else {
      toast.error('No file available to download');
    }
  };

  const isBringUpCompleted = !!document.bring_up_completed_at;
  const hasBringUp = !!document.bring_up_date;
  const isBringUpOverdue = hasBringUp && !isBringUpCompleted && new Date(document.bring_up_date!) < new Date();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 bg-white border-b border-stone-200 px-3 sm:px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="lg:hidden flex-shrink-0 rounded-md p-1 text-stone-500 hover:bg-stone-100 transition-colors -ml-1"
            aria-label="Back to document list"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-stone-900 truncate">
            {document.title}
          </span>
          <span className="text-stone-300 text-xs hidden sm:inline">—</span>
          <span className="text-xs text-stone-400 hidden sm:inline">
            {formattedDate}
          </span>
          {hasBringUp && !isBringUpCompleted && (
            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${
              isBringUpOverdue 
                ? 'bg-red-100 text-red-700 border border-red-200' 
                : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              📅 {formatDateDisplay(document.bring_up_date!)}
              {isBringUpOverdue && ' ⚠️ OVERDUE'}
            </span>
          )}
          {isBringUpCompleted && (
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
              ✅ Completed
            </span>
          )}
        </div>

        {/* ─── 4 BUTTONS ONLY ────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto w-full sm:w-auto">
          {/* 1. Note toggle */}
          {(isSuperAdmin || hasMarkNote) && (
            <button
              onClick={() => setShowNote((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                showNote
                  ? 'border-[#E8A840] bg-[#FEF08A] text-[#7A4E0D]'
                  : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
              }`}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0v3m0 0l3 3m-3-3h-3" />
              </svg>
              Note
            </button>
          )}

          {/* 2. Follow Up */}
          <button
            onClick={onOpenFollowUp}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Follow Up
            {(document.follow_ups?.filter(f => f.status !== 'completed' && f.status !== 'cancelled').length || 0) > 0 && (
              <span className="ml-0.5 rounded-full bg-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                {document.follow_ups?.filter(f => f.status !== 'completed' && f.status !== 'cancelled').length}
              </span>
            )}
          </button>

          {/* 3. Mark */}
          {onMark && document.status !== 'filed' && (
            <button
              onClick={onMark}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Mark
            </button>
          )}

          {/* 4. Complete */}
          {hasBringUp && !isBringUpCompleted && (
            <button
              onClick={onOpenComplete}
              disabled={isCompleting}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                isBringUpOverdue
                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isCompleting ? <Spinner className="h-3 w-3" /> : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {isCompleting ? 'Completing...' : 'Complete'}
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto bg-stone-100 py-3 px-2 sm:py-6 sm:px-6 relative">
        {showNote && (
          <StickyNote
            key={document.id}
            authorName={noteAuthor}
            initialText={stickyNoteText}
            initialDate={stickyNoteDate}
            canEdit={isSuperAdmin}
            onSave={handleStickyNoteSave}
          />
        )}

        <div className="mx-auto max-w-[794px] w-full min-h-[600px] sm:min-h-[900px] bg-white shadow-sm rounded-sm">
          {document.type === 'memo' || document.type === 'letter' ? (
            <DocumentFallback document={document} />
          ) : (
            <FilePreview document={document} />
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between gap-2 bg-white border-t border-stone-100 px-3 sm:px-4 py-1.5 flex-shrink-0 flex-wrap">
        <span className="text-[10px] text-stone-400 whitespace-nowrap">
          {isBringUpCompleted 
            ? '✅ Bring Up Completed' 
            : isBringUpOverdue 
              ? '⚠️ OVERDUE' 
              : hasBringUp 
                ? `📅 Due: ${formatDateDisplay(document.bring_up_date!)}`
                : 'No bring-up date set'}
        </span>
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
          {(document.file_url || onDownload) && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
          <button className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors whitespace-nowrap">
            🖨 Print
          </button>
        </div>
      </div>

      <AnnotationsPanel document={document} />
    </div>
  );
};

// ─── Mark Modal ───────────────────────────────────────────────────────────────

interface MarkModalProps {
  document: Document;
  onClose: () => void;
  onMark: (
    id: string,
    data: {
      departmentId: string;
      userId: string;
      instructions: string;
      priority: string;
    },
  ) => void;
}

const MarkModal: React.FC<MarkModalProps> = ({ document: doc, onClose, onMark }) => {
  const dispatch = useAppDispatch();
  const departments = useAppSelector(selectAllDepartments);
  const departmentsLoading = useAppSelector(selectDepartmentsListLoading);
  const teamMembers = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [userId, setUserId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [priority, setPriority] = useState('normal');

  useEffect(() => {
    dispatch(fetchDepartments({ is_active: true }));
  }, [dispatch]);

  useEffect(() => {
    if (!deptId) return;
    dispatch(
      fetchUsers({
        is_active: true,
        department_id: deptId,
        limit: 100,
        sort_by: 'full_name',
        sort_order: 'ASC',
      }),
    );
  }, [dispatch, deptId]);

  const activeDepartments = departments.filter((d) => d.is_active);

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDeptId(e.target.value);
    setUserId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) return;
    onMark(doc.id, { departmentId: deptId, userId, instructions, priority });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
            <span className="text-red-500">📌</span> Mark Document to Department
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none flex-shrink-0">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Document
            </label>
            <div className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 font-medium truncate">
              {doc.title}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Department *
            </label>
            <select
              value={deptId}
              onChange={handleDeptChange}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none disabled:bg-stone-50 disabled:text-stone-400"
              required
              disabled={departmentsLoading}
            >
              <option value="">
                {departmentsLoading
                  ? 'Loading departments…'
                  : '— Select Department —'}
              </option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.code ? ` (${d.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Assign to (Optional)
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none disabled:bg-stone-50 disabled:text-stone-400"
              disabled={usersLoading || !deptId}
            >
              <option value="">
                {usersLoading
                  ? 'Loading team members…'
                  : !deptId
                    ? '— Select a department first —'
                    : teamMembers.length === 0
                      ? 'No active users in this department'
                      : '— Assign to specific user (optional) —'}
              </option>
              {teamMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.pj_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Registrar's Comment{' '}
              <span className="font-normal text-stone-400 normal-case">
                (Visible to Secretary)
              </span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Add instructions, annotations, or comments for this department..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-800 order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] flex items-center justify-center gap-1.5 order-1 sm:order-2"
            >
              <span className="text-red-400">📌</span> Mark Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminBringUp: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const documents = useAppSelector(selectBringUpDocuments);
  const { loading, error } = useAppSelector((state) => state.documents);

  const isSuperAdmin = hasRole(user, 'super_admin');
  const canView = !!user;

  // Local state
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [isFetchingDocument, setIsFetchingDocument] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // ─── Refresh documents function ─────────────────────────────────────
  const refreshDocuments = useCallback(() => {
    if (!canView) return;
    dispatch(fetchBringUps({
      page: 1,
      limit: PAGE_SIZE,
      sort_by: 'bring_up_date',
      sort_order: 'ASC',
    }));
  }, [dispatch, canView]);

  // Fetch documents with bring-up date
  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  // Fetch users and departments for mark modal
  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchUsers({ is_active: true, limit: 100 }));
      dispatch(fetchDepartments({ is_active: true }));
    }
  }, [dispatch, isSuperAdmin]);

  // Error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // ─── Filter documents ───────────────────────────────────────────────
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (!doc.bring_up_date) return false;
      if (doc.bring_up_status === 'completed') return false;
      return true;
    });
  }, [documents]);

  const grouped = useMemo(() => {
    const withBringUp = filteredDocuments.filter((d) => !!d.bring_up_date);

    const buckets: Record<BringUpBucket, Document[]> = {
      overdue: [],
      today: [],
      upcoming: [],
    };

    withBringUp.forEach((doc) => {
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
  }, [filteredDocuments]);

  const totalCount = grouped.overdue.length + grouped.today.length + grouped.upcoming.length;

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectDocument = useCallback(async (doc: Document) => {
    setIsFetchingDocument(true);
    try {
      const result = await dispatch(fetchDocumentById(doc.id)).unwrap();
      setSelectedDocument(result);
    } catch (error) {
      console.error('Failed to fetch document details:', error);
      setSelectedDocument(doc);
      toast.error('Could not load full document details');
    } finally {
      setIsFetchingDocument(false);
    }
  }, [dispatch]);

  const handleMark = (
    id: string,
    data: {
      departmentId: string;
      userId: string;
      instructions: string;
      priority: string;
    },
  ) => {
    dispatch(
      markDocument({
        id,
        input: {
          department_id: data.departmentId,
          assigned_to: data.userId || undefined,
          instructions: data.instructions,
          priority: data.priority as 'low' | 'normal' | 'urgent',
        },
      }),
    );
    setShowMarkModal(false);
  };

  const handleUpdateMark = useCallback((markId: string, text: string, date: string | null) => {
    dispatch(updateMark({ markId, instructions: text }));
    
    if (selectedDocument && selectedDocument.active_mark) {
      const updatedMark = {
        ...selectedDocument.active_mark,
        instructions: text,
      };
      setSelectedDocument({
        ...selectedDocument,
        active_mark: updatedMark,
      });
    }
    
    if (selectedDocument && date) {
      const newDate = new Date(date).toISOString();
      const currentBringUpDate = selectedDocument.bring_up_date;
      
      if (currentBringUpDate !== newDate) {
        dispatch(updateBringUp({
          id: selectedDocument.id,
          input: {
            bring_up_date: newDate,
            notes: selectedDocument.bring_up_notes || undefined
          }
        })).then(() => {
          if (selectedDocument) {
            dispatch(fetchDocumentById(selectedDocument.id)).then((result) => {
              if (fetchDocumentById.fulfilled.match(result)) {
                setSelectedDocument(result.payload);
              }
            });
            refreshDocuments();
          }
        }).catch((error) => {
          toast.error(typeof error === 'string' ? error : 'Failed to update bring up date');
        });
      }
    }
  }, [dispatch, selectedDocument, refreshDocuments]);

  const handleCompleteBringUp = useCallback(async (input: CompleteBringUpInput) => {
    if (!selectedDocument) return;
    setIsCompleting(true);
    try {
      await dispatch(completeBringUp({
        id: selectedDocument.id,
        input
      })).unwrap();
      
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
      refreshDocuments();
      toast.success('Bring up completed successfully!');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to complete bring up');
    } finally {
      setIsCompleting(false);
    }
  }, [dispatch, selectedDocument, refreshDocuments]);

  const handleDownload = () => {
    if (!selectedDocument?.file_url) {
      toast.error('No file available to download');
      return;
    }
    window.open(selectedDocument.file_url, '_blank');
  };

  // ─── Follow-Up handlers ─────────────────────────────────────────────────────

  const handleSendFollowUp = async (input: SendFollowUpInput): Promise<FollowUp> => {
    const result = await dispatch(sendFollowUp(input)).unwrap();
    if (selectedDocument) {
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
    }
    refreshDocuments();
    return result;
  };

  const handleCreateFollowUp = async (input: CreateFollowUpInput): Promise<FollowUp> => {
    const result = await dispatch(createFollowUp(input)).unwrap();
    if (selectedDocument) {
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
    }
    refreshDocuments();
    return result;
  };

  const handleCancelFollowUp = async (followUpId: string, input: CancelFollowUpInput): Promise<void> => {
    await dispatch(cancelFollowUp({ followUpId, input })).unwrap();
    if (selectedDocument) {
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
    }
    refreshDocuments();
  };

  const handleCompleteFollowUp = async (followUpId: string, input: CompleteFollowUpInput): Promise<void> => {
    await dispatch(completeFollowUp({ followUpId, input })).unwrap();
    if (selectedDocument) {
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
    }
    refreshDocuments();
  };

  const handleAddFollowUpComment = async (followUpId: string, input: AddFollowUpCommentInput): Promise<void> => {
    await dispatch(addFollowUpComment({ followUpId, input })).unwrap();
  };

  const handleViewFollowUpThread = async (followUpId: string): Promise<FollowUpWithComments | null> => {
    const result = await dispatch(fetchFollowUpThread(followUpId)).unwrap();
    return result || null;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4 text-center">
        <p className="text-stone-400 text-sm">You don't have access to the Bring Up Portal.</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4 text-center">
        <p className="text-stone-400 text-sm">The Bring Up Portal is only available to super admins.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F7F4]">
      <Toaster position="top-right" />

      {/* ─── Complete Modal ───────────────────────────────────────────────── */}
      {showCompleteModal && selectedDocument && (
        <CompleteModal
          document={selectedDocument}
          onClose={() => setShowCompleteModal(false)}
          onComplete={handleCompleteBringUp}
          isCompleting={isCompleting}
        />
      )}

      {/* ─── Follow-Up Modal ────────────────────────────────────────────── */}
      {showFollowUpModal && selectedDocument && (
        <FollowUpModalComponent
          document={selectedDocument}
          onClose={() => setShowFollowUpModal(false)}
          onSend={handleSendFollowUp}
          onCreate={handleCreateFollowUp}
          onComplete={handleCompleteFollowUp}
          onCancel={handleCancelFollowUp}
          onAddComment={handleAddFollowUpComment}
          onViewThread={handleViewFollowUpThread}
          currentUserId={user?.id || ''}
        />
      )}

      {/* Main layout: left list / right editor */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left panel: grouped list */}
        <div
          className={`w-full lg:w-[360px] flex-shrink-0 flex-col border-r border-stone-200 bg-white overflow-hidden ${
            selectedDocument ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="px-4 pt-4 pb-2 border-b border-stone-100">
            <h2 className="text-sm font-bold text-[#1E3F20]">Bring‑up Overview</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {loading
                ? 'Loading…'
                : `${totalCount} document${totalCount !== 1 ? 's' : ''} with a bring‑up date`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-[#1E3F20]" />
              </div>
            ) : totalCount === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400">
                No documents with bring‑up dates.
              </div>
            ) : (
              (['overdue', 'today', 'upcoming'] as BringUpBucket[]).map((bucket) => {
                const docs = grouped[bucket];
                if (docs.length === 0) return null;
                return (
                  <div key={bucket} className="bg-white rounded-lg border border-stone-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 border-b border-stone-100">
                      <span className="text-[10px] font-bold text-[#1E3F20] uppercase tracking-wider">
                        {BUCKET_LABEL[bucket]}
                      </span>
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-200 text-stone-700">
                        {docs.length}
                      </span>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {docs.map((doc) => (
                        <ListItem
                          key={doc.id}
                          document={doc}
                          selected={selectedDocument?.id === doc.id}
                          onSelect={() => handleSelectDocument(doc)}
                          hasResponse={(doc.response_count ?? 0) > 0}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel: document editor */}
        <div
          className={`w-full flex-1 flex-col overflow-hidden bg-stone-100 ${
            selectedDocument ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {isFetchingDocument ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Spinner className="h-8 w-8 mx-auto text-[#1E3F20]" />
                <p className="mt-3 text-sm text-stone-500">Loading document details...</p>
              </div>
            </div>
          ) : selectedDocument ? (
            <DocumentEditor
              key={selectedDocument.id}
              document={selectedDocument}
              currentUserName={user?.full_name ?? 'Registrar'}
              isSuperAdmin={isSuperAdmin}
              onBack={() => setSelectedDocument(null)}
              onUpdateMark={handleUpdateMark}
              onOpenComplete={() => setShowCompleteModal(true)}
              onOpenFollowUp={() => setShowFollowUpModal(true)}
              onMark={() => setShowMarkModal(true)}
              isCompleting={isCompleting}
              onDownload={handleDownload}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-4">
              <div className="text-center max-w-sm">
                <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3 text-sm font-semibold text-stone-500">Select a document</p>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  Choose a document from the list to view and manage it.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ────────────────────────────────────────────────────────── */}

      {showMarkModal && selectedDocument && (
        <MarkModal
          document={selectedDocument}
          onClose={() => setShowMarkModal(false)}
          onMark={handleMark}
        />
      )}
    </div>
  );
};

export default SuperAdminBringUp;