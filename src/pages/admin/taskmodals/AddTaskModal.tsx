import React from "react";
import type { MemberCode, Priority, Project, Member } from "./taskTypes";

// We need fmtDate helper – you can import it or pass it as a prop.
// For simplicity, we'll re-define it or import from a utils file.

const fmtDate = (dateStr: string): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
};

interface AddTaskModalProps {
  show: boolean;
  onClose: () => void;
  onSave: () => void;
  project: Project | null;
  newTask: {
    title: string;
    desc: string;
    assignee: MemberCode | "GROUP" | "";
    priority: Priority;
    startDate: string;
    deadline: string;
  };
  setNewTask: React.Dispatch<React.SetStateAction<{
    title: string;
    desc: string;
    assignee: MemberCode | "GROUP" | "";
    priority: Priority;
    startDate: string;
    deadline: string;
  }>>;
  membersList: Record<MemberCode, Member>; // pass MEMBERS
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  show,
  onClose,
  onSave,
  project,
  newTask,
  setNewTask,
  membersList,
}) => {
  if (!show || !project) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
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
          borderRadius: "12px",
          width: "90%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 12px 48px rgba(26,61,0,0.18)",
          animation: "modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--cream-dark)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", margin: 0 }}>
            ➕ Add Task to Project
          </h3>
          <button
            className="modal-close"
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--slate)" }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ padding: "24px" }}>
          <div
            style={{
              background: "var(--navy)",
              color: "white",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "13px",
            }}
          >
            📂 <strong>{project.title}</strong> &nbsp;·&nbsp; Project deadline:{" "}
            <strong style={{ color: "var(--gold-light)" }}>{fmtDate(project.deadline)}</strong>
          </div>
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label
              className="form-label"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--slate)",
                letterSpacing: "0.04em",
                display: "block",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              Task Title
            </label>
            <input
              type="text"
              className="form-control"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1.5px solid var(--cream-dark)",
                borderRadius: "8px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13.5px",
                color: "var(--navy)",
                background: "var(--white)",
                outline: "none",
              }}
              placeholder="e.g. Collect data from Criminal Division"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label
              className="form-label"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--slate)",
                letterSpacing: "0.04em",
                display: "block",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              Description
            </label>
            <textarea
              className="form-control"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1.5px solid var(--cream-dark)",
                borderRadius: "8px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13.5px",
                color: "var(--navy)",
                background: "var(--white)",
                outline: "none",
                minHeight: "70px",
                resize: "vertical",
              }}
              placeholder="What needs to be done for this task?"
              value={newTask.desc}
              onChange={(e) => setNewTask({ ...newTask, desc: e.target.value })}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label
                className="form-label"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--slate)",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                Assign To
              </label>
              <select
                className="form-control"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid var(--cream-dark)",
                  borderRadius: "8px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13.5px",
                  color: "var(--navy)",
                  background: "var(--white)",
                  outline: "none",
                }}
                value={newTask.assignee}
                onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value as MemberCode | "GROUP" })}
              >
                <option value="">-- Select Member --</option>
                {project.members.map((code) => (
                  <option key={code} value={code}>
                    {membersList[code].name}
                  </option>
                ))}
                <option value="GROUP">Whole Project Group</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label
                className="form-label"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--slate)",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                Priority
              </label>
              <select
                className="form-control"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid var(--cream-dark)",
                  borderRadius: "8px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13.5px",
                  color: "var(--navy)",
                  background: "var(--white)",
                  outline: "none",
                }}
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Priority })}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label
                className="form-label"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--slate)",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                Start Date
              </label>
              <input
                type="date"
                className="form-control"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid var(--cream-dark)",
                  borderRadius: "8px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13.5px",
                  color: "var(--navy)",
                  background: "var(--white)",
                  outline: "none",
                }}
                value={newTask.startDate}
                onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label
                className="form-label"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--slate)",
                  letterSpacing: "0.04em",
                  display: "block",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                }}
              >
                Task Deadline <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                type="date"
                className="form-control"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1.5px solid var(--cream-dark)",
                  borderRadius: "8px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "13.5px",
                  color: "var(--navy)",
                  background: "var(--white)",
                  outline: "none",
                }}
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div
          className="modal-footer"
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--cream-dark)",
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <button
            className="btn btn-outline"
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1.5px solid var(--cream-dark)",
              background: "transparent",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-gold"
            onClick={onSave}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "none",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              background: "var(--gold)",
              color: "var(--navy)",
              cursor: "pointer",
            }}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;