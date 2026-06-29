// src/pages/documents/SuperAdminDocuments.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchDocuments,
  deleteDocument,
  signDocument,
  sendDocument,
  markDocument,
  acknowledgeMark,
  completeMark,
  createComposedDocument,
  createUploadDocument,
  clearError,
  requestSignOtp,
} from "../../store/slices/documentSlice";
import { hasRole } from "../../store/slices/authSlice";
import { fetchUsers, selectAllUsers, selectUsersListLoading } from "../../store/slices/userSlice";
import { fetchDepartments, selectAllDepartments, selectDepartmentsListLoading } from "../../store/slices/departmentsSlice";
import type {
  Document,
  DocumentStatus,
  DocumentType,
  DocumentFilters,
  CreateComposedDocumentInput,
  CreateUploadDocumentInput,
} from "../../types/documents.types";
import { format } from "date-fns";
import { getDocumentTemplate } from "../../components/Layout/documentTemplates";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToastState {
  type: "success" | "error";
  message: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft:          "bg-stone-100 text-stone-500 border border-stone-200",
  uploaded:       "bg-blue-50 text-blue-700 border border-blue-100",
  pending_review: "bg-amber-50 text-amber-700 border border-amber-100",
  marked:         "bg-violet-50 text-violet-700 border border-violet-100",
  in_progress:    "bg-indigo-50 text-indigo-700 border border-indigo-100",
  completed:      "bg-emerald-50 text-emerald-700 border border-emerald-100",
  filed:          "bg-stone-100 text-stone-500 border border-stone-200",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft:          "DRAFT",
  uploaded:       "UPLOADED",
  pending_review: "PENDING",
  marked:         "MARKED",
  in_progress:    "IN PROGRESS",
  completed:      "COMPLETED",
  filed:          "FILED",
};

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${STATUS_STYLES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

// ─── Doc Icon ─────────────────────────────────────────────────────────────────

const DOC_ICON_COLORS: Record<DocumentType, string> = {
  memo:           "text-amber-500",
  letter:         "text-stone-400",
  judgment:       "text-amber-600",
  ruling:         "text-violet-600",
  order:          "text-blue-600",
  correspondence: "text-teal-600",
  upload:         "text-stone-400",
};

const DocIcon: React.FC<{ type: DocumentType; className?: string }> = ({ type, className = "" }) => (
  <svg
    className={`${DOC_ICON_COLORS[type] ?? "text-stone-400"} ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)}KB` : `${(kb / 1024).toFixed(1)}MB`;
};

// ─── Sticky Note ──────────────────────────────────────────────────────────────
// Mounted with key={document.id} so React remounts it on document change —
// no sync-setState effect needed.

interface StickyNoteProps {
  authorName:   string;
  initialText:  string;
  canEdit:      boolean;
  onSave?:      (text: string) => void;
}

const StickyNote: React.FC<StickyNoteProps> = ({ authorName, initialText, canEdit, onSave }) => {
  // Seeded once from props; reset naturally via key prop at call site
  const [text,      setText]      = useState(initialText);
  const [editing,   setEditing]   = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos,       setPos]       = useState<{ x: number; y: number }>({ x: 24, y: 24 });

  // ── Dragging ──────────────────────────────────────────────────────────────
  const dragging   = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const noteRef    = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("textarea,button,a")) return;
    dragging.current   = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  const handleSave = () => {
    setEditing(false);
    onSave?.(text);
  };

  const handleCancel = () => {
    setText(initialText);
    setEditing(false);
  };

  if (minimized) {
    return (
      <button
        style={{ left: pos.x, top: pos.y }}
        className="absolute z-30 flex items-center gap-1.5 rounded-full bg-[#F5C24C] border border-[#E8A840] shadow-md px-3 py-1.5 text-[11px] font-bold text-[#7A4E0D] hover:bg-[#f0bb40] transition-colors cursor-pointer select-none"
        onClick={() => setMinimized(false)}
        title="Expand note"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Note
      </button>
    );
  }

  return (
    <div
      ref={noteRef}
      style={{ left: pos.x, top: pos.y, width: 240 }}
      className="absolute z-30 flex flex-col rounded-md shadow-xl select-none"
      onMouseDown={onMouseDown}
    >
      {/* Tape strip */}
      <div className="flex justify-center -mb-1 pointer-events-none">
        <div className="w-10 h-3 rounded-sm bg-[#F5C24C]/60 border border-[#E8A840]/40 shadow-sm" />
      </div>

      <div
        className="rounded-md overflow-hidden"
        style={{ background: "#FEF08A", boxShadow: "2px 4px 12px rgba(0,0,0,0.18), inset 0 -2px 0 rgba(0,0,0,0.06)" }}
      >
        {/* Header / drag handle */}
        <div
          className="flex items-center justify-between px-2.5 pt-2 pb-1.5 cursor-grab active:cursor-grabbing"
          style={{ background: "#FDE047" }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className="h-3 w-3 text-[#7A4E0D] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 2a1 1 0 011 1v1h1a2 2 0 012 2v1a2 2 0 01-2 2h-.5l.5 9H6l.5-9H6a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 012 0v1h6V3a1 1 0 011-1z" />
            </svg>
            <span className="text-[10px] font-bold text-[#7A4E0D] tracking-wide truncate">{authorName}</span>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {canEdit && !editing && (
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setEditing(true)}
                className="p-0.5 rounded text-[#7A4E0D]/60 hover:text-[#7A4E0D] hover:bg-[#FDE047]/80 transition-colors"
                title="Edit note"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                </svg>
              </button>
            )}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setMinimized(true)}
              className="p-0.5 rounded text-[#7A4E0D]/60 hover:text-[#7A4E0D] hover:bg-[#FDE047]/80 transition-colors"
              title="Minimise"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-2.5 pb-2.5 pt-1.5">
          {editing ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                autoFocus
                rows={6}
                className="w-full resize-none rounded border-0 bg-transparent text-[11px] text-stone-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#E8A840] placeholder:text-stone-400"
                placeholder="Add a note…"
                style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
              />
              <div className="flex justify-end gap-1.5 mt-1.5" onMouseDown={(e) => e.stopPropagation()}>
                <button
                  onClick={handleCancel}
                  className="px-2 py-0.5 rounded text-[10px] font-medium text-[#7A4E0D]/70 hover:bg-[#FDE047] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-2 py-0.5 rounded bg-[#7A4E0D] text-[10px] font-semibold text-white hover:bg-[#5c3a09] transition-colors"
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <p
              className="text-[11px] text-stone-800 leading-relaxed whitespace-pre-wrap break-words min-h-[48px]"
              style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
            >
              {text || <span className="italic text-stone-400">No note yet.</span>}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-2.5 pb-1.5 flex items-center justify-between">
          <span className="text-[9px] text-[#7A4E0D]/50 font-medium">
            {format(new Date(), "dd MMM yyyy")}
          </span>
          <div
            className="w-4 h-4 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.10) 50%)", borderRadius: "0 0 4px 0" }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
  canUpload:    boolean;
  onNewMemo:   () => void;
  onNewLetter: () => void;
  onUpload:    () => void;
}> = ({ canUpload, onNewMemo, onNewLetter, onUpload }) => (
  <div className="flex flex-1 items-center justify-center px-4">
    <div className="text-center max-w-sm">
      <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="mt-3 text-sm font-semibold text-stone-500">Select a document to edit</p>
      <p className="mt-1 text-xs text-stone-400 leading-relaxed">
        Choose a document from the list, or create a new draft to begin editing, e-signing, and sending.
      </p>
      {canUpload && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={onNewMemo}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5C24C] border border-[#E8A840] px-3 py-2 text-xs font-semibold text-[#7A4E0D] hover:bg-[#f0bb40] transition-colors"
          >
            📄 New Memo
          </button>
          <button
            onClick={onNewLetter}
            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition-colors"
          >
            ✉️ New Letter
          </button>
          <button
            onClick={onUpload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
          >
            ↑ Upload Document
          </button>
        </div>
      )}
    </div>
  </div>
);

