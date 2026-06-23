// src/store/slices/dsaSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */

export interface DsaActivity {
  id:          string;
  name:        string;
  date_from:   string;
  date_to:     string;
  night_outs:  number;
  created_by:  string | null;
  is_active:   boolean;
  created_at:  string;
  updated_at:  string;
  staff_count: number;
  total_kes:   number;
}

export interface DsaStaffEntry {
  id:             string;
  activity_id:    string;
  activity_name:  string;
  date_from:      string;
  date_to:        string;
  user_id:        string;
  full_name:      string;
  rate_per_night: number;
  night_outs:     number;
  total_kes:      number;
  created_at:     string;
  updated_at:     string;
}

export interface DsaStats {
  total_activities:  number;
  total_night_outs:  number;
  staff_involved:    number;
  total_kes_payable: number;
}

export interface StaffEquitySuggestion {
  user_id:          string;
  full_name:        string;
  total_nights:     number;
  total_activities: number;
  last_sent:        string | null;
}

export interface CreateActivityInput {
  name:      string;
  date_from: string;
  date_to:   string;
}

export interface UpdateActivityInput {
  name?:      string;
  date_from?: string;
  date_to?:   string;
  is_active?: boolean;
}

export interface AddStaffEntryInput {
  user_id:        string;
  rate_per_night: number;
}

export interface UpdateStaffEntryInput {
  rate_per_night: number;
}

