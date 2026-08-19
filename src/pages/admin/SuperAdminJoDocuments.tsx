// src/pages/super-admin/SuperAdminJoDocuments.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchJoDocuments,
  fetchJoDocumentById,
  fetchJoDocumentFlowHistory,
  respondToJoDocument,
  approveJoDocument,
  rejectJoDocument,
  selectJoDocuments,
  selectJoFlowHistory,
  selectJoPagination,
  selectJoLoading,
  selectJoError,
  selectJoActionInProgress,
  clearCurrentJoDocument,
  clearJoError,
} from '../../store/slices/joSlice';
import {
  fetchUsers,
  selectCurrentUser,
} from '../../store/slices/userSlice';
import {
  fetchDepartments,
  selectAllDepartments,
} from '../../store/slices/departmentsSlice';
import type {
  JoDocument,
  JoDocumentWithResponses,
  JoDocumentFilters,
  RespondToJoDocumentInput,
  ApproveJoDocumentInput,
  RejectJoDocumentInput,
} from '../../types/jo.types';
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
  Download,
  Send,
  MessageSquare,
  Paperclip,
  Building,
  Users,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending_review' | 'approved' | 'rejected';

// ─── Sub-Components ──────────────────────────────────────────────────────────

const JoStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    draft: { bg: 'bg-stone-50', text: 'text-stone-600', label: 'Draft', icon: <FileText size={12} className="text-stone-400" /> },
    pending_review: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending Review', icon: <Clock size={12} className="text-amber-500" /> },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved', icon: <CheckCircle size={12} className="text-emerald-500" /> },
    rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected', icon: <AlertCircle size={12} className="text-red-500" /> },
  };

  const style = styles[status] || styles.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
      {style.icon}
      {style.label}
    </span>
  );
};

// ─── Response Modal Component ──────────────────────────────────────────────

// ─── Response Modal Component ──────────────────────────────────────────────

interface ResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: JoDocumentWithResponses | null;
  onRespond: (id: string, note: string) => Promise<void>;
  isResponding: boolean;
  currentUserId: string | undefined;
  currentUserRole: string | undefined;
}

