// src/store/slices/dashboardSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';
import type { DashboardStats } from '../../types/dashboard.types';

// ─── State Interface ─────────────────────────────────────────────────────────

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: DashboardState = {
  stats: null,
  loading: false,
  error: null,
  lastFetched: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const extractErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

// ─── Async Thunks ────────────────────────────────────────────────────────────

/**
 * Fetch all dashboard statistics from the backend
 * This replaces multiple individual API calls
 */
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/dashboard/stats');
      return response.data.data as DashboardStats;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null;
    },
    clearDashboardStats: (state) => {
      state.stats = null;
      state.lastFetched = null;
    },
    resetDashboardState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch Dashboard Stats ──────────────────────────────────────────────
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action: PayloadAction<DashboardStats>) => {
        state.loading = false;
        state.stats = action.payload;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export const {
  clearDashboardError,
  clearDashboardStats,
  resetDashboardState,
} = dashboardSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectDashboardStats = (state: { dashboard: DashboardState }) => state.dashboard.stats;
export const selectDashboardLoading = (state: { dashboard: DashboardState }) => state.dashboard.loading;
export const selectDashboardError = (state: { dashboard: DashboardState }) => state.dashboard.error;
export const selectDashboardLastFetched = (state: { dashboard: DashboardState }) => state.dashboard.lastFetched;

// ─── Derived Selectors ──────────────────────────────────────────────────────

export const selectDocumentStats = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.documents || null;

export const selectUserStats = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.users || null;

export const selectRegistryStats = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.registry || null;

export const selectNoticeStats = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.notices || null;

export const selectInventoryStats = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.inventory || null;

export const selectFinancialStats = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.financial || null;

export const selectDSAStats = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.dsa || null;

export const selectMessageStats = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.messages || null;

export const selectTotalDocuments = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.documents.total || 0;

export const selectActiveDocuments = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.documents.active || 0;

export const selectAssignedDocuments = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.documents.assigned.total || 0;

export const selectTotalUsers = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.users.total || 0;

export const selectActiveUsers = (state: { dashboard: DashboardState }) => 
  state.dashboard.stats?.users.active || 0;

export default dashboardSlice.reducer;