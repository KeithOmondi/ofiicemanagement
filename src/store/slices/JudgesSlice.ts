// src/store/slices/judgesSlice.ts

import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';
import type {
  Judge,
  CreateJudgeInput,
  UpdateJudgeInput,
  JudgeFilters,
  JudgePaginationResponse,
  JudgeStats,
} from '../../types/judges.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface JudgesState {
  judges: Judge[];
  currentJudge: Judge | null;
  stats: JudgeStats | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  actionInProgress: {
    creating?: boolean;
    updating?: string;
    deleting?: string;
  };
}

const initialState: JudgesState = {
  judges: [],
  currentJudge: null,
  stats: null,
  loading: false,
  error: null,
  pagination: null,
  actionInProgress: {},
};

// ─── Utility ──────────────────────────────────────────────────────────────────

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string;
    }>;
    return (
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      'Request failed'
    );
  }
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

// ── Fetch all judges (paginated) ──────────────────────────────────────────
export const fetchJudges = createAsyncThunk(
  'judges/fetchJudges',
  async (filters: JudgeFilters = {}, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: JudgePaginationResponse;
      }>('/judges', { params: filters });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Fetch judge by ID ──────────────────────────────────────────────────────
export const fetchJudgeById = createAsyncThunk(
  'judges/fetchJudgeById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: Judge;
      }>(`/judges/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Fetch judge by PJ Number ──────────────────────────────────────────────
export const fetchJudgeByPJNumber = createAsyncThunk(
  'judges/fetchJudgeByPJNumber',
  async (pjNumber: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: Judge;
      }>(`/judges/pj/${pjNumber}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Search judges by name ─────────────────────────────────────────────────
export const searchJudges = createAsyncThunk(
  'judges/searchJudges',
  async (searchTerm: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: Judge[];
      }>('/judges/search', { params: { q: searchTerm } });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Fetch judge stats ──────────────────────────────────────────────────────
export const fetchJudgeStats = createAsyncThunk(
  'judges/fetchJudgeStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: JudgeStats;
      }>('/judges/stats');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Create judge ────────────────────────────────────────────────────────────
export const createJudge = createAsyncThunk(
  'judges/createJudge',
  async (input: CreateJudgeInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Judge;
      }>('/judges', input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Update judge ────────────────────────────────────────────────────────────
export const updateJudge = createAsyncThunk(
  'judges/updateJudge',
  async (
    { id, input }: { id: string; input: UpdateJudgeInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.put<{
        success: boolean;
        data: Judge;
      }>(`/judges/${id}`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Delete judge ────────────────────────────────────────────────────────────
export const deleteJudge = createAsyncThunk(
  'judges/deleteJudge',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/judges/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const judgesSlice = createSlice({
  name: 'judges',
  initialState,
  reducers: {
    clearCurrentJudge: (state) => {
      state.currentJudge = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetJudgesState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ── fetchJudges ──────────────────────────────────────────────────────
      .addCase(fetchJudges.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchJudges.fulfilled,
        (state, action: PayloadAction<JudgePaginationResponse>) => {
          state.loading = false;
          state.judges = action.payload.data;
          state.pagination = {
            total: action.payload.total,
            page: action.payload.page,
            limit: action.payload.limit,
            totalPages: action.payload.totalPages,
          };
        }
      )
      .addCase(fetchJudges.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchJudgeById ──────────────────────────────────────────────────
      .addCase(fetchJudgeById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchJudgeById.fulfilled,
        (state, action: PayloadAction<Judge>) => {
          state.loading = false;
          state.currentJudge = action.payload;
        }
      )
      .addCase(fetchJudgeById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchJudgeByPJNumber ────────────────────────────────────────────
      .addCase(fetchJudgeByPJNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchJudgeByPJNumber.fulfilled,
        (state, action: PayloadAction<Judge>) => {
          state.loading = false;
          state.currentJudge = action.payload;
        }
      )
      .addCase(fetchJudgeByPJNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── searchJudges ────────────────────────────────────────────────────
      .addCase(searchJudges.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        searchJudges.fulfilled,
        (state, action: PayloadAction<Judge[]>) => {
          state.loading = false;
          state.judges = action.payload;
        }
      )
      .addCase(searchJudges.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchJudgeStats ─────────────────────────────────────────────────
      .addCase(fetchJudgeStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchJudgeStats.fulfilled,
        (state, action: PayloadAction<JudgeStats>) => {
          state.loading = false;
          state.stats = action.payload;
        }
      )
      .addCase(fetchJudgeStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── createJudge ─────────────────────────────────────────────────────
      .addCase(createJudge.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.actionInProgress.creating = true;
      })
      .addCase(
        createJudge.fulfilled,
        (state, action: PayloadAction<Judge>) => {
          state.loading = false;
          state.actionInProgress.creating = false;
          state.judges = [action.payload, ...state.judges];
          // Update stats if available
          if (state.stats) {
            state.stats.total += 1;
            state.stats.active += 1;
          }
        }
      )
      .addCase(createJudge.rejected, (state, action) => {
        state.loading = false;
        state.actionInProgress.creating = false;
        state.error = action.payload as string;
      })

      // ── updateJudge ─────────────────────────────────────────────────────
      .addCase(updateJudge.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.actionInProgress.updating = action.meta.arg.id;
      })
      .addCase(
        updateJudge.fulfilled,
        (state, action: PayloadAction<Judge>) => {
          state.loading = false;
          state.actionInProgress.updating = undefined;
          
          // Update in the list
          const index = state.judges.findIndex((j) => j.id === action.payload.id);
          if (index !== -1) {
            state.judges[index] = action.payload;
          }
          
          // Update current judge if it's the same
          if (state.currentJudge?.id === action.payload.id) {
            state.currentJudge = action.payload;
          }
        }
      )
      .addCase(updateJudge.rejected, (state, action) => {
        state.loading = false;
        state.actionInProgress.updating = undefined;
        state.error = action.payload as string;
      })

      // ── deleteJudge ─────────────────────────────────────────────────────
      .addCase(deleteJudge.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.actionInProgress.deleting = action.meta.arg;
      })
      .addCase(
        deleteJudge.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          state.actionInProgress.deleting = undefined;
          state.judges = state.judges.filter((j) => j.id !== action.payload);
          
          if (state.currentJudge?.id === action.payload) {
            state.currentJudge = null;
          }
          
          // Update stats if available
          if (state.stats) {
            state.stats.total -= 1;
            // Check if the deleted judge was active
            const deletedJudge = state.judges.find((j) => j.id === action.payload);
            if (deletedJudge?.is_active) {
              state.stats.active -= 1;
            } else {
              state.stats.inactive -= 1;
            }
          }
        }
      )
      .addCase(deleteJudge.rejected, (state, action) => {
        state.loading = false;
        state.actionInProgress.deleting = undefined;
        state.error = action.payload as string;
      });
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────

export const {
  clearCurrentJudge,
  clearError,
  resetJudgesState,
} = judgesSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllJudges = (state: { judges: JudgesState }) =>
  state.judges.judges;

export const selectCurrentJudge = (state: { judges: JudgesState }) =>
  state.judges.currentJudge;

export const selectJudgeStats = (state: { judges: JudgesState }) =>
  state.judges.stats;

export const selectJudgesLoading = (state: { judges: JudgesState }) =>
  state.judges.loading;

export const selectJudgesError = (state: { judges: JudgesState }) =>
  state.judges.error;

export const selectJudgesPagination = (state: { judges: JudgesState }) =>
  state.judges.pagination;

export const selectIsCreatingJudge = (state: { judges: JudgesState }) =>
  state.judges.actionInProgress.creating || false;

export const selectIsUpdatingJudge = (state: { judges: JudgesState }) =>
  state.judges.actionInProgress.updating || null;

export const selectIsDeletingJudge = (state: { judges: JudgesState }) =>
  state.judges.actionInProgress.deleting || null;

export type { JudgesState };

export default judgesSlice.reducer;