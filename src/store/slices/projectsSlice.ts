// src/store/slices/projectsSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import type {
    Project,
    ProjectTask,
    ProjectSubtask,
    ProjectTaskComment,
    ProjectPaginationResponse,
    ProjectTaskPaginationResponse,
    ProjectStats,
    CreateProjectInput,
    UpdateProjectInput,
    CreateProjectTaskInput,
    UpdateProjectTaskInput,
    ProjectTaskFilters,
    ProjectFilters,
    CreateProjectSubtaskInput,
    UpdateProjectSubtaskInput,
    CreateProjectCommentInput,
    UpdateProjectCommentInput,
    ProjectUser,
    //ProjectPriority,
    ProjectTaskStatus,
    BulkTaskUpdate,
} from '../../types/projects.types';
import axiosClient from '../../api/api';

/* ============================================================
   STATE
============================================================ */

interface ProjectsState {
    projects: Project[];
    currentProject: Project | null;
    projectsPagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    } | null;
    tasks: ProjectTask[];
    currentTask: ProjectTask | null;
    tasksPagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    } | null;
    subtasks: Record<string, ProjectSubtask[]>;
    comments: Record<string, ProjectTaskComment[]>;
    stats: ProjectStats | null;
    projectMembers: ProjectUser[];
    loading: boolean;
    error: string | null;
    success: boolean;
    actionInProgress: {
        creatingProject?: boolean;
        updatingProject?: boolean;
        deletingProject?: boolean;
        fetchingMembers?: boolean;
        addingMember?: boolean;
        removingMember?: boolean;
        creatingTask?: boolean;
        updatingTask?: boolean;
        deletingTask?: boolean;
        fetchingTaskStats?: boolean;
        bulkUpdatingTasks?: boolean;
        creatingSubtask?: boolean;
        updatingSubtask?: boolean;
        deletingSubtask?: boolean;
        creatingComment?: boolean;
        updatingComment?: boolean;
        deletingComment?: boolean;
        uploadingFile?: boolean;
        deletingFile?: boolean;
    };
    taskFilters: ProjectTaskFilters;
    projectFilters: ProjectFilters;
    selectedProjectId: string | null;
    selectedTaskId: string | null;
    latestProjectsRequestId: string | null;
    latestTasksRequestId: string | null;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: ProjectsState = {
    projects: [],
    currentProject: null,
    projectsPagination: null,
    tasks: [],
    currentTask: null,
    tasksPagination: null,
    subtasks: {},
    comments: {},
    stats: null,
    projectMembers: [],
    loading: false,
    error: null,
    success: false,
    actionInProgress: {},
    taskFilters: {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'DESC',
    },
    projectFilters: {
        page: 1,
        limit: 20,
    },
    selectedProjectId: null,
    selectedTaskId: null,
    latestProjectsRequestId: null,
    latestTasksRequestId: null,
};

/* ============================================================
   HELPERS
============================================================ */

interface ApiErrorShape {
    message?: string;
    error?: string | Record<string, unknown>;
    errors?: Array<string | { message?: string; field?: string }>;
    detail?: string;
}

const extractErrorMessage = (error: unknown): string => {
    const axiosError = error as AxiosError<ApiErrorShape | string>;
    const data = axiosError.response?.data;

    if (!data) return axiosError.message ?? 'An unexpected error occurred';

    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    if (Array.isArray(data.errors) && data.errors.length > 0) {
        const first = data.errors[0];
        return typeof first === 'string' ? first : first.message ?? JSON.stringify(first);
    }
    if (data.detail) return data.detail;

    return axiosError.message ?? 'An unexpected error occurred';
};
/* ============================================================
   ASYNC THUNKS - PROJECTS
============================================================ */

export const fetchProjects = createAsyncThunk(
    'projects/fetchAll',
    async (filters: ProjectFilters = {}, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get<{ success: boolean; data: ProjectPaginationResponse }>(
                '/projects',
                { params: filters }
            );
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchProjectById = createAsyncThunk(
    'projects/fetchById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get<{ success: boolean; data: Project }>(`/projects/${id}`);
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const createProject = createAsyncThunk(
    'projects/create',
    async (input: CreateProjectInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post<{ success: boolean; data: Project }>('/projects', input);
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const updateProject = createAsyncThunk(
    'projects/update',
    async ({ id, input }: { id: string; input: UpdateProjectInput }, { rejectWithValue }) => {
        try {
            // Ensure input is an object and not undefined
            const cleanInput = input || {};
            
            const { data } = await axiosClient.patch<{ success: boolean; data: Project }>(
                `/projects/${id}`, 
                cleanInput
            );
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const deleteProject = createAsyncThunk(
    'projects/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/projects/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchProjectMembers = createAsyncThunk(
    'projects/fetchMembers',
    async (projectId: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get<{ success: boolean; data: ProjectUser[] }>(
                `/projects/${projectId}/members`
            );
            return { projectId, members: data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const addProjectMember = createAsyncThunk(
    'projects/addMember',
    async ({ projectId, userId }: { projectId: string; userId: string }, { rejectWithValue }) => {
        try {
            await axiosClient.post(`/projects/${projectId}/members`, { userId });
            return { projectId, userId };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const removeProjectMember = createAsyncThunk(
    'projects/removeMember',
    async ({ projectId, userId }: { projectId: string; userId: string }, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/projects/${projectId}/members/${userId}`);
            return { projectId, userId };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

/* ============================================================
   ASYNC THUNKS - TASKS
============================================================ */

export const fetchTasks = createAsyncThunk(
    'projects/fetchTasks',
    async (filters: ProjectTaskFilters = {}, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get<{ success: boolean; data: ProjectTaskPaginationResponse }>(
                '/projects/tasks',
                { params: filters }
            );
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchTaskById = createAsyncThunk(
    'projects/fetchTaskById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get<{ success: boolean; data: ProjectTask }>(`/projects/tasks/${id}`);
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const createTask = createAsyncThunk(
    'projects/createTask',
    async (input: CreateProjectTaskInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post<{ success: boolean; data: ProjectTask }>('/projects/tasks', input);
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const updateTask = createAsyncThunk(
    'projects/updateTask',
    async ({ id, input }: { id: string; input: UpdateProjectTaskInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.patch<{ success: boolean; data: ProjectTask }>(
                `/projects/tasks/${id}`,
                input
            );
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const deleteTask = createAsyncThunk(
    'projects/deleteTask',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/projects/tasks/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchTaskStats = createAsyncThunk(
    'projects/fetchTaskStats',
    async (projectId: string | undefined, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get<{ success: boolean; data: ProjectStats }>(
                '/projects/tasks/stats',
                { params: projectId ? { projectId } : {} }
            );
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const bulkUpdateTasks = createAsyncThunk(
    'projects/bulkUpdateTasks',
    async (updates: BulkTaskUpdate[], { rejectWithValue }) => {
        try {
            await axiosClient.patch('/projects/tasks/bulk', { updates });
            return updates;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchTasksByAssignee = createAsyncThunk(
    'projects/fetchTasksByAssignee',
    async ({ assigneeId, projectId }: { assigneeId: string; projectId?: string }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get<{ success: boolean; data: ProjectTask[] }>(
                `/projects/tasks/assigned/${assigneeId}`,
                { params: projectId ? { projectId } : {} }
            );
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchTasksByStatus = createAsyncThunk(
    'projects/fetchTasksByStatus',
    async ({ projectId, status }: { projectId: string; status: string }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get<{ success: boolean; data: ProjectTask[] }>(
                '/projects/tasks/by-status',
                { params: { projectId, status } }
            );
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const fetchOverdueTasks = createAsyncThunk(
    'projects/fetchOverdueTasks',
    async (projectId: string | undefined, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get<{ success: boolean; data: ProjectTask[] }>(
                '/projects/tasks/overdue',
                { params: projectId ? { projectId } : {} }
            );
            return data.data;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

/* ============================================================
   ASYNC THUNKS - SUBTASKS
============================================================ */

export const createSubtask = createAsyncThunk(
    'projects/createSubtask',
    async ({ taskId, input }: { taskId: string; input: CreateProjectSubtaskInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post<{ success: boolean; data: ProjectSubtask }>(
                `/projects/tasks/${taskId}/subtasks`,
                input
            );
            return { taskId, subtask: data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const updateSubtask = createAsyncThunk(
    'projects/updateSubtask',
    async (
        { taskId, subtaskId, input }: { taskId: string; subtaskId: string; input: UpdateProjectSubtaskInput },
        { rejectWithValue }
    ) => {
        try {
            const { data } = await axiosClient.patch<{ success: boolean; data: ProjectSubtask }>(
                `/projects/tasks/${taskId}/subtasks/${subtaskId}`,
                input
            );
            return { taskId, subtask: data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const deleteSubtask = createAsyncThunk(
    'projects/deleteSubtask',
    async ({ taskId, subtaskId }: { taskId: string; subtaskId: string }, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/projects/tasks/${taskId}/subtasks/${subtaskId}`);
            return { taskId, subtaskId };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

/* ============================================================
   ASYNC THUNKS - COMMENTS
============================================================ */

export const createComment = createAsyncThunk(
    'projects/createComment',
    async ({ taskId, input }: { taskId: string; input: CreateProjectCommentInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post<{ success: boolean; data: ProjectTaskComment }>(
                `/projects/tasks/${taskId}/comments`,
                input
            );
            return { taskId, comment: data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const updateComment = createAsyncThunk(
    'projects/updateComment',
    async (
        { taskId, commentId, input }: { taskId: string; commentId: string; input: UpdateProjectCommentInput },
        { rejectWithValue }
    ) => {
        try {
            const { data } = await axiosClient.patch<{ success: boolean; data: ProjectTaskComment }>(
                `/projects/tasks/${taskId}/comments/${commentId}`,
                input
            );
            return { taskId, comment: data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const deleteComment = createAsyncThunk(
    'projects/deleteComment',
    async ({ taskId, commentId }: { taskId: string; commentId: string }, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/projects/tasks/${taskId}/comments/${commentId}`);
            return { taskId, commentId };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

/* ============================================================
   ASYNC THUNKS - FILES
============================================================ */

export const uploadFile = createAsyncThunk(
    'projects/uploadFile',
    async ({ taskId, file }: { taskId: string; file: File }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const { data } = await axiosClient.post<{ success: boolean; data: { file: unknown } }>(
                `/projects/tasks/${taskId}/files`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return { taskId, fileData: data.data };
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

export const deleteFile = createAsyncThunk(
    'projects/deleteFile',
    async (fileId: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/projects/files/${fileId}`);
            return fileId;
        } catch (err) {
            return rejectWithValue(extractErrorMessage(err));
        }
    }
);

/* ============================================================
   SLICE
============================================================ */

const projectsSlice = createSlice({
    name: 'projects',
    initialState,
    reducers: {
        setProjectFilters(state, action: PayloadAction<Partial<ProjectFilters>>) {
            state.projectFilters = { ...state.projectFilters, ...action.payload };
        },
        setTaskFilters(state, action: PayloadAction<Partial<ProjectTaskFilters>>) {
            state.taskFilters = { ...state.taskFilters, ...action.payload };
        },
        resetTaskFilters(state) {
            state.taskFilters = {
                page: 1,
                limit: 20,
                sort_by: 'created_at',
                sort_order: 'DESC',
            };
        },
        selectProject(state, action: PayloadAction<string | null>) {
            state.selectedProjectId = action.payload;
        },
        selectTask(state, action: PayloadAction<string | null>) {
            state.selectedTaskId = action.payload;
        },
        clearCurrentProject(state) { state.currentProject = null; },
        clearCurrentTask(state) { state.currentTask = null; },
        clearError(state) { state.error = null; },
        clearSuccess(state) { state.success = false; },
        resetProjectsState: () => initialState,

        updateProjectLocally(state, action: PayloadAction<{ id: string; updates: Partial<Project> }>) {
            const index = state.projects.findIndex(p => p.id === action.payload.id);
            if (index !== -1) {
                state.projects[index] = { ...state.projects[index], ...action.payload.updates };
            }
            if (state.currentProject?.id === action.payload.id) {
                state.currentProject = { ...state.currentProject, ...action.payload.updates };
            }
        },
        removeProjectLocally(state, action: PayloadAction<string>) {
            state.projects = state.projects.filter(p => p.id !== action.payload);
            if (state.currentProject?.id === action.payload) {
                state.currentProject = null;
            }
        },
        updateTaskLocally(state, action: PayloadAction<{ id: string; updates: Partial<ProjectTask> }>) {
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
        },
        addTaskLocally(state, action: PayloadAction<ProjectTask>) {
            state.tasks.unshift(action.payload);
        },
        updateSubtaskLocally(state, action: PayloadAction<{ taskId: string; subtask: ProjectSubtask }>) {
            const subtasks = state.subtasks[action.payload.taskId];
            if (subtasks) {
                const index = subtasks.findIndex(s => s.id === action.payload.subtask.id);
                if (index !== -1) {
                    subtasks[index] = action.payload.subtask;
                }
            }
        },
        removeSubtaskLocally(state, action: PayloadAction<{ taskId: string; subtaskId: string }>) {
            const subtasks = state.subtasks[action.payload.taskId];
            if (subtasks) {
                state.subtasks[action.payload.taskId] = subtasks.filter(s => s.id !== action.payload.subtaskId);
            }
        },
        addCommentLocally(state, action: PayloadAction<{ taskId: string; comment: ProjectTaskComment }>) {
            const { taskId, comment } = action.payload;
            if (!state.comments[taskId]) {
                state.comments[taskId] = [];
            }
            state.comments[taskId].push(comment);
        },
        updateCommentLocally(state, action: PayloadAction<{ taskId: string; comment: ProjectTaskComment }>) {
            const comments = state.comments[action.payload.taskId];
            if (comments) {
                const index = comments.findIndex(c => c.id === action.payload.comment.id);
                if (index !== -1) {
                    comments[index] = action.payload.comment;
                }
            }
        },
        removeCommentLocally(state, action: PayloadAction<{ taskId: string; commentId: string }>) {
            const comments = state.comments[action.payload.taskId];
            if (comments) {
                state.comments[action.payload.taskId] = comments.filter(c => c.id !== action.payload.commentId);
            }
        },
    },
    extraReducers: (builder) => {
        /* ---------- FETCH PROJECTS ---------- */
        builder
            .addCase(fetchProjects.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.latestProjectsRequestId = action.meta.requestId;
            })
            .addCase(fetchProjects.fulfilled, (state, action) => {
                state.loading = false;
                if (state.latestProjectsRequestId && action.meta.requestId !== state.latestProjectsRequestId) return;
                state.projects = action.payload.data;
                state.projectsPagination = {
                    total: action.payload.total,
                    page: action.payload.page,
                    limit: action.payload.limit,
                    totalPages: action.payload.totalPages,
                };
            })
            .addCase(fetchProjects.rejected, (state, action) => {
                state.loading = false;
                if (state.latestProjectsRequestId && action.meta.requestId !== state.latestProjectsRequestId) return;
                state.error = action.payload as string;
            });

        /* ---------- FETCH PROJECT BY ID ---------- */
        builder
            .addCase(fetchProjectById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProjectById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentProject = action.payload;
            })
            .addCase(fetchProjectById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        /* ---------- CREATE PROJECT ---------- */
        builder
            .addCase(createProject.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.creatingProject = true;
            })
            .addCase(createProject.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.creatingProject = false;
                state.projects = [action.payload, ...state.projects];
                if (state.projectsPagination) {
                    state.projectsPagination.total += 1;
                    state.projectsPagination.totalPages = Math.ceil(state.projectsPagination.total / state.projectsPagination.limit);
                }
            })
            .addCase(createProject.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.creatingProject = false;
            });

        /* ---------- UPDATE PROJECT ---------- */
        builder
            .addCase(updateProject.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.updatingProject = true;
            })
            .addCase(updateProject.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.updatingProject = false;
                const index = state.projects.findIndex(p => p.id === action.payload.id);
                if (index !== -1) state.projects[index] = action.payload;
                if (state.currentProject?.id === action.payload.id) state.currentProject = action.payload;
            })
            .addCase(updateProject.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.updatingProject = false;
            });

        /* ---------- DELETE PROJECT ---------- */
        builder
            .addCase(deleteProject.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.deletingProject = true;
            })
            .addCase(deleteProject.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.deletingProject = false;
                state.projects = state.projects.filter(p => p.id !== action.payload);
                if (state.projectsPagination) {
                    state.projectsPagination.total -= 1;
                    state.projectsPagination.totalPages = Math.ceil(state.projectsPagination.total / state.projectsPagination.limit);
                }
                if (state.currentProject?.id === action.payload) state.currentProject = null;
                if (state.selectedProjectId === action.payload) state.selectedProjectId = null;
            })
            .addCase(deleteProject.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.deletingProject = false;
            });

        /* ---------- FETCH PROJECT MEMBERS ---------- */
        builder
            .addCase(fetchProjectMembers.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.actionInProgress.fetchingMembers = true;
            })
            .addCase(fetchProjectMembers.fulfilled, (state, action) => {
                state.loading = false;
                state.actionInProgress.fetchingMembers = false;
                state.projectMembers = action.payload.members;
            })
            .addCase(fetchProjectMembers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.actionInProgress.fetchingMembers = false;
            });

        /* ---------- ADD PROJECT MEMBER ---------- */
        builder
            .addCase(addProjectMember.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.addingMember = true;
            })
            .addCase(addProjectMember.fulfilled, (state) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.addingMember = false;
            })
            .addCase(addProjectMember.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.addingMember = false;
            });

        /* ---------- REMOVE PROJECT MEMBER ---------- */
        builder
            .addCase(removeProjectMember.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.removingMember = true;
            })
            .addCase(removeProjectMember.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.removingMember = false;
                state.projectMembers = state.projectMembers.filter(m => m.id !== action.payload.userId);
            })
            .addCase(removeProjectMember.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.removingMember = false;
            });

        /* ---------- FETCH TASKS ---------- */
        builder
            .addCase(fetchTasks.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                state.latestTasksRequestId = action.meta.requestId;
            })
            .addCase(fetchTasks.fulfilled, (state, action) => {
                state.loading = false;
                if (state.latestTasksRequestId && action.meta.requestId !== state.latestTasksRequestId) return;
                state.tasks = action.payload.data;
                state.tasksPagination = {
                    total: action.payload.total,
                    page: action.payload.page,
                    limit: action.payload.limit,
                    totalPages: action.payload.totalPages,
                };
            })
            .addCase(fetchTasks.rejected, (state, action) => {
                state.loading = false;
                if (state.latestTasksRequestId && action.meta.requestId !== state.latestTasksRequestId) return;
                state.error = action.payload as string;
            });

        /* ---------- FETCH TASK BY ID ---------- */
        builder
            .addCase(fetchTaskById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTaskById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentTask = action.payload;
                if (action.payload.subtasks) {
                    state.subtasks[action.payload.id] = action.payload.subtasks;
                }
                if (action.payload.comments) {
                    state.comments[action.payload.id] = action.payload.comments;
                }
            })
            .addCase(fetchTaskById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        /* ---------- CREATE TASK ---------- */
        builder
            .addCase(createTask.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.creatingTask = true;
            })
            .addCase(createTask.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.creatingTask = false;
                state.tasks = [action.payload, ...state.tasks];
                if (state.tasksPagination) {
                    state.tasksPagination.total += 1;
                    state.tasksPagination.totalPages = Math.ceil(state.tasksPagination.total / state.tasksPagination.limit);
                }
            })
            .addCase(createTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.creatingTask = false;
            });

        /* ---------- UPDATE TASK ---------- */
        builder
            .addCase(updateTask.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.updatingTask = true;
            })
            .addCase(updateTask.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.updatingTask = false;
                const index = state.tasks.findIndex(t => t.id === action.payload.id);
                if (index !== -1) state.tasks[index] = action.payload;
                if (state.currentTask?.id === action.payload.id) state.currentTask = action.payload;
                if (action.payload.subtasks) {
                    state.subtasks[action.payload.id] = action.payload.subtasks;
                }
                if (action.payload.comments) {
                    state.comments[action.payload.id] = action.payload.comments;
                }
            })
            .addCase(updateTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.updatingTask = false;
            });

        /* ---------- DELETE TASK ---------- */
        builder
            .addCase(deleteTask.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.deletingTask = true;
            })
            .addCase(deleteTask.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.deletingTask = false;
                state.tasks = state.tasks.filter(t => t.id !== action.payload);
                if (state.tasksPagination) {
                    state.tasksPagination.total -= 1;
                    state.tasksPagination.totalPages = Math.ceil(state.tasksPagination.total / state.tasksPagination.limit);
                }
                if (state.currentTask?.id === action.payload) state.currentTask = null;
                if (state.selectedTaskId === action.payload) state.selectedTaskId = null;
            })
            .addCase(deleteTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.deletingTask = false;
            });

        /* ---------- FETCH TASK STATS ---------- */
        builder
            .addCase(fetchTaskStats.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.actionInProgress.fetchingTaskStats = true;
            })
            .addCase(fetchTaskStats.fulfilled, (state, action) => {
                state.loading = false;
                state.actionInProgress.fetchingTaskStats = false;
                state.stats = action.payload;
            })
            .addCase(fetchTaskStats.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.actionInProgress.fetchingTaskStats = false;
            });

        /* ---------- BULK UPDATE TASKS ---------- */
        builder
            .addCase(bulkUpdateTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.bulkUpdatingTasks = true;
            })
            .addCase(bulkUpdateTasks.fulfilled, (state) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.bulkUpdatingTasks = false;
            })
            .addCase(bulkUpdateTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.bulkUpdatingTasks = false;
            });

        /* ---------- FETCH TASKS BY ASSIGNEE ---------- */
        builder
            .addCase(fetchTasksByAssignee.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTasksByAssignee.fulfilled, (state, action) => {
                state.loading = false;
                state.tasks = action.payload;
            })
            .addCase(fetchTasksByAssignee.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH TASKS BY STATUS ---------- */
        builder
            .addCase(fetchTasksByStatus.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTasksByStatus.fulfilled, (state, action) => {
                state.loading = false;
                state.tasks = action.payload;
            })
            .addCase(fetchTasksByStatus.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH OVERDUE TASKS ---------- */
        builder
            .addCase(fetchOverdueTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOverdueTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.tasks = action.payload;
            })
            .addCase(fetchOverdueTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        /* ---------- CREATE SUBTASK ---------- */
        builder
            .addCase(createSubtask.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.creatingSubtask = true;
            })
            .addCase(createSubtask.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.creatingSubtask = false;
                const { taskId, subtask } = action.payload;
                if (!state.subtasks[taskId]) {
                    state.subtasks[taskId] = [];
                }
                state.subtasks[taskId].push(subtask);
            })
            .addCase(createSubtask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.creatingSubtask = false;
            });

        /* ---------- UPDATE SUBTASK ---------- */
        builder
            .addCase(updateSubtask.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.updatingSubtask = true;
            })
            .addCase(updateSubtask.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.updatingSubtask = false;
                const { taskId, subtask } = action.payload;
                const subtasks = state.subtasks[taskId];
                if (subtasks) {
                    const index = subtasks.findIndex(s => s.id === subtask.id);
                    if (index !== -1) {
                        subtasks[index] = subtask;
                    }
                }
            })
            .addCase(updateSubtask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.updatingSubtask = false;
            });

        /* ---------- DELETE SUBTASK ---------- */
        builder
            .addCase(deleteSubtask.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.deletingSubtask = true;
            })
            .addCase(deleteSubtask.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.deletingSubtask = false;
                const { taskId, subtaskId } = action.payload;
                const subtasks = state.subtasks[taskId];
                if (subtasks) {
                    state.subtasks[taskId] = subtasks.filter(s => s.id !== subtaskId);
                }
            })
            .addCase(deleteSubtask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.deletingSubtask = false;
            });

        /* ---------- CREATE COMMENT ---------- */
        builder
            .addCase(createComment.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.creatingComment = true;
            })
            .addCase(createComment.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.creatingComment = false;
                const { taskId, comment } = action.payload;
                if (!state.comments[taskId]) {
                    state.comments[taskId] = [];
                }
                state.comments[taskId].push(comment);
            })
            .addCase(createComment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.creatingComment = false;
            });

        /* ---------- UPDATE COMMENT ---------- */
        builder
            .addCase(updateComment.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.updatingComment = true;
            })
            .addCase(updateComment.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.updatingComment = false;
                const { taskId, comment } = action.payload;
                const comments = state.comments[taskId];
                if (comments) {
                    const index = comments.findIndex(c => c.id === comment.id);
                    if (index !== -1) {
                        comments[index] = comment;
                    }
                }
            })
            .addCase(updateComment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.updatingComment = false;
            });

        /* ---------- DELETE COMMENT ---------- */
        builder
            .addCase(deleteComment.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.deletingComment = true;
            })
            .addCase(deleteComment.fulfilled, (state, action) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.deletingComment = false;
                const { taskId, commentId } = action.payload;
                const comments = state.comments[taskId];
                if (comments) {
                    state.comments[taskId] = comments.filter(c => c.id !== commentId);
                }
            })
            .addCase(deleteComment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.deletingComment = false;
            });

        /* ---------- UPLOAD FILE ---------- */
        builder
            .addCase(uploadFile.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.uploadingFile = true;
            })
            .addCase(uploadFile.fulfilled, (state) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.uploadingFile = false;
            })
            .addCase(uploadFile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.uploadingFile = false;
            });

        /* ---------- DELETE FILE ---------- */
        builder
            .addCase(deleteFile.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
                state.actionInProgress.deletingFile = true;
            })
            .addCase(deleteFile.fulfilled, (state) => {
                state.loading = false;
                state.success = true;
                state.actionInProgress.deletingFile = false;
            })
            .addCase(deleteFile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                state.success = false;
                state.actionInProgress.deletingFile = false;
            });
    },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
    setProjectFilters,
    setTaskFilters,
    resetTaskFilters,
    selectProject,
    selectTask,
    clearCurrentProject,
    clearCurrentTask,
    clearError,
    clearSuccess,
    resetProjectsState,
    updateProjectLocally,
    removeProjectLocally,
    updateTaskLocally,
    removeTaskLocally,
    addTaskLocally,
    updateSubtaskLocally,
    removeSubtaskLocally,
    addCommentLocally,
    updateCommentLocally,
    removeCommentLocally,
} = projectsSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllProjects = (state: { projects: ProjectsState }) => state.projects.projects;
export const selectCurrentProject = (state: { projects: ProjectsState }) => state.projects.currentProject;
export const selectProjectsPagination = (state: { projects: ProjectsState }) => state.projects.projectsPagination;
export const selectAllTasks = (state: { projects: ProjectsState }) => state.projects.tasks;
export const selectCurrentTask = (state: { projects: ProjectsState }) => state.projects.currentTask;
export const selectTasksPagination = (state: { projects: ProjectsState }) => state.projects.tasksPagination;
export const selectProjectMembers = (state: { projects: ProjectsState }) => state.projects.projectMembers;
export const selectSubtasks = (state: { projects: ProjectsState }) => state.projects.subtasks;
export const selectComments = (state: { projects: ProjectsState }) => state.projects.comments;
export const selectProjectStats = (state: { projects: ProjectsState }) => state.projects.stats;
export const selectTaskFilters = (state: { projects: ProjectsState }) => state.projects.taskFilters;
export const selectProjectFilters = (state: { projects: ProjectsState }) => state.projects.projectFilters;
export const selectSelectedProjectId = (state: { projects: ProjectsState }) => state.projects.selectedProjectId;
export const selectSelectedTaskId = (state: { projects: ProjectsState }) => state.projects.selectedTaskId;

export const selectProjectsLoading = (state: { projects: ProjectsState }) => state.projects.loading;
export const selectProjectsError = (state: { projects: ProjectsState }) => state.projects.error;
export const selectProjectsSuccess = (state: { projects: ProjectsState }) => state.projects.success;

export const selectIsCreatingProject = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.creatingProject || false;
export const selectIsUpdatingProject = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.updatingProject || false;
export const selectIsDeletingProject = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.deletingProject || false;
export const selectIsCreatingTask = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.creatingTask || false;
export const selectIsUpdatingTask = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.updatingTask || false;
export const selectIsDeletingTask = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.deletingTask || false;
export const selectIsBulkUpdatingTasks = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.bulkUpdatingTasks || false;
export const selectIsCreatingSubtask = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.creatingSubtask || false;
export const selectIsUpdatingSubtask = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.updatingSubtask || false;
export const selectIsDeletingSubtask = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.deletingSubtask || false;
export const selectIsCreatingComment = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.creatingComment || false;
export const selectIsUpdatingComment = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.updatingComment || false;
export const selectIsDeletingComment = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.deletingComment || false;
export const selectIsUploadingFile = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.uploadingFile || false;
export const selectIsDeletingFile = (state: { projects: ProjectsState }) =>
    state.projects.actionInProgress.deletingFile || false;

export const selectProjectById = (state: { projects: ProjectsState }, projectId: string) =>
    state.projects.projects.find(p => p.id === projectId);
export const selectTaskById = (state: { projects: ProjectsState }, taskId: string) =>
    state.projects.tasks.find(t => t.id === taskId);
export const selectSubtasksByTaskId = (state: { projects: ProjectsState }, taskId: string) =>
    state.projects.subtasks[taskId] || [];
export const selectCommentsByTaskId = (state: { projects: ProjectsState }, taskId: string) =>
    state.projects.comments[taskId] || [];
export const selectTasksByProjectId = (state: { projects: ProjectsState }, projectId: string) =>
    state.projects.tasks.filter(t => t.project_id === projectId);
export const selectTasksByStatus = (state: { projects: ProjectsState }, status: ProjectTaskStatus) =>
    state.projects.tasks.filter(t => t.status === status);
export const selectInProgressTasks = (state: { projects: ProjectsState }) =>
    state.projects.tasks.filter(t => t.status === 'inprogress');
export const selectDoneTasks = (state: { projects: ProjectsState }) =>
    state.projects.tasks.filter(t => t.status === 'done');
export const selectOverdueTasks = (state: { projects: ProjectsState }) =>
    state.projects.tasks.filter(t => t.status === 'overdue');

export const selectFilteredTasks = (state: { projects: ProjectsState }) => {
    const { tasks, taskFilters } = state.projects;
    let result = [...tasks];

    if (taskFilters.project_id) {
        result = result.filter(t => t.project_id === taskFilters.project_id);
    }
    if (taskFilters.status) {
        result = result.filter(t => t.status === taskFilters.status);
    }
    if (taskFilters.priority) {
        result = result.filter(t => t.priority === taskFilters.priority);
    }
    if (taskFilters.type) {
        const typeLower = taskFilters.type.toLowerCase();
        result = result.filter(t => t.type && t.type.toLowerCase().includes(typeLower));
    }
    if (taskFilters.assignee) {
        result = result.filter(t => t.assignee === taskFilters.assignee);
    }
    if (taskFilters.tags && taskFilters.tags.length > 0) {
        const tags = Array.isArray(taskFilters.tags) ? taskFilters.tags : [taskFilters.tags];
        result = result.filter(t => t.tags.some(tag => tags.includes(tag)));
    }
    if (taskFilters.search) {
        const search = taskFilters.search.toLowerCase();
        result = result.filter(t =>
            t.title.toLowerCase().includes(search) ||
            (t.description && t.description.toLowerCase().includes(search))
        );
    }

    return result;
};

export const selectFilteredProjects = (state: { projects: ProjectsState }) => {
    const { projects, projectFilters } = state.projects;
    let result = [...projects];

    if (projectFilters.search) {
        const search = projectFilters.search.toLowerCase();
        result = result.filter(p =>
            p.title.toLowerCase().includes(search) ||
            (p.description && p.description.toLowerCase().includes(search))
        );
    }

    return result;
};

export default projectsSlice.reducer;