// src/components/helpdesk/HelpdeskDocs.tsx

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { 
  selectAllHelpdeskDocuments, 
  selectDocumentsFetchLoading,
  selectDocumentError,
  selectDocumentsUploading,
  selectDeletingDocumentId,
  selectSelectedHelpdeskDocument,
  selectDocumentActionLoading,
  fetchHelpdeskDocuments,
  fetchHelpdeskDocumentById,
  uploadHelpdeskDocument,
  deleteHelpdeskDocument,
  submitForApproval,
  approveDocument,
  rejectDocument,
  returnDocument,
  addComment,
  clearDocumentError,
  clearSelectedDocument,
  type DocumentEntityType,
  type DocumentFormat,
  type DocumentStatus,
  type HelpdeskDocument,
} from '../../store/slices/helpdeskDocumentsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { 
  X, Loader2, Upload, FileText, Download, Trash2, Eye, 
  CheckCircle, XCircle, Clock, ArrowLeft, Send, 
  FileCheck, Stamp, MessageSquare, File,
  Check, User, Maximize2, Minimize2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type UserRole = 'dept_head' | 'super_admin' | 'staff';

interface HelpdeskDocsProps {
  entityType?: DocumentEntityType;
  entityId?: string;
  userRole?: UserRole;
  showAllDocuments?: boolean;
}

interface UploadFormData {
  ref: string;
  subject: string;
  format: DocumentFormat;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: DocumentFormat[] = ['pdf', 'docx', 'xlsx'];

const STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  draft: {
    label: 'Draft',
    color: 'text-stone-600',
    bgColor: 'bg-stone-100',
    icon: <File size={14} />,
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    icon: <Clock size={14} />,
  },
  approved: {
    label: 'Approved ✓',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    icon: <CheckCircle size={14} />,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: <XCircle size={14} />,
  },
  returned: {
    label: 'Returned',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: <ArrowLeft size={14} />,
  },
};

const ACTION_LABELS: Record<string, string> = {
  submitted: 'Submitted for Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned',
};

// ─── Status Badge Component ────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

// ─── Document Preview Modal ──────────────────────────────────────────────────

interface DocumentPreviewModalProps {
  document: HelpdeskDocument;
  onClose: () => void;
  onDownload: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
  onDownload,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const fileUrl = document.file_url;

  const getFileExtension = useCallback((url: string): string => {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    return ext;
  }, []);

  const isPDF = useCallback((url: string): boolean => {
    const ext = getFileExtension(url);
    return ext === 'pdf' || url.includes('.pdf') || url.includes('/pdf/');
  }, [getFileExtension]);

  const isImage = useCallback((url: string): boolean => {
    const ext = getFileExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
  }, [getFileExtension]);

  const isWord = useCallback((url: string): boolean => {
    const ext = getFileExtension(url);
    return ext === 'docx' || ext === 'doc' || url.includes('.docx') || url.includes('/docx/');
  }, [getFileExtension]);

  const isExcel = useCallback((url: string): boolean => {
    const ext = getFileExtension(url);
    return ext === 'xlsx' || ext === 'xls' || url.includes('.xlsx') || url.includes('/xlsx/');
  }, [getFileExtension]);

  const getFileTypeLabel = useCallback((url: string): string => {
    const ext = getFileExtension(url).toUpperCase();
    if (isPDF(url)) return 'PDF Document';
    if (isImage(url)) return 'Image';
    if (isWord(url)) return 'Word Document';
    if (isExcel(url)) return 'Excel Spreadsheet';
    return ext ? `${ext} File` : 'Document';
  }, [getFileExtension, isPDF, isImage, isWord, isExcel]);

  const isPDFFile = isPDF(fileUrl);
  const isImageFile = isImage(fileUrl);
  const isWordFile = isWord(fileUrl);
  const isExcelFile = isExcel(fileUrl);
  const fileTypeLabel = getFileTypeLabel(fileUrl);
  const blobUrlRef = useRef<string | null>(null);

  // ─── Fetch PDF as blob ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDocument = async () => {
      if (!isPDFFile || !fileUrl) {
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(fileUrl, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });

        if (!response.ok) throw new Error('Failed to fetch document');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (err) {
        console.error('Failed to fetch document for preview:', err);
        setError('Unable to preview this document. Please download the file to view it.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();

    return () => {
      if (blobUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [fileUrl, isPDFFile]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getDownloadUrl = useCallback(() => {
    if (fileUrl.includes('download=true') || fileUrl.includes('attachment=true')) {
      return fileUrl;
    }
    const separator = fileUrl.includes('?') ? '&' : '?';
    return `${fileUrl}${separator}download=true`;
  }, [fileUrl]);

  const getPreviewUrl = useCallback(() => {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      return blobUrl;
    }
    if (isPDFFile) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    return fileUrl;
  }, [blobUrl, fileUrl, isPDFFile]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Unable to preview this document in the browser. Please download the file to view it.');
  };

  // ─── Render content based on file type ────────────────────────────────────
  const renderPreviewContent = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-sm px-4">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] hover:bg-[#b8973f] transition"
            >
              <Download size={16} />
              Download File
            </button>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={40} className="animate-spin text-[#c9a84c] mx-auto mb-3" />
            <p className="text-sm text-stone-500">Loading document preview...</p>
          </div>
        </div>
      );
    }

    if (isImageFile) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <img
            src={fileUrl}
            alt={document.subject}
            className="max-w-full max-h-full object-contain"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load image. Please download the file.');
            }}
          />
        </div>
      );
    }

    if (isPDFFile) {
      const previewUrl = getPreviewUrl();
      const isGoogleViewer = previewUrl.includes('docs.google.com/viewer');

      return (
        <div className="w-full h-full relative">
          {isGoogleViewer && (
            <div className="absolute top-2 left-2 z-10 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded border border-amber-200">
              <span className="font-medium">ℹ️</span> Using Google Docs Viewer
            </div>
          )}
          <div className="w-full h-full relative">
  <iframe
    src={previewUrl}
    className="absolute inset-0 w-full h-full border-0"
    title={document.subject}
    onLoad={handleIframeLoad}
    onError={handleIframeError}
  />
</div>
        </div>
      );
    }

    if (isWordFile || isExcelFile) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      return (
        <div className="w-full h-full relative">
          <div className="absolute top-2 left-2 z-10 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded border border-amber-200">
            <span className="font-medium">ℹ️</span> Using Google Docs Viewer
          </div>
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={document.subject}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
            allow="autoplay; encrypted-media"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm px-4">
          <div className="text-5xl mb-4">📄</div>
          <p className="text-sm text-stone-600 mb-2">
            This file type ({fileTypeLabel}) cannot be previewed in the browser.
          </p>
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] hover:bg-[#b8973f] transition"
          >
            <Download size={16} />
            Download File
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300 ${
      isFullscreen ? 'p-0' : ''
    }`}>
      <div className={`bg-white rounded-xl shadow-2xl flex flex-col transition-all duration-300 ${
  isFullscreen 
    ? 'w-full h-full rounded-none' 
    : 'w-full max-w-6xl h-[90vh]'   // h- not max-h-
}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 bg-stone-50/50 rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="rounded-lg bg-[#c9a84c]/10 p-2 flex-shrink-0">
              <FileText size={18} className="text-[#c9a84c]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-stone-800 truncate">{document.subject}</h3>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-mono">{document.ref}</span>
                <span className="text-stone-300">•</span>
                <span>{fileTypeLabel}</span>
                {document.file_size && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span>{(document.file_size / 1024).toFixed(1)} KB</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={toggleFullscreen}
              className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onDownload}
              className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
              title="Download"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview Body - Increased height */}
       {/* Preview Body */}
<div className="flex-1 min-h-0 overflow-hidden bg-stone-100 relative">
  {renderPreviewContent()}
</div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2.5 bg-stone-50/50 rounded-b-xl flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Status:</span>
            <StatusBadge status={document.status} />
            {document.uploaded_by_name && (
              <>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {document.uploaded_by_name}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
            >
              Close
            </button>
            <a
              href={getDownloadUrl()}
              download
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#c9a84c] px-3 py-1.5 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
            >
              <Download size={14} />
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Document Detail Modal ──────────────────────────────────────────────────

interface DocumentDetailModalProps {
  document: HelpdeskDocument;
  onClose: () => void;
  onRefresh: () => void;
  userRole: UserRole;
  onPreview: () => void;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
  onRefresh,
  userRole,
  onPreview,
}) => {
  const dispatch = useAppDispatch();
  const actionLoading = useAppSelector(selectDocumentActionLoading);
  const [newComment, setNewComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnComments, setReturnComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const docId = document.id;
  const isLoading = actionLoading[docId] || {};

  const handleSubmitForApproval = async () => {
    if (!window.confirm('Submit this document for approval?')) return;
    setIsSubmitting(true);
    try {
      await dispatch(submitForApproval({ id: docId })).unwrap();
      onRefresh();
      toast.success('Document submitted for approval');
    } catch {
      toast.error('Failed to submit for approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this document and apply e-stamp?')) return;
    setIsSubmitting(true);
    try {
      await dispatch(approveDocument({ id: docId })).unwrap();
      onRefresh();
      toast.success('Document approved and e-stamped');
    } catch {
      toast.error('Failed to approve document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      await dispatch(rejectDocument({ id: docId, reason: rejectReason.trim() })).unwrap();
      setShowRejectModal(false);
      setRejectReason('');
      onRefresh();
      toast.success('Document rejected');
    } catch {
      toast.error('Failed to reject document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    setIsSubmitting(true);
    try {
      await dispatch(returnDocument({ 
        id: docId, 
        comments: returnComments.trim() || undefined 
      })).unwrap();
      setShowReturnModal(false);
      setReturnComments('');
      onRefresh();
      toast.success('Document returned');
    } catch {
      toast.error('Failed to return document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await dispatch(addComment({ 
        id: docId, 
        comment: newComment.trim() 
      })).unwrap();
      setNewComment('');
      onRefresh();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role-based permissions
  const canSubmit = document.status === 'draft' && userRole === 'dept_head';
  const canApprove = document.status === 'pending_approval' && userRole === 'super_admin';
  const canReject = document.status === 'pending_approval' && userRole === 'super_admin';
  const canReturn = document.status === 'approved' && userRole === 'super_admin';
  const canDownloadStamped = document.status === 'approved' && document.e_stamp_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-semibold text-[#1a3d1c] truncate">
                {document.subject}
              </h2>
              <StatusBadge status={document.status} />
            </div>
            <p className="mt-1 text-xs text-stone-400 font-mono">
              Ref: {document.ref} • {document.format.toUpperCase()} • {new Date(document.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {/* ── Quick Actions ────────────────────────────────────────────── */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={onPreview}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
            >
              <Eye size={14} />
              Preview Document
            </button>
            {canSubmit && (
              <button
                onClick={handleSubmitForApproval}
                disabled={isSubmitting || isLoading.submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {isSubmitting || isLoading.submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Submit for Approval
              </button>
            )}
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={isSubmitting || isLoading.approving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting || isLoading.approving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Stamp size={14} />
                )}
                Approve & Stamp
              </button>
            )}
            {canReject && (
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isSubmitting || isLoading.rejecting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting || isLoading.rejecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                Reject
              </button>
            )}
            {canReturn && (
              <button
                onClick={() => setShowReturnModal(true)}
                disabled={isSubmitting || isLoading.returning}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting || isLoading.returning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ArrowLeft size={14} />
                )}
                Return
              </button>
            )}
          </div>

          {/* ── Document Info ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Reference</p>
              <p className="mt-0.5 text-sm font-mono text-stone-800">{document.ref}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Format</p>
              <p className="mt-0.5 text-sm font-semibold text-stone-800 uppercase">{document.format}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Entity Type</p>
              <p className="mt-0.5 text-sm capitalize text-stone-800">{document.entity_type}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Uploaded By</p>
              <p className="mt-0.5 text-sm text-stone-800">{document.uploaded_by_name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Uploaded On</p>
              <p className="mt-0.5 text-sm text-stone-800">
                {new Date(document.created_at).toLocaleString()}
              </p>
            </div>
            {document.approved_at && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Approved On</p>
                <p className="mt-0.5 text-sm text-stone-800">
                  {new Date(document.approved_at).toLocaleString()}
                </p>
              </div>
            )}
            {document.approved_by_name && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Approved By</p>
                <p className="mt-0.5 text-sm text-stone-800">{document.approved_by_name}</p>
              </div>
            )}
            {document.rejection_reason && (
              <div className="col-span-full">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400">Rejection Reason</p>
                <p className="mt-0.5 text-sm text-red-700">{document.rejection_reason}</p>
              </div>
            )}
          </div>

          {/* ── E-Stamp Preview ──────────────────────────────────────────── */}
          {document.e_stamp_url && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stamp size={20} className="text-emerald-600" />
                  <h4 className="text-sm font-semibold text-emerald-800">E-Stamp</h4>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <Check size={12} />
                    Verified
                  </span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={document.e_stamp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Eye size={14} />
                    View Stamp
                  </a>
                  <a
                    href={document.e_stamp_url}
                    download={`e-stamp-${document.ref}.png`}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <Download size={14} />
                    Download
                  </a>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 p-3 bg-white rounded border border-emerald-200">
                <img
                  src={document.e_stamp_url}
                  alt="E-Stamp"
                  className="max-h-16 w-auto object-contain"
                />
                <div className="text-xs text-stone-500">
                  <p className="font-mono">{document.ref}</p>
                  <p className="text-emerald-600">✓ Approved on {document.approved_at ? new Date(document.approved_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Download Stamped Document ──────────────────────────────── */}
          {canDownloadStamped && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={20} className="text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-800">Stamped Document</h4>
                </div>
                <a
                  href={document.file_url}
                  download={`stamped-${document.ref}.${document.format}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Download size={16} />
                  Download Stamped Document
                </a>
              </div>
              <p className="mt-2 text-xs text-blue-600">
                This document has been approved and e-stamped. Click to download the final version.
              </p>
            </div>
          )}

          {/* ── Approval History ─────────────────────────────────────────── */}
          {document.approval_history && document.approval_history.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <Clock size={16} className="text-stone-400" />
                Approval History
              </h3>
              <div className="mt-3 space-y-2">
                {document.approval_history.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="relative flex items-start gap-3 rounded-lg border border-stone-100 bg-white p-3"
                  >
                    {index < document.approval_history.length - 1 && (
                      <div className="absolute left-5 top-8 h-full w-0.5 bg-stone-200" />
                    )}
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-100">
                      {entry.action === 'submitted' && <Send size={14} className="text-amber-600" />}
                      {entry.action === 'approved' && <CheckCircle size={14} className="text-emerald-600" />}
                      {entry.action === 'rejected' && <XCircle size={14} className="text-red-600" />}
                      {entry.action === 'returned' && <ArrowLeft size={14} className="text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-stone-800">
                          {ACTION_LABELS[entry.action] || entry.action}
                        </p>
                        <span className="text-xs text-stone-400">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        By: {entry.from_user_name}
                        {entry.to_user_name && ` → ${entry.to_user_name}`}
                      </p>
                      {entry.comments && (
                        <p className="mt-1 text-xs text-stone-600 bg-stone-50 rounded p-2">
                          {entry.comments}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Comments ────────────────────────────────────────────────── */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
              <MessageSquare size={16} className="text-stone-400" />
              Comments ({document.comments?.length || 0})
            </h3>
            <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
              {document.comments && document.comments.length > 0 ? (
                document.comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-stone-100 bg-white p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-stone-800">{comment.user_name}</p>
                      <span className="text-xs text-stone-400">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">{comment.comment}</p>
                    {comment.is_internal && (
                      <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                        Internal
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-400 italic">No comments yet.</p>
              )}
            </div>

            {/* Add Comment */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                disabled={isSubmitting}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting}
                className="rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 px-6 py-3">
          <div className="text-xs text-stone-400">
            {document.e_stamp_status === 'stamped' ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <Check size={14} />
                E-Stamped ✓
              </span>
            ) : (
              <span>E-Stamp: {document.e_stamp_status || 'Pending'}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Close
          </button>
        </div>

        {/* ── Reject Modal ────────────────────────────────────────────────── */}
        {showRejectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-stone-900">Reject Document</h3>
              <p className="mt-1 text-sm text-stone-500">
                Please provide a reason for rejecting this document.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="mt-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || isSubmitting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Return Modal ────────────────────────────────────────────────── */}
        {showReturnModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-stone-900">Return Document</h3>
              <p className="mt-1 text-sm text-stone-500">
                Add any instructions or comments for the department head.
              </p>
              <textarea
                value={returnComments}
                onChange={(e) => setReturnComments(e.target.value)}
                placeholder="Enter return instructions (optional)..."
                rows={4}
                className="mt-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnComments('');
                  }}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturn}
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Return'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const HelpdeskDocs: React.FC<HelpdeskDocsProps> = ({ 
  entityType, 
  entityId,
  userRole = 'staff',
  showAllDocuments = false,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  
  const allDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const selectedDocument = useAppSelector(selectSelectedHelpdeskDocument);
  const isLoading = useAppSelector(selectDocumentsFetchLoading);
  const isUploading = useAppSelector(selectDocumentsUploading);
  const deletingId = useAppSelector(selectDeletingDocumentId);
  const error = useAppSelector(selectDocumentError);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFormData, setUploadFormData] = useState<UploadFormData>({
    ref: '',
    subject: '',
    format: 'pdf',
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filter documents based on user role ──────────────────────────────
  const documents = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    
    // Super admin sees all documents
    if (userRole === 'super_admin' || showAllDocuments) {
      return allDocuments;
    }
    
    // For dept_head and staff, only show documents they uploaded
    const userId = currentUser.id;
    const userFullName = (currentUser.full_name || '').toLowerCase().trim();
    
    const filtered = allDocuments.filter(doc => {
      // Match by user ID
      if (doc.uploaded_by && doc.uploaded_by === userId) {
        return true;
      }
      
      // Match by full name (case insensitive)
      if (doc.uploaded_by_name) {
        const docName = doc.uploaded_by_name.toLowerCase().trim();
        if (docName === userFullName) return true;
        if (userFullName && docName.includes(userFullName)) return true;
        if (userFullName && userFullName.includes(docName)) return true;
      }
      
      return false;
    });
    
    return filtered;
  }, [allDocuments, currentUser, userRole, showAllDocuments]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchHelpdeskDocuments({ 
      entity_type: entityType, 
      entity_id: entityId 
    }));
  }, [dispatch, entityType, entityId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
    e.target.value = '';
  };

  const handleUploadFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setUploadFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    if (!uploadFormData.ref.trim()) {
      setUploadError('Reference is required.');
      return;
    }

    if (!uploadFormData.subject.trim()) {
      setUploadError('Subject is required.');
      return;
    }

    try {
      await dispatch(uploadHelpdeskDocument({
        blob: selectedFile,
        filename: selectedFile.name,
        ref: uploadFormData.ref.trim(),
        subject: uploadFormData.subject.trim(),
        entity_type: entityType || 'circuit',
        entity_id: entityId || undefined,
        format: uploadFormData.format,
        status: 'draft',
      })).unwrap();

      setSelectedFile(null);
      setUploadFormData({ ref: '', subject: '', format: 'pdf' });
      setUploadError(null);
      setShowUploadModal(false);
      
      dispatch(fetchHelpdeskDocuments({ 
        entity_type: entityType, 
        entity_id: entityId 
      }));
      
      toast.success('Document uploaded successfully');
    } catch (err) {
      setUploadError(typeof err === 'string' ? err : 'Upload failed. Please try again.');
    }
  };

  const handleViewDocument = async (id: string) => {
    await dispatch(fetchHelpdeskDocumentById(id));
    setShowDetailModal(true);
  };

  const handlePreviewDocument = () => {
    setShowPreviewModal(true);
  };

  const handleDownloadDocument = () => {
    if (selectedDocument?.file_url) {
      window.open(selectedDocument.file_url, '_blank');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await dispatch(deleteHelpdeskDocument(id)).unwrap();
        toast.success('Document deleted');
      } catch {
        toast.error('Failed to delete document');
      }
    }
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadFormData({ ref: '', subject: '', format: 'pdf' });
    setUploadError(null);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setShowPreviewModal(false);
    dispatch(clearSelectedDocument());
  };

  const handleRefresh = () => {
    dispatch(fetchHelpdeskDocuments({ 
      entity_type: entityType, 
      entity_id: entityId 
    }));
  };

  const handleClearError = () => {
    dispatch(clearDocumentError());
  };

  // ─── Render States ──────────────────────────────────────────────────────

  if (isLoading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
        <span className="ml-3 text-sm text-stone-600">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-700">Error: {error}</p>
          <button
            onClick={handleClearError}
            className="text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const isSuperAdmin = userRole === 'super_admin';
  const title = isSuperAdmin ? 'All Documents' : 'My Documents';

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
          <p className="text-xs text-stone-500">
            {documents.length} document{documents.length !== 1 ? 's' : ''} found
          </p>
        </div>
        {(userRole === 'dept_head' || userRole === 'staff') && (
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        )}
      </div>

      {/* Document List - Removed Download button */}
      {documents.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 p-12 text-center">
          <FileText size={48} className="mx-auto text-stone-300" />
          <p className="mt-2 text-sm text-stone-500">
            {isSuperAdmin 
              ? 'No documents found in the system.' 
              : 'No documents uploaded yet.'}
          </p>
          <p className="text-xs text-stone-400">
            {isSuperAdmin 
              ? 'Documents will appear here once uploaded by department heads.' 
              : 'Upload your first document using the button above.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 transition hover:shadow-md hover:border-stone-300 cursor-pointer"
              onClick={() => handleViewDocument(doc.id)}
            >
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="rounded-lg bg-stone-100 p-2 flex-shrink-0 group-hover:bg-[#c9a84c]/10">
                  <FileText size={20} className="text-stone-600 group-hover:text-[#c9a84c]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-stone-800 truncate">{doc.subject}</h3>
                    <StatusBadge status={doc.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span className="font-mono">Ref: {doc.ref}</span>
                    <span className="inline-block rounded bg-stone-100 px-2 py-0.5 font-mono uppercase">
                      {doc.format}
                    </span>
                    <span>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    {doc.file_size && (
                      <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                    )}
                    {doc.e_stamp_status === 'stamped' && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <Stamp size={12} />
                        Stamped
                      </span>
                    )}
                    {doc.uploaded_by_name && (
                      <span className="inline-flex items-center gap-1 text-stone-400">
                        <User size={12} />
                        {doc.uploaded_by_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleViewDocument(doc.id)}
                  className="rounded-lg p-2 text-[#c9a84c] transition hover:bg-[#c9a84c]/10 hover:text-[#b8973f]"
                  title="View & manage document"
                >
                  <Eye size={18} />
                </button>
                {doc.uploaded_by === currentUser?.id && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {(userRole === 'dept_head' || userRole === 'staff') && showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-[#1a3d1c]">Upload Document</h3>
              <button
                onClick={handleCloseModal}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                />
                {selectedFile && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  Reference *
                </label>
                <input
                  type="text"
                  name="ref"
                  value={uploadFormData.ref}
                  onChange={handleUploadFormChange}
                  placeholder="e.g. RHC/CIRCUIT/001"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={uploadFormData.subject}
                  onChange={handleUploadFormChange}
                  placeholder="e.g. MOMBASA CIRCUIT"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  Format *
                </label>
                <select
                  name="format"
                  value={uploadFormData.format}
                  onChange={handleUploadFormChange}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                >
                  {FORMAT_OPTIONS.map((format) => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {uploadError && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-xs text-red-700">{uploadError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {showDetailModal && selectedDocument && (
        <DocumentDetailModal
          document={selectedDocument}
          onClose={handleCloseDetail}
          onRefresh={handleRefresh}
          userRole={userRole}
          onPreview={handlePreviewDocument}
        />
      )}

      {/* Document Preview Modal */}
      {showPreviewModal && selectedDocument && (
        <DocumentPreviewModal
          document={selectedDocument}
          onClose={() => setShowPreviewModal(false)}
          onDownload={handleDownloadDocument}
        />
      )}
    </div>
  );
};

export default HelpdeskDocs;