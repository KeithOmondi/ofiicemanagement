import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hook";
import {
  fetchFullTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  createTaskNote,
  deleteTaskNote,
  createReminder,
  deleteReminder,
  updateTask,
  clearSelectedTask,
} from "../../../store/slices/tasksSlice";
import {
  selectSelectedTask,
  selectSelectedTaskDetails,
  selectTasksLoading,
  selectTasksError,
  clearError,
} from "../../../store/slices/tasksSlice";
import type { Subtask, TaskStatus, Priority, TaskVisibility } from "../../../types/tasks.types";
import { selectAllUsers } from "../../../store/slices/userSlice";
import { toast } from "react-hot-toast";

interface ToDoModalProps {
  show: boolean;
  onClose: () => void;
  taskId: string;
}

const ToDoModal: React.FC<ToDoModalProps> = ({ show, onClose, taskId }) => {
  const dispatch = useAppDispatch();
  const task = useAppSelector(selectSelectedTask);
  const details = useAppSelector(selectSelectedTaskDetails);
  const loading = useAppSelector(selectTasksLoading);
  const error = useAppSelector(selectTasksError);
  const users = useAppSelector(selectAllUsers);

  // ── Edit state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedStatus, setEditedStatus] = useState<TaskStatus>("todo");
  const [editedPriority, setEditedPriority] = useState<Priority>("normal");
  const [editedVisibility, setEditedVisibility] = useState<TaskVisibility>("team");

  const [noteText, setNoteText] = useState("");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const initialLoad = useRef(true);

  // ─── All hooks must be called before any returns ──────────────────────

  // ─── Fetch task when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (show && taskId) {
      dispatch(clearError());
      dispatch(fetchFullTask(taskId));
    }
  }, [show, taskId, dispatch]);

  // ─── Reset local state when task changes ──────────────────────────────
  useEffect(() => {
    if (task && !initialLoad.current) {
      setNoteText("");
      setSubtaskInput("");
      setReminderDate("");
      setEditedTitle(task.title);
      setEditedDescription(task.description || "");
      setEditedStatus(task.status);
      setEditedPriority(task.priority);
      setEditedVisibility(task.visibility);
      setIsEditing(false);
    }
    if (initialLoad.current) {
      initialLoad.current = false;
    }
  }, [task]);

  // ─── Clean up when modal closes ──────────────────────────────────────
  useEffect(() => {
    if (!show) {
      dispatch(clearSelectedTask());
      dispatch(clearError());
    }
  }, [show, dispatch]);

  // ─── Error handling ──────────────────────────────────────────────────
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleMarkComplete = useCallback(async () => {
    if (!task) return;
    try {
      const newStatus = task.status === "done" ? "todo" : "done";
      const newProgress = newStatus === "done" ? 100 : 0;
      await dispatch(
        updateTask({
          id: task.id,
          data: { status: newStatus, progress: newProgress },
        })
      ).unwrap();
      toast.success(`Task ${newStatus === "done" ? "completed" : "reopened"} successfully`);
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      toast.error("Failed to update task status. Please try again.");
      console.error(error);
    }
  }, [dispatch, task]);

  const handleSaveEdit = useCallback(async () => {
    if (!task) return;
    if (!editedTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    try {
      await dispatch(
        updateTask({
          id: task.id,
          data: {
            title: editedTitle.trim(),
            description: editedDescription.trim() || null,
            status: editedStatus,
            priority: editedPriority,
            visibility: editedVisibility,
          },
        })
      ).unwrap();
      setIsEditing(false);
      toast.success("Task updated successfully");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      toast.error("Failed to save changes. Please try again.");
      console.error(error);
    }
  }, [dispatch, task, editedTitle, editedDescription, editedStatus, editedPriority, editedVisibility]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description || "");
      setEditedStatus(task.status);
      setEditedPriority(task.priority);
      setEditedVisibility(task.visibility);
    }
  }, [task]);

  const handleAddSubtask = useCallback(async () => {
    if (!task) return;
    if (!subtaskInput.trim()) return;
    try {
      await dispatch(
        createSubtask({ 
          task_id: task.id, 
          title: subtaskInput.trim(),
          priority: "normal",
        })
      ).unwrap();
      setSubtaskInput("");
      toast.success("Subtask added successfully");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      toast.error("Failed to add subtask.");
      console.error(error);
    }
  }, [dispatch, task, subtaskInput]);

  const handleToggleSubtask = useCallback(async (subtask: Subtask) => {
    if (!task) return;
    try {
      await dispatch(
        updateSubtask({
          id: subtask.id,
          data: { completed: !subtask.completed },
        })
      ).unwrap();
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      toast.error("Failed to update subtask.");
      console.error(error);
    }
  }, [dispatch, task]);

  const handleDeleteSubtask = useCallback(async (subtaskId: string) => {
    if (!task) return;
    try {
      await dispatch(deleteSubtask(subtaskId)).unwrap();
      toast.success("Subtask deleted successfully");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      toast.error("Failed to delete subtask.");
      console.error(error);
    }
  }, [dispatch, task]);

  const handleAddNote = useCallback(async () => {
    if (!task) return;
    if (!noteText.trim()) return;
    try {
      await dispatch(
        createTaskNote({ 
          task_id: task.id, 
          content: noteText.trim(),
          is_internal: false,
        })
      ).unwrap();
      setNoteText("");
      toast.success("Note added successfully");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      toast.error("Failed to add note.");
      console.error(error);
    }
  }, [dispatch, task, noteText]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!task) return;
    try {
      await dispatch(deleteTaskNote(noteId)).unwrap();
      toast.success("Note deleted successfully");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      toast.error("Failed to delete note.");
      console.error(error);
    }
  }, [dispatch, task]);

  const handleAddReminder = useCallback(async () => {
    if (!task) return;
    if (!reminderDate) return;
    try {
      await dispatch(
        createReminder({
          task_id: task.id,
          remind_at: new Date(reminderDate).toISOString(),
          repeat: "none",
        })
      ).unwrap();
      setReminderDate("");
      toast.success("Reminder added successfully");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      toast.error("Failed to add reminder.");
      console.error(error);
    }
  }, [dispatch, task, reminderDate]);

  const handleDeleteReminder = useCallback(async (reminderId: string) => {
    if (!task) return;
    try {
      await dispatch(deleteReminder(reminderId)).unwrap();
      toast.success("Reminder deleted successfully");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      toast.error("Failed to delete reminder.");
      console.error(error);
    }
  }, [dispatch, task]);

  const getUserName = useCallback((id: string) => {
    const user = users.find((u) => u.id === id);
    return user ? user.full_name : id;
  }, [users]);

  // ─── Early returns AFTER all hooks ──────────────────────────────────
  if (!show) return null;

  // ─── Render loading state ─────────────────────────────────────────────
  if (loading && !task) {
    return (
      <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-[1000] backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-10 w-full max-w-xl text-center text-slate-500 animate-pulse font-medium shadow-2xl">
          Loading task configuration…
        </div>
      </div>
    );
  }

  // ─── Render error state ─────────────────────────────────────────────
  if (!task) {
    return (
      <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-[1000] backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-10 w-full max-w-xl text-center text-red-600 font-semibold shadow-2xl">
          Task not found
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-[1000] backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col font-sans animate-in fade-in zoom-in-95 duration-200">

        {/* ─── Top Bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span>🔒</span>
            <span className="hover:text-slate-600 cursor-pointer">My lists</span>
            <span>›</span>
            <span className="text-slate-600 font-semibold">{task.project_id ? "Project" : "Personal"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkComplete}
              className="px-4 py-1.5 rounded-full border border-slate-900 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
            >
              {task.status === "done" ? "Reopen Task" : "Mark as complete"}
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition text-sm"
              title={isEditing ? "Cancel editing" : "Edit task"}
            >
              {isEditing ? "✕" : "✏️"}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition text-sm"
              title="Close Panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ─── Task Title ───────────────────────────────────────────────── */}
        <div className="px-6 pt-3 pb-4 flex items-start gap-3">
          {isEditing ? (
            <div className="flex-1 space-y-3">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-lg font-serif font-bold text-[#1E3F20] bg-white focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] outline-none transition"
                placeholder="Task title"
              />
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] outline-none transition resize-y min-h-[60px]"
                placeholder="Task description"
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                  <select
                    value={editedStatus}
                    onChange={(e) => setEditedStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] outline-none transition"
                  >
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="overdue">Overdue</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="blocked">Blocked</option>
                    <option value="review">Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
                  <select
                    value={editedPriority}
                    onChange={(e) => setEditedPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] outline-none transition"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Visibility</label>
                  <select
                    value={editedVisibility}
                    onChange={(e) => setEditedVisibility(e.target.value as TaskVisibility)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] outline-none transition"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="team">Team</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-lg bg-[#A37F0C] text-white text-sm font-bold hover:bg-[#856404] transition shadow-sm"
                >
                  Save changes
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <h1 className="font-serif text-2xl font-bold text-[#1E3F20] tracking-wide m-0 uppercase">
                {task.title}
              </h1>
              {task.description && (
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{task.description}</p>
              )}
            </div>
          )}
        </div>

        {/* ─── Information Pills ────────────────────────────────────────── */}
        <div className="px-6 pb-5 flex flex-wrap gap-2 border-b border-slate-100">
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
            🔕 Remind me
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#A37F0C] bg-[#FDFBF7] text-xs font-bold text-[#A37F0C]">
            📁 {task.project_id ? "Project Assigned" : "Personal Folder"}
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
            # Tags
          </button>
          {task.deadline && (
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              📅{" "}
              {new Date(task.deadline).toLocaleDateString("en-KE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            👤 {task.assignee === "GROUP" ? "Group Task" : getUserName(task.assignee || "")}
          </span>
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            ⭐ {task.priority}
          </span>
          <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            🔍 {task.visibility}
          </span>
        </div>

        {/* ─── Notes ───────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Notes ({details?.notes?.length || 0})
            </span>
          </div>
          <textarea
            placeholder="Insert your notes here..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            className="w-full p-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white outline-none transition min-h-[70px] resize-y focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] shadow-sm"
          />
          {details?.notes && details.notes.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {details.notes.map((note) => (
                <div
                  key={note.id}
                  className="flex justify-between items-center p-2.5 px-3.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-700 shadow-xs"
                >
                  <span className="leading-relaxed">{note.content}</span>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-slate-400 hover:text-red-600 transition pl-2 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Subtasks ────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Subtasks{" "}
              <span className="ml-1 text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-md">
                {details?.subtasks
                  ? `${details.subtasks.filter((s) => s.completed).length}/${details.subtasks.length}`
                  : "0/0"}
              </span>
            </span>
          </div>

          <div className="space-y-1.5">
            {details?.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-3 p-2.5 px-3 rounded-xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300"
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer transition flex-shrink-0 ${
                    subtask.completed
                      ? "border-[#1E3F20] bg-[#1E3F20]"
                      : "border-slate-300 bg-transparent hover:border-slate-400"
                  }`}
                  onClick={() => handleToggleSubtask(subtask)}
                >
                  {subtask.completed && (
                    <span className="text-white text-[9px] font-bold">✓</span>
                  )}
                </div>
                <span
                  className={`text-sm flex-1 font-medium ${
                    subtask.completed
                      ? "text-slate-400 line-through decoration-slate-300"
                      : "text-slate-800"
                  }`}
                >
                  {subtask.title}
                </span>
                {subtask.assigned_to && (
                  <span className="text-xs text-slate-400">→ {subtask.assigned_to}</span>
                )}
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="text-slate-300 hover:text-red-500 transition text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 p-2.5 px-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 mt-2 focus-within:border-[#A37F0C] focus-within:bg-white transition-all">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 flex-shrink-0" />
            <input
              type="text"
              placeholder="Add a new subtask..."
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSubtask();
                }
              }}
              className="flex-1 border-none outline-none text-sm text-slate-800 bg-transparent placeholder-slate-400 font-medium"
            />
          </div>
        </div>

        {/* ─── Reminders ──────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Reminders ({details?.reminders?.length || 0})
          </span>
          {details?.reminders && details.reminders.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {details.reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex justify-between items-center p-2 px-3 bg-white border border-slate-100 rounded-lg text-sm text-slate-700 shadow-2xs"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    ⏰{" "}
                    {new Date(reminder.remind_at).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {reminder.sent && <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">(sent)</span>}
                    {reminder.repeat && reminder.repeat !== "none" && (
                      <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                        🔄 {reminder.repeat}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handleDeleteReminder(reminder.id)}
                    className="text-slate-300 hover:text-red-500 transition text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] transition shadow-xs font-medium"
            />
            <button
              onClick={handleAddReminder}
              disabled={!reminderDate}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                reminderDate
                  ? "bg-[#1E3F20] text-white hover:bg-[#163018] shadow-sm"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Add
            </button>
          </div>
        </div>

        {/* ─── Attachments ───────────────────────────────────────────────── */}
        <div className="px-6 py-5 pb-6">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Attachments ({task.attachments?.length || 0})
          </span>
          {task.attachments && task.attachments.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {task.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex justify-between items-center p-2 px-3 bg-slate-50 border border-slate-100 rounded-lg text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span>📄</span>
                    <span className="text-slate-700">{attachment.file_name}</span>
                    <span className="text-xs text-slate-400">
                      ({(attachment.file_size / 1024).toFixed(1)} KB)
                    </span>
                  </span>
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
          <div
            className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-xl p-5 text-center cursor-pointer transition hover:border-[#A37F0C] hover:bg-[#FDFBF7]"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("border-[#A37F0C]", "bg-[#FDFBF7]");
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("border-[#A37F0C]", "bg-[#FDFBF7]");
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-[#A37F0C]", "bg-[#FDFBF7]");
              console.log("Files dropped", e.dataTransfer.files);
            }}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files) {
                  console.log("Files selected", files);
                }
              };
              input.click();
            }}
          >
            <div className="text-sm font-semibold text-slate-500">📎 Click to add or drop your files here</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToDoModal;