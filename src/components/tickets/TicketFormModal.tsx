import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { fetchUsers, selectAllUsers, selectUsersListLoading } from '../../store/slices/userSlice';
import { fetchDepartments, selectAllDepartments } from '../../store/slices/departmentsSlice';
import { X, Loader2, Save, Plane } from 'lucide-react';
import type { 
  CreateTicketRequest, 
  FlightTimePreference, 
  Ticket, 
  TicketPriority, 
  TravelClass,
  TicketTripType,
} from '../../types/tickets.types';
import {
  TRAVEL_CLASS_LABELS,
  FLIGHT_TIME_LABELS,
  TRIP_TYPE_LABELS,
  getTimeSlots,
} from '../../types/tickets.types';

// ─── Constants ──────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <Loader2 className={`animate-spin ${className}`} />
);

// Build initial form data from an existing ticket (or empty for new)
const buildInitialFormData = (ticket?: Ticket | null): CreateTicketRequest => {
  if (!ticket) {
    return {
      title: '',
      description: '',
      department_id: '',
      trip_type: 'one_way',
      date_of_travel: '',
      time_of_travel: '',
      return_date: '',
      return_time: '',
      preferred_departure_time: 'any',
      preferred_return_time: 'any',
      departure_from: '',
      destination: '',
      remarks: '',
      judge_name: '',
      pj_number: '',
      travel_class: 'economy',
      number_of_passengers: 1,
      special_requests: '',
      priority: 'normal',
      assigned_to: '',
      is_draft: true,
    };
  }
  return {
    title: ticket.title,
    description: ticket.description || '',
    department_id: ticket.department_id || '',
    trip_type: ticket.trip_type || 'one_way',
    date_of_travel: ticket.date_of_travel,
    time_of_travel: ticket.time_of_travel ?? '',
    return_date: ticket.return_date || '',
    return_time: ticket.return_time ?? '',
    preferred_departure_time: ticket.preferred_departure_time || 'any',
    preferred_return_time: ticket.preferred_return_time || 'any',
    departure_from: ticket.departure_from,
    destination: ticket.destination,
    remarks: ticket.remarks || '',
    judge_name: ticket.judge_name ?? '',
    pj_number: ticket.pj_number ?? '',
    travel_class: ticket.travel_class || 'economy',
    number_of_passengers: ticket.number_of_passengers || 1,
    special_requests: ticket.special_requests || '',
    priority: ticket.priority || 'normal',
    assigned_to: ticket.assigned_to || '',
    is_draft: ticket.status === 'draft',
  };
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface TicketFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
  onSave: (data: CreateTicketRequest) => void;
  isSaving: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const TicketFormModal: React.FC<TicketFormModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onSave,
  isSaving,
}) => {
  const dispatch = useAppDispatch();
  const departments = useAppSelector(selectAllDepartments);
  const users = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const isEditing = !!ticket;
  const timeSlots = getTimeSlots();

  const [formData, setFormData] = useState<CreateTicketRequest>(() =>
    buildInitialFormData(ticket)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch departments and users when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchDepartments({ is_active: true }));
      dispatch(fetchUsers({ is_active: true, limit: 100 }));
    }
  }, [isOpen, dispatch]);

  const handleChange = (
    field: keyof CreateTicketRequest,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    
    if (!formData.title?.trim()) next.title = 'Title is required';
    if (!formData.date_of_travel) next.date_of_travel = 'Travel date is required';
    if (!formData.departure_from?.trim()) next.departure_from = 'Departure location is required';
    if (!formData.destination?.trim()) next.destination = 'Destination is required';
    if ((formData.number_of_passengers || 0) < 1) {
      next.number_of_passengers = 'At least 1 passenger required';
    }
    
    // Round trip validation
    if (formData.trip_type === 'round_trip') {
      if (!formData.return_date) {
        next.return_date = 'Return date is required for round trip';
      }
      if (!formData.return_time) {
        next.return_time = 'Return time is required for round trip';
      }
      if (!formData.preferred_return_time) {
        next.preferred_return_time = 'Return flight time preference is required for round trip';
      }
    }
    
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
  };

  const isRoundTrip = formData.trip_type === 'round_trip';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-[#1a3d1c] flex items-center gap-2">
            <Plane size={18} className="text-[#c9a84c]" />
            {isEditing ? 'Edit Travel Ticket' : 'New Travel Ticket'}
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {/* ─── Title ────────────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Ticket Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Travel to Nairobi for Conference"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] ${
                errors.title ? 'border-red-300' : 'border-stone-200'
              }`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* ─── Description ────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Description
            </label>
            <textarea
              value={formData.description ?? ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Brief description of the travel purpose..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] resize-none"
            />
          </div>

          {/* ─── Department & Priority ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Department
              </label>
              <select
                value={formData.department_id ?? ''}
                onChange={(e) => handleChange('department_id', e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value as TicketPriority)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ─── Trip Type ────────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Trip Type *
            </label>
            <div className="flex gap-4">
              {Object.entries(TRIP_TYPE_LABELS).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="trip_type"
                    value={value}
                    checked={formData.trip_type === value}
                    onChange={(e) => handleChange('trip_type', e.target.value as TicketTripType)}
                    className="rounded-full border-stone-300 text-[#1a3d1c] focus:ring-[#1a3d1c]"
                  />
                  <span className="text-sm text-stone-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ─── Travel Dates & Times ────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Departure Date *
              </label>
              <input
                type="date"
                value={formData.date_of_travel}
                onChange={(e) => handleChange('date_of_travel', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] ${
                  errors.date_of_travel ? 'border-red-300' : 'border-stone-200'
                }`}
              />
              {errors.date_of_travel && <p className="text-xs text-red-500 mt-1">{errors.date_of_travel}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Departure Time
              </label>
              <select
                value={formData.time_of_travel ?? ''}
                onChange={(e) => handleChange('time_of_travel', e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
              >
                <option value="">Select Time</option>
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ─── Return Date & Time (Round Trip Only) ────────────────────── */}
          {isRoundTrip && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Return Date *
                </label>
                <input
                  type="date"
                  value={formData.return_date ?? ''}
                  onChange={(e) => handleChange('return_date', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] ${
                    errors.return_date ? 'border-red-300' : 'border-stone-200'
                  }`}
                />
                {errors.return_date && <p className="text-xs text-red-500 mt-1">{errors.return_date}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Return Time *
                </label>
                <select
                  value={formData.return_time ?? ''}
                  onChange={(e) => handleChange('return_time', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] ${
                    errors.return_time ? 'border-red-300' : 'border-stone-200'
                  }`}
                >
                  <option value="">Select Time</option>
                  {timeSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                {errors.return_time && <p className="text-xs text-red-500 mt-1">{errors.return_time}</p>}
              </div>
            </div>
          )}

          {/* ─── Locations ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Departure From *
              </label>
              <input
                type="text"
                value={formData.departure_from}
                onChange={(e) => handleChange('departure_from', e.target.value)}
                placeholder="e.g., Nairobi"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] ${
                  errors.departure_from ? 'border-red-300' : 'border-stone-200'
                }`}
              />
              {errors.departure_from && <p className="text-xs text-red-500 mt-1">{errors.departure_from}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Destination *
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => handleChange('destination', e.target.value)}
                placeholder="e.g., Mombasa"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] ${
                  errors.destination ? 'border-red-300' : 'border-stone-200'
                }`}
              />
              {errors.destination && <p className="text-xs text-red-500 mt-1">{errors.destination}</p>}
            </div>
          </div>

          {/* ─── Flight Time Preferences ───────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Departure Time Preference
              </label>
              <select
                value={formData.preferred_departure_time}
                onChange={(e) => handleChange('preferred_departure_time', e.target.value as FlightTimePreference)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
              >
                {Object.entries(FLIGHT_TIME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Return Time Preference
              </label>
              <select
                value={formData.preferred_return_time ?? ''}
                onChange={(e) => handleChange('preferred_return_time', e.target.value as FlightTimePreference)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] ${
                  isRoundTrip && errors.preferred_return_time ? 'border-red-300' : 'border-stone-200'
                }`}
              >
                <option value="">Not Applicable</option>
                {Object.entries(FLIGHT_TIME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {isRoundTrip && errors.preferred_return_time && (
                <p className="text-xs text-red-500 mt-1">{errors.preferred_return_time}</p>
              )}
            </div>
          </div>

          {/* ─── Travel Class & Passengers ────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Travel Class
              </label>
              <select
                value={formData.travel_class}
                onChange={(e) => handleChange('travel_class', e.target.value as TravelClass)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
              >
                {Object.entries(TRAVEL_CLASS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Passengers *
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={formData.number_of_passengers}
                onChange={(e) => handleChange('number_of_passengers', parseInt(e.target.value) || 1)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] ${
                  errors.number_of_passengers ? 'border-red-300' : 'border-stone-200'
                }`}
              />
              {errors.number_of_passengers && <p className="text-xs text-red-500 mt-1">{errors.number_of_passengers}</p>}
            </div>
          </div>

          {/* ─── Judge & Case Details ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Judge Name
              </label>
              <input
                type="text"
                value={formData.judge_name ?? ''}
                onChange={(e) => handleChange('judge_name', e.target.value)}
                placeholder="e.g., Hon. Justice Smith"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                PJ Number
              </label>
              <input
                type="text"
                value={formData.pj_number ?? ''}
                onChange={(e) => handleChange('pj_number', e.target.value)}
                placeholder="e.g., PJ-1234"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
              />
            </div>
          </div>

          {/* ─── Special Requests ──────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Special Requests
            </label>
            <textarea
              value={formData.special_requests ?? ''}
              onChange={(e) => handleChange('special_requests', e.target.value)}
              rows={2}
              placeholder="Any special requests (dietary, accessibility, etc.)..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] resize-none"
            />
          </div>

          {/* ─── Remarks ────────────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Remarks
            </label>
            <textarea
              value={formData.remarks ?? ''}
              onChange={(e) => handleChange('remarks', e.target.value)}
              rows={2}
              placeholder="Additional remarks..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] resize-none"
            />
          </div>

          {/* ─── Assign To ──────────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Assign To
            </label>
            <select
              value={formData.assigned_to ?? ''}
              onChange={(e) => handleChange('assigned_to', e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] disabled:bg-stone-50"
              disabled={usersLoading}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          {/* ─── Draft Toggle ───────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is-draft"
              checked={formData.is_draft}
              onChange={(e) => handleChange('is_draft', e.target.checked)}
              className="rounded border-stone-300 text-[#1a3d1c] focus:ring-[#1a3d1c]"
            />
            <label htmlFor="is-draft" className="text-sm text-stone-600">
              Save as Draft
            </label>
          </div>

          {/* ─── Actions ────────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-[#1a3d1c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d5c30] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Spinner /> : <Save size={16} />}
              {isSaving ? 'Saving...' : (isEditing ? 'Update Ticket' : 'Create Ticket')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketFormModal;