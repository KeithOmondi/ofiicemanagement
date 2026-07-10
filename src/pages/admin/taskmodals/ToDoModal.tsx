// src/modals/tasksmodals/ToDoModal.tsx

import React, { useState } from "react";
import type { MemberCode, Task, StandaloneTask, Member } from "./taskTypes";

interface ToDoModalProps {
  show: boolean;
  onClose: () => void;
  task: Task | StandaloneTask | null;
  projectTitle?: string | null;
  projectId?: string | null; // ← NEW: pass the actual project ID
  onMarkComplete: (taskId: string, projId: string | null) => void;
  onAddSubtask?: (taskId: string, subtask: string) => void;
  onUpdateNote?: (taskId: string, note: string) => void;
  membersList: Record<MemberCode, Member>;
}

const ToDoModal: React.FC<ToDoModalProps> = ({
  show,
  onClose,
  task,
  projectTitle,
  projectId, // ← NEW: receive project ID
  onMarkComplete,
  onAddSubtask,
  onUpdateNote,
  membersList,
}) => {
  const [noteText, setNoteText] = useState("");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);

  if (!show || !task) return null;

  // ✅ Removed unused isStandalone
  const assigneeName = task.assignee === "GROUP" 
    ? "Group" 
    : membersList[task.assignee as MemberCode]?.name || task.assignee;

  const handleMarkComplete = () => {
    // ✅ Pass the actual project ID (or null for standalone)
    onMarkComplete(task.id, projectId || null);
    onClose();
  };

  const handleAddSubtask = () => {
    if (subtaskInput.trim()) {
      setSubtasks([...subtasks, subtaskInput.trim()]);
      if (onAddSubtask) {
        onAddSubtask(task.id, subtaskInput.trim());
      }
      setSubtaskInput("");
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value);
    if (onUpdateNote) {
      onUpdateNote(task.id, e.target.value);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--white)",
          borderRadius: "16px",
          width: "90%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          animation: "modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ─── Close Button ─── */}
        <div
          style={{
            padding: "16px 20px 0 20px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "var(--slate)",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* ─── Task Title ─── */}
        <div style={{ padding: "0 24px 16px 24px" }}>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "20px",
              fontWeight: 600,
              margin: 0,
              color: "var(--navy)",
            }}
          >
            {task.title}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "6px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                background: "var(--cream-dark)",
                padding: "2px 10px",
                borderRadius: "12px",
                color: "var(--slate)",
              }}
            >
              {projectTitle || "Personal"}
            </span>
            {task.deadline && (
              <span style={{ fontSize: "12px", color: "var(--slate)" }}>
                📅 {new Date(task.deadline).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            <span style={{ fontSize: "12px", color: "var(--slate)" }}>
              👤 {assigneeName}
            </span>
          </div>
        </div>

        {/* ─── Action Buttons ─── */}
        <div
          style={{
            padding: "12px 24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            borderTop: "1px solid var(--cream-dark)",
            borderBottom: "1px solid var(--cream-dark)",
          }}
        >
          <button
            onClick={handleMarkComplete}
            style={{
              padding: "6px 16px",
              borderRadius: "20px",
              border: "none",
              background: "var(--green-light)",
              color: "white",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ✅ Mark as complete
          </button>
          <button
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--cream-dark)",
              background: "transparent",
              fontSize: "12px",
              cursor: "pointer",
              color: "var(--slate)",
            }}
          >
            ⏰ Remind me
          </button>
          <button
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--cream-dark)",
              background: "transparent",
              fontSize: "12px",
              cursor: "pointer",
              color: "var(--slate)",
            }}
          >
            📋 Lists
          </button>
          <button
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--cream-dark)",
              background: "transparent",
              fontSize: "12px",
              cursor: "pointer",
              color: "var(--slate)",
            }}
          >
            # Tags
          </button>
          <button
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--cream-dark)",
              background: "transparent",
              fontSize: "12px",
              cursor: "pointer",
              color: "var(--red)",
            }}
          >
            🗑 Archive
          </button>
          <button
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--cream-dark)",
              background: "transparent",
              fontSize: "12px",
              cursor: "pointer",
              color: "var(--slate)",
            }}
          >
            📤 Remove from My Day
          </button>
        </div>

        {/* ─── Notes ─── */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--cream-dark)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--slate)",
              }}
            >
              Notes
            </span>
          </div>
          <textarea
            placeholder="Insert your notes here"
            value={noteText}
            onChange={handleNoteChange}
            style={{
              width: "100%",
              padding: "10px",
              border: "1.5px solid var(--cream-dark)",
              borderRadius: "8px",
              fontSize: "13px",
              fontFamily: "'DM Sans', sans-serif",
              color: "var(--navy)",
              background: "var(--cream)",
              outline: "none",
              minHeight: "80px",
              resize: "vertical",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
            onBlur={(e) => e.target.style.borderColor = "var(--cream-dark)"}
          />
        </div>

        {/* ─── Subtasks ─── */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--cream-dark)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--slate)",
              }}
            >
              Subtasks ({subtasks.length}/0)
            </span>
          </div>
          {subtasks.map((st, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 0",
                borderBottom: "1px solid var(--cream-dark)",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  border: "2px solid var(--slate-light)",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSubtasks(subtasks.filter((_, i) => i !== idx));
                }}
              />
              <span style={{ fontSize: "13px", color: "var(--navy)" }}>{st}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input
              type="text"
              placeholder="Add a new subtask"
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddSubtask();
                }
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1.5px solid var(--cream-dark)",
                borderRadius: "8px",
                fontSize: "13px",
                fontFamily: "'DM Sans', sans-serif",
                color: "var(--navy)",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
              onBlur={(e) => e.target.style.borderColor = "var(--cream-dark)"}
            />
            <button
              onClick={handleAddSubtask}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "var(--gold)",
                color: "var(--navy)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* ─── Attachments ─── */}
        <div style={{ padding: "16px 24px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--slate)",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Attachments
          </span>
          <div
            style={{
              border: "2px dashed var(--slate-light)",
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s",
              background: "var(--cream)",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--gold)";
              e.currentTarget.style.background = "var(--gold-pale)";
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--slate-light)";
              e.currentTarget.style.background = "var(--cream)";
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--slate-light)";
              e.currentTarget.style.background = "var(--cream)";
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
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📎</div>
            <div style={{ fontSize: "13px", color: "var(--slate)" }}>
              Click to add / drop your files here
            </div>
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid var(--cream-dark)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--cream)",
            borderRadius: "0 0 16px 16px",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--slate)" }}>
            Created in {projectTitle || "Personal"}
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "6px 20px",
              borderRadius: "20px",
              border: "none",
              background: "var(--navy)",
              color: "white",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToDoModal;