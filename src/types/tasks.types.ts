// src/types/tasks.types.ts

// ─── Open-Domain Fields ─────────────────────────────────────────────────────
// Task status/type/visibility are NOT a fixed enum — see KNOWN_TASK_STATUSES
// etc. in tasks.validator.ts for the reference list used by the frontend.
// Stored and typed as plain strings so custom workflows/categories don't
// require a schema or type change.

export type TaskStatus = string; // 'todo' | 'inprogress' | 'done' | 'overdue' | 'pending_approval' | 'blocked' | 'review' | custom
export type TaskType = string; // 'task' | 'bug' | 'feature' | 'improvement' | 'support' | 'maintenance' | custom
export type TaskVisibility = string; // 'public' | 'private' | 'team' | custom

export type MemberCode = string; // e.g., "RHC", "AO", "IT", "HR", etc.

// ─── Fixed-Domain Enums ─────────────────────────────────────────────────────
export type Priority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type ProjectStatus = 'active' | 'archived' | 'completed' | 'on_hold' | 'planning';
export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type DependencyType = 'blocks' | 'blocked_by' | 'relates_to';

// ─── Member ─────────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
  avatar_url?: string;
  department?: string;
  is_active: boolean;
  joined_at: Date;
}

// ─── Project ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string; // ISO date string
  priority: Priority;
  members: MemberCode[];
  tasks: Task[];
  collapsed?: boolean; // client-only

  // Additional real-world fields
  owner_id: string;
  owner_name: string;
  department_id?: string;
  department_name?: string;
  tags: string[];
  attachments: ProjectAttachment[];
  progress: number; // 0-100 calculated from tasks
  start_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_by: string;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: Date;
}

// ─── Task ──────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  assignee: MemberCode | 'GROUP' | null;
  priority: Priority;
  deadline: string;
  status: TaskStatus;
  progress: number; // 0-100
  start_date: string | null;

  // Additional real-world fields
  type: TaskType;
  visibility: TaskVisibility;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string; // Alias for deadline for compatibility
  completed_at: string | null;
  started_at: string | null;
  blocked_by: string[]; // Task IDs that block this task
  blocking: string[]; // Task IDs this task blocks
  tags: string[];
  attachments: TaskAttachment[];
  watchers: string[]; // User IDs watching this task
  parent_task_id: string | null;
  child_task_ids: string[];
  // Calculated by the service layer for sorting — not set on insert, and
  // not guaranteed present unless something has explicitly computed it.
  priority_score?: number;
  created_by: string;
  created_by_name: string;
  assigned_by: string | null;
  assigned_by_name: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: Date;
}

// ─── Subtask ────────────────────────────────────────────────────────────────────

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  assigned_to: MemberCode | null;
  assigned_to_name: string | null;
  due_date: string | null;
  priority: Priority;
  order: number; // For sorting subtasks
  created_by: string;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
}

// ─── Task Note ─────────────────────────────────────────────────────────────────

export interface TaskNote {
  id: string;
  task_id: string;
  content: string;
  is_internal: boolean; // Internal notes not visible to external users
  author_id: string;
  author_name: string;
  attachments: TaskNoteAttachment[];
  parent_note_id: string | null; // For threaded comments
  created_at: Date;
  updated_at: Date;
}

export interface TaskNoteAttachment {
  id: string;
  note_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

// ─── Reminder ──────────────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  task_id: string;
  remind_at: string; // ISO datetime string
  sent: boolean;
  sent_at: Date | null;
  repeat: ReminderRepeat;
  message: string | null;
  created_by: string;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface ReminderCustomRepeat {
  interval: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  end_date: Date | null;
  occurrences: number | null;
}

// ─── Task History / Activity Log ──────────────────────────────────────────────

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  action: TaskActivityAction;
  changes: TaskActivityChange[];
  metadata: Record<string, unknown>;
  created_at: Date;
}

export type TaskActivityAction =
  | 'created'
  | 'updated'
  | 'assigned'
  | 'status_changed'
  | 'priority_changed'
  | 'deadline_changed'
  | 'comment_added'
  | 'attachment_added'
  | 'subtask_added'
  | 'subtask_completed'
  | 'subtask_deleted'
  | 'reminder_set'
  | 'reminder_sent'
  | 'watcher_added'
  | 'watcher_removed'
  | 'blocked_by'
  | 'unblocked'
  | 'completed'
  | 'reopened'
  | 'archived';

export interface TaskActivityChange {
  field: string;
  from: unknown;
  to: unknown;
}

// ─── Task Dashboard / Statistics ──────────────────────────────────────────────
export interface TaskDashboardStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<Priority, number>;
  by_type: Record<string, number>;
  overdue: number;
  due_today: number;
  due_this_week: number;
  completed_today: number;
  completed_this_week: number;
  average_completion_time: number; // in hours
  tasks_with_attachments: number;
  tasks_with_notes: number;
}

export interface UserTaskStats {
  user_id: string;
  user_name: string;
  assigned: number;
  in_progress: number;
  done: number;
  overdue: number;
  completion_rate: number; // 0-100
  average_response_time: number; // in hours
  tasks_completed: number;
}

// ─── Task Templates ────────────────────────────────────────────────────────────

export interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  priority: Priority;
  estimated_hours: number | null;
  tags: string[];
  subtasks: TaskTemplateSubtask[];
  created_by: string;
  created_by_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaskTemplateSubtask {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  estimated_hours: number | null;
}

// ─── Task Time Tracking ───────────────────────────────────────────────────────

export interface TaskTimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  start_time: Date;
  end_time: Date | null;
  duration: number | null; // in seconds
  description: string | null;
  billable: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TaskTimeSummary {
  task_id: string;
  total_duration: number; // in seconds
  billable_duration: number; // in seconds
  entries: TaskTimeEntry[];
  last_entry: TaskTimeEntry | null;
}

// ─── Task Dependency Graph ────────────────────────────────────────────────────

export interface TaskDependency {
  task_id: string;
  depends_on: string; // Task ID
  dependency_type: DependencyType;
  created_at: Date;
}

// ─── Task Search ──────────────────────────────────────────────────────────────

export interface TaskSearchResult {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  aggregations: TaskSearchAggregations;
}

export interface TaskSearchAggregations {
  by_status: Record<string, number>;
  by_priority: Record<Priority, number>;
  by_type: Record<string, number>;
  by_assignee: Record<string, number>;
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  title: string;
  description?: string | null;
  deadline: string;
  priority?: Priority;
  members: string[];
  owner_id?: string;
  department_id?: string;
  tags?: string[];
  start_date?: string | null;
  status?: ProjectStatus;
}

export interface UpdateProjectInput {
  id: string;
  title?: string;
  description?: string | null;
  deadline?: string;
  priority?: Priority;
  members?: string[];
  owner_id?: string;
  department_id?: string;
  tags?: string[];
  start_date?: string | null;
  status?: ProjectStatus;
}

export interface CreateTaskInput {
  project_id?: string | null;
  title: string;
  description?: string | null;
  assignee?: string | 'GROUP' | null;
  priority?: Priority;
  deadline: string;
  start_date?: string | null;
  type?: TaskType;
  visibility?: TaskVisibility;
  tags?: string[];
  estimated_hours?: number | null;
  parent_task_id?: string | null;
}

export interface UpdateTaskInput {
  project_id?: string | null;
  title?: string;
  description?: string | null;
  assignee?: string | 'GROUP' | null;
  priority?: Priority;
  deadline?: string;
  start_date?: string | null;
  status?: TaskStatus;
  progress?: number;
  type?: TaskType;
  visibility?: TaskVisibility;
  tags?: string[];
  estimated_hours?: number | null;
  actual_hours?: number | null;
  parent_task_id?: string | null;
  blocked_by?: string[];
}

export interface CreateSubtaskInput {
  task_id: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  priority?: Priority;
}

export interface UpdateSubtaskInput {
  title?: string;
  description?: string | null;
  completed?: boolean;
  assigned_to?: string | null;
  due_date?: string | null;
  priority?: Priority;
}

export interface CreateTaskNoteInput {
  task_id: string;
  content: string;
  is_internal?: boolean;
  parent_note_id?: string | null;
}

export interface CreateReminderInput {
  task_id: string;
  remind_at: string;
  repeat?: ReminderRepeat;
  message?: string | null;
}

export interface CreateTaskTemplateInput {
  title: string;
  description?: string | null;
  type?: TaskType;
  priority?: Priority;
  estimated_hours?: number | null;
  tags?: string[];
  subtasks?: Array<{
    title: string;
    description?: string | null;
    priority?: Priority;
    estimated_hours?: number | null;
  }>;
}

// ─── Task Export ──────────────────────────────────────────────────────────────

export interface TaskExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  fields: string[];
  include_subtasks?: boolean;
  include_notes?: boolean;
  include_attachments?: boolean;
  date_from?: string | null;
  date_to?: string | null;
}

export interface TaskExportResult {
  url: string;
  filename: string;
  size: number;
  expires_at: Date;
}

// ─── Task Filters ────────────────────────────────────────────────────────────

export interface TaskFilters {
  assignee?: string;
  status?: string | string[];
  project_id?: string | string[];
  priority?: Priority | Priority[];
  type?: string | string[];
  search?: string;
  tags?: string[];
  due_from?: string | null;
  due_to?: string | null;
  created_from?: string | null;
  created_to?: string | null;
  updated_from?: string | null;
  updated_to?: string | null;
  assigned_by?: string;
  created_by?: string;
  has_attachments?: boolean;
  has_notes?: boolean;
  is_blocked?: boolean;
  is_blocking?: boolean;
  parent_task_id?: string | null;
  include_archived?: boolean;
  sort_by?: 'created_at' | 'updated_at' | 'deadline' | 'priority' | 'status' | 'title' | 'progress';
  sort_order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}