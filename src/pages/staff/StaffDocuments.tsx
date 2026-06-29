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
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'marked' | 'in_progress' | 'completed';

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    marked: { bg: 'bg-violet-50', text: 'text-violet-700', label: 'Marked', icon: <Clock size={12} className="text-violet-500" /> },
    in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'In Progress', icon: <Clock size={12} className="text-blue-500" /> },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed', icon: <CheckCircle size={12} className="text-emerald-500" /> },
    draft: { bg: 'bg-stone-50', text: 'text-stone-600', label: 'Draft', icon: <FileText size={12} className="text-stone-400" /> },
    uploaded: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Uploaded', icon: <FileText size={12} className="text-blue-500" /> },
    pending_review: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending Review', icon: <Clock size={12} className="text-amber-500" /> },
    filed: { bg: 'bg-stone-50', text: 'text-stone-600', label: 'Filed', icon: <FileText size={12} className="text-stone-400" /> },
  };

  const style = styles[status] || styles.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
      {style.icon}
      {style.label}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    low: { bg: 'bg-stone-50', text: 'text-stone-500', label: 'Low' },
    normal: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Normal' },
    urgent: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Urgent' },
  };

  const style = styles[priority] || styles.normal;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  document: Document;
  onView: () => void;
  onAcknowledge?: () => void;
  onComplete?: () => void;
  isActionInProgress?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
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
  const isInProgress = document.status === 'in_progress' && mark?.assigned_to === document.assigned_to;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="p-2 rounded-xl bg-[#1d3331]/5 text-[#1d3331] shrink-0 mt-0.5">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-stone-900 truncate">{document.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {document.created_by_name}
                </span>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(document.created_at)}
                </span>
                {document.reference_no && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="font-mono text-[10px] text-stone-400">{document.reference_no}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {mark && (
            <div className="mt-2 pl-9">
              <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-700">Marked to:</span>
                  <span className="text-stone-600">{mark.marked_to_dept_name}</span>
                  {mark.assigned_to_name && (
                    <>
                      <span className="text-stone-300">•</span>
                      <span className="text-stone-600">Assigned: {mark.assigned_to_name}</span>
                    </>
                  )}
                  <PriorityBadge priority={mark.priority} />
                </div>
                {mark.instructions && (
                  <p className="mt-1 text-stone-500 line-clamp-2">{mark.instructions}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-stone-400">
                  <span>Marked: {formatDate(mark.marked_at)}</span>
                  {mark.acknowledged_at && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600">Acknowledged: {formatDate(mark.acknowledged_at)}</span>
                    </>
                  )}
                  {mark.completed_at && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600">Completed: {formatDate(mark.completed_at)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <StatusBadge status={document.status} />

          {isPendingAcknowledge && onAcknowledge && (
            <button
              onClick={onAcknowledge}
              disabled={isActionInProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1d3331] text-white text-[10px] font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionInProgress ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
              Acknowledge
            </button>
          )}

          {isInProgress && onComplete && (
            <button
              onClick={onComplete}
              disabled={isActionInProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionInProgress ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={14} />}
              Complete
            </button>
          )}

          <button
            onClick={onView}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[10px] font-bold hover:bg-stone-50 transition-colors"
          >
            <Eye size={14} />
            View
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Document Detail Modal ────────────────────────────────────────────────────

interface DocumentDetailModalProps {
  document: DocumentWithAnnotations | null;
  isOpen: boolean;
  onClose: () => void;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900">{document.title}</h3>
            <p className="text-[10px] text-stone-400 mt-0.5">
              {document.reference_no || 'No reference'} • {document.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Status */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={document.status} />
            {mark && <PriorityBadge priority={mark.priority} />}
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Created By</p>
              <p className="text-stone-700 font-medium">{document.created_by_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Created At</p>
              <p className="text-stone-700 font-medium">{formatDate(document.created_at)}</p>
            </div>
            {document.department_name && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Department</p>
                <p className="text-stone-700 font-medium">{document.department_name}</p>
              </div>
            )}
          </div>

          {/* Body */}
          {document.body && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Body</p>
              <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700 whitespace-pre-wrap border border-stone-100">
                {document.body}
              </div>
            </div>
          )}

          {/* Mark Details */}
          {mark && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Mark Details</p>
              <div className="rounded-lg bg-violet-50 border border-violet-100 p-3 space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-700">Department:</span>
                  <span className="text-stone-600">{mark.marked_to_dept_name}</span>
                </div>
                {mark.assigned_to_name && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-stone-700">Assigned To:</span>
                    <span className="text-stone-600">{mark.assigned_to_name}</span>
                  </div>
                )}
                {mark.instructions && (
                  <div>
                    <span className="font-medium text-stone-700">Instructions:</span>
                    <p className="text-stone-600 mt-0.5">{mark.instructions}</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 pt-1 border-t border-violet-100">
                  <span>Marked: {formatDate(mark.marked_at)}</span>
                  {mark.acknowledged_at && (
                    <span className="text-emerald-600">Acknowledged: {formatDate(mark.acknowledged_at)}</span>
                  )}
                  {mark.completed_at && (
                    <span className="text-emerald-600">Completed: {formatDate(mark.completed_at)}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Signature */}
          {document.is_signed && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-sm font-medium text-emerald-700">✓ Signed</p>
              {document.signed_by_name && (
                <p className="text-xs text-emerald-600">By: {document.signed_by_name}</p>
              )}
              {document.signed_at && (
                <p className="text-xs text-emerald-600">On: {formatDate(document.signed_at)}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffDocuments: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const myMarked = useAppSelector(selectMyMarked);
  const loading = useAppSelector(selectLoading);
  const actionInProgress = useAppSelector(selectActionInProgress);

  // ── Local State ────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithAnnotations | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Effects ──────────────────────────────────────────────────────────────
  // Fetches documents currently marked to the logged-in staff member.

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
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.reference_no?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    total: myMarked?.length || 0,
    marked: (myMarked || []).filter((d: Document) => d.status === 'marked').length,
    inProgress: (myMarked || []).filter((d: Document) => d.status === 'in_progress').length,
    completed: (myMarked || []).filter((d: Document) => d.status === 'completed').length,
  };

  // ── Loading State ──────────────────────────────────────────────────────────

  if (loading && (myMarked?.length || 0) === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="animate-spin text-[#1d3331]" size={32} />
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────

  if (fetchError && !loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{fetchError}</span>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1d3331]">My Documents</h1>
            <p className="text-sm text-stone-500 mt-1">
              Documents marked for your action
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <FileText size={16} className="text-stone-400" />
            <span>{stats.total} documents</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-stone-900">{stats.total}</p>
          <p className="text-[10px] text-stone-400 font-medium">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-violet-600">{stats.marked}</p>
          <p className="text-[10px] text-stone-400 font-medium">To Acknowledge</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-blue-600">{stats.inProgress}</p>
          <p className="text-[10px] text-stone-400 font-medium">In Progress</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-[10px] text-stone-400 font-medium">Completed</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">Status:</span>
            {(['all', 'marked', 'in_progress', 'completed'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-[#1d3331] text-white'
                    : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!loading && filteredDocuments.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <FileText size={48} className="mx-auto text-stone-300 mb-4" />
          <h3 className="text-base font-serif font-bold text-stone-400">No documents found</h3>
          <p className="text-sm text-stone-400 mt-1">
            {searchTerm ? 'Try adjusting your search' : 'No documents have been marked for your action'}
          </p>
        </div>
      )}

      {/* Document List */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="space-y-3">
          {filteredDocuments.map((document: Document) => {
            const isAcknowledging = actionInProgress?.acknowledging === document.id;
            const isCompleting = actionInProgress?.completing === document.id;

            return (
              <DocumentCard
                key={document.id}
                document={document}
                onView={() => handleViewDocument(document)}
                onAcknowledge={document.status === 'marked' ? () => handleAcknowledge(document.id) : undefined}
                onComplete={document.status === 'in_progress' ? () => handleComplete(document.id) : undefined}
                isActionInProgress={isAcknowledging || isCompleting}
              />
            );
          })}
        </div>
      )}

      {/* Document Detail Modal */}
      <DocumentDetailModal
        document={selectedDocument}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default StaffDocuments;