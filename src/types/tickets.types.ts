// src/features/tickets/tickets.types.ts

export type TicketStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'booked'
  | 'cancelled'
  | 'completed';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TravelClass = 'economy' | 'premium_economy' | 'business' | 'first';

export type FlightTimePreference = 'morning' | 'afternoon' | 'evening' | 'night' | 'any';

export type TicketTripType = 'one_way' | 'round_trip';

export interface Ticket {
  id: string;
  reference_no: string;
  title: string;
  description: string | null;
  department_id: string | null;
  department_name: string | null;
  
  // ─── Trip Type ────────────────────────────────────────────────────────────
  trip_type: TicketTripType;
  
  // ─── Travel Details ──────────────────────────────────────────────────────
  date_of_travel: string;
  time_of_travel: string | null; // HH:MM format
  return_date: string | null;
  return_time: string | null; // HH:MM format
  
  // ─── Flight Time Preferences ─────────────────────────────────────────────
  preferred_departure_time: FlightTimePreference;
  preferred_return_time: FlightTimePreference | null;
  
  // ─── Route Details ───────────────────────────────────────────────────────
  departure_from: string;
  destination: string;
  remarks: string | null;
  
  // ─── Judge & Case Details ────────────────────────────────────────────────
  judge_name: string | null;
  pj_number: string | null;
  
  // ─── Additional Travel Info ──────────────────────────────────────────────
  travel_class: TravelClass;
  number_of_passengers: number;
  special_requests: string | null;
  
  // ─── Approval & Status ───────────────────────────────────────────────────
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string;
  created_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  
  // ─── Booking Details ─────────────────────────────────────────────────────
  booked_by: string | null;
  booked_by_name: string | null;
  booked_at: string | null;
  booking_reference: string | null;
  
  // ─── Timestamps ──────────────────────────────────────────────────────────
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketApprovalStep {
  id: string;
  ticket_id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'returned' | 'booked' | 'cancelled';
  from_user_id: string;
  from_user_name: string;
  to_user_id: string | null;
  to_user_name: string | null;
  comments: string | null;
  created_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketWithHistory extends Ticket {
  approval_history: TicketApprovalStep[];
  comments: TicketComment[];
}

export interface TicketPaginationResponse {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Request/Response Types ────────────────────────────────────────────────────

export interface CreateTicketRequest {
  title: string;
  description?: string;
  department_id?: string;
  
  // ─── Trip Type ────────────────────────────────────────────────────────────
  trip_type: TicketTripType;
  
  // ─── Travel Details ──────────────────────────────────────────────────────
  date_of_travel: string;
  time_of_travel?: string; // HH:MM format
  return_date?: string | null;
  return_time?: string | null; // HH:MM format
  
  // ─── Flight Time Preferences ─────────────────────────────────────────────
  preferred_departure_time?: FlightTimePreference;
  preferred_return_time?: FlightTimePreference | null;
  
  // ─── Route Details ───────────────────────────────────────────────────────
  departure_from: string;
  destination: string;
  remarks?: string;
  
  // ─── Judge & Case Details ────────────────────────────────────────────────
  judge_name?: string | null;
  pj_number?: string | null;
  
  // ─── Additional Travel Info ──────────────────────────────────────────────
  travel_class?: TravelClass;
  number_of_passengers?: number;
  special_requests?: string;
  
  // ─── Status ──────────────────────────────────────────────────────────────
  priority?: TicketPriority;
  assigned_to?: string;
  is_draft?: boolean;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string | null;
  department_id?: string | null;
  
  // ─── Trip Type ────────────────────────────────────────────────────────────
  trip_type?: TicketTripType;
  
  // ─── Travel Details ──────────────────────────────────────────────────────
  date_of_travel?: string;
  time_of_travel?: string | null; // HH:MM format
  return_date?: string | null;
  return_time?: string | null; // HH:MM format
  
  // ─── Flight Time Preferences ─────────────────────────────────────────────
  preferred_departure_time?: FlightTimePreference;
  preferred_return_time?: FlightTimePreference | null;
  
  // ─── Route Details ───────────────────────────────────────────────────────
  departure_from?: string;
  destination?: string;
  remarks?: string | null;
  
  // ─── Judge & Case Details ────────────────────────────────────────────────
  judge_name?: string | null;
  pj_number?: string | null;
  
  // ─── Additional Travel Info ──────────────────────────────────────────────
  travel_class?: TravelClass;
  number_of_passengers?: number;
  special_requests?: string | null;
  
  // ─── Status & Approval ───────────────────────────────────────────────────
  priority?: TicketPriority;
  assigned_to?: string | null;
  status?: TicketStatus;
}

export interface TicketFilters {
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  trip_type?: TicketTripType;
  department_id?: string;
  assigned_to?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  departure_from?: string;
  destination?: string;
  
  // ─── Judge & Case Filters ───────────────────────────────────────────────
  judge_name?: string;
  pj_number?: string;
  
  for_my_action?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'date_of_travel' | 'priority' | 'status';
  sort_order?: 'ASC' | 'DESC';
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const TRIP_TYPE_LABELS: Record<TicketTripType, string> = {
  one_way: 'One Way',
  round_trip: 'Round Trip',
};

export const FLIGHT_TIME_LABELS: Record<FlightTimePreference, string> = {
  morning: 'Morning (6AM - 12PM)',
  afternoon: 'Afternoon (12PM - 5PM)',
  evening: 'Evening (5PM - 9PM)',
  night: 'Night (9PM - 6AM)',
  any: 'Any Time',
};

export const FLIGHT_TIME_SHORT_LABELS: Record<FlightTimePreference, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  any: 'Any',
};

export const TRAVEL_CLASS_LABELS: Record<TravelClass, string> = {
  economy: 'Economy',
  premium_economy: 'Premium Economy',
  business: 'Business',
  first: 'First Class',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  booked: 'Booked',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  draft: 'bg-stone-100 text-stone-600 ring-stone-200',
  pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  booked: 'bg-blue-50 text-blue-700 ring-blue-200',
  cancelled: 'bg-stone-200 text-stone-500 ring-stone-300',
  completed: 'bg-green-50 text-green-700 ring-green-200',
};

export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'text-stone-500',
  normal: 'text-blue-600',
  high: 'text-amber-600',
  urgent: 'text-red-600',
};

// ─── Helper Functions ──────────────────────────────────────────────────────

export const getTripTypeLabel = (type: TicketTripType): string => {
  return TRIP_TYPE_LABELS[type] || type;
};

export const getFlightTimeLabel = (time: FlightTimePreference): string => {
  return FLIGHT_TIME_LABELS[time] || time;
};

export const getFlightTimeShortLabel = (time: FlightTimePreference): string => {
  return FLIGHT_TIME_SHORT_LABELS[time] || time;
};

export const getTravelClassLabel = (cls: TravelClass): string => {
  return TRAVEL_CLASS_LABELS[cls] || cls;
};

export const getTicketStatusLabel = (status: TicketStatus): string => {
  return TICKET_STATUS_LABELS[status] || status;
};

export const getTicketStatusColor = (status: TicketStatus): string => {
  return TICKET_STATUS_COLORS[status] || 'bg-stone-100 text-stone-600 ring-stone-200';
};

export const getTicketPriorityColor = (priority: TicketPriority): string => {
  return TICKET_PRIORITY_COLORS[priority] || 'text-stone-500';
};

export const isRoundTrip = (tripType: TicketTripType): boolean => {
  return tripType === 'round_trip';
};

export const isOneWay = (tripType: TicketTripType): boolean => {
  return tripType === 'one_way';
};

// ─── Time Helpers ──────────────────────────────────────────────────────────

export const formatTime = (time: string | null): string => {
  if (!time) return '—';
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }
  return time;
};

export const isValidTime = (time: string): boolean => {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

export const getTimeOptions = (): string[] => {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      times.push(`${h}:${m}`);
    }
  }
  return times;
};

export const getTimeSlots = (): { value: string; label: string }[] => {
  return getTimeOptions().map((time) => ({
    value: time,
    label: formatTime(time),
  }));
};