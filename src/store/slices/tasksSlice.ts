// src/store/slices/tasksSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';
import type {
  Task,
  TaskList,
  TaskListMember,
  TaskSummary,
  TaskPaginationResponse,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubtaskInput,
  UpdateSubtaskInput,
  CreateTaskListInput,
  UpdateTaskListInput,
  TaskFilters,
  TaskStatus,
  TaskPriority,
  TaskDay,
  Subtask,
  TaskAttachment,  // ← renamed from Attachment
} from '../../types/tasks.types';

/* ============================================================
   TYPES
============================================================ */

export type { TaskStatus, TaskPriority, TaskDay };

export interface TasksState {
  // Tasks
  tasks: Task[];
  currentTask: Task | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  // Task Lists
  taskLists: TaskList[];
  currentTaskList: TaskList | null;
  taskListMembers: TaskListMember[];

  // Subtasks
  subtasks: Record<string, Subtask[]>;

  // Attachments
  attachments: Record<string, TaskAttachment[]>;  // ← use TaskAttachment

  // Summary
  summary: TaskSummary | null;

  // UI State
  loading: {
    list: boolean;
    detail: boolean;
    mutating: boolean;
  };
  error: string | null;
  success: boolean;

  // Filters
  filters: TaskFilters;

  // Selected items
  selectedTaskIds: string[];
  selectedListId: string | null;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: TasksState = {
  tasks: [],
  currentTask: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
  taskLists: [],
  currentTaskList: null,
  taskListMembers: [],
  subtasks: {},
  attachments: {},
  summary: null,
  loading: {
    list: false,
    detail: false,
    mutating: false,
  },
  error: null,
  success: false,
  filters: {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'DESC',
  },
  selectedTaskIds: [],
  selectedListId: null,
};

/* ============================================================
   HELPERS
============================================================ */

const extractErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

/* ============================================================
   ASYNC THUNKS - TASKS
============================================================ */

export const fetchTasks = createAsyncThunk(
  'tasks/fetchAll',
  async (filters: TaskFilters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
      const response = await axiosClient.get(`/tasks?${params.toString()}`);
      return response.data.data as TaskPaginationResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/${id}`);
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/create',
  async (data: CreateTaskInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks', data);
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ id, data }: { id: string; data: UpdateTaskInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/${id}`, data);
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const toggleTaskStatus = createAsyncThunk(
  'tasks/toggleStatus',
  async ({ id, status }: { id: string; status: TaskStatus }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/${id}/status`, { status });
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTaskSummary = createAsyncThunk(
  'tasks/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/tasks/summary');
      return response.data.data as TaskSummary;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - SUBTASKS
============================================================ */

export const createSubtask = createAsyncThunk(
  'tasks/createSubtask',
  async ({ taskId, data }: { taskId: string; data: CreateSubtaskInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/tasks/${taskId}/subtasks`, data);
      return { taskId, subtask: response.data.data as Subtask };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateSubtask = createAsyncThunk(
  'tasks/updateSubtask',
  async (
    { taskId, subtaskId, data }: { taskId: string; subtaskId: string; data: UpdateSubtaskInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, data);
      return { taskId, subtask: response.data.data as Subtask };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteSubtask = createAsyncThunk(
  'tasks/deleteSubtask',
  async ({ taskId, subtaskId }: { taskId: string; subtaskId: string }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
      return { taskId, subtaskId };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - TASK LISTS (with /tasks prefix)
============================================================ */

export const fetchTaskLists = createAsyncThunk(
  'tasks/fetchLists',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/tasks/lists');
      return response.data.data as TaskList[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTaskListById = createAsyncThunk(
  'tasks/fetchListById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/lists/${id}`);
      return response.data.data as TaskList;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createTaskList = createAsyncThunk(
  'tasks/createList',
  async (data: CreateTaskListInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/lists', data);
      return response.data.data as TaskList;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateTaskList = createAsyncThunk(
  'tasks/updateList',
  async ({ id, data }: { id: string; data: UpdateTaskListInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/lists/${id}`, data);
      return response.data.data as TaskList;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteTaskList = createAsyncThunk(
  'tasks/deleteList',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/lists/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchListMembers = createAsyncThunk(
  'tasks/fetchListMembers',
  async (listId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/lists/${listId}/members`);
      return { listId, members: response.data.data as TaskListMember[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const addMemberToList = createAsyncThunk(
  'tasks/addMemberToList',
  async ({ listId, userId }: { listId: string; userId: string }, { rejectWithValue }) => {
    try {
      await axiosClient.post(`/tasks/lists/${listId}/members`, { userId });
      return { listId, userId };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const removeMemberFromList = createAsyncThunk(
  'tasks/removeMemberFromList',
  async ({ listId, userId }: { listId: string; userId: string }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/lists/${listId}/members/${userId}`);
      return { listId, userId };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - ATTACHMENTS
============================================================ */

/**
 * Upload one or more files as attachments for a task.
 * Expects FormData with field name 'documents' (matching multer field).
 */
export const uploadTaskAttachments = createAsyncThunk(
  'tasks/uploadAttachments',
  async ({ taskId, formData }: { taskId: string; formData: FormData }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { taskId, attachments: response.data.data as TaskAttachment[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Delete a single attachment by its ID.
 */
export const deleteTaskAttachment = createAsyncThunk(
  'tasks/deleteAttachment',
  async ({ taskId, attachmentId }: { taskId: string; attachmentId: string }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
      return { taskId, attachmentId };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/**
 * Fetch all attachments for a task.
 */
export const fetchTaskAttachments = createAsyncThunk(
  'tasks/fetchAttachments',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/${taskId}/attachments`);
      return { taskId, attachments: response.data.data as TaskAttachment[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    // ── Filters ────────────────────────────────────────────────────────────
    setFilters(state, action: PayloadAction<Partial<TaskFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'DESC',
      };
    },
    setPage(state, action: PayloadAction<number>) {
      state.filters.page = action.payload;
    },
    setSort(state, action: PayloadAction<{ sort_by: TaskFilters['sort_by']; sort_order: TaskFilters['sort_order'] }>) {
      state.filters.sort_by = action.payload.sort_by;
      state.filters.sort_order = action.payload.sort_order;
    },

    // ── Selection ──────────────────────────────────────────────────────────
    selectSingleTask(state, action: PayloadAction<string>) {
      if (!state.selectedTaskIds.includes(action.payload)) {
        state.selectedTaskIds.push(action.payload);
      }
    },
    deselectSingleTask(state, action: PayloadAction<string>) {
      state.selectedTaskIds = state.selectedTaskIds.filter(id => id !== action.payload);
    },
    toggleSelectSingleTask(state, action: PayloadAction<string>) {
      const index = state.selectedTaskIds.indexOf(action.payload);
      if (index === -1) {
        state.selectedTaskIds.push(action.payload);
      } else {
        state.selectedTaskIds.splice(index, 1);
      }
    },
    selectAllTasksAction(state) {
      state.selectedTaskIds = state.tasks.map(task => task.id);
    },
    deselectAllTasksAction(state) {
      state.selectedTaskIds = [];
    },
    selectList(state, action: PayloadAction<string | null>) {
      state.selectedListId = action.payload;
    },

    // ── Clear State ────────────────────────────────────────────────────────
    clearCurrentTask(state) { state.currentTask = null; },
    clearError(state) { state.error = null; },
    clearSuccess(state) { state.success = false; },
    resetTasksState: () => initialState,

    // ── Local Updates ──────────────────────────────────────────────────────
    updateTaskLocally(state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) {
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...action.payload.updates };
      }
      if (state.currentTask?.id === action.payload.id) {
        state.currentTask = { ...state.currentTask, ...action.payload.updates };
      }
    },
    removeTaskLocally(state, action: PayloadAction<string>) {
      state.tasks = state.tasks.filter(task => task.id !== action.payload);
      if (state.currentTask?.id === action.payload) {
        state.currentTask = null;
      }
    },
    addTaskLocally(state, action: PayloadAction<Task>) {
      state.tasks.unshift(action.payload);
    },
    updateSubtaskLocally(state, action: PayloadAction<{ taskId: string; subtaskId: string; updates: Partial<Subtask> }>) {
      const subtasks = state.subtasks[action.payload.taskId];
      if (subtasks) {
        const index = subtasks.findIndex(s => s.id === action.payload.subtaskId);
        if (index !== -1) {
          subtasks[index] = { ...subtasks[index], ...action.payload.updates };
        }
      }
    },
    removeSubtaskLocally(state, action: PayloadAction<{ taskId: string; subtaskId: string }>) {
      const subtasks = state.subtasks[action.payload.taskId];
      if (subtasks) {
        state.subtasks[action.payload.taskId] = subtasks.filter(s => s.id !== action.payload.subtaskId);
      }
    },
    updateListLocally(state, action: PayloadAction<{ id: string; updates: Partial<TaskList> }>) {
      const index = state.taskLists.findIndex(list => list.id === action.payload.id);
      if (index !== -1) {
        state.taskLists[index] = { ...state.taskLists[index], ...action.payload.updates };
      }
      if (state.currentTaskList?.id === action.payload.id) {
        state.currentTaskList = { ...state.currentTaskList, ...action.payload.updates };
      }
    },
    removeListLocally(state, action: PayloadAction<string>) {
      state.taskLists = state.taskLists.filter(list => list.id !== action.payload);
      if (state.currentTaskList?.id === action.payload) {
        state.currentTaskList = null;
      }
    },

    // ── Local Attachment Updates ──────────────────────────────────────────
    addAttachmentsLocally(state, action: PayloadAction<{ taskId: string; attachments: TaskAttachment[] }>) {
      const { taskId, attachments } = action.payload;
      if (!state.attachments[taskId]) {
        state.attachments[taskId] = [];
      }
      state.attachments[taskId] = [...state.attachments[taskId], ...attachments];
      // Also update the task object if it's in the list or current
      const taskToUpdate = state.tasks.find(t => t.id === taskId);
      if (taskToUpdate) {
        taskToUpdate.attachments = [...(taskToUpdate.attachments || []), ...attachments];
      }
      if (state.currentTask?.id === taskId) {
        state.currentTask.attachments = [...(state.currentTask.attachments || []), ...attachments];
      }
    },
    removeAttachmentLocally(state, action: PayloadAction<{ taskId: string; attachmentId: string }>) {
      const { taskId, attachmentId } = action.payload;
      const atts = state.attachments[taskId];
      if (atts) {
        state.attachments[taskId] = atts.filter(a => a.id !== attachmentId);
      }
      // Also remove from task objects
      const taskToUpdate = state.tasks.find(t => t.id === taskId);
      if (taskToUpdate && taskToUpdate.attachments) {
        taskToUpdate.attachments = taskToUpdate.attachments.filter(a => a.id !== attachmentId);
      }
      if (state.currentTask?.id === taskId && state.currentTask.attachments) {
        state.currentTask.attachments = state.currentTask.attachments.filter(a => a.id !== attachmentId);
      }
    },
    setAttachmentsLocally(state, action: PayloadAction<{ taskId: string; attachments: TaskAttachment[] }>) {
      const { taskId, attachments } = action.payload;
      state.attachments[taskId] = attachments;
      // Also update the task objects
      const taskToUpdate = state.tasks.find(t => t.id === taskId);
      if (taskToUpdate) {
        taskToUpdate.attachments = attachments;
      }
      if (state.currentTask?.id === taskId) {
        state.currentTask.attachments = attachments;
      }
    },
  },
  extraReducers: (builder) => {
    /* ---------- FETCH TASKS ---------- */
    builder
      .addCase(fetchTasks.pending, (state) => { state.loading.list = true; state.error = null; })
      .addCase(fetchTasks.fulfilled, (state, action: PayloadAction<TaskPaginationResponse>) => {
        state.loading.list = false;
        state.tasks = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchTasks.rejected, (state, action) => { state.loading.list = false; state.error = action.payload as string; });

    /* ---------- FETCH TASK BY ID ---------- */
    builder
      .addCase(fetchTaskById.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchTaskById.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading.detail = false;
        state.currentTask = action.payload;
        if (action.payload.subtasks) {
          state.subtasks[action.payload.id] = action.payload.subtasks;
        }
        if (action.payload.attachments) {
          state.attachments[action.payload.id] = action.payload.attachments;
        }
      })
      .addCase(fetchTaskById.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- CREATE TASK ---------- */
    builder
      .addCase(createTask.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(createTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading.mutating = false;
        state.success = true;
        state.tasks = [action.payload, ...state.tasks];
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (action.payload.subtasks) {
          state.subtasks[action.payload.id] = action.payload.subtasks;
        }
        if (action.payload.attachments) {
          state.attachments[action.payload.id] = action.payload.attachments;
        }
      })
      .addCase(createTask.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- UPDATE TASK ---------- */
    builder
      .addCase(updateTask.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(updateTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) state.tasks[index] = action.payload;
        if (state.currentTask?.id === action.payload.id) state.currentTask = action.payload;
        if (action.payload.subtasks) {
          state.subtasks[action.payload.id] = action.payload.subtasks;
        }
        if (action.payload.attachments) {
          state.attachments[action.payload.id] = action.payload.attachments;
        }
      })
      .addCase(updateTask.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- TOGGLE TASK STATUS ---------- */
    builder
      .addCase(toggleTaskStatus.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(toggleTaskStatus.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) state.tasks[index] = action.payload;
        if (state.currentTask?.id === action.payload.id) state.currentTask = action.payload;
      })
      .addCase(toggleTaskStatus.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- DELETE TASK ---------- */
    builder
      .addCase(deleteTask.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteTask.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
        state.pagination.total -= 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (state.currentTask?.id === action.payload) state.currentTask = null;
        state.selectedTaskIds = state.selectedTaskIds.filter(id => id !== action.payload);
        delete state.subtasks[action.payload];
        delete state.attachments[action.payload];
      })
      .addCase(deleteTask.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- FETCH TASK SUMMARY ---------- */
    builder
      .addCase(fetchTaskSummary.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchTaskSummary.fulfilled, (state, action: PayloadAction<TaskSummary>) => {
        state.loading.detail = false;
        state.summary = action.payload;
      })
      .addCase(fetchTaskSummary.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- CREATE SUBTASK ---------- */
    // NOTE: previously registered twice (once here, once further down as a
    // separate `builder.addCase(...)` call) — RTK throws on a duplicate
    // handler for the same action type. Keeping the more complete version,
    // which also appends the new subtask into `currentTask.subtasks`.
    builder.addCase(createSubtask.fulfilled, (state, action: PayloadAction<{ taskId: string; subtask: Subtask }>) => {
      const { taskId, subtask } = action.payload;
      // Update subtasks map
      if (!state.subtasks[taskId]) state.subtasks[taskId] = [];
      state.subtasks[taskId].push(subtask);

      // Update task in the list
      const taskIndex = state.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex].subtask_count = (state.tasks[taskIndex].subtask_count || 0) + 1;
      }
      // Update currentTask if it's the same task
      if (state.currentTask?.id === taskId) {
        state.currentTask.subtask_count = (state.currentTask.subtask_count || 0) + 1;
        state.currentTask.subtasks = [...(state.currentTask.subtasks || []), subtask];
      }
    });

    /* ---------- UPDATE SUBTASK ---------- */
    // NOTE: previously registered twice — keeping the version that also
    // syncs `currentTask.subtasks[idx]` with the updated subtask.
    builder.addCase(updateSubtask.fulfilled, (state, action: PayloadAction<{ taskId: string; subtask: Subtask }>) => {
      const { taskId, subtask } = action.payload;
      const subtasks = state.subtasks[taskId];
      if (subtasks) {
        const index = subtasks.findIndex(s => s.id === subtask.id);
        if (index !== -1) {
          const wasCompleted = subtasks[index].completed;
          subtasks[index] = subtask;

          // Update counts
          if (subtask.completed !== wasCompleted) {
            const taskIdx = state.tasks.findIndex(t => t.id === taskId);
            if (taskIdx !== -1) {
              state.tasks[taskIdx].completed_subtask_count =
                (state.tasks[taskIdx].completed_subtask_count || 0) + (subtask.completed ? 1 : -1);
            }
            if (state.currentTask?.id === taskId) {
              state.currentTask.completed_subtask_count =
                (state.currentTask.completed_subtask_count || 0) + (subtask.completed ? 1 : -1);
            }
          }
          // Update currentTask subtask list
          if (state.currentTask?.id === taskId && state.currentTask.subtasks) {
            const idx = state.currentTask.subtasks.findIndex(s => s.id === subtask.id);
            if (idx !== -1) state.currentTask.subtasks[idx] = subtask;
          }
        }
      }
    });

    /* ---------- DELETE SUBTASK ---------- */
    // NOTE: previously registered twice — keeping the version that also
    // filters `currentTask.subtasks`.
    builder.addCase(deleteSubtask.fulfilled, (state, action: PayloadAction<{ taskId: string; subtaskId: string }>) => {
      const { taskId, subtaskId } = action.payload;
      const subtasks = state.subtasks[taskId];
      if (subtasks) {
        const removed = subtasks.find(s => s.id === subtaskId);
        state.subtasks[taskId] = subtasks.filter(s => s.id !== subtaskId);

        const taskIdx = state.tasks.findIndex(t => t.id === taskId);
        if (taskIdx !== -1) {
          state.tasks[taskIdx].subtask_count = (state.tasks[taskIdx].subtask_count || 1) - 1;
          if (removed?.completed) {
            state.tasks[taskIdx].completed_subtask_count =
              (state.tasks[taskIdx].completed_subtask_count || 1) - 1;
          }
        }
        if (state.currentTask?.id === taskId) {
          state.currentTask.subtask_count = (state.currentTask.subtask_count || 1) - 1;
          if (removed?.completed) {
            state.currentTask.completed_subtask_count =
              (state.currentTask.completed_subtask_count || 1) - 1;
          }
          state.currentTask.subtasks = state.currentTask.subtasks?.filter(s => s.id !== subtaskId) || [];
        }
      }
    });

    /* ---------- FETCH TASK LISTS ---------- */
    builder
      .addCase(fetchTaskLists.pending, (state) => { state.loading.list = true; state.error = null; })
      .addCase(fetchTaskLists.fulfilled, (state, action: PayloadAction<TaskList[]>) => {
        state.loading.list = false;
        state.taskLists = action.payload;
      })
      .addCase(fetchTaskLists.rejected, (state, action) => { state.loading.list = false; state.error = action.payload as string; });

    /* ---------- FETCH TASK LIST BY ID ---------- */
    builder
      .addCase(fetchTaskListById.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchTaskListById.fulfilled, (state, action: PayloadAction<TaskList>) => {
        state.loading.detail = false;
        state.currentTaskList = action.payload;
      })
      .addCase(fetchTaskListById.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- CREATE TASK LIST ---------- */
    builder.addCase(createTaskList.fulfilled, (state, action: PayloadAction<TaskList>) => {
      state.taskLists = [action.payload, ...state.taskLists];
    });

    /* ---------- UPDATE TASK LIST ---------- */
    builder.addCase(updateTaskList.fulfilled, (state, action: PayloadAction<TaskList>) => {
      const index = state.taskLists.findIndex(list => list.id === action.payload.id);
      if (index !== -1) state.taskLists[index] = action.payload;
      if (state.currentTaskList?.id === action.payload.id) state.currentTaskList = action.payload;
    });

    /* ---------- DELETE TASK LIST ---------- */
    builder.addCase(deleteTaskList.fulfilled, (state, action: PayloadAction<string>) => {
      state.taskLists = state.taskLists.filter(list => list.id !== action.payload);
      if (state.currentTaskList?.id === action.payload) state.currentTaskList = null;
      if (state.selectedListId === action.payload) state.selectedListId = null;
    });

    /* ---------- FETCH LIST MEMBERS ---------- */
    builder.addCase(fetchListMembers.fulfilled, (state, action: PayloadAction<{ listId: string; members: TaskListMember[] }>) => {
      state.taskListMembers = action.payload.members;
    });

    /* ---------- ADD MEMBER TO LIST ---------- */
    builder.addCase(addMemberToList.fulfilled, (state, action: PayloadAction<{ listId: string; userId: string }>) => {
      const list = state.taskLists.find(l => l.id === action.payload.listId);
      if (list) list.member_count += 1;
      if (state.currentTaskList?.id === action.payload.listId) {
        state.currentTaskList.member_count += 1;
      }
    });

    /* ---------- REMOVE MEMBER FROM LIST ---------- */
    builder.addCase(removeMemberFromList.fulfilled, (state, action: PayloadAction<{ listId: string; userId: string }>) => {
      state.taskListMembers = state.taskListMembers.filter(
        member => member.user_id !== action.payload.userId
      );
      const list = state.taskLists.find(l => l.id === action.payload.listId);
      if (list) list.member_count = Math.max(0, list.member_count - 1);
      if (state.currentTaskList?.id === action.payload.listId) {
        state.currentTaskList.member_count = Math.max(0, state.currentTaskList.member_count - 1);
      }
    });

    /* ---------- ATTACHMENT THUNKS ---------- */
    builder
      .addCase(uploadTaskAttachments.fulfilled, (state, action: PayloadAction<{ taskId: string; attachments: TaskAttachment[] }>) => {
        const { taskId, attachments } = action.payload;
        if (!state.attachments[taskId]) {
          state.attachments[taskId] = [];
        }
        state.attachments[taskId] = [...state.attachments[taskId], ...attachments];
        // Update task objects
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
          task.attachments = [...(task.attachments || []), ...attachments];
        }
        if (state.currentTask?.id === taskId) {
          state.currentTask.attachments = [...(state.currentTask.attachments || []), ...attachments];
        }
      })
      .addCase(uploadTaskAttachments.rejected, (state, action) => {
        state.error = action.payload as string;
        state.success = false;
      })

      .addCase(deleteTaskAttachment.fulfilled, (state, action: PayloadAction<{ taskId: string; attachmentId: string }>) => {
        const { taskId, attachmentId } = action.payload;
        const atts = state.attachments[taskId];
        if (atts) {
          state.attachments[taskId] = atts.filter(a => a.id !== attachmentId);
        }
        // Update task objects
        const task = state.tasks.find(t => t.id === taskId);
        if (task && task.attachments) {
          task.attachments = task.attachments.filter(a => a.id !== attachmentId);
        }
        if (state.currentTask?.id === taskId && state.currentTask.attachments) {
          state.currentTask.attachments = state.currentTask.attachments.filter(a => a.id !== attachmentId);
        }
      })
      .addCase(deleteTaskAttachment.rejected, (state, action) => {
        state.error = action.payload as string;
        state.success = false;
      })

      .addCase(fetchTaskAttachments.fulfilled, (state, action: PayloadAction<{ taskId: string; attachments: TaskAttachment[] }>) => {
        const { taskId, attachments } = action.payload;
        state.attachments[taskId] = attachments;
        // Also update task objects
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
          task.attachments = attachments;
        }
        if (state.currentTask?.id === taskId) {
          state.currentTask.attachments = attachments;
        }
      })
      .addCase(fetchTaskAttachments.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setFilters,
  resetFilters,
  setPage,
  setSort,
  selectSingleTask,
  deselectSingleTask,
  toggleSelectSingleTask,
  selectAllTasksAction,
  deselectAllTasksAction,
  selectList,
  clearCurrentTask,
  clearError,
  clearSuccess,
  resetTasksState,
  updateTaskLocally,
  removeTaskLocally,
  addTaskLocally,
  updateSubtaskLocally,
  removeSubtaskLocally,
  updateListLocally,
  removeListLocally,
  addAttachmentsLocally,
  removeAttachmentLocally,
  setAttachmentsLocally,
} = tasksSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ── Base Selectors ──────────────────────────────────────────────────────────

export const selectAllTasks = (state: { tasks: TasksState }) => state.tasks.tasks;
export const selectCurrentTask = (state: { tasks: TasksState }) => state.tasks.currentTask;
export const selectTasksPagination = (state: { tasks: TasksState }) => state.tasks.pagination;
export const selectTaskLists = (state: { tasks: TasksState }) => state.tasks.taskLists;
export const selectCurrentTaskList = (state: { tasks: TasksState }) => state.tasks.currentTaskList;
export const selectTaskListMembers = (state: { tasks: TasksState }) => state.tasks.taskListMembers;
export const selectSubtasks = (state: { tasks: TasksState }) => state.tasks.subtasks;
export const selectAttachments = (state: { tasks: TasksState }) => state.tasks.attachments;
export const selectTasksSummary = (state: { tasks: TasksState }) => state.tasks.summary;
export const selectTasksListLoading = (state: { tasks: TasksState }) => state.tasks.loading.list;
export const selectTasksDetailLoading = (state: { tasks: TasksState }) => state.tasks.loading.detail;
export const selectTasksMutating = (state: { tasks: TasksState }) => state.tasks.loading.mutating;
export const selectTasksError = (state: { tasks: TasksState }) => state.tasks.error;
export const selectTasksSuccess = (state: { tasks: TasksState }) => state.tasks.success;
export const selectTasksFilters = (state: { tasks: TasksState }) => state.tasks.filters;
export const selectSelectedTaskIds = (state: { tasks: TasksState }) => state.tasks.selectedTaskIds;
export const selectSelectedListId = (state: { tasks: TasksState }) => state.tasks.selectedListId;
export const selectTotalTasks = (state: { tasks: TasksState }) => state.tasks.pagination.total;

// ── Derived Selectors ──────────────────────────────────────────────────────

export const selectTaskById = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.tasks.find(task => task.id === taskId);

export const selectSubtasksByTaskId = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.subtasks[taskId] || [];

export const selectAttachmentsByTaskId = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.attachments[taskId] || [];

export const selectTasksByListId = (listId: string | null) => (state: { tasks: TasksState }) =>
  listId ? state.tasks.tasks.filter(task => task.list_id === listId) : state.tasks.tasks;

export const selectTasksByStatus = (status: TaskStatus) => (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.status === status);

export const selectTasksByDay = (day: TaskDay) => (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.day === day);

export const selectTasksByPriority = (priority: TaskPriority) => (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.priority === priority);

export const selectPendingTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.status === 'pending');

export const selectCompletedTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.status === 'completed');

export const selectArchivedTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.status === 'archived');

export const selectTodayTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.day === 'Today');

export const selectMyDayTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.in_my_day);

export const selectOverdueTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
  });

export const selectUrgentTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.priority === 'urgent');

export const selectHighPriorityTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => task.priority === 'high');

export const selectSelectedTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(task => state.tasks.selectedTaskIds.includes(task.id));

export const selectTaskCompletionRate = (state: { tasks: TasksState }) => {
  const summary = state.tasks.summary;
  if (!summary || summary.total === 0) return 0;
  return Math.round((summary.completed / summary.total) * 100);
};

export const selectTaskCountsByList = (state: { tasks: TasksState }) => {
  const { tasks, taskLists } = state.tasks;
  const counts: Record<string, { total: number; completed: number }> = {};
  taskLists.forEach(list => {
    const listTasks = tasks.filter(task => task.list_id === list.id);
    counts[list.id] = {
      total: listTasks.length,
      completed: listTasks.filter(task => task.status === 'completed').length,
    };
  });
  const unassigned = tasks.filter(task => !task.list_id);
  counts['unassigned'] = {
    total: unassigned.length,
    completed: unassigned.filter(task => task.status === 'completed').length,
  };
  return counts;
};

export const selectFilteredTasks = (state: { tasks: TasksState }) => {
  const { tasks, filters } = state.tasks;
  let result = [...tasks];

  if (filters.list_id) {
    result = result.filter(task => task.list_id === filters.list_id);
  }
  if (filters.status) {
    result = result.filter(task => task.status === filters.status);
  }
  if (filters.day) {
    result = result.filter(task => task.day === filters.day);
  }
  if (filters.in_my_day !== undefined) {
    result = result.filter(task => task.in_my_day === filters.in_my_day);
  }
  if (filters.assigned_to) {
    result = result.filter(task => task.assigned_to === filters.assigned_to);
  }
  if (filters.tags && filters.tags.length > 0) {
    const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    result = result.filter(task =>
      task.tags.some(tag => tags.includes(tag))
    );
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(task =>
      task.title.toLowerCase().includes(search) ||
      (task.notes && task.notes.toLowerCase().includes(search))
    );
  }

  return result;
};

export default tasksSlice.reducer;