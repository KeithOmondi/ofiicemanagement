// src/pages/staff/StaffDocuments.tsx
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchMyMarked,
  fetchDocumentById,
  acknowledgeMark,
  completeMark,
  selectMyMarked,
  selectLoading,
  selectActionInProgress,
} from '../../store/slices/documentSlice';
import type { Document, DocumentWithAnnotations } from '../../types/documents.types';
import {
  Search,
  FileText,
  Eye,
  Info,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  Check,
  X,
  ExternalLink,
  Download,
  Layers,
  Inbox,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'marked' | 'in_progress' | 'completed';

interface PreviewTarget {
  url: string;
  fileName: string;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, { bg: string; border: string; text: string; label: string; icon: React.ReactNode }> = {
    marked:         { bg: 'bg-indigo-50/60',   border: 'border-indigo-100',   text: 'text-indigo-700',   label: 'Marked',         icon: <Clock size={12} className="text-indigo-500" /> },
    in_progress:    { bg: 'bg-sky-50/60',      border: 'border-sky-100',      text: 'text-sky-700',      label: 'In Progress',   icon: <Clock size={12} className="text-sky-500" /> },
    completed:      { bg: 'bg-emerald-50/60',  border: 'border-emerald-100',  text: 'text-emerald-700',  label: 'Completed',     icon: <CheckCircle size={12} className="text-emerald-500" /> },
    draft:          { bg: 'bg-zinc-50',        border: 'border-zinc-200/60',  text: 'text-zinc-600',     label: 'Draft',         icon: <FileText size={12} className="text-zinc-400" /> },
    uploaded:       { bg: 'bg-blue-50/60',     border: 'border-blue-100',     text: 'text-blue-700',     label: 'Uploaded',      icon: <FileText size={12} className="text-blue-500" /> },
    pending_review: { bg: 'bg-amber-50/60',    border: 'border-amber-100',    text: 'text-amber-700',    label: 'Pending Review', icon: <Clock size={12} className="text-amber-500" /> },
    filed:          { bg: 'bg-zinc-50',        border: 'border-zinc-200/60',  text: 'text-zinc-600',     label: 'Filed',         icon: <FileText size={12} className="text-zinc-400" /> },
  };

  const style = styles[status] || styles.draft;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border ${style.bg} ${style.border} ${style.text}`}>
      {style.icon}
      {style.label}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const styles: Record<string, { bg: string; border: string; text: string; label: string }> = {
    low:    { bg: 'bg-zinc-50',       border: 'border-zinc-200/80',  text: 'text-zinc-500',   label: 'Low' },
    normal: { bg: 'bg-blue-50/40',    border: 'border-blue-100/70',  text: 'text-blue-600',   label: 'Normal' },
    urgent: { bg: 'bg-rose-50/60',    border: 'border-rose-100',     text: 'text-rose-700',   label: 'Urgent' },
  };

  const style = styles[priority] || styles.normal;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider uppercase ${style.bg} ${style.border} ${style.text}`}>
      {style.label}
    </span>
  );
};

// ─── Inline File Preview Modal ────────────────────────────────────────────────

interface InlineFilePreviewModalProps {
  url: string;
  fileName: string;
  onClose: () => void;
}

const InlineFilePreviewModal: React.FC<InlineFilePreviewModalProps> = ({ url, fileName, onClose }) => {
  const ext = (url.split('/').pop() ?? '').split('.').pop()?.toLowerCase() ?? '';

  const renderContent = () => {
    if (ext === 'pdf') {
      return (
        <iframe
          src={`${url}#toolbar=0`}
          title={fileName}
          className="w-full h-full border-0 bg-zinc-100"
        />
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      return (
        <div className="flex items-center justify-center h-full p-8 bg-zinc-50/50">
          <img
            src={url}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-xl shadow-md border border-zinc-200"
          />
        </div>
      );
    }

    if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
      return (
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
          title={fileName}
          className="w-full h-full border-0 bg-zinc-100"
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-zinc-50/30">
        <div className="p-4 bg-zinc-100 text-zinc-400 rounded-full">
          <FileText size={40} />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-800 break-all px-6">{fileName}</p>
          <p className="text-xs text-zinc-400 mt-1">Preview unavailable for this format</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-900 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 shadow-sm transition-all active:scale-[0.98]"
          >
            <ExternalLink size={14} />
            Open in New Tab
          </a>
          <a
            href={url}
            download
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm transition-all"
          >
            <Download size={14} />
            Download File
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
          <p className="text-sm font-bold text-zinc-800 truncate pr-6">{fileName}</p>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-[11px] font-bold hover:bg-zinc-50 transition-all shadow-sm"
            >
              <ExternalLink size={13} />
              Open Original
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-zinc-200/70 transition-colors text-zinc-400 hover:text-zinc-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  document: Document;
  onView: () => void;
  onPreviewFile?: () => void;
  onAcknowledge?: () => void;
  onComplete?: () => void;
  isActionInProgress?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onPreviewFile,
  onAcknowledge,
  onComplete,
  isActionInProgress,
}) => {
  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return format(d, 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const mark = document.active_mark;
  const isPendingAcknowledge = document.status === 'marked' && mark?.assigned_to === document.assigned_to;
  const isInProgress         = document.status === 'in_progress' && mark?.assigned_to === document.assigned_to;

  return (
    <div className="group bg-white rounded-2xl border border-zinc-200/80 shadow-sm hover:border-zinc-300 hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0 flex-1 flex gap-3.5">
          <div className="p-3 rounded-xl bg-teal-50 text-teal-900 border border-teal-100/50 h-11 w-11 flex items-center justify-center shrink-0 transition-colors group-hover:bg-teal-900 group-hover:text-white duration-200">
            <FileText size={18} />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-zinc-900 truncate tracking-tight group-hover:text-teal-950 transition-colors">
                {document.title}
              </h3>
              <StatusBadge status={document.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 font-medium">
              <span className="flex items-center gap-1 text-zinc-600">
                <User size={13} className="text-zinc-400" />
                {document.created_by_name}
              </span>
              <span className="text-zinc-300">|</span>
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-zinc-400" />
                {formatDate(document.created_at)}
              </span>
              {document.reference_no && (
                <>
                  <span className="text-zinc-300">|</span>
                  <span className="font-mono text-[11px] bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100 text-zinc-500">
                    {document.reference_no}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Primary Row Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end lg:self-start lg:shrink-0">
          {isPendingAcknowledge && onAcknowledge && (
            <button
              onClick={onAcknowledge}
              disabled={isActionInProgress}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-900 text-white text-xs font-bold hover:bg-teal-800 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionInProgress ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
              Acknowledge
            </button>
          )}

          {isInProgress && onComplete && (
            <button
              onClick={onComplete}
              disabled={isActionInProgress}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionInProgress ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={14} />}
              Complete Action
            </button>
          )}

          {onPreviewFile && (
            <button
              onClick={onPreviewFile}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 text-xs font-bold hover:bg-zinc-50 hover:text-zinc-900 transition-all shadow-sm"
            >
              <Eye size={14} />
              Preview File
            </button>
          )}

          <button
            onClick={onView}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-600 text-xs font-bold hover:bg-zinc-50 hover:text-zinc-900 transition-all shadow-sm"
          >
            <Info size={14} />
            Details
          </button>
        </div>
      </div>

      {/* Internal Routing Action Block */}
      {mark && (
        <div className="ml-0 lg:ml-[58px] bg-zinc-50/60 rounded-xl border border-zinc-200/60 p-4 transition-colors group-hover:bg-zinc-50 group-hover:border-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/60 pb-2 mb-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-semibold text-zinc-500">Route Assignment:</span>
              <span className="font-bold text-zinc-700">{mark.marked_to_dept_name}</span>
              {mark.assigned_to_name && (
                <>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-600 font-medium">Recipient: {mark.assigned_to_name}</span>
                </>
              )}
            </div>
            <PriorityBadge priority={mark.priority} />
          </div>
          
          {mark.instructions && (
            <p className="text-xs text-zinc-600 leading-relaxed font-medium bg-white border border-zinc-100 p-2.5 rounded-lg shadow-inner-sm mb-2.5">
              {mark.instructions}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-zinc-400">
            <span>Dispatched: {formatDate(mark.marked_at)}</span>
            {mark.acknowledged_at && (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check size={11} /> Acknowledged: {formatDate(mark.acknowledged_at)}
              </span>
            )}
            {mark.completed_at && (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle size={11} /> Completed: {formatDate(mark.completed_at)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Document Detail Modal ────────────────────────────────────────────────────

interface DocumentDetailModalProps {
  document: DocumentWithAnnotations | null;
  isOpen: boolean;
  onClose: () => void;
  onPreviewFile?: () => void;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
  onPreviewFile,
}) => {
  if (!isOpen || !document) return null;

  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return format(d, 'dd MMM yyyy, HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const mark = document.active_mark;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden border border-zinc-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-bold text-zinc-900 truncate tracking-tight">{document.title}</h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5 tracking-wide">
              {document.reference_no || 'NO_REF_NO'} • {document.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-200/70 transition-colors text-zinc-400 hover:text-zinc-600 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={document.status} />
            {mark && <PriorityBadge priority={mark.priority} />}
          </div>

          {/* Meta Information Matrix */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-50 border border-zinc-200/60 rounded-xl p-4 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Author</p>
              <p className="text-zinc-800 font-semibold">{document.created_by_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Creation Date</p>
              <p className="text-zinc-800 font-semibold">{formatDate(document.created_at)}</p>
            </div>
            {document.department_name && (
              <div className="col-span-2 border-t border-zinc-200/60 pt-2.5 mt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Originating Office</p>
                <p className="text-zinc-800 font-semibold">{document.department_name}</p>
              </div>
            )}
          </div>

          {/* Connected File Assets */}
          {document.file_url && onPreviewFile && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Attached Media Asset</p>
              <button
                onClick={onPreviewFile}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 shadow-sm transition-all group"
              >
                <span className="truncate font-semibold text-zinc-800">{document.original_name || document.title}</span>
                <span className="inline-flex items-center gap-1 text-teal-900 font-bold shrink-0 text-[11px] group-hover:translate-x-0.5 transition-transform">
                  <Eye size={13} />
                  Launch Preview
                </span>
              </button>
            </div>
          )}

          {/* Message Body Block */}
          {document.body && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Document Body Content</p>
              <div className="rounded-xl bg-zinc-50 p-4 text-xs text-zinc-700 whitespace-pre-wrap border border-zinc-200/60 leading-relaxed font-medium shadow-inner-sm">
                {document.body}
              </div>
            </div>
          )}

          {/* Workflow Tasking Details */}
          {mark && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Workflow Target Properties</p>
              <div className="rounded-xl bg-indigo-50/40 border border-indigo-100/80 p-4 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold text-zinc-500 block text-[11px]">Assigned Department</span>
                    <span className="text-zinc-800 font-bold">{mark.marked_to_dept_name}</span>
                  </div>
                  {mark.assigned_to_name && (
                    <div>
                      <span className="font-semibold text-zinc-500 block text-[11px]">Assigned Owner</span>
                      <span className="text-zinc-800 font-bold">{mark.assigned_to_name}</span>
                    </div>
                  )}
                </div>
                
                {mark.instructions && (
                  <div className="border-t border-indigo-100 pt-2">
                    <span className="font-semibold text-zinc-500 block text-[11px] mb-0.5">Directives / Instructions</span>
                    <p className="text-zinc-700 font-medium leading-relaxed bg-white/80 border border-indigo-100/50 p-2.5 rounded-lg shadow-inner-sm">
                      {mark.instructions}
                    </p>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-zinc-400 pt-2 border-t border-indigo-100/60">
                  <span>Dispatched: {formatDate(mark.marked_at)}</span>
                  {mark.acknowledged_at && (
                    <span className="text-emerald-600">Acknowledge Sign-off: {formatDate(mark.acknowledged_at)}</span>
                  )}
                  {mark.completed_at && (
                    <span className="text-emerald-600">Completion Sign-off: {formatDate(mark.completed_at)}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cryptographic Execution Signature */}
          {document.is_signed && (
            <div className="rounded-xl bg-emerald-50/40 border border-emerald-100 p-3.5 flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
                <Check size={14} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-800">Cryptographic Signature Validated</p>
                <div className="text-emerald-600/90 font-medium mt-0.5 space-y-0.5">
                  {document.signed_by_name && <p>Signatory: {document.signed_by_name}</p>}
                  {document.signed_at && <p>Timestamp: {formatDate(document.signed_at)}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const StoreDocuments: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const myMarked        = useAppSelector(selectMyMarked);
  const loading         = useAppSelector(selectLoading);
  const actionInProgress = useAppSelector(selectActionInProgress);

  // ── Local State ────────────────────────────────────────────────────────────
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState<StatusFilter>('all');
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithAnnotations | null>(null);
  const [isModalOpen,      setIsModalOpen]      = useState(false);
  const [fetchError,       setFetchError]       = useState<string | null>(null);
  const [previewTarget,    setPreviewTarget]    = useState<PreviewTarget | null>(null);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    dispatch(fetchMyMarked())
      .unwrap()
      .catch((err: string) => {
        if (!cancelled) setFetchError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleViewDocument = async (document: Document) => {
    try {
      const result = await dispatch(fetchDocumentById(document.id)).unwrap();
      setSelectedDocument(result);
      setIsModalOpen(true);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to load document details');
    }
  };

  const handlePreviewFile = (document: Document | DocumentWithAnnotations) => {
    if (!document.file_url) return;
    setPreviewTarget({
      url:      document.file_url,
      fileName: document.original_name || document.title,
    });
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await dispatch(acknowledgeMark(id)).unwrap();
      toast.success('Document acknowledged successfully');
      dispatch(fetchMyMarked());
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to acknowledge document');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await dispatch(completeMark(id)).unwrap();
      toast.success('Document marked as completed');
      dispatch(fetchMyMarked());
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to complete document');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredDocuments = (myMarked || []).filter((doc: Document) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.reference_no?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    total:      myMarked?.length || 0,
    marked:     (myMarked || []).filter((d: Document) => d.status === 'marked').length,
    inProgress: (myMarked || []).filter((d: Document) => d.status === 'in_progress').length,
    completed:  (myMarked || []).filter((d: Document) => d.status === 'completed').length,
  };

  // ── Loading State ──────────────────────────────────────────────────────────

  if (loading && (myMarked?.length || 0) === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[450px] gap-3">
        <Loader2 className="animate-spin text-teal-900" size={36} />
        <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Loading action ledger...</p>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────

  if (fetchError && !loading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 text-rose-800 text-sm flex items-start gap-3.5 shadow-sm">
          <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Ledger Synchronization Error</p>
            <p className="text-rose-700/90 font-medium mt-0.5">{fetchError}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-zinc-50/30 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">Action Ledger</h1>
            <p className="text-sm font-medium text-zinc-500 mt-1">Manage and sign off on internal document workflows marked to your office</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 bg-white border border-zinc-200 shadow-inner-sm px-3.5 py-2 rounded-xl self-start sm:self-auto">
            <Layers size={14} className="text-zinc-400" />
            <span className="uppercase tracking-wider">{stats.total} Active Files</span>
          </div>
        </div>
      </div>

      {/* Analytics Matrix Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
        {[
          { label: 'Total Matrix Pool', count: stats.total, style: 'text-zinc-900 border-zinc-200/80', bar: 'bg-zinc-400' },
          { label: 'Action Needed', count: stats.marked, style: 'text-indigo-600 border-indigo-100/80 bg-indigo-50/10', bar: 'bg-indigo-500' },
          { label: 'In Execution', count: stats.inProgress, style: 'text-sky-600 border-sky-100/80 bg-sky-50/10', bar: 'bg-sky-500' },
          { label: 'Archived / Complete', count: stats.completed, style: 'text-emerald-600 border-emerald-100/80 bg-emerald-50/10', bar: 'bg-emerald-500' },
        ].map((item, idx) => (
          <div key={idx} className={`bg-white rounded-2xl border p-4.5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200 ${item.style}`}>
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${item.bar}`} />
            <div>
              <p className="text-2xl font-black tracking-tight">{item.count}</p>
              <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider mt-1">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Filter Framework */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Query details by title or tracking parameter code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium outline-none placeholder:text-zinc-400 focus:border-teal-900 focus:bg-white transition-all shadow-inner-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 border-t md:border-t-0 border-zinc-100 pt-3 md:pt-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-2 shrink-0">Filter Layer:</span>
          {(['all', 'marked', 'in_progress', 'completed'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all shadow-sm ${
                statusFilter === status
                  ? 'bg-teal-900 text-white border border-teal-950 active:scale-[0.97]'
                  : 'bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-800'
              }`}
            >
              {status === 'all' ? 'View Pool' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Vault Empty State Canvas */}
      {!loading && filteredDocuments.length === 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-16 text-center shadow-sm">
          <div className="h-14 w-14 bg-zinc-50 text-zinc-300 border border-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner-sm">
            <Inbox size={24} />
          </div>
          <h3 className="text-base font-bold text-zinc-700 tracking-tight">Vault segment isolated or clean</h3>
          <p className="text-xs text-zinc-400 font-medium mt-1 max-w-sm mx-auto leading-relaxed">
            {searchTerm
              ? "Your current string filter parameters yielded zero records in this targeted department index scope."
              : "No programmatic assignments or active route markers are aimed at your individual user key signature right now."}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-3.5 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-200/70 transition-all active:scale-[0.98]"
            >
              Clear Search Query
            </button>
          )}
        </div>
      )}

      {/* Main Ledger Thread Stream */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="space-y-4">
          {filteredDocuments.map((document: Document) => {
            const isAcknowledging = actionInProgress?.acknowledging === document.id;
            const isCompleting    = actionInProgress?.completing    === document.id;

            return (
              <DocumentCard
                key={document.id}
                document={document}
                onView={() => handleViewDocument(document)}
                onPreviewFile={document.file_url ? () => handlePreviewFile(document) : undefined}
                onAcknowledge={document.status === 'marked'      ? () => handleAcknowledge(document.id) : undefined}
                onComplete={document.status    === 'in_progress' ? () => handleComplete(document.id)    : undefined}
                isActionInProgress={isAcknowledging || isCompleting}
              />
            );
          })}
        </div>
      )}

      {/* Modals & Portal Overlays */}
      <DocumentDetailModal
        document={selectedDocument}
        isOpen={isModalOpen}
        onClose={closeModal}
        onPreviewFile={
          selectedDocument?.file_url ? () => handlePreviewFile(selectedDocument) : undefined
        }
      />

      {previewTarget && (
        <InlineFilePreviewModal
          url={previewTarget.url}
          fileName={previewTarget.fileName}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </div>
  );
};

export default StoreDocuments;