// src/pages/Helpdesk/HelpdeskTickets.tsx
import React, { useEffect, useState, type JSX } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTickets,
  selectAllTickets,
  selectTicketStatus,
  selectTicketError,
  selectTicketPagination,
  selectTicketFilters,
  selectTicketActions,
  setFilters,
  resetFilters,
  clearError,
  submitTicketForApproval,
  approveTicket,
  rejectTicket,
  returnTicket,
  bookTicket,
  cancelTicket,
  completeTicket,
  deleteTicket,
} from '../../store/slices/ticketSlice';
import type { TicketStatus, TicketPriority, Ticket } from '../../types/tickets.types';
import type { AppDispatch } from '../../store/store';

// ── UI Components ──────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const colors: Record<TicketStatus, string> = {
    draft: 'bg-gray-200 text-gray-700',
    pending_approval: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    booked: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-600',
    completed: 'bg-purple-100 text-purple-800',
  };

  const labels: Record<TicketStatus, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    booked: 'Booked',
    cancelled: 'Cancelled',
    completed: 'Completed',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
      {labels[status]}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => {
  const colors: Record<TicketPriority, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority]}`}>
      {priority.toUpperCase()}
    </span>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

const HelpdeskTickets: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tickets = useSelector(selectAllTickets);
  const status = useSelector(selectTicketStatus);
  const error = useSelector(selectTicketError);
  const pagination = useSelector(selectTicketPagination);
  const filters = useSelector(selectTicketFilters);
  const ticketActions = useSelector(selectTicketActions);

  // ── Local State ──────────────────────────────────────────────────────────────

  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchTickets(filters));
  }, [dispatch, filters]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSearch = () => {
    dispatch(setFilters({ search: searchTerm, page: 1 }));
  };

  const handleFilterChange = () => {
    dispatch(setFilters({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setFilters({ page: newPage }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    dispatch(resetFilters());
  };

  const handleSubmit = async (id: string) => {
    if (window.confirm('Submit this ticket for approval?')) {
      await dispatch(submitTicketForApproval(id));
    }
  };

  const handleApprove = async (id: string) => {
    const comments = prompt('Approval comments (optional):');
    await dispatch(approveTicket({ id, comments: comments || undefined }));
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (reason) {
      await dispatch(rejectTicket({ id, reason }));
    }
  };

  const handleReturn = async (id: string) => {
    const reason = prompt('Return reason:');
    if (reason) {
      const instructions = prompt('Additional instructions (optional):');
      await dispatch(returnTicket({ id, reason, instructions: instructions || undefined }));
    }
  };

  const handleBook = async (id: string) => {
    const bookingRef = prompt('Booking reference number:');
    if (bookingRef) {
      const comments = prompt('Booking comments (optional):');
      await dispatch(bookTicket({ id, booking_reference: bookingRef, comments: comments || undefined }));
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this ticket?')) {
      await dispatch(cancelTicket(id));
    }
  };

  const handleComplete = async (id: string) => {
    if (window.confirm('Mark this ticket as completed?')) {
      await dispatch(completeTicket(id));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      await dispatch(deleteTicket(id));
    }
  };

  // ── Render Actions ──────────────────────────────────────────────────────────

  const renderActions = (ticket: Ticket) => {
    const actionButtons: JSX.Element[] = [];

    switch (ticket.status) {
      case 'draft':
        actionButtons.push(
          <button
            key="submit"
            onClick={() => handleSubmit(ticket.id)}
            className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={ticketActions.submitting}
          >
            Submit
          </button>
        );
        break;

      case 'pending_approval':
        actionButtons.push(
          <button
            key="approve"
            onClick={() => handleApprove(ticket.id)}
            className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
            disabled={ticketActions.approving}
          >
            Approve
          </button>,
          <button
            key="reject"
            onClick={() => handleReject(ticket.id)}
            className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
            disabled={ticketActions.rejecting}
          >
            Reject
          </button>,
          <button
            key="return"
            onClick={() => handleReturn(ticket.id)}
            className="px-3 py-1 text-sm text-white bg-yellow-600 rounded hover:bg-yellow-700 disabled:opacity-50"
            disabled={ticketActions.returning}
          >
            Return
          </button>
        );
        break;

      case 'approved':
        actionButtons.push(
          <button
            key="book"
            onClick={() => handleBook(ticket.id)}
            className="px-3 py-1 text-sm text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
            disabled={ticketActions.booking}
          >
            Book
          </button>
        );
        break;

      case 'booked':
        actionButtons.push(
          <button
            key="complete"
            onClick={() => handleComplete(ticket.id)}
            className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
            disabled={ticketActions.completing}
          >
            Complete
          </button>,
          <button
            key="cancel"
            onClick={() => handleCancel(ticket.id)}
            className="px-3 py-1 text-sm text-white bg-gray-600 rounded hover:bg-gray-700 disabled:opacity-50"
            disabled={ticketActions.cancelling}
          >
            Cancel
          </button>
        );
        break;

      case 'completed':
      case 'cancelled':
      case 'rejected':
        actionButtons.push(
          <button
            key="delete"
            onClick={() => handleDelete(ticket.id)}
            className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
          >
            Delete
          </button>
        );
        break;
    }

    return <div className="flex flex-wrap gap-2">{actionButtons}</div>;
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (status === 'loading' && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Travel Tickets</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage travel requests and bookings
          </p>
        </div>
        <button
          onClick={() => dispatch(clearError())}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Ticket
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p>{error}</p>
          <button
            onClick={() => dispatch(clearError())}
            className="text-sm text-red-600 hover:text-red-800 mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {pagination.total} tickets found
            </span>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search by title, reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="booked">Booked</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleFilterChange}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No tickets found</p>
          <button
            onClick={() => dispatch(resetFilters())}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ticket.reference_no}
                    </h3>
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  
                  <h4 className="text-gray-700 font-medium mb-1">{ticket.title}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-gray-600 mb-2">
                    <div>
                      <span className="font-medium">From:</span> {ticket.departure_from}
                    </div>
                    <div>
                      <span className="font-medium">To:</span> {ticket.destination}
                    </div>
                    <div>
                      <span className="font-medium">Travel:</span>{' '}
                      {new Date(ticket.date_of_travel).toLocaleDateString()}
                      {ticket.return_date && ` - ${new Date(ticket.return_date).toLocaleDateString()}`}
                    </div>
                    <div>
                      <span className="font-medium">Class:</span> {ticket.travel_class}
                    </div>
                  </div>

                  {ticket.remarks && (
                    <p className="text-sm text-gray-500 mb-2">{ticket.remarks}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                    <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                    <span>By: {ticket.created_by_name}</span>
                    {ticket.assigned_to_name && (
                      <span>Assigned to: {ticket.assigned_to_name}</span>
                    )}
                    {ticket.booking_reference && (
                      <span className="text-blue-600 font-medium">
                        Booking: {ticket.booking_reference}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                {renderActions(ticket)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} tickets
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpdeskTickets;