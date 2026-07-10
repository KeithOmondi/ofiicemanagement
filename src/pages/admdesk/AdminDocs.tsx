// src/pages/dept-head/AdminDocs.tsx

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchDocuments,
  createUploadDocument,
  deleteDocument,
  finalizeDraft,
  clearError,
  fetchDocumentById,
  respondToDocument,
  createMemo,
  createLetter,
  redirectDocumentToFolder,
  removeDocumentFromFolder,
} from '../../store/slices/documentSlice';
import { selectCurrentUser, fetchCurrentUser } from '../../store/slices/userSlice';
import {
  fetchUsers,
  selectAllUsers,
  selectUsersListLoading,
} from '../../store/slices/userSlice';
import {
  fetchRegistryEntries,
  selectAllRegistryEntries,
  selectRegistryListLoading,
  selectRegistryError,
  clearError as clearRegistryError,
} from '../../store/slices/registrySlice';
import { fetchActiveTemplate, fetchAllTemplates } from '../../store/slices/templatesSlice';
import {
  fetchRHCFolders,
  selectAllRHCFolders,
  selectRHCFoldersLoading,
  type RHCFolder,
} from '../../store/slices/rhcFoldersSlice';
import { GLOBAL_KEY, type TemplateType } from '../../types/templates.types';
import type {
  CreateUploadDocumentInput,
  DocumentType,
  Document as DocType,
  RefType,
  FinalizeDraftInput,
  DocumentFilters,
  RoutePriority,
  ComposeMemoInput,
  ComposeLetterInput,
} from '../../types/documents.types';
import type { RegistryEntry, RegistryStatus } from '../../types/registry.types';
import type { RootState } from '../../store/store';

// ─── Selectors ────────────────────────────────────────────────────────────────

const selectAllDocuments = (state: RootState): DocType[] => state.documents.documents;
const selectPagination = (state: RootState) => state.documents.pagination;
const selectDocLoading = (state: RootState): boolean => state.documents.loading;
const selectDocError = (state: RootState): string | null => state.documents.error;
const selectDeletingId = (state: RootState): string | undefined => state.documents.actionInProgress.deleting;
const selectFinalizingId = (state: RootState): string | undefined => state.documents.actionInProgress.finalizingDraft;
const selectTemplatesByDepartment = (state: RootState) => state.templates.byDepartment;
const selectAllTemplates = (state: RootState) => state.templates.all;
const selectIsCreatingMemo = (state: RootState) => state.documents.actionInProgress.creatingMemo || false;
const selectIsCreatingLetter = (state: RootState) => state.documents.actionInProgress.creatingLetter || false;

// ─── Constants ────────────────────────────────────────────────────────────────

const UPLOAD_TYPES: { value: Exclude<DocumentType, 'memo' | 'letter'>; label: string }[] = [
  { value: 'correspondence', label: 'Correspondence' },
];

const REF_TYPES: { value: RefType; label: string }[] = [
  { value: 'for_signature', label: 'For Signature' },
  { value: 'for_attention', label: 'For Attention' },
  { value: 'for_information', label: 'For Information' },
  { value: 'direction', label: 'Direction' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES: { value: RoutePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
];

const TYPE_BADGE: Record<DocumentType, string> = {
  memo: 'bg-blue-100 text-blue-700',
  letter: 'bg-indigo-100 text-indigo-700',
  judgment: 'bg-purple-100 text-purple-700',
  ruling: 'bg-pink-100 text-pink-700',
  order: 'bg-amber-100 text-amber-700',
  correspondence: 'bg-green-100 text-green-700',
  upload: 'bg-gray-100 text-gray-700',
  ticket: "text-purple-500",
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  uploaded: 'bg-blue-100 text-blue-700',
  pending_review: 'bg-yellow-100 text-yellow-700',
  marked: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-emerald-100 text-emerald-700',
  filed: 'bg-slate-100 text-slate-700',
};

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

const REGISTRY_STATUS_BADGE: Record<RegistryStatus, string> = {
  in_transit: 'bg-amber-100 text-amber-700',
  received: 'bg-cyan-100 text-cyan-700',
  filed: 'bg-emerald-100 text-emerald-700',
  returned: 'bg-slate-100 text-slate-700',
};

const REGISTRY_STATUS_LABEL: Record<RegistryStatus, string> = {
  in_transit: 'In Transit',
  received: 'Received',
  filed: 'Filed',
  returned: 'Returned',
};

const PAGE_SIZE = 10;
const JUDICIARY_CREST_SRC = '/JOB_LOGO.jpg';
const GOLD = '#C29B38';

const TEMPLATE_TYPE_LABEL: Record<TemplateType, string> = {
  memo: 'Memo',
  letter: 'Letter',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(date)
  );

const formatDateTime = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
};

const getFileExtension = (url: string | null): string => {
  if (!url) return '';
  const fileName = url.split('/').pop() || '';
  return fileName.split('.').pop()?.toLowerCase() || '';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Redirect Modal ──────────────────────────────────────────────────────────

interface RedirectModalProps {
  document: DocType;
  folders: RHCFolder[];
  loading: boolean;
  onClose: () => void;
  onRedirect: (folderId: string, note?: string) => void;
}

const RedirectModal: React.FC<RedirectModalProps> = ({
  document,
  folders,
  loading,
  onClose,
  onRedirect,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderId) {
      setError('Please select a folder');
      return;
    }
    onRedirect(selectedFolderId, note || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Redirect to Folder</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[260px]">{document.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Select Folder *
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => { setSelectedFolderId(e.target.value); setError(null); }}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select a folder...</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.ref_no} - {folder.name}
                  </option>
                ))}
              </select>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note about this redirection..."
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {document.folder_id && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <p className="text-xs text-amber-700">
                  ⚠️ This document is already in a folder. Redirecting will move it to the new folder.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFolderId}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading && <Spinner />}
              {loading ? 'Redirecting...' : 'Redirect to Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Remove from Folder Modal ────────────────────────────────────────────────

interface RemoveFromFolderModalProps {
  document: DocType;
  loading: boolean;
  onClose: () => void;
  onRemove: (note?: string) => void;
}

const RemoveFromFolderModal: React.FC<RemoveFromFolderModalProps> = ({
  document,
  loading,
  onClose,
  onRemove,
}) => {
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRemove(note || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Remove from Folder</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[260px]">{document.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2">
              <p className="text-xs text-yellow-700">
                ⚠️ This document will be removed from its current folder and will appear in the main document list.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note about removing this document from the folder..."
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition"
            >
              {loading && <Spinner />}
              {loading ? 'Removing...' : 'Remove from Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Sticky Note ──────────────────────────────────────────────────────────────

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

  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDateDisplay = (dateStr: string): string => {
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

  const showDateChip = bringUpDate && parseDate(bringUpDate) !== null;

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

// ─── Response Thread Panel ───────────────────────────────────────────────────

const ResponseThreadPanel: React.FC<{ document: DocType }> = ({ document: doc }) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const currentDocument = useAppSelector((state: RootState) => state.documents.currentDocument);
  const respondingId = useAppSelector((state: RootState) => state.documents.actionInProgress.responding);

  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    dispatch(fetchDocumentById(doc.id));
  }, [dispatch, doc.id]);

  const hasResponses = currentDocument?.id === doc.id ? (currentDocument.responses ?? []).length > 0 : false;

  const hasAutoExpanded = useRef(false);
  useEffect(() => {
    if (hasResponses && !hasAutoExpanded.current) {
      hasAutoExpanded.current = true;
      setIsExpanded(true);
    }
  }, [hasResponses]);

  const responses = currentDocument?.id === doc.id ? currentDocument.responses ?? [] : [];
  const isSubmitting = respondingId === doc.id;
  const canRespond = !!currentUser && doc.assigned_to === currentUser.id && doc.status !== 'filed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || isSubmitting) return;
    const result = await dispatch(
      respondToDocument({ id: doc.id, input: { note: note.trim() }, file: file ?? undefined })
    );
    if (respondToDocument.fulfilled.match(result)) {
      setNote('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Response added');
      dispatch(fetchDocuments({ page: 1, limit: PAGE_SIZE, for_my_action: true }));
    } else {
      toast.error((result.payload as string) ?? 'Failed to add response');
    }
  };

  const isAssignedToUser = doc.assigned_to === currentUser?.id;

  if (!hasResponses && !isAssignedToUser) return null;

  const showToggleButton = !hasResponses && isAssignedToUser;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Response Thread</h3>
          {hasResponses && (
            <span className="text-xs text-slate-400">
              ({responses.length} {responses.length === 1 ? 'reply' : 'replies'})
            </span>
          )}
        </div>
        {showToggleButton && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Hide Response
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Add Response
              </>
            )}
          </button>
        )}
      </div>

      {(isExpanded || hasResponses) && (
        <>
          {!hasResponses && isAssignedToUser && (
            <p className="text-sm text-slate-400 italic mb-3">
              No responses yet. If the Super Admin returned this for more information, your reply
              will appear here — numbered — instead of a new upload.
            </p>
          )}

          {hasResponses && (
            <ol className="space-y-3 mb-4">
              {responses.map((r) => (
                <li key={r.id} className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    {r.response_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-xs font-semibold text-slate-700">{r.responded_by_name}</span>
                      <span className="text-[11px] text-slate-400">{formatDateTime(r.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{r.note}</p>
                    {r.file_url && (
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {r.original_name || 'View attachment'}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {canRespond && (
            <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 p-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Add Response {responses.length > 0 ? `#${responses.length + 1}` : '#1'}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Type your response…"
                className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  {file ? file.name : 'Attach a file (optional)'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={!note.trim() || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {isSubmitting && <Spinner />}
                  {isSubmitting ? 'Sending…' : 'Send Response'}
                </button>
              </div>
            </form>
          )}

          {!canRespond && hasResponses && (
            <p className="text-xs text-slate-400">
              This document is not currently assigned to you.
            </p>
          )}
        </>
      )}
    </div>
  );
};

// ─── Document Preview Panel ──────────────────────────────────────────────────

interface DocumentPreviewPanelProps {
  document: DocType | null;
  onClose: () => void;
}

const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({ document, onClose }) => {
  if (!document) return null;

  const fileUrl = document.file_url;
  const ext = getFileExtension(fileUrl);
  const fileName = document.original_name || document.title;
  const isComposed = document.type === 'memo' || document.type === 'letter';

  const isPdf = document.mime_type === 'application/pdf' || ext === 'pdf';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-semibold text-slate-900 truncate max-w-md">
              {document.title}
            </span>
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
          </div>
          <div className="flex items-center gap-2">
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
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

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

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 max-h-[40vh] overflow-y-auto px-6 py-4">
          <ResponseThreadPanel document={document} />
        </div>
      </div>
    </div>
  );
};

// ─── Template Composer Modal ─────────────────────────────────────────────────

interface TemplateComposerModalProps {
  type: TemplateType;
  departmentId: string | null;
  onClose: () => void;
  onCreated: (doc: DocType) => void;
}

const TemplateComposerModal: React.FC<TemplateComposerModalProps> = ({
  type,
  departmentId,
  onClose,
  onCreated,
}) => {
  const dispatch = useAppDispatch();
  const templatesByDepartment = useAppSelector(selectTemplatesByDepartment);
  const allTemplates = useAppSelector(selectAllTemplates);
  const currentUser = useAppSelector(selectCurrentUser);
  const isCreating = useAppSelector(type === 'memo' ? selectIsCreatingMemo : selectIsCreatingLetter);

  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState(
    `${TEMPLATE_TYPE_LABEL[type]} — ${new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}`
  );

  const [toField, setToField] = useState('REGISTRAR, HIGH COURT / ORHC AIE HOLDER');
  const [fromField, setFromField] = useState('HIGH COURT SUPPORT OFFICE');
  const [refField, setRefField] = useState('');
  const [dateField, setDateField] = useState(
    new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())
  );
  const [subjectField, setSubjectField] = useState('');
  const [signatoryName, setSignatoryName] = useState(currentUser?.full_name ?? '');
  const [senderTitleField, setSenderTitleField] = useState('Registrar, High Court');

  const [memoSignatoryName, setMemoSignatoryName] = useState('Hon. Clara Otieno-Omondi');

  const [ccField, setCcField] = useState('');
  const [enclosuresField, setEnclosuresField] = useState('');

  const [footerImageUrl, setFooterImageUrl] = useState<string | null>(null);
  const [footerText, setFooterText] = useState<string>('');

  const editorRef = useRef<HTMLDivElement>(null);

  const editableLineClasses =
    'flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none';

  const templatesByDepartmentRef = useRef(templatesByDepartment);
  const allTemplatesRef = useRef(allTemplates);

  useEffect(() => {
    templatesByDepartmentRef.current = templatesByDepartment;
    allTemplatesRef.current = allTemplates;
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingTemplate(true);
      setLoadError(null);

      try {
        const key = departmentId ?? GLOBAL_KEY;
        let template = templatesByDepartmentRef.current[key]?.[type];

        if (!template && departmentId) {
          const deptTemplates = allTemplatesRef.current.filter(
            (t) => t.department_id === departmentId && t.type === type
          );
          if (deptTemplates.length > 0) {
            template = [...deptTemplates].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
          }
        }

        if (!template) {
          const result = await dispatch(fetchActiveTemplate({ departmentId, type }));
          if (fetchActiveTemplate.fulfilled.match(result) && result.payload.template) {
            template = result.payload.template;
          }
        }

        if (!cancelled) {
          setFooterImageUrl(template?.footer_image_url ?? null);
          setFooterText(template?.footer_text ?? '');
        }
      } catch (error) {
        console.error('[TemplateComposerModal] Failed to resolve template footer:', error);
        if (!cancelled) setLoadError("Couldn't load the department's footer — continuing without it.");
      } finally {
        if (!cancelled) setLoadingTemplate(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [type, departmentId, dispatch]);

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    window.document.execCommand(command, false, value);
  };

  const getInitials = (fullName?: string | null): string => {
    if (!fullName) return '';
    return fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .join('')
      .toUpperCase();
  };

  const memoRhcCode = `RHC/${getInitials(currentUser?.full_name) || '—'}`;

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error('Please give this document a title');
      return;
    }

    const bodyHtml = editorRef.current?.innerHTML ?? '';
    if (!bodyHtml.trim()) {
      toast.error('Please write some content in the body');
      return;
    }

    let result;
    if (type === 'memo') {
      const payload: ComposeMemoInput = {
        title: title.trim(),
        to: toField.trim(),
        date: new Date(dateField).toISOString(),
        body: bodyHtml,
        from: fromField.trim(),
        signatureTitle: fromField.trim(),
        department_id: departmentId ?? undefined,
        reference_no: refField.trim() || undefined,
      };
      result = await dispatch(createMemo(payload));
    } else {
      const payload: ComposeLetterInput = {
        title: title.trim(),
        to: toField.trim(),
        date: new Date(dateField).toISOString(),
        body: bodyHtml,
        from: signatoryName.trim(),
        signatureTitle: senderTitleField.trim(),
        department_id: departmentId ?? undefined,
        reference_no: refField.trim() || undefined,
        cc: ccField.trim() || undefined,
        enclosures: enclosuresField.trim() || undefined,
      };
      result = await dispatch(createLetter(payload));
    }

    if (createMemo.fulfilled.match(result) || createLetter.fulfilled.match(result)) {
      toast.success(`${TEMPLATE_TYPE_LABEL[type]} saved as draft`);
      onCreated(result.payload as DocType);
    } else {
      toast.error((result.payload as string) ?? 'Failed to save document');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50 shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              New {TEMPLATE_TYPE_LABEL[type]}
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="Document title (internal reference, not printed on the document)"
            />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loadingTemplate ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
            <Spinner size="md" />
            <p className="text-sm text-slate-400">Loading department letterhead…</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 flex-shrink-0">
              {([
                { label: 'B', command: 'bold', cls: 'font-extrabold' },
                { label: 'I', command: 'italic', cls: 'italic' },
                { label: 'U', command: 'underline', cls: 'underline' },
              ] as const).map(({ label, command, cls }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => exec(command)}
                  className={`w-6 h-6 rounded text-xs text-white/80 hover:bg-white/10 transition-colors ${cls}`}
                >
                  {label}
                </button>
              ))}
              <div className="w-px h-4 bg-white/20 mx-1" />
              <button type="button" onClick={() => exec('insertUnorderedList')} className="px-1.5 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors">
                • List
              </button>
              <button type="button" onClick={() => exec('insertOrderedList')} className="px-1.5 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors">
                1. List
              </button>
              <span className="ml-auto text-[10px] text-white/40">Formats the body only — header/footer are fixed</span>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 py-6 px-4 sm:px-6">
              <div
                className="mx-auto max-w-[794px] bg-white shadow-sm rounded-sm px-8 py-10 sm:px-16 sm:py-14 text-sm text-black"
                style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
              >
                {loadError && (
                  <p className="mb-4 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                    {loadError}
                  </p>
                )}

                {type === 'memo' ? (
                  <>
                    <div className="flex justify-center mb-3">
                      <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-[78px] w-auto object-contain" />
                    </div>
                    <div className="text-center mt-4 mb-2">
                      <p className="text-[19px] font-bold uppercase leading-snug">
                        OFFICE OF THE REGISTRAR HIGH COURT<br />INTERNAL MEMO
                      </p>
                    </div>
                    <div className="border-t-[2.5px] border-black mb-2.5" />
                    <div className="mt-2">
                      {[
                        { label: 'TO', value: toField, set: setToField, upper: true },
                        { label: 'FROM', value: fromField, set: setFromField, upper: true },
                        { label: 'REF', value: refField, set: setRefField, upper: false, placeholder: 'RHC/AIE/___' },
                        { label: 'DATE', value: dateField, set: setDateField, upper: false },
                        { label: 'SUBJECT', value: subjectField, set: setSubjectField, upper: true, placeholder: 'Subject of this memo' },
                      ].map(({ label, value, set, upper, placeholder }) => (
                        <div key={label} className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
                          <span className="w-24 shrink-0 uppercase">{label}</span>
                          <span className="w-5 shrink-0">:</span>
                          <input
                            value={value}
                            onChange={(e) => set(e.target.value)}
                            placeholder={placeholder}
                            className={`${editableLineClasses} ${upper ? 'uppercase' : ''}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="border-t-[2.5px] border-black mt-3 mb-10" />
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="Start typing the body of the memo…"
                      className="min-h-[260px] text-[13.5px] leading-[1.8] text-justify focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300 empty:before:italic empty:before:pointer-events-none"
                    />

                    <div className="mt-10">
                      <input
                        value={memoSignatoryName}
                        onChange={(e) => setMemoSignatoryName(e.target.value)}
                        placeholder="Signatory name"
                        className={`${editableLineClasses} block text-[13.5px] font-bold uppercase`}
                      />
                    </div>

                    <div className="mt-2">
                      <input
                        value={fromField}
                        onChange={(e) => setFromField(e.target.value)}
                        className={`${editableLineClasses} block text-[13.5px] font-bold underline uppercase`}
                      />
                      <p className="text-[12px] font-semibold text-stone-600 mt-0.5">
                        {memoRhcCode}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center mb-1">
                      <div className="flex-shrink-0 mr-4">
                        <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="w-[70px] h-auto object-contain" />
                      </div>
                      <div>
                        <p className="text-[18px] font-bold leading-tight">THE JUDICIARY</p>
                        <p className="text-[14px] font-bold uppercase leading-tight mt-0.5">
                          OFFICE OF THE REGISTRAR HIGH COURT
                        </p>
                      </div>
                    </div>
                    <div className="border-t-[1.5px] mb-7" style={{ borderColor: GOLD }} />
                    <div className="flex justify-between text-[13px] font-bold mb-7">
                      <span className="flex items-baseline gap-1">
                        Ref:
                        <input
                          value={refField}
                          onChange={(e) => setRefField(e.target.value)}
                          placeholder="RHC/___"
                          className={editableLineClasses}
                        />
                      </span>
                      <input
                        value={dateField}
                        onChange={(e) => setDateField(e.target.value)}
                        className={`${editableLineClasses} text-right`}
                      />
                    </div>
                    <div className="min-h-[340px] text-[13px] leading-[1.8] text-justify">
                      <div className="mb-4">
                        <textarea
                          value={toField}
                          onChange={(e) => setToField(e.target.value)}
                          placeholder="Recipient address block, e.g.\nThe Registrar,\nHigh Court of Kenya"
                          rows={3}
                          className="w-full resize-none bg-transparent border-0 focus:outline-none placeholder:text-stone-300 placeholder:italic"
                        />
                      </div>
                      <div className="mb-4">
                        <span className="font-bold underline">RE: </span>
                        <input
                          value={subjectField}
                          onChange={(e) => setSubjectField(e.target.value)}
                          placeholder="Subject of this letter"
                          className={`${editableLineClasses} font-bold underline`}
                        />
                      </div>
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder="Start typing the body of the letter…"
                        className="min-h-[220px] focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300 empty:before:italic empty:before:pointer-events-none"
                      />
                    </div>
                    <div className="mt-12">
                      <input
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        placeholder="Signatory name"
                        className={`${editableLineClasses} block text-[13px] font-bold uppercase`}
                      />
                      <input
                        value={senderTitleField}
                        onChange={(e) => setSenderTitleField(e.target.value)}
                        placeholder="Title, e.g. Registrar, High Court"
                        className={`${editableLineClasses} block text-[13px] font-bold underline uppercase mt-0.5`}
                      />
                    </div>
                    <div className="mt-8 space-y-2 border-t border-stone-300 pt-4">
                      <div className="flex">
                        <span className="w-24 shrink-0 font-bold text-xs">CC</span>
                        <span className="w-4 shrink-0 text-xs">:</span>
                        <input
                          value={ccField}
                          onChange={(e) => setCcField(e.target.value)}
                          placeholder="Carbon copy recipients"
                          className={`${editableLineClasses} text-xs`}
                        />
                      </div>
                      <div className="flex">
                        <span className="w-24 shrink-0 font-bold text-xs">Enclosures</span>
                        <span className="w-4 shrink-0 text-xs">:</span>
                        <input
                          value={enclosuresField}
                          onChange={(e) => setEnclosuresField(e.target.value)}
                          placeholder="List enclosures, e.g. 1. Affidavit"
                          className={`${editableLineClasses} text-xs`}
                        />
                      </div>
                    </div>
                  </>
                )}

                {(footerImageUrl || footerText) && (
                  <div className="mt-12 pt-3 border-t border-stone-300 flex items-center gap-3">
                    {footerImageUrl && (
                      <img src={footerImageUrl} alt="" className="h-10 w-auto object-contain" />
                    )}
                    {footerText && (
                      <p className="text-[10px] leading-tight text-stone-700 whitespace-pre-wrap">{footerText}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isCreating || loadingTemplate}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {isCreating && <Spinner />}
            {isCreating ? 'Saving…' : 'Save Draft & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onSubmit: (payload: { file: File; metadata: CreateUploadDocumentInput }) => void;
  loading: boolean;
  departmentId?: string | null;
}

const UploadModal = ({ onClose, onSubmit, loading, departmentId }: UploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [type] = useState<Exclude<DocumentType, 'memo' | 'letter'>>('correspondence');
  const [priority, setPriority] = useState<RoutePriority>('normal');
  const [refType, setRefType] = useState<RefType>('for_attention');
  const [refOtherDescription, setRefOtherDescription] = useState('');
  const [title, setTitle] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!file) next.file = 'Please select a file to upload';
    if (!title.trim()) next.title = 'Title is required';
    if (title.trim().length > 200) next.title = 'Title cannot exceed 200 characters';
    if (refType === 'other' && !refOtherDescription.trim()) {
      next.refOtherDescription = 'Please describe the action required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !file) return;
    onSubmit({
      file,
      metadata: {
        title: title.trim(),
        type,
        ref_type: refType,
        ref_other_description: refType === 'other' ? refOtherDescription.trim() : undefined,
        priority,
        is_draft: true,
        department_id: departmentId || undefined,
      },
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg my-8 rounded-xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Upload Document</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Saved as a draft first — you'll choose who to mark it to next.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">File *</label>
              <div
                className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                  errors.file ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:border-blue-400'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-slate-500">Click or drag to upload</p>
                    <p className="text-xs text-slate-400">PDF, DOCX, XLSX, JPG, PNG, MP4, MP3 — max 25 MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.mp4,.mp3"
                  onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                />
              </div>
              {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Document Type *</label>
              <select
                value={type}
                disabled
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 cursor-not-allowed"
              >
                {UPLOAD_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Action Required *</label>
              <select
                value={refType}
                onChange={(e) => setRefType(e.target.value as RefType)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REF_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {refType === 'other' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={refOtherDescription}
                    onChange={(e) => setRefOtherDescription(e.target.value)}
                    placeholder="Describe the action required…"
                    className={`w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.refOtherDescription ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                  {errors.refOtherDescription && (
                    <p className="text-xs text-red-500 mt-1">{errors.refOtherDescription}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Urgency *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RoutePriority)}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Title / Description *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the document…"
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading && <Spinner />}
              Save as Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Mark / Finalize Draft Modal ──────────────────────────────────────────────

type FinalizeMode = 'user' | 'admin';

interface FinalizeDraftModalProps {
  document: DocType;
  onClose: () => void;
  onSubmit: (input: FinalizeDraftInput) => void;
  loading: boolean;
}

const FinalizeDraftModal: React.FC<FinalizeDraftModalProps> = ({
  document,
  onClose,
  onSubmit,
  loading,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const teamMembers = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [mode, setMode] = useState<FinalizeMode>('user');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.department_id) return;
    dispatch(fetchUsers({
      is_active: true,
      department_id: currentUser.department_id,
      limit: 100,
      sort_by: 'full_name',
      sort_order: 'ASC',
    }));
  }, [dispatch, currentUser?.department_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'user') {
      if (!userId) { setError('Please select a user to mark this document to'); return; }
      onSubmit({ assigned_to: userId });
    } else {
      onSubmit({ send_to_super_admin: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Mark Document</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[260px]">{document.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(['user', 'admin'] as FinalizeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); }}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    mode === m
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m === 'user' ? 'Mark to a User' : 'Send to Super Admin'}
                </button>
              ))}
            </div>

            {mode === 'user' && (
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Assign to *</label>
                <select
                  value={userId}
                  onChange={(e) => { setUserId(e.target.value); setError(null); }}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  disabled={usersLoading}
                >
                  <option value="">
                    {usersLoading
                      ? 'Loading team members…'
                      : teamMembers.length === 0
                        ? 'No active users in your department'
                        : '— Select a user —'}
                  </option>
                  {teamMembers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} — {u.pj_number}</option>
                  ))}
                </select>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>
            )}

            {mode === 'admin' && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                This document will be sent directly to the Super Admin for review and e-signature.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Later
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading && <Spinner />}
              {mode === 'user' ? 'Mark to User' : 'Send to Super Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminDocs = () => {
  console.log('[AdminDocs] Component mounted');
  
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const documents = useAppSelector(selectAllDocuments);
  const pagination = useAppSelector(selectPagination);
  const loading = useAppSelector(selectDocLoading);
  const error = useAppSelector(selectDocError);
  const deletingId = useAppSelector(selectDeletingId);
  const finalizingId = useAppSelector(selectFinalizingId);

  const registryEntries = useAppSelector(selectAllRegistryEntries);
  const registryLoading = useAppSelector(selectRegistryListLoading);
  const registryError = useAppSelector(selectRegistryError);

  // Folder state
  const folders = useAppSelector(selectAllRHCFolders);
  const foldersLoading = useAppSelector(selectRHCFoldersLoading);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<DocType | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<DocType | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');

  const [composerType, setComposerType] = useState<TemplateType | null>(null);

  // Redirect modal state
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<DocType | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // Remove from folder modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<DocType | null>(null);
  const [removing, setRemoving] = useState(false);

  const searchRef = useRef('');
  const typeFilterRef = useRef<DocumentType | ''>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log('[AdminDocs] Checking for current user');
    if (!currentUser) {
      console.log('[AdminDocs] No current user, fetching...');
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    console.log('[AdminDocs] Fetching all templates...');
    dispatch(fetchAllTemplates());
  }, [dispatch]);

  useEffect(() => {
    console.log('[AdminDocs] Fetching folders...');
    dispatch(fetchRHCFolders({ status: 'active', include_sub_folders: true }));
  }, [dispatch]);

  const departmentId = currentUser?.department_id ?? null;

  const triggerFetch = useCallback((p: number) => {
    console.log(`[AdminDocs] triggerFetch page: ${p}`);
    const params: DocumentFilters = {
      page: p,
      limit: PAGE_SIZE,
      for_my_action: true,
    };
    if (searchRef.current) params.search = searchRef.current;
    if (typeFilterRef.current) params.type = typeFilterRef.current;
    if (departmentId) params.department_id = departmentId;

    dispatch(fetchDocuments(params));
  }, [dispatch, departmentId]);

  useEffect(() => {
    if (!currentUser || !currentUser.department_id) {
      console.log('[AdminDocs] Skipping document fetch - no current user or department');
      return;
    }
    console.log(`[AdminDocs] Initial document fetch for page: ${page}`);
    triggerFetch(page);
  }, [page, currentUser, triggerFetch]);

  useEffect(() => {
    console.log('[AdminDocs] Fetching registry entries...');
    dispatch(fetchRegistryEntries({ limit: 200, sort_by: 'routed_at', sort_order: 'DESC' }));
  }, [dispatch]);

  useEffect(() => {
    if (error) { 
      console.error('[AdminDocs] Document error:', error);
      toast.error(error); 
      dispatch(clearError()); 
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (registryError) { 
      console.error('[AdminDocs] Registry error:', registryError);
      toast.error(registryError); 
      dispatch(clearRegistryError()); 
    }
  }, [registryError, dispatch]);

  const activeRegistryByDoc = useMemo(() => {
    const map = new Map<string, RegistryEntry>();
    registryEntries.forEach((entry) => {
      if (entry.is_active) map.set(entry.document_id, entry);
    });
    return map;
  }, [registryEntries]);

  // ── Folder Handlers ─────────────────────────────────────────────────────

  const handleRedirectClick = (doc: DocType) => {
    setRedirectTarget(doc);
    setShowRedirectModal(true);
  };

  const handleRedirectSubmit = async (folderId: string, note?: string) => {
    if (!redirectTarget) return;
    setRedirecting(true);
    try {
      await dispatch(redirectDocumentToFolder({
        id: redirectTarget.id,
        folder_id: folderId,
        note,
      })).unwrap();
      toast.success('Document redirected to folder successfully');
      setShowRedirectModal(false);
      setRedirectTarget(null);
      await triggerFetch(page);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to redirect document');
    } finally {
      setRedirecting(false);
    }
  };

  const handleRemoveClick = (doc: DocType) => {
    setRemoveTarget(doc);
    setShowRemoveModal(true);
  };

  const handleRemoveSubmit = async (note?: string) => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await dispatch(removeDocumentFromFolder({
        id: removeTarget.id,
        note,
      })).unwrap();
      toast.success('Document removed from folder successfully');
      setShowRemoveModal(false);
      setRemoveTarget(null);
      await triggerFetch(page);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to remove document from folder');
    } finally {
      setRemoving(false);
    }
  };

  // ── Other Handlers ─────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    console.log(`[AdminDocs] Search changed: "${value}"`);
    setSearch(value);
    searchRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { 
      setPage(1); 
      triggerFetch(1); 
    }, 400);
  };

  const handleTypeFilterChange = (value: DocumentType | '') => {
    console.log(`[AdminDocs] Type filter changed: "${value}"`);
    setTypeFilter(value);
    typeFilterRef.current = value;
    setPage(1);
    triggerFetch(1);
  };

  const handleUpload = async (payload: { file: File; metadata: CreateUploadDocumentInput }) => {
    console.log('[AdminDocs] handleUpload called');
    setUploading(true);
    try {
      const created = await dispatch(
        createUploadDocument({ input: payload.metadata, file: payload.file })
      ).unwrap();
      console.log('[AdminDocs] Upload successful:', created);
      toast.success('Document saved as draft');
      setShowUploadModal(false);
      await triggerFetch(page);
      setFinalizeTarget(created);
    } catch (err) {
      console.error('[AdminDocs] Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFinalizeDraft = async (input: FinalizeDraftInput) => {
    if (!finalizeTarget) return;
    console.log('[AdminDocs] Finalizing draft:', finalizeTarget.id);
    try {
      await dispatch(finalizeDraft({ id: finalizeTarget.id, input })).unwrap();
      toast.success(input.send_to_super_admin ? 'Document sent to Super Admin' : 'Document marked to user');
      setFinalizeTarget(null);
      await triggerFetch(page);
    } catch (err) {
      console.error('[AdminDocs] Finalize failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    console.log(`[AdminDocs] Delete document: ${id}`);
    if (!window.confirm('Delete this document? This action cannot be undone.')) return;
    try {
      await dispatch(deleteDocument(id)).unwrap();
      toast.success('Document deleted');
      if (selectedDocument?.id === id) setSelectedDocument(null);
      const targetPage = documents.length === 1 && page > 1 ? page - 1 : page;
      setPage(targetPage);
      if (targetPage === page) await triggerFetch(page);
    } catch (err) {
      console.error('[AdminDocs] Delete failed:', err);
    }
  };

  const handlePreview = (doc: DocType) => {
    console.log(`[AdminDocs] Previewing document: ${doc.id}`);
    setSelectedDocument(doc);
  };

  const handleTemplateCreated = async (doc: DocType) => {
    console.log(`[AdminDocs] Template created: ${doc.id}`);
    setComposerType(null);
    await triggerFetch(page);
    setFinalizeTarget(doc);
  };

  const filteredDocuments = useMemo(() => {
    if (!currentUser) return documents;

    return documents.filter(doc => {
      if (doc.assigned_to === currentUser.id) return true;
      if (doc.is_draft && doc.created_by === currentUser.id) return true;
      if (doc.created_by === currentUser.id && !doc.is_draft) return true;
      if ((doc.type === 'memo' || doc.type === 'letter') && doc.status === 'pending_review' && doc.assigned_to === currentUser.id) return true;
      return false;
    });
  }, [documents, currentUser]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {selectedDocument && (
        <DocumentPreviewPanel
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleUpload}
          loading={uploading}
          departmentId={departmentId}
        />
      )}

      {finalizeTarget && (
        <FinalizeDraftModal
          document={finalizeTarget}
          onClose={() => setFinalizeTarget(null)}
          onSubmit={handleFinalizeDraft}
          loading={finalizingId === finalizeTarget.id}
        />
      )}

      {composerType && (
        <TemplateComposerModal
          type={composerType}
          departmentId={departmentId}
          onClose={() => setComposerType(null)}
          onCreated={handleTemplateCreated}
        />
      )}

      {/* Redirect Modal */}
     // In AdminDocs.tsx, update the loading prop for RedirectModal

{showRedirectModal && redirectTarget && (
  <RedirectModal
    document={redirectTarget}
    folders={folders}
    loading={redirecting || foldersLoading.fetch}  // ✅ Use foldersLoading.fetch instead of foldersLoading
    onClose={() => {
      setShowRedirectModal(false);
      setRedirectTarget(null);
    }}
    onRedirect={handleRedirectSubmit}
  />
)}

      {/* Remove from Folder Modal */}
      {showRemoveModal && removeTarget && (
        <RemoveFromFolderModal
          document={removeTarget}
          loading={removing}
          onClose={() => {
            setShowRemoveModal(false);
            setRemoveTarget(null);
          }}
          onRemove={handleRemoveSubmit}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Document Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination
                ? `${pagination.total} document${pagination.total !== 1 ? 's' : ''}`
                : 'Loading…'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                console.log('[AdminDocs] New Memo clicked');
                setComposerType('memo');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#7A4E0D] bg-[#F5C24C] border border-[#E8A840] rounded-lg hover:bg-[#f0bb40] transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              New Memo
            </button>

            <button
              onClick={() => {
                console.log('[AdminDocs] New Letter clicked');
                setComposerType('letter');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              New Letter
            </button>

            <button
              onClick={() => {
                console.log('[AdminDocs] Upload Document clicked');
                setShowUploadModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Document
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by title…"
                className="pl-9 pr-3 py-2 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value as DocumentType | '')}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {UPLOAD_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Title', 'Type', 'Urgency', 'Status', 'Marked To', 'Routed To', 'Uploaded', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${
                        h === 'Actions' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex justify-center"><Spinner size="md" /></div>
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400 text-sm">
                      No documents found
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const activeMark = doc.active_mark;
                    const isMarked = doc.status === 'marked' || doc.status === 'in_progress';
                    const markedToDept = activeMark?.marked_to_dept_name || '—';
                    const assignedTo = activeMark?.assigned_to_name || '—';
                    const activeRegistry = activeRegistryByDoc.get(doc.id);
                    const needsMyResponse =
                      currentUser && doc.assigned_to === currentUser.id && doc.status === 'pending_review' && !doc.is_draft;

                    return (
                      <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-[200px]" title={doc.title}>
                          {doc.title}
                          {doc.folder_id && (
                            <span className="ml-2 inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                              Folder
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[doc.type] ?? 'bg-slate-100 text-slate-700'}`}>
                            {doc.type}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <PriorityBadge priority={doc.priority ?? 'normal'} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status] ?? 'bg-gray-100 text-gray-700'}`}>
                              {doc.is_draft ? 'draft' : doc.status.replace(/_/g, ' ')}
                            </span>
                            {needsMyResponse && (
                              <span
                                className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700"
                                title="Returned to you — a response is needed"
                              >
                                Needs response
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {isMarked && activeMark ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-slate-700">{markedToDept}</span>
                              {assignedTo !== '—' && (
                                <span className="text-[10px] text-slate-400">Assigned to: {assignedTo}</span>
                              )}
                              {activeMark.instructions && (
                                <span
                                  className="text-[10px] text-slate-500 italic truncate max-w-[150px]"
                                  title={activeMark.instructions}
                                >
                                  "{activeMark.instructions}"
                                </span>
                              )}
                            </div>
                          ) : doc.is_draft ? (
                            <button
                              onClick={() => setFinalizeTarget(doc)}
                              className="text-xs text-amber-600 font-medium underline decoration-dotted hover:text-amber-700 transition"
                            >
                              Not marked yet — click to mark
                            </button>
                          ) : doc.assigned_to_name ? (
                            <span className="text-xs font-medium text-slate-700">{doc.assigned_to_name}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {registryLoading && !activeRegistry ? (
                            <span className="text-xs text-slate-300">…</span>
                          ) : activeRegistry ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-slate-700">
                                {activeRegistry.station_name}
                              </span>
                              <span className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[10px] font-medium ${REGISTRY_STATUS_BADGE[activeRegistry.status]}`}>
                                {REGISTRY_STATUS_LABEL[activeRegistry.status]}
                              </span>
                              {activeRegistry.note && (
                                <span
                                  className="text-[10px] text-slate-500 italic truncate max-w-[150px]"
                                  title={activeRegistry.note}
                                >
                                  "{activeRegistry.note}"
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {formatDate(doc.created_at)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {doc.is_draft && (
                              <button
                                onClick={() => setFinalizeTarget(doc)}
                                title="Mark document"
                                className="p-1.5 text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md transition"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                              </button>
                            )}

                            <button
                              onClick={() => handlePreview(doc)}
                              title={needsMyResponse ? 'Open — a response is needed' : 'Preview / open thread'}
                              className={`p-1.5 rounded-md transition ${
                                needsMyResponse
                                  ? 'text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100'
                                  : 'text-slate-400 hover:text-blue-600'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Redirect to Folder Button */}
                            <button
                              onClick={() => handleRedirectClick(doc)}
                              title="Redirect to folder"
                              className="p-1.5 text-blue-400 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M12 12l3 3m0 0l-3-3m3 3V9" />
                              </svg>
                            </button>

                            {/* Remove from Folder Button */}
                            {doc.folder_id && (
                              <button
                                onClick={() => handleRemoveClick(doc)}
                                title="Remove from folder"
                                className="p-1.5 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 12l3 3m0 0l-3-3m3 3V9" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 15l6-6" />
                                </svg>
                              </button>
                            )}

                            <button
                              disabled={deletingId === doc.id}
                              onClick={() => handleDelete(doc.id)}
                              title="Delete document"
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {deletingId === doc.id ? (
                                <Spinner />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                Showing{' '}
                {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                of {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-xs text-slate-600 px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDocs;