import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  // Actions
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  fetchTasks,
  fetchStandaloneTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchProjectMembers,
  fetchTaskStats,
  setSelectedProject,
  setSelectedTask,
  updateTaskStatusLocally,
  clearError,
  clearSuccess,
  // Selectors
  selectProjects,
  selectSelectedProject,
  selectTasks,
  selectStandaloneTasks,
  selectSelectedTask,
  selectProjectMembers,
  selectTaskStats,
  selectProjectStats,
  selectProjectsLoading,
  selectTasksLoading,
  selectStandaloneTasksLoading,
  selectMembersLoading,
  selectStatsLoading,
  selectTasksMutating,
  selectTasksError,
  selectTasksSuccess,
  type Project,
  type Task,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '../../store/slices/tasksSlice';
import {
  Plus,
  Search,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Clock,
  ListTodo,
  Inbox,
  Users,
  RefreshCw,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

const getDefaultProjectDeadline = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
};

const getDefaultTaskDueDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().split('T')[0];
};

const getDefaultTaskStartDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// ─── UI Helpers ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: Task['status'] }) => {
  const styles: Record<Task['status'], { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    todo: { bg: 'bg-stone-100', text: 'text-stone-600', label: 'To Do', icon: <Inbox size={12} /> },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress', icon: <Clock size={12} /> },
    done: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Done', icon: <CheckCircle size={12} /> },
  };
  const { bg, text, label, icon } = styles[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: Task['priority'] }) => {
  const styles: Record<Task['priority'], { bg: string; text: string; label: string }> = {
    low: { bg: 'bg-stone-50', text: 'text-stone-500', label: 'Low' },
    medium: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Medium' },
    high: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'High' },
    urgent: { bg: 'bg-red-50', text: 'text-red-700', label: 'Urgent' },
  };
  const { bg, text, label } = styles[priority];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

const ProjectStatusBadge = ({ status }: { status: Project['status'] }) => {
  const styles: Record<Project['status'], { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Active' },
    completed: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Completed' },
    archived: { bg: 'bg-stone-50', text: 'text-stone-600', label: 'Archived' },
  };
  const { bg, text, label } = styles[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </label>
  );
}

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]';

function GoldButton({
  children,
  icon,
  type = 'button',
  disabled,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'success';
}) {
  const styles = {
    default: 'bg-[#c9a84c] text-[#1a3d1c] hover:bg-[#b8973f]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${styles[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon}
      {children}
    </button>
  );
}

function GhostButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

function ErrorBanner() {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectTasksError);
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
      <button onClick={() => dispatch(clearError())} className="text-red-500 hover:text-red-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function SuccessBanner() {
  const dispatch = useAppDispatch();
  const success = useAppSelector(selectTasksSuccess);
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
    return () => clearTimeout(timer);
  }, [success, dispatch]);
  if (!success) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <div className="flex items-start gap-2">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Operation completed successfully!</span>
      </div>
      <button onClick={() => dispatch(clearSuccess())} className="text-emerald-500 hover:text-emerald-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-2xl',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-xl bg-white`}>
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-stone-100 px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffTasks: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const projects = useAppSelector(selectProjects);
  const selectedProject = useAppSelector(selectSelectedProject);
  const tasks = useAppSelector(selectTasks);
  const standaloneTasks = useAppSelector(selectStandaloneTasks);
  const selectedTask = useAppSelector(selectSelectedTask);
  const projectMembers = useAppSelector(selectProjectMembers);
  const taskStats = useAppSelector(selectTaskStats);
  const projectStats = useAppSelector(selectProjectStats);
  const projectsLoading = useAppSelector(selectProjectsLoading);
  const tasksLoading = useAppSelector(selectTasksLoading);
  const standaloneLoading = useAppSelector(selectStandaloneTasksLoading);
  const membersLoading = useAppSelector(selectMembersLoading);
  const statsLoading = useAppSelector(selectStatsLoading);
  const mutating = useAppSelector(selectTasksMutating);

  // ── Local State ──────────────────────────────────────────────────────────
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; type: 'project' | 'task' } | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'projects' | 'tasks'>('projects');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ── Form State ─────────────────────────────────────────────────────────────
  const initialProjectForm = useMemo<CreateProjectInput>(() => ({
    name: '',
    description: '',
    priority: 'medium',
    deadline: getDefaultProjectDeadline(),
    member_ids: [],
  }), []);

  const [projectForm, setProjectForm] = useState<CreateProjectInput>(initialProjectForm);

  const initialTaskForm = useMemo<CreateTaskInput>(() => ({
    title: '',
    description: '',
    priority: 'medium',
    assignee_id: '',
    due_date: getDefaultTaskDueDate(),
    start_date: getDefaultTaskStartDate(),
    project_id: '',
  }), []);

  const [taskForm, setTaskForm] = useState<CreateTaskInput>(initialTaskForm);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTaskStats());
    dispatch(fetchStandaloneTasks());
  }, [dispatch]);

  useEffect(() => {
    if (selectedProject) {
      dispatch(fetchTasks(selectedProject.id));
      dispatch(fetchProjectMembers(selectedProject.id));
    }
  }, [dispatch, selectedProject]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const resetProjectForm = () => {
    setProjectForm(initialProjectForm);
    setEditingProject(null);
  };

  const resetTaskForm = () => {
    setTaskForm({ ...initialTaskForm, project_id: selectedProject?.id || '' });
    setEditingTask(null);
  };

  const handleOpenProjectModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        description: project.description || '',
        priority: project.priority,
        deadline: project.deadline.split('T')[0],
        member_ids: project.members?.map(m => m.user_id) || [],
      });
    } else {
      resetProjectForm();
    }
    setShowProjectModal(true);
  };

  const handleOpenTaskModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        assignee_id: task.assignee_id || '',
        due_date: task.due_date.split('T')[0],
        start_date: task.start_date?.split('T')[0] || getDefaultTaskStartDate(),
        project_id: task.project_id || '',
      });
    } else {
      resetTaskForm();
    }
    setShowTaskModal(true);
  };

  const handleCreateProject = async () => {
    if (!projectForm.name.trim() || !projectForm.deadline) return;
    try {
      if (editingProject) {
        const updateData: UpdateProjectInput = {
          name: projectForm.name,
          description: projectForm.description,
          priority: projectForm.priority,
          deadline: projectForm.deadline,
        };
        await dispatch(updateProject({ id: editingProject.id, input: updateData })).unwrap();
      } else {
        await dispatch(createProject(projectForm)).unwrap();
      }
      await dispatch(fetchProjects());
      await dispatch(fetchTaskStats());
      setShowProjectModal(false);
      resetProjectForm();
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title.trim() || !taskForm.due_date) return;
    try {
      if (editingTask) {
        const updateData: UpdateTaskInput = {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assignee_id: taskForm.assignee_id || null,
          due_date: taskForm.due_date,
          start_date: taskForm.start_date || null,
        };
        await dispatch(updateTask({ id: editingTask.id, input: updateData })).unwrap();
      } else {
        await dispatch(createTask({
          ...taskForm,
          project_id: taskForm.project_id || undefined,
        })).unwrap();
      }
      if (selectedProject) {
        await dispatch(fetchTasks(selectedProject.id));
      }
      await dispatch(fetchTaskStats());
      await dispatch(fetchStandaloneTasks());
      setShowTaskModal(false);
      resetTaskForm();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    try {
      if (showDeleteConfirm.type === 'project') {
        await dispatch(deleteProject(showDeleteConfirm.id)).unwrap();
        await dispatch(fetchProjects());
        await dispatch(fetchTaskStats());
        if (selectedProject?.id === showDeleteConfirm.id) {
          dispatch(setSelectedProject(null));
        }
      } else {
        await dispatch(deleteTask(showDeleteConfirm.id)).unwrap();
        if (selectedProject) {
          await dispatch(fetchTasks(selectedProject.id));
        }
        await dispatch(fetchTaskStats());
        await dispatch(fetchStandaloneTasks());
      }
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      // Optimistic update
      dispatch(updateTaskStatusLocally({ taskId, status }));
      await dispatch(updateTask({
        id: taskId,
        input: { status },
      })).unwrap();
      await dispatch(fetchTaskStats());
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleSelectProject = (project: Project) => {
    dispatch(setSelectedProject(project));
    setViewMode('tasks');
  };

  const handleBackToProjects = () => {
    dispatch(setSelectedProject(null));
    setViewMode('projects');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredTasks = (tasksList: Task[]) => {
    return tasksList.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[640px] w-full bg-stone-50 p-6">
      <ErrorBanner />
      <SuccessBanner />

      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Task Management</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage projects, tasks, and team assignments
            {taskStats && (
              <span className="ml-2 inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                  <CheckCircle size={12} />
                  {taskStats.done} done
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                  <Clock size={12} />
                  {taskStats.in_progress} in progress
                </span>
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'tasks' && selectedProject ? (
            <button
              onClick={handleBackToProjects}
              className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
            >
              ← Back to Projects
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => handleOpenProjectModal()}
            className="flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2.5 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
          >
            <Plus size={16} />
            {viewMode === 'tasks' && selectedProject ? 'Add Task' : 'New Project'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400">Total Projects</p>
          {statsLoading ? (
            <div className="h-6 w-8 animate-pulse rounded bg-stone-100" />
          ) : (
            <p className="text-lg font-bold text-stone-900">{projectStats?.total || 0}</p>
          )}
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400">Active Projects</p>
          {statsLoading ? (
            <div className="h-6 w-8 animate-pulse rounded bg-stone-100" />
          ) : (
            <p className="text-lg font-bold text-emerald-600">{projectStats?.active || 0}</p>
          )}
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400">Pending Tasks</p>
          {statsLoading ? (
            <div className="h-6 w-8 animate-pulse rounded bg-stone-100" />
          ) : (
            <p className="text-lg font-bold text-amber-600">{taskStats ? taskStats.todo + taskStats.in_progress : 0}</p>
          )}
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400">Completed Tasks</p>
          {statsLoading ? (
            <div className="h-6 w-8 animate-pulse rounded bg-stone-100" />
          ) : (
            <p className="text-lg font-bold text-emerald-600">{taskStats?.done || 0}</p>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={viewMode === 'tasks' ? 'Search tasks...' : 'Search projects...'}
            className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
          />
        </div>

        {viewMode === 'tasks' && (
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        )}

        <GhostButton
          icon={<RefreshCw size={14} />}
          onClick={() => {
            if (selectedProject) {
              dispatch(fetchTasks(selectedProject.id));
            } else {
              dispatch(fetchProjects());
              dispatch(fetchStandaloneTasks());
            }
            dispatch(fetchTaskStats());
          }}
        >
          Refresh
        </GhostButton>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Content Area */}
        <div>
          {viewMode === 'projects' ? (
            // Projects View
            <div>
              <h2 className="mb-3 text-base font-semibold text-stone-900">Projects</h2>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
                  <ListTodo className="mx-auto h-12 w-12 text-stone-300" />
                  <p className="mt-3 text-sm text-stone-400">No projects found</p>
                  <button
                    onClick={() => handleOpenProjectModal()}
                    className="mt-2 text-sm font-medium text-[#c9a84c] hover:underline"
                  >
                    Create your first project
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleSelectProject(project)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-stone-900 truncate">{project.name}</h3>
                          {project.description && (
                            <p className="mt-1 text-xs text-stone-500 line-clamp-2">{project.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                            <span>Deadline: {formatDate(project.deadline)}</span>
                            <span>•</span>
                            <span>Progress: {project.progress || 0}%</span>
                            <span>•</span>
                            <span>Tasks: {project.task_count || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ProjectStatusBadge status={project.status} />
                          <PriorityBadge priority={project.priority} />
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-[#1E4620] transition-all"
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenProjectModal(project); }}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ id: project.id, type: 'project' }); }}
                            className="rounded p-1 text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <span className="text-[10px] text-stone-400">
                          Created: {formatDate(project.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : selectedProject ? (
            // Tasks View for Selected Project
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-stone-900">
                  {selectedProject.name}
                  <span className="ml-2 text-sm font-normal text-stone-400">
                    ({selectedProject.task_count || 0} tasks)
                  </span>
                </h2>
                <button
                  onClick={() => handleOpenTaskModal()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-[#1a3d1c] hover:bg-[#b8973f]"
                >
                  <Plus size={14} />
                  Add Task
                </button>
              </div>

              {tasksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
                </div>
              ) : filteredTasks(tasks).length === 0 ? (
                <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
                  <ListTodo className="mx-auto h-12 w-12 text-stone-300" />
                  <p className="mt-3 text-sm text-stone-400">No tasks in this project</p>
                  <button
                    onClick={() => handleOpenTaskModal()}
                    className="mt-2 text-sm font-medium text-[#c9a84c] hover:underline"
                  >
                    Add your first task
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks(tasks).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => handleOpenTaskModal(task)}
                      onDelete={() => setShowDeleteConfirm({ id: task.id, type: 'task' })}
                      onStatusChange={(status) => handleUpdateTaskStatus(task.id, status)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Fallback - should not happen
            <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
              <p className="text-sm text-stone-400">Select a project to view tasks</p>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Standalone Tasks */}
          {viewMode === 'projects' && (
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <Inbox size={16} className="text-[#c9a84c]" />
                  Standalone Tasks
                </h3>
                <button
                  onClick={() => {
                    setTaskForm({ ...initialTaskForm, project_id: '' });
                    setEditingTask(null);
                    setShowTaskModal(true);
                  }}
                  className="text-xs font-medium text-[#c9a84c] hover:underline"
                >
                  + Add
                </button>
              </div>
              {standaloneLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#c9a84c]" />
                </div>
              ) : standaloneTasks.length === 0 ? (
                <p className="py-4 text-center text-xs text-stone-400">No standalone tasks</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {standaloneTasks.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-stone-100 p-3 hover:bg-stone-50 cursor-pointer"
                      onClick={() => {
                        dispatch(setSelectedTask(task));
                        setShowTaskDetail(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-stone-800 truncate">{task.title}</p>
                          <p className="text-[10px] text-stone-500">Due: {formatDate(task.due_date)}</p>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Project Members */}
          {selectedProject && (
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <Users size={16} className="text-[#c9a84c]" />
                  Team Members
                </h3>
                <span className="text-xs text-stone-400">{projectMembers.length} members</span>
              </div>
              {membersLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#c9a84c]" />
                </div>
              ) : projectMembers.length === 0 ? (
                <p className="py-4 text-center text-xs text-stone-400">No members assigned</p>
              ) : (
                <div className="space-y-2">
                  {projectMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 shrink-0 rounded-full bg-[#1E4620] flex items-center justify-center text-xs font-semibold text-white">
                          {member.user_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-stone-800 truncate">{member.user_name || 'Unknown'}</p>
                          {member.role && <p className="text-[10px] text-stone-400">{member.role}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Stats */}
          {viewMode === 'projects' && taskStats && (
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-stone-900 mb-3">Task Overview</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-600">To Do</span>
                  <span className="text-xs font-semibold text-stone-700">{taskStats.todo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-600">In Progress</span>
                  <span className="text-xs font-semibold text-amber-600">{taskStats.in_progress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-600">Done</span>
                  <span className="text-xs font-semibold text-emerald-600">{taskStats.done}</span>
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 pt-2">
                  <span className="text-xs font-medium text-stone-700">Total</span>
                  <span className="text-xs font-bold text-stone-900">{taskStats.todo + taskStats.in_progress + taskStats.done}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Project Modal ────────────────────────────────────────────────── */}
      {showProjectModal && (
        <ModalShell
          title={editingProject ? 'Edit Project' : 'Create New Project'}
          onClose={() => { setShowProjectModal(false); resetProjectForm(); }}
          footer={
            <>
              <GhostButton onClick={() => { setShowProjectModal(false); resetProjectForm(); }}>Cancel</GhostButton>
              <GoldButton onClick={handleCreateProject} disabled={mutating || !projectForm.name.trim() || !projectForm.deadline}>
                {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={14} />}
                {editingProject ? 'Save Changes' : 'Create Project'}
              </GoldButton>
            </>
          }
        >
          <ProjectForm formData={projectForm} setFormData={setProjectForm} />
        </ModalShell>
      )}

      {/* ─── Task Modal ───────────────────────────────────────────────────── */}
      {showTaskModal && (
        <ModalShell
          title={editingTask ? 'Edit Task' : 'Create New Task'}
          onClose={() => { setShowTaskModal(false); resetTaskForm(); }}
          footer={
            <>
              <GhostButton onClick={() => { setShowTaskModal(false); resetTaskForm(); }}>Cancel</GhostButton>
              <GoldButton onClick={handleCreateTask} disabled={mutating || !taskForm.title.trim() || !taskForm.due_date}>
                {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={14} />}
                {editingTask ? 'Save Changes' : 'Create Task'}
              </GoldButton>
            </>
          }
        >
          <TaskForm formData={taskForm} setFormData={setTaskForm} projectId={selectedProject?.id} />
        </ModalShell>
      )}

      {/* ─── Task Detail Modal ───────────────────────────────────────────── */}
      {showTaskDetail && selectedTask && (
        <ModalShell
          title="Task Details"
          onClose={() => { setShowTaskDetail(false); dispatch(setSelectedTask(null)); }}
          footer={
            <div className="flex w-full justify-between">
              <div className="flex gap-2">
                <GhostButton onClick={() => { setShowTaskDetail(false); dispatch(setSelectedTask(null)); }}>
                  Close
                </GhostButton>
              </div>
              <div className="flex gap-2">
                <GoldButton
                  variant="danger"
                  onClick={() => { setShowTaskDetail(false); setShowDeleteConfirm({ id: selectedTask.id, type: 'task' }); }}
                  icon={<Trash2 size={14} />}
                >
                  Delete
                </GoldButton>
                <GoldButton
                  onClick={() => {
                    setShowTaskDetail(false);
                    handleOpenTaskModal(selectedTask);
                  }}
                  icon={<Edit size={14} />}
                >
                  Edit
                </GoldButton>
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-stone-900">{selectedTask.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={selectedTask.status} />
                <PriorityBadge priority={selectedTask.priority} />
                {selectedTask.project_name && (
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                    {selectedTask.project_name}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-stone-400">Due Date</p>
                <p className="font-medium text-stone-800">{formatDate(selectedTask.due_date)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-400">Assignee</p>
                <p className="font-medium text-stone-800">{selectedTask.assignee_name || 'Unassigned'}</p>
              </div>
              {selectedTask.start_date && (
                <div>
                  <p className="text-xs text-stone-400">Start Date</p>
                  <p className="font-medium text-stone-800">{formatDate(selectedTask.start_date)}</p>
                </div>
              )}
              {selectedTask.completed_at && (
                <div>
                  <p className="text-xs text-stone-400">Completed</p>
                  <p className="font-medium text-stone-800">{formatDate(selectedTask.completed_at)}</p>
                </div>
              )}
            </div>

            {selectedTask.description && (
              <div>
                <p className="text-xs text-stone-400">Description</p>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{selectedTask.description}</p>
              </div>
            )}

            <div className="border-t border-stone-100 pt-3 text-xs text-stone-400">
              <p>Created: {new Date(selectedTask.created_at).toLocaleString()}</p>
              <p>Updated: {new Date(selectedTask.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ─── Delete Confirmation ──────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-2 flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-sm font-semibold">Confirm Delete</h3>
            </div>
            <p className="mb-4 text-sm text-stone-600">
              Are you sure you want to delete this {showDeleteConfirm.type}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setShowDeleteConfirm(null)}>Cancel</GhostButton>
              <button
                onClick={handleDelete}
                disabled={mutating}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Task Card Component ────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: Task['status']) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onStatusChange }) => {
  const statusOptions: { value: Task['status']; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-stone-900 truncate">{task.title}</h4>
          {task.description && (
            <p className="mt-1 text-xs text-stone-500 line-clamp-1">{task.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span>Due: {formatDate(task.due_date)}</span>
            {task.assignee_name && (
              <>
                <span>•</span>
                <span>Assignee: {task.assignee_name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value as Task['status'])}
            className="rounded-full border-0 bg-transparent text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <PriorityBadge priority={task.priority} />
          <button
            onClick={onEdit}
            className="rounded p-1 text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Project Form Component ──────────────────────────────────────────────────

interface ProjectFormProps {
  formData: CreateProjectInput;
  setFormData: React.Dispatch<React.SetStateAction<CreateProjectInput>>;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ formData, setFormData }) => {
  const priorities: { value: Project['priority']; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Project Name *</FieldLabel>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Project name"
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Project description"
          rows={3}
          className={`${inputClasses} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Priority</FieldLabel>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as Project['priority'] })}
            className={inputClasses}
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Deadline *</FieldLabel>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            className={inputClasses}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Task Form Component ─────────────────────────────────────────────────────

interface TaskFormProps {
  formData: CreateTaskInput;
  setFormData: React.Dispatch<React.SetStateAction<CreateTaskInput>>;
  projectId?: string;
}

const TaskForm: React.FC<TaskFormProps> = ({ formData, setFormData, projectId }) => {
  const priorities: { value: Task['priority']; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Task Title *</FieldLabel>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Task title"
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Task description"
          rows={3}
          className={`${inputClasses} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Priority</FieldLabel>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
            className={inputClasses}
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Due Date *</FieldLabel>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Assignee</FieldLabel>
        <input
          type="text"
          value={formData.assignee_id || ''}
          onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
          placeholder="User ID or name"
          className={inputClasses}
        />
      </div>

      <div>
        <FieldLabel>Start Date</FieldLabel>
        <input
          type="date"
          value={formData.start_date || ''}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          className={inputClasses}
        />
      </div>

      {!projectId && (
        <div>
          <FieldLabel>Project (optional)</FieldLabel>
          <input
            type="text"
            value={formData.project_id || ''}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            placeholder="Project ID"
            className={inputClasses}
          />
        </div>
      )}
    </div>
  );
};

export default StaffTasks;