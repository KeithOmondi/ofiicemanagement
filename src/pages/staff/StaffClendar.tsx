import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  // Actions
  fetchCalendarEvents,
  fetchUpcomingEvents,
  fetchCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getGoogleCalendarStatus,
  syncWithGoogle,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  setCalendarFilters,
  clearSelectedEvent,
  clearCalendarError,
  clearCalendarSuccess,
  // Selectors
  selectAllCalendarEvents,
  selectSelectedCalendarEvent,
  selectUpcomingEvents,
  selectCalendarPagination,
  selectCalendarFilters,
  selectGoogleCalendarStatus,
  selectCalendarListLoading,
  selectCalendarUpcomingLoading,
  selectCalendarMutating,
  selectCalendarSyncing,
  selectGoogleStatusLoading,
  selectCalendarError,
  selectCalendarSuccess,
} from '../../store/slices/calendarSlice';
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventUpdate,
  EventType,
} from '../../types/calendar.types';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Clock,
  Calendar as CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Link,
  Unlink,
} from 'lucide-react';

// ─── UI Helpers ──────────────────────────────────────────────────────────────

const EventTypeBadge = ({ type }: { type: EventType }) => {
  const styles: Record<EventType, { bg: string; text: string; label: string }> = {
    hearing: { bg: 'bg-red-50', text: 'text-red-700', label: 'Hearing' },
    meeting: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Meeting' },
    deadline: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Deadline' },
    other: { bg: 'bg-stone-50', text: 'text-stone-700', label: 'Other' },
  };
  const { bg, text, label } = styles[type];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </label>
  );
}

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]';

function GoldButton({
  children,
  icon,
  type = 'button',
  disabled,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'success';
}) {
  const styles = {
    default: 'bg-[#c9a84c] text-[#1a3d1c] hover:bg-[#b8973f]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${styles[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon}
      {children}
    </button>
  );
}

function GhostButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