// ─── List Item ────────────────────────────────────────────────────────────────

const ListItem: React.FC<{
  document: Document;
  selected: boolean;
  onSelect: () => void;
}> = ({ document, selected, onSelect }) => (
  <div
    onClick={onSelect}
    className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
      selected
        ? "bg-[#1E4620]/5 border-l-2 border-[#1E4620]"
        : "hover:bg-stone-50 border-l-2 border-transparent"
    }`}
  >
    <div className="mt-0.5 flex-shrink-0">
      <DocIcon type={document.type} className="h-4 w-4" />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-1.5">
        <p className={`text-xs font-semibold leading-snug truncate ${selected ? "text-[#1E4620]" : "text-stone-800"}`}>
          {document.title}
        </p>
        <StatusBadge status={document.status} />
      </div>

      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400 flex-wrap">
        <span>{document.created_at ? format(new Date(document.created_at), "yyyy-MM-dd") : "—"}</span>
        {document.file_size_bytes && (
          <><span>·</span><span>{formatFileSize(document.file_size_bytes)}</span></>
        )}
        <span>·</span>
        <span className="truncate">{document.reference_no || document.created_by_name || "RHC"}</span>
      </div>

      {document.is_signed && (
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Signed{document.is_sent && <span className="ml-1 text-blue-500">· Sent</span>}
        </div>
      )}

      {document.active_mark && document.status === "marked" && (
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-violet-600">
          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" clipRule="evenodd" />
          </svg>
          Marked to: {document.active_mark.marked_to_dept_name}
          {document.active_mark.assigned_to_name && (
            <span className="ml-1">→ {document.active_mark.assigned_to_name}</span>
          )}
        </div>
      )}
    </div>
  </div>
);

// ─── Annotation Card ──────────────────────────────────────────────────────────

const AnnotationCard: React.FC<{
  title:            string;
  department:       string;
  assignee:         string;
  comment:          string;
  urgent:           boolean;
  visibleInSummary: boolean;
  timestamp:        string;
}> = ({ title, department, assignee, comment, urgent, visibleInSummary, timestamp }) => (
  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-[10px]">
    <div className="flex items-start justify-between gap-2 mb-1">
      <span className="font-semibold text-stone-700 truncate">{title}</span>
      {urgent && <span className="text-red-600 font-bold shrink-0">Urgent</span>}
    </div>
    <p className="text-stone-500 mb-1">
      Marked to: <span className="text-stone-700">{department}</span>
    </p>
    {assignee !== "—" && (
      <p className="text-stone-500 mb-1">
        Assigned to: <span className="text-stone-700">{assignee}</span>
      </p>
    )}
    {comment && (
      <div className="border-l-2 border-[#C29B38] pl-2 mb-1">
        <span className="text-stone-500">Registrar's Comment: </span>
        <span className="text-stone-700">{comment}</span>
      </div>
    )}
    <div className="flex items-center justify-between text-stone-400 gap-2 flex-wrap">
      <span>{timestamp}</span>
      {visibleInSummary && <span className="text-[#1E4620] font-medium">Visible in Summary</span>}
    </div>
  </div>
);

// ─── Annotations Panel ────────────────────────────────────────────────────────

const AnnotationsPanel: React.FC<{ document: Document }> = ({ document: doc }) => (
  <div className="bg-white border-t border-stone-200 flex-shrink-0">
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-stone-100 gap-2">
      <span className="text-xs font-semibold text-[#1E4620]">Registrar's Annotations</span>
      <button className="text-[10px] text-stone-400 hover:text-[#1E4620] transition-colors font-medium whitespace-nowrap">
        Secretary View Active
      </button>
    </div>
    <div className="px-3 sm:px-4 py-3 max-h-[140px] overflow-y-auto">
      {doc.active_mark ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnnotationCard
            title={doc.title}
            department={doc.active_mark.marked_to_dept_name}
            assignee={doc.active_mark.assigned_to_name ?? "—"}
            comment={doc.active_mark.instructions ?? "Marked for action."}
            urgent={doc.active_mark.priority === "urgent"}
            visibleInSummary={false}
            timestamp={
              doc.active_mark.marked_at
                ? format(new Date(doc.active_mark.marked_at), "dd MMM yyyy · hh:mm aa")
                : ""
            }
          />
        </div>
      ) : (
        <p className="text-[10px] text-stone-400 italic">No annotations yet.</p>
      )}
      <button className="mt-2 text-[10px] text-[#1E4620] hover:underline font-medium">
        + Add New Annotation
      </button>
    </div>
  </div>
);

// ─── Document Fallback ────────────────────────────────────────────────────────

const DocumentFallback: React.FC<{ document: Document }> = ({ document: doc }) => (
  <div className="px-5 sm:px-16 py-8 sm:py-14">
    <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 sm:mb-8">
      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-stone-200 bg-stone-50 flex items-center justify-center text-stone-300">
        <svg viewBox="0 0 40 40" className="w-7 h-7 sm:w-10 sm:h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="20" cy="20" r="18" />
          <path d="M20 8 L22 15 L30 15 L24 20 L26 28 L20 23 L14 28 L16 20 L10 15 L18 15 Z" />
        </svg>
      </div>
      <div className="h-12 sm:h-16 w-px bg-stone-200" />
      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-stone-200 bg-stone-50 flex items-center justify-center text-stone-300">
        <svg viewBox="0 0 40 40" className="w-7 h-7 sm:w-10 sm:h-10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="20" cy="20" r="18" />
          <path d="M10 25 L20 10 L30 25" />
          <line x1="8" y1="25" x2="32" y2="25" />
          <line x1="20" y1="25" x2="20" y2="30" />
        </svg>
      </div>
    </div>
    <div className="text-center mb-2">
      <p className="text-[10px] text-stone-400 tracking-widest uppercase">Republic of Kenya</p>
      <p className="text-xs sm:text-sm font-bold text-stone-900 tracking-wide mt-0.5 uppercase">
        Office of the Registrar High Court
      </p>
    </div>
    <div className="border-t-2 border-stone-700 mt-4 mb-6" />
    <h2 className="text-center text-sm sm:text-base font-bold tracking-widest uppercase text-stone-800 mb-6 sm:mb-8">
      {doc.type === "memo" ? "MEMO" : "LETTER"}
    </h2>
    <div className="text-sm text-stone-300 italic text-center py-8 sm:py-12">
      Document body will appear here…
    </div>
  </div>
);

// ─── File Preview ─────────────────────────────────────────────────────────────

const FilePreview: React.FC<{ document: Document }> = ({ document: doc }) => {
  const fileUrl = doc.file_url;

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] p-6 sm:p-8">
        <DocIcon type={doc.type} className="h-12 w-12 sm:h-14 sm:w-14 text-stone-300 mb-3" />
        <p className="text-sm text-stone-400 text-center">No file attached to this document.</p>
      </div>
    );
  }

  const ext = (fileUrl.split("/").pop() ?? "").split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    return (
      <iframe
        src={`${fileUrl}#toolbar=0`}
        title={doc.title}
        className="w-full h-full min-h-[500px] sm:min-h-[800px] border-0"
      />
    );
  }

  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] sm:min-h-[400px] p-4 sm:p-8">
        <img
          src={fileUrl}
          alt={doc.title}
          className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded shadow-sm"
        />
      </div>
    );
  }

  if (["docx", "doc", "xlsx", "xls", "pptx", "ppt"].includes(ext)) {
    return (
      <iframe
        src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
        title={doc.title}
        className="w-full flex-1 min-h-[500px] sm:min-h-[800px] border-0"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] p-6 sm:p-8 gap-4">
      <DocIcon type={doc.type} className="h-12 w-12 sm:h-14 sm:w-14 text-stone-300" />
      <p className="text-sm text-stone-600 font-medium text-center break-all">
        {doc.original_name || doc.title}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E4620] px-4 py-2 text-xs font-medium text-white hover:bg-[#163a18]"
        >
          Open in New Tab
        </a>
        <a
          href={fileUrl}
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          Download
        </a>
      </div>
    </div>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({ className = "h-3.5 w-3.5" }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Document Editor ──────────────────────────────────────────────────────────
// Receives key={document.id} from parent — React remounts on document change,
// so all useState values re-initialise from props. No sync-setState effects needed.

interface DocumentEditorProps {
  document:        Document;
  currentUserName: string;
  isSuperAdmin:    boolean;
  onBack:          () => void;
  onDelete?:       () => void;
  onSign?:         () => void;
  isSigning?:      boolean;
  onSend?:         () => void;
  onMark?:         () => void;
  onAcknowledge?:  () => void;
  onComplete?:     () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  currentUserName,
  isSuperAdmin,
  onBack,
  onDelete,
  onSign,
  isSigning = false,
  onSend,
  onMark,
  onAcknowledge,
  onComplete,
}) => {
  const isComposed    = document.type === "memo" || document.type === "letter";
  const formattedDate = document.created_at
    ? format(new Date(document.created_at), "dd MMM yyyy")
    : "—";

  const hasMarkNote = !!document.active_mark?.instructions;

  // Seeded from props; reset naturally via key={document.id} at call site
  const [showNote, setShowNote] = useState(hasMarkNote);

  const stickyNoteText = document.active_mark?.instructions ?? "";
  const noteAuthor     = document.active_mark
    ? (document.created_by_name ?? currentUserName)
    : currentUserName;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Title bar */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 bg-white border-b border-stone-200 px-3 sm:px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="lg:hidden flex-shrink-0 rounded-md p-1 text-stone-500 hover:bg-stone-100 transition-colors -ml-1"
            aria-label="Back to document list"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-stone-900 truncate">{document.title}</span>
          <span className="text-stone-300 text-xs hidden sm:inline">—</span>
          <span className="text-xs text-stone-400 hidden sm:inline">{formattedDate}</span>
          {document.original_name && !isComposed && (
            <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded hidden sm:inline">
              {document.original_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto w-full sm:w-auto">
          {/* Sticky note toggle */}
          {(isSuperAdmin || hasMarkNote) && (
            <button
              onClick={() => setShowNote((v) => !v)}
              title={showNote ? "Hide sticky note" : "Show sticky note"}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                showNote
                  ? "border-[#E8A840] bg-[#FEF08A] text-[#7A4E0D]"
                  : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
              }`}
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m0 0v3m0 0l3 3m-3-3h-3" />
              </svg>
              Note
            </button>
          )}

          {onMark && (
            <button
              onClick={onMark}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Mark
            </button>
          )}

          {onAcknowledge && (
            <button
              onClick={onAcknowledge}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap"
            >
              Acknowledge
            </button>
          )}

          {onComplete && (
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap"
            >
              Complete
            </button>
          )}

          {onSign && (
            <button
              onClick={onSign}
              disabled={isSigning}
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigning ? <Spinner className="h-3 w-3" /> : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
              {isSigning ? "Sending OTP…" : "E-Sign"}
            </button>
          )}

          {onSend && (
            <button
              onClick={onSend}
              className="hidden sm:inline-flex items-center gap-1 rounded-md bg-[#1E4620] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#163a18] transition-colors whitespace-nowrap"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Convert to PDF &amp; Send
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded-md p-1.5 text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-[#1E4620] px-3 py-1.5 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
          <select className="rounded bg-[#2d5c30] border-0 text-white text-xs px-2 py-1 focus:outline-none cursor-pointer capitalize">
            <option>{document.type}</option>
          </select>
          <span className="text-white/40 text-[10px] capitalize hidden sm:inline">
            {document.status.replace("_", " ")}
          </span>
          <span className="text-white/30 text-[10px] hidden sm:inline">·</span>
          <span className="text-white/40 text-[10px] hidden sm:inline whitespace-nowrap">All changes saved</span>
        </div>

        <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />

        {(["B", "I", "U", "S"] as const).map((label) => (
          <button
            key={label}
            className={`w-6 h-6 rounded text-xs text-white/80 hover:bg-white/10 transition-colors flex-shrink-0 ${
              label === "B" ? "font-extrabold"
              : label === "I" ? "italic"
              : label === "U" ? "underline"
              : "line-through"
            }`}
          >
            {label}
          </button>
        ))}

        <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />

        {["H1", "H2", "H3"].map((h) => (
          <button key={h} className="px-1.5 h-6 rounded text-[10px] font-semibold text-white/80 hover:bg-white/10 transition-colors flex-shrink-0">
            {h}
          </button>
        ))}

        <button className="px-1.5 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors flex-shrink-0">¶</button>

        <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />

        <button className="px-1.5 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors flex-shrink-0 whitespace-nowrap">• List</button>
        <button className="px-1.5 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors flex-shrink-0 whitespace-nowrap">1. List</button>

        <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />

        <button className="px-1.5 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors flex-shrink-0">—</button>

        <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />

        <button className="px-2 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8"  y1="2" x2="8"  y2="6" />
            <line x1="3"  y1="10" x2="21" y2="10" />
          </svg>
          Date
        </button>

        <button className="px-2 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors flex-shrink-0">§ Ref</button>

        <button className="px-2 h-6 rounded text-[10px] font-medium text-white/80 hover:bg-white/10 transition-colors flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Sig Block
        </button>

        <div className="flex-1 min-w-[8px]" />

        <button className="px-2 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap">
          Size
          <svg className="h-2.5 w-2.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button className="px-2 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap">
          Font
          <svg className="h-2.5 w-2.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="w-px h-4 bg-white/20 mx-1 flex-shrink-0" />

        <span className="text-white/40 text-[10px] flex-shrink-0 whitespace-nowrap">
          {document.body ? document.body.split(/\s+/).filter(Boolean).length : 0} words
        </span>
      </div>

      {/* Canvas — sticky note floats here */}
      <div className="flex-1 overflow-y-auto bg-stone-100 py-3 px-2 sm:py-6 sm:px-6 relative">
        {showNote && (
          // key={document.id} ensures StickyNote remounts when document changes,
          // resetting its internal state without a sync-setState effect
          <StickyNote
            key={document.id}
            authorName={noteAuthor}
            initialText={stickyNoteText}
            canEdit={isSuperAdmin}
          />
        )}

        <div className="mx-auto max-w-[794px] w-full min-h-[600px] sm:min-h-[900px] bg-white shadow-sm rounded-sm">
          {isComposed ? (
            document.body
              ? <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: document.body }} />
              : <DocumentFallback document={document} />
          ) : (
            <FilePreview document={document} />
          )}
        </div>
      </div>

      {/* Sign status bar */}
      <div className="flex items-center justify-between gap-2 bg-white border-t border-stone-100 px-3 sm:px-4 py-1.5 flex-shrink-0 flex-wrap">
        <span className="text-[10px] text-stone-400 whitespace-nowrap">
          {document.is_signed
            ? `✅ Signed${document.signed_by_name ? ` · ${document.signed_by_name}` : ""}`
            : "Not signed"}
        </span>
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
          <button className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors whitespace-nowrap">
            🖨 Print
          </button>
          {onSign && (
            <button
              onClick={onSign}
              disabled={isSigning}
              className="inline-flex items-center gap-1 rounded bg-[#C29B38] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#a8832e] transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigning && <Spinner className="h-2.5 w-2.5" />}
              {isSigning ? "Sending OTP…" : "E-Sign"}
            </button>
          )}
          {onSend && (
            <button
              onClick={onSend}
              className="rounded bg-[#1E4620] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#163a18] transition-colors whitespace-nowrap"
            >
              Convert to PDF &amp; Send
            </button>
          )}
        </div>
      </div>

      <AnnotationsPanel document={document} />
    </div>
  );
};

// ─── Mark Modal ───────────────────────────────────────────────────────────────

interface MarkModalProps {
  document: Document;
  onClose:  () => void;
  onMark:   (id: string, data: { departmentId: string; userId: string; instructions: string; priority: string }) => void;
}

const MarkModal: React.FC<MarkModalProps> = ({ document: doc, onClose, onMark }) => {
  const dispatch = useAppDispatch();

  const departments        = useAppSelector(selectAllDepartments);
  const departmentsLoading = useAppSelector(selectDepartmentsListLoading);
  const teamMembers        = useAppSelector(selectAllUsers);
  const usersLoading       = useAppSelector(selectUsersListLoading);

  const [userId,       setUserId]       = useState("");
  const [deptId,       setDeptId]       = useState("");
  const [instructions, setInstructions] = useState("");
  const [priority,     setPriority]     = useState("normal");

  useEffect(() => {
    dispatch(fetchDepartments({ is_active: true }));
  }, [dispatch]);

  useEffect(() => {
    if (!deptId) return;
    dispatch(fetchUsers({
      is_active:     true,
      department_id: deptId,
      limit:         100,
      sort_by:       "full_name",
      sort_order:    "ASC",
    }));
  }, [dispatch, deptId]);

  const activeDepartments = departments.filter((d) => d.is_active);

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDeptId(e.target.value);
    setUserId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) return;
    onMark(doc.id, { departmentId: deptId, userId, instructions, priority });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
            <span className="text-red-500">📌</span> Mark Document to Department
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none flex-shrink-0">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">Document</label>
            <div className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 font-medium truncate">
              {doc.title}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Department *
            </label>
            <select
              value={deptId}
              onChange={handleDeptChange}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none disabled:bg-stone-50 disabled:text-stone-400"
              required
              disabled={departmentsLoading}
            >
              <option value="">
                {departmentsLoading ? "Loading departments…" : "— Select Department —"}
              </option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.code ? ` (${d.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Assign to (Optional)
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none disabled:bg-stone-50 disabled:text-stone-400"
              disabled={usersLoading || !deptId}
            >
              <option value="">
                {usersLoading
                  ? "Loading team members…"
                  : !deptId
                  ? "— Select a department first —"
                  : teamMembers.length === 0
                  ? "No active users in this department"
                  : "— Assign to specific user (optional) —"}
              </option>
              {teamMembers.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name} — {u.pj_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Registrar's Comment{" "}
              <span className="font-normal text-stone-400 normal-case">(Visible to Secretary)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Add instructions, annotations, or comments for this department..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-800 order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] flex items-center justify-center gap-1.5 order-1 sm:order-2"
            >
              <span className="text-red-400">📌</span> Mark Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────

type UploadableDocumentType = Exclude<DocumentType, "memo" | "letter">;

interface UploadModalProps {
  onClose:  () => void;
  onUpload: (input: CreateUploadDocumentInput, file: File) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload }) => {
  const [title,       setTitle]       = useState("");
  const [type,        setType]        = useState<UploadableDocumentType>("judgment");
  const [referenceNo, setReferenceNo] = useState("");
  const [file,        setFile]        = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    onUpload({ title, type, reference_no: referenceNo || undefined }, file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm sm:text-base font-bold text-stone-900">Upload Document</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none flex-shrink-0">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Document Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as UploadableDocumentType)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
            >
              <option value="judgment">Judgment</option>
              <option value="ruling">Ruling</option>
              <option value="order">Order</option>
              <option value="correspondence">Correspondence</option>
              <option value="upload">Other Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Case Number <span className="font-normal text-stone-400">(if applicable)</span>
            </label>
            <input
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. HCT-00-CR-SC-0045-2024"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">File</label>
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-stone-300 p-4 sm:p-6 hover:border-[#1E4620] transition-colors cursor-pointer">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
                accept=".pdf,.docx,.xlsx,.jpg,.png,.mp4,.mp3"
              />
              <label htmlFor="file-upload" className="cursor-pointer text-center">
                <p className="text-sm text-stone-600 break-all">
                  {file ? file.name : "Click or drag files to upload"}
                </p>
                <p className="text-xs text-stone-400 mt-1">PDF, DOCX, XLSX, JPG, PNG — Max 25MB</p>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-500 order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !title}
              className="rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] disabled:opacity-40 disabled:cursor-not-allowed order-1 sm:order-2"
            >
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── OTP Modal ────────────────────────────────────────────────────────────────

interface OtpModalProps {
  isSigningInProgress: boolean;
  otpLoading:          boolean;
  otpValue:            string;
  otpError:            string | null;
  signingDocId:        string | null;
  onOtpChange:         (val: string) => void;
  onSubmit:            () => void;
  onCancel:            () => void;
  onResend:            () => void;
}

const OtpModal: React.FC<OtpModalProps> = ({
  isSigningInProgress,
  otpLoading,
  otpValue,
  otpError,
  onOtpChange,
  onSubmit,
  onCancel,
  onResend,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Confirm E-Signature</h3>
          <p className="text-xs text-stone-400 mt-0.5">Enter the OTP sent to your email</p>
        </div>
      </div>

      {/* OTP input */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-2">
          One-Time PIN
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpValue}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && otpValue.length === 6 && !isSigningInProgress && onSubmit()}
          placeholder="● ● ● ● ● ●"
          className="w-full rounded-lg border border-stone-200 px-4 py-3 text-center text-xl font-bold tracking-[0.5em] text-stone-900 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          autoFocus
        />
        <p className="text-[10px] text-stone-400 mt-1.5 text-center">OTP expires in 5 minutes</p>
      </div>

      {/* Error */}
      {otpError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <svg className="h-3.5 w-3.5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-700">{otpError}</p>
        </div>
      )}

      {/* Resend */}
      <p className="text-[10px] text-stone-400 text-center mb-5">
        Didn't receive it?{" "}
        <button
          onClick={onResend}
          disabled={otpLoading || isSigningInProgress}
          className="text-[#1E4620] font-semibold hover:underline disabled:opacity-50"
        >
          {otpLoading ? "Sending…" : "Resend OTP"}
        </button>
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isSigningInProgress}
          className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={otpValue.length !== 6 || isSigningInProgress}
          className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isSigningInProgress ? (
            <><Spinner className="h-3.5 w-3.5" /> Signing…</>
          ) : "Confirm & Sign"}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = ["all", "my_action", "judgments", "rulings"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  all:       "All",
  my_action: "For My Action",
  judgments: "Judgments",
  rulings:   "Rulings",
};

const CHIPS = ["Correspondence", "Orders", "Drafts"] as const;

const SuperAdminDocuments: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { documents, loading, error, pagination, actionInProgress } =
    useAppSelector((state) => state.documents);

  const [activeTab,        setActiveTab]        = useState<Tab>("all");
  const [activeChip,       setActiveChip]       = useState<string | null>(null);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDraftsMenu,   setShowDraftsMenu]   = useState(false);
  const [showMarkModal,    setShowMarkModal]     = useState(false);
  const [showUploadModal,  setShowUploadModal]  = useState(false);
  const [signToast,        setSignToast]        = useState<ToastState | null>(null);

  // OTP modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue,     setOtpValue]     = useState("");
  const [otpLoading,   setOtpLoading]   = useState(false);
  const [otpError,     setOtpError]     = useState<string | null>(null);
  const [signingDocId, setSigningDocId] = useState<string | null>(null);

  const draftsRef = useRef<HTMLDivElement>(null);

  const canUpload    = hasRole(user, "staff");
  const canAdmin     = hasRole(user, "dept_head");
  const isSuperAdmin = hasRole(user, "super_admin");
  const canView      = !!user;

  // Close drafts menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (draftsRef.current && !draftsRef.current.contains(e.target as Node)) {
        setShowDraftsMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch documents when tab / search changes
  useEffect(() => {
    if (!canView) return;
    const params: DocumentFilters = { page: 1, limit: 20 };
    if (activeTab === "my_action") params.for_my_action = true;
    else if (activeTab === "judgments") params.type = "judgment";
    else if (activeTab === "rulings")   params.type = "ruling";
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchDocuments(params));
  }, [dispatch, activeTab, searchQuery, canView]);

  // ── Template helpers ───────────────────────────────────────────────────────

  const handleNewTemplate = async (templateType: "memo" | "letter" | "draft") => {
    setShowDraftsMenu(false);
    const dateStr = format(new Date(), "dd MMM yyyy");
    const title   =
      templateType === "memo"   ? `New Memo — ${dateStr}`
      : templateType === "letter" ? `New Letter — ${dateStr}`
      : `Draft — ${dateStr}`;

    const body = getDocumentTemplate(templateType, {
      registrarName:  user?.full_name,
      registrarTitle: "REGISTRAR, HIGH COURT",
    });

    const input: CreateComposedDocumentInput = {
      title,
      type: templateType === "draft" ? "memo" : templateType,
      body,
    };

    const result = await dispatch(createComposedDocument(input));
    if (createComposedDocument.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
    }
  };

  // ── Document actions ───────────────────────────────────────────────────────

  const handleDelete      = (id: string) => {
    if (window.confirm("Delete this document?")) dispatch(deleteDocument(id));
  };
  const handleSend        = (id: string) => dispatch(sendDocument(id));
  const handleAcknowledge = (id: string) => dispatch(acknowledgeMark(id));
  const handleComplete    = (id: string) => dispatch(completeMark(id));

  const showToast = (toast: ToastState) => {
    setSignToast(toast);
    setTimeout(() => setSignToast(null), 4000);
  };

  // Step 1: request OTP
  const handleSign = async (id: string) => {
    setOtpError(null);
    setOtpValue("");
    setSigningDocId(id);
    setOtpLoading(true);

    const result = await dispatch(requestSignOtp(id));
    setOtpLoading(false);

    if (requestSignOtp.fulfilled.match(result)) {
      setShowOtpModal(true);
    } else {
      showToast({
        type: "error",
        message: (result.payload as string) ?? "Failed to send OTP. Please try again.",
      });
    }
  };

  // Step 2: submit OTP
  const handleOtpSubmit = async () => {
    if (!signingDocId || !otpValue.trim()) return;
    setOtpError(null);

    const result = await dispatch(signDocument({ id: signingDocId, otp: otpValue.trim() }));

    if (signDocument.fulfilled.match(result)) {
      setShowOtpModal(false);
      setOtpValue("");
      setSigningDocId(null);
      setSelectedDocument(result.payload as Document);
      showToast({ type: "success", message: "Document signed successfully." });
    } else {
      setOtpError((result.payload as string) ?? "Invalid OTP. Please try again.");
    }
  };

  const handleOtpCancel = () => {
    setShowOtpModal(false);
    setOtpValue("");
    setOtpError(null);
    setSigningDocId(null);
  };

  const handleOtpChange = (val: string) => {
    setOtpError(null);
    setOtpValue(val);
  };

  const handleMark = (
    id: string,
    data: { departmentId: string; userId: string; instructions: string; priority: string },
  ) => {
    dispatch(markDocument({
      id,
      input: {
        department_id: data.departmentId,
        assigned_to:   data.userId || undefined,
        instructions:  data.instructions,
        priority:      data.priority as "low" | "normal" | "urgent",
      },
    }));
    setShowMarkModal(false);
  };

  const handleCreateUpload = (input: CreateUploadDocumentInput, file: File) => {
    dispatch(createUploadDocument({ input, file }));
    setShowUploadModal(false);
  };

  const handlePageChange = (page: number) => {
    const params: DocumentFilters = { page, limit: 20 };
    if (activeTab === "my_action") params.for_my_action = true;
    else if (activeTab === "judgments") params.type = "judgment";
    else if (activeTab === "rulings")   params.type = "ruling";
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchDocuments(params));
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4 text-center">
        <p className="text-stone-400 text-sm">You don't have access to Document Management.</p>
      </div>
    );
  }

  const isSigningInProgress = !!actionInProgress.signing;

  return (
    <div className="flex flex-col h-full">

      {/* Toast */}
      {signToast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            signToast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          <span>{signToast.type === "success" ? "✅" : "❌"}</span>
          <span>{signToast.message}</span>
          <button onClick={() => setSignToast(null)} className="ml-2 text-white/70 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white flex-wrap">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight truncate">
            Document Management
          </h1>
          <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 hidden sm:block">
            Upload, annotate and mark documents
          </p>
        </div>

        {canUpload && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Upload */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* Drafts dropdown */}
            <div className="relative" ref={draftsRef}>
              <button
                onClick={() => setShowDraftsMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8A840] bg-[#F5C24C] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#7A4E0D] hover:bg-[#f0bb40] transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Drafts</span>
                <svg className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDraftsMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-stone-200 bg-white shadow-lg py-1">
                  {[
                    { key: "memo",   label: "New Memo",    icon: "📄" },
                    { key: "letter", label: "New Letter",  icon: "✉️" },
                    { key: "draft",  label: "Blank Draft", icon: "📝" },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => handleNewTemplate(key as "memo" | "letter" | "draft")}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 transition-colors text-left"
                    >
                      <span>{icon}</span>
                      <span className="font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mark */}
            <button
              onClick={() => selectedDocument && setShowMarkModal(true)}
              disabled={!selectedDocument}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedDocument
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="hidden sm:inline">Mark</span>
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left panel — document list */}
        <div
          className={`w-full lg:w-[300px] flex-shrink-0 flex-col border-r border-stone-200 bg-white overflow-hidden ${
            selectedDocument ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Search */}
          <div className="px-4 pt-4 pb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 pl-8 text-xs placeholder:text-stone-400 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] focus:bg-white"
              />
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[64px] whitespace-nowrap rounded-md px-1.5 py-1.5 text-[9px] font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-[#1E4620] text-white"
                    : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Chips */}
          <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => setActiveChip(activeChip === chip ? null : chip)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border transition-colors ${
                  activeChip === chip
                    ? "bg-stone-800 text-white border-stone-800"
                    : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="mx-3 mb-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => dispatch(clearError())} className="underline ml-2">✕</button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1E4620] border-t-transparent" />
              </div>
            ) : documents.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-stone-400">No documents found.</p>
                {canUpload && (
                  <p className="text-xs text-stone-300 mt-1">Upload or compose to get started.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {documents.map((doc) => (
                  <ListItem
                    key={doc.id}
                    document={doc}
                    selected={selectedDocument?.id === doc.id}
                    onSelect={() => setSelectedDocument(doc)}
                  />
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-stone-100 text-xs text-stone-400">
                <span>{documents.length} of {pagination.total}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-6 h-6 rounded text-xs ${
                        p === pagination.page
                          ? "bg-[#1E4620] text-white"
                          : "text-stone-500 hover:bg-stone-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — editor */}
        <div
          className={`w-full flex-1 flex-col overflow-hidden bg-stone-100 ${
            selectedDocument ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedDocument ? (
            // key={selectedDocument.id} remounts DocumentEditor (and StickyNote inside it)
            // whenever the selected document changes, cleanly resetting all internal state
            // without needing any sync-setState effects.
            <DocumentEditor
              key={selectedDocument.id}
              document={selectedDocument}
              currentUserName={user?.full_name ?? "Registrar"}
              isSuperAdmin={isSuperAdmin}
              onBack={() => setSelectedDocument(null)}
              onDelete={canAdmin ? () => handleDelete(selectedDocument.id) : undefined}
              onSign={isSuperAdmin && !selectedDocument.is_signed ? () => handleSign(selectedDocument.id) : undefined}
              isSigning={otpLoading || actionInProgress.signing === selectedDocument.id}
              onSend={canAdmin && !selectedDocument.is_sent && selectedDocument.is_signed ? () => handleSend(selectedDocument.id) : undefined}
              onMark={canAdmin && selectedDocument.status !== "filed" ? () => setShowMarkModal(true) : undefined}
              onAcknowledge={
                selectedDocument.status === "marked" && selectedDocument.assigned_to === user?.id
                  ? () => handleAcknowledge(selectedDocument.id)
                  : undefined
              }
              onComplete={
                selectedDocument.status === "in_progress" && selectedDocument.assigned_to === user?.id
                  ? () => handleComplete(selectedDocument.id)
                  : undefined
              }
            />
          ) : (
            <EmptyState
              canUpload={canUpload}
              onNewMemo={() => handleNewTemplate("memo")}
              onNewLetter={() => handleNewTemplate("letter")}
              onUpload={() => setShowUploadModal(true)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showMarkModal && selectedDocument && (
        <MarkModal
          document={selectedDocument}
          onClose={() => setShowMarkModal(false)}
          onMark={handleMark}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleCreateUpload}
        />
      )}

      {showOtpModal && (
        <OtpModal
          isSigningInProgress={isSigningInProgress}
          otpLoading={otpLoading}
          otpValue={otpValue}
          otpError={otpError}
          signingDocId={signingDocId}
          onOtpChange={handleOtpChange}
          onSubmit={handleOtpSubmit}
          onCancel={handleOtpCancel}
          onResend={() => signingDocId && handleSign(signingDocId)}
        />
      )}
    </div>
  );
};

export default SuperAdminDocuments;