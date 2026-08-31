// src/types/service-week.types.ts

// ─── Core Types ────────────────────────────────────────────────────────────

export type ServiceWeekStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface CaseReturn {
  serial_number: number;
  case_number: string;
  cause_listed_activity: string;
  outcome: string;
  remarks?: string;
}

export interface ServiceWeekReport {
  id: string;
  station: string;
  division?: string;
  week_start: string;
  week_end: string;
  date: string;
  judge_name: string;
  cases: CaseReturn[];
  status: ServiceWeekStatus;
  
  // Prepared by (original creator)
  prepared_by: string;
  prepared_designation: string;
  prepared_signature?: string;
  prepared_date?: string;
  
  // Confirmed by
  confirmed_by?: string;
  confirmed_designation?: string;
  confirmed_signature?: string;
  confirmed_date?: string;
  
  // Approved by
  approved_by?: string;
  approved_designation?: string;
  approved_signature?: string;
  approved_date?: string;
  
  // Super Admin Edit Tracking
  edited_by?: string;
  edited_designation?: string;
  edited_at?: string;
  edit_reason?: string;
  edit_history?: ServiceWeekEditHistory[];
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejected_reason?: string;
  
  // Versioning
  version: number;
  is_edited_by_admin: boolean;
}

export interface ServiceWeekEditHistory {
  id: string;
  report_id: string;
  edited_by: string;
  edited_designation: string;
  edited_at: string;
  edit_reason: string;
  changes: ServiceWeekEditChange[];
}

export interface ServiceWeekEditChange {
  field: string;
  old_value: string | number | boolean | CaseReturn[] | null | undefined;
  new_value: string | number | boolean | CaseReturn[] | null | undefined;
}

// ─── Payload Types ──────────────────────────────────────────────────────────

export interface CreateServiceWeekPayload {
  station: string;
  division?: string;
  week_start: string;
  week_end: string;
  date: string;
  judge_name: string;
  cases: CaseReturn[];
  prepared_by: string;
  prepared_designation: string;
  prepared_date?: string;
  confirmed_by?: string;
  confirmed_designation?: string;
  confirmed_date?: string;
  approved_by?: string;
  approved_designation?: string;
  approved_date?: string;
  saveAsDraft?: boolean;
}

export interface UpdateServiceWeekPayload {
  station?: string;
  division?: string;
  week_start?: string;
  week_end?: string;
  date?: string;
  judge_name?: string;
  cases?: CaseReturn[];
  prepared_by?: string;
  prepared_designation?: string;
  prepared_date?: string;
  confirmed_by?: string;
  confirmed_designation?: string;
  confirmed_date?: string;
  approved_by?: string;
  approved_designation?: string;
  approved_date?: string;
  status?: ServiceWeekStatus;
  
  // Super Admin specific fields
  edit_reason?: string;
  edited_by?: string;
  edited_designation?: string;
  edited_at?: string;
}

export interface SuperAdminEditPayload {
  report_id: string;
  updates: Partial<Omit<ServiceWeekReport, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'version' | 'edit_history'>>;
  edit_reason: string;
  edited_by: string;
  edited_designation: string;
}

export interface ServiceWeekFilters {
  station?: string;
  judge_name?: string;
  week_start?: string;
  week_end?: string;
  status?: ServiceWeekStatus;
  edited_by_admin?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: keyof ServiceWeekReport;
  sort_order?: 'asc' | 'desc';
}

// ─── Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Slice State ─────────────────────────────────────────────────────────

export interface ServiceWeekState {
  reports: ServiceWeekReport[];
  currentReport: ServiceWeekReport | null;
  isLoading: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: ServiceWeekFilters;
  editHistory: ServiceWeekEditHistory[];
  showEditHistory: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────

export const SERVICE_WEEK_STATUS_LABELS: Record<ServiceWeekStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const SERVICE_WEEK_STATUS_COLORS: Record<ServiceWeekStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export const SERVICE_WEEK_STATUS_ORDER: readonly ServiceWeekStatus[] = [
  'draft',
  'submitted',
  'approved',
  'rejected'
] as const;

// ─── Permission Constants ─────────────────────────────────────────────────

export const EDITABLE_STATUSES: readonly ServiceWeekStatus[] = ['draft', 'submitted', 'rejected'] as const;

export const SUPER_ADMIN_EDITABLE_FIELDS: readonly (keyof ServiceWeekReport)[] = [
  'station',
  'division',
  'week_start',
  'week_end',
  'date',
  'judge_name',
  'cases',
  'prepared_by',
  'prepared_designation',
  'confirmed_by',
  'confirmed_designation',
  'approved_by',
  'approved_designation',
  'status'
] as const;

// ─── Form Types ────────────────────────────────────────────────────────────

export interface ServiceWeekFormValues {
  station: string;
  division: string;
  week_start: string;
  week_end: string;
  date: string;
  judge_name: string;
  cases: CaseReturnFormValues[];
  prepared_by: string;
  prepared_designation: string;
  prepared_date: string;
  confirmed_by: string;
  confirmed_designation: string;
  confirmed_date: string;
  approved_by: string;
  approved_designation: string;
  approved_date: string;
}

export interface CaseReturnFormValues {
  serial_number: number | '';
  case_number: string;
  cause_listed_activity: string;
  outcome: string;
  remarks: string;
}

// ─── Super Admin Edit Types ────────────────────────────────────────────────

export interface SuperAdminEditFormValues {
  station: string;
  division: string;
  week_start: string;
  week_end: string;
  date: string;
  judge_name: string;
  cases: CaseReturnFormValues[];
  prepared_by: string;
  prepared_designation: string;
  prepared_date: string;
  confirmed_by: string;
  confirmed_designation: string;
  confirmed_date: string;
  approved_by: string;
  approved_designation: string;
  approved_date: string;
  edit_reason: string;
}

export interface SuperAdminEditResponse {
  success: boolean;
  message: string;
  data: ServiceWeekReport;
}

export interface EditHistoryResponse {
  success: boolean;
  message: string;
  data: {
    history: ServiceWeekEditHistory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Helper Types ────────────────────────────────────────────────────────────

export interface ReportPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canEditAsSuperAdmin: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canDelete: boolean;
  canViewHistory: boolean;
}

// ─── API Request/Response Types for Super Admin Edit ──────────────────────

export interface SuperAdminEditRequest {
  reportId: string;
  payload: {
    station?: string;
    division?: string;
    week_start?: string;
    week_end?: string;
    date?: string;
    judge_name?: string;
    cases?: CaseReturn[];
    prepared_by?: string;
    prepared_designation?: string;
    prepared_date?: string;
    confirmed_by?: string;
    confirmed_designation?: string;
    confirmed_date?: string;
    approved_by?: string;
    approved_designation?: string;
    approved_date?: string;
    status?: ServiceWeekStatus;
    edit_reason: string;
  };
}

export interface SuperAdminEditResponseData {
  report: ServiceWeekReport;
  edit_history_entry?: ServiceWeekEditHistory;
}