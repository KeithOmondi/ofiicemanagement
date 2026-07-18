// src/store/slices/helpdeskDocumentsSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import axiosClient from '../../api/api';
import type { RootState } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx';
export type DocumentEntityType =
    | 'circuit'
    | 'bench'
    | 'partHeard'
    | 'serviceWeek'
    | 'otherPayment'
    | 'ticket'
    | 'medicalClaim'
    | 'generalRequest'
    | 'securityRequest';

export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'returned';
export type EStampStatus = 'pending' | 'stamped' | 'failed';

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
    rejection_reason?: string;

    // Unified General Request fields
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;

    // ─── NEW FIELDS ──────────────────────────────────────────────────────────
    rank?: string | null;            // Officer's rank (for Driver/Bodyguard)
    reporting_date?: string | null;  // Expected reporting date
}

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

    // Unified General Request filters
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    date_from?: string;
    date_to?: string;

    // ─── NEW FILTERS ──────────────────────────────────────────────────────────
    rank?: string;
    reporting_date?: string;
}

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

    // ─── NEW FIELDS ──────────────────────────────────────────────────────────
    rank?: string;
    reporting_date?: string;
}

export interface SubmitForApprovalPayload {
    id: string;
    comments?: string;
    submitted_by?: string;
    submitted_by_name?: string;
}

export interface ApproveDocumentPayload {
    id: string;
    comments?: string;
    approved_by?: string;
    approved_by_name?: string;
    e_stamp_url?: string;
    e_stamp_public_id?: string;
}

export interface RejectDocumentPayload {
    id: string;
    reason: string;
    comments?: string;
    rejected_by?: string;
    rejected_by_name?: string;
}

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

    // ─── NEW FIELDS ──────────────────────────────────────────────────────────
    rank?: string;
    reporting_date?: string;
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
    rank?: string;
    reporting_date?: string;
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
}

// ── Action Loading Types ─────────────────────────────────────────────────────

type ActionLoadingKey = 'submitting' | 'approving' | 'rejecting' | 'returning';

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
    };
    error: string | null;
    deletingId: string | null;
    actionLoading: {
        [documentId: string]: ActionLoadingState;
    };
    stats: DocumentStats | null;
    summary: DocumentSummary | null;
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
    },
    error: null,
    deletingId: null,
    actionLoading: {},
    stats: null,
    summary: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildParams(filters: HelpdeskDocumentFilters): Record<string, string> {
    const params: Record<string, string> = {};
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

    // Unified General Request filters
    if (filters.request_type) params.request_type = filters.request_type;
    if (filters.judge_name) params.judge_name = filters.judge_name;
    if (filters.remark_type) params.remark_type = filters.remark_type;
    if (filters.category_type) params.category_type = filters.category_type;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;

    // ─── NEW FILTERS ──────────────────────────────────────────────────────────
    if (filters.rank) params.rank = filters.rank;
    if (filters.reporting_date) params.reporting_date = filters.reporting_date;

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

export const uploadHelpdeskDocument = createAsyncThunk<
    HelpdeskDocument,
    UploadHelpdeskDocumentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/upload',
    async (payload, { rejectWithValue }) => {
        try {
            const form = new FormData();
            form.append('file', payload.blob, payload.filename);
            form.append('ref', payload.ref);
            form.append('subject', payload.subject);
            form.append('entity_type', payload.entity_type);
            form.append('format', payload.format);
            if (payload.entity_id) form.append('entity_id', payload.entity_id);
            if (payload.status) form.append('status', payload.status);

            // Unified General Request fields
            if (payload.request_type) form.append('request_type', payload.request_type);
            if (payload.judge_name) form.append('judge_name', payload.judge_name);
            if (payload.remark_type) form.append('remark_type', payload.remark_type);
            if (payload.category_type) form.append('category_type', payload.category_type);

            // ─── NEW FIELDS ──────────────────────────────────────────────────
            if (payload.rank) form.append('rank', payload.rank);
            if (payload.reporting_date) form.append('reporting_date', payload.reporting_date);

            const { data } = await axiosClient.post('/helpdesk/documents/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Upload failed'));
        }
    }
);

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
    string,
    DeleteCommentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/deleteComment',
    async ({ id, commentId }, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/helpdesk/documents/${id}/comments/${commentId}`);
            return commentId;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to delete comment'));
        }
    }
);

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
            return rejectWithValue(getErrorMessage(err, 'Delete failed'));
        }
    }
);

export const linkHelpdeskDocument = createAsyncThunk<
    HelpdeskDocument,
    LinkHelpdeskDocumentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/link',
    async ({ id, entity_type, entity_id, request_type, judge_name, remark_type, category_type, rank, reporting_date }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.patch(`/helpdesk/documents/${id}/link`, {
                entity_type,
                entity_id,
                request_type,
                judge_name,
                remark_type,
                category_type,
                rank,
                reporting_date,
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
                // Refresh items after bulk operation
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
                // Refresh items after bulk operation
                state.items = state.items.filter(d => !action.payload.success.includes(d.id));
            })
            .addCase(bulkUpdateStatus.rejected, (state, action) => {
                state.loading.bulkUpdate = false;
                state.error = action.payload as string;
            });

        // ── approveDocument ──────────────────────────────────────────────────
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

        // ── rejectDocument ───────────────────────────────────────────────────
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

        // ── returnDocument ───────────────────────────────────────────────────
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
                        action.payload,
                        ...(state.selectedDocument.comments || []),
                    ];
                }
            })
            .addCase(addComment.rejected, (state, action) => {
                state.loading.comment = false;
                state.error = action.payload as string;
            });

        // ── deleteComment ────────────────────────────────────────────────────
        builder
            .addCase(deleteComment.fulfilled, (state, action: PayloadAction<string>) => {
                if (state.selectedDocument) {
                    state.selectedDocument.comments = state.selectedDocument.comments.filter(
                        c => c.id !== action.payload
                    );
                }
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
    },
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export const {
    clearDocumentError,
    clearSelectedDocument,
    clearActionLoading,
    clearStats,
} = helpdeskDocumentsSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllHelpdeskDocuments = (state: RootState) => state.helpdeskDocuments.items;
export const selectSelectedHelpdeskDocument = (state: RootState) => state.helpdeskDocuments.selectedDocument;
export const selectDocumentsFetchLoading = (state: RootState) => state.helpdeskDocuments.loading.fetch;
export const selectDocumentsUploading = (state: RootState) => state.helpdeskDocuments.loading.upload;
export const selectDocumentDeleting = (state: RootState) => state.helpdeskDocuments.loading.delete;
export const selectDeletingDocumentId = (state: RootState) => state.helpdeskDocuments.deletingId;
export const selectDocumentError = (state: RootState) => state.helpdeskDocuments.error;
export const selectDocumentActionLoading = (state: RootState) => state.helpdeskDocuments.actionLoading;
export const selectIsSubmitting = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.submitting || false;
export const selectIsApproving = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.approving || false;
export const selectIsRejecting = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.rejecting || false;
export const selectIsReturning = (state: RootState, id: string) =>
    state.helpdeskDocuments.actionLoading[id]?.returning || false;

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

// ─── New Selectors ──────────────────────────────────────────────────────────

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

export default helpdeskDocumentsSlice.reducer;