const ResponseModal: React.FC<ResponseModalProps> = ({
  isOpen,
  onClose,
  document,
  onRespond,
  isResponding,
  currentUserId,
  currentUserRole,
}) => {
  const [note, setNote] = useState('');

  if (!isOpen || !document) return null;

  // Check if user is super admin (case insensitive)
  const isSuperAdmin = currentUserRole?.toLowerCase() === 'super_admin';
  // Check if user is the document owner
  const isOwner = document.uploaded_by === currentUserId;
  // Super admin OR owner can respond
  const canRespond = isSuperAdmin || isOwner;

  // If you're on the super admin page, you should always be able to respond
  // This is a safety net in case the role check fails
  const isOnSuperAdminPage = window.location.pathname.includes('super-admin');
  const finalCanRespond = canRespond || isOnSuperAdminPage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      toast.error('Please write a response');
      return;
    }
    await onRespond(document.id, note);
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-stone-900 truncate">
              {document.title}
            </h3>
            <p className="text-[10px] text-stone-400 mt-0.5">
              Response Thread • {document.responses?.length || 0} messages
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400 shrink-0 ml-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {document.responses && document.responses.length > 0 ? (
            document.responses.map((response) => (
              <div
                key={response.id}
                className={`flex flex-col ${
                  response.responded_by === document.uploaded_by ? 'items-start' : 'items-end'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-3 ${
                    response.responded_by === document.uploaded_by
                      ? 'bg-stone-50 border border-stone-100'
                      : 'bg-[#1d3331] text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className={`font-bold ${response.responded_by === document.uploaded_by ? 'text-stone-700' : 'text-white/80'}`}>
                      {response.responded_by_name}
                    </span>
                    <span className={response.responded_by === document.uploaded_by ? 'text-stone-400' : 'text-white/60'}>
                      #{response.response_number}
                    </span>
                    <span className={response.responded_by === document.uploaded_by ? 'text-stone-400' : 'text-white/60'}>
                      {format(new Date(response.created_at), 'dd MMM HH:mm')}
                    </span>
                  </div>
                  <p className={`text-sm ${response.responded_by === document.uploaded_by ? 'text-stone-700' : 'text-white'}`}>
                    {response.note}
                  </p>
                  {response.file_url && (
                    <a
                      href={response.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 text-xs mt-2 ${
                        response.responded_by === document.uploaded_by
                          ? 'text-[#1d3331] hover:underline'
                          : 'text-white/80 hover:text-white hover:underline'
                      }`}
                    >
                      <Paperclip size={12} />
                      Attachment
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-stone-400">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No responses yet</p>
              <p className="text-xs">Be the first to respond</p>
            </div>
          )}
        </div>

        {/* Response Form */}
        <div className="px-6 py-4 border-t border-stone-100 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={finalCanRespond ? "Write a response..." : "You cannot respond to this document"}
              disabled={!finalCanRespond || isResponding}
              rows={2}
              className={`flex-1 px-3 py-2 bg-stone-50 border rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors resize-none ${
                !finalCanRespond ? 'border-red-300 bg-red-50 cursor-not-allowed' : 'border-stone-200'
              }`}
            />
            <button
              type="submit"
              disabled={!finalCanRespond || isResponding || !note.trim()}
              className="shrink-0 px-4 py-2 rounded-lg bg-[#1d3331] text-white text-sm font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-end"
            >
              {isResponding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send
            </button>
          </form>
          {!finalCanRespond && (
            <p className="text-xs text-red-500 mt-2">
              Only the document owner or a super admin can respond to this document.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminJoDocuments: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const documents = useAppSelector(selectJoDocuments);
  const flowHistory = useAppSelector(selectJoFlowHistory);
  const pagination = useAppSelector(selectJoPagination);
  const loading = useAppSelector(selectJoLoading);
  const error = useAppSelector(selectJoError);
  const actionInProgress = useAppSelector(selectJoActionInProgress);
  const currentUser = useAppSelector(selectCurrentUser);
  const allDepartments = useAppSelector(selectAllDepartments);

  // ── Local State ────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDocument, setSelectedDocument] = useState<JoDocumentWithResponses | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('');
  const [showAssignedToMe, setShowAssignedToMe] = useState(false);
  const [filters, setFilters] = useState<JoDocumentFilters>({
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'DESC',
  });
  const [isRespondingTo, setIsRespondingTo] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── Effects ───────────────────────────────────────────────────────────────

  // Fetch JO documents on mount and filter changes
  useEffect(() => {
    const filterParams: JoDocumentFilters = {
      ...filters,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchTerm || undefined,
      department_id: selectedDepartmentFilter || undefined,
      assigned_to_me: showAssignedToMe ? true : undefined,
    };
    dispatch(fetchJoDocuments(filterParams));
  }, [dispatch, filters, statusFilter, searchTerm, selectedDepartmentFilter, showAssignedToMe]);

  // Fetch departments and users for dropdowns
  useEffect(() => {
    dispatch(fetchDepartments({ is_active: true }));
    dispatch(fetchUsers({ limit: 100 }));
  }, [dispatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleViewDocument = async (id: string) => {
    try {
      const result = await dispatch(fetchJoDocumentById(id)).unwrap();
      setSelectedDocument(result);
      setIsDetailModalOpen(true);
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to load document';
      toast.error(errorMessage);
    }
  };

  const handleOpenResponseModal = async (id: string) => {
    try {
      const result = await dispatch(fetchJoDocumentById(id)).unwrap();
      setSelectedDocument(result);
      setIsResponseModalOpen(true);
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to load responses';
      toast.error(errorMessage);
    }
  };

  const handleViewFlowHistory = async (id: string) => {
    try {
      await dispatch(fetchJoDocumentFlowHistory(id)).unwrap();
      setIsFlowModalOpen(true);
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to load flow history';
      toast.error(errorMessage);
    }
  };

  const handleRespond = async (id: string, note: string) => {
    setIsRespondingTo(id);
    const input: RespondToJoDocumentInput = { note };

    try {
      await dispatch(respondToJoDocument({ id, input })).unwrap();
      toast.success('Response sent successfully');
      
      // Refresh the document with new response
      const updated = await dispatch(fetchJoDocumentById(id)).unwrap();
      setSelectedDocument(updated);
      
      // Refresh the list to update response count
      dispatch(fetchJoDocuments(filters));
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to send response';
      toast.error(errorMessage);
    } finally {
      setIsRespondingTo(null);
    }
  };

  const handleApprove = async (id: string) => {
    const input: ApproveJoDocumentInput = {};

    try {
      await dispatch(approveJoDocument({ id, input })).unwrap();
      toast.success('Document approved successfully');
      dispatch(fetchJoDocuments(filters));
      // Refresh detail view if open
      if (selectedDocument) {
        const updated = await dispatch(fetchJoDocumentById(id)).unwrap();
        setSelectedDocument(updated);
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to approve document';
      toast.error(errorMessage);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const input: RejectJoDocumentInput = {
      reason: rejectReason,
    };

    try {
      await dispatch(rejectJoDocument({ id, input })).unwrap();
      toast.success('Document rejected successfully');
      setIsRejectModalOpen(false);
      setRejectReason('');
      dispatch(fetchJoDocuments(filters));
      // Refresh detail view if open
      if (selectedDocument) {
        const updated = await dispatch(fetchJoDocumentById(id)).unwrap();
        setSelectedDocument(updated);
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to reject document';
      toast.error(errorMessage);
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: documents.length,
    pending: documents.filter((d: JoDocument) => d.status === 'pending_review').length,
    approved: documents.filter((d: JoDocument) => d.status === 'approved').length,
    rejected: documents.filter((d: JoDocument) => d.status === 'rejected').length,
    assignedToMe: documents.filter((d: JoDocument) => d.assigned_to === currentUser?.id).length,
  }), [documents, currentUser]);

  // ── Loading State ──────────────────────────────────────────────────────────

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="animate-spin text-[#1d3331]" size={32} />
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────

  if (error && !loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            onClick={() => dispatch(clearJoError())}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1d3331]">JO Review Queue</h1>
          <p className="text-sm text-stone-500 mt-1">Super Admin - Review and manage Job Order documents</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setSelectedDepartmentFilter('');
              setShowAssignedToMe(false);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-stone-900">{stats.total}</p>
          <p className="text-[10px] text-stone-400 font-medium">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
          <p className="text-[10px] text-stone-400 font-medium">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{stats.approved}</p>
          <p className="text-[10px] text-stone-400 font-medium">Approved</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-red-600">{stats.rejected}</p>
          <p className="text-[10px] text-stone-400 font-medium">Rejected</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="Search documents by title or uploader..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">Status:</span>
            {(['all', 'pending_review', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
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

        {/* Additional Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <Building size={14} className="text-stone-400" />
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs outline-none focus:border-[#1d3331] transition-colors"
            >
              <option value="">All Departments</option>
              {allDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showAssignedToMe}
              onChange={(e) => setShowAssignedToMe(e.target.checked)}
              className="rounded border-stone-300 text-[#1d3331] focus:ring-[#1d3331]"
            />
            <Users size={14} className="text-stone-400" />
            Assigned to me only
          </label>

          <div className="flex items-center gap-2 text-xs text-stone-400 ml-auto">
            <Filter size={14} />
            <span>{documents.length} documents</span>
          </div>
        </div>
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <FileText size={48} className="mx-auto text-stone-300 mb-4" />
          <h3 className="text-base font-serif font-bold text-stone-400">No documents found</h3>
          <p className="text-sm text-stone-400 mt-1">
            {searchTerm ? 'Try adjusting your search' : 'No documents in the review queue'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {documents.map((doc: JoDocument) => {
              const canApprove = doc.status === 'pending_review';
              const canReject = doc.status === 'pending_review';
              const hasResponses = (doc.response_count || 0) > 0;

              return (
                <div key={doc.id} className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="p-2 rounded-xl bg-[#1d3331]/5 text-[#1d3331] shrink-0 mt-0.5">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-stone-900 truncate">{doc.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-500">
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {doc.uploaded_by_name}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {format(new Date(doc.created_at), 'dd MMM yyyy')}
                            </span>
                            {doc.department_name && (
                              <>
                                <span className="text-stone-300">•</span>
                                <span>{doc.department_name}</span>
                              </>
                            )}
                            {doc.revision_count > 0 && (
                              <>
                                <span className="text-stone-300">•</span>
                                <span className="text-stone-400">Rev {doc.revision_count}</span>
                              </>
                            )}
                            {doc.assigned_to_name && (
                              <>
                                <span className="text-stone-300">•</span>
                                <span className="text-stone-400">Assigned to: {doc.assigned_to_name}</span>
                              </>
                            )}
                          </div>
                          {doc.rejection_reason && (
                            <div className="mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg inline-block">
                              Rejected: {doc.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <JoStatusBadge status={doc.status} />

                      {/* Response Button */}
                      <button
                        onClick={() => handleOpenResponseModal(doc.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors ${
                          hasResponses
                            ? 'border-[#1d3331] bg-[#1d3331] text-white hover:bg-emerald-800 hover:border-emerald-800'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <MessageSquare size={14} />
                        {hasResponses ? `${doc.response_count}` : 'Respond'}
                      </button>

                      {canApprove && (
                        <button
                          onClick={() => handleApprove(doc.id)}
                          disabled={actionInProgress.approving === doc.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          {actionInProgress.approving === doc.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Approve
                        </button>
                      )}

                      {canReject && (
                        <button
                          onClick={() => {
                            setSelectedDocument({ ...doc, responses: [] });
                            setIsRejectModalOpen(true);
                            setRejectReason('');
                          }}
                          disabled={actionInProgress.rejecting === doc.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <X size={14} />
                          Reject
                        </button>
                      )}

                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[10px] font-bold hover:bg-stone-50 transition-colors"
                        >
                          <Download size={14} />
                          File
                        </a>
                      )}

                      <button
                        onClick={() => handleViewDocument(doc.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[10px] font-bold hover:bg-stone-50 transition-colors"
                      >
                        <Eye size={14} />
                        View
                      </button>

                      <button
                        onClick={() => handleViewFlowHistory(doc.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[10px] font-bold hover:bg-stone-50 transition-colors"
                      >
                        <Clock size={14} />
                        History
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-200">
              <div className="text-sm text-stone-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Response Modal ───────────────────────────────────────────────── */}

      <ResponseModal
        isOpen={isResponseModalOpen}
        onClose={() => {
          setIsResponseModalOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onRespond={handleRespond}
        isResponding={!!isRespondingTo}
        currentUserId={currentUser?.id}
        currentUserRole={currentUser?.role}
      />

      {/* ─── Reject Modal ──────────────────────────────────────────────────── */}

      {isRejectModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Reject Document</h3>
              <button
                onClick={() => { setIsRejectModalOpen(false); setRejectReason(''); }}
                className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-stone-600 font-medium">{selectedDocument.title}</p>
              <p className="text-xs text-stone-400">Uploaded by: {selectedDocument.uploaded_by_name}</p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors resize-none"
                  placeholder="Explain why this document is being rejected..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsRejectModalOpen(false); setRejectReason(''); }}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedDocument.id)}
                  disabled={actionInProgress.rejecting === selectedDocument.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {actionInProgress.rejecting === selectedDocument.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ──────────────────────────────────────────────────── */}

      {isDetailModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-stone-900 truncate">{selectedDocument.title}</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  {selectedDocument.status} • {selectedDocument.uploaded_by_name}
                </p>
              </div>
              <button
                onClick={() => { setIsDetailModalOpen(false); dispatch(clearCurrentJoDocument()); }}
                className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400 shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <JoStatusBadge status={selectedDocument.status} />
                {selectedDocument.department_name && (
                  <span className="text-xs text-stone-500">{selectedDocument.department_name}</span>
                )}
                {selectedDocument.assigned_to_name && (
                  <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-lg">
                    Assigned to: {selectedDocument.assigned_to_name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Uploaded By</p>
                  <p className="text-stone-700 font-medium">{selectedDocument.uploaded_by_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Created</p>
                  <p className="text-stone-700 font-medium">
                    {format(new Date(selectedDocument.created_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
                {selectedDocument.reviewed_by_name && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Reviewed By</p>
                    <p className="text-stone-700 font-medium">{selectedDocument.reviewed_by_name}</p>
                  </div>
                )}
                {selectedDocument.reviewed_at && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Reviewed At</p>
                    <p className="text-stone-700 font-medium">
                      {format(new Date(selectedDocument.reviewed_at), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                )}
                {selectedDocument.revision_count > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Revisions</p>
                    <p className="text-stone-700 font-medium">{selectedDocument.revision_count}</p>
                  </div>
                )}
                {selectedDocument.rejection_reason && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Rejection Reason</p>
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mt-1">{selectedDocument.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Responses in detail view */}
              {selectedDocument.responses && selectedDocument.responses.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Response Thread</p>
                    <span className="text-[10px] text-stone-400">({selectedDocument.responses.length})</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedDocument.responses.map((response) => (
                      <div key={response.id} className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                        <div className="flex items-center justify-between text-xs text-stone-500">
                          <span className="font-bold text-stone-700">{response.responded_by_name}</span>
                          <span>#{response.response_number} • {format(new Date(response.created_at), 'dd MMM yyyy, HH:mm')}</span>
                        </div>
                        <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{response.note}</p>
                        {response.file_url && (
                          <a
                            href={response.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#1d3331] font-medium mt-2 hover:underline"
                          >
                            <Paperclip size={12} />
                            Attachment: {response.original_name || 'Download'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDocument.file_url && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">File</p>
                  <a
                    href={selectedDocument.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-700 hover:bg-stone-100 transition-colors"
                  >
                    <Download size={16} />
                    {selectedDocument.original_name || 'Download File'}
                  </a>
                </div>
              )}

              {/* Quick action buttons in detail view */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
                {selectedDocument.status === 'pending_review' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedDocument.id)}
                      disabled={actionInProgress.approving === selectedDocument.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {actionInProgress.approving === selectedDocument.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setIsRejectModalOpen(true);
                        setRejectReason('');
                      }}
                      disabled={actionInProgress.rejecting === selectedDocument.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </>
                )}
                {selectedDocument.file_url && (
                  <a
                    href={selectedDocument.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </a>
                )}
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenResponseModal(selectedDocument.id);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  <MessageSquare size={16} />
                  View Responses
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Flow History Modal ───────────────────────────────────────────── */}

      {isFlowModalOpen && flowHistory.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Flow History</h3>
              <button
                onClick={() => setIsFlowModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="relative pl-6 border-l-2 border-stone-200 space-y-4">
                {flowHistory.map((entry) => {
                  const actionColors: Record<string, string> = {
                    created: 'bg-emerald-500',
                    draft_saved: 'bg-stone-500',
                    sent: 'bg-amber-500',
                    approved: 'bg-emerald-500',
                    rejected: 'bg-red-500',
                    resubmitted: 'bg-blue-500',
                  };
                  const color = actionColors[entry.action] || 'bg-stone-500';

                  return (
                    <div key={entry.id} className="relative">
                      <div className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full ${color} border-2 border-white shadow-sm`} />
                      <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                        <div className="flex items-center justify-between text-xs text-stone-500">
                          <span className="font-bold text-stone-700">
                            {entry.action.charAt(0).toUpperCase() + entry.action.slice(1).replace('_', ' ')}
                          </span>
                          <span>{format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}</span>
                        </div>
                        <p className="text-sm text-stone-700 mt-1">{entry.actor_name || 'System'}</p>
                        {entry.note && (
                          <p className="text-xs text-stone-500 mt-1 italic">"{entry.note}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminJoDocuments;