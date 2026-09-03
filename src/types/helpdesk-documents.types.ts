// src/types/helpdesk-documents.types.ts

// ── Department Types ──────────────────────────────────────────────────────────

/**
 * Department categories for access control
 */
export type DocumentDepartment = 
    | 'helpdesk'
    | 'principalregistry'
    | 'procurement';

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
    | 'visa'
    | 'protocol'
    | 'club'
    | 'utility_memo'
    | 'consolidated_utility_memo'
    | 'consolidated_fuel_memo'
    | 'aide'
    | 'sentry'
    | 'conference'
    | 'principalregistry'
    | 'procurement'
    | 'sensitization';  // ← ADDED: Sensitization documents

export type HelpdeskDocumentFormat = 'pdf' | 'docx' | 'xlsx';

// ─── Document Status ──────────────────────────────────────────────────────────

export type HelpdeskDocumentStatus = 
    | 'draft' 
    | 'pending_approval' 
    | 'ready_to_send' 
    | 'approved' 
    | 'rejected' 
    | 'returned';

export type EStampStatus = 'pending' | 'stamped' | 'failed';

// ─── Stamp Types ──────────────────────────────────────────────────────────────

export type StampType = 'approved' | 'received' | 'official';

// ─── Utility Sync Status ──────────────────────────────────────────────────────

export type UtilitySyncStatus = 
    | 'pending'
    | 'synced'
    | 'failed'
    | 'not_applicable';

export interface SyncedUtilityItem {
    id: string;
    utility_type: string;
    amount: number;
    period: string;
    judge_name: string;
    pj_number: string | null;
    previous_status: string;
    new_status: string;
    synced_at: string;
}

// ─── Two-Step Approval Types ──────────────────────────────────────────────────

export type InternalApprovalStatus = 
    | 'pending'
    | 'previewed'
    | 'approved_internal'
    | 'rejected_internal'
    | 'changes_requested_internal'
    | 'changes_ready';

export type RequesterVisibleStatus = 
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'changes_requested'
    | 'in_revision';

// ─── Consolidated Memo Helpers ──────────────────────────────────────────────

export type ConsolidatedMemoType = 'all' | 'fuel';

export function getConsolidatedMemoEntityId(
    type: ConsolidatedMemoType,
    date: Date = new Date()
): string {
    const month = date.toISOString().slice(0, 7);
    return `cons-${type}-${month}`;
}

export function getConsolidatedMemoEntityType(
    type: ConsolidatedMemoType
): HelpdeskEntityType {
    return type === 'fuel' ? 'consolidated_fuel_memo' : 'consolidated_utility_memo';
}

// ─── Request Types ────────────────────────────────────────────────────────────

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

// ─── Officer Ranks ────────────────────────────────────────────────────────────

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

// ─── Conference Types ─────────────────────────────────────────────────────────

export type ConferenceStatus = 
    | 'draft' 
    | 'pending' 
    | 'approved' 
    | 'rejected' 
    | 'completed' 
    | 'cancelled';

export type ConferenceType = 
    | 'judicial' 
    | 'administrative' 
    | 'training' 
    | 'workshop' 
    | 'seminar' 
    | 'other';

// ─── Approval History ────────────────────────────────────────────────────────

export interface ApprovalHistoryEntry {
    id: string;
    document_id: string;
    action: 'submitted' | 'approved' | 'rejected' | 'returned' | 'previewed' | 'sent_back' | 'resubmitted' | 'signed' | 'stamped' | 'utility_synced';
    from_user_id: string;
    from_user_name: string;
    to_user_id?: string;
    to_user_name?: string;
    comments?: string;
    created_at: string;
    internal_action?: boolean;
    requester_visible?: boolean;
    utility_sync_metadata?: {
        total_items: number;
        updated_count: number;
        failed_count: number;
    };
}

// ─── Comments ─────────────────────────────────────────────────────────────────

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

// ─── Document View Tracking ──────────────────────────────────────────────────

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

// ─── Main Document Interface ─────────────────────────────────────────────────

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

    // ─── Department ─────────────────────────────────────────────────────────
    department: DocumentDepartment;

    // ─── General Request Fields ─────────────────────────────────────────────
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;

    // ─── Two-Step Approval ──────────────────────────────────────────────────
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
    requester_status: RequesterVisibleStatus;
    requester_visible_at?: string;
    requester_visible_by?: string;
    requester_visible_by_name?: string;
    resubmit_count: number;
    last_resubmitted_at?: string;
    last_resubmitted_by?: string;
    is_internal_approval_complete: boolean;
    is_sent_back_to_requester: boolean;
    is_requester_notified: boolean;

    // ─── Utility Sync ──────────────────────────────────────────────────────
    utility_sync_status: UtilitySyncStatus;
    utility_synced_at?: string;
    utility_synced_by?: string;
    utility_sync_result?: {
        total_items: number;
        updated_items: SyncedUtilityItem[];
        failed_items: Array<{ id: string; reason: string }>;
    };

    // ─── Signature ──────────────────────────────────────────────────────────
    is_signed: boolean;
    signed_by?: string;
    signed_by_name?: string;
    signed_at?: string;
    signature_position_x?: number | null;
    signature_position_y?: number | null;
    signature_position_width?: number | null;
    signature_position_height?: number | null;

    // ─── Stamp ──────────────────────────────────────────────────────────────
    is_stamped: boolean;
    stamped_by?: string;
    stamped_by_name?: string;
    stamped_at?: string;
    stamp_type?: StampType;
    stamp_position_x?: number | null;
    stamp_position_y?: number | null;
    stamp_position_width?: number | null;
    stamp_position_height?: number | null;
    stamped_file_url?: string | null;
    stamped_file_public_id?: string | null;
    stamped_file_size?: number | null;

    // ─── Aide Request ──────────────────────────────────────────────────────
    officer_rank?: OfficerRank | null;
    officer_name?: string | null;
    employment_number?: string | null;
    current_station?: string | null;
    current_unit?: UnitType | null;
    proposed_assignment?: string | null;
    reporting_date?: string | null;
    aide_status?: AideStatus | null;

    // ─── Sentry Request ────────────────────────────────────────────────────
    residence_location?: string | null;
    sentry_status?: SentryStatus | null;

    // ─── Conference Request ────────────────────────────────────────────────
    conference_type?: ConferenceType | null;
    start_date?: string | null;
    end_date?: string | null;
    number_of_pax?: number | null;
    venue?: string | null;
    location?: string | null;
    budget_estimate?: number | null;
    conference_status?: ConferenceStatus | null;

    // ─── Legacy ─────────────────────────────────────────────────────────────
    rank?: string | null;
}

// ─── Requester Document View ─────────────────────────────────────────────────

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
    department: DocumentDepartment;
    approved_rejected_at?: string;
    approved_rejected_by?: string;
    approved_rejected_by_name?: string;
    changes_requested?: string[];
    rejection_reason?: string;
    can_resubmit: boolean;
    is_signed: boolean;
    signed_by_name?: string;
    signed_at?: string;
    is_stamped: boolean;
    stamped_by_name?: string;
    stamped_at?: string;
    stamp_type?: StampType;
    stamped_file_url?: string | null;
    utility_sync_status: UtilitySyncStatus;
}

// ─── Pending Internal Approvals Summary ─────────────────────────────────────

export interface PendingInternalApprovalsSummary {
    total_pending_internal: number;
    pending_review: number;
    previewed: number;
    changes_ready: number;
    approved_internal: number;
    rejected_internal: number;
    changes_requested_internal: number;
    ready_to_send_back: number;
    by_entity_type: Record<HelpdeskEntityType, number>;
    by_department: Record<DocumentDepartment, number>;
    urgent_pending: number;
    oldest_pending_days: number;
    average_review_time_hours?: number;
    pending_utility_sync: number;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

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
    unlinked?: boolean;

    // ─── Department ─────────────────────────────────────────────────────────
    department?: DocumentDepartment;
    exclude_departments?: DocumentDepartment[];
    include_helpdesk?: boolean;

    // ─── Two-Step Approval ──────────────────────────────────────────────────
    internal_approval_status?: InternalApprovalStatus;
    requester_status?: RequesterVisibleStatus;
    is_sent_back_to_requester?: boolean;
    pending_internal_approval?: boolean;
    ready_to_send_back?: boolean;
    my_requester_documents?: boolean;

    // ─── Utility Sync ──────────────────────────────────────────────────────
    utility_sync_status?: UtilitySyncStatus;
    needs_utility_sync?: boolean;

    // ─── General Request ────────────────────────────────────────────────────
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    date_from?: string;
    date_to?: string;

    // ─── Aide Request ──────────────────────────────────────────────────────
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    aide_status?: AideStatus;
    reporting_date?: string;

    // ─── Sentry Request ────────────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;

    // ─── Conference Request ────────────────────────────────────────────────
    conference_type?: ConferenceType;
    conference_status?: ConferenceStatus;
    start_date_from?: string;
    start_date_to?: string;
    location?: string;
    venue?: string;

    // ─── Legacy ─────────────────────────────────────────────────────────────
    rank?: string;

    // ─── Stamp ──────────────────────────────────────────────────────────────
    is_stamped?: boolean;
    stamp_type?: StampType;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface UploadHelpdeskDocumentPayload {
    blob: Blob;
    filename: string;
    ref: string;
    subject: string;
    entity_type: HelpdeskEntityType;
    entity_id?: string;
    format: HelpdeskDocumentFormat;
    status?: HelpdeskDocumentStatus;
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    proposed_assignment?: string;
    reporting_date?: string;
    aide_status?: AideStatus;
    residence_location?: string;
    sentry_status?: SentryStatus;
    conference_type?: ConferenceType;
    start_date?: string;
    end_date?: string;
    number_of_pax?: number;
    venue?: string;
    location?: string;
    budget_estimate?: number;
    conference_status?: ConferenceStatus;
    rank?: string;
}

export interface InternalPreviewPayload {
    id: string;
    previewed_by?: string;
    previewed_by_name?: string;
    comments?: string;
    ip_address?: string;
    user_agent?: string;
}

export interface InternalApprovalPayload {
    id: string;
    action: 'approve' | 'reject' | 'request_changes';
    comments?: string;
    changes_requested?: string[];
    rejection_reason?: string;
    approved_by?: string;
    approved_by_name?: string;
    generate_e_stamp?: boolean;
    sync_utilities?: boolean;
    signature_position_x?: number;
    signature_position_y?: number;
    signature_position_width?: number;
    signature_position_height?: number;
    stamp_position_x?: number;
    stamp_position_y?: number;
    stamp_position_width?: number;
    stamp_position_height?: number;
    stamp_type?: StampType;
}

export interface SendBackToRequesterPayload {
    id: string;
    final_status: 'approved' | 'rejected' | 'changes_requested';
    sent_by?: string;
    sent_by_name?: string;
    comments?: string;
    requester_message?: string;
    notify_requester?: boolean;
    sync_utilities?: boolean;
}

export interface ResubmitAfterChangesPayload {
    id: string;
    submitted_by?: string;
    submitted_by_name?: string;
    comments?: string;
    file_update?: boolean;
    reset_utility_sync?: boolean;
}

export interface CancelInternalApprovalPayload {
    id: string;
    cancelled_by?: string;
    cancelled_by_name?: string;
    reason?: string;
    reset_utility_sync?: boolean;
}

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
    sync_utilities?: boolean;
    utility_sync_status?: UtilitySyncStatus;
    is_signed?: boolean;
    signed_by?: string;
    signed_by_name?: string;
    signed_at?: string;
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
    entity_id: string;
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    proposed_assignment?: string;
    reporting_date?: string;
    aide_status?: AideStatus;
    residence_location?: string;
    sentry_status?: SentryStatus;
    conference_type?: ConferenceType;
    start_date?: string;
    end_date?: string;
    number_of_pax?: number;
    venue?: string;
    location?: string;
    budget_estimate?: number;
    conference_status?: ConferenceStatus;
    rank?: string;
}

export interface UpdateEStampPayload {
    id: string;
    e_stamp_url?: string;
    e_stamp_public_id?: string;
    e_stamp_status?: EStampStatus;
}

export interface BulkLinkDocumentsPayload {
    document_ids: string[];
    entity_type: HelpdeskEntityType;
    entity_id: string;
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    proposed_assignment?: string;
    reporting_date?: string;
    aide_status?: AideStatus;
    residence_location?: string;
    sentry_status?: SentryStatus;
    conference_type?: ConferenceType;
    start_date?: string;
    end_date?: string;
    number_of_pax?: number;
    venue?: string;
    location?: string;
    budget_estimate?: number;
    conference_status?: ConferenceStatus;
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

// ─── Responses ────────────────────────────────────────────────────────────────

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

// ─── State ─────────────────────────────────────────────────────────────────────

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
        internalPreview: boolean;
        internalApprove: boolean;
        internalReject: boolean;
        internalRequestChanges: boolean;
        internalCancel: boolean;
        sendBack: boolean;
        resubmit: boolean;
        pendingInternal: boolean;
        requesterDashboard: boolean;
        utilitySync: boolean;
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
            syncing?: boolean;
        };
    };
    stats: DocumentStats | null;
    summary: DocumentSummary | null;
    pendingInternalApprovals: {
        documents: HelpdeskDocument[];
        summary: PendingInternalApprovalsSummary | null;
    };
    requesterDocuments: {
        documents: RequesterDocumentView[];
        summary: {
            total: number;
            by_status: Record<string, number>;
            by_department: Record<DocumentDepartment, number>;
            can_resubmit: number;
            stamped_count: number;
            signed_count: number;
            signed_and_stamped_count: number;
        } | null;
    };
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export interface DocumentStats {
    total: number;
    pending_approval: number;
    ready_to_send: number;
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
    pending_internal: number;
    ready_to_send_back: number;
    stamped_count: number;
    signed_count: number;
    signed_and_stamped_count: number;
    utility_sync_stats: {
        total_utility_documents: number;
        synced: number;
        pending: number;
        failed: number;
    };
    by_department: Record<DocumentDepartment, number>;
}

export interface DocumentSummary {
    total: number;
    by_status: Record<HelpdeskDocumentStatus, number>;
    by_entity_type: Record<HelpdeskEntityType, number>;
    by_format: Record<HelpdeskDocumentFormat, number>;
    pending_approval: number;
    ready_to_send: number;
    draft: number;
    approved: number;
    rejected: number;
    returned: number;
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
    stamped_count: number;
    signed_and_stamped_count: number;
    utility_sync_summary: {
        synced: number;
        pending: number;
        failed: number;
        not_applicable: number;
    };
    by_department: Record<DocumentDepartment, number>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

export const DEPARTMENT_LABELS: Record<DocumentDepartment, string> = {
    helpdesk: 'Helpdesk',
    principalregistry: 'Principal Registry',
    procurement: 'Procurement',
};

export const DEPARTMENT_COLORS: Record<DocumentDepartment, string> = {
    helpdesk: 'bg-blue-50 text-blue-700',
    principalregistry: 'bg-indigo-50 text-indigo-700',
    procurement: 'bg-amber-50 text-amber-700',
};

export const DEPARTMENT_ICONS: Record<DocumentDepartment, string> = {
    helpdesk: 'LifeBuoy',
    principalregistry: 'Building',
    procurement: 'ShoppingCart',
};

export const ENTITY_TO_DEPARTMENT: Record<HelpdeskEntityType, DocumentDepartment> = {
    circuit: 'helpdesk',
    bench: 'helpdesk',
    partHeard: 'helpdesk',
    serviceWeek: 'helpdesk',
    otherPayment: 'helpdesk',
    ticket: 'helpdesk',
    medicalClaim: 'helpdesk',
    generalRequest: 'helpdesk',
    securityRequest: 'helpdesk',
    visa: 'helpdesk',
    protocol: 'helpdesk',
    club: 'helpdesk',
    utility_memo: 'helpdesk',
    consolidated_utility_memo: 'helpdesk',
    consolidated_fuel_memo: 'helpdesk',
    aide: 'helpdesk',
    sentry: 'helpdesk',
    conference: 'helpdesk',
    principalregistry: 'principalregistry',
    procurement: 'procurement',
    sensitization: 'principalregistry', // ← ADDED: Sensitization belongs to Principal Registry
};

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
    conference: 'Conference Request',
    principalregistry: 'Principal Registry',
    procurement: 'Procurement',
    sensitization: 'Sensitization', // ← ADDED
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
    conference: 'Calendar',
    principalregistry: 'Building',
    procurement: 'ShoppingCart',
    sensitization: 'Users', // ← ADDED
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
    conference: 'text-purple-600 bg-purple-50',
    principalregistry: 'text-indigo-600 bg-indigo-50',
    procurement: 'text-amber-600 bg-amber-50',
    sensitization: 'text-emerald-600 bg-emerald-50', // ← ADDED
};

export const DOCUMENT_STATUS_LABELS: Record<HelpdeskDocumentStatus, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    ready_to_send: 'Ready to Send',
    approved: 'Approved',
    rejected: 'Rejected',
    returned: 'Returned',
};

export const DOCUMENT_STATUS_COLORS: Record<HelpdeskDocumentStatus, string> = {
    draft: 'bg-stone-100 text-stone-600',
    pending_approval: 'bg-amber-50 text-amber-700',
    ready_to_send: 'bg-blue-50 text-blue-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    returned: 'bg-blue-50 text-blue-700',
};

export const DOCUMENT_STATUS_BADGE_STYLES: Record<HelpdeskDocumentStatus, string> = {
    draft: 'badge-stone',
    pending_approval: 'badge-amber',
    ready_to_send: 'badge-blue',
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

export const CONFERENCE_STATUS_LABELS: Record<ConferenceStatus, string> = {
    draft: 'Draft',
    pending: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export const CONFERENCE_STATUS_COLORS: Record<ConferenceStatus, string> = {
    draft: 'text-gray-600 bg-gray-50',
    pending: 'text-amber-600 bg-amber-50',
    approved: 'text-emerald-600 bg-emerald-50',
    rejected: 'text-red-600 bg-red-50',
    completed: 'text-blue-600 bg-blue-50',
    cancelled: 'text-stone-600 bg-stone-50',
};

export const CONFERENCE_TYPE_LABELS: Record<ConferenceType, string> = {
    judicial: 'Judicial',
    administrative: 'Administrative',
    training: 'Training',
    workshop: 'Workshop',
    seminar: 'Seminar',
    other: 'Other',
};

export const CONFERENCE_TYPE_COLORS: Record<ConferenceType, string> = {
    judicial: 'text-purple-600 bg-purple-50',
    administrative: 'text-blue-600 bg-blue-50',
    training: 'text-green-600 bg-green-50',
    workshop: 'text-amber-600 bg-amber-50',
    seminar: 'text-rose-600 bg-rose-50',
    other: 'text-stone-600 bg-stone-50',
};

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

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getUtilitySyncStatusLabel(status: UtilitySyncStatus): string {
    const labels: Record<UtilitySyncStatus, string> = {
        pending: 'Pending Sync',
        synced: 'Synced ✓',
        failed: 'Sync Failed',
        not_applicable: 'N/A',
    };
    return labels[status] || status;
}

export function isUtilityDocument(entityType: HelpdeskEntityType): boolean {
    return ['consolidated_utility_memo', 'consolidated_fuel_memo', 'utility_memo'].includes(entityType);
}

export function isConsolidatedUtilityDocument(entityType: HelpdeskEntityType): boolean {
    return ['consolidated_utility_memo', 'consolidated_fuel_memo'].includes(entityType);
}

export function getEntityDepartment(entityType: HelpdeskEntityType): DocumentDepartment {
    return ENTITY_TO_DEPARTMENT[entityType] || 'helpdesk';
}

export function isEntityInDepartment(
    entityType: HelpdeskEntityType, 
    department: DocumentDepartment
): boolean {
    return getEntityDepartment(entityType) === department;
}

export function isHelpdeskEntity(entityType: HelpdeskEntityType): boolean {
    return getEntityDepartment(entityType) === 'helpdesk';
}

export function isPrincipalRegistryEntity(entityType: HelpdeskEntityType): boolean {
    return getEntityDepartment(entityType) === 'principalregistry';
}

export function isProcurementEntity(entityType: HelpdeskEntityType): boolean {
    return getEntityDepartment(entityType) === 'procurement';
}

export function getDepartmentLabel(department: DocumentDepartment): string {
    return DEPARTMENT_LABELS[department] || department;
}

export function getDepartmentColor(department: DocumentDepartment): string {
    return DEPARTMENT_COLORS[department] || '';
}

export function getDepartmentIcon(department: DocumentDepartment): string {
    return DEPARTMENT_ICONS[department] || 'File';
}

export function getEntityDisplayName(entityType: HelpdeskEntityType): string {
    return HELPEDSK_ENTITY_LABELS[entityType] || entityType;
}

export function getEntityIcon(entityType: HelpdeskEntityType): string {
    return HELPEDSK_ENTITY_ICONS[entityType] || 'File';
}

export function getEntityColor(entityType: HelpdeskEntityType): string {
    return HELPEDSK_ENTITY_COLORS[entityType] || 'text-gray-600 bg-gray-50';
}

export function getEntityDepartmentLabel(entityType: HelpdeskEntityType): string {
    const department = getEntityDepartment(entityType);
    return getDepartmentLabel(department);
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

export function getConferenceStatusLabel(status: ConferenceStatus): string {
    return CONFERENCE_STATUS_LABELS[status] || status;
}

export function getConferenceStatusColor(status: ConferenceStatus): string {
    return CONFERENCE_STATUS_COLORS[status] || '';
}

export function getConferenceTypeLabel(type: ConferenceType): string {
    return CONFERENCE_TYPE_LABELS[type] || type;
}

export function getConferenceTypeColor(type: ConferenceType): string {
    return CONFERENCE_TYPE_COLORS[type] || '';
}

export function getStampTypeLabel(stampType: StampType): string {
    return STAMP_TYPE_LABELS[stampType] || stampType;
}

export function getStampTypeColor(stampType: StampType): string {
    return STAMP_TYPE_COLORS[stampType] || '';
}

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

// ─── State Check Helpers ──────────────────────────────────────────────────────

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

export function isPendingReview(doc: HelpdeskDocument): boolean {
    return doc.internal_approval_status === 'pending' 
        || doc.internal_approval_status === 'previewed'
        || doc.internal_approval_status === 'changes_ready';
}

export function isReadyToSendBack(doc: HelpdeskDocument): boolean {
    return doc.is_internal_approval_complete 
        && !doc.is_sent_back_to_requester
        && doc.status === 'pending_approval';
}

export function isInSuperAdminQueue(doc: HelpdeskDocument): boolean {
    return doc.status === 'pending_approval' 
        && !doc.is_sent_back_to_requester;
}

export function getSuperAdminDisplayStatus(doc: HelpdeskDocument): 'PENDING' | 'READY' {
    if (isReadyToSendBack(doc)) {
        return 'READY';
    }
    return 'PENDING';
}

export function canSuperAdminApprove(doc: HelpdeskDocument): boolean {
    return doc.status === 'pending_approval' 
        && !doc.is_sent_back_to_requester
        && !doc.is_internal_approval_complete
        && (doc.internal_approval_status === 'pending' 
            || doc.internal_approval_status === 'previewed'
            || doc.internal_approval_status === 'changes_ready');
}

export function canSuperAdminSendBack(doc: HelpdeskDocument): boolean {
    return doc.is_internal_approval_complete 
        && !doc.is_sent_back_to_requester
        && doc.status === 'pending_approval';
}

// ─── Status Transition Functions ────────────────────────────────────────────

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

export function validateDocumentStatusWithTwoStepWorkflow(
    currentStatus: HelpdeskDocumentStatus,
    currentInternalStatus: InternalApprovalStatus,
    currentRequesterStatus: RequesterVisibleStatus,
    newStatus: HelpdeskDocumentStatus,
    newInternalStatus?: InternalApprovalStatus,
    newRequesterStatus?: RequesterVisibleStatus
): boolean {
    const validTransitions: Record<HelpdeskDocumentStatus, HelpdeskDocumentStatus[]> = {
        draft: ['pending_approval', 'returned', 'approved'],
        pending_approval: ['ready_to_send', 'approved', 'rejected', 'returned', 'draft'],
        ready_to_send: ['approved', 'rejected', 'returned'],
        approved: ['returned'],
        rejected: ['draft', 'pending_approval'],
        returned: ['draft', 'pending_approval'],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return false;
    }

    if (!newInternalStatus) {
        return true;
    }

    const validInternalTransitions: Record<InternalApprovalStatus, InternalApprovalStatus[]> = {
        pending: ['previewed', 'approved_internal', 'rejected_internal', 'changes_requested_internal'],
        previewed: ['previewed', 'approved_internal', 'rejected_internal', 'changes_requested_internal'],
        approved_internal: ['approved_internal', 'rejected_internal', 'changes_requested_internal', 'pending'],
        rejected_internal: ['approved_internal', 'rejected_internal', 'changes_requested_internal', 'pending'],
        changes_requested_internal: ['approved_internal', 'rejected_internal', 'changes_requested_internal', 'changes_ready', 'pending'],
        changes_ready: ['previewed', 'approved_internal', 'rejected_internal', 'changes_requested_internal'],
    };

    if (!validInternalTransitions[currentInternalStatus]?.includes(newInternalStatus)) {
        return false;
    }

    if (newRequesterStatus) {
        const validRequesterTransitions: Record<RequesterVisibleStatus, RequesterVisibleStatus[]> = {
            pending_approval: ['approved', 'rejected', 'changes_requested'],
            approved: ['pending_approval'],
            rejected: ['in_revision', 'pending_approval'],
            changes_requested: ['in_revision', 'pending_approval'],
            in_revision: ['pending_approval'],
        };

        if (!validRequesterTransitions[currentRequesterStatus]?.includes(newRequesterStatus)) {
            return false;
        }
    }

    return true;
}

export function validateDocumentStatusTransition(
    currentStatus: HelpdeskDocumentStatus,
    newStatus: HelpdeskDocumentStatus
): boolean {
    const validTransitions: Record<HelpdeskDocumentStatus, HelpdeskDocumentStatus[]> = {
        draft: ['pending_approval'],
        pending_approval: ['ready_to_send', 'approved', 'rejected', 'returned'],
        ready_to_send: ['approved', 'rejected', 'returned'],
        approved: ['returned'],
        rejected: ['draft'],
        returned: ['draft'],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
}

export function getAvailableStatusTransitions(currentStatus: HelpdeskDocumentStatus): HelpdeskDocumentStatus[] {
    const transitions: Record<HelpdeskDocumentStatus, HelpdeskDocumentStatus[]> = {
        draft: ['pending_approval'],
        pending_approval: ['ready_to_send', 'approved', 'rejected', 'returned'],
        ready_to_send: ['approved', 'rejected', 'returned'],
        approved: ['returned'],
        rejected: ['draft'],
        returned: ['draft'],
    };

    return transitions[currentStatus] || [];
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isHelpdeskEntityType(value: string): value is HelpdeskEntityType {
    return [
        'circuit', 'bench', 'partHeard', 'serviceWeek', 'otherPayment',
        'ticket', 'medicalClaim', 'generalRequest', 'securityRequest',
        'visa', 'protocol', 'club', 'utility_memo',
        'consolidated_utility_memo', 'consolidated_fuel_memo',
        'aide', 'sentry', 'conference',
        'principalregistry', 'procurement', 'sensitization' // ← ADDED
    ].includes(value);
}

export function isDocumentDepartment(value: string): value is DocumentDepartment {
    return ['helpdesk', 'principalregistry', 'procurement'].includes(value);
}

export function isHelpdeskDocumentStatus(value: string): value is HelpdeskDocumentStatus {
    return ['draft', 'pending_approval', 'ready_to_send', 'approved', 'rejected', 'returned'].includes(value);
}

export function isEStampStatus(value: string): value is EStampStatus {
    return ['pending', 'stamped', 'failed'].includes(value);
}

export function isInternalApprovalStatus(value: string): value is InternalApprovalStatus {
    return [
        'pending', 'previewed', 'approved_internal',
        'rejected_internal', 'changes_requested_internal', 'changes_ready'
    ].includes(value);
}

export function isRequesterVisibleStatus(value: string): value is RequesterVisibleStatus {
    return [
        'pending_approval', 'approved', 'rejected',
        'changes_requested', 'in_revision'
    ].includes(value);
}

export function isStampType(value: string): value is StampType {
    return ['approved', 'received', 'official'].includes(value);
}

export function isUtilitySyncStatus(value: string): value is UtilitySyncStatus {
    return ['pending', 'synced', 'failed', 'not_applicable'].includes(value);
}

export function isRequestType(value: string): value is RequestType {
    return [
        'Driver', 'Bodyguard', 'Firearm', 'Current Station',
        'Force Number', 'Residence Security', 'Sentry'
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
        'Police Constable (PC)', 'Corporal (CPL)', 'Sergeant (SGT)',
        'Inspector (IP)', 'Chief Inspector (CIP)',
        'Assistant Superintendent (ASP)', 'Superintendent (SP)',
        'Senior Superintendent (SSP)', 'Assistant Commissioner (ACP)',
        'Senior Assistant Commissioner (SACP)', 'Commissioner (CP)'
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

export function isConferenceStatus(value: string): value is ConferenceStatus {
    return ['draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled'].includes(value);
}

export function isConferenceType(value: string): value is ConferenceType {
    return ['judicial', 'administrative', 'training', 'workshop', 'seminar', 'other'].includes(value);
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