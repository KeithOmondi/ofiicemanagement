// src/types/tasks.types.ts

export type TaskDay = 'Today' | 'Tomorrow' | 'Upcoming' | 'Someday';
export type TaskStatus = 'pending' | 'completed' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRecurrencePattern = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type TaskRecurrenceEndType = 'never' | 'after' | 'on_date';
export type TaskEventType = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'completed'
  | 'uncompleted'
  | 'archived'
  | 'unarchived'
  | 'assigned'
  | 'unassigned'
  | 'due_date_changed'
  | 'priority_changed'
  | 'status_changed'
  | 'list_changed'
  | 'subtask_added'
  | 'subtask_completed'
  | 'subtask_deleted'
  | 'comment_added'
  | 'comment_edited'
  | 'comment_deleted'
  | 'attachment_added'
  | 'attachment_deleted'
  | 'tag_added'
  | 'tag_removed'
  | 'reminder_added'
  | 'reminder_sent'
  | 'reminder_deleted'
  | 'dependency_added'
  | 'dependency_removed'
  | 'recurrence_created'
  | 'recurrence_updated'
  | 'recurrence_deleted';

// ─── Base Types ──────────────────────────────────────────────────────────────

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  priority: TaskPriority;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  user_id: string;
  public_id: string;
  url: string;
  thumbnail_url?: string;
  filename: string;
  mimetype: string;
  size: number;
  upload_status: 'pending' | 'uploading' | 'completed' | 'failed';
  upload_progress?: number;
  is_deleted: boolean;
  uploaded_at: string;
  deleted_at?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  content: string;
  mentions?: string[];
  attachments?: string[];
  parent_comment_id?: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskReminder {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  reminder_date: string;
  reminder_time: string;
  reminder_type: 'email' | 'push' | 'sms' | 'in_app';
  is_sent: boolean;
  sent_at?: string;
  is_active: boolean;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  parent_task_id: string;
  dependent_task_id: string;
  dependency_type: 'blocks' | 'blocks_completion' | 'relates_to';
  created_at: string;
  updated_at: string;
}

export interface TaskRecurrence {
  id: string;
  task_id: string;
  pattern: TaskRecurrencePattern;
  interval: number;
  day_of_week?: number[];
  day_of_month?: number;
  month_of_year?: number;
  end_type: TaskRecurrenceEndType;
  end_after_count?: number;
  end_date?: string;
  last_occurrence_date?: string;
  next_occurrence_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_by: string;
  is_active: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  list_id: string | null;
  list_name: string | null;
  status: TaskStatus;
  day: TaskDay;
  in_my_day: boolean;
  notes: string | null;
  subtasks: Subtask[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  reminders?: TaskReminder[];
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
  assigned_date?: string;
  is_active: boolean;
  parent_task_id?: string;
  parent_task_title?: string;
  child_tasks?: Task[];
  recurrence?: TaskRecurrence;
  dependency_count?: number;
  dependencies?: TaskDependency[];
  estimated_hours?: number;
  actual_hours?: number;
  start_date?: string;
  position: number;
  is_favorite: boolean;
  color?: string;
  subtask_count?: number;
  completed_subtask_count?: number;
  comment_count?: number;
  attachment_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskList {
  id: string;
  name: string;
  description?: string;
  color: string | null;
  icon: string | null;
  is_shared: boolean;
  is_shared_with_public?: boolean;
  shared_with?: string[];
  created_by: string;
  created_by_name: string;
  member_count: number;
  members?: TaskListMember[];
  is_active: boolean;
  is_archived: boolean;
  archived_at?: string;
  position: number;
  task_count?: number;
  completed_task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskListMember {
  id: string;
  list_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: string[];
  joined_at: string;
  last_accessed_at?: string;
  is_active: boolean;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  event_type: TaskEventType;
  field_name?: string;
  old_value?: string | number | boolean | null | Record<string, unknown>;
  new_value?: string | number | boolean | null | Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface TaskNotification {
  id: string;
  user_id: string;
  task_id: string;
  event_type: TaskEventType;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
  read_at?: string;
  metadata?: Record<string, unknown>;
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string;
  list_id?: string;
  day?: TaskDay;
  in_my_day?: boolean;
  notes?: string;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string;
  assigned_to_name?: string;
  tags?: string[];
  parent_task_id?: string;
  estimated_hours?: number;
  start_date?: string | null;
  color?: string;
  position?: number;
  is_favorite?: boolean;
  recurrence?: Omit<
    TaskRecurrence, 
    'id' | 'task_id' | 'created_at' | 'updated_at' | 'last_occurrence_date' | 'next_occurrence_date' | 'is_active'
  >;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  list_id?: string | null;
  status?: TaskStatus;
  day?: TaskDay;
  in_my_day?: boolean;
  notes?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  tags?: string[];
  reminder_date?: string | null;
  reminder_time?: string | null;
  parent_task_id?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  start_date?: string | null;
  color?: string | null;
  position?: number;
  is_favorite?: boolean;
}

export interface BulkUpdateTasksInput {
  task_ids: string[];
  data: UpdateTaskInput;
}

export interface BulkTaskActionInput {
  action: 'complete' | 'uncomplete' | 'archive' | 'unarchive' | 'delete' | 'assign' | 'change_list' | 'change_priority' | 'add_tags' | 'remove_tags';
  task_ids: string[];
  value?: string | string[] | null;
}

export interface CreateSubtaskInput {
  task_id?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string;
  assigned_to_name?: string;
  position?: number;
}

export interface UpdateSubtaskInput {
  title?: string;
  description?: string | null;
  completed?: boolean;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  position?: number;
}

export interface BulkUpdateSubtasksInput {
  subtask_ids: string[];
  data: {
    completed?: boolean;
    priority?: TaskPriority;
    assigned_to?: string | null;
  };
}

export interface CreateTaskListInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_shared?: boolean;
  is_shared_with_public?: boolean;
  member_ids?: string[];
  position?: number;
}

export interface UpdateTaskListInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  is_shared?: boolean;
  is_shared_with_public?: boolean;
  position?: number;
}

export interface AddListMembersInput {
  user_ids: string[];
  role?: 'admin' | 'editor' | 'viewer';
}

export interface UpdateListMemberInput {
  role: 'admin' | 'editor' | 'viewer';
  permissions?: string[];
}

export interface CreateTaskCommentInput {
  content: string;
  mentions?: string[];
  attachment_ids?: string[];
  parent_comment_id?: string;
}

export interface UpdateTaskCommentInput {
  content: string;
  mentions?: string[];
}

export interface CreateReminderInput {
  task_id: string;
  reminder_date: string;
  reminder_time: string;
  reminder_type?: 'email' | 'push' | 'sms' | 'in_app';
  note?: string;
  user_id?: string;
}

export interface UpdateReminderInput {
  reminder_date?: string;
  reminder_time?: string;
  reminder_type?: 'email' | 'push' | 'sms' | 'in_app';
  note?: string | null;
  is_active?: boolean;
}

export interface CreateTagInput {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CreateDependencyInput {
  parent_task_id: string;
  dependent_task_id: string;
  dependency_type?: 'blocks' | 'blocks_completion' | 'relates_to';
}

export interface UpdateRecurrenceInput {
  pattern?: TaskRecurrencePattern;
  interval?: number;
  day_of_week?: number[];
  day_of_month?: number;
  month_of_year?: number;
  end_type?: TaskRecurrenceEndType;
  end_after_count?: number | null;
  end_date?: string | null;
  is_active?: boolean;
}

export interface MoveTaskInput {
  task_id: string;
  new_day?: TaskDay;
  new_list_id?: string | null;
  new_position?: number;
  new_parent_task_id?: string | null;
}

export interface CopyTaskInput {
  task_id: string;
  new_list_id?: string;
  new_day?: TaskDay;
  include_subtasks?: boolean;
  include_attachments?: boolean;
}

// ─── Query Types ──────────────────────────────────────────────────────────────

export interface TaskFilters {
  list_id?: string;
  status?: TaskStatus | TaskStatus[];
  day?: TaskDay | TaskDay[];
  in_my_day?: boolean;
  assigned_to?: string | string[];
  created_by?: string;
  tags?: string[] | string;
  search?: string;
  due_from?: string;
  due_to?: string;
  due_date_range?: 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month' | 'no_due_date';
  priority?: TaskPriority | TaskPriority[];
  parent_task_id?: string | null;
  has_subtasks?: boolean;
  has_attachments?: boolean;
  has_comments?: boolean;
  is_favorite?: boolean;
  is_recurring?: boolean;
  completed_from?: string;
  completed_to?: string;
  reminder_date_from?: string;
  reminder_date_to?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title' | 'position' | 'completed_at' | 'start_date';
  sort_order?: 'ASC' | 'DESC';
  include_deleted?: boolean;
  include_subtasks?: boolean;
  include_attachments?: boolean;
  include_comments?: boolean;
  include_dependencies?: boolean;
  include_recurrence?: boolean;
}

export interface TaskTimelineFilters {
  start_date: string;
  end_date: string;
  group_by: 'day' | 'week' | 'month' | 'quarter' | 'year';
  list_id?: string;
  assigned_to?: string;
  status?: TaskStatus | TaskStatus[];
  include_completed?: boolean;
}

export interface TaskAnalyticsFilters {
  list_id?: string;
  assigned_to?: string;
  from_date?: string;
  to_date?: string;
}

export interface TaskSearchRequest {
  query: string;
  filters?: Partial<TaskFilters>;
  highlight_matches?: boolean;
  fuzzy_match?: boolean;
  search_fields?: ('title' | 'description' | 'notes' | 'subtasks' | 'comments')[];
}

export interface TaskExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'html';
  filters?: Partial<TaskFilters>;
  include_fields?: (keyof Task)[];
  include_subtasks?: boolean;
  include_comments?: boolean;
  include_attachments?: boolean;
  include_activity_log?: boolean;
  date_range?: {
    from: string;
    to: string;
  };
}

export interface TaskImportOptions {
  format: 'json' | 'csv' | 'todoist' | 'trello' | 'asana';
  data: unknown;
  merge_strategy: 'replace' | 'merge' | 'skip_existing';
  import_to_list_id?: string;
  mapping?: Record<string, string>;
  dry_run?: boolean;
}

export interface NotificationFilters {
  is_read?: boolean;
  event_type?: TaskEventType | TaskEventType[];
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface TaskPaginationResponse {
  data: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TaskSummary {
  total: number;
  completed: number;
  pending: number;
  archived: number;
  in_my_day: number;
  overdue: number;
  due_today: number;
  due_this_week: number;
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
  by_status: {
    pending: number;
    completed: number;
    archived: number;
  };
  by_list: {
    list_id: string;
    list_name: string;
    count: number;
    completed: number;
  }[];
  by_assignee: {
    user_id: string;
    user_name: string;
    count: number;
    completed: number;
  }[];
  by_tag: {
    tag_id: string;
    tag_name: string;
    color: string;
    count: number;
  }[];
}

export interface TaskTimelineData {
  date: string;
  total: number;
  completed: number;
  pending: number;
  archived: number;
  tasks: Task[];
}

export interface TaskAnalytics {
  average_completion_time: number;
  tasks_completed_per_day: number;
  tasks_created_per_day: number;
  peak_productivity_time: string;
  most_productive_day: string;
  completion_rate_by_priority: {
    priority: TaskPriority;
    rate: number;
  }[];
  average_subtasks_per_task: number;
  tasks_with_attachments_percentage: number;
  overdue_tasks_percentage: number;
  time_estimates_accuracy: {
    estimated_vs_actual_hours: number;
    tasks_under_estimated: number;
    tasks_over_estimated: number;
    tasks_on_time: number;
  };
}

export interface TaskSearchResult {
  task: Task;
  score: number;
  matched_fields: string[];
  highlights?: {
    field: string;
    text: string;
    positions: number[];
  }[];
}

export interface TaskSearchResponse {
  results: TaskSearchResult[];
  total: number;
  took_ms: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
  suggested_queries?: string[];
}

export interface TaskImportResult {
  imported: number;
  failed: number;
  errors: {
    row: number;
    error: string;
  }[];
  summary: {
    tasks_created: number;
    tasks_updated: number;
    subtasks_created: number;
    attachments_uploaded: number;
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

export const TASK_RECURRENCE_PATTERN_LABELS: Record<TaskRecurrencePattern, string> = {
  none: 'None',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export const TASK_RECURRENCE_END_TYPE_LABELS: Record<TaskRecurrenceEndType, string> = {
  never: 'Never',
  after: 'After',
  on_date: 'On Date',
};

export const TASK_EVENT_TYPE_LABELS: Record<TaskEventType, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  completed: 'Completed',
  uncompleted: 'Uncompleted',
  archived: 'Archived',
  unarchived: 'Unarchived',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  due_date_changed: 'Due Date Changed',
  priority_changed: 'Priority Changed',
  status_changed: 'Status Changed',
  list_changed: 'List Changed',
  subtask_added: 'Subtask Added',
  subtask_completed: 'Subtask Completed',
  subtask_deleted: 'Subtask Deleted',
  comment_added: 'Comment Added',
  comment_edited: 'Comment Edited',
  comment_deleted: 'Comment Deleted',
  attachment_added: 'Attachment Added',
  attachment_deleted: 'Attachment Deleted',
  tag_added: 'Tag Added',
  tag_removed: 'Tag Removed',
  reminder_added: 'Reminder Added',
  reminder_sent: 'Reminder Sent',
  reminder_deleted: 'Reminder Deleted',
  dependency_added: 'Dependency Added',
  dependency_removed: 'Dependency Removed',
  recurrence_created: 'Recurrence Created',
  recurrence_updated: 'Recurrence Updated',
  recurrence_deleted: 'Recurrence Deleted',
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

export const getPriorityColor = (priority: TaskPriority): string => {
  return TASK_PRIORITY_COLORS[priority] || TASK_PRIORITY_COLORS.medium;
};

export const getPriorityLabel = (priority: TaskPriority): string => {
  return TASK_PRIORITY_LABELS[priority] || TASK_PRIORITY_LABELS.medium;
};

export const getStatusColor = (status: TaskStatus): string => {
  return TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS.pending;
};

export const getStatusLabel = (status: TaskStatus): string => {
  return TASK_STATUS_LABELS[status] || TASK_STATUS_LABELS.pending;
};

export const getDayLabel = (day: TaskDay): string => {
  return TASK_DAY_LABELS[day] || day;
};

export const getRecurrencePatternLabel = (pattern: TaskRecurrencePattern): string => {
  return TASK_RECURRENCE_PATTERN_LABELS[pattern] || pattern;
};

export const getEventTypeLabel = (eventType: TaskEventType): string => {
  return TASK_EVENT_TYPE_LABELS[eventType] || eventType;
};

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

export const isTaskOverdue = (task: Task): boolean => {
  if (!task.due_date) return false;
  if (task.status === 'completed') return false;
  return new Date(task.due_date) < new Date();
};

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

export const getTaskCompletionPercentage = (task: Task): number => {
  if (!task.subtask_count || task.subtask_count === 0) return 0;
  const completed = task.completed_subtask_count || 0;
  return Math.round((completed / task.subtask_count) * 100);
};

export const sortTasksByPriority = (tasks: Task[]): Task[] => {
  const priorityOrder: Record<TaskPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};

export const filterTasksByDay = (tasks: Task[], day: TaskDay): Task[] => {
  return tasks.filter(task => task.day === day);
};

export const filterTasksByStatus = (tasks: Task[], status: TaskStatus): Task[] => {
  return tasks.filter(task => task.status === status);
};

export const filterTasksBySearch = (tasks: Task[], query: string): Task[] => {
  if (!query.trim()) return tasks;
  const search = query.toLowerCase().trim();
  return tasks.filter(task =>
    task.title.toLowerCase().includes(search) ||
    (task.notes && task.notes.toLowerCase().includes(search)) ||
    (task.description && task.description.toLowerCase().includes(search)) ||
    task.tags.some(tag => tag.toLowerCase().includes(search))
  );
};

// ─── Type Guards ─────────────────────────────────────────────────────────────

export const isTaskDay = (value: unknown): value is TaskDay => {
  return typeof value === 'string' && ['Today', 'Tomorrow', 'Upcoming', 'Someday'].includes(value);
};

export const isTaskStatus = (value: unknown): value is TaskStatus => {
  return typeof value === 'string' && ['pending', 'completed', 'archived'].includes(value);
};

export const isTaskPriority = (value: unknown): value is TaskPriority => {
  return typeof value === 'string' && ['low', 'medium', 'high', 'urgent'].includes(value);
};

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

export const isTaskList = (value: unknown): value is TaskList => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'is_shared' in value
  );
};

export const isTaskEventType = (value: unknown): value is TaskEventType => {
  return typeof value === 'string' && Object.keys(TASK_EVENT_TYPE_LABELS).includes(value);
};