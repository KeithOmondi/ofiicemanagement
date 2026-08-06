// src/features/conference/pages/HelpdeskConference.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchConferences,
  deleteConference,
  submitConference,
  approveConference,
  returnConference,
  completeConference,
  cancelConference,
  setConferenceFilters,
  resetConferenceFilters,
  clearConferenceError,
  clearConferenceSuccess,
  selectAllConferences,
  selectConferenceListLoading,
  selectConferenceError,
  selectConferenceSuccess,
  selectConferenceFilters,
  selectConferencePagination,
  selectConferenceActionLoading,
  type ConferenceRequest,
} from '../../store/slices/conferenceSlice';
import {
  getConferenceStatusLabel,
  getConferenceStatusColor,
  getConferenceStatusDotColor,
  formatConferenceDate,
  isConferenceEditable,
  canSubmitConference,
  canApproveConference,
  canCompleteConference,
  canCancelConference,
  canReturnConference,
  canDeleteConference,
  isConferenceOngoing,
  isConferenceUpcoming,
  isConferencePast,
  getConferenceDuration,
  getConferenceStatusOptions,
  type ConferenceStatus,
} from '../../types/conference.types';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  X,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarCheck,
  CalendarX,
} from 'lucide-react';
import { ConferenceModal } from '../../components/modals/ConferenceModal';

// ─── Components ──────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ConferenceStatus }> = ({ status }) => {
  const color = getConferenceStatusColor(status);
  const dotColor = getConferenceStatusDotColor(status);
  const label = getConferenceStatusLabel(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};

const StatusFilterDropdown: React.FC<{
  value: ConferenceStatus | '';
  onChange: (value: ConferenceStatus | '') => void;
}> = ({ value, onChange }) => {
  const options = getConferenceStatusOptions();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ConferenceStatus | '')}
      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
    >
      <option value="">All Statuses</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const HelpdeskConference: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // ─── Selectors ──────────────────────────────────────────────────────────────
  const conferences = useAppSelector(selectAllConferences);
  const loading = useAppSelector(selectConferenceListLoading);
  const error = useAppSelector(selectConferenceError);
  const success = useAppSelector(selectConferenceSuccess);
  const filters = useAppSelector(selectConferenceFilters);
  const pagination = useAppSelector(selectConferencePagination);
  const actionLoading = useAppSelector(selectConferenceActionLoading);

  // ─── Local State ────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConference, setSelectedConference] = useState<ConferenceRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchConferences(filters));
  }, [dispatch, filters]);

  // Handle success/error messages
  useEffect(() => {
    if (success) {
      dispatch(clearConferenceSuccess());
    }
    if (error) {
      toast.error(error);
      dispatch(clearConferenceError());
    }
  }, [success, error, dispatch]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  // Filter conferences client-side by search term (searching in particulars)
  const getFilteredConferences = useCallback(() => {
    if (!searchTerm.trim()) {
      return conferences;
    }
    const term = searchTerm.toLowerCase().trim();
    return conferences.filter(conf => 
      conf.particulars.toLowerCase().includes(term)
    );
  }, [conferences, searchTerm]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Search is handled client-side via getFilteredConferences
      // No API call needed since we filter on the client
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleFilterChange = useCallback(
    (key: keyof typeof filters, value: string | number | undefined) => {
      dispatch(setConferenceFilters({ [key]: value, page: 1 }));
    },
    [dispatch]
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    dispatch(resetConferenceFilters());
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      dispatch(setConferenceFilters({ page: newPage }));
    }
  };

  const handleRefresh = () => {
    dispatch(fetchConferences(filters));
  };

  // ─── Modal Handlers ────────────────────────────────────────────────────────

  const handleCreate = () => {
    setEditingId(null);
    setShowModal(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleModalSuccess = () => {
    dispatch(fetchConferences(filters));
  };

  // ─── Action Handlers ───────────────────────────────────────────────────────

  const handleSubmitForApproval = async (id: string) => {
    if (!window.confirm('Submit this conference request for approval?')) return;
    try {
      await dispatch(submitConference(id)).unwrap();
      toast.success('Conference request submitted for approval');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit');
    }
  };

  const handleApprove = async (id: string) => {
    const comments = window.prompt('Enter approval comments (optional):');
    if (comments === null) return;
    try {
      await dispatch(approveConference({ id, data: { comments: comments || undefined } })).unwrap();
      toast.success('Conference request approved');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to approve');
    }
  };

  const handleReturn = async (id: string) => {
    const reason = window.prompt('Enter reason for returning:');
    if (!reason || reason.trim() === '') return;
    try {
      await dispatch(returnConference({ id, data: { reason: reason.trim() } })).unwrap();
      toast.success('Conference request returned');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to return');
    }
  };

  const handleComplete = async (id: string) => {
    const feedback = window.prompt('Enter completion feedback (optional):');
    if (feedback === null) return;
    try {
      await dispatch(completeConference({ id, data: { feedback: feedback || undefined } })).unwrap();
      toast.success('Conference marked as completed');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to complete');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = window.prompt('Enter cancellation reason:');
    if (!reason || reason.trim() === '') return;
    try {
      await dispatch(cancelConference({ id, data: { reason: reason.trim() } })).unwrap();
      toast.success('Conference cancelled');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to cancel');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this conference request?')) return;
    try {
      await dispatch(deleteConference(id)).unwrap();
      toast.success('Conference request deleted');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete');
    }
  };

  const handleViewDetails = (conference: ConferenceRequest) => {
    setSelectedConference(conference);
    setShowDetailModal(true);
  };

  // ─── Render Helpers ────────────────────────────────────────────────────────

  const renderActionButtons = (conference: ConferenceRequest) => {
    const { id, status } = conference;
    const isLoading = actionLoading[`submit-${id}`] || 
                     actionLoading[`approve-${id}`] ||
                     actionLoading[`return-${id}`] ||
                     actionLoading[`complete-${id}`] ||
                     actionLoading[`cancel-${id}`] ||
                     actionLoading[`delete-${id}`];

    if (isLoading) {
      return <Loader2 size={16} className="animate-spin text-stone-400" />;
    }

    return (
      <div className="flex items-center gap-1">
        {/* View */}
        <button
          onClick={() => handleViewDetails(conference)}
          className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          title="View Details"
        >
          <Eye size={16} />
        </button>

        {/* Edit - Draft or Pending */}
        {isConferenceEditable(status) && (
          <button
            onClick={() => handleEdit(id)}
            className="rounded p-1 text-blue-400 hover:bg-blue-50 hover:text-blue-600"
            title="Edit"
          >
            <Edit size={16} />
          </button>
        )}

        {/* Submit - Draft only */}
        {canSubmitConference(status) && (
          <button
            onClick={() => handleSubmitForApproval(id)}
            className="rounded p-1 text-amber-400 hover:bg-amber-50 hover:text-amber-600"
            title="Submit for Approval"
          >
            <Send size={16} />
          </button>
        )}

        {/* Approve - Pending only (Super Admin) */}
        {canApproveConference(status) && (
          <button
            onClick={() => handleApprove(id)}
            className="rounded p-1 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
            title="Approve"
          >
            <CheckCircle size={16} />
          </button>
        )}

        {/* Return - Pending only (Super Admin) */}
        {canReturnConference(status) && (
          <button
            onClick={() => handleReturn(id)}
            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Return"
          >
            <XCircle size={16} />
          </button>
        )}

        {/* Complete - Approved only */}
        {canCompleteConference(status) && (
          <button
            onClick={() => handleComplete(id)}
            className="rounded p-1 text-blue-400 hover:bg-blue-50 hover:text-blue-600"
            title="Mark as Completed"
          >
            <CalendarCheck size={16} />
          </button>
        )}

        {/* Cancel - Draft, Pending, or Approved */}
        {canCancelConference(status) && (
          <button
            onClick={() => handleCancel(id)}
            className="rounded p-1 text-orange-400 hover:bg-orange-50 hover:text-orange-600"
            title="Cancel"
          >
            <CalendarX size={16} />
          </button>
        )}

        {/* Delete - Draft, Pending, or Rejected */}
        {canDeleteConference(status) && (
          <button
            onClick={() => handleDelete(id)}
            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  };

  const renderStatusIndicator = (conference: ConferenceRequest) => {
    const { start_date, end_date, status } = conference;
    
    if (status === 'cancelled') {
      return <span className="text-xs text-stone-400">Cancelled</span>;
    }
    if (status === 'completed') {
      return <span className="text-xs text-blue-600">Completed</span>;
    }
    if (status === 'rejected') {
      return <span className="text-xs text-red-600">Rejected</span>;
    }
    if (status === 'approved') {
      if (isConferenceOngoing(start_date, end_date)) {
        return <span className="text-xs text-emerald-600 font-medium">Ongoing</span>;
      }
      if (isConferenceUpcoming(start_date)) {
        return <span className="text-xs text-amber-600 font-medium">Upcoming</span>;
      }
      if (isConferencePast(end_date)) {
        return <span className="text-xs text-stone-500">Past</span>;
      }
    }
    return null;
  };

  // Get filtered conferences based on search term
  const displayedConferences = getFilteredConferences();

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1a3d1c]">Conference Requests</h1>
            <p className="text-sm text-stone-500">
              Manage conference requests for judicial events and training
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
          >
            <Plus size={18} />
            New Request
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by particulars..."
              className="w-full rounded-md border border-stone-300 pl-9 pr-8 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              showFilters
                ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#1a3d1c]'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {Object.values(filters).some((v) => v !== undefined && v !== '' && v !== 1 && v !== 20) && (
              <span className="ml-1 rounded-full bg-[#c9a84c] px-1.5 py-0.5 text-[10px] font-bold text-[#1a3d1c]">
                !
              </span>
            )}
          </button>

          <button
            onClick={handleRefresh}
            className="rounded-md border border-stone-300 bg-white p-2 text-stone-600 hover:bg-stone-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
            <StatusFilterDropdown
              value={filters.status || ''}
              onChange={(value) => handleFilterChange('status', value || undefined)}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-500">Sort:</span>
              <select
                value={filters.sort_by || 'serial_number'}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
              >
                <option value="serial_number">Serial Number</option>
                <option value="created_at">Created Date</option>
                <option value="updated_at">Updated Date</option>
                <option value="start_date">Start Date</option>
                <option value="end_date">End Date</option>
                <option value="status">Status</option>
              </select>
              <select
                value={filters.sort_order || 'DESC'}
                onChange={(e) => handleFilterChange('sort_order', e.target.value as 'ASC' | 'DESC')}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
              >
                <option value="DESC">Descending</option>
                <option value="ASC">Ascending</option>
              </select>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={32} className="animate-spin text-[#c9a84c]" />
          </div>
        ) : displayedConferences.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-stone-200 bg-white">
            <Calendar size={48} className="text-stone-300" />
            <p className="mt-4 text-sm text-stone-500">
              {searchTerm ? 'No conferences match your search' : 'No conference requests found'}
            </p>
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
            >
              <Plus size={16} />
              Create your first request
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Particulars
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Dates
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      PAX
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {displayedConferences.map((conference) => (
                    <tr key={conference.id} className="hover:bg-stone-50/50 transition">
                      <td className="px-4 py-3">
                        <span className="font-medium text-stone-600">
                          {conference.serial_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[300px]">
                          <p className="text-stone-800" title={conference.particulars}>
                            {conference.particulars.length > 100 
                              ? conference.particulars.substring(0, 100) + '...' 
                              : conference.particulars}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <p>{formatConferenceDate(conference.start_date)}</p>
                          <p className="text-stone-400">→ {formatConferenceDate(conference.end_date)}</p>
                          <p className="text-[10px] text-stone-400">
                            {getConferenceDuration(conference.start_date, conference.end_date)} days
                          </p>
                          {renderStatusIndicator(conference)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Users size={14} className="text-stone-400" />
                          <span>{conference.number_of_pax}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={conference.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          {renderActionButtons(conference)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
                <div className="text-xs text-stone-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="rounded border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-stone-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ConferenceModal
        isOpen={showModal}
        onClose={handleModalClose}
        editingId={editingId}
        onSuccess={handleModalSuccess}
      />

      {/* Detail Modal */}
      {showDetailModal && selectedConference && (
        <ConferenceDetailModal
          conference={selectedConference}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedConference(null);
          }}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedConference.id);
          }}
        />
      )}
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface ConferenceDetailModalProps {
  conference: ConferenceRequest;
  onClose: () => void;
  onEdit: () => void;
}

const ConferenceDetailModal: React.FC<ConferenceDetailModalProps> = ({
  conference,
  onClose,
  onEdit,
}) => {
  const dispatch = useAppDispatch();
  const actionLoading = useAppSelector(selectConferenceActionLoading);

  const handleSubmit = () => {
    dispatch(submitConference(conference.id));
    onClose();
  };

  const handleApprove = () => {
    const comments = window.prompt('Enter approval comments (optional):');
    if (comments === null) return;
    dispatch(approveConference({ id: conference.id, data: { comments: comments || undefined } }));
    onClose();
  };

  const handleReturn = () => {
    const reason = window.prompt('Enter reason for returning:');
    if (!reason || reason.trim() === '') return;
    dispatch(returnConference({ id: conference.id, data: { reason: reason.trim() } }));
    onClose();
  };

  const handleComplete = () => {
    const feedback = window.prompt('Enter completion feedback (optional):');
    if (feedback === null) return;
    dispatch(completeConference({ id: conference.id, data: { feedback: feedback || undefined } }));
    onClose();
  };

  const handleCancel = () => {
    const reason = window.prompt('Enter cancellation reason:');
    if (!reason || reason.trim() === '') return;
    dispatch(cancelConference({ id: conference.id, data: { reason: reason.trim() } }));
    onClose();
  };

  const handleDelete = () => {
    if (!window.confirm('Are you sure you want to delete this conference request?')) return;
    dispatch(deleteConference(conference.id));
    onClose();
  };

  const isLoading = actionLoading[`submit-${conference.id}`] ||
                   actionLoading[`approve-${conference.id}`] ||
                   actionLoading[`return-${conference.id}`] ||
                   actionLoading[`complete-${conference.id}`] ||
                   actionLoading[`cancel-${conference.id}`] ||
                   actionLoading[`delete-${conference.id}`];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-6 py-4">
          <h3 className="text-lg font-semibold text-[#1a3d1c]">Conference Details</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Bar */}
          <div className="flex items-center justify-between rounded-lg bg-stone-50 p-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={conference.status} />
              <span className="text-xs text-stone-400">#{conference.serial_number}</span>
              <span className="text-xs text-stone-400">ID: {conference.id.slice(0, 8)}</span>
            </div>
            <div className="text-xs text-stone-400">
              Created: {formatConferenceDate(conference.created_at)}
            </div>
          </div>

          {/* Details Grid */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Particulars</label>
            <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{conference.particulars}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Start Date</label>
              <p className="text-sm text-stone-800">{formatConferenceDate(conference.start_date)}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">End Date</label>
              <p className="text-sm text-stone-800">{formatConferenceDate(conference.end_date)}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Participants</label>
            <p className="text-sm text-stone-800 flex items-center gap-2">
              <Users size={16} className="text-stone-400" />
              {conference.number_of_pax}
            </p>
          </div>

          <div className="border-t border-stone-100 pt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Created By</label>
            <p className="text-sm text-stone-800">{conference.created_by_name}</p>
            <p className="text-xs text-stone-400">Updated: {formatConferenceDate(conference.updated_at)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 border-t border-stone-100 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {isConferenceEditable(conference.status) && (
                <button
                  onClick={onEdit}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  disabled={isLoading}
                >
                  <Edit size={16} />
                  Edit
                </button>
              )}

              {canSubmitConference(conference.status) && (
                <button
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
                  disabled={isLoading}
                >
                  <Send size={16} />
                  Submit
                </button>
              )}

              {canApproveConference(conference.status) && (
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                  disabled={isLoading}
                >
                  <CheckCircle size={16} />
                  Approve
                </button>
              )}

              {canReturnConference(conference.status) && (
                <button
                  onClick={handleReturn}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                  disabled={isLoading}
                >
                  <XCircle size={16} />
                  Return
                </button>
              )}

              {canCompleteConference(conference.status) && (
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  disabled={isLoading}
                >
                  <CalendarCheck size={16} />
                  Complete
                </button>
              )}

              {canCancelConference(conference.status) && (
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100"
                  disabled={isLoading}
                >
                  <CalendarX size={16} />
                  Cancel
                </button>
              )}

              {canDeleteConference(conference.status) && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                  disabled={isLoading}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpdeskConference;