// src/components/helpdesk/HelpdeskDocs.tsx

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  X,
  Loader2,
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Send,
  FileCheck,
  Stamp,
  MessageSquare,
  File,
  Check,
  User,
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  Search,
  Filter,
  Grid,
  List,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';

// Import from helpdeskDocumentsSlice
import {
  fetchHelpdeskDocuments,
  fetchHelpdeskDocumentById,
  uploadHelpdeskDocument,
  deleteHelpdeskDocument,
  submitForApproval,
  internalApproveDocument,
  internalRejectDocument,
  internalRequestChanges,
  sendBackToRequester,
  addComment,
  clearDocumentError,
  clearSelectedDocument,
  selectAllHelpdeskDocuments,
  selectDocumentsFetchLoading,
  selectDocumentError,
  selectDocumentsUploading,
  selectDeletingDocumentId,
  selectSelectedHelpdeskDocument,
  selectDocumentActionLoading,
  type HelpdeskDocument,
  type DocumentEntityType,
  type DocumentFormat,
  type DocumentStatus,
  type InternalApprovalStatus,
  type HelpdeskDocumentFilters,
} from '../../store/slices/helpdeskDocumentsSlice';

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

// ─── UPDATED: STATUS_CONFIG with ready_to_send ──────────────────────────────
const STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string; icon: React.ReactNode; bgColor: string; borderColor: string }> = {
  draft: {
    label: 'Draft',
    color: 'text-stone-600',
    bgColor: 'bg-stone-100',
    borderColor: 'border-stone-200',
    icon: <File size={14} />,
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: <Clock size={14} />,
  },
  ready_to_send: {
    label: 'Ready to Send',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: <Send size={14} />,
  },
  approved: {
    label: 'Approved ✓',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: <CheckCircle size={14} />,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: <XCircle size={14} />,
  },
  returned: {
    label: 'Returned',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: <ArrowLeft size={14} />,
  },
};

const ACTION_LABELS: Record<string, string> = {
  submitted: 'Submitted for Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned',
  signed: 'Signed',
  stamped: 'Stamped',
  sent_back: 'Sent Back to Requester',
  previewed: 'Previewed',
  resubmitted: 'Resubmitted',
};

const INTERNAL_STATUS_LABELS: Record<InternalApprovalStatus, string> = {
  pending: 'Pending Review',
  previewed: 'Previewed',
  approved_internal: 'Approved (Pending Send Back)',
  rejected_internal: 'Rejected (Pending Send Back)',
  changes_requested_internal: 'Changes Requested (Pending Send Back)',
  changes_ready: 'Changes Ready',
};

// ─── Helper Functions ──────────────────────────────────────────────────────

// ─── UPDATED: getStatusBadge with fallback for unknown statuses ─────────────

// ─── Helper Functions ──────────────────────────────────────────────────────

const getStatusBadge = (status: DocumentStatus) => {
  const config = STATUS_CONFIG[status];
  
  // ✅ FIX: Add fallback for unknown statuses
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-stone-100 text-stone-600">
        <AlertCircle size={14} />
        {status || 'Unknown'}
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

// ─── Status Badge Component ────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  return getStatusBadge(status);
};

// ─── Document Card Component ──────────────────────────────────────────────

interface DocumentCardProps {
  document: HelpdeskDocument;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
  isDeleting: boolean;
  currentUserId?: string;
  userRole: UserRole;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onDelete,
  onPreview,
  isDeleting,
  currentUserId,
  userRole,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isStamped = document.is_stamped && document.e_stamp_url;
  const isSigned = document.is_signed;
  const isApprovedAndVisible = document.status === 'approved' && document.is_sent_back_to_requester;
  const isOwner = document.uploaded_by === currentUserId;
  const isSuperAdmin = userRole === 'super_admin';

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-white transition-all duration-200 cursor-pointer ${
        isHovered 
          ? 'border-[#c9a84c] shadow-lg shadow-[#c9a84c]/10 -translate-y-0.5' 
          : 'border-stone-200 shadow-sm hover:shadow-md'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView(document.id)}
    >
      {/* Status Badge - Top Right */}
      <div className="absolute right-3 top-3 z-10">
        <StatusBadge status={document.status} />
      </div>

      {/* Stamp/Signed Badges - Top Right */}
      <div className="absolute right-3 top-10 z-10 flex flex-col gap-1">
        {isStamped && isApprovedAndVisible && (
          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
            <Stamp size={10} />
            Stamped
          </span>
        )}
        {isSigned && !isStamped && isApprovedAndVisible && (
          <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
            <FileCheck size={10} />
            Signed
          </span>
        )}
        {isApprovedAndVisible && (
          <span className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 border border-purple-200">
            <ArrowLeft size={10} />
            Sent Back
          </span>
        )}
      </div>

      <div className="p-5 pr-32">
        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div className={`rounded-lg p-3 flex-shrink-0 transition-colors ${
            isHovered ? 'bg-[#c9a84c]/20' : 'bg-[#c9a84c]/10'
          }`}>
            <FileText size={24} className="text-[#c9a84c]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-stone-800 truncate pr-4">
              {document.subject}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="font-mono bg-stone-100 px-2 py-0.5 rounded">
                {document.ref}
              </span>
              <span className="inline-block rounded bg-stone-100 px-2 py-0.5 font-mono uppercase text-[10px]">
                {document.format}
              </span>
              <span>•</span>
              <span>{new Date(document.created_at).toLocaleDateString()}</span>
              {document.file_size && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(document.file_size)}</span>
                </>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-stone-400">
              {document.uploaded_by_name && (
                <span className="inline-flex items-center gap-1">
                  <User size={12} />
                  {document.uploaded_by_name}
                </span>
              )}
              {isStamped && isApprovedAndVisible && document.stamped_by_name && (
                <span className="inline-flex items-center gap-1 text-emerald-500">
                  <Stamp size={10} />
                  Stamped by: {document.stamped_by_name}
                </span>
              )}
              {document.e_stamp_status === 'stamped' && (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Stamp size={12} />
                  E-Stamped
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Bottom Right */}
      <div className={`absolute bottom-3 right-3 flex items-center gap-1 transition-opacity duration-200 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(document.id); }}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-[#c9a84c]/10 hover:text-[#c9a84c] transition"
          title="Preview"
        >
          <Eye size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onView(document.id); }}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-[#c9a84c]/10 hover:text-[#c9a84c] transition"
          title="Manage"
        >
          <FileCheck size={16} />
        </button>
        {(isOwner || isSuperAdmin) && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(document.id); }}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
            title="Delete"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadFormData, setUploadFormData] = useState<UploadFormData>({
    ref: '',
    subject: '',
    format: 'pdf',
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filter documents ──────────────────────────────────────────────────
  const documents = useMemo(() => {
    let filtered = [...allDocuments];
    
    // Filter by user role
    if (!showAllDocuments && userRole !== 'super_admin' && currentUser?.id) {
      filtered = filtered.filter(doc => doc.uploaded_by === currentUser.id);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(doc => 
        doc.subject.toLowerCase().includes(query) ||
        doc.ref.toLowerCase().includes(query) ||
        (doc.uploaded_by_name && doc.uploaded_by_name.toLowerCase().includes(query))
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }
    
    // Sort by created_at descending (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return filtered;
  }, [allDocuments, currentUser, userRole, showAllDocuments, searchQuery, statusFilter]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = allDocuments.length;
    const pending = allDocuments.filter(d => d.status === 'pending_approval').length;
    const readyToSend = allDocuments.filter(d => d.status === 'ready_to_send').length;
    const approved = allDocuments.filter(d => d.status === 'approved').length;
    const rejected = allDocuments.filter(d => d.status === 'rejected').length;
    return { total, pending, readyToSend, approved, rejected };
  }, [allDocuments]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const filters: HelpdeskDocumentFilters = {};
    if (entityType) filters.entity_type = entityType;
    if (entityId) filters.entity_id = entityId;
    if (userRole !== 'super_admin' && currentUser?.id && !showAllDocuments) {
      filters.uploaded_by = currentUser.id;
    }
    dispatch(fetchHelpdeskDocuments(filters));
  }, [dispatch, entityType, entityId, userRole, currentUser?.id, showAllDocuments]);

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
      
      // Refresh the list
      const filters: HelpdeskDocumentFilters = {};
      if (entityType) filters.entity_type = entityType;
      if (entityId) filters.entity_id = entityId;
      if (userRole !== 'super_admin' && currentUser?.id && !showAllDocuments) {
        filters.uploaded_by = currentUser.id;
      }
      dispatch(fetchHelpdeskDocuments(filters));
      
      toast.success('Document uploaded successfully');
    } catch (err) {
      setUploadError(typeof err === 'string' ? err : 'Upload failed. Please try again.');
    }
  };

  const handleViewDocument = async (id: string) => {
    await dispatch(fetchHelpdeskDocumentById(id));
    setShowDetailModal(true);
  };

  const handlePreviewDocument = async (id: string) => {
    if (id !== selectedDocument?.id) {
      await dispatch(fetchHelpdeskDocumentById(id));
    }
    setShowPreviewModal(true);
  };

  const handleDownloadDocument = () => {
    if (selectedDocument?.file_url) {
      const downloadUrl = selectedDocument.stamped_file_url || selectedDocument.file_url;
      window.open(downloadUrl, '_blank');
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
    const filters: HelpdeskDocumentFilters = {};
    if (entityType) filters.entity_type = entityType;
    if (entityId) filters.entity_id = entityId;
    if (userRole !== 'super_admin' && currentUser?.id && !showAllDocuments) {
      filters.uploaded_by = currentUser.id;
    }
    dispatch(fetchHelpdeskDocuments(filters));
  };

  const handleClearError = () => {
    dispatch(clearDocumentError());
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  // ─── Render States ──────────────────────────────────────────────────────

  if (isLoading && allDocuments.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
        <span className="ml-3 text-sm text-stone-600">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" />
            <p className="text-sm text-red-700">Error: {error}</p>
          </div>
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

  const isSuperAdmin = userRole === 'super_admin';
  const title = isSuperAdmin ? 'All Documents' : 'My Documents';

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />

      {/* ─── Stats Bar ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl bg-white border border-stone-200 p-4 shadow-sm">
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">Total</p>
          <p className="mt-1 text-2xl font-bold text-stone-800">{stats.total}</p>
        </div>
        <div className="rounded-xl bg-white border border-amber-200 p-4 shadow-sm">
          <p className="text-xs text-amber-500 font-medium uppercase tracking-wider">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl bg-white border border-blue-200 p-4 shadow-sm">
          <p className="text-xs text-blue-500 font-medium uppercase tracking-wider">Ready to Send</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{stats.readyToSend}</p>
        </div>
        <div className="rounded-xl bg-white border border-emerald-200 p-4 shadow-sm">
          <p className="text-xs text-emerald-500 font-medium uppercase tracking-wider">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.approved}</p>
        </div>
        <div className="rounded-xl bg-white border border-red-200 p-4 shadow-sm">
          <p className="text-xs text-red-500 font-medium uppercase tracking-wider">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
      </div>

      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
          <p className="text-xs text-stone-500">
            {documents.length} document{documents.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-md p-1.5 transition ${
                viewMode === 'grid' ? 'bg-[#c9a84c]/20 text-[#c9a84c]' : 'text-stone-400 hover:text-stone-600'
              }`}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md p-1.5 transition ${
                viewMode === 'list' ? 'bg-[#c9a84c]/20 text-[#c9a84c]' : 'text-stone-400 hover:text-stone-600'
              }`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="rounded-lg border border-stone-200 bg-white p-2 text-stone-400 hover:text-stone-600 transition"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          {(userRole === 'dept_head' || userRole === 'staff') && (
            <button
              onClick={() => setShowUploadModal(true)}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Search & Filter Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by subject, reference, or uploader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-stone-400 focus:border-[#c9a84c] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-stone-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | 'all')}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[#c9a84c] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="ready_to_send">Ready to Send</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="returned">Returned</option>
          </select>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-stone-400 hover:text-stone-600 transition whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ─── Document List ────────────────────────────────────────────────── */}
      {documents.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 p-16 text-center">
          <FileText size={48} className="mx-auto text-stone-300" />
          <p className="mt-2 text-sm text-stone-500">
            {searchQuery || statusFilter !== 'all' 
              ? 'No documents match your filters.' 
              : isSuperAdmin 
                ? 'No documents found in the system.' 
                : 'No documents uploaded yet.'}
          </p>
          <p className="text-xs text-stone-400">
            {isSuperAdmin 
              ? 'Documents will appear here once uploaded by department heads.' 
              : 'Upload your first document using the button above.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="mt-3 inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onView={handleViewDocument}
              onDelete={handleDelete}
              onPreview={handlePreviewDocument}
              isDeleting={deletingId === doc.id}
              currentUserId={currentUser?.id}
              userRole={userRole}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 transition hover:shadow-md hover:border-[#c9a84c]/30 cursor-pointer"
              onClick={() => handleViewDocument(doc.id)}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="rounded-lg bg-stone-100 p-2 flex-shrink-0 group-hover:bg-[#c9a84c]/10">
                  <FileText size={18} className="text-stone-600 group-hover:text-[#c9a84c]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-800 truncate">{doc.subject}</span>
                    <StatusBadge status={doc.status} />
                    {doc.is_stamped && doc.is_sent_back_to_requester && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                        <Stamp size={10} />
                        Stamped
                      </span>
                    )}
                    {doc.is_signed && !doc.is_stamped && doc.is_sent_back_to_requester && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
                        <FileCheck size={10} />
                        Signed
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span className="font-mono">{doc.ref}</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    {doc.uploaded_by_name && <span>{doc.uploaded_by_name}</span>}
                    {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handlePreviewDocument(doc.id)}
                  className="rounded-lg p-1.5 text-stone-400 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 transition"
                >
                  <Eye size={16} />
                </button>
                {(doc.uploaded_by === currentUser?.id || isSuperAdmin) && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="rounded-lg p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                  >
                    {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Upload Modal ────────────────────────────────────────────────── */}
      {(userRole === 'dept_head' || userRole === 'staff') && showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-[#1a3d1c]">Upload Document</h3>
              <button
                onClick={handleCloseModal}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  File *
                </label>
                <div 
                  className={`flex items-center justify-between rounded-md border-2 border-dashed p-4 transition ${
                    selectedFile 
                      ? 'border-emerald-300 bg-emerald-50' 
                      : 'border-stone-300 bg-white hover:border-[#c9a84c]'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} className={selectedFile ? 'text-emerald-500' : 'text-stone-400'} />
                    <div>
                      <p className="text-sm text-stone-700">
                        {selectedFile ? selectedFile.name : 'Click to select a file'}
                      </p>
                      {selectedFile && (
                        <p className="text-xs text-stone-400">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedFile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                />
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
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:border-[#c9a84c] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
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
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:border-[#c9a84c] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
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
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#c9a84c] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
                >
                  {FORMAT_OPTIONS.map((format) => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {uploadError && (
                <div className="rounded-md bg-red-50 p-3 border border-red-200">
                  <p className="text-xs text-red-700">{uploadError}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
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

      {/* ─── Document Detail Modal ──────────────────────────────────────────── */}
      {showDetailModal && selectedDocument && (
        <DocumentDetailModal
          document={selectedDocument}
          onClose={handleCloseDetail}
          onRefresh={handleRefresh}
          userRole={userRole}
          onPreview={() => handlePreviewDocument(selectedDocument.id)}
        />
      )}

      {/* ─── Document Preview Modal ──────────────────────────────────────────── */}
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
  const currentUser = useAppSelector((state) => state.auth.user);
  const [newComment, setNewComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changesRequested, setChangesRequested] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    details: true,
    history: true,
    comments: true,
  });

  const docId = document.id;
  const isLoading = actionLoading[docId] || {};

  const isStamped = document.is_stamped && document.e_stamp_url;
  const isSigned = document.is_signed;
  const isApprovedAndVisible = document.status === 'approved' && document.is_sent_back_to_requester;

  const finalFileUrl = document.stamped_file_url || document.file_url;

  const canSubmit = document.status === 'draft' && (userRole === 'dept_head' || userRole === 'staff');
  const canInternalApprove = userRole === 'super_admin' && 
    document.status === 'pending_approval' && 
    ['pending', 'previewed', 'changes_ready'].includes(document.internal_approval_status);
  const canInternalReject = userRole === 'super_admin' && 
    document.status === 'pending_approval' && 
    ['pending', 'previewed', 'changes_ready'].includes(document.internal_approval_status);
  const canInternalRequestChanges = userRole === 'super_admin' && 
    document.status === 'pending_approval' && 
    ['pending', 'previewed', 'changes_ready'].includes(document.internal_approval_status);
  const canSendBack = userRole === 'super_admin' && 
    document.is_internal_approval_complete && 
    !document.is_sent_back_to_requester;

  const internalStatusLabel = INTERNAL_STATUS_LABELS[document.internal_approval_status] || document.internal_approval_status;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSubmitForApproval = async () => {
    if (!window.confirm('Submit this document for approval?')) return;
    setIsSubmitting(true);
    try {
      await dispatch(submitForApproval({ id: docId, submitted_by: currentUser?.id, submitted_by_name: currentUser?.full_name })).unwrap();
      onRefresh();
      toast.success('Document submitted for approval');
    } catch {
      toast.error('Failed to submit for approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInternalApprove = async () => {
    if (!window.confirm('Approve this document internally? The requester will not see this until you send it back.')) return;
    setIsSubmitting(true);
    try {
      await dispatch(internalApproveDocument({
        id: docId,
        action: 'approve',
        approved_by: currentUser?.id || '',
        approved_by_name: currentUser?.full_name || '',
        comments: 'Document approved internally.',
        generate_e_stamp: true,
      })).unwrap();
      onRefresh();
      toast.success('Document approved internally. Click "Send Back" to notify the requester.');
    } catch {
      toast.error('Failed to approve document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInternalReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      await dispatch(internalRejectDocument({
        id: docId,
        action: 'reject',
        rejection_reason: rejectReason.trim(),
        comments: `Rejected internally: ${rejectReason.trim()}`,
        approved_by: currentUser?.id || '',
        approved_by_name: currentUser?.full_name || '',
      })).unwrap();
      setShowRejectModal(false);
      setRejectReason('');
      onRefresh();
      toast.success('Document rejected internally. Click "Send Back" to notify the requester.');
    } catch {
      toast.error('Failed to reject document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInternalRequestChanges = async () => {
    if (!changesRequested.trim()) {
      toast.error('Please list the changes requested.');
      return;
    }
    const changesList = changesRequested.split(',').map(c => c.trim()).filter(c => c.length > 0);
    if (changesList.length === 0) {
      toast.error('At least one valid change request is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await dispatch(internalRequestChanges({
        id: docId,
        action: 'request_changes',
        changes_requested: changesList,
        comments: `Changes requested internally: ${changesList.join(', ')}`,
        approved_by: currentUser?.id || '',
        approved_by_name: currentUser?.full_name || '',
      })).unwrap();
      setShowChangesModal(false);
      setChangesRequested('');
      onRefresh();
      toast.success('Changes requested internally. Click "Send Back" to notify the requester.');
    } catch {
      toast.error('Failed to request changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendBack = async (finalStatus: 'approved' | 'rejected' | 'changes_requested') => {
    if (!window.confirm(`Send this document back to the requester with status: ${finalStatus}?`)) return;
    setIsSubmitting(true);
    try {
      await dispatch(sendBackToRequester({
        id: docId,
        final_status: finalStatus,
        sent_by: currentUser?.id || '',
        sent_by_name: currentUser?.full_name || '',
        comments: `Document sent back to requester with status: ${finalStatus}`,
        notify_requester: true,
      })).unwrap();
      onRefresh();
      const statusMessages = {
        approved: 'Document approved and sent back to requester.',
        rejected: 'Document rejected and sent back to requester.',
        changes_requested: 'Changes requested and sent back to requester.',
      };
      toast.success(statusMessages[finalStatus]);
    } catch {
      toast.error('Failed to send back to requester');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-semibold text-[#1a3d1c] truncate">
                {document.subject}
              </h2>
              <StatusBadge status={document.status} />
              {isSigned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                  <FileCheck size={12} />
                  Signed
                </span>
              )}
              {isStamped && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                  <Stamp size={12} />
                  Stamped
                </span>
              )}
              {userRole === 'super_admin' && document.internal_approval_status && (
                <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  Internal: {internalStatusLabel}
                </span>
              )}
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
          <div className="mb-6 flex flex-wrap gap-2">
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

            {canInternalApprove && (
              <button
                onClick={handleInternalApprove}
                disabled={isSubmitting || isLoading.internalApproving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting || isLoading.internalApproving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Stamp size={14} />
                )}
                Approve & Stamp
              </button>
            )}

            {canInternalReject && (
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isSubmitting || isLoading.internalRejecting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting || isLoading.internalRejecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                Reject
              </button>
            )}

            {canInternalRequestChanges && (
              <button
                onClick={() => setShowChangesModal(true)}
                disabled={isSubmitting || isLoading.requestingChanges}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
              >
                {isSubmitting || isLoading.requestingChanges ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MessageSquare size={14} />
                )}
                Request Changes
              </button>
            )}

            {canSendBack && (
              <>
                {document.internal_approval_status === 'approved_internal' && (
                  <button
                    onClick={() => handleSendBack('approved')}
                    disabled={isSubmitting || isLoading.sendingBack}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSubmitting || isLoading.sendingBack ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Send Approved to Requester
                  </button>
                )}
                {document.internal_approval_status === 'rejected_internal' && (
                  <button
                    onClick={() => handleSendBack('rejected')}
                    disabled={isSubmitting || isLoading.sendingBack}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSubmitting || isLoading.sendingBack ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Send Rejected to Requester
                  </button>
                )}
                {document.internal_approval_status === 'changes_requested_internal' && (
                  <button
                    onClick={() => handleSendBack('changes_requested')}
                    disabled={isSubmitting || isLoading.sendingBack}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                  >
                    {isSubmitting || isLoading.sendingBack ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Send Changes to Requester
                  </button>
                )}
              </>
            )}
          </div>

          {/* ─── Document Info ────────────────────────────────────────────── */}
          <div className="rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
            <button
              onClick={() => toggleSection('details')}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-stone-100/50 transition"
            >
              <h3 className="text-sm font-semibold text-stone-800">Document Details</h3>
              {expandedSections.details ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.details && (
              <div className="grid grid-cols-2 gap-4 px-4 pb-4 sm:grid-cols-3">
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
                {document.internal_approved_at && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Approved On</p>
                    <p className="mt-0.5 text-sm text-stone-800">
                      {new Date(document.internal_approved_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {document.internal_approved_by_name && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Approved By</p>
                    <p className="mt-0.5 text-sm text-stone-800">{document.internal_approved_by_name}</p>
                  </div>
                )}
                {document.requester_status && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Requester Status</p>
                    <p className="mt-0.5 text-sm capitalize text-stone-800">{document.requester_status.replace('_', ' ')}</p>
                  </div>
                )}
                {document.requester_visible_at && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Sent Back On</p>
                    <p className="mt-0.5 text-sm text-stone-800">
                      {new Date(document.requester_visible_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {document.internal_approval_status && userRole === 'super_admin' && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Internal Status</p>
                    <p className="mt-0.5 text-sm text-stone-800">{internalStatusLabel}</p>
                  </div>
                )}
                {document.rejection_reason && (
                  <div className="col-span-full">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400">Rejection Reason</p>
                    <p className="mt-0.5 text-sm text-red-700">{document.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Official Stamp Display ────────────────────────────────────── */}
          {isStamped && isApprovedAndVisible && document.e_stamp_url && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stamp size={20} className="text-emerald-600" />
                  <h4 className="text-sm font-semibold text-emerald-800">Official Court Stamp</h4>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                    <Check size={12} />
                    Verified
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onPreview}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Eye size={14} />
                    View Stamped Document
                  </button>
                  <a
                    href={finalFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 p-3 bg-white rounded border border-emerald-200">
                <img
                  src={document.e_stamp_url}
                  alt="Official Court Stamp"
                  className="max-h-20 w-auto object-contain"
                  onError={(e) => {
                    console.error('Failed to load stamp image:', document.e_stamp_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="text-xs text-stone-500">
                  <p className="font-mono">{document.ref}</p>
                  <p className="text-emerald-600">✓ Approved on {document.internal_approved_at ? new Date(document.internal_approved_at).toLocaleDateString() : 'N/A'}</p>
                  {document.stamped_by_name && (
                    <p className="text-stone-400">Stamped by: {document.stamped_by_name}</p>
                  )}
                  {document.stamped_at && (
                    <p className="text-stone-400">Date: {new Date(document.stamped_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Signature Only Display ────────────────────────────────────── */}
          {isSigned && isApprovedAndVisible && !isStamped && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2">
                <FileCheck size={20} className="text-blue-600" />
                <h4 className="text-sm font-semibold text-blue-800">Official Signature</h4>
                <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                  <Check size={12} />
                  Verified
                </span>
              </div>
              <div className="mt-3 flex flex-col items-start p-3 bg-white rounded border border-blue-200">
                <div className="text-xs text-stone-500">
                  <p className="font-semibold text-stone-700">{document.signed_by_name || 'Registrar, High Court'}</p>
                  <p className="text-stone-400">Signed on: {document.signed_at ? new Date(document.signed_at).toLocaleDateString() : 'N/A'}</p>
                  <p className="font-mono text-stone-400">{document.ref}</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Approval History ─────────────────────────────────────────── */}
          {document.approval_history && document.approval_history.length > 0 && (
            <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
              <button
                onClick={() => toggleSection('history')}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-stone-100/50 transition"
              >
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-stone-400" />
                  <h3 className="text-sm font-semibold text-stone-800">Approval History</h3>
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                    {document.approval_history.length}
                  </span>
                </div>
                {expandedSections.history ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSections.history && (
                <div className="space-y-2 px-4 pb-4 max-h-60 overflow-y-auto">
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
                        {entry.action === 'sent_back' && <ArrowLeft size={14} className="text-purple-600" />}
                        {entry.action === 'stamped' && <Stamp size={14} className="text-emerald-600" />}
                        {entry.action === 'signed' && <FileCheck size={14} className="text-blue-600" />}
                        {entry.action === 'previewed' && <Eye size={14} className="text-blue-600" />}
                        {entry.action === 'resubmitted' && <RefreshCw size={14} className="text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-stone-800">
                            {ACTION_LABELS[entry.action] || entry.action}
                            {entry.internal_action && (
                              <span className="ml-2 text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                                Internal
                              </span>
                            )}
                            {entry.requester_visible && (
                              <span className="ml-2 text-xs text-emerald-400 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Visible
                              </span>
                            )}
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
              )}
            </div>
          )}

          {/* ─── Comments ────────────────────────────────────────────────── */}
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
            <button
              onClick={() => toggleSection('comments')}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-stone-100/50 transition"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-stone-400" />
                <h3 className="text-sm font-semibold text-stone-800">Comments</h3>
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  {document.comments?.length || 0}
                </span>
              </div>
              {expandedSections.comments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.comments && (
              <div className="px-4 pb-4">
                <div className="max-h-48 overflow-y-auto space-y-2">
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
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 px-6 py-3">
          <div className="flex items-center gap-3 text-xs text-stone-400">
            {isStamped && isApprovedAndVisible ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Check size={14} />
                Stamped ✓
              </span>
            ) : isSigned && isApprovedAndVisible ? (
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <Check size={14} />
                Signed ✓
              </span>
            ) : document.e_stamp_status === 'stamped' ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <Stamp size={14} />
                E-Stamped
              </span>
            ) : (
              <span>E-Stamp: {document.e_stamp_status || 'Pending'}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
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
                  onClick={handleInternalReject}
                  disabled={!rejectReason.trim() || isSubmitting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Request Changes Modal ───────────────────────────────────────── */}
        {showChangesModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-stone-900">Request Changes</h3>
              <p className="mt-1 text-sm text-stone-500">
                List the changes you want the requester to make (comma separated).
              </p>
              <textarea
                value={changesRequested}
                onChange={(e) => setChangesRequested(e.target.value)}
                placeholder="e.g. Update the budget figures, Add supporting documents, Correct the date"
                rows={4}
                className="mt-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowChangesModal(false);
                    setChangesRequested('');
                  }}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInternalRequestChanges}
                  disabled={!changesRequested.trim() || isSubmitting}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Request Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
  const [showStampOverlay, setShowStampOverlay] = useState(true);
  const [isStampImageLoaded, setIsStampImageLoaded] = useState(false);

  const fileUrl = document.stamped_file_url || document.file_url;
  const isStamped = document.is_stamped && document.e_stamp_url;
  const isSigned = document.is_signed && !document.is_stamped;
  const isApproved = document.status === 'approved' && document.is_sent_back_to_requester;

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

  // Fetch document for preview
  useEffect(() => {
    const fetchDocument = async () => {
      if (!fileUrl) {
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
  }, [fileUrl]);

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
    return fileUrl;
  }, [blobUrl, fileUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Unable to preview this document in the browser. Please download the file to view it.');
  };

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
        <div className="flex items-center justify-center h-full p-4 relative">
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
          {/* Stamp overlay for images */}
          {isStamped && isApproved && (
            <div className="absolute bottom-4 right-4 opacity-80">
              <div className="bg-emerald-500/90 text-white px-4 py-2 rounded-lg shadow-lg transform rotate-[-6deg]">
                <div className="flex items-center gap-2">
                  <Stamp size={16} />
                  <span className="font-bold text-sm">APPROVED</span>
                </div>
                <div className="text-[10px] text-white/80 text-center">
                  {document.stamped_by_name || 'Registrar, High Court'}
                </div>
                <div className="text-[8px] text-white/60 text-center">
                  {document.stamped_at ? new Date(document.stamped_at).toLocaleDateString() : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (isPDFFile) {
      const previewUrl = getPreviewUrl();
      const showStamp = isStamped && isApproved;
      
      return (
        <div className="w-full h-full relative">
          {/* Stamp overlay for PDFs */}
          {showStamp && showStampOverlay && (
            <div className="absolute top-1/4 right-8 z-10 pointer-events-none opacity-90 transform rotate-[-12deg]">
              <div className="bg-emerald-500/90 text-white px-6 py-3 rounded-lg shadow-xl border-2 border-emerald-300">
                <div className="flex items-center gap-2 justify-center">
                  <Stamp size={20} />
                  <span className="font-bold text-lg tracking-wider">APPROVED</span>
                </div>
                <div className="text-xs text-white/90 text-center font-medium mt-1">
                  {document.stamped_by_name || 'Registrar, High Court'}
                </div>
                <div className="text-[10px] text-white/70 text-center">
                  {document.stamped_at ? new Date(document.stamped_at).toLocaleDateString() : ''}
                </div>
                {document.e_stamp_url && isStampImageLoaded && (
                  <div className="mt-1 flex justify-center">
                    <img 
                      src={document.e_stamp_url} 
                      alt="Official Stamp" 
                      className="h-12 w-auto object-contain"
                      onLoad={() => setIsStampImageLoaded(true)}
                      onError={() => setIsStampImageLoaded(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signature-only overlay (when no stamp) */}
          {isSigned && isApproved && !isStamped && (
            <div className="absolute bottom-8 right-8 z-10 pointer-events-none">
              <div className="bg-blue-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                  <FileCheck size={16} />
                  <span className="font-bold text-sm">SIGNED</span>
                </div>
                <div className="text-[10px] text-white/80 text-center">
                  {document.signed_by_name || 'Registrar, High Court'}
                </div>
                <div className="text-[8px] text-white/60 text-center">
                  {document.signed_at ? new Date(document.signed_at).toLocaleDateString() : ''}
                </div>
              </div>
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

          {/* Toggle stamp overlay button */}
          {showStamp && (
            <button
              onClick={() => setShowStampOverlay(!showStampOverlay)}
              className="absolute top-2 right-2 z-20 bg-white/90 hover:bg-white rounded-lg px-2 py-1 text-xs font-medium text-stone-600 shadow-md border border-stone-200 transition"
            >
              {showStampOverlay ? 'Hide Stamp' : 'Show Stamp'}
            </button>
          )}
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
          : 'w-full max-w-6xl h-[90vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 bg-stone-50/50 rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="rounded-lg bg-[#c9a84c]/10 p-2 flex-shrink-0">
              <FileText size={18} className="text-[#c9a84c]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-stone-800 truncate">{document.subject}</h3>
              <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                <span className="font-mono">{document.ref}</span>
                <span className="text-stone-300">•</span>
                <span>{fileTypeLabel}</span>
                {document.file_size && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span>{formatFileSize(document.file_size)}</span>
                  </>
                )}
                {isStamped && isApproved && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      <Stamp size={10} />
                      Stamped
                    </span>
                  </>
                )}
                {isSigned && isApproved && !isStamped && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      <FileCheck size={10} />
                      Signed
                    </span>
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

        {/* Preview Body */}
        <div className="flex-1 min-h-0 overflow-hidden bg-stone-100 relative">
          {renderPreviewContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2.5 bg-stone-50/50 rounded-b-xl flex-shrink-0">
          <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
            <span>Status:</span>
            <StatusBadge status={document.status} />
            
            {isStamped && isApproved && (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <Stamp size={12} />
                Stamped by {document.stamped_by_name || 'Registrar'}
              </span>
            )}
            
            {isSigned && isApproved && !isStamped && (
              <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                <FileCheck size={12} />
                Signed by {document.signed_by_name || 'Registrar'}
              </span>
            )}

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
            {isStamped && isApproved && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <ExternalLink size={14} />
                View Stamped PDF
              </a>
            )}
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

export default HelpdeskDocs;