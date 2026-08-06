// src/types/conference.types.ts

// ─── Conference Status ──────────────────────────────────────────────────────

export type ConferenceStatus = 
  | 'draft' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'completed' 
  | 'cancelled';

// ─── Conference Request Types ──────────────────────────────────────────────

export interface ConferenceRequest {
  id: string;
  serial_number: number;
  particulars: string;
  start_date: string;
  end_date: string;
  number_of_pax: number;
  status: ConferenceStatus;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConferenceRequestInput {
  particulars: string;
  start_date: string;
  end_date: string;
  number_of_pax: number;
}

export interface UpdateConferenceRequestInput {
  particulars?: string;
  start_date?: string;
  end_date?: string;
  number_of_pax?: number;
  status?: ConferenceStatus;
}

export interface ApproveConferenceRequestInput {
  comments?: string;
}

export interface ReturnConferenceRequestInput {
  reason: string;
}

export interface CompleteConferenceRequestInput {
  feedback?: string;
}

export interface CancelConferenceRequestInput {
  reason: string;
}

// ─── Filters and Responses ──────────────────────────────────────────────────

export interface ConferenceRequestFilters {
  status?: ConferenceStatus;
  start_date_from?: string;
  start_date_to?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'start_date' | 'end_date' | 'serial_number';
  sort_order?: 'ASC' | 'DESC';
}

export interface ConferencePaginationResponse {
  data: ConferenceRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConferenceStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
  total_pax: number;
  upcoming: number;
  ongoing: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const CONFERENCE_STATUSES: ConferenceStatus[] = [
  'draft', 
  'pending', 
  'approved', 
  'rejected', 
  'completed', 
  'cancelled'
];

export const CONFERENCE_SORT_FIELDS = [
  'created_at', 
  'updated_at', 
  'start_date', 
  'end_date', 
  'serial_number'
] as const;

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Get display label for conference status
 */
export const getConferenceStatusLabel = (status: ConferenceStatus): string => {
  const labels: Record<ConferenceStatus, string> = {
    draft: 'Draft',
    pending: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
};

/**
 * Get status color for UI badges
 */
export const getConferenceStatusColor = (status: ConferenceStatus): string => {
  const colors: Record<ConferenceStatus, string> = {
    draft: 'bg-gray-50 text-gray-700 ring-gray-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
    completed: 'bg-blue-50 text-blue-700 ring-blue-200',
    cancelled: 'bg-stone-50 text-stone-700 ring-stone-200',
  };
  return colors[status];
};

/**
 * Get status dot color for UI
 */
export const getConferenceStatusDotColor = (status: ConferenceStatus): string => {
  const colors: Record<ConferenceStatus, string> = {
    draft: 'bg-gray-500',
    pending: 'bg-amber-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
    completed: 'bg-blue-500',
    cancelled: 'bg-stone-500',
  };
  return colors[status];
};

/**
 * Get status options for dropdown
 */
export const getConferenceStatusOptions = (): Array<{ value: ConferenceStatus; label: string }> => {
  return CONFERENCE_STATUSES.map(status => ({
    value: status,
    label: getConferenceStatusLabel(status),
  }));
};

/**
 * Check if conference is editable (draft or pending)
 */
export const isConferenceEditable = (status: ConferenceStatus): boolean => {
  return status === 'draft' || status === 'pending';
};

/**
 * Check if conference can be submitted (draft → pending)
 */
export const canSubmitConference = (status: ConferenceStatus): boolean => {
  return status === 'draft';
};

/**
 * Check if conference can be approved (pending → approved)
 */
export const canApproveConference = (status: ConferenceStatus): boolean => {
  return status === 'pending';
};

/**
 * Check if conference can be completed (approved → completed)
 */
export const canCompleteConference = (status: ConferenceStatus): boolean => {
  return status === 'approved';
};

/**
 * Check if conference can be cancelled (draft, pending, or approved)
 */
export const canCancelConference = (status: ConferenceStatus): boolean => {
  return ['draft', 'pending', 'approved'].includes(status);
};

/**
 * Check if conference can be returned (pending → rejected)
 */
export const canReturnConference = (status: ConferenceStatus): boolean => {
  return status === 'pending';
};

/**
 * Check if conference can be deleted (draft, pending, or rejected)
 */
export const canDeleteConference = (status: ConferenceStatus): boolean => {
  return status === 'draft' || status === 'pending' || status === 'rejected';
};

/**
 * Check if conference is ongoing
 */
export const isConferenceOngoing = (startDate: string, endDate: string): boolean => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  return now >= start && now <= end;
};

/**
 * Check if conference is upcoming (within 7 days)
 */
export const isConferenceUpcoming = (startDate: string): boolean => {
  const now = new Date();
  const start = new Date(startDate);
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  return start > now && start <= sevenDaysFromNow;
};

/**
 * Check if conference is in the past (ended)
 */
export const isConferencePast = (endDate: string): boolean => {
  const now = new Date();
  const end = new Date(endDate);
  return end < now;
};

/**
 * Calculate conference duration in days
 */
export const getConferenceDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Format date for display
 */
export const formatConferenceDate = (date: string | null | undefined): string => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

// ─── UI State Types ───────────────────────────────────────────────────────────

export interface ConferenceListState {
  filters: ConferenceRequestFilters;
  data: ConferenceRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

export interface ConferenceDetailState {
  data: ConferenceRequest | null;
  loading: boolean;
  error: string | null;
}

export interface ConferenceStatsState {
  data: ConferenceStats | null;
  loading: boolean;
  error: string | null;
}