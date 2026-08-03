// src/types/helpdesk-documents.types.ts

// ── Helpdesk-specific Document Entity Types ──────────────────────────────────

export type HelpdeskEntityType =
    | 'circuit'
    | 'bench'
    | 'partHeard'
    | 'serviceWeek'
    | 'otherPayment'
    | 'ticket'
    | 'medicalClaim'
    | 'generalRequest'
    | 'securityRequest'
    | 'visa'             // Visa support documents
    | 'protocol'         // Protocol event documents
    | 'club'             // Club membership documents
    | 'utility_memo'     // Single judge utility memo
    | 'consolidated_utility_memo'  // Consolidated memo covering all utilities
    | 'consolidated_fuel_memo'     // Consolidated memo covering fuel only
    | 'aide'             // Aide request documents
    | 'sentry';          // Sentry request documents

export type HelpdeskDocumentFormat = 'pdf' | 'docx' | 'xlsx';

export type HelpdeskDocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'returned';
export type EStampStatus = 'pending' | 'stamped' | 'failed';

// ─── Stamp Types ──────────────────────────────────────────────────────────────

export type StampType = 'approved' | 'received' | 'official';

// ─── Two-Step Approval Types ──────────────────────────────────────────────────

/**
 * Internal approval status (only visible to super admin)
 * - 'pending': Awaiting super admin action
 * - 'previewed': Super admin has previewed the document
 * - 'approved_internal': Super admin approved internally (not yet sent to requester)
 * - 'rejected_internal': Super admin rejected internally (not yet sent to requester)
 * - 'changes_requested_internal': Super admin requested changes internally (not yet sent to requester)
 * - 'changes_ready': Requester has made changes, ready for re-review
 */
export type InternalApprovalStatus = 
    | 'pending'                    // Awaiting super admin review
    | 'previewed'                  // Super admin has previewed the document
    | 'approved_internal'          // Super admin approved (waiting to send back)
    | 'rejected_internal'          // Super admin rejected (waiting to send back)
    | 'changes_requested_internal' // Super admin wants changes (waiting to send back)
    | 'changes_ready';             // Changes have been made, ready for re-preview

/**
 * External/Requester visible status (what the requester sees)
 * Only changes when super admin clicks "Send Back to Requester"
 */
export type RequesterVisibleStatus = 
    | 'pending_approval'    // Requester sees: Waiting for approval
    | 'approved'            // Requester sees: Document approved ✓
    | 'rejected'            // Requester sees: Document rejected ✗
    | 'changes_requested'   // Requester sees: Changes requested
    | 'in_revision';        // Requester sees: Being revised

// ─── Consolidated Memo Helpers ──────────────────────────────────────────────

export type ConsolidatedMemoType = 'all' | 'fuel';

/**
 * Generates a stable, human-readable entity ID for a consolidated memo.
 * Format: "cons-{type}-{YYYY-MM}" e.g., "cons-all-2026-07"
 */
export function getConsolidatedMemoEntityId(
    type: ConsolidatedMemoType,
    date: Date = new Date()
): string {
    const month = date.toISOString().slice(0, 7); // YYYY-MM
    return `cons-${type}-${month}`;
}

/**
 * Returns the appropriate HelpdeskEntityType for a consolidated memo.
 */
export function getConsolidatedMemoEntityType(
    type: ConsolidatedMemoType
): HelpdeskEntityType {
    return type === 'fuel' ? 'consolidated_fuel_memo' : 'consolidated_utility_memo';
}

// ─── Request Types (Unified) ───────────────────────────────────────────────

export type RequestType =
    | 'Driver'
    | 'Bodyguard'
    | 'Firearm'
    | 'Current Station'
    | 'Force Number'
    | 'Residence Security'
    | 'Sentry';

export type RemarkType = 'Onboarding' | 'Release';
export type GeneralRequestCategory = 'Security' | 'Personnel' | 'Administrative';

// ─── Officer Ranks (Matching Backend) ──────────────────────────────────────

export type OfficerRank =
    | 'Police Constable (PC)'
    | 'Corporal (CPL)'
    | 'Sergeant (SGT)'
    | 'Inspector (IP)'
    | 'Chief Inspector (CIP)'
    | 'Assistant Superintendent (ASP)'
    | 'Superintendent (SP)'
    | 'Senior Superintendent (SSP)'
    | 'Assistant Commissioner (ACP)'
    | 'Senior Assistant Commissioner (SACP)'
    | 'Commissioner (CP)';

export type UnitType = 'KPS' | 'APS' | 'GSU' | 'DCI' | 'VIPPU' | 'Other';

export type AideStatus = 'pending' | 'in_progress' | 'rejected' | 'attached';
export type SentryStatus = 'pending' | 'active' | 'resolved' | 'rejected';

// ─── Approval History ──────────────────────────────────────────────────────

export interface ApprovalHistoryEntry {
    id: string;
    document_id: string;
    action: 'submitted' | 'approved' | 'rejected' | 'returned' | 'previewed' | 'sent_back' | 'resubmitted' | 'signed' | 'stamped';
    from_user_id: string;
    from_user_name: string;
    to_user_id?: string;
    to_user_name?: string;
    comments?: string;
    created_at: string;
    // For two-step workflow
    internal_action?: boolean; // Whether this was an internal action (super admin only)
    requester_visible?: boolean; // Whether this action is visible to requester
}

// ─── Comments ──────────────────────────────────────────────────────────────

export interface Comment {
    id: string;
    document_id: string;
    user_id: string;
    user_name: string;
    comment: string;
    is_internal: boolean;
    is_active: boolean;
    created_at: string;
}

// ─── Document View Tracking ──────────────────────────────────────────────

export interface DocumentView {
    id: string;
    document_id: string;
    document_type: string;
    viewer_id: string;
    viewer_name: string;
    viewed_at: string;
    ip_address: string | null;
    user_agent: string | null;
}

export interface DocumentWithViewStatus {
    id: string;
    document_name: string;
    document_url: string;
    created_at: string;
    viewed_at: string | null;
    view_count: number;
    last_viewed_by: string | null;
    last_viewed_at: string | null;
    viewers: DocumentView[];
}

// ─── Preview History ──────────────────────────────────────────────────────────

export interface DocumentPreviewHistory {
    id: string;
    document_id: string;
    previewed_by: string;
    previewed_by_name?: string;
    previewed_at: string;
    comments?: string;
    ip_address?: string;
    user_agent?: string;
    preview_duration_seconds?: number;
    is_active: boolean;
    created_at: string;
}

// ─── Extended Document Type ──────────────────────────────────────────────────

/**
 * Extended document type for helpdesk-specific fields
 * Matches the backend's HelpdeskDocument interface
 */
export interface HelpdeskDocument {
    id: string;
    ref: string;
    subject: string;
    entity_type: HelpdeskEntityType;
    entity_id: string | null;   // can be UUID or custom ID (e.g., "cons-all-2026-07")
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

    // Unified General Request fields
    request_type?: RequestType;        // Driver, Bodyguard, etc.
    judge_name?: string;                // Associated judge name
    remark_type?: RemarkType;          // Onboarding or Release
    category_type?: GeneralRequestCategory; // Security, Personnel, Administrative

    // ─── Two-Step Approval Workflow Fields ────────────────────────────────────
    // Internal tracking (super admin only)
    internal_approval_status: InternalApprovalStatus;
    internal_approved_by?: string;
    internal_approved_by_name?: string;
    internal_approved_at?: string;
    internal_comments?: string;
    internal_changes_requested?: string[];
    internal_rejection_reason?: string;
    internal_preview_count: number;
    internal_previewed_at?: string;
    internal_previewed_by?: string;
    internal_previewed_by_name?: string;
    
    // External/Requester visible status
    requester_status: RequesterVisibleStatus;
    requester_visible_at?: string; // When status became visible to requester
    requester_visible_by?: string; // Who sent it back to requester
    requester_visible_by_name?: string;
    
    // Resubmit tracking
    resubmit_count: number;
    last_resubmitted_at?: string;
    last_resubmitted_by?: string;
    
    // Flags
    is_internal_approval_complete: boolean; // Super admin has made a decision internally
    is_sent_back_to_requester: boolean; // Document has been sent back to requester
    is_requester_notified: boolean; // Requester has been notified

    // ─── Signature Fields ──────────────────────────────────────────────────────
    is_signed: boolean;                    // Whether the document has been signed
    signed_by?: string;                    // ID of the user who signed
    signed_by_name?: string;               // Name of the user who signed
    signed_at?: string;                    // When the document was signed
    signature_position_x?: number | null;  // X position of signature on PDF
    signature_position_y?: number | null;  // Y position of signature on PDF
    signature_position_width?: number | null;  // Width of signature on PDF
    signature_position_height?: number | null; // Height of signature on PDF

    // ─── NEW: Stamp Fields ──────────────────────────────────────────────────────
    is_stamped: boolean;                   // Whether the document has been officially stamped
    stamped_by?: string;                   // ID of the user who applied the stamp
    stamped_by_name?: string;              // Name of the user who applied the stamp
    stamped_at?: string;                   // When the stamp was applied
    stamp_type?: StampType;                // Type of stamp applied (approved, received, official)
    stamp_position_x?: number | null;      // X position of stamp on PDF
    stamp_position_y?: number | null;      // Y position of stamp on PDF
    stamp_position_width?: number | null;  // Width of stamp on PDF
    stamp_position_height?: number | null; // Height of stamp on PDF

    // ─── Aide Request Fields ──────────────────────────────────────────────────
    officer_rank?: OfficerRank | null;
    officer_name?: string | null;
    employment_number?: string | null;
    current_station?: string | null;
    current_unit?: UnitType | null;
    proposed_assignment?: string | null;
    reporting_date?: string | null;
    aide_status?: AideStatus | null;
    
    // ─── Sentry Request Fields ──────────────────────────────────────────────
    residence_location?: string | null;
    sentry_status?: SentryStatus | null;
    
    // ─── Legacy fields ──────────────────────────────────────────────────────
    rank?: string | null;              // Officer's rank (deprecated, use officer_rank)
}

// ─── Requester Document View ─────────────────────────────────────────────────

/**
 * Requester's view of their document status
 */
export interface RequesterDocumentView {
    document_id: string;
    ref: string;
    subject: string;
    status: RequesterVisibleStatus;
    submitted_at: string;
    last_updated_at: string;
    comments?: string;
    entity_type: HelpdeskEntityType;
    entity_id?: string;
    // Only show these if status is 'approved' or 'rejected'
    approved_rejected_at?: string;
    approved_rejected_by?: string;
    approved_rejected_by_name?: string;
    // Only show if status is 'changes_requested'
    changes_requested?: string[];
    // Only show if status is 'rejected'
    rejection_reason?: string;
    // Show if resubmit is allowed
    can_resubmit: boolean;
    // ─── Signature info ──────────────────────────────────────────────────────
    is_signed: boolean;
    signed_by_name?: string;
    signed_at?: string;
    // ─── NEW: Stamp info ──────────────────────────────────────────────────────
    is_stamped: boolean;
    stamped_by_name?: string;
    stamped_at?: string;
    stamp_type?: StampType;
}

// ─── Pending Internal Approvals Summary ──────────────────────────────────────

/**
 * Pending internal approvals summary (super admin dashboard)
 */
export interface PendingInternalApprovalsSummary {
    total_pending_internal: number;
    pending_review: number;           // Awaiting super admin review
    previewed: number;               // Super admin previewed but not decided
    approved_internal: number;       // Approved internally, waiting to send back
    rejected_internal: number;       // Rejected internally, waiting to send back
    changes_requested_internal: number; // Changes requested, waiting to send back
    ready_to_send_back: number;      // Super admin has decided, ready to send back to requester
    by_entity_type: Record<HelpdeskEntityType, number>;
    urgent_pending: number;
    oldest_pending_days: number;
    average_review_time_hours?: number;
}

// ─── Helpdesk Document Filters ───────────────────────────────────────────────

export interface HelpdeskDocumentFilters {
    entity_type?: HelpdeskEntityType;
    entity_id?: string;   // can be UUID or custom ID
    format?: HelpdeskDocumentFormat;
    status?: HelpdeskDocumentStatus;
    search?: string;
    limit?: number;
    offset?: number;
    uploaded_by?: string;
    pending_my_approval?: boolean;
    unlinked?: boolean;

    // ─── Two-Step Approval Filters ──────────────────────────────────────────
    internal_approval_status?: InternalApprovalStatus;
    requester_status?: RequesterVisibleStatus;
    is_sent_back_to_requester?: boolean;
    pending_internal_approval?: boolean; // For super admin dashboard
    ready_to_send_back?: boolean; // Super admin has decided, ready to send back
    my_requester_documents?: boolean; // For requester dashboard

    // Unified General Request filters
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    date_from?: string;
    date_to?: string;

    // ─── Aide Request Filters ──────────────────────────────────────────────
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    aide_status?: AideStatus;
    reporting_date?: string;
    
    // ─── Sentry Request Filters ──────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;
    
    // ─── Legacy filters ──────────────────────────────────────────────────────
    rank?: string;
}

// ─── Helpdesk Document Upload Payload ────────────────────────────────────────

export interface UploadHelpdeskDocumentPayload {
    blob: Blob;
    filename: string;
    ref: string;
    subject: string;
    entity_type: HelpdeskEntityType;
    entity_id?: string;   // can be UUID or custom ID
    format: HelpdeskDocumentFormat;
    status?: HelpdeskDocumentStatus;

    // Unified General Request fields
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;

    // ─── Aide Request Fields ──────────────────────────────────────────────
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    proposed_assignment?: string;
    reporting_date?: string;
    aide_status?: AideStatus;
    
    // ─── Sentry Request Fields ──────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;
    
    // ─── Legacy fields ──────────────────────────────────────────────────────
    rank?: string;
}

// ─── Two-Step Approval Payloads ──────────────────────────────────────────────

/**
 * Request to preview document (super admin action)
 */
export interface InternalPreviewPayload {
    id: string;
    previewed_by?: string;
    previewed_by_name?: string;
    comments?: string;
    ip_address?: string;
    user_agent?: string;
}

/**
 * Request to perform internal approval (super admin action)
 * This doesn't change what requester sees yet
 */
export interface InternalApprovalPayload {
    id: string;
    action: 'approve' | 'reject' | 'request_changes';
    comments?: string;
    changes_requested?: string[]; // For 'request_changes' action
    rejection_reason?: string; // For 'reject' action
    approved_by?: string;
    approved_by_name?: string;
    generate_e_stamp?: boolean;
    // ─── Signature position ─────────────────────────────────────────────────
    signature_position_x?: number;
    signature_position_y?: number;
    signature_position_width?: number;
    signature_position_height?: number;
}

/**
 * Request to send document back to requester (super admin action)
 * This is when the requester finally sees the status change
 */
export interface SendBackToRequesterPayload {
    id: string;
    final_status: 'approved' | 'rejected' | 'changes_requested';
    sent_by?: string;
    sent_by_name?: string;
    comments?: string;
    requester_message?: string;
    notify_requester?: boolean;
}

/**
 * Request to resubmit after changes (requester action)
 */
export interface ResubmitAfterChangesPayload {
    id: string;
    submitted_by?: string;
    submitted_by_name?: string;
    comments?: string;
    file_update?: boolean;
}

/**
 * Request to cancel internal approval (super admin action)
 */
export interface CancelInternalApprovalPayload {
    id: string;
    cancelled_by?: string;
    cancelled_by_name?: string;
    reason?: string;
}

// ─── Update Document File Payload ─────────────────────────────────────────────

export interface UpdateDocumentFilePayload {
    id: string;
    blob: Blob;
    filename: string;
    status?: HelpdeskDocumentStatus;
    e_stamp_url?: string;
    e_stamp_public_id?: string;
    e_stamp_status?: EStampStatus;
    comments?: string;
    approved_by?: string;
    approved_by_name?: string;
    rejection_reason?: string;
    returned_by?: string;
    returned_by_name?: string;
    // ─── Signature fields ──────────────────────────────────────────────────────
    is_signed?: boolean;
    signed_by?: string;
    signed_by_name?: string;
    signed_at?: string;
    // ─── NEW: Stamp fields ────────────────────────────────────────────────────
    is_stamped?: boolean;
    stamped_by?: string;
    stamped_by_name?: string;
    stamped_at?: string;
    stamp_type?: StampType;
    stamp_position_x?: number;
    stamp_position_y?: number;
    stamp_position_width?: number;
    stamp_position_height?: number;
}

export interface SubmitForApprovalPayload {
    id: string;
    comments?: string;
    submitted_by?: string;
    submitted_by_name?: string;
}

// ─── Legacy Payloads (Deprecated) ───────────────────────────────────────────

/**
 * @deprecated Use InternalApprovalPayload with action: 'approve' and SendBackToRequesterPayload instead
 */
export interface ApproveDocumentPayload {
    id: string;
    comments?: string;
    approved_by?: string;
    approved_by_name?: string;
    e_stamp_url?: string;
    e_stamp_public_id?: string;
}

/**
 * @deprecated Use InternalApprovalPayload with action: 'reject' and SendBackToRequesterPayload instead
 */
export interface RejectDocumentPayload {
    id: string;
    reason: string;
    comments?: string;
    rejected_by?: string;
    rejected_by_name?: string;
}

/**
 * @deprecated Use InternalApprovalPayload with action: 'request_changes' and SendBackToRequesterPayload instead
 */
export interface ReturnDocumentPayload {
    id: string;
    comments?: string;
    instructions?: string;
    returned_by?: string;
    returned_by_name?: string;
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

export interface LinkHelpdeskDocumentPayload {
    id: string;
    entity_type: HelpdeskEntityType;
    entity_id: string;   // can be UUID or custom ID
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    
    // ─── Aide Request Fields ──────────────────────────────────────────────
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    proposed_assignment?: string;
    reporting_date?: string;
    aide_status?: AideStatus;
    
    // ─── Sentry Request Fields ──────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;
    
    // ─── Legacy fields ──────────────────────────────────────────────────────
    rank?: string;
}

export interface UpdateEStampPayload {
    id: string;
    e_stamp_url?: string;
    e_stamp_public_id?: string;
    e_stamp_status?: EStampStatus;
}

// ─── Bulk Operations ──────────────────────────────────────────────────────

export interface BulkLinkDocumentsPayload {
    document_ids: string[];
    entity_type: HelpdeskEntityType;
    entity_id: string;   // can be UUID or custom ID
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    
    // ─── Aide Request Fields ──────────────────────────────────────────────
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    proposed_assignment?: string;
    reporting_date?: string;
    aide_status?: AideStatus;
    
    // ─── Sentry Request Fields ──────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;
    
    // ─── Legacy fields ──────────────────────────────────────────────────────
    rank?: string;
}

export interface BulkUpdateStatusPayload {
    document_ids: string[];
    status: HelpdeskDocumentStatus;
    comments?: string;
}

export interface BatchUploadPayload {
    documents: Omit<UploadHelpdeskDocumentPayload, 'blob' | 'filename'>[];
}

// ─── Helpdesk Document Response ──────────────────────────────────────────────

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

export interface BulkOperationResult {
    success: string[];
    failed: string[];
}

// ─── Helpdesk Document State ──────────────────────────────────────────────────

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
        link: boolean;
        batchUpload: boolean;
        bulkLink: boolean;
        bulkUpdate: boolean;
        stats: boolean;
        // Two-step approval loading states
        internalPreview: boolean;
        internalApprove: boolean;
        internalReject: boolean;
        internalRequestChanges: boolean;
        internalCancel: boolean;
        sendBack: boolean;
        resubmit: boolean;
        pendingInternal: boolean;
        requesterDashboard: boolean;
    };
    error: string | null;
    deletingId: string | null;
    actionLoading: {
        [key: string]: {
            submitting?: boolean;
            approving?: boolean;
            rejecting?: boolean;
            returning?: boolean;
            previewing?: boolean;
            internalApproving?: boolean;
            internalRejecting?: boolean;
            requestingChanges?: boolean;
            sendingBack?: boolean;
            resubmitting?: boolean;
            cancelling?: boolean;
            stamping?: boolean;
        };
    };
    stats: DocumentStats | null;
    summary: DocumentSummary | null;
    // Two-step approval specific state
    pendingInternalApprovals: {
        documents: HelpdeskDocument[];
        summary: PendingInternalApprovalsSummary | null;
    };
    requesterDocuments: {
        documents: RequesterDocumentView[];
        summary: {
            total: number;
            by_status: Record<string, number>;
            can_resubmit: number;
        } | null;
    };
}

// ─── Document Statistics ──────────────────────────────────────────────────

export interface DocumentStats {
    total: number;
    pending_approval: number;
    approved: number;
    rejected: number;
    returned: number;
    draft: number;
    by_entity: {
        entity_type: HelpdeskEntityType;
        count: number;
        pending: number;
        approved: number;
    }[];
    recent_activity: {
        id: string;
        ref: string;
        subject: string;
        action: string;
        user_name: string;
        created_at: string;
    }[];
    // Two-step workflow stats
    pending_internal: number;
    ready_to_send_back: number;
    // ─── NEW: Stamp stats ──────────────────────────────────────────────────────
    stamped_count: number;
    signed_count: number;
    signed_and_stamped_count: number;
}

