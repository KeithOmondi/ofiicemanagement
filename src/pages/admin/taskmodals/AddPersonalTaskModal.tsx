import React, { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hook";
import { selectCurrentUser } from "../../../store/slices/userSlice";
import type { Priority } from "../../../types/tasks.types";
import { createTask } from "../../../store/slices/tasksSlice";

interface AddPersonalTaskModalProps {
  show: boolean;
  onClose: () => void;
}

const AddPersonalTaskModal: React.FC<AddPersonalTaskModalProps> = ({
  show,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [deadline, setDeadline] = useState("");
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    setTitle("");
    setDescription("");
    setPriority("normal");
    setDeadline("");
    setStartDate("");
    setLoading(false);
    onClose();
  }, [onClose]);

 const handleSubmit = useCallback(async () => {
  // ─── Validation ──────────────────────────────────────────────
  console.log('🔍 [handleSubmit] Starting task creation...');
  console.log('📋 [handleSubmit] Form data:', {
    title: title.trim(),
    description: description.trim() || null,
    priority,
    deadline,
    startDate: startDate || null,
    currentUser: currentUser ? {
      id: currentUser.id,
      full_name: currentUser.full_name,
      email: currentUser.email,
    } : null,
  });

  // Validate title
  if (!title.trim()) {
    console.warn('❌ [handleSubmit] Validation failed: Title is required');
    alert("Task title is required");
    return;
  }
  console.log('✅ [handleSubmit] Title validation passed');

  // Validate deadline
  if (!deadline) {
    console.warn('❌ [handleSubmit] Validation failed: Deadline is required');
    alert("Deadline is required");
    return;
  }
  console.log('✅ [handleSubmit] Deadline validation passed');
  console.log(`📅 [handleSubmit] Deadline value: ${deadline}`);

  // Validate current user
  if (!currentUser) {
    console.warn('❌ [handleSubmit] Validation failed: No current user found');
    alert("User not found");
    return;
  }
  console.log('✅ [handleSubmit] Current user validation passed');
  console.log(`👤 [handleSubmit] Creating task for: ${currentUser.full_name} (${currentUser.id})`);

  // ─── Prepare data ──────────────────────────────────────────────
  const taskPayload = {
    title: title.trim(),
    description: description.trim() || null,
    priority,
    deadline,
    start_date: startDate || null,
    project_id: null,
    assignee: currentUser.id,
  };

  console.log('📤 [handleSubmit] Task payload:', JSON.stringify(taskPayload, null, 2));

  // ─── Submit ──────────────────────────────────────────────────
  setLoading(true);
  console.log('⏳ [handleSubmit] Loading state set to true');

  try {
    console.log('🚀 [handleSubmit] Dispatching createTask...');
    const result = await dispatch(createTask(taskPayload)).unwrap();
    
    console.log('✅ [handleSubmit] Task created successfully!');
    console.log('📦 [handleSubmit] Response data:', JSON.stringify(result, null, 2));
    
    console.log('🔚 [handleSubmit] Closing modal and resetting form...');
    handleClose();
    
  } catch (error) {
    console.error('❌ [handleSubmit] Task creation failed!');
    console.error('❌ [handleSubmit] Error object:', error);
    
    let message = "Failed to create task";
    
    // Type-safe error handling
    if (typeof error === "string") {
      message = error;
      console.error(`❌ [handleSubmit] Error message (string): ${message}`);
    } else if (error && typeof error === "object") {
      console.error('❌ [handleSubmit] Error type:', Object.prototype.toString.call(error));
      
      // Check for message property
      if ("message" in error && typeof (error as { message: string }).message === "string") {
        message = (error as { message: string }).message;
        console.error(`❌ [handleSubmit] Error message from object: ${message}`);
      }
      
      // Check for response data (common with API errors)
      if ("response" in error) {
        const responseError = error as { response: { data?: unknown; status?: number } };
        console.error(`❌ [handleSubmit] Response status: ${responseError.response?.status || 'unknown'}`);
        
        if (responseError.response?.data) {
          console.error('❌ [handleSubmit] Full response data:', JSON.stringify(responseError.response.data, null, 2));
          
          // Try to extract message from response data
          const responseData = responseError.response.data as Record<string, unknown>;
          if (responseData.message && typeof responseData.message === 'string') {
            message = responseData.message;
            console.error(`❌ [handleSubmit] API error message: ${message}`);
          } else if (responseData.error && typeof responseData.error === 'string') {
            message = responseData.error;
            console.error(`❌ [handleSubmit] API error message from 'error' field: ${message}`);
          }
        }
      }
      
      // Check for stack trace
      if ("stack" in error && typeof (error as { stack: string }).stack === "string") {
        console.error('❌ [handleSubmit] Stack trace:', (error as { stack: string }).stack);
      }
    }
    
    console.error(`❌ [handleSubmit] Final error message: ${message}`);
    alert(message);
    
  } finally {
    setLoading(false);
    console.log('⏳ [handleSubmit] Loading state set to false');
    console.log('🔚 [handleSubmit] Task creation flow completed');
  }
}, [title, description, deadline, currentUser, dispatch, priority, startDate, handleClose]);

  // Handle ESC key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [show, handleClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!show) return null;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm">
        <div className="bg-white rounded-xl p-6 border border-slate-200 max-w-sm text-center shadow-xl">
          <p className="text-sm font-medium text-slate-700">User credentials not found. Please log in again.</p>
          <button 
            onClick={handleClose} 
            className="mt-4 w-full px-4 py-2 bg-[#A37F0C] text-white rounded-lg font-semibold text-sm hover:bg-[#856404] transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-[#1E3F20] m-0 flex items-center gap-2">
            📋 Add Personal Task
          </h3>
          <button
            className="bg-none border-none text-xl cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] transition"
              placeholder="e.g. Review draft judgment before Friday session"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] focus:ring-1 focus:ring-[#A37F0C] transition resize-y min-h-[80px]"
              placeholder="Provide case references or specific documentation notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Deadline *
              </label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white outline-none focus:border-[#A37F0C] transition"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

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
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <button
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-100 hover:text-slate-800 transition"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg font-semibold text-sm bg-[#A37F0C] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#856404] transition shadow-sm"
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !deadline}
          >
            {loading ? "Adding..." : "Add to My To‑Do"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPersonalTaskModal;