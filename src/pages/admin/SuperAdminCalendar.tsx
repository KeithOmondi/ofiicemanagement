// src/pages/admin/SuperAdminCalendar.tsx
import React, { useEffect, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createCalendarEvent,
  fetchCalendarEvents,
  fetchUpcomingEvents,
  getGoogleCalendarStatus,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  syncWithGoogle,
  updateCalendarEvent,
  deleteCalendarEvent,
  clearCalendarError,
  clearCalendarSuccess,
  selectAllCalendarEvents,
  selectSelectedCalendarEvent,
  selectUpcomingEvents,
  selectGoogleCalendarStatus,
  selectCalendarListLoading,
  selectCalendarMutating,
  selectCalendarSyncing,
  selectCalendarError,
  selectCalendarSuccess,
  resetCalendarFilters,
} from '../../store/slices/calendarSlice';
import type { CalendarEvent, CalendarEventInput, EventType } from '../../types/calendar.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPE_DOT_COLORS: Record<EventType, string> = {
  hearing:  'bg-green-500',
  meeting:  'bg-yellow-400',
  deadline: 'bg-red-500',
  other:    'bg-blue-400',
};

const EVENT_TYPE_BORDER_COLORS: Record<EventType, string> = {
  hearing:  'border-l-green-500',
  meeting:  'border-l-yellow-400',
  deadline: 'border-l-red-500',
  other:    'border-l-blue-400',
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  hearing:  'Hearing',
  meeting:  'Meeting',
  deadline: 'Deadline',
  other:    'Other',
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

// ─── Component ────────────────────────────────────────────────────────────────

const SuperAdminCalendar = () => {
  const dispatch = useAppDispatch();

  const events        = useAppSelector(selectAllCalendarEvents);
  const selectedEvent = useAppSelector(selectSelectedCalendarEvent);
  const upcomingEvents= useAppSelector(selectUpcomingEvents);
  const googleStatus  = useAppSelector(selectGoogleCalendarStatus);
  const listLoading   = useAppSelector(selectCalendarListLoading);
  const mutating      = useAppSelector(selectCalendarMutating);
  const syncing       = useAppSelector(selectCalendarSyncing);
  const error         = useAppSelector(selectCalendarError);
  const success       = useAppSelector(selectCalendarSuccess);

  const [currentDate,      setCurrentDate]      = useState(new Date());
  const [selectedDate,     setSelectedDate]      = useState<Date | null>(null);
  const [isModalOpen,      setIsModalOpen]       = useState(false);
  const [isEventModalOpen, setIsEventModalOpen]  = useState(false);
  const [editingEvent,     setEditingEvent]      = useState<CalendarEvent | null>(null);

  const emptyForm: Partial<CalendarEventInput> = {
    title:          '',
    description:    '',
    event_date:     new Date().toISOString().split('T')[0],
    start_time:     '09:00',
    end_time:       '10:00',
    location:       '',
    event_type:     'hearing',
    court_room:     '',
    case_reference: '',
    judge_name:     '',
    notify_team:    false,
  };

  const [formData, setFormData] = useState<Partial<CalendarEventInput>>(emptyForm);

  const currentYear  = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // ── Fetch ──
  useEffect(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const lastDay  = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    dispatch(fetchCalendarEvents({ start_date: firstDay, end_date: lastDay, limit: 100, sort_by: 'event_date', sort_order: 'ASC' }));
    dispatch(fetchUpcomingEvents(10));
    dispatch(getGoogleCalendarStatus());
    return () => { dispatch(resetCalendarFilters()); };
  }, [dispatch, currentYear, currentMonth]);

  // ── Toasts ──
  useEffect(() => {
    if (error)   { toast.error(error);                              dispatch(clearCalendarError());   }
    if (success) { toast.success('Operation completed successfully'); dispatch(clearCalendarSuccess()); }
  }, [error, success, dispatch]);

  // ── Helpers ──
  const getDaysInMonth    = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth= (y: number, m: number) => new Date(y, m, 1).getDay();

  const getEventsForDate = (date: Date) => {
    const str = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return events.filter(e => {
      const d = new Date(e.event_date);
      const es = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return es === str;
    });
  };

  const isToday = (date: Date) => {
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  };

  const isSelected = (date: Date) =>
    selectedDate &&
    date.getDate()     === selectedDate.getDate()  &&
    date.getMonth()    === selectedDate.getMonth() &&
    date.getFullYear() === selectedDate.getFullYear();

  const refreshEvents = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const lastDay  = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
    dispatch(fetchCalendarEvents({ start_date: firstDay, end_date: lastDay, limit: 100, sort_by: 'event_date', sort_order: 'ASC' }));
    dispatch(fetchUpcomingEvents(10));
  };

  // ── Navigation ──
  const goToPrev  = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const goToNext  = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

  // ── Handlers ──
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setFormData({ ...emptyForm, event_date: date.toISOString().split('T')[0] });
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title:          event.title,
      description:    event.description    || '',
      event_date:     new Date(event.event_date).toISOString().split('T')[0],
      start_time:     event.start_time     || '09:00',
      end_time:       event.end_time       || '10:00',
      location:       event.location       || '',
      event_type:     event.event_type,
      court_room:     event.court_room     || '',
      case_reference: event.case_reference || '',
      judge_name:     event.judge_name     || '',
      notify_team:    event.notify_team,
    });
    setIsEventModalOpen(true);
  };

  const handleFormChange = (field: keyof CalendarEventInput, value: string | boolean | EventType) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date || !formData.event_type) {
      toast.error('Please fill in all required fields'); return;
    }
    try {
      if (editingEvent) {
        await dispatch(updateCalendarEvent({ id: editingEvent.id, data: formData as CalendarEventInput })).unwrap();
        toast.success('Event updated');
      } else {
        await dispatch(createCalendarEvent(formData as CalendarEventInput)).unwrap();
        toast.success('Event created');
      }
      refreshEvents();
      resetForm();
      setIsModalOpen(false);
      setIsEventModalOpen(false);
    } catch { /* handled by toast effect */ }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await dispatch(deleteCalendarEvent(id)).unwrap();
      toast.success('Event deleted');
      refreshEvents();
      setIsEventModalOpen(false);
    } catch { /* handled */ }
  };

  const resetForm = () => { setFormData(emptyForm); setEditingEvent(null); };

  // ── Google ──
  const handleSync = async () => {
    try {
      await dispatch(syncWithGoogle()).unwrap();
      toast.success('Synced with Google Calendar');
      refreshEvents();
    } catch { /* handled */ }
  };

  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectGoogleCalendar()).unwrap();
      toast.success('Google Calendar disconnected');
      dispatch(getGoogleCalendarStatus());
    } catch { /* handled */ }
  };

  // ── Calendar Grid ──
  const renderCells = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay    = getFirstDayOfMonth(currentYear, currentMonth);
    const cells: React.ReactNode[] = [];

    // leading blanks
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`b-${i}`} className="h-[72px]" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date      = new Date(currentYear, currentMonth, d);
      const dayEvents = getEventsForDate(date);
      const todayCell = isToday(date);
      const selCell   = isSelected(date);

      cells.push(
        <div
          key={d}
          onClick={() => handleDateClick(date)}
          className={`h-[72px] flex flex-col items-center pt-2 rounded-lg cursor-pointer transition-colors select-none
            ${todayCell ? 'bg-[#f5f0e8]' : 'hover:bg-gray-50'}
            ${selCell   ? 'ring-2 ring-[#8B7355]' : ''}
          `}
        >
          <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
            ${todayCell ? 'bg-[#8B7355] text-white' : 'text-gray-700'}
          `}>
            {d}
          </span>

          {/* Dot indicators */}
          {dayEvents.length > 0 && (
            <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
              {dayEvents.slice(0, 3).map((ev, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${EVENT_TYPE_DOT_COLORS[ev.event_type]}`}
                />
              ))}
              {dayEvents.length > 3 && (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              )}
            </div>
          )}
        </div>
      );
    }

    // trailing blanks
    const remainder = (firstDay + daysInMonth) % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        cells.push(<div key={`e-${i}`} className="h-[72px]" />);
      }
    }

    return cells;
  };

  // ── Upcoming event date formatter ──
  const fmtUpcomingDate = (event: CalendarEvent) => {
    const d = new Date(event.event_date);
    const mon = MONTHS[d.getMonth()].slice(0, 3);
    const day = d.getDate();
    return `${mon} ${day}`;
  };

  // ── Shared modal input classes ──
  const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8B7355] focus:border-transparent placeholder:text-gray-400';
  const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5';

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f7f7f5] p-6">
      <Toaster position="top-right" />

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage hearings, meetings and deadlines</p>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">

        {/* ── LEFT: Calendar card ── */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Card header row */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            {/* Month navigation */}
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-800">
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={goToPrev}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition"
                >
                  ‹
                </button>
                <button
                  onClick={goToNext}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition"
                >
                  ›
                </button>
              </div>
              <button
                onClick={goToToday}
                className="text-xs text-[#8B7355] hover:underline ml-1"
              >
                Today
              </button>
            </div>

            {/* Add Event button */}
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#8B7355] hover:bg-[#7a6447] text-white text-sm font-medium rounded-lg transition"
            >
              <span className="text-base leading-none">+</span>
              Add Event
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-4 pt-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-gray-400 tracking-widest py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {listLoading ? (
            <div className="flex justify-center py-20">
              <svg className="animate-spin h-7 w-7 text-[#8B7355]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px px-4 pb-4">
              {renderCells()}
            </div>
          )}

          {/* Google Calendar integration notice */}
          {!googleStatus?.isConnected && (
            <div className="mx-4 mb-4 px-4 py-3 bg-blue-50 rounded-xl text-center text-xs text-blue-700 border border-blue-100">
              📅{' '}
              <span className="font-semibold">Google Calendar Integration:</span>{' '}
              Connect your Google Workspace account in Settings to sync events.{' '}
              <button
                onClick={() => dispatch(connectGoogleCalendar())}
                className="underline font-medium ml-1 hover:text-blue-900"
              >
                Connect now
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Upcoming Events sidebar ── */}
        <div className="w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Upcoming Events</h3>
            {googleStatus?.isConnected ? (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync Google Cal'}
                <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => dispatch(connectGoogleCalendar())}
                className="text-xs text-[#8B7355] hover:underline"
              >
                Connect Google
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No upcoming events</p>
            ) : (
              upcomingEvents.slice(0, 8).map(event => {
                const subtitle = [
                  event.location,
                  event.judge_name ? `Hon. ${event.judge_name}` : null,
                  event.case_reference,
                ].filter(Boolean).join(' · ');

                return (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className={`flex gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition border-l-4 ${EVENT_TYPE_BORDER_COLORS[event.event_type]}`}
                  >
                    {/* Date + time column */}
                    <div className="flex-shrink-0 w-14 text-right">
                      <p className="text-xs font-semibold text-gray-700">{fmtUpcomingDate(event)}</p>
                      {event.start_time && (
                        <p className="text-xs text-gray-400 mt-0.5">{event.start_time}</p>
                      )}
                    </div>

                    {/* Title + subtitle */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate leading-snug">
                        {event.title}
                      </p>
                      {subtitle && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {googleStatus?.isConnected && (
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                onClick={handleDisconnect}
                className="text-xs text-red-400 hover:text-red-600 transition"
              >
                Disconnect Google Calendar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <span className="text-xl">📅</span>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEvent ? 'Edit Calendar Event' : 'Add Calendar Event'}
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="ml-auto text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Event Title */}
              <div>
                <label className={labelCls}>Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleFormChange('title', e.target.value)}
                  placeholder="e.g. Hearing — Civil Suit 312/2024"
                  className={inputCls}
                  required
                />
              </div>

              {/* Date + Time row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={e => handleFormChange('event_date', e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={e => handleFormChange('start_time', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className={labelCls}>Location / Courtroom</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => handleFormChange('location', e.target.value)}
                  placeholder="e.g. Courtroom 7"
                  className={inputCls}
                />
              </div>

              {/* Event Type */}
              <div>
                <label className={labelCls}>Event Type</label>
                <select
                  value={formData.event_type}
                  onChange={e => handleFormChange('event_type', e.target.value as EventType)}
                  className={inputCls}
                >
                  <option value="hearing">Hearing</option>
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Notify Team */}
              <div>
                <label className={labelCls}>Notify Team</label>
                <select
                  value={formData.notify_team ? 'notify' : 'no_notification'}
                  onChange={e => handleFormChange('notify_team', e.target.value === 'notify')}
                  className={inputCls}
                >
                  <option value="no_notification">No Notification</option>
                  <option value="notify">Notify Team</option>
                </select>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutating}
                  className="flex items-center gap-2 px-5 py-2 bg-[#8B7355] hover:bg-[#7a6447] text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  <span>📅</span>
                  {mutating
                    ? (editingEvent ? 'Saving...' : 'Adding...')
                    : (editingEvent ? 'Save Changes' : 'Add to Calendar')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Event Detail Modal ── */}
      {isEventModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
              <button
                onClick={() => { setIsEventModalOpen(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  {EVENT_TYPE_LABELS[selectedEvent.event_type]}
                </span>
                {selectedEvent.google_event_id && (
                  <span className="text-xs text-green-600">✅ Synced with Google</span>
                )}
              </div>

              <h4 className="text-xl font-semibold text-gray-900 leading-snug">
                {selectedEvent.title}
              </h4>

              <div className="space-y-2 text-gray-600">
                <p>
                  <span className="font-medium text-gray-800">Date: </span>
                  {new Date(selectedEvent.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                {selectedEvent.start_time && (
                  <p>
                    <span className="font-medium text-gray-800">Time: </span>
                    {selectedEvent.start_time}{selectedEvent.end_time ? ` – ${selectedEvent.end_time}` : ''}
                  </p>
                )}
                {selectedEvent.location && (
                  <p><span className="font-medium text-gray-800">Location: </span>{selectedEvent.location}</p>
                )}
                {selectedEvent.court_room && (
                  <p><span className="font-medium text-gray-800">Court Room: </span>{selectedEvent.court_room}</p>
                )}
                {selectedEvent.case_reference && (
                  <p><span className="font-medium text-gray-800">Case: </span>{selectedEvent.case_reference}</p>
                )}
                {selectedEvent.judge_name && (
                  <p><span className="font-medium text-gray-800">Judge: </span>{selectedEvent.judge_name}</p>
                )}
                {selectedEvent.description && (
                  <p><span className="font-medium text-gray-800">Notes: </span>{selectedEvent.description}</p>
                )}
                {selectedEvent.notify_team && (
                  <p className="text-amber-700">📧 Team will be notified</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => handleDelete(selectedEvent.id)}
                className="text-sm font-medium text-red-500 hover:text-red-700 transition"
              >
                Delete Event
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEventModalOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => { setIsEventModalOpen(false); resetForm(); }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCalendar;