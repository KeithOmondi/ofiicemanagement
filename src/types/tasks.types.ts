// src/types/tasks.types.ts

export type TaskDay = 'Today' | 'Tomorrow' | 'Upcoming' | 'Someday';
export type TaskStatus = 'pending' | 'completed' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// ─── Base Types ──────────────────────────────────────────────────────────────

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  content: string;
  attachments?: TaskAttachment[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  list_id: string | null;
  list_name: string | null;
  status: TaskStatus;
  day: TaskDay;
  in_my_day: boolean;
  notes: string | null;
  subtasks: Subtask[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  reminder_date: string | null;
  reminder_time: string | null;
  tags: string[];
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_by: string;
  created_by_name: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subtask_count?: number;
  completed_subtask_count?: number;
  comment_count?: number;
  attachment_count?: number;
}

export interface TaskList {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  is_shared: boolean;
  created_by: string;
  created_by_name: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_task_count?: number;
}

export interface TaskListMember {
  id: string;
  list_id: string;
  user_id: string;
  full_name: string;
  email: string;
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  list_id?: string;
  day?: TaskDay;
  in_my_day?: boolean;
  notes?: string;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  list_id?: string | null;
  status?: TaskStatus;
  day?: TaskDay;
  in_my_day?: boolean;
  notes?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  tags?: string[];
  reminder_date?: string | null;
  reminder_time?: string | null;
}

export interface CreateSubtaskInput {
  task_id: string;
  title: string;
}

export interface UpdateSubtaskInput {
  title?: string;
  completed?: boolean;
}

export interface CreateTaskListInput {
  name: string;
  color?: string;
  icon?: string;
  is_shared?: boolean;
  member_ids?: string[];
}

export interface UpdateTaskListInput {
  name?: string;
  color?: string | null;
  icon?: string | null;
  is_shared?: boolean;
}

// ─── Comment Types ──────────────────────────────────────────────────────────

export interface CreateTaskCommentInput {
  content: string;
}

export interface UpdateTaskCommentInput {
  content: string;
}

// ─── Attachment Types ──────────────────────────────────────────────────────

export interface UploadTaskAttachmentInput {
  file: File;
}

export interface DeleteTaskAttachmentInput {
  attachment_id: string;
}

// ─── Query Types ──────────────────────────────────────────────────────────────

export interface TaskFilters {
  list_id?: string;
  status?: TaskStatus;
  day?: TaskDay;
  in_my_day?: boolean;
  assigned_to?: string;
  tags?: string[] | string;
  search?: string;
  due_from?: string;
  due_to?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title';
  sort_order?: 'ASC' | 'DESC';
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface TaskPaginationResponse {
  data: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskSummary {
  total: number;
  completed: number;
  pending: number;
  archived: number;
  in_my_day: number;
  by_day: {
    Today: number;
    Tomorrow: number;
    Upcoming: number;
    Someday: number;
  };
  by_priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

// ─── Display Labels & Colors ─────────────────────────────────────────────────

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export const TASK_PRIORITY_DOTS: Record<TaskPriority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  urgent: 'bg-red-500',
};

export const TASK_DAY_LABELS: Record<TaskDay, string> = {
  Today: 'Today',
  Tomorrow: 'Tomorrow',
  Upcoming: 'Upcoming',
  Someday: 'Someday',
};

export const TASK_DAY_ICONS: Record<TaskDay, string> = {
  Today: '📅',
  Tomorrow: '📆',
  Upcoming: '📋',
  Someday: '✨',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  archived: 'Archived',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-slate-50 text-slate-700',
};

export const TASK_STATUS_ICONS: Record<TaskStatus, string> = {
  pending: '⏳',
  completed: '✅',
  archived: '📦',
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get color class for a task priority
 */
export const getPriorityColor = (priority: TaskPriority): string => {
  return TASK_PRIORITY_COLORS[priority] || TASK_PRIORITY_COLORS.medium;
};

/**
 * Get label for a task priority
 */
export const getPriorityLabel = (priority: TaskPriority): string => {
  return TASK_PRIORITY_LABELS[priority] || TASK_PRIORITY_LABELS.medium;
};

/**
 * Get color class for a task status
 */
export const getStatusColor = (status: TaskStatus): string => {
  return TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS.pending;
};

/**
 * Get label for a task status
 */
export const getStatusLabel = (status: TaskStatus): string => {
  return TASK_STATUS_LABELS[status] || TASK_STATUS_LABELS.pending;
};

/**
 * Get label for a task day
 */
export const getDayLabel = (day: TaskDay): string => {
  return TASK_DAY_LABELS[day] || day;
};

/**
 * Format a date string to a readable format
 */
export const formatTaskDate = (date: string | null): string | null => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
};

/**
 * Format a datetime string to a readable format
 */
export const formatTaskDateTime = (date: string | null): string | null => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
};

/**
 * Format file size to human readable format
 */
export const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Check if a task is overdue
 */
export const isTaskOverdue = (task: Task): boolean => {
  if (!task.due_date) return false;
  if (task.status === 'completed') return false;
  return new Date(task.due_date) < new Date();
};

/**
 * Check if a task is due today
 */
export const isTaskDueToday = (task: Task): boolean => {
  if (!task.due_date) return false;
  const today = new Date();
  const dueDate = new Date(task.due_date);
  return (
    dueDate.getDate() === today.getDate() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a task is due tomorrow
 */
export const isTaskDueTomorrow = (task: Task): boolean => {
  if (!task.due_date) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = new Date(task.due_date);
  return (
    dueDate.getDate() === tomorrow.getDate() &&
    dueDate.getMonth() === tomorrow.getMonth() &&
    dueDate.getFullYear() === tomorrow.getFullYear()
  );
};

/**
 * Get task completion percentage
 */
export const getTaskCompletionPercentage = (task: Task): number => {
  if (!task.subtask_count || task.subtask_count === 0) return 0;
  const completed = task.completed_subtask_count || 0;
  return Math.round((completed / task.subtask_count) * 100);
};

/**
 * Sort tasks by priority (urgent > high > medium > low)
 */
export const sortTasksByPriority = (tasks: Task[]): Task[] => {
  const priorityOrder: Record<TaskPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};

/**
 * Filter tasks by day
 */
export const filterTasksByDay = (tasks: Task[], day: TaskDay): Task[] => {
  return tasks.filter(task => task.day === day);
};

/**
 * Filter tasks by status
 */
export const filterTasksByStatus = (tasks: Task[], status: TaskStatus): Task[] => {
  return tasks.filter(task => task.status === status);
};

/**
 * Filter tasks by search query
 */
export const filterTasksBySearch = (tasks: Task[], query: string): Task[] => {
  if (!query.trim()) return tasks;
  const search = query.toLowerCase().trim();
  return tasks.filter(task =>
    task.title.toLowerCase().includes(search) ||
    (task.notes && task.notes.toLowerCase().includes(search)) ||
    task.tags.some(tag => tag.toLowerCase().includes(search))
  );
};

// ─── Type Guards ─────────────────────────────────────────────────────────────

/**
 * Type guard to check if a value is a TaskDay
 */
export const isTaskDay = (value: unknown): value is TaskDay => {
  return typeof value === 'string' && ['Today', 'Tomorrow', 'Upcoming', 'Someday'].includes(value);
};

/**
 * Type guard to check if a value is a TaskStatus
 */
export const isTaskStatus = (value: unknown): value is TaskStatus => {
  return typeof value === 'string' && ['pending', 'completed', 'archived'].includes(value);
};

/**
 * Type guard to check if a value is a TaskPriority
 */
export const isTaskPriority = (value: unknown): value is TaskPriority => {
  return typeof value === 'string' && ['low', 'medium', 'high', 'urgent'].includes(value);
};

/**
 * Type guard to check if an object is a Task
 */
export const isTask = (value: unknown): value is Task => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'status' in value &&
    'day' in value &&
    'priority' in value
  );
};

/**
 * Type guard to check if an object is a TaskList
 */
export const isTaskList = (value: unknown): value is TaskList => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'is_shared' in value
  );
};