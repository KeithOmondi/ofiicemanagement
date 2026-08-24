// src/features/station-engagement/store/stationEngagement.slice.ts

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
  SubmitReportToAdminPayload,
} from '../../types/station-engagement.types';
import type { RootState } from '../../store/store';
import axios from 'axios';

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
  pdfPreview: {
    url: null,
    data: null,
    isGenerating: false,
    error: null,
  },
  downloadHistory: [],
  draftReports: [],
  isSavingDraft: false,
  draftSavedAt: null,
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
        if (typeof value === 'boolean') {
          params.append(key, String(value));
        } else {
          params.append(key, String(value));
        }
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

export const fetchDraftsByUser = createAsyncThunk(
  'stationEngagement/fetchDraftsByUser',
  async (filters: EngagementReportFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const url = params.toString() ? `${BASE_URL}/reports/drafts?${params}` : `${BASE_URL}/reports/drafts`;
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

// ─── Save as Draft ──────────────────────────────────────────────────────────

export const saveAsDraft = createAsyncThunk(
  'stationEngagement/saveAsDraft',
  async (id: string) => {
    const response = await axiosClient.post<ApiResponse<StationEngagementReport>>(
      `${BASE_URL}/reports/${id}/draft`
    );
    return extractData(response.data);
  }
);

// ─── Send to Admin ──────────────────────────────────────────────────────────

// src/features/station-engagement/store/stationEngagement.slice.ts

export const sendToAdmin = createAsyncThunk(
  'stationEngagement/sendToAdmin',
  async (payload: SubmitReportToAdminPayload) => {
    console.log('[sendToAdmin] payload:', payload);
    try {
      // ✅ Extract reportId from payload, don't send it in the body
      const { reportId, notes } = payload;
      
      const response = await axiosClient.post<ApiResponse<StationEngagementReport>>(
        `${BASE_URL}/reports/${reportId}/send-to-admin`,
        {
          // ✅ Only send what the backend expects in the body
          notes: notes || 'Report ready for review',
          // If your backend expects sendNotification, add it; otherwise remove it
          // sendNotification: sendNotification, // Uncomment if backend expects this
        }
      );
      console.log('[sendToAdmin] response:', response.data);
      return extractData(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error('[sendToAdmin] status:', error.response?.status);
        console.error('[sendToAdmin] response body:', error.response?.data);
      } else if (error instanceof Error) {
        console.error('[sendToAdmin] error:', error.message);
      } else {
        console.error('[sendToAdmin] unknown error:', error);
      }
      throw error;
    }
  }
);
// ─── Submit Report (Legacy) ────────────────────────────────────────────────

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

// ─── Generate PDF Preview ──────────────────────────────────────────────────

// src/features/station-engagement/store/stationEngagement.slice.ts

// ─── Generate PDF Preview ──────────────────────────────────────────────────

export const generatePDFPreview = createAsyncThunk<
  { previewUrl: string; previewData: string },
  { id: string; options?: { page?: number; scale?: number } },
  { rejectValue: string }
>(
  'stationEngagement/generatePDFPreview',
  async ({ id, options }, { rejectWithValue }) => {
    try {
      // ✅ Always send an object with default values
      const payload = {
        page: options?.page ?? 1,
        scale: options?.scale ?? 1,
      };
      
      console.log('🔍 [SLICE] generatePDFPreview called with:', { id, options, payload });
      
      const url = `${BASE_URL}/reports/${id}/pdf/preview`;
      console.log('🔍 [SLICE] Making POST request to:', url);
      console.log('🔍 [SLICE] Request body:', JSON.stringify(payload, null, 2));
      
      const response = await axiosClient.post<ApiResponse<{ previewUrl: string; previewData: string }>>(
        url,
        payload
      );
      
      console.log('✅ [SLICE] PDF preview response:', response.data);
      return extractData(response.data);
    } catch (error: unknown) {
      console.error('❌ [SLICE] PDF Preview error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response: { status: number; data: unknown } };
        console.error('❌ [SLICE] Error status:', err.response.status);
        console.error('❌ [SLICE] Error data:', JSON.stringify(err.response.data, null, 2));
      }
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate PDF preview';
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Attach PDF ─────────────────────────────────────────────────────────────

export const attachPDF = createAsyncThunk(
  'stationEngagement/attachPDF',
  async ({ id, publicId, secureUrl, fileName, generatedAt }: { 
    id: string; 
    publicId: string; 
    secureUrl: string; 
    fileName?: string; 
    generatedAt?: string;
  }) => {
    const response = await axiosClient.post<ApiResponse<StationEngagementReport>>(
      `${BASE_URL}/reports/${id}/pdf/attach`,
      { publicId, secureUrl, fileName, generatedAt }
    );
    return extractData(response.data);
  }
);

// ─── Types for Export Responses ─────────────────────────────────────────────

interface ExportResponse {
  blob: Blob;
  id: string;
}

// ─── Generate PDF ────────────────────────────────────────────────────────────

/**
 * Generate a PDF for a report
 * ✅ This works regardless of report status
 * Returns the blob for download
 */
export const generatePDF = createAsyncThunk<Blob, string, { rejectValue: string }>(
  'stationEngagement/generatePDF',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(
        `${BASE_URL}/reports/${id}/pdf`,
        {
          responseType: 'blob',
        }
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

// ─── Generate and Attach PDF ───────────────────────────────────────────────

/**
 * Generate a PDF, upload to Cloudinary, and attach to report in one step
 * ✅ This works regardless of report status
 * Returns the report with PDF attached
 */
export const generateAndAttachPDF = createAsyncThunk<
  StationEngagementReport,
  string,
  { rejectValue: string }
>(
  'stationEngagement/generateAndAttachPDF',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<StationEngagementReport>>(
        `${BASE_URL}/reports/${id}/pdf/generate-and-attach`
      );
      return extractData(response.data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate and attach PDF';
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

// ─── Download Report ─────────────────────────────────────────────────────────

export const downloadReport = createAsyncThunk<
  { blob: Blob; id: string; format: 'pdf' | 'excel' },
  { id: string; format: 'pdf' | 'excel' },
  { rejectValue: string }
>(
  'stationEngagement/downloadReport',
  async ({ id, format }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(
        `${BASE_URL}/reports/${id}/download?format=${format}`,
        {
          responseType: 'blob',
        }
      );
      return { blob: response.data as Blob, id, format };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to download report';
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Bulk Export ─────────────────────────────────────────────────────────────

export const bulkExport = createAsyncThunk<
  { blob: Blob; count: number },
  { reportIds: string[]; format: 'pdf' | 'excel' | 'both'; includeMetadata?: boolean },
  { rejectValue: string }
>(
  'stationEngagement/bulkExport',
  async ({ reportIds, format, includeMetadata = true }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(
        `${BASE_URL}/reports/bulk-export`,
        {
          report_ids: reportIds,
          format,
          include_metadata: includeMetadata,
        },
        {
          responseType: 'blob',
        }
      );
      return { blob: response.data as Blob, count: reportIds.length };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to bulk export reports';
      return rejectWithValue(errorMessage);
    }
  }
);

// ─── Draft Management ──────────────────────────────────────────────────────

export const manageDraft = createAsyncThunk(
  'stationEngagement/manageDraft',
  async ({ id, action, reason }: { id: string; action: 'save' | 'continue' | 'discard' | 'submit'; reason?: string }) => {
    const response = await axiosClient.post<ApiResponse<StationEngagementReport>>(
      `${BASE_URL}/reports/${id}/draft/manage`,
      { action, reason }
    );
    return extractData(response.data);
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
    clearPDFPreview: (state) => {
      state.pdfPreview = {
        url: null,
        data: null,
        isGenerating: false,
        error: null,
      };
    },
    clearDrafts: (state) => {
      state.draftReports = [];
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

      // ── Fetch Drafts By User ──────────────────────────────────────────────
      .addCase(fetchDraftsByUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDraftsByUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.draftReports = action.payload.data || [];
      })
      .addCase(fetchDraftsByUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch drafts';
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

      // ── Save as Draft ─────────────────────────────────────────────────────
      .addCase(saveAsDraft.pending, (state) => {
        state.isSavingDraft = true;
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(saveAsDraft.fulfilled, (state, action) => {
        state.isSavingDraft = false;
        state.isSubmitting = false;
        state.draftSavedAt = new Date().toISOString();
        const index = state.reports.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        if (state.currentReport?.id === action.payload.id) {
          state.currentReport = action.payload;
        }
        if (!state.draftReports.find(r => r.id === action.payload.id)) {
          state.draftReports = [action.payload, ...state.draftReports];
        }
      })
      .addCase(saveAsDraft.rejected, (state, action) => {
        state.isSavingDraft = false;
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to save draft';
      })

      // ── Send to Admin ─────────────────────────────────────────────────────
      .addCase(sendToAdmin.pending, (state) => {
        state.isSubmitting = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendToAdmin.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        const index = state.reports.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        if (state.currentReport?.id === action.payload.id) {
          state.currentReport = action.payload;
        }
        state.draftReports = state.draftReports.filter(r => r.id !== action.payload.id);
      })
      .addCase(sendToAdmin.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to send report to admin';
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
        state.draftReports = state.draftReports.filter(r => r.id !== action.payload);
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

      // ── Generate PDF Preview ─────────────────────────────────────────────
      .addCase(generatePDFPreview.pending, (state) => {
        state.pdfPreview.isGenerating = true;
        state.pdfPreview.error = null;
      })
      .addCase(generatePDFPreview.fulfilled, (state, action) => {
        state.pdfPreview.isGenerating = false;
        state.pdfPreview.url = action.payload.previewUrl;
        state.pdfPreview.data = action.payload.previewData;
      })
      .addCase(generatePDFPreview.rejected, (state, action) => {
        state.pdfPreview.isGenerating = false;
        state.pdfPreview.error = action.payload as string || 'Failed to generate PDF preview';
      })

      // ── Attach PDF ────────────────────────────────────────────────────────
      .addCase(attachPDF.pending, (state) => {
        state.isSubmitting = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(attachPDF.fulfilled, (state, action) => {
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
      .addCase(attachPDF.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to attach PDF';
      })

      // ── Generate PDF ──────────────────────────────────────────────────────
      .addCase(generatePDF.pending, (state) => {
        state.isGeneratingPDF = true;
        state.error = null;
      })
      .addCase(generatePDF.fulfilled, (state) => {
        state.isGeneratingPDF = false;
        // Don't store blob in state - it's handled by the component
      })
      .addCase(generatePDF.rejected, (state, action) => {
        state.isGeneratingPDF = false;
        state.error = action.payload as string || 'Failed to generate PDF';
      })

      // ── Generate and Attach PDF ──────────────────────────────────────────
      .addCase(generateAndAttachPDF.pending, (state) => {
        state.isGeneratingPDF = true;
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(generateAndAttachPDF.fulfilled, (state, action) => {
        state.isGeneratingPDF = false;
        state.isSubmitting = false;
        const index = state.reports.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        if (state.currentReport?.id === action.payload.id) {
          state.currentReport = action.payload;
        }
        // Update drafts if needed
        if (action.payload.status === 'draft') {
          if (!state.draftReports.find(r => r.id === action.payload.id)) {
            state.draftReports = [action.payload, ...state.draftReports];
          }
        }
      })
      .addCase(generateAndAttachPDF.rejected, (state, action) => {
        state.isGeneratingPDF = false;
        state.isSubmitting = false;
        state.error = action.payload as string || 'Failed to generate and attach PDF';
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
      })

      // ── Download Report ───────────────────────────────────────────────────
      .addCase(downloadReport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(downloadReport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.downloadHistory.push({
          reportId: action.payload.id,
          downloadedAt: new Date().toISOString(),
          format: action.payload.format,
          userId: '',
        });
      })
      .addCase(downloadReport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to download report';
      })

      // ── Bulk Export ──────────────────────────────────────────────────────
      .addCase(bulkExport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bulkExport.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(bulkExport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to bulk export';
      })

      // ── Draft Management ──────────────────────────────────────────────────
      .addCase(manageDraft.pending, (state) => {
        state.isSubmitting = true;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(manageDraft.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        const index = state.reports.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        if (state.currentReport?.id === action.payload.id) {
          state.currentReport = action.payload;
        }
        if (action.payload.status === 'draft') {
          if (!state.draftReports.find(r => r.id === action.payload.id)) {
            state.draftReports = [action.payload, ...state.draftReports];
          }
        } else {
          state.draftReports = state.draftReports.filter(r => r.id !== action.payload.id);
        }
      })
      .addCase(manageDraft.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isLoading = false;
        state.error = action.error.message || 'Failed to manage draft';
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
  clearPDFPreview,
  clearDrafts,
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
export const selectDraftReports = (state: RootState) => state.stationEngagement.draftReports;
export const selectPDFPreview = (state: RootState) => state.stationEngagement.pdfPreview;
export const selectDownloadHistory = (state: RootState) => state.stationEngagement.downloadHistory;

// ── Status Selectors ────────────────────────────────────────────────────────

export const selectIsLoading = (state: RootState) => state.stationEngagement.isLoading;
export const selectIsSubmitting = (state: RootState) => state.stationEngagement.isSubmitting;
export const selectIsGeneratingPDF = (state: RootState) => state.stationEngagement.isGeneratingPDF;
export const selectIsGeneratingExcel = (state: RootState) => state.stationEngagement.isGeneratingExcel;
export const selectIsSavingDraft = (state: RootState) => state.stationEngagement.isSavingDraft;
export const selectError = (state: RootState) => state.stationEngagement.error;
export const selectFilters = (state: RootState) => state.stationEngagement.filters;
export const selectDraftSavedAt = (state: RootState) => state.stationEngagement.draftSavedAt;

// ── Pagination Selectors ───────────────────────────────────────────────────

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

export const selectDraftCount = createSelector(
  [selectAllReports],
  (reports) => reports.filter(r => r.status === 'draft').length
);

export const selectSubmittedCount = createSelector(
  [selectAllReports],
  (reports) => reports.filter(r => r.status === 'submitted').length
);

export const selectVisibleToAdminReports = createSelector(
  [selectAllReports],
  (reports) => reports.filter(r => r.status !== 'draft')
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
    if (filters.visibleToAdmin !== undefined) {
      if (filters.visibleToAdmin === true) {
        result = result.filter(r => r.status !== 'draft');
      } else {
        result = result.filter(r => r.status === 'draft');
      }
    }
    if (filters.isDraft !== undefined && filters.isDraft === true) {
      result = result.filter(r => r.status === 'draft');
    }

    return result;
  }
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

export default stationEngagementSlice.reducer;