import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { fetchUsers, selectAllUsers, selectUsersListLoading } from '../../store/slices/userSlice';
import { fetchDepartments, selectAllDepartments } from '../../store/slices/departmentsSlice';
import { X, Loader2, Save, Plane, UserPlus, UserMinus, ChevronDown, ChevronUp } from 'lucide-react';
import type { 
  CreateTicketRequest, 
  FlightTimePreference, 
  Ticket, 
  TicketPriority, 
  TravelClass,
  TicketTripType,
  Passenger,
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

// Generate unique ID for passengers
const generatePassengerId = (): string => `passenger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Extended form data type that includes passengers
interface ExtendedFormData extends CreateTicketRequest {
  passengers: Passenger[];
}

// Build initial form data from an existing ticket (or empty for new)
const buildInitialFormData = (ticket?: Ticket | null): ExtendedFormData => {
  const baseForm = {
    title: '',
    description: '',
    department_id: '',
    trip_type: 'one_way' as TicketTripType,
    date_of_travel: '',
    time_of_travel: '',
    return_date: '',
    return_time: '',
    preferred_departure_time: 'any' as FlightTimePreference,
    preferred_return_time: 'any' as FlightTimePreference,
    departure_from: '',
    destination: '',
    remarks: '',
    judge_name: '',
    pj_number: '',
    travel_class: 'economy' as TravelClass,
    number_of_passengers: 1,
    special_requests: '',
    priority: 'normal' as TicketPriority,
    assigned_to: '',
    is_draft: true,
  };

  if (!ticket) {
    return {
      ...baseForm,
      passengers: [{
        id: generatePassengerId(),
        name: '',
        judge_name: '',
        pj_number: '',
        time_of_travel: '',
        return_time: '',
      }],
    };
  }

  // If editing and has passengers, use them
  const existingPassengers = ticket.passengers && ticket.passengers.length > 0
    ? ticket.passengers.map((p: Passenger) => ({
        ...p,
        id: p.id || generatePassengerId(),
      }))
    : [{
        id: generatePassengerId(),
        name: '',
        judge_name: ticket.judge_name || '',
        pj_number: ticket.pj_number || '',
        time_of_travel: ticket.time_of_travel || '',
        return_time: ticket.return_time || '',
      }];

  return {
    ...baseForm,
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
    passengers: existingPassengers,
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
  const [expandedPassenger, setExpandedPassenger] = useState<string | null>(null);

  const [formData, setFormData] = useState<ExtendedFormData>(() =>
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

  // ─── Passenger Management ────────────────────────────────────────────────

  const addPassenger = () => {
    setFormData((prev) => ({
      ...prev,
      passengers: [
        ...prev.passengers,
        {
          id: generatePassengerId(),
          name: '',
          judge_name: '',
          pj_number: '',
          time_of_travel: '',
          return_time: '',
        },
      ],
      number_of_passengers: prev.passengers.length + 1,
    }));
  };

  const removePassenger = (id: string) => {
    if (formData.passengers.length <= 1) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      passengers: prev.passengers.filter((p) => p.id !== id),
      number_of_passengers: prev.passengers.length - 1,
    }));
  };

  const updatePassenger = (id: string, field: keyof Passenger, value: string) => {
    setFormData((prev) => ({
      ...prev,
      passengers: prev.passengers.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
  };

  const togglePassengerExpand = (id: string) => {
    setExpandedPassenger(expandedPassenger === id ? null : id);
  };

  // ─── Validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    
    if (!formData.title?.trim()) next.title = 'Title is required';
    if (!formData.date_of_travel) next.date_of_travel = 'Travel date is required';
    if (!formData.departure_from?.trim()) next.departure_from = 'Departure location is required';
    if (!formData.destination?.trim()) next.destination = 'Destination is required';
    if (formData.passengers.length < 1) {
      next.passengers = 'At least one passenger is required';
    }

    // Validate each passenger
    formData.passengers.forEach((p, index) => {
      if (!p.name?.trim()) {
        next[`passenger_${p.id}_name`] = `Passenger ${index + 1} name is required`;
      }
    });
    
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

    // Prepare the data for submission - include all passengers
    const submitData: CreateTicketRequest = {
      title: formData.title,
      description: formData.description,
      department_id: formData.department_id,
      trip_type: formData.trip_type,
      date_of_travel: formData.date_of_travel,
      time_of_travel: formData.time_of_travel,
      return_date: formData.return_date,
      return_time: formData.return_time,
      preferred_departure_time: formData.preferred_departure_time,
      preferred_return_time: formData.preferred_return_time,
      departure_from: formData.departure_from,
      destination: formData.destination,
      remarks: formData.remarks,
      judge_name: formData.passengers[0]?.judge_name || formData.judge_name,
      pj_number: formData.passengers[0]?.pj_number || formData.pj_number,
      travel_class: formData.travel_class,
      number_of_passengers: formData.passengers.length,
      special_requests: formData.special_requests,
      priority: formData.priority,
      assigned_to: formData.assigned_to,
      is_draft: formData.is_draft,
      passengers: formData.passengers.map((p) => ({
        name: p.name,
        judge_name: p.judge_name || null,
        pj_number: p.pj_number || null,
        time_of_travel: p.time_of_travel || null,
        return_time: p.return_time || null,
      })),
    };

    onSave(submitData);
  };

  const isRoundTrip = formData.trip_type === 'round_trip';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
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
              rows={2}
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
                Departure Time (Default)
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
                  Return Time (Default)
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

          {/* ─── Travel Class ──────────────────────────────────────────────── */}
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

          {/* ─── Passengers Section ────────────────────────────────────────── */}
          <div className="border border-stone-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-600">
                Passengers ({formData.passengers.length})
              </label>
              <button
                type="button"
                onClick={addPassenger}
                className="flex items-center gap-1 text-xs font-medium text-[#1a3d1c] hover:text-[#2d5c30] transition-colors"
              >
                <UserPlus size={14} />
                Add Passenger
              </button>
            </div>

            {errors.passengers && (
              <p className="text-xs text-red-500">{errors.passengers}</p>
            )}

            {formData.passengers.map((passenger, index) => (
              <div
                key={passenger.id}
                className="border border-stone-100 rounded-lg overflow-hidden"
              >
                {/* Passenger Header */}
                <div
                  className="flex items-center justify-between p-3 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors"
                  onClick={() => togglePassengerExpand(passenger.id!)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-medium text-stone-500">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-stone-700 truncate">
                      {passenger.name || `Passenger ${index + 1}`}
                    </span>
                    {passenger.judge_name && (
                      <span className="text-xs text-stone-400 truncate">
                        Judge: {passenger.judge_name}
                      </span>
                    )}
                    {passenger.time_of_travel && (
                      <span className="text-xs text-stone-400">
                        {timeSlots.find(t => t.value === passenger.time_of_travel)?.label || passenger.time_of_travel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePassenger(passenger.id!);
                      }}
                      className={`p-1 rounded hover:bg-red-50 transition-colors ${
                        formData.passengers.length <= 1 ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                      disabled={formData.passengers.length <= 1}
                    >
                      <UserMinus size={14} className="text-red-500" />
                    </button>
                    {expandedPassenger === passenger.id ? (
                      <ChevronUp size={16} className="text-stone-400" />
                    ) : (
                      <ChevronDown size={16} className="text-stone-400" />
                    )}
                  </div>
                </div>

                {/* Passenger Details (Expandable) */}
                {expandedPassenger === passenger.id && (
                  <div className="p-3 space-y-3 bg-white">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1">
                          Passenger Name *
                        </label>
                        <input
                          type="text"
                          value={passenger.name}
                          onChange={(e) => updatePassenger(passenger.id!, 'name', e.target.value)}
                          placeholder="Full name"
                          className={`w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c] ${
                            errors[`passenger_${passenger.id}_name`] ? 'border-red-300' : 'border-stone-200'
                          }`}
                        />
                        {errors[`passenger_${passenger.id}_name`] && (
                          <p className="text-xs text-red-500 mt-0.5">{errors[`passenger_${passenger.id}_name`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1">
                          Judge Name
                        </label>
                        <input
                          type="text"
                          value={passenger.judge_name || ''}
                          onChange={(e) => updatePassenger(passenger.id!, 'judge_name', e.target.value)}
                          placeholder="e.g., Hon. Justice Smith"
                          className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1">
                          PJ Number
                        </label>
                        <input
                          type="text"
                          value={passenger.pj_number || ''}
                          onChange={(e) => updatePassenger(passenger.id!, 'pj_number', e.target.value)}
                          placeholder="e.g., PJ-1234"
                          className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1">
                          Departure Time
                        </label>
                        <select
                          value={passenger.time_of_travel || ''}
                          onChange={(e) => updatePassenger(passenger.id!, 'time_of_travel', e.target.value)}
                          className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
                        >
                          <option value="">Same as default</option>
                          {timeSlots.map((slot) => (
                            <option key={slot.value} value={slot.value}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {isRoundTrip && (
                      <div>
                        <label className="block text-xs font-medium text-stone-500 mb-1">
                          Return Time
                        </label>
                        <select
                          value={passenger.return_time || ''}
                          onChange={(e) => updatePassenger(passenger.id!, 'return_time', e.target.value)}
                          className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d1c]"
                        >
                          <option value="">Same as default</option>
                          {timeSlots.map((slot) => (
                            <option key={slot.value} value={slot.value}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
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