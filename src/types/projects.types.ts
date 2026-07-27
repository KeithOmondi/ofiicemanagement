// src/types/projects.types.ts

export type ProjectTaskStatus = 'todo' | 'inprogress' | 'done' | 'overdue' | 'pending_approval' | 'blocked' | 'review';
export type ProjectPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type ProjectTaskType = 'task' | 'bug' | 'feature' | 'improvement' | 'support' | 'maintenance';
export type ProjectVisibility = 'public' | 'private' | 'team';

export interface ProjectUser {
    id: string;
    full_name: string;
    pj_number: string;
    email: string;
}

export interface ProjectSubtask {
    id: string;
    task_id: string;
    title: string;
    description: string | null;
    completed: boolean;
    is_active: boolean;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectTaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface ProjectTask {
    id: string;
    project_id: string | null;
    title: string;
    description: string | null;
    status: ProjectTaskStatus;
    priority: ProjectPriority;
    type: ProjectTaskType;
    assignee: string | null;
    assignee_name: string | null;
    deadline: string;
    start_date: string | null;
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
    subtasks?: ProjectSubtask[];
    comments?: ProjectTaskComment[];
}

export interface Project {
    id: string;
    title: string;
    description: string | null;
    priority: ProjectPriority;
    deadline: string;
    tags: string[];
    members: ProjectUser[];
    tasks?: ProjectTask[];
    task_count?: number;
    completed_task_count?: number;
    is_active: boolean;
    created_by: string;
    created_by_name?: string;
    created_at: string;
    updated_at: string;
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateProjectInput {
    title: string;
    description?: string;
    priority?: ProjectPriority;
    deadline?: string;
    tags?: string[];
    member_ids?: string[];
}

export interface UpdateProjectInput {
    title?: string;
    description?: string | null;
    priority?: ProjectPriority;
    deadline?: string | null;
    tags?: string[];
}

export interface CreateProjectTaskInput {
    project_id?: string;
    title: string;
    description?: string;
    status?: ProjectTaskStatus;
    priority?: ProjectPriority;
    type?: ProjectTaskType;
    assignee?: string;
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
    type?: ProjectTaskType;
    assignee?: string | null;
    deadline?: string | null;
    start_date?: string | null;
    tags?: string[];
    estimated_hours?: number | null;
    actual_hours?: number | null;
    parent_task_id?: string | null;
    visibility?: ProjectVisibility;
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
}

export interface UpdateProjectCommentInput {
    content: string;
}

// ─── Query Types ──────────────────────────────────────────────────────────────

export interface ProjectTaskFilters {
    project_id?: string;
    status?: ProjectTaskStatus;
    priority?: ProjectPriority;
    type?: ProjectTaskType;
    assignee?: string;
    tags?: string[] | string;
    search?: string;
    deadline_from?: string;
    deadline_to?: string;
    page?: number;
    limit?: number;
    sort_by?: 'created_at' | 'deadline' | 'priority' | 'status' | 'title';
    sort_order?: 'ASC' | 'DESC';
}

export interface ProjectFilters {
    search?: string;
    page?: number;
    limit?: number;
}

// ─── Response Types ──────────────────────────────────────────────────────────

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
    todo: number;
    inprogress: number;
    done: number;
    overdue: number;
    pending_approval: number;
    blocked: number;
    review: number;
    total: number;
}

// ─── Display Constants ──────────────────────────────────────────────────────

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
    todo: 'To Do',
    inprogress: 'In Progress',
    done: 'Done',
    overdue: 'Overdue',
    pending_approval: 'Pending Approval',
    blocked: 'Blocked',
    review: 'Review',
};

export const PROJECT_TASK_STATUS_COLORS: Record<ProjectTaskStatus, string> = {
    todo: 'bg-slate-100 text-slate-600',
    inprogress: 'bg-blue-100 text-blue-700',
    done: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-rose-100 text-rose-700',
    pending_approval: 'bg-purple-100 text-purple-700',
    blocked: 'bg-red-100 text-red-700',
    review: 'bg-amber-100 text-amber-700',
};

export const PROJECT_TASK_TYPE_LABELS: Record<ProjectTaskType, string> = {
    task: 'Task',
    bug: 'Bug',
    feature: 'Feature',
    improvement: 'Improvement',
    support: 'Support',
    maintenance: 'Maintenance',
};