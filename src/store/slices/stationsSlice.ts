// src/store/slices/stationsSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */

export type StationType =
  | 'high_court'
  | 'magistrate_court'
  | 'environment_court'
  | 'kadhis_court'
  | 'sub_registry';

export interface Station {
  id:         string;
  ref_no:     string | null;  // e.g., "RHC/MSB/22" for courts, null for sub-registries
  name:       string;
  type:       StationType;
  location:   string | null;
  is_active:  boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStationInput {
  ref_no?:   string;   // Required for courts, optional for sub-registries
  name:      string;
  type:      StationType;
  location?: string;
}

export interface UpdateStationInput {
  ref_no?:    string;
  name?:      string;
  type?:      StationType;
  location?:  string | null;
  is_active?: boolean;
}

export interface StationFilters {
  search?:     string;
  type?:       StationType;
  is_active?:  boolean;
  has_ref?:    boolean;  // Filter stations with/without reference numbers
  page?:       number;
  limit?:      number;
  sort_by?:    'name' | 'type' | 'created_at' | 'ref_no';
  sort_order?: 'ASC' | 'DESC';
}

export interface StationPaginationResponse {
  data:       Station[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

interface StationState {
  stations:        Station[];
  selectedStation: Station | null;
  pagination: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
  filters:  StationFilters;
  loading: {
    list:     boolean;
    detail:   boolean;
    mutating: boolean;
  };
  error:   string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: StationState = {
  stations:        [],
  selectedStation: null,
  pagination: {
    total:      0,
    page:       1,
    limit:      20,
    totalPages: 0,
  },
  filters: {
    page:       1,
    limit:      20,
    sort_by:    'name',
    sort_order: 'ASC',
  },
  loading: {
    list:     false,
    detail:   false,
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

export const fetchStations = createAsyncThunk(
  'stations/fetchAll',
  async (filters: StationFilters, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const response = await axiosClient.get(`/stations?${params.toString()}`);
      return response.data.data as StationPaginationResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchStationById = createAsyncThunk(
  'stations/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/stations/${id}`);
      return response.data.data as Station;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchStationByRefNo = createAsyncThunk(
  'stations/fetchByRefNo',
  async (refNo: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/stations/ref/${encodeURIComponent(refNo)}`);
      return response.data.data as Station;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchActiveStations = createAsyncThunk(
  'stations/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/stations/active');
      return response.data.data as Station[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchCourtStations = createAsyncThunk(
  'stations/fetchCourt',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/stations/courts');
      return response.data.data as Station[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchStationsByType = createAsyncThunk(
  'stations/fetchByType',
  async (type: StationType, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/stations/type/${type}`);
      return response.data.data as Station[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createStation = createAsyncThunk(
  'stations/create',
  async (data: CreateStationInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/stations', data);
      return response.data.data as Station;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateStation = createAsyncThunk(
  'stations/update',
  async ({ id, data }: { id: string; data: UpdateStationInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/stations/${id}`, data);
      return response.data.data as Station;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteStation = createAsyncThunk(
  'stations/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/stations/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const stationsSlice = createSlice({
  name: 'stations',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<StationFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = {
        page:       1,
        limit:      20,
        sort_by:    'name',
        sort_order: 'ASC',
      };
    },
    clearSelectedStation(state) { state.selectedStation = null; },
    clearError(state)           { state.error = null; },
    clearSuccess(state)         { state.success = false; },
    resetStationState: ()       => initialState,
  },
  extraReducers: (builder) => {
    /* ---------- FETCH ALL ---------- */
    builder
      .addCase(fetchStations.pending,   (state) => { state.loading.list = true;  state.error = null; })
      .addCase(fetchStations.fulfilled, (state, action: PayloadAction<StationPaginationResponse>) => {
        state.loading.list = false;
        state.stations     = action.payload.data;
        state.pagination   = {
          total:      action.payload.total,
          page:       action.payload.page,
          limit:      action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchStations.rejected,  (state, action) => { state.loading.list = false; state.error = action.payload as string; });

    /* ---------- FETCH BY ID ---------- */
    builder
      .addCase(fetchStationById.pending,   (state) => { state.loading.detail = true;  state.error = null; })
      .addCase(fetchStationById.fulfilled, (state, action: PayloadAction<Station>) => { 
        state.loading.detail = false; 
        state.selectedStation = action.payload; 
      })
      .addCase(fetchStationById.rejected,  (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- FETCH BY REF NO ---------- */
    builder
      .addCase(fetchStationByRefNo.pending,   (state) => { state.loading.detail = true;  state.error = null; })
      .addCase(fetchStationByRefNo.fulfilled, (state, action: PayloadAction<Station>) => { 
        state.loading.detail = false; 
        state.selectedStation = action.payload; 
      })
      .addCase(fetchStationByRefNo.rejected,  (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- FETCH ACTIVE ---------- */
    builder
      .addCase(fetchActiveStations.pending,   (state) => { state.loading.list = true;  state.error = null; })
      .addCase(fetchActiveStations.fulfilled, (state, action: PayloadAction<Station[]>) => {
        state.loading.list = false;
        state.stations = action.payload;
        state.pagination.total = action.payload.length;
        state.pagination.totalPages = 1;
      })
      .addCase(fetchActiveStations.rejected,  (state, action) => { state.loading.list = false; state.error = action.payload as string; });

    /* ---------- FETCH COURT ---------- */
    builder
      .addCase(fetchCourtStations.pending,   (state) => { state.loading.list = true;  state.error = null; })
      .addCase(fetchCourtStations.fulfilled, (state, action: PayloadAction<Station[]>) => {
        state.loading.list = false;
        state.stations = action.payload;
        state.pagination.total = action.payload.length;
        state.pagination.totalPages = 1;
      })
      .addCase(fetchCourtStations.rejected,  (state, action) => { state.loading.list = false; state.error = action.payload as string; });

    /* ---------- FETCH BY TYPE ---------- */
    builder
      .addCase(fetchStationsByType.pending,   (state) => { state.loading.list = true;  state.error = null; })
      .addCase(fetchStationsByType.fulfilled, (state, action: PayloadAction<Station[]>) => {
        state.loading.list = false;
        state.stations = action.payload;
        state.pagination.total = action.payload.length;
        state.pagination.totalPages = 1;
      })
      .addCase(fetchStationsByType.rejected,  (state, action) => { state.loading.list = false; state.error = action.payload as string; });

    /* ---------- CREATE ---------- */
    builder
      .addCase(createStation.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(createStation.fulfilled, (state, action: PayloadAction<Station>) => {
        state.loading.mutating  = false;
        state.success           = true;
        state.stations          = [action.payload, ...state.stations];
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(createStation.rejected,  (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- UPDATE ---------- */
    builder
      .addCase(updateStation.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(updateStation.fulfilled, (state, action: PayloadAction<Station>) => {
        state.loading.mutating = false;
        state.success          = true;
        const index = state.stations.findIndex((s) => s.id === action.payload.id);
        if (index !== -1)                                   state.stations[index]    = action.payload;
        if (state.selectedStation?.id === action.payload.id) state.selectedStation = action.payload;
      })
      .addCase(updateStation.rejected,  (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- DELETE ---------- */
    builder
      .addCase(deleteStation.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(deleteStation.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating  = false;
        state.success           = true;
        state.stations          = state.stations.filter((s) => s.id !== action.payload);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.selectedStation?.id === action.payload) state.selectedStation = null;
      })
      .addCase(deleteStation.rejected,  (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setFilters, resetFilters, clearSelectedStation,
  clearError, clearSuccess, resetStationState,
} = stationsSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllStations          = (state: { stations: StationState }) => state.stations.stations;
export const selectSelectedStation      = (state: { stations: StationState }) => state.stations.selectedStation;
export const selectStationPagination    = (state: { stations: StationState }) => state.stations.pagination;
export const selectStationFilters       = (state: { stations: StationState }) => state.stations.filters;
export const selectStationsListLoading  = (state: { stations: StationState }) => state.stations.loading.list;
export const selectStationsDetailLoading= (state: { stations: StationState }) => state.stations.loading.detail;
export const selectStationsMutating     = (state: { stations: StationState }) => state.stations.loading.mutating;
export const selectStationsError        = (state: { stations: StationState }) => state.stations.error;
export const selectStationsSuccess      = (state: { stations: StationState }) => state.stations.success;
export const selectTotalStations        = (state: { stations: StationState }) => state.stations.pagination.total;

// ── Derived selectors ─────────────────────────────────────────────────────────

export const selectActiveStations = (state: { stations: StationState }) =>
  state.stations.stations.filter((s) => s.is_active);

export const selectStationsByType = (type: StationType) => (state: { stations: StationState }) =>
  state.stations.stations.filter((s) => s.type === type);

export const selectStationsWithRef = (state: { stations: StationState }) =>
  state.stations.stations.filter((s) => s.ref_no !== null);

export const selectStationsWithoutRef = (state: { stations: StationState }) =>
  state.stations.stations.filter((s) => s.ref_no === null);

export const selectCourtStations = (state: { stations: StationState }) =>
  state.stations.stations.filter((s) => s.type !== 'sub_registry');

export const selectStationByRefNo = (refNo: string) => (state: { stations: StationState }) =>
  state.stations.stations.find((s) => s.ref_no === refNo);

export const selectStationsByTypeWithRef = (type: StationType) => (state: { stations: StationState }) =>
  state.stations.stations.filter((s) => s.type === type && s.ref_no !== null);

export default stationsSlice.reducer;