export interface DocumentSummary {
    total: number;
    by_status: Record<HelpdeskDocumentStatus, number>;
    by_entity_type: Record<HelpdeskEntityType, number>;
    by_format: Record<HelpdeskDocumentFormat, number>;
    pending_approval: number;
    draft: number;
    approved: number;
    rejected: number;
    returned: number;
    // Two-step workflow summary
    internal_approval_summary: {
        pending: number;
        previewed: number;
        approved_internal: number;
        rejected_internal: number;
        changes_requested_internal: number;
        changes_ready: number;
    };
    requester_status_summary: Record<RequesterVisibleStatus, number>;
    signed_count: number;
    // ─── NEW: Stamp summary ────────────────────────────────────────────────────
    stamped_count: number;
    signed_and_stamped_count: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const HELPEDSK_ENTITY_LABELS: Record<HelpdeskEntityType, string> = {
    circuit: 'Circuit',
    bench: 'Bench',
    partHeard: 'Part-Heard',
    serviceWeek: 'Service Week',
    otherPayment: 'Other Payment',
    ticket: 'Travel Ticket',
    medicalClaim: 'Medical Claim',
    generalRequest: 'General Request',
    securityRequest: 'Security Request (Deprecated)',
    visa: 'Visa Support',
    protocol: 'Protocol Event',
    club: 'Club Membership',
    utility_memo: 'Utility Memo (Single Judge)',
    consolidated_utility_memo: 'Consolidated Utility Memo',
    consolidated_fuel_memo: 'Consolidated Fuel Memo',
    aide: 'Aide Request',
    sentry: 'Sentry Request',
};

export const HELPEDSK_ENTITY_ICONS: Record<HelpdeskEntityType, string> = {
    circuit: 'MapPin',
    bench: 'Gavel',
    partHeard: 'FileCheck',
    serviceWeek: 'Calendar',
    otherPayment: 'CreditCard',
    ticket: 'Plane',
    medicalClaim: 'Stethoscope',
    generalRequest: 'FileText',
    securityRequest: 'Shield',
    visa: 'Plane',
    protocol: 'Calendar',
    club: 'Users',
    utility_memo: 'FileText',
    consolidated_utility_memo: 'FileSpreadsheet',
    consolidated_fuel_memo: 'Fuel',
    aide: 'Shield',
    sentry: 'Home',
};

export const HELPEDSK_ENTITY_COLORS: Record<HelpdeskEntityType, string> = {
    circuit: 'text-purple-600 bg-purple-50',
    bench: 'text-blue-600 bg-blue-50',
    partHeard: 'text-indigo-600 bg-indigo-50',
    serviceWeek: 'text-teal-600 bg-teal-50',
    otherPayment: 'text-rose-600 bg-rose-50',
    ticket: 'text-cyan-600 bg-cyan-50',
    medicalClaim: 'text-emerald-600 bg-emerald-50',
    generalRequest: 'text-amber-600 bg-amber-50',
    securityRequest: 'text-gray-600 bg-gray-50',
    visa: 'text-indigo-600 bg-indigo-50',
    protocol: 'text-blue-600 bg-blue-50',
    club: 'text-purple-600 bg-purple-50',
    utility_memo: 'text-amber-600 bg-amber-50',
    consolidated_utility_memo: 'text-indigo-600 bg-indigo-50',
    consolidated_fuel_memo: 'text-orange-600 bg-orange-50',
    aide: 'text-blue-600 bg-blue-50',
    sentry: 'text-emerald-600 bg-emerald-50',
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

export const DOCUMENT_STATUS_BADGE_STYLES: Record<HelpdeskDocumentStatus, string> = {
    draft: 'badge-stone',
    pending_approval: 'badge-amber',
    approved: 'badge-emerald',
    rejected: 'badge-red',
    returned: 'badge-blue',
};

export const E_STAMP_STATUS_LABELS: Record<EStampStatus, string> = {
    pending: 'Pending',
    stamped: 'Stamped ✓',
    failed: 'Failed',
};

export const E_STAMP_STATUS_COLORS: Record<EStampStatus, string> = {
    pending: 'text-amber-600 bg-amber-50',
    stamped: 'text-emerald-600 bg-emerald-50',
    failed: 'text-red-600 bg-red-50',
};

// ─── Two-Step Approval Constants ────────────────────────────────────────────

export const INTERNAL_APPROVAL_STATUS_LABELS: Record<InternalApprovalStatus, string> = {
    pending: 'Pending Review',
    previewed: 'Previewed',
    approved_internal: 'Approved (Pending Send Back)',
    rejected_internal: 'Rejected (Pending Send Back)',
    changes_requested_internal: 'Changes Requested (Pending Send Back)',
    changes_ready: 'Changes Ready for Re-review',
};

export const INTERNAL_APPROVAL_STATUS_COLORS: Record<InternalApprovalStatus, string> = {
    pending: 'bg-amber-50 text-amber-700',
    previewed: 'bg-blue-50 text-blue-700',
    approved_internal: 'bg-emerald-50 text-emerald-700',
    rejected_internal: 'bg-red-50 text-red-700',
    changes_requested_internal: 'bg-orange-50 text-orange-700',
    changes_ready: 'bg-purple-50 text-purple-700',
};

export const INTERNAL_APPROVAL_STATUS_ICONS: Record<InternalApprovalStatus, string> = {
    pending: 'Clock',
    previewed: 'Eye',
    approved_internal: 'CheckCircle',
    rejected_internal: 'XCircle',
    changes_requested_internal: 'Pencil',
    changes_ready: 'RefreshCw',
};

export const REQUESTER_VISIBLE_STATUS_LABELS: Record<RequesterVisibleStatus, string> = {
    pending_approval: 'Pending Approval',
    approved: 'Approved ✓',
    rejected: 'Rejected ✗',
    changes_requested: 'Changes Requested',
    in_revision: 'In Revision',
};

export const REQUESTER_VISIBLE_STATUS_COLORS: Record<RequesterVisibleStatus, string> = {
    pending_approval: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    changes_requested: 'bg-orange-50 text-orange-700',
    in_revision: 'bg-blue-50 text-blue-700',
};

export const REQUESTER_VISIBLE_STATUS_ICONS: Record<RequesterVisibleStatus, string> = {
    pending_approval: 'Clock',
    approved: 'CircleCheckBig',
    rejected: 'CircleX',
    changes_requested: 'Pencil',
    in_revision: 'RefreshCw',
};

// ─── Stamp Constants ──────────────────────────────────────────────────────────

export const STAMP_TYPE_LABELS: Record<StampType, string> = {
    approved: 'Approved',
    received: 'Received',
    official: 'Official',
};

export const STAMP_TYPE_COLORS: Record<StampType, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    received: 'bg-blue-50 text-blue-700 border-blue-200',
    official: 'bg-purple-50 text-purple-700 border-purple-200',
};

// ─── Aide Status Constants ──────────────────────────────────────────────────

export const AIDE_STATUS_LABELS: Record<AideStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    rejected: 'Rejected',
    attached: 'Attached',
};

export const AIDE_STATUS_COLORS: Record<AideStatus, string> = {
    pending: 'text-amber-600 bg-amber-50',
    in_progress: 'text-blue-600 bg-blue-50',
    rejected: 'text-red-600 bg-red-50',
    attached: 'text-emerald-600 bg-emerald-50',
};

// ─── Sentry Status Constants ──────────────────────────────────────────────

export const SENTRY_STATUS_LABELS: Record<SentryStatus, string> = {
    pending: 'Pending',
    active: 'Active',
    resolved: 'Resolved',
    rejected: 'Rejected',
};

export const SENTRY_STATUS_COLORS: Record<SentryStatus, string> = {
    pending: 'text-amber-600 bg-amber-50',
    active: 'text-emerald-600 bg-emerald-50',
    resolved: 'text-blue-600 bg-blue-50',
    rejected: 'text-red-600 bg-red-50',
};

// ─── Officer Rank Constants ──────────────────────────────────────────────────

export const OFFICER_RANK_LABELS: Record<OfficerRank, string> = {
    'Police Constable (PC)': 'Police Constable (PC)',
    'Corporal (CPL)': 'Corporal (CPL)',
    'Sergeant (SGT)': 'Sergeant (SGT)',
    'Inspector (IP)': 'Inspector (IP)',
    'Chief Inspector (CIP)': 'Chief Inspector (CIP)',
    'Assistant Superintendent (ASP)': 'Assistant Superintendent (ASP)',
    'Superintendent (SP)': 'Superintendent (SP)',
    'Senior Superintendent (SSP)': 'Senior Superintendent (SSP)',
    'Assistant Commissioner (ACP)': 'Assistant Commissioner (ACP)',
    'Senior Assistant Commissioner (SACP)': 'Senior Assistant Commissioner (SACP)',
    'Commissioner (CP)': 'Commissioner (CP)',
};

// ─── Request Type Helpers ────────────────────────────────────────────────────

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
    Driver: 'Driver Request',
    Bodyguard: 'Bodyguard Request',
    Firearm: 'Firearm Request',
    'Current Station': 'Current Station Request',
    'Force Number': 'Force Number Request',
    'Residence Security': 'Residence Security Request',
    Sentry: 'Sentry Request',
};

export const REQUEST_TYPE_COLORS: Record<RequestType, string> = {
    Driver: 'text-blue-600 bg-blue-50',
    Bodyguard: 'text-purple-600 bg-purple-50',
    Firearm: 'text-red-600 bg-red-50',
    'Current Station': 'text-green-600 bg-green-50',
    'Force Number': 'text-orange-600 bg-orange-50',
    'Residence Security': 'text-indigo-600 bg-indigo-50',
    Sentry: 'text-gray-600 bg-gray-50',
};

export const REMARK_TYPE_LABELS: Record<RemarkType, string> = {
    Onboarding: 'Onboarding',
    Release: 'Release',
};

export const CATEGORY_TYPE_LABELS: Record<GeneralRequestCategory, string> = {
    Security: 'Security',
    Personnel: 'Personnel',
    Administrative: 'Administrative',
};

// ─── Helper Functions ──────────────────────────────────────────────────────

export function getEntityDisplayName(entityType: HelpdeskEntityType): string {
    return HELPEDSK_ENTITY_LABELS[entityType] || entityType;
}

export function getEntityIcon(entityType: HelpdeskEntityType): string {
    return HELPEDSK_ENTITY_ICONS[entityType] || 'File';
}

export function getEntityColor(entityType: HelpdeskEntityType): string {
    return HELPEDSK_ENTITY_COLORS[entityType] || 'text-gray-600 bg-gray-50';
}

export function getStatusDisplayName(status: HelpdeskDocumentStatus): string {
    return DOCUMENT_STATUS_LABELS[status] || status;
}

export function getStatusColor(status: HelpdeskDocumentStatus): string {
    return DOCUMENT_STATUS_COLORS[status] || '';
}

export function getStatusBadgeStyle(status: HelpdeskDocumentStatus): string {
    return DOCUMENT_STATUS_BADGE_STYLES[status] || '';
}

export function getEStampStatusLabel(status: EStampStatus): string {
    return E_STAMP_STATUS_LABELS[status] || status;
}

export function getEStampStatusColor(status: EStampStatus): string {
    return E_STAMP_STATUS_COLORS[status] || '';
}

// ─── Two-Step Approval Helper Functions ────────────────────────────────────

