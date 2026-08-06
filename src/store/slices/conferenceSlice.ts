// src/features/conference/conference.slice.ts

import { createSlice, createAsyncThunk, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type {
  ConferenceRequest,
  ConferenceRequestFilters,
  ConferenceStats,
  CreateConferenceRequestInput,
  UpdateConferenceRequestInput,
  ApproveConferenceRequestInput,
  ReturnConferenceRequestInput,
  CompleteConferenceRequestInput,
  CancelConferenceRequestInput,
} from '../../types/conference.types';

// Re-export types for convenience
export type {
  ConferenceRequest,
  ConferenceRequestFilters,
  ConferenceStats,
  CreateConferenceRequestInput,
  UpdateConferenceRequestInput,
  ApproveConferenceRequestInput,
  ReturnConferenceRequestInput,
  CompleteConferenceRequestInput,
  CancelConferenceRequestInput,
};

/* ============================================================
   STATE TYPES
============================================================ */

export type ConferenceFilters = ConferenceRequestFilters;

export interface ConferenceState {
  conferences: ConferenceRequest[];
  selectedConference: ConferenceRequest | null;
  stats: ConferenceStats | null;
  filters: ConferenceFilters;
  loading: {
    list: boolean;
    detail: boolean;
    stats: boolean;
    mutating: boolean;
  };
  error: string | null;
  success: boolean;
  actionLoading: Record<string, boolean>;
  actionError: Record<string, string | null>;
  // Pagination metadata
  pagination: {
    total: number;
    totalPages: number;
  };
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: ConferenceState = {
  conferences: [],
  selectedConference: null,
  stats: null,
  filters: {
    page: 1,
    limit: 20,
    sort_by: 'serial_number',
    sort_order: 'DESC',
  },
  loading: {
    list: false,
    detail: false,
    stats: false,
    mutating: false,
  },
  error: null,
  success: false,
  actionLoading: {},
  actionError: {},
  pagination: {
    total: 0,
    totalPages: 0,
  },
};

/* ============================================================
   HELPERS
============================================================ */

// Helper to safely access nested error messages
const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Helper to build query string from params
const buildQueryString = (params: Record<string, unknown>): string => {
  const filteredParams = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (filteredParams.length === 0) return '';
  return '?' + filteredParams
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
};

// Helper to safely get limit with fallback
const getLimit = (filters: ConferenceFilters): number => filters.limit ?? 20;

/* ============================================================
   ASYNC THUNKS
============================================================ */

/**
 * Fetch conference requests with filters
 * GET /api/v1/conference
 */
export const fetchConferences = createAsyncThunk(
  'conference/fetchAll',
  async (filters: ConferenceFilters = {}, { rejectWithValue }) => {
    try {
      const queryString = buildQueryString(filters as Record<string, unknown>);
      const response = await axiosClient.get(`/conference${queryString}`);
      return response.data.data as {
        data: ConferenceRequest[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Fetch conference request by ID
 * GET /api/v1/conference/:id
 */
export const fetchConferenceById = createAsyncThunk(
  'conference/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/conference/${id}`);
      return response.data.data as ConferenceRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Fetch conference statistics
 * GET /api/v1/conference/stats
 */
export const fetchConferenceStats = createAsyncThunk(
  'conference/fetchStats',
  async (params: { startDate?: string; endDate?: string } | void, { rejectWithValue }) => {
    try {
      const queryString = params ? buildQueryString(params) : '';
      const response = await axiosClient.get(`/conference/stats${queryString}`);
      return response.data.data as ConferenceStats;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Create conference request
 * POST /api/v1/conference
 */
export const createConference = createAsyncThunk(
  'conference/create',
  async (data: CreateConferenceRequestInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/conference', data);
      return response.data.data as ConferenceRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Update conference request
 * PUT /api/v1/conference/:id
 */
export const updateConference = createAsyncThunk(
  'conference/update',
  async ({ id, data }: { id: string; data: UpdateConferenceRequestInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/conference/${id}`, data);
      return response.data.data as ConferenceRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Submit conference request for approval
 * PUT /api/v1/conference/:id/submit
 */
export const submitConference = createAsyncThunk(
  'conference/submit',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/conference/${id}/submit`);
      return response.data.data as ConferenceRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Approve conference request
 * PUT /api/v1/conference/:id/approve
 */
export const approveConference = createAsyncThunk(
  'conference/approve',
  async ({ id, data }: { id: string; data: ApproveConferenceRequestInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/conference/${id}/approve`, data);
      return response.data.data as ConferenceRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Return conference request
 * PUT /api/v1/conference/:id/return
 */
export const returnConference = createAsyncThunk(
  'conference/return',
  async ({ id, data }: { id: string; data: ReturnConferenceRequestInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/conference/${id}/return`, data);
      return response.data.data as ConferenceRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Complete conference request
 * PUT /api/v1/conference/:id/complete
 */
export const completeConference = createAsyncThunk(
  'conference/complete',
  async ({ id, data }: { id: string; data: CompleteConferenceRequestInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/conference/${id}/complete`, data);
      return response.data.data as ConferenceRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Cancel conference request
 * PUT /api/v1/conference/:id/cancel
 */
export const cancelConference = createAsyncThunk(
  'conference/cancel',
  async ({ id, data }: { id: string; data: CancelConferenceRequestInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/conference/${id}/cancel`, data);
      return response.data.data as ConferenceRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/**
 * Delete conference request
 * DELETE /api/v1/conference/:id
 */
export const deleteConference = createAsyncThunk(
  'conference/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/conference/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const conferenceSlice = createSlice({
  name: 'conference',
  initialState,
  reducers: {
    setConferenceFilters(state, action: PayloadAction<Partial<ConferenceFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      state.filters.page = 1; // Reset to first page when filters change
    },
    resetConferenceFilters(state) {
      state.filters = {
        page: 1,
        limit: 20,
        sort_by: 'serial_number',
        sort_order: 'DESC',
      };
    },
    setSelectedConference(state, action: PayloadAction<ConferenceRequest>) {
      state.selectedConference = action.payload;
    },
    clearSelectedConference(state) {
      state.selectedConference = null;
    },
    clearConferenceStats(state) {
      state.stats = null;
    },
    clearConferenceError(state) {
      state.error = null;
    },
    clearConferenceSuccess(state) {
      state.success = false;
    },
    clearActionState(state, action: PayloadAction<string>) {
      delete state.actionLoading[action.payload];
      delete state.actionError[action.payload];
    },
    resetConferenceState: () => initialState,
  },
  extraReducers: (builder) => {
    // ---------- FETCH ALL ----------
    builder
      .addCase(fetchConferences.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchConferences.fulfilled, (state, action) => {
        state.loading.list = false;
        state.conferences = action.payload.data;
        state.filters.page = action.payload.page;
        state.filters.limit = action.payload.limit;
        state.pagination.total = action.payload.total;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchConferences.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    // ---------- FETCH BY ID ----------
    builder
      .addCase(fetchConferenceById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchConferenceById.fulfilled, (state, action: PayloadAction<ConferenceRequest>) => {
        state.loading.detail = false;
        state.selectedConference = action.payload;
      })
      .addCase(fetchConferenceById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    // ---------- STATS ----------
    builder
      .addCase(fetchConferenceStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchConferenceStats.fulfilled, (state, action: PayloadAction<ConferenceStats>) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchConferenceStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload as string;
      });

    // ---------- CREATE ----------
    builder
      .addCase(createConference.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createConference.fulfilled, (state, action: PayloadAction<ConferenceRequest>) => {
        state.loading.mutating = false;
        state.success = true;
        state.conferences = [action.payload, ...state.conferences];
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / getLimit(state.filters));
      })
      .addCase(createConference.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ---------- UPDATE ----------
    builder
      .addCase(updateConference.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateConference.fulfilled, (state, action: PayloadAction<ConferenceRequest>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.conferences.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.conferences[index] = action.payload;
        if (state.selectedConference?.id === action.payload.id) {
          state.selectedConference = action.payload;
        }
      })
      .addCase(updateConference.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ---------- SUBMIT ----------
    builder
      .addCase(submitConference.pending, (state, action) => {
        state.actionLoading[`submit-${action.meta.arg}`] = true;
        state.actionError[`submit-${action.meta.arg}`] = null;
      })
      .addCase(submitConference.fulfilled, (state, action: PayloadAction<ConferenceRequest>) => {
        state.actionLoading[`submit-${action.payload.id}`] = false;
        const index = state.conferences.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.conferences[index] = action.payload;
        if (state.selectedConference?.id === action.payload.id) {
          state.selectedConference = action.payload;
        }
      })
      .addCase(submitConference.rejected, (state, action) => {
        state.actionLoading[`submit-${action.meta.arg}`] = false;
        state.actionError[`submit-${action.meta.arg}`] = action.payload as string;
      });

    // ---------- APPROVE ----------
    builder
      .addCase(approveConference.pending, (state, action) => {
        state.actionLoading[`approve-${action.meta.arg.id}`] = true;
        state.actionError[`approve-${action.meta.arg.id}`] = null;
      })
      .addCase(approveConference.fulfilled, (state, action: PayloadAction<ConferenceRequest>) => {
        state.actionLoading[`approve-${action.payload.id}`] = false;
        const index = state.conferences.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.conferences[index] = action.payload;
        if (state.selectedConference?.id === action.payload.id) {
          state.selectedConference = action.payload;
        }
      })
      .addCase(approveConference.rejected, (state, action) => {
        state.actionLoading[`approve-${action.meta.arg.id}`] = false;
        state.actionError[`approve-${action.meta.arg.id}`] = action.payload as string;
      });

    // ---------- RETURN ----------
    builder
      .addCase(returnConference.pending, (state, action) => {
        state.actionLoading[`return-${action.meta.arg.id}`] = true;
        state.actionError[`return-${action.meta.arg.id}`] = null;
      })
      .addCase(returnConference.fulfilled, (state, action: PayloadAction<ConferenceRequest>) => {
        state.actionLoading[`return-${action.payload.id}`] = false;
        const index = state.conferences.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.conferences[index] = action.payload;
        if (state.selectedConference?.id === action.payload.id) {
          state.selectedConference = action.payload;
        }
      })
      .addCase(returnConference.rejected, (state, action) => {
        state.actionLoading[`return-${action.meta.arg.id}`] = false;
        state.actionError[`return-${action.meta.arg.id}`] = action.payload as string;
      });

    // ---------- COMPLETE ----------
    builder
      .addCase(completeConference.pending, (state, action) => {
        state.actionLoading[`complete-${action.meta.arg.id}`] = true;
        state.actionError[`complete-${action.meta.arg.id}`] = null;
      })
      .addCase(completeConference.fulfilled, (state, action: PayloadAction<ConferenceRequest>) => {
        state.actionLoading[`complete-${action.payload.id}`] = false;
        const index = state.conferences.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.conferences[index] = action.payload;
        if (state.selectedConference?.id === action.payload.id) {
          state.selectedConference = action.payload;
        }
      })
      .addCase(completeConference.rejected, (state, action) => {
        state.actionLoading[`complete-${action.meta.arg.id}`] = false;
        state.actionError[`complete-${action.meta.arg.id}`] = action.payload as string;
      });

    // ---------- CANCEL ----------
    builder
      .addCase(cancelConference.pending, (state, action) => {
        state.actionLoading[`cancel-${action.meta.arg.id}`] = true;
        state.actionError[`cancel-${action.meta.arg.id}`] = null;
      })
      .addCase(cancelConference.fulfilled, (state, action: PayloadAction<ConferenceRequest>) => {
        state.actionLoading[`cancel-${action.payload.id}`] = false;
        const index = state.conferences.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.conferences[index] = action.payload;
        if (state.selectedConference?.id === action.payload.id) {
          state.selectedConference = action.payload;
        }
      })
      .addCase(cancelConference.rejected, (state, action) => {
        state.actionLoading[`cancel-${action.meta.arg.id}`] = false;
        state.actionError[`cancel-${action.meta.arg.id}`] = action.payload as string;
      });

    // ---------- DELETE ----------
    builder
      .addCase(deleteConference.pending, (state, action) => {
        state.actionLoading[`delete-${action.meta.arg}`] = true;
        state.actionError[`delete-${action.meta.arg}`] = null;
      })
      .addCase(deleteConference.fulfilled, (state, action: PayloadAction<string>) => {
        state.actionLoading[`delete-${action.payload}`] = false;
        state.conferences = state.conferences.filter((c) => c.id !== action.payload);
        if (state.selectedConference?.id === action.payload) {
          state.selectedConference = null;
        }
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / getLimit(state.filters));
      })
      .addCase(deleteConference.rejected, (state, action) => {
        state.actionLoading[`delete-${action.meta.arg}`] = false;
        state.actionError[`delete-${action.meta.arg}`] = action.payload as string;
      });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setConferenceFilters,
  resetConferenceFilters,
  setSelectedConference,
  clearSelectedConference,
  clearConferenceStats,
  clearConferenceError,
  clearConferenceSuccess,
  clearActionState,
  resetConferenceState,
} = conferenceSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllConferences = (state: { conference: ConferenceState }) =>
  state.conference.conferences;

export const selectSelectedConference = (state: { conference: ConferenceState }) =>
  state.conference.selectedConference;

export const selectConferenceStats = (state: { conference: ConferenceState }) =>
  state.conference.stats;

export const selectConferenceFilters = (state: { conference: ConferenceState }) =>
  state.conference.filters;

export const selectConferenceLoading = (state: { conference: ConferenceState }) =>
  state.conference.loading;

export const selectConferenceListLoading = (state: { conference: ConferenceState }) =>
  state.conference.loading.list;

export const selectConferenceDetailLoading = (state: { conference: ConferenceState }) =>
  state.conference.loading.detail;

export const selectConferenceStatsLoading = (state: { conference: ConferenceState }) =>
  state.conference.loading.stats;

export const selectConferenceMutating = (state: { conference: ConferenceState }) =>
  state.conference.loading.mutating;

export const selectConferenceError = (state: { conference: ConferenceState }) =>
  state.conference.error;

export const selectConferenceSuccess = (state: { conference: ConferenceState }) =>
  state.conference.success;

export const selectConferenceActionLoading = (state: { conference: ConferenceState }) =>
  state.conference.actionLoading;

export const selectConferenceActionError = (state: { conference: ConferenceState }) =>
  state.conference.actionError;

export const selectConferencePagination = (state: { conference: ConferenceState }) => ({
  total: state.conference.pagination.total,
  totalPages: state.conference.pagination.totalPages,
  page: state.conference.filters.page ?? 1,
  limit: getLimit(state.conference.filters),
});

export const selectConferenceById = (id: string) =>
  createSelector(
    [selectAllConferences],
    (conferences) => conferences.find((c) => c.id === id) ?? null
  );

export const selectConferenceByStatus = (status: string) =>
  createSelector(
    [selectAllConferences],
    (conferences) => conferences.filter((c) => c.status === status)
  );

export const selectConferenceStatsSummary = createSelector(
  [selectConferenceStats],
  (stats) => {
    if (!stats) return null;
    return {
      total: stats.total,
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected,
      completed: stats.completed,
      cancelled: stats.cancelled,
      draft: stats.draft,
      ongoing: stats.ongoing,
      upcoming: stats.upcoming,
      totalPax: stats.total_pax,
    };
  }
);

// Check if any loading is in progress
export const selectConferenceIsLoading = (state: { conference: ConferenceState }) =>
  state.conference.loading.list ||
  state.conference.loading.detail ||
  state.conference.loading.stats ||
  state.conference.loading.mutating ||
  Object.values(state.conference.actionLoading).some((v) => v === true);

export default conferenceSlice.reducer;