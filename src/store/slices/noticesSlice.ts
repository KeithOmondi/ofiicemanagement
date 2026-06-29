// src/store/slices/noticesSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */

export type AudienceType = 'All Staff' | 'Registry Staff Only' | 'Judicial Officers' | 'Administrative Staff';
export type DeliveryOption = 'In-App + Email' | 'In-App Only' | 'Email + SMS' | 'All Channels';
export type NoticeCategory = 'General Notice' | 'Court Vacation' | 'Administrative Circular' | 'Urgent Notice' | 'Staff Information';
export type BroadcastTag = { label: string; icon: 'users' | 'check' | 'urgent' };

export interface Broadcast {
    id: string;
    title: string;
    body: string;
    audience: AudienceType;
    delivery_method: DeliveryOption;
    is_urgent: boolean;
    is_sent: boolean;
    sent_at: string | null;
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;
    updated_at: string;
    read_count?: number;
    total_recipients?: number;
    tag?: BroadcastTag;
    is_read?: boolean;
}

export interface Notice {
    id: string;
    title: string;
    body: string;
    category: NoticeCategory;
    visibility: AudienceType;
    is_published: boolean;
    published_at: string | null;
    expires_at: string | null;
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;
    updated_at: string;
    read_count?: number;
    is_read?: boolean;
}

export interface BroadcastRead {
    id: string;
    broadcast_id: string;
    user_id: string;
    read_at: string;
}

export interface NoticeRead {
    id: string;
    notice_id: string;
    user_id: string;
    read_at: string;
}

export interface AuditEntry {
    id: string;
    actor: string | null;
    actor_name: string | null;
    action: string;
    detail: string | null;
    entity_type: string | null;
    entity_id: string | null;
    timestamp: string;
}

export interface NoticesStats {
    total_broadcasts: number;
    total_notices: number;
    unread_broadcasts: number;
    unread_notices: number;
    pending_broadcasts: number;
}

export interface UnreadCount {
    broadcasts: number;
    notices: number;
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateBroadcastInput {
    title: string;
    body: string;
    audience: AudienceType;
    delivery_method?: DeliveryOption;
    is_urgent?: boolean;
}

export interface UpdateBroadcastInput {
    title?: string;
    body?: string;
    audience?: AudienceType;
    delivery_method?: DeliveryOption;
    is_urgent?: boolean;
    is_sent?: boolean;
}

export interface CreateNoticeInput {
    title: string;
    body: string;
    category: NoticeCategory;
    visibility?: AudienceType;
    expires_at?: string | null;
}

export interface UpdateNoticeInput {
    title?: string;
    body?: string;
    category?: NoticeCategory;
    visibility?: AudienceType;
    is_published?: boolean;
    expires_at?: string | null;
}

export interface NoticesFilters {
    search?: string;
    audience?: AudienceType;
    category?: NoticeCategory;
    is_sent?: boolean;
    is_published?: boolean;
    limit?: number;
    offset?: number;
}

/* ============================================================
   STATE INTERFACE
============================================================ */

interface NoticesState {
    // Data
    broadcasts: Broadcast[];
    notices: Notice[];
    auditLog: AuditEntry[];
    stats: NoticesStats | null;
    unreadCount: UnreadCount | null;

    // Selection
    selectedBroadcast: Broadcast | null;
    selectedNotice: Notice | null;

    // Filters
    filters: NoticesFilters;
    searchQuery: string;

    // Pagination
    pagination: {
        broadcasts: { total: number; page: number; limit: number };
        notices: { total: number; page: number; limit: number };
    };

    // Loading States
    loading: {
        broadcasts: boolean;
        notices: boolean;
        audit: boolean;
        stats: boolean;
        mutating: boolean;
    };

    error: string | null;
    success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: NoticesState = {
    broadcasts: [],
    notices: [],
    auditLog: [],
    stats: null,
    unreadCount: null,

    selectedBroadcast: null,
    selectedNotice: null,

    filters: {},
    searchQuery: '',

    pagination: {
        broadcasts: { total: 0, page: 1, limit: 20 },
        notices: { total: 0, page: 1, limit: 20 },
    },

    loading: {
        broadcasts: false,
        notices: false,
        audit: false,
        stats: false,
        mutating: false,
    },

    error: null,
    success: false,
};

/* ============================================================
   HELPERS
============================================================ */

const getErrorMessage = (error: unknown): string => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

const buildQueryString = (filters: NoticesFilters): string => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
        }
    });
    return params.toString() ? `?${params.toString()}` : '';
};

/* ============================================================
   THUNKS - STATS & AUDIT
============================================================ */

export const fetchNoticesStats = createAsyncThunk(
    'notices/fetchStats',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/notices/stats');
            return data.data as NoticesStats;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const fetchUnreadCount = createAsyncThunk(
    'notices/fetchUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/notices/unread');
            return data.data as UnreadCount;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const fetchNoticesAudit = createAsyncThunk(
    'notices/fetchAudit',
    async (limit: number = 50, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/notices/audit?limit=${limit}`);
            return data.data as AuditEntry[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   THUNKS - BROADCASTS
============================================================ */

export const fetchBroadcasts = createAsyncThunk(
    'notices/fetchBroadcasts',
    async (filters: NoticesFilters = {}, { rejectWithValue }) => {
        try {
            const query = buildQueryString(filters);
            const { data } = await axiosClient.get(`/notices/broadcasts${query}`);
            return data.data as Broadcast[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const fetchBroadcastById = createAsyncThunk(
    'notices/fetchBroadcastById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/notices/broadcasts/${id}`);
            return data.data as Broadcast;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const createBroadcast = createAsyncThunk(
    'notices/createBroadcast',
    async (input: CreateBroadcastInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/notices/broadcasts', input);
            return data.data as Broadcast;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const updateBroadcast = createAsyncThunk(
    'notices/updateBroadcast',
    async ({ id, input }: { id: string; input: UpdateBroadcastInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/notices/broadcasts/${id}`, input);
            return data.data as Broadcast;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const sendBroadcast = createAsyncThunk(
    'notices/sendBroadcast',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/notices/broadcasts/${id}/send`);
            return data.data as Broadcast;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const deleteBroadcast = createAsyncThunk(
    'notices/deleteBroadcast',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/notices/broadcasts/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const markBroadcastRead = createAsyncThunk(
    'notices/markBroadcastRead',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.put(`/notices/broadcasts/${id}/read`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const getBroadcastReadCount = createAsyncThunk(
    'notices/getBroadcastReadCount',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/notices/broadcasts/${id}/read-count`);
            return { id, count: data.data.count };
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   THUNKS - NOTICES
============================================================ */

export const fetchNotices = createAsyncThunk(
    'notices/fetchNotices',
    async (filters: NoticesFilters = {}, { rejectWithValue }) => {
        try {
            const query = buildQueryString(filters);
            const { data } = await axiosClient.get(`/notices/notices${query}`);
            return data.data as Notice[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const fetchNoticeById = createAsyncThunk(
    'notices/fetchNoticeById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/notices/notices/${id}`);
            return data.data as Notice;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const createNotice = createAsyncThunk(
    'notices/createNotice',
    async (input: CreateNoticeInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/notices/notices', input);
            return data.data as Notice;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const updateNotice = createAsyncThunk(
    'notices/updateNotice',
    async ({ id, input }: { id: string; input: UpdateNoticeInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/notices/notices/${id}`, input);
            return data.data as Notice;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const publishNotice = createAsyncThunk(
    'notices/publishNotice',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/notices/notices/${id}/publish`);
            return data.data as Notice;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const deleteNotice = createAsyncThunk(
    'notices/deleteNotice',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/notices/notices/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const markNoticeRead = createAsyncThunk(
    'notices/markNoticeRead',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.put(`/notices/notices/${id}/read`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const getNoticeReadCount = createAsyncThunk(
    'notices/getNoticeReadCount',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/notices/notices/${id}/read-count`);
            return { id, count: data.data.count };
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   SLICE
============================================================ */

const noticesSlice = createSlice({
    name: 'notices',
    initialState,
    reducers: {
        // ─── Filters ────────────────────────────────────────────────────────
        setFilters(state, action: PayloadAction<Partial<NoticesFilters>>) {
            state.filters = { ...state.filters, ...action.payload };
        },
        setSearchQuery(state, action: PayloadAction<string>) {
            state.searchQuery = action.payload;
            state.filters.search = action.payload || undefined;
        },
        clearFilters(state) {
            state.filters = {};
            state.searchQuery = '';
        },

        // ─── Pagination ─────────────────────────────────────────────────────
        setPagination(
            state,
            action: PayloadAction<{
                module: 'broadcasts' | 'notices';
                page: number;
                limit?: number;
            }>
        ) {
            const { module, page, limit } = action.payload;
            state.pagination[module].page = page;
            if (limit) state.pagination[module].limit = limit;
        },

        // ─── Selection ─────────────────────────────────────────────────────
        setSelectedBroadcast(state, action: PayloadAction<Broadcast | null>) {
            state.selectedBroadcast = action.payload;
        },
        setSelectedNotice(state, action: PayloadAction<Notice | null>) {
            state.selectedNotice = action.payload;
        },

        // ─── Optimistic Updates ─────────────────────────────────────────────
        updateBroadcastOptimistically(
            state,
            action: PayloadAction<{ id: string; updates: Partial<Broadcast> }>
        ) {
            const { id, updates } = action.payload;
            const broadcast = state.broadcasts.find((b) => b.id === id);
            if (broadcast) {
                Object.assign(broadcast, updates);
            }
            if (state.selectedBroadcast?.id === id) {
                Object.assign(state.selectedBroadcast, updates);
            }
        },
        updateNoticeOptimistically(
            state,
            action: PayloadAction<{ id: string; updates: Partial<Notice> }>
        ) {
            const { id, updates } = action.payload;
            const notice = state.notices.find((n) => n.id === id);
            if (notice) {
                Object.assign(notice, updates);
            }
            if (state.selectedNotice?.id === id) {
                Object.assign(state.selectedNotice, updates);
            }
        },

        // ─── Status ─────────────────────────────────────────────────────────
        clearError(state) {
            state.error = null;
        },
        clearSuccess(state) {
            state.success = false;
        },
        resetNoticesState: () => initialState,
    },
    extraReducers: (builder) => {
        /* ──────── STATS ───────────────────────────────────────────────────── */
        builder
            .addCase(fetchNoticesStats.pending, (state) => {
                state.loading.stats = true;
                state.error = null;
            })
            .addCase(fetchNoticesStats.fulfilled, (state, action: PayloadAction<NoticesStats>) => {
                state.loading.stats = false;
                state.stats = action.payload;
            })
            .addCase(fetchNoticesStats.rejected, (state, action) => {
                state.loading.stats = false;
                state.error = action.payload as string;
            });

        /* ──────── UNREAD COUNT ────────────────────────────────────────────── */
        builder
            .addCase(fetchUnreadCount.pending, (state) => {
                state.loading.stats = true;
                state.error = null;
            })
            .addCase(fetchUnreadCount.fulfilled, (state, action: PayloadAction<UnreadCount>) => {
                state.loading.stats = false;
                state.unreadCount = action.payload;
            })
            .addCase(fetchUnreadCount.rejected, (state, action) => {
                state.loading.stats = false;
                state.error = action.payload as string;
            });

        /* ──────── AUDIT ────────────────────────────────────────────────────── */
        builder
            .addCase(fetchNoticesAudit.pending, (state) => {
                state.loading.audit = true;
                state.error = null;
            })
            .addCase(fetchNoticesAudit.fulfilled, (state, action: PayloadAction<AuditEntry[]>) => {
                state.loading.audit = false;
                state.auditLog = action.payload;
            })
            .addCase(fetchNoticesAudit.rejected, (state, action) => {
                state.loading.audit = false;
                state.error = action.payload as string;
            });

        /* ──────── BROADCASTS ────────────────────────────────────────────────── */
        builder
            .addCase(fetchBroadcasts.pending, (state) => {
                state.loading.broadcasts = true;
                state.error = null;
            })
            .addCase(fetchBroadcasts.fulfilled, (state, action: PayloadAction<Broadcast[]>) => {
                state.loading.broadcasts = false;
                state.broadcasts = action.payload;
                state.pagination.broadcasts.total = action.payload.length;
            })
            .addCase(fetchBroadcasts.rejected, (state, action) => {
                state.loading.broadcasts = false;
                state.error = action.payload as string;
            })
            .addCase(createBroadcast.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createBroadcast.fulfilled, (state, action: PayloadAction<Broadcast>) => {
                state.loading.mutating = false;
                state.success = true;
                state.broadcasts = [action.payload, ...state.broadcasts];
                if (state.stats) state.stats.total_broadcasts += 1;
            })
            .addCase(createBroadcast.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            })
            .addCase(updateBroadcast.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateBroadcast.fulfilled, (state, action: PayloadAction<Broadcast>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.broadcasts.findIndex((b) => b.id === action.payload.id);
                if (index !== -1) state.broadcasts[index] = action.payload;
                if (state.selectedBroadcast?.id === action.payload.id) {
                    state.selectedBroadcast = action.payload;
                }
            })
            .addCase(updateBroadcast.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            })
            .addCase(sendBroadcast.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(sendBroadcast.fulfilled, (state, action: PayloadAction<Broadcast>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.broadcasts.findIndex((b) => b.id === action.payload.id);
                if (index !== -1) state.broadcasts[index] = action.payload;
                if (state.selectedBroadcast?.id === action.payload.id) {
                    state.selectedBroadcast = action.payload;
                }
                if (state.stats) state.stats.pending_broadcasts -= 1;
            })
            .addCase(sendBroadcast.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            })
            .addCase(deleteBroadcast.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
            })
            .addCase(deleteBroadcast.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                state.broadcasts = state.broadcasts.filter((b) => b.id !== action.payload);
                if (state.selectedBroadcast?.id === action.payload) {
                    state.selectedBroadcast = null;
                }
                if (state.stats) state.stats.total_broadcasts -= 1;
            })
            .addCase(deleteBroadcast.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            })
            .addCase(markBroadcastRead.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
            })
            .addCase(markBroadcastRead.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                const broadcast = state.broadcasts.find((b) => b.id === action.payload);
                if (broadcast) {
                    broadcast.is_read = true;
                }
                if (state.selectedBroadcast?.id === action.payload) {
                    state.selectedBroadcast.is_read = true;
                }
                if (state.unreadCount) {
                    state.unreadCount.broadcasts = Math.max(0, state.unreadCount.broadcasts - 1);
                }
            })
            .addCase(markBroadcastRead.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            });

        /* ──────── NOTICES ──────────────────────────────────────────────────── */
        builder
            .addCase(fetchNotices.pending, (state) => {
                state.loading.notices = true;
                state.error = null;
            })
            .addCase(fetchNotices.fulfilled, (state, action: PayloadAction<Notice[]>) => {
                state.loading.notices = false;
                state.notices = action.payload;
                state.pagination.notices.total = action.payload.length;
            })
            .addCase(fetchNotices.rejected, (state, action) => {
                state.loading.notices = false;
                state.error = action.payload as string;
            })
            .addCase(createNotice.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createNotice.fulfilled, (state, action: PayloadAction<Notice>) => {
                state.loading.mutating = false;
                state.success = true;
                state.notices = [action.payload, ...state.notices];
                if (state.stats) state.stats.total_notices += 1;
            })
            .addCase(createNotice.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            })
            .addCase(updateNotice.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateNotice.fulfilled, (state, action: PayloadAction<Notice>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.notices.findIndex((n) => n.id === action.payload.id);
                if (index !== -1) state.notices[index] = action.payload;
                if (state.selectedNotice?.id === action.payload.id) {
                    state.selectedNotice = action.payload;
                }
            })
            .addCase(updateNotice.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            })
            .addCase(publishNotice.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(publishNotice.fulfilled, (state, action: PayloadAction<Notice>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.notices.findIndex((n) => n.id === action.payload.id);
                if (index !== -1) state.notices[index] = action.payload;
                if (state.selectedNotice?.id === action.payload.id) {
                    state.selectedNotice = action.payload;
                }
            })
            .addCase(publishNotice.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            })
            .addCase(deleteNotice.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
            })
            .addCase(deleteNotice.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                state.notices = state.notices.filter((n) => n.id !== action.payload);
                if (state.selectedNotice?.id === action.payload) {
                    state.selectedNotice = null;
                }
                if (state.stats) state.stats.total_notices -= 1;
            })
            .addCase(deleteNotice.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            })
            .addCase(markNoticeRead.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
            })
            .addCase(markNoticeRead.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                const notice = state.notices.find((n) => n.id === action.payload);
                if (notice) {
                    notice.is_read = true;
                }
                if (state.selectedNotice?.id === action.payload) {
                    state.selectedNotice.is_read = true;
                }
                if (state.unreadCount) {
                    state.unreadCount.notices = Math.max(0, state.unreadCount.notices - 1);
                }
            })
            .addCase(markNoticeRead.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            });
    },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
    setFilters,
    setSearchQuery,
    clearFilters,
    setPagination,
    setSelectedBroadcast,
    setSelectedNotice,
    updateBroadcastOptimistically,
    updateNoticeOptimistically,
    clearError,
    clearSuccess,
    resetNoticesState,
} = noticesSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ─── Data ─────────────────────────────────────────────────────────────────────
export const selectAllBroadcasts = (state: { notices: NoticesState }) => state.notices.broadcasts;
export const selectAllNotices = (state: { notices: NoticesState }) => state.notices.notices;
export const selectNoticesAudit = (state: { notices: NoticesState }) => state.notices.auditLog;
export const selectNoticesStats = (state: { notices: NoticesState }) => state.notices.stats;
export const selectUnreadCount = (state: { notices: NoticesState }) => state.notices.unreadCount;

// ─── Selected Items ──────────────────────────────────────────────────────────
export const selectSelectedBroadcast = (state: { notices: NoticesState }) => state.notices.selectedBroadcast;
export const selectSelectedNotice = (state: { notices: NoticesState }) => state.notices.selectedNotice;

// ─── Filters ──────────────────────────────────────────────────────────────────
export const selectNoticesFilters = (state: { notices: NoticesState }) => state.notices.filters;
export const selectNoticesSearch = (state: { notices: NoticesState }) => state.notices.searchQuery;

// ─── Loading States ──────────────────────────────────────────────────────────
export const selectBroadcastsLoading = (state: { notices: NoticesState }) => state.notices.loading.broadcasts;
export const selectNoticesLoading = (state: { notices: NoticesState }) => state.notices.loading.notices;
export const selectAuditLoading = (state: { notices: NoticesState }) => state.notices.loading.audit;
export const selectStatsLoading = (state: { notices: NoticesState }) => state.notices.loading.stats;
export const selectNoticesMutating = (state: { notices: NoticesState }) => state.notices.loading.mutating;

// ─── Status ───────────────────────────────────────────────────────────────────
export const selectNoticesError = (state: { notices: NoticesState }) => state.notices.error;
export const selectNoticesSuccess = (state: { notices: NoticesState }) => state.notices.success;

// ─── Pagination ──────────────────────────────────────────────────────────────
export const selectBroadcastsPagination = (state: { notices: NoticesState }) =>
    state.notices.pagination.broadcasts;
export const selectNoticesPagination = (state: { notices: NoticesState }) =>
    state.notices.pagination.notices;

// ─── Derived Selectors ──────────────────────────────────────────────────────

// Get unread broadcasts count
export const selectUnreadBroadcastsCount = (state: { notices: NoticesState }) =>
    state.notices.unreadCount?.broadcasts ?? 0;

// Get unread notices count
export const selectUnreadNoticesCount = (state: { notices: NoticesState }) =>
    state.notices.unreadCount?.notices ?? 0;

// Get total unread count
export const selectTotalUnreadCount = (state: { notices: NoticesState }) =>
    (state.notices.unreadCount?.broadcasts ?? 0) + (state.notices.unreadCount?.notices ?? 0);

// Get broadcasts by audience
export const selectBroadcastsByAudience = (audience: AudienceType) =>
    (state: { notices: NoticesState }) =>
        state.notices.broadcasts.filter((b) => b.audience === audience);

// Get notices by category
export const selectNoticesByCategory = (category: NoticeCategory) =>
    (state: { notices: NoticesState }) =>
        state.notices.notices.filter((n) => n.category === category);

// Get published notices
export const selectPublishedNotices = (state: { notices: NoticesState }) =>
    state.notices.notices.filter((n) => n.is_published);

// Get sent broadcasts
export const selectSentBroadcasts = (state: { notices: NoticesState }) =>
    state.notices.broadcasts.filter((b) => b.is_sent);

// Get pending broadcasts
export const selectPendingBroadcasts = (state: { notices: NoticesState }) =>
    state.notices.broadcasts.filter((b) => !b.is_sent);

// Get urgent broadcasts
export const selectUrgentBroadcasts = (state: { notices: NoticesState }) =>
    state.notices.broadcasts.filter((b) => b.is_urgent);

export default noticesSlice.reducer;