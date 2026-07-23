// src/pages/documents/SuperAdminBringUp.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchDocuments,
  signDocument,
  sendDocument,
  markDocument,
  acknowledgeMark,
  completeMark,
  clearError,
  requestSignOtp,
  updateMark,
  respondToDocument,
  fetchDocumentById,
  createFollowUp,
  fileAwayFollowUp,
  completeFollowUp,
  cancelFollowUp,
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
  DocumentFilters,
  FollowUp,
  FollowUpStatus,
  FollowUpPriority,
  CreateFollowUpInput,
  CompleteFollowUpInput,
  CancelFollowUpInput,
  FileAwayFollowUpInput,
} from '../../types/documents.types';
import { format } from 'date-fns';
import FollowUpModal from './FollowUpModal';

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
          <p
            className={`text-xs font-semibold leading-snug truncate ${
              selected ? 'text-[#1E4620]' : 'text-stone-800'
            }`}
          >
            {document.title}
          </p>
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
      </div>
    </div>
  );
};

// ─── Sticky Note ─────────────────────────────────────────────────────────────

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

  const formatDateChip = (dateStr: string): string => {
    const d = parseDate(dateStr);
    if (!d) return 'Invalid Date';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
                  <span>Bring up: {formatDateChip(date!)}</span>
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
      <button className="text-[10px] text-stone-400 hover:text-[#1E4620] transition-colors font-medium whitespace-nowrap">
        Secretary View Active
      </button>
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
      <button className="mt-2 text-[10px] text-[#1E4620] hover:underline font-medium">
        + Add New Annotation
      </button>
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

// ─── Response Modal ──────────────────────────────────────────────────────────

interface ResponseModalProps {
  document: Document;
  onClose: () => void;
  onResponseSubmitted: () => void;
}

const ResponseModal: React.FC<ResponseModalProps> = ({
  document,
  onClose,
  onResponseSubmitted,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentDocument = useAppSelector((state) => state.documents.currentDocument);

  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const responses = currentDocument?.id === document.id
    ? currentDocument.responses ?? []
    : [];

  const isPendingResponse =
    document.status === 'pending_review' &&
    document.assigned_to === currentUser?.id;

  const isFormValid = note.trim().length > 0;
  const nextResponseNumber = responses.length + 1;

  useEffect(() => {
    dispatch(fetchDocumentById(document.id));
  }, [dispatch, document.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

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

      await dispatch(fetchDocumentById(document.id));
      onResponseSubmitted();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to add response');
    } finally {
      setIsSubmitting(false);
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
    setFile(droppedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit');
      e.target.value = '';
      return;
    }
    setFile(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatDateTime = (date: string | Date): string =>
    new Intl.DateTimeFormat('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));

  const getTypeBadgeColor = (type: string): string => {
    const colors: Record<string, string> = {
      memo: 'bg-blue-100 text-blue-700',
      letter: 'bg-indigo-100 text-indigo-700',
      judgment: 'bg-purple-100 text-purple-700',
      ruling: 'bg-pink-100 text-pink-700',
      order: 'bg-amber-100 text-amber-700',
      correspondence: 'bg-green-100 text-green-700',
      upload: 'bg-gray-100 text-gray-700',
      ticket: 'bg-purple-500 text-white',
    };
    return colors[type] ?? 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-xl bg-white shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Document Info */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Document:</span>
            <span className="text-sm font-medium text-slate-900 truncate">{document.title}</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(document.type)}`}>
              {document.type}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
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

        {/* Responses List */}
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
            responses.map((response) => (
              <div key={response.id} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition-colors">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {response.response_number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-xs font-semibold text-slate-700">{response.responded_by_name}</span>
                    <span className="text-[11px] text-slate-400">{formatDateTime(response.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{response.note}</p>
                  {response.file_url && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <a href={response.file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {response.original_name || 'View attachment'}
                        {response.file_size_bytes && (
                          <span className="text-[10px] text-slate-400">({formatFileSize(response.file_size_bytes)})</span>
                        )}
                      </a>
                      <a href={response.file_url} download className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Response Form */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Add Response #{nextResponseNumber}
              </span>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={isPendingResponse
                ? 'Type your response to the request for more information…'
                : 'Type your response…'}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />

            <div
              className={`mt-2 relative border-2 border-dashed rounded-lg p-3 transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : file
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDrop={handleFileDrop}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 flex-shrink-0">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {file ? 'Change file' : 'Attach a file (optional)'}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                  </label>
                  {file && (
                    <>
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button type="button" onClick={clearFile}
                        className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5 rounded hover:bg-red-50 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {isDragging ? (
                    <span className="text-xs font-medium text-blue-600">Drop file here</span>
                  ) : (
                    !file && <span className="text-[10px] text-slate-400">or drag & drop</span>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Max file size: 25 MB. Supported: PDF, DOCX, XLSX, JPG, PNG, MP4, MP3
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Close
              </button>
              <button type="submit" disabled={!isFormValid || isSubmitting}
                className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  isPendingResponse
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                } disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none`}>
                {isSubmitting ? (
                  <><Spinner className="h-3.5 w-3.5" /> Sending…</>
                ) : isPendingResponse ? (
                  '📤 Send Response'
                ) : (
                  'Send Response'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Reassign Modal ───────────────────────────────────────────────────────────

interface ReassignModalProps {
  document: Document;
  currentMark: {
    id: string;
    department_id: string;
    assigned_to: string | null;
    instructions: string;
    priority: string;
  };
  onClose: () => void;
  onReassign: (markId: string, data: {
    department_id: string;
    assigned_to: string | null;
    instructions: string;
    priority: string;
    note?: string;
  }) => void;
  isReassigning: boolean;
}

const ReassignModal: React.FC<ReassignModalProps> = ({
  document,
  currentMark,
  onClose,
  onReassign,
  isReassigning,
}) => {
  const dispatch = useAppDispatch();
  const departments = useAppSelector(selectAllDepartments);
  const deptsLoading = useAppSelector(selectDepartmentsListLoading);
  const users = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [deptId, setDeptId] = useState(currentMark.department_id);
  const [userId, setUserId] = useState(currentMark.assigned_to || '');
  const [instructions, setInstructions] = useState(currentMark.instructions);
  const [priority, setPriority] = useState(currentMark.priority);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchDepartments({ is_active: true }));
  }, [dispatch]);

  useEffect(() => {
    if (deptId) {
      dispatch(fetchUsers({ is_active: true, department_id: deptId, limit: 100 }));
    }
  }, [dispatch, deptId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) {
      setError('Please select a department');
      return;
    }
    setError(null);
    onReassign(currentMark.id, {
      department_id: deptId,
      assigned_to: userId || null,
      instructions,
      priority,
      note: note || undefined,
    });
  };

  const activeDepartments = departments.filter(d => d.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
            <span className="text-amber-500">🔄</span> Re‑assign / Push Back
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none flex-shrink-0">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <p><strong>Document:</strong> {document.title}</p>
            <p className="mt-1"><strong>Current mark:</strong> {currentMark.instructions || '(no instruction)'}</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Department *
            </label>
            <select
              value={deptId}
              onChange={(e) => { setDeptId(e.target.value); setUserId(''); }}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
              required
              disabled={deptsLoading}
            >
              <option value="">
                {deptsLoading ? 'Loading…' : '— Select Department —'}
              </option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
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
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
              disabled={usersLoading || !deptId}
            >
              <option value="">
                {usersLoading
                  ? 'Loading users…'
                  : !deptId
                    ? '— Select a department first —'
                    : users.length === 0
                      ? 'No active users in this department'
                      : '— Assign to specific user (optional) —'}
              </option>
              {users.map((u) => (
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
              New Instructions / Comment
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Add new instructions or context for the reassignment..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Reason for push back <span className="font-normal text-stone-400 normal-case">(visible to recipient)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Why are you pushing this back?"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-800 order-2 sm:order-1">
              Cancel
            </button>
            <button type="submit" disabled={isReassigning || !deptId}
              className="rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] disabled:opacity-40 disabled:cursor-not-allowed order-1 sm:order-2 inline-flex items-center gap-2">
              {isReassigning && <Spinner className="h-3.5 w-3.5" />}
              {isReassigning ? 'Reassigning…' : 'Push Back'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Follow-Up Card ───────────────────────────────────────────────────────────

interface FollowUpCardProps {
  followUp: FollowUp;
  currentUserId: string;
  isSuperAdmin: boolean;
  onViewDetails: (followUpId: string) => void;
  onComplete: (followUpId: string, input: CompleteFollowUpInput) => Promise<void> | void;
  onCancel: (followUpId: string, input: CancelFollowUpInput) => Promise<void> | void;
  onFileAway?: (followUpId: string, input: FileAwayFollowUpInput) => Promise<void> | void;
  documentId: string;
}

const FollowUpCard: React.FC<FollowUpCardProps> = ({
  followUp,
  currentUserId,
  isSuperAdmin,
  onViewDetails,
  onComplete,
  onCancel,
  onFileAway,
  documentId,
}) => {
  const isAssignedToMe = followUp.assigned_to === currentUserId;
  const canComplete = isAssignedToMe || isSuperAdmin;
  const canCancel = followUp.created_by === currentUserId || isAssignedToMe || isSuperAdmin;
  const isCompleted = followUp.status === 'completed';
  const isCancelled = followUp.status === 'cancelled';
  const isFiledAway = followUp.status === 'filed_away';
  const isActive = !isCompleted && !isCancelled && !isFiledAway;

  const dueDate = followUp.due_date ? new Date(followUp.due_date) : null;
  const isOverdue = isActive && dueDate && dueDate < new Date();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleComplete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onComplete(followUp.id, {});
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileAway = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onFileAway?.(followUp.id, {
        document_id: documentId,
        mark_id: followUp.mark_id || undefined,
        notes: followUp.notes,
        completion_notes: `Filed away by ${currentUserId}`,
      });
      toast.success('Document filed away successfully');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      await onCancel(followUp.id, { cancellation_reason: cancelReason.trim() });
      setShowCancelModal(false);
      setCancelReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const dueDateDisplay = followUp.due_date 
    ? format(new Date(followUp.due_date), 'dd MMM yyyy')
    : 'Filed Away';

  return (
    <>
      <div className={`rounded-lg border p-3 transition-colors ${
        isCompleted 
          ? 'border-emerald-200 bg-emerald-50/30' 
          : isCancelled
            ? 'border-stone-200 bg-stone-50/30 opacity-60'
            : isFiledAway
              ? 'border-slate-200 bg-slate-50/30'
              : isOverdue
                ? 'border-red-200 bg-red-50/30'
                : 'border-stone-200 bg-white hover:border-stone-300'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-stone-800 truncate">
                {followUp.notes}
              </span>
              <FollowUpStatusBadge status={followUp.status} />
              <FollowUpPriorityBadge priority={followUp.priority} />
              {isOverdue && (
                <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                  ⚠️ OVERDUE
                </span>
              )}
              {isFiledAway && (
                <span className="inline-flex items-center gap-0.5 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                  📁 FILED AWAY
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-stone-400 flex-wrap">
              <span>
                Assigned to: <span className="text-stone-600">{followUp.assigned_to_name || 'Unassigned'}</span>
              </span>
              <span>·</span>
              <span>
                {followUp.due_date ? (
                  <>
                    Due: <span className={isOverdue ? 'text-red-600 font-medium' : 'text-stone-600'}>
                      {dueDateDisplay}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500">No due date</span>
                )}
              </span>
              {followUp.comment_count !== undefined && followUp.comment_count > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {followUp.comment_count}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isActive && canComplete && (
              <button
                onClick={handleComplete}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Spinner className="h-2.5 w-2.5" /> : '✓ Complete'}
              </button>
            )}
            {isActive && isSuperAdmin && onFileAway && (
              <button
                onClick={handleFileAway}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {isProcessing ? <Spinner className="h-2.5 w-2.5" /> : '📁 File Away'}
              </button>
            )}
            {isActive && canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-600 hover:bg-stone-200 transition-colors"
              >
                ✕ Cancel
              </button>
            )}
            <button
              onClick={() => onViewDetails(followUp.id)}
              className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-200 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-sm font-bold text-stone-900">Cancel Follow-Up</h3>
            <p className="text-xs text-stone-500 mt-1">
              Are you sure you want to cancel this follow-up?
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
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
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
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isProcessing ? <Spinner className="h-3.5 w-3.5" /> : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Follow-Ups Panel ─────────────────────────────────────────────────────

interface FollowUpsPanelProps {
  document: Document;
  currentUserId: string;
  isSuperAdmin: boolean;
  onViewDetails: (followUpId: string) => void;
  onComplete: (followUpId: string, input: CompleteFollowUpInput) => Promise<void> | void;
  onCancel: (followUpId: string, input: CancelFollowUpInput) => Promise<void> | void;
  onFileAway?: (followUpId: string, input: FileAwayFollowUpInput) => Promise<void> | void;
}

const FollowUpsPanel: React.FC<FollowUpsPanelProps> = ({
  document,
  currentUserId,
  isSuperAdmin,
  onViewDetails,
  onComplete,
  onCancel,
  onFileAway,
}) => {
  const followUps = document.follow_ups || [];

  if (followUps.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-xs text-stone-400">No follow-ups yet.</p>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 space-y-2 max-h-[300px] overflow-y-auto">
      {followUps.map((followUp) => (
        <FollowUpCard
          key={followUp.id}
          followUp={followUp}
          currentUserId={currentUserId}
          isSuperAdmin={isSuperAdmin}
          onViewDetails={onViewDetails}
          onComplete={onComplete}
          onCancel={onCancel}
          onFileAway={onFileAway}
          documentId={document.id}
        />
      ))}
    </div>
  );
};

// ─── Create Follow-Up Modal ──────────────────────────────────────────────────

interface CreateFollowUpModalProps {
  document: Document;
  markId: string;
  onClose: () => void;
  onCreate: (input: CreateFollowUpInput) => void;
}

const CreateFollowUpModal: React.FC<CreateFollowUpModalProps> = ({
  document,
  markId,
  onClose,
  onCreate,
}) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<FollowUpPriority>('normal');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchUsers({ is_active: true, limit: 100 }));
  }, [dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || !assignedTo) {
      setError('Please fill in notes and assign a user');
      return;
    }
    setError(null);
    onCreate({
      document_id: document.id,
      mark_id: markId,
      notes: notes.trim(),
      assigned_to: assignedTo,
      due_date: dueDate || undefined,
      priority,
    });
  };

  const handleFileAway = () => {
    if (!notes.trim() || !assignedTo) {
      setError('Please fill in notes and assign a user');
      return;
    }
    setError(null);
    onCreate({
      document_id: document.id,
      mark_id: markId,
      notes: notes.trim(),
      assigned_to: assignedTo,
      due_date: null,
      priority,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0v3m0 0l3 3m-3-3h-3" />
            </svg>
            Create Follow-Up
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Document
            </label>
            <div className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 font-medium truncate">
              {document.title}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Notes / What needs to be done *
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe what needs to be done or what was done..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
              required
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
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none disabled:bg-stone-50 disabled:text-stone-400"
              required
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
              Due Date <span className="font-normal text-stone-400 normal-case">(optional - leave blank to file away)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              {dueDate ? 'This follow-up will be active with a due date.' : 'Leave blank to file away immediately.'}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
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
              type="button"
              onClick={handleFileAway}
              disabled={!notes.trim() || !assignedTo}
              className="flex-1 rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              📁 File Away
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a18] transition-colors inline-flex items-center justify-center gap-2"
            >
              Create Follow-Up
            </button>
          </div>
        </form>
      </div>
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

// ─── OTP Modal ───────────────────────────────────────────────────────────────

interface OtpModalProps {
  isSigningInProgress: boolean;
  otpLoading: boolean;
  otpValue: string;
  otpError: string | null;
  signingDocId: string | null;
  onOtpChange: (val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onResend: () => void;
}

const OtpModal: React.FC<OtpModalProps> = ({
  isSigningInProgress,
  otpLoading,
  otpValue,
  otpError,
  onOtpChange,
  onSubmit,
  onCancel,
  onResend,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Confirm E-Signature</h3>
          <p className="text-xs text-stone-400 mt-0.5">Enter the OTP sent to your email</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-2">
          One-Time PIN
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpValue}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) =>
            e.key === 'Enter' &&
            otpValue.length === 6 &&
            !isSigningInProgress &&
            onSubmit()
          }
          placeholder="● ● ● ● ● ●"
          className="w-full rounded-lg border border-stone-200 px-4 py-3 text-center text-xl font-bold tracking-[0.5em] text-stone-900 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          autoFocus
        />
        <p className="text-[10px] text-stone-400 mt-1.5 text-center">OTP expires in 5 minutes</p>
      </div>

      {otpError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <svg className="h-3.5 w-3.5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-700">{otpError}</p>
        </div>
      )}

      <p className="text-[10px] text-stone-400 text-center mb-5">
        Didn't receive it?{' '}
        <button
          onClick={onResend}
          disabled={otpLoading || isSigningInProgress}
          className="text-[#1E4620] font-semibold hover:underline disabled:opacity-50"
        >
          {otpLoading ? 'Sending…' : 'Resend OTP'}
        </button>
      </p>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isSigningInProgress}
          className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={otpValue.length !== 6 || isSigningInProgress}
          className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isSigningInProgress ? (
            <>
              <Spinner className="h-3.5 w-3.5" /> Signing…
            </>
          ) : (
            'Confirm & Sign'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ─── Document Editor ──────────────────────────────────────────────────────────

interface DocumentEditorProps {
  document: Document;
  currentUserName: string;
  isSuperAdmin: boolean;
  onBack: () => void;
  onSign?: () => void;
  isSigning?: boolean;
  onSend?: () => void;
  onMark?: () => void;
  onAcknowledge?: () => void;
  onComplete?: () => void;
  onUpdateMark?: (markId: string, text: string, date: string | null) => void;
  onDownload?: () => void;
  onOpenResponses?: () => void;
  onReassign?: () => void;
  isReassigning?: boolean;
  onAddFollowUp?: () => void;
  onViewFollowUpDetails?: (followUpId: string) => void;
  onCompleteFollowUp?: (followUpId: string, input: CompleteFollowUpInput) => Promise<void>;
  onCancelFollowUp?: (followUpId: string, input: CancelFollowUpInput) => Promise<void>;
  onFileAwayFollowUp?: (followUpId: string, input: FileAwayFollowUpInput) => Promise<void>;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  currentUserName,
  isSuperAdmin,
  onBack,
  onSign,
  isSigning = false,
  onSend,
  onMark,
  onAcknowledge,
  onComplete,
  onUpdateMark,
  onDownload,
  onOpenResponses,
  onReassign,
  isReassigning = false,
  onAddFollowUp,
  onViewFollowUpDetails,
  onCompleteFollowUp,
  onCancelFollowUp,
  onFileAwayFollowUp,
}) => {
  const { user } = useAppSelector((state) => state.auth);
  const isComposed = document.type === 'memo' || document.type === 'letter';
  const formattedDate = document.created_at
    ? format(new Date(document.created_at), 'dd MMM yyyy')
    : '—';

  const hasMarkNote = !!document.active_mark?.instructions;
  const [showNote, setShowNote] = useState(hasMarkNote);
  const [showFollowUps, setShowFollowUps] = useState(true);

  const stickyNoteText = document.active_mark?.instructions ?? '';
  const stickyNoteDate = document.active_mark?.bring_up_date ?? null;
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

  const handleOpenResponses = () => {
    if (onOpenResponses) {
      onOpenResponses();
    }
  };

  const followUps = document.follow_ups || [];

  // ─── View Follow-ups handler ──────────────────────────────────────────────
  const handleViewFollowUps = () => {
    if (followUps.length === 0) {
      toast('No follow-ups have been created for this document yet.', {
        icon: 'ℹ️',
        duration: 3000,
      });
      return;
    }

    const sorted = [...followUps].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const mostRecent = sorted[0];
    if (onViewFollowUpDetails && mostRecent?.id) {
      onViewFollowUpDetails(mostRecent.id);
    } else {
      toast.error('Unable to open follow-up details');
    }
  };

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
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto w-full sm:w-auto">
          {/* Responses button */}
          <button
            onClick={handleOpenResponses}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-4-4z" />
            </svg>
            Responses
            {document.response_count && document.response_count > 0 && (
              <span className="ml-0.5 rounded-full bg-[#1E4620]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#1E4620]">
                {document.response_count}
              </span>
            )}
          </button>

          {/* Note toggle */}
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

          {/* Follow-ups toggle */}
          {isSuperAdmin && followUps.length > 0 && (
            <button
              onClick={() => setShowFollowUps((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                showFollowUps
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
              }`}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Follow-ups
              {followUps.length > 0 && (
                <span className="ml-0.5 rounded-full bg-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                  {followUps.length}
                </span>
              )}
            </button>
          )}

          {/* ─── Mark button ─────────────────────────────── */}
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

          {/* ─── Push Back button ─────────────────────────── */}
          {onReassign && document.active_mark && (
            <button
              onClick={onReassign}
              disabled={isReassigning}
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isReassigning ? <Spinner className="h-3 w-3" /> : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {isReassigning ? 'Pushing…' : 'Push Back'}
            </button>
          )}

          {onAcknowledge && (
            <button
              onClick={onAcknowledge}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap"
            >
              Acknowledge
            </button>
          )}

          {onComplete && (
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap"
            >
              Complete
            </button>
          )}

          {onSign && (
            <button
              onClick={onSign}
              disabled={isSigning}
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigning ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
              {isSigning ? 'Sending OTP…' : 'E-Sign'}
            </button>
          )}

          {onSend && (
            <button
              onClick={onSend}
              className="hidden sm:inline-flex items-center gap-1 rounded-md bg-[#1E4620] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#163a18] transition-colors whitespace-nowrap"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Convert to PDF & Send
            </button>
          )}

          {/* ─── Follow-Up buttons section ───────────────────────────────────── */}
          {isSuperAdmin && document.active_mark && (
            <div className="flex items-center gap-1.5">
              {/* Add Follow-Up button */}
              {onAddFollowUp && (
                <button
                  onClick={onAddFollowUp}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Follow-Up
                </button>
              )}

              {/* View Details button */}
              {onViewFollowUpDetails && (
                <button
                  onClick={handleViewFollowUps}
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Details
                  {followUps.length > 0 && (
                    <span className="ml-0.5 rounded-full bg-indigo-200 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
                      {followUps.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Canvas (no toolbar) */}
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
          {isComposed ? (
            <DocumentFallback document={document} />
          ) : (
            <FilePreview document={document} />
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between gap-2 bg-white border-t border-stone-100 px-3 sm:px-4 py-1.5 flex-shrink-0 flex-wrap">
        <span className="text-[10px] text-stone-400 whitespace-nowrap">
          {document.is_signed
            ? `✅ Signed${document.signed_by_name ? ` · ${document.signed_by_name}` : ''}`
            : 'Not signed'}
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
          {onSign && (
            <button
              onClick={onSign}
              disabled={isSigning}
              className="inline-flex items-center gap-1 rounded bg-[#C29B38] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#a8832e] transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigning && <Spinner className="h-2.5 w-2.5" />}
              {isSigning ? 'Sending OTP…' : 'E-Sign'}
            </button>
          )}
          {onSend && (
            <button
              onClick={onSend}
              className="rounded bg-[#1E4620] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#163a18] transition-colors whitespace-nowrap"
            >
              Convert to PDF & Send
            </button>
          )}
        </div>
      </div>

      {/* Annotations panel */}
      <AnnotationsPanel document={document} />

      {/* Follow-Ups Panel */}
      {isSuperAdmin && followUps.length > 0 && showFollowUps && (
        <div className="bg-white border-t border-stone-200 flex-shrink-0">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-stone-100 gap-2">
            <span className="text-xs font-semibold text-[#1E4620] flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Follow-Ups
              {followUps.length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                  {followUps.length}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {onAddFollowUp && document.active_mark && (
                <button
                  onClick={onAddFollowUp}
                  className="text-[10px] text-[#1E4620] hover:underline font-medium flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Follow-Up
                </button>
              )}
              {onViewFollowUpDetails && (
                <button
                  onClick={() => {
                    if (followUps.length === 0) {
                      toast('No follow-ups have been created for this document yet.', {
                        icon: 'ℹ️',
                        duration: 3000,
                      });
                      return;
                    }
                    const mostRecent = followUps.sort((a, b) => 
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )[0];
                    if (mostRecent) onViewFollowUpDetails(mostRecent.id);
                  }}
                  className="text-[10px] text-indigo-600 hover:underline font-medium flex items-center gap-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View All
                </button>
              )}
            </div>
          </div>
          <FollowUpsPanel
            document={document}
            currentUserId={user?.id || ''}
            isSuperAdmin={isSuperAdmin}
            onViewDetails={onViewFollowUpDetails || (() => {})}
            onComplete={onCompleteFollowUp || (async () => {})}
            onCancel={onCancelFollowUp || (async () => {})}
            onFileAway={onFileAwayFollowUp}
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminBringUp: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { documents, loading, error, actionInProgress } = useAppSelector(
    (state) => state.documents,
  );

  const isSuperAdmin = hasRole(user, 'super_admin');
  const canView = !!user;

  // Local state
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [signToast, setSignToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── Response modal state ───────────────────────────────────────────
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseDocument, setResponseDocument] = useState<Document | null>(null);

  // ─── Push Back state ─────────────────────────────────────────────────
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);

  // ─── Follow-Up state ─────────────────────────────────────────────────
  const [showCreateFollowUp, setShowCreateFollowUp] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);

  // ─── Fetch document selection ──────────────────────────────────────
  const [isFetchingDocument, setIsFetchingDocument] = useState(false);

  // ─── Refresh documents function ─────────────────────────────────────
  const refreshDocuments = useCallback(() => {
    if (!canView) return;
    const params: DocumentFilters = {
      page: 1,
      limit: PAGE_SIZE,
      has_bring_up_date: true,
    };
    dispatch(fetchDocuments(params));
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

  // ─── Group documents by bucket ──────────────────────────────────────────────
  // Filter out documents that have been filed away (all follow-ups are filed_away)
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const followUps = doc.follow_ups || [];
      // If all follow-ups are filed_away or completed, hide the document
      const allFiledOrCompleted = followUps.every(
        (f) => f.status === 'filed_away' || f.status === 'completed' || f.status === 'cancelled'
      );
      // If there are no follow-ups, keep the document (it hasn't been filed away)
      if (followUps.length === 0) return true;
      // Keep the document if it has at least one active follow-up
      return !allFiledOrCompleted;
    });
  }, [documents]);

  const grouped = useMemo(() => {
    const withBringUp = filteredDocuments.filter((d) => !!d.active_mark?.bring_up_date);

    const buckets: Record<BringUpBucket, Document[]> = {
      overdue: [],
      today: [],
      upcoming: [],
    };

    withBringUp.forEach((doc) => {
      const bucket = getBucket(doc.active_mark!.bring_up_date!);
      buckets[bucket].push(doc);
    });

    (Object.keys(buckets) as BringUpBucket[]).forEach((key) => {
      buckets[key].sort((a, b) => {
        const aDate = parseDate(a.active_mark!.bring_up_date!)?.getTime() ?? 0;
        const bDate = parseDate(b.active_mark!.bring_up_date!)?.getTime() ?? 0;
        return aDate - bDate;
      });
    });

    return buckets;
  }, [filteredDocuments]);

  const totalCount = grouped.overdue.length + grouped.today.length + grouped.upcoming.length;

  // ─── Handlers ────────────────────────────────────────────────────────────────

  // ─── Document selection handler ────────────────────────────────────────────
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

  const showToast = (toastMsg: { type: 'success' | 'error'; message: string }) => {
    setSignToast(toastMsg);
    setTimeout(() => setSignToast(null), 4000);
  };

  const handleSign = async (id: string) => {
    setOtpError(null);
    setOtpValue('');
    setSigningDocId(id);
    setOtpLoading(true);

    const result = await dispatch(requestSignOtp(id));
    setOtpLoading(false);

    if (requestSignOtp.fulfilled.match(result)) {
      setShowOtpModal(true);
    } else {
      showToast({
        type: 'error',
        message: (result.payload as string) ?? 'Failed to send OTP. Please try again.',
      });
    }
  };

  const handleOtpSubmit = async () => {
    if (!signingDocId || !otpValue.trim()) return;
    setOtpError(null);

    const result = await dispatch(signDocument({ id: signingDocId, otp: otpValue.trim() }));

    if (signDocument.fulfilled.match(result)) {
      setShowOtpModal(false);
      setOtpValue('');
      setSigningDocId(null);
      const refreshed = await dispatch(fetchDocumentById(signingDocId)).unwrap();
      setSelectedDocument(refreshed);
      showToast({ type: 'success', message: 'Document signed successfully.' });
    } else {
      setOtpError((result.payload as string) ?? 'Invalid OTP. Please try again.');
    }
  };

  const handleOtpCancel = () => {
    setShowOtpModal(false);
    setOtpValue('');
    setOtpError(null);
    setSigningDocId(null);
  };

  const handleOtpChange = (val: string) => {
    setOtpError(null);
    setOtpValue(val);
  };

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

  const handleSend = (id: string) => dispatch(sendDocument(id));
  const handleAcknowledge = (id: string) => dispatch(acknowledgeMark(id));
  const handleComplete = (id: string) => dispatch(completeMark(id));

  const handleUpdateMark = (markId: string, text: string, date: string | null) => {
    dispatch(updateMark({ markId, instructions: text, bring_up_date: date }));
    if (selectedDocument && selectedDocument.active_mark) {
      const updatedMark = {
        ...selectedDocument.active_mark,
        instructions: text,
        bring_up_date: date,
      };
      setSelectedDocument({
        ...selectedDocument,
        active_mark: updatedMark,
      });
    }
  };

  const handleDownload = () => {
    if (!selectedDocument?.file_url) {
      toast.error('No file available to download');
      return;
    }
    window.open(selectedDocument.file_url, '_blank');
  };

  // Open response modal
  const handleOpenResponses = () => {
    if (selectedDocument) {
      setResponseDocument(selectedDocument);
      setShowResponseModal(true);
    }
  };

  const handleResponseSubmitted = async () => {
    if (selectedDocument) {
      const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
      setSelectedDocument(refreshed);
    }
    refreshDocuments();
  };

  // ─── Push Back handlers ─────────────────────────────────────────────
  const handleOpenReassign = () => {
    setShowReassignModal(true);
  };

  const handleReassignSubmit = async (
    markId: string,
    data: {
      department_id: string;
      assigned_to: string | null;
      instructions: string;
      priority: string;
      note?: string;
    }
  ) => {
    setReassignLoading(true);
    try {
      console.warn('reassignMark not implemented yet', { markId, data });
      toast.error('Push back is not yet available. Please wait for the update.');
      setTimeout(() => {
        setShowReassignModal(false);
        setReassignLoading(false);
      }, 1000);
    } catch {
      toast.error('Something went wrong.');
      setReassignLoading(false);
    }
  };

  // ─── Follow-Up handlers ─────────────────────────────────────────────────────

  const handleCreateFollowUp = async (input: CreateFollowUpInput) => {
    try {
      await dispatch(createFollowUp(input)).unwrap();
      setShowCreateFollowUp(false);
      toast.success('Follow-up created successfully');
      if (selectedDocument) {
        const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
        setSelectedDocument(refreshed);
      }
      refreshDocuments();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to create follow-up');
    }
  };

  const handleCompleteFollowUp = async (followUpId: string, input: CompleteFollowUpInput) => {
    try {
      await dispatch(completeFollowUp({ followUpId, input })).unwrap();
      toast.success('Follow-up completed successfully');
      if (selectedDocument) {
        const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
        setSelectedDocument(refreshed);
      }
      refreshDocuments();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to complete follow-up');
    }
  };

  const handleCancelFollowUp = async (followUpId: string, input: CancelFollowUpInput) => {
    try {
      await dispatch(cancelFollowUp({ followUpId, input })).unwrap();
      toast.success('Follow-up cancelled successfully');
      if (selectedDocument) {
        const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
        setSelectedDocument(refreshed);
      }
      refreshDocuments();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to cancel follow-up');
    }
  };

  // ─── File Away Follow-Up handler ────────────────────────────────────────────
  const handleFileAwayFollowUp = async (followUpId: string, input: FileAwayFollowUpInput) => {
    try {
      await dispatch(fileAwayFollowUp(input)).unwrap();
      toast.success('Document filed away successfully');
      // Close the follow-up modal if open
      setShowFollowUpModal(false);
      setSelectedFollowUpId(null);
      // Clear selected document if it was the one filed away
      if (selectedDocument && selectedDocument.id === input.document_id) {
        setSelectedDocument(null);
      }
      // Refresh the document list to remove the filed away document
      refreshDocuments();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to file away document');
    }
  };

  const handleViewFollowUpDetails = (followUpId: string) => {
    setSelectedFollowUpId(followUpId);
    setShowFollowUpModal(true);
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

  const isSigningInProgress = !!actionInProgress.signing;

  return (
    <div className="flex flex-col h-full bg-[#F4F7F4]">
      <Toaster position="top-right" />

      {/* Toast for sign operations */}
      {signToast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            signToast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <span>{signToast.type === 'success' ? '✅' : '❌'}</span>
          <span>{signToast.message}</span>
          <button
            onClick={() => setSignToast(null)}
            className="ml-2 text-white/70 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Response Modal (portal) ────────────────────────────────────── */}
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

      {/* ─── Reassign Modal ─────────────────────────────────────────────── */}
      {showReassignModal && selectedDocument && selectedDocument.active_mark && (
        <ReassignModal
          document={selectedDocument}
          currentMark={{
            id: selectedDocument.active_mark.id,
            department_id: selectedDocument.active_mark.marked_to_dept,
            assigned_to: selectedDocument.active_mark.assigned_to,
            instructions: selectedDocument.active_mark.instructions || '',
            priority: selectedDocument.active_mark.priority || 'normal',
          }}
          onClose={() => setShowReassignModal(false)}
          onReassign={handleReassignSubmit}
          isReassigning={reassignLoading}
        />
      )}

      {/* ─── Create Follow-Up Modal ──────────────────────────────────────── */}
      {showCreateFollowUp && selectedDocument && selectedDocument.active_mark && (
        <CreateFollowUpModal
          document={selectedDocument}
          markId={selectedDocument.active_mark.id}
          onClose={() => setShowCreateFollowUp(false)}
          onCreate={handleCreateFollowUp}
        />
      )}

      {/* ─── Follow-Up Detail Modal ──────────────────────────────────────── */}
      {showFollowUpModal && selectedFollowUpId && (
        <FollowUpModal
          followUpId={selectedFollowUpId}
          onClose={() => {
            setShowFollowUpModal(false);
            setSelectedFollowUpId(null);
          }}
          onUpdate={async () => {
            if (selectedDocument) {
              const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
              setSelectedDocument(refreshed);
            }
            refreshDocuments();
          }}
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
              (['overdue', 'upcoming'] as BringUpBucket[]).map((bucket) => {
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
              onSign={
                isSuperAdmin && !selectedDocument.is_signed
                  ? () => handleSign(selectedDocument.id)
                  : undefined
              }
              isSigning={otpLoading || actionInProgress.signing === selectedDocument.id}
              onSend={
                isSuperAdmin &&
                !selectedDocument.is_sent &&
                selectedDocument.is_signed
                  ? () => handleSend(selectedDocument.id)
                  : undefined
              }
              onMark={
                isSuperAdmin && selectedDocument.status !== 'filed'
                  ? () => setShowMarkModal(true)
                  : undefined
              }
              onAcknowledge={
                (selectedDocument.status === 'marked' || selectedDocument.status === 'user_assigned') &&
                (selectedDocument.assigned_to === user?.id || isSuperAdmin)
                  ? () => handleAcknowledge(selectedDocument.id)
                  : undefined
              }
              onComplete={
                selectedDocument.status === 'in_progress' &&
                (selectedDocument.assigned_to === user?.id || isSuperAdmin)
                  ? () => handleComplete(selectedDocument.id)
                  : undefined
              }
              onUpdateMark={handleUpdateMark}
              onDownload={handleDownload}
              onOpenResponses={handleOpenResponses}
              onReassign={selectedDocument.active_mark ? handleOpenReassign : undefined}
              isReassigning={reassignLoading}
              onAddFollowUp={() => setShowCreateFollowUp(true)}
              onViewFollowUpDetails={handleViewFollowUpDetails}
              onCompleteFollowUp={handleCompleteFollowUp}
              onCancelFollowUp={handleCancelFollowUp}
              onFileAwayFollowUp={handleFileAwayFollowUp}
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

      {showOtpModal && (
        <OtpModal
          isSigningInProgress={isSigningInProgress}
          otpLoading={otpLoading}
          otpValue={otpValue}
          otpError={otpError}
          signingDocId={signingDocId}
          onOtpChange={handleOtpChange}
          onSubmit={handleOtpSubmit}
          onCancel={handleOtpCancel}
          onResend={() => signingDocId && handleSign(signingDocId)}
        />
      )}
    </div>
  );
};

export default SuperAdminBringUp;