// src/types/helpdesk-documents.types.ts

// ── Helpdesk-specific Document Entity Types ──────────────────────────────────

export type HelpdeskEntityType =
    | 'circuit'
    | 'bench'
    | 'partHeard'
    | 'serviceWeek'
    | 'otherPayment'
    | 'ticket';

export type HelpdeskDocumentFormat = 'pdf' | 'docx' | 'xlsx';

export type HelpdeskDocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'returned';
export type EStampStatus = 'pending' | 'stamped' | 'failed';

export interface ApprovalHistoryEntry {
    id: string;
    document_id: string;
    action: 'submitted' | 'approved' | 'rejected' | 'returned';
    from_user_id: string;
    from_user_name: string;
    to_user_id?: string;
    to_user_name?: string;
    comments?: string;
    created_at: string;
}

export interface Comment {
    id: string;
    document_id: string;
    user_id: string;
    user_name: string;
    comment: string;
    is_internal: boolean;
    created_at: string;
}

/**
 * Extended document type for helpdesk-specific fields
 */
export interface HelpdeskDocument {
    id: string;
    ref: string;
    subject: string;
    entity_type: HelpdeskEntityType;
    entity_id: string | null;
    format: HelpdeskDocumentFormat;
    file_url: string;
    public_id: string;
    file_size: number | null;
    uploaded_by: string | null;
    uploaded_by_name?: string | null;
    status: HelpdeskDocumentStatus;
    e_stamp_status: EStampStatus;
    e_stamp_url?: string | null;
    e_stamp_public_id?: string | null;
    approval_history: ApprovalHistoryEntry[];
    comments: Comment[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
    approved_at?: string;
    approved_by?: string;
    approved_by_name?: string;
    returned_at?: string;
    returned_by?: string;
    returned_by_name?: string;
    rejection_reason?: string;
    type: 'upload';
    category: 'general';
}

// ── Helpdesk Document Filters ───────────────────────────────────────────────

export interface HelpdeskDocumentFilters {
    entity_type?: HelpdeskEntityType;
    entity_id?: string;
    format?: HelpdeskDocumentFormat;
    status?: HelpdeskDocumentStatus;
    search?: string;
    limit?: number;
    offset?: number;
    uploaded_by?: string;
    pending_my_approval?: boolean;
    unlinked?: boolean; // NEW — filters to entity_id IS NULL
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
    status?: HelpdeskDocumentStatus;
}

export interface SubmitForApprovalPayload {
    id: string;
    comments?: string;
}

export interface ApproveDocumentPayload {
    id: string;
    comments?: string;
}

export interface RejectDocumentPayload {
    id: string;
    reason: string;
    comments?: string;
}

export interface ReturnDocumentPayload {
    id: string;
    comments?: string;
    instructions?: string;
}

export interface AddCommentPayload {
    id: string;
    comment: string;
    is_internal?: boolean;
}

export interface DeleteCommentPayload {
    id: string;
    commentId: string;
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
    selectedDocument: HelpdeskDocument | null;
    loading: {
        fetch: boolean;
        upload: boolean;
        delete: boolean;
        submit: boolean;
        approve: boolean;
        reject: boolean;
        return: boolean;
        comment: boolean;
        link: boolean; // NEW
    };
    error: string | null;
    deletingId: string | null;
    actionLoading: {
        [key: string]: {
            submitting?: boolean;
            approving?: boolean;
            rejecting?: boolean;
            returning?: boolean;
        };
    };
}

export interface LinkHelpdeskDocumentPayload {
    id: string;
    entity_type: HelpdeskEntityType;
    entity_id: string;
}
// ─── Constants ──────────────────────────────────────────────────────────────

export const HELPEDSK_ENTITY_LABELS: Record<HelpdeskEntityType, string> = {
    circuit: 'Circuit',
    bench: 'Bench',
    partHeard: 'Part-Heard',
    serviceWeek: 'Service Week',
    otherPayment: 'Other Payment',
    ticket: 'Travel Ticket',
};

export const HELPEDSK_ENTITY_ICONS: Record<HelpdeskEntityType, string> = {
    circuit: 'MapPin',
    bench: 'Gavel',
    partHeard: 'FileCheck',
    serviceWeek: 'Calendar',
    otherPayment: 'CreditCard',
    ticket: 'Plane',
};

export const DOCUMENT_STATUS_LABELS: Record<HelpdeskDocumentStatus, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    returned: 'Returned',
};

export const DOCUMENT_STATUS_COLORS: Record<HelpdeskDocumentStatus, string> = {
    draft: 'bg-stone-100 text-stone-600',
    pending_approval: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    returned: 'bg-blue-50 text-blue-700',
};

export const E_STAMP_STATUS_LABELS: Record<EStampStatus, string> = {
    pending: 'Pending',
    stamped: 'Stamped ✓',
    failed: 'Failed',
};

