import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hook";
import { selectAllUsers, selectCurrentUser } from "../../../store/slices/userSlice";
import type { Priority } from "../../../types/tasks.types";
import { createTask } from "../../../store/slices/tasksSlice";

interface AddStandaloneModalProps {
  show: boolean;
  onClose: () => void;
}

const AddStandaloneModal: React.FC<AddStandaloneModalProps> = ({ show, onClose }) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const currentUser = useAppSelector(selectCurrentUser);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string>(currentUser?.id || "");
  const [priority, setPriority] = useState<Priority>("normal");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Task title is required");
      return;
    }
    if (!deadline) {
      alert("Deadline is required");
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
          project_id: null, // standalone task
          assignee,
        })
      ).unwrap();

      // Reset and close
      setTitle("");
      setDescription("");
      setAssignee(currentUser?.id || "");
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

  return (
    <div
      className="fixed inset-0 bg-slate-950/40 flex items-center justify-center z-[1000] backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-[#1E3F20] m-0 flex items-center gap-2">
            ⚡ Create Standalone Task
          </h3>
          <button
            className="bg-none border-none text-xl cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] transition"
              placeholder="e.g. Reply to AG Circular"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] transition min-h-[70px] resize-y"
              placeholder="Details about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Assign To
              </label>
              <select
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] transition"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Select a member</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.pj_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] transition"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] transition"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Deadline
              </label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] transition"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <button
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-100 hover:text-slate-800 transition"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm bg-[#A37F0C] text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-[#856404]"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStandaloneModal;