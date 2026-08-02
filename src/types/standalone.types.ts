// src/types/standalone.types.ts

export type StandaloneTaskStatus = 'pending' | 'in_progress' | 'complete';
export type StandaloneTaskPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';
export type UserRole = 'super_admin' | 'dept_head' | 'staff' | 'viewer';

export interface StandaloneTaskSubtask {
    id: string;
    task_id: string;
    title: string;
    description: string | null;
    completed: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface StandaloneTaskComment {
    id: string;
    task_id: string;
    user_id: string;
    user_name: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface StandaloneTaskAttachment {
    id: string;
    task_id: string;
    file_name: string;
    file_url: string;
    file_size: number;
    mime_type: string;
    uploaded_by: string;
    uploaded_by_name: string;
    created_at: string;
}

export interface StandaloneTaskHistory {
    id: string;
    task_id: string;
    user_id: string;
    user_name: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
}

export interface StandaloneTask {
    id: string;
    title: string;
    description: string | null;
    status: StandaloneTaskStatus;
    priority: StandaloneTaskPriority;
    assigned_to: string | null;
    assigned_to_name: string | null;
    assigned_to_team: string | null;
    assigned_to_team_name: string | null;
    created_by: string;
    created_by_name: string;
    start_date: string | null;
    end_date: string;
    estimated_hours: number | null;
    actual_hours: number | null;
    is_recurring: boolean;
    recurrence_type: RecurrenceType;
    recurrence_end_date: string | null;
    parent_task_id: string | null;
    is_active: boolean;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
    subtasks?: StandaloneTaskSubtask[];
    comments?: StandaloneTaskComment[];
    attachments?: StandaloneTaskAttachment[];
    history?: StandaloneTaskHistory[];
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateStandaloneTaskInput {
    title: string;
    description?: string | null;
    status?: StandaloneTaskStatus;
    priority?: StandaloneTaskPriority;
    assigned_to?: string | null;
    assigned_to_team?: string | null;
    start_date?: string | null;
    end_date: string;
    estimated_hours?: number | null;
    is_recurring?: boolean;
    recurrence_type?: RecurrenceType;
    recurrence_end_date?: string | null;
}

export interface UpdateStandaloneTaskInput {
    title?: string;
    description?: string | null;
    status?: StandaloneTaskStatus;
    priority?: StandaloneTaskPriority;
    assigned_to?: string | null;
    assigned_to_team?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    estimated_hours?: number | null;
    actual_hours?: number | null;
    is_recurring?: boolean;
    recurrence_type?: RecurrenceType;
    recurrence_end_date?: string | null;
    is_archived?: boolean;
}

export interface CreateStandaloneSubtaskInput {
    title: string;
    description?: string | null;
}

export interface UpdateStandaloneSubtaskInput {
    title?: string;
    description?: string | null;
    completed?: boolean;
}

export interface CreateStandaloneCommentInput {
    content: string;
}

export interface UpdateStandaloneCommentInput {
    content: string;
}

// ─── Filter Types ────────────────────────────────────────────────────────────

export interface StandaloneTaskFilters {
    status?: StandaloneTaskStatus;
    priority?: StandaloneTaskPriority;
    assigned_to?: string;
    assigned_to_team?: string;
    search?: string;
    start_date_from?: string;
    start_date_to?: string;
    end_date_from?: string;
    end_date_to?: string;
    is_archived?: boolean;
    page?: number;
    limit?: number;
    sort_by?: 'created_at' | 'end_date' | 'priority' | 'status' | 'title';
    sort_order?: 'ASC' | 'DESC';
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface StandaloneTaskPaginationResponse {
    data: StandaloneTask[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface StandaloneTaskStats {
    pending: number;
    in_progress: number;
    complete: number;
    overdue: number;
    total: number;
}

export interface StandaloneTaskPermissions {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canComplete: boolean;
    canArchive: boolean;
    canUnarchive: boolean;
    canComment: boolean;
    canAddAttachments: boolean;
    canManageSubtasks: boolean;
    canAssign: boolean;
    canRecurring: boolean;
    role: UserRole;
    roleLabel: string;
    isSuperAdmin: boolean;
    isDeptHead: boolean;
    isStaff: boolean;
    isViewer: boolean;
    isInSameDepartment: boolean;
    canManageDepartmentTasks: boolean;
    taskStatus: StandaloneTaskStatus;
    isTaskComplete: boolean;
    isTaskArchived: boolean;
    hasAttachments: boolean;
}

// ─── Recurrence Options ──────────────────────────────────────────────────────

export const RECURRENCE_OPTIONS: Array<{ value: RecurrenceType; label: string }> = [
    { value: 'none', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
    none: 'None',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
};

// ─── Display Constants ──────────────────────────────────────────────────────

export const STANDALONE_TASK_STATUS_LABELS: Record<StandaloneTaskStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    complete: 'Complete',
};

export const STANDALONE_TASK_STATUS_COLORS: Record<StandaloneTaskStatus, string> = {
    pending: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    in_progress: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    complete: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
};

export const STANDALONE_TASK_STATUS_ICONS: Record<StandaloneTaskStatus, string> = {
    pending: '⏳',
    in_progress: '🔄',
    complete: '✅',
};

export const STANDALONE_TASK_PRIORITY_LABELS: Record<StandaloneTaskPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
    critical: 'Critical',
};

export const STANDALONE_TASK_PRIORITY_COLORS: Record<StandaloneTaskPriority, string> = {
    low: 'bg-slate-100 text-slate-600 ring-slate-500/10',
    normal: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    high: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    urgent: 'bg-orange-100 text-orange-700 ring-orange-600/20',
    critical: 'bg-rose-100 text-rose-700 ring-rose-600/20',
};

export const STANDALONE_TASK_PRIORITY_ICONS: Record<StandaloneTaskPriority, string> = {
    low: '⬇️',
    normal: '➡️',
    high: '⬆️',
    urgent: '🔴',
    critical: '🚨',
};

// ─── Role Labels ─────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
    super_admin: 'Super Administrator',
    dept_head: 'Department Head',
    staff: 'Staff',
    viewer: 'Viewer',
};

export const ROLE_COLORS: Record<UserRole, string> = {
    super_admin: 'bg-purple-100 text-purple-700 ring-purple-600/20',
    dept_head: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    staff: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    viewer: 'bg-slate-100 text-slate-600 ring-slate-500/10',
};

// ─── Date Format Helpers ────────────────────────────────────────────────────

export const formatDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatTimeAgo = (dateStr: string): string => {
    if (!dateStr) return '—';
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
};

// ─── Task Status Helpers ────────────────────────────────────────────────────

export const getTaskStatus = (task: StandaloneTask): StandaloneTaskStatus => {
    const now = new Date();
    const endDate = new Date(task.end_date);
    const isOverdue = endDate < now && task.status !== 'complete';

    if (isOverdue) return 'pending'; // Overdue is a special state, but we use pending with a flag
    return task.status;
};

export const isTaskOverdue = (task: StandaloneTask): boolean => {
    if (task.status === 'complete') return false;
    const now = new Date();
    const endDate = new Date(task.end_date);
    return endDate < now;
};

export const getDaysUntilDeadline = (endDate: string): number => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - now.getTime()) / 86400000);
};

export const getDeadlineLabel = (endDate: string, status: StandaloneTaskStatus): string => {
    if (status === 'complete') return 'Completed';
    const days = getDaysUntilDeadline(endDate);
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `${days} days`;
    return formatDate(endDate);
};

export const getDeadlineColor = (endDate: string, status: StandaloneTaskStatus): string => {
    if (status === 'complete') return 'text-emerald-600';
    const days = getDaysUntilDeadline(endDate);
    if (days < 0) return 'text-rose-600';
    if (days === 0) return 'text-amber-600';
    if (days <= 3) return 'text-orange-600';
    return 'text-slate-500';
};

// ─── File Size Helper ──────────────────────────────────────────────────────

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ─── Task Filter Presets ───────────────────────────────────────────────────

export const TASK_FILTER_PRESETS: Record<string, Partial<StandaloneTaskFilters>> = {
    all: {},
    pending: { status: 'pending' },
    in_progress: { status: 'in_progress' },
    complete: { status: 'complete' },
    overdue: { status: 'pending', end_date_to: new Date().toISOString() },
    assigned_to_me: { assigned_to: 'me' }, // Will be replaced with actual user ID
    archived: { is_archived: true },
    active: { is_archived: false },
};