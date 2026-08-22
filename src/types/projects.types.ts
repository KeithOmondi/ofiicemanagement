// src/types/projects.types.ts

// ─── Removed 'todo' from status ─────────────────────────────────────────────
export type ProjectTaskStatus = 'inprogress' | 'done' | 'overdue' | 'pending_approval' | 'blocked' | 'review';
export type ProjectPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type ProjectVisibility = 'public' | 'private' | 'team';

// ─── Removed ChecklistStatus ────────────────────────────────────────────────
// No longer needed

export interface ProjectUser {
    id: string;
    full_name: string;
    pj_number: string;
    email: string;
    role?: 'admin' | 'member' | 'viewer';
    avatar?: string;
}

// ─── File/Attachment Types ──────────────────────────────────────────────────

export interface ProjectFile {
    id: string;
    task_id?: string;
    project_id?: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    public_id: string;
    secure_url: string;
    uploaded_by: string;
    uploaded_by_name: string;
    created_at: string;
    updated_at: string;
}

// ─── Comment Types ──────────────────────────────────────────────────────────

export interface ProjectTaskComment {
    id: string;
    task_id: string;
    user_id: string;
    user_name: string;
    content: string;
    attachments?: ProjectFile[];
    created_at: string;
    updated_at: string;
}

// ─── Subtask Types ──────────────────────────────────────────────────────────

export interface ProjectSubtask {
    id: string;
    task_id: string;
    title: string;
    description: string | null;
    completed: boolean;
    is_active: boolean;
    assigned_to: string | null;
    assigned_to_name?: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Main Task Types ───────────────────────────────────────────────────────

export interface ProjectTask {
    id: string;
    project_id: string | null;
    title: string;
    description: string | null;
    status: ProjectTaskStatus;
    priority: ProjectPriority;
    type?: string | null;
    assignee: string | null;
    assignee_name: string | null;
    deadline: string;
    start_date: string | null;
    completed_at?: string | null;
    tags: string[];
    estimated_hours: number | null;
    actual_hours: number | null;
    parent_task_id: string | null;
    visibility: ProjectVisibility;
    is_active: boolean;
    created_by: string;
    created_by_name: string;
    created_at: string;
    updated_at: string;
    updated_by?: string;
    updated_by_name?: string;
    subtasks?: ProjectSubtask[];
    comments?: ProjectTaskComment[];
    attachments?: ProjectFile[];
    
    // Progress tracking
    progress_percentage?: number;
    subtasks_completed?: number;
    subtasks_total?: number;
}

// ─── Project Types ─────────────────────────────────────────────────────────

export interface Project {
    id: string;
    title: string;
    description: string | null;
    priority: ProjectPriority;
    deadline: string;
    start_date?: string | null;
    completed_at?: string | null;
    tags: string[];
    members: ProjectUser[];
    tasks?: ProjectTask[];
    attachments?: ProjectFile[];
    task_count?: number;
    completed_task_count?: number;
    progress_percentage?: number;
    is_active: boolean;
    created_by: string;
    created_by_name?: string;
    created_at: string;
    updated_at: string;
    updated_by?: string;
    updated_by_name?: string;
}

// ─── Input Types ───────────────────────────────────────────────────────────

export interface CreateProjectInput {
    title: string;
    description?: string;
    priority?: ProjectPriority;
    deadline?: string;
    start_date?: string;
    tags?: string[];
    member_ids?: string[];
}

export interface UpdateProjectInput {
    title?: string;
    description?: string | null;
    priority?: ProjectPriority;
    deadline?: string | null;
    start_date?: string | null;
    tags?: string[];
    member_ids?: string[];
    is_active?: boolean;
}

export interface CreateProjectTaskInput {
    project_id?: string;
    title: string;
    description?: string | null;
    status?: ProjectTaskStatus;
    priority?: ProjectPriority;
    type?: string | null;
    assignee?: string | null;
    deadline?: string;
    start_date?: string | null;
    tags?: string[];
    estimated_hours?: number;
    parent_task_id?: string | null;
    visibility?: ProjectVisibility;
}

export interface UpdateProjectTaskInput {
    project_id?: string | null;
    title?: string;
    description?: string | null;
    status?: ProjectTaskStatus;
    priority?: ProjectPriority;
    type?: string | null;
    assignee?: string | null;
    deadline?: string | null;
    start_date?: string | null;
    tags?: string[];
    estimated_hours?: number | null;
    actual_hours?: number | null;
    parent_task_id?: string | null;
    visibility?: ProjectVisibility;
    completed_at?: string | null;
}

export interface CreateProjectSubtaskInput {
    title: string;
    description?: string | null;
    assigned_to?: string | null;
}

export interface UpdateProjectSubtaskInput {
    title?: string;
    description?: string | null;
    completed?: boolean;
    assigned_to?: string | null;
}

export interface CreateProjectCommentInput {
    content: string;
    attachments?: File[];
}

export interface UpdateProjectCommentInput {
    content: string;
}

// ─── Bulk Update Types ─────────────────────────────────────────────────────

export interface BulkTaskUpdate {
    task_id: string;
    status?: ProjectTaskStatus;
    priority?: ProjectPriority;
    assignee?: string | null;
    deadline?: string | null;
}

export interface BulkTaskUpdateInput {
    updates: BulkTaskUpdate[];
}

// ─── File Upload Types ─────────────────────────────────────────────────────

export interface UploadProjectFileInput {
    task_id?: string;
    project_id?: string;
    file: File;
}

export interface BulkUploadProjectFilesInput {
    task_id?: string;
    project_id?: string;
    files: File[];
}

// ─── Query Types ───────────────────────────────────────────────────────────

export interface ProjectTaskFilters {
    project_id?: string;
    status?: ProjectTaskStatus;
    priority?: ProjectPriority;
    type?: string;
    assignee?: string;
    assigned_to_me?: boolean;
    tags?: string[] | string;
    search?: string;
    deadline_from?: string;
    deadline_to?: string;
    page?: number;
    limit?: number;
    sort_by?: 'created_at' | 'deadline' | 'priority' | 'status' | 'title' | 'updated_at';
    sort_order?: 'ASC' | 'DESC';
}

export interface ProjectFilters {
    search?: string;
    page?: number;
    limit?: number;
    member_id?: string;
    created_by?: string;
    is_active?: boolean;
    priority?: ProjectPriority;
    deadline_from?: string;
    deadline_to?: string;
}

// ─── Response Types ────────────────────────────────────────────────────────

export interface ProjectPaginationResponse {
    data: Project[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ProjectTaskPaginationResponse {
    data: ProjectTask[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ProjectStats {
    inprogress: number;
    done: number;
    overdue: number;
    pending_approval: number;
    blocked: number;
    review: number;
    total: number;
    completed_percentage: number;
}

export interface TaskAssignmentResponse {
    task: ProjectTask;
    assigned_to: ProjectUser;
    assigned_at: string;
}

// ─── Activity/Log Types ───────────────────────────────────────────────────

export type ActivityType = 
    | 'project_created'
    | 'project_updated'
    | 'task_created'
    | 'task_updated'
    | 'task_assigned'
    | 'task_status_changed'
    | 'task_completed'
    | 'comment_added'
    | 'file_uploaded'
    | 'subtask_completed'
    | 'member_added'
    | 'member_removed';

export interface ProjectActivity {
    id: string;
    project_id: string;
    task_id?: string;
    user_id: string;
    user_name: string;
    activity_type: ActivityType;
    description: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}

// ─── Component Props ──────────────────────────────────────────────────────

export interface TaskCardProps {
    task: ProjectTask;
    onTaskClick?: (task: ProjectTask) => void;
    onStatusChange?: (taskId: string, newStatus: ProjectTaskStatus) => void;
    onAssigneeChange?: (taskId: string, userId: string) => void;
    onEdit?: (task: ProjectTask) => void;
    onDelete?: (taskId: string) => void;
    isEditable?: boolean;
    isDraggable?: boolean;
}

// ─── Display Constants ────────────────────────────────────────────────────

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
    critical: 'Critical',
};

export const PROJECT_PRIORITY_COLORS: Record<ProjectPriority, string> = {
    low: 'bg-slate-100 text-slate-600',
    normal: 'bg-emerald-100 text-emerald-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
    critical: 'bg-rose-100 text-rose-700',
};

export const PROJECT_TASK_STATUS_LABELS: Record<ProjectTaskStatus, string> = {
    inprogress: 'In Progress',
    done: 'Done',
    overdue: 'Overdue',
    pending_approval: 'Pending Approval',
    blocked: 'Blocked',
    review: 'In Review',
};

export const PROJECT_TASK_STATUS_COLORS: Record<ProjectTaskStatus, string> = {
    inprogress: 'bg-blue-100 text-blue-700',
    done: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-rose-100 text-rose-700',
    pending_approval: 'bg-purple-100 text-purple-700',
    blocked: 'bg-red-100 text-red-700',
    review: 'bg-amber-100 text-amber-700',
};

// ─── Status Transition Helpers ────────────────────────────────────────────

export const TASK_STATUS_TRANSITIONS: Record<ProjectTaskStatus, ProjectTaskStatus[]> = {
    inprogress: ['done', 'blocked', 'pending_approval', 'review'],
    done: ['inprogress', 'review', 'pending_approval'],
    overdue: ['inprogress', 'done', 'blocked', 'pending_approval'],
    pending_approval: ['done', 'inprogress', 'blocked', 'review'],
    blocked: ['inprogress', 'pending_approval'],
    review: ['done', 'inprogress', 'pending_approval', 'blocked'],
};

export const canTransitionTo = (
    currentStatus: ProjectTaskStatus,
    newStatus: ProjectTaskStatus
): boolean => {
    return TASK_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
};

export const getAvailableStatuses = (currentStatus: ProjectTaskStatus): ProjectTaskStatus[] => {
    return TASK_STATUS_TRANSITIONS[currentStatus] || [];
};