export function getInternalApprovalStatusDisplayName(status: InternalApprovalStatus): string {
    return INTERNAL_APPROVAL_STATUS_LABELS[status] || status;
}

export function getInternalApprovalStatusColor(status: InternalApprovalStatus): string {
    return INTERNAL_APPROVAL_STATUS_COLORS[status] || '';
}

export function getInternalApprovalStatusIcon(status: InternalApprovalStatus): string {
    return INTERNAL_APPROVAL_STATUS_ICONS[status] || 'File';
}

export function getRequesterVisibleStatusDisplayName(status: RequesterVisibleStatus): string {
    return REQUESTER_VISIBLE_STATUS_LABELS[status] || status;
}

export function getRequesterVisibleStatusColor(status: RequesterVisibleStatus): string {
    return REQUESTER_VISIBLE_STATUS_COLORS[status] || '';
}

export function getRequesterVisibleStatusIcon(status: RequesterVisibleStatus): string {
    return REQUESTER_VISIBLE_STATUS_ICONS[status] || 'File';
}

// ─── Stamp Helper Functions ──────────────────────────────────────────────────

export function getStampTypeLabel(stampType: StampType): string {
    return STAMP_TYPE_LABELS[stampType] || stampType;
}

export function getStampTypeColor(stampType: StampType): string {
    return STAMP_TYPE_COLORS[stampType] || '';
}

export function isInternalApprovalPending(status: InternalApprovalStatus): boolean {
    return ['pending', 'previewed'].includes(status);
}

export function isInternalApprovalComplete(status: InternalApprovalStatus): boolean {
    return ['approved_internal', 'rejected_internal', 'changes_requested_internal'].includes(status);
}

export function canSendBackToRequester(status: InternalApprovalStatus): boolean {
    return ['approved_internal', 'rejected_internal', 'changes_requested_internal'].includes(status);
}

export function canResubmitAfterChanges(status: RequesterVisibleStatus): boolean {
    return ['changes_requested', 'rejected'].includes(status);
}

export function isDocumentVisibleToRequester(requesterStatus: RequesterVisibleStatus): boolean {
    return ['approved', 'rejected', 'changes_requested', 'in_revision'].includes(requesterStatus);
}

export function isPreviewRequired(internalStatus: InternalApprovalStatus): boolean {
    return ['pending', 'changes_ready'].includes(internalStatus);
}

/**
 * Gets the next internal approval status based on super admin action
 */
export function getNextInternalStatus(
    currentStatus: InternalApprovalStatus,
    action: 'preview' | 'approve' | 'reject' | 'request_changes' | 'resubmit_changes' | 'cancel'
): InternalApprovalStatus {
    const transitions: Record<InternalApprovalStatus, Record<string, InternalApprovalStatus>> = {
        pending: {
            preview: 'previewed',
            approve: 'approved_internal',
            reject: 'rejected_internal',
            request_changes: 'changes_requested_internal',
            resubmit_changes: 'pending',
            cancel: 'pending',
        },
        previewed: {
            preview: 'previewed',
            approve: 'approved_internal',
            reject: 'rejected_internal',
            request_changes: 'changes_requested_internal',
            resubmit_changes: 'pending',
            cancel: 'pending',
        },
        approved_internal: {
            preview: 'approved_internal',
            approve: 'approved_internal',
            reject: 'rejected_internal',
            request_changes: 'changes_requested_internal',
            resubmit_changes: 'approved_internal',
            cancel: 'pending',
        },
        rejected_internal: {
            preview: 'rejected_internal',
            approve: 'approved_internal',
            reject: 'rejected_internal',
            request_changes: 'changes_requested_internal',
            resubmit_changes: 'pending',
            cancel: 'pending',
        },
        changes_requested_internal: {
            preview: 'changes_requested_internal',
            approve: 'approved_internal',
            reject: 'rejected_internal',
            request_changes: 'changes_requested_internal',
            resubmit_changes: 'changes_ready',
            cancel: 'pending',
        },
        changes_ready: {
            preview: 'previewed',
            approve: 'approved_internal',
            reject: 'rejected_internal',
            request_changes: 'changes_requested_internal',
            resubmit_changes: 'changes_ready',
            cancel: 'pending',
        },
    };

    return transitions[currentStatus]?.[action] || currentStatus;
}

/**
 * Gets the requester visible status based on internal approval status and send-back action
 */
export function getRequesterVisibleStatus(
    internalStatus: InternalApprovalStatus,
    sendBackAction: 'approved' | 'rejected' | 'changes_requested'
): RequesterVisibleStatus {
    const mapping: Record<InternalApprovalStatus, Record<string, RequesterVisibleStatus>> = {
        approved_internal: {
            approved: 'approved',
            rejected: 'rejected',
            changes_requested: 'changes_requested',
        },
        rejected_internal: {
            approved: 'approved',
            rejected: 'rejected',
            changes_requested: 'changes_requested',
        },
        changes_requested_internal: {
            approved: 'approved',
            rejected: 'rejected',
            changes_requested: 'changes_requested',
        },
        changes_ready: {
            approved: 'approved',
            rejected: 'rejected',
            changes_requested: 'changes_requested',
        },
        pending: {
            approved: 'pending_approval',
            rejected: 'pending_approval',
            changes_requested: 'pending_approval',
        },
        previewed: {
            approved: 'pending_approval',
            rejected: 'pending_approval',
            changes_requested: 'pending_approval',
        },
    };

    return mapping[internalStatus]?.[sendBackAction] || 'pending_approval';
}

// ─── Request Type Helpers ────────────────────────────────────────────────────

export function getRequestTypeLabel(requestType: RequestType): string {
    return REQUEST_TYPE_LABELS[requestType] || requestType;
}

export function getRequestTypeColor(requestType: RequestType): string {
    return REQUEST_TYPE_COLORS[requestType] || 'text-gray-600 bg-gray-50';
}

export function getRemarkTypeLabel(remarkType: RemarkType): string {
    return REMARK_TYPE_LABELS[remarkType] || remarkType;
}

export function getCategoryTypeLabel(category: GeneralRequestCategory): string {
    return CATEGORY_TYPE_LABELS[category] || category;
}

export function getOfficerRankLabel(rank: OfficerRank): string {
    return OFFICER_RANK_LABELS[rank] || rank;
}

export function getAideStatusLabel(status: AideStatus): string {
    return AIDE_STATUS_LABELS[status] || status;
}

export function getAideStatusColor(status: AideStatus): string {
    return AIDE_STATUS_COLORS[status] || '';
}

export function getSentryStatusLabel(status: SentryStatus): string {
    return SENTRY_STATUS_LABELS[status] || status;
}

export function getSentryStatusColor(status: SentryStatus): string {
    return SENTRY_STATUS_COLORS[status] || '';
}

export function isRequestType(value: string): value is RequestType {
    return [
        'Driver',
        'Bodyguard',
        'Firearm',
        'Current Station',
        'Force Number',
        'Residence Security',
        'Sentry'
    ].includes(value);
}

export function isRemarkType(value: string): value is RemarkType {
    return ['Onboarding', 'Release'].includes(value);
}

export function isGeneralRequestCategory(value: string): value is GeneralRequestCategory {
    return ['Security', 'Personnel', 'Administrative'].includes(value);
}

export function isOfficerRank(value: string): value is OfficerRank {
    return [
        'Police Constable (PC)',
        'Corporal (CPL)',
        'Sergeant (SGT)',
        'Inspector (IP)',
        'Chief Inspector (CIP)',
        'Assistant Superintendent (ASP)',
        'Superintendent (SP)',
        'Senior Superintendent (SSP)',
        'Assistant Commissioner (ACP)',
        'Senior Assistant Commissioner (SACP)',
        'Commissioner (CP)'
    ].includes(value);
}

export function isUnitType(value: string): value is UnitType {
    return ['KPS', 'APS', 'GSU', 'DCI', 'VIPPU', 'Other'].includes(value);
}

export function isAideStatus(value: string): value is AideStatus {
    return ['pending', 'in_progress', 'rejected', 'attached'].includes(value);
}

export function isSentryStatus(value: string): value is SentryStatus {
    return ['pending', 'active', 'resolved', 'rejected'].includes(value);
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isHelpdeskEntityType(value: string): value is HelpdeskEntityType {
    return [
        'circuit',
        'bench',
        'partHeard',
        'serviceWeek',
        'otherPayment',
        'ticket',
        'medicalClaim',
        'generalRequest',
        'securityRequest',
        'visa',
        'protocol',
        'club',
        'utility_memo',
        'consolidated_utility_memo',
        'consolidated_fuel_memo',
        'aide',
        'sentry'
    ].includes(value);
}

export function isHelpdeskDocumentStatus(value: string): value is HelpdeskDocumentStatus {
    return ['draft', 'pending_approval', 'approved', 'rejected', 'returned'].includes(value);
}

export function isEStampStatus(value: string): value is EStampStatus {
    return ['pending', 'stamped', 'failed'].includes(value);
}

export function isInternalApprovalStatus(value: string): value is InternalApprovalStatus {
    return [
        'pending',
        'previewed',
        'approved_internal',
        'rejected_internal',
        'changes_requested_internal',
        'changes_ready'
    ].includes(value);
}

export function isRequesterVisibleStatus(value: string): value is RequesterVisibleStatus {
    return [
        'pending_approval',
        'approved',
        'rejected',
        'changes_requested',
        'in_revision'
    ].includes(value);
}

export function isStampType(value: string): value is StampType {
    return ['approved', 'received', 'official'].includes(value);
}

// ─── URL Helpers ─────────────────────────────────────────────────────────────

export function getDocumentDownloadUrl(documentId: string): string {
    return `/api/helpdesk/documents/${documentId}/download`;
}

export function getDocumentViewUrl(documentId: string): string {
    return `/api/helpdesk/documents/${documentId}/view`;
}

export function getEStampDownloadUrl(documentId: string): string {
    return `/api/helpdesk/documents/${documentId}/estampt/download`;
}

// ─── Status Transition Validation ───────────────────────────────────────────

export function validateDocumentStatusTransition(
    currentStatus: HelpdeskDocumentStatus,
    newStatus: HelpdeskDocumentStatus
): boolean {
    const validTransitions: Record<HelpdeskDocumentStatus, HelpdeskDocumentStatus[]> = {
        draft: ['pending_approval'],
        pending_approval: ['approved', 'rejected', 'returned'],
        approved: ['returned'],
        rejected: ['draft'],
        returned: ['draft'],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
}

export function getAvailableStatusTransitions(currentStatus: HelpdeskDocumentStatus): HelpdeskDocumentStatus[] {
    const transitions: Record<HelpdeskDocumentStatus, HelpdeskDocumentStatus[]> = {
        draft: ['pending_approval'],
        pending_approval: ['approved', 'rejected', 'returned'],
        approved: ['returned'],
        rejected: ['draft'],
        returned: ['draft'],
    };

    return transitions[currentStatus] || [];
}