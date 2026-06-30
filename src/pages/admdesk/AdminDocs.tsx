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
import type {
  CreateUploadDocumentInput,
  DocumentType,
  Document as DocType,
  RefType,
  FinalizeDraftInput,
  DocumentFilters,
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

const TYPE_BADGE: Record<DocumentType, string> = {
  memo: 'bg-blue-100 text-blue-700',
  letter: 'bg-indigo-100 text-indigo-700',
  judgment: 'bg-purple-100 text-purple-700',
  ruling: 'bg-pink-100 text-pink-700',
  order: 'bg-amber-100 text-amber-700',
  correspondence: 'bg-green-100 text-green-700',
  upload: 'bg-gray-100 text-gray-700',
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

// Registry (station-routing) status — distinct lifecycle from document status above
const REGISTRY_STATUS_BADGE: Record<RegistryStatus, string> = {
  in_transit: 'bg-amber-100 text-amber-700',
  received:   'bg-cyan-100 text-cyan-700',
  filed:      'bg-emerald-100 text-emerald-700',
  returned:   'bg-slate-100 text-slate-700',
};

const REGISTRY_STATUS_LABEL: Record<RegistryStatus, string> = {
  in_transit: 'In Transit',
  received:   'Received',
  filed:      'Filed',
  returned:   'Returned',
};

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(date)
  );

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

  const renderPreview = () => {
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

    // ── PDF preview ──────────────────────────────────────────────────────────
    if (ext === 'pdf') {
      return (
        <iframe
          src={`${fileUrl}#toolbar=0`}
          title={document.title}
          className="w-full h-full min-h-[600px] border-0 rounded-sm"
        />
      );
    }

    // ── Image preview ──────────────────────────────────────────────────────
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

    // ── Text files ──────────────────────────────────────────────────────────
    if (['txt', 'csv', 'log', 'xml', 'json', 'md', 'html', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp'].includes(ext)) {
      return (
        <div className="flex flex-col h-full min-h-[400px]">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600">{fileName}</span>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Open in new tab
            </a>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-white">
            <iframe
              src={fileUrl}
              title={document.title}
              className="w-full h-full border-0 rounded-sm"
            />
          </div>
        </div>
      );
    }

    // ── Video files ─────────────────────────────────────────────────────────
    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv'].includes(ext)) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px] p-8">
          <video
            controls
            className="max-w-full max-h-[calc(100vh-300px)] rounded shadow-sm"
          >
            <source src={fileUrl} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // ── Audio files ─────────────────────────────────────────────────────────
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
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Open in new tab
          </a>
        </div>
      );
    }

    // ── Office documents (DOCX, XLSX, PPTX) ──────────────────────────────
    if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
      const officeViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      return (
        <div className="flex flex-col h-full min-h-[400px]">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600">{fileName}</span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400">Powered by Google Docs Viewer</span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Open in new tab
              </a>
            </div>
          </div>
          <iframe
            src={officeViewerUrl}
            title={document.title}
            className="w-full flex-1 border-0 rounded-sm"
          />
        </div>
      );
    }

    // ── Fallback for other file types ─────────────────────────────────────
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
            This file type <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">.{ext || 'unknown'}</span> cannot be previewed directly in the browser.
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
        {/* Header */}
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
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-hidden bg-slate-100">
          {renderPreview()}
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
  departmentId?: string | null; // ✅ Added departmentId prop
}

const UploadModal = ({ onClose, onSubmit, loading, departmentId }: UploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [type] = useState<Exclude<DocumentType, 'memo' | 'letter'>>('correspondence');
  const [referenceNo, setReferenceNo] = useState('');
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
    if (referenceNo && referenceNo.length > 50) next.referenceNo = 'Reference number too long';
    if (refType === 'other' && !refOtherDescription.trim()) {
      next.refOtherDescription = 'Please describe the action required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !file) return;

    // ✅ Include department_id in metadata
    onSubmit({
      file,
      metadata: {
        title: title.trim(),
        type,
        reference_no: referenceNo.trim() || undefined,
        ref_type: refType,
        ref_other_description: refType === 'other' ? refOtherDescription.trim() : undefined,
        is_draft: true,
        department_id: departmentId || undefined, // ✅ Critical fix
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

            {/* Drop zone */}
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

            {/* Type — locked to correspondence for dept heads */}
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

            {/* Action required (ref_type) */}
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

            {/* Reference number */}
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Reference No.</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g., HCT-00-CR-SC-0045-2024"
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.referenceNo && <p className="text-xs text-red-500 mt-1">{errors.referenceNo}</p>}
            </div>

            {/* Title */}
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

const FinalizeDraftModal: React.FC<FinalizeDraftModalProps> = ({ document, onClose, onSubmit, loading }) => {
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
      if (!userId) {
        setError('Please select a user to mark this document to');
        return;
      }
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
              <button
                type="button"
                onClick={() => { setMode('user'); setError(null); }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  mode === 'user'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Mark to a User
              </button>
              <button
                type="button"
                onClick={() => { setMode('admin'); setError(null); }}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  mode === 'admin'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Send to Super Admin
              </button>
            </div>

            {mode === 'user' && (
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Assign to *
                </label>
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
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const documents = useAppSelector(selectAllDocuments);
  const pagination = useAppSelector(selectPagination);
  const loading = useAppSelector(selectDocLoading);
  const error = useAppSelector(selectDocError);
  const deletingId = useAppSelector(selectDeletingId);
  const finalizingId = useAppSelector(selectFinalizingId);

  // ── Registry (station-routing) state ──
  const registryEntries = useAppSelector(selectAllRegistryEntries);
  const registryLoading = useAppSelector(selectRegistryListLoading);
  const registryError = useAppSelector(selectRegistryError);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);

  // ── Preview state ─────────────────────────────────────────────────────────
  const [selectedDocument, setSelectedDocument] = useState<DocType | null>(null);

  // ── Finalize / Mark draft state ──────────────────────────────────────────
  const [finalizeTarget, setFinalizeTarget] = useState<DocType | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');
  const searchRef = useRef('');
  const typeFilterRef = useRef<DocumentType | ''>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Ensure currentUser is loaded ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser]);

  // ── departmentId derived directly from currentUser (no stale ref) ───────
  const departmentId = currentUser?.department_id ?? null;

  // ── triggerFetch now closes over departmentId directly, so it can never
  //    fire with a stale/undefined department from a ref that hasn't caught
  //    up yet. Including departmentId in the deps means this function
  //    identity changes whenever the department resolves or changes,
  //    which the effect below reacts to. ────────────────────────────────
  const triggerFetch = useCallback((p: number) => {
    const params: DocumentFilters = {
      page: p,
      limit: PAGE_SIZE,
    };

    if (searchRef.current) params.search = searchRef.current;
    if (typeFilterRef.current) params.type = typeFilterRef.current;

    // Only add department_id filter if we have one. This ensures
    // documents without department_id (like drafts) are still shown.
    if (departmentId) {
      params.department_id = departmentId;
    }

    dispatch(fetchDocuments(params));
  }, [dispatch, departmentId]);

  // ✅ Fetch documents when page changes — but only once currentUser has
  //    resolved. On a hard refresh, currentUser starts out null while
  //    fetchCurrentUser() is in flight; firing the documents fetch before
  //    that resolves means departmentId is wrongly treated as "none" (or,
  //    if currentUser happened to already be in the store, treated as set)
  //    depending on timing — that race is exactly what was causing the
  //    inconsistent document count after refresh. Waiting for currentUser
  //    removes the race, and re-running when departmentId changes (via
  //    triggerFetch's identity) ensures we re-fetch with the correct
  //    filter as soon as it's known.
  useEffect(() => {
    if (!currentUser) return;
    triggerFetch(page);
  }, [page, currentUser, triggerFetch]);

  // Registry entries fetch
  useEffect(() => {
    dispatch(fetchRegistryEntries({ limit: 200, sort_by: 'routed_at', sort_order: 'DESC' }));
  }, [dispatch]);

  // ── Error toasts ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (registryError) {
      toast.error(registryError);
      dispatch(clearRegistryError());
    }
  }, [registryError, dispatch]);

  // ── Active registry entry per document ──────────────────────────────────
  const activeRegistryByDoc = useMemo(() => {
    const map = new Map<string, RegistryEntry>();
    registryEntries.forEach((entry) => {
      if (entry.is_active) map.set(entry.document_id, entry);
    });
    return map;
  }, [registryEntries]);

  // ── Search handler ────────────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearch(value);
    searchRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPage(1);
      triggerFetch(1);
    }, 400);
  };

  // ── Type filter handler ───────────────────────────────────────────────────
  const handleTypeFilterChange = (value: DocumentType | '') => {
    setTypeFilter(value);
    typeFilterRef.current = value;
    setPage(1);
    triggerFetch(1);
  };

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleUpload = async (payload: { file: File; metadata: CreateUploadDocumentInput }) => {
    setUploading(true);

    try {
      const created = await dispatch(
        createUploadDocument({ input: payload.metadata, file: payload.file })
      ).unwrap();

      toast.success('Document saved as draft');
      setShowUploadModal(false);

      // ✅ Force a fresh fetch to ensure the document appears in the list
      await triggerFetch(page);

      // ✅ Immediately prompt the dept head to mark it
      setFinalizeTarget(created);
    } catch (error) {
      console.error('❌ Upload error:', error);
      // error surfaced via toast effect
    } finally {
      setUploading(false);
    }
  };

  // ── Finalize draft handler ───────────────────────────────────────────────
  const handleFinalizeDraft = async (input: FinalizeDraftInput) => {
    if (!finalizeTarget) return;

    try {
      await dispatch(finalizeDraft({ id: finalizeTarget.id, input })).unwrap();
      toast.success(
        input.send_to_super_admin
          ? 'Document sent to Super Admin'
          : 'Document marked to user'
      );
      setFinalizeTarget(null);
      await triggerFetch(page);
    } catch (error) {
      console.error('❌ Finalize error:', error);
      // error surfaced via toast effect
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document? This action cannot be undone.')) return;

    try {
      await dispatch(deleteDocument(id)).unwrap();
      toast.success('Document deleted');
      if (selectedDocument?.id === id) {
        setSelectedDocument(null);
      }
      const targetPage = documents.length === 1 && page > 1 ? page - 1 : page;
      setPage(targetPage);
      if (targetPage === page) await triggerFetch(page);
    } catch (error) {
      console.error('❌ Delete error:', error);
      // error surfaced via toast effect
    }
  };

  // ── Open preview handler ─────────────────────────────────────────────────
  const handlePreview = (doc: DocType) => {
    if (doc.file_url) {
      setSelectedDocument(doc);
    } else {
      toast.error('This document has no file attached.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Document preview panel */}
      {selectedDocument && (
        <DocumentPreviewPanel
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Upload modal - ✅ Pass departmentId */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleUpload}
          loading={uploading}
          departmentId={departmentId}
        />
      )}

      {/* Mark / Finalize draft modal */}
      {finalizeTarget && (
        <FinalizeDraftModal
          document={finalizeTarget}
          onClose={() => setFinalizeTarget(null)}
          onSubmit={handleFinalizeDraft}
          loading={finalizingId === finalizeTarget.id}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Document Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination
                ? `${pagination.total} document${pagination.total !== 1 ? 's' : ''}`
                : 'Loading…'}
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </button>
        </div>

        {/* Filters */}
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
                placeholder="Search by title, reference…"
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

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Title', 'Type', 'Ref No.', 'Status', 'Marked To', 'Routed To', 'Uploaded', 'Actions'].map((h) => (
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
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-400 text-sm">
                      No documents found
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const activeMark = doc.active_mark;
                    const isMarked = doc.status === 'marked' || doc.status === 'in_progress';
                    const markedToDept = activeMark?.marked_to_dept_name || '—';
                    const assignedTo = activeMark?.assigned_to_name || '—';
                    const activeRegistry = activeRegistryByDoc.get(doc.id);

                    return (
                      <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-[200px]" title={doc.title}>
                          {doc.title}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[doc.type] ?? 'bg-slate-100 text-slate-700'}`}>
                            {doc.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                          {doc.reference_no ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status] ?? 'bg-gray-100 text-gray-700'}`}>
                            {doc.is_draft ? 'draft' : doc.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Marked To */}
                        <td className="px-4 py-3">
                          {isMarked && activeMark ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-slate-700">
                                {markedToDept}
                              </span>
                              {assignedTo !== '—' && (
                                <span className="text-[10px] text-slate-400">
                                  Assigned to: {assignedTo}
                                </span>
                              )}
                              {activeMark.instructions && (
                                <span className="text-[10px] text-slate-500 italic truncate max-w-[150px]" title={activeMark.instructions}>
                                  “{activeMark.instructions}”
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

                        {/* Routed To */}
                        <td className="px-4 py-3">
                          {registryLoading && !activeRegistry ? (
                            <span className="text-xs text-slate-300">…</span>
                          ) : activeRegistry ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-slate-700">
                                {activeRegistry.station_name}
                              </span>
                              <span
                                className={`inline-flex w-fit px-1.5 py-0.5 rounded-full text-[10px] font-medium ${REGISTRY_STATUS_BADGE[activeRegistry.status]}`}
                              >
                                {REGISTRY_STATUS_LABEL[activeRegistry.status]}
                              </span>
                              {activeRegistry.note && (
                                <span
                                  className="text-[10px] text-slate-500 italic truncate max-w-[150px]"
                                  title={activeRegistry.note}
                                >
                                  “{activeRegistry.note}”
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

                            {/* Mark — only for drafts not yet finalized */}
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

                            {/* View — opens inline preview panel */}
                            <button
                              disabled={!doc.file_url}
                              onClick={() => handlePreview(doc)}
                              title={doc.file_url ? "Preview file" : "No file attached"}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Delete */}
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