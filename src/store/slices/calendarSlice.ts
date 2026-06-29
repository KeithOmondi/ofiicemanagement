// src/store/slices/calendarSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventUpdate,
  CalendarFilters,
  CalendarPaginationResponse,
  GoogleCalendarStatus,
} from '../../types/calendar.types';

/* ============================================================
   STATE
============================================================ */

interface CalendarState {
  events:        CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  upcomingEvents: CalendarEvent[];
  pagination: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
  filters:      CalendarFilters;
  googleStatus: GoogleCalendarStatus | null;
  loading: {
    list:         boolean;
    detail:       boolean;
    upcoming:     boolean;
    mutating:     boolean;
    syncing:      boolean;
    googleStatus: boolean;
  };
  error:   string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const DEFAULT_LIMIT = 50; // matches backend cap

const initialState: CalendarState = {
  events:        [],
  selectedEvent: null,
  upcomingEvents: [],
  pagination: {
    total:      0,
    page:       1,
    limit:      DEFAULT_LIMIT,
    totalPages: 0,
  },
  filters: {
    page:       1,
    limit:      DEFAULT_LIMIT,
    sort_by:    'event_date',
    sort_order: 'ASC',
  },
  googleStatus: null,
  loading: {
    list:         false,
    detail:       false,
    upcoming:     false,
    mutating:     false,
    syncing:      false,
    googleStatus: false,
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

const clampLimit = (limit?: number) => Math.min(limit ?? DEFAULT_LIMIT, 50);

/* ============================================================
   THUNKS — Google Calendar
============================================================ */

export const getGoogleAuthUrl = createAsyncThunk(
  'calendar/getGoogleAuthUrl',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/calendar/google/auth');
      return response.data.data as { authUrl: string };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const connectGoogleCalendar = createAsyncThunk(
  'calendar/connectGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/calendar/google/auth');
      const { authUrl } = response.data.data as { authUrl: string };
      window.location.href = authUrl;
      return { success: true };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const disconnectGoogleCalendar = createAsyncThunk(
  'calendar/disconnectGoogle',
  async (_, { rejectWithValue }) => {
    try {
      await axiosClient.post('/calendar/google/disconnect');
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const getGoogleCalendarStatus = createAsyncThunk(
  'calendar/getGoogleStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/calendar/google/status');
      return response.data.data as GoogleCalendarStatus;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const syncWithGoogle = createAsyncThunk(
  'calendar/syncWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/calendar/google/sync');
      return response.data.data as { synced: number };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   THUNKS — Events CRUD
   NOTE: The backend scopes ALL queries to req.user.id.
         The frontend never passes a userId — the JWT handles it.
============================================================ */

export const createCalendarEvent = createAsyncThunk(
  'calendar/createEvent',
  async (input: CalendarEventInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/calendar', input);
      return response.data.data as CalendarEvent;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchCalendarEvents = createAsyncThunk(
  'calendar/fetchAll',
  async (filters: CalendarFilters, { rejectWithValue }) => {
    try {
      const safeFilters = { ...filters, limit: clampLimit(filters.limit) };
      const params = new URLSearchParams();
      Object.entries(safeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const response = await axiosClient.get(`/calendar?${params.toString()}`);
      return response.data.data as CalendarPaginationResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchUpcomingEvents = createAsyncThunk(
  'calendar/fetchUpcoming',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const safeLimit = Math.min(limit, 50);
      const response = await axiosClient.get(`/calendar/upcoming?limit=${safeLimit}`);
      return response.data.data as CalendarEvent[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchCalendarEventById = createAsyncThunk(
  'calendar/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/calendar/${id}`);
      return response.data.data as CalendarEvent;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateCalendarEvent = createAsyncThunk(
  'calendar/updateEvent',
  async ({ id, data }: { id: string; data: CalendarEventUpdate }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/calendar/${id}`, data);
      return response.data.data as CalendarEvent;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteCalendarEvent = createAsyncThunk(
  'calendar/deleteEvent',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/calendar/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setCalendarFilters(state, action: PayloadAction<Partial<CalendarFilters>>) {
      const f = { ...action.payload };
      if (f.limit) f.limit = clampLimit(f.limit);
      state.filters = { ...state.filters, ...f };
    },
    resetCalendarFilters(state) {
      state.filters = {
        page:       1,
        limit:      DEFAULT_LIMIT,
        sort_by:    'event_date',
        sort_order: 'ASC',
      };
    },
    clearSelectedEvent(state)   { state.selectedEvent = null; },
    clearCalendarError(state)   { state.error = null; },
    clearCalendarSuccess(state) { state.success = false; },
    resetCalendarState: ()      => initialState,
  },
  extraReducers: (builder) => {

    // ── Google status ────────────────────────────────────────────────────────
    builder
      .addCase(getGoogleCalendarStatus.pending,   (state) => { state.loading.googleStatus = true;  state.error = null; })
      .addCase(getGoogleCalendarStatus.fulfilled, (state, action: PayloadAction<GoogleCalendarStatus>) => {
        state.loading.googleStatus = false;
        state.googleStatus = action.payload;
      })
      .addCase(getGoogleCalendarStatus.rejected,  (state, action) => {
        state.loading.googleStatus = false;
        state.error = action.payload as string;
      });

    // ── Disconnect ───────────────────────────────────────────────────────────
    builder
      .addCase(disconnectGoogleCalendar.pending,   (state) => { state.loading.mutating = true; state.error = null; })
      .addCase(disconnectGoogleCalendar.fulfilled, (state) => {
        state.loading.mutating = false;
        state.googleStatus     = null;
        state.success          = true;
      })
      .addCase(disconnectGoogleCalendar.rejected,  (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    // ── Sync with Google ─────────────────────────────────────────────────────
    builder
      .addCase(syncWithGoogle.pending,   (state) => { state.loading.syncing = true;  state.error = null; })
      .addCase(syncWithGoogle.fulfilled, (state) => { state.loading.syncing = false; state.success = true; })
      .addCase(syncWithGoogle.rejected,  (state, action) => {
        state.loading.syncing = false;
        state.error = action.payload as string;
      });

    // ── Create ───────────────────────────────────────────────────────────────
    builder
      .addCase(createCalendarEvent.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(createCalendarEvent.fulfilled, (state, action: PayloadAction<CalendarEvent>) => {
        state.loading.mutating = false;
        state.success          = true;
        state.events           = [action.payload, ...state.events];
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(createCalendarEvent.rejected,  (state, action) => {
        state.loading.mutating = false;
        state.error   = action.payload as string;
        state.success = false;
      });

    // ── Fetch all ────────────────────────────────────────────────────────────
    builder
      .addCase(fetchCalendarEvents.pending,   (state) => { state.loading.list = true;  state.error = null; })
      .addCase(fetchCalendarEvents.fulfilled, (state, action: PayloadAction<CalendarPaginationResponse>) => {
        state.loading.list = false;
        state.events       = action.payload.data;
        state.pagination   = {
          total:      action.payload.total,
          page:       action.payload.page,
          limit:      action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchCalendarEvents.rejected,  (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    // ── Fetch upcoming ───────────────────────────────────────────────────────
    builder
      .addCase(fetchUpcomingEvents.pending,   (state) => { state.loading.upcoming = true;  state.error = null; })
      .addCase(fetchUpcomingEvents.fulfilled, (state, action: PayloadAction<CalendarEvent[]>) => {
        state.loading.upcoming  = false;
        state.upcomingEvents    = action.payload;
      })
      .addCase(fetchUpcomingEvents.rejected,  (state, action) => {
        state.loading.upcoming = false;
        state.error = action.payload as string;
      });

    // ── Fetch by ID ──────────────────────────────────────────────────────────
    builder
      .addCase(fetchCalendarEventById.pending,   (state) => { state.loading.detail = true;  state.error = null; })
      .addCase(fetchCalendarEventById.fulfilled, (state, action: PayloadAction<CalendarEvent>) => {
        state.loading.detail  = false;
        state.selectedEvent   = action.payload;
      })
      .addCase(fetchCalendarEventById.rejected,  (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    // ── Update ───────────────────────────────────────────────────────────────
    builder
      .addCase(updateCalendarEvent.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(updateCalendarEvent.fulfilled, (state, action: PayloadAction<CalendarEvent>) => {
        state.loading.mutating = false;
        state.success          = true;
        const idx = state.events.findIndex((e) => e.id === action.payload.id);
        if (idx !== -1) state.events[idx] = action.payload;
        if (state.selectedEvent?.id === action.payload.id) state.selectedEvent = action.payload;
        const upIdx = state.upcomingEvents.findIndex((e) => e.id === action.payload.id);
        if (upIdx !== -1) state.upcomingEvents[upIdx] = action.payload;
      })
      .addCase(updateCalendarEvent.rejected,  (state, action) => {
        state.loading.mutating = false;
        state.error   = action.payload as string;
        state.success = false;
      });

    // ── Delete ───────────────────────────────────────────────────────────────
    builder
      .addCase(deleteCalendarEvent.pending,   (state) => { state.loading.mutating = true;  state.error = null; state.success = false; })
      .addCase(deleteCalendarEvent.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating  = false;
        state.success           = true;
        state.events            = state.events.filter((e) => e.id !== action.payload);
        state.upcomingEvents    = state.upcomingEvents.filter((e) => e.id !== action.payload);
        if (state.selectedEvent?.id === action.payload) state.selectedEvent = null;
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(deleteCalendarEvent.rejected,  (state, action) => {
        state.loading.mutating = false;
        state.error   = action.payload as string;
        state.success = false;
      });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setCalendarFilters,
  resetCalendarFilters,
  clearSelectedEvent,
  clearCalendarError,
  clearCalendarSuccess,
  resetCalendarState,
} = calendarSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllCalendarEvents      = (s: { calendar: CalendarState }) => s.calendar.events;
export const selectSelectedCalendarEvent  = (s: { calendar: CalendarState }) => s.calendar.selectedEvent;
export const selectUpcomingEvents         = (s: { calendar: CalendarState }) => s.calendar.upcomingEvents;
export const selectCalendarPagination     = (s: { calendar: CalendarState }) => s.calendar.pagination;
export const selectCalendarFilters        = (s: { calendar: CalendarState }) => s.calendar.filters;
export const selectGoogleCalendarStatus   = (s: { calendar: CalendarState }) => s.calendar.googleStatus;
export const selectCalendarListLoading    = (s: { calendar: CalendarState }) => s.calendar.loading.list;
export const selectCalendarDetailLoading  = (s: { calendar: CalendarState }) => s.calendar.loading.detail;
export const selectCalendarUpcomingLoading= (s: { calendar: CalendarState }) => s.calendar.loading.upcoming;
export const selectCalendarMutating       = (s: { calendar: CalendarState }) => s.calendar.loading.mutating;
export const selectCalendarSyncing        = (s: { calendar: CalendarState }) => s.calendar.loading.syncing;
export const selectGoogleStatusLoading    = (s: { calendar: CalendarState }) => s.calendar.loading.googleStatus;
export const selectCalendarError          = (s: { calendar: CalendarState }) => s.calendar.error;
export const selectCalendarSuccess        = (s: { calendar: CalendarState }) => s.calendar.success;

export default calendarSlice.reducer;