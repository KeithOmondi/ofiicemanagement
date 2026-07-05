// src/pages/documents/MemoandLetters.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchDocuments,
  fetchResponses,
  respondToDocument,
  clearError,
} from '../../store/slices/documentSlice';
import type {
  Document,
  DocumentStatus,
  DocumentFilters,
  DocumentResponse,
} from '../../types/documents.types';
import { format } from 'date-fns';
import { 
  FileText, 
  Mail, 
  Search, 
  ChevronDown,
  Eye,
  Reply,
  Download,
  Loader2,
  X,
  Send,
  Paperclip,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'all' | 'memo' | 'letter';
type FilterStatus = DocumentStatus | 'all';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: "bg-stone-100 text-stone-500 border border-stone-200",
  uploaded: "bg-blue-50 text-blue-700 border border-blue-100",
  pending_review: "bg-amber-50 text-amber-700 border border-amber-100",
  marked: "bg-violet-50 text-violet-700 border border-violet-100",
  in_progress: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  filed: "bg-stone-100 text-stone-500 border border-stone-200",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "DRAFT",
  uploaded: "UPLOADED",
  pending_review: "PENDING REVIEW",
  marked: "MARKED",
  in_progress: "IN PROGRESS",
  completed: "COMPLETED",
  filed: "FILED",
};

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap ${STATUS_STYLES[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
);

// ─── Response Modal ──────────────────────────────────────────────────────────

interface ResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onRespond: (documentId: string, note: string, file?: File) => Promise<void>;
  isSubmitting: boolean;
}

const ResponseModal: React.FC<ResponseModalProps> = ({
  isOpen,
  onClose,
  document,
  onRespond,
  isSubmitting,
}) => {
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;
    if (!note.trim()) {
      toast.error('Please enter a response note');
      return;
    }
    await onRespond(document.id, note, file || undefined);
    setNote('');
    setFile(null);
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c] flex items-center gap-2">
            <Reply size={18} className="text-[#c9a84c]" />
            Respond to Document
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
            <p className="text-xs text-stone-500 font-medium">Document</p>
            <p className="text-sm font-semibold text-stone-800">{document.title}</p>
            <p className="text-xs text-stone-400">Ref: {document.reference_no || 'N/A'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Response Note *
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Type your response here..."
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Attach File (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="response-file-upload"
                />
                <label
                  htmlFor="response-file-upload"
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  <Paperclip size={14} />
                  {file ? file.name : 'Attach File'}
                </label>
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !note.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1a3d1c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d5c30] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Response
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Document Detail Modal ───────────────────────────────────────────────────

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  responses: DocumentResponse[];
  loading: boolean;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  isOpen,
  onClose,
  document,
  responses,
  loading,
}) => {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c] flex items-center gap-2">
            <FileText size={18} className="text-[#c9a84c]" />
            Document Details
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-stone-500 font-medium">Title</p>
              <p className="text-sm font-semibold text-stone-800">{document.title}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">Type</p>
              <p className="text-sm font-semibold text-stone-800 capitalize">{document.type}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">Reference</p>
              <p className="text-sm text-stone-700">{document.reference_no || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">Status</p>
              <StatusBadge status={document.status} />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">From</p>
              <p className="text-sm text-stone-700">{document.created_by_name}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium">Date</p>
              <p className="text-sm text-stone-700">
                {document.created_at ? format(new Date(document.created_at), 'dd MMM yyyy') : 'N/A'}
              </p>
            </div>
          </div>

          {document.body && (
            <div>
              <p className="text-xs text-stone-500 font-medium mb-2">Content</p>
              <div 
                className="p-4 bg-stone-50 rounded-lg border border-stone-200 text-sm text-stone-700 max-h-[200px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: document.body }}
              />
            </div>
          )}

          {document.file_url && (
            <div>
              <p className="text-xs text-stone-500 font-medium mb-2">Attachments</p>
              <a
                href={document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#1a3d1c] hover:underline"
              >
                <Download size={16} />
                Download File
              </a>
            </div>
          )}

          <div>
            <p className="text-xs text-stone-500 font-medium mb-2">
              Responses ({responses.length})
            </p>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-stone-400" />
              </div>
            ) : responses.length === 0 ? (
              <p className="text-sm text-stone-400 italic">No responses yet.</p>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {responses.map((response) => (
                  <div key={response.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1a3d1c] text-[10px] font-bold text-white">
                          {response.response_number}
                        </span>
                        <span className="text-sm font-semibold text-stone-800">
                          {response.responded_by_name}
                        </span>
                      </div>
                      <span className="text-xs text-stone-400">
                        {format(new Date(response.created_at), 'dd MMM yyyy hh:mm aa')}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 mt-1">{response.note}</p>
                    {response.file_url && (
                      <a
                        href={response.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-[#1a3d1c] hover:underline"
                      >
                        <Paperclip size={12} />
                        {response.original_name || 'Attachment'}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-stone-100 px-4 py-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MemoandLetters: React.FC = () => {
  const dispatch = useAppDispatch();
  const { documents, loading, error, pagination } = useAppSelector(
    (state) => state.documents
  );
  const responses = useAppSelector((state) => state.documents.responses);

  // ── State ────────────────────────────────────────────────────────────────────

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // ── Fetch documents ─────────────────────────────────────────────────────────

  const fetchDocs = useCallback(() => {
    const params: DocumentFilters = {
      page: pagination?.page || 1,
      limit: 20,
    };

    // Filter by type
    if (viewMode === 'memo') params.type = 'memo';
    else if (viewMode === 'letter') params.type = 'letter';

    // Filter by status
    if (filterStatus !== 'all') params.status = filterStatus;

    // Search
    if (searchQuery) params.search = searchQuery;

    dispatch(fetchDocuments(params));
  }, [dispatch, viewMode, filterStatus, searchQuery, pagination?.page]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleViewDocument = async (doc: Document) => {
    setSelectedDocument(doc);
    setShowDetailModal(true);
    
    // Fetch responses for this document
    setLoadingResponses(true);
    await dispatch(fetchResponses(doc.id));
    setLoadingResponses(false);
  };

  const handleRespond = async (documentId: string, note: string, file?: File) => {
    setIsSubmitting(true);
    try {
      await dispatch(respondToDocument({ id: documentId, input: { note }, file })).unwrap();
      toast.success('Response sent successfully!');
      setShowResponseModal(false);
      
      // Refresh the document list
      fetchDocs();
    } catch {
      toast.error('Failed to send response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (pagination) {
      const params: DocumentFilters = {
        page,
        limit: pagination.limit,
      };
      if (viewMode === 'memo') params.type = 'memo';
      else if (viewMode === 'letter') params.type = 'letter';
      if (filterStatus !== 'all') params.status = filterStatus;
      if (searchQuery) params.search = searchQuery;
      dispatch(fetchDocuments(params));
    }
  };

  const canRespond = (doc: Document) => {
    return doc.status === 'pending_review' || doc.status === 'marked';
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  // Filter documents for display
  const displayDocuments = documents.filter((doc) => {
    if (viewMode === 'memo' && doc.type !== 'memo') return false;
    if (viewMode === 'letter' && doc.type !== 'letter') return false;
    if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#1c1917' },
          success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white flex-wrap">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
            Memos & Letters
          </h1>
          <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
            View and respond to all memos and letters
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-3 border-b border-stone-200 bg-white">
        {/* Type filters */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              viewMode === 'all'
                ? 'bg-[#1a3d1c] text-white'
                : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewMode('memo')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
              viewMode === 'memo'
                ? 'bg-[#1a3d1c] text-white'
                : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            <FileText size={14} />
            Memos
          </button>
          <button
            onClick={() => setViewMode('letter')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
              viewMode === 'letter'
                ? 'bg-[#1a3d1c] text-white'
                : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            <Mail size={14} />
            Letters
          </button>
        </div>

        <div className="w-px h-6 bg-stone-200" />

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-white focus:border-[#1a3d1c] focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending_review">Pending Review</option>
          <option value="marked">Marked</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="filed">Filed</option>
        </select>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 sm:w-64 rounded-md border border-stone-200 bg-stone-50 px-8 py-1.5 text-xs placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] focus:bg-white"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => dispatch(clearError())} className="underline ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-[#1a3d1c]" />
          </div>
        ) : displayDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-stone-300 mb-3" />
            <p className="text-sm text-stone-400">No memos or letters found</p>
            <p className="text-xs text-stone-300 mt-1">
              {viewMode === 'memo' ? 'No memos available' : 
               viewMode === 'letter' ? 'No letters available' : 
               'No documents found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayDocuments.map((doc) => (
              <div
                key={doc.id}
                className="border border-stone-200 rounded-lg bg-white hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {doc.type === 'memo' ? (
                      <FileText size={18} className="text-amber-500 flex-shrink-0" />
                    ) : (
                      <Mail size={18} className="text-stone-400 flex-shrink-0" />
                    )}
                    <h3 className="text-sm font-semibold text-stone-800 truncate">
                      {doc.title}
                    </h3>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>

                <div className="space-y-1 text-xs text-stone-500">
                  <p className="truncate">
                    <span className="font-medium">From:</span> {doc.created_by_name}
                  </p>
                  <p>
                    <span className="font-medium">Ref:</span> {doc.reference_no || 'N/A'}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {doc.created_at ? format(new Date(doc.created_at), 'dd MMM yyyy') : 'N/A'}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-100">
                  <button
                    onClick={() => handleViewDocument(doc)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  {canRespond(doc) && (
                    <button
                      onClick={() => {
                        setSelectedDocument(doc);
                        setShowResponseModal(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-[#1a3d1c] px-2 py-1.5 text-xs font-medium text-white hover:bg-[#2d5c30] transition-colors"
                    >
                      <Reply size={14} />
                      Respond
                    </button>
                  )}
                  {doc.response_count && doc.response_count > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {doc.response_count}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-6 pt-4 border-t border-stone-200">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronDown size={16} className="rotate-90" />
            </button>

            {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 7) {
                pageNum = i + 1;
              } else if (pagination.page <= 4) {
                pageNum = i + 1;
                if (i === 6) pageNum = pagination.totalPages;
              } else if (pagination.page >= pagination.totalPages - 3) {
                pageNum = pagination.totalPages - 6 + i;
              } else {
                pageNum = pagination.page - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`h-8 min-w-[32px] rounded-md px-2 text-xs font-medium transition-colors ${
                    pageNum === pagination.page
                      ? 'bg-[#1a3d1c] text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronDown size={16} className="-rotate-90" />
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <DocumentDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        responses={responses}
        loading={loadingResponses}
      />

      <ResponseModal
        isOpen={showResponseModal}
        onClose={() => {
          setShowResponseModal(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onRespond={handleRespond}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default MemoandLetters;