function ErrorBanner() {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectCalendarError);
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
      <button onClick={() => dispatch(clearCalendarError())} className="text-red-500 hover:text-red-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function SuccessBanner() {
  const dispatch = useAppDispatch();
  const success = useAppSelector(selectCalendarSuccess);
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => dispatch(clearCalendarSuccess()), 3000);
    return () => clearTimeout(timer);
  }, [success, dispatch]);
  if (!success) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <div className="flex items-start gap-2">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Operation completed successfully!</span>
      </div>
      <button onClick={() => dispatch(clearCalendarSuccess())} className="text-emerald-500 hover:text-emerald-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-2xl',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-xl bg-white`}>
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-stone-100 px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffCalendar: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const events = useAppSelector(selectAllCalendarEvents);
  const selectedEvent = useAppSelector(selectSelectedCalendarEvent);
  const upcomingEvents = useAppSelector(selectUpcomingEvents);
  const pagination = useAppSelector(selectCalendarPagination);
  const filters = useAppSelector(selectCalendarFilters);
  const googleStatus = useAppSelector(selectGoogleCalendarStatus);
  const loading = useAppSelector(selectCalendarListLoading);
  const upcomingLoading = useAppSelector(selectCalendarUpcomingLoading);
  const mutating = useAppSelector(selectCalendarMutating);
  const syncing = useAppSelector(selectCalendarSyncing);
  const googleStatusLoading = useAppSelector(selectGoogleStatusLoading);

  // ── Local State ──────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // ── Form State ─────────────────────────────────────────────────────────────
  const initialFormData: CalendarEventInput = {
    title: '',
    description: '',
    event_type: 'meeting',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    court_room: '',
    case_reference: '',
    judge_name: '',
    notify_team: false,
  };

  const [formData, setFormData] = useState<CalendarEventInput>(initialFormData);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // Initial load with filters from slice
    dispatch(fetchCalendarEvents(filters));
    dispatch(fetchUpcomingEvents(10));
    dispatch(getGoogleCalendarStatus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]); // Only run on mount - filters will trigger the next effect

  // Load events when filters change (excluding page changes to avoid loops)
  useEffect(() => {
    // Only fetch if we have filters that aren't the initial empty state
    if (filters.page || filters.limit || filters.event_type || filters.sort_by || filters.sort_order) {
      dispatch(fetchCalendarEvents(filters));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.limit, filters.event_type, filters.sort_by, filters.sort_order]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingEvent(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEdit = (event: CalendarEvent) => {
  setEditingEvent(event);

  const rawDate = event.event_date as Date | string;
  const eventDate =
    rawDate instanceof Date
      ? rawDate.toISOString().split('T')[0]
      : String(rawDate).split('T')[0];

  setFormData({
    title: event.title,
    description: event.description || '',
    event_type: event.event_type,
    event_date: eventDate,
    start_time: event.start_time || '09:00',
    end_time: event.end_time || '10:00',
    location: event.location || '',
    court_room: event.court_room || '',
    case_reference: event.case_reference || '',
    judge_name: event.judge_name || '',
    notify_team: event.notify_team || false,
  });
  setShowEditModal(true);
};

  const handleOpenDetail = (event: CalendarEvent) => {
    dispatch(fetchCalendarEventById(event.id));
    setShowDetailModal(true);
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.event_date) return;
    try {
      await dispatch(createCalendarEvent(formData)).unwrap();
      setShowCreateModal(false);
      resetForm();
      // Refetch with current filters
      dispatch(fetchCalendarEvents(filters));
      dispatch(fetchUpcomingEvents(10));
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingEvent) return;
    const updateData: CalendarEventUpdate = {
      title: formData.title,
      description: formData.description,
      event_type: formData.event_type,
      event_date: formData.event_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      location: formData.location,
      court_room: formData.court_room,
      case_reference: formData.case_reference,
      judge_name: formData.judge_name,
      notify_team: formData.notify_team,
    };
    try {
      await dispatch(updateCalendarEvent({
        id: editingEvent.id,
        data: updateData,
      })).unwrap();
      setShowEditModal(false);
      resetForm();
      // Refetch with current filters
      dispatch(fetchCalendarEvents(filters));
      dispatch(fetchUpcomingEvents(10));
    } catch (err) {
      console.error('Failed to update event:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      await dispatch(deleteCalendarEvent(selectedEvent.id)).unwrap();
      setShowDeleteConfirm(false);
      dispatch(clearSelectedEvent());
      // Refetch with current filters
      dispatch(fetchCalendarEvents(filters));
      dispatch(fetchUpcomingEvents(10));
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleSyncGoogle = async () => {
    try {
      await dispatch(syncWithGoogle()).unwrap();
      dispatch(fetchCalendarEvents(filters));
      dispatch(fetchUpcomingEvents(10));
      dispatch(getGoogleCalendarStatus());
    } catch (err) {
      console.error('Failed to sync with Google:', err);
    }
  };

  const handleConnectGoogle = () => {
    dispatch(connectGoogleCalendar());
  };

  const handleDisconnectGoogle = async () => {
    try {
      await dispatch(disconnectGoogleCalendar()).unwrap();
      dispatch(getGoogleCalendarStatus());
    } catch (err) {
      console.error('Failed to disconnect Google:', err);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Update filters with search term - you'll need to add search to your API
    dispatch(setCalendarFilters({ 
      ...filters, 
      page: 1,
    }));
  };

  const handleFilterType = (type: string) => {
    setFilterType(type);
    const eventType = type === 'all' ? undefined : type as EventType;
    dispatch(setCalendarFilters({ 
      event_type: eventType, 
      page: 1 
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      dispatch(setCalendarFilters({ page: newPage }));
    }
  };

  const handleRefresh = () => {
    dispatch(fetchCalendarEvents(filters));
    dispatch(fetchUpcomingEvents(10));
    dispatch(getGoogleCalendarStatus());
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[640px] w-full bg-stone-50 p-6">
      <ErrorBanner />
      <SuccessBanner />

      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Calendar Management</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage hearings, meetings, deadlines and conferences
            {upcomingEvents.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {upcomingEvents.length} upcoming
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Google Calendar Integration */}
          {googleStatusLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
          ) : googleStatus?.isConnected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle size={14} />
                Google Connected
              </span>
              <GhostButton icon={<RefreshCw size={14} />} onClick={handleSyncGoogle} disabled={syncing}>
                {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sync'}
              </GhostButton>
              <GhostButton icon={<Unlink size={14} />} onClick={handleDisconnectGoogle}>
                Disconnect
              </GhostButton>
            </div>
          ) : (
            <GhostButton icon={<Link size={14} />} onClick={handleConnectGoogle}>
              Connect Google Calendar
            </GhostButton>
          )}

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2.5 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
          >
            <Plus size={16} />
            New Event
          </button>
        </div>
      </div>

      {/* Google Status */}
      {googleStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs">
          <span className="font-medium text-stone-600">Google Calendar:</span>
          {googleStatus.isConnected ? (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle size={14} />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-stone-400">
              <XCircle size={14} />
              Not connected
            </span>
          )}
          {googleStatus.lastSyncAt && (
            <span className="text-stone-400">
              Last sync: {new Date(googleStatus.lastSyncAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search events..."
            className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'hearing', 'meeting', 'deadline', 'other'].map((type) => (
            <button
              key={type}
              onClick={() => handleFilterType(type)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap ${
                filterType === type
                  ? 'bg-[#1a3d1c] text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <GhostButton icon={<RefreshCw size={14} />} onClick={handleRefresh}>
          Refresh
        </GhostButton>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Events List */}
        <div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-stone-300" />
                <p className="mt-3 text-sm text-stone-400">No events found</p>
                <button
                  onClick={handleOpenCreate}
                  className="mt-2 text-sm font-medium text-[#c9a84c] hover:underline"
                >
                  Create your first event
                </button>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border-l-4 border-[#1E4620] bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOpenDetail(event)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-stone-900 truncate">{event.title}</h3>
                        {event.google_event_id && (
                          <Link size={12} className="text-blue-500 flex-shrink-0" />
                        )}
                        {event.notify_team && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                            Notify
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} />
                          {formatDate(event.event_date)}
                        </span>
                        {event.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </span>
                        )}
                        {event.location && (
                          <span className="truncate max-w-[150px]">{event.location}</span>
                        )}
                        {event.judge_name && (
                          <span className="text-stone-400">Judge: {event.judge_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                      <EventTypeBadge type={event.event_type} />
                    </div>
                  </div>
                  {event.description && (
                    <p className="mt-2 text-xs text-stone-500 line-clamp-2">{event.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">
                      Created: {formatDate(event.created_at)}
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(event); }}
                        className="rounded p-1 text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); dispatch(fetchCalendarEventById(event.id)); setShowDeleteConfirm(true); }}
                        className="rounded p-1 text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-stone-400">
                {pagination.total} events · Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs disabled:opacity-50 hover:bg-stone-50"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs disabled:opacity-50 hover:bg-stone-50"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Upcoming Events */}
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <Clock size={16} className="text-[#c9a84c]" />
                Upcoming Events
              </h3>
              <span className="text-xs text-stone-400">{upcomingEvents.length} upcoming</span>
            </div>
            {upcomingLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#c9a84c]" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-400">No upcoming events</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-stone-100 p-3 hover:bg-stone-50 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(event)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-800 truncate">{event.title}</p>
                        <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <CalendarDays size={11} />
                          {formatDate(event.event_date)}
                          {event.start_time && ` · ${formatTime(event.start_time)}`}
                        </p>
                      </div>
                      <EventTypeBadge type={event.event_type} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Calendar Stats</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-stone-50 p-2 text-center">
                <p className="text-lg font-bold text-stone-900">{pagination.total}</p>
                <p className="text-[10px] text-stone-400">Total Events</p>
              </div>
              <div className="rounded-lg bg-stone-50 p-2 text-center">
                <p className="text-lg font-bold text-stone-900">{upcomingEvents.length}</p>
                <p className="text-[10px] text-stone-400">Upcoming</p>
              </div>
              <div className="rounded-lg bg-stone-50 p-2 text-center">
                <p className="text-lg font-bold text-stone-900">
                  {events.filter(e => e.google_event_id).length}
                </p>
                <p className="text-[10px] text-stone-400">Google Synced</p>
              </div>
              <div className="rounded-lg bg-stone-50 p-2 text-center">
                <p className="text-lg font-bold text-stone-900">
                  {events.filter(e => e.notify_team).length}
                </p>
                <p className="text-[10px] text-stone-400">Notifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Create Event Modal ──────────────────────────────────────────── */}
      {showCreateModal && (
        <ModalShell
          title="Create New Event"
          onClose={() => { setShowCreateModal(false); resetForm(); }}
          footer={
            <>
              <GhostButton onClick={() => { setShowCreateModal(false); resetForm(); }}>Cancel</GhostButton>
              <GoldButton onClick={handleCreate} disabled={mutating || !formData.title.trim() || !formData.event_date}>
                {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={14} />}
                Create Event
              </GoldButton>
            </>
          }
        >
          <EventForm formData={formData} setFormData={setFormData} />
        </ModalShell>
      )}

      {/* ─── Edit Event Modal ───────────────────────────────────────────── */}
      {showEditModal && (
        <ModalShell
          title="Edit Event"
          onClose={() => { setShowEditModal(false); resetForm(); }}
          footer={
            <>
              <GhostButton onClick={() => { setShowEditModal(false); resetForm(); }}>Cancel</GhostButton>
              <GoldButton onClick={handleUpdate} disabled={mutating || !formData.title.trim() || !formData.event_date}>
                {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit size={14} />}
                Save Changes
              </GoldButton>
            </>
          }
        >
          <EventForm formData={formData} setFormData={setFormData} />
        </ModalShell>
      )}

      {/* ─── Event Detail Modal ──────────────────────────────────────────── */}
      {showDetailModal && selectedEvent && (
        <ModalShell
          title="Event Details"
          onClose={() => { setShowDetailModal(false); dispatch(clearSelectedEvent()); }}
          footer={
            <div className="flex w-full justify-between">
              <div className="flex gap-2">
                <GhostButton onClick={() => { setShowDetailModal(false); dispatch(clearSelectedEvent()); }}>
                  Close
                </GhostButton>
              </div>
              <div className="flex gap-2">
                <GoldButton
                  variant="danger"
                  onClick={() => { setShowDeleteConfirm(true); }}
                  icon={<Trash2 size={14} />}
                >
                  Delete
                </GoldButton>
                <GoldButton
                  onClick={() => {
                    setShowDetailModal(false);
                    handleOpenEdit(selectedEvent);
                  }}
                  icon={<Edit size={14} />}
                >
                  Edit
                </GoldButton>
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-stone-900">{selectedEvent.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <EventTypeBadge type={selectedEvent.event_type} />
                {selectedEvent.google_event_id && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <Link size={12} />
                    Synced
                  </span>
                )}
                {selectedEvent.notify_team && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    Notify Team
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-stone-400">Date</p>
                <p className="font-medium text-stone-800">{formatDate(selectedEvent.event_date)}</p>
              </div>
              {selectedEvent.start_time && (
                <div>
                  <p className="text-xs text-stone-400">Time</p>
                  <p className="font-medium text-stone-800">
                    {formatTime(selectedEvent.start_time)}
                    {selectedEvent.end_time && ` - ${formatTime(selectedEvent.end_time)}`}
                  </p>
                </div>
              )}
              {selectedEvent.location && (
                <div className="col-span-2">
                  <p className="text-xs text-stone-400">Location</p>
                  <p className="font-medium text-stone-800">{selectedEvent.location}</p>
                </div>
              )}
              {selectedEvent.court_room && (
                <div>
                  <p className="text-xs text-stone-400">Court Room</p>
                  <p className="font-medium text-stone-800">{selectedEvent.court_room}</p>
                </div>
              )}
              {selectedEvent.judge_name && (
                <div>
                  <p className="text-xs text-stone-400">Judge</p>
                  <p className="font-medium text-stone-800">{selectedEvent.judge_name}</p>
                </div>
              )}
              {selectedEvent.case_reference && (
                <div className="col-span-2">
                  <p className="text-xs text-stone-400">Case Reference</p>
                  <p className="font-medium text-stone-800">{selectedEvent.case_reference}</p>
                </div>
              )}
            </div>

            {selectedEvent.description && (
              <div>
                <p className="text-xs text-stone-400">Description</p>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{selectedEvent.description}</p>
              </div>
            )}

            <div className="border-t border-stone-100 pt-3 text-xs text-stone-400">
              <p>Created: {formatDate(selectedEvent.created_at)}</p>
              <p>Updated: {formatDate(selectedEvent.updated_at)}</p>
              {selectedEvent.synced_at && (
                <p>Synced: {formatDate(selectedEvent.synced_at)}</p>
              )}
            </div>
          </div>
        </ModalShell>
      )}

      {/* ─── Delete Confirmation ──────────────────────────────────────────── */}
      {showDeleteConfirm && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-2 flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-sm font-semibold">Confirm Delete</h3>
            </div>
            <p className="mb-4 text-sm text-stone-600">
              Are you sure you want to delete "{selectedEvent.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setShowDeleteConfirm(false)}>Cancel</GhostButton>
              <button
                onClick={handleDelete}
                disabled={mutating}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Event Form Component ────────────────────────────────────────────────────

interface EventFormProps {
  formData: CalendarEventInput;
  setFormData: React.Dispatch<React.SetStateAction<CalendarEventInput>>;
}

const EventForm: React.FC<EventFormProps> = ({ formData, setFormData }) => {
  const eventTypes: { value: EventType; label: string }[] = [
    { value: 'hearing', label: 'Hearing' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Title *</FieldLabel>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Event title"
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel>Event Type *</FieldLabel>
        <select
          value={formData.event_type}
          onChange={(e) => setFormData({ ...formData, event_type: e.target.value as EventType })}
          className={inputClasses}
        >
          {eventTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel>Date *</FieldLabel>
        <input
          type="date"
          value={formData.event_date}
          onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
          className={inputClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Start Time</FieldLabel>
          <input
            type="time"
            value={formData.start_time || ''}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            className={inputClasses}
          />
        </div>
        <div>
          <FieldLabel>End Time</FieldLabel>
          <input
            type="time"
            value={formData.end_time || ''}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Location</FieldLabel>
        <input
          type="text"
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g. Chamber 1317, High Court"
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel>Court Room</FieldLabel>
        <input
          type="text"
          value={formData.court_room || ''}
          onChange={(e) => setFormData({ ...formData, court_room: e.target.value })}
          placeholder="e.g. Court Room 3"
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel>Judge Name</FieldLabel>
        <input
          type="text"
          value={formData.judge_name || ''}
          onChange={(e) => setFormData({ ...formData, judge_name: e.target.value })}
          placeholder="e.g. Hon. Justice Korir"
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel>Case Reference</FieldLabel>
        <input
          type="text"
          value={formData.case_reference || ''}
          onChange={(e) => setFormData({ ...formData, case_reference: e.target.value })}
          placeholder="e.g. HCT-00-CR-SC-0045-2024"
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Event description"
          rows={3}
          className={`${inputClasses} resize-none`}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="notify_team"
          checked={formData.notify_team || false}
          onChange={(e) => setFormData({ ...formData, notify_team: e.target.checked })}
          className="rounded border-stone-300"
        />
        <label htmlFor="notify_team" className="text-sm text-stone-700">
          Notify team members
        </label>
      </div>
    </div>
  );
};

export default StaffCalendar;