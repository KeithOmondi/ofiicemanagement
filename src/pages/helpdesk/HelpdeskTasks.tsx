// src/pages/helpdesk/HelpdeskTasks.tsx

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchProjects,
  fetchTasks,
  createTask,
  deleteTask,
  createProject,
  selectAllProjects,
  selectStandaloneTasks,
  selectTasksLoading,
  selectTasksError,
  selectStats,
  toggleTaskDone,
  clearSelectedTask,
  fetchFullTask,
  selectSelectedTask,
  selectSelectedTaskDetails,
  fetchMembers,
  selectMembers,
} from '../../store/slices/tasksSlice';
import {
  selectAllUsers,
  selectCurrentUser,
  fetchUsers,
  fetchCurrentUser,
} from '../../store/slices/userSlice';
import type { 
  Task, 
  TaskStatus, 
  Priority, 
  MemberCode, 
  CreateTaskInput,
  TaskType,
  TaskVisibility,
} from '../../types/tasks.types';
import type { User } from '../../store/slices/userSlice';
import { toast } from 'react-hot-toast';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

// ─── Constants ──────────────────────────────────────────────────────────────
// Office task types - free text, users can add custom types
const DEFAULT_TASK_TYPES: TaskType[] = [
  'Meeting',
  'Report',
  'Email',
  'Call',
  'Document',
  'Review',
  'Approval',
  'Follow-up',
  'Presentation',
  'Training',
  'Onboarding',
  'Interview',
  'Travel',
  'Event',
  'Maintenance',
  'Support',
  'Project',
  'Research',
  'Analysis',
  'Design'
];

const TASK_VISIBILITIES: TaskVisibility[] = ['public', 'private', 'team'];
const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent', 'critical'];
// STATUSES is used in the status select dropdown in the UI

//const STATUSES: TaskStatus[] = ['todo', 'inprogress', 'done', 'overdue', 'pending_approval', 'blocked', 'review'];

// ─── Spinner Component ──────────────────────────────────────────────────────
const Spinner: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Priority Badge ─────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  normal: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  high: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  urgent: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
  critical: 'Critical',
};

const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => (
  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${PRIORITY_STYLES[priority]}`}>
    {(priority === 'urgent' || priority === 'critical') && (
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-500" />
    )}
    {priority === 'high' && (
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
    )}
    {PRIORITY_LABELS[priority]}
  </span>
);

// ─── Status Badge ───────────────────────────────────────────────────────────
const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  inprogress: 'bg-blue-50 text-blue-700 border-blue-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
  review: 'bg-purple-50 text-purple-700 border-purple-200',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  inprogress: 'In Progress',
  done: 'Done',
  overdue: 'Overdue',
  pending_approval: 'Pending Approval',
  blocked: 'Blocked',
  review: 'Review',
};

const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}>
    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
      status === 'done' ? 'bg-emerald-500' : 
      status === 'inprogress' ? 'bg-blue-500' : 
      status === 'blocked' ? 'bg-red-500' :
      status === 'review' ? 'bg-purple-500' :
      'bg-zinc-400'
    }`} />
    {STATUS_LABELS[status]}
  </span>
);

// ─── Date Helpers ───────────────────────────────────────────────────────────
const formatDate = (dateStr: string): string => {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string): string => {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
  } catch {
    return dateStr;
  }
};

const getDeadlineStatus = (deadline: string): 'overdue' | 'today' | 'tomorrow' | 'upcoming' | null => {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (isPast(date) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  return 'upcoming';
};

const getColorFromId = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
};

// ─── Member Avatar ──────────────────────────────────────────────────────────
const MemberAvatar: React.FC<{ userId: string | null; size?: number; usersMap: Record<string, User> }> = ({ 
  userId, 
  size = 24, 
  usersMap 
}) => {
  if (!userId) return null;
  const user = usersMap[userId];
  if (!user) return null;
  
  return (
    <div
      className="inline-flex items-center justify-center rounded-full ring-2 ring-white flex-shrink-0 select-none shadow-sm font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.floor(size * 0.38),
        background: getColorFromId(userId),
        color: '#fff',
      }}
      title={user.full_name}
    >
      {user.pj_number || userId.slice(0, 2).toUpperCase()}
    </div>
  );
};

// ─── Task Card ──────────────────────────────────────────────────────────────
interface TaskCardProps {
  task: Task;
  projectTitle?: string;
  projectMembers?: string[];
  onToggle: (taskId: string, projectId: string | null) => void;
  onView: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  usersMap: Record<string, User>;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  projectTitle, 
  projectMembers = [],
  onToggle, 
  onView, 
  onDelete,
  usersMap,
}) => {
  const deadlineStatus = getDeadlineStatus(task.deadline);

  const deadlineBadge = {
    overdue: { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Overdue', icon: '⚠️' },
    today: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Due Today', icon: '📅' },
    tomorrow: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Due Tomorrow', icon: '📅' },
    upcoming: { bg: 'bg-zinc-50 text-zinc-600 border-zinc-200', text: formatDate(task.deadline), icon: '📅' },
  };

  const currentDeadline = deadlineStatus ? deadlineBadge[deadlineStatus] : null;

  return (
    <div className="group relative rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start gap-3.5">
        {/* Toggle Button */}
        <button
          onClick={() => onToggle(task.id, task.project_id)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            task.status === 'done'
              ? 'border-[#1E3F20] bg-[#1E3F20] text-white'
              : 'border-zinc-300 bg-white hover:border-[#1E3F20]'
          }`}
          aria-label="Toggle task status"
        >
          {task.status === 'done' && (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content Body */}
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onView(task.id)}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className={`text-sm font-semibold transition-colors ${task.status === 'done' ? 'text-zinc-400 line-through' : 'text-zinc-800 group-hover:text-[#1E3F20]'}`}>
              {task.title}
            </h4>
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {task.type && (
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                {task.type}
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-zinc-500 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
          )}

          {/* Progress bar if present */}
          {task.progress > 0 && task.status !== 'done' && (
            <div className="my-2.5 w-full">
              <div className="flex justify-between text-[11px] text-zinc-500 font-medium mb-1">
                <span>Progress</span>
                <span>{task.progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-[#1E3F20] rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {task.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Card Footer Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 pt-1">
            {projectTitle && (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                <svg className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {projectTitle}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 text-zinc-600">
              {task.assignee === 'GROUP' 
                ? projectMembers.map((m) => (
                    <MemberAvatar key={m} userId={m} size={20} usersMap={usersMap} />
                  ))
                : <MemberAvatar userId={task.assignee} size={20} usersMap={usersMap} />
              }
              <span>{task.assignee === 'GROUP' ? 'All Members' : task.assignee}</span>
            </span>

            {currentDeadline && (
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${currentDeadline.bg}`}>
                <span>{currentDeadline.icon}</span>
                <span>{currentDeadline.text}</span>
              </span>
            )}
          </div>
        </div>

        {/* Hover Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onView(task.id)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            title="View Details"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Delete Task"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Stats Dashboard Cards ───────────────────────────────────────────────────
interface StatsBarProps {
  stats: { todo: number; inprogress: number; overdue: number; done: number };
  loading?: boolean;
}

const StatsBar: React.FC<StatsBarProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-zinc-200" />
              <div className="flex-1">
                <div className="h-6 w-12 bg-zinc-200 rounded" />
                <div className="h-3 w-16 bg-zinc-200 rounded mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 font-bold">
          📋
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 leading-none">{stats.todo}</p>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-1">To Do</p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 font-bold">
          ⏳
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-900 leading-none">{stats.inprogress}</p>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-1">In Progress</p>
        </div>
      </div>

      <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4 shadow-sm flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 font-bold">
          🚨
        </div>
        <div>
          <p className="text-2xl font-bold text-rose-900 leading-none">{stats.overdue}</p>
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mt-1">Overdue</p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 font-bold">
          ✅
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-900 leading-none">{stats.done}</p>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mt-1">Completed</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const HelpdeskTasks: React.FC = () => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector(selectAllProjects);
  const standaloneTasks = useAppSelector(selectStandaloneTasks);
  const loading = useAppSelector(selectTasksLoading);
  const error = useAppSelector(selectTasksError);
  const stats = useAppSelector(selectStats);
  const selectedTask = useAppSelector(selectSelectedTask);
  const selectedTaskDetails = useAppSelector(selectSelectedTaskDetails);
  const users = useAppSelector(selectAllUsers);
  const members = useAppSelector(selectMembers);
  const currentUser = useAppSelector(selectCurrentUser);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customTaskType, setCustomTaskType] = useState('');

  // Form State for Task
  const [newTask, setNewTask] = useState<CreateTaskInput>({
    title: '',
    description: '',
    assignee: 'GROUP',
    priority: 'normal',
    deadline: '',
    start_date: null,
    project_id: null,
    type: '',
    visibility: 'team',
    tags: [],
    estimated_hours: null,
    parent_task_id: null,
  });

  // Form State for Project
  const [newProject, setNewProject] = useState<{
    title: string;
    description: string;
    deadline: string;
    priority: Priority;
    members: MemberCode[];
  }>({
    title: '',
    description: '',
    deadline: '',
    priority: 'normal',
    members: [],
  });

  // ── Build users map ──
  const usersMap = useMemo(() => {
    const map = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, User>);
    
    if (currentUser && !map[currentUser.id]) {
      map[currentUser.id] = currentUser;
    }
    return map;
  }, [users, currentUser]);

  // ── Fetch data on mount ──
  useEffect(() => {
    dispatch(fetchUsers({
      page: 1,
      limit: 100,
      sort_by: 'created_at',
      sort_order: 'DESC'
    }));
    dispatch(fetchCurrentUser());
    dispatch(fetchMembers());
    dispatch(fetchProjects());
    dispatch(fetchTasks({}));
  }, [dispatch]);

  // ── Error handling ──
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // ── Handlers ──
  const handleToggleTask = useCallback((taskId: string, projectId: string | null) => {
    dispatch(toggleTaskDone({ taskId, projectId }));
  }, [dispatch]);

  const handleViewTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskDetails(true);
    dispatch(fetchFullTask(taskId));
  }, [dispatch]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await dispatch(deleteTask(taskId)).unwrap();
      toast.success('Task deleted successfully');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete task');
    }
  }, [dispatch]);

  const handleCreateTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.deadline) {
      toast.error('Title and deadline are required');
      return;
    }

    try {
      await dispatch(createTask({ 
        ...newTask, 
        start_date: newTask.start_date || null,
        tags: newTask.tags || [],
        estimated_hours: newTask.estimated_hours || null,
        parent_task_id: newTask.parent_task_id || null,
        type: newTask.type || 'Task',
      })).unwrap();
      toast.success('Task created successfully');
      setShowCreateModal(false);
      setNewTask({
        title: '',
        description: '',
        assignee: 'GROUP',
        priority: 'normal',
        deadline: '',
        start_date: null,
        project_id: null,
        type: '',
        visibility: 'team',
        tags: [],
        estimated_hours: null,
        parent_task_id: null,
      });
      setCustomTaskType('');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to create task');
    }
  }, [dispatch, newTask]);

  const handleCreateProject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim() || !newProject.deadline) {
      toast.error('Title and deadline are required');
      return;
    }

    try {
      await dispatch(createProject({
        ...newProject,
        owner_id: currentUser?.id || '',
        tags: [],
        start_date: null,
        status: 'active',
      })).unwrap();
      toast.success('Project created successfully');
      setShowProjectModal(false);
      setNewProject({
        title: '',
        description: '',
        deadline: '',
        priority: 'normal',
        members: [],
      });
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to create project');
    }
  }, [dispatch, newProject, currentUser]);

  

  const toggleMemberSelection = useCallback((member: MemberCode) => {
    setNewProject((prev) => ({
      ...prev,
      members: prev.members.includes(member)
        ? prev.members.filter((m) => m !== member)
        : [...prev.members, member],
    }));
  }, []);

  const closeTaskDetails = useCallback(() => {
    setShowTaskDetails(false);
    setSelectedTaskId(null);
    setIsEditing(false);
    dispatch(clearSelectedTask());
  }, [dispatch]);

  // ─── Available members for assignment ──
  const availableMembers = useMemo(() => {
    const memberCodes: MemberCode[] = ['RHC', 'AO'];
    members.forEach(m => {
      if (m.id && !memberCodes.includes(m.id as MemberCode)) {
        memberCodes.push(m.id as MemberCode);
      }
    });
    return memberCodes;
  }, [members]);

  // ─── Task type handling ──
  const handleTaskTypeChange = (value: string) => {
    setNewTask({ ...newTask, type: value });
    if (!DEFAULT_TASK_TYPES.includes(value as TaskType)) {
      setCustomTaskType(value);
    } else {
      setCustomTaskType('');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 p-4 sm:p-6 lg:p-8 font-sans text-zinc-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E3F20]">
              Office Tasks
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Track office tasks, monitor project progression, and assign tickets.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProjectModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition shadow-sm"
            >
              <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              New Project
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E3F20] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173219] transition shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <StatsBar stats={stats} loading={loading} />

        {/* Loading Spinner */}
        {loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner className="h-8 w-8 text-[#1E3F20]" />
            <p className="text-sm text-zinc-500 font-medium">Fetching dashboard tasks...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-red-700 mb-2">Error Loading Tasks</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button 
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              onClick={() => {
                dispatch(fetchProjects());
                dispatch(fetchTasks({}));
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Project & Task Sections */}
        {!loading && !error && (
          <div className="space-y-8">
            {/* Projects Overview */}
            {projects.map((project) => {
              const completedCount = project.tasks.filter((t) => t.status === 'done').length;
              const totalCount = project.tasks.length;
              const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

              return (
                <div key={project.id} className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
                  {/* Project Header Banner */}
                  <div className="border-b border-zinc-100 bg-zinc-50/50 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-lg font-bold text-zinc-900">{project.title}</h2>
                          <PriorityBadge priority={project.priority} />
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            project.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                            project.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                            project.status === 'archived' ? 'bg-zinc-100 text-zinc-600' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-xs text-zinc-500">{project.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            📅 Due {formatDate(project.deadline)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            👥 {project.members.length} members assigned
                          </span>
                          {project.tags && project.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                🏷️ {project.tags.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Project Completion Bar */}
                      <div className="sm:w-48 shrink-0">
                        <div className="flex justify-between text-xs font-semibold text-zinc-600 mb-1.5">
                          <span>Progress</span>
                          <span>{completedCount}/{totalCount} Done ({progressPercentage}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              progressPercentage === 100 ? 'bg-emerald-500' : 'bg-[#1E3F20]'
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="p-5 space-y-3">
                    {project.tasks.length === 0 ? (
                      <div className="py-6 text-center border-2 border-dashed border-zinc-100 rounded-xl">
                        <p className="text-xs text-zinc-400 font-medium">No tasks assigned to this project yet.</p>
                      </div>
                    ) : (
                      project.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          projectTitle={project.title}
                          projectMembers={project.members}
                          onToggle={handleToggleTask}
                          onView={handleViewTask}
                          onDelete={handleDeleteTask}
                          usersMap={usersMap}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {/* Standalone Tasks Section */}
            {standaloneTasks.length > 0 && (
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                  <h2 className="text-base font-bold text-zinc-900">Standalone Tasks</h2>
                  <span className="text-xs font-semibold text-zinc-400">{standaloneTasks.length} total</span>
                </div>
                <div className="space-y-3">
                  {standaloneTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={handleToggleTask}
                      onView={handleViewTask}
                      onDelete={handleDeleteTask}
                      usersMap={usersMap}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Zero State */}
            {projects.length === 0 && standaloneTasks.length === 0 && !loading && (
              <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-2xl mb-3">
                  📂
                </div>
                <h3 className="text-base font-semibold text-zinc-800">No active tasks found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Get started by creating your first task or establishing a new project structure above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Create Task Modal ────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-zinc-100 p-6 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Create New Task</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition"
                  placeholder="E.g. Draft Q3 Report"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none resize-none transition"
                  placeholder="Add details, instructions, or scope..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Task Type</label>
                  <div className="flex gap-2">
                    <select
                      value={newTask.type}
                      onChange={(e) => handleTaskTypeChange(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition bg-white"
                    >
                      <option value="">Select Type</option>
                      {DEFAULT_TASK_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      <option value="__custom__">+ Custom Type</option>
                    </select>
                    {customTaskType && (
                      <input
                        type="text"
                        value={newTask.type}
                        onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                        className="w-32 rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition"
                        placeholder="Custom type"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Visibility</label>
                  <select
                    value={newTask.visibility}
                    onChange={(e) => setNewTask({ ...newTask, visibility: e.target.value as TaskVisibility })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition bg-white"
                  >
                    {TASK_VISIBILITIES.map((vis) => (
                      <option key={vis} value={vis}>{vis.charAt(0).toUpperCase() + vis.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Assignee</label>
                  <select
  value={newTask.assignee || 'GROUP'}
  onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value as MemberCode | 'GROUP' })}
  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition bg-white"
>
  <option value="GROUP">All Members</option>
  {availableMembers.map((member) => (
    <option key={member} value={member}>{member}</option>
  ))}
</select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Priority })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition bg-white"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Deadline *</label>
                  <input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newTask.start_date || ''}
                    onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value || null })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Estimated Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={newTask.estimated_hours || ''}
                  onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition"
                  placeholder="E.g. 2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTask.tags?.join(', ') || ''}
                  onChange={(e) => setNewTask({ 
                    ...newTask, 
                    tags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(Boolean) : [] 
                  })}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition"
                  placeholder="E.g. urgent, finance, quarterly"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Project (Optional)</label>
                {/* FIX: Use empty string instead of null for select value */}
                <select
                  value={newTask.project_id || ''}
                  onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value || null })}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition bg-white"
                >
                  <option value="">Standalone Task (No Project)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#1E3F20] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173219] transition shadow-sm"
                  disabled={loading}
                >
                  {loading ? <Spinner className="h-4 w-4 mx-auto" /> : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Create Project Modal ────────────────────────────────────────────── */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-zinc-100 p-6 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Create New Project</h2>
              <button
                onClick={() => setShowProjectModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition"
                  placeholder="E.g. Q4 Office Initiatives"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none resize-none transition"
                  placeholder="Scope or objectives of this project..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Deadline *</label>
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Priority</label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value as Priority })}
                    className="w-full rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:border-[#1E3F20] focus:ring-2 focus:ring-[#1E3F20]/10 focus:outline-none transition bg-white"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Assigned Members</label>
                <div className="flex gap-2 flex-wrap">
                  {availableMembers.map((member) => {
                    const isSelected = newProject.members.includes(member);
                    return (
                      <button
                        key={member}
                        type="button"
                        onClick={() => toggleMemberSelection(member)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                          isSelected
                            ? 'bg-[#1E3F20] border-[#1E3F20] text-white'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {member} {isSelected ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#1E3F20] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173219] transition shadow-sm"
                  disabled={loading}
                >
                  {loading ? <Spinner className="h-4 w-4 mx-auto" /> : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Task Details Modal ───────────────────────────────────────────────── */}
      {showTaskDetails && selectedTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white shadow-xl border border-zinc-100 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <h2 className="text-base font-bold text-zinc-900">Task Overview</h2>
              <div className="flex items-center gap-2">
                {selectedTask && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
                    title={isEditing ? "Cancel Edit" : "Edit Task"}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={closeTaskDetails}
                  className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loading && !selectedTask ? (
                <div className="flex justify-center py-12">
                  <Spinner className="h-6 w-6 text-[#1E3F20]" />
                </div>
              ) : selectedTask ? (
                <div className="space-y-6">
                  {/* Task Title and Status */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">{selectedTask.title}</h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <StatusBadge status={selectedTask.status} />
                        <PriorityBadge priority={selectedTask.priority} />
                        {selectedTask.type && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                            {selectedTask.type}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedTask.progress > 0 && (
                      <div className="text-right">
                        <span className="text-sm font-bold text-zinc-700">{selectedTask.progress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedTask.description && (
                    <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Description</h4>
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  )}

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                      <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Assignee</h5>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedTask.assignee === 'GROUP' ? (
                          <span className="text-sm font-medium text-zinc-700">All Members</span>
                        ) : (
                          <>
                            <MemberAvatar userId={selectedTask.assignee} size={24} usersMap={usersMap} />
                            <span className="text-sm font-medium text-zinc-700">{selectedTask.assignee}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                      <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Deadline</h5>
                      <p className="text-sm font-medium text-zinc-700 mt-1">{formatDate(selectedTask.deadline)}</p>
                    </div>

                    <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                      <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Start Date</h5>
                      <p className="text-sm font-medium text-zinc-700 mt-1">
                        {selectedTask.start_date ? formatDate(selectedTask.start_date) : 'Not set'}
                      </p>
                    </div>

                    <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                      <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Estimated Hours</h5>
                      <p className="text-sm font-medium text-zinc-700 mt-1">
                        {selectedTask.estimated_hours ? `${selectedTask.estimated_hours}h` : 'Not set'}
                      </p>
                    </div>

                    <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                      <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Actual Hours</h5>
                      <p className="text-sm font-medium text-zinc-700 mt-1">
                        {selectedTask.actual_hours ? `${selectedTask.actual_hours}h` : 'Not tracked'}
                      </p>
                    </div>

                    <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                      <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Visibility</h5>
                      <p className="text-sm font-medium text-zinc-700 mt-1 capitalize">{selectedTask.visibility}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedTask.tags && selectedTask.tags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tags</h4>
                      <div className="flex gap-1 flex-wrap">
                        {selectedTask.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subtasks */}
                  {selectedTaskDetails?.subtasks && selectedTaskDetails.subtasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Subtasks ({selectedTaskDetails.subtasks.filter(s => s.completed).length}/{selectedTaskDetails.subtasks.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedTaskDetails.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-3 bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              subtask.completed ? 'bg-[#1E3F20] border-[#1E3F20]' : 'border-zinc-300'
                            }`}>
                              {subtask.completed && (
                                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-sm flex-1 ${subtask.completed ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>
                              {subtask.title}
                            </span>
                            {subtask.assigned_to && (
                              <MemberAvatar userId={subtask.assigned_to} size={20} usersMap={usersMap} />
                            )}
                            {subtask.due_date && (
                              <span className="text-xs text-zinc-500">{formatDate(subtask.due_date)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Created/Updated Info */}
                  <div className="text-xs text-zinc-400 border-t border-zinc-100 pt-4">
                    <p>Created by {selectedTask.created_by_name} on {formatDateTime(selectedTask.created_at.toString())}</p>
                    {selectedTask.updated_at && (
                      <p>Updated on {formatDateTime(selectedTask.updated_at.toString())}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📄</div>
                  <p className="text-sm text-zinc-500">Task not found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpdeskTasks;