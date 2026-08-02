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
  TaskAttachment,
  TaskComment,
  TaskReminder,
  TaskDependency,
  TaskRecurrence,
  Tag,
  TaskEvent,
  TaskNotification,
  TaskTimelineData,
  TaskAnalytics,
  TaskSearchResponse,
  TaskImportResult,
  BulkUpdateTasksInput,
  BulkTaskActionInput,
  BulkUpdateSubtasksInput,
  AddListMembersInput,
  UpdateListMemberInput,
  CreateTaskCommentInput,
  UpdateTaskCommentInput,
  CreateReminderInput,
  UpdateReminderInput,
  CreateTagInput,
  UpdateTagInput,
  CreateDependencyInput,
  UpdateRecurrenceInput,
  MoveTaskInput,
  CopyTaskInput,
  NotificationFilters,
  TaskTimelineFilters,
  TaskAnalyticsFilters,
  TaskSearchRequest,
  TaskExportOptions,
  TaskImportOptions,
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
  attachments: Record<string, TaskAttachment[]>;

  // Comments
  comments: Record<string, TaskComment[]>;

  // Reminders
  reminders: Record<string, TaskReminder[]>;

  // Dependencies
  dependencies: Record<string, TaskDependency[]>;

  // Recurrence
  recurrence: Record<string, TaskRecurrence>;

  // Tags
  tags: Tag[];

  // Timeline & Analytics
  timeline: TaskTimelineData[];
  analytics: TaskAnalytics | null;

  // Search
  searchResults: TaskSearchResponse | null;

  // Notifications
  notifications: TaskNotification[];
  unreadNotificationCount: number;

  // Events
  events: TaskEvent[];

  // Summary
  summary: TaskSummary | null;

  // UI State
  loading: {
    list: boolean;
    detail: boolean;
    mutating: boolean;
    timeline: boolean;
    analytics: boolean;
    search: boolean;
    notifications: boolean;
    events: boolean;
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
  comments: {},
  reminders: {},
  dependencies: {},
  recurrence: {},
  tags: [],
  timeline: [],
  analytics: null,
  searchResults: null,
  notifications: [],
  unreadNotificationCount: 0,
  events: [],
  summary: null,
  loading: {
    list: false,
    detail: false,
    mutating: false,
    timeline: false,
    analytics: false,
    search: false,
    notifications: false,
    events: false,
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

export const fetchTasks = createAsyncThunk<
  TaskPaginationResponse,
  TaskFilters,
  { rejectValue: string }
>(
  'tasks/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
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

export const fetchTaskById = createAsyncThunk<
  Task,
  string,
  { rejectValue: string }
>(
  'tasks/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/${id}`);
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createTask = createAsyncThunk<
  Task,
  CreateTaskInput,
  { rejectValue: string }
>(
  'tasks/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks', data);
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateTask = createAsyncThunk<
  Task,
  { id: string; data: UpdateTaskInput },
  { rejectValue: string }
>(
  'tasks/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/${id}`, data);
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const toggleTaskStatus = createAsyncThunk<
  Task,
  { id: string; status: TaskStatus },
  { rejectValue: string }
>(
  'tasks/toggleStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/${id}/status`, { status });
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteTask = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const moveTask = createAsyncThunk<
  Task,
  { id: string; data: MoveTaskInput },
  { rejectValue: string }
>(
  'tasks/move',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/${id}/move`, data);
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const copyTask = createAsyncThunk<
  Task,
  { id: string; data: CopyTaskInput },
  { rejectValue: string }
>(
  'tasks/copy',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/tasks/${id}/copy`, data);
      return response.data.data as Task;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const bulkUpdateTasks = createAsyncThunk<
  Task[],
  BulkUpdateTasksInput,
  { rejectValue: string }
>(
  'tasks/bulkUpdate',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/bulk/update', data);
      return response.data.data as Task[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const bulkTaskAction = createAsyncThunk<
  { task_ids: string[]; updated: number },
  BulkTaskActionInput,
  { rejectValue: string }
>(
  'tasks/bulkAction',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/bulk/action', data);
      return response.data.data as { task_ids: string[]; updated: number };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTaskSummary = createAsyncThunk<
  TaskSummary,
  void,
  { rejectValue: string }
>(
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

export const fetchTaskTimeline = createAsyncThunk<
  TaskTimelineData[],
  TaskTimelineFilters,
  { rejectValue: string }
>(
  'tasks/fetchTimeline',
  async (filters, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
      const response = await axiosClient.get(`/tasks/timeline?${params.toString()}`);
      return response.data.data as TaskTimelineData[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTaskAnalytics = createAsyncThunk<
  TaskAnalytics,
  TaskAnalyticsFilters,
  { rejectValue: string }
>(
  'tasks/fetchAnalytics',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const response = await axiosClient.get(`/tasks/analytics?${params.toString()}`);
      return response.data.data as TaskAnalytics;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - SUBTASKS
============================================================ */

export const createSubtask = createAsyncThunk<
  { taskId: string; subtask: Subtask },
  { taskId: string; data: CreateSubtaskInput },
  { rejectValue: string }
>(
  'tasks/createSubtask',
  async ({ taskId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/tasks/${taskId}/subtasks`, data);
      return { taskId, subtask: response.data.data as Subtask };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateSubtask = createAsyncThunk<
  { taskId: string; subtask: Subtask },
  { taskId: string; subtaskId: string; data: UpdateSubtaskInput },
  { rejectValue: string }
>(
  'tasks/updateSubtask',
  async ({ taskId, subtaskId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, data);
      return { taskId, subtask: response.data.data as Subtask };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteSubtask = createAsyncThunk<
  { taskId: string; subtaskId: string },
  { taskId: string; subtaskId: string },
  { rejectValue: string }
>(
  'tasks/deleteSubtask',
  async ({ taskId, subtaskId }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
      return { taskId, subtaskId };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const bulkUpdateSubtasks = createAsyncThunk<
  Subtask[],
  BulkUpdateSubtasksInput,
  { rejectValue: string }
>(
  'tasks/bulkUpdateSubtasks',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/bulk/subtasks', data);
      return response.data.data as Subtask[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - TASK LISTS
============================================================ */

export const fetchTaskLists = createAsyncThunk<
  TaskList[],
  void,
  { rejectValue: string }
>(
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

export const fetchTaskListById = createAsyncThunk<
  TaskList,
  string,
  { rejectValue: string }
>(
  'tasks/fetchListById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/lists/${id}`);
      return response.data.data as TaskList;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createTaskList = createAsyncThunk<
  TaskList,
  CreateTaskListInput,
  { rejectValue: string }
>(
  'tasks/createList',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/lists', data);
      return response.data.data as TaskList;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateTaskList = createAsyncThunk<
  TaskList,
  { id: string; data: UpdateTaskListInput },
  { rejectValue: string }
>(
  'tasks/updateList',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/lists/${id}`, data);
      return response.data.data as TaskList;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteTaskList = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/deleteList',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/lists/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchListMembers = createAsyncThunk<
  { listId: string; members: TaskListMember[] },
  string,
  { rejectValue: string }
>(
  'tasks/fetchListMembers',
  async (listId, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/lists/${listId}/members`);
      return { listId, members: response.data.data as TaskListMember[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const addMembersToList = createAsyncThunk<
  { listId: string; userIds: string[] },
  { listId: string; data: AddListMembersInput },
  { rejectValue: string }
>(
  'tasks/addMembersToList',
  async ({ listId, data }, { rejectWithValue }) => {
    try {
      await axiosClient.post(`/tasks/lists/${listId}/members`, data);
      return { listId, userIds: data.user_ids };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateListMember = createAsyncThunk<
  { listId: string; userId: string; data: UpdateListMemberInput },
  { listId: string; userId: string; data: UpdateListMemberInput },
  { rejectValue: string }
>(
  'tasks/updateListMember',
  async ({ listId, userId, data }, { rejectWithValue }) => {
    try {
      await axiosClient.put(`/tasks/lists/${listId}/members/${userId}`, data);
      return { listId, userId, data };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const removeMemberFromList = createAsyncThunk<
  { listId: string; userId: string },
  { listId: string; userId: string },
  { rejectValue: string }
>(
  'tasks/removeMemberFromList',
  async ({ listId, userId }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/lists/${listId}/members/${userId}`);
      return { listId, userId };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - COMMENTS
============================================================ */

export const createComment = createAsyncThunk<
  { taskId: string; comment: TaskComment },
  { taskId: string; data: CreateTaskCommentInput },
  { rejectValue: string }
>(
  'tasks/createComment',
  async ({ taskId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/tasks/${taskId}/comments`, data);
      return { taskId, comment: response.data.data as TaskComment };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateComment = createAsyncThunk<
  TaskComment,
  { commentId: string; data: UpdateTaskCommentInput },
  { rejectValue: string }
>(
  'tasks/updateComment',
  async ({ commentId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/comments/${commentId}`, data);
      return response.data.data as TaskComment;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteComment = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/deleteComment',
  async (commentId, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/comments/${commentId}`);
      return commentId;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTaskComments = createAsyncThunk<
  { taskId: string; comments: TaskComment[] },
  string,
  { rejectValue: string }
>(
  'tasks/fetchTaskComments',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/${taskId}/comments`);
      return { taskId, comments: response.data.data as TaskComment[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - REMINDERS
============================================================ */

export const createReminder = createAsyncThunk<
  TaskReminder,
  CreateReminderInput,
  { rejectValue: string }
>(
  'tasks/createReminder',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/reminders', data);
      return response.data.data as TaskReminder;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateReminder = createAsyncThunk<
  TaskReminder,
  { id: string; data: UpdateReminderInput },
  { rejectValue: string }
>(
  'tasks/updateReminder',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/reminders/${id}`, data);
      return response.data.data as TaskReminder;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteReminder = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/deleteReminder',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/reminders/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTaskReminders = createAsyncThunk<
  { taskId: string; reminders: TaskReminder[] },
  string,
  { rejectValue: string }
>(
  'tasks/fetchTaskReminders',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/${taskId}/reminders`);
      return { taskId, reminders: response.data.data as TaskReminder[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - TAGS
============================================================ */

export const fetchTags = createAsyncThunk<
  Tag[],
  void,
  { rejectValue: string }
>(
  'tasks/fetchTags',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/tasks/tags');
      return response.data.data as Tag[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTagById = createAsyncThunk<
  Tag,
  string,
  { rejectValue: string }
>(
  'tasks/fetchTagById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/tags/${id}`);
      return response.data.data as Tag;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createTag = createAsyncThunk<
  Tag,
  CreateTagInput,
  { rejectValue: string }
>(
  'tasks/createTag',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/tags', data);
      return response.data.data as Tag;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateTag = createAsyncThunk<
  Tag,
  { id: string; data: UpdateTagInput },
  { rejectValue: string }
>(
  'tasks/updateTag',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/tags/${id}`, data);
      return response.data.data as Tag;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteTag = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/deleteTag',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/tags/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - DEPENDENCIES
============================================================ */

export const createDependency = createAsyncThunk<
  TaskDependency,
  CreateDependencyInput,
  { rejectValue: string }
>(
  'tasks/createDependency',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/dependencies', data);
      return response.data.data as TaskDependency;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteDependency = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/deleteDependency',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/dependencies/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTaskDependencies = createAsyncThunk<
  { taskId: string; dependencies: TaskDependency[] },
  string,
  { rejectValue: string }
>(
  'tasks/fetchTaskDependencies',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/${taskId}/dependencies`);
      return { taskId, dependencies: response.data.data as TaskDependency[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - RECURRENCE
============================================================ */

export const updateRecurrence = createAsyncThunk<
  TaskRecurrence,
  { taskId: string; data: UpdateRecurrenceInput },
  { rejectValue: string }
>(
  'tasks/updateRecurrence',
  async ({ taskId, data }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/tasks/${taskId}/recurrence`, data);
      return response.data.data as TaskRecurrence;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteRecurrence = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/deleteRecurrence',
  async (taskId, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/${taskId}/recurrence`);
      return taskId;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - ATTACHMENTS
============================================================ */

export const uploadTaskAttachments = createAsyncThunk<
  { taskId: string; attachments: TaskAttachment[] },
  { taskId: string; formData: FormData },
  { rejectValue: string }
>(
  'tasks/uploadAttachments',
  async ({ taskId, formData }, { rejectWithValue }) => {
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

export const deleteTaskAttachment = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/deleteAttachment',
  async (attachmentId, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/attachments/${attachmentId}`);
      return attachmentId;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchTaskAttachments = createAsyncThunk<
  { taskId: string; attachments: TaskAttachment[] },
  string,
  { rejectValue: string }
>(
  'tasks/fetchAttachments',
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/tasks/${taskId}/attachments`);
      return { taskId, attachments: response.data.data as TaskAttachment[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - SEARCH
============================================================ */

export const searchTasks = createAsyncThunk<
  TaskSearchResponse,
  TaskSearchRequest,
  { rejectValue: string }
>(
  'tasks/search',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/search', data);
      return response.data.data as TaskSearchResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - EXPORT / IMPORT
============================================================ */

export const exportTasks = createAsyncThunk<
  unknown,
  TaskExportOptions,
  { rejectValue: string }
>(
  'tasks/export',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/export', data);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const importTasks = createAsyncThunk<
  TaskImportResult,
  TaskImportOptions,
  { rejectValue: string }
>(
  'tasks/import',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/tasks/import', data);
      return response.data.data as TaskImportResult;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - NOTIFICATIONS
============================================================ */

export const fetchNotifications = createAsyncThunk<
  TaskNotification[],
  NotificationFilters,
  { rejectValue: string }
>(
  'tasks/fetchNotifications',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
      const response = await axiosClient.get(`/tasks/notifications?${params.toString()}`);
      return response.data.data as TaskNotification[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const markNotificationRead = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/markNotificationRead',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.patch(`/tasks/notifications/${id}/read`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk<
  void,
  string | string[] | undefined,
  { rejectValue: string }
>(
  'tasks/markAllNotificationsRead',
  async (eventType, { rejectWithValue }) => {
    try {
      const data = eventType ? { event_type: eventType } : {};
      await axiosClient.patch('/tasks/notifications/read-all', data);
      return;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteNotification = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'tasks/deleteNotification',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/notifications/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   ASYNC THUNKS - EVENTS
============================================================ */

export const fetchTaskEvents = createAsyncThunk<
  TaskEvent[],
  { task_id?: string; user_id?: string; event_type?: string | string[]; from_date?: string; to_date?: string; limit?: number; offset?: number },
  { rejectValue: string }
>(
  'tasks/fetchEvents',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
      const response = await axiosClient.get(`/tasks/events?${params.toString()}`);
      return response.data.data as TaskEvent[];
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
      const taskToUpdate = state.tasks.find(t => t.id === taskId);
      if (taskToUpdate) {
        taskToUpdate.attachments = attachments;
      }
      if (state.currentTask?.id === taskId) {
        state.currentTask.attachments = attachments;
      }
    },

    // ── Local Comment Updates ─────────────────────────────────────────────
    addCommentLocally(state, action: PayloadAction<{ taskId: string; comment: TaskComment }>) {
      const { taskId, comment } = action.payload;
      if (!state.comments[taskId]) {
        state.comments[taskId] = [];
      }
      state.comments[taskId].push(comment);
    },
    removeCommentLocally(state, action: PayloadAction<{ taskId: string; commentId: string }>) {
      const { taskId, commentId } = action.payload;
      const comments = state.comments[taskId];
      if (comments) {
        state.comments[taskId] = comments.filter(c => c.id !== commentId);
      }
    },
    updateCommentLocally(state, action: PayloadAction<{ taskId: string; comment: TaskComment }>) {
      const { taskId, comment } = action.payload;
      const comments = state.comments[taskId];
      if (comments) {
        const index = comments.findIndex(c => c.id === comment.id);
        if (index !== -1) {
          comments[index] = comment;
        }
      }
    },

    // ── Local Reminder Updates ────────────────────────────────────────────
    addReminderLocally(state, action: PayloadAction<{ taskId: string; reminder: TaskReminder }>) {
      const { taskId, reminder } = action.payload;
      if (!state.reminders[taskId]) {
        state.reminders[taskId] = [];
      }
      state.reminders[taskId].push(reminder);
    },
    removeReminderLocally(state, action: PayloadAction<{ taskId: string; reminderId: string }>) {
      const { taskId, reminderId } = action.payload;
      const reminders = state.reminders[taskId];
      if (reminders) {
        state.reminders[taskId] = reminders.filter(r => r.id !== reminderId);
      }
    },

    // ── Local Tag Updates ──────────────────────────────────────────────────
    addTagLocally(state, action: PayloadAction<Tag>) {
      state.tags.push(action.payload);
    },
    updateTagLocally(state, action: PayloadAction<Tag>) {
      const index = state.tags.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tags[index] = action.payload;
      }
    },
    removeTagLocally(state, action: PayloadAction<string>) {
      state.tags = state.tags.filter(t => t.id !== action.payload);
    },

    // ── Notification Updates ──────────────────────────────────────────────
    addNotificationLocally(state, action: PayloadAction<TaskNotification>) {
      state.notifications.unshift(action.payload);
      if (!action.payload.is_read) {
        state.unreadNotificationCount += 1;
      }
    },
    markNotificationReadLocally(state, action: PayloadAction<string>) {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.is_read) {
        notification.is_read = true;
        notification.read_at = new Date().toISOString();
        state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
      }
    },
    markAllNotificationsReadLocally(state) {
      state.notifications.forEach(n => {
        if (!n.is_read) {
          n.is_read = true;
          n.read_at = new Date().toISOString();
        }
      });
      state.unreadNotificationCount = 0;
    },
    removeNotificationLocally(state, action: PayloadAction<string>) {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.is_read) {
        state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
      }
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },

    // ── Clear Derived Data ──────────────────────────────────────────────────
    clearTimeline(state) { state.timeline = []; },
    clearAnalytics(state) { state.analytics = null; },
    clearSearchResults(state) { state.searchResults = null; },
    clearEvents(state) { state.events = []; },
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
        if (action.payload.comments) {
          state.comments[action.payload.id] = action.payload.comments;
        }
        if (action.payload.reminders) {
          state.reminders[action.payload.id] = action.payload.reminders;
        }
        if (action.payload.dependencies) {
          state.dependencies[action.payload.id] = action.payload.dependencies;
        }
        if (action.payload.recurrence) {
          state.recurrence[action.payload.id] = action.payload.recurrence;
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
        delete state.comments[action.payload];
        delete state.reminders[action.payload];
        delete state.dependencies[action.payload];
        delete state.recurrence[action.payload];
      })
      .addCase(deleteTask.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- MOVE TASK ---------- */
    builder
      .addCase(moveTask.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(moveTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.tasks.findIndex(t => t.id === action.payload.id);
        if (index !== -1) state.tasks[index] = action.payload;
        if (state.currentTask?.id === action.payload.id) state.currentTask = action.payload;
      })
      .addCase(moveTask.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- COPY TASK ---------- */
    builder
      .addCase(copyTask.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(copyTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading.mutating = false;
        state.success = true;
        state.tasks = [action.payload, ...state.tasks];
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(copyTask.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- BULK UPDATE TASKS ---------- */
    builder
      .addCase(bulkUpdateTasks.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(bulkUpdateTasks.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading.mutating = false;
        state.success = true;
        const updatedIds = new Set(action.payload.map(t => t.id));
        state.tasks = state.tasks.map(t => {
          const updated = action.payload.find(u => u.id === t.id);
          return updated || t;
        });
        if (state.currentTask && updatedIds.has(state.currentTask.id)) {
          const updated = action.payload.find(t => t.id === state.currentTask?.id);
          if (updated) state.currentTask = updated;
        }
      })
      .addCase(bulkUpdateTasks.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- BULK TASK ACTION ---------- */
  builder
  .addCase(bulkTaskAction.pending, (state) => { 
    state.loading.mutating = true; 
    state.error = null; 
    state.success = false; 
  })
  .addCase(bulkTaskAction.fulfilled, (state) => {
    state.loading.mutating = false;
    state.success = true;
    // Remove deleted tasks if the action was 'delete'
    // For other actions, we'll let the user refresh or re-fetch
    state.loading.list = true; // Trigger a refresh
  })
  .addCase(bulkTaskAction.rejected, (state, action) => { 
    state.loading.mutating = false; 
    state.error = action.payload as string; 
    state.success = false; 
  });

    /* ---------- FETCH TASK SUMMARY ---------- */
    builder
      .addCase(fetchTaskSummary.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchTaskSummary.fulfilled, (state, action: PayloadAction<TaskSummary>) => {
        state.loading.detail = false;
        state.summary = action.payload;
      })
      .addCase(fetchTaskSummary.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- FETCH TASK TIMELINE ---------- */
    builder
      .addCase(fetchTaskTimeline.pending, (state) => { state.loading.timeline = true; state.error = null; })
      .addCase(fetchTaskTimeline.fulfilled, (state, action: PayloadAction<TaskTimelineData[]>) => {
        state.loading.timeline = false;
        state.timeline = action.payload;
      })
      .addCase(fetchTaskTimeline.rejected, (state, action) => { state.loading.timeline = false; state.error = action.payload as string; });

    /* ---------- FETCH TASK ANALYTICS ---------- */
    builder
      .addCase(fetchTaskAnalytics.pending, (state) => { state.loading.analytics = true; state.error = null; })
      .addCase(fetchTaskAnalytics.fulfilled, (state, action: PayloadAction<TaskAnalytics>) => {
        state.loading.analytics = false;
        state.analytics = action.payload;
      })
      .addCase(fetchTaskAnalytics.rejected, (state, action) => { state.loading.analytics = false; state.error = action.payload as string; });

    /* ---------- CREATE SUBTASK ---------- */
    builder
      .addCase(createSubtask.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(createSubtask.fulfilled, (state, action: PayloadAction<{ taskId: string; subtask: Subtask }>) => {
        state.loading.mutating = false;
        state.success = true;
        const { taskId, subtask } = action.payload;
        if (!state.subtasks[taskId]) state.subtasks[taskId] = [];
        state.subtasks[taskId].push(subtask);

        const taskIndex = state.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          state.tasks[taskIndex].subtask_count = (state.tasks[taskIndex].subtask_count || 0) + 1;
        }
        if (state.currentTask?.id === taskId) {
          state.currentTask.subtask_count = (state.currentTask.subtask_count || 0) + 1;
          state.currentTask.subtasks = [...(state.currentTask.subtasks || []), subtask];
        }
      })
      .addCase(createSubtask.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- UPDATE SUBTASK ---------- */
    builder
      .addCase(updateSubtask.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(updateSubtask.fulfilled, (state, action: PayloadAction<{ taskId: string; subtask: Subtask }>) => {
        state.loading.mutating = false;
        state.success = true;
        const { taskId, subtask } = action.payload;
        const subtasks = state.subtasks[taskId];
        if (subtasks) {
          const index = subtasks.findIndex(s => s.id === subtask.id);
          if (index !== -1) {
            const wasCompleted = subtasks[index].completed;
            subtasks[index] = subtask;

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
            if (state.currentTask?.id === taskId && state.currentTask.subtasks) {
              const idx = state.currentTask.subtasks.findIndex(s => s.id === subtask.id);
              if (idx !== -1) state.currentTask.subtasks[idx] = subtask;
            }
          }
        }
      })
      .addCase(updateSubtask.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- DELETE SUBTASK ---------- */
    builder
      .addCase(deleteSubtask.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteSubtask.fulfilled, (state, action: PayloadAction<{ taskId: string; subtaskId: string }>) => {
        state.loading.mutating = false;
        state.success = true;
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
      })
      .addCase(deleteSubtask.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- BULK UPDATE SUBTASKS ---------- */
    builder
      .addCase(bulkUpdateSubtasks.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(bulkUpdateSubtasks.fulfilled, (state, action: PayloadAction<Subtask[]>) => {
        state.loading.mutating = false;
        state.success = true;
        action.payload.forEach(subtask => {
          const taskId = subtask.task_id;
          const subtasks = state.subtasks[taskId];
          if (subtasks) {
            const index = subtasks.findIndex(s => s.id === subtask.id);
            if (index !== -1) {
              subtasks[index] = subtask;
            }
          }
        });
      })
      .addCase(bulkUpdateSubtasks.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

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
    builder
      .addCase(createTaskList.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(createTaskList.fulfilled, (state, action: PayloadAction<TaskList>) => {
        state.loading.mutating = false;
        state.success = true;
        state.taskLists = [action.payload, ...state.taskLists];
      })
      .addCase(createTaskList.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- UPDATE TASK LIST ---------- */
    builder
      .addCase(updateTaskList.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(updateTaskList.fulfilled, (state, action: PayloadAction<TaskList>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.taskLists.findIndex(list => list.id === action.payload.id);
        if (index !== -1) state.taskLists[index] = action.payload;
        if (state.currentTaskList?.id === action.payload.id) state.currentTaskList = action.payload;
      })
      .addCase(updateTaskList.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- DELETE TASK LIST ---------- */
    builder
      .addCase(deleteTaskList.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteTaskList.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        state.taskLists = state.taskLists.filter(list => list.id !== action.payload);
        if (state.currentTaskList?.id === action.payload) state.currentTaskList = null;
        if (state.selectedListId === action.payload) state.selectedListId = null;
      })
      .addCase(deleteTaskList.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- FETCH LIST MEMBERS ---------- */
    builder
      .addCase(fetchListMembers.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchListMembers.fulfilled, (state, action: PayloadAction<{ listId: string; members: TaskListMember[] }>) => {
        state.loading.detail = false;
        state.taskListMembers = action.payload.members;
      })
      .addCase(fetchListMembers.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- ADD MEMBERS TO LIST ---------- */
    builder
      .addCase(addMembersToList.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(addMembersToList.fulfilled, (state, action: PayloadAction<{ listId: string; userIds: string[] }>) => {
        state.loading.mutating = false;
        state.success = true;
        const list = state.taskLists.find(l => l.id === action.payload.listId);
        if (list) list.member_count += action.payload.userIds.length;
        if (state.currentTaskList?.id === action.payload.listId) {
          state.currentTaskList.member_count += action.payload.userIds.length;
        }
      })
      .addCase(addMembersToList.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- UPDATE LIST MEMBER ---------- */
    builder
      .addCase(updateListMember.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(updateListMember.fulfilled, (state, action: PayloadAction<{ listId: string; userId: string; data: UpdateListMemberInput }>) => {
        state.loading.mutating = false;
        state.success = true;
        const memberIndex = state.taskListMembers.findIndex(
          member => member.user_id === action.payload.userId && member.list_id === action.payload.listId
        );
        if (memberIndex !== -1) {
          state.taskListMembers[memberIndex] = {
            ...state.taskListMembers[memberIndex],
            role: action.payload.data.role,
            permissions: action.payload.data.permissions || [],
          };
        }
      })
      .addCase(updateListMember.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- REMOVE MEMBER FROM LIST ---------- */
    builder
      .addCase(removeMemberFromList.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(removeMemberFromList.fulfilled, (state, action: PayloadAction<{ listId: string; userId: string }>) => {
        state.loading.mutating = false;
        state.success = true;
        state.taskListMembers = state.taskListMembers.filter(
          member => member.user_id !== action.payload.userId
        );
        const list = state.taskLists.find(l => l.id === action.payload.listId);
        if (list) list.member_count = Math.max(0, list.member_count - 1);
        if (state.currentTaskList?.id === action.payload.listId) {
          state.currentTaskList.member_count = Math.max(0, state.currentTaskList.member_count - 1);
        }
      })
      .addCase(removeMemberFromList.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- COMMENTS ---------- */
    builder
      .addCase(createComment.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(createComment.fulfilled, (state, action: PayloadAction<{ taskId: string; comment: TaskComment }>) => {
        state.loading.mutating = false;
        state.success = true;
        const { taskId, comment } = action.payload;
        if (!state.comments[taskId]) state.comments[taskId] = [];
        state.comments[taskId].push(comment);
      })
      .addCase(createComment.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(updateComment.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(updateComment.fulfilled, (state, action: PayloadAction<TaskComment>) => {
        state.loading.mutating = false;
        state.success = true;
        const comments = state.comments[action.payload.task_id];
        if (comments) {
          const index = comments.findIndex(c => c.id === action.payload.id);
          if (index !== -1) comments[index] = action.payload;
        }
      })
      .addCase(updateComment.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(deleteComment.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteComment.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        Object.keys(state.comments).forEach(taskId => {
          state.comments[taskId] = state.comments[taskId].filter(c => c.id !== action.payload);
        });
      })
      .addCase(deleteComment.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(fetchTaskComments.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchTaskComments.fulfilled, (state, action: PayloadAction<{ taskId: string; comments: TaskComment[] }>) => {
        state.loading.detail = false;
        state.comments[action.payload.taskId] = action.payload.comments;
      })
      .addCase(fetchTaskComments.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- REMINDERS ---------- */
    builder
      .addCase(createReminder.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(createReminder.fulfilled, (state, action: PayloadAction<TaskReminder>) => {
        state.loading.mutating = false;
        state.success = true;
        const taskId = action.payload.task_id;
        if (!state.reminders[taskId]) state.reminders[taskId] = [];
        state.reminders[taskId].push(action.payload);
      })
      .addCase(createReminder.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(updateReminder.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(updateReminder.fulfilled, (state, action: PayloadAction<TaskReminder>) => {
        state.loading.mutating = false;
        state.success = true;
        const reminders = state.reminders[action.payload.task_id];
        if (reminders) {
          const index = reminders.findIndex(r => r.id === action.payload.id);
          if (index !== -1) reminders[index] = action.payload;
        }
      })
      .addCase(updateReminder.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(deleteReminder.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteReminder.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        Object.keys(state.reminders).forEach(taskId => {
          state.reminders[taskId] = state.reminders[taskId].filter(r => r.id !== action.payload);
        });
      })
      .addCase(deleteReminder.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(fetchTaskReminders.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchTaskReminders.fulfilled, (state, action: PayloadAction<{ taskId: string; reminders: TaskReminder[] }>) => {
        state.loading.detail = false;
        state.reminders[action.payload.taskId] = action.payload.reminders;
      })
      .addCase(fetchTaskReminders.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- TAGS ---------- */
    builder
      .addCase(fetchTags.pending, (state) => { state.loading.list = true; state.error = null; })
      .addCase(fetchTags.fulfilled, (state, action: PayloadAction<Tag[]>) => {
        state.loading.list = false;
        state.tags = action.payload;
      })
      .addCase(fetchTags.rejected, (state, action) => { state.loading.list = false; state.error = action.payload as string; })
      .addCase(createTag.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(createTag.fulfilled, (state, action: PayloadAction<Tag>) => {
        state.loading.mutating = false;
        state.success = true;
        state.tags.push(action.payload);
      })
      .addCase(createTag.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(updateTag.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(updateTag.fulfilled, (state, action: PayloadAction<Tag>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.tags.findIndex(t => t.id === action.payload.id);
        if (index !== -1) state.tags[index] = action.payload;
      })
      .addCase(updateTag.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(deleteTag.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteTag.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        state.tags = state.tags.filter(t => t.id !== action.payload);
      })
      .addCase(deleteTag.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- DEPENDENCIES ---------- */
    builder
      .addCase(createDependency.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(createDependency.fulfilled, (state, action: PayloadAction<TaskDependency>) => {
        state.loading.mutating = false;
        state.success = true;
        const taskId = action.payload.parent_task_id;
        if (!state.dependencies[taskId]) state.dependencies[taskId] = [];
        state.dependencies[taskId].push(action.payload);
      })
      .addCase(createDependency.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(deleteDependency.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteDependency.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        Object.keys(state.dependencies).forEach(taskId => {
          state.dependencies[taskId] = state.dependencies[taskId].filter(d => d.id !== action.payload);
        });
      })
      .addCase(deleteDependency.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(fetchTaskDependencies.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchTaskDependencies.fulfilled, (state, action: PayloadAction<{ taskId: string; dependencies: TaskDependency[] }>) => {
        state.loading.detail = false;
        state.dependencies[action.payload.taskId] = action.payload.dependencies;
      })
      .addCase(fetchTaskDependencies.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- RECURRENCE ---------- */
    builder
      .addCase(updateRecurrence.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(updateRecurrence.fulfilled, (state, action: PayloadAction<TaskRecurrence>) => {
        state.loading.mutating = false;
        state.success = true;
        state.recurrence[action.payload.task_id] = action.payload;
      })
      .addCase(updateRecurrence.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(deleteRecurrence.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteRecurrence.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        delete state.recurrence[action.payload];
      })
      .addCase(deleteRecurrence.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- ATTACHMENTS ---------- */
    builder
      .addCase(uploadTaskAttachments.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(uploadTaskAttachments.fulfilled, (state, action: PayloadAction<{ taskId: string; attachments: TaskAttachment[] }>) => {
        state.loading.mutating = false;
        state.success = true;
        const { taskId, attachments } = action.payload;
        if (!state.attachments[taskId]) {
          state.attachments[taskId] = [];
        }
        state.attachments[taskId] = [...state.attachments[taskId], ...attachments];
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
          task.attachments = [...(task.attachments || []), ...attachments];
        }
        if (state.currentTask?.id === taskId) {
          state.currentTask.attachments = [...(state.currentTask.attachments || []), ...attachments];
        }
      })
      .addCase(uploadTaskAttachments.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(deleteTaskAttachment.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteTaskAttachment.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        Object.keys(state.attachments).forEach(taskId => {
          state.attachments[taskId] = state.attachments[taskId].filter(a => a.id !== action.payload);
        });
        state.tasks.forEach(task => {
          if (task.attachments) {
            task.attachments = task.attachments.filter(a => a.id !== action.payload);
          }
        });
        if (state.currentTask?.attachments) {
          state.currentTask.attachments = state.currentTask.attachments.filter(a => a.id !== action.payload);
        }
      })
      .addCase(deleteTaskAttachment.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(fetchTaskAttachments.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchTaskAttachments.fulfilled, (state, action: PayloadAction<{ taskId: string; attachments: TaskAttachment[] }>) => {
        state.loading.detail = false;
        const { taskId, attachments } = action.payload;
        state.attachments[taskId] = attachments;
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
          task.attachments = attachments;
        }
        if (state.currentTask?.id === taskId) {
          state.currentTask.attachments = attachments;
        }
      })
      .addCase(fetchTaskAttachments.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- SEARCH ---------- */
    builder
      .addCase(searchTasks.pending, (state) => { state.loading.search = true; state.error = null; })
      .addCase(searchTasks.fulfilled, (state, action: PayloadAction<TaskSearchResponse>) => {
        state.loading.search = false;
        state.searchResults = action.payload;
      })
      .addCase(searchTasks.rejected, (state, action) => { state.loading.search = false; state.error = action.payload as string; });

    /* ---------- EXPORT / IMPORT ---------- */
    builder
      .addCase(exportTasks.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(exportTasks.fulfilled, (state) => {
        state.loading.mutating = false;
        state.success = true;
      })
      .addCase(exportTasks.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(importTasks.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(importTasks.fulfilled, (state) => {
        state.loading.mutating = false;
        state.success = true;
        // Trigger a refresh of tasks
        state.loading.list = true;
      })
      .addCase(importTasks.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- NOTIFICATIONS ---------- */
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading.notifications = true; state.error = null; })
      .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<TaskNotification[]>) => {
        state.loading.notifications = false;
        state.notifications = action.payload;
        state.unreadNotificationCount = action.payload.filter(n => !n.is_read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => { state.loading.notifications = false; state.error = action.payload as string; })
      .addCase(markNotificationRead.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(markNotificationRead.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.is_read) {
          notification.is_read = true;
          notification.read_at = new Date().toISOString();
          state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
        }
      })
      .addCase(markNotificationRead.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(markAllNotificationsRead.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.loading.mutating = false;
        state.success = true;
        state.notifications.forEach(n => {
          if (!n.is_read) {
            n.is_read = true;
            n.read_at = new Date().toISOString();
          }
        });
        state.unreadNotificationCount = 0;
      })
      .addCase(markAllNotificationsRead.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; })
      .addCase(deleteNotification.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteNotification.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.is_read) {
          state.unreadNotificationCount = Math.max(0, state.unreadNotificationCount - 1);
        }
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
      })
      .addCase(deleteNotification.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- EVENTS ---------- */
    builder
      .addCase(fetchTaskEvents.pending, (state) => { state.loading.events = true; state.error = null; })
      .addCase(fetchTaskEvents.fulfilled, (state, action: PayloadAction<TaskEvent[]>) => {
        state.loading.events = false;
        state.events = action.payload;
      })
      .addCase(fetchTaskEvents.rejected, (state, action) => { state.loading.events = false; state.error = action.payload as string; });
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
  addCommentLocally,
  removeCommentLocally,
  updateCommentLocally,
  addReminderLocally,
  removeReminderLocally,
  addTagLocally,
  updateTagLocally,
  removeTagLocally,
  addNotificationLocally,
  markNotificationReadLocally,
  markAllNotificationsReadLocally,
  removeNotificationLocally,
  clearTimeline,
  clearAnalytics,
  clearSearchResults,
  clearEvents,
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
export const selectComments = (state: { tasks: TasksState }) => state.tasks.comments;
export const selectReminders = (state: { tasks: TasksState }) => state.tasks.reminders;
export const selectDependencies = (state: { tasks: TasksState }) => state.tasks.dependencies;
export const selectRecurrence = (state: { tasks: TasksState }) => state.tasks.recurrence;
export const selectTags = (state: { tasks: TasksState }) => state.tasks.tags;
export const selectTimeline = (state: { tasks: TasksState }) => state.tasks.timeline;
export const selectAnalytics = (state: { tasks: TasksState }) => state.tasks.analytics;
export const selectSearchResults = (state: { tasks: TasksState }) => state.tasks.searchResults;
export const selectNotifications = (state: { tasks: TasksState }) => state.tasks.notifications;
export const selectUnreadNotificationCount = (state: { tasks: TasksState }) => state.tasks.unreadNotificationCount;
export const selectEvents = (state: { tasks: TasksState }) => state.tasks.events;
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
export const selectTimelineLoading = (state: { tasks: TasksState }) => state.tasks.loading.timeline;
export const selectAnalyticsLoading = (state: { tasks: TasksState }) => state.tasks.loading.analytics;
export const selectSearchLoading = (state: { tasks: TasksState }) => state.tasks.loading.search;
export const selectNotificationsLoading = (state: { tasks: TasksState }) => state.tasks.loading.notifications;
export const selectEventsLoading = (state: { tasks: TasksState }) => state.tasks.loading.events;

// ── Derived Selectors ──────────────────────────────────────────────────────

export const selectTaskById = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.tasks.find(task => task.id === taskId);

export const selectSubtasksByTaskId = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.subtasks[taskId] || [];

export const selectAttachmentsByTaskId = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.attachments[taskId] || [];

export const selectCommentsByTaskId = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.comments[taskId] || [];

export const selectRemindersByTaskId = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.reminders[taskId] || [];

export const selectDependenciesByTaskId = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.dependencies[taskId] || [];

export const selectRecurrenceByTaskId = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.recurrence[taskId] || null;

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
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    result = result.filter(task => statuses.includes(task.status));
  }
  if (filters.day) {
    const days = Array.isArray(filters.day) ? filters.day : [filters.day];
    result = result.filter(task => days.includes(task.day));
  }
  if (filters.in_my_day !== undefined) {
    result = result.filter(task => task.in_my_day === filters.in_my_day);
  }
  if (filters.assigned_to) {
    const assignees = Array.isArray(filters.assigned_to) ? filters.assigned_to : [filters.assigned_to];
    result = result.filter(task => task.assigned_to && assignees.includes(task.assigned_to));
  }
  if (filters.tags && filters.tags.length > 0) {
    const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    result = result.filter(task =>
      task.tags.some(tag => tags.includes(tag))
    );
  }
  if (filters.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    result = result.filter(task => priorities.includes(task.priority));
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(task =>
      task.title.toLowerCase().includes(search) ||
      (task.notes && task.notes.toLowerCase().includes(search)) ||
      (task.description && task.description.toLowerCase().includes(search))
    );
  }

  return result;
};

export default tasksSlice.reducer;