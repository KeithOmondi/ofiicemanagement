// src/store/slices/tasksSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  Project,
  Task,
  Subtask,
  TaskNote,
  Reminder,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubtaskInput,
  UpdateSubtaskInput,
  CreateTaskNoteInput,
  CreateReminderInput,
  TaskFilters,
  TaskSearchResult,
  TaskDashboardStats,
  UserTaskStats,
  TaskExportOptions,
  ProjectStatus,
  Priority,
  TaskStatus,
  TaskType,
  TaskVisibility,
  ReminderRepeat,
  TaskActivity,
  TaskTimeEntry,
  TaskTemplate,
  CreateTaskTemplateInput,
  ProjectAttachment,
  TaskAttachment,
  TaskExportResult,
  TaskDependency,
  TaskTimeSummary,
  Member,
} from '../../types/tasks.types';
import axiosClient from '../../api/api';
import axios from 'axios';

// ─── State type ──────────────────────────────────────────────
interface TasksState {
  projects: Project[];
  standaloneTasks: Task[];
  selectedTask: Task | null;
  selectedTaskDetails: {
    subtasks: Subtask[];
    notes: TaskNote[];
    reminders: Reminder[];
    activities: TaskActivity[];
    timeEntries: TaskTimeEntry[];
    timeSummary: TaskTimeSummary | null;
    dependencies: TaskDependency[];
  } | null;
  templates: TaskTemplate[];
  dashboardStats: TaskDashboardStats | null;
  userStats: UserTaskStats | null;
  members: Member[];
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  exportResult: TaskExportResult | null;
  searchResults: TaskSearchResult | null;
}

const initialState: TasksState = {
  projects: [],
  standaloneTasks: [],
  selectedTask: null,
  selectedTaskDetails: null,
  templates: [],
  dashboardStats: null,
  userStats: null,
  members: [],
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  exportResult: null,
  searchResults: null,
};

// ─── Helper to parse date ────────────────────────────────────
const parseDate = (value: string | Date | null | undefined): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
};

// ─── Helper to extract error message ───────────────────────
const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    if (responseData) {
      if (typeof responseData === 'string') {
        return responseData;
      }
      if (typeof responseData === 'object' && responseData !== null) {
        if ('message' in responseData && typeof responseData.message === 'string') {
          return responseData.message;
        }
        if ('error' in responseData && typeof responseData.error === 'string') {
          return responseData.error;
        }
        if ('detail' in responseData && typeof responseData.detail === 'string') {
          return responseData.detail;
        }
        if ('errors' in responseData) {
          const errors = responseData.errors;
          if (Array.isArray(errors)) {
            return errors.map((e: unknown) => typeof e === 'string' ? e : JSON.stringify(e)).join(', ');
          }
          if (typeof errors === 'object' && errors !== null) {
            return JSON.stringify(errors);
          }
        }
        try {
          return JSON.stringify(responseData);
        } catch {
          return 'Unknown server error';
        }
      }
    }
    return error.message || `Request failed with status ${status || 'unknown'}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
};

// ─── Type guards for raw data ──────────────────────────────
interface RawProjectAttachment {
  id: string;
  project_id?: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: string | Date;
}

interface RawTaskAttachment {
  id: string;
  task_id?: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: string | Date;
}

interface RawTask {
  id?: string;
  _id?: string;
  project_id?: string | null;
  projectId?: string | null;
  title?: string;
  name?: string;
  label?: string;
  description?: string | null;
  desc?: string;
  notes?: string;
  assignee?: string | null;
  assigned_to?: string;
  assignedTo?: string;
  priority?: string;
  deadline?: string;
  due_date?: string;
  dueDate?: string;
  status?: string;
  progress?: number;
  completion?: number;
  start_date?: string | null;
  startDate?: string | null;
  type?: string;
  visibility?: string;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  completed_at?: string | null;
  started_at?: string | null;
  blocked_by?: string[];
  blocking?: string[];
  tags?: string[];
  attachments?: RawTaskAttachment[];
  watchers?: string[];
  parent_task_id?: string | null;
  child_task_ids?: string[];
  priority_score?: number;
  created_by?: string;
  created_by_name?: string;
  assigned_by?: string | null;
  assigned_by_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  created_at?: string | Date;
  createdAt?: string | Date;
  updated_at?: string | Date;
  updatedAt?: string | Date;
}

interface RawProject {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  description?: string | null;
  desc?: string;
  deadline?: string;
  due_date?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  members?: string[];
  tasks?: RawTask[];
  collapsed?: boolean;
  owner_id?: string;
  owner_name?: string;
  department_id?: string;
  department_name?: string;
  tags?: string[];
  attachments?: RawProjectAttachment[];
  progress?: number;
  start_date?: string | null;
  completed_at?: string | null;
  archived_at?: string | null;
  created_by?: string;
  created_by_name?: string;
  created_at?: string | Date;
  createdAt?: string | Date;
  updated_at?: string | Date;
  updatedAt?: string | Date;
}

interface RawMember {
  id?: string;
  _id?: string;
  name?: string;
  full_name?: string;
  email?: string;
  role?: string;
  color?: string;
  avatar_url?: string;
  department?: string;
  is_active?: boolean;
  joined_at?: string | Date;
}

// ─── Normalization functions ──────────────────────────────
const normalizeTask = (task: RawTask): Task => {
  const normalizedAttachments: TaskAttachment[] = (task.attachments || []).map(att => ({
    id: att.id,
    task_id: att.task_id || task.id || '',
    file_name: att.file_name,
    file_url: att.file_url,
    file_size: att.file_size,
    mime_type: att.mime_type,
    uploaded_by: att.uploaded_by,
    uploaded_by_name: att.uploaded_by_name,
    uploaded_at: parseDate(att.uploaded_at),
  }));

  return {
    id: task.id || task._id || '',
    project_id: task.project_id || task.projectId || null,
    title: task.title || task.name || task.label || task.id || 'Untitled Task',
    description: task.description || task.desc || task.notes || null,
    assignee: task.assignee || task.assigned_to || task.assignedTo || null,
    priority: (task.priority as Priority) || 'normal',
    deadline: task.deadline || task.due_date || task.dueDate || new Date().toISOString(),
    status: (task.status as TaskStatus) || 'todo',
    progress: task.progress ?? task.completion ?? 0,
    start_date: task.start_date || task.startDate || null,
    type: (task.type as TaskType) || 'task',
    visibility: (task.visibility as TaskVisibility) || 'team',
    estimated_hours: task.estimated_hours ?? null,
    actual_hours: task.actual_hours ?? null,
    due_date: task.deadline || task.due_date || task.dueDate || new Date().toISOString(),
    completed_at: task.completed_at || null,
    started_at: task.started_at || null,
    blocked_by: task.blocked_by || [],
    blocking: task.blocking || [],
    tags: task.tags || [],
    attachments: normalizedAttachments,
    watchers: task.watchers || [],
    parent_task_id: task.parent_task_id || null,
    child_task_ids: task.child_task_ids || [],
    priority_score: task.priority_score,
    created_by: task.created_by || '',
    created_by_name: task.created_by_name || '',
    assigned_by: task.assigned_by || null,
    assigned_by_name: task.assigned_by_name || null,
    updated_by: task.updated_by || null,
    updated_by_name: task.updated_by_name || null,
    created_at: parseDate(task.created_at || task.createdAt),
    updated_at: parseDate(task.updated_at || task.updatedAt),
  };
};

const normalizeProject = (project: RawProject): Project => {
  const normalizedAttachments: ProjectAttachment[] = (project.attachments || []).map(att => ({
    id: att.id,
    project_id: att.project_id || project.id || '',
    file_name: att.file_name,
    file_url: att.file_url,
    file_size: att.file_size,
    mime_type: att.mime_type,
    uploaded_by: att.uploaded_by,
    uploaded_by_name: att.uploaded_by_name,
    uploaded_at: parseDate(att.uploaded_at),
  }));

  return {
    id: project.id || project._id || '',
    title: project.title || project.name || 'Untitled Project',
    description: project.description || project.desc || null,
    deadline: project.deadline || project.due_date || project.dueDate || new Date().toISOString(),
    priority: (project.priority as Priority) || 'normal',
    status: (project.status as ProjectStatus) || 'active',
    members: project.members || [],
    tasks: Array.isArray(project.tasks) ? project.tasks.map(normalizeTask) : [],
    collapsed: project.collapsed || false,
    owner_id: project.owner_id || '',
    owner_name: project.owner_name || '',
    department_id: project.department_id,
    department_name: project.department_name,
    tags: project.tags || [],
    attachments: normalizedAttachments,
    progress: project.progress ?? 0,
    start_date: project.start_date || null,
    completed_at: project.completed_at || null,
    archived_at: project.archived_at || null,
    created_by: project.created_by || '',
    created_by_name: project.created_by_name || '',
    created_at: parseDate(project.created_at || project.createdAt),
    updated_at: parseDate(project.updated_at || project.updatedAt),
  };
};

const normalizeMember = (member: RawMember): Member => {
  return {
    id: member.id || member._id || '',
    name: member.name || member.full_name || '',
    email: member.email || '',
    role: member.role || 'member',
    color: member.color || '#000000',
    avatar_url: member.avatar_url,
    department: member.department,
    is_active: member.is_active ?? true,
    joined_at: parseDate(member.joined_at),
  };
};

// ─── API Response type ──────────────────────────────────────
interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

// ─── Thunks ──────────────────────────────────────────────────

// ── Members ──
export const fetchMembers = createAsyncThunk(
  'tasks/fetchMembers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<Member[]>>('/tasks/members');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Projects ──
export const fetchProjects = createAsyncThunk(
  'tasks/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<RawProject[]>>('/tasks/projects');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const createProject = createAsyncThunk(
  'tasks/createProject',
  async (data: CreateProjectInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<RawProject>>('/tasks/projects', data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateProject = createAsyncThunk(
  'tasks/updateProject',
  async ({ id, data }: { id: string; data: UpdateProjectInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put<ApiResponse<RawProject>>(`/tasks/projects/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteProject = createAsyncThunk(
  'tasks/deleteProject',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/projects/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const getProject = createAsyncThunk(
  'tasks/getProject',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<RawProject>>(`/tasks/projects/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Tasks ──
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (filters: TaskFilters = {}, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<TaskSearchResult>>('/tasks/tasks', { 
        params: filters 
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (data: CreateTaskInput, { rejectWithValue }) => {
    try {
      const payload = {
        ...data,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : new Date().toISOString(),
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
      };
      const response = await axiosClient.post<ApiResponse<RawTask>>('/tasks/tasks', payload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, data }: { id: string; data: UpdateTaskInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put<ApiResponse<RawTask>>(`/tasks/tasks/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/tasks/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const fetchFullTask = createAsyncThunk(
  'tasks/fetchFullTask',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<{
        task: RawTask;
        subtasks: Subtask[];
        notes: TaskNote[];
        reminders: Reminder[];
        activities: TaskActivity[];
        timeEntries: TaskTimeEntry[];
        timeSummary: TaskTimeSummary;
        dependencies: TaskDependency[];
      }>>(`/tasks/tasks/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Subtasks ──
export const createSubtask = createAsyncThunk(
  'tasks/createSubtask',
  async (data: CreateSubtaskInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<Subtask>>('/tasks/subtasks', data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const listSubtasks = createAsyncThunk(
  'tasks/listSubtasks',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<Subtask[]>>(`/tasks/subtasks/task/${taskId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateSubtask = createAsyncThunk(
  'tasks/updateSubtask',
  async ({ id, data }: { id: string; data: UpdateSubtaskInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put<ApiResponse<Subtask>>(`/tasks/subtasks/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteSubtask = createAsyncThunk(
  'tasks/deleteSubtask',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/subtasks/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Task Notes ──
export const createTaskNote = createAsyncThunk(
  'tasks/createTaskNote',
  async (data: CreateTaskNoteInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<TaskNote>>('/tasks/task-notes', data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const listTaskNotes = createAsyncThunk(
  'tasks/listTaskNotes',
  async ({ taskId, includeInternal }: { taskId: string; includeInternal?: boolean }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<TaskNote[]>>(`/tasks/task-notes/task/${taskId}`, {
        params: { includeInternal }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateTaskNote = createAsyncThunk(
  'tasks/updateTaskNote',
  async ({ id, data }: { id: string; data: { content?: string; is_internal?: boolean } }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put<ApiResponse<TaskNote>>(`/tasks/task-notes/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteTaskNote = createAsyncThunk(
  'tasks/deleteTaskNote',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/task-notes/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Reminders ──
export const createReminder = createAsyncThunk(
  'tasks/createReminder',
  async (data: CreateReminderInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<Reminder>>('/tasks/reminders', data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const listReminders = createAsyncThunk(
  'tasks/listReminders',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<Reminder[]>>(`/tasks/reminders/task/${taskId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateReminder = createAsyncThunk(
  'tasks/updateReminder',
  async ({ id, data }: { id: string; data: { remind_at?: string; repeat?: ReminderRepeat; message?: string | null } }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put<ApiResponse<Reminder>>(`/tasks/reminders/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteReminder = createAsyncThunk(
  'tasks/deleteReminder',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/reminders/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Task Activities ──
export const fetchTaskActivities = createAsyncThunk(
  'tasks/fetchTaskActivities',
  async ({ taskId, page = 1, limit = 20 }: { taskId: string; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<{
        activities: TaskActivity[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>>(`/tasks/tasks/${taskId}/activities`, {
        params: { page, limit }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Task Dependencies ──
export const fetchTaskDependencies = createAsyncThunk(
  'tasks/fetchTaskDependencies',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<TaskDependency[]>>(`/tasks/tasks/${taskId}/dependencies`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const createTaskDependency = createAsyncThunk(
  'tasks/createTaskDependency',
  async ({ taskId, dependsOn, dependencyType }: { taskId: string; dependsOn: string; dependencyType: 'blocks' | 'blocked_by' | 'relates_to' }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<TaskDependency>>(`/tasks/tasks/${taskId}/dependencies`, {
        depends_on: dependsOn,
        dependency_type: dependencyType
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteTaskDependency = createAsyncThunk(
  'tasks/deleteTaskDependency',
  async ({ taskId, dependsOn }: { taskId: string; dependsOn: string }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/tasks/${taskId}/dependencies/${dependsOn}`);
      return { taskId, dependsOn };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Task Time Tracking ──
export const startTimeEntry = createAsyncThunk(
  'tasks/startTimeEntry',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<TaskTimeEntry>>(`/tasks/time-entries/${taskId}/start`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const stopTimeEntry = createAsyncThunk(
  'tasks/stopTimeEntry',
  async (entryId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<TaskTimeEntry>>(`/tasks/time-entries/${entryId}/stop`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const fetchTimeEntries = createAsyncThunk(
  'tasks/fetchTimeEntries',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<TaskTimeEntry[]>>(`/tasks/time-entries/task/${taskId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const fetchTimeSummary = createAsyncThunk(
  'tasks/fetchTimeSummary',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<TaskTimeSummary>>(`/tasks/time-entries/task/${taskId}/summary`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteTimeEntry = createAsyncThunk(
  'tasks/deleteTimeEntry',
  async (entryId: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/time-entries/${entryId}`);
      return entryId;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Task Templates ──
export const createTemplate = createAsyncThunk(
  'tasks/createTemplate',
  async (data: CreateTaskTemplateInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<TaskTemplate>>('/tasks/templates', data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const fetchTemplates = createAsyncThunk(
  'tasks/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<TaskTemplate[]>>('/tasks/templates');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const getTemplate = createAsyncThunk(
  'tasks/getTemplate',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<TaskTemplate>>(`/tasks/templates/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateTemplate = createAsyncThunk(
  'tasks/updateTemplate',
  async ({ id, data }: { id: string; data: Partial<CreateTaskTemplateInput> }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put<ApiResponse<TaskTemplate>>(`/tasks/templates/${id}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  'tasks/deleteTemplate',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/templates/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const applyTemplate = createAsyncThunk(
  'tasks/applyTemplate',
  async ({ templateId, projectId }: { templateId: string; projectId?: string | null }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<ApiResponse<RawTask>>(`/tasks/templates/${templateId}/apply`, { 
        project_id: projectId 
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Dashboard / Stats ──
export const fetchDashboardStats = createAsyncThunk(
  'tasks/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<TaskDashboardStats>>('/tasks/dashboard/stats');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const fetchUserStats = createAsyncThunk(
  'tasks/fetchUserStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<UserTaskStats>>('/tasks/dashboard/user-stats');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Task Export ──
export const exportTasks = createAsyncThunk(
  'tasks/exportTasks',
  async (options: TaskExportOptions, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<ApiResponse<TaskExportResult>>('/tasks/export', { 
        params: options 
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ─── Slice ──────────────────────────────────────────────────
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<TaskFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      };
    },
    clearSelectedTask: (state) => {
      state.selectedTask = null;
      state.selectedTaskDetails = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    toggleTaskDone: (state, action: PayloadAction<{ taskId: string; projectId: string | null }>) => {
      const { taskId, projectId } = action.payload;
      const findAndToggle = (tasks: Task[]) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.status = task.status === 'done' ? 'todo' : 'done';
          task.progress = task.status === 'done' ? 100 : 0;
          return true;
        }
        return false;
      };
      
      if (projectId) {
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
          findAndToggle(project.tasks);
        }
      } else {
        findAndToggle(state.standaloneTasks);
      }
      
      if (state.selectedTask?.id === taskId) {
        state.selectedTask.status = state.selectedTask.status === 'done' ? 'todo' : 'done';
        state.selectedTask.progress = state.selectedTask.status === 'done' ? 100 : 0;
      }
    },
    setTaskDetails: (state, action: PayloadAction<{
      subtasks?: Subtask[];
      notes?: TaskNote[];
      reminders?: Reminder[];
      activities?: TaskActivity[];
      timeEntries?: TaskTimeEntry[];
      timeSummary?: TaskTimeSummary;
      dependencies?: TaskDependency[];
    }>) => {
      if (state.selectedTaskDetails) {
        if (action.payload.subtasks) {
          state.selectedTaskDetails.subtasks = action.payload.subtasks;
        }
        if (action.payload.notes) {
          state.selectedTaskDetails.notes = action.payload.notes;
        }
        if (action.payload.reminders) {
          state.selectedTaskDetails.reminders = action.payload.reminders;
        }
        if (action.payload.activities) {
          state.selectedTaskDetails.activities = action.payload.activities;
        }
        if (action.payload.timeEntries) {
          state.selectedTaskDetails.timeEntries = action.payload.timeEntries;
        }
        if (action.payload.timeSummary) {
          state.selectedTaskDetails.timeSummary = action.payload.timeSummary;
        }
        if (action.payload.dependencies) {
          state.selectedTaskDetails.dependencies = action.payload.dependencies;
        }
      }
    },
    addSubtaskLocally: (state, action: PayloadAction<Subtask>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.subtasks.push(action.payload);
      }
    },
    updateSubtaskLocally: (state, action: PayloadAction<Subtask>) => {
      if (state.selectedTaskDetails) {
        const idx = state.selectedTaskDetails.subtasks.findIndex(s => s.id === action.payload.id);
        if (idx !== -1) {
          state.selectedTaskDetails.subtasks[idx] = action.payload;
        }
      }
    },
    removeSubtaskLocally: (state, action: PayloadAction<string>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.subtasks = state.selectedTaskDetails.subtasks.filter(
          s => s.id !== action.payload
        );
      }
    },
    addNoteLocally: (state, action: PayloadAction<TaskNote>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.notes.push(action.payload);
      }
    },
    updateNoteLocally: (state, action: PayloadAction<TaskNote>) => {
      if (state.selectedTaskDetails) {
        const idx = state.selectedTaskDetails.notes.findIndex(n => n.id === action.payload.id);
        if (idx !== -1) {
          state.selectedTaskDetails.notes[idx] = action.payload;
        }
      }
    },
    removeNoteLocally: (state, action: PayloadAction<string>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.notes = state.selectedTaskDetails.notes.filter(
          n => n.id !== action.payload
        );
      }
    },
    addReminderLocally: (state, action: PayloadAction<Reminder>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.reminders.push(action.payload);
      }
    },
    updateReminderLocally: (state, action: PayloadAction<Reminder>) => {
      if (state.selectedTaskDetails) {
        const idx = state.selectedTaskDetails.reminders.findIndex(r => r.id === action.payload.id);
        if (idx !== -1) {
          state.selectedTaskDetails.reminders[idx] = action.payload;
        }
      }
    },
    removeReminderLocally: (state, action: PayloadAction<string>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.reminders = state.selectedTaskDetails.reminders.filter(
          r => r.id !== action.payload
        );
      }
    },
    addTimeEntryLocally: (state, action: PayloadAction<TaskTimeEntry>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.timeEntries.push(action.payload);
      }
    },
    updateTimeEntryLocally: (state, action: PayloadAction<TaskTimeEntry>) => {
      if (state.selectedTaskDetails) {
        const idx = state.selectedTaskDetails.timeEntries.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) {
          state.selectedTaskDetails.timeEntries[idx] = action.payload;
        }
      }
    },
    removeTimeEntryLocally: (state, action: PayloadAction<string>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.timeEntries = state.selectedTaskDetails.timeEntries.filter(
          e => e.id !== action.payload
        );
      }
    },
    addDependencyLocally: (state, action: PayloadAction<TaskDependency>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.dependencies.push(action.payload);
      }
    },
    removeDependencyLocally: (state, action: PayloadAction<{ taskId: string; dependsOn: string }>) => {
      if (state.selectedTaskDetails) {
        state.selectedTaskDetails.dependencies = state.selectedTaskDetails.dependencies.filter(
          d => !(d.task_id === action.payload.taskId && d.depends_on === action.payload.dependsOn)
        );
      }
    },
    clearSearchResults: (state) => {
      state.searchResults = null;
    },
    clearExportResult: (state) => {
      state.exportResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Members ──
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.members = action.payload.map(normalizeMember);
      })

      // ── Projects ──
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        const projects = Array.isArray(action.payload) ? action.payload : [];
        state.projects = projects.map((project: RawProject) => normalizeProject(project));
        state.standaloneTasks = state.projects.flatMap((p: Project) =>
          p.tasks.filter((t: Task) => t.project_id === null)
        );
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getProject.fulfilled, (state, action) => {
        const project = normalizeProject(action.payload);
        const index = state.projects.findIndex(p => p.id === project.id);
        if (index !== -1) {
          state.projects[index] = project;
        } else {
          state.projects.push(project);
        }
      })
      .addCase(createProject.fulfilled, (state, action) => {
        const project = normalizeProject(action.payload);
        state.projects.push(project);
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const project = normalizeProject(action.payload);
        const index = state.projects.findIndex(p => p.id === project.id);
        if (index !== -1) {
          state.projects[index] = project;
        }
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p.id !== action.payload);
      })
      
      // ── Tasks ──
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        const result = action.payload;
        
        state.searchResults = result;
        state.pagination = {
          page: result.page || 1,
          limit: result.limit || 20,
          total: result.total || 0,
          totalPages: result.totalPages || 0,
        };
        
        const tasks = result.tasks || [];
        const mappedTasks = tasks.map((task: RawTask) => normalizeTask(task));
        
        const projectTasks = mappedTasks.filter((t: Task) => t.project_id !== null);
        const standalone = mappedTasks.filter((t: Task) => t.project_id === null);
        state.standaloneTasks = standalone;
        
        projectTasks.forEach((task: Task) => {
          const project = state.projects.find(p => p.id === task.project_id);
          if (project) {
            const existing = project.tasks.find(t => t.id === task.id);
            if (existing) {
              Object.assign(existing, task);
            } else {
              project.tasks.push(task);
            }
          }
        });
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        const task = normalizeTask(action.payload);
        if (task.project_id) {
          const project = state.projects.find(p => p.id === task.project_id);
          if (project) {
            project.tasks.push(task);
          }
        } else {
          state.standaloneTasks.push(task);
        }
        // Add to search results if they exist
        if (state.searchResults) {
          state.searchResults.tasks.push(task);
          state.searchResults.total += 1;
        }
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const task = normalizeTask(action.payload);
        
        // Update in projects
        state.projects.forEach(p => {
          const idx = p.tasks.findIndex(t => t.id === task.id);
          if (idx !== -1) p.tasks[idx] = task;
        });
        
        // Update in standalone tasks
        const idx = state.standaloneTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) state.standaloneTasks[idx] = task;
        
        // Update in search results
        if (state.searchResults) {
          const searchIdx = state.searchResults.tasks.findIndex(t => t.id === task.id);
          if (searchIdx !== -1) {
            state.searchResults.tasks[searchIdx] = task;
          }
        }
        
        // Update selected task
        if (state.selectedTask?.id === task.id) {
          state.selectedTask = task;
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        const id = action.payload;
        
        // Remove from projects
        state.projects.forEach(p => {
          p.tasks = p.tasks.filter(t => t.id !== id);
        });
        
        // Remove from standalone tasks
        state.standaloneTasks = state.standaloneTasks.filter(t => t.id !== id);
        
        // Remove from search results
        if (state.searchResults) {
          state.searchResults.tasks = state.searchResults.tasks.filter(t => t.id !== id);
          state.searchResults.total -= 1;
        }
        
        // Clear selected task if deleted
        if (state.selectedTask?.id === id) {
          state.selectedTask = null;
          state.selectedTaskDetails = null;
        }
      })
      .addCase(fetchFullTask.fulfilled, (state, action) => {
        const data = action.payload;
        state.selectedTask = normalizeTask(data.task);
        state.selectedTaskDetails = { 
          subtasks: data.subtasks || [], 
          notes: data.notes || [], 
          reminders: data.reminders || [],
          activities: data.activities || [],
          timeEntries: data.timeEntries || [],
          timeSummary: data.timeSummary || null,
          dependencies: data.dependencies || [],
        };
      })
      
      // ── Subtasks ──
      .addCase(listSubtasks.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.subtasks = action.payload;
        }
      })
      .addCase(createSubtask.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.subtasks.push(action.payload);
        }
      })
      .addCase(updateSubtask.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          const idx = state.selectedTaskDetails.subtasks.findIndex(s => s.id === action.payload.id);
          if (idx !== -1) state.selectedTaskDetails.subtasks[idx] = action.payload;
        }
      })
      .addCase(deleteSubtask.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.subtasks = state.selectedTaskDetails.subtasks.filter(
            s => s.id !== action.payload
          );
        }
      })
      
      // ── Task Notes ──
      .addCase(listTaskNotes.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.notes = action.payload;
        }
      })
      .addCase(createTaskNote.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.notes.push(action.payload);
        }
      })
      .addCase(updateTaskNote.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          const idx = state.selectedTaskDetails.notes.findIndex(n => n.id === action.payload.id);
          if (idx !== -1) state.selectedTaskDetails.notes[idx] = action.payload;
        }
      })
      .addCase(deleteTaskNote.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.notes = state.selectedTaskDetails.notes.filter(
            n => n.id !== action.payload
          );
        }
      })
      
      // ── Reminders ──
      .addCase(listReminders.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.reminders = action.payload;
        }
      })
      .addCase(createReminder.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.reminders.push(action.payload);
        }
      })
      .addCase(updateReminder.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          const idx = state.selectedTaskDetails.reminders.findIndex(r => r.id === action.payload.id);
          if (idx !== -1) state.selectedTaskDetails.reminders[idx] = action.payload;
        }
      })
      .addCase(deleteReminder.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.reminders = state.selectedTaskDetails.reminders.filter(
            r => r.id !== action.payload
          );
        }
      })
      
      // ── Task Activities ──
      .addCase(fetchTaskActivities.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.activities = action.payload.activities || [];
        }
      })
      
      // ── Task Dependencies ──
      .addCase(fetchTaskDependencies.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.dependencies = action.payload;
        }
      })
      .addCase(createTaskDependency.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.dependencies.push(action.payload);
        }
      })
      .addCase(deleteTaskDependency.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.dependencies = state.selectedTaskDetails.dependencies.filter(
            d => !(d.task_id === action.payload.taskId && d.depends_on === action.payload.dependsOn)
          );
        }
      })
      
      // ── Time Entries ──
      .addCase(fetchTimeEntries.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.timeEntries = action.payload;
        }
      })
      .addCase(fetchTimeSummary.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.timeSummary = action.payload;
        }
      })
      .addCase(startTimeEntry.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.timeEntries.push(action.payload);
          // Update time summary if it exists
          if (state.selectedTaskDetails.timeSummary) {
            state.selectedTaskDetails.timeSummary.entries = state.selectedTaskDetails.timeEntries;
            state.selectedTaskDetails.timeSummary.last_entry = action.payload;
          }
        }
      })
      .addCase(stopTimeEntry.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          const idx = state.selectedTaskDetails.timeEntries.findIndex(e => e.id === action.payload.id);
          if (idx !== -1) {
            state.selectedTaskDetails.timeEntries[idx] = action.payload;
            // Update time summary
            if (state.selectedTaskDetails.timeSummary) {
              state.selectedTaskDetails.timeSummary.entries = state.selectedTaskDetails.timeEntries;
              state.selectedTaskDetails.timeSummary.last_entry = action.payload;
              // Recalculate total duration
              state.selectedTaskDetails.timeSummary.total_duration = state.selectedTaskDetails.timeEntries
                .filter(e => e.duration !== null)
                .reduce((sum, e) => sum + (e.duration || 0), 0);
            }
          }
        }
      })
      .addCase(deleteTimeEntry.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.timeEntries = state.selectedTaskDetails.timeEntries.filter(
            e => e.id !== action.payload
          );
          // Update time summary
          if (state.selectedTaskDetails.timeSummary) {
            state.selectedTaskDetails.timeSummary.entries = state.selectedTaskDetails.timeEntries;
            state.selectedTaskDetails.timeSummary.total_duration = state.selectedTaskDetails.timeEntries
              .filter(e => e.duration !== null)
              .reduce((sum, e) => sum + (e.duration || 0), 0);
            state.selectedTaskDetails.timeSummary.last_entry = state.selectedTaskDetails.timeEntries.length > 0 
              ? state.selectedTaskDetails.timeEntries[state.selectedTaskDetails.timeEntries.length - 1] 
              : null;
          }
        }
      })
      
      // ── Templates ──
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.templates = action.payload;
      })
      .addCase(createTemplate.fulfilled, (state, action) => {
        state.templates.push(action.payload);
      })
      .addCase(updateTemplate.fulfilled, (state, action) => {
        const idx = state.templates.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) {
          state.templates[idx] = action.payload;
        }
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        state.templates = state.templates.filter(t => t.id !== action.payload);
      })
      .addCase(applyTemplate.fulfilled, (state, action) => {
        const task = normalizeTask(action.payload);
        if (task.project_id) {
          const project = state.projects.find(p => p.id === task.project_id);
          if (project) {
            project.tasks.push(task);
          }
        } else {
          state.standaloneTasks.push(task);
        }
        if (state.searchResults) {
          state.searchResults.tasks.push(task);
          state.searchResults.total += 1;
        }
      })
      
      // ── Dashboard Stats ──
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.dashboardStats = action.payload;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.userStats = action.payload;
      })
      
      // ── Export ──
      .addCase(exportTasks.fulfilled, (state, action) => {
        state.exportResult = action.payload;
      });
  },
});

// ─── Actions ─────────────────────────────────────────────────
export const { 
  setFilters,
  clearFilters,
  clearSelectedTask,
  clearError,
  toggleTaskDone,
  setTaskDetails,
  addSubtaskLocally,
  updateSubtaskLocally,
  removeSubtaskLocally,
  addNoteLocally,
  updateNoteLocally,
  removeNoteLocally,
  addReminderLocally,
  updateReminderLocally,
  removeReminderLocally,
  addTimeEntryLocally,
  updateTimeEntryLocally,
  removeTimeEntryLocally,
  addDependencyLocally,
  removeDependencyLocally,
  clearSearchResults,
  clearExportResult,
} = tasksSlice.actions;

// ─── Selectors ──────────────────────────────────────────────
export const selectAllProjects = (state: { tasks: TasksState }) => state.tasks.projects;
export const selectStandaloneTasks = (state: { tasks: TasksState }) => state.tasks.standaloneTasks;
export const selectSelectedTask = (state: { tasks: TasksState }) => state.tasks.selectedTask;
export const selectSelectedTaskDetails = (state: { tasks: TasksState }) => state.tasks.selectedTaskDetails;
export const selectTasksLoading = (state: { tasks: TasksState }) => state.tasks.loading;
export const selectTasksError = (state: { tasks: TasksState }) => state.tasks.error;
export const selectFilters = (state: { tasks: TasksState }) => state.tasks.filters;
export const selectPagination = (state: { tasks: TasksState }) => state.tasks.pagination;
export const selectTemplates = (state: { tasks: TasksState }) => state.tasks.templates;
export const selectDashboardStats = (state: { tasks: TasksState }) => state.tasks.dashboardStats;
export const selectUserStats = (state: { tasks: TasksState }) => state.tasks.userStats;
export const selectMembers = (state: { tasks: TasksState }) => state.tasks.members;
export const selectSearchResults = (state: { tasks: TasksState }) => state.tasks.searchResults;
export const selectExportResult = (state: { tasks: TasksState }) => state.tasks.exportResult;
export const selectSelectedTaskSubtasks = (state: { tasks: TasksState }) => 
  state.tasks.selectedTaskDetails?.subtasks || [];
export const selectSelectedTaskNotes = (state: { tasks: TasksState }) => 
  state.tasks.selectedTaskDetails?.notes || [];
export const selectSelectedTaskReminders = (state: { tasks: TasksState }) => 
  state.tasks.selectedTaskDetails?.reminders || [];
export const selectSelectedTaskActivities = (state: { tasks: TasksState }) => 
  state.tasks.selectedTaskDetails?.activities || [];
export const selectSelectedTaskTimeEntries = (state: { tasks: TasksState }) => 
  state.tasks.selectedTaskDetails?.timeEntries || [];
export const selectSelectedTaskTimeSummary = (state: { tasks: TasksState }) => 
  state.tasks.selectedTaskDetails?.timeSummary || null;
export const selectSelectedTaskDependencies = (state: { tasks: TasksState }) => 
  state.tasks.selectedTaskDetails?.dependencies || [];

export const selectStats = (state: { tasks: TasksState }) => {
  const allTasks = [
    ...state.tasks.projects.flatMap(p => p.tasks),
    ...state.tasks.standaloneTasks,
  ];
  
  const stats = {
    todo: 0,
    inprogress: 0,
    overdue: 0,
    done: 0,
    total: allTasks.length,
  };
  
  allTasks.forEach(t => {
    if (t.status === 'done') stats.done++;
    else if (t.status === 'overdue') stats.overdue++;
    else if (t.status === 'inprogress' || t.status === 'in_progress') stats.inprogress++;
    else stats.todo++;
  });
  
  return stats;
};

export const selectFilteredTasks = (state: { tasks: TasksState }) => {
  const { filters, projects, standaloneTasks } = state.tasks;
  const allTasks = [
    ...projects.flatMap(p => p.tasks.map(t => ({ 
      ...t, 
      projectTitle: p.title, 
      projectId: p.id 
    }))),
    ...standaloneTasks.map(t => ({ 
      ...t, 
      projectTitle: 'Standalone', 
      projectId: null 
    })),
  ];
  
  return allTasks.filter(t => {
    // Assignee filter
    if (filters.assignee && t.assignee !== filters.assignee) return false;
    
    // Status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(t.status)) return false;
    }
    
    // Project ID filter - FIX: handle null case properly
    if (filters.project_id) {
      const projectIds = Array.isArray(filters.project_id) ? filters.project_id : [filters.project_id];
      // If t.projectId is null, it won't match any string filter
      // Only check if t.projectId is not null
      if (t.projectId === null) return false;
      if (!projectIds.includes(t.projectId)) return false;
    }
    
    // Search filter
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    
    // Priority filter
    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      if (!priorities.includes(t.priority)) return false;
    }
    
    // Type filter
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      if (!types.includes(t.type)) return false;
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      if (!filters.tags.some(tag => t.tags?.includes(tag))) return false;
    }
    
    // Date filters
    if (filters.due_from && t.deadline < filters.due_from) return false;
    if (filters.due_to && t.deadline > filters.due_to) return false;
    if (filters.created_from && t.created_at < new Date(filters.created_from)) return false;
    if (filters.created_to && t.created_at > new Date(filters.created_to)) return false;
    
    // Attachments filter
    if (filters.has_attachments !== undefined) {
      if (filters.has_attachments && (!t.attachments || t.attachments.length === 0)) return false;
      if (!filters.has_attachments && t.attachments && t.attachments.length > 0) return false;
    }
    
    // Notes filter - placeholder
    if (filters.has_notes !== undefined) {
      // This would need to check notes separately
    }
    
    // Blocked/Blocking filters
    if (filters.is_blocked && (!t.blocked_by || t.blocked_by.length === 0)) return false;
    if (filters.is_blocking && (!t.blocking || t.blocking.length === 0)) return false;
    
    // Parent task filter
    if (filters.parent_task_id !== undefined) {
      if (filters.parent_task_id === null && t.parent_task_id !== null) return false;
      if (filters.parent_task_id !== null && t.parent_task_id !== filters.parent_task_id) return false;
    }
    
    // Archived filter
    if (!filters.include_archived && t.status === 'archived') return false;
    
    return true;
  });
};

export default tasksSlice.reducer;