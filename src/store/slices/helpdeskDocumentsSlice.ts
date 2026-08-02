// src/store/slices/helpdeskDocumentsSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import axiosClient from '../../api/api';
import type { RootState } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx';

// ✅ Fully synced with backend - includes all entity types
export type DocumentEntityType =
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
    | 'sentry';

export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'returned';
export type EStampStatus = 'pending' | 'stamped' | 'failed';

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

// ─── Unified Request Types ──────────────────────────────────────────────────

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

// ─── Aide & Sentry Types ────────────────────────────────────────────────────

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

// ─── Document Tracking ──────────────────────────────────────────────────────

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

export interface ApprovalHistoryEntry {
    id: string;
    document_id: string;
    action: 'submitted' | 'approved' | 'rejected' | 'returned' | 'previewed' | 'sent_back' | 'resubmitted' | 'signed';
    from_user_id: string;
    from_user_name: string;
    to_user_id?: string;
    to_user_name?: string;
    comments?: string;
    created_at: string;
    internal_action?: boolean;
    requester_visible?: boolean;
}

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

// ─── Document Preview History ──────────────────────────────────────────────

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
    entity_type: DocumentEntityType;
    entity_id: string | null;
    format: DocumentFormat;
    file_url: string;
    public_id: string;
    file_size: number | null;
    uploaded_by: string | null;
    uploaded_by_name?: string;
    status: DocumentStatus;
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

    // Unified General Request fields
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;

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
    requester_visible_at?: string;
    requester_visible_by?: string;
    requester_visible_by_name?: string;
    
    // Resubmit tracking
    resubmit_count: number;
    last_resubmitted_at?: string;
    last_resubmitted_by?: string;
    
    // Flags
    is_internal_approval_complete: boolean;
    is_sent_back_to_requester: boolean;
    is_requester_notified: boolean;

    // ─── Signature Fields ──────────────────────────────────────────────────────
    is_signed: boolean;
    signed_by?: string;
    signed_by_name?: string;
    signed_at?: string;
    signature_position_x?: number | null;
    signature_position_y?: number | null;
    signature_position_width?: number | null;
    signature_position_height?: number | null;

    // ─── Aide Request Fields ──────────────────────────────────────────────────
    officer_rank?: OfficerRank | null;
    officer_name?: string | null;
    employment_number?: string | null;
    current_station?: string | null;
    current_unit?: UnitType | null;
    proposed_assignment?: string | null;
    reporting_date?: string | null;
    aide_status?: AideStatus | null;
    
    // ─── Sentry Request Fields ────────────────────────────────────────────────
    residence_location?: string | null;
    sentry_status?: SentryStatus | null;
    
    // ─── Legacy fields ──────────────────────────────────────────────────────
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
    entity_type: DocumentEntityType;
    entity_id?: string;
    approved_rejected_at?: string;
    approved_rejected_by?: string;
    approved_rejected_by_name?: string;
    changes_requested?: string[];
    rejection_reason?: string;
    can_resubmit: boolean;
    // ─── Signature info ──────────────────────────────────────────────────────
    is_signed: boolean;
    signed_by_name?: string;
    signed_at?: string;
}

// ─── Pending Internal Approvals Summary ──────────────────────────────────────

export interface PendingInternalApprovalsSummary {
    total_pending_internal: number;
    pending_review: number;
    previewed: number;
    approved_internal: number;
    rejected_internal: number;
    changes_requested_internal: number;
    ready_to_send_back: number;
    by_entity_type: Record<DocumentEntityType, number>;
    urgent_pending: number;
    oldest_pending_days: number;
    average_review_time_hours?: number;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface HelpdeskDocumentFilters {
    entity_type?: DocumentEntityType;
    entity_id?: string;
    format?: DocumentFormat;
    status?: DocumentStatus;
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
    pending_internal_approval?: boolean;
    ready_to_send_back?: boolean;
    my_requester_documents?: boolean;

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
    
    // ─── Sentry Request Filters ──────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;
    
    // ─── Legacy filters ──────────────────────────────────────────────────────
    rank?: string;
}

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface UploadHelpdeskDocumentPayload {
    blob: Blob;
    filename: string;
    ref: string;
    subject: string;
    entity_type: DocumentEntityType;
    entity_id?: string;
    format: DocumentFormat;
    status?: DocumentStatus;

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

export interface UpdateDocumentFilePayload {
    id: string;
    blob: Blob;
    filename: string;
    status?: DocumentStatus;
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
}

export interface SubmitForApprovalPayload {
    id: string;
    comments?: string;
    submitted_by?: string;
    submitted_by_name?: string;
}

// ─── Two-Step Approval Payloads ──────────────────────────────────────────────

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
    // ─── Signature position ─────────────────────────────────────────────────
    signature_position_x?: number;
    signature_position_y?: number;
    signature_position_width?: number;
    signature_position_height?: number;
}

export interface SendBackToRequesterPayload {
    id: string;
    final_status: 'approved' | 'rejected' | 'changes_requested';
    sent_by?: string;
    sent_by_name?: string;
    comments?: string;
    requester_message?: string;
    notify_requester?: boolean;
}

export interface ResubmitAfterChangesPayload {
    id: string;
    submitted_by?: string;
    submitted_by_name?: string;
    comments?: string;
    file_update?: boolean;
}

export interface CancelInternalApprovalPayload {
    id: string;
    cancelled_by?: string;
    cancelled_by_name?: string;
    reason?: string;
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
    entity_type: DocumentEntityType;
    entity_id: string;
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
    entity_type: DocumentEntityType;
    entity_id: string;
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
    status: DocumentStatus;
    comments?: string;
}

export interface BatchUploadPayload {
    documents: Omit<UploadHelpdeskDocumentPayload, 'blob' | 'filename'>[];
}

export interface BulkOperationResult {
    success: string[];
    failed: string[];
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
        entity_type: DocumentEntityType;
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
}

export interface DocumentSummary {
    total: number;
    by_status: Record<DocumentStatus, number>;
    by_entity_type: Record<DocumentEntityType, number>;
    by_format: Record<DocumentFormat, number>;
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
}

// ── Action Loading Types ─────────────────────────────────────────────────────

type ActionLoadingKey = 
    | 'submitting' 
    | 'approving' 
    | 'rejecting' 
    | 'returning'
    | 'previewing'
    | 'internalApproving'
    | 'internalRejecting'
    | 'requestingChanges'
    | 'sendingBack'
    | 'resubmitting'
    | 'cancelling';

type ActionLoadingState = {
    [key in ActionLoadingKey]?: boolean;
};

interface HelpdeskDocumentsState {
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
        hardDelete: boolean;
        updateFile: boolean;
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
        [documentId: string]: ActionLoadingState;
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

const initialState: HelpdeskDocumentsState = {
    items: [],
    selectedDocument: null,
    loading: {
        fetch: false,
        upload: false,
        delete: false,
        submit: false,
        approve: false,
        reject: false,
        return: false,
        comment: false,
        link: false,
        batchUpload: false,
        bulkLink: false,
        bulkUpdate: false,
        stats: false,
        hardDelete: false,
        updateFile: false,
        internalPreview: false,
        internalApprove: false,
        internalReject: false,
        internalRequestChanges: false,
        internalCancel: false,
        sendBack: false,
        resubmit: false,
        pendingInternal: false,
        requesterDashboard: false,
    },
    error: null,
    deletingId: null,
    actionLoading: {},
    stats: null,
    summary: null,
    pendingInternalApprovals: {
        documents: [],
        summary: null,
    },
    requesterDocuments: {
        documents: [],
        summary: null,
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildParams(filters: HelpdeskDocumentFilters): Record<string, string> {
    const params: Record<string, string> = {};
    
    // Core filters
    if (filters.entity_type) params.entity_type = filters.entity_type;
    if (filters.entity_id) params.entity_id = filters.entity_id;
    if (filters.format) params.format = filters.format;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.offset) params.offset = String(filters.offset);
    if (filters.uploaded_by) params.uploaded_by = filters.uploaded_by;
    if (filters.pending_my_approval) params.pending_my_approval = String(filters.pending_my_approval);
    if (filters.unlinked) params.unlinked = String(filters.unlinked);

    // Two-step approval filters
    if (filters.internal_approval_status) params.internal_approval_status = filters.internal_approval_status;
    if (filters.requester_status) params.requester_status = filters.requester_status;
    if (filters.is_sent_back_to_requester) params.is_sent_back_to_requester = String(filters.is_sent_back_to_requester);
    if (filters.pending_internal_approval) params.pending_internal_approval = String(filters.pending_internal_approval);
    if (filters.ready_to_send_back) params.ready_to_send_back = String(filters.ready_to_send_back);
    if (filters.my_requester_documents) params.my_requester_documents = String(filters.my_requester_documents);

    // Unified General Request filters
    if (filters.request_type) params.request_type = filters.request_type;
    if (filters.judge_name) params.judge_name = filters.judge_name;
    if (filters.remark_type) params.remark_type = filters.remark_type;
    if (filters.category_type) params.category_type = filters.category_type;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;

    // Aide Request Filters
    if (filters.officer_rank) params.officer_rank = filters.officer_rank;
    if (filters.officer_name) params.officer_name = filters.officer_name;
    if (filters.employment_number) params.employment_number = filters.employment_number;
    if (filters.current_station) params.current_station = filters.current_station;
    if (filters.current_unit) params.current_unit = filters.current_unit;
    if (filters.aide_status) params.aide_status = filters.aide_status;
    
    // Sentry Request Filters
    if (filters.residence_location) params.residence_location = filters.residence_location;
    if (filters.sentry_status) params.sentry_status = filters.sentry_status;
    
    // Legacy filters
    if (filters.rank) params.rank = filters.rank;

    return params;
}

function getErrorMessage(err: unknown, fallback: string): string {
    const error = err as AxiosError<{ message?: string }>;
    return error.response?.data?.message ?? fallback;
}

function setActionLoading(
    state: HelpdeskDocumentsState,
    id: string,
    key: ActionLoadingKey,
    value: boolean
): void {
    if (!state.actionLoading[id]) {
        state.actionLoading[id] = {};
    }
    state.actionLoading[id][key] = value;
}

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
    const month = date.toISOString().slice(0, 7);
    return `cons-${type}-${month}`;
}

/**
 * Returns the appropriate DocumentEntityType for a consolidated memo.
 */
export function getConsolidatedMemoEntityType(
    type: ConsolidatedMemoType
): DocumentEntityType {
    return type === 'fuel' ? 'consolidated_fuel_memo' : 'consolidated_utility_memo';
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchHelpdeskDocuments = createAsyncThunk<
    HelpdeskDocument[],
    HelpdeskDocumentFilters,
    { rejectValue: string }
>(
    'helpdeskDocuments/fetchAll',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/helpdesk/documents', {
                params: buildParams(filters),
            });
            return data.data as HelpdeskDocument[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch documents'));
        }
    }
);

export const fetchHelpdeskDocumentById = createAsyncThunk<
    HelpdeskDocument,
    string,
    { rejectValue: string }
