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
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  upcomingEvents: CalendarEvent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: CalendarFilters;
  googleStatus: GoogleCalendarStatus | null;
  loading: {
    list: boolean;
    detail: boolean;
    upcoming: boolean;
    mutating: boolean;
    syncing: boolean;
    googleStatus: boolean;
  };
  error: string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: CalendarState = {
  events: [],
  selectedEvent: null,
  upcomingEvents: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 100,
    totalPages: 0,
  },
  filters: {
    page: 1,
    limit: 100,
    sort_by: 'event_date',
    sort_order: 'ASC',
  },
  googleStatus: null,
  loading: {
    list: false,
    detail: false,
    upcoming: false,
    mutating: false,
    syncing: false,
    googleStatus: false,
  },
  error: null,
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
   ASYNC THUNKS - Google Calendar Integration
============================================================ */

// ── Get Google Calendar OAuth URL ──
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

// ── Connect Google Calendar (redirect to Google) ──
export const connectGoogleCalendar = createAsyncThunk(
  'calendar/connectGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/calendar/google/auth');
      const { authUrl } = response.data.data;
      // Redirect to Google OAuth
      window.location.href = authUrl;
      return { success: true };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// ── Disconnect Google Calendar ──
export const disconnectGoogleCalendar = createAsyncThunk(
  'calendar/disconnectGoogle',
  async (_, { rejectWithValue }) => {
    try {
      await axiosClient.post('/calendar/google/disconnect');
      return { success: true };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// ── Get Google Calendar Status ──
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

// ── Sync with Google Calendar ──
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
   ASYNC THUNKS - Calendar Events CRUD
============================================================ */

// ── Create Event ──
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

// ── Fetch All Events ──
export const fetchCalendarEvents = createAsyncThunk(
  'calendar/fetchAll',
  async (filters: CalendarFilters, { rejectWithValue }) => {
    try {
      // Ensure limit never exceeds 100
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
      const response = await axiosClient.get(`/calendar?${params.toString()}`);
      return response.data.data as CalendarPaginationResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// ── Fetch Upcoming Events ──
export const fetchUpcomingEvents = createAsyncThunk(
  'calendar/fetchUpcoming',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/calendar/upcoming?limit=${limit}`);
      return response.data.data as CalendarEvent[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// ── Fetch Event By ID ──
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

// ── Update Event ──
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

// ── Delete Event ──
export const deleteCalendarEvent = createAsyncThunk(
  'calendar/deleteEvent',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/calendar/${id}`);
      return { id };
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
      // Ensure limit never exceeds 100 when setting filters
      const newFilters = { ...action.payload };
      if (newFilters.limit && newFilters.limit > 100) {
        newFilters.limit = 100;
      }
      state.filters = { ...state.filters, ...newFilters };
    },
    resetCalendarFilters(state) {
      state.filters = {
        page: 1,
        limit: 100,
        sort_by: 'event_date',
        sort_order: 'ASC',
      };
    },
    clearSelectedEvent(state) {
      state.selectedEvent = null;
    },
    clearCalendarError(state) {
      state.error = null;
    },
    clearCalendarSuccess(state) {
      state.success = false;
    },
    resetCalendarState: () => initialState,
  },
  extraReducers: (builder) => {
    /* ---------- GOOGLE CALENDAR STATUS ---------- */
    builder
      .addCase(getGoogleCalendarStatus.pending, (state) => {
        state.loading.googleStatus = true;
        state.error = null;
      })
      .addCase(getGoogleCalendarStatus.fulfilled, (state, action: PayloadAction<GoogleCalendarStatus>) => {
        state.loading.googleStatus = false;
        state.googleStatus = action.payload;
      })
      .addCase(getGoogleCalendarStatus.rejected, (state, action) => {
        state.loading.googleStatus = false;
        state.error = action.payload as string;
      });

    /* ---------- DISCONNECT GOOGLE CALENDAR ---------- */
    builder
      .addCase(disconnectGoogleCalendar.fulfilled, (state) => {
        state.googleStatus = null;
        state.success = true;
      });

    /* ---------- SYNC WITH GOOGLE CALENDAR ---------- */
    builder
      .addCase(syncWithGoogle.pending, (state) => {
        state.loading.syncing = true;
        state.error = null;
      })
      .addCase(syncWithGoogle.fulfilled, (state) => {
        state.loading.syncing = false;
        state.success = true;
        // Optionally refresh events after sync
      })
      .addCase(syncWithGoogle.rejected, (state, action) => {
        state.loading.syncing = false;
        state.error = action.payload as string;
      });

    /* ---------- CREATE EVENT ---------- */
    builder
      .addCase(createCalendarEvent.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createCalendarEvent.fulfilled, (state, action: PayloadAction<CalendarEvent>) => {
        state.loading.mutating = false;
        state.success = true;
        state.events = [action.payload, ...state.events];
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(createCalendarEvent.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- FETCH ALL EVENTS ---------- */
    builder
      .addCase(fetchCalendarEvents.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchCalendarEvents.fulfilled, (state, action: PayloadAction<CalendarPaginationResponse>) => {
        state.loading.list = false;
        state.events = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchCalendarEvents.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH UPCOMING EVENTS ---------- */
    builder
      .addCase(fetchUpcomingEvents.pending, (state) => {
        state.loading.upcoming = true;
        state.error = null;
      })
      .addCase(fetchUpcomingEvents.fulfilled, (state, action: PayloadAction<CalendarEvent[]>) => {
        state.loading.upcoming = false;
        state.upcomingEvents = action.payload;
      })
      .addCase(fetchUpcomingEvents.rejected, (state, action) => {
        state.loading.upcoming = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH BY ID ---------- */
    builder
      .addCase(fetchCalendarEventById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchCalendarEventById.fulfilled, (state, action: PayloadAction<CalendarEvent>) => {
        state.loading.detail = false;
        state.selectedEvent = action.payload;
      })
      .addCase(fetchCalendarEventById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    /* ---------- UPDATE EVENT ---------- */
    builder
      .addCase(updateCalendarEvent.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateCalendarEvent.fulfilled, (state, action: PayloadAction<CalendarEvent>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.events.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
        if (state.selectedEvent?.id === action.payload.id) {
          state.selectedEvent = action.payload;
        }
        const upcomingIndex = state.upcomingEvents.findIndex((e) => e.id === action.payload.id);
        if (upcomingIndex !== -1) {
          state.upcomingEvents[upcomingIndex] = action.payload;
        }
      })
      .addCase(updateCalendarEvent.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- DELETE EVENT ---------- */
    builder
      .addCase(deleteCalendarEvent.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteCalendarEvent.fulfilled, (state, action: PayloadAction<{ id: string }>) => {
        state.loading.mutating = false;
        state.success = true;
        state.events = state.events.filter((e) => e.id !== action.payload.id);
        state.upcomingEvents = state.upcomingEvents.filter((e) => e.id !== action.payload.id);
        if (state.selectedEvent?.id === action.payload.id) {
          state.selectedEvent = null;
        }
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(deleteCalendarEvent.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
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

export const selectAllCalendarEvents = (state: { calendar: CalendarState }) => state.calendar.events;
export const selectSelectedCalendarEvent = (state: { calendar: CalendarState }) => state.calendar.selectedEvent;
export const selectUpcomingEvents = (state: { calendar: CalendarState }) => state.calendar.upcomingEvents;
export const selectCalendarPagination = (state: { calendar: CalendarState }) => state.calendar.pagination;
export const selectCalendarFilters = (state: { calendar: CalendarState }) => state.calendar.filters;
export const selectGoogleCalendarStatus = (state: { calendar: CalendarState }) => state.calendar.googleStatus;
export const selectCalendarListLoading = (state: { calendar: CalendarState }) => state.calendar.loading.list;
export const selectCalendarDetailLoading = (state: { calendar: CalendarState }) => state.calendar.loading.detail;
export const selectCalendarUpcomingLoading = (state: { calendar: CalendarState }) => state.calendar.loading.upcoming;
export const selectCalendarMutating = (state: { calendar: CalendarState }) => state.calendar.loading.mutating;
export const selectCalendarSyncing = (state: { calendar: CalendarState }) => state.calendar.loading.syncing;
export const selectGoogleStatusLoading = (state: { calendar: CalendarState }) => state.calendar.loading.googleStatus;
export const selectCalendarError = (state: { calendar: CalendarState }) => state.calendar.error;
export const selectCalendarSuccess = (state: { calendar: CalendarState }) => state.calendar.success;

export default calendarSlice.reducer;