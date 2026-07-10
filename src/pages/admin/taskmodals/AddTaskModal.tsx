import React, { useState } from "react";
import { useAppDispatch } from "../../../store/hook";
import type { Priority, Project } from "../../../types/tasks.types";
import { createTask } from "../../../store/slices/tasksSlice";

interface AddTaskModalProps {
  show: boolean;
  onClose: () => void;
  project: Project | null; // full project object from parent
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ show, onClose, project }) => {
  const dispatch = useAppDispatch();

  // State initialised from the project prop (re‑initialised on remount via key)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string | "GROUP">("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState(project?.deadline || "");
  const [loading, setLoading] = useState(false);

  if (!show || !project) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Task title is required");
      return;
    }
    if (!deadline) {
      alert("Task deadline is required");
      return;
    }
    if (!assignee) {
      alert("Please select an assignee");
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        createTask({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          deadline,
          start_date: startDate || null,
          project_id: project.id,
          assignee,
        })
      ).unwrap();

      // Reset and close
      setTitle("");
      setDescription("");
      setAssignee("");
      setPriority("normal");
      setStartDate("");
      setDeadline("");
      onClose();
    } catch (error) {
      let message = "Failed to create task";
      if (typeof error === "string") {
        message = error;
      } else if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message: string }).message === "string"
      ) {
        message = (error as { message: string }).message;
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (dateStr: string): string => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black/60 flex items-center justify-center z-[9999] backdrop-blur-sm transition-opacity p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl w-full max-w-[560px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-[modalIn_0.25s_cubic-bezier(0.34,1.56,0.64,1)] text-slate-800"
      >
        {/* Header */}
        <div className="modal-header p-5 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
          <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>➕</span> Add Task to Project
          </h3>
          <button
            className="modal-close bg-transparent border-none text-xl font-light cursor-pointer text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body p-6 overflow-y-auto space-y-4 bg-white flex-1 custom-scrollbar">
          {/* Project Details Banner */}
          <div className="bg-slate-900 text-white p-3 px-4 rounded-lg text-xs md:text-sm flex flex-wrap gap-2 items-center justify-between">
            <span className="font-medium truncate max-w-[280px]">📂 {project.title}</span>
            <span className="text-slate-300">
              Project deadline: <strong className="text-amber-400 font-semibold">{fmtDate(project.deadline)}</strong>
            </span>
          </div>

          {/* Task Title */}
          <div className="form-group">
            <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="form-control w-full p-2.5 px-3.5 border-1.5 border-gray-300 rounded-lg text-[14px] text-slate-900 bg-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              placeholder="e.g. Collect data from Criminal Division"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">
              Description
            </label>
            <textarea
              className="form-control w-full p-2.5 px-3.5 border-1.5 border-gray-300 rounded-lg text-[14px] text-slate-900 bg-white placeholder-slate-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all min-h-[80px] resize-y"
              placeholder="What needs to be done for this task?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Grid Layout: Assignee and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">
                Assign To <span className="text-red-500">*</span>
              </label>
              <select
                className="form-control w-full p-2.5 px-3.5 border-1.5 border-gray-300 rounded-lg text-[14px] text-slate-900 bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">-- Select Member --</option>
                {project.members.map((memberId) => (
                  <option key={memberId} value={memberId}>
                    {memberId}
                  </option>
                ))}
                <option value="GROUP">Whole Project Group</option>
              </select>
            </div>

            <div className="form-group">
              <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">
                Priority
              </label>
              <select
                className="form-control w-full p-2.5 px-3.5 border-1.5 border-gray-300 rounded-lg text-[14px] text-slate-900 bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Grid Layout: Start Date and Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                className="form-control w-full p-2.5 px-3.5 border-1.5 border-gray-300 rounded-lg text-[14px] text-slate-900 bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1.5">
                Task Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="form-control w-full p-2.5 px-3.5 border-1.5 border-gray-300 rounded-lg text-[14px] text-slate-900 bg-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer p-4 px-6 border-t border-gray-200 flex gap-3 justify-end bg-slate-50 shrink-0">
          <button
            type="button"
            className="btn btn-outline p-2 px-5 rounded-lg border-1.5 border-gray-300 bg-white text-slate-700 font-medium text-sm hover:bg-gray-50 hover:text-slate-900 active:bg-gray-100 transition-all cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn p-2 px-5 rounded-lg font-semibold text-sm transition-all shadow-sm ${
              loading 
                ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
                : "bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-[0.98] cursor-pointer"
            }`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;