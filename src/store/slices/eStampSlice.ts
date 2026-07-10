// src/store/slices/eStampSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import axiosClient from '../../api/api';
import type { RootState } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EStampType = 'approved' | 'received';
export type EStampStatus = 'pending' | 'stamped' | 'failed' | 'revoked';

export interface EStamp {
    id: string;
    document_id: string;
    stamp_type: EStampType;
    stamped_by: string;
    stamped_by_name?: string;
    stamp_image_url: string;
    stamp_public_id: string;
    stamp_data: {
        reference_no: string;
        document_title: string;
        stamped_at: string;
        stamped_by: string;
        stamp_type: EStampType;
        signature_url?: string;
        signature_hash?: string;
        qr_code_data?: string;
        verification_code: string;
        department_name?: string;
        station_name?: string;
    };
    metadata: {
        ip_address?: string;
        user_agent?: string;
        timestamp: string;
        department_id?: string;
        station_name?: string;
        department_name?: string;
    };
    verification_code: string;
    verification_hash: string;
    is_active: boolean;
    revoked_at?: Date;
    revoked_by?: string;
    revocation_reason?: string;
    created_at: Date;
    updated_at: Date;
}

export interface GenerateEStampInput {
    document_id: string;
    stamp_type: EStampType;
    signature_url: string;
    metadata?: {
        ip_address?: string;
        user_agent?: string;
        department_id?: string;
        station_name?: string;
        department_name?: string;
    };
}

export interface EStampVerificationResult {
    valid: boolean;
    data?: EStamp;
    message?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const E_STAMP_TYPE_LABELS: Record<EStampType, string> = {
    approved: 'Approved',
    received: 'Received',
};

export const E_STAMP_TYPE_COLORS: Record<EStampType, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    received: 'bg-blue-50 text-blue-700 border-blue-200',
};

export const E_STAMP_STATUS_LABELS: Record<EStampStatus, string> = {
    pending: 'Pending',
    stamped: 'Stamped ✓',
    failed: 'Failed',
    revoked: 'Revoked ✕',
};

// ─── State ────────────────────────────────────────────────────────────────────

interface EStampState {
    stamps: EStamp[];
    currentStamp: EStamp | null;
    loading: {
        generate: boolean;
        fetch: boolean;
        verify: boolean;
        revoke: boolean;
        list: boolean;
    };
    error: string | null;
    verificationResult: EStampVerificationResult | null;
}

const initialState: EStampState = {
    stamps: [],
    currentStamp: null,
    loading: {
        generate: false,
        fetch: false,
        verify: false,
        revoke: false,
        list: false,
    },
    error: null,
    verificationResult: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getErrorMessage(err: unknown, fallback: string): string {
    const error = err as AxiosError<{ message?: string }>;
    return error.response?.data?.message ?? error.message ?? fallback;
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const generateEStamp = createAsyncThunk<
    EStamp,
    GenerateEStampInput,
    { rejectValue: string }
>(
    'eStamp/generate',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/e-stamp/generate', payload);
            return data.data as EStamp;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to generate E-Stamp'));
        }
    }
);

export const fetchEStampByDocument = createAsyncThunk<
    EStamp,
    { documentId: string; stampType?: EStampType },
    { rejectValue: string }
>(
    'eStamp/fetchByDocument',
    async ({ documentId, stampType }, { rejectWithValue }) => {
        try {
            const params = stampType ? { stamp_type: stampType } : {};
            const { data } = await axiosClient.get(`/e-stamp/document/${documentId}`, { params });
            return data.data as EStamp;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch E-Stamp'));
        }
    }
);

export const verifyEStamp = createAsyncThunk<
    EStampVerificationResult,
    string,
    { rejectValue: string }
>(
    'eStamp/verify',
    async (verificationCode, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/e-stamp/verify', { 
                verification_code: verificationCode 
            });
            return data.data as EStampVerificationResult;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to verify E-Stamp'));
        }
    }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const eStampSlice = createSlice({
    name: 'eStamp',
    initialState,
    reducers: {
        clearEStampError: (state) => {
            state.error = null;
        },
        clearCurrentStamp: (state) => {
            state.currentStamp = null;
        },
        clearVerificationResult: (state) => {
            state.verificationResult = null;
        },
        resetEStampState: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(generateEStamp.pending, (state) => {
                state.loading.generate = true;
                state.error = null;
            })
            .addCase(generateEStamp.fulfilled, (state, action: PayloadAction<EStamp>) => {
                state.loading.generate = false;
                state.currentStamp = action.payload;
                state.stamps.unshift(action.payload);
            })
            .addCase(generateEStamp.rejected, (state, action) => {
                state.loading.generate = false;
                state.error = action.payload as string;
            })
            .addCase(fetchEStampByDocument.pending, (state) => {
                state.loading.fetch = true;
                state.error = null;
            })
            .addCase(fetchEStampByDocument.fulfilled, (state, action: PayloadAction<EStamp>) => {
                state.loading.fetch = false;
                state.currentStamp = action.payload;
            })
            .addCase(fetchEStampByDocument.rejected, (state, action) => {
                state.loading.fetch = false;
                state.error = action.payload as string;
            })
            .addCase(verifyEStamp.pending, (state) => {
                state.loading.verify = true;
                state.error = null;
            })
            .addCase(verifyEStamp.fulfilled, (state, action: PayloadAction<EStampVerificationResult>) => {
                state.loading.verify = false;
                state.verificationResult = action.payload;
            })
            .addCase(verifyEStamp.rejected, (state, action) => {
                state.loading.verify = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearEStampError, clearCurrentStamp, clearVerificationResult, resetEStampState } = eStampSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectEStamps = (state: RootState) => state.eStamp.stamps;
export const selectCurrentEStamp = (state: RootState) => state.eStamp.currentStamp;
export const selectEStampLoading = (state: RootState) => state.eStamp.loading;
export const selectEStampError = (state: RootState) => state.eStamp.error;
export const selectEStampVerificationResult = (state: RootState) => state.eStamp.verificationResult;
export const selectIsGeneratingEStamp = (state: RootState) => state.eStamp.loading.generate;

export default eStampSlice.reducer;