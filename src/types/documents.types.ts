// src/types/documents.types.ts

// ── Type enums ────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'memo' | 'letter' | 'judgment' | 'ruling'
  | 'order' | 'correspondence' | 'upload';

export type DocumentStatus =
  | 'draft' | 'uploaded' | 'pending_review'
  | 'marked' | 'in_progress' | 'completed' | 'filed';

export type DocumentCategory =
  | 'judgments' | 'rulings' | 'correspondence'
  | 'orders' | 'drafts' | 'general';

export type RoutePriority = 'low' | 'normal' | 'urgent';

export type RefType =
  | 'for_signature' | 'for_attention' | 'for_information' | 'direction' | 'other';

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateComposedDocumentInput {
  title: string;
  type: 'memo' | 'letter';
  category?: DocumentCategory;
  reference_no?: string;
  body: string;
  assigned_to?: string;
  department_id?: string;
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
}

export interface UpdateDocumentInput {
  title?: string;
  category?: DocumentCategory | null;
  reference_no?: string | null;
  body?: string;
  status?: DocumentStatus;
  assigned_to?: string | null;
  department_id?: string | null;
}

// ── Mark to Department ──────────────────────────────────────────────────────

export interface MarkDocumentInput {
  department_id: string;
  assigned_to?: string;
  instructions?: string;
  priority?: RoutePriority;
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
  for_my_action?: boolean;
  visible_in_summary?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'status';
  sort_order?: 'ASC' | 'DESC';
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

// ── Entity types ──────────────────────────────────────────────────────────────

// ── Document Mark (to Department) ──────────────────────────────────────────

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

// ── Document Flow (audit trail) ─────────────────────────────────────────────

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
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: string;
  created_by_name: string;
  department_id: string | null;
  department_name: string | null;
  is_signed: boolean;
  signed_by: string | null;
  signed_by_name: string | null;
  signed_at: Date | null;
  is_sent: boolean;
  sent_at: Date | null;
  is_draft: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  active_mark: DocumentMark | null;
}

export interface DocumentWithAnnotations extends Document {
  annotations: DocumentAnnotation[];
  mark_history: DocumentMark[];
}

export interface DocumentPaginationResponse {
  data: Document[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}