// ============================================================
// src/features/station-engagement/store/stationEngagement.slice.ts
// ============================================================

import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { SuccessionCourtCategory } from '../../types/succession-courts';
import type {
  StationEngagementState,
  StationEngagementReport,
  EngagementReportFilters,
  CreateEngagementReportPayload,
  UpdateEngagementReportPayload,
  ReviewReportPayload,
  ReportSummary,
  EngagementStats,
  ApiResponse,
  PaginatedResponse,
  Urgency,
  ReportStatus,
} from '../../types/station-engagement.types';
import type { RootState } from '../../store/store';

// ── Initial State ────────────────────────────────────────────────────────────

const initialState: StationEngagementState = {
  reports: [],
  currentReport: null,
  reportSummary: null,
  stats: null,
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
  pdfData: null,
  isGeneratingPDF: false,
  isGeneratingExcel: false,
  excelData: null,
};

const BASE_URL = '/station-engagement';

// ── Helper to extract data from API response ──────────────────────────────

const extractData = <T>(response: ApiResponse<T>): T => {
  return response.data;
};

const extractPaginatedData = <T>(response: ApiResponse<PaginatedResponse<T>>): PaginatedResponse<T> => {
  return response.data;
};

// ── Helper to format date to YYYY-MM-DD ────────────────────────────────────

const formatDateToYYYYMMDD = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

// ── Async Thunks ─────────────────────────────────────────────────────────────

// ── Create Report ───────────────────────────────────────────────────────────

export const createReport = createAsyncThunk(
  'stationEngagement/createReport',
  async (data: CreateEngagementReportPayload) => {
    const response = await axiosClient.post<ApiResponse<StationEngagementReport>>(
      `${BASE_URL}/reports`,
      data
    );
    return extractData(response.data);
  }
);

// ── Read Reports ─────────────────────────────────────────────────────────────

export const fetchReports = createAsyncThunk(
  'stationEngagement/fetchReports',
  async (filters: EngagementReportFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const url = params.toString() ? `${BASE_URL}/reports?${params}` : `${BASE_URL}/reports`;
    const response = await axiosClient.get<ApiResponse<PaginatedResponse<StationEngagementReport>>>(url);
    const paginated = extractPaginatedData(response.data);
    return paginated;
  }
);

export const fetchReportById = createAsyncThunk(
  'stationEngagement/fetchReportById',
  async (id: string) => {
    const response = await axiosClient.get<ApiResponse<StationEngagementReport>>(
      `${BASE_URL}/reports/${id}`
    );
    return extractData(response.data);
  }
);

export const fetchReportSummary = createAsyncThunk(
  'stationEngagement/fetchReportSummary',
  async (id: string) => {
    const response = await axiosClient.get<ApiResponse<ReportSummary>>(
      `${BASE_URL}/reports/${id}/summary`
    );
    return extractData(response.data);
  }
);

export const fetchReportsByWeek = createAsyncThunk(
  'stationEngagement/fetchReportsByWeek',
  async ({ week_start, week_end }: { week_start: string; week_end: string }) => {
    // Ensure dates are in YYYY-MM-DD format
    const formattedStart = formatDateToYYYYMMDD(week_start);
    const formattedEnd = formatDateToYYYYMMDD(week_end);
    
    const response = await axiosClient.get<ApiResponse<PaginatedResponse<StationEngagementReport>>>(
      `${BASE_URL}/reports/week?week_start=${formattedStart}&week_end=${formattedEnd}`
    );
    return extractPaginatedData(response.data);
  }
);

export const fetchReportsByUser = createAsyncThunk(
  'stationEngagement/fetchReportsByUser',
  async ({ userId, filters }: { userId: string; filters?: EngagementReportFilters }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const url = params.toString() 
      ? `${BASE_URL}/reports/user/${userId}?${params}` 
      : `${BASE_URL}/reports/user/${userId}`;
    const response = await axiosClient.get<ApiResponse<PaginatedResponse<StationEngagementReport>>>(url);
    return extractPaginatedData(response.data);
  }
);

// ─── Fetch Stats ─────────────────────────────────────────────────────────────

export const fetchEngagementStats = createAsyncThunk(
  'stationEngagement/fetchEngagementStats',
  async (params?: { category?: SuccessionCourtCategory; date_from?: string; date_to?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    const url = queryParams.toString() 
      ? `${BASE_URL}/stats?${queryParams}` 
      : `${BASE_URL}/stats`;
    const response = await axiosClient.get<ApiResponse<EngagementStats>>(url);
    return extractData(response.data);
  }
);

// ─── Update Report ───────────────────────────────────────────────────────────

export const updateReport = createAsyncThunk(
  'stationEngagement/updateReport',
  async ({ id, data }: { id: string; data: UpdateEngagementReportPayload }) => {
    const response = await axiosClient.put<ApiResponse<StationEngagementReport>>(
      `${BASE_URL}/reports/${id}`,
      data
    );
    return extractData(response.data);
  }
);

// ─── Submit Report ──────────────────────────────────────────────────────────

export const submitReport = createAsyncThunk(
  'stationEngagement/submitReport',
  async (id: string) => {
    const response = await axiosClient.post<ApiResponse<StationEngagementReport>>(
      `${BASE_URL}/reports/${id}/submit`
    );
    return extractData(response.data);
  }
);

// ─── Review Report ──────────────────────────────────────────────────────────

export const reviewReport = createAsyncThunk(
  'stationEngagement/reviewReport',
  async ({ id, data }: { id: string; data: ReviewReportPayload }) => {
    const response = await axiosClient.post<ApiResponse<StationEngagementReport>>(
      `${BASE_URL}/reports/${id}/review`,
      data
    );
    return extractData(response.data);
  }
);

// ─── Delete Report ──────────────────────────────────────────────────────────

export const deleteReport = createAsyncThunk(
  'stationEngagement/deleteReport',
  async (id: string) => {
    await axiosClient.delete(`${BASE_URL}/reports/${id}`);
    return id;
  }
);

// ─── Types for Export Responses ─────────────────────────────────────────────

interface ExportResponse {
  blob: Blob;
  id: string;
}

// ─── Generate PDF ────────────────────────────────────────────────────────────

export const generatePDF = createAsyncThunk<ExportResponse, string, { rejectValue: string }>(
  'stationEngagement/generatePDF',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(
        `${BASE_URL}/reports/${id}/pdf`,
        {
          responseType: 'blob',
        }
      );
      return { blob: response.data as Blob, id };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate PDF';
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Generate Excel ──────────────────────────────────────────────────────────

export const generateExcel = createAsyncThunk<ExportResponse, string, { rejectValue: string }>(
  'stationEngagement/generateExcel',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(
        `${BASE_URL}/reports/${id}/excel`,
        {
          responseType: 'blob',
        }
      );
      return { blob: response.data as Blob, id };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate Excel';
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Generate Both PDF and Excel ────────────────────────────────────────────

export const generateBoth = createAsyncThunk<ExportResponse, string, { rejectValue: string }>(
  'stationEngagement/generateBoth',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(
        `${BASE_URL}/reports/${id}/export-all`,
        {
          responseType: 'blob',
        }
      );
      return { blob: response.data as Blob, id };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate exports';
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const stationEngagementSlice = createSlice({
  name: 'stationEngagement',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<EngagementReportFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = { limit: 20 };
    },
    clearCurrentReport: (state) => {
      state.currentReport = null;
      state.reportSummary = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearPDFData: (state) => {
      state.pdfData = null;
    },
    clearExcelData: (state) => {
      state.excelData = null;
    },
    resetState: () => initialState,
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
        state.reports = action.payload.data || [];
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.limit = action.payload.limit || 20;
        state.totalPages = action.payload.totalPages || 0;
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

      // ── Fetch Report Summary ──────────────────────────────────────────────
      .addCase(fetchReportSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReportSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reportSummary = action.payload;
      })
      .addCase(fetchReportSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch report summary';
      })

      // ── Fetch Reports By Week ─────────────────────────────────────────────
      .addCase(fetchReportsByWeek.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReportsByWeek.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reports = action.payload.data || [];
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.limit = action.payload.limit || 20;
        state.totalPages = action.payload.totalPages || 0;
      })
      .addCase(fetchReportsByWeek.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch week reports';
      })

      // ── Fetch Reports By User ─────────────────────────────────────────────
      .addCase(fetchReportsByUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReportsByUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reports = action.payload.data || [];
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.limit = action.payload.limit || 20;
        state.totalPages = action.payload.totalPages || 0;
      })
      .addCase(fetchReportsByUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch user reports';
      })

      // ── Fetch Stats ────────────────────────────────────────────────────────
      .addCase(fetchEngagementStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEngagementStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchEngagementStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch stats';
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

      // ── Review Report ─────────────────────────────────────────────────────
      .addCase(reviewReport.pending, (state) => {
        state.isSubmitting = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(reviewReport.fulfilled, (state, action) => {
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
      .addCase(reviewReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to review report';
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
          state.reportSummary = null;
        }
      })
      .addCase(deleteReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete report';
      })

      // ── Generate PDF ──────────────────────────────────────────────────────
      .addCase(generatePDF.pending, (state) => {
        state.isGeneratingPDF = true;
        state.error = null;
      })
      .addCase(generatePDF.fulfilled, () => {
  // No state change needed here
})
      .addCase(generatePDF.rejected, (state, action) => {
        state.isGeneratingPDF = false;
        state.error = action.payload as string || 'Failed to generate PDF';
      })

      // ── Generate Excel ────────────────────────────────────────────────────
      .addCase(generateExcel.pending, (state) => {
        state.isGeneratingExcel = true;
        state.error = null;
      })
      .addCase(generateExcel.fulfilled, (state) => {
        state.isGeneratingExcel = false;
      })
      .addCase(generateExcel.rejected, (state, action) => {
        state.isGeneratingExcel = false;
        state.error = action.payload as string || 'Failed to generate Excel';
      })

      // ── Generate Both ─────────────────────────────────────────────────────
      .addCase(generateBoth.pending, (state) => {
        state.isGeneratingPDF = true;
        state.isGeneratingExcel = true;
        state.error = null;
      })
      .addCase(generateBoth.fulfilled, (state) => {
        state.isGeneratingPDF = false;
        state.isGeneratingExcel = false;
      })
      .addCase(generateBoth.rejected, (state, action) => {
        state.isGeneratingPDF = false;
        state.isGeneratingExcel = false;
        state.error = action.payload as string || 'Failed to generate exports';
      });
  },
});

// ── Actions ─────────────────────────────────────────────────────────────────

export const {
  setFilters,
  resetFilters,
  clearCurrentReport,
  clearError,
  clearPDFData,
  clearExcelData,
  resetState,
} = stationEngagementSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

// ── Base Selectors ──────────────────────────────────────────────────────────

export const selectAllReports = (state: RootState) => state.stationEngagement.reports;
export const selectCurrentReport = (state: RootState) => state.stationEngagement.currentReport;
export const selectReportSummary = (state: RootState) => state.stationEngagement.reportSummary;
export const selectEngagementStats = (state: RootState) => state.stationEngagement.stats;
export const selectPDFData = (state: RootState) => state.stationEngagement.pdfData;
export const selectExcelData = (state: RootState) => state.stationEngagement.excelData;

// ── Status Selectors ────────────────────────────────────────────────────────

export const selectIsLoading = (state: RootState) => state.stationEngagement.isLoading;
export const selectIsSubmitting = (state: RootState) => state.stationEngagement.isSubmitting;
export const selectIsGeneratingPDF = (state: RootState) => state.stationEngagement.isGeneratingPDF;
export const selectIsGeneratingExcel = (state: RootState) => state.stationEngagement.isGeneratingExcel;
export const selectError = (state: RootState) => state.stationEngagement.error;
export const selectFilters = (state: RootState) => state.stationEngagement.filters;

// ── Pagination Selectors ───────────────────────────────────────────────────

// ✅ Memoized selector to prevent unnecessary re-renders
export const selectPagination = createSelector(
  [
    (state: RootState) => state.stationEngagement.total,
    (state: RootState) => state.stationEngagement.page,
    (state: RootState) => state.stationEngagement.limit,
    (state: RootState) => state.stationEngagement.totalPages,
  ],
  (total, page, limit, totalPages) => ({
    total,
    page,
    limit,
    totalPages,
  })
);

// ── Derived Selectors ──────────────────────────────────────────────────────

export const selectReportsByStatus = createSelector(
  [selectAllReports, (_state: RootState, status: ReportStatus) => status],
  (reports, status) => reports.filter(r => r.status === status)
);

export const selectDraftReports = createSelector(
  [selectAllReports],
  (reports) => reports.filter(r => r.status === 'draft')
);

export const selectSubmittedReports = createSelector(
  [selectAllReports],
  (reports) => reports.filter(r => r.status === 'submitted')
);

export const selectReviewedReports = createSelector(
  [selectAllReports],
  (reports) => reports.filter(r => r.status === 'reviewed')
);

export const selectApprovedReports = createSelector(
  [selectAllReports],
  (reports) => reports.filter(r => r.status === 'approved')
);

export const selectRejectedReports = createSelector(
  [selectAllReports],
  (reports) => reports.filter(r => r.status === 'rejected')
);

export const selectReportsByCategory = createSelector(
  [selectAllReports, (_state: RootState, category: SuccessionCourtCategory) => category],
  (reports, category) => reports.filter(r => r.categories.includes(category))
);

export const selectReportsByWeek = createSelector(
  [selectAllReports, (_state: RootState, weekStart: string, weekEnd: string) => ({ weekStart, weekEnd })],
  (reports, { weekStart, weekEnd }) => 
    reports.filter(r => r.week_start === weekStart && r.week_end === weekEnd)
);

export const selectReportsBySupportPerson = createSelector(
  [selectAllReports, (_state: RootState, supportPersonId: string) => supportPersonId],
  (reports, supportPersonId) => reports.filter(r => r.support_person_id === supportPersonId)
);

export const selectReportsWithUrgency = createSelector(
  [selectAllReports, (_state: RootState, urgency: Urgency) => urgency],
  (reports, urgency) => 
    reports.filter(r => 
      r.escalations.some(e => e.urgency === urgency) ||
      r.engagements.some(e => e.urgency === urgency)
    )
);

export const selectTotalEngagements = createSelector(
  [selectAllReports],
  (reports) => {
    let total = 0;
    reports.forEach(r => {
      total += r.engagements?.length || 0;
    });
    return total;
  }
);

export const selectTotalEscalations = createSelector(
  [selectAllReports],
  (reports) => {
    let total = 0;
    reports.forEach(r => {
      total += r.escalations?.length || 0;
    });
    return total;
  }
);

export const selectEngagementRate = createSelector(
  [selectAllReports],
  (reports) => {
    if (reports.length === 0) return 0;
    let totalEngaged = 0;
    let totalStations = 0;
    reports.forEach(r => {
      totalEngaged += r.engagements?.length || 0;
      totalStations += r.total_stations_assigned || 0;
    });
    return totalStations > 0 ? (totalEngaged / totalStations) * 100 : 0;
  }
);

export const selectFilteredReports = createSelector(
  [selectAllReports, selectFilters],
  (reports, filters) => {
    let result = [...reports];

    if (filters.category) {
      result = result.filter(r => r.categories.includes(filters.category!));
    }
    if (filters.status) {
      result = result.filter(r => r.status === filters.status);
    }
    if (filters.urgency) {
      result = result.filter(r => 
        r.escalations.some(e => e.urgency === filters.urgency) ||
        r.engagements.some(e => e.urgency === filters.urgency)
      );
    }
    if (filters.week_start) {
      result = result.filter(r => r.week_start >= filters.week_start!);
    }
    if (filters.week_end) {
      result = result.filter(r => r.week_end <= filters.week_end!);
    }
    if (filters.submitted_by) {
      result = result.filter(r => r.submitted_by === filters.submitted_by);
    }
    if (filters.support_person_id) {
      result = result.filter(r => r.support_person_id === filters.support_person_id);
    }

    return result;
  }
);

// ── Export Download Helper ──────────────────────────────────────────────────

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

export default stationEngagementSlice.reducer;