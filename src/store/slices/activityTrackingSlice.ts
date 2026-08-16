// src/store/slices/activityTrackingSlice.ts
//
// Assumes your shared axiosClient instance already has baseURL '/api/v1' (adjust
// the import path below to match wherever that lives in OFFICE_SYSTEM), so
// requests here resolve to '/api/v1/activity-log/...' — matching how the
// router was mounted: app.use('/api/v1/activity-log', activityRoutes).

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type {
  ActivityLog,
  ActivityReminder,
  ActivityLogFilters,
  ReminderFilters,
  ActivityLogFormData,
  ReminderFormData,
  Pagination,
  ReminderStatus,
} from '../../types/activity-tracking.types';
import axiosClient from '../../api/api';

const BASE_URL = '/activity-log';

// ═══════════════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════════════

interface ActivityTrackingState {
  logs: ActivityLog[];
  logsLoading: boolean;
  logsError: string | null;
  logsPagination: Pagination;

  reminders: ActivityReminder[];
  remindersLoading: boolean;
  remindersError: string | null;
  remindersPagination: Pagination;

  dueReminders: ActivityReminder[];
  dueRemindersLoading: boolean;
  dueRemindersError: string | null;

  activeReminders: ActivityReminder[];
  activeRemindersLoading: boolean;
  activeRemindersError: string | null;

  overdueReminders: ActivityReminder[];
  overdueRemindersLoading: boolean;
  overdueRemindersError: string | null;

  currentLog: ActivityLog | null;
  currentReminder: ActivityReminder | null;

  mutating: boolean; // true while create/update/delete/complete/snooze is in flight
  mutationError: string | null;
}

const initialState: ActivityTrackingState = {
  logs: [],
  logsLoading: false,
  logsError: null,
  logsPagination: { page: 1, pageSize: 20, total: 0 },

  reminders: [],
  remindersLoading: false,
  remindersError: null,
  remindersPagination: { page: 1, pageSize: 20, total: 0 },

  dueReminders: [],
  dueRemindersLoading: false,
  dueRemindersError: null,

  activeReminders: [],
  activeRemindersLoading: false,
  activeRemindersError: null,

  overdueReminders: [],
  overdueRemindersLoading: false,
  overdueRemindersError: null,

  currentLog: null,
  currentReminder: null,

  mutating: false,
  mutationError: null,
};

// Helper type guard
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

function isErrorWithResponse(error: unknown): error is { response: { data?: { message?: string } } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response: unknown }).response === 'object' &&
    (error as { response: { data?: unknown } }).response !== null
  );
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isErrorWithResponse(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  
  return fallback;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ACTIVITY LOG THUNKS
// ═══════════════════════════════════════════════════════════════════════════

export const fetchActivityLogs = createAsyncThunk(
  'activityTracking/fetchLogs',
  async (filters: ActivityLogFilters | undefined, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${BASE_URL}/logs`, { params: filters });
      return data.data as { logs: ActivityLog[]; total: number; page: number; pageSize: number };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch activity logs'));
    }
  }
);

export const fetchActivityLogById = createAsyncThunk(
  'activityTracking/fetchLogById',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${BASE_URL}/logs/${id}`);
      return data.data as ActivityLog;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch activity log'));
    }
  }
);

export const createActivityLog = createAsyncThunk(
  'activityTracking/createLog',
  async (payload: ActivityLogFormData, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`${BASE_URL}/logs`, payload);
      return data.data as ActivityLog;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to log activity'));
    }
  }
);

export const updateActivityLog = createAsyncThunk(
  'activityTracking/updateLog',
  async ({ id, data: payload }: { id: string; data: Partial<ActivityLogFormData> }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.patch(`${BASE_URL}/logs/${id}`, payload);
      return data.data as ActivityLog;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update activity log'));
    }
  }
);

export const deleteActivityLog = createAsyncThunk(
  'activityTracking/deleteLog',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`${BASE_URL}/logs/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to delete activity log'));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  REMINDER THUNKS
// ═══════════════════════════════════════════════════════════════════════════

export const fetchReminders = createAsyncThunk(
  'activityTracking/fetchReminders',
  async (filters: ReminderFilters | undefined, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${BASE_URL}/reminders`, { params: filters });
      return data.data as { reminders: ActivityReminder[]; total: number; page: number; pageSize: number };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch reminders'));
    }
  }
);

// Fetch active reminders (pending, in_progress, upcoming, overdue)
export const fetchActiveReminders = createAsyncThunk(
  'activityTracking/fetchActiveReminders',
  async (filters: { staffId?: string; departmentId?: string } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${BASE_URL}/reminders/active`, { params: filters });
      return data.data as ActivityReminder[];
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch active reminders'));
    }
  }
);

// Fetch due reminders (due today or overdue)
export const fetchDueReminders = createAsyncThunk(
  'activityTracking/fetchDueReminders',
  async (filters: { staffId?: string; departmentId?: string } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${BASE_URL}/reminders/due`, { params: filters });
      return data.data as ActivityReminder[];
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch due reminders'));
    }
  }
);

// Fetch overdue reminders only
export const fetchOverdueReminders = createAsyncThunk(
  'activityTracking/fetchOverdueReminders',
  async (filters: { staffId?: string; departmentId?: string } | undefined, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`${BASE_URL}/reminders/overdue`, { params: filters });
      return data.data as ActivityReminder[];
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to fetch overdue reminders'));
    }
  }
);

export const createReminder = createAsyncThunk(
  'activityTracking/createReminder',
  async (payload: ReminderFormData, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`${BASE_URL}/reminders`, payload);
      return data.data as ActivityReminder;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to create reminder'));
    }
  }
);

export const updateReminder = createAsyncThunk(
  'activityTracking/updateReminder',
  async ({ id, data: payload }: { id: string; data: Partial<ReminderFormData> }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.patch(`${BASE_URL}/reminders/${id}`, payload);
      return data.data as ActivityReminder;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update reminder'));
    }
  }
);

// Update reminder status only
export const updateReminderStatus = createAsyncThunk(
  'activityTracking/updateReminderStatus',
  async ({ id, status }: { id: string; status: ReminderStatus }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.patch(`${BASE_URL}/reminders/${id}/status`, { status });
      return data.data as ActivityReminder;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to update reminder status'));
    }
  }
);

export const completeReminder = createAsyncThunk(
  'activityTracking/completeReminder',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`${BASE_URL}/reminders/${id}/complete`);
      return data.data as ActivityReminder;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to complete reminder'));
    }
  }
);

export const snoozeReminder = createAsyncThunk(
  'activityTracking/snoozeReminder',
  async ({ id, dueDate }: { id: string; dueDate: string }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`${BASE_URL}/reminders/${id}/snooze`, { dueDate });
      return data.data as ActivityReminder;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to snooze reminder'));
    }
  }
);

