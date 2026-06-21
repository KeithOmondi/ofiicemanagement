// src/store/slices/registrySlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';
import type {
  RegistryEntry,
  RegistryPaginationResponse,
  StationWithFileCount,
  RouteFileInput,
  ReturnFileInput,
  RegistryFilters,
} from '../../types/registry.types';

/* ============================================================
   STATE
============================================================ */

interface RegistryState {
  entries:        RegistryEntry[];
  selectedEntry:  RegistryEntry | null;
  history:        RegistryEntry[];       // route history for one document
  historyDocId:   string | null;         // which document `history` belongs to
  stationCounts:  StationWithFileCount[];
  pagination: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
  filters: RegistryFilters;
  loading: {
    list:     boolean;
    detail:   boolean;
    history:  boolean;
    counts:   boolean;
    mutating: boolean; // routeFile / receiveFile / markFiled / returnFile
  };
  error:   string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: RegistryState = {
  entries:       [],
  selectedEntry: null,
  history:       [],
  historyDocId:  null,
  stationCounts: [],
  pagination: {
    total:      0,
    page:       1,
    limit:      100, // Updated: max allowed by backend (was 20)
    totalPages: 0,
  },
  filters: {
    page:       1,
    limit:      100, // Updated: max allowed by backend (was 20)
    sort_by:    'routed_at',
    sort_order: 'DESC',
  },
  loading: {
    list:     false,
    detail:   false,
    history:  false,
    counts:   false,
    mutating: false,
  },
  error:   null,
  success: false,
};

/* ============================================================
   HELPERS
============================================================ */

const extractErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

/* ============================================================
   ASYNC THUNKS
============================================================ */

export const routeFile = createAsyncThunk(
  'registry/routeFile',
  async (input: RouteFileInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/registry', input);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchRegistryEntries = createAsyncThunk(
  'registry/fetchAll',
  async (filters: RegistryFilters, { rejectWithValue }) => {
    try {
      // Ensure limit never exceeds the backend maximum of 100
      const safeFilters = {
        ...filters,
        limit: Math.min(filters.limit || 100, 100),
      };

      const params = new URLSearchParams();
      Object.entries(safeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const response = await axiosClient.get(`/registry?${params.toString()}`);
      return response.data.data as RegistryPaginationResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchRegistryEntryById = createAsyncThunk(
  'registry/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/${id}`);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchRegistryHistory = createAsyncThunk(
  'registry/fetchHistory',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/document/${documentId}/history`);
      return { documentId, history: response.data.data as RegistryEntry[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchStationCounts = createAsyncThunk(
  'registry/fetchStationCounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/registry/stations/counts');
      return response.data.data as StationWithFileCount[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const receiveFile = createAsyncThunk(
  'registry/receiveFile',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/registry/${id}/receive`);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const markFiled = createAsyncThunk(
  'registry/markFiled',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/registry/${id}/file`);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const returnFile = createAsyncThunk(
  'registry/returnFile',
  async ({ id, input }: { id: string; input: ReturnFileInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/registry/${id}/return`, input);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const registrySlice = createSlice({
  name: 'registry',
  initialState,
  reducers: {
    setRegistryFilters(state, action: PayloadAction<Partial<RegistryFilters>>) {
      // Ensure limit never exceeds 100 when setting filters
      const newFilters = { ...action.payload };
      if (newFilters.limit && newFilters.limit > 100) {
        newFilters.limit = 100;
      }
      state.filters = { ...state.filters, ...newFilters };
    },
    resetRegistryFilters(state) {
      state.filters = {
        page:       1,
        limit:      100, // Updated: max allowed by backend (was 20)
        sort_by:    'routed_at',
        sort_order: 'DESC',
      };
    },
    clearSelectedEntry(state) { state.selectedEntry = null; },
    clearHistory(state)       { state.history = []; state.historyDocId = null; },
    clearError(state)         { state.error = null; },
    clearSuccess(state)       { state.success = false; },
    resetRegistryState: ()    => initialState,
  },
  extraReducers: (builder) => {
    /* ---------- ROUTE FILE ---------- */
    builder
      .addCase(routeFile.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(routeFile.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.mutating = false;
        state.success          = true;
        state.entries          = [action.payload, ...state.entries];
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        // The station-counts grid is now stale (one station +1, possibly
        // another -1 if the document was already on record elsewhere) —
        // callers should re-dispatch fetchStationCounts() after this resolves.
      })
      .addCase(routeFile.rejected,  (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- FETCH ALL ---------- */
    builder
      .addCase(fetchRegistryEntries.pending,   (state) => { state.loading.list = true;  state.error = null; })
      .addCase(fetchRegistryEntries.fulfilled, (state, action: PayloadAction<RegistryPaginationResponse>) => {
        state.loading.list = false;
        state.entries       = action.payload.data;
        state.pagination    = {
          total:      action.payload.total,
          page:       action.payload.page,
          limit:      action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchRegistryEntries.rejected,  (state, action) => { state.loading.list = false; state.error = action.payload as string; });

    /* ---------- FETCH BY ID ---------- */
    builder
      .addCase(fetchRegistryEntryById.pending,   (state) => { state.loading.detail = true;  state.error = null; })
      .addCase(fetchRegistryEntryById.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.detail = false;
        state.selectedEntry  = action.payload;
      })
      .addCase(fetchRegistryEntryById.rejected,  (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- FETCH HISTORY ---------- */
    builder
      .addCase(fetchRegistryHistory.pending,   (state) => { state.loading.history = true;  state.error = null; })
      .addCase(fetchRegistryHistory.fulfilled, (state, action: PayloadAction<{ documentId: string; history: RegistryEntry[] }>) => {
        state.loading.history = false;
        state.history         = action.payload.history;
        state.historyDocId    = action.payload.documentId;
      })
      .addCase(fetchRegistryHistory.rejected,  (state, action) => { state.loading.history = false; state.error = action.payload as string; });

    /* ---------- FETCH STATION COUNTS ---------- */
    builder
      .addCase(fetchStationCounts.pending,   (state) => { state.loading.counts = true;  state.error = null; })
      .addCase(fetchStationCounts.fulfilled, (state, action: PayloadAction<StationWithFileCount[]>) => {
        state.loading.counts = false;
        state.stationCounts  = action.payload;
      })
      .addCase(fetchStationCounts.rejected,  (state, action) => { state.loading.counts = false; state.error = action.payload as string; });

    /* ---------- RECEIVE FILE ---------- */
    builder
      .addCase(receiveFile.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(receiveFile.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.mutating = false;
        state.success          = true;
        const index = state.entries.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) state.entries[index] = action.payload;
        if (state.selectedEntry?.id === action.payload.id) state.selectedEntry = action.payload;
      })
      .addCase(receiveFile.rejected,  (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- MARK FILED ---------- */
    builder
      .addCase(markFiled.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(markFiled.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.mutating = false;
        state.success          = true;
        const index = state.entries.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) state.entries[index] = action.payload;
        if (state.selectedEntry?.id === action.payload.id) state.selectedEntry = action.payload;
      })
      .addCase(markFiled.rejected,  (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- RETURN FILE ---------- */
    builder
      .addCase(returnFile.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(returnFile.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.mutating = false;
        state.success          = true;
        const index = state.entries.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) state.entries[index] = action.payload;
        if (state.selectedEntry?.id === action.payload.id) state.selectedEntry = action.payload;
        // This document is no longer active at that station — counts are stale,
        // same as routeFile: re-dispatch fetchStationCounts() in the component.
      })
      .addCase(returnFile.rejected,  (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setRegistryFilters, resetRegistryFilters,
  clearSelectedEntry, clearHistory,
  clearError, clearSuccess, resetRegistryState,
} = registrySlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllRegistryEntries  = (state: { registry: RegistryState }) => state.registry.entries;
export const selectSelectedEntry       = (state: { registry: RegistryState }) => state.registry.selectedEntry;
export const selectRegistryHistory     = (state: { registry: RegistryState }) => state.registry.history;
export const selectRegistryHistoryDocId= (state: { registry: RegistryState }) => state.registry.historyDocId;
export const selectStationCounts       = (state: { registry: RegistryState }) => state.registry.stationCounts;
export const selectRegistryPagination  = (state: { registry: RegistryState }) => state.registry.pagination;
export const selectRegistryFilters     = (state: { registry: RegistryState }) => state.registry.filters;
export const selectRegistryListLoading = (state: { registry: RegistryState }) => state.registry.loading.list;
export const selectRegistryDetailLoading = (state: { registry: RegistryState }) => state.registry.loading.detail;
export const selectRegistryHistoryLoading = (state: { registry: RegistryState }) => state.registry.loading.history;
export const selectStationCountsLoading  = (state: { registry: RegistryState }) => state.registry.loading.counts;
export const selectRegistryMutating    = (state: { registry: RegistryState }) => state.registry.loading.mutating;
export const selectRegistryError       = (state: { registry: RegistryState }) => state.registry.error;
export const selectRegistrySuccess     = (state: { registry: RegistryState }) => state.registry.success;

export default registrySlice.reducer;