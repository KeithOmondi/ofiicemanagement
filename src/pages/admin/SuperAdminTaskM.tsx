// src/pages/admin/SuperAdminTaskM.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchTaskStats,
  fetchProjects,
  fetchTasks,
  fetchStandaloneTasks,
  createProject,
  //updateProject,
  deleteProject,
  createTask,
  updateTask,
  deleteTask,
  setSelectedProject,
  clearError,
  clearSuccess,
  selectProjects,
  selectSelectedProject,
  selectTasks,
  selectStandaloneTasks,
  selectTaskStats,
  selectProjectStats,
  selectTasksError,
  selectTasksSuccess,
  selectProjectsLoading,
  selectTasksLoading,
  selectStandaloneTasksLoading,
  selectStatsLoading,
  selectTasksMutating,
  //selectProjectTasks,
  updateTaskStatusLocally,
  type Project,
  type Task,
  //type ProjectMember,
  type CreateProjectInput,
  type CreateTaskInput,
} from "../../store/slices/tasksSlice";
import { selectAllUsers, fetchUsers } from "../../store/slices/userSlice";
import { format, isAfter, addDays } from "date-fns";

// ─── Helper Functions ────────────────────────────────────────────────────────

const getStatusColor = (status: string) => {
  const colors = {
    todo: "bg-blue-100 text-blue-700 border-blue-200",
    in_progress: "bg-amber-100 text-amber-700 border-amber-200",
    overdue: "bg-red-100 text-red-700 border-red-200",
    done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return colors[status as keyof typeof colors] || colors.todo;
};

const getPriorityBadge = (priority: string) => {
  const badges = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-100 text-blue-600",
    high: "bg-orange-100 text-orange-600",
    urgent: "bg-red-100 text-red-600 animate-pulse",
  };
  return badges[priority as keyof typeof badges] || badges.medium;
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}> = ({ icon, value, label, color }) => (
  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  </div>
);

const TaskCard: React.FC<{
  task: Task;
  onStatusChange?: (id: string, status: string) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
}> = ({ task, onStatusChange, onEdit, onDelete }) => {
  const isOverdue = isAfter(new Date(), new Date(task.due_date)) && task.status !== "done";

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusChange?.(task.id, task.status === "done" ? "todo" : "done")}
          className="mt-1 text-stone-400 hover:text-stone-600 transition-colors"
        >
          {task.status === "done" ? "☑" : "☐"}
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium text-stone-900 ${
              task.status === "done" ? "line-through text-stone-400" : ""
            }`}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
            <span className="text-stone-400">{task.project_name || "No Project"}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span>📅</span>
              {format(new Date(task.due_date), "dd MMM yy")}
            </span>
            {isOverdue && <span className="text-red-500 font-semibold">(OVERDUE)</span>}
            {task.assignee_name && (
              <>
                <span>·</span>
                <span>👤 {task.assignee_name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${getPriorityBadge(task.priority)}`}>
            {task.priority}
          </span>
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
              title="Edit task"
            >
              ✎
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-red-400 hover:text-red-600 transition-colors"
              title="Delete task"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectCard: React.FC<{
  project: Project;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}> = ({ project, onSelect, onDelete }) => {
  const isOverdue = isAfter(new Date(), new Date(project.deadline));
  const progress = project.progress || 0;

  return (
    <div
      onClick={() => onSelect?.(project.id)}
      className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-stone-900">{project.name}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getPriorityBadge(project.priority)}`}>
              {project.priority}
            </span>
            {isOverdue && (
              <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                OVERDUE
              </span>
            )}
            {project.status === "completed" && (
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                ✓ Completed
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-1 line-clamp-2">{project.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
            <span>📅 {format(new Date(project.deadline), "dd MMM yy")}</span>
            <span>📋 {project.task_count || 0} tasks</span>
            <span>✓ {project.completed_tasks || 0} done</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1E4620] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-stone-600">{progress}%</span>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="text-[10px] text-red-400 hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Create Project Modal ────────────────────────────────────────────────────

const CreateProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: CreateProjectInput) => void;
  users: { id: string; full_name: string; role: string }[];
  loading?: boolean;
}> = ({ isOpen, onClose, onCreate, users, loading }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;

    onCreate({
      name: title,
      description: description || undefined,
      deadline,
      priority,
      member_ids: selectedMembers.length > 0 ? selectedMembers : undefined,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setDeadline("");
    setPriority("medium");
    setSelectedMembers([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Create New Project</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              PROJECT TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Registry Digitisation Phase III"
              className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope and objectives of this project..."
              rows={3}
              className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                PROJECT DEADLINE *
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                required
              />
              <p className="text-xs text-stone-400 mt-1">⚠️ Task deadlines cannot exceed this date</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
              >
                <option value="low">Low</option>
                <option value="medium">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              PROJECT MEMBERS (TEAM GROUP)
            </label>
            <div className="space-y-1.5 bg-stone-50 rounded-lg p-3 border border-stone-200 max-h-48 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-2">No users available</p>
              ) : (
                users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer hover:bg-stone-100 px-2 py-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => handleMemberToggle(user.id)}
                      className="rounded border-stone-300 text-[#1E4620] focus:ring-[#1E4620]"
                    />
                    <span>{user.full_name}</span>
                    <span className="text-xs text-stone-400">({user.role})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            ⚠️ Automatic Reminders: All assigned members receive email + SMS reminders 3 days before task and project deadlines.
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#163a18] transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Create Standalone Task Modal ───────────────────────────────────────────

const CreateStandaloneTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: CreateTaskInput) => void;
  users: { id: string; full_name: string }[];
  loading?: boolean;
}> = ({ isOpen, onClose, onCreate, users, loading }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;

    onCreate({
      title,
      description: description || undefined,
      assignee_id: assigneeId || undefined,
      priority,
      due_date: deadline,
      start_date: startDate || undefined,
    });

    setTitle("");
    setDescription("");
    setAssigneeId("");
    setPriority("medium");
    setStartDate("");
    setDeadline("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Create Standalone Task</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              TASK TITLE
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reply to AG Circular"
              className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about this task..."
              rows={2}
              className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                ASSIGN TO
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
              >
                <option value="">Select assignee</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
              >
                <option value="low">Low</option>
                <option value="medium">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                START DATE
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                DEADLINE
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                required
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            ⚠️ Assignee will receive a reminder 3 days before this deadline.
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[#C29B38] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a8832e] transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminTaskM: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Redux Selectors ──────────────────────────────────────────────────────────
  const projects = useAppSelector(selectProjects);
  // selectedProject is kept in sync via setSelectedProject; not read directly here,
  // but other parts of the tree (e.g. project detail panels) rely on it.
  useAppSelector(selectSelectedProject);
  const tasks = useAppSelector(selectTasks);
  const standaloneTasks = useAppSelector(selectStandaloneTasks);
  const taskStats = useAppSelector(selectTaskStats);
  // projectStats is fetched alongside taskStats; reserved for a future projects-summary card.
  useAppSelector(selectProjectStats);
  const users = useAppSelector(selectAllUsers);
  const error = useAppSelector(selectTasksError);
  const success = useAppSelector(selectTasksSuccess);
  const loadingProjects = useAppSelector(selectProjectsLoading);
  // loadingTasks intentionally unused for now — board/project views key off `tasks` length instead.
  useAppSelector(selectTasksLoading);
  // loadingStandalone intentionally unused for now — same reasoning as above.
  useAppSelector(selectStandaloneTasksLoading);
  const loadingStats = useAppSelector(selectStatsLoading);
  const mutating = useAppSelector(selectTasksMutating);

  // ── Local State ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"projects" | "board" | "standalone">("projects");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateStandaloneTask, setShowCreateStandaloneTask] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // ── Initial Data Fetch ──────────────────────────────────────────────────────
  // NOTE: fetchTasks's thunk payload type is `string | undefined` (the projectId itself,
  // not an options object) — see tasksSlice.ts. Passing `{}` or `{ projectId }` would
  // silently coerce to a truthy object and build a bogus query string. Pass `undefined`
  // directly for "all tasks".
  useEffect(() => {
    dispatch(fetchTaskStats());
    dispatch(fetchProjects());
    dispatch(fetchTasks(undefined));
    dispatch(fetchStandaloneTasks());
    dispatch(fetchUsers({ limit: 100, is_active: true }));
  }, [dispatch]);

  // ── Load tasks when project is selected ────────────────────────────────────
  useEffect(() => {
    if (selectedProjectId) {
      dispatch(fetchTasks(selectedProjectId));
      const project = projects.find((p) => p.id === selectedProjectId);
      if (project) {
        dispatch(setSelectedProject(project));
      }
    }
  }, [selectedProjectId, dispatch, projects]);

  // ── Clear success messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  // ── Derived Data ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (taskStats) {
      return taskStats;
    }
    return { todo: 0, in_progress: 0, done: 0, overdue: 0 };
  }, [taskStats]);

  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback((taskId: string, status: string) => {
    dispatch(updateTaskStatusLocally({ taskId, status: status as Task["status"] }));
    // Update in backend
    dispatch(updateTask({
      id: taskId,
      input: { status: status as Task["status"] },
    })).unwrap().then(() => {
      dispatch(fetchTaskStats());
    }).catch(() => {
      // Revert on error - refresh tasks
      dispatch(fetchTasks(selectedProjectId || undefined));
      dispatch(fetchStandaloneTasks());
    });
  }, [dispatch, selectedProjectId]);

  const handleAddTask = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskData: CreateTaskInput = {
      title: newTaskTitle.trim(),
      project_id: selectedProjectId || undefined,
      due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      priority: "medium",
    };

    dispatch(createTask(taskData)).unwrap().then(() => {
      dispatch(fetchTaskStats());
      if (selectedProjectId) {
        dispatch(fetchTasks(selectedProjectId));
      } else {
        dispatch(fetchStandaloneTasks());
      }
    });

    setNewTaskTitle("");
  }, [newTaskTitle, selectedProjectId, dispatch]);

  const handleCreateProject = useCallback((projectData: CreateProjectInput) => {
    dispatch(createProject(projectData)).unwrap().then(() => {
      dispatch(fetchProjects());
      dispatch(fetchTaskStats());
    });
  }, [dispatch]);

  const handleCreateStandaloneTask = useCallback((taskData: CreateTaskInput) => {
    dispatch(createTask(taskData)).unwrap().then(() => {
      dispatch(fetchStandaloneTasks());
      dispatch(fetchTaskStats());
    });
  }, [dispatch]);

  const handleDeleteProject = useCallback((projectId: string) => {
    if (window.confirm("Delete this project and all its tasks?")) {
      dispatch(deleteProject(projectId)).unwrap().then(() => {
        dispatch(fetchProjects());
        dispatch(fetchTaskStats());
        if (selectedProjectId === projectId) {
          setSelectedProjectId(null);
          dispatch(setSelectedProject(null));
        }
      });
    }
  }, [dispatch, selectedProjectId]);

  const handleDeleteTask = useCallback((taskId: string) => {
    if (window.confirm("Delete this task?")) {
      dispatch(deleteTask(taskId)).unwrap().then(() => {
        dispatch(fetchTaskStats());
        if (selectedProjectId) {
          dispatch(fetchTasks(selectedProjectId));
        } else {
          dispatch(fetchStandaloneTasks());
        }
      });
    }
  }, [dispatch, selectedProjectId]);

  const isLoading = loadingProjects || loadingStats;

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-stone-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-stone-500">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
        <div>
          <h1 className="text-lg font-bold text-stone-900 tracking-tight">Task Management</h1>
          <p className="text-xs text-stone-400 mt-0.5">Projects, tasks, deadlines and progress tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("projects")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === "projects"
                ? "bg-[#1E4620] text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setViewMode("board")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === "board"
                ? "bg-[#1E4620] text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode("standalone")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === "standalone"
                ? "bg-[#1E4620] text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Standalone Tasks
          </button>
          <button
            onClick={() => setShowCreateProject(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#C29B38] text-white hover:bg-[#a8832e] transition-colors"
          >
            + New Project
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* ── Error Message ────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        )}

        {/* ── Success Message ───────────────────────────────────────────── */}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
            <span>✓ Operation completed successfully</span>
            <button onClick={() => dispatch(clearSuccess())} className="text-emerald-400 hover:text-emerald-600">
              ✕
            </button>
          </div>
        )}

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={<span className="text-xl">📋</span>}
            value={stats.todo || 0}
            label="Todo"
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={<span className="text-xl">🔄</span>}
            value={stats.in_progress || 0}
            label="In Progress"
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={<span className="text-xl">⚠️</span>}
            value={stats.overdue || 0}
            label="Overdue"
            color="bg-red-50 text-red-600"
          />
          <StatCard
            icon={<span className="text-xl">✅</span>}
            value={stats.done || 0}
            label="Done"
            color="bg-emerald-50 text-emerald-600"
          />
        </div>

        {/* ── Quick Add Task ───────────────────────────────────────────── */}
        <form onSubmit={handleAddTask} className="flex gap-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Quick add task — type and press Enter"
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          />
          <button
            type="submit"
            disabled={mutating}
            className="px-4 py-2 bg-[#1E4620] text-white rounded-lg text-sm font-medium hover:bg-[#163a18] transition-colors disabled:opacity-50"
          >
            Add Task
          </button>
        </form>

        {/* ── Content ───────────────────────────────────────────────────── */}
        {viewMode === "projects" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider">All Projects</h2>
              <span className="text-xs text-stone-400">{projects.length} total</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={(id) => setSelectedProjectId(id === selectedProjectId ? null : id)}
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>

            {selectedProjectId && (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-stone-800">
                      Tasks ({projectTasks.length})
                    </h3>
                    <button
                      onClick={() => setSelectedProjectId(null)}
                      className="text-xs text-stone-400 hover:text-stone-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-stone-50 max-h-64 overflow-y-auto">
                  {projectTasks.length === 0 ? (
                    <div className="px-4 py-8 text-center text-stone-400 text-sm">
                      No tasks in this project. Add one using the quick add above.
                    </div>
                  ) : (
                    projectTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteTask}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "board" && (
          <div className="grid grid-cols-4 gap-4">
            {["todo", "in_progress", "overdue", "done"].map((status) => {
              const statusTasks = (selectedProjectId ? projectTasks : tasks).filter((t) => {
                if (status === "overdue") {
                  return t.status !== "done" && isAfter(new Date(), new Date(t.due_date));
                }
                return t.status === status;
              });

              return (
                <div key={status} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className={`px-4 py-3 border-b ${getStatusColor(status)} bg-opacity-10`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-800 capitalize">
                        {status === "overdue" ? "⚠ Overdue" : status.replace("_", " ")}
                      </span>
                      <span className="text-xs font-bold text-stone-500">{statusTasks.length}</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                    {statusTasks.length === 0 ? (
                      <p className="text-xs text-stone-400 text-center py-4">No tasks</p>
                    ) : (
                      statusTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === "standalone" && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-800">Standalone Tasks</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{standaloneTasks.length} tasks</span>
                  <button
                    onClick={() => setShowCreateStandaloneTask(true)}
                    className="text-xs bg-[#C29B38] text-white px-3 py-1 rounded-lg hover:bg-[#a8832e] transition-colors"
                  >
                    + New Task
                  </button>
                </div>
              </div>
            </div>
            <div className="divide-y divide-stone-50">
              {standaloneTasks.length === 0 ? (
                <div className="px-4 py-8 text-center text-stone-400 text-sm">
                  No standalone tasks. Create one using the quick add above or click "New Task".
                </div>
              ) : (
                standaloneTasks.map((task) => (
                  <div key={task.id} className="px-4 py-3 hover:bg-stone-50 transition-colors">
                    <TaskCard
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreate={handleCreateProject}
        users={users.map((u) => ({ id: u.id, full_name: u.full_name, role: u.role }))}
        loading={mutating}
      />

      <CreateStandaloneTaskModal
        isOpen={showCreateStandaloneTask}
        onClose={() => setShowCreateStandaloneTask(false)}
        onCreate={handleCreateStandaloneTask}
        users={users.map((u) => ({ id: u.id, full_name: u.full_name }))}
        loading={mutating}
      />
    </div>
  );
};

export default SuperAdminTaskM;