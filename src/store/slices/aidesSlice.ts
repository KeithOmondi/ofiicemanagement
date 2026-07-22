// src/store/slices/aidesSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import axiosClient from '../../api/api';
import type { RootState } from '../store';
import type {
  AideRequest,
  AideStatus,
  OfficerRank,
  UnitType,
  CreateAideRequestInput,
  UpdateAideRequestInput,
  AideRequestFilters,
  AideRequestPaginationResponse,
  AideRequestStats,
} from '../../types/aide.types';

// ─── Re-export types for convenience ─────────────────────────────────────────

export type { AideStatus, OfficerRank, UnitType, AideRequest, AideRequestStats };

// ─── State Interface ─────────────────────────────────────────────────────────

export interface AideState {
  items: AideRequest[];
  selectedItem: AideRequest | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: AideRequestStats | null;
  filters: AideRequestFilters;
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

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AideState = {
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

const buildParams = (filters: AideRequestFilters): Record<string, string> => {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.judge_name) params.judge_name = filters.judge_name;
  if (filters.officer_name) params.officer_name = filters.officer_name;
  if (filters.current_station) params.current_station = filters.current_station;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.sort_by) params.sort_by = filters.sort_by;
  if (filters.sort_order) params.sort_order = filters.sort_order;
  return params;
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * Fetch all aide requests with pagination and filters
 */
export const fetchAideRequests = createAsyncThunk<
  AideRequestPaginationResponse,
  AideRequestFilters | undefined,
  { rejectValue: string }
>(
  'aides/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = buildParams(filters);
      const { data } = await axiosClient.get('/aide', { params });
      return data.data as AideRequestPaginationResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Fetch a single aide request by ID
 */
export const fetchAideRequestById = createAsyncThunk<
  AideRequest,
  string,
  { rejectValue: string }
>(
  'aides/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/aide/${id}`);
      return data.data as AideRequest;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Create a new aide request
 */
export const createAideRequest = createAsyncThunk<
  AideRequest,
  CreateAideRequestInput,
  { rejectValue: string }
>(
  'aides/create',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post('/aide', payload);
      return data.data as AideRequest;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Update an existing aide request
 */
export const updateAideRequest = createAsyncThunk<
  AideRequest,
  { id: string; data: UpdateAideRequestInput },
  { rejectValue: string }
>(
  'aides/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const { data: responseData } = await axiosClient.put(`/aide/${id}`, data);
      return responseData.data as AideRequest;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Delete an aide request (soft delete)
 */
export const deleteAideRequest = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'aides/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/aide/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Fetch aide request statistics
 */
export const fetchAideStats = createAsyncThunk<
  AideRequestStats,
  { start_date?: string; end_date?: string } | undefined,
  { rejectValue: string }
>(
  'aides/fetchStats',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/aide/stats', { params });
      return data.data as AideRequestStats;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const aidesSlice = createSlice({
  name: 'aides',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<AideRequestFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      // Reset page when filters change (except when specifically setting page)
      if (action.payload.page === undefined) {
        state.filters.page = 1;
      }
    },
    resetFilters(state) {
      state.filters = {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'DESC',
      };
    },
    clearSelectedItem(state) {
      state.selectedItem = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearSuccess(state) {
      state.success = false;
    },
    resetState: () => initialState,
    // Optimistic update for status change
    optimisticUpdateStatus(
      state,
      action: PayloadAction<{ id: string; status: AideStatus }>
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
    // ── fetchAideRequests ──────────────────────────────────────────────────────
    builder
      .addCase(fetchAideRequests.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchAideRequests.fulfilled, (state, action: PayloadAction<AideRequestPaginationResponse>) => {
        state.loading.list = false;
        state.items = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchAideRequests.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    // ── fetchAideRequestById ──────────────────────────────────────────────────
    builder
      .addCase(fetchAideRequestById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchAideRequestById.fulfilled, (state, action: PayloadAction<AideRequest>) => {
        state.loading.detail = false;
        state.selectedItem = action.payload;
        // Update in list if exists
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(fetchAideRequestById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    // ── createAideRequest ──────────────────────────────────────────────────────
    builder
      .addCase(createAideRequest.pending, (state) => {
        state.loading.create = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createAideRequest.fulfilled, (state, action: PayloadAction<AideRequest>) => {
        state.loading.create = false;
        state.success = true;
        state.items.unshift(action.payload);
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(createAideRequest.rejected, (state, action) => {
        state.loading.create = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ── updateAideRequest ──────────────────────────────────────────────────────
    builder
      .addCase(updateAideRequest.pending, (state) => {
        state.loading.update = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateAideRequest.fulfilled, (state, action: PayloadAction<AideRequest>) => {
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
      .addCase(updateAideRequest.rejected, (state, action) => {
        state.loading.update = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ── deleteAideRequest ──────────────────────────────────────────────────────
    builder
      .addCase(deleteAideRequest.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteAideRequest.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.delete = false;
        state.success = true;
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.selectedItem?.id === action.payload) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteAideRequest.rejected, (state, action) => {
        state.loading.delete = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ── fetchAideStats ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchAideStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchAideStats.fulfilled, (state, action: PayloadAction<AideRequestStats>) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchAideStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload as string;
      });
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────

export const {
  setFilters,
  resetFilters,
  clearSelectedItem,
  clearError,
  clearSuccess,
  resetState,
  optimisticUpdateStatus,
} = aidesSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllAides = (state: RootState) => state.aides.items;
export const selectSelectedAide = (state: RootState) => state.aides.selectedItem;
export const selectAidePagination = (state: RootState) => state.aides.pagination;
export const selectAideStats = (state: RootState) => state.aides.stats;
export const selectAideFilters = (state: RootState) => state.aides.filters;
export const selectAideLoading = (state: RootState) => state.aides.loading;
export const selectAideListLoading = (state: RootState) => state.aides.loading.list;
export const selectAideDetailLoading = (state: RootState) => state.aides.loading.detail;
export const selectAideMutating = (state: RootState) =>
  state.aides.loading.create || state.aides.loading.update || state.aides.loading.delete;
export const selectAideError = (state: RootState) => state.aides.error;
export const selectAideSuccess = (state: RootState) => state.aides.success;
export const selectAideTotal = (state: RootState) => state.aides.pagination.total;

// ─── Status-specific Selectors ──────────────────────────────────────────────

export const selectAidesByStatus = (status: AideStatus) => (state: RootState) =>
  state.aides.items.filter((item) => item.status === status);

export const selectInProgressAides = (state: RootState) =>
  state.aides.items.filter((item) => item.status === 'in_progress');

export const selectAttachedAides = (state: RootState) =>
  state.aides.items.filter((item) => item.status === 'attached');

export const selectRejectedAides = (state: RootState) =>
  state.aides.items.filter((item) => item.status === 'rejected');

// ─── Statistics Selectors ────────────────────────────────────────────────────

export const selectAideTotalCount = (state: RootState) => state.aides.stats?.total || 0;
export const selectAideInProgressCount = (state: RootState) => state.aides.stats?.in_progress || 0;
export const selectAideAttachedCount = (state: RootState) => state.aides.stats?.attached || 0;
export const selectAideRejectedCount = (state: RootState) => state.aides.stats?.rejected || 0;

// ─── Filtered Selectors ──────────────────────────────────────────────────────

export const selectAidesByJudgeName = (judgeName: string) => (state: RootState) =>
  state.aides.items.filter((item) =>
    item.judge_name.toLowerCase().includes(judgeName.toLowerCase())
  );

export const selectAidesByOfficerName = (officerName: string) => (state: RootState) =>
  state.aides.items.filter((item) =>
    item.officer_name.toLowerCase().includes(officerName.toLowerCase())
  );

export const selectAidesByStation = (station: string) => (state: RootState) =>
  state.aides.items.filter((item) =>
    item.current_station.toLowerCase().includes(station.toLowerCase())
  );

export const selectAidesByUnit = (unit: UnitType) => (state: RootState) =>
  state.aides.items.filter((item) => item.current_unit === unit);

export default aidesSlice.reducer;