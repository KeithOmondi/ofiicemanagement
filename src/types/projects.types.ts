// src/types/projects.types.ts

export type ProjectTaskStatus = 'todo' | 'inprogress' | 'done' | 'overdue' | 'pending_approval' | 'blocked' | 'review';
export type ProjectPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type ProjectVisibility = 'public' | 'private' | 'team';
export type ChecklistStatus = 'completed' | 'in_progress' | 'no_progress' | 'pending';

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
    type?: string | null; // Free text field
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
    
    // Checklist-specific fields
    checklist_status?: ChecklistStatus;
    next_steps?: string | null;
    team_lead?: string | null;
    serial_number?: number | null;
    category?: string | null;
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
    description?: string | null;
    status?: ProjectTaskStatus;
    priority?: ProjectPriority;
    type?: string | null; // Free text field
    assignee?: string | null;
    deadline?: string;
    start_date?: string | null;
    tags?: string[];
    estimated_hours?: number;
    parent_task_id?: string | null;
    visibility?: ProjectVisibility;
    
    // Checklist-specific fields
    checklist_status?: ChecklistStatus;
    next_steps?: string | null;
    team_lead?: string | null;
    serial_number?: number | null;
    category?: string | null;
}

export interface UpdateProjectTaskInput {
    project_id?: string | null;
    title?: string;
    description?: string | null;
    status?: ProjectTaskStatus;
    priority?: ProjectPriority;
    type?: string | null; // Free text field
    assignee?: string | null;
    deadline?: string | null;
    start_date?: string | null;
    tags?: string[];
    estimated_hours?: number | null;
    actual_hours?: number | null;
    parent_task_id?: string | null;
    visibility?: ProjectVisibility;
    
    // Checklist-specific fields
    checklist_status?: ChecklistStatus;
    next_steps?: string | null;
    team_lead?: string | null;
    serial_number?: number | null;
    category?: string | null;
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
    type?: string; // Free text field
    assignee?: string;
    tags?: string[] | string;
    search?: string;
    deadline_from?: string;
    deadline_to?: string;
    page?: number;
    limit?: number;
    sort_by?: 'created_at' | 'deadline' | 'priority' | 'status' | 'title';
    sort_order?: 'ASC' | 'DESC';
    
    // Checklist-specific filters
    checklist_status?: ChecklistStatus;
    category?: string;
    team_lead?: string;
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

// ─── Checklist-Specific Types ──────────────────────────────────────────────

export interface ChecklistTask {
    serial_number: number;
    activity: string;
    status: ChecklistStatus;
    next_steps: string | null;
    team_lead: string | null;
    category: string | null;
    task_id?: string;
    description?: string | null;
    deadline?: string | null;
    priority?: string | null;
    assignee_name?: string | null;
}

export interface ChecklistSection {
    category: string;
    total: number;
    completed: number;
    in_progress: number;
    no_progress: number;
    pending: number;
    tasks?: ChecklistTask[];
}

export interface ChecklistStats {
    total: number;
    completed: number;
    in_progress: number;
    no_progress: number;
    pending: number;
    sections: ChecklistSection[];
    completion_percentage: number;
}

// ─── Component Props Types ──────────────────────────────────────────────────

export interface ChecklistTableProps {
    tasks: ChecklistTask[];
    onStatusChange: (serialNumber: number, status: ChecklistStatus) => void;
    onNextStepsUpdate: (serialNumber: number, nextSteps: string) => void;
    onTeamLeadUpdate: (serialNumber: number, teamLead: string) => void;
    onTaskClick?: (taskId: string) => void;
    isLoading?: boolean;
}

export interface ChecklistFilters {
    category?: string;
    status?: ChecklistStatus;
    team_lead?: string;
    search?: string;
    page?: number;
    limit?: number;
}

// ─── Additional Utility Types ──────────────────────────────────────────────

export interface ChecklistStatsResponse {
    stats: ChecklistStats;
    categories: string[];
}

export interface ChecklistBulkUpdateResult {
    success: boolean;
    updated_count: number;
    failed_ids?: string[];
    errors?: Array<{ id: string; error: string }>;
}

export interface ChecklistReorderResult {
    success: boolean;
    reordered_count: number;
    category?: string | null;
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

// ─── Checklist Status Display Constants ──────────────────────────────────────

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
    completed: 'Completed',
    in_progress: 'In Progress',
    no_progress: 'No Progress',
    pending: 'Pending',
};

export const CHECKLIST_STATUS_COLORS: Record<ChecklistStatus, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-blue-100 text-blue-700',
    no_progress: 'bg-slate-100 text-slate-600',
    pending: 'bg-amber-100 text-amber-700',
};

// ─── Checklist Status Icons ──────────────────────────────────────────────────

export const CHECKLIST_STATUS_ICONS: Record<ChecklistStatus, string> = {
    completed: '✅',
    in_progress: '🔄',
    no_progress: '⏸️',
    pending: '⏳',
};