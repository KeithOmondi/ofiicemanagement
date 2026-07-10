import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hook";
import { selectAllUsers, selectCurrentUser } from "../../../store/slices/userSlice";
import type { Priority, MemberCode } from "../../../types/tasks.types";
import { createProject } from "../../../store/slices/tasksSlice";

interface AddProjectModalProps {
  show: boolean;
  onClose: () => void;
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({ show, onClose }) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const currentUser = useAppSelector(selectCurrentUser);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [selectedMembers, setSelectedMembers] = useState<MemberCode[]>(
    currentUser ? [currentUser.id] : []
  );
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Project title is required");
      return;
    }
    if (!deadline) {
      alert("Project deadline is required");
      return;
    }
    if (selectedMembers.length === 0) {
      alert("Please select at least one member");
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        createProject({
          title: title.trim(),
          description: description.trim() || null,
          deadline: new Date(deadline).toISOString(), // ✅ convert to ISO string
          priority,
          members: selectedMembers,
        })
      ).unwrap();

      // Reset and close
      setTitle("");
      setDescription("");
      setDeadline("");
      setPriority("normal");
      setSelectedMembers(currentUser ? [currentUser.id] : []);
      onClose();
    } catch (error) {
      let message = "Failed to create project";
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
            📂 Create New Project
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
              Project Title
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] transition"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] transition min-h-[80px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] transition"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
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

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Members
            </label>
            <div className="flex flex-wrap gap-2">
              {users.map((user) => {
                const isSelected = selectedMembers.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className={`flex items-center gap-1.5 text-xs font-medium cursor-pointer px-3 py-1.5 rounded-full border transition select-none ${
                      isSelected
                        ? "bg-[#1E3F20] border-[#1E3F20] text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={user.id}
                      checked={isSelected}
                      onChange={() => toggleMember(user.id)}
                      className="hidden"
                    />
                    {user.full_name} ({user.pj_number})
                  </label>
                );
              })}
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
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;