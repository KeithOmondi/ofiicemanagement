import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */

export type FinancialActivityType = 'Expenditure' | 'Commitment' | 'Pro Bono';
export type FinancialStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid';
export type ProBonoStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed';
export type ReportStatus = 'Draft' | 'Submitted' | 'Approved';

export interface VoteLine {
    id: string;
    name: string;
    allocated: number;
    spent: number;
    committed: number;
    available: number;
    has_allocation: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FinancialActivity {
    id: string;
    activity: string;
    payee: string;
    vote_id: string | null;
    vote_name: string;
    amount: number;
    date: string;
    type: FinancialActivityType;
    status: FinancialStatus;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export interface ProBonoRequest {
    id: string;
    organization: string;
    service_type: string;
    description: string | null;
    value: number;
    status: ProBonoStatus;
    submitted_by: string | null;
    submitted_by_name: string | null;
    submitted_date: string;
    approved_by: string | null;
    approved_date: string | null;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export interface FinancialAuditEntry {
    id: string;
    actor: string | null;
    actor_name: string | null;
    action: string;
    detail: string | null;
    timestamp: string;
    entity_type: string | null;
    entity_id: string | null;
}

export interface MonthlyBudgetReport {
    id: string;
    report_month: string;
    total_allocated: number;
    total_spent: number;
    total_committed: number;
    total_available: number;
    submitted_by: string | null;
    submitted_date: string | null;
    approved_by: string | null;
    approved_date: string | null;
    status: ReportStatus;
    created_at: string;
    updated_at: string;
}

export interface FinancialStats {
    total_allocated: number;
    total_paid: number;
    committed_unpaid: number;
    pro_bono_approved: number;
}

export interface CreateVoteLineInput {
    name: string;
    allocated?: number;
}

export interface UpdateVoteLineInput {
    name?: string;
    allocated?: number;
    spent?: number;
    committed?: number;
    has_allocation?: boolean;
    is_active?: boolean;
}

export interface CreateFinancialActivityInput {
    activity: string;
    payee: string;
    vote_id?: string | null;
    vote_name: string;
    amount: number;
    date: string;
    type: FinancialActivityType;
    status?: FinancialStatus;
}

export interface UpdateFinancialActivityInput {
    activity?: string;
    payee?: string;
    vote_id?: string | null;
    vote_name?: string;
    amount?: number;
    date?: string;
    type?: FinancialActivityType;
    status?: FinancialStatus;
    is_active?: boolean;
}

export interface CreateProBonoInput {
    organization: string;
    service_type: string;
    description?: string;
    value: number;
    status?: ProBonoStatus;
    submitted_by_name?: string;
    submitted_date?: string;
}

export interface UpdateProBonoInput {
    organization?: string;
    service_type?: string;
    description?: string | null;
    value?: number;
    status?: ProBonoStatus;
    approved_by?: string | null;
    approved_date?: string | null;
    is_active?: boolean;
}

export interface CreateBudgetReportInput {
    report_month: string;
}

export interface ActivityFilters {
    search?: string;
    vote?: string;
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
}

export interface ProBonoFilters {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
}

// ─── State Interface ──────────────────────────────────────────────────────────

interface FinancialState {
    voteLines: VoteLine[];
    activities: FinancialActivity[];
    proBonoRequests: ProBonoRequest[];
    budgetReports: MonthlyBudgetReport[];
    auditLog: FinancialAuditEntry[];
    stats: FinancialStats | null;
    selectedVoteLine: VoteLine | null;
    selectedActivity: FinancialActivity | null;
    selectedProBono: ProBonoRequest | null;
    selectedReport: MonthlyBudgetReport | null;
    loading: {
        voteLines: boolean;
        activities: boolean;
        proBono: boolean;
        reports: boolean;
        auditLog: boolean;
        stats: boolean;
        mutating: boolean;
    };
    error: string | null;
    success: boolean;
    filters: {
        activity: ActivityFilters;
        proBono: ProBonoFilters;
    };
    pagination: {
        activities: { limit: number; offset: number; total: number };
        proBono: { limit: number; offset: number; total: number };
    };
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: FinancialState = {
    voteLines: [],
    activities: [],
    proBonoRequests: [],
    budgetReports: [],
    auditLog: [],
    stats: null,
    selectedVoteLine: null,
    selectedActivity: null,
    selectedProBono: null,
    selectedReport: null,
    loading: {
        voteLines: false,
        activities: false,
        proBono: false,
        reports: false,
        auditLog: false,
        stats: false,
        mutating: false,
    },
    error: null,
    success: false,
    filters: {
        activity: {
            search: '',
            vote: 'All Votes',
            type: 'All Types',
            status: 'All Statuses',
        },
        proBono: {
            search: '',
            status: 'All Statuses',
        },
    },
    pagination: {
        activities: { limit: 50, offset: 0, total: 0 },
        proBono: { limit: 50, offset: 0, total: 0 },
    },
};

/* ============================================================
   HELPERS
============================================================ */

const extractError = (error: unknown): string => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

const buildActivityQuery = (filters: ActivityFilters): string => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.vote && filters.vote !== 'All Votes') params.append('vote', filters.vote);
    if (filters.type && filters.type !== 'All Types') params.append('type', filters.type);
    if (filters.status && filters.status !== 'All Statuses') params.append('status', filters.status);
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));
    return params.toString() ? `?${params.toString()}` : '';
};

const buildProBonoQuery = (filters: ProBonoFilters): string => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'All Statuses') params.append('status', filters.status);
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));
    return params.toString() ? `?${params.toString()}` : '';
};

/* ============================================================
   THUNKS - STATS
============================================================ */

export const fetchFinancialStats = createAsyncThunk(
    'financial/fetchStats',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/financial/stats');
            return data.data as FinancialStats;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

/* ============================================================
   THUNKS - VOTE LINES
============================================================ */

export const fetchVoteLines = createAsyncThunk(
    'financial/fetchVoteLines',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/financial/vote-lines');
            return data.data as VoteLine[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchVoteLineById = createAsyncThunk(
    'financial/fetchVoteLineById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/financial/vote-lines/${id}`);
            return data.data as VoteLine;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const createVoteLine = createAsyncThunk(
    'financial/createVoteLine',
    async (input: CreateVoteLineInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/financial/vote-lines', input);
            return data.data as VoteLine;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const updateVoteLine = createAsyncThunk(
    'financial/updateVoteLine',
    async ({ id, input }: { id: string; input: UpdateVoteLineInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/financial/vote-lines/${id}`, input);
            return data.data as VoteLine;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const deleteVoteLine = createAsyncThunk(
    'financial/deleteVoteLine',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/financial/vote-lines/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

/* ============================================================
   THUNKS - FINANCIAL ACTIVITIES
============================================================ */

export const fetchActivities = createAsyncThunk(
    'financial/fetchActivities',
    async (filters: ActivityFilters = {}, { rejectWithValue }) => {
        try {
            const query = buildActivityQuery(filters);
            const { data } = await axiosClient.get(`/financial/activities${query}`);
            return data.data as FinancialActivity[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchActivityById = createAsyncThunk(
    'financial/fetchActivityById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/financial/activities/${id}`);
            return data.data as FinancialActivity;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const createActivity = createAsyncThunk(
    'financial/createActivity',
    async (input: CreateFinancialActivityInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/financial/activities', input);
            return data.data as FinancialActivity;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const updateActivity = createAsyncThunk(
    'financial/updateActivity',
    async ({ id, input }: { id: string; input: UpdateFinancialActivityInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/financial/activities/${id}`, input);
            return data.data as FinancialActivity;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const deleteActivity = createAsyncThunk(
    'financial/deleteActivity',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/financial/activities/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

/* ============================================================
   THUNKS - PRO BONO REQUESTS
============================================================ */

export const fetchProBonoRequests = createAsyncThunk(
    'financial/fetchProBonoRequests',
    async (filters: ProBonoFilters = {}, { rejectWithValue }) => {
        try {
            const query = buildProBonoQuery(filters);
            const { data } = await axiosClient.get(`/financial/probono${query}`);
            return data.data as ProBonoRequest[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchProBonoById = createAsyncThunk(
    'financial/fetchProBonoById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/financial/probono/${id}`);
            return data.data as ProBonoRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const createProBono = createAsyncThunk(
    'financial/createProBono',
    async (input: CreateProBonoInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/financial/probono', input);
            return data.data as ProBonoRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const updateProBono = createAsyncThunk(
    'financial/updateProBono',
    async ({ id, input }: { id: string; input: UpdateProBonoInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/financial/probono/${id}`, input);
            return data.data as ProBonoRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const deleteProBono = createAsyncThunk(
    'financial/deleteProBono',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/financial/probono/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

/* ============================================================
   THUNKS - BUDGET REPORTS
============================================================ */

export const fetchBudgetReports = createAsyncThunk(
    'financial/fetchBudgetReports',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/financial/reports');
            return data.data as MonthlyBudgetReport[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const createBudgetReport = createAsyncThunk(
    'financial/createBudgetReport',
    async (input: CreateBudgetReportInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/financial/reports', input);
            return data.data as MonthlyBudgetReport;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const submitBudgetReport = createAsyncThunk(
    'financial/submitBudgetReport',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/financial/reports/${id}/submit`);
            return data.data as MonthlyBudgetReport;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const approveBudgetReport = createAsyncThunk(
    'financial/approveBudgetReport',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/financial/reports/${id}/approve`);
            return data.data as MonthlyBudgetReport;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

/* ============================================================
   THUNKS - AUDIT LOG
============================================================ */

export const fetchFinancialAuditLog = createAsyncThunk(
    'financial/fetchAuditLog',
    async (limit: number = 50, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/financial/audit-log?limit=${limit}`);
            return data.data as FinancialAuditEntry[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

/* ============================================================
   SLICE
============================================================ */

const financialSlice = createSlice({
    name: 'financial',
    initialState,
    reducers: {
        // ─── Selection ──────────────────────────────────────────────────────
        setSelectedVoteLine(state, action: PayloadAction<VoteLine | null>) {
            state.selectedVoteLine = action.payload;
            state.error = null;
        },
        setSelectedActivity(state, action: PayloadAction<FinancialActivity | null>) {
            state.selectedActivity = action.payload;
            state.error = null;
        },
        setSelectedProBono(state, action: PayloadAction<ProBonoRequest | null>) {
            state.selectedProBono = action.payload;
            state.error = null;
        },
        setSelectedReport(state, action: PayloadAction<MonthlyBudgetReport | null>) {
            state.selectedReport = action.payload;
            state.error = null;
        },

        // ─── Filters ────────────────────────────────────────────────────────
        setActivityFilters(state, action: PayloadAction<Partial<ActivityFilters>>) {
            state.filters.activity = { ...state.filters.activity, ...action.payload };
            state.pagination.activities.offset = 0; // Reset pagination on filter change
        },
        setProBonoFilters(state, action: PayloadAction<Partial<ProBonoFilters>>) {
            state.filters.proBono = { ...state.filters.proBono, ...action.payload };
            state.pagination.proBono.offset = 0; // Reset pagination on filter change
        },
        clearActivityFilters(state) {
            state.filters.activity = {
                search: '',
                vote: 'All Votes',
                type: 'All Types',
                status: 'All Statuses',
            };
            state.pagination.activities.offset = 0;
        },
        clearProBonoFilters(state) {
            state.filters.proBono = {
                search: '',
                status: 'All Statuses',
            };
            state.pagination.proBono.offset = 0;
        },

        // ─── Pagination ─────────────────────────────────────────────────────
        setActivityPagination(state, action: PayloadAction<{ limit?: number; offset?: number; total?: number }>) {
            state.pagination.activities = { ...state.pagination.activities, ...action.payload };
        },
        setProBonoPagination(state, action: PayloadAction<{ limit?: number; offset?: number; total?: number }>) {
            state.pagination.proBono = { ...state.pagination.proBono, ...action.payload };
        },

        // ─── Status ─────────────────────────────────────────────────────────
        clearError(state) {
            state.error = null;
        },
        clearSuccess(state) {
            state.success = false;
        },
        resetFinancialState: () => initialState,

        // ─── Local Optimistic Updates ──────────────────────────────────────
        updateVoteLineLocally(state, action: PayloadAction<{ id: string; updates: Partial<VoteLine> }>) {
            const { id, updates } = action.payload;
            const index = state.voteLines.findIndex(v => v.id === id);
            if (index !== -1) {
                state.voteLines[index] = { ...state.voteLines[index], ...updates };
            }
            if (state.selectedVoteLine?.id === id) {
                state.selectedVoteLine = { ...state.selectedVoteLine, ...updates };
            }
        },
        updateActivityStatusLocally(state, action: PayloadAction<{ id: string; status: FinancialStatus }>) {
            const { id, status } = action.payload;
            const activity = state.activities.find(a => a.id === id);
            if (activity) {
                activity.status = status;
            }
            if (state.selectedActivity?.id === id) {
                state.selectedActivity.status = status;
            }
        },
        updateProBonoStatusLocally(state, action: PayloadAction<{ id: string; status: ProBonoStatus }>) {
            const { id, status } = action.payload;
            const request = state.proBonoRequests.find(p => p.id === id);
            if (request) {
                request.status = status;
            }
            if (state.selectedProBono?.id === id) {
                state.selectedProBono.status = status;
            }
        },
    },
    extraReducers: (builder) => {
        /* ──────── FETCH STATS ──────────────────────────────────────────────── */
        builder
            .addCase(fetchFinancialStats.pending, (state) => {
                state.loading.stats = true;
                state.error = null;
            })
            .addCase(fetchFinancialStats.fulfilled, (state, action: PayloadAction<FinancialStats>) => {
                state.loading.stats = false;
                state.stats = action.payload;
            })
            .addCase(fetchFinancialStats.rejected, (state, action) => {
                state.loading.stats = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH VOTE LINES ─────────────────────────────────────────── */
        builder
            .addCase(fetchVoteLines.pending, (state) => {
                state.loading.voteLines = true;
                state.error = null;
            })
            .addCase(fetchVoteLines.fulfilled, (state, action: PayloadAction<VoteLine[]>) => {
                state.loading.voteLines = false;
                state.voteLines = action.payload;
            })
            .addCase(fetchVoteLines.rejected, (state, action) => {
                state.loading.voteLines = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH VOTE LINE BY ID ────────────────────────────────────── */
        builder
            .addCase(fetchVoteLineById.pending, (state) => {
                state.loading.voteLines = true;
                state.error = null;
            })
            .addCase(fetchVoteLineById.fulfilled, (state, action: PayloadAction<VoteLine>) => {
                state.loading.voteLines = false;
                state.selectedVoteLine = action.payload;
            })
            .addCase(fetchVoteLineById.rejected, (state, action) => {
                state.loading.voteLines = false;
                state.error = action.payload as string;
            });

        /* ──────── CREATE VOTE LINE ─────────────────────────────────────────── */
        builder
            .addCase(createVoteLine.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createVoteLine.fulfilled, (state, action: PayloadAction<VoteLine>) => {
                state.loading.mutating = false;
                state.success = true;
                state.voteLines = [...state.voteLines, action.payload];
            })
            .addCase(createVoteLine.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── UPDATE VOTE LINE ─────────────────────────────────────────── */
        builder
            .addCase(updateVoteLine.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateVoteLine.fulfilled, (state, action: PayloadAction<VoteLine>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.voteLines.findIndex(v => v.id === action.payload.id);
                if (index !== -1) {
                    state.voteLines[index] = action.payload;
                }
                if (state.selectedVoteLine?.id === action.payload.id) {
                    state.selectedVoteLine = action.payload;
                }
            })
            .addCase(updateVoteLine.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── DELETE VOTE LINE ─────────────────────────────────────────── */
        builder
            .addCase(deleteVoteLine.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
            })
            .addCase(deleteVoteLine.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                state.voteLines = state.voteLines.filter(v => v.id !== action.payload);
                if (state.selectedVoteLine?.id === action.payload) {
                    state.selectedVoteLine = null;
                }
            })
            .addCase(deleteVoteLine.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH ACTIVITIES ─────────────────────────────────────────── */
        builder
            .addCase(fetchActivities.pending, (state) => {
                state.loading.activities = true;
                state.error = null;
            })
            .addCase(fetchActivities.fulfilled, (state, action: PayloadAction<FinancialActivity[]>) => {
                state.loading.activities = false;
                state.activities = action.payload;
                state.pagination.activities.total = action.payload.length;
            })
            .addCase(fetchActivities.rejected, (state, action) => {
                state.loading.activities = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH ACTIVITY BY ID ─────────────────────────────────────── */
        builder
            .addCase(fetchActivityById.pending, (state) => {
                state.loading.activities = true;
                state.error = null;
            })
            .addCase(fetchActivityById.fulfilled, (state, action: PayloadAction<FinancialActivity>) => {
                state.loading.activities = false;
                state.selectedActivity = action.payload;
            })
            .addCase(fetchActivityById.rejected, (state, action) => {
                state.loading.activities = false;
                state.error = action.payload as string;
            });

        /* ──────── CREATE ACTIVITY ──────────────────────────────────────────── */
        builder
            .addCase(createActivity.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createActivity.fulfilled, (state, action: PayloadAction<FinancialActivity>) => {
                state.loading.mutating = false;
                state.success = true;
                state.activities = [action.payload, ...state.activities];
                // Update stats
                if (state.stats) {
                    if (action.payload.status === 'Paid') {
                        state.stats.total_paid += action.payload.amount;
                    }
                    if (action.payload.status === 'Pending') {
                        state.stats.committed_unpaid += action.payload.amount;
                    }
                }
            })
            .addCase(createActivity.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── UPDATE ACTIVITY ──────────────────────────────────────────── */
        builder
            .addCase(updateActivity.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateActivity.fulfilled, (state, action: PayloadAction<FinancialActivity>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.activities.findIndex(a => a.id === action.payload.id);
                if (index !== -1) {
                    state.activities[index] = action.payload;
                }
                if (state.selectedActivity?.id === action.payload.id) {
                    state.selectedActivity = action.payload;
                }
                // Refresh stats on status change
                // We'll let the stats fetch handle this
            })
            .addCase(updateActivity.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── DELETE ACTIVITY ──────────────────────────────────────────── */
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
                }
            })
            .addCase(deleteActivity.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH PRO BONO REQUESTS ──────────────────────────────────── */
        builder
            .addCase(fetchProBonoRequests.pending, (state) => {
                state.loading.proBono = true;
                state.error = null;
            })
            .addCase(fetchProBonoRequests.fulfilled, (state, action: PayloadAction<ProBonoRequest[]>) => {
                state.loading.proBono = false;
                state.proBonoRequests = action.payload;
                state.pagination.proBono.total = action.payload.length;
            })
            .addCase(fetchProBonoRequests.rejected, (state, action) => {
                state.loading.proBono = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH PRO BONO BY ID ─────────────────────────────────────── */
        builder
            .addCase(fetchProBonoById.pending, (state) => {
                state.loading.proBono = true;
                state.error = null;
            })
            .addCase(fetchProBonoById.fulfilled, (state, action: PayloadAction<ProBonoRequest>) => {
                state.loading.proBono = false;
                state.selectedProBono = action.payload;
            })
            .addCase(fetchProBonoById.rejected, (state, action) => {
                state.loading.proBono = false;
                state.error = action.payload as string;
            });

        /* ──────── CREATE PRO BONO ──────────────────────────────────────────── */
        builder
            .addCase(createProBono.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createProBono.fulfilled, (state, action: PayloadAction<ProBonoRequest>) => {
                state.loading.mutating = false;
                state.success = true;
                state.proBonoRequests = [action.payload, ...state.proBonoRequests];
                if (state.stats && action.payload.status === 'Approved') {
                    state.stats.pro_bono_approved += 1;
                }
            })
            .addCase(createProBono.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── UPDATE PRO BONO ──────────────────────────────────────────── */
        builder
            .addCase(updateProBono.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateProBono.fulfilled, (state, action: PayloadAction<ProBonoRequest>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.proBonoRequests.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.proBonoRequests[index] = action.payload;
                }
                if (state.selectedProBono?.id === action.payload.id) {
                    state.selectedProBono = action.payload;
                }
                // Update stats if status changed to Approved
                if (state.stats && action.payload.status === 'Approved') {
                    const old = state.proBonoRequests.find(p => p.id === action.payload.id);
                    if (old && old.status !== 'Approved') {
                        state.stats.pro_bono_approved += 1;
                    }
                }
            })
            .addCase(updateProBono.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── DELETE PRO BONO ──────────────────────────────────────────── */
        builder
            .addCase(deleteProBono.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
            })
            .addCase(deleteProBono.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                const deleted = state.proBonoRequests.find(p => p.id === action.payload);
                state.proBonoRequests = state.proBonoRequests.filter(p => p.id !== action.payload);
                if (state.selectedProBono?.id === action.payload) {
                    state.selectedProBono = null;
                }
                if (state.stats && deleted?.status === 'Approved') {
                    state.stats.pro_bono_approved -= 1;
                }
            })
            .addCase(deleteProBono.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH BUDGET REPORTS ─────────────────────────────────────── */
        builder
            .addCase(fetchBudgetReports.pending, (state) => {
                state.loading.reports = true;
                state.error = null;
            })
            .addCase(fetchBudgetReports.fulfilled, (state, action: PayloadAction<MonthlyBudgetReport[]>) => {
                state.loading.reports = false;
                state.budgetReports = action.payload;
            })
            .addCase(fetchBudgetReports.rejected, (state, action) => {
                state.loading.reports = false;
                state.error = action.payload as string;
            });

        /* ──────── CREATE BUDGET REPORT ─────────────────────────────────────── */
        builder
            .addCase(createBudgetReport.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createBudgetReport.fulfilled, (state, action: PayloadAction<MonthlyBudgetReport>) => {
                state.loading.mutating = false;
                state.success = true;
                state.budgetReports = [action.payload, ...state.budgetReports];
            })
            .addCase(createBudgetReport.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── SUBMIT BUDGET REPORT ─────────────────────────────────────── */
        builder
            .addCase(submitBudgetReport.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(submitBudgetReport.fulfilled, (state, action: PayloadAction<MonthlyBudgetReport>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.budgetReports.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.budgetReports[index] = action.payload;
                }
                if (state.selectedReport?.id === action.payload.id) {
                    state.selectedReport = action.payload;
                }
            })
            .addCase(submitBudgetReport.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── APPROVE BUDGET REPORT ────────────────────────────────────── */
        builder
            .addCase(approveBudgetReport.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(approveBudgetReport.fulfilled, (state, action: PayloadAction<MonthlyBudgetReport>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.budgetReports.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.budgetReports[index] = action.payload;
                }
                if (state.selectedReport?.id === action.payload.id) {
                    state.selectedReport = action.payload;
                }
            })
            .addCase(approveBudgetReport.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── FETCH AUDIT LOG ──────────────────────────────────────────── */
        builder
            .addCase(fetchFinancialAuditLog.pending, (state) => {
                state.loading.auditLog = true;
                state.error = null;
            })
            .addCase(fetchFinancialAuditLog.fulfilled, (state, action: PayloadAction<FinancialAuditEntry[]>) => {
                state.loading.auditLog = false;
                state.auditLog = action.payload;
            })
            .addCase(fetchFinancialAuditLog.rejected, (state, action) => {
                state.loading.auditLog = false;
                state.error = action.payload as string;
            });
    },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
    setSelectedVoteLine,
    setSelectedActivity,
    setSelectedProBono,
    setSelectedReport,
    setActivityFilters,
    setProBonoFilters,
    clearActivityFilters,
    clearProBonoFilters,
    setActivityPagination,
    setProBonoPagination,
    clearError,
    clearSuccess,
    resetFinancialState,
    updateVoteLineLocally,
    updateActivityStatusLocally,
    updateProBonoStatusLocally,
} = financialSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ─── All Data ──────────────────────────────────────────────────────────────────
export const selectAllVoteLines = (state: { financial: FinancialState }) => state.financial.voteLines;
export const selectAllActivities = (state: { financial: FinancialState }) => state.financial.activities;
export const selectAllProBonoRequests = (state: { financial: FinancialState }) => state.financial.proBonoRequests;
export const selectAllBudgetReports = (state: { financial: FinancialState }) => state.financial.budgetReports;
export const selectAllAuditLog = (state: { financial: FinancialState }) => state.financial.auditLog;
export const selectFinancialStats = (state: { financial: FinancialState }) => state.financial.stats;

// ─── Selected Items ────────────────────────────────────────────────────────────
export const selectSelectedVoteLine = (state: { financial: FinancialState }) => state.financial.selectedVoteLine;
export const selectSelectedActivity = (state: { financial: FinancialState }) => state.financial.selectedActivity;
export const selectSelectedProBono = (state: { financial: FinancialState }) => state.financial.selectedProBono;
export const selectSelectedReport = (state: { financial: FinancialState }) => state.financial.selectedReport;

// ─── Filters ──────────────────────────────────────────────────────────────────
export const selectActivityFilters = (state: { financial: FinancialState }) => state.financial.filters.activity;
export const selectProBonoFilters = (state: { financial: FinancialState }) => state.financial.filters.proBono;

// ─── Pagination ────────────────────────────────────────────────────────────────
export const selectActivityPagination = (state: { financial: FinancialState }) => state.financial.pagination.activities;
export const selectProBonoPagination = (state: { financial: FinancialState }) => state.financial.pagination.proBono;

// ─── Loading States ────────────────────────────────────────────────────────────
export const selectVoteLinesLoading = (state: { financial: FinancialState }) => state.financial.loading.voteLines;
export const selectActivitiesLoading = (state: { financial: FinancialState }) => state.financial.loading.activities;
export const selectProBonoLoading = (state: { financial: FinancialState }) => state.financial.loading.proBono;
export const selectReportsLoading = (state: { financial: FinancialState }) => state.financial.loading.reports;
export const selectAuditLogLoading = (state: { financial: FinancialState }) => state.financial.loading.auditLog;
export const selectStatsLoading = (state: { financial: FinancialState }) => state.financial.loading.stats;
export const selectMutating = (state: { financial: FinancialState }) => state.financial.loading.mutating;

// ─── Status ────────────────────────────────────────────────────────────────────
export const selectFinancialError = (state: { financial: FinancialState }) => state.financial.error;
export const selectFinancialSuccess = (state: { financial: FinancialState }) => state.financial.success;

// ─── Derived Selectors ────────────────────────────────────────────────────────

// Activities by status
export const selectActivitiesByStatus = (status: FinancialStatus) => 
    (state: { financial: FinancialState }) => 
        state.financial.activities.filter(a => a.status === status);

// Activities by type
export const selectActivitiesByType = (type: FinancialActivityType) => 
    (state: { financial: FinancialState }) => 
        state.financial.activities.filter(a => a.type === type);

// Pro Bono by status
export const selectProBonoByStatus = (status: ProBonoStatus) => 
    (state: { financial: FinancialState }) => 
        state.financial.proBonoRequests.filter(p => p.status === status);

// Total committed (unpaid) amount
export const selectTotalCommitted = (state: { financial: FinancialState }) => 
    state.financial.activities
        .filter(a => a.status === 'Pending')
        .reduce((sum, a) => sum + a.amount, 0);

// Total paid amount
export const selectTotalPaid = (state: { financial: FinancialState }) => 
    state.financial.activities
        .filter(a => a.status === 'Paid')
        .reduce((sum, a) => sum + a.amount, 0);

// Vote line by name
export const selectVoteLineByName = (name: string) => 
    (state: { financial: FinancialState }) => 
        state.financial.voteLines.find(v => v.name === name);

// Available balance for a vote line
export const selectVoteLineAvailable = (id: string) => 
    (state: { financial: FinancialState }) => {
        const vote = state.financial.voteLines.find(v => v.id === id);
        return vote?.available || 0;
    };

// Recent audit log entries (limited)
export const selectRecentAuditLog = (limit: number = 10) => 
    (state: { financial: FinancialState }) => 
        state.financial.auditLog.slice(0, limit);

export default financialSlice.reducer;