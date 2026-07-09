// src/store/slices/helpdeskDocumentsSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import axiosClient from '../../api/api';
import type { RootState } from '../store';
import type { HelpdeskEntityType } from '../../types/helpdesk-documents.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx';
export type DocumentEntityType =
    | 'circuit'
    | 'bench'
    | 'partHeard'
    | 'serviceWeek'
    | 'otherPayment'
    | 'ticket';

export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'returned';
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
    unlinked?: boolean; // ADD THIS
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

export interface LinkHelpdeskDocumentPayload {
    id: string;
    entity_type: HelpdeskEntityType;
    entity_id: string;
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
        link: boolean; // ADD THIS
    };
    error: string | null;
    deletingId: string | null;
    actionLoading: {
        [documentId: string]: ActionLoadingState;
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
        link: false, // ADD THIS
    },
    error: null,
    deletingId: null,
    actionLoading: {},
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
    if (filters.unlinked) params.unlinked = String(filters.unlinked); // ADD THIS
    return params;
}

function getErrorMessage(err: unknown, fallback: string): string {
    const error = err as AxiosError<{ message?: string }>;
    return error.response?.data?.message ?? fallback;
}

// ─── Fixed: Type-safe action loading helper ─────────────────────────────────

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

            const { data } = await axiosClient.post('/helpdesk/documents/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Upload failed'));
        }
    }
);

export const submitForApproval = createAsyncThunk<
    HelpdeskDocument,
    SubmitForApprovalPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/submitForApproval',
    async ({ id, comments }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/submit`, { comments });
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
    async ({ id, comments }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/approve`, { comments });
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
    async ({ id, reason, comments }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/reject`, { reason, comments });
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
    async ({ id, comments, instructions }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/helpdesk/documents/${id}/return`, { comments, instructions });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to return document'));
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

export const linkHelpdeskDocument = createAsyncThunk <
    HelpdeskDocument,
    LinkHelpdeskDocumentPayload,
    { rejectValue: string }
>(
    'helpdeskDocuments/link',
    async ({ id, entity_type, entity_id }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.patch(`/helpdesk/documents/${id}/link`, {
                entity_type,
                entity_id,
            });
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to link document'));
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

export default helpdeskDocumentsSlice.reducer;