interface DsaState {
  activities:        DsaActivity[];
  selectedActivity:  DsaActivity | null;
  entries:           DsaStaffEntry[];
  allEntries:        DsaStaffEntry[];
  stats:             DsaStats | null;
  equitySuggestions: StaffEquitySuggestion[];
  loading: {
    activities: boolean;
    entries:    boolean;
    stats:      boolean;
    equity:     boolean;
    mutating:   boolean;
    export:     boolean;
  };
  error:   string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: DsaState = {
  activities:        [],
  selectedActivity:  null,
  entries:           [],
  allEntries:        [],
  stats:             null,
  equitySuggestions: [],
  loading: {
    activities: false,
    entries:    false,
    stats:      false,
    equity:     false,
    mutating:   false,
    export:     false,
  },
  error:   null,
  success: false,
};

/* ============================================================
   HELPERS
============================================================ */

const extractError = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

/* ============================================================
   THUNKS - STATS
============================================================ */

export const fetchDsaStats = createAsyncThunk(
  'dsa/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/dsa/stats');
      return data.data as DsaStats;
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

/* ============================================================
   THUNKS - ACTIVITIES
============================================================ */

export const fetchActivities = createAsyncThunk(
  'dsa/fetchActivities',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/dsa');
      return data.data as DsaActivity[];
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

export const fetchActivityById = createAsyncThunk(
  'dsa/fetchActivityById',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/dsa/${id}`);
      return data.data as DsaActivity;
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

export const createActivity = createAsyncThunk(
  'dsa/createActivity',
  async (input: CreateActivityInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post('/dsa', input);
      return data.data as DsaActivity;
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

export const updateActivity = createAsyncThunk(
  'dsa/updateActivity',
  async ({ id, input }: { id: string; input: UpdateActivityInput }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.put(`/dsa/${id}`, input);
      return data.data as DsaActivity;
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

export const deleteActivity = createAsyncThunk(
  'dsa/deleteActivity',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/dsa/${id}`);
      return id;
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

/* ============================================================
   THUNKS - STAFF ENTRIES
============================================================ */

export const fetchEntries = createAsyncThunk(
  'dsa/fetchEntries',
  async (activityId: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/dsa/${activityId}/entries`);
      return { activityId, entries: data.data as DsaStaffEntry[] };
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

export const fetchAllEntries = createAsyncThunk(
  'dsa/fetchAllEntries',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/dsa/entries/all');
      return data.data as DsaStaffEntry[];
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

export const addStaffEntry = createAsyncThunk(
  'dsa/addStaffEntry',
  async ({ activityId, input }: { activityId: string; input: AddStaffEntryInput }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`/dsa/${activityId}/entries`, input);
      return data.data as DsaStaffEntry;
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

export const updateStaffEntry = createAsyncThunk(
  'dsa/updateStaffEntry',
  async (
    { activityId, entryId, input }: { activityId: string; entryId: string; input: UpdateStaffEntryInput },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axiosClient.put(`/dsa/${activityId}/entries/${entryId}`, input);
      return data.data as DsaStaffEntry;
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

export const removeStaffEntry = createAsyncThunk(
  'dsa/removeStaffEntry',
  async ({ activityId, entryId }: { activityId: string; entryId: string }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/dsa/${activityId}/entries/${entryId}`);
      return { activityId, entryId };
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

/* ============================================================
   THUNKS - EQUITY & EXPORT
============================================================ */

export const fetchEquitySuggestions = createAsyncThunk(
  'dsa/fetchEquity',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/dsa/equity');
      return data.data as StaffEquitySuggestion[];
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

export const exportCsv = createAsyncThunk(
  'dsa/exportCsv',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/dsa/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dsa-records-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return null;
    } catch (err) { 
      return rejectWithValue(extractError(err)); 
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const dsaSlice = createSlice({
  name: 'dsa',
  initialState,
  reducers: {
    setSelectedActivity(state, action: PayloadAction<DsaActivity | null>) {
      state.selectedActivity = action.payload;
      state.entries = [];
      state.error = null;
    },
    clearError(state) { 
      state.error = null; 
    },
    clearSuccess(state) { 
      state.success = false; 
    },
    resetDsaState: () => initialState,
    updateActivityStats(state, action: PayloadAction<{ activityId: string; staffCount: number; totalKes: number }>) {
      const { activityId, staffCount, totalKes } = action.payload;
      const idx = state.activities.findIndex(a => a.id === activityId);
      if (idx !== -1) {
        state.activities[idx].staff_count = staffCount;
        state.activities[idx].total_kes = totalKes;
      }
      if (state.selectedActivity?.id === activityId) {
        state.selectedActivity.staff_count = staffCount;
        state.selectedActivity.total_kes = totalKes;
      }
    },
    addEntryLocally(state, action: PayloadAction<DsaStaffEntry>) {
      state.entries = [...state.entries, action.payload];
    },
    removeEntryLocally(state, action: PayloadAction<string>) {
      state.entries = state.entries.filter(e => e.id !== action.payload);
    },
  },
  extraReducers: (builder) => {

    /* ---------- FETCH STATS ---------- */
    builder
      .addCase(fetchDsaStats.pending, (state) => { 
        state.loading.stats = true; 
        state.error = null; 
      })
      .addCase(fetchDsaStats.fulfilled, (state, action: PayloadAction<DsaStats>) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchDsaStats.rejected, (state, action) => { 
        state.loading.stats = false; 
        state.error = action.payload as string; 
      });

    /* ---------- FETCH ACTIVITIES ---------- */
    builder
      .addCase(fetchActivities.pending, (state) => { 
        state.loading.activities = true; 
        state.error = null; 
      })
      .addCase(fetchActivities.fulfilled, (state, action: PayloadAction<DsaActivity[]>) => {
        state.loading.activities = false;
        state.activities = action.payload;
      })
      .addCase(fetchActivities.rejected, (state, action) => { 
        state.loading.activities = false; 
        state.error = action.payload as string; 
      });

    /* ---------- FETCH ACTIVITY BY ID ---------- */
    builder
      .addCase(fetchActivityById.pending, (state) => { 
        state.loading.activities = true; 
        state.error = null; 
      })
      .addCase(fetchActivityById.fulfilled, (state, action: PayloadAction<DsaActivity>) => {
        state.loading.activities = false;
        state.selectedActivity = action.payload;
        const idx = state.activities.findIndex(a => a.id === action.payload.id);
        if (idx !== -1) {
          state.activities[idx] = action.payload;
        }
      })
      .addCase(fetchActivityById.rejected, (state, action) => { 
        state.loading.activities = false; 
        state.error = action.payload as string; 
      });

    /* ---------- CREATE ACTIVITY ---------- */
    builder
      .addCase(createActivity.pending, (state) => { 
        state.loading.mutating = true; 
        state.error = null; 
        state.success = false; 
      })
      .addCase(createActivity.fulfilled, (state, action: PayloadAction<DsaActivity>) => {
        state.loading.mutating = false;
        state.success = true;
        state.activities = [action.payload, ...state.activities];
        state.selectedActivity = action.payload;
        state.entries = [];
        if (state.stats) {
          state.stats.total_activities += 1;
        }
      })
      .addCase(createActivity.rejected, (state, action) => { 
        state.loading.mutating = false; 
        state.error = action.payload as string; 
        state.success = false; 
      });

    /* ---------- UPDATE ACTIVITY ---------- */
    builder
      .addCase(updateActivity.pending, (state) => { 
        state.loading.mutating = true; 
        state.error = null; 
        state.success = false; 
      })
      .addCase(updateActivity.fulfilled, (state, action: PayloadAction<DsaActivity>) => {
        state.loading.mutating = false;
        state.success = true;
        const idx = state.activities.findIndex(a => a.id === action.payload.id);
        if (idx !== -1) {
          state.activities[idx] = action.payload;
        }
        if (state.selectedActivity?.id === action.payload.id) {
          state.selectedActivity = action.payload;
        }
      })
      .addCase(updateActivity.rejected, (state, action) => { 
        state.loading.mutating = false; 
        state.error = action.payload as string; 
        state.success = false; 
      });

    /* ---------- DELETE ACTIVITY ---------- */
    builder
      .addCase(deleteActivity.pending, (state) => { 
        state.loading.mutating = true; 
        state.error = null; 
      })
      .addCase(deleteActivity.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.activities = state.activities.filter(a => a.id !== action.payload);
        if (state.selectedActivity?.id === action.payload) {
          state.selectedActivity = null;
          state.entries = [];
        }
        if (state.stats) {
          state.stats.total_activities = Math.max(0, state.stats.total_activities - 1);
        }
      })
      .addCase(deleteActivity.rejected, (state, action) => { 
        state.loading.mutating = false; 
        state.error = action.payload as string; 
      });

    /* ---------- FETCH ENTRIES ---------- */
    builder
      .addCase(fetchEntries.pending, (state) => { 
        state.loading.entries = true; 
        state.error = null; 
      })
      .addCase(fetchEntries.fulfilled, (state, action: PayloadAction<{ activityId: string; entries: DsaStaffEntry[] }>) => {
        state.loading.entries = false;
        state.entries = action.payload.entries;
      })
      .addCase(fetchEntries.rejected, (state, action) => { 
        state.loading.entries = false; 
        state.error = action.payload as string; 
      });

    /* ---------- FETCH ALL ENTRIES ---------- */
    builder
      .addCase(fetchAllEntries.pending, (state) => { 
        state.loading.entries = true; 
        state.error = null; 
      })
      .addCase(fetchAllEntries.fulfilled, (state, action: PayloadAction<DsaStaffEntry[]>) => {
        state.loading.entries = false;
        state.allEntries = action.payload;
      })
      .addCase(fetchAllEntries.rejected, (state, action) => { 
        state.loading.entries = false; 
        state.error = action.payload as string; 
      });

    /* ---------- ADD STAFF ENTRY ---------- */
    builder
      .addCase(addStaffEntry.pending, (state) => { 
        state.loading.mutating = true; 
        state.error = null; 
        state.success = false; 
      })
      .addCase(addStaffEntry.fulfilled, (state, action: PayloadAction<DsaStaffEntry>) => {
        state.loading.mutating = false;
        state.success = true;
        
        state.entries = [...state.entries, action.payload];
        
        const activityId = action.payload.activity_id;
        const idx = state.activities.findIndex(a => a.id === activityId);
        if (idx !== -1) {
          state.activities[idx].staff_count += 1;
          state.activities[idx].total_kes += action.payload.total_kes;
        }
        if (state.selectedActivity?.id === activityId) {
          state.selectedActivity.staff_count += 1;
          state.selectedActivity.total_kes += action.payload.total_kes;
        }
        if (state.stats) {
          state.stats.total_kes_payable += action.payload.total_kes;
          state.stats.staff_involved += 1;
        }
      })
      .addCase(addStaffEntry.rejected, (state, action) => { 
        state.loading.mutating = false; 
        state.error = action.payload as string; 
        state.success = false; 
      });

    /* ---------- UPDATE STAFF ENTRY ---------- */
    builder
      .addCase(updateStaffEntry.pending, (state) => { 
        state.loading.mutating = true; 
        state.error = null; 
        state.success = false; 
      })
      .addCase(updateStaffEntry.fulfilled, (state, action: PayloadAction<DsaStaffEntry>) => {
        state.loading.mutating = false;
        state.success = true;
        
        const idx = state.entries.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) {
          const oldTotal = state.entries[idx].total_kes;
          const diff = action.payload.total_kes - oldTotal;
          state.entries[idx] = action.payload;
          
          const activityId = action.payload.activity_id;
          const aIdx = state.activities.findIndex(a => a.id === activityId);
          if (aIdx !== -1) {
            state.activities[aIdx].total_kes += diff;
          }
          if (state.selectedActivity?.id === activityId) {
            state.selectedActivity.total_kes += diff;
          }
          if (state.stats) {
            state.stats.total_kes_payable += diff;
          }
        }
      })
      .addCase(updateStaffEntry.rejected, (state, action) => { 
        state.loading.mutating = false; 
        state.error = action.payload as string; 
        state.success = false; 
      });

    /* ---------- REMOVE STAFF ENTRY ---------- */
    builder
      .addCase(removeStaffEntry.pending, (state) => { 
        state.loading.mutating = true; 
        state.error = null; 
      })
      .addCase(removeStaffEntry.fulfilled, (state, action: PayloadAction<{ activityId: string; entryId: string }>) => {
        state.loading.mutating = false;
        
        const removed = state.entries.find(e => e.id === action.payload.entryId);
        state.entries = state.entries.filter(e => e.id !== action.payload.entryId);
        
        if (removed) {
          const activityId = action.payload.activityId;
          const aIdx = state.activities.findIndex(a => a.id === activityId);
          if (aIdx !== -1) {
            state.activities[aIdx].staff_count = Math.max(0, state.activities[aIdx].staff_count - 1);
            state.activities[aIdx].total_kes = Math.max(0, state.activities[aIdx].total_kes - removed.total_kes);
          }
          if (state.selectedActivity?.id === activityId) {
            state.selectedActivity.staff_count = Math.max(0, state.selectedActivity.staff_count - 1);
            state.selectedActivity.total_kes = Math.max(0, state.selectedActivity.total_kes - removed.total_kes);
          }
          if (state.stats) {
            state.stats.total_kes_payable = Math.max(0, state.stats.total_kes_payable - removed.total_kes);
            state.stats.staff_involved = Math.max(0, state.stats.staff_involved - 1);
          }
        }
      })
      .addCase(removeStaffEntry.rejected, (state, action) => { 
        state.loading.mutating = false; 
        state.error = action.payload as string; 
      });

    /* ---------- EQUITY SUGGESTIONS ---------- */
    builder
      .addCase(fetchEquitySuggestions.pending, (state) => { 
        state.loading.equity = true; 
        state.error = null; 
      })
      .addCase(fetchEquitySuggestions.fulfilled, (state, action: PayloadAction<StaffEquitySuggestion[]>) => {
        state.loading.equity = false;
        state.equitySuggestions = action.payload;
      })
      .addCase(fetchEquitySuggestions.rejected, (state, action) => { 
        state.loading.equity = false; 
        state.error = action.payload as string; 
      });

    /* ---------- EXPORT CSV ---------- */
    builder
      .addCase(exportCsv.pending, (state) => { 
        state.loading.export = true; 
      })
      .addCase(exportCsv.fulfilled, (state) => { 
        state.loading.export = false; 
        state.success = true;
      })
      .addCase(exportCsv.rejected, (state, action) => { 
        state.loading.export = false; 
        state.error = action.payload as string; 
      });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setSelectedActivity,
  clearError,
  clearSuccess,
  resetDsaState,
  updateActivityStats,
  addEntryLocally,
  removeEntryLocally,
} = dsaSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectActivities = (state: { dsa: DsaState }) => state.dsa.activities;
export const selectSelectedActivity = (state: { dsa: DsaState }) => state.dsa.selectedActivity;
export const selectEntries = (state: { dsa: DsaState }) => state.dsa.entries;
export const selectAllEntries = (state: { dsa: DsaState }) => state.dsa.allEntries;
export const selectDsaStats = (state: { dsa: DsaState }) => state.dsa.stats;
export const selectEquitySuggestions = (state: { dsa: DsaState }) => state.dsa.equitySuggestions;
export const selectDsaError = (state: { dsa: DsaState }) => state.dsa.error;
export const selectDsaSuccess = (state: { dsa: DsaState }) => state.dsa.success;
export const selectActivitiesLoading = (state: { dsa: DsaState }) => state.dsa.loading.activities;
export const selectEntriesLoading = (state: { dsa: DsaState }) => state.dsa.loading.entries;
export const selectDsaMutating = (state: { dsa: DsaState }) => state.dsa.loading.mutating;
export const selectEquityLoading = (state: { dsa: DsaState }) => state.dsa.loading.equity;
export const selectDsaStatsLoading = (state: { dsa: DsaState }) => state.dsa.loading.stats;
export const selectExportLoading = (state: { dsa: DsaState }) => state.dsa.loading.export;

export default dsaSlice.reducer;