>(
    'helpdeskDocuments/fetchById',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/helpdesk/documents/${id}`);
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch document'));
        }
    }
);

// ─── UPLOAD HELP DESK DOCUMENT ─────────────────────────────────────────────

export const uploadHelpdeskDocument = createAsyncThunk<
    HelpdeskDocument,
    UploadHelpdeskDocumentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/upload',
    async (payload, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            
            // Required fields
            formData.append('file', payload.blob, payload.filename);
            formData.append('ref', payload.ref);
            formData.append('subject', payload.subject);
            formData.append('entity_type', payload.entity_type);
            formData.append('format', payload.format);
            
            // Optional core fields
            if (payload.entity_id) formData.append('entity_id', payload.entity_id);
            if (payload.status) formData.append('status', payload.status);
            
            // Unified General Request fields
            if (payload.request_type) formData.append('request_type', payload.request_type);
            if (payload.judge_name) formData.append('judge_name', payload.judge_name);
            if (payload.remark_type) formData.append('remark_type', payload.remark_type);
            if (payload.category_type) formData.append('category_type', payload.category_type);
            
            // Aide Request Fields
            if (payload.officer_rank) formData.append('officer_rank', payload.officer_rank);
            if (payload.officer_name) formData.append('officer_name', payload.officer_name);
            if (payload.employment_number) formData.append('employment_number', payload.employment_number);
            if (payload.current_station) formData.append('current_station', payload.current_station);
            if (payload.current_unit) formData.append('current_unit', payload.current_unit);
            if (payload.proposed_assignment) formData.append('proposed_assignment', payload.proposed_assignment);
            if (payload.reporting_date) formData.append('reporting_date', payload.reporting_date);
            if (payload.aide_status) formData.append('aide_status', payload.aide_status);
            
            // Sentry Request Fields
            if (payload.residence_location) formData.append('residence_location', payload.residence_location);
            if (payload.sentry_status) formData.append('sentry_status', payload.sentry_status);
            
            // Legacy fields
            if (payload.rank) formData.append('rank', payload.rank);

            console.log('📤 Uploading document with form data:', {
                ref: payload.ref,
                subject: payload.subject,
                entity_type: payload.entity_type,
                format: payload.format,
                filename: payload.filename,
                size: payload.blob.size,
                hasEntityId: !!payload.entity_id,
                hasStatus: !!payload.status,
                hasRequestType: !!payload.request_type,
                hasJudgeName: !!payload.judge_name,
                hasRemarkType: !!payload.remark_type,
                hasCategoryType: !!payload.category_type,
                hasOfficerRank: !!payload.officer_rank,
                hasOfficerName: !!payload.officer_name,
                hasEmploymentNumber: !!payload.employment_number,
                hasCurrentStation: !!payload.current_station,
                hasCurrentUnit: !!payload.current_unit,
                hasProposedAssignment: !!payload.proposed_assignment,
                hasReportingDate: !!payload.reporting_date,
                hasAideStatus: !!payload.aide_status,
                hasResidenceLocation: !!payload.residence_location,
                hasSentryStatus: !!payload.sentry_status,
                hasRank: !!payload.rank,
            });

            const { data } = await axiosClient.post('/helpdesk/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            console.log('✅ Upload successful:', data);
            return data.data as HelpdeskDocument;
        } catch (err) {
            const error = err as AxiosError<{ message?: string; errors?: unknown }>;
            console.error('❌ Upload failed:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers,
                },
            });

            console.error('❌ Upload failed - full validation details:',
                JSON.stringify(error.response?.data, null, 2)
            );
            
            let message = 'Upload failed';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    message = error.response.data;
                } else if (error.response.data.message) {
                    message = error.response.data.message;
                } else if (error.response.data.errors) {
                    const errors = error.response.data.errors;
                    if (Array.isArray(errors)) {
                        message = errors.map((e: { message: string }) => e.message).join(', ');
                    } else if (typeof errors === 'object') {
                        message = Object.values(errors).flat().join(', ');
                    }
                }
            }
            
            return rejectWithValue(message);
        }
    }
);

// ─── UPDATE DOCUMENT FILE ────────────────────────────────────────────────────

export const updateDocumentFile = createAsyncThunk<
    HelpdeskDocument,
    UpdateDocumentFilePayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/updateFile',
    async (payload, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', payload.blob, payload.filename);
            
            if (payload.status) formData.append('status', payload.status);
            if (payload.e_stamp_url) formData.append('e_stamp_url', payload.e_stamp_url);
            if (payload.e_stamp_public_id) formData.append('e_stamp_public_id', payload.e_stamp_public_id);
            if (payload.e_stamp_status) formData.append('e_stamp_status', payload.e_stamp_status);
            if (payload.comments) formData.append('comments', payload.comments);
            if (payload.approved_by) formData.append('approved_by', payload.approved_by);
            if (payload.approved_by_name) formData.append('approved_by_name', payload.approved_by_name);
            if (payload.rejection_reason) formData.append('rejection_reason', payload.rejection_reason);
            if (payload.returned_by) formData.append('returned_by', payload.returned_by);
            if (payload.returned_by_name) formData.append('returned_by_name', payload.returned_by_name);
            // ─── Signature fields ──────────────────────────────────────────────
            if (payload.is_signed !== undefined) formData.append('is_signed', String(payload.is_signed));
            if (payload.signed_by) formData.append('signed_by', payload.signed_by);
            if (payload.signed_by_name) formData.append('signed_by_name', payload.signed_by_name);
            if (payload.signed_at) formData.append('signed_at', payload.signed_at);

            console.log('📤 Updating document file:', {
                id: payload.id,
                filename: payload.filename,
                size: payload.blob.size,
                status: payload.status,
                hasEStamp: !!payload.e_stamp_url,
                hasComments: !!payload.comments,
                is_signed: payload.is_signed,
            });

            const { data } = await axiosClient.patch(`/helpdesk/documents/${payload.id}/file`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            console.log('✅ Document file updated successfully:', data);
            return data.data as HelpdeskDocument;
        } catch (err) {
            const error = err as AxiosError<{ message?: string; errors?: unknown }>;
            console.error('❌ Update document file failed:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
            });
            
            let message = 'Failed to update document file';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    message = error.response.data;
                } else if (error.response.data.message) {
                    message = error.response.data.message;
                }
            }
            
            return rejectWithValue(message);
        }
    }
);

// ─── Batch Upload ────────────────────────────────────────────────────────────

export const batchUploadDocuments = createAsyncThunk<
    { success: HelpdeskDocument[]; failed: { index: number; error: string }[] },
    BatchUploadPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/batchUpload',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/helpdesk/documents/upload/batch', payload);
            return data.data as { success: HelpdeskDocument[]; failed: { index: number; error: string }[] };
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Batch upload failed'));
        }
    }
);

// ─── Statistics ──────────────────────────────────────────────────────────────

export const fetchDocumentStats = createAsyncThunk<
    DocumentStats,
    { entity_type?: DocumentEntityType; date_from?: string; date_to?: string },
    { rejectValue: string }
>(
    'helpdeskDocuments/fetchStats',
    async (filters, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/helpdesk/documents/stats', {
                params: filters,
            });
            return data.data as DocumentStats;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch document stats'));
        }
    }
);

export const fetchDocumentSummary = createAsyncThunk<
    DocumentSummary,
    { entity_type?: DocumentEntityType },
    { rejectValue: string }
>(
    'helpdeskDocuments/fetchSummary',
    async (filters, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/helpdesk/documents/summary', {
                params: filters,
            });
            return data.data as DocumentSummary;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch document summary'));
        }
    }
);

// ─── TWO-STEP APPROVAL THUNKS ─────────────────────────────────────────────────

/**
 * Internal Preview - Super admin previews a document
 * Requester does not see this action
 */
export const internalPreviewDocument = createAsyncThunk<
    HelpdeskDocument,
    InternalPreviewPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/internalPreview',
    async ({ id, previewed_by, previewed_by_name, comments, ip_address, user_agent }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/internal/preview`, {
                previewed_by,
                previewed_by_name,
                comments,
                ip_address,
                user_agent,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to preview document'));
        }
    }
);

/**
 * Internal Approve - Super admin approves internally with signature embedding
 * Requester still sees 'pending_approval' until send back
 */