export const deleteReminder = createAsyncThunk(
  'activityTracking/deleteReminder',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`${BASE_URL}/reminders/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, 'Failed to delete reminder'));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
//  SLICE
// ═══════════════════════════════════════════════════════════════════════════

const activityTrackingSlice = createSlice({
  name: 'activityTracking',
  initialState,
  reducers: {
    clearCurrentLog(state) {
      state.currentLog = null;
    },
    clearCurrentReminder(state) {
      state.currentReminder = null;
    },
    clearMutationError(state) {
      state.mutationError = null;
    },
    setLogsPage(state, action: PayloadAction<number>) {
      state.logsPagination.page = action.payload;
    },
    setRemindersPage(state, action: PayloadAction<number>) {
      state.remindersPagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch logs ──────────────────────────────────────────────────────
      .addCase(fetchActivityLogs.pending, (state) => {
        state.logsLoading = true;
        state.logsError = null;
      })
      .addCase(fetchActivityLogs.fulfilled, (state, action) => {
        state.logsLoading = false;
        state.logs = action.payload.logs;
        state.logsPagination = {
          page: action.payload.page,
          pageSize: action.payload.pageSize,
          total: action.payload.total,
        };
      })
      .addCase(fetchActivityLogs.rejected, (state, action) => {
        state.logsLoading = false;
        state.logsError = action.payload as string;
      })

      // ── Fetch log by id ─────────────────────────────────────────────────
      .addCase(fetchActivityLogById.fulfilled, (state, action) => {
        state.currentLog = action.payload;
      })

      // ── Create log ──────────────────────────────────────────────────────
      .addCase(createActivityLog.pending, (state) => {
        state.mutating = true;
        state.mutationError = null;
      })
      .addCase(createActivityLog.fulfilled, (state, action) => {
        state.mutating = false;
        state.logs.unshift(action.payload);
      })
      .addCase(createActivityLog.rejected, (state, action) => {
        state.mutating = false;
        state.mutationError = action.payload as string;
      })

      // ── Update log ──────────────────────────────────────────────────────
      .addCase(updateActivityLog.fulfilled, (state, action) => {
        const idx = state.logs.findIndex((l) => l.id === action.payload.id);
        if (idx !== -1) state.logs[idx] = action.payload;
        if (state.currentLog?.id === action.payload.id) state.currentLog = action.payload;
      })

      // ── Delete log ──────────────────────────────────────────────────────
      .addCase(deleteActivityLog.fulfilled, (state, action) => {
        state.logs = state.logs.filter((l) => l.id !== action.payload);
      })

      // ── Fetch reminders ─────────────────────────────────────────────────
      .addCase(fetchReminders.pending, (state) => {
        state.remindersLoading = true;
        state.remindersError = null;
      })
      .addCase(fetchReminders.fulfilled, (state, action) => {
        state.remindersLoading = false;
        state.reminders = action.payload.reminders;
        state.remindersPagination = {
          page: action.payload.page,
          pageSize: action.payload.pageSize,
          total: action.payload.total,
        };
      })
      .addCase(fetchReminders.rejected, (state, action) => {
        state.remindersLoading = false;
        state.remindersError = action.payload as string;
      })

      // ── Fetch active reminders ──────────────────────────────────────────
      .addCase(fetchActiveReminders.pending, (state) => {
        state.activeRemindersLoading = true;
        state.activeRemindersError = null;
      })
      .addCase(fetchActiveReminders.fulfilled, (state, action) => {
        state.activeRemindersLoading = false;
        state.activeReminders = action.payload;
      })
      .addCase(fetchActiveReminders.rejected, (state, action) => {
        state.activeRemindersLoading = false;
        state.activeRemindersError = action.payload as string;
      })

      // ── Fetch due reminders ─────────────────────────────────────────────
      .addCase(fetchDueReminders.pending, (state) => {
        state.dueRemindersLoading = true;
        state.dueRemindersError = null;
      })
      .addCase(fetchDueReminders.fulfilled, (state, action) => {
        state.dueRemindersLoading = false;
        state.dueReminders = action.payload;
      })
      .addCase(fetchDueReminders.rejected, (state, action) => {
        state.dueRemindersLoading = false;
        state.dueRemindersError = action.payload as string;
      })

      // ── Fetch overdue reminders ──────────────────────────────────────────
      .addCase(fetchOverdueReminders.pending, (state) => {
        state.overdueRemindersLoading = true;
        state.overdueRemindersError = null;
      })
      .addCase(fetchOverdueReminders.fulfilled, (state, action) => {
        state.overdueRemindersLoading = false;
        state.overdueReminders = action.payload;
      })
      .addCase(fetchOverdueReminders.rejected, (state, action) => {
        state.overdueRemindersLoading = false;
        state.overdueRemindersError = action.payload as string;
      })

      // ── Create reminder ─────────────────────────────────────────────────
      .addCase(createReminder.pending, (state) => {
        state.mutating = true;
        state.mutationError = null;
      })
      .addCase(createReminder.fulfilled, (state, action) => {
        state.mutating = false;
        state.reminders.unshift(action.payload);
      })
      .addCase(createReminder.rejected, (state, action) => {
        state.mutating = false;
        state.mutationError = action.payload as string;
      })

      // ── Update reminder ─────────────────────────────────────────────────
      .addCase(updateReminder.fulfilled, (state, action) => {
        replaceReminderEverywhere(state, action.payload);
      })

      // ── Update reminder status ──────────────────────────────────────────
      .addCase(updateReminderStatus.fulfilled, (state, action) => {
        replaceReminderEverywhere(state, action.payload);
        // Also update in active and overdue lists
        const idxActive = state.activeReminders.findIndex((r) => r.id === action.payload.id);
        if (idxActive !== -1) state.activeReminders[idxActive] = action.payload;
        const idxOverdue = state.overdueReminders.findIndex((r) => r.id === action.payload.id);
        if (idxOverdue !== -1) state.overdueReminders[idxOverdue] = action.payload;
      })

      // ── Complete reminder ───────────────────────────────────────────────
      .addCase(completeReminder.fulfilled, (state, action) => {
        replaceReminderEverywhere(state, action.payload);
        // Completed reminders drop off the due list immediately.
        state.dueReminders = state.dueReminders.filter((r) => r.id !== action.payload.id);
        state.activeReminders = state.activeReminders.filter((r) => r.id !== action.payload.id);
        state.overdueReminders = state.overdueReminders.filter((r) => r.id !== action.payload.id);
      })

      // ── Snooze reminder ─────────────────────────────────────────────────
      .addCase(snoozeReminder.fulfilled, (state, action) => {
        replaceReminderEverywhere(state, action.payload);
        // Snoozed to a future date — remove from today's due list unless
        // it was snoozed to today/earlier (edge case, but harmless either
        // way since the next fetchDueReminders() call will reconcile it).
        state.dueReminders = state.dueReminders.filter((r) => r.id !== action.payload.id);
        state.activeReminders = state.activeReminders.filter((r) => r.id !== action.payload.id);
        state.overdueReminders = state.overdueReminders.filter((r) => r.id !== action.payload.id);
      })

      // ── Delete reminder ─────────────────────────────────────────────────
      .addCase(deleteReminder.fulfilled, (state, action) => {
        state.reminders = state.reminders.filter((r) => r.id !== action.payload);
        state.dueReminders = state.dueReminders.filter((r) => r.id !== action.payload);
        state.activeReminders = state.activeReminders.filter((r) => r.id !== action.payload);
        state.overdueReminders = state.overdueReminders.filter((r) => r.id !== action.payload);
      });
  },
});

function replaceReminderEverywhere(state: ActivityTrackingState, reminder: ActivityReminder) {
  const idxAll = state.reminders.findIndex((r) => r.id === reminder.id);
  if (idxAll !== -1) state.reminders[idxAll] = reminder;

  const idxDue = state.dueReminders.findIndex((r) => r.id === reminder.id);
  if (idxDue !== -1) state.dueReminders[idxDue] = reminder;

  const idxActive = state.activeReminders.findIndex((r) => r.id === reminder.id);
  if (idxActive !== -1) state.activeReminders[idxActive] = reminder;

  const idxOverdue = state.overdueReminders.findIndex((r) => r.id === reminder.id);
  if (idxOverdue !== -1) state.overdueReminders[idxOverdue] = reminder;

  if (state.currentReminder?.id === reminder.id) state.currentReminder = reminder;
}

export const {
  clearCurrentLog,
  clearCurrentReminder,
  clearMutationError,
  setLogsPage,
  setRemindersPage,
} = activityTrackingSlice.actions;

export default activityTrackingSlice.reducer;

// ═══════════════════════════════════════════════════════════════════════════
//  SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

const selectState = (state: RootState) => state.activityTracking as ActivityTrackingState;

export const selectAllActivityLogs = (state: RootState) => selectState(state).logs;
export const selectActivityLogsLoading = (state: RootState) => selectState(state).logsLoading;
export const selectActivityLogsError = (state: RootState) => selectState(state).logsError;
export const selectActivityLogsPagination = (state: RootState) => selectState(state).logsPagination;
export const selectCurrentActivityLog = (state: RootState) => selectState(state).currentLog;

export const selectAllReminders = (state: RootState) => selectState(state).reminders;
export const selectRemindersLoading = (state: RootState) => selectState(state).remindersLoading;
export const selectRemindersError = (state: RootState) => selectState(state).remindersError;
export const selectRemindersPagination = (state: RootState) => selectState(state).remindersPagination;
export const selectCurrentReminder = (state: RootState) => selectState(state).currentReminder;

// Due reminders selectors
export const selectDueReminders = (state: RootState) => selectState(state).dueReminders;
export const selectDueRemindersLoading = (state: RootState) => selectState(state).dueRemindersLoading;
export const selectDueRemindersError = (state: RootState) => selectState(state).dueRemindersError;
export const selectDueRemindersCount = (state: RootState) => selectState(state).dueReminders.length;

// Active reminders selectors
export const selectActiveReminders = (state: RootState) => selectState(state).activeReminders;
export const selectActiveRemindersLoading = (state: RootState) => selectState(state).activeRemindersLoading;
export const selectActiveRemindersError = (state: RootState) => selectState(state).activeRemindersError;
export const selectActiveRemindersCount = (state: RootState) => selectState(state).activeReminders.length;

// Overdue reminders selectors
export const selectOverdueReminders = (state: RootState) => selectState(state).overdueReminders;
export const selectOverdueRemindersLoading = (state: RootState) => selectState(state).overdueRemindersLoading;
export const selectOverdueRemindersError = (state: RootState) => selectState(state).overdueRemindersError;
export const selectOverdueRemindersCount = (state: RootState) => selectState(state).overdueReminders.length;

export const selectMutating = (state: RootState) => selectState(state).mutating;
export const selectMutationError = (state: RootState) => selectState(state).mutationError;

// ── Staff name helpers ─────────────────────────────────────────────────────

/**
 * Get a map of staffId -> staffName from all loaded logs and reminders
 * This uses the staff data that's already included in the backend response
 */
export const selectStaffNameMap = (state: RootState): Record<string, string> => {
  const logs = selectAllActivityLogs(state);
  const reminders = selectAllReminders(state);
  const map: Record<string, string> = {};

  // Add from logs
  logs.forEach(log => {
    if (log.staff?.full_name && !map[log.staffId]) {
      map[log.staffId] = log.staff.full_name;
    }
  });

  // Add from reminders
  reminders.forEach(reminder => {
    if (reminder.staff?.full_name && !map[reminder.staffId]) {
      map[reminder.staffId] = reminder.staff.full_name;
    }
  });

  return map;
};

/**
 * Get a staff member's display name from their ID
 * Uses the staff data that's already included in the logs/reminders
 */
export const selectStaffName = (state: RootState, staffId: string): string => {
  const map = selectStaffNameMap(state);
  return map[staffId] || `User ${staffId.slice(0, 8)}`;
};