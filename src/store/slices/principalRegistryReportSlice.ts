// src/store/slices/principalRegistryReportSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import type {
  PrincipalRegistryWeeklyReport,
  ReportFilters,
  CreateReportRequest,
  UpdateReportRequest,
  ReportStatus,
  ReportQuestion,
  GeneratePdfRequest,
  PDFGenerationResult,
  ReportSubmission,
  SensitizationResponse,
  SensitizationInput,
  SensitizationFilters,
  SensitizationListResponse,
} from '../../types/principal-registry-report.types';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

// ─── API Base URL ─────────────────────────────────────────────
const API_URL = '/principal-registry-reports';

// ─── Async Thunks ─────────────────────────────────────────────

/**
 * Fetch questions catalog
 */
export const fetchReportQuestions = createAsyncThunk<
  ReportQuestion[],
  string | undefined,
  { rejectValue: string }
>(
  'principalRegistryReport/fetchQuestions',
  async (departmentId, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`${API_URL}/questions`, {
        params: departmentId ? { departmentId } : undefined,
      });

      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch questions');
    }
  }
);

/**
 * Fetch all reports with optional filters
 */
export const fetchReports = createAsyncThunk<
  {
    reports: PrincipalRegistryWeeklyReport[];
    total: number;
    page: number;
    pageSize: number;
  },
  ReportFilters | undefined
>(
  'principalRegistryReport/fetchReports',
  async (filters) => {
    const response = await axiosClient.get(API_URL, { params: filters });
    
    const data = response.data;
    
    if (data && typeof data === 'object' && 'success' in data && data.success === true && 'data' in data) {
      const responseData = data.data as Record<string, unknown>;
      return {
        reports: (responseData.reports as PrincipalRegistryWeeklyReport[]) || [],
        total: (responseData.total as number) || 0,
        page: (responseData.page as number) || 1,
        pageSize: (responseData.pageSize as number) || 20,
      };
    }
    
    if (data && typeof data === 'object' && 'reports' in data) {
      return {
        reports: (data.reports as PrincipalRegistryWeeklyReport[]) || [],
        total: (data.total as number) || 0,
        page: (data.page as number) || 1,
        pageSize: (data.pageSize as number) || 20,
      };
    }
    
    if (Array.isArray(data)) {
      return {
        reports: data as PrincipalRegistryWeeklyReport[],
        total: data.length,
        page: 1,
        pageSize: 20,
      };
    }
    
    return {
      reports: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };
  }
);

/**
 * Fetch a single report by ID
 */
export const fetchReportById = createAsyncThunk<
  PrincipalRegistryWeeklyReport,
  string
>(
  'principalRegistryReport/fetchReportById',
  async (id) => {
    const response = await axiosClient.get(`${API_URL}/${id}`);
    return response.data.data as PrincipalRegistryWeeklyReport;
  }
);

/**
 * Create a new report
 */
export const createReport = createAsyncThunk<
  PrincipalRegistryWeeklyReport,
  CreateReportRequest
>(
  'principalRegistryReport/createReport',
  async (data) => {
    const response = await axiosClient.post(API_URL, data);
    return response.data.data as PrincipalRegistryWeeklyReport;
  }
);

/**
 * Update an existing report
 */
export const updateReport = createAsyncThunk<
  PrincipalRegistryWeeklyReport,
  { id: string; data: UpdateReportRequest }
>(
  'principalRegistryReport/updateReport',
  async ({ id, data }) => {
    const response = await axiosClient.patch(`${API_URL}/${id}`, data);
    return response.data.data as PrincipalRegistryWeeklyReport;
  }
);

/**
 * Submit a report (draft → submitted) - checks PDF attachment first
 */
export const submitReport = createAsyncThunk<
  { report: PrincipalRegistryWeeklyReport; submission: ReportSubmission },
  string,
  { rejectValue: string }
>(
  'principalRegistryReport/submitReport',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`${API_URL}/${id}/submit`);
      return response.data.data as { report: PrincipalRegistryWeeklyReport; submission: ReportSubmission };
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return rejectWithValue(err.response?.data?.message || 'Failed to submit report');
    }
  }
);

/**
 * Review a report (submitted → reviewed)
 */
export const reviewReport = createAsyncThunk<
  PrincipalRegistryWeeklyReport,
  string
>(
  'principalRegistryReport/reviewReport',
  async (id) => {
    const response = await axiosClient.post(`${API_URL}/${id}/review`);
    return response.data.data as PrincipalRegistryWeeklyReport;
  }
);

/**
 * Archive a report (reviewed → archived)
 */
export const archiveReport = createAsyncThunk<
  PrincipalRegistryWeeklyReport,
  string
>(
  'principalRegistryReport/archiveReport',
  async (id) => {
    const response = await axiosClient.post(`${API_URL}/${id}/archive`);
    return response.data.data as PrincipalRegistryWeeklyReport;
  }
);

/**
 * Generate PDF for a report (generates and attaches to report)
 */
export const generatePDF = createAsyncThunk<
  PDFGenerationResult,
  GeneratePdfRequest,
  { rejectValue: string }
>(
  'principalRegistryReport/generatePDF',
  async (request, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`${API_URL}/generate-pdf`, request);
      return response.data.data as PDFGenerationResult;
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return rejectWithValue(err.response?.data?.message || 'Failed to generate PDF');
    }
  }
);

/**
 * Get submission status for a report
 */
export const getSubmission = createAsyncThunk<
  ReportSubmission | null,
  string
>(
  'principalRegistryReport/getSubmission',
  async (reportId) => {
    const response = await axiosClient.get(`${API_URL}/${reportId}/submission`);
    return response.data.data as ReportSubmission | null;
  }
);

/**
 * Delete a report
 */
export const deleteReport = createAsyncThunk<
  string,
  string
>(
  'principalRegistryReport/deleteReport',
  async (id) => {
    await axiosClient.delete(`${API_URL}/${id}`);
    return id;
  }
);

// ══════════════════════════════════════════════════════════════
//  SENSITIZATION ASYNC THUNKS
// ══════════════════════════════════════════════════════════════

/**
 * Fetch all sensitizations with optional filters
 */
export const fetchSensitizations = createAsyncThunk<
  SensitizationListResponse,
  SensitizationFilters | undefined
>(
  'principalRegistryReport/fetchSensitizations',
  async (filters) => {
    const response = await axiosClient.get(`${API_URL}/sensitizations`, { params: filters });
    
    const data = response.data;
    
    if (data && typeof data === 'object' && 'success' in data && data.success === true && 'data' in data) {
      const responseData = data.data as Record<string, unknown>;
      return {
        items: (responseData.items as SensitizationResponse[]) || [],
        total: (responseData.total as number) || 0,
        page: (responseData.page as number) || 1,
        pageSize: (responseData.pageSize as number) || 20,
      };
    }
    
    if (data && typeof data === 'object' && 'items' in data) {
      return {
        items: (data.items as SensitizationResponse[]) || [],
        total: (data.total as number) || 0,
        page: (data.page as number) || 1,
        pageSize: (data.pageSize as number) || 20,
      };
    }
    
    if (Array.isArray(data)) {
      return {
        items: data as SensitizationResponse[],
        total: data.length,
        page: 1,
        pageSize: 20,
      };
    }
    
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };
  }
);

/**
 * Fetch a single sensitization by ID
 */
export const fetchSensitizationById = createAsyncThunk<
  SensitizationResponse,
  string
>(
  'principalRegistryReport/fetchSensitizationById',
  async (id) => {
    const response = await axiosClient.get(`${API_URL}/sensitizations/${id}`);
    return response.data.data as SensitizationResponse;
  }
);

/**
 * Create a new sensitization
 */
export const createSensitization = createAsyncThunk<
  SensitizationResponse,
  SensitizationInput
>(
  'principalRegistryReport/createSensitization',
  async (data) => {
    const response = await axiosClient.post(`${API_URL}/sensitizations`, data);
    return response.data.data as SensitizationResponse;
  }
);

/**
 * Update an existing sensitization
 */
export const updateSensitization = createAsyncThunk<
  SensitizationResponse,
  { id: string; data: Partial<SensitizationInput> }
>(
  'principalRegistryReport/updateSensitization',
  async ({ id, data }) => {
    const response = await axiosClient.patch(`${API_URL}/sensitizations/${id}`, data);
    return response.data.data as SensitizationResponse;
  }
);

/**
 * Submit a sensitization for approval (draft → submitted)
 */
export const submitSensitization = createAsyncThunk<
  SensitizationResponse,
  string,
  { rejectValue: string }
>(
  'principalRegistryReport/submitSensitization',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`${API_URL}/sensitizations/${id}/submit`);
      return response.data.data as SensitizationResponse;
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return rejectWithValue(err.response?.data?.message || 'Failed to submit sensitization');
    }
  }
);

/**
 * Approve a sensitization (submitted → approved)
 */
export const approveSensitization = createAsyncThunk<
  SensitizationResponse,
  string,
  { rejectValue: string }
>(
  'principalRegistryReport/approveSensitization',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`${API_URL}/sensitizations/${id}/approve`);
      return response.data.data as SensitizationResponse;
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return rejectWithValue(err.response?.data?.message || 'Failed to approve sensitization');
    }
  }
);

/**
 * Reject a sensitization (submitted → draft)
 */
export const rejectSensitization = createAsyncThunk<
  SensitizationResponse,
  string,
  { rejectValue: string }
>(
  'principalRegistryReport/rejectSensitization',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`${API_URL}/sensitizations/${id}/reject`);
      return response.data.data as SensitizationResponse;
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return rejectWithValue(err.response?.data?.message || 'Failed to reject sensitization');
    }
  }
);

/**
 * Delete a sensitization (draft only)
 */
export const deleteSensitization = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'principalRegistryReport/deleteSensitization',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`${API_URL}/sensitizations/${id}`);
      return id;
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      return rejectWithValue(err.response?.data?.message || 'Failed to delete sensitization');
    }
  }
);

// ─── State Interface ──────────────────────────────────────────

interface PrincipalRegistryReportState {
  reports: PrincipalRegistryWeeklyReport[];
  currentReport: PrincipalRegistryWeeklyReport | null;
  questions: ReportQuestion[];
  loading: boolean;
  questionsLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  filters: ReportFilters;
  isFormDirty: boolean;
  isSubmitting: boolean;
  selectedReportIds: string[];
  // PDF & Submission state
  generatingPDF: boolean;
  pdfResult: PDFGenerationResult | null;
  submission: ReportSubmission | null;
  // ─── Sensitization state ──────────────────────────────────
  sensitizations: SensitizationResponse[];
  currentSensitization: SensitizationResponse | null;
  sensitizationsTotal: number;
  sensitizationsPage: number;
  sensitizationsPageSize: number;
  sensitizationsFilters: SensitizationFilters;
  sensitizationsLoading: boolean;
  sensitizationsSubmitting: boolean;
  sensitizationsError: string | null;
  selectedSensitizationIds: string[];
}

// ─── Initial State ────────────────────────────────────────────

const initialState: PrincipalRegistryReportState = {
  reports: [],
  currentReport: null,
  questions: [],
  loading: false,
  questionsLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,
  filters: {},
  isFormDirty: false,
  isSubmitting: false,
  selectedReportIds: [],
  generatingPDF: false,
  pdfResult: null,
  submission: null,
  // ─── Sensitization initial state ──────────────────────────
  sensitizations: [],
  currentSensitization: null,
  sensitizationsTotal: 0,
  sensitizationsPage: 1,
  sensitizationsPageSize: 20,
  sensitizationsFilters: {},
  sensitizationsLoading: false,
  sensitizationsSubmitting: false,
  sensitizationsError: null,
  selectedSensitizationIds: [],
};

// ─── Slice ─────────────────────────────────────────────────────

const principalRegistryReportSlice = createSlice({
  name: 'principalRegistryReport',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ReportFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.page = 1;
      state.selectedReportIds = [];
    },
    clearFilters: (state) => {
      state.filters = {};
      state.page = 1;
      state.selectedReportIds = [];
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
      state.selectedReportIds = [];
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
      state.page = 1;
      state.selectedReportIds = [];
    },
    setCurrentReport: (state, action: PayloadAction<PrincipalRegistryWeeklyReport | null>) => {
      state.currentReport = action.payload;
    },
    clearCurrentReport: (state) => {
      state.currentReport = null;
    },
    setFormDirty: (state, action: PayloadAction<boolean>) => {
      state.isFormDirty = action.payload;
    },
    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },
    selectReport: (state, action: PayloadAction<string>) => {
      if (!state.selectedReportIds.includes(action.payload)) {
        state.selectedReportIds.push(action.payload);
      }
    },
    deselectReport: (state, action: PayloadAction<string>) => {
      state.selectedReportIds = state.selectedReportIds.filter(id => id !== action.payload);
    },
    toggleSelectReport: (state, action: PayloadAction<string>) => {
      const index = state.selectedReportIds.indexOf(action.payload);
      if (index === -1) {
        state.selectedReportIds.push(action.payload);
      } else {
        state.selectedReportIds.splice(index, 1);
      }
    },
    selectAllReports: (state) => {
      state.selectedReportIds = state.reports.map(r => r.id);
    },
    deselectAllReports: (state) => {
      state.selectedReportIds = [];
    },
    clearSelection: (state) => {
      state.selectedReportIds = [];
    },
    updateReportOptimistically: (
      state, 
      action: PayloadAction<{ 
        id: string; 
        updates: Partial<Omit<PrincipalRegistryWeeklyReport, 'id'>> 
      }>
    ) => {
      const { id, updates } = action.payload;
      const index = state.reports.findIndex(r => r.id === id);
      if (index !== -1) {
        state.reports[index] = { ...state.reports[index], ...updates };
      }
      if (state.currentReport?.id === id) {
        state.currentReport = { ...state.currentReport, ...updates };
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    clearPDFResult: (state) => {
      state.pdfResult = null;
    },
    clearSubmission: (state) => {
      state.submission = null;
    },
    // ─── Sensitization reducers ──────────────────────────────────
    setSensitizationFilters: (state, action: PayloadAction<SensitizationFilters>) => {
      state.sensitizationsFilters = { ...state.sensitizationsFilters, ...action.payload };
      state.sensitizationsPage = 1;
      state.selectedSensitizationIds = [];
    },
    clearSensitizationFilters: (state) => {
      state.sensitizationsFilters = {};
      state.sensitizationsPage = 1;
      state.selectedSensitizationIds = [];
    },
    setSensitizationPage: (state, action: PayloadAction<number>) => {
      state.sensitizationsPage = action.payload;
      state.selectedSensitizationIds = [];
    },
    setSensitizationPageSize: (state, action: PayloadAction<number>) => {
      state.sensitizationsPageSize = action.payload;
      state.sensitizationsPage = 1;
      state.selectedSensitizationIds = [];
    },
    setCurrentSensitization: (state, action: PayloadAction<SensitizationResponse | null>) => {
      state.currentSensitization = action.payload;
    },
    clearCurrentSensitization: (state) => {
      state.currentSensitization = null;
    },
    selectSensitization: (state, action: PayloadAction<string>) => {
      if (!state.selectedSensitizationIds.includes(action.payload)) {
        state.selectedSensitizationIds.push(action.payload);
      }
    },
    deselectSensitization: (state, action: PayloadAction<string>) => {
      state.selectedSensitizationIds = state.selectedSensitizationIds.filter(id => id !== action.payload);
    },
    toggleSelectSensitization: (state, action: PayloadAction<string>) => {
      const index = state.selectedSensitizationIds.indexOf(action.payload);
      if (index === -1) {
        state.selectedSensitizationIds.push(action.payload);
      } else {
        state.selectedSensitizationIds.splice(index, 1);
      }
    },
    selectAllSensitizations: (state) => {
      state.selectedSensitizationIds = state.sensitizations.map(s => s.id);
    },
    deselectAllSensitizations: (state) => {
      state.selectedSensitizationIds = [];
    },
    clearSensitizationSelection: (state) => {
      state.selectedSensitizationIds = [];
    },
    clearSensitizationError: (state) => {
      state.sensitizationsError = null;
    },
  },

  extraReducers: (builder) => {
    // ── Fetch Report Questions ──
    builder
      .addCase(fetchReportQuestions.pending, (state) => {
        state.questionsLoading = true;
        state.error = null;
      })
      .addCase(fetchReportQuestions.fulfilled, (state, action) => {
        state.questionsLoading = false;
        state.questions = action.payload || [];
      })
      .addCase(fetchReportQuestions.rejected, (state, action) => {
        state.questionsLoading = false;
        state.error = action.error.message || action.payload || 'Failed to fetch report questions';
      })

    // ── Fetch Reports ──
      .addCase(fetchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload.reports || [];
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.pageSize = action.payload.pageSize || 20;
        state.error = null;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch reports';
      })

    // ── Fetch Report By ID ──
      .addCase(fetchReportById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReport = action.payload;
      })
      .addCase(fetchReportById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch report';
      })

    // ── Create Report ──
      .addCase(createReport.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.reports = [action.payload, ...(state.reports || [])];
        state.total += 1;
        state.currentReport = action.payload;
        state.isFormDirty = false;
      })
      .addCase(createReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to create report';
      })

    // ── Update Report ──
      .addCase(updateReport.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = (state.reports || []).findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        if (state.currentReport?.id === action.payload.id) {
          state.currentReport = action.payload;
        }
        state.isFormDirty = false;
      })
      .addCase(updateReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to update report';
      })

    // ── Submit Report ──
      .addCase(submitReport.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
        state.submission = null;
      })
      .addCase(submitReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const { report, submission } = action.payload;
        const index = (state.reports || []).findIndex(r => r.id === report.id);
        if (index !== -1) {
          state.reports[index] = report;
        }
        if (state.currentReport?.id === report.id) {
          state.currentReport = report;
        }
        state.submission = submission;
      })
      .addCase(submitReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || action.payload || 'Failed to submit report';
      })

    // ── Review Report ──
      .addCase(reviewReport.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(reviewReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = (state.reports || []).findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        if (state.currentReport?.id === action.payload.id) {
          state.currentReport = action.payload;
        }
      })
      .addCase(reviewReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to review report';
      })

    // ── Archive Report ──
      .addCase(archiveReport.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(archiveReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = (state.reports || []).findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        }
        if (state.currentReport?.id === action.payload.id) {
          state.currentReport = action.payload;
        }
      })
      .addCase(archiveReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to archive report';
      })

    // ── Generate PDF ──
      .addCase(generatePDF.pending, (state) => {
        state.generatingPDF = true;
        state.error = null;
        state.pdfResult = null;
      })
      .addCase(generatePDF.fulfilled, (state, action) => {
        state.generatingPDF = false;
        state.pdfResult = action.payload;
        if (state.currentReport && action.payload.success && action.payload.secureUrl) {
          state.currentReport = {
            ...state.currentReport,
            pdfSecureUrl: action.payload.secureUrl,
            pdfPublicId: action.payload.publicId,
            pdfFileName: action.payload.fileName,
            pdfGeneratedAt: new Date().toISOString(),
          };
        }
      })
      .addCase(generatePDF.rejected, (state, action) => {
        state.generatingPDF = false;
        state.error = action.error.message || action.payload || 'Failed to generate PDF';
      })

    // ── Get Submission ──
      .addCase(getSubmission.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSubmission.fulfilled, (state, action) => {
        state.loading = false;
        state.submission = action.payload;
      })
      .addCase(getSubmission.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch submission';
      })

    // ── Delete Report ──
      .addCase(deleteReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = (state.reports || []).filter(r => r.id !== action.payload);
        state.total -= 1;
        state.selectedReportIds = (state.selectedReportIds || []).filter(id => id !== action.payload);
        if (state.currentReport?.id === action.payload) {
          state.currentReport = null;
        }
      })
      .addCase(deleteReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete report';
      })

    // ══════════════════════════════════════════════════════════════
    //  SENSITIZATION EXTRA REDUCERS
    // ══════════════════════════════════════════════════════════════

    // ── Fetch Sensitizations ──
      .addCase(fetchSensitizations.pending, (state) => {
        state.sensitizationsLoading = true;
        state.sensitizationsError = null;
      })
      .addCase(fetchSensitizations.fulfilled, (state, action) => {
        state.sensitizationsLoading = false;
        state.sensitizations = action.payload.items || [];
        state.sensitizationsTotal = action.payload.total || 0;
        state.sensitizationsPage = action.payload.page || 1;
        state.sensitizationsPageSize = action.payload.pageSize || 20;
        state.sensitizationsError = null;
      })
      .addCase(fetchSensitizations.rejected, (state, action) => {
        state.sensitizationsLoading = false;
        state.sensitizationsError = action.error.message || 'Failed to fetch sensitizations';
      })

    // ── Fetch Sensitization By ID ──
      .addCase(fetchSensitizationById.pending, (state) => {
        state.sensitizationsLoading = true;
        state.sensitizationsError = null;
      })
      .addCase(fetchSensitizationById.fulfilled, (state, action) => {
        state.sensitizationsLoading = false;
        state.currentSensitization = action.payload;
      })
      .addCase(fetchSensitizationById.rejected, (state, action) => {
        state.sensitizationsLoading = false;
        state.sensitizationsError = action.error.message || 'Failed to fetch sensitization';
      })

    // ── Create Sensitization ──
      .addCase(createSensitization.pending, (state) => {
        state.sensitizationsSubmitting = true;
        state.sensitizationsError = null;
      })
      .addCase(createSensitization.fulfilled, (state, action) => {
        state.sensitizationsSubmitting = false;
        state.sensitizations = [action.payload, ...(state.sensitizations || [])];
        state.sensitizationsTotal += 1;
        state.currentSensitization = action.payload;
      })
      .addCase(createSensitization.rejected, (state, action) => {
        state.sensitizationsSubmitting = false;
        state.sensitizationsError = action.error.message || 'Failed to create sensitization';
      })

    // ── Update Sensitization ──
      .addCase(updateSensitization.pending, (state) => {
        state.sensitizationsSubmitting = true;
        state.sensitizationsError = null;
      })
      .addCase(updateSensitization.fulfilled, (state, action) => {
        state.sensitizationsSubmitting = false;
        const index = (state.sensitizations || []).findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.sensitizations[index] = action.payload;
        }
        if (state.currentSensitization?.id === action.payload.id) {
          state.currentSensitization = action.payload;
        }
      })
      .addCase(updateSensitization.rejected, (state, action) => {
        state.sensitizationsSubmitting = false;
        state.sensitizationsError = action.error.message || 'Failed to update sensitization';
      })

    // ── Submit Sensitization ──
      .addCase(submitSensitization.pending, (state) => {
        state.sensitizationsSubmitting = true;
        state.sensitizationsError = null;
      })
      .addCase(submitSensitization.fulfilled, (state, action) => {
        state.sensitizationsSubmitting = false;
        const index = (state.sensitizations || []).findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.sensitizations[index] = action.payload;
        }
        if (state.currentSensitization?.id === action.payload.id) {
          state.currentSensitization = action.payload;
        }
      })
      .addCase(submitSensitization.rejected, (state, action) => {
        state.sensitizationsSubmitting = false;
        state.sensitizationsError = action.payload || action.error.message || 'Failed to submit sensitization';
      })

    // ── Approve Sensitization ──
      .addCase(approveSensitization.pending, (state) => {
        state.sensitizationsSubmitting = true;
        state.sensitizationsError = null;
      })
      .addCase(approveSensitization.fulfilled, (state, action) => {
        state.sensitizationsSubmitting = false;
        const index = (state.sensitizations || []).findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.sensitizations[index] = action.payload;
        }
        if (state.currentSensitization?.id === action.payload.id) {
          state.currentSensitization = action.payload;
        }
      })
      .addCase(approveSensitization.rejected, (state, action) => {
        state.sensitizationsSubmitting = false;
        state.sensitizationsError = action.payload || action.error.message || 'Failed to approve sensitization';
      })

    // ── Reject Sensitization ──
      .addCase(rejectSensitization.pending, (state) => {
        state.sensitizationsSubmitting = true;
        state.sensitizationsError = null;
      })
      .addCase(rejectSensitization.fulfilled, (state, action) => {
        state.sensitizationsSubmitting = false;
        const index = (state.sensitizations || []).findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.sensitizations[index] = action.payload;
        }
        if (state.currentSensitization?.id === action.payload.id) {
          state.currentSensitization = action.payload;
        }
      })
      .addCase(rejectSensitization.rejected, (state, action) => {
        state.sensitizationsSubmitting = false;
        state.sensitizationsError = action.payload || action.error.message || 'Failed to reject sensitization';
      })

    // ── Delete Sensitization ──
      .addCase(deleteSensitization.pending, (state) => {
        state.sensitizationsLoading = true;
        state.sensitizationsError = null;
      })
      .addCase(deleteSensitization.fulfilled, (state, action) => {
        state.sensitizationsLoading = false;
        state.sensitizations = (state.sensitizations || []).filter(s => s.id !== action.payload);
        state.sensitizationsTotal -= 1;
        state.selectedSensitizationIds = (state.selectedSensitizationIds || []).filter(id => id !== action.payload);
        if (state.currentSensitization?.id === action.payload) {
          state.currentSensitization = null;
        }
      })
      .addCase(deleteSensitization.rejected, (state, action) => {
        state.sensitizationsLoading = false;
        state.sensitizationsError = action.payload || action.error.message || 'Failed to delete sensitization';
      });
  },
});

// ─── Exports ───────────────────────────────────────────────────

export const {
  setFilters,
  clearFilters,
  setPage,
  setPageSize,
  setCurrentReport,
  clearCurrentReport,
  setFormDirty,
  setSubmitting,
  selectReport,
  deselectReport,
  toggleSelectReport,
  selectAllReports,
  deselectAllReports,
  clearSelection,
  updateReportOptimistically,
  clearError,
  clearPDFResult,
  clearSubmission,
  // ─── Sensitization exports ──────────────────────────────────
  setSensitizationFilters,
  clearSensitizationFilters,
  setSensitizationPage,
  setSensitizationPageSize,
  setCurrentSensitization,
  clearCurrentSensitization,
  selectSensitization,
  deselectSensitization,
  toggleSelectSensitization,
  selectAllSensitizations,
  deselectAllSensitizations,
  clearSensitizationSelection,
  clearSensitizationError,
} = principalRegistryReportSlice.actions;

export default principalRegistryReportSlice.reducer;

// ─── MEMOIZED SELECTORS ───────────────────────────────────────

const selectSelf = (state: { principalRegistryReport: PrincipalRegistryReportState }) =>
  state?.principalRegistryReport || initialState;

// ─── Report Selectors ──────────────────────────────────────────

export const selectAllReportsData = createSelector(
  [selectSelf],
  (slice) => slice?.reports || []
);

export const selectReportQuestionsData = createSelector(
  [selectSelf],
  (slice) => slice?.questions || []
);

export const selectCurrentReportData = createSelector(
  [selectSelf],
  (slice) => slice?.currentReport || null
);

export const selectReportsLoading = createSelector(
  [selectSelf],
  (slice) => slice?.loading || false
);

export const selectQuestionsLoading = createSelector(
  [selectSelf],
  (slice) => slice?.questionsLoading || false
);

export const selectReportsError = createSelector(
  [selectSelf],
  (slice) => slice?.error || null
);

export const selectReportsPagination = createSelector(
  [selectSelf],
  (slice) => ({
    total: slice?.total || 0,
    page: slice?.page || 1,
    pageSize: slice?.pageSize || 20,
  })
);

export const selectReportsFilters = createSelector(
  [selectSelf],
  (slice) => slice?.filters || {}
);

export const selectSelectedReportIds = createSelector(
  [selectSelf],
  (slice) => slice?.selectedReportIds || []
);

export const selectIsFormDirty = createSelector(
  [selectSelf],
  (slice) => slice?.isFormDirty || false
);

export const selectIsSubmitting = createSelector(
  [selectSelf],
  (slice) => slice?.isSubmitting || false
);

export const selectSelectedReportsData = createSelector(
  [selectAllReportsData, selectSelectedReportIds],
  (reports, selectedIds) => {
    const reportsArray = reports || [];
    const idsArray = selectedIds || [];
    return reportsArray.filter(r => idsArray.includes(r.id));
  }
);

export const selectReportCounts = createSelector(
  [selectAllReportsData],
  (reports) => {
    const reportsArray = reports || [];
    const counts: Record<ReportStatus, number> = {
      draft: 0,
      submitted: 0,
      reviewed: 0,
      archived: 0,
    };
    reportsArray.forEach(r => {
      if (r && r.status) {
        counts[r.status] = (counts[r.status] || 0) + 1;
      }
    });
    return counts;
  }
);

export const selectHasSelectedReports = createSelector(
  [selectSelectedReportIds],
  (ids) => (ids || []).length > 0
);

export const selectSelectedCount = createSelector(
  [selectSelectedReportIds],
  (ids) => (ids || []).length
);

export const selectAreAllReportsSelected = createSelector(
  [selectAllReportsData, selectSelectedReportIds],
  (reports, selectedIds) => {
    const reportsArray = reports || [];
    const idsArray = selectedIds || [];
    return reportsArray.length > 0 && reportsArray.every(r => idsArray.includes(r.id));
  }
);

// ─── PDF & Submission Selectors ──────────────────────────────

export const selectGeneratingPDF = createSelector(
  [selectSelf],
  (slice) => slice?.generatingPDF || false
);

export const selectPDFResult = createSelector(
  [selectSelf],
  (slice) => slice?.pdfResult || null
);

export const selectSubmission = createSelector(
  [selectSelf],
  (slice) => slice?.submission || null
);

export const selectHasPDFAttached = createSelector(
  [selectCurrentReportData],
  (report) => !!report?.pdfSecureUrl && !!report?.pdfPublicId
);

export const selectPDFUrl = createSelector(
  [selectCurrentReportData],
  (report) => report?.pdfSecureUrl || null
);

export const selectCanSubmit = createSelector(
  [selectCurrentReportData],
  (report) => report?.status === 'draft' && !!report?.pdfSecureUrl
);

export const selectCanGeneratePDF = createSelector(
  [selectCurrentReportData],
  (report) => report?.status === 'draft' || report?.status === 'submitted'
);

// ─── Parametric Report Selectors ──────────────────────────────

export const selectReportById = createSelector(
  [selectAllReportsData, (_state: unknown, id: string) => id],
  (reports, id) => (reports || []).find(r => r.id === id)
);

export const selectReportsByStatus = createSelector(
  [selectAllReportsData, (_state: unknown, status: ReportStatus) => status],
  (reports, status) => (reports || []).filter(r => r.status === status)
);

// ══════════════════════════════════════════════════════════════
//  SENSITIZATION SELECTORS
// ══════════════════════════════════════════════════════════════

export const selectAllSensitizationsData = createSelector(
  [selectSelf],
  (slice) => slice?.sensitizations || []
);

export const selectCurrentSensitizationData = createSelector(
  [selectSelf],
  (slice) => slice?.currentSensitization || null
);

export const selectSensitizationsLoading = createSelector(
  [selectSelf],
  (slice) => slice?.sensitizationsLoading || false
);

export const selectSensitizationsSubmitting = createSelector(
  [selectSelf],
  (slice) => slice?.sensitizationsSubmitting || false
);

export const selectSensitizationsError = createSelector(
  [selectSelf],
  (slice) => slice?.sensitizationsError || null
);

export const selectSensitizationsPagination = createSelector(
  [selectSelf],
  (slice) => ({
    total: slice?.sensitizationsTotal || 0,
    page: slice?.sensitizationsPage || 1,
    pageSize: slice?.sensitizationsPageSize || 20,
  })
);

export const selectSensitizationsFilters = createSelector(
  [selectSelf],
  (slice) => slice?.sensitizationsFilters || {}
);

export const selectSelectedSensitizationIds = createSelector(
  [selectSelf],
  (slice) => slice?.selectedSensitizationIds || []
);

export const selectSelectedSensitizationsData = createSelector(
  [selectAllSensitizationsData, selectSelectedSensitizationIds],
  (sensitizations, selectedIds) => {
    const itemsArray = sensitizations || [];
    const idsArray = selectedIds || [];
    return itemsArray.filter(s => idsArray.includes(s.id));
  }
);

export const selectHasSelectedSensitizations = createSelector(
  [selectSelectedSensitizationIds],
  (ids) => (ids || []).length > 0
);

export const selectSelectedSensitizationsCount = createSelector(
  [selectSelectedSensitizationIds],
  (ids) => (ids || []).length
);

export const selectAreAllSensitizationsSelected = createSelector(
  [selectAllSensitizationsData, selectSelectedSensitizationIds],
  (sensitizations, selectedIds) => {
    const itemsArray = sensitizations || [];
    const idsArray = selectedIds || [];
    return itemsArray.length > 0 && itemsArray.every(s => idsArray.includes(s.id));
  }
);

// ─── Parametric Sensitization Selectors ──────────────────────

export const selectSensitizationById = createSelector(
  [selectAllSensitizationsData, (_state: unknown, id: string) => id],
  (sensitizations, id) => (sensitizations || []).find(s => s.id === id)
);

export const selectSensitizationsByStatus = createSelector(
  [selectAllSensitizationsData, (_state: unknown, status: string) => status],
  (sensitizations, status) => (sensitizations || []).filter(s => s.status === status)
);

export const selectSensitizationsByLocation = createSelector(
  [selectAllSensitizationsData, (_state: unknown, location: string) => location],
  (sensitizations, location) => (sensitizations || []).filter(s => 
    s.data.location.toLowerCase().includes(location.toLowerCase())
  )
);

// ─── Sensitization Status Counts ─────────────────────────────

export const selectSensitizationCounts = createSelector(
  [selectAllSensitizationsData],
  (sensitizations) => {
    const itemsArray = sensitizations || [];
    const counts = {
      draft: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };
    itemsArray.forEach(s => {
      if (s && s.status) {
        counts[s.status as keyof typeof counts] = (counts[s.status as keyof typeof counts] || 0) + 1;
      }
    });
    return counts;
  }
);

// ─── Sensitization Helpers ────────────────────────────────────

export const selectCanEditSensitization = createSelector(
  [selectCurrentSensitizationData],
  (sensitization) => sensitization?.status === 'draft'
);

export const selectCanSubmitSensitization = createSelector(
  [selectCurrentSensitizationData],
  (sensitization) => sensitization?.status === 'draft'
);

export const selectCanApproveSensitization = createSelector(
  [selectCurrentSensitizationData],
  (sensitization) => sensitization?.status === 'submitted'
);

export const selectCanRejectSensitization = createSelector(
  [selectCurrentSensitizationData],
  (sensitization) => sensitization?.status === 'submitted'
);

export const selectCanDeleteSensitization = createSelector(
  [selectCurrentSensitizationData],
  (sensitization) => sensitization?.status === 'draft'
);

// ─── Type Guards ──────────────────────────────────────────────

export const isReportStatus = (value: string): value is ReportStatus => {
  return ['draft', 'submitted', 'reviewed', 'archived'].includes(value);
};

export type { PrincipalRegistryReportState };