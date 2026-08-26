// src/components/SuperAdminTaskM.tsx
import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchProjects,
  fetchTasks,
  fetchTaskStats,
  createTask,
  updateTask,
  deleteTask,
  createProject,
  deleteProject,
  updateProject,
  selectAllProjects,
  selectAllTasks,
  selectProjectStats,
  selectFilteredTasks,
  selectProjectsLoading,
  selectProjectsError,
  selectIsCreatingProject,
  setTaskFilters,
  removeTaskLocally,
} from "../../store/slices/projectsSlice";
import {
  fetchUsers,
  selectAllUsers,
  selectUsersListLoading,
} from "../../store/slices/userSlice";
import SuperAdminToDo from "./SuperAdminToDo";
import { X, Trash2, Edit2, Check, XCircle } from "lucide-react";
import type {
  CreateProjectInput,
  ProjectPriority,
  CreateProjectTaskInput,
  UpdateProjectTaskInput,
  UpdateProjectInput,
  ProjectTaskStatus,
  ProjectTask,
  Project,
} from "../../types/projects.types";
import StandaloneTasks from "./StandaloneTasks";

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskStatus = import("../../types/projects.types").ProjectTaskStatus;
type Priority = import("../../types/projects.types").ProjectPriority;

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

const toISODateTime = (dateOnly: string): string => {
  if (!dateOnly) return dateOnly;
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

// ─── Edit Project Modal Component ─────────────────────────────────────────────
const EditProjectModal: React.FC<{
  onClose: () => void;
  onSave: (input: UpdateProjectInput) => void;
  project: Project;
  isSaving: boolean;
}> = ({ onClose, onSave, project, isSaving }) => {
  const [formData, setFormData] = useState<UpdateProjectInput>({
    title: project.title,
    description: project.description,
    priority: project.priority,
    deadline: project.deadline,
    tags: project.tags || [],
  });

  const [tagInput, setTagInput] = useState<string>("");




const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.title || !formData.title.trim()) return;
  onSave(formData);
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
        <h2 className="text-xl font-bold text-slate-800">Edit Project</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Project Title *
          </label>
          <input
            type="text"
            value={formData.title || ""}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter project title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value || null })
            }
            placeholder="Enter project description"
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority || "normal"}
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

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Deadline
          </label>
          <input
            type="date"
            value={formData.deadline ? formData.deadline.split("T")[0] : ""}
            onChange={(e) =>
              setFormData({ ...formData, deadline: e.target.value || null })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

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

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving || !formData.title?.trim()}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
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

// ─── Edit Task Modal Component ──────────────────────────────────────────────
const EditTaskModal: React.FC<{
  onClose: () => void;
  onSave: (input: UpdateProjectTaskInput) => void;
  task: ProjectTask;
  isSaving: boolean;
}> = ({ onClose, onSave, task, isSaving }) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [formData, setFormData] = useState<UpdateProjectTaskInput>({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee,
    deadline: task.deadline,
  });

  useEffect(() => {
    dispatch(fetchUsers({}));
  }, [dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;
    onSave(formData);
  };

  return (
    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Edit Task</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Task Title *
          </label>
          <input
            type="text"
            value={formData.title || ""}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter task title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value || null })
            }
            placeholder="Enter task description"
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority || "normal"}
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

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={formData.status || "inprogress"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as ProjectTaskStatus,
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            >
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="blocked">Blocked</option>
              <option value="review">Review</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Assignee
          </label>
          <select
            value={formData.assignee || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                assignee: e.target.value || null,
              })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            disabled={usersLoading}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} {user.pj_number ? `(${user.pj_number})` : ""}
              </option>
            ))}
          </select>
          {usersLoading && (
            <span className="text-xs text-slate-400">Loading users...</span>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Deadline
          </label>
          <input
            type="date"
            value={formData.deadline ? formData.deadline.split("T")[0] : ""}
            onChange={(e) =>
              setFormData({ ...formData, deadline: e.target.value || null })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving || !formData.title?.trim()}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
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

// ─── Add Task Modal Component ────────────────────────────────────────────────
const AddTaskModal: React.FC<{
  onClose: () => void;
  onSave: (input: CreateProjectTaskInput) => void;
  projectId: string;
  projectTitle: string;
  isSaving: boolean;
  initialData?: Partial<CreateProjectTaskInput>;
}> = ({ onClose, onSave, projectId, projectTitle, isSaving, initialData }) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [formData, setFormData] = useState<CreateProjectTaskInput>({
    project_id: projectId,
    title: initialData?.title || "",
    description: initialData?.description || null,
    status: initialData?.status || "inprogress",
    priority: initialData?.priority || "normal",
    assignee: initialData?.assignee || null,
    deadline: initialData?.deadline || "",
  });

  useEffect(() => {
    dispatch(fetchUsers({}));
  }, [dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const deadline = formData.deadline
      ? formData.deadline.includes("T")
        ? formData.deadline
        : new Date(`${formData.deadline}T00:00:00.000Z`).toISOString()
      : undefined;

    onSave({
      ...formData,
      deadline,
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">
          Add Task to {projectTitle}
        </h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Task Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter task title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value || null })
            }
            placeholder="Enter task description"
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority || "normal"}
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

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={formData.status || "inprogress"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as ProjectTaskStatus,
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            >
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="blocked">Blocked</option>
              <option value="review">Review</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Assignee
          </label>
          <select
            value={formData.assignee || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                assignee: e.target.value || null,
              })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            disabled={usersLoading}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} {user.pj_number ? `(${user.pj_number})` : ""}
              </option>
            ))}
          </select>
          {usersLoading && (
            <span className="text-xs text-slate-400">Loading users...</span>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Deadline
          </label>
          <input
            type="date"
            value={formData.deadline ? formData.deadline.split("T")[0] : ""}
            onChange={(e) =>
              setFormData({ ...formData, deadline: e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
          />
        </div>

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
              "Create Task"
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

        <input type="hidden" name="member_ids" value="" />

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

// ─── Task Detail Modal ──────────────────────────────────────────────────────
const TaskDetailModal: React.FC<{
  onClose: () => void;
  task: ProjectTask;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ProjectTaskStatus) => void;
}> = ({ onClose, task, onEdit, onDelete, onStatusChange }) => {
  const status = getStatus(task);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const availableStatuses: { value: ProjectTaskStatus; label: string }[] = [
    { value: "inprogress", label: "In Progress" },
    { value: "done", label: "Done" },
    { value: "pending_approval", label: "Pending Approval" },
    { value: "blocked", label: "Blocked" },
    { value: "review", label: "Review" },
  ];

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
            {status === "inprogress" ? "In Progress" : status}
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
          <span className="text-slate-500 w-20">Assignee:</span>
          <span className="text-slate-700">
            {task.assignee_name || "Unassigned"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-20">Deadline:</span>
          <span className="text-slate-700">{fmtDate(task.deadline)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm pt-2 border-t border-slate-100">
          <span className="text-slate-500 w-20">Status:</span>
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value as ProjectTaskStatus)}
            className="px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            {availableStatuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-2 flex-wrap">
        {task.status !== "done" && (
          <button
            onClick={() => onStatusChange("done")}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Mark as Complete
          </button>
        )}
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={handleDelete}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            showDeleteConfirm
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-red-100 text-red-600 hover:bg-red-200"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {showDeleteConfirm ? "Confirm Delete" : "Delete"}
        </button>
        {showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancel
          </button>
        )}
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

  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");
  const [filterPriority, setFilterPriority] = useState<Priority | "">("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSavingTask, setIsSavingTask] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks({}));
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      setTaskFilters({
        assignee: filterAssignee || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        search: searchQuery || undefined,
      }),
    );
    dispatch(fetchTasks({}));
  }, [
    dispatch,
    filterAssignee,
    filterStatus,
    filterPriority,
    searchQuery,
  ]);

  const toggleTaskDone = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const newStatus = task.status === "done" ? "inprogress" : "done";
      dispatch(updateTask({ id: taskId, input: { status: newStatus } }));
    }
  };

  const filteredTasks = useAppSelector(selectFilteredTasks);

const handleCreateProject = (input: CreateProjectInput) => {
  console.log('📤 Creating project with payload:', JSON.stringify(input, null, 2));
  dispatch(createProject(input))
    .unwrap()
    .then((result) => {
      console.log('✅ Project created:', result);
      setShowAddProjectModal(false);
    })
    .catch((error) => {
      console.error('❌ Failed to create project:', error);
      console.error('❌ Server response:', error?.response?.data);
      alert(error?.response?.data?.error || error?.message || 'Failed to create project');
    });
};

  const handleCreateTask = (input: CreateProjectTaskInput) => {
    dispatch(createTask(input));
    setShowAddTaskModal(false);
    setSelectedProject(null);
  };

  const handleEditTask = (task: ProjectTask) => {
    setEditingTask(task);
    setSelectedTask(null);
  };

  const handleSaveEditTask = (input: UpdateProjectTaskInput) => {
    if (editingTask) {
      setIsSavingTask(true);
      dispatch(updateTask({ id: editingTask.id, input }))
        .unwrap()
        .then(() => {
          setEditingTask(null);
          setIsSavingTask(false);
        })
        .catch(() => {
          setIsSavingTask(false);
        });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    dispatch(deleteTask(taskId))
      .unwrap()
      .then(() => {
        dispatch(removeTaskLocally(taskId));
        setSelectedTask(null);
      });
  };

  const handleStatusChange = (taskId: string, status: ProjectTaskStatus) => {
    dispatch(updateTask({ id: taskId, input: { status } }));
  };

const handleEditProject = (input: UpdateProjectInput) => {
  if (!editingProject) {
    console.warn('No project being edited');
    return;
  }
  
  console.log('📤 EditProject called with input:', input);
  
  // Ensure input is an object
  if (!input || typeof input !== 'object') {
    console.error('Invalid input: expected object, received', input);
    alert('Invalid data. Please try again.');
    setEditingProject(null);
    setIsSavingProject(false);
    return;
  }
  
  setIsSavingProject(true);
  
  // Build clean input object - ONLY include fields that are defined
  const cleanInput: UpdateProjectInput = {};
  
  if (input.title !== undefined && input.title !== null && input.title.trim() !== '') {
    cleanInput.title = input.title.trim();
  }
  if (input.description !== undefined) {
    cleanInput.description = input.description || null;
  }
  if (input.priority !== undefined && input.priority !== null) {
    cleanInput.priority = input.priority;
  }
  if (input.deadline !== undefined) {
    cleanInput.deadline = input.deadline || null;
  }
  // Only include tags if they have values
  if (input.tags !== undefined && input.tags !== null && input.tags.length > 0) {
    cleanInput.tags = input.tags;
  }
  // Don't send empty tags - let backend keep existing
  
  // If no fields to update, close modal
  if (Object.keys(cleanInput).length === 0) {
    console.warn('No fields to update');
    setEditingProject(null);
    setIsSavingProject(false);
    return;
  }
  
  console.log('📤 Sending update with cleanInput:', cleanInput);
  
  dispatch(updateProject({ id: editingProject.id, input: cleanInput }))
    .unwrap()
    .then((result) => {
      console.log('✅ Project updated successfully:', result);
      setEditingProject(null);
      setIsSavingProject(false);
    })
    .catch((error) => {
      console.error('❌ Failed to update project:', error);
      // Show the actual error message from the server if available
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update project. Please try again.';
      alert(errorMessage);
      setIsSavingProject(false);
    });
};

  const handleDeleteProject = (projectId: string, projectTitle: string) => {
    if (window.confirm(`Delete project "${projectTitle}" and all its tasks?`)) {
      dispatch(deleteProject(projectId));
    }
  };

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

  const renderTaskTable = (
    projTasks: import("../../types/projects.types").ProjectTask[],
  ) => {
    if (projTasks.length === 0) {
      return (
        <div className="px-6 py-8 text-sm text-slate-400 text-center bg-slate-50/20">
          No tasks match the current filters.
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Task
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Priority
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Assignee
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-28">
                Deadline
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-14">
                Done
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {projTasks.map((task) => {
              const status = getStatus(task);
              const assigneeUser = task.assignee ? usersMap[task.assignee] : null;
              return (
                <tr
                  key={task.id}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td
                    className="px-3 py-2.5 cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div
                      className={`font-medium ${status === "done" ? "line-through text-slate-400" : "text-slate-700"}`}
                    >
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-xs text-slate-400 truncate max-w-[220px]">
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{priorityBadge(task.priority)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        status === "done"
                          ? "text-emerald-700 ring-emerald-600/20 bg-emerald-50"
                          : status === "overdue"
                            ? "text-rose-700 ring-rose-600/20 bg-rose-50"
                            : status === "inprogress"
                              ? "text-amber-700 ring-amber-600/20 bg-amber-50"
                              : "text-slate-600 ring-slate-500/10 bg-slate-50"
                      }`}
                    >
                      {status === "inprogress"
                        ? "In Progress"
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {assigneeUser ? memberAvatar(assigneeUser, 20) : null}
                      <span className="text-xs text-slate-600 whitespace-nowrap">
                        {task.assignee_name || assigneeUser?.full_name || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap">
                    {deadlineTag(task.deadline, status)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleTaskDone(task.id)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-900/20 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTask(task);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit Task"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete task "${task.title}"?`)) {
                            handleDeleteTask(task.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "")}
        >
          <option value="">All Statuses</option>
          {[
            "inprogress",
            "done",
            "pending_approval",
            "blocked",
            "review",
          ].map((s) => (
            <option key={s} value={s}>
              {s === "inprogress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
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
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {proj.title}
                      </h3>
                      <button
                        onClick={() => setEditingProject(proj)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Edit Project"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(proj.id, proj.title)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                {renderTaskTable(projTasks)}
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
                              status: "inprogress",
                              priority: "normal",
                              deadline: new Date(
                                Date.now() + 7 * 86400000,
                              ).toISOString(),
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
          <div onClick={(e) => e.stopPropagation()}>
            <AddTaskModal
              onClose={() => {
                setShowAddTaskModal(false);
                setSelectedProject(null);
              }}
              onSave={handleCreateTask}
              projectId={selectedProject.id}
              projectTitle={selectedProject.title}
              isSaving={false}
            />
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
            <TaskDetailModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onEdit={() => handleEditTask(selectedTask)}
              onDelete={() => handleDeleteTask(selectedTask.id)}
              onStatusChange={(status) => {
                handleStatusChange(selectedTask.id, status);
                setSelectedTask({ ...selectedTask, status });
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={() => setEditingTask(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <EditTaskModal
              onClose={() => setEditingTask(null)}
              onSave={handleSaveEditTask}
              task={editingTask}
              isSaving={isSavingTask}
            />
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={() => setEditingProject(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <EditProjectModal
              onClose={() => setEditingProject(null)}
              onSave={handleEditProject}
              project={editingProject}
              isSaving={isSavingProject}
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
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);

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

  const inProgressTasks = tasks.filter((t) => getStatus(t) === "inprogress");
  const overdueTasks = tasks.filter((t) => getStatus(t) === "overdue");
  const doneTasks = tasks.filter((t) => getStatus(t) === "done");
  const pendingApprovalTasks = tasks.filter((t) => getStatus(t) === "pending_approval");
  const blockedTasks = tasks.filter((t) => getStatus(t) === "blocked");
  const reviewTasks = tasks.filter((t) => getStatus(t) === "review");

  const columns = [
    {
      key: "inprogress",
      label: "In Progress",
      tasks: inProgressTasks,
      dotColor: "bg-amber-500",
      bg: "bg-amber-50/20 ring-amber-100/50",
    },
    {
      key: "pending_approval",
      label: "Pending Approval",
      tasks: pendingApprovalTasks,
      dotColor: "bg-purple-500",
      bg: "bg-purple-50/20 ring-purple-100/50",
    },
    {
      key: "review",
      label: "Review",
      tasks: reviewTasks,
      dotColor: "bg-amber-500",
      bg: "bg-amber-50/20 ring-amber-100/50",
    },
    {
      key: "blocked",
      label: "Blocked",
      tasks: blockedTasks,
      dotColor: "bg-rose-500",
      bg: "bg-rose-50/20 ring-rose-100/50",
    },
    {
      key: "overdue",
      label: "Overdue",
      tasks: overdueTasks,
      dotColor: "bg-red-500",
      bg: "bg-red-50/20 ring-red-100/50",
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 items-start">
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
            <TaskDetailModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onEdit={() => {/* Handle edit */}}
              onDelete={() => {
                dispatch(deleteTask(selectedTask.id));
                setSelectedTask(null);
              }}
              onStatusChange={(status) => {
                dispatch(updateTask({ id: selectedTask.id, input: { status } }));
                setSelectedTask({ ...selectedTask, status });
              }}
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
    "projects" | "board" | "standalone" | "todo"
  >("projects");
  const stats = useAppSelector(selectProjectStats);

  useEffect(() => {
    dispatch(fetchProjects({}));
    dispatch(fetchTaskStats(undefined));
  }, [dispatch]);

  const inprogress = stats?.inprogress || 0;
  const overdue = stats?.overdue || 0;
  const done = stats?.done || 0;
  const pendingApproval = stats?.pending_approval || 0;
  const blocked = stats?.blocked || 0;
  const review = stats?.review || 0;

  const renderStats = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 mb-8">
      {[
        {
          val: inprogress,
          label: "In Progress",
          icon: "⏳",
          border: "border-amber-500",
          bg: "bg-amber-50/40",
        },
        {
          val: pendingApproval,
          label: "Pending Approval",
          icon: "📋",
          border: "border-purple-500",
          bg: "bg-purple-50/30",
        },
        {
          val: review,
          label: "Review",
          icon: "🔍",
          border: "border-amber-500",
          bg: "bg-amber-50/30",
        },
        {
          val: blocked,
          label: "Blocked",
          icon: "🚫",
          border: "border-rose-500",
          bg: "bg-rose-50/30",
        },
        {
          val: overdue,
          label: "Overdue",
          icon: "🚨",
          border: "border-red-500",
          bg: "bg-red-50/30",
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
          className={`bg-white p-4 rounded-2xl border-l-4 ${card.border} shadow-sm ring-1 ring-slate-100 transition-transform hover:-translate-y-0.5`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center text-lg`}
            >
              {card.icon}
            </div>
            <div>
              <h4 className="text-xl font-bold tracking-tight text-slate-800">
                {card.val}
              </h4>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
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

          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 self-start shadow-inner mb-6 flex-wrap">
            {[
              { key: "projects", label: "📂 Projects" },
              { key: "board", label: "🗂 Board" },
              { key: "standalone", label: "📋 Standalone Tasks" },
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
            {currentView === "standalone" && <StandaloneTasks />}
          </div>
        </>
      )}
    </div>
  );
};

export default SuperAdminTaskM;