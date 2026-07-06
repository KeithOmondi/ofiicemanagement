// src/types/helpdesk-documents.types.ts

// ── Helpdesk-specific Document Entity Types ──────────────────────────────────

export type HelpdeskEntityType =
  | 'circuit'
  | 'bench'
  | 'partHeard'
  | 'serviceWeek'
  | 'otherPayment';

export type HelpdeskDocumentFormat = 'pdf' | 'docx' | 'xlsx';

// ── Helpdesk Document Extensions ────────────────────────────────────────────

/**
 * Extended document type for helpdesk-specific fields
 * This extends the base Document type with helpdesk-specific fields
 */
export interface HelpdeskDocument extends Document {
  // Helpdesk-specific fields
  entity_type: HelpdeskEntityType;
  entity_id: string | null;
  format: HelpdeskDocumentFormat;
  ref: string; // Required for helpdesk documents
  subject: string; // Required for helpdesk documents
  uploaded_by: string | null;
  uploaded_by_name?: string | null;
  
  // Override some base fields to be required or more specific
  // For helpdesk, we want these to be more specific
  type: 'upload'; // Helpdesk documents are always of type 'upload'
  category: 'general'; // Helpdesk documents fall under general category
  status: 'uploaded' | 'filed'; // More specific status options
}

// ── Helpdesk Document Filters ───────────────────────────────────────────────

export interface HelpdeskDocumentFilters {
  entity_type?: HelpdeskEntityType;
  entity_id?: string;
  format?: HelpdeskDocumentFormat;
  search?: string;
  limit?: number;
  offset?: number;
}

// ── Helpdesk Document Upload Payload ────────────────────────────────────────

export interface UploadHelpdeskDocumentPayload {
  blob: Blob;
  filename: string;
  ref: string;
  subject: string;
  entity_type: HelpdeskEntityType;
  entity_id?: string;
  format: HelpdeskDocumentFormat;
}

// ── Helpdesk Document Response ──────────────────────────────────────────────

export interface HelpdeskDocumentResponse {
  success: boolean;
  data: HelpdeskDocument;
  message?: string;
}

export interface HelpdeskDocumentsListResponse {
  success: boolean;
  data: HelpdeskDocument[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
}

// ── Helpdesk Document State ──────────────────────────────────────────────────

export interface HelpdeskDocumentsState {
  items: HelpdeskDocument[];
  loading: {
    fetch: boolean;
    upload: boolean;
    delete: boolean;
  };
  error: string | null;
  deletingId: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const HELPEDSK_ENTITY_LABELS: Record<HelpdeskEntityType, string> = {
  circuit: 'Circuit',
  bench: 'Bench',
  partHeard: 'Part-Heard',
  serviceWeek: 'Service Week',
  otherPayment: 'Other Payment',
};

export const HELPEDSK_ENTITY_ICONS: Record<HelpdeskEntityType, string> = {
  circuit: 'MapPin',
  bench: 'Gavel',
  partHeard: 'FileCheck',
  serviceWeek: 'Calendar',
  otherPayment: 'CreditCard',
};