export const internalApproveDocument = createAsyncThunk<
    HelpdeskDocument,
    InternalApprovalPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/internalApprove',
    async ({ id, comments, approved_by, approved_by_name, generate_e_stamp, signature_position_x, signature_position_y, signature_position_width, signature_position_height }, { rejectWithValue }) => {
        try {
            const payload: Record<string, unknown> = {
                document_id: id,
                action: 'approve' as const,
                comments: comments || '',
                approved_by: approved_by || '',
                approved_by_name: approved_by_name || '',
                generate_e_stamp: generate_e_stamp ?? true,
            };

            // Add signature position if provided
            if (signature_position_x !== undefined) payload.signature_position_x = signature_position_x;
            if (signature_position_y !== undefined) payload.signature_position_y = signature_position_y;
            if (signature_position_width !== undefined) payload.signature_position_width = signature_position_width;
            if (signature_position_height !== undefined) payload.signature_position_height = signature_position_height;

            console.log('📤 Internal approve payload:', JSON.stringify(payload, null, 2));

            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/internal/approve`, payload);
            return data.data as HelpdeskDocument;
        } catch (err) {
            const error = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
            
            console.error('❌ Internal approve error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
            });
            
            let errorMessage = 'Failed to approve document internally';
            const responseData = error.response?.data;
            
            if (responseData) {
                if (typeof responseData === 'object' && 'message' in responseData && typeof responseData.message === 'string') {
                    errorMessage = responseData.message;
                } else if (typeof responseData === 'object' && 'errors' in responseData && responseData.errors) {
                    const errors = responseData.errors;
                    if (typeof errors === 'object' && errors !== null) {
                        const errorStrings = Object.entries(errors).map(([key, value]) => {
                            if (Array.isArray(value)) {
                                return `${key}: ${value.join(', ')}`;
                            }
                            if (typeof value === 'string') {
                                return `${key}: ${value}`;
                            }
                            return `${key}: ${JSON.stringify(value)}`;
                        });
                        errorMessage = errorStrings.join('; ');
                    }
                }
            }
            
            return rejectWithValue(errorMessage);
        }
    }
);

/**
 * Internal Reject - Super admin rejects internally
 * Requester still sees 'pending_approval' until send back
 */
export const internalRejectDocument = createAsyncThunk<
    HelpdeskDocument,
    InternalApprovalPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/internalReject',
    async ({ id, rejection_reason, comments, approved_by, approved_by_name }, { rejectWithValue }) => {
        try {
            if (!rejection_reason) {
                return rejectWithValue('Rejection reason is required');
            }
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/internal/reject`, {
                document_id: id,
                rejection_reason,
                comments,
                rejected_by: approved_by,
                rejected_by_name: approved_by_name,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to reject document internally'));
        }
    }
);

/**
 * Internal Request Changes - Super admin requests changes internally
 * Requester still sees 'pending_approval' until send back
 */
export const internalRequestChanges = createAsyncThunk<
    HelpdeskDocument,
    InternalApprovalPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/internalRequestChanges',
    async ({ id, changes_requested, comments, approved_by, approved_by_name }, { rejectWithValue }) => {
        try {
            if (!changes_requested || changes_requested.length === 0) {
                return rejectWithValue('At least one change request is required');
            }
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/internal/request-changes`, {
                document_id: id,
                changes_requested,
                comments,
                requested_by: approved_by,
                requested_by_name: approved_by_name,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to request changes internally'));
        }
    }
);

/**
 * Cancel Internal Approval - Super admin cancels internal approval decision
 * Resets document back to pending
 */
export const cancelInternalApproval = createAsyncThunk<
    HelpdeskDocument,
    CancelInternalApprovalPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/cancelInternalApproval',
    async ({ id, cancelled_by, cancelled_by_name, reason }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/internal/cancel`, {
                document_id: id,
                cancelled_by,
                cancelled_by_name,
                reason,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to cancel internal approval'));
        }
    }
);

/**
 * Send Back to Requester - Super admin sends document back to requester
 * THIS is when the requester finally sees the status change
 */
export const sendBackToRequester = createAsyncThunk<
    HelpdeskDocument,
    SendBackToRequesterPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/sendBackToRequester',
    async ({ id, final_status, sent_by, sent_by_name, comments, requester_message, notify_requester }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/send-back`, {
                document_id: id,
                final_status,
                sent_by,
                sent_by_name,
                comments,
                requester_message,
                notify_requester,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to send document back to requester'));
        }
    }
);

/**
 * Resubmit After Changes - Requester resubmits document after making changes
 */
export const resubmitDocument = createAsyncThunk<
    HelpdeskDocument,
    ResubmitAfterChangesPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/resubmit',
    async ({ id, submitted_by, submitted_by_name, comments, file_update }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/resubmit`, {
                submitted_by,
                submitted_by_name,
                comments,
                file_update,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to resubmit document'));
        }
    }
);

// ─── Dashboard Thunks ─────────────────────────────────────────────────────────

/**
 * Get Pending Internal Approvals - Super admin dashboard
 */
export const fetchPendingInternalApprovals = createAsyncThunk<
    { documents: HelpdeskDocument[]; summary: PendingInternalApprovalsSummary },
    HelpdeskDocumentFilters,
    { rejectValue: string }
>(
    'helpdeskDocuments/fetchPendingInternal',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/helpdesk/documents/pending-internal', {
                params: buildParams(filters),
            });
            return data.data as { documents: HelpdeskDocument[]; summary: PendingInternalApprovalsSummary };
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch pending internal approvals'));
        }
    }
);

/**
 * Get Requester Dashboard - Requester dashboard
 */
export const fetchRequesterDashboard = createAsyncThunk<
    { documents: RequesterDocumentView[]; summary: { total: number; by_status: Record<string, number>; can_resubmit: number } },
    HelpdeskDocumentFilters,
    { rejectValue: string }
>(
    'helpdeskDocuments/fetchRequesterDashboard',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/helpdesk/documents/requester-dashboard', {
                params: buildParams(filters),
            });
            return data.data as { documents: RequesterDocumentView[]; summary: { total: number; by_status: Record<string, number>; can_resubmit: number } };
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch requester dashboard'));
        }
    }
);

// ─── Workflow Actions (Legacy - Deprecated) ──────────────────────────────────

/**
 * @deprecated Use internalApproveDocument() and sendBackToRequester() instead
 */
export const submitForApproval = createAsyncThunk<
    HelpdeskDocument,
    SubmitForApprovalPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/submitForApproval',
    async ({ id, comments, submitted_by, submitted_by_name }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/submit`, {
                comments,
                submitted_by,
                submitted_by_name,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to submit for approval'));
        }
    }
);

/**
 * @deprecated Use internalApproveDocument() and sendBackToRequester() instead
 */
export const approveDocument = createAsyncThunk<
    HelpdeskDocument,
    ApproveDocumentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/approve',
    async ({ id, comments, approved_by, approved_by_name, e_stamp_url, e_stamp_public_id }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/approve`, {
                comments,
                approved_by,
                approved_by_name,
                e_stamp_url,
                e_stamp_public_id,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to approve document'));
        }
    }
);

/**
 * @deprecated Use internalRejectDocument() and sendBackToRequester() instead
 */
export const rejectDocument = createAsyncThunk<
    HelpdeskDocument,
    RejectDocumentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/reject',
    async ({ id, reason, comments, rejected_by, rejected_by_name }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/reject`, {
                reason,
                comments,
                rejected_by,
                rejected_by_name,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to reject document'));
        }
    }
);

/**
 * @deprecated Use internalRequestChanges() and sendBackToRequester() instead
 */
export const returnDocument = createAsyncThunk<
    HelpdeskDocument,
    ReturnDocumentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/return',
    async ({ id, comments, instructions, returned_by, returned_by_name }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/return`, {
                comments,
                instructions,
                returned_by,
                returned_by_name,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to return document'));
        }
    }
);

// ─── E-Stamp ─────────────────────────────────────────────────────────────────

export const updateEStamp = createAsyncThunk<
    HelpdeskDocument,
    UpdateEStampPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/updateEStamp',
    async ({ id, e_stamp_url, e_stamp_public_id, e_stamp_status }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/estampt`, {
                e_stamp_url,
                e_stamp_public_id,
                e_stamp_status,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to update e-stamp'));
        }
    }
);

// ─── Comments ─────────────────────────────────────────────────────────────────

export const addComment = createAsyncThunk<
    Comment,
    AddCommentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/addComment',
    async ({ id, comment, is_internal = false }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/comments`, {
                comment,
                is_internal,
            });
            return data.data as Comment;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to add comment'));
        }
    }
);

export const deleteComment = createAsyncThunk<
    { documentId: string; commentId: string },
    DeleteCommentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/deleteComment',
    async ({ id, commentId }, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/helpdesk/documents/comments/${commentId}`);
            return { documentId: id, commentId };
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to delete comment'));
        }
    }
);

// ─── Delete Document ──────────────────────────────────────────────────────

export const deleteHelpdeskDocument = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>(
    'helpdeskDocuments/delete',
    async (id, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/helpdesk/documents/${id}`);
            return id;
        } catch (err) {
            const error = err as AxiosError<{ message?: string }>;
            return rejectWithValue(error.response?.data?.message || 'Failed to delete document');
        }
    }
);

export const hardDeleteHelpdeskDocument = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>(
    'helpdeskDocuments/hardDelete',
    async (id, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/helpdesk/documents/${id}/permanent`);
            return id;
        } catch (err) {
            const error = err as AxiosError<{ message?: string }>;
            return rejectWithValue(error.response?.data?.message || 'Failed to permanently delete document');
        }
    }
);

// ─── Linking ──────────────────────────────────────────────────────────────────

export const linkHelpdeskDocument = createAsyncThunk<
    HelpdeskDocument,
    LinkHelpdeskDocumentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/link',
    async ({ 
        id, 
        entity_type, 
        entity_id, 
        request_type, 
        judge_name, 
        remark_type, 
        category_type,
        officer_rank,
        officer_name,
        employment_number,
        current_station,
        current_unit,
        proposed_assignment,
        reporting_date,
        aide_status,
        residence_location,
        sentry_status,
        rank 
    }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.patch(`/helpdesk/documents/${id}/link`, {
                entity_type,
                entity_id,
                request_type,
                judge_name,
                remark_type,
                category_type,
                officer_rank,
                officer_name,
                employment_number,
                current_station,
                current_unit,
                proposed_assignment,
                reporting_date,
                aide_status,
                residence_location,
                sentry_status,
                rank,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to link document'));
        }
    }
);

export const bulkLinkDocuments = createAsyncThunk<
    BulkOperationResult,
    BulkLinkDocumentsPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/bulkLink',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/helpdesk/documents/bulk/link', payload);
            return data.data as BulkOperationResult;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to bulk link documents'));
        }
    }
);

export const bulkUpdateStatus = createAsyncThunk<
    BulkOperationResult,
    BulkUpdateStatusPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/bulkUpdateStatus',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/helpdesk/documents/bulk/status', payload);
            return data.data as BulkOperationResult;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to bulk update status'));
        }
    }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const helpdeskDocumentsSlice = createSlice({
    name: 'helpdeskDocuments',
    initialState,
    reducers: {
        clearDocumentError(state) {
            state.error = null;
        },
        clearSelectedDocument(state) {
            state.selectedDocument = null;
        },
        clearActionLoading(state) {
            state.actionLoading = {};
        },
        clearStats(state) {
            state.stats = null;
            state.summary = null;
        },
        clearPendingInternal(state) {
            state.pendingInternalApprovals = {
                documents: [],
                summary: null,
            };
        },
        clearRequesterDocuments(state) {
            state.requesterDocuments = {
                documents: [],
                summary: null,
            };
        },
        optimisticDelete(state, action: PayloadAction<string>) {
            state.items = state.items.filter(d => d.id !== action.payload);
            if (state.selectedDocument?.id === action.payload) {
                state.selectedDocument = null;
            }
        },
        restoreDocument(state, action: PayloadAction<HelpdeskDocument>) {
            const exists = state.items.some(d => d.id === action.payload.id);
            if (!exists) {
                state.items.push(action.payload);
            }
        },
    },
    extraReducers: (builder) => {
        // ── fetchHelpdeskDocuments ──────────────────────────────────────────
        builder
            .addCase(fetchHelpdeskDocuments.pending, (state) => {
                state.loading.fetch = true;
                state.error = null;
            })
            .addCase(fetchHelpdeskDocuments.fulfilled, (state, action: PayloadAction<HelpdeskDocument[]>) => {
                state.loading.fetch = false;
                state.items = action.payload;
            })
            .addCase(fetchHelpdeskDocuments.rejected, (state, action) => {
                state.loading.fetch = false;
                state.error = action.payload as string;
            });

        // ── fetchHelpdeskDocumentById ────────────────────────────────────────
        builder
            .addCase(fetchHelpdeskDocumentById.pending, (state) => {
                state.loading.fetch = true;
                state.error = null;
            })
            .addCase(fetchHelpdeskDocumentById.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.fetch = false;
                state.selectedDocument = action.payload;
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(fetchHelpdeskDocumentById.rejected, (state, action) => {
                state.loading.fetch = false;
                state.error = action.payload as string;
            });

        // ── uploadHelpdeskDocument ──────────────────────────────────────────
        builder
            .addCase(uploadHelpdeskDocument.pending, (state) => {
                state.loading.upload = true;
                state.error = null;
            })
            .addCase(uploadHelpdeskDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.upload = false;
                state.items.unshift(action.payload);
            })
            .addCase(uploadHelpdeskDocument.rejected, (state, action) => {
                state.loading.upload = false;
                state.error = action.payload as string;
            });

        // ── updateDocumentFile ──────────────────────────────────────────────
        builder
            .addCase(updateDocumentFile.pending, (state) => {
                state.loading.updateFile = true;
                state.error = null;
            })
            .addCase(updateDocumentFile.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.updateFile = false;
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(updateDocumentFile.rejected, (state, action) => {
                state.loading.updateFile = false;
                state.error = action.payload as string;
            });

        // ── batchUploadDocuments ─────────────────────────────────────────────
        builder
            .addCase(batchUploadDocuments.pending, (state) => {
                state.loading.batchUpload = true;
                state.error = null;
            })
            .addCase(batchUploadDocuments.fulfilled, (state, action) => {
                state.loading.batchUpload = false;
                state.items = [...action.payload.success, ...state.items];
            })
            .addCase(batchUploadDocuments.rejected, (state, action) => {
                state.loading.batchUpload = false;
                state.error = action.payload as string;
            });

        // ── fetchDocumentStats ──────────────────────────────────────────────
        builder
            .addCase(fetchDocumentStats.pending, (state) => {
                state.loading.stats = true;
                state.error = null;
            })
            .addCase(fetchDocumentStats.fulfilled, (state, action: PayloadAction<DocumentStats>) => {
                state.loading.stats = false;
                state.stats = action.payload;
            })
            .addCase(fetchDocumentStats.rejected, (state, action) => {
                state.loading.stats = false;
                state.error = action.payload as string;
            });

        // ── fetchDocumentSummary ─────────────────────────────────────────────
        builder
            .addCase(fetchDocumentSummary.pending, (state) => {
                state.loading.stats = true;
                state.error = null;
            })
            .addCase(fetchDocumentSummary.fulfilled, (state, action: PayloadAction<DocumentSummary>) => {
                state.loading.stats = false;
                state.summary = action.payload;
            })
            .addCase(fetchDocumentSummary.rejected, (state, action) => {
                state.loading.stats = false;
                state.error = action.payload as string;
            });

        // ── TWO-STEP APPROVAL REDUCERS ──────────────────────────────────────

        // ── internalPreviewDocument ──────────────────────────────────────────
        builder
            .addCase(internalPreviewDocument.pending, (state, action) => {
                state.loading.internalPreview = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'previewing', true);
            })
            .addCase(internalPreviewDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.internalPreview = false;
                setActionLoading(state, action.payload.id, 'previewing', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(internalPreviewDocument.rejected, (state, action) => {
                state.loading.internalPreview = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'previewing', false);
                }
            });

        // ── internalApproveDocument ──────────────────────────────────────────
        builder
            .addCase(internalApproveDocument.pending, (state, action) => {
                state.loading.internalApprove = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'internalApproving', true);
            })
            .addCase(internalApproveDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.internalApprove = false;
                setActionLoading(state, action.payload.id, 'internalApproving', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(internalApproveDocument.rejected, (state, action) => {
                state.loading.internalApprove = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'internalApproving', false);
                }
            });

        // ── internalRejectDocument ───────────────────────────────────────────
        builder
            .addCase(internalRejectDocument.pending, (state, action) => {
                state.loading.internalReject = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'internalRejecting', true);
            })
            .addCase(internalRejectDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.internalReject = false;
                setActionLoading(state, action.payload.id, 'internalRejecting', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(internalRejectDocument.rejected, (state, action) => {
                state.loading.internalReject = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'internalRejecting', false);
                }
            });

        // ── internalRequestChanges ───────────────────────────────────────────
        builder
            .addCase(internalRequestChanges.pending, (state, action) => {
                state.loading.internalRequestChanges = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'requestingChanges', true);
            })
            .addCase(internalRequestChanges.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.internalRequestChanges = false;
                setActionLoading(state, action.payload.id, 'requestingChanges', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(internalRequestChanges.rejected, (state, action) => {
                state.loading.internalRequestChanges = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'requestingChanges', false);
                }
            });

        // ── cancelInternalApproval ───────────────────────────────────────────
        builder
            .addCase(cancelInternalApproval.pending, (state, action) => {
                state.loading.internalCancel = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'cancelling', true);
            })
            .addCase(cancelInternalApproval.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.internalCancel = false;
                setActionLoading(state, action.payload.id, 'cancelling', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(cancelInternalApproval.rejected, (state, action) => {
                state.loading.internalCancel = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'cancelling', false);
                }
            });

        // ── sendBackToRequester ──────────────────────────────────────────────
        builder
            .addCase(sendBackToRequester.pending, (state, action) => {
                state.loading.sendBack = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'sendingBack', true);
            })
            .addCase(sendBackToRequester.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.sendBack = false;
                setActionLoading(state, action.payload.id, 'sendingBack', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(sendBackToRequester.rejected, (state, action) => {
                state.loading.sendBack = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'sendingBack', false);
                }
            });

        // ── resubmitDocument ──────────────────────────────────────────────────
        builder
            .addCase(resubmitDocument.pending, (state, action) => {
                state.loading.resubmit = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'resubmitting', true);
            })
            .addCase(resubmitDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.resubmit = false;
                setActionLoading(state, action.payload.id, 'resubmitting', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(resubmitDocument.rejected, (state, action) => {
                state.loading.resubmit = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'resubmitting', false);
                }
            });

        // ── fetchPendingInternalApprovals ─────────────────────────────────────
        builder
            .addCase(fetchPendingInternalApprovals.pending, (state) => {
                state.loading.pendingInternal = true;
                state.error = null;
            })
            .addCase(fetchPendingInternalApprovals.fulfilled, (state, action) => {
                state.loading.pendingInternal = false;
                state.pendingInternalApprovals = action.payload;
            })
            .addCase(fetchPendingInternalApprovals.rejected, (state, action) => {
                state.loading.pendingInternal = false;
                state.error = action.payload as string;
            });

        // ── fetchRequesterDashboard ───────────────────────────────────────────
        builder
            .addCase(fetchRequesterDashboard.pending, (state) => {
                state.loading.requesterDashboard = true;
                state.error = null;
            })
            .addCase(fetchRequesterDashboard.fulfilled, (state, action) => {
                state.loading.requesterDashboard = false;
                state.requesterDocuments = action.payload;
            })
            .addCase(fetchRequesterDashboard.rejected, (state, action) => {
                state.loading.requesterDashboard = false;
                state.error = action.payload as string;
            });

        // ── LEGACY WORKFLOW REDUCERS (Deprecated) ─────────────────────────────

        // ── submitForApproval ────────────────────────────────────────────────
        builder
            .addCase(submitForApproval.pending, (state, action) => {
                state.loading.submit = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'submitting', true);
            })
            .addCase(submitForApproval.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.submit = false;
                setActionLoading(state, action.payload.id, 'submitting', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(submitForApproval.rejected, (state, action) => {
                state.loading.submit = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'submitting', false);
                }
            });

        // ── linkHelpdeskDocument ─────────────────────────────────────────────
        builder
            .addCase(linkHelpdeskDocument.pending, (state) => {
                state.loading.link = true;
                state.error = null;
            })
            .addCase(linkHelpdeskDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.link = false;
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                } else {
                    state.items.unshift(action.payload);
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(linkHelpdeskDocument.rejected, (state, action) => {
                state.loading.link = false;
                state.error = action.payload as string;
            });

        // ── bulkLinkDocuments ────────────────────────────────────────────────
        builder
            .addCase(bulkLinkDocuments.pending, (state) => {
                state.loading.bulkLink = true;
                state.error = null;
            })
            .addCase(bulkLinkDocuments.fulfilled, (state, action) => {
                state.loading.bulkLink = false;
                state.items = state.items.filter(d => !action.payload.success.includes(d.id));
            })
            .addCase(bulkLinkDocuments.rejected, (state, action) => {
                state.loading.bulkLink = false;
                state.error = action.payload as string;
            });

        // ── bulkUpdateStatus ──────────────────────────────────────────────────
        builder
            .addCase(bulkUpdateStatus.pending, (state) => {
                state.loading.bulkUpdate = true;
                state.error = null;
            })
            .addCase(bulkUpdateStatus.fulfilled, (state, action) => {
                state.loading.bulkUpdate = false;
                state.items = state.items.filter(d => !action.payload.success.includes(d.id));
            })
            .addCase(bulkUpdateStatus.rejected, (state, action) => {
                state.loading.bulkUpdate = false;
                state.error = action.payload as string;
            });

        // ── approveDocument (Legacy) ──────────────────────────────────────────
        builder
            .addCase(approveDocument.pending, (state, action) => {
                state.loading.approve = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'approving', true);
            })
            .addCase(approveDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.approve = false;
                setActionLoading(state, action.payload.id, 'approving', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(approveDocument.rejected, (state, action) => {
                state.loading.approve = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'approving', false);
                }
            });

        // ── rejectDocument (Legacy) ───────────────────────────────────────────
        builder
            .addCase(rejectDocument.pending, (state, action) => {
                state.loading.reject = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'rejecting', true);
            })
            .addCase(rejectDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.reject = false;
                setActionLoading(state, action.payload.id, 'rejecting', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(rejectDocument.rejected, (state, action) => {
                state.loading.reject = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'rejecting', false);
                }
            });

        // ── returnDocument (Legacy) ───────────────────────────────────────────
        builder
            .addCase(returnDocument.pending, (state, action) => {
                state.loading.return = true;
                state.error = null;
                setActionLoading(state, action.meta.arg.id, 'returning', true);
            })
            .addCase(returnDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.return = false;
                setActionLoading(state, action.payload.id, 'returning', false);
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(returnDocument.rejected, (state, action) => {
                state.loading.return = false;
                state.error = action.payload as string;
                if (action.meta.arg) {
                    setActionLoading(state, action.meta.arg.id, 'returning', false);
                }
            });

        // ── updateEStamp ──────────────────────────────────────────────────────
        builder
            .addCase(updateEStamp.pending, (state) => {
                state.loading.approve = true;
                state.error = null;
            })
            .addCase(updateEStamp.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.approve = false;
                const index = state.items.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = action.payload;
                }
            })
            .addCase(updateEStamp.rejected, (state, action) => {
                state.loading.approve = false;
                state.error = action.payload as string;
            });

        // ── addComment ───────────────────────────────────────────────────────
        builder
            .addCase(addComment.pending, (state) => {
                state.loading.comment = true;
                state.error = null;
            })
            .addCase(addComment.fulfilled, (state, action: PayloadAction<Comment>) => {
                state.loading.comment = false;
                if (state.selectedDocument) {
                    state.selectedDocument.comments = [
                        ...(state.selectedDocument.comments || []),
                        action.payload,
                    ];
                }
            })
            .addCase(addComment.rejected, (state, action) => {
                state.loading.comment = false;
                state.error = action.payload as string;
            });

        // ── deleteComment ────────────────────────────────────────────────────
        builder
            .addCase(deleteComment.pending, (state) => {
                state.loading.comment = true;
                state.error = null;
            })
            .addCase(deleteComment.fulfilled, (state, action: PayloadAction<{ documentId: string; commentId: string }>) => {
                state.loading.comment = false;
                if (state.selectedDocument) {
                    state.selectedDocument.comments = state.selectedDocument.comments.filter(
                        c => c.id !== action.payload.commentId
                    );
                }
                const itemIndex = state.items.findIndex(d => d.id === action.payload.documentId);
                if (itemIndex !== -1) {
                    state.items[itemIndex].comments = state.items[itemIndex].comments.filter(
                        c => c.id !== action.payload.commentId
                    );
                }
            })
            .addCase(deleteComment.rejected, (state, action) => {
                state.loading.comment = false;
                state.error = action.payload as string;
            });

        // ── deleteHelpdeskDocument ──────────────────────────────────────────
        builder
            .addCase(deleteHelpdeskDocument.pending, (state, action) => {
                state.loading.delete = true;
                state.deletingId = action.meta.arg;
                state.error = null;
            })
            .addCase(deleteHelpdeskDocument.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.delete = false;
                state.deletingId = null;
                state.items = state.items.filter((d) => d.id !== action.payload);
                if (state.selectedDocument?.id === action.payload) {
                    state.selectedDocument = null;
                }
            })
            .addCase(deleteHelpdeskDocument.rejected, (state, action) => {
                state.loading.delete = false;
                state.deletingId = null;
                state.error = action.payload as string;
            });

        // ── hardDeleteHelpdeskDocument ──────────────────────────────────────
        builder
            .addCase(hardDeleteHelpdeskDocument.pending, (state, action) => {
                state.loading.hardDelete = true;
                state.deletingId = action.meta.arg;
                state.error = null;
            })
            .addCase(hardDeleteHelpdeskDocument.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.hardDelete = false;
                state.deletingId = null;
                state.items = state.items.filter((d) => d.id !== action.payload);
                if (state.selectedDocument?.id === action.payload) {
                    state.selectedDocument = null;
                }
            })
            .addCase(hardDeleteHelpdeskDocument.rejected, (state, action) => {
                state.loading.hardDelete = false;
                state.deletingId = null;
                state.error = action.payload as string;
            });
    },
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export const {
    clearDocumentError,
    clearSelectedDocument,
    clearActionLoading,
    clearStats,
    clearPendingInternal,
    clearRequesterDocuments,
    optimisticDelete,
    restoreDocument,
} = helpdeskDocumentsSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllHelpdeskDocuments = (state: RootState) => state.helpdeskDocuments.items;
export const selectSelectedHelpdeskDocument = (state: RootState) => state.helpdeskDocuments.selectedDocument;
export const selectDocumentsFetchLoading = (state: RootState) => state.helpdeskDocuments.loading.fetch;
export const selectDocumentsUploading = (state: RootState) => state.helpdeskDocuments.loading.upload;
export const selectDocumentDeleting = (state: RootState) => state.helpdeskDocuments.loading.delete;
export const selectDocumentHardDeleting = (state: RootState) => state.helpdeskDocuments.loading.hardDelete;
export const selectDeletingDocumentId = (state: RootState) => state.helpdeskDocuments.deletingId;
export const selectDocumentError = (state: RootState) => state.helpdeskDocuments.error;
export const selectDocumentActionLoading = (state: RootState) => state.helpdeskDocuments.actionLoading;
export const selectDocumentUpdatingFile = (state: RootState) => state.helpdeskDocuments.loading.updateFile;

// ─── Two-Step Approval Selectors ─────────────────────────────────────────────

export const selectPendingInternalApprovals = (state: RootState) => state.helpdeskDocuments.pendingInternalApprovals;
export const selectPendingInternalSummary = (state: RootState) => state.helpdeskDocuments.pendingInternalApprovals.summary;
export const selectRequesterDocuments = (state: RootState) => state.helpdeskDocuments.requesterDocuments;
export const selectRequesterDocumentsSummary = (state: RootState) => state.helpdeskDocuments.requesterDocuments.summary;

// ─── Document Action Loading Selectors ───────────────────────────────────────

export const selectIsSubmitting = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.submitting || false;
export const selectIsApproving = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.approving || false;
export const selectIsRejecting = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.rejecting || false;
export const selectIsReturning = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.returning || false;

// ─── Two-Step Approval Action Loading Selectors ─────────────────────────────

export const selectIsPreviewing = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.previewing || false;
export const selectIsInternalApproving = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.internalApproving || false;
export const selectIsInternalRejecting = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.internalRejecting || false;
export const selectIsRequestingChanges = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.requestingChanges || false;
export const selectIsSendingBack = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.sendingBack || false;
export const selectIsResubmitting = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.resubmitting || false;
export const selectIsCancelling = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.cancelling || false;

// ─── Entity Selectors ──────────────────────────────────────────────────────

export const selectDocumentsByEntity = (
    entityType: DocumentEntityType,
    entityId?: string
) => (state: RootState) =>
    state.helpdeskDocuments.items.filter(
        (d) =>
            d.entity_type === entityType &&
            (entityId ? d.entity_id === entityId : true)
    );

export const selectDocumentsByStatus = (status: DocumentStatus) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.status === status);

export const selectPendingDocuments = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.status === 'pending_approval');

export const selectApprovedDocuments = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.status === 'approved');

export const selectDocumentLinking = (state: RootState) => state.helpdeskDocuments.loading.link;

export const selectUnlinkedHelpdeskDocuments = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => !d.entity_id);

// ─── Internal Approval Status Selectors ─────────────────────────────────────

export const selectDocumentsByInternalStatus = (status: InternalApprovalStatus) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.internal_approval_status === status);

export const selectDocumentsByRequesterStatus = (status: RequesterVisibleStatus) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.requester_status === status);

export const selectDocumentsReadyToSendBack = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => 
        d.is_internal_approval_complete && !d.is_sent_back_to_requester
    );

export const selectDocumentsPendingInternalReview = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => 
        d.internal_approval_status === 'pending' || d.internal_approval_status === 'previewed'
    );

// ─── Consolidated Memo Selectors ──────────────────────────────────────────

export const selectConsolidatedUtilityMemos = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.entity_type === 'consolidated_utility_memo');

export const selectConsolidatedFuelMemos = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.entity_type === 'consolidated_fuel_memo');

export const selectAllConsolidatedMemos = (state: RootState) =>
    state.helpdeskDocuments.items.filter(
        (d) => d.entity_type === 'consolidated_utility_memo' || d.entity_type === 'consolidated_fuel_memo'
    );

// ─── Unified General Request Selectors ──────────────────────────────────────

export const selectDocumentsByRequestType = (requestType: RequestType) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.request_type === requestType);

export const selectDocumentsByJudgeName = (judgeName: string) => (state: RootState) =>
    state.helpdeskDocuments.items.filter(
        (d) => d.judge_name?.toLowerCase().includes(judgeName.toLowerCase())
    );

export const selectDocumentsByRemarkType = (remarkType: RemarkType) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.remark_type === remarkType);

export const selectDocumentsByCategory = (categoryType: GeneralRequestCategory) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.category_type === categoryType);

// ─── Aide Request Selectors ──────────────────────────────────────────────────

export const selectDocumentsByOfficerRank = (officerRank: OfficerRank) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.officer_rank === officerRank);

export const selectDocumentsByOfficerName = (officerName: string) => (state: RootState) =>
    state.helpdeskDocuments.items.filter(
        (d) => d.officer_name?.toLowerCase().includes(officerName.toLowerCase())
    );

export const selectDocumentsByEmploymentNumber = (employmentNumber: string) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.employment_number === employmentNumber);

export const selectDocumentsByCurrentStation = (currentStation: string) => (state: RootState) =>
    state.helpdeskDocuments.items.filter(
        (d) => d.current_station?.toLowerCase().includes(currentStation.toLowerCase())
    );

export const selectDocumentsByCurrentUnit = (currentUnit: UnitType) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.current_unit === currentUnit);

export const selectDocumentsByAideStatus = (aideStatus: AideStatus) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.aide_status === aideStatus);

// ─── Sentry Request Selectors ──────────────────────────────────────────────

export const selectDocumentsByResidenceLocation = (residenceLocation: string) => (state: RootState) =>
    state.helpdeskDocuments.items.filter(
        (d) => d.residence_location?.toLowerCase().includes(residenceLocation.toLowerCase())
    );

export const selectDocumentsBySentryStatus = (sentryStatus: SentryStatus) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.sentry_status === sentryStatus);

// ─── Legacy Selectors ──────────────────────────────────────────────────────

export const selectDocumentsByRank = (rank: string) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.rank === rank);

export const selectDocumentsByReportingDate = (reportingDate: string) => (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.reporting_date === reportingDate);

// ─── Statistics Selectors ────────────────────────────────────────────────────

export const selectDocumentStats = (state: RootState) => state.helpdeskDocuments.stats;
export const selectDocumentSummary = (state: RootState) => state.helpdeskDocuments.summary;

export const selectPendingDocumentsCount = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.status === 'pending_approval').length;

export const selectApprovedDocumentsCount = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.status === 'approved').length;

export const selectRejectedDocumentsCount = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.status === 'rejected').length;

export const selectDraftDocumentsCount = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => d.status === 'draft').length;

export const selectPendingInternalCount = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => 
        d.internal_approval_status === 'pending' || d.internal_approval_status === 'previewed'
    ).length;

export const selectReadyToSendBackCount = (state: RootState) =>
    state.helpdeskDocuments.items.filter((d) => 
        d.is_internal_approval_complete && !d.is_sent_back_to_requester
    ).length;

export default helpdeskDocumentsSlice.reducer;