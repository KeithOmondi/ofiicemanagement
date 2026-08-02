// src/store/slices/standaloneSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import type {
    StandaloneTask,
    StandaloneTaskSubtask,
    StandaloneTaskComment,
    StandaloneTaskAttachment,
    StandaloneTaskStats,
    StandaloneTaskPermissions,
    CreateStandaloneTaskInput,
    UpdateStandaloneTaskInput,
    StandaloneTaskFilters,
    CreateStandaloneSubtaskInput,
    UpdateStandaloneSubtaskInput,
    CreateStandaloneCommentInput,
    UpdateStandaloneCommentInput,
    StandaloneTaskStatus,
    StandaloneTaskPriority,
    StandaloneTaskHistory,
    StandaloneTaskPaginationResponse,
} from '../../types/standalone.types';
import axiosClient from '../../api/api';

/* ============================================================
   STATE
============================================================ */

interface StandaloneState {
    // Tasks
    tasks: StandaloneTask[];
    currentTask: StandaloneTask | null;
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    } | null;

    // Subtasks
    subtasks: Record<string, StandaloneTaskSubtask[]>;

    // Comments
    comments: Record<string, StandaloneTaskComment[]>;

    // Attachments
    attachments: Record<string, StandaloneTaskAttachment[]>;

    // Stats
    stats: StandaloneTaskStats | null;

    // Permissions
    permissions: StandaloneTaskPermissions | null;

    // History
    history: Record<string, StandaloneTaskHistory[]>;

    // UI State
    loading: boolean;
    error: string | null;
    success: boolean;
    actionInProgress: {
        // Tasks
        creatingTask?: boolean;
        updatingTask?: string;
        deletingTask?: string;
        fetchingTask?: string;
        updatingStatus?: string;
        archiving?: string;
        unarchiving?: string;
        // Subtasks
        creatingSubtask?: string;
        updatingSubtask?: string;
        deletingSubtask?: string;
        // Comments
        creatingComment?: string;
        updatingComment?: string;
        deletingComment?: string;
        // Attachments
        uploadingAttachment?: string;
        deletingAttachment?: string;
        // Stats
        fetchingStats?: boolean;
        // Permissions
        fetchingPermissions?: string;
        // History
        fetchingHistory?: string;
    };

    // Filters
    filters: StandaloneTaskFilters;

    // Selected
    selectedTaskId: string | null;

    // Request tracking
    latestRequestId: string | null;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: StandaloneState = {
    tasks: [],
    currentTask: null,
    pagination: null,
    subtasks: {},
    comments: {},
    attachments: {},
    stats: null,
    permissions: null,
    history: {},
    loading: false,
    error: null,
    success: false,
    actionInProgress: {},
    filters: {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'DESC',
        is_archived: false,
    },
    selectedTaskId: null,
    latestRequestId: null,
};

/* ============================================================
   HELPERS
============================================================ */

const extractErrorMessage = (error: unknown): string => {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    return (
        axiosError.response?.data?.error ??
        axiosError.response?.data?.message ??
        axiosError.message ??
        'An unexpected error occurred'
    );
};



/* ============================================================
   ASYNC THUNKS - TASKS
============================================================ */

export const fetchStandaloneTasks = createAsyncThunk(
    'standalone/fetchTasks',
    async (filters: StandaloneTaskFilters = {}, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get<{ success: boolean; data: StandaloneTaskPaginationResponse }>(
                '/standalone/tasks',
                { params: filters }
            );
            return response.data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchStandaloneTaskById = createAsyncThunk(
    'standalone/fetchTaskById',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get<{ success: boolean; data: StandaloneTask }>(
                `/standalone/tasks/${id}`
            );
            return response.data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const createStandaloneTask = createAsyncThunk(
    'standalone/createTask',
    async (input: CreateStandaloneTaskInput, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post<{ success: boolean; data: StandaloneTask }>(
                '/standalone/tasks',
                input
            );
            return response.data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const updateStandaloneTask = createAsyncThunk(
    'standalone/updateTask',
    async ({ id, input }: { id: string; input: UpdateStandaloneTaskInput }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.patch<{ success: boolean; data: StandaloneTask }>(
                `/standalone/tasks/${id}`,
                input
            );
            return response.data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const deleteStandaloneTask = createAsyncThunk(
    'standalone/deleteTask',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/standalone/tasks/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const updateStandaloneTaskStatus = createAsyncThunk(
    'standalone/updateStatus',
    async ({ id, status }: { id: string; status: StandaloneTaskStatus }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.patch<{ success: boolean; data: StandaloneTask }>(
                `/standalone/tasks/${id}/status`,
                { status }
            );
            return response.data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const archiveStandaloneTask = createAsyncThunk(
    'standalone/archiveTask',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post<{ success: boolean; data: StandaloneTask }>(
                `/standalone/tasks/${id}/archive`
            );
            return response.data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const unarchiveStandaloneTask = createAsyncThunk(
    'standalone/unarchiveTask',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post<{ success: boolean; data: StandaloneTask }>(
                `/standalone/tasks/${id}/unarchive`
            );
            return response.data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchStandaloneTaskStats = createAsyncThunk(
    'standalone/fetchStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get<{ success: boolean; data: StandaloneTaskStats }>(
                '/standalone/tasks/stats'
            );
            return response.data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchStandaloneTaskPermissions = createAsyncThunk(
    'standalone/fetchPermissions',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get<{ success: boolean; data: StandaloneTaskPermissions }>(
                `/standalone/tasks/${id}/permissions`
            );
            return { id, permissions: response.data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchStandaloneTaskHistory = createAsyncThunk(
    'standalone/fetchHistory',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await axiosClient.get<{ success: boolean; data: StandaloneTaskHistory[] }>(
                `/standalone/tasks/${id}/history`
            );
            return { id, history: response.data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const generateRecurringTasks = createAsyncThunk(
    'standalone/generateRecurring',
    async ({ id, count }: { id: string; count?: number }, { rejectWithValue }) => {
        try {
            await axiosClient.post(`/standalone/tasks/${id}/recurring`, { count });
            return id;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

/* ============================================================
   ASYNC THUNKS - SUBTASKS
============================================================ */

export const createStandaloneSubtask = createAsyncThunk(
    'standalone/createSubtask',
    async ({ taskId, input }: { taskId: string; input: CreateStandaloneSubtaskInput }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post<{ success: boolean; data: StandaloneTaskSubtask }>(
                `/standalone/tasks/${taskId}/subtasks`,
                input
            );
            return { taskId, subtask: response.data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const updateStandaloneSubtask = createAsyncThunk(
    'standalone/updateSubtask',
    async (
        { taskId, subtaskId, input }: { taskId: string; subtaskId: string; input: UpdateStandaloneSubtaskInput },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosClient.patch<{ success: boolean; data: StandaloneTaskSubtask }>(
                `/standalone/tasks/${taskId}/subtasks/${subtaskId}`,
                input
            );
            return { taskId, subtask: response.data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const deleteStandaloneSubtask = createAsyncThunk(
    'standalone/deleteSubtask',
    async ({ taskId, subtaskId }: { taskId: string; subtaskId: string }, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/standalone/tasks/${taskId}/subtasks/${subtaskId}`);
            return { taskId, subtaskId };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

/* ============================================================
   ASYNC THUNKS - COMMENTS
============================================================ */

export const createStandaloneComment = createAsyncThunk(
    'standalone/createComment',
    async ({ taskId, input }: { taskId: string; input: CreateStandaloneCommentInput }, { rejectWithValue }) => {
        try {
            const response = await axiosClient.post<{ success: boolean; data: StandaloneTaskComment }>(
                `/standalone/tasks/${taskId}/comments`,
                input
            );
            return { taskId, comment: response.data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const updateStandaloneComment = createAsyncThunk(
    'standalone/updateComment',
    async (
        { taskId, commentId, input }: { taskId: string; commentId: string; input: UpdateStandaloneCommentInput },
        { rejectWithValue }
    ) => {
        try {
            const response = await axiosClient.patch<{ success: boolean; data: StandaloneTaskComment }>(
                `/standalone/tasks/${taskId}/comments/${commentId}`,
                input
            );
            return { taskId, comment: response.data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const deleteStandaloneComment = createAsyncThunk(
    'standalone/deleteComment',
    async ({ taskId, commentId }: { taskId: string; commentId: string }, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/standalone/tasks/${taskId}/comments/${commentId}`);
            return { taskId, commentId };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

/* ============================================================
   ASYNC THUNKS - ATTACHMENTS
============================================================ */

export const uploadStandaloneAttachment = createAsyncThunk(
    'standalone/uploadAttachment',
    async ({ taskId, file }: { taskId: string; file: File }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await axiosClient.post<{ success: boolean; data: StandaloneTaskAttachment }>(
                `/standalone/tasks/${taskId}/attachments`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return { taskId, attachment: response.data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const deleteStandaloneAttachment = createAsyncThunk(
    'standalone/deleteAttachment',
    async ({ taskId, attachmentId }: { taskId: string; attachmentId: string }, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/standalone/tasks/${taskId}/attachments/${attachmentId}`);
            return { taskId, attachmentId };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

/* ============================================================
   SLICE
============================================================ */

const standaloneSlice = createSlice({
    name: 'standalone',
    initialState,
    reducers: {
        // ── Filters ──────────────────────────────────────────────────────────
        setStandaloneFilters(state, action: PayloadAction<Partial<StandaloneTaskFilters>>) {
            state.filters = { ...state.filters, ...action.payload };
        },
        resetStandaloneFilters(state) {
            state.filters = {
                page: 1,
                limit: 20,
                sort_by: 'created_at',
                sort_order: 'DESC',
                is_archived: false,
            };
        },
        setStandalonePage(state, action: PayloadAction<number>) {
            state.filters.page = action.payload;
        },
        setStandaloneLimit(state, action: PayloadAction<number>) {
            state.filters.limit = action.payload;
        },
        setStandaloneSort(state, action: PayloadAction<{ sort_by: StandaloneTaskFilters['sort_by']; sort_order: 'ASC' | 'DESC' }>) {
            state.filters.sort_by = action.payload.sort_by;
            state.filters.sort_order = action.payload.sort_order;
        },

        // ── Selection ──────────────────────────────────────────────────────
        selectStandaloneTask(state, action: PayloadAction<string | null>) {
            state.selectedTaskId = action.payload;
        },
        clearCurrentTask(state) {
            state.currentTask = null;
            state.permissions = null;
        },

        // ── Clear State ────────────────────────────────────────────────────
        clearError(state) {
            state.error = null;
        },
        clearSuccess(state) {
            state.success = false;
        },
        resetStandaloneState: () => initialState,

        // ── Local Updates ──────────────────────────────────────────────────
        updateTaskLocally(state, action: PayloadAction<{ id: string; updates: Partial<StandaloneTask> }>) {
            const index = state.tasks.findIndex(t => t.id === action.payload.id);
            if (index !== -1) {
                state.tasks[index] = { ...state.tasks[index], ...action.payload.updates };
            }
            if (state.currentTask?.id === action.payload.id) {
                state.currentTask = { ...state.currentTask, ...action.payload.updates };
            }
        },
        removeTaskLocally(state, action: PayloadAction<string>) {
            state.tasks = state.tasks.filter(t => t.id !== action.payload);
            if (state.currentTask?.id === action.payload) {
                state.currentTask = null;
            }
            if (state.selectedTaskId === action.payload) {
                state.selectedTaskId = null;
            }
        },
        addTaskLocally(state, action: PayloadAction<StandaloneTask>) {
            state.tasks.unshift(action.payload);
            if (state.pagination) {
                state.pagination.total += 1;
                state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
            }
        },
        updateSubtaskLocally(state, action: PayloadAction<{ taskId: string; subtask: StandaloneTaskSubtask }>) {
            const { taskId, subtask } = action.payload;
            const subtasks = state.subtasks[taskId];
            if (subtasks) {
                const index = subtasks.findIndex(s => s.id === subtask.id);
                if (index !== -1) {
                    subtasks[index] = subtask;
                } else {
                    subtasks.push(subtask);
                }
            }
        },
        removeSubtaskLocally(state, action: PayloadAction<{ taskId: string; subtaskId: string }>) {
            const { taskId, subtaskId } = action.payload;
            const subtasks = state.subtasks[taskId];
            if (subtasks) {
                state.subtasks[taskId] = subtasks.filter(s => s.id !== subtaskId);
            }
        },
        updateCommentLocally(state, action: PayloadAction<{ taskId: string; comment: StandaloneTaskComment }>) {
            const { taskId, comment } = action.payload;
            const comments = state.comments[taskId];
            if (comments) {
                const index = comments.findIndex(c => c.id === comment.id);
                if (index !== -1) {
                    comments[index] = comment;
                } else {
                    comments.push(comment);
                }
            }
        },
        removeCommentLocally(state, action: PayloadAction<{ taskId: string; commentId: string }>) {
            const { taskId, commentId } = action.payload;
            const comments = state.comments[taskId];
            if (comments) {
                state.comments[taskId] = comments.filter(c => c.id !== commentId);
            }
        },
        updateAttachmentLocally(state, action: PayloadAction<{ taskId: string; attachment: StandaloneTaskAttachment }>) {
            const { taskId, attachment } = action.payload;
            const attachments = state.attachments[taskId];
            if (attachments) {
                const index = attachments.findIndex(a => a.id === attachment.id);
                if (index !== -1) {
                    attachments[index] = attachment;
                } else {
                    attachments.push(attachment);
                }
            }
        },
        removeAttachmentLocally(state, action: PayloadAction<{ taskId: string; attachmentId: string }>) {
            const { taskId, attachmentId } = action.payload;
            const attachments = state.attachments[taskId];
            if (attachments) {
                state.attachments[taskId] = attachments.filter(a => a.id !== attachmentId);
            }
        },
    },
    extraReducers: (builder) => {
        /* ---------- FETCH TASKS ---------- */
        /* ---------- FETCH TASKS ---------- */
builder
    .addCase(fetchStandaloneTasks.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        
        state.latestRequestId = action.meta.requestId;
    })
    .addCase(fetchStandaloneTasks.fulfilled, (state, action: PayloadAction<StandaloneTaskPaginationResponse>) => {
        state.loading = false;
        // @ts-expect-error - meta.requestId exists on thunk actions at runtime
        const requestId = action.meta.requestId;
        if (state.latestRequestId && requestId !== state.latestRequestId) return;
        state.tasks = action.payload.data;
        state.pagination = {
            total: action.payload.total,
            page: action.payload.page,
            limit: action.payload.limit,
            totalPages: action.payload.totalPages,
        };
    })
    .addCase(fetchStandaloneTasks.rejected, (state, action) => {
        state.loading = false;
        
        const requestId = action.meta.requestId;
        if (state.latestRequestId && requestId !== state.latestRequestId) return;
        state.error = action.payload as string;
    });

        /* ---------- FETCH TASK BY ID ---------- */
        builder
            .addCase(fetchStandaloneTaskById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchStandaloneTaskById.fulfilled, (state, action: PayloadAction<StandaloneTask>) => {
                state.loading = false;
                state.currentTask = action.payload;
                if (action.payload.subtasks) {
                    state.subtasks[action.payload.id] = action.payload.subtasks;
                }
                if (action.payload.comments) {
                    state.comments[action.payload.id] = action.payload.comments;
                }
                if (action.payload.attachments) {
                    state.attachments[action.payload.id] = action.payload.attachments;
                }
                if (action.payload.history) {
                    state.history[action.payload.id] = action.payload.history;
                }
            })
            .addCase(fetchStandaloneTaskById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        /* ---------- CREATE TASK ---------- */
        builder
            .addCase(createStandaloneTask.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.creatingTask = true;
            })
            .addCase(createStandaloneTask.fulfilled, (state, action: PayloadAction<StandaloneTask>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.creatingTask = false;
                state.tasks = [action.payload, ...state.tasks];
                if (state.pagination) {
                    state.pagination.total += 1;
                    state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
                }
            })
            .addCase(createStandaloneTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.creatingTask = false;
            });

        /* ---------- UPDATE TASK ---------- */
        builder
            .addCase(updateStandaloneTask.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.updatingTask = action.meta.arg.id;
            })
            .addCase(updateStandaloneTask.fulfilled, (state, action: PayloadAction<StandaloneTask>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.updatingTask = undefined;
                const index = state.tasks.findIndex(t => t.id === action.payload.id);
                if (index !== -1) state.tasks[index] = action.payload;
                if (state.currentTask?.id === action.payload.id) state.currentTask = action.payload;
                if (action.payload.subtasks) {
                    state.subtasks[action.payload.id] = action.payload.subtasks;
                }
                if (action.payload.comments) {
                    state.comments[action.payload.id] = action.payload.comments;
                }
                if (action.payload.attachments) {
                    state.attachments[action.payload.id] = action.payload.attachments;
                }
            })
            .addCase(updateStandaloneTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.updatingTask = undefined;
            });

        /* ---------- DELETE TASK ---------- */
        builder
            .addCase(deleteStandaloneTask.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.deletingTask = action.meta.arg;
            })
            .addCase(deleteStandaloneTask.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.deletingTask = undefined;
                state.tasks = state.tasks.filter(t => t.id !== action.payload);
                if (state.pagination) {
                    state.pagination.total -= 1;
                    state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
                }
                if (state.currentTask?.id === action.payload) state.currentTask = null;
                if (state.selectedTaskId === action.payload) state.selectedTaskId = null;
            })
            .addCase(deleteStandaloneTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.deletingTask = undefined;
            });

        /* ---------- UPDATE STATUS ---------- */
        builder
            .addCase(updateStandaloneTaskStatus.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.updatingStatus = action.meta.arg.id;
            })
            .addCase(updateStandaloneTaskStatus.fulfilled, (state, action: PayloadAction<StandaloneTask>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.updatingStatus = undefined;
                const index = state.tasks.findIndex(t => t.id === action.payload.id);
                if (index !== -1) state.tasks[index] = action.payload;
                if (state.currentTask?.id === action.payload.id) state.currentTask = action.payload;
            })
            .addCase(updateStandaloneTaskStatus.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.updatingStatus = undefined;
            });

        /* ---------- ARCHIVE TASK ---------- */
        builder
            .addCase(archiveStandaloneTask.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.archiving = action.meta.arg;
            })
            .addCase(archiveStandaloneTask.fulfilled, (state, action: PayloadAction<StandaloneTask>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.archiving = undefined;
                const index = state.tasks.findIndex(t => t.id === action.payload.id);
                if (index !== -1) state.tasks[index] = action.payload;
                if (state.currentTask?.id === action.payload.id) state.currentTask = action.payload;
                // Remove from active list if archived
                if (action.payload.is_archived && state.filters.is_archived === false) {
                    state.tasks = state.tasks.filter(t => t.id !== action.payload.id);
                }
            })
            .addCase(archiveStandaloneTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.archiving = undefined;
            });

        /* ---------- UNARCHIVE TASK ---------- */
        builder
            .addCase(unarchiveStandaloneTask.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.unarchiving = action.meta.arg;
            })
            .addCase(unarchiveStandaloneTask.fulfilled, (state, action: PayloadAction<StandaloneTask>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.unarchiving = undefined;
                const index = state.tasks.findIndex(t => t.id === action.payload.id);
                if (index !== -1) state.tasks[index] = action.payload;
                if (state.currentTask?.id === action.payload.id) state.currentTask = action.payload;
            })
            .addCase(unarchiveStandaloneTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.unarchiving = undefined;
            });

        /* ---------- FETCH STATS ---------- */
        builder
            .addCase(fetchStandaloneTaskStats.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.actionInProgress.fetchingStats = true;
            })
            .addCase(fetchStandaloneTaskStats.fulfilled, (state, action: PayloadAction<StandaloneTaskStats>) => {
                state.loading = false;
                state.actionInProgress.fetchingStats = false;
                state.stats = action.payload;
            })
            .addCase(fetchStandaloneTaskStats.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.actionInProgress.fetchingStats = false;
            });

        /* ---------- FETCH PERMISSIONS ---------- */
        builder
            .addCase(fetchStandaloneTaskPermissions.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.actionInProgress.fetchingPermissions = action.meta.arg;
            })
            .addCase(fetchStandaloneTaskPermissions.fulfilled, (state, action: PayloadAction<{ id: string; permissions: StandaloneTaskPermissions }>) => {
                state.loading = false;
                state.actionInProgress.fetchingPermissions = undefined;
                state.permissions = action.payload.permissions;
            })
            .addCase(fetchStandaloneTaskPermissions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.actionInProgress.fetchingPermissions = undefined;
            });

        /* ---------- FETCH HISTORY ---------- */
        builder
            .addCase(fetchStandaloneTaskHistory.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.actionInProgress.fetchingHistory = action.meta.arg;
            })
            .addCase(fetchStandaloneTaskHistory.fulfilled, (state, action: PayloadAction<{ id: string; history: StandaloneTaskHistory[] }>) => {
                state.loading = false;
                state.actionInProgress.fetchingHistory = undefined;
                state.history[action.payload.id] = action.payload.history;
            })
            .addCase(fetchStandaloneTaskHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.actionInProgress.fetchingHistory = undefined;
            });

        /* ---------- CREATE SUBTASK ---------- */
        builder
            .addCase(createStandaloneSubtask.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.creatingSubtask = action.meta.arg.taskId;
            })
            .addCase(createStandaloneSubtask.fulfilled, (state, action: PayloadAction<{ taskId: string; subtask: StandaloneTaskSubtask }>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.creatingSubtask = undefined;
                const { taskId, subtask } = action.payload;
                if (!state.subtasks[taskId]) {
                    state.subtasks[taskId] = [];
                }
                state.subtasks[taskId].push(subtask);
            })
            .addCase(createStandaloneSubtask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.creatingSubtask = undefined;
            });

        /* ---------- UPDATE SUBTASK ---------- */
        builder
            .addCase(updateStandaloneSubtask.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.updatingSubtask = action.meta.arg.subtaskId;
            })
            .addCase(updateStandaloneSubtask.fulfilled, (state, action: PayloadAction<{ taskId: string; subtask: StandaloneTaskSubtask }>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.updatingSubtask = undefined;
                const { taskId, subtask } = action.payload;
                const subtasks = state.subtasks[taskId];
                if (subtasks) {
                    const index = subtasks.findIndex(s => s.id === subtask.id);
                    if (index !== -1) {
                        subtasks[index] = subtask;
                    }
                }
            })
            .addCase(updateStandaloneSubtask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.updatingSubtask = undefined;
            });

        /* ---------- DELETE SUBTASK ---------- */
        builder
            .addCase(deleteStandaloneSubtask.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.deletingSubtask = action.meta.arg.subtaskId;
            })
            .addCase(deleteStandaloneSubtask.fulfilled, (state, action: PayloadAction<{ taskId: string; subtaskId: string }>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.deletingSubtask = undefined;
                const { taskId, subtaskId } = action.payload;
                const subtasks = state.subtasks[taskId];
                if (subtasks) {
                    state.subtasks[taskId] = subtasks.filter(s => s.id !== subtaskId);
                }
            })
            .addCase(deleteStandaloneSubtask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.deletingSubtask = undefined;
            });

        /* ---------- CREATE COMMENT ---------- */
        builder
            .addCase(createStandaloneComment.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.creatingComment = action.meta.arg.taskId;
            })
            .addCase(createStandaloneComment.fulfilled, (state, action: PayloadAction<{ taskId: string; comment: StandaloneTaskComment }>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.creatingComment = undefined;
                const { taskId, comment } = action.payload;
                if (!state.comments[taskId]) {
                    state.comments[taskId] = [];
                }
                state.comments[taskId].push(comment);
            })
            .addCase(createStandaloneComment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.creatingComment = undefined;
            });

        /* ---------- UPDATE COMMENT ---------- */
        builder
            .addCase(updateStandaloneComment.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.updatingComment = action.meta.arg.commentId;
            })
            .addCase(updateStandaloneComment.fulfilled, (state, action: PayloadAction<{ taskId: string; comment: StandaloneTaskComment }>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.updatingComment = undefined;
                const { taskId, comment } = action.payload;
                const comments = state.comments[taskId];
                if (comments) {
                    const index = comments.findIndex(c => c.id === comment.id);
                    if (index !== -1) {
                        comments[index] = comment;
                    }
                }
            })
            .addCase(updateStandaloneComment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.updatingComment = undefined;
            });

        /* ---------- DELETE COMMENT ---------- */
        builder
            .addCase(deleteStandaloneComment.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.deletingComment = action.meta.arg.commentId;
            })
            .addCase(deleteStandaloneComment.fulfilled, (state, action: PayloadAction<{ taskId: string; commentId: string }>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.deletingComment = undefined;
                const { taskId, commentId } = action.payload;
                const comments = state.comments[taskId];
                if (comments) {
                    state.comments[taskId] = comments.filter(c => c.id !== commentId);
                }
            })
            .addCase(deleteStandaloneComment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.deletingComment = undefined;
            });

        /* ---------- UPLOAD ATTACHMENT ---------- */
        builder
            .addCase(uploadStandaloneAttachment.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.uploadingAttachment = action.meta.arg.taskId;
            })
            .addCase(uploadStandaloneAttachment.fulfilled, (state, action: PayloadAction<{ taskId: string; attachment: StandaloneTaskAttachment }>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.uploadingAttachment = undefined;
                const { taskId, attachment } = action.payload;
                if (!state.attachments[taskId]) {
                    state.attachments[taskId] = [];
                }
                state.attachments[taskId].push(attachment);
            })
            .addCase(uploadStandaloneAttachment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.uploadingAttachment = undefined;
            });

        /* ---------- DELETE ATTACHMENT ---------- */
        builder
            .addCase(deleteStandaloneAttachment.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.deletingAttachment = action.meta.arg.attachmentId;
            })
            .addCase(deleteStandaloneAttachment.fulfilled, (state, action: PayloadAction<{ taskId: string; attachmentId: string }>) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.deletingAttachment = undefined;
                const { taskId, attachmentId } = action.payload;
                const attachments = state.attachments[taskId];
                if (attachments) {
                    state.attachments[taskId] = attachments.filter(a => a.id !== attachmentId);
                }
            })
            .addCase(deleteStandaloneAttachment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.deletingAttachment = undefined;
            });

        /* ---------- GENERATE RECURRING ---------- */
        builder
            .addCase(generateRecurringTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
            })
            .addCase(generateRecurringTasks.fulfilled, (state) => {
                state.loading = false;
                state.success = true;
            })
            .addCase(generateRecurringTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
            });
    },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
    setStandaloneFilters,
    resetStandaloneFilters,
    setStandalonePage,
    setStandaloneLimit,
    setStandaloneSort,
    selectStandaloneTask,
    clearCurrentTask,
    clearError,
    clearSuccess,
    resetStandaloneState,
    updateTaskLocally,
    removeTaskLocally,
    addTaskLocally,
    updateSubtaskLocally,
    removeSubtaskLocally,
    updateCommentLocally,
    removeCommentLocally,
    updateAttachmentLocally,
    removeAttachmentLocally,
} = standaloneSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ── Base Selectors ──────────────────────────────────────────────────────────

export const selectAllStandaloneTasks = (state: { standalone: StandaloneState }) => state.standalone.tasks;
export const selectCurrentStandaloneTask = (state: { standalone: StandaloneState }) => state.standalone.currentTask;
export const selectStandalonePagination = (state: { standalone: StandaloneState }) => state.standalone.pagination;
export const selectStandaloneStats = (state: { standalone: StandaloneState }) => state.standalone.stats;
export const selectStandalonePermissions = (state: { standalone: StandaloneState }) => state.standalone.permissions;
export const selectStandaloneFilters = (state: { standalone: StandaloneState }) => state.standalone.filters;
export const selectSelectedStandaloneTaskId = (state: { standalone: StandaloneState }) => state.standalone.selectedTaskId;

// ── Subtask Selectors ───────────────────────────────────────────────────────

export const selectStandaloneSubtasks = (state: { standalone: StandaloneState }) => state.standalone.subtasks;
export const selectSubtasksByTaskId = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.subtasks[taskId] || [];

// ── Comment Selectors ──────────────────────────────────────────────────────

export const selectStandaloneComments = (state: { standalone: StandaloneState }) => state.standalone.comments;
export const selectCommentsByTaskId = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.comments[taskId] || [];

// ── Attachment Selectors ───────────────────────────────────────────────────

export const selectStandaloneAttachments = (state: { standalone: StandaloneState }) => state.standalone.attachments;
export const selectAttachmentsByTaskId = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.attachments[taskId] || [];

// ── History Selectors ──────────────────────────────────────────────────────

export const selectStandaloneHistory = (state: { standalone: StandaloneState }) => state.standalone.history;
export const selectHistoryByTaskId = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.history[taskId] || [];

// ── Loading Selectors ──────────────────────────────────────────────────────

export const selectStandaloneLoading = (state: { standalone: StandaloneState }) => state.standalone.loading;
export const selectStandaloneError = (state: { standalone: StandaloneState }) => state.standalone.error;
export const selectStandaloneSuccess = (state: { standalone: StandaloneState }) => state.standalone.success;

// ── Action In Progress Selectors ──────────────────────────────────────────

export const selectIsCreatingStandaloneTask = (state: { standalone: StandaloneState }) =>
    state.standalone.actionInProgress.creatingTask || false;

export const selectIsUpdatingStandaloneTask = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.actionInProgress.updatingTask === taskId;

export const selectIsDeletingStandaloneTask = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.actionInProgress.deletingTask === taskId;

export const selectIsUpdatingStandaloneStatus = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.actionInProgress.updatingStatus === taskId;

export const selectIsArchivingStandaloneTask = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.actionInProgress.archiving === taskId;

export const selectIsCreatingStandaloneSubtask = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.actionInProgress.creatingSubtask === taskId;

export const selectIsUpdatingStandaloneSubtask = (state: { standalone: StandaloneState }, subtaskId: string) =>
    state.standalone.actionInProgress.updatingSubtask === subtaskId;

export const selectIsDeletingStandaloneSubtask = (state: { standalone: StandaloneState }, subtaskId: string) =>
    state.standalone.actionInProgress.deletingSubtask === subtaskId;

export const selectIsCreatingStandaloneComment = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.actionInProgress.creatingComment === taskId;

export const selectIsUploadingStandaloneAttachment = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.actionInProgress.uploadingAttachment === taskId;

// ── Derived Selectors ──────────────────────────────────────────────────────

export const selectStandaloneTaskById = (state: { standalone: StandaloneState }, taskId: string) =>
    state.standalone.tasks.find(t => t.id === taskId);

export const selectTasksByStatus = (state: { standalone: StandaloneState }, status: StandaloneTaskStatus) =>
    state.standalone.tasks.filter(t => t.status === status);

export const selectTasksByPriority = (state: { standalone: StandaloneState }, priority: StandaloneTaskPriority) =>
    state.standalone.tasks.filter(t => t.priority === priority);

export const selectActiveTasks = (state: { standalone: StandaloneState }) =>
    state.standalone.tasks.filter(t => !t.is_archived);

export const selectArchivedTasks = (state: { standalone: StandaloneState }) =>
    state.standalone.tasks.filter(t => t.is_archived);

export const selectOverdueTasks = (state: { standalone: StandaloneState }) => {
    const now = new Date();
    return state.standalone.tasks.filter(t =>
        !t.is_archived &&
        t.status !== 'complete' &&
        new Date(t.end_date) < now
    );
};

export const selectTasksAssignedToUser = (state: { standalone: StandaloneState }, userId: string) =>
    state.standalone.tasks.filter(t => t.assigned_to === userId);

export const selectFilteredStandaloneTasks = (state: { standalone: StandaloneState }) => {
    const { tasks, filters } = state.standalone;
    let result = [...tasks];

    if (filters.status) {
        result = result.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
        result = result.filter(t => t.priority === filters.priority);
    }
    if (filters.assigned_to) {
        result = result.filter(t => t.assigned_to === filters.assigned_to);
    }
    if (filters.assigned_to_team) {
        result = result.filter(t => t.assigned_to_team === filters.assigned_to_team);
    }
    if (filters.is_archived !== undefined) {
        result = result.filter(t => t.is_archived === filters.is_archived);
    }
    if (filters.search) {
        const search = filters.search.toLowerCase();
        result = result.filter(t =>
            t.title.toLowerCase().includes(search) ||
            (t.description && t.description.toLowerCase().includes(search))
        );
    }
    if (filters.end_date_from) {
        result = result.filter(t => t.end_date >= filters.end_date_from!);
    }
    if (filters.end_date_to) {
        result = result.filter(t => t.end_date <= filters.end_date_to!);
    }

    return result;
};

export default standaloneSlice.reducer;