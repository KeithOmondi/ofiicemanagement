import React from "react";
import type { MemberCode, Priority, Member } from "./taskTypes";

interface AddStandaloneModalProps {
  show: boolean;
  onClose: () => void;
  onSave: () => void;
  newStandalone: {
    title: string;
    desc: string;
    assignee: MemberCode;
    priority: Priority;
    startDate: string;
    deadline: string;
  };
  setNewStandalone: React.Dispatch<React.SetStateAction<{
    title: string;
    desc: string;
    assignee: MemberCode;
    priority: Priority;
    startDate: string;
    deadline: string;
  }>>;
  membersList: Record<MemberCode, Member>;
}

const AddStandaloneModal: React.FC<AddStandaloneModalProps> = ({
  show,
  onClose,
  onSave,
  newStandalone,
  setNewStandalone,
  membersList,
}) => {
  if (!show) return null;

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
            ⚡ Create Standalone Task
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
              placeholder="e.g. Reply to AG Circular"
              value={newStandalone.title}
              onChange={(e) => setNewStandalone({ ...newStandalone, title: e.target.value })}
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
              placeholder="Details about this task..."
              value={newStandalone.desc}
              onChange={(e) => setNewStandalone({ ...newStandalone, desc: e.target.value })}
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
                value={newStandalone.assignee}
                onChange={(e) => setNewStandalone({ ...newStandalone, assignee: e.target.value as MemberCode })}
              >
                {Object.entries(membersList).map(([code, member]) => (
                  <option key={code} value={code}>
                    {member.name}
                  </option>
                ))}
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
                value={newStandalone.priority}
                onChange={(e) => setNewStandalone({ ...newStandalone, priority: e.target.value as Priority })}
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
                value={newStandalone.startDate}
                onChange={(e) => setNewStandalone({ ...newStandalone, startDate: e.target.value })}
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
                Deadline
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
                value={newStandalone.deadline}
                onChange={(e) => setNewStandalone({ ...newStandalone, deadline: e.target.value })}
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
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStandaloneModal;