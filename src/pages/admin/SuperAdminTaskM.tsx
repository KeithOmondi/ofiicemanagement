// src/components/SuperAdminTaskM.tsx
import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchProjects,
  fetchTasks,
  fetchTaskStats,
  createTask,
  updateTask,
  createProject,
  // selectors
  selectAllProjects,
  selectAllTasks,
  selectProjectStats,
  selectFilteredTasks,
  selectProjectsLoading,
  selectProjectsError,
  selectIsCreatingProject,
  setTaskFilters,
} from "../../store/slices/projectsSlice";
import SuperAdminToDo from "./SuperAdminToDo";
import { X } from "lucide-react";
import type {
  CreateProjectInput,
  ProjectPriority,
} from "../../types/projects.types";

// ─── Types (re-export from slice) ────────────────────────────────────────────
type TaskStatus = import("../../types/projects.types").ProjectTaskStatus;
type Priority = import("../../types/projects.types").ProjectPriority;
type TaskType = import("../../types/projects.types").ProjectTaskType;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (dateStr: string): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
};

// Backend expects a full ISO 8601 datetime (e.g. z.string().datetime()),
// not a plain YYYY-MM-DD date. `<input type="date">` values and
// `.toISOString().split("T")[0]` both produce date-only strings, which the
// API rejects with {"success":false,"error":"Invalid ISO datetime"} (400).
// Run any deadline through this before sending it to the API.
const toISODateTime = (dateOnly: string): string => {
  if (!dateOnly) return dateOnly;
  // Already a full ISO datetime (contains a "T") — leave it alone.
  if (dateOnly.includes("T")) return dateOnly;
  return new Date(`${dateOnly}T00:00:00.000Z`).toISOString();
};

const daysUntil = (dateStr: string): number => {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
};

const getStatus = (
  task: import("../../types/projects.types").ProjectTask,
): TaskStatus => {
  if (task.status === "done") return "done";
  if (task.status === "pending_approval") return "inprogress";
  const days = daysUntil(task.deadline);
  if (days < 0) return "overdue";
  return task.status;
};

const priorityBadge = (p: string) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    urgent: {
      label: "Urgent",
      color: "text-red-700 ring-red-600/20",
      bg: "bg-red-50",
    },
    high: {
      label: "High",
      color: "text-amber-700 ring-amber-600/20",
      bg: "bg-amber-50",
    },
    normal: {
      label: "Normal",
      color: "text-emerald-700 ring-emerald-600/20",
      bg: "bg-emerald-50",
    },
    low: {
      label: "Low",
      color: "text-slate-600 ring-slate-500/10",
      bg: "bg-slate-50",
    },
    critical: {
      label: "Critical",
      color: "text-rose-700 ring-rose-600/20",
      bg: "bg-rose-50",
    },
  };
  const info = map[p] || {
    label: p,
    color: "text-slate-700 ring-slate-600/10",
    bg: "bg-slate-50",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${info.color} ${info.bg}`}
    >
      {(p === "urgent" || p === "critical") && (
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-500" />
      )}
      {p === "high" && (
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
      )}
      {info.label}
    </span>
  );
};

const getColorFromId = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
};

const memberAvatar = (
  user: { id: string; full_name: string; pj_number?: string } | null,
  size: number = 24,
) => {
  if (!user) return null;
  return (
    <div
      className="inline-flex items-center justify-center rounded-full ring-2 ring-white flex-shrink-0 select-none shadow-sm font-semibold transition-transform hover:scale-105 hover:z-10"
      style={{
        width: size,
        height: size,
        fontSize: Math.floor(size * 0.38),
        background: getColorFromId(user.id),
        color: "#fff",
        marginRight: -6,
      }}
      title={user.full_name}
    >
      {user.pj_number || user.id.slice(0, 2).toUpperCase()}
    </div>
  );
};

const deadlineTag = (dateStr: string, status: TaskStatus) => {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);
  const label = fmtDate(dateStr);
  if (status === "done")
    return (
      <span className="inline-flex items-center text-emerald-600 font-medium">
        ✓ {label}
      </span>
    );
  if (days < 0)
    return (
      <span className="inline-flex items-center text-rose-500 font-medium animate-pulse">
        ⚠ {label}
      </span>
    );
  if (days <= 3)
    return (
      <span className="inline-flex items-center text-amber-600 font-medium">
        {days}d left
      </span>
    );
  return <span className="text-slate-500 font-medium">{label}</span>;
};

// ─── Add Project Modal Component ─────────────────────────────────────────────
const AddProjectModal: React.FC<{
  onClose: () => void;
  onSave: (input: CreateProjectInput) => void;
  isSaving: boolean;
}> = ({ onClose, onSave, isSaving }) => {
  const [formData, setFormData] = useState<CreateProjectInput>({
    title: "",
    description: "",
    priority: "normal",
    deadline: "",
    tags: [],
    member_ids: [],
  });

  const [tagInput, setTagInput] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    // `<input type="date">` gives us "YYYY-MM-DD" — widen to a full ISO
    // datetime here so the API's Zod validation doesn't reject it.
    onSave({
      ...formData,
      deadline: formData.deadline ? toISODateTime(formData.deadline) : formData.deadline,
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Add New Project</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Project Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter project title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Enter project description"
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) =>
              setFormData({
                ...formData,
                priority: e.target.value as ProjectPriority,
              })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Deadline
          </label>
          <input
            type="date"
            value={formData.deadline || ""}
            onChange={(e) =>
              setFormData({ ...formData, deadline: e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag and press Enter"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Add
            </button>
          </div>
          {formData.tags && formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Member IDs - Hidden for now, can be extended later */}
        <input type="hidden" name="member_ids" value="" />

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving || !formData.title.trim()}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Project"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── ToDoModal Component ──────────────────────────────────────────────────────
const ToDoModal: React.FC<{
  onClose: () => void;
  task: import("../../types/projects.types").ProjectTask;
}> = ({ onClose, task }) => {
  const status = getStatus(task);
  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              status === "done"
                ? "bg-emerald-500"
                : status === "overdue"
                  ? "bg-rose-500"
                  : status === "inprogress"
                    ? "bg-amber-500"
                    : "bg-slate-400"
            }`}
          />
          <span className="text-xs font-medium text-slate-500 uppercase">
            {status}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl"
        >
          ✕
        </button>
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-2">{task.title}</h2>
      {task.description && (
        <p className="text-sm text-slate-600 mb-4">{task.description}</p>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-20">Priority:</span>
          {priorityBadge(task.priority)}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-20">Type:</span>
          <span className="text-slate-700">{task.type}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-20">Assignee:</span>
          <span className="text-slate-700">
            {task.assignee_name || "Unassigned"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-20">Deadline:</span>
          <span className="text-slate-700">{fmtDate(task.deadline)}</span>
        </div>
        {task.tags && task.tags.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-20">Tags:</span>
            <div className="flex gap-1 flex-wrap">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <button className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors">
          Mark as Complete
        </button>
        <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Edit
        </button>
      </div>
    </div>
  );
};

// ─── PROJECTS VIEW ────────────────────────────────────────────────────────────
const ProjectsView: React.FC = () => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector(selectAllProjects);
  const loading = useAppSelector(selectProjectsLoading);
  const error = useAppSelector(selectProjectsError);
  const tasks = useAppSelector(selectAllTasks);
  const isCreatingProject = useAppSelector(selectIsCreatingProject);

  // Local UI state
  const [selectedTask, setSelectedTask] = useState<
    import("../../types/projects.types").ProjectTask | null
  >(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<
    import("../../types/projects.types").Project | null
  >(null);
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<Priority | "">("");
  const [filterType, setFilterType] = useState<TaskType | "">("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch all tasks on mount (and when filters change)
  useEffect(() => {
    dispatch(fetchTasks({}));
  }, [dispatch]);

  // When filters change, update Redux filters and refetch
  useEffect(() => {
    dispatch(
      setTaskFilters({
        assignee: filterAssignee || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        type: filterType || undefined,
        search: searchQuery || undefined,
      }),
    );
    dispatch(fetchTasks({}));
  }, [
    dispatch,
    filterAssignee,
    filterStatus,
    filterPriority,
    filterType,
    searchQuery,
  ]);

  const toggleTaskDone = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const newStatus = task.status === "done" ? "todo" : "done";
      dispatch(updateTask({ id: taskId, input: { status: newStatus } }));
    }
  };

  const filteredTasks = useAppSelector(selectFilteredTasks);

  const handleCreateProject = (input: CreateProjectInput) => {
    dispatch(createProject(input));
    setShowAddProjectModal(false);
  };

  // Build a users map from project members for avatars
  const usersMap = React.useMemo(() => {
    const map: Record<
      string,
      { id: string; full_name: string; pj_number?: string }
    > = {};
    projects.forEach((p) => {
      p.members?.forEach((m) => {
        map[m.id] = {
          id: m.id,
          full_name: m.full_name,
          pj_number: m.pj_number,
        };
      });
    });
    return map;
  }, [projects]);

  const renderTaskRow = (task: import("../../types/projects.types").ProjectTask) => {
    const status = getStatus(task);
    const assigneeUser = task.assignee ? usersMap[task.assignee] : null;
    return (
      <div
        key={task.id}
        className="flex items-center gap-4 px-6 py-3.5 border-b border-slate-100 cursor-pointer transition-all duration-150 group hover:bg-slate-50"
        onClick={() => setSelectedTask(task)}
      >
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold cursor-pointer flex-shrink-0 border-2 transition-all duration-200 ${
            task.status === "done"
              ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200"
              : "border-slate-300 bg-white group-hover:border-slate-400"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleTaskDone(task.id);
          }}
        >
          {task.status === "done" && "✓"}
        </div>

        <div
          className="w-1.5 h-7 rounded-full flex-shrink-0"
          style={{
            background:
              task.priority === "critical" || task.priority === "urgent"
                ? "#ef4444"
                : task.priority === "high"
                  ? "#f59e0b"
                  : task.priority === "normal"
                    ? "#10b981"
                    : "#94a3b8",
          }}
        />

        <div className="flex-1 min-w-0">
          <h5
            className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-slate-400" : "text-slate-700"}`}
          >
            {task.title}
          </h5>
          {task.description && (
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {task.description}
            </p>
          )}
          <div className="flex gap-1 mt-1 flex-wrap">
            {task.type && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                {task.type}
              </span>
            )}
            {task.tags &&
              task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded"
                >
                  #{tag}
                </span>
              ))}
          </div>
        </div>

        <div className="flex flex-shrink-0 pl-2">
          {assigneeUser ? (
            memberAvatar(assigneeUser, 24)
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>

        <div className="text-xs font-mono flex-shrink-0 w-24 text-right">
          {deadlineTag(task.deadline, status)}
        </div>
      </div>
    );
  };

  if (loading && projects.length === 0) {
    return <div className="text-center py-8">Loading projects...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold shadow-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
          onClick={() => setShowAddProjectModal(true)}
        >
          + New Project
        </button>
      </div>

      <div className="flex gap-2 items-center flex-wrap mb-6">
        <input
          type="text"
          placeholder="Search tasks..."
          className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 w-32 sm:w-40"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
        >
          <option value="">All Members</option>
          {Object.values(usersMap).map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name} {user.pj_number ? `(${user.pj_number})` : ""}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Priority | "")}
        >
          <option value="">All Priorities</option>
          {["low", "normal", "high", "urgent", "critical"].map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as TaskType | "")}
        >
          <option value="">All Types</option>
          {[
            "task",
            "bug",
            "feature",
            "improvement",
            "support",
            "maintenance",
          ].map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "")}
        >
          <option value="">All Statuses</option>
          {[
            "todo",
            "inprogress",
            "done",
            "overdue",
            "pending_approval",
            "blocked",
            "review",
          ].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-6">
        {projects.map((proj) => {
          const projTasks = filteredTasks.filter(
            (t) => t.project_id === proj.id,
          );
          const prog = projTasks.length
            ? Math.round(
                (projTasks.filter((t) => t.status === "done").length /
                  projTasks.length) *
                  100,
              )
            : 0;
          const projDays = daysUntil(proj.deadline);
          const isOverdue = projDays < 0;

          return (
            <div
              key={proj.id}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden border border-slate-100 transition-shadow hover:shadow-md"
            >
              <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="text-3xl p-1 bg-white/10 rounded-xl select-none">
                    📂
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                      {proj.description}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap mt-2.5">
                      {priorityBadge(proj.priority)}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded bg-white/10 text-slate-200 ${isOverdue ? "text-rose-300 font-semibold" : ""}`}
                      >
                        📅 Deadline: {fmtDate(proj.deadline)}
                        {isOverdue && " (OVERDUE)"}
                        {!isOverdue && projDays <= 3 && ` (${projDays}d left)`}
                      </span>
                      <span className="text-xs text-slate-400">
                        {prog}% complete · {projTasks.length} tasks
                      </span>
                      {proj.tags && proj.tags.length > 0 && (
                        <span className="text-xs text-slate-400">
                          🏷️ {proj.tags.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 border-t border-white/10 md:border-none pt-3 md:pt-0">
                  <div className="flex pl-2">
                    {proj.members &&
                      proj.members.map((m) => memberAvatar(m, 28))}
                  </div>
                </div>
              </div>

              <div className="h-1.5 bg-slate-100 relative">
                <div
                  className={`h-full transition-all duration-500 ease-out ${prog === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${prog}%` }}
                />
              </div>

              <div className="project-tasks-section bg-white">
                <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tasks ({projTasks.length})
                  </span>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedProject(proj);
                      setShowAddTaskModal(true);
                    }}
                  >
                    + Add Task
                  </button>
                </div>
                <div>
                  {projTasks.length === 0 && (
                    <div className="px-6 py-8 text-sm text-slate-400 text-center bg-slate-50/20">
                      No tasks match the current filters.
                    </div>
                  )}
                  {projTasks.map((t) => renderTaskRow(t))}
                </div>
                <div className="px-6 py-3 flex items-center gap-3 border-t border-dashed border-slate-200 bg-slate-50/30">
                  <span className="text-slate-400 text-lg font-light select-none">
                    +
                  </span>
                  <input
                    className="flex-1 border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 font-medium"
                    placeholder="Quick add task — type and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          dispatch(
                            createTask({
                              project_id: proj.id,
                              title: input.value.trim(),
                              status: "todo",
                              priority: "normal",
                              type: "task",
                              // Keep the full ISO datetime — do NOT
                              // .split("T")[0] this, or the API will
                              // reject it with "Invalid ISO datetime".
                              deadline: new Date(
                                Date.now() + 7 * 86400000,
                              ).toISOString(),
                              tags: [],
                            }),
                          );
                          input.value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={() => setShowAddProjectModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AddProjectModal
              onClose={() => setShowAddProjectModal(false)}
              onSave={handleCreateProject}
              isSaving={isCreatingProject}
            />
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && selectedProject && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={() => {
            setShowAddTaskModal(false);
            setSelectedProject(null);
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">
              Add Task to {selectedProject.title}
            </h2>
            <p className="text-slate-500 mb-4">Task form would go here</p>
            <button
              onClick={() => {
                setShowAddTaskModal(false);
                setSelectedProject(null);
              }}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedTask(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-[92%] max-w-[560px] max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100">
            <ToDoModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── BOARD VIEW ──────────────────────────────────────────────────────────────
const BoardView: React.FC = () => {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectAllTasks);
  const projects = useAppSelector(selectAllProjects);
  const [selectedTask, setSelectedTask] = useState<
    import("../../types/projects.types").ProjectTask | null
  >(null);

  useEffect(() => {
    dispatch(fetchTasks({}));
  }, [dispatch]);

  const usersMap = React.useMemo(() => {
    const map: Record<
      string,
      { id: string; full_name: string; pj_number?: string }
    > = {};
    projects.forEach((p) => {
      p.members?.forEach((m) => {
        map[m.id] = {
          id: m.id,
          full_name: m.full_name,
          pj_number: m.pj_number,
        };
      });
    });
    return map;
  }, [projects]);

  const todoTasks = tasks.filter((t) => getStatus(t) === "todo");
  const inProgressTasks = tasks.filter((t) => getStatus(t) === "inprogress");
  const overdueTasks = tasks.filter((t) => getStatus(t) === "overdue");
  const doneTasks = tasks.filter((t) => getStatus(t) === "done");

  const columns = [
    {
      key: "todo",
      label: "Todo",
      tasks: todoTasks,
      dotColor: "bg-slate-400",
      bg: "bg-slate-50/80 ring-slate-100",
    },
    {
      key: "inprogress",
      label: "In Progress",
      tasks: inProgressTasks,
      dotColor: "bg-amber-500",
      bg: "bg-amber-50/20 ring-amber-100/50",
    },
    {
      key: "overdue",
      label: "Overdue",
      tasks: overdueTasks,
      dotColor: "bg-rose-500",
      bg: "bg-rose-50/20 ring-rose-100/50",
    },
    {
      key: "done",
      label: "Completed",
      tasks: doneTasks,
      dotColor: "bg-emerald-500",
      bg: "bg-emerald-50/20 ring-emerald-100/50",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {columns.map((col) => (
          <div
            key={col.key}
            className={`${col.bg} rounded-2xl p-4 min-h-[500px] ring-1 border border-transparent`}
          >
            <div className="flex justify-between items-center mb-4 px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                {col.label}
              </h4>
              <span className="text-slate-500 bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm ring-1 ring-slate-100">
                {col.tasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {col.tasks.map((t) => {
                const project = projects.find((p) => p.id === t.project_id);
                const assigneeUser = t.assignee ? usersMap[t.assignee] : null;
                return (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl p-4 shadow-sm border transition-all duration-200 hover:shadow-md hover:border-slate-300 border-slate-100 cursor-pointer"
                    onClick={() => setSelectedTask(t)}
                  >
                    <h5 className="text-sm font-semibold text-slate-700 leading-snug line-clamp-2">
                      {t.title}
                    </h5>
                    <div className="text-xs font-medium text-slate-400 mt-1 mb-3">
                      {project?.title || "Standalone"}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-2">
                      <div className="flex">
                        {assigneeUser ? (
                          memberAvatar(assigneeUser, 22)
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono">
                        {deadlineTag(t.deadline, getStatus(t))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {col.tasks.length === 0 && (
                <div className="text-center py-8 text-xs font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                  Empty column
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedTask(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-[92%] max-w-[560px] max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100">
            <ToDoModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── STANDALONE VIEW ──────────────────────────────────────────────────────────
const StandaloneView: React.FC = () => {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectAllTasks);
  const projects = useAppSelector(selectAllProjects);
  const [selectedTask, setSelectedTask] = useState<
    import("../../types/projects.types").ProjectTask | null
  >(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks({}));
  }, [dispatch]);

  const standaloneTasks = tasks.filter((t) => !t.project_id);

  const usersMap = React.useMemo(() => {
    const map: Record<
      string,
      { id: string; full_name: string; pj_number?: string }
    > = {};
    projects.forEach((p) => {
      p.members?.forEach((m) => {
        map[m.id] = {
          id: m.id,
          full_name: m.full_name,
          pj_number: m.pj_number,
        };
      });
    });
    return map;
  }, [projects]);

  const toggleTaskDone = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const newStatus = task.status === "done" ? "todo" : "done";
      dispatch(updateTask({ id: taskId, input: { status: newStatus } }));
    }
  };

  const renderTaskRow = (task: import("../../types/projects.types").ProjectTask) => {
    const status = getStatus(task);
    const assigneeUser = task.assignee ? usersMap[task.assignee] : null;
    return (
      <div
        key={task.id}
        className="flex items-center gap-4 px-6 py-3.5 border-b border-slate-100 cursor-pointer transition-all duration-150 group hover:bg-slate-50"
        onClick={() => setSelectedTask(task)}
      >
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold cursor-pointer flex-shrink-0 border-2 transition-all duration-200 ${
            task.status === "done"
              ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200"
              : "border-slate-300 bg-white group-hover:border-slate-400"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleTaskDone(task.id);
          }}
        >
          {task.status === "done" && "✓"}
        </div>

        <div
          className="w-1.5 h-7 rounded-full flex-shrink-0"
          style={{
            background:
              task.priority === "critical" || task.priority === "urgent"
                ? "#ef4444"
                : task.priority === "high"
                  ? "#f59e0b"
                  : task.priority === "normal"
                    ? "#10b981"
                    : "#94a3b8",
          }}
        />

        <div className="flex-1 min-w-0">
          <h5
            className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-slate-400" : "text-slate-700"}`}
          >
            {task.title}
          </h5>
          {task.description && (
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {task.description}
            </p>
          )}
          <div className="flex gap-1 mt-1 flex-wrap">
            {task.type && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                {task.type}
              </span>
            )}
            {task.tags &&
              task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded"
                >
                  #{tag}
                </span>
              ))}
          </div>
        </div>

        <div className="flex flex-shrink-0 pl-2">
          {assigneeUser ? (
            memberAvatar(assigneeUser, 24)
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>

        <div className="text-xs font-mono flex-shrink-0 w-24 text-right">
          {deadlineTag(task.deadline, status)}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base font-bold text-slate-800 tracking-tight">
          Standalone Tasks
        </h3>
        <button
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
          onClick={() => setShowAddModal(true)}
        >
          + Add Task
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 ring-1 ring-slate-100 overflow-hidden">
        <div>
          {standaloneTasks.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No standalone tasks currently registered.
            </div>
          ) : (
            standaloneTasks.map((t) => renderTaskRow(t))
          )}
        </div>
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Add Standalone Task</h2>
            <p className="text-slate-500 mb-4">
              Standalone task form would go here
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selectedTask && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedTask(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-[92%] max-w-[560px] max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100">
            <ToDoModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TODO VIEW ────────────────────────────────────────────────────────────────
const TodoView: React.FC = () => {
  return <SuperAdminToDo />;
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const SuperAdminTaskM: React.FC = () => {
  const dispatch = useAppDispatch();
  const [currentView, setCurrentView] = useState<
    "projects" | "board" | "independent" | "todo"
  >("projects");
  const stats = useAppSelector(selectProjectStats);

  useEffect(() => {
    dispatch(fetchProjects({}));
    dispatch(fetchTaskStats(""));
  }, [dispatch]);

  const todo = stats?.todo || 0;
  const inprogress = stats?.inprogress || 0;
  const overdue = stats?.overdue || 0;
  const done = stats?.done || 0;

  const renderStats = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {[
        {
          val: todo,
          label: "Todo",
          icon: "📋",
          border: "border-slate-200",
          bg: "bg-slate-50",
        },
        {
          val: inprogress,
          label: "In Progress",
          icon: "⏳",
          border: "border-amber-500",
          bg: "bg-amber-50/40",
        },
        {
          val: overdue,
          label: "Overdue",
          icon: "🚨",
          border: "border-rose-500",
          bg: "bg-rose-50/30",
        },
        {
          val: done,
          label: "Completed",
          icon: "✅",
          border: "border-emerald-500",
          bg: "bg-emerald-50/30",
        },
      ].map((card, i) => (
        <div
          key={i}
          className={`bg-white p-5 rounded-2xl border-l-4 ${card.border} shadow-sm ring-1 ring-slate-100 transition-transform hover:-translate-y-0.5`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center text-xl`}
            >
              {card.icon}
            </div>
            <div>
              <h4 className="text-2xl font-bold tracking-tight text-slate-800">
                {card.val}
              </h4>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                {card.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 font-sans antialiased bg-slate-50/50 min-h-screen text-slate-600">
      {currentView === "todo" ? (
        <TodoView />
      ) : (
        <>
          {renderStats()}

          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 self-start shadow-inner mb-6">
            {[
              { key: "projects", label: "📂 Projects" },
              { key: "board", label: "🗂 Board" },
              { key: "independent", label: "⚡ Standalone" },
              { key: "todo", label: "📋 To-Do" },
            ].map((view) => (
              <button
                key={view.key}
                className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  currentView === view.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setCurrentView(view.key as typeof currentView)}
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="transition-all duration-200">
            {currentView === "projects" && <ProjectsView />}
            {currentView === "board" && <BoardView />}
            {currentView === "independent" && <StandaloneView />}
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminTaskM;