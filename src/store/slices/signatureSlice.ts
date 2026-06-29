// src/features/signature/signatureSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

interface SignatureState {
  signature_url: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: SignatureState = {
  signature_url: null,
  loading: false,
  error: null,
};

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? axiosError.message ?? 'Request failed';
  }
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
};

// ── Upload signature ──────────────────────────────────────────────────────────

export const uploadSignature = createAsyncThunk(
  'signature/upload',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('signature', file);
      const response = await axiosClient.post<{
        success: boolean;
        data: { signature_url: string };
      }>('/signature/me/signature', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data.signature_url;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Delete signature ──────────────────────────────────────────────────────────

export const deleteSignature = createAsyncThunk(
  'signature/delete',
  async (_, { rejectWithValue }) => {
    try {
      await axiosClient.delete('/signature/me/signature');
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const signatureSlice = createSlice({
  name: 'signature',
  initialState,
  reducers: {
    clearSignatureError: (state) => {
      state.error = null;
    },
    // Call this when loading the super admin's profile 
    // so the UI knows whether a signature exists
    setSignatureUrl: (state, action) => {
      state.signature_url = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── upload ──────────────────────────────────────────────────────────────
      .addCase(uploadSignature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadSignature.fulfilled, (state, action) => {
        state.loading = false;
        state.signature_url = action.payload;
      })
      .addCase(uploadSignature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── delete ──────────────────────────────────────────────────────────────
      .addCase(deleteSignature.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSignature.fulfilled, (state) => {
        state.loading = false;
        state.signature_url = null;
      })
      .addCase(deleteSignature.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSignatureError, setSignatureUrl } = signatureSlice.actions;
export default signatureSlice.reducer;