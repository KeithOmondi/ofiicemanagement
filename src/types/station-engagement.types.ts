// ============================================================
// src/types/station-engagement.types.ts
//
// NOTE ON THE IMPORT BELOW: this assumes succession-courts types live
// alongside this file in a flat src/types/ folder — matching how
// RegistryNewReport.tsx currently imports them
// (`'../../types/succession-courts'` from src/pages/staff/). Adjust
// the path if your actual tree differs.
// ============================================================

import type { SuccessionCourtCategory } from './succession-courts';

// ─── Enums ──────────────────────────────────────────────────────────────────

export type EngagementMode =
  | 'phone_call'
  | 'whatsapp'
  | 'email'
  | 'physical_visit'
  | 'webinar_followup'
  | 'video_call';

export type EngagementStatus =
  | 'resolved'
  | 'ongoing'
  | 'escalated';

export type ReasonNotReached =
  | 'no_response'
  | 'wrong_contact'
  | 'station_closed'
  | 'staff_unavailable'
  | 'technical_issues'
  | 'other';

export type ReportStatus =
  | 'draft'
  | 'submitted'
  | 'reviewed'
  | 'approved'
  | 'rejected';

// NEW (gap #1): shared urgency scale for inline-escalated engagements and
// standalone escalation items. Previously there was no urgency concept
// anywhere in this file, so nothing could be triaged or sorted by severity.
export type Urgency = 'high' | 'medium' | 'low';

// ─── Constants ────────────────────────────────────────────────────────────

export const ENGAGEMENT_MODE_OPTIONS: { value: EngagementMode; label: string }[] = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'physical_visit', label: 'Physical Visit' },
  { value: 'webinar_followup', label: 'Webinar Follow-up' },
  { value: 'video_call', label: 'Video Call' },
];

export const ENGAGEMENT_STATUS_OPTIONS: { value: EngagementStatus; label: string }[] = [
  { value: 'resolved', label: 'Resolved' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'escalated', label: 'Escalated' },
];

export const REASON_NOT_REACHED_OPTIONS: { value: ReasonNotReached; label: string }[] = [
  { value: 'no_response', label: 'No Response' },
  { value: 'wrong_contact', label: 'Wrong Contact' },
  { value: 'station_closed', label: 'Station Closed' },
  { value: 'staff_unavailable', label: 'Staff Unavailable' },
  { value: 'technical_issues', label: 'Technical Issues' },
  { value: 'other', label: 'Other' },
];

export const REPORT_STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const ISSUES_RAISED_OPTIONS: string[] = [
  'Technical Issues',
  'Staffing Issues',
  'Resource Constraints',
  'Procedure Delays',
  'Communication Gaps',
  'System Downtime',
  'Access Issues',
  'Training Needs',
  'Compliance Concerns',
  'Other',
];

// NEW (gap #1)
export const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// NEW (gap #8): report statuses that may still be edited by their submitter.
// The slice's updateReport thunk checks against this before calling the API,
// instead of silently allowing edits to an already-approved/reviewed report.
export const EDITABLE_REPORT_STATUSES: ReportStatus[] = ['draft', 'rejected'];

export const isReportEditable = (status: ReportStatus): boolean =>
  EDITABLE_REPORT_STATUSES.includes(status);

// ─── Core Types ────────────────────────────────────────────────────────────

export interface Engagement {
  id: string;
  station_id: string; // FK -> SuccessionCourt.id
  station_name: string; // denormalized SuccessionCourt.station, for display
  station_category: SuccessionCourtCategory; // NEW (gap #3/#4) — needed once a single report can span multiple categories, see StationEngagementReport.categories
  date: string;
  contact_person: string;
  contact_role?: string;
  mode: EngagementMode;
  status: EngagementStatus;
  follow_up_date?: string;
  issues_raised: string[];
  action_taken: string;
  resolution?: string;
  urgency?: Urgency; // NEW (gap #1) — set only when status === 'escalated'
  why_needs_escalation?: string; // NEW (gap #2) — previously had nowhere to persist
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EngagementInput {
  station_id: string;
  station_name: string;
  station_category: SuccessionCourtCategory; // NEW
  date: string;
  contact_person: string;
  contact_role?: string;
  mode: EngagementMode;
  status: EngagementStatus;
  follow_up_date?: string;
  issues_raised: string[];
  action_taken: string;
  resolution?: string;
  urgency?: Urgency; // NEW
  why_needs_escalation?: string; // NEW
}

export interface UnengagedStation {
  station_id: string;
  station_name: string;
  category: SuccessionCourtCategory; // CHANGED — was a bare string, now shares the real enum
  reason_not_reached?: ReasonNotReached;
  reason_not_reached_detail?: string; // NEW (gap #6) — free text captured when reason_not_reached === 'other'
  planned_engagement_date?: string;
  is_active: boolean;
}

export interface EscalationItem {
  id: string;
  station_id: string;
  station_name: string;
  issue: string;
  why_needs_escalation: string;
  recommended_action: string;
  urgency: Urgency; // NEW (gap #1) — required; a standalone escalation always needs a triage level
  source_engagement_id?: string | null; // NEW (gap #2) — links back to the Engagement row that produced this; absent/null for escalations raised directly in Section D
  status: 'pending' | 'resolved';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EscalationItemInput {
  station_id: string;
  station_name: string;
  issue: string;
  why_needs_escalation: string;
  recommended_action: string;
  urgency: Urgency; // NEW
  source_engagement_id?: string | null; // NEW
}

export interface RecurringPattern {
  id: string;
  pattern: string;
  stations_affected: string[];
  severity: 'low' | 'medium' | 'high';
  suggested_action: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PriorityItem {
  id: string;
  priority: string;
  station_id?: string;
  station_name?: string;
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Report Types ──────────────────────────────────────────────────────────

export interface StationEngagementReport {
  id: string;
  week_start: string;
  week_end: string;
  // CHANGED (gap #4): was a single 'A'|'B'|'C'|'D'. successionCourts assigns
  // support persons per-court, per-category, or per-station (see
  // assignSupportPersonByCategory / assignSupportPersonByStation), so one
  // officer's assigned courts can legitimately span more than one category —
  // a single-category field couldn't represent that.
  categories: SuccessionCourtCategory[];
  support_person_id: string; // NEW (gap #3) — FK -> User.id, mirrors SuccessionCourt.support_person_id so a report ties directly to the officer's real assignment set
  total_stations_assigned: number;

  executive_summary: string;
  engagements: Engagement[];
  unengaged_stations: UnengagedStation[];
  escalations: EscalationItem[];
  additional_issues: string;
  recurring_patterns: string;
  priorities: string;

  submitted_by: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  approved_by?: string;
  approved_at?: string;
  status: ReportStatus;
  feedback?: string;

  created_at: string;
  updated_at: string;
}

// ─── Request/Response Types ──────────────────────────────────────────────

export interface CreateEngagementReportPayload {
  week_start: string;
  week_end: string;
  categories: SuccessionCourtCategory[]; // CHANGED — see StationEngagementReport.categories
  support_person_id: string; // NEW
  // NEW (gap #5): client computes this from the officer's live
  // successionCourts assignment count (myCourts.length) at submit time and
  // sends it — previously there was no way to derive it on either side.
  total_stations_assigned: number;
  executive_summary: string;
  engagements: EngagementInput[];
  unengaged_stations: {
    station_id: string;
    reason_not_reached?: ReasonNotReached;
    reason_not_reached_detail?: string; // NEW
    planned_engagement_date?: string;
  }[];
  escalations: EscalationItemInput[];
  additional_issues: string;
  recurring_patterns: string;
  priorities: string;
}

export interface UpdateEngagementReportPayload {
  executive_summary?: string;
  engagements?: EngagementInput[];
  unengaged_stations?: {
    station_id: string;
    reason_not_reached?: ReasonNotReached;
    reason_not_reached_detail?: string; // NEW
    planned_engagement_date?: string;
  }[];
  escalations?: EscalationItemInput[];
  additional_issues?: string;
  recurring_patterns?: string;
  priorities?: string;
  status?: ReportStatus;
  feedback?: string;
}

export interface ReviewReportPayload {
  status: 'approved' | 'rejected';
  feedback?: string;
}

export interface EngagementReportFilters {
  category?: SuccessionCourtCategory; // CHANGED — now shares the real enum instead of redefining 'A'|'B'|'C'|'D' locally
  urgency?: Urgency; // NEW (gap #1) — filter escalations/engagements by triage level
  status?: ReportStatus;
  week_start?: string;
  week_end?: string;
  submitted_by?: string;
  support_person_id?: string; // NEW (gap #3/#7) — mirrors successionCourts filters, lets queries scope directly to "my reports"
  limit?: number;
  offset?: number;
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

// ─── Report Summary Types ────────────────────────────────────────────────

export interface ReportSummary {
  id: string;
  week_start: string;
  week_end: string;
  categories: SuccessionCourtCategory[]; // CHANGED
  total_stations: number;
  engaged_count: number;
  unengaged_count: number;
  escalated_count: number;
  status: ReportStatus;
  submitted_by: string;
  submitted_at?: string;
}

// ─── PDF Report Types ─────────────────────────────────────────────────────

export interface PDFReportData {
  report: StationEngagementReport;
  generated_at: string;
  generated_by: string;
}

// ─── Stats Types ─────────────────────────────────────────────────────────

export interface EngagementStats {
  total_reports: number;
  by_category: Record<SuccessionCourtCategory, number>; // CHANGED — was a hand-rolled A/B/C/D shape, now shares the real enum
  by_status: {
    draft: number;
    submitted: number;
    reviewed: number;
    approved: number;
    rejected: number;
  };
  by_urgency: Record<Urgency, number>; // NEW (gap #1) — needed for an Action Table sorted/counted by severity
  engagement_rate: number;
  escalation_rate: number;
}

// ─── Slice State ─────────────────────────────────────────────────────────

export interface StationEngagementState {
  // Data
  reports: StationEngagementReport[];
  currentReport: StationEngagementReport | null;
  reportSummary: ReportSummary | null;
  stats: EngagementStats | null;

  // Status
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Pagination
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  // Filters
  filters: EngagementReportFilters;

  // PDF
  pdfData: PDFReportData | null;
  isGeneratingPDF: boolean;
}

// ─── Form Types ──────────────────────────────────────────────────────────

export interface EngagementFormValues {
  station_id: string;
  station_name: string;
  station_category: SuccessionCourtCategory | ''; // NEW
  date: string;
  contact_person: string;
  contact_role: string;
  mode: EngagementMode | '';
  status: EngagementStatus | '';
  follow_up_date: string;
  issues_raised: string[];
  action_taken: string;
  resolution: string;
  urgency: Urgency | ''; // NEW
  why_needs_escalation: string; // NEW
}

export interface UnengagedStationFormValues {
  station_id: string;
  reason_not_reached: ReasonNotReached | '';
  reason_not_reached_detail: string; // NEW
  planned_engagement_date: string;
}

export interface EscalationFormValues {
  station_id: string;
  station_name: string;
  issue: string;
  why_needs_escalation: string;
  recommended_action: string;
  urgency: Urgency | ''; // NEW
}

export interface ReportFormValues {
  week_start: string;
  week_end: string;
  categories: SuccessionCourtCategory[]; // CHANGED
  executive_summary: string;
  engagements: EngagementFormValues[];
  unengaged_stations: UnengagedStationFormValues[];
  escalations: EscalationFormValues[];
  additional_issues: string;
  recurring_patterns: string;
  priorities: string;
}

// ─── Review Form Types ──────────────────────────────────────────────────

export interface ReviewFormValues {
  status: 'approved' | 'rejected' | '';
  feedback: string;
}

// ─── Component Props ─────────────────────────────────────────────────────

export interface ReportCardProps {
  report: StationEngagementReport;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSubmit: (id: string) => void;
  onReview: (id: string) => void;
  onGeneratePDF: (id: string) => void;
  isSubmitting?: boolean;
}

export interface EngagementTableProps {
  engagements: Engagement[];
  onEdit?: (engagement: Engagement) => void;
  onDelete?: (id: string) => void;
}

export interface ReportStatsProps {
  stats: EngagementStats;
}

export interface EngagementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EngagementFormValues) => void;
  initialData?: EngagementFormValues;
  stations: { id: string; name: string; category: SuccessionCourtCategory }[]; // CHANGED
  isSubmitting?: boolean;
}

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReviewFormValues) => void;
  reportId: string;
  reportName: string;
  isSubmitting?: boolean;
}