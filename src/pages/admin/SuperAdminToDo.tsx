// src/pages/admin/SuperAdminToDo.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchTasks,
  fetchTaskStats,
  createTask,
  updateTask,
  deleteTask,
  fetchAttachments,
  addAttachment,
  deleteAttachment,
  updateTaskStatusLocally,
  clearError,
  clearSuccess,
  selectTasks,
  selectTaskStats,
  selectTasksError,
  selectTasksSuccess,
  selectTasksLoading,
  selectStatsLoading,
  selectTasksMutating,
  selectAttachmentsMap,
  type Task,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskAttachment,
  type AddAttachmentInput,
} from "../../store/slices/tasksSlice";
import { selectAllUsers, fetchUsers } from "../../store/slices/userSlice";
import { format, isAfter, parseISO, differenceInDays } from "date-fns";
import axiosClient from "../../api/api";

// ─── Helper Functions ────────────────────────────────────────────────────────

const getStatusColor = (status: string, isOverdue: boolean) => {
  if (isOverdue && status !== "completed") return "bg-red-100 text-red-700 border-red-200";
  const colors = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return colors[status as keyof typeof colors] || colors.pending;
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

// ─── Sub‑Components ──────────────────────────────────────────────────────────

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

const AttachmentList: React.FC<{
  attachments: TaskAttachment[];
  onDelete: (attachmentId: string) => void;
  loading?: boolean;
}> = ({ attachments, onDelete, loading }) => {
  if (attachments.length === 0) {
    return <p className="text-xs text-stone-400">No attachments</p>;
  }
  return (
    <div className="space-y-1">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-2 text-xs">
          <a
            href={att.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate"
          >
            📎 {att.file_name}
          </a>
          <span className="text-stone-400">• {format(parseISO(att.created_at), "dd MMM yy")}</span>
          <button
            onClick={() => onDelete(att.id)}
            disabled={loading}
            className="text-red-400 hover:text-red-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── Task Item ──────────────────────────────────────────────────────────────

const TaskItem: React.FC<{
  task: Task;
  onStatusToggle: (id: string, status: "pending" | "completed") => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAddAttachment: (taskId: string, file: File) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  attachments: TaskAttachment[];
  attachmentsLoading: boolean;
}> = ({
  task,
  onStatusToggle,
  onEdit,
  onDelete,
  onAddAttachment,
  onDeleteAttachment,
  attachments,
  attachmentsLoading,
}) => {
  const isOverdue = task.status !== "completed" && isAfter(new Date(), parseISO(task.due_date));
  const daysUntilDue = differenceInDays(parseISO(task.due_date), new Date());
  const hasReminder = task.remind_at !== null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddAttachment(task.id, file);
      e.target.value = ""; // reset input
    }
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Status toggle */}
        <button
          onClick={() =>
            onStatusToggle(
              task.id,
              task.status === "completed" ? "pending" : "completed"
            )
          }
          className="mt-1 text-xl text-stone-400 hover:text-stone-600 transition-colors"
          title={task.status === "completed" ? "Mark as pending" : "Mark as done"}
        >
          {task.status === "completed" ? "✅" : "⬜"}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`text-sm font-medium ${
                task.status === "completed" ? "line-through text-stone-400" : "text-stone-900"
              }`}
            >
              {task.title}
            </p>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(
                task.status,
                isOverdue
              )}`}
            >
              {isOverdue ? "⚠ OVERDUE" : task.status}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getPriorityBadge(task.priority)}`}>
              {task.priority}
            </span>
            {hasReminder && <span className="text-xs text-blue-500">🔔</span>}
          </div>

          {task.description && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-stone-500">
            <span>📅 {format(parseISO(task.due_date), "dd MMM yy")}</span>
            {daysUntilDue > 0 && <span className="text-stone-400">({daysUntilDue}d left)</span>}
            {task.project_name && <span>📁 {task.project_name}</span>}
            {task.assignee_name && <span>👤 {task.assignee_name}</span>}
            {task.remind_at && (
              <span>⏰ reminder: {format(parseISO(task.remind_at), "dd MMM yy HH:mm")}</span>
            )}
          </div>

          {/* Attachments */}
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <AttachmentList
                attachments={attachments}
                onDelete={onDeleteAttachment}
                loading={attachmentsLoading}
              />
              <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                + Add file
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  multiple={false}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
            title="Edit task"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-red-400 hover:text-red-600 transition-colors"
            title="Delete task"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Add / Edit Task Modal ──────────────────────────────────────────────────

const TaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskInput) => void;
  initialData?: Task | null;
  users: { id: string; full_name: string }[];
  loading?: boolean;
}> = ({ isOpen, onClose, onSubmit, initialData, users, loading }) => {
  // State is initialised directly from props; the component will be remounted
  // when `key` changes in the parent, so no effect is needed.
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [assigneeId, setAssigneeId] = useState(initialData?.assignee_id || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">(
    initialData?.priority || "medium"
  );
  const [startDate, setStartDate] = useState(initialData?.start_date || "");
  const [dueDate, setDueDate] = useState(initialData?.due_date || "");
  const [remindAt, setRemindAt] = useState(initialData?.remind_at || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    const data: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignee_id: assigneeId || undefined,
      due_date: dueDate,
      start_date: startDate || undefined,
      remind_at: remindAt || undefined,
    };
    onSubmit(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">
            {initialData ? "Edit Task" : "New Task"}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              TITLE *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
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
              placeholder="Details..."
              rows={2}
              className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                ASSIGNEE
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
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
                <option value="medium">Medium</option>
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
                DUE DATE *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">
              REMINDER (optional)
            </label>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
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
              {loading ? "Saving..." : initialData ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminToDo: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Redux state ──────────────────────────────────────────────────────────
  const allTasks = useAppSelector(selectTasks);
  const stats = useAppSelector(selectTaskStats);
  const users = useAppSelector(selectAllUsers);
  const error = useAppSelector(selectTasksError);
  const success = useAppSelector(selectTasksSuccess);
  const loadingTasks = useAppSelector(selectTasksLoading);
  const loadingStats = useAppSelector(selectStatsLoading);
  const mutating = useAppSelector(selectTasksMutating);
  // Single top-level selector for the whole attachments dictionary.
  // Per-task lookups below are plain object indexing, not hook calls,
  // so they're safe to use inside the render loop.
  const attachmentsByTask = useAppSelector(selectAttachmentsMap);

  // ── Local state ──────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "overdue">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // ── Initial data fetch ──────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchTasks(undefined)); // all tasks user can see
    dispatch(fetchTaskStats());
    dispatch(fetchUsers({ limit: 100, is_active: true }));
  }, [dispatch]);

  // Fetch attachments for each task when it appears
  useEffect(() => {
    allTasks.forEach((task) => {
      dispatch(fetchAttachments(task.id));
    });
  }, [allTasks, dispatch]);

  // Clear success/error messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let tasks = allTasks;
    if (filter === "pending") {
      tasks = tasks.filter((t) => t.status === "pending");
    } else if (filter === "completed") {
      tasks = tasks.filter((t) => t.status === "completed");
    } else if (filter === "overdue") {
      tasks = tasks.filter(
        (t) => t.status !== "completed" && isAfter(new Date(), parseISO(t.due_date))
      );
    }
    // Sort: overdue first, then by due date ascending
    return [...tasks].sort((a, b) => {
      const aOverdue = a.status !== "completed" && isAfter(new Date(), parseISO(a.due_date));
      const bOverdue = b.status !== "completed" && isAfter(new Date(), parseISO(b.due_date));
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
    });
  }, [allTasks, filter]);

  const statsData = useMemo(() => {
    if (stats) return stats;
    return { total: 0, pending: 0, completed: 0, overdue: 0 };
  }, [stats]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStatusToggle = useCallback(
    (taskId: string, status: "pending" | "completed") => {
      dispatch(updateTaskStatusLocally({ taskId, status }));
      dispatch(updateTask({ id: taskId, input: { status } }))
        .unwrap()
        .then(() => {
          dispatch(fetchTaskStats());
        })
        .catch(() => {
          // revert – refetch tasks
          dispatch(fetchTasks(undefined));
        });
    },
    [dispatch]
  );

  const handleCreateTask = useCallback(
    (data: CreateTaskInput) => {
      dispatch(createTask(data))
        .unwrap()
        .then(() => {
          dispatch(fetchTasks(undefined));
          dispatch(fetchTaskStats());
        });
    },
    [dispatch]
  );

  const handleUpdateTask = useCallback(
    (data: CreateTaskInput) => {
      if (!editingTask) return;
      const input: UpdateTaskInput = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignee_id: data.assignee_id,
        due_date: data.due_date,
        start_date: data.start_date,
        remind_at: data.remind_at,
        status: editingTask.status, // keep current status unless changed elsewhere
      };
      dispatch(updateTask({ id: editingTask.id, input }))
        .unwrap()
        .then(() => {
          dispatch(fetchTasks(undefined));
          dispatch(fetchTaskStats());
          setEditingTask(null);
          setShowModal(false);
        });
    },
    [dispatch, editingTask]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      if (window.confirm("Delete this task?")) {
        dispatch(deleteTask(taskId))
          .unwrap()
          .then(() => {
            dispatch(fetchTasks(undefined));
            dispatch(fetchTaskStats());
          });
      }
    },
    [dispatch]
  );

  const handleAddAttachment = useCallback(
    async (taskId: string, file: File) => {
      setUploading((prev) => ({ ...prev, [taskId]: true }));
      try {
        // Upload file to a generic endpoint that returns { file_url }
        const formData = new FormData();
        formData.append("file", file);
        const { data } = await axiosClient.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const attachmentInput: AddAttachmentInput = {
          file_name: file.name,
          file_url: data.file_url, // adjust based on your upload response
        };
        await dispatch(addAttachment({ taskId, input: attachmentInput })).unwrap();
        dispatch(fetchAttachments(taskId));
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setUploading((prev) => ({ ...prev, [taskId]: false }));
      }
    },
    [dispatch]
  );

  const handleDeleteAttachment = useCallback(
    (attachmentId: string) => {
      if (window.confirm("Delete this attachment?")) {
        dispatch(deleteAttachment(attachmentId))
          .unwrap()
          .then(() => {
            // Refetch attachments for all tasks (simplified)
            allTasks.forEach((t) => dispatch(fetchAttachments(t.id)));
          });
      }
    },
    [dispatch, allTasks]
  );

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  }, []);

  const handleModalSubmit = useCallback(
    (data: CreateTaskInput) => {
      if (editingTask) {
        handleUpdateTask(data);
      } else {
        handleCreateTask(data);
      }
    },
    [editingTask, handleCreateTask, handleUpdateTask]
  );

  const isLoading = loadingTasks || loadingStats;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
        <div>
          <h1 className="text-lg font-bold text-stone-900">📋 My To‑Do List</h1>
          <p className="text-xs text-stone-400 mt-0.5">All your tasks across projects and standalone</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-[#1E4620] text-white rounded-lg text-sm font-medium hover:bg-[#163a18] transition-colors"
        >
          + New Task
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Error / Success */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
            <span>✓ Operation successful</span>
            <button onClick={() => dispatch(clearSuccess())} className="text-emerald-400 hover:text-emerald-600">
              ✕
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {!isLoading && (
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              icon={<span className="text-xl">📊</span>}
              value={statsData.total}
              label="Total"
              color="bg-stone-50 text-stone-600"
            />
            <StatCard
              icon={<span className="text-xl">⏳</span>}
              value={statsData.pending}
              label="Pending"
              color="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={<span className="text-xl">⚠️</span>}
              value={statsData.overdue}
              label="Overdue"
              color="bg-red-50 text-red-600"
            />
            <StatCard
              icon={<span className="text-xl">✅</span>}
              value={statsData.completed}
              label="Completed"
              color="bg-emerald-50 text-emerald-600"
            />
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-stone-200 pb-2">
          {(["all", "pending", "completed", "overdue"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === f
                  ? "bg-[#1E4620] text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1 text-[10px] opacity-70">
                (
                {f === "all"
                  ? allTasks.length
                  : f === "pending"
                  ? allTasks.filter((t) => t.status === "pending").length
                  : f === "completed"
                  ? allTasks.filter((t) => t.status === "completed").length
                  : allTasks.filter(
                      (t) =>
                        t.status !== "completed" && isAfter(new Date(), parseISO(t.due_date))
                    ).length}
                )
              </span>
            </button>
          ))}
        </div>

        {/* Task List */}
        {isLoading && allTasks.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-sm">
            No tasks matching this filter. Create one!
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const attachments = attachmentsByTask[task.id] || [];
              return (
                <TaskItem
                  key={task.id}
                  task={task}
                  onStatusToggle={handleStatusToggle}
                  onEdit={handleEdit}
                  onDelete={handleDeleteTask}
                  onAddAttachment={handleAddAttachment}
                  onDeleteAttachment={handleDeleteAttachment}
                  attachments={attachments}
                  attachmentsLoading={!!uploading[task.id]}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Modal with key to reset state when editingTask changes */}
      <TaskModal
        key={editingTask?.id || "new"}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={editingTask}
        users={users.map((u) => ({ id: u.id, full_name: u.full_name }))}
        loading={mutating}
      />
    </div>
  );
};

export default SuperAdminToDo;