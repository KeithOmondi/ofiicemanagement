import React, { useState, useEffect, useRef } from "react";
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
} from "../../../store/slices/tasksSlice";
import type { Subtask } from "../../../types/tasks.types";
import { selectAllUsers } from "../../../store/slices/userSlice";

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
  const users = useAppSelector(selectAllUsers);

  // ── Edit state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  const [noteText, setNoteText] = useState("");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const initialLoad = useRef(true);

  // ─── Fetch task when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (show && taskId) {
      dispatch(fetchFullTask(taskId));
    }
  }, [show, taskId, dispatch]);

  // ─── Reset local state when task changes ──────────────────────────────
  useEffect(() => {
    if (task && !initialLoad.current) {
      setNoteText("");
      setSubtaskInput("");
      setReminderDate("");
      // Initialize edit fields when task loads
      setEditedTitle(task.title);
      setEditedDescription(task.description || "");
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
    }
  }, [show, dispatch]);

  // ─── Early returns ──────────────────────────────────────────────────
  if (!show) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-[1000] backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-10 w-full max-w-xl text-center text-slate-500 animate-pulse font-medium shadow-2xl">
          Loading task configuration…
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-[1000] backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-10 w-full max-w-xl text-center text-red-600 font-semibold shadow-2xl">
          Task not found
        </div>
      </div>
    );
  }

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleMarkComplete = async () => {
    try {
      const newStatus = task.status === "done" ? "todo" : "done";
      const newProgress = newStatus === "done" ? 100 : 0;
      await dispatch(
        updateTask({
          id: task.id,
          data: { id: task.id, status: newStatus, progress: newProgress },
        })
      ).unwrap();
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      alert("Failed to update task status. Please try again.");
      console.error(error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedTitle.trim()) {
      alert("Task title is required");
      return;
    }
    try {
      await dispatch(
        updateTask({
          id: task.id,
          data: {
            id: task.id,
            title: editedTitle.trim(),
            description: editedDescription.trim() || null,
          },
        })
      ).unwrap();
      setIsEditing(false);
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      alert("Failed to save changes. Please try again.");
      console.error(error);
    }
  };

  const handleAddSubtask = async () => {
    if (!subtaskInput.trim()) return;
    try {
      await dispatch(
        createSubtask({ task_id: task.id, title: subtaskInput.trim() })
      ).unwrap();
      setSubtaskInput("");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      alert("Failed to add subtask.");
      console.error(error);
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      await dispatch(
        updateSubtask({
          id: subtask.id,
          data: { id: subtask.id, completed: !subtask.completed },
        })
      ).unwrap();
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      alert("Failed to update subtask.");
      console.error(error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await dispatch(deleteSubtask(subtaskId)).unwrap();
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      alert("Failed to delete subtask.");
      console.error(error);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await dispatch(
        createTaskNote({ task_id: task.id, content: noteText.trim() })
      ).unwrap();
      setNoteText("");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      alert("Failed to add note.");
      console.error(error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await dispatch(deleteTaskNote(noteId)).unwrap();
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      alert("Failed to delete note.");
      console.error(error);
    }
  };

  const handleAddReminder = async () => {
    if (!reminderDate) return;
    try {
      await dispatch(
        createReminder({
          task_id: task.id,
          remind_at: new Date(reminderDate),
        })
      ).unwrap();
      setReminderDate("");
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      alert("Failed to add reminder.");
      console.error(error);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      await dispatch(deleteReminder(reminderId)).unwrap();
      dispatch(fetchFullTask(task.id));
    } catch (error) {
      alert("Failed to delete reminder.");
      console.error(error);
    }
  };

  const getUserName = (id: string) => {
    const user = users.find((u) => u.id === id);
    return user ? user.full_name : id;
  };

  // ─── Render ──────────────────────────────────────────────────────────
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
            <div className="flex-1">
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
                className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] outline-none transition resize-y min-h-[60px]"
                placeholder="Task description"
              />
              <button
                onClick={handleSaveEdit}
                className="mt-2 px-4 py-1.5 rounded-lg bg-[#A37F0C] text-white text-xs font-bold hover:bg-[#856404] transition shadow-sm"
              >
                Save changes
              </button>
            </div>
          ) : (
            <div className="flex-1">
              <h1 className="font-serif text-2xl font-bold text-[#1E3F20] tracking-wide m-0 uppercase">
                {task.title}
                <span className="text-lg text-slate-400 font-normal ml-2">↓</span>
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
            👤 {task.assignee === "GROUP" ? "Group Task" : getUserName(task.assignee)}
          </span>
        </div>

        {/* ─── Notes ───────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Notes
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
            Reminders
          </span>
          {details?.reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex justify-between items-center p-2 px-3 bg-white border border-slate-100 rounded-lg mb-1.5 text-sm text-slate-700 shadow-2xs"
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
              </span>
              <button
                onClick={() => handleDeleteReminder(reminder.id)}
                className="text-slate-300 hover:text-red-500 transition text-xs"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
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
            Attachments
          </span>
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
            <div className="text-sm font-semibold text-slate-500">📎 Click to add or drop your layout documents here</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToDoModal;