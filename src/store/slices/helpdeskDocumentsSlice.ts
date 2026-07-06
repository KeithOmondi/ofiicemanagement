// src/store/slices/helpdeskDocumentsSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import axiosClient from '../../api/api';
import type { RootState } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentFormat     = 'pdf' | 'docx' | 'xlsx';
export type DocumentEntityType =
    | 'circuit'
    | 'bench'
    | 'partHeard'
    | 'serviceWeek'
    | 'otherPayment';

export interface HelpdeskDocument {
    id:          string;
    ref:         string;
    subject:     string;
    entity_type: DocumentEntityType;
    entity_id:   string | null;
    format:      DocumentFormat;
    file_url:    string;
    public_id:   string;
    file_size:   number | null;
    uploaded_by: string | null;
    created_at:  string;
    updated_at:  string;
}

export interface HelpdeskDocumentFilters {
    entity_type?: DocumentEntityType;
    entity_id?:   string;
    format?:      DocumentFormat;
    search?:      string;
    limit?:       number;
    offset?:      number;
}

export interface UploadHelpdeskDocumentPayload {
    blob:        Blob;
    filename:    string;
    ref:         string;
    subject:     string;
    entity_type: DocumentEntityType;
    entity_id?:  string;
    format:      DocumentFormat;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface HelpdeskDocumentsState {
    items:   HelpdeskDocument[];
    loading: {
        fetch:   boolean;
        upload:  boolean;
        delete:  boolean;
    };
    error:   string | null;
    // track which document id is being deleted (for per-row loading UI)
    deletingId: string | null;
}

const initialState: HelpdeskDocumentsState = {
    items:   [],
    loading: { fetch: false, upload: false, delete: false },
    error:   null,
    deletingId: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildParams(filters: HelpdeskDocumentFilters): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.entity_type) params.entity_type = filters.entity_type;
    if (filters.entity_id)   params.entity_id   = filters.entity_id;
    if (filters.format)      params.format      = filters.format;
    if (filters.search)      params.search      = filters.search;
    if (filters.limit)       params.limit       = String(filters.limit);
    if (filters.offset)      params.offset      = String(filters.offset);
    return params;
}

function getErrorMessage(err: unknown, fallback: string): string {
    const error = err as AxiosError<{ message?: string }>;
    return error.response?.data?.message ?? fallback;
}

// ─── Thunks ───────────────────────────────────────────────────────────────────
//
// These all go through axiosClient (not raw fetch) so the request interceptor
// attaches the bearer token and the response interceptor can silently refresh
// it on a 401 — the same as every other slice (templatesSlice, documentSlice).
// Paths are relative to axiosClient's baseURL, which already includes the
// API prefix — the router for this feature is mounted at /api/v1/uploads,
// so requests here are just "/uploads", "/uploads/upload", "/uploads/:id".

export const fetchHelpdeskDocuments = createAsyncThunk<
    HelpdeskDocument[],
    HelpdeskDocumentFilters,
    { rejectValue: string }
>(
    'helpdeskDocuments/fetchAll',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/uploads', {
                params: buildParams(filters),
            });
            // Response shape: { success: true, data: HelpdeskDocument[] }
            return data.data as HelpdeskDocument[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch documents'));
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
            form.append('file',        payload.blob, payload.filename);
            form.append('ref',         payload.ref);
            form.append('subject',     payload.subject);
            form.append('entity_type', payload.entity_type);
            form.append('format',      payload.format);
            if (payload.entity_id) form.append('entity_id', payload.entity_id);

            const { data } = await axiosClient.post('/uploads/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Response shape: { success: true, data: HelpdeskDocument }
            return data.data as HelpdeskDocument;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Upload failed'));
        }
    }
);

export const deleteHelpdeskDocument = createAsyncThunk<
    string,           // returns the deleted id
    string,           // accepts the document id
    { rejectValue: string }
>(
    'helpdeskDocuments/delete',
    async (id, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/uploads/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Delete failed'));
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

        // ── uploadHelpdeskDocument ──────────────────────────────────────────
        builder
            .addCase(uploadHelpdeskDocument.pending, (state) => {
                state.loading.upload = true;
                state.error = null;
            })
            .addCase(uploadHelpdeskDocument.fulfilled, (state, action: PayloadAction<HelpdeskDocument>) => {
                state.loading.upload = false;
                // Prepend so the newest document appears first
                state.items.unshift(action.payload);
            })
            .addCase(uploadHelpdeskDocument.rejected, (state, action) => {
                state.loading.upload = false;
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
            })
            .addCase(deleteHelpdeskDocument.rejected, (state, action) => {
                state.loading.delete = false;
                state.deletingId = null;
                state.error = action.payload as string;
            });
    },
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export const { clearDocumentError } = helpdeskDocumentsSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllHelpdeskDocuments  = (state: RootState) => state.helpdeskDocuments.items;
export const selectDocumentsFetchLoading = (state: RootState) => state.helpdeskDocuments.loading.fetch;
export const selectDocumentsUploading    = (state: RootState) => state.helpdeskDocuments.loading.upload;
export const selectDocumentDeleting      = (state: RootState) => state.helpdeskDocuments.loading.delete;
export const selectDeletingDocumentId    = (state: RootState) => state.helpdeskDocuments.deletingId;
export const selectDocumentError         = (state: RootState) => state.helpdeskDocuments.error;

// Filtered by entity — useful for showing only a circuit's documents in the detail modal
export const selectDocumentsByEntity = (
    entityType: DocumentEntityType,
    entityId?: string
) => (state: RootState) =>
    state.helpdeskDocuments.items.filter(
        (d) =>
            d.entity_type === entityType &&
            (entityId ? d.entity_id === entityId : true)
    );

export default helpdeskDocumentsSlice.reducer;