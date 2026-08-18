// src/features/service-week/store/serviceWeek.slice.ts

import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type {
  ServiceWeekState,
  ServiceWeekReport,
  ServiceWeekFilters,
  CreateServiceWeekPayload,
  UpdateServiceWeekPayload,
  ApiResponse,
  PaginatedResponse,
} from '../../types/service-week.types';
import type { RootState } from '../../store/store';

// ── Initial State ────────────────────────────────────────────────────────────

const initialState: ServiceWeekState = {
  reports: [],
  currentReport: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  filters: {
    limit: 20,
  },
};

const BASE_URL = '/service-week';

// ── Helper to extract data from API response ──────────────────────────────

const extractData = <T>(response: ApiResponse<T>): T => {
  return response.data;
};

const extractPaginatedData = <T>(response: ApiResponse<PaginatedResponse<T>>): PaginatedResponse<T> => {
  return response.data;
};

// ── Async Thunks ─────────────────────────────────────────────────────────────

// ── Create Report ───────────────────────────────────────────────────────────

export const createReport = createAsyncThunk(
  'serviceWeek/createReport',
  async (data: CreateServiceWeekPayload) => {
    const response = await axiosClient.post<ApiResponse<ServiceWeekReport>>(
      `${BASE_URL}/reports`,
      data
    );
    return extractData(response.data);
  }
);

// ── Read Reports ─────────────────────────────────────────────────────────────

export const fetchReports = createAsyncThunk(
  'serviceWeek/fetchReports',
  async (filters: ServiceWeekFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const url = params.toString() ? `${BASE_URL}/reports?${params}` : `${BASE_URL}/reports`;
    const response = await axiosClient.get<ApiResponse<PaginatedResponse<ServiceWeekReport>>>(url);
    console.log('RAW /reports response:', response.data); // ← temporary, check shape in devtools
    return extractPaginatedData(response.data);
  }
);

export const fetchReportById = createAsyncThunk(
  'serviceWeek/fetchReportById',
  async (id: string) => {
    const response = await axiosClient.get<ApiResponse<ServiceWeekReport>>(
      `${BASE_URL}/reports/${id}`
    );
    return extractData(response.data);
  }
);

// ─── Update Report ───────────────────────────────────────────────────────────

export const updateReport = createAsyncThunk(
  'serviceWeek/updateReport',
  async ({ id, data }: { id: string; data: UpdateServiceWeekPayload }) => {
    const response = await axiosClient.put<ApiResponse<ServiceWeekReport>>(
      `${BASE_URL}/reports/${id}`,
      data
    );
    return extractData(response.data);
  }
);

// ─── Submit Report ──────────────────────────────────────────────────────────

export const submitReport = createAsyncThunk(
  'serviceWeek/submitReport',
  async (id: string) => {
    const response = await axiosClient.post<ApiResponse<ServiceWeekReport>>(
      `${BASE_URL}/reports/${id}/submit`
    );
    return extractData(response.data);
  }
);

// ─── Delete Report ──────────────────────────────────────────────────────────

export const deleteReport = createAsyncThunk(
  'serviceWeek/deleteReport',
  async (id: string) => {
    await axiosClient.delete(`${BASE_URL}/reports/${id}`);
    return id;
  }
);

// ─── Generate PDF ──────────────────────────────────────────────────────────

export const generatePDF = createAsyncThunk<
  Blob,
  string,
  { rejectValue: string }
>(
  'serviceWeek/generatePDF',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(
        `${BASE_URL}/reports/${id}/pdf`,
        { responseType: 'blob' }
      );
      return response.data as Blob;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate PDF';
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const serviceWeekSlice = createSlice({
  name: 'serviceWeek',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ServiceWeekFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = { limit: 20 };
    },
    clearCurrentReport: (state) => {
      state.currentReport = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch Reports ──────────────────────────────────────────────────────
      .addCase(fetchReports.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
.addCase(fetchReports.fulfilled, (state, action) => {
  state.isLoading = false;
  state.reports = action.payload?.data ?? [];
  state.total = action.payload?.total ?? 0;
  state.page = action.payload?.page ?? 1;
  state.limit = action.payload?.limit ?? 20;
  state.totalPages = action.payload?.totalPages ?? 0;
})
      .addCase(fetchReports.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch reports';
      })

      // ── Fetch Report By ID ─────────────────────────────────────────────────
      .addCase(fetchReportById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReportById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentReport = action.payload;
      })
      .addCase(fetchReportById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch report';
      })

      // ── Create Report ─────────────────────────────────────────────────────
      .addCase(createReport.pending, (state) => {
        state.isSubmitting = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.reports = [action.payload, ...state.reports];
        state.total += 1;
      })
      .addCase(createReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create report';
      })

      // ── Update Report ─────────────────────────────────────────────────────
      .addCase(updateReport.pending, (state) => {
        state.isSubmitting = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        const index = state.reports.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        if (state.currentReport?.id === action.payload.id) {
          state.currentReport = action.payload;
        }
      })
      .addCase(updateReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update report';
      })

      // ── Submit Report ─────────────────────────────────────────────────────
      .addCase(submitReport.pending, (state) => {
        state.isSubmitting = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        const index = state.reports.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        if (state.currentReport?.id === action.payload.id) {
          state.currentReport = action.payload;
        }
      })
      .addCase(submitReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to submit report';
      })

      // ── Delete Report ─────────────────────────────────────────────────────
      .addCase(deleteReport.pending, (state) => {
        state.isSubmitting = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.reports = state.reports.filter(r => r.id !== action.payload);
        state.total -= 1;
        if (state.currentReport?.id === action.payload) {
          state.currentReport = null;
        }
      })
      .addCase(deleteReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete report';
      })

      // ── Generate PDF ──────────────────────────────────────────────────────
      .addCase(generatePDF.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generatePDF.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(generatePDF.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to generate PDF';
      });
  },
});

// ── Actions ─────────────────────────────────────────────────────────────────

export const {
  setFilters,
  resetFilters,
  clearCurrentReport,
  clearError,
} = serviceWeekSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectAllReports = (state: RootState) => state.serviceWeek.reports;
export const selectCurrentReport = (state: RootState) => state.serviceWeek.currentReport;
export const selectIsLoading = (state: RootState) => state.serviceWeek.isLoading;
export const selectIsSubmitting = (state: RootState) => state.serviceWeek.isSubmitting;
export const selectError = (state: RootState) => state.serviceWeek.error;
export const selectFilters = (state: RootState) => state.serviceWeek.filters;

// ... all your selectors ...

export const selectPagination = createSelector(
  [
    (state: RootState) => state.serviceWeek.total,
    (state: RootState) => state.serviceWeek.page,
    (state: RootState) => state.serviceWeek.limit,
    (state: RootState) => state.serviceWeek.totalPages,
  ],
  (total, page, limit, totalPages) => ({
    total,
    page,
    limit,
    totalPages,
  })
);

// ─── Export Download Helper ──────────────────────────────────────────────────

export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default serviceWeekSlice.reducer;