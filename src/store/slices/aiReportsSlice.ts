// aiReportsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportType = 'monthly' | 'quarterly';
export type ReportStatus = 'draft' | 'approved';

export interface ReportListItem {
    id: string;
    report_type: ReportType;
    period_start: string;
    period_end: string;
    status: ReportStatus;
    created_at: string;
    approved_by: string | null;
}

export interface ReportNarrative {
    executiveSummary: string;
    trends: string[];
    issues: string[];
    recommendations: string[];
}

export interface ReportDetail extends ReportListItem {
    summary_json: Record<string, unknown>;
    narrative_json: ReportNarrative;
    generated_by: string | null;
    updated_at: string;
}

interface AIReportsState {
    reports: ReportListItem[];
    currentReport: ReportDetail | null;
    listLoading: boolean;
    detailLoading: boolean;
    generating: boolean;
    approving: boolean;
    error: string | null;
}

const initialState: AIReportsState = {
    reports: [],
    currentReport: null,
    listLoading: false,
    detailLoading: false,
    generating: false,
    approving: false,
    error: null,
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchAllReports = createAsyncThunk(
    'aiReports/fetchAll',
    async (filters: { report_type?: ReportType; limit?: number; offset?: number } = {}) => {
        const params = new URLSearchParams();
        if (filters.report_type) params.set('report_type', filters.report_type);
        if (filters.limit) params.set('limit', String(filters.limit));
        if (filters.offset) params.set('offset', String(filters.offset));

        const { data } = await axiosClient.get(`/reports?${params.toString()}`);
        return data.data as ReportListItem[];
    }
);

export const fetchReportById = createAsyncThunk(
    'aiReports/fetchById',
    async (id: string) => {
        const { data } = await axiosClient.get(`/reports/${id}`);
        return data.data as ReportDetail;
    }
);

export const generateMonthlyReport = createAsyncThunk(
    'aiReports/generateMonthly',
    async ({ month, year }: { month: number; year: number }) => {
        const { data } = await axiosClient.post(`/reports/generate?month=${month}&year=${year}`);
        return data.data as ReportListItem;
    }
);

export const approveReport = createAsyncThunk(
    'aiReports/approve',
    async (id: string) => {
        const { data } = await axiosClient.put(`/reports/${id}/approve`);
        return data.data as ReportDetail;
    }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const aiReportsSlice = createSlice({
    name: 'aiReports',
    initialState,
    reducers: {
        clearCurrentReport: (state) => {
            state.currentReport = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // fetchAllReports
            .addCase(fetchAllReports.pending, (state) => {
                state.listLoading = true;
                state.error = null;
            })
            .addCase(fetchAllReports.fulfilled, (state, action) => {
                state.listLoading = false;
                state.reports = action.payload;
            })
            .addCase(fetchAllReports.rejected, (state, action) => {
                state.listLoading = false;
                state.error = action.error.message ?? 'Failed to load reports';
            })

            // fetchReportById
            .addCase(fetchReportById.pending, (state) => {
                state.detailLoading = true;
                state.error = null;
            })
            .addCase(fetchReportById.fulfilled, (state, action) => {
                state.detailLoading = false;
                state.currentReport = action.payload;
            })
            .addCase(fetchReportById.rejected, (state, action) => {
                state.detailLoading = false;
                state.error = action.error.message ?? 'Failed to load report';
            })

            // generateMonthlyReport
            .addCase(generateMonthlyReport.pending, (state) => {
                state.generating = true;
                state.error = null;
            })
            .addCase(generateMonthlyReport.fulfilled, (state, action) => {
                state.generating = false;
                state.reports.unshift(action.payload);
            })
            .addCase(generateMonthlyReport.rejected, (state, action) => {
                state.generating = false;
                state.error = action.error.message ?? 'Failed to generate report';
            })

            // approveReport
            .addCase(approveReport.pending, (state) => {
                state.approving = true;
                state.error = null;
            })
            .addCase(approveReport.fulfilled, (state, action) => {
                state.approving = false;
                state.currentReport = action.payload;
                const idx = state.reports.findIndex((r) => r.id === action.payload.id);
                if (idx !== -1) {
                    state.reports[idx] = {
                        ...state.reports[idx],
                        status: action.payload.status,
                        approved_by: action.payload.approved_by,
                    };
                }
            })
            .addCase(approveReport.rejected, (state, action) => {
                state.approving = false;
                state.error = action.error.message ?? 'Failed to approve report';
            });
    },
});

export const { clearCurrentReport } = aiReportsSlice.actions;
export default aiReportsSlice.reducer;