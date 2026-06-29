// src/store/slices/notificationsSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationChannel = 'email' | 'in_app' | 'push';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
export type EmailFrequency = 'instant' | 'daily' | 'weekly';

export interface Notification {
    id: string;
    user_id: string;
    type_id: string | null;
    type_name: string;
    title: string;
    message: string;
    icon: string | null;
    color: string | null;
    link: string | null;
    is_read: boolean;
    read_at: string | null;
    is_email_sent: boolean;
    email_sent_at: string | null;
    priority: NotificationPriority;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationPreferences {
    id: string;
    user_id: string;
    email_enabled: boolean;
    in_app_enabled: boolean;
    email_frequency: EmailFrequency;
    preferences: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface NotificationDeliveryLog {
    id: string;
    notification_id: string;
    channel: NotificationChannel;
    status: DeliveryStatus;
    error_message: string | null;
    delivered_at: string | null;
    created_at: string;
}

export interface NotificationStats {
    total: number;
    unread: number;
    read: number;
    by_priority: { priority: NotificationPriority; count: number }[];
    by_type: { type_name: string; count: number }[];
}

export interface NotificationsResponse {
    notifications: Notification[];
    total: number;
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
    user_id: string;
    type_name: string;
    title: string;
    message: string;
    icon?: string;
    color?: string;
    link?: string;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
    send_email?: boolean;
}

export interface UpdateNotificationInput {
    is_read?: boolean;
}

export interface UpdatePreferencesInput {
    email_enabled?: boolean;
    in_app_enabled?: boolean;
    email_frequency?: EmailFrequency;
    preferences?: Record<string, unknown>;
}

export interface NotificationFilters {
    user_id?: string;
    type_name?: string;
    is_read?: boolean;
    priority?: NotificationPriority;
    search?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}

export interface BulkUpdateInput {
    notification_ids: string[];
    is_read: boolean;
}

/* ============================================================
   STATE INTERFACE
============================================================ */

interface NotificationsState {
    // Data
    notifications: Notification[];
    unreadCount: number;
    stats: NotificationStats | null;
    preferences: NotificationPreferences | null;
    
    // Selection
    selectedNotification: Notification | null;
    
    // Filters
    filters: NotificationFilters;
    
    // Pagination
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    
    // Loading States
    loading: {
        list: boolean;
        stats: boolean;
        preferences: boolean;
        mutating: boolean;
    };
    
    // WebSocket
    socketConnected: boolean;
    newNotification: Notification | null;
    
    // Status
    error: string | null;
    success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: NotificationsState = {
    notifications: [],
    unreadCount: 0,
    stats: null,
    preferences: null,
    selectedNotification: null,
    filters: {
        limit: 20,
        offset: 0,
    },
    pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
    },
    loading: {
        list: false,
        stats: false,
        preferences: false,
        mutating: false,
    },
    socketConnected: false,
    newNotification: null,
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

const buildQueryString = (filters: NotificationFilters): string => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
        }
    });
    return params.toString() ? `?${params.toString()}` : '';
};

/* ============================================================
   THUNKS - FETCH NOTIFICATIONS
============================================================ */

export const fetchNotifications = createAsyncThunk(
    'notifications/fetchAll',
    async (filters: NotificationFilters = {}, { rejectWithValue }) => {
        try {
            const query = buildQueryString(filters);
            const { data } = await axiosClient.get(`/notifications${query}`);
            return data.data as NotificationsResponse;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const fetchUnreadCount = createAsyncThunk(
    'notifications/fetchUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/notifications/unread');
            return data.data as { count: number };
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const fetchNotificationStats = createAsyncThunk(
    'notifications/fetchStats',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/notifications/stats');
            return data.data as NotificationStats;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   THUNKS - PREFERENCES
============================================================ */

export const fetchPreferences = createAsyncThunk(
    'notifications/fetchPreferences',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/notifications/preferences');
            return data.data as NotificationPreferences;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const updatePreferences = createAsyncThunk(
    'notifications/updatePreferences',
    async (input: UpdatePreferencesInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put('/notifications/preferences', input);
            return data.data as NotificationPreferences;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   THUNKS - UPDATE NOTIFICATIONS
============================================================ */

export const markAsRead = createAsyncThunk(
    'notifications/markAsRead',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/notifications/${id}/read`);
            return data.data as Notification;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const markAllAsRead = createAsyncThunk(
    'notifications/markAllAsRead',
    async (_, { rejectWithValue }) => {
        try {
            await axiosClient.put('/notifications/read/all');
            return true;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const bulkUpdateNotifications = createAsyncThunk(
    'notifications/bulkUpdate',
    async (input: BulkUpdateInput, { rejectWithValue }) => {
        try {
            await axiosClient.put('/notifications/bulk', input);
            return input;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const deleteNotification = createAsyncThunk(
    'notifications/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/notifications/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   THUNKS - ADMIN
============================================================ */

export const createNotification = createAsyncThunk(
    'notifications/create',
    async (input: CreateNotificationInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/notifications', input);
            return data.data as Notification;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const cleanupOldNotifications = createAsyncThunk(
    'notifications/cleanup',
    async (days: number = 90, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.delete(`/notifications/cleanup?days=${days}`);
            return data.data as { deleted: number };
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   SLICE
============================================================ */

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        // ─── Selection ──────────────────────────────────────────────────────
        setSelectedNotification(state, action: PayloadAction<Notification | null>) {
            state.selectedNotification = action.payload;
            state.error = null;
        },
        
        // ─── Filters ────────────────────────────────────────────────────────
        setFilters(state, action: PayloadAction<Partial<NotificationFilters>>) {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.page = 1;
        },
        clearFilters(state) {
            state.filters = { limit: 20, offset: 0 };
            state.pagination.page = 1;
        },
        setPagination(state, action: PayloadAction<{ page: number; limit?: number }>) {
            const { page, limit } = action.payload;
            state.pagination.page = page;
            if (limit) state.pagination.limit = limit;
            state.filters.offset = (page - 1) * state.pagination.limit;
        },
        
        // ─── WebSocket ──────────────────────────────────────────────────────
        setSocketConnected(state, action: PayloadAction<boolean>) {
            state.socketConnected = action.payload;
        },
        addNotificationFromSocket(state, action: PayloadAction<Notification>) {
            state.notifications = [action.payload, ...state.notifications];
            if (!action.payload.is_read) {
                state.unreadCount += 1;
            }
            state.newNotification = action.payload;
        },
        clearNewNotification(state) {
            state.newNotification = null;
        },
        
        // ─── Optimistic Updates ──────────────────────────────────────────────
        markReadOptimistically(state, action: PayloadAction<string>) {
            const notification = state.notifications.find(n => n.id === action.payload);
            if (notification && !notification.is_read) {
                notification.is_read = true;
                notification.read_at = new Date().toISOString();
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        markAllReadOptimistically(state) {
            state.notifications = state.notifications.map(n => ({
                ...n,
                is_read: true,
                read_at: n.is_read ? n.read_at : new Date().toISOString(),
            }));
            state.unreadCount = 0;
        },
        
        // ─── Status ──────────────────────────────────────────────────────────
        clearError(state) {
            state.error = null;
        },
        clearSuccess(state) {
            state.success = false;
        },
        resetNotificationsState: () => initialState,
    },
    extraReducers: (builder) => {
        /* ──────── FETCH NOTIFICATIONS ───────────────────────────────────── */
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.loading.list = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<NotificationsResponse>) => {
                state.loading.list = false;
                state.notifications = action.payload.notifications;
                state.pagination.total = action.payload.total;
                state.pagination.totalPages = Math.ceil(action.payload.total / state.pagination.limit);
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading.list = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH UNREAD COUNT ────────────────────────────────────── */
        builder
            .addCase(fetchUnreadCount.pending, (state) => {
                state.loading.stats = true;
                state.error = null;
            })
            .addCase(fetchUnreadCount.fulfilled, (state, action: PayloadAction<{ count: number }>) => {
                state.loading.stats = false;
                state.unreadCount = action.payload.count;
            })
            .addCase(fetchUnreadCount.rejected, (state, action) => {
                state.loading.stats = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH STATS ────────────────────────────────────────────── */
        builder
            .addCase(fetchNotificationStats.pending, (state) => {
                state.loading.stats = true;
                state.error = null;
            })
            .addCase(fetchNotificationStats.fulfilled, (state, action: PayloadAction<NotificationStats>) => {
                state.loading.stats = false;
                state.stats = action.payload;
            })
            .addCase(fetchNotificationStats.rejected, (state, action) => {
                state.loading.stats = false;
                state.error = action.payload as string;
            });

        /* ──────── FETCH PREFERENCES ──────────────────────────────────────── */
        builder
            .addCase(fetchPreferences.pending, (state) => {
                state.loading.preferences = true;
                state.error = null;
            })
            .addCase(fetchPreferences.fulfilled, (state, action: PayloadAction<NotificationPreferences>) => {
                state.loading.preferences = false;
                state.preferences = action.payload;
            })
            .addCase(fetchPreferences.rejected, (state, action) => {
                state.loading.preferences = false;
                state.error = action.payload as string;
            });

        /* ──────── UPDATE PREFERENCES ─────────────────────────────────────── */
        builder
            .addCase(updatePreferences.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updatePreferences.fulfilled, (state, action: PayloadAction<NotificationPreferences>) => {
                state.loading.mutating = false;
                state.success = true;
                state.preferences = action.payload;
            })
            .addCase(updatePreferences.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── MARK AS READ ───────────────────────────────────────────── */
        builder
            .addCase(markAsRead.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(markAsRead.fulfilled, (state, action: PayloadAction<Notification>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.notifications.findIndex(n => n.id === action.payload.id);
                if (index !== -1) {
                    state.notifications[index] = action.payload;
                }
                if (state.selectedNotification?.id === action.payload.id) {
                    state.selectedNotification = action.payload;
                }
                // Update unread count
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            })
            .addCase(markAsRead.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── MARK ALL AS READ ───────────────────────────────────────── */
        builder
            .addCase(markAllAsRead.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(markAllAsRead.fulfilled, (state) => {
                state.loading.mutating = false;
                state.success = true;
                state.notifications = state.notifications.map(n => ({
                    ...n,
                    is_read: true,
                    read_at: n.is_read ? n.read_at : new Date().toISOString(),
                }));
                state.unreadCount = 0;
            })
            .addCase(markAllAsRead.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── BULK UPDATE ────────────────────────────────────────────── */
        builder
            .addCase(bulkUpdateNotifications.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(bulkUpdateNotifications.fulfilled, (state, action: PayloadAction<BulkUpdateInput>) => {
                state.loading.mutating = false;
                state.success = true;
                const { notification_ids, is_read } = action.payload;
                state.notifications = state.notifications.map(n => {
                    if (notification_ids.includes(n.id)) {
                        return {
                            ...n,
                            is_read,
                            read_at: is_read ? new Date().toISOString() : n.read_at,
                        };
                    }
                    return n;
                });
                if (is_read) {
                    state.unreadCount = Math.max(0, state.unreadCount - notification_ids.length);
                }
            })
            .addCase(bulkUpdateNotifications.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── DELETE NOTIFICATION ────────────────────────────────────── */
        builder
            .addCase(deleteNotification.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(deleteNotification.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                state.success = true;
                const deleted = state.notifications.find(n => n.id === action.payload);
                state.notifications = state.notifications.filter(n => n.id !== action.payload);
                if (state.selectedNotification?.id === action.payload) {
                    state.selectedNotification = null;
                }
                if (deleted && !deleted.is_read) {
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            .addCase(deleteNotification.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── CREATE NOTIFICATION (ADMIN) ────────────────────────────── */
        builder
            .addCase(createNotification.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createNotification.fulfilled, (state, action: PayloadAction<Notification>) => {
                state.loading.mutating = false;
                state.success = true;
                state.notifications = [action.payload, ...state.notifications];
                if (!action.payload.is_read) {
                    state.unreadCount += 1;
                }
            })
            .addCase(createNotification.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ──────── CLEANUP OLD NOTIFICATIONS ──────────────────────────────── */
        builder
            .addCase(cleanupOldNotifications.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(cleanupOldNotifications.fulfilled, (state) => {
                state.loading.mutating = false;
                state.success = true;
            })
            .addCase(cleanupOldNotifications.rejected, (state, action) => {
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
    setSelectedNotification,
    setFilters,
    clearFilters,
    setPagination,
    setSocketConnected,
    addNotificationFromSocket,
    clearNewNotification,
    markReadOptimistically,
    markAllReadOptimistically,
    clearError,
    clearSuccess,
    resetNotificationsState,
} = notificationsSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ─── All Data ──────────────────────────────────────────────────────────────────
export const selectAllNotifications = (state: { notifications: NotificationsState }) => 
    state.notifications.notifications;
export const selectUnreadCount = (state: { notifications: NotificationsState }) => 
    state.notifications.unreadCount;
export const selectNotificationStats = (state: { notifications: NotificationsState }) => 
    state.notifications.stats;
export const selectPreferences = (state: { notifications: NotificationsState }) => 
    state.notifications.preferences;

// ─── Selected Items ────────────────────────────────────────────────────────────
export const selectSelectedNotification = (state: { notifications: NotificationsState }) => 
    state.notifications.selectedNotification;
export const selectNewNotification = (state: { notifications: NotificationsState }) => 
    state.notifications.newNotification;

// ─── Filters & UI ──────────────────────────────────────────────────────────────
export const selectNotificationFilters = (state: { notifications: NotificationsState }) => 
    state.notifications.filters;
export const selectNotificationPagination = (state: { notifications: NotificationsState }) => 
    state.notifications.pagination;

// ─── Loading States ────────────────────────────────────────────────────────────
export const selectNotificationsLoading = (state: { notifications: NotificationsState }) => 
    state.notifications.loading.list;
export const selectStatsLoading = (state: { notifications: NotificationsState }) => 
    state.notifications.loading.stats;
export const selectPreferencesLoading = (state: { notifications: NotificationsState }) => 
    state.notifications.loading.preferences;
export const selectMutating = (state: { notifications: NotificationsState }) => 
    state.notifications.loading.mutating;

// ─── WebSocket ─────────────────────────────────────────────────────────────────
export const selectSocketConnected = (state: { notifications: NotificationsState }) => 
    state.notifications.socketConnected;

// ─── Status ────────────────────────────────────────────────────────────────────
export const selectNotificationError = (state: { notifications: NotificationsState }) => 
    state.notifications.error;
export const selectNotificationSuccess = (state: { notifications: NotificationsState }) => 
    state.notifications.success;

// ─── Derived Selectors ──────────────────────────────────────────────────────

// Get unread notifications
export const selectUnreadNotifications = (state: { notifications: NotificationsState }) =>
    state.notifications.notifications.filter(n => !n.is_read);

// Get read notifications
export const selectReadNotifications = (state: { notifications: NotificationsState }) =>
    state.notifications.notifications.filter(n => n.is_read);

// Get notifications by priority
export const selectNotificationsByPriority = (priority: NotificationPriority) =>
    (state: { notifications: NotificationsState }) =>
        state.notifications.notifications.filter(n => n.priority === priority);

// Get notifications by type
export const selectNotificationsByType = (typeName: string) =>
    (state: { notifications: NotificationsState }) =>
        state.notifications.notifications.filter(n => n.type_name === typeName);

// Get urgent notifications (high + urgent)
export const selectUrgentNotifications = (state: { notifications: NotificationsState }) =>
    state.notifications.notifications.filter(n => 
        n.priority === 'urgent' || n.priority === 'high'
    );

// Get recent notifications (last 5)
export const selectRecentNotifications = (limit: number = 5) =>
    (state: { notifications: NotificationsState }) =>
        state.notifications.notifications.slice(0, limit);

// Check if there are any unread notifications
export const selectHasUnread = (state: { notifications: NotificationsState }) =>
    state.notifications.unreadCount > 0;

export default notificationsSlice.reducer;