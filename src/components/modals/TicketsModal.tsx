import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  submitTicketForApproval,
  approveTicket,
  rejectTicket,
  bookTicket,
  cancelTicket,
  completeTicket,
  clearSelectedTicket,
  clearError,
  selectAllTickets,
  selectSelectedTicket,
  selectTicketStatus,
  selectTicketError,
  selectTicketPagination,
  selectTicketActions,
  addTicketComment,
  fetchTicketById,
} from '../../store/slices/ticketSlice';
import { selectCurrentUser } from '../../store/slices/userSlice';
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketFilters,
  TravelClass,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketWithHistory,
} from '../../types/tickets.types';
import { format } from 'date-fns';
import {
  X,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Plane,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import TicketFormModal from '../tickets/TicketFormModal';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TicketStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  booked: 'Booked',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  pending_approval: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  booked: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700',
};

const TRAVEL_CLASS_LABELS: Record<TravelClass, string> = {
  economy: 'Economy',
  premium_economy: 'Premium Economy',
  business: 'Business',
  first: 'First Class',
};

const PAGE_SIZE = 10;

// ─── UI Helpers ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_COLORS[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
);

const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority]}`}
  >
    {PRIORITY_LABELS[priority]}
  </span>
);

const Spinner: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <Loader2 className={`animate-spin ${className}`} />
);

// ─── Ticket Detail View ────────────────────────────────────────────────────

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketWithHistory | null;
  onRefresh: () => void;
  isAdmin: boolean;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onRefresh,
  isAdmin,
}) => {
  const dispatch = useAppDispatch();
  const actions = useAppSelector(selectTicketActions);

  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const canApprove = isAdmin && ticket?.status === 'pending_approval';
  const canBook = isAdmin && ticket?.status === 'approved';
  const canComplete = isAdmin && ticket?.status === 'booked';
  const canCancel = isAdmin && (ticket?.status === 'pending_approval' || ticket?.status === 'approved');

  // ── Shared comment submission logic ──────────────────────────────────────
  const submitComment = useCallback(async () => {
    if (!ticket || !newComment.trim()) return;
    await dispatch(addTicketComment({
      id: ticket.id,
      comment: newComment.trim(),
      isInternal,
    }));
    setNewComment('');
    onRefresh();
  }, [ticket, newComment, isInternal, dispatch, onRefresh]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    submitComment();
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  };

  const handleApprove = async () => {
    if (!ticket) return;
    await dispatch(approveTicket({ id: ticket.id }));
    onRefresh();
    toast.success('Ticket approved successfully');
  };

  const handleReject = async () => {
    if (!ticket) return;
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    await dispatch(rejectTicket({ id: ticket.id, reason: reason.trim() || 'No reason provided' }));
    onRefresh();
    toast.success('Ticket rejected');
  };

  const handleBook = async () => {
    if (!ticket) return;
    const bookingRef = prompt('Enter booking reference:');
    if (!bookingRef) return;
    await dispatch(bookTicket({ id: ticket.id, booking_reference: bookingRef.trim() }));
    onRefresh();
    toast.success('Ticket booked successfully');
  };

  const handleComplete = async () => {
    if (!ticket) return;
    if (window.confirm('Mark this ticket as completed?')) {
      await dispatch(completeTicket(ticket.id));
      onRefresh();
      toast.success('Ticket marked as completed');
    }
  };

  const handleCancel = async () => {
    if (!ticket) return;
    if (window.confirm('Cancel this ticket?')) {
      await dispatch(cancelTicket(ticket.id));
      onRefresh();
      toast.success('Ticket cancelled');
    }
  };

  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600"
            >
              <ArrowLeft size={20} />
            </button>
            <h3 className="text-sm font-semibold text-stone-900 truncate">
              {ticket.title}
            </h3>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          {/* Ticket Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-stone-400 font-medium">Reference</p>
              <p className="text-sm font-semibold text-stone-800">{ticket.reference_no}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Department</p>
              <p className="text-sm text-stone-700">{ticket.department_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Created By</p>
              <p className="text-sm text-stone-700">{ticket.created_by_name}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Travel Date</p>
              <p className="text-sm text-stone-700">{format(new Date(ticket.date_of_travel), 'dd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Return Date</p>
              <p className="text-sm text-stone-700">{ticket.return_date ? format(new Date(ticket.return_date), 'dd MMM yyyy') : 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Passengers</p>
              <p className="text-sm text-stone-700">{ticket.number_of_passengers}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Departure</p>
              <p className="text-sm text-stone-700">{ticket.departure_from}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Destination</p>
              <p className="text-sm text-stone-700">{ticket.destination}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">Travel Class</p>
              <p className="text-sm text-stone-700">{TRAVEL_CLASS_LABELS[ticket.travel_class || 'economy']}</p>
            </div>
            {ticket.booking_reference && (
              <div>
                <p className="text-xs text-stone-400 font-medium">Booking Reference</p>
                <p className="text-sm font-semibold text-blue-600">{ticket.booking_reference}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {ticket.description && (
            <div>
              <p className="text-xs text-stone-400 font-medium mb-1">Description</p>
              <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200">
                {ticket.description}
              </p>
            </div>
          )}

          {/* Special Requests & Remarks */}
          {(ticket.special_requests || ticket.remarks) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticket.special_requests && (
                <div>
                  <p className="text-xs text-stone-400 font-medium mb-1">Special Requests</p>
                  <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200">
                    {ticket.special_requests}
                  </p>
                </div>
              )}
              {ticket.remarks && (
                <div>
                  <p className="text-xs text-stone-400 font-medium mb-1">Remarks</p>
                  <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-200">
                    {ticket.remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {(canApprove || canBook || canComplete || canCancel) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
              {canApprove && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={actions.approving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actions.approving ? <Spinner /> : <CheckCircle size={16} />}
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actions.rejecting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {actions.rejecting ? <Spinner /> : <XCircle size={16} />}
                    Reject
                  </button>
                </>
              )}
              {canBook && (
                <button
                  onClick={handleBook}
                  disabled={actions.booking}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {actions.booking ? <Spinner /> : <Plane size={16} />}
                  Book Ticket
                </button>
              )}
              {canComplete && (
                <button
                  onClick={handleComplete}
                  disabled={actions.completing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actions.completing ? <Spinner /> : <CheckCircle size={16} />}
                  Complete
                </button>
              )}
              {canCancel && (
                <button
                  onClick={handleCancel}
                  disabled={actions.cancelling}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {actions.cancelling ? <Spinner /> : <XCircle size={16} />}
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <MessageSquare size={16} />
                Comments ({ticket.comments.length})
              </h4>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
              >
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showHistory ? 'Hide History' : 'Show Approval History'}
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-stone-400 italic">No comments yet.</p>
              ) : (
                ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-lg border ${comment.is_internal ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-200'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-stone-700">{comment.user_name}</span>
                        {comment.is_internal && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                            Internal
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {format(new Date(comment.created_at), 'dd MMM yyyy hh:mm aa')}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 mt-1">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleCommentKeyDown}
                placeholder="Add a comment..."
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
              />
              <label className="flex items-center gap-1.5 text-xs text-stone-500 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-stone-300 text-[#1a3d1c] focus:ring-[#1a3d1c]"
                />
                Internal
              </label>
              <button
                type="submit"
                disabled={!newComment.trim() || actions.submitting}
                className="flex items-center gap-1.5 rounded-lg bg-[#1a3d1c] px-3 py-2 text-sm font-medium text-white hover:bg-[#2d5c30] disabled:opacity-50"
              >
                {actions.submitting ? <Spinner className="h-3.5 w-3.5" /> : <Send size={14} />}
                Send
              </button>
            </form>
          </div>

          {/* Approval History */}
          {showHistory && ticket.approval_history.length > 0 && (
            <div className="border-t border-stone-100 pt-4">
              <h4 className="text-sm font-semibold text-stone-800 mb-3">Approval History</h4>
              <div className="space-y-2">
                {ticket.approval_history.map((step) => (
                  <div key={step.id} className="flex items-start gap-3 p-2 rounded-lg bg-stone-50">
                    <div className="flex-shrink-0 w-6 text-center">
                      {step.action === 'submitted' && <Send size={14} className="text-yellow-500" />}
                      {step.action === 'approved' && <CheckCircle size={14} className="text-green-500" />}
                      {step.action === 'rejected' && <XCircle size={14} className="text-red-500" />}
                      {step.action === 'booked' && <Plane size={14} className="text-blue-500" />}
                      {step.action === 'cancelled' && <XCircle size={14} className="text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-700">
                          {step.from_user_name} — {step.action.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {format(new Date(step.created_at), 'dd MMM yyyy hh:mm aa')}
                        </span>
                      </div>
                      {step.comments && (
                        <p className="text-xs text-stone-500 mt-0.5">{step.comments}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main TicketsModal Component ──────────────────────────────────────────

const TicketsModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const tickets = useAppSelector(selectAllTickets);
  const selectedTicket = useAppSelector(selectSelectedTicket);
  const status = useAppSelector(selectTicketStatus);
  const error = useAppSelector(selectTicketError);
  const pagination = useAppSelector(selectTicketPagination);
  const actions = useAppSelector(selectTicketActions);
  const currentUser = useAppSelector(selectCurrentUser);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [page, setPage] = useState(1);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const searchRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'dept_head';

  // ── Fetch tickets ──────────────────────────────────────────────────────────

  const fetchData = useCallback(() => {
    const params: TicketFilters = {
      page,
      limit: PAGE_SIZE,
      sort_by: 'created_at',
      sort_order: 'DESC',
      for_my_action: !isAdmin,
    };
    if (searchRef.current) params.search = searchRef.current;
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    dispatch(fetchTickets(params));
  }, [dispatch, page, statusFilter, priorityFilter, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // ── Search handler ─────────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearch(value);
    searchRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 400);
  };

  // ── Create / Update ──────────────────────────────────────────────────────

  const handleCreate = () => {
    setEditingTicket(null);
    setShowFormModal(true);
  };

  const handleEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setShowFormModal(true);
  };

  const handleSave = async (data: CreateTicketRequest) => {
    setIsSaving(true);
    try {
      if (editingTicket) {
        // UpdateTicketRequest has no `is_draft` field — strip it before sending.
        const { is_draft, ...updateData } = data;
        void is_draft; // intentionally discarded, not needed by the update endpoint
        const payload: UpdateTicketRequest = updateData;
        await dispatch(updateTicket({ id: editingTicket.id, data: payload })).unwrap();
        toast.success('Ticket updated successfully');
      } else {
        await dispatch(createTicket(data)).unwrap();
        toast.success('Ticket created successfully');
      }
      setShowFormModal(false);
      setEditingTicket(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this ticket? This action cannot be undone.')) return;
    try {
      await dispatch(deleteTicket(id)).unwrap();
      toast.success('Ticket deleted');
      if (selectedTicketId === id) setSelectedTicketId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete ticket');
    }
  };

  const handleViewDetails = (id: string) => {
    setSelectedTicketId(id);
    dispatch(fetchTicketById(id));
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      await dispatch(submitTicketForApproval(id)).unwrap();
      toast.success('Ticket submitted for approval');
      fetchData();
    } catch {
      toast.error('Failed to submit ticket');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isLoading = status === 'loading';

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* ── Ticket Detail Modal ────────────────────────────────────────────── */}
      <TicketDetailModal
        isOpen={!!selectedTicketId && !!selectedTicket}
        onClose={() => {
          setSelectedTicketId(null);
          dispatch(clearSelectedTicket());
        }}
        ticket={selectedTicket}
        onRefresh={() => {
          if (selectedTicketId) {
            dispatch(fetchTicketById(selectedTicketId));
          }
          fetchData();
        }}
        isAdmin={isAdmin}
      />

      {/* ── Ticket Form Modal ──────────────────────────────────────────────── */}
      {/* `key` forces a remount when switching tickets (or create vs edit), so
          the lazy useState initializer inside TicketFormModal always runs
          against the correct `ticket` value — no sync effect needed. */}
      <TicketFormModal
        key={editingTicket?.id ?? 'new'}
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingTicket(null);
        }}
        ticket={editingTicket}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Travel Tickets</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {pagination.total > 0 ? `${pagination.total} ticket${pagination.total !== 1 ? 's' : ''}` : 'No tickets'}
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1a3d1c] rounded-lg hover:bg-[#2d5c30] transition shadow-sm"
          >
            <Plus size={18} />
            New Ticket
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
                placeholder="Search tickets..."
                className="pl-9 pr-3 py-2 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TicketStatus | '');
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as TicketPriority | '');
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
            >
              <option value="">All Priority</option>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <button
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
                setSearch('');
                searchRef.current = '';
                setPage(1);
              }}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Ticket</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Priority</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Travel</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Created</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Spinner className="h-6 w-6 text-[#1a3d1c] mx-auto" />
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400 text-sm">
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 truncate max-w-[200px]">
                            {ticket.title}
                          </span>
                          <span className="text-xs text-slate-400">
                            {ticket.reference_no}
                          </span>
                          {ticket.department_name && (
                            <span className="text-xs text-slate-400">{ticket.department_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col text-xs text-slate-600">
                          <span>{ticket.departure_from} → {ticket.destination}</span>
                          <span className="text-slate-400">{format(new Date(ticket.date_of_travel), 'dd MMM yyyy')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {format(new Date(ticket.created_at), 'dd MMM yyyy')}
                        <br />
                        <span className="text-slate-400">{ticket.created_by_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewDetails(ticket.id)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {ticket.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleEdit(ticket)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md hover:bg-amber-50 transition"
                                title="Edit"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleSubmitForApproval(ticket.id)}
                                disabled={actions.submitting}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition disabled:opacity-30"
                                title="Submit for Approval"
                              >
                                {actions.submitting ? <Spinner className="h-3.5 w-3.5" /> : <Send size={16} />}
                              </button>
                              <button
                                onClick={() => handleDelete(ticket.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-500">
                {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronDown size={16} className="rotate-90" />
                </button>
                <span className="text-xs text-slate-600 px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronDown size={16} className="-rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketsModal;