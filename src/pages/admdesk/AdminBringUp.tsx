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
} from '../../store/slices/documentSlice';
import { selectCurrentUser, fetchCurrentUser } from '../../store/slices/userSlice';
import type { 
  Document as DocType, 
  RoutePriority, 
  FollowUpStatus,
  DocumentAnnotation,
} from '../../types/documents.types';

import type { RootState } from '../../store/store';
import FollowUpModal from '../admin/FollowUpModal';

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
  filed_away: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: 'PENDING',
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  filed_away: 'FILED AWAY',
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

// ─── StickyNote ─────────────────────────────────────────────────────────────

interface StickyNoteProps {
  authorName: string;
  text: string;
  bringUpDate?: string | null;
}

const StickyNote: React.FC<StickyNoteProps> = ({ authorName, text, bringUpDate }) => {
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const showDateChip = bringUpDate && parseDate(bringUpDate) !== null;

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

  if (minimized) {
    return (
      <button
        style={{ left: pos.x, top: pos.y }}
        className="absolute z-30 flex items-center gap-1.5 rounded-full bg-[#F5C24C] border border-[#E8A840] shadow-md px-3 py-1.5 text-[11px] font-bold text-[#7A4E0D] hover:bg-[#f0bb40] transition-colors cursor-pointer select-none"
        onClick={() => setMinimized(false)}
        title="Expand note"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Note
      </button>
    );
  }

  return (
    <div
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

        <div className="px-2.5 pb-2.5 pt-1.5">
          <p
            className="text-[11px] text-stone-800 leading-relaxed whitespace-pre-wrap break-words min-h-[48px]"
            style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
          >
            {text || <span className="italic text-stone-400">No instructions.</span>}
          </p>

          {showDateChip && (
            <div
              className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium border ${
                isToday(bringUpDate!)
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : isOverdue(bringUpDate!)
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-stone-100 text-stone-700 border-stone-200'
              }`}
            >
              <span>📅</span>
              <span>Bring up: {formatDateDisplay(bringUpDate!)}</span>
            </div>
          )}
        </div>

        <div className="px-2.5 pb-1.5 flex items-center justify-between">
          <span className="text-[9px] text-[#7A4E0D]/50 font-medium">Registrar's note</span>
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

// ─── DocumentPreviewPanel ──────────────────────────────────────────────────

interface DocumentPreviewPanelProps {
  document: DocType & { annotations?: DocumentAnnotation[] };
  onClose: () => void;
  onRespond: () => void;
  onViewFollowUpThread?: (followUpId: string) => void;
  onDelete?: (docId: string) => void;
}

const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({ 
  document, 
  onClose, 
  onRespond,
  onViewFollowUpThread,
  onDelete,
}) => {
  const fileUrl = document.file_url;
  const ext = getFileExtension(fileUrl);
  const fileName = document.original_name || document.title;
  const isComposed = document.type === 'memo' || document.type === 'letter';
  const isPdf = document.mime_type === 'application/pdf' || ext === 'pdf';
  const followUps = document.follow_ups || [];
  const hasFollowUps = followUps.length > 0;
  const annotations = document.annotations || [];
  const hasAnnotations = annotations.length > 0;
  
  // Get the most recent active follow-up, or the first one
  const activeFollowUp = followUps
    .filter(f => f.status !== 'completed' && f.status !== 'cancelled')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || followUps[0];

  // ─── Get all follow-ups that are NOT completed or cancelled ──────────────
  const activeFollowUps = followUps.filter(f => f.status !== 'completed' && f.status !== 'cancelled');
  const completedFollowUps = followUps.filter(f => f.status === 'completed' || f.status === 'cancelled');

  // ─── Check if there are urgent annotations ───────────────────────────────
  const hasUrgentAnnotations = annotations.some((a: DocumentAnnotation) => a.is_urgent);

  // ─── Check if document can be deleted (all follow-ups are terminal) ──────
  const canDelete = followUps.length > 0 && followUps.every(
    f => f.status === 'filed_away' || f.status === 'completed' || f.status === 'cancelled'
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(document.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const renderPreview = () => {
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

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-semibold text-slate-900 truncate max-w-md">
              {document.title}
            </span>
            
            {/* ─── Registrar's Note Indicator ──────────────────────────────── */}
            {document.active_mark?.instructions && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Registrar's Note
              </span>
            )}

            {/* ─── Annotation Indicator ────────────────────────────────────── */}
            {hasAnnotations && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {annotations.length} annotation{annotations.length > 1 ? 's' : ''}
                {hasUrgentAnnotations && (
                  <span className="ml-0.5 text-red-500">· ⚠️ Urgent</span>
                )}
              </span>
            )}

            {document.original_name && (
              <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded">
                {document.original_name}
              </span>
            )}
            {document.file_size_bytes && (
              <span className="text-xs text-slate-400">
                ({formatFileSize(document.file_size_bytes)})
              </span>
            )}
            {document.priority && document.priority !== 'normal' && (
              <PriorityBadge priority={document.priority} />
            )}
            {hasFollowUps && activeFollowUp && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {activeFollowUps.length} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {fileUrl && (
              <a
                href={fileUrl}
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
            {hasFollowUps && activeFollowUp && onViewFollowUpThread && (
              <button
                onClick={() => onViewFollowUpThread(activeFollowUp.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Follow-ups
              </button>
            )}
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

        {/* ─── Super Admin Remarks Panel ────────────────────────────────────── */}
        {document.active_mark?.instructions && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 shrink-0">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-amber-800">
                    Registrar's Instructions
                  </span>
                  <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    {document.active_mark.marked_by_name || 'Registrar'}
                  </span>
                  {document.active_mark.bring_up_date && (
                    <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                      📅 Bring up: {formatDateDisplay(document.active_mark.bring_up_date)}
                    </span>
                  )}
                  {document.active_mark.priority && document.active_mark.priority !== 'normal' && (
                    <PriorityBadge priority={document.active_mark.priority} />
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-700 whitespace-pre-wrap">
                  {document.active_mark.instructions}
                </p>
                {document.active_mark.marked_to_dept_name && (
                  <p className="mt-1 text-xs text-amber-600">
                    Department: <span className="font-medium">{document.active_mark.marked_to_dept_name}</span>
                    {document.active_mark.assigned_to_name && (
                      <> · Assigned to: <span className="font-medium">{document.active_mark.assigned_to_name}</span></>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Annotations Panel ────────────────────────────────────────────── */}
        {hasAnnotations && (
          <div className="px-6 py-3 bg-purple-50 border-b border-purple-200 shrink-0">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-purple-800">
                    Annotations ({annotations.length})
                  </span>
                  {hasUrgentAnnotations && (
                    <span className="text-[10px] text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      ⚠️ Contains urgent annotations
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1.5 max-h-[100px] overflow-y-auto">
                  {annotations.slice(-3).map((annotation: DocumentAnnotation) => (
                    <div key={annotation.id} className="flex items-start gap-2 text-xs bg-white rounded-md p-2 border border-purple-100">
                      <span className="font-semibold text-purple-700 whitespace-nowrap">
                        {annotation.annotated_by_name || 'Unknown'}:
                      </span>
                      <span className="text-stone-700 flex-1">
                        {annotation.comment}
                        {annotation.is_urgent && (
                          <span className="ml-2 text-red-500 font-medium">[URGENT]</span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDateDisplay(annotation.created_at)}
                      </span>
                    </div>
                  ))}
                  {annotations.length > 3 && (
                    <p className="text-[10px] text-purple-500 text-center">
                      +{annotations.length - 3} more annotations
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Follow-ups Summary Panel ─────────────────────────────────────── */}
        {hasFollowUps && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 shrink-0">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-blue-800">
                    Follow-ups ({followUps.length})
                  </span>
                  {activeFollowUps.length > 0 && (
                    <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      {activeFollowUps.length} active
                    </span>
                  )}
                  {completedFollowUps.length > 0 && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {completedFollowUps.length} completed
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {followUps.slice(0, 3).map((f) => (
                    <div key={f.id} className="inline-flex items-center gap-1.5 bg-white rounded-md px-2.5 py-1 border border-blue-100 text-xs">
                      <span className="text-stone-700 truncate max-w-[120px]">
                        {f.notes}
                      </span>
                      <FollowUpStatusBadge status={f.status} />
                      {f.due_date && (
                        <span className="text-[10px] text-slate-400">
                          {formatDateDisplay(f.due_date)}
                        </span>
                      )}
                    </div>
                  ))}
                  {followUps.length > 3 && (
                    <span className="inline-flex items-center text-xs text-blue-600 font-medium">
                      +{followUps.length - 3} more
                    </span>
                  )}
                </div>
                {onViewFollowUpThread && activeFollowUp && (
                  <button
                    onClick={() => onViewFollowUpThread(activeFollowUp.id)}
                    className="mt-1.5 text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
                  >
                    View all follow-ups
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-slate-100 relative">
          {document.active_mark?.instructions && (
            <StickyNote
              key={document.id}
              authorName={document.active_mark.marked_by_name ?? 'Registrar'}
              text={document.active_mark.instructions}
              bringUpDate={document.active_mark.bring_up_date}
            />
          )}
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <svg
    className={`animate-spin ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-current`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

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

// ─── Row ───────────────────────────────────────────────────────────────────

interface BringUpRowProps {
  document: DocType & { annotations?: DocumentAnnotation[] };
  bucket: BringUpBucket;
  currentUserId?: string;
  onRespond: (doc: DocType) => void;
  onPreview: (doc: DocType) => void;
  onDelete?: (docId: string) => void;
}

const BringUpRow: React.FC<BringUpRowProps> = ({
  document,
  bucket,
  currentUserId,
  onRespond,
  onPreview,
  onDelete,
}) => {
  // ✅ MOVE ALL HOOKS TO THE TOP BEFORE ANY CONDITIONAL RETURNS
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const mark = document.active_mark;
  
  // ✅ Now we can do the early return after all hooks
  if (!mark?.bring_up_date) return null;

  const needsResponse = document.status === 'pending_review' && document.assigned_to === currentUserId;
  const followUps = document.follow_ups || [];
  const activeFollowUps = followUps.filter(f => f.status !== 'completed' && f.status !== 'cancelled');
  const annotations = document.annotations || [];
  const hasAnnotations = annotations.length > 0;
  const hasSuperAdminRemarks = !!mark?.instructions;
  const hasUrgentAnnotations = annotations.some((a: DocumentAnnotation) => a.is_urgent);

  // ─── Check if document can be deleted (all follow-ups are terminal) ──────
  const canDelete = followUps.length > 0 && followUps.every(
    f => f.status === 'filed_away' || f.status === 'completed' || f.status === 'cancelled'
  );

  const handleDelete = () => {
    if (onDelete) {
      onDelete(document.id);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white p-5 hover:shadow-md transition-all duration-200">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onPreview(document)}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800 truncate">{document.title}</p>
            
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${BUCKET_COLOR[bucket]}`}
            >
              {BUCKET_LABEL[bucket]}
            </span>

            {/* ─── Registrar's Note Indicator ────────────────────────────────── */}
            {hasSuperAdminRemarks && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Registrar's Note
              </span>
            )}

            {/* ─── Annotation Indicator ────────────────────────────────────── */}
            {hasAnnotations && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {annotations.length} annotation{annotations.length > 1 ? 's' : ''}
                {hasUrgentAnnotations && (
                  <span className="ml-0.5 text-red-500">· ⚠️</span>
                )}
              </span>
            )}

            {needsResponse && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                ⚠️ Response needed
              </span>
            )}
            
            {activeFollowUps.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {activeFollowUps.length} follow-up{activeFollowUps.length > 1 ? 's' : ''}
              </span>
            )}

            {/* ─── Delete Indicator ────────────────────────────────────────── */}
            {canDelete && onDelete && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Ready to delete
              </span>
            )}
          </div>

          {/* ─── Super Admin's Instructions/Remarks ────────────────────────────── */}
          {mark.instructions && (
            <div className="mt-2 bg-amber-50 border-l-3 border-amber-400 rounded-md p-2.5">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-amber-800 font-medium">
                      <span className="font-semibold">Registrar's remarks:</span>
                    </p>
                    <span className="text-[9px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                      {mark.marked_by_name || 'Registrar'}
                    </span>
                    {mark.bring_up_date && (
                      <span className="text-[9px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                        📅 {formatDateDisplay(mark.bring_up_date)}
                      </span>
                    )}
                    {mark.priority && mark.priority !== 'normal' && (
                      <PriorityBadge priority={mark.priority} />
                    )}
                  </div>
                  <p className="text-xs text-stone-700 mt-0.5 line-clamp-2">
                    {mark.instructions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Annotation Preview ────────────────────────────────────────────── */}
          {hasAnnotations && (
            <div className="mt-2 bg-purple-50 border-l-3 border-purple-400 rounded-md p-2.5">
              <div className="flex items-start gap-2">
                <svg className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-purple-800 font-medium">
                      <span className="font-semibold">Latest annotation:</span>
                    </p>
                    {hasUrgentAnnotations && (
                      <span className="text-[9px] text-red-500 font-medium">⚠️ Urgent</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-700 mt-0.5 line-clamp-1">
                    {annotations[annotations.length - 1].comment}
                  </p>
                  <p className="text-[10px] text-purple-500 mt-0.5">
                    by {annotations[annotations.length - 1].annotated_by_name || 'Unknown'}
                    {annotations.length > 1 && (
                      <span className="ml-1">· +{annotations.length - 1} more</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {mark.marked_by_name && (
              <span className="flex items-center gap-1">
                <span className="text-slate-400">Marked by:</span>
                <span className="text-slate-700 font-medium">{mark.marked_by_name}</span>
              </span>
            )}
            {mark.marked_to_dept_name && (
              <span className="flex items-center gap-1">
                <span className="text-slate-400">Dept:</span>
                <span className="text-slate-700 font-medium">{mark.marked_to_dept_name}</span>
              </span>
            )}
            {mark.assigned_to_name && (
              <span className="flex items-center gap-1">
                <span className="text-slate-400">Assigned to:</span>
                <span className="text-slate-700 font-medium">{mark.assigned_to_name}</span>
              </span>
            )}
            {mark.priority && mark.priority !== 'normal' && (
              <PriorityBadge priority={mark.priority} />
            )}
          </div>
        </div>

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
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#A37F0C] hover:bg-[#856404] transition shadow-sm"
          >
            Open File
          </button>
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
          {hasSuperAdminRemarks && (
            <span className="text-[9px] text-amber-500 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
              </svg>
              Has registrar's note
            </span>
          )}
          {hasAnnotations && (
            <span className="text-[9px] text-purple-500 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
              </svg>
              Has annotations
            </span>
          )}
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
        for_my_action: true,
        ...(currentUser.department_id ? { department_id: currentUser.department_id } : {}),
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

  const grouped = useMemo(() => {
    const withBringUp = documents.filter((d) => !!d.active_mark?.bring_up_date);

    const buckets: Record<BringUpBucket, DocType[]> = {
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
    } catch (error) {
      console.error('Failed to fetch document details:', error);
      setSelectedDocument(doc);
      toast.error('Could not load full document details');
    } finally {
      setIsFetchingDocument(false);
    }
  }, [dispatch]);

  const handleViewFollowUpThread = (followUpId: string) => {
    setSelectedFollowUpId(followUpId);
    setShowFollowUpModal(true);
  };

  const refreshSelectedDocument = useCallback(async () => {
    if (selectedDocument) {
      try {
        const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
        setSelectedDocument(refreshed);
      } catch {
        // Silently fail
      }
    }
  }, [dispatch, selectedDocument]);

  // ─── Delete handler ──────────────────────────────────────────────────────────
  const handleDeleteDocument = useCallback(async (docId: string) => {
    try {
      await dispatch(deleteDocument(docId)).unwrap();
      toast.success('Document deleted successfully');
      // Close the preview panel if the deleted document was selected
      if (selectedDocument?.id === docId) {
        setSelectedDocument(null);
      }
      // Refresh the document list
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
          />,
          document.body
        )}

      {showFollowUpModal && selectedFollowUpId &&
        createPortal(
          <FollowUpModal
            followUpId={selectedFollowUpId}
            onClose={() => {
              setShowFollowUpModal(false);
              setSelectedFollowUpId(null);
            }}
            onUpdate={refreshSelectedDocument}
          />,
          document.body
        )}

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-[#1E3F20]">Bring Up Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading documents…' : `${totalCount} active document${totalCount !== 1 ? 's' : ''} with a bring-up window assignment`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1E3F20]" />
          </div>
        ) : totalCount === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">No documents currently have a bring-up deadline assigned.</p>
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
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1E3F20]" />
            <p className="text-sm text-stone-600 font-medium">Loading document details...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBringUp;