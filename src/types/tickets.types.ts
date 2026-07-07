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

export interface Ticket {
  id: string;
  reference_no: string;
  title: string;
  description: string | null;
  department_id: string | null;
  department_name: string | null;
  
  // Travel Details
  date_of_travel: string;
  return_date: string | null;
  departure_from: string;
  destination: string;
  preferred_flight_time: FlightTimePreference;
  remarks: string | null;
  
  // Additional Travel Info
  travel_class: TravelClass;
  number_of_passengers: number;
  special_requests: string | null;
  
  // Approval & Status
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
  
  // Booking Details
  booked_by: string | null;
  booked_by_name: string | null;
  booked_at: string | null;
  booking_reference: string | null;
  
  // Timestamps
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

// ── Request/Response Types ────────────────────────────────────────────────────

export interface CreateTicketRequest {
  title: string;
  description?: string;
  department_id?: string;
  date_of_travel: string;
  return_date?: string;
  departure_from: string;
  destination: string;
  preferred_flight_time?: FlightTimePreference;
  remarks?: string;
  travel_class?: TravelClass;
  number_of_passengers?: number;
  special_requests?: string;
  priority?: TicketPriority;
  assigned_to?: string;
  is_draft?: boolean;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string | null;
  department_id?: string | null;
  date_of_travel?: string;
  return_date?: string | null;
  departure_from?: string;
  destination?: string;
  preferred_flight_time?: FlightTimePreference;
  remarks?: string | null;
  travel_class?: TravelClass;
  number_of_passengers?: number;
  special_requests?: string | null;
  priority?: TicketPriority;
  assigned_to?: string | null;
}

export interface TicketFilters {
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  department_id?: string;
  assigned_to?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  departure_from?: string;
  destination?: string;
  for_my_action?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'date_of_travel' | 'priority' | 'status';
  sort_order?: 'ASC' | 'DESC';
}