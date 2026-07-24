// src/store/slices/sentrySlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import axiosClient from '../../api/api';
import type { RootState } from '../store';
import type {
  SentryRequest,
  SentryStatus,
  CreateSentryRequestInput,
  UpdateSentryRequestInput,
  SentryRequestFilters,
  SentryRequestPaginationResponse,
  SentryRequestStats,
} from '../../types/aide.types';

// ─── Re-export types for convenience ─────────────────────────────────────────

export type { SentryStatus, SentryRequest, SentryRequestStats };

// ─── State Interface ─────────────────────────────────────────────────────────

export interface SentryState {
  items: SentryRequest[];
  selectedItem: SentryRequest | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: SentryRequestStats | null;
  filters: SentryRequestFilters;
  loading: {
    list: boolean;
    detail: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    stats: boolean;
  };
  error: string | null;
  success: boolean;
}

// ─── Types for validation errors ─────────────────────────────────────────────

interface ValidationError {
  field: string;
  message: string;
}

interface AxiosErrorResponseData {
  message?: string;
  error?: string;
  details?: ValidationError[];
  errors?: Array<{ path: string[]; message: string }>;
}

type AxiosErrorWithResponse = AxiosError<AxiosErrorResponseData>;

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: SentryState = {
  items: [],
  selectedItem: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
  stats: null,
  filters: {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'DESC',
  },
  loading: {
    list: false,
    detail: false,
    create: false,
    update: false,
    delete: false,
    stats: false,
  },
  error: null,
  success: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string; error?: string }>;
  return (
    axiosError.response?.data?.message ||
    axiosError.response?.data?.error ||
    axiosError.message ||
    'An unexpected error occurred'
  );
};

const buildParams = (filters: SentryRequestFilters): Record<string, string> => {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.judge_name) params.judge_name = filters.judge_name;
  if (filters.residence_location) params.residence_location = filters.residence_location;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.sort_by) params.sort_by = filters.sort_by;
  if (filters.sort_order) params.sort_order = filters.sort_order;
  return params;
};

// ─── Helper: Extract validation errors from response ─────────────────────────

const extractValidationErrors = (error: unknown): string | null => {
  const axiosError = error as AxiosErrorWithResponse;

  if (!axiosError.response?.data) {
    return null;
  }

  const data = axiosError.response.data;

  // Check for details array (from validate middleware)
  if (data.details && Array.isArray(data.details) && data.details.length > 0) {
    const errorMessages = data.details
      .map((e: ValidationError) => {
        const fieldName = e.field.replace('body.', '').replace(/_/g, ' ');
        return `${fieldName}: ${e.message}`;
      })
      .join('; ');
    return `Validation failed: ${errorMessages}`;
  }

  // Check for errors array (from Zod)
  if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const errorMessages = data.errors
      .map((e: { path: string[]; message: string }) => {
        const fieldName = e.path.join('.').replace('body.', '').replace(/_/g, ' ');
        return `${fieldName}: ${e.message}`;
      })
      .join('; ');
    return `Validation failed: ${errorMessages}`;
  }

  return null;
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * Fetch all sentry requests with pagination and filters
 * GET /api/v1/sentry
 */
export const fetchSentryRequests = createAsyncThunk<
  SentryRequestPaginationResponse,
  SentryRequestFilters | undefined,
  { rejectValue: string }
>(
  'sentry/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = buildParams(filters);
      const { data } = await axiosClient.get('/sentry', { params });
      return data.data || data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Fetch a single sentry request by ID
 * GET /api/v1/sentry/:id
 */
export const fetchSentryRequestById = createAsyncThunk<
  SentryRequest,
  string,
  { rejectValue: string }
>(
  'sentry/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/sentry/${id}`);
      return data.data || data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Create a new sentry request
 * POST /api/v1/sentry
 */
export const createSentryRequest = createAsyncThunk<
  SentryRequest,
  CreateSentryRequestInput,
  { rejectValue: string }
>(
  'sentry/create',
  async (payload, { rejectWithValue }) => {
    try {
      // Prepare the payload for the API with proper typing
      const apiPayload: CreateSentryRequestInput = {
        judge_name: payload.judge_name,
        residence_location: payload.residence_location,
      };

      // Only include remarks if provided
      if (payload.remarks) {
        apiPayload.remarks = payload.remarks;
      }

      console.log('📤 Creating sentry request:', apiPayload);

      const { data } = await axiosClient.post('/sentry', apiPayload);
      return data.data || data;
    } catch (err) {
      console.error('❌ Create sentry request error:', err);

      const validationError = extractValidationErrors(err);
      if (validationError) {
        return rejectWithValue(validationError);
      }

      const axiosError = err as AxiosErrorWithResponse;
      if (axiosError.response?.data?.message) {
        return rejectWithValue(axiosError.response.data.message);
      }

      if (axiosError.response?.data?.error) {
        return rejectWithValue(axiosError.response.data.error);
      }

      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Update an existing sentry request
 * PUT /api/v1/sentry/:id
 */
export const updateSentryRequest = createAsyncThunk<
  SentryRequest,
  { id: string; data: UpdateSentryRequestInput },
  { rejectValue: string }
>(
  'sentry/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      // Prepare the payload for the API with proper typing
      const apiPayload: UpdateSentryRequestInput = {};

      // Only include fields that are defined
      if (data.judge_name !== undefined) apiPayload.judge_name = data.judge_name;
      if (data.residence_location !== undefined) apiPayload.residence_location = data.residence_location;
      if (data.status !== undefined) apiPayload.status = data.status;
      if (data.remarks !== undefined) apiPayload.remarks = data.remarks;

      console.log('📤 Updating sentry request:', { id, data: apiPayload });

      const { data: responseData } = await axiosClient.put(`/sentry/${id}`, apiPayload);
      return responseData.data || responseData;
    } catch (err) {
      console.error('❌ Update sentry request error:', err);

      const validationError = extractValidationErrors(err);
      if (validationError) {
        return rejectWithValue(validationError);
      }

      const axiosError = err as AxiosErrorWithResponse;
      if (axiosError.response?.data?.message) {
        return rejectWithValue(axiosError.response.data.message);
      }

      if (axiosError.response?.data?.error) {
        return rejectWithValue(axiosError.response.data.error);
      }

      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Delete a sentry request (soft delete)
 * DELETE /api/v1/sentry/:id
 */
export const deleteSentryRequest = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'sentry/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/sentry/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Fetch sentry request statistics
 * GET /api/v1/sentry/stats
 */
export const fetchSentryStats = createAsyncThunk<
  SentryRequestStats,
  { start_date?: string; end_date?: string } | undefined,
  { rejectValue: string }
>(
  'sentry/fetchStats',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/sentry/stats', { params });
      return data.data || data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const sentrySlice = createSlice({
  name: 'sentry',
  initialState,
  reducers: {
    setSentryFilters(state, action: PayloadAction<Partial<SentryRequestFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      if (action.payload.page === undefined) {
        state.filters.page = 1;
      }
    },
    resetSentryFilters(state) {
      state.filters = {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'DESC',
      };
    },
    clearSelectedSentryItem(state) {
      state.selectedItem = null;
    },
    clearSentryError(state) {
      state.error = null;
    },
    clearSentrySuccess(state) {
      state.success = false;
    },
    resetSentryState: () => initialState,
    optimisticUpdateSentryStatus(
      state,
      action: PayloadAction<{ id: string; status: SentryStatus }>
    ) {
      const { id, status } = action.payload;
      const index = state.items.findIndex((item) => item.id === id);
      if (index !== -1) {
        state.items[index].status = status;
      }
      if (state.selectedItem?.id === id) {
        state.selectedItem.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSentryRequests.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchSentryRequests.fulfilled, (state, action: PayloadAction<SentryRequestPaginationResponse>) => {
        state.loading.list = false;
        state.items = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchSentryRequests.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchSentryRequestById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchSentryRequestById.fulfilled, (state, action: PayloadAction<SentryRequest>) => {
        state.loading.detail = false;
        state.selectedItem = action.payload;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(fetchSentryRequestById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createSentryRequest.pending, (state) => {
        state.loading.create = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createSentryRequest.fulfilled, (state, action: PayloadAction<SentryRequest>) => {
        state.loading.create = false;
        state.success = true;
        state.items.unshift(action.payload);
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(createSentryRequest.rejected, (state, action) => {
        state.loading.create = false;
        state.error = action.payload as string;
        state.success = false;
      });

    builder
      .addCase(updateSentryRequest.pending, (state) => {
        state.loading.update = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateSentryRequest.fulfilled, (state, action: PayloadAction<SentryRequest>) => {
        state.loading.update = false;
        state.success = true;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload;
        }
      })
      .addCase(updateSentryRequest.rejected, (state, action) => {
        state.loading.update = false;
        state.error = action.payload as string;
        state.success = false;
      });

    builder
      .addCase(deleteSentryRequest.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteSentryRequest.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.delete = false;
        state.success = true;
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.selectedItem?.id === action.payload) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteSentryRequest.rejected, (state, action) => {
        state.loading.delete = false;
        state.error = action.payload as string;
        state.success = false;
      });

    builder
      .addCase(fetchSentryStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchSentryStats.fulfilled, (state, action: PayloadAction<SentryRequestStats>) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchSentryStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload as string;
      });
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────

export const {
  setSentryFilters,
  resetSentryFilters,
  clearSelectedSentryItem,
  clearSentryError,
  clearSentrySuccess,
  resetSentryState,
  optimisticUpdateSentryStatus,
} = sentrySlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllSentryRequests = (state: RootState) => state.sentry.items;
export const selectSelectedSentry = (state: RootState) => state.sentry.selectedItem;
export const selectSentryPagination = (state: RootState) => state.sentry.pagination;
export const selectSentryStats = (state: RootState) => state.sentry.stats;
export const selectSentryFilters = (state: RootState) => state.sentry.filters;
export const selectSentryLoading = (state: RootState) => state.sentry.loading;
export const selectSentryListLoading = (state: RootState) => state.sentry.loading.list;
export const selectSentryDetailLoading = (state: RootState) => state.sentry.loading.detail;
export const selectSentryMutating = (state: RootState) =>
  state.sentry.loading.create || state.sentry.loading.update || state.sentry.loading.delete;
export const selectSentryError = (state: RootState) => state.sentry.error;
export const selectSentrySuccess = (state: RootState) => state.sentry.success;
export const selectSentryTotal = (state: RootState) => state.sentry.pagination.total;

export const selectSentryByStatus = (status: SentryStatus) => (state: RootState) =>
  state.sentry.items.filter((item) => item.status === status);

export const selectPendingSentry = (state: RootState) =>
  state.sentry.items.filter((item) => item.status === 'pending');

export const selectActiveSentry = (state: RootState) =>
  state.sentry.items.filter((item) => item.status === 'active');

export const selectResolvedSentry = (state: RootState) =>
  state.sentry.items.filter((item) => item.status === 'resolved');

export const selectRejectedSentry = (state: RootState) =>
  state.sentry.items.filter((item) => item.status === 'rejected');

export const selectSentryTotalCount = (state: RootState) => state.sentry.stats?.total || 0;
export const selectSentryPendingCount = (state: RootState) => state.sentry.stats?.pending || 0;
export const selectSentryActiveCount = (state: RootState) => state.sentry.stats?.active || 0;
export const selectSentryResolvedCount = (state: RootState) => state.sentry.stats?.resolved || 0;
export const selectSentryRejectedCount = (state: RootState) => state.sentry.stats?.rejected || 0;

export const selectSentryByJudgeName = (judgeName: string) => (state: RootState) =>
  state.sentry.items.filter((item) =>
    item.judge_name.toLowerCase().includes(judgeName.toLowerCase())
  );

export const selectSentryByLocation = (location: string) => (state: RootState) =>
  state.sentry.items.filter((item) =>
    item.residence_location.toLowerCase().includes(location.toLowerCase())
  );

export default sentrySlice.reducer;