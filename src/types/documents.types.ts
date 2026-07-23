// src/types/documents.types.ts

// ── Type enums ────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'memo' | 'letter' | 'judgment' | 'ruling'
  | 'order' | 'correspondence' | 'upload' | 'ticket';

/**
 * Document status lifecycle:
 * - `draft` → `uploaded`/`pending_review` → `dept_assigned` (Super Admin assigns to department)
 * - `dept_assigned` → `user_assigned` (Department Head assigns to a specific user)
 * - `user_assigned` → `in_progress` (User acknowledges and starts working)
 * - `in_progress` → `completed` (User finishes)
 * - `completed` → `ready_to_release` or `filed`
 * - `ready_to_release` → `released`
 *
 * The legacy `marked` status is kept for backward compatibility and maps to `dept_assigned`.
 */
export type DocumentStatus =
  | 'draft'
  | 'uploaded'
  | 'pending_review'
  | 'dept_assigned'   // Super Admin → department
  | 'user_assigned'   // Department Head → specific user
  | 'marked'          // Legacy – same as dept_assigned, kept for compatibility
  | 'in_progress'
  | 'completed'
  | 'filed'
  | 'ready_to_release'
  | 'released';

export type DocumentCategory =
  | 'judgments' | 'rulings' | 'correspondence'
  | 'orders' | 'drafts' | 'general';

export type RoutePriority = 'low' | 'normal' | 'urgent';

export type RefType =
  | 'for_signature' | 'for_attention' | 'for_information' | 'direction' | 'other';

// ── NEW: Request Types ──────────────────────────────────────────────────────

export type RequestType =
  | 'driver'
  | 'bodyguard'
  | 'firearm'
  | 'current_station'
  | 'force_number'
  | 'residence_security'
  | 'sentry';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// ── Request Details ──────────────────────────────────────────────────────────

export interface DocumentRequestDetails {
  // Type of request
  request_type: RequestType | null;

  // Driver specific fields
  driver_name?: string | null;
  driver_license?: string | null;
  driver_vehicle?: string | null;
  driver_contact?: string | null;

  // Bodyguard specific fields
  bodyguard_name?: string | null;
  bodyguard_badge?: string | null;
  bodyguard_unit?: string | null;
  bodyguard_contact?: string | null;

  // Firearm specific fields
  firearm_type?: string | null;
  firearm_serial?: string | null;
  firearm_caliber?: string | null;
  firearm_owner?: string | null;
  firearm_license?: string | null;

  // Current station specific fields
  current_station_name?: string | null;
  current_station_location?: string | null;
  current_station_contact?: string | null;
  current_station_head?: string | null;

  // Force number specific fields
  force_number_value?: string | null;
  force_number_rank?: string | null;
  force_number_unit?: string | null;
  force_number_issue_date?: string | null;

  // Residence Security / Sentry specific fields
  residence_address?: string | null;
  residence_city?: string | null;
  residence_state?: string | null;
  security_personnel_count?: number | null;
  security_shift_hours?: string | null;
  security_equipment?: string | null;
  sentry_post_location?: string | null;
  sentry_instructions?: string | null;

  // Common request fields
  request_date?: string | null;
  request_reason?: string | null;
  request_duration?: string | null;
  request_start_date?: string | null;
  request_end_date?: string | null;
  requesting_officer?: string | null;
  requesting_officer_rank?: string | null;
  approving_officer?: string | null;
  approving_officer_rank?: string | null;
  approval_status?: ApprovalStatus | null;
  approval_date?: string | null;
  remarks?: string | null;
}

// ── Request-specific interfaces for better type safety ──────────────────────

export interface DriverRequestDetails extends DocumentRequestDetails {
  request_type: 'driver';
  driver_name: string;
  driver_license: string;
  driver_vehicle: string;
  driver_contact: string;
}

export interface BodyguardRequestDetails extends DocumentRequestDetails {
  request_type: 'bodyguard';
  bodyguard_name: string;
  bodyguard_badge: string;
  bodyguard_unit: string;
  bodyguard_contact: string;
}

export interface FirearmRequestDetails extends DocumentRequestDetails {
  request_type: 'firearm';
  firearm_type: string;
  firearm_serial: string;
  firearm_caliber: string;
  firearm_owner: string;
  firearm_license: string;
}

export interface CurrentStationRequestDetails extends DocumentRequestDetails {
  request_type: 'current_station';
  current_station_name: string;
  current_station_location: string;
  current_station_contact: string;
  current_station_head: string;
}

export interface ForceNumberRequestDetails extends DocumentRequestDetails {
  request_type: 'force_number';
  force_number_value: string;
  force_number_rank: string;
  force_number_unit: string;
  force_number_issue_date: string;
}

export interface ResidenceSecurityRequestDetails extends DocumentRequestDetails {
  request_type: 'residence_security' | 'sentry';
  residence_address: string;
  residence_city: string;
  residence_state: string;
  security_personnel_count: number;
  security_shift_hours: string;
  security_equipment: string;
  sentry_post_location?: string | null;
  sentry_instructions?: string | null;
}

export type AnyRequestDetails =
  | DriverRequestDetails
  | BodyguardRequestDetails
  | FirearmRequestDetails
  | CurrentStationRequestDetails
  | ForceNumberRequestDetails
  | ResidenceSecurityRequestDetails;

// ── Signature Placement: now auto‑detected; custom positioning uses coordinates ─
// The SignaturePlacement type is removed; placement is determined by scanning
// for the signatory block (name + title) or by absolute coordinates.
// For custom placement, use signature_position_x/y/width/height.

// ════════════════════════════════════════════════════════════════════════════
//  FOLLOW-UP TYPES (UPDATED - SIMPLIFIED)
// ════════════════════════════════════════════════════════════════════════════

export type FollowUpStatus = 
  | 'pending'        // Has a due date in the future
  | 'in_progress'    // Being worked on
  | 'completed'      // Completed with or without due date
  | 'cancelled'      // Cancelled
  | 'filed_away';    // ✅ New: No due date, marked as done/filed

export type FollowUpPriority = 'low' | 'normal' | 'urgent';

/**
 * Simplified Follow-Up interface
 * - `title` and `description` replaced with `notes` (single field)
 * - `mark_id` is optional (not always linked to a mark)
 * - `due_date` is optional (can be null for filed away items)
 */
export interface FollowUp {
  id: string;
  document_id: string;
  mark_id: string | null;           // ✅ Optional - may not be linked to a mark
  notes: string;                    // ✅ Required - replaces title + description
  assigned_to: string;
  assigned_to_name: string | null;
  created_by: string;
  created_by_name: string | null;
  due_date: string | null;          // ✅ Optional - null means filed away
  priority: FollowUpPriority;
  status: FollowUpStatus;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  completion_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  comment_count?: number;
}

export interface FollowUpComment {
  id: string;
  follow_up_id: string;
  user_id: string;
  user_name: string | null;
  comment: string;
  file_url: string | null;
  file_public_id: string | null;
  created_at: string;
}

export interface FollowUpWithComments extends FollowUp {
  comments: FollowUpComment[];
}

export interface FollowUpPaginationResponse {
  data: FollowUp[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Follow-up Input Types (Simplified) ──────────────────────────────────────

/**
 * Simplified Create Follow-Up Input
 * - No title required (uses notes only)
 * - due_date is optional
 * - mark_id is optional
 */
export interface CreateFollowUpInput {
  document_id: string;
  mark_id?: string;                 // ✅ Optional
  notes: string;                    // ✅ Required - what was done or needs to be done
  assigned_to: string;
  due_date?: Date | string | null;  // ✅ Optional - if not provided, filed away
  priority?: FollowUpPriority;
}

/**
 * File Away Follow-Up Input (New)
 * - Quick action to file away a follow-up with no due date
 */
export interface FileAwayFollowUpInput {
  document_id: string;
  mark_id?: string;                 // Optional
  notes: string;                    // Required - what was done
  completion_notes?: string;        // Optional - additional notes on completion
}

/**
 * Simplified Update Follow-Up Input
 */
export interface UpdateFollowUpInput {
  notes?: string;
  assigned_to?: string;
  due_date?: Date | string | null;
  priority?: FollowUpPriority;
  status?: FollowUpStatus;
  completion_notes?: string;
  cancellation_reason?: string;
}

export interface CompleteFollowUpInput {
  completion_notes?: string;
}

export interface CancelFollowUpInput {
  cancellation_reason: string;
}

export interface AddFollowUpCommentInput {
  comment: string;
}

/**
 * Simplified Follow-Up Filters
 * - Added active_only and filed_only filters
 */
export interface FollowUpFilters {
  document_id?: string;
  assigned_to?: string;
  status?: FollowUpStatus;
  priority?: FollowUpPriority;
  due_from?: Date | string;
  due_to?: Date | string;
  search?: string;                  // Searches notes field
  active_only?: boolean;            // ✅ Show only follow-ups with future dates
  filed_only?: boolean;             // ✅ Show only filed away items
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'due_date' | 'priority' | 'status' | 'notes';
  sort_order?: 'ASC' | 'DESC';
}

/**
 * Follow-Up Summary (New)
 * - Dashboard statistics for a user's follow-ups
 */
export interface FollowUpSummary {
  pending: number;      // Follow-ups with due_date in future
  overdue: number;      // Follow-ups with due_date past
  completed: number;    // Completed follow-ups
  filed_away: number;   // ✅ Filed away follow-ups
  total: number;        // Total follow-ups
  active: number;       // Active follow-ups (pending + in_progress)
}

// ── Input types ───────────────────────────────────────────────────────────────

// For the existing /compose endpoint (judgments, rulings, orders)
export interface CreateComposedDocumentInput {
  title: string;
  type: 'judgment' | 'ruling' | 'order';
  category?: DocumentCategory;
  reference_no?: string;
  body: string;
  assigned_to?: string;
  department_id?: string;
  request_details?: Partial<DocumentRequestDetails>;
}

export interface ComposeMemoInput {
  title: string;
  to: string;
  date?: string;
  body: string;
  from?: string;
  signatureName?: string;
  signatureTitle?: string;
  department_id?: string;
  reference_no?: string;
  fromFirst?: boolean;
  request_details?: Partial<DocumentRequestDetails>;
}

export interface ComposeLetterInput {
  title: string;
  to: string;
  date?: string;
  body: string;
  from?: string;
  signatureName?: string;
  signatureTitle?: string;
  department_id?: string;
  reference_no?: string;
  cc?: string;
  enclosures?: string;
  request_details?: Partial<DocumentRequestDetails>;
}

// ── Other input types ──────────────────────────────────────────────────────────

export interface SendToUserInput {
  recipient_id: string;
  note?: string;
}

export interface CreateUploadDocumentInput {
  title: string;
  type: Exclude<DocumentType, 'memo' | 'letter'>;
  category?: DocumentCategory;
  reference_no?: string;
  ref_type: RefType;
  ref_other_description?: string;
  assigned_to?: string;
  department_id?: string;
  is_draft?: boolean;
  priority?: RoutePriority;
  request_details?: Partial<DocumentRequestDetails>;
}

export interface UpdateDocumentInput {
  title?: string;
  category?: DocumentCategory | null;
  reference_no?: string | null;
  body?: string;
  status?: DocumentStatus;
  assigned_to?: string | null;
  department_id?: string | null;
  priority?: RoutePriority;
  to_recipient?: string | null;
  from_sender?: string | null;
  document_date?: string | null;
  subject?: string | null;
  cc?: string | null;
  enclosures?: string | null;
  signature_name?: string | null;
  signature_title?: string | null;
  signature_position_x?: number | null;
  signature_position_y?: number | null;
  signature_position_width?: number | null;
  signature_position_height?: number | null;
  request_details?: Partial<DocumentRequestDetails> | null;
}

// ── Mark to Department ──────────────────────────────────────────────────────

export interface MarkDocumentInput {
  department_id: string;
  assigned_to?: string;
  instructions?: string;
  priority?: RoutePriority;
}

export interface UpdateMarkInput {
  instructions?: string;
  bring_up_date?: string | null;
}

export interface CreateAnnotationInput {
  comment: string;
  is_urgent?: boolean;
  visible_in_summary?: boolean;
}

export interface DocumentFilters {
  search?: string;
  type?: DocumentType;
  category?: DocumentCategory;
  status?: DocumentStatus;
  assigned_to?: string;
  department_id?: string;
  folder_id?: string;
  for_my_action?: boolean;
  visible_in_summary?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'status';
  sort_order?: 'ASC' | 'DESC';
  has_bring_up_date?: boolean;
  request_type?: RequestType;
}

// ── Draft / Flow input types ────────────────────────────────────────────────

export interface FinalizeDraftInput {
  assigned_to?: string;
  send_to_super_admin?: boolean;
}

export interface ReturnDocumentInput {
  note: string;
  requires_more_docs?: boolean;
}

// ── Response thread input ────────────────────────────────────────────────────

export interface RespondToDocumentInput {
  note: string;
}

// ── Folder Operation Input types ───────────────────────────────────────────

export interface RedirectToFolderInput {
  folder_id: string;
  note?: string;
}

export interface RemoveFromFolderInput {
  note?: string;
}

export interface FolderDocumentFilters {
  folder_id: string;
  page?: number;
  limit?: number;
  search?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  request_type?: RequestType;
}

// ── Entity types ──────────────────────────────────────────────────────────────

export interface DocumentMark {
  id: string;
  document_id: string;
  marked_by: string;
  marked_by_name: string;
  marked_to_dept: string;
  marked_to_dept_name: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  instructions: string | null;
  bring_up_date: string | null;
  priority: RoutePriority;
  marked_at: Date;
  acknowledged_at: Date | null;
  completed_at: Date | null;
  is_active: boolean;
}

export interface DocumentAnnotation {
  id: string;
  document_id: string;
  annotated_by: string;
  annotated_by_name: string;
  comment: string;
  is_urgent: boolean;
  visible_in_summary: boolean;
  created_at: Date;
}

export interface DocumentResponse {
  id: string;
  document_id: string;
  response_number: number;
  responded_by: string;
  responded_by_name: string;
  note: string;
  file_url: string | null;
  file_public_id: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  original_name: string | null;
  created_at: Date;
}

export interface DocumentFlowEntry {
  id: string;
  document_id: string;
  action: string;
  from_user: string | null;
  from_user_name: string | null;
  to_user: string | null;
  to_user_name: string | null;
  note: string | null;
  created_at: Date;
}

// ── Document ─────────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  category: DocumentCategory | null;
  status: DocumentStatus;
  reference_no: string | null;
  ref_type: RefType | null;
  ref_other_description: string | null;
  body: string | null;
  file_url: string | null;
  file_public_id: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  original_name: string | null;
  priority: RoutePriority;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string;
  created_by_name: string;
  department_id: string | null;
  department_name: string | null;
  folder_id: string | null;
  folder_name: string | null;
  is_signed: boolean;
  signed_by: string | null;
  signed_by_name: string | null;
  signed_at: Date | null;
  released_at: Date | null;
  released_by: string | null;
  released_by_name: string | null;
  is_sent: boolean;
  sent_at: Date | null;
  is_draft: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  active_mark: DocumentMark | null;
  response_count?: number;
  to_recipient: string | null;
  from_sender: string | null;
  document_date: string | null;
  subject: string | null;
  cc: string | null;
  enclosures: string | null;
  signature_name: string | null;
  signature_title: string | null;
  signature_position_x: number | null;
  signature_position_y: number | null;
  signature_position_width: number | null;
  signature_position_height: number | null;
  request_details: DocumentRequestDetails | null;
  follow_ups?: FollowUp[];
}

export interface DocumentWithAnnotations extends Document {
  annotations: DocumentAnnotation[];
  mark_history: DocumentMark[];
  responses: DocumentResponse[];
  follow_ups?: FollowUp[];
}

export interface DocumentPaginationResponse {
  data: Document[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}