// src/pages/admin/AdminMemoandLetters.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchDocuments,
  deleteDocument,
  sendDocument,
  markDocument,
  acknowledgeMark,
  completeMark,
  updateDocument,
  clearError,
  fetchResponses,
  updateMark,
  addDocumentAttachment,
  removeDocumentAttachment,
  regeneratePdf,
  fetchDocumentById,
  signDocumentNoOtp,
} from "../../store/slices/documentSlice";
import { hasRole } from "../../store/slices/authSlice";
import {
  fetchUsers,
  selectAllUsers,
  selectUsersListLoading,
} from "../../store/slices/userSlice";
import {
  fetchDepartments,
  selectAllDepartments,
  selectDepartmentsListLoading,
} from "../../store/slices/departmentsSlice";
import type {
  Document,
  DocumentStatus,
  DocumentType,
  DocumentFilters,
  DocumentAttachment,
} from "../../types/documents.types";
import { format } from "date-fns";
import toast from "react-hot-toast";
import TemplateComposerModal from "../../components/templates/TemplateComposerModal";

// ─── TipTap Imports ──────────────────────────────────────────────────────────
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';

// ─── Helper Types ──────────────────────────────────────────────────────────────

interface EditableFields {
  to_recipient: string;
  from_sender: string;
  reference_no: string;
  document_date: string;
  subject: string;
  cc: string;
  enclosures: string;
  signature_name: string;
  signature_title: string;
}

const toISODateInput = (value: string | Date | null | undefined): string => {
  if (!value) return new Date().toISOString().split('T')[0];
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
};

// ─── All the helper components ──────────────────────────────────────────────

// (1) StatusBadge
const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: "bg-stone-100 text-stone-500 border border-stone-200",
  uploaded: "bg-blue-50 text-blue-700 border border-blue-100",
  pending_review: "bg-amber-50 text-amber-700 border border-amber-100",
  dept_assigned: "bg-violet-50 text-violet-700 border border-violet-100",
  user_assigned: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  marked: "bg-violet-50 text-violet-700 border border-violet-100",
  in_progress: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  filed: "bg-stone-100 text-stone-500 border border-stone-200",
  ready_to_release: "bg-amber-50 text-amber-700 border border-amber-200",
  released: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "DRAFT",
  uploaded: "UPLOADED",
  pending_review: "PENDING",
  dept_assigned: "DEPT ASSIGNED",
  user_assigned: "USER ASSIGNED",
  marked: "MARKED",
  in_progress: "IN PROGRESS",
  completed: "COMPLETED",
  filed: "FILED",
  ready_to_release: "READY TO RELEASE",
  released: "RELEASED",
};

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${STATUS_STYLES[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
);

// (2) DocIcon
const DOC_ICON_COLORS: Record<DocumentType, string> = {
  memo: "text-amber-500",
  letter: "text-stone-400",
  certificate: "text-amber-600",
  judgment: "text-amber-600",
  ruling: "text-violet-600",
  order: "text-blue-600",
  correspondence: "text-teal-600",
  upload: "text-stone-400",
  ticket: "text-purple-500",
};

const DocIcon: React.FC<{ type: DocumentType; className?: string }> = ({
  type,
  className = "",
}) => (
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

// (3) formatFileSize
const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)}KB` : `${(kb / 1024).toFixed(1)}MB`;
};

// (4) Spinner
const Spinner: React.FC<{ className?: string }> = ({
  className = "h-3.5 w-3.5",
}) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// (5) TipTap Editor Component
interface TipTapEditorProps {
  content: string;
  placeholder: string;
  editable: boolean;
  onUpdate: (html: string) => void;
  className?: string;
  minHeight?: string;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  placeholder,
  editable,
  onUpdate,
  className = "",
  minHeight = "260px",
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight,
      Link,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onUpdate(html);
    },
    editorProps: {
      attributes: {
        className: `focus:outline-none prose prose-sm max-w-none ${className}`,
        style: `min-height: ${minHeight};`,
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      <BubbleMenu
        editor={editor}
        options={{ placement: 'top', offset: 8 }}
        updateDelay={100}
      >
        <div className="flex items-center gap-1 bg-white shadow-lg rounded-lg border border-stone-200 px-2 py-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-1.5 py-0.5 rounded text-xs font-bold ${
              editor.isActive('bold') ? 'bg-stone-200' : ''
            }`}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-1.5 py-0.5 rounded text-xs italic ${
              editor.isActive('italic') ? 'bg-stone-200' : ''
            }`}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`px-1.5 py-0.5 rounded text-xs underline ${
              editor.isActive('underline') ? 'bg-stone-200' : ''
            }`}
          >
            U
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-1.5 py-0.5 rounded text-xs line-through ${
              editor.isActive('strike') ? 'bg-stone-200' : ''
            }`}
          >
            S
          </button>
          <span className="w-px h-4 bg-stone-200" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-1.5 py-0.5 rounded text-xs ${
              editor.isActive('bulletList') ? 'bg-stone-200' : ''
            }`}
          >
            • List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-1.5 py-0.5 rounded text-xs ${
              editor.isActive('orderedList') ? 'bg-stone-200' : ''
            }`}
          >
            1. List
          </button>
        </div>
      </BubbleMenu>
    </div>
  );
};

// (6) StickyNote
interface StickyNoteProps {
  authorName: string;
  initialText: string;
  initialDate?: string | null;
  canEdit: boolean;
  onSave?: (text: string, date: string | null) => void;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  authorName,
  initialText,
  initialDate = null,
  canEdit,
  onSave,
}) => {
  const normalizeDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  };

  const [text, setText] = useState(initialText);
  const [date, setDate] = useState<string | null>(normalizeDate(initialDate));
  const [editing, setEditing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 24, y: 24 });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("textarea,button,a,input")) return;
      dragging.current = true;
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      e.preventDefault();
    },
    [pos],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleSave = () => {
    setEditing(false);
    onSave?.(text, date);
  };

  const handleCancel = () => {
    setText(initialText);
    setDate(normalizeDate(initialDate));
    setEditing(false);
  };

  const handleQuickDateChange = (newDate: string | null) => {
    setDate(newDate);
    setShowDatePicker(false);
    onSave?.(text, newDate);
  };

  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (dateStr: string): string => {
    const d = parseDate(dateStr);
    if (!d) return "Invalid Date";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isOverdue = (dateStr: string): boolean => {
    const d = parseDate(dateStr);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isToday = (dateStr: string): boolean => {
    const d = parseDate(dateStr);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const showDateChip = date && parseDate(date) !== null;

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
      <div className="flex justify-center -mb-1 pointer-events-none">
        <div className="w-10 h-3 rounded-sm bg-[#F5C24C]/60 border border-[#E8A840]/40 shadow-sm" />
      </div>

      <div
        className="rounded-md overflow-hidden"
        style={{
          background: "#FEF08A",
          boxShadow:
            "2px 4px 12px rgba(0,0,0,0.18), inset 0 -2px 0 rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="flex items-center justify-between px-2.5 pt-2 pb-1.5 cursor-grab active:cursor-grabbing"
          style={{ background: "#FDE047" }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className="h-3 w-3 text-[#7A4E0D] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 2a1 1 0 011 1v1h1a2 2 0 012 2v1a2 2 0 01-2 2h-.5l.5 9H6l.5-9H6a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 012 0v1h6V3a1 1 0 011-1z" />
            </svg>
            <span className="text-[10px] font-bold text-[#7A4E0D] tracking-wide truncate">
              {authorName}
            </span>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {canEdit && !editing && (
              <>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setShowDatePicker((v) => !v)}
                  className="p-0.5 rounded text-[#7A4E0D]/60 hover:text-[#7A4E0D] hover:bg-[#FDE047]/80 transition-colors"
                  title="Set bring‑up date"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
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
              </>
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

              <div
                className="mt-2 flex items-center gap-2"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <label className="text-[10px] font-medium text-[#7A4E0D]/70 whitespace-nowrap">
                  📅 Bring‑up date:
                </label>
                <input
                  type="date"
                  value={date || ""}
                  onChange={(e) => setDate(e.target.value || null)}
                  className="flex-1 rounded border border-[#E8A840] bg-white/70 px-2 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#E8A840]"
                />
              </div>

              <div
                className="flex justify-end gap-1.5 mt-2"
                onMouseDown={(e) => e.stopPropagation()}
              >
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
            <>
              <p
                className="text-[11px] text-stone-800 leading-relaxed whitespace-pre-wrap break-words min-h-[48px]"
                style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
              >
                {text || (
                  <span className="italic text-stone-400">No note yet.</span>
                )}
              </p>

              {showDateChip && (
                <div
                  className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium border ${
                    isToday(date!)
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : isOverdue(date!)
                        ? "bg-red-100 text-red-800 border-red-300"
                        : "bg-stone-100 text-stone-700 border-stone-200"
                  }`}
                >
                  <span>📅</span>
                  <span>Bring up: {formatDate(date!)}</span>
                </div>
              )}

              {showDatePicker && canEdit && (
                <div
                  className="mt-2 p-2 bg-white rounded border border-[#E8A840] shadow-sm"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={date || ""}
                      onChange={(e) => handleQuickDateChange(e.target.value || null)}
                      className="flex-1 rounded border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                      autoFocus
                    />
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="text-[10px] text-stone-400 hover:text-stone-600"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[9px] text-stone-400 mt-1">
                    Select a date and it saves automatically.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-2.5 pb-1.5 flex items-center justify-between">
          <span className="text-[9px] text-[#7A4E0D]/50 font-medium">
            {format(new Date(), "dd MMM yyyy")}
          </span>
          <div
            className="w-4 h-4 flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.10) 50%)",
              borderRadius: "0 0 4px 0",
            }}
          />
        </div>
      </div>
    </div>
  );
};

// (7) ListItem
const ListItem: React.FC<{
  document: Document;
  selected: boolean;
  onSelect: () => void;
  hasResponse?: boolean;
}> = ({ document, selected, onSelect, hasResponse = false }) => {
  const mark = document.active_mark;
  const showMarkInfo = mark && (document.status === "marked" || document.status === "dept_assigned" || document.status === "user_assigned");

  return (
    <div
      onClick={onSelect}
      className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
        selected
          ? "bg-[#1E4620]/5 border-l-2 border-[#1E4620]"
          : hasResponse
            ? "hover:bg-blue-50/50 border-l-2 border-blue-300/50 bg-blue-50/20"
            : "hover:bg-stone-50 border-l-2 border-transparent"
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        <DocIcon type={document.type} className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1.5">
          <p
            className={`text-xs font-semibold leading-snug truncate ${selected ? "text-[#1E4620]" : "text-stone-800"}`}
          >
            {document.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasResponse && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-medium text-blue-700 border border-blue-200">
                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
                {document.response_count || 1}
              </span>
            )}
            <StatusBadge status={document.status} />
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400 flex-wrap">
          <span>
            {document.created_at
              ? format(new Date(document.created_at), "yyyy-MM-dd")
              : "—"}
          </span>
          {document.file_size_bytes && (
            <>
              <span>·</span>
              <span>{formatFileSize(document.file_size_bytes)}</span>
            </>
          )}
          <span>·</span>
          <span className="truncate">
            {document.reference_no || document.created_by_name || "RHC"}
          </span>
        </div>

        {document.is_signed && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Signed
            {document.is_sent && (
              <span className="ml-1 text-blue-500">· Sent</span>
            )}
          </div>
        )}

        {showMarkInfo && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-violet-600">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                clipRule="evenodd"
              />
            </svg>
            Marked to: {mark.marked_to_dept_name}
            {mark.assigned_to_name && (
              <span className="ml-1">
                → {mark.assigned_to_name}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// (8) AnnotationCard
const AnnotationCard: React.FC<{
  title: string;
  department: string;
  assignee: string;
  comment: string;
  urgent: boolean;
  visibleInSummary: boolean;
  timestamp: string;
}> = ({
  title,
  department,
  assignee,
  comment,
  urgent,
  visibleInSummary,
  timestamp,
}) => (
  <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-[10px]">
    <div className="flex items-start justify-between gap-2 mb-1">
      <span className="font-semibold text-stone-700 truncate">{title}</span>
      {urgent && (
        <span className="text-red-600 font-bold shrink-0">Urgent</span>
      )}
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
      {visibleInSummary && (
        <span className="text-[#1E4620] font-medium">Visible in Summary</span>
      )}
    </div>
  </div>
);

// (9) AnnotationsPanel
const AnnotationsPanel: React.FC<{ document: Document }> = ({
  document: doc,
}) => (
  <div className="bg-white border-t border-stone-200 flex-shrink-0">
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-stone-100 gap-2">
      <span className="text-xs font-semibold text-[#1E4620]">
        Registrar's Annotations
      </span>
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
                ? format(
                    new Date(doc.active_mark.marked_at),
                    "dd MMM yyyy · hh:mm aa",
                  )
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

// (10) DocumentFallback
const DocumentFallback: React.FC<{ document: Document }> = ({
  document: doc,
}) => (
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
      <p className="text-xs sm:text-sm font-bold text-stone-900 tracking-wide mt-0.5 uppercase">Office of the Registrar High Court</p>
    </div>
    <div className="border-t-2 border-stone-700 mt-4 mb-6" />
    <h2 className="text-center text-sm sm:text-base font-bold tracking-widest uppercase text-stone-800 mb-6 sm:mb-8">
      {doc.type === "memo" ? "MEMO" : doc.type === "letter" ? "LETTER" : "CERTIFICATE"}
    </h2>
    <div className="text-sm text-stone-300 italic text-center py-8 sm:py-12">
      Document body will appear here…
    </div>
  </div>
);

// (11) FilePreview
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

  const ext =
    (fileUrl.split("/").pop() ?? "").split(".").pop()?.toLowerCase() ?? "";

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
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E4620] px-4 py-2 text-xs font-medium text-white hover:bg-[#163a18]">
          Open in New Tab
        </a>
        <a href={fileUrl} download className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
          Download
        </a>
      </div>
    </div>
  );
};

// (12) ResponsesPanel
const ResponsesPanel: React.FC<{ documentId: string }> = ({ documentId }) => {
  const dispatch = useAppDispatch();
  const responses = useAppSelector((state) => state.documents.responses);
  const loading = useAppSelector((state) => state.documents.loading);

  useEffect(() => {
    dispatch(fetchResponses(documentId));
  }, [dispatch, documentId]);

  if (loading) {
    return (
      <div className="bg-white border-t border-stone-200 flex-shrink-0 px-4 py-6 flex justify-center">
        <Spinner className="h-4 w-4 text-stone-400" />
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-stone-200 flex-shrink-0">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-stone-100">
        <span className="text-xs font-semibold text-[#1E4620]">
          Responses
          {responses.length > 0 && (
            <span className="ml-1.5 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">
              {responses.length}
            </span>
          )}
        </span>
      </div>

      <div className="px-3 sm:px-4 py-3 max-h-[220px] overflow-y-auto space-y-2">
        {responses.length === 0 ? (
          <p className="text-[10px] text-stone-400 italic">No responses yet.</p>
        ) : (
          responses.map((r) => (
            <div key={r.id} className="rounded-lg border border-stone-200 bg-stone-50 p-2.5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#1E4620] text-[8px] font-bold text-white">
                    {r.response_number}
                  </span>
                  <span className="text-[11px] font-semibold text-stone-800 truncate">
                    {r.responded_by_name}
                  </span>
                </div>
                <span className="text-[9px] text-stone-400 whitespace-nowrap flex-shrink-0">
                  {format(new Date(r.created_at), "dd MMM yyyy · hh:mm aa")}
                </span>
              </div>

              {r.note && (
                <p className="text-[11px] text-stone-700 leading-relaxed mt-1 whitespace-pre-wrap">
                  {r.note}
                </p>
              )}

              {r.file_url && (
                <a
                  href={r.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-[#1E4620] hover:underline font-medium"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {r.original_name ?? "Attached file"}
                  {r.file_size_bytes && (
                    <span className="text-stone-400 ml-1">
                      ({formatFileSize(r.file_size_bytes)})
                    </span>
                  )}
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── MemoDisplay ──────────────────────────────────────────────────────────────

interface MemoDisplayProps {
  document: Document;
  isEditable: boolean;
  isEditMode: boolean;
  currentUserName: string;
  isSuperAdmin: boolean;
  fields?: EditableFields;
  onFieldChange?: (field: keyof EditableFields, value: string) => void;
  bodyHtml?: string;
  onBodyChange?: (html: string) => void;
}

const MemoDisplay: React.FC<MemoDisplayProps> = ({
  document,
  isEditable,
  isEditMode,
  currentUserName,
  isSuperAdmin,
  fields,
  onFieldChange,
  bodyHtml,
  onBodyChange,
}) => {
  const canEditFields = isSuperAdmin && isEditMode && !!fields && !!onFieldChange;

  const toField = canEditFields ? fields!.to_recipient : (document.to_recipient || document.assigned_to_name || 'REGISTRAR, HIGH COURT / ORHC AIE HOLDER');
  const fromField = canEditFields ? fields!.from_sender : (document.from_sender || document.department_name || 'HIGH COURT SUPPORT OFFICE');
  const refField = canEditFields ? fields!.reference_no : (document.reference_no || 'RHC/AIE/0000');
  const dateField = canEditFields ? fields!.document_date : (
    document.document_date
      ? format(new Date(document.document_date), "dd MMM yyyy")
      : document.created_at
        ? format(new Date(document.created_at), "dd MMM yyyy")
        : format(new Date(), "dd MMM yyyy")
  );
  const subjectField = canEditFields ? fields!.subject : (document.subject || document.title);
  const signatureName = canEditFields ? fields!.signature_name : (document.signature_name || currentUserName || 'HIGH COURT SUPPORT OFFICE');
  const signatureTitle = canEditFields ? fields!.signature_title : (document.signature_title || 'Registrar, High Court');

  const handleFieldChange = (field: keyof EditableFields, value: string) => {
    onFieldChange?.(field, value);
  };

  const editModeIndicator = isEditMode && (
    <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      <span>Edit mode enabled — changes auto-save as you type</span>
    </div>
  );

  return (
    <div className="px-8 py-10 sm:px-16 sm:py-14 bg-white min-h-[600px] sm:min-h-[900px] flex flex-col">
      <div className="flex justify-center mb-3">
        <img
          src="/JOB_LOGO.jpg"
          alt="Judiciary of Kenya crest"
          className="h-[78px] w-auto object-contain"
          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
        />
      </div>
      <div className="text-center mt-4 mb-2">
        <p className="text-[19px] font-bold uppercase leading-snug">
          OFFICE OF THE REGISTRAR HIGH COURT<br />INTERNAL MEMO
        </p>
      </div>
      <div className="border-t-[2.5px] border-black mb-2.5" />
      {editModeIndicator}

      <div className="mt-2">
        <div className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
          <span className="w-24 shrink-0 uppercase">TO</span>
          <span className="w-5 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="text"
              value={toField}
              onChange={(e) => handleFieldChange('to_recipient', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1">{toField}</span>
          )}
        </div>
        <div className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
          <span className="w-24 shrink-0 uppercase">FROM</span>
          <span className="w-5 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="text"
              value={fromField}
              onChange={(e) => handleFieldChange('from_sender', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1">{fromField}</span>
          )}
        </div>
        <div className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
          <span className="w-24 shrink-0 uppercase">REF</span>
          <span className="w-5 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="text"
              value={refField}
              onChange={(e) => handleFieldChange('reference_no', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1">{refField}</span>
          )}
        </div>
        <div className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
          <span className="w-24 shrink-0 uppercase">DATE</span>
          <span className="w-5 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="date"
              value={dateField}
              onChange={(e) => handleFieldChange('document_date', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1">{dateField}</span>
          )}
        </div>
        <div className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
          <span className="w-24 shrink-0 uppercase">SUBJECT</span>
          <span className="w-5 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="text"
              value={subjectField}
              onChange={(e) => handleFieldChange('subject', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1">{subjectField}</span>
          )}
        </div>
      </div>
      <div className="border-t-[2.5px] border-black mt-3 mb-10" />

      {isEditMode && isEditable ? (
        <TipTapEditor
          content={bodyHtml || document.body || ''}
          placeholder="Start typing the body of the memo…"
          editable={true}
          onUpdate={onBodyChange || (() => {})}
          minHeight="260px"
          className="text-[13.5px] leading-[1.8] text-justify"
        />
      ) : (
        <div
          className="min-h-[260px] text-[13.5px] leading-[1.8] text-justify"
          dangerouslySetInnerHTML={{ __html: bodyHtml || document.body || '' }}
        />
      )}

      <div className="mt-10">
        <div className="font-bold uppercase text-[13.5px]">{signatureName}</div>
        <div className="font-bold underline uppercase text-[13.5px]">{signatureTitle}</div>
      </div>

      <div className="mt-12 pt-3 border-t border-stone-300 flex items-center gap-3">
        <div className="flex-1 text-[10px] leading-tight text-stone-700">
          <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
          <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
          <p className="font-bold text-[#1E4620] mt-1">Justice Be Our Shield and Defender</p>
        </div>
      </div>
    </div>
  );
};

// ─── LetterDisplay ─────────────────────────────────────────────────────────

interface LetterDisplayProps {
  document: Document;
  isEditable: boolean;
  isEditMode: boolean;
  currentUserName: string;
  isSuperAdmin: boolean;
  fields?: EditableFields;
  onFieldChange?: (field: keyof EditableFields, value: string) => void;
  bodyHtml?: string;
  onBodyChange?: (html: string) => void;
}

const LetterDisplay: React.FC<LetterDisplayProps> = ({
  document,
  isEditable,
  isEditMode,
  currentUserName,
  isSuperAdmin,
  fields,
  onFieldChange,
  bodyHtml,
  onBodyChange,
}) => {
  const canEditFields = isSuperAdmin && isEditMode && !!fields && !!onFieldChange;

  const refField = canEditFields ? fields!.reference_no : (document.reference_no || 'RHC/LTR/0000');
  const dateField = canEditFields ? fields!.document_date : (
    document.document_date
      ? format(new Date(document.document_date), "dd MMM yyyy")
      : document.created_at
        ? format(new Date(document.created_at), "dd MMM yyyy")
        : format(new Date(), "dd MMM yyyy")
  );
  const toField = canEditFields ? fields!.to_recipient : (document.to_recipient || document.assigned_to_name || '');
  const fromField = canEditFields ? fields!.from_sender : (document.from_sender || document.department_name || 'HIGH COURT SUPPORT OFFICE');
  const subjectField = canEditFields ? fields!.subject : (document.subject || document.title);
  const ccField = canEditFields ? fields!.cc : (document.cc || '');
  const enclosuresField = canEditFields ? fields!.enclosures : (document.enclosures || '');
  const signatureName = canEditFields ? fields!.signature_name : (document.signature_name || currentUserName || 'HIGH COURT SUPPORT OFFICE');
  const signatureTitle = canEditFields ? fields!.signature_title : (document.signature_title || 'Registrar, High Court');

  const handleFieldChange = (field: keyof EditableFields, value: string) => {
    onFieldChange?.(field, value);
  };

  const editModeIndicator = isEditMode && (
    <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      <span>Edit mode enabled — changes auto-save as you type</span>
    </div>
  );

  return (
    <div className="px-8 py-10 sm:px-16 sm:py-14 bg-white min-h-[600px] sm:min-h-[900px] flex flex-col font-sans">
      <div className="flex justify-center mb-3">
        <img
          src="/JOB_LOGO.jpg"
          alt="Judiciary of Kenya crest"
          className="h-[78px] w-auto object-contain"
          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
        />
      </div>
      <div className="text-center mb-6">
        <p className="text-lg font-bold uppercase leading-snug">
          OFFICE OF THE REGISTRAR HIGH COURT
        </p>
        <p className="text-lg font-bold uppercase leading-snug border-b-2 border-black inline-block pb-2 px-1">
          OFFICIAL LETTER
        </p>
      </div>
      {editModeIndicator}

      <div className="space-y-3 text-sm font-bold mb-8">
        <div className="flex">
          <span className="w-24 shrink-0">REF</span>
          <span className="w-4 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="text"
              value={refField}
              onChange={(e) => handleFieldChange('reference_no', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1">{refField}</span>
          )}
        </div>
        <div className="flex">
          <span className="w-24 shrink-0">DATE</span>
          <span className="w-4 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="date"
              value={dateField}
              onChange={(e) => handleFieldChange('document_date', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1">{dateField}</span>
          )}
        </div>
        <div className="flex">
          <span className="w-24 shrink-0">TO</span>
          <span className="w-4 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="text"
              value={toField}
              onChange={(e) => handleFieldChange('to_recipient', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1 whitespace-pre-wrap">{toField}</span>
          )}
        </div>
        <div className="flex">
          <span className="w-24 shrink-0">FROM</span>
          <span className="w-4 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="text"
              value={fromField}
              onChange={(e) => handleFieldChange('from_sender', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1">{fromField}</span>
          )}
        </div>
        <div className="flex border-b-2 border-black pb-3">
          <span className="w-24 shrink-0">SUBJECT</span>
          <span className="w-4 shrink-0">:</span>
          {canEditFields ? (
            <input
              type="text"
              value={subjectField}
              onChange={(e) => handleFieldChange('subject', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span className="flex-1">{subjectField}</span>
          )}
        </div>
      </div>

      {isEditMode && isEditable ? (
        <TipTapEditor
          content={bodyHtml || document.body || ''}
          placeholder="Start typing the letter body…"
          editable={true}
          onUpdate={onBodyChange || (() => {})}
          minHeight="300px"
          className="text-sm leading-relaxed text-justify"
        />
      ) : (
        <div
          className="min-h-[300px] text-sm leading-relaxed text-justify"
          dangerouslySetInnerHTML={{ __html: bodyHtml || document.body || '' }}
        />
      )}

      <div className="mt-16">
        <div className="font-bold uppercase text-sm">{signatureName}</div>
        <div className="font-bold uppercase text-sm">{signatureTitle}</div>
      </div>

      {(ccField || enclosuresField || canEditFields) && (
        <div className="mt-8 space-y-1 text-sm">
          {canEditFields ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold">CC:</span>
                <input
                  type="text"
                  value={ccField}
                  onChange={(e) => handleFieldChange('cc', e.target.value)}
                  placeholder="Add CC recipients..."
                  className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Enclosures:</span>
                <input
                  type="text"
                  value={enclosuresField}
                  onChange={(e) => handleFieldChange('enclosures', e.target.value)}
                  placeholder="List enclosures..."
                  className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
                />
              </div>
            </>
          ) : (
            <>
              {ccField && (
                <div className="flex items-center gap-2">
                  <span className="font-bold">CC:</span>
                  <span>{ccField}</span>
                </div>
              )}
              {enclosuresField && (
                <div className="flex items-center gap-2">
                  <span className="font-bold">Enclosures:</span>
                  <span>{enclosuresField}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-12 pt-3 border-t border-stone-300 flex items-center gap-3">
        <div className="flex-1 text-[10px] leading-tight text-stone-700">
          <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
          <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
          <p className="font-bold text-[#1E4620] mt-1">Justice Be Our Shield and Defender</p>
        </div>
      </div>
    </div>
  );
};

// ─── CertificateDisplay ────────────────────────────────────────────────────────

interface CertificateDisplayProps {
  document: Document;
  isEditable: boolean;
  isEditMode: boolean;
  currentUserName: string;
  isSuperAdmin: boolean;
  fields?: EditableFields;
  onFieldChange?: (field: keyof EditableFields, value: string) => void;
  bodyHtml?: string;
  onBodyChange?: (html: string) => void;
}

const CertificateDisplay: React.FC<CertificateDisplayProps> = ({
  document,
  isEditable,
  isEditMode,
  currentUserName,
  isSuperAdmin,
  fields,
  onFieldChange,
  bodyHtml,
  onBodyChange,
}) => {
  const canEditFields = isSuperAdmin && isEditMode && !!fields && !!onFieldChange;

  const refField = canEditFields ? fields!.reference_no : (document.reference_no || 'RHC/CERT/0000');
  const dateField = canEditFields ? fields!.document_date : (
    document.document_date
      ? format(new Date(document.document_date), "dd MMM yyyy")
      : document.created_at
        ? format(new Date(document.created_at), "dd MMM yyyy")
        : format(new Date(), "dd MMM yyyy")
  );
  const toField = canEditFields ? fields!.to_recipient : (document.to_recipient || '');
  const fromField = canEditFields ? fields!.from_sender : (document.from_sender || document.department_name || '');
  const subjectField = canEditFields ? fields!.subject : (document.subject || document.title);
  const signatureName = canEditFields ? fields!.signature_name : (document.signature_name || currentUserName || 'Registrar, High Court');
  const signatureTitle = canEditFields ? fields!.signature_title : (document.signature_title || 'Registrar, High Court');

  const handleFieldChange = (field: keyof EditableFields, value: string) => {
    onFieldChange?.(field, value);
  };

  const editModeIndicator = isEditMode && (
    <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      <span>Edit mode enabled — changes auto-save as you type</span>
    </div>
  );

  return (
    <div className="px-8 py-10 sm:px-16 sm:py-14 bg-white min-h-[600px] sm:min-h-[900px] flex flex-col">
      <div className="flex justify-center mb-3">
        <img
          src="/JOB_LOGO.jpg"
          alt="Judiciary of Kenya crest"
          className="h-[78px] w-auto object-contain"
          onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
        />
      </div>
      <div className="text-center mt-2 mb-4">
        <p className="text-[19px] font-bold uppercase leading-snug">
          OFFICE OF THE REGISTRAR HIGH COURT
        </p>
      </div>
      <div className="border-t-[2.5px] border-black mb-6" />
      {editModeIndicator}

      <div className="flex justify-between text-[13px] font-bold mb-6">
        <span className="flex items-baseline gap-1">
          Ref:
          {canEditFields ? (
            <input
              type="text"
              value={refField}
              onChange={(e) => handleFieldChange('reference_no', e.target.value)}
              className="flex-1 bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1"
            />
          ) : (
            <span>{refField}</span>
          )}
        </span>
        {canEditFields ? (
          <input
            type="date"
            value={dateField}
            onChange={(e) => handleFieldChange('document_date', e.target.value)}
            className="bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1 text-right"
          />
        ) : (
          <span>{dateField}</span>
        )}
      </div>

      <div className="mb-4">
        {canEditFields ? (
          <textarea
            value={toField}
            onChange={(e) => handleFieldChange('to_recipient', e.target.value)}
            placeholder="Recipient address block"
            rows={2}
            className="w-full resize-none bg-transparent border-0 focus:outline-none placeholder:text-stone-300 placeholder:italic text-[13px]"
          />
        ) : (
          <p className="text-[13px] whitespace-pre-wrap">{toField}</p>
        )}
      </div>

      <div className="mb-4">
        <span className="font-bold underline">RE: {subjectField}</span>
      </div>

      {isEditMode && isEditable ? (
        <TipTapEditor
          content={bodyHtml || document.body || ''}
          placeholder="Start typing the certificate body…"
          editable={true}
          onUpdate={onBodyChange || (() => {})}
          minHeight="300px"
          className="text-[13px] leading-[1.8] text-justify"
        />
      ) : (
        <div
          className="min-h-[300px] text-[13px] leading-[1.8] text-justify"
          dangerouslySetInnerHTML={{ __html: bodyHtml || document.body || '' }}
        />
      )}

      <div className="mt-12">
        {canEditFields ? (
          <>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => handleFieldChange('signature_name', e.target.value)}
              className="font-bold uppercase text-[13px] bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1 w-full max-w-xs"
            />
            <input
              type="text"
              value={signatureTitle}
              onChange={(e) => handleFieldChange('signature_title', e.target.value)}
              className="font-bold underline uppercase text-[13px] bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1 w-full max-w-xs mt-1"
            />
          </>
        ) : (
          <>
            <div className="font-bold uppercase text-[13px]">{signatureName}</div>
            <div className="font-bold underline uppercase text-[13px]">{signatureTitle}</div>
          </>
        )}
      </div>

      <div className="mt-4">
        {canEditFields ? (
          <input
            type="text"
            value={fromField}
            onChange={(e) => handleFieldChange('from_sender', e.target.value)}
            className="w-full bg-transparent border-b border-dashed border-[#c9a84c] hover:border-stone-300 focus:border-stone-500 focus:outline-none px-1 text-[13px]"
          />
        ) : (
          <p className="text-[13px]">{fromField}</p>
        )}
      </div>

      <div className="mt-12 pt-3 border-t border-stone-300 flex items-center gap-3">
        <div className="flex-1 text-[10px] leading-tight text-stone-700">
          <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
          <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
          <p className="font-bold text-[#1E4620] mt-1">Justice Be Our Shield and Defender</p>
        </div>
      </div>
    </div>
  );
};

// ─── DocumentEditor ────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "unsaved" | "error";



interface DocumentUpdatePayload {
  body?: string;
  reference_no?: string;
  to_recipient?: string;
  from_sender?: string;
  cc?: string;
  enclosures?: string;
  signature_name?: string;
  signature_title?: string;
  metadata?: { fromFirst?: boolean };
  attachments?: DocumentAttachment[];
}

interface DocumentEditorProps {
  document: Document;
  currentUserName: string;
  isSuperAdmin: boolean;
  onBack: () => void;
  onSave?: (id: string, updates: DocumentUpdatePayload) => Promise<void>;
  onFieldUpdate?: (field: string, value: string) => void;
  onDelete?: () => void;
  onSend?: () => void;
  onMark?: () => void;
  onAcknowledge?: () => void;
  onComplete?: () => void;
  onUpdateMark?: (markId: string, text: string) => void;
  onDownload?: () => void;
  onAddAttachment?: (file: File) => Promise<void>;
  onRemoveAttachment?: (attachmentId: string) => Promise<void>;
  onSign?: () => Promise<void>;
  isSigning?: boolean;
  onRegeneratePdf?: () => Promise<void>;
  isRegeneratingPdf?: boolean;
  onRefreshDocument?: () => Promise<void>;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  currentUserName,
  isSuperAdmin,
  onBack,
  onSave,
  onFieldUpdate,
  onDelete,
  onSend,
  onMark,
  onAcknowledge,
  onComplete,
  onUpdateMark,
  onDownload,
  onAddAttachment,
  onRemoveAttachment,
  onSign,
  isSigning = false,
  onRegeneratePdf,
  isRegeneratingPdf = false,
  onRefreshDocument,
}) => {
  const isFileBased = !!document.file_url;
  const isComposed = (document.type === "memo" || document.type === "letter" || document.type === "certificate") && !isFileBased;
  const isEditable = !!onSave && !isFileBased;
  //const isLetter = document.type === "letter";
  //const isMemo = document.type === "memo";
  //const isCertificate = document.type === "certificate";
  const canEditFields = isSuperAdmin && isComposed && isEditable;
  const formattedDate = document.created_at
    ? format(new Date(document.created_at), "dd MMM yyyy")
    : "—";

  const hasMarkNote = !!document.active_mark?.instructions;
  const [showNote, setShowNote] = useState(hasMarkNote);
  const [showResponses, setShowResponses] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const stickyNoteText = document.active_mark?.instructions ?? "";
  const stickyNoteDate = document.bring_up_date ?? null;
  const noteAuthor = document.active_mark
    ? (document.created_by_name ?? currentUserName)
    : currentUserName;

  const [saveState, setSaveState] = useState<SaveState>(
    document.body ? "saved" : "idle",
  );
  const [bodyHtml, setBodyHtml] = useState(document.body || "");
  const lastSavedHtml = useRef<string>(document.body ?? "");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fieldValues, setFieldValues] = useState<EditableFields>(() => ({
    to_recipient: document.to_recipient || document.assigned_to_name || '',
    from_sender: document.from_sender || document.department_name || '',
    reference_no: document.reference_no || '',
    document_date: toISODateInput(document.document_date || document.created_at),
    subject: document.subject || document.title || '',
    cc: document.cc || '',
    enclosures: document.enclosures || '',
    signature_name: document.signature_name || currentUserName || '',
    signature_title: document.signature_title || 'Registrar, High Court',
  }));

  const fieldDebounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fieldDirty = useRef<Set<string>>(new Set());
  const fieldLatestValue = useRef<Record<string, string>>({});

  const persistField = useCallback(
    async (field: string, value: string) => {
      if (!onFieldUpdate) return;
      onFieldUpdate(field, value);
    },
    [onFieldUpdate],
  );

  const handleFieldChange = useCallback((field: keyof EditableFields, value: string) => {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
    fieldLatestValue.current[field] = value;
    fieldDirty.current.add(field);

    if (fieldDebounceTimers.current[field]) clearTimeout(fieldDebounceTimers.current[field]);
    fieldDebounceTimers.current[field] = setTimeout(() => {
      fieldDirty.current.delete(field);
      persistField(field, fieldLatestValue.current[field]);
    }, 800);
  }, [persistField]);

  const flushFieldSaves = useCallback(async () => {
    Object.values(fieldDebounceTimers.current).forEach(clearTimeout);
    fieldDebounceTimers.current = {};
    const dirty = Array.from(fieldDirty.current);
    fieldDirty.current.clear();
    await Promise.all(dirty.map((field) => persistField(field, fieldLatestValue.current[field])));
  }, [persistField]);

  const persistBody = useCallback(
    async (html: string) => {
      if (!onSave) return;
      if (html === lastSavedHtml.current) return;
      setSaveState("saving");
      try {
        await onSave(document.id, { body: html });
        lastSavedHtml.current = html;
        setBodyHtml(html);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [onSave, document.id],
  );

  const handleBodyChange = useCallback(
    (html: string) => {
      setBodyHtml(html);
      setSaveState("unsaved");
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        persistBody(html);
      }, 1500);
    },
    [persistBody],
  );

  const handleSaveAll = useCallback(async () => {
    const html = bodyHtml;
    await persistBody(html);
    await flushFieldSaves();
  }, [bodyHtml, persistBody, flushFieldSaves]);

  const enterEditMode = () => {
    const newBody = document.body ?? "";
    setBodyHtml(newBody);
    lastSavedHtml.current = newBody;
    setIsEditMode(true);
    toast.success('Edit mode enabled. Changes auto-save as you type.');
  };

  const finishEditing = async () => {
    await handleSaveAll();
    setIsEditMode(false);
    if (onRegeneratePdf) {
      await onRegeneratePdf();
      toast.success('Changes saved — PDF updated');
    } else {
      toast.success('Changes saved');
    }
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      finishEditing();
    } else {
      enterEditMode();
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isEditable) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isEditable, handleSaveAll]);

  const handleStickyNoteSave = (text: string, _date: string | null) => {
    if (document.active_mark && onUpdateMark) {
      onUpdateMark(document.active_mark.id, text);
    }
    void _date;
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (document.file_url) {
      window.open(document.file_url, '_blank');
    } else {
      toast.error('No file available to download');
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      e.target.value = '';
      return;
    }

    setIsUploadingAttachment(true);
    try {
      if (onAddAttachment) {
        await onAddAttachment(file);
        toast.success('Attachment added successfully');
      } else {
        toast.error('Attachment upload not available');
      }
    } catch (error) {
      toast.error('Failed to upload attachment');
      console.error('Attachment upload error:', error);
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!window.confirm('Remove this attachment?')) return;

    try {
      if (onRemoveAttachment) {
        await onRemoveAttachment(attachmentId);
        toast.success('Attachment removed');
      }
    } catch (error) {
      toast.error('Failed to remove attachment');
      console.error('Attachment removal error:', error);
    }
  };

  const attachments = document.attachments || [];
  const hasAttachments = attachments.length > 0;

  const showEditControls = isSuperAdmin && isComposed;

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
          <span className="text-sm font-semibold text-stone-900 truncate">
            {document.title}
          </span>
          <span className="text-stone-300 text-xs hidden sm:inline">—</span>
          <span className="text-xs text-stone-400 hidden sm:inline">
            {formattedDate}
          </span>
          {document.original_name && !isComposed && (
            <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded hidden sm:inline">
              {document.original_name}
            </span>
          )}
          {canEditFields && (
            <span className="text-[9px] font-semibold text-[#1E4620] bg-[#1E4620]/10 px-1.5 py-0.5 rounded hidden sm:inline">
              Full edit access
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto w-full sm:w-auto">
          {/* ─── Refresh Button ───────────────────────────────────────────── */}
          {isSuperAdmin && onRefreshDocument && (
            <button
              onClick={onRefreshDocument}
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 transition-colors whitespace-nowrap"
              title="Refresh document"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.418 0V4h-.582m-15.418 0A9 9 0 0118.84 9.986M21 16v5h-.582m-15.418 0v-5h.582m15.418 0a9 9 0 01-15.24 5.014" />
              </svg>
              Refresh
            </button>
          )}

          {/* ─── Edit Button ────────────────────────────────────────────── */}
          {!document.is_sent && showEditControls && (
            <button
              onClick={toggleEditMode}
              disabled={isRegeneratingPdf}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap disabled:opacity-50 ${
                isEditMode
                  ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {isRegeneratingPdf ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : isEditMode ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
              {isRegeneratingPdf ? "Regenerating…" : isEditMode ? "Done" : "Edit"}
            </button>
          )}

          {/* ─── Save Button ────────────────────────────────────────────── */}
          {isEditable && isEditMode && (
            <button
              onClick={handleSaveAll}
              disabled={saveState === "saving"}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {saveState === "saving" ? <Spinner className="h-3 w-3" /> : null}
              {saveState === "saving" ? "Saving…" : "Save"}
            </button>
          )}

          {/* ─── Sign Button ────────────────────────────────────────────── */}
          {onSign && !document.is_signed && (
            <button
              onClick={onSign}
              disabled={isSigning}
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigning ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
              {isSigning ? "Signing…" : "Sign Document"}
            </button>
          )}

          {/* ─── Attachment Upload ───────────────────────────────────────── */}
          {onAddAttachment && (
            <label
              className={`inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap ${
                isUploadingAttachment ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Add attachment"
            >
              {isUploadingAttachment ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
              {isUploadingAttachment ? 'Uploading...' : 'Add Attachment'}
              <input
                type="file"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isUploadingAttachment}
              />
            </label>
          )}

          {/* ─── Download ────────────────────────────────────────────────── */}
          {(document.file_url || onDownload) && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
              title="Download document"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}

          {/* ─── Responses ───────────────────────────────────────────────── */}
          <button
            onClick={() => setShowResponses((v) => !v)}
            title={showResponses ? "Hide responses" : "Show responses"}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              showResponses
                ? "border-[#1E4620] bg-[#1E4620]/10 text-[#1E4620]"
                : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
            }`}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-4-4z" />
            </svg>
            Responses
            {document.response_count && document.response_count > 0 && (
              <span className="ml-0.5 rounded-full bg-[#1E4620]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#1E4620]">
                {document.response_count}
              </span>
            )}
          </button>

          {/* ─── Note ────────────────────────────────────────────────────── */}
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

          {/* ─── Mark ────────────────────────────────────────────────────── */}
          {onMark && document.status !== "filed" && (
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

          {/* ─── Acknowledge ────────────────────────────────────────────── */}
          {onAcknowledge && (
            <button
              onClick={onAcknowledge}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap"
            >
              Acknowledge
            </button>
          )}

          {/* ─── Complete ────────────────────────────────────────────────── */}
          {onComplete && (
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap"
            >
              Complete
            </button>
          )}

          {/* ─── Send ────────────────────────────────────────────────────── */}
          {onSend && (
            <button
              onClick={onSend}
              className="hidden sm:inline-flex items-center gap-1 rounded-md bg-[#1E4620] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#163a18] transition-colors whitespace-nowrap"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Convert to PDF & Send
            </button>
          )}

          {/* ─── Delete ──────────────────────────────────────────────────── */}
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

      {/* ─── Attachments Section ─────────────────────────────────────────── */}
      {hasAttachments && (
        <div className="bg-white border-b border-stone-200 px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
              Attachments ({attachments.length}):
            </span>
            {attachments.map((att) => (
              <div key={att.id || att.url} className="inline-flex items-center gap-1 bg-stone-50 border border-stone-200 rounded px-2 py-0.5">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#1E4620] hover:text-[#c9a84c] transition-colors flex items-center gap-1"
                >
                  <svg className="h-3 w-3 text-[#c9a84c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  {att.name}
                  {att.size && (
                    <span className="text-[9px] text-stone-400">({formatFileSize(att.size)})</span>
                  )}
                </a>
                {onRemoveAttachment && (
                  <button
                    onClick={() => att.id && handleRemoveAttachment(att.id)}
                    className="text-stone-400 hover:text-red-500 transition p-0.5"
                    title="Remove attachment"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Canvas ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-stone-100 py-3 px-2 sm:py-6 sm:px-6 relative">
        {showNote && (
          <StickyNote
            key={document.id}
            authorName={noteAuthor}
            initialText={stickyNoteText}
            initialDate={stickyNoteDate}
            canEdit={isSuperAdmin}
            onSave={handleStickyNoteSave}
          />
        )}

        <div className="mx-auto max-w-[794px] w-full bg-white shadow-sm rounded-sm">
          {isComposed ? (
            !isEditable && !document.body ? (
              <DocumentFallback document={document} />
            ) : document.type === 'memo' ? (
              <MemoDisplay
                document={document}
                isEditable={isEditable}
                isEditMode={isEditMode}
                currentUserName={currentUserName}
                isSuperAdmin={isSuperAdmin}
                fields={fieldValues}
                onFieldChange={handleFieldChange}
                bodyHtml={bodyHtml}
                onBodyChange={handleBodyChange}
              />
            ) : document.type === 'letter' ? (
              <LetterDisplay
                document={document}
                isEditable={isEditable}
                isEditMode={isEditMode}
                currentUserName={currentUserName}
                isSuperAdmin={isSuperAdmin}
                fields={fieldValues}
                onFieldChange={handleFieldChange}
                bodyHtml={bodyHtml}
                onBodyChange={handleBodyChange}
              />
            ) : (
              <CertificateDisplay
                document={document}
                isEditable={isEditable}
                isEditMode={isEditMode}
                currentUserName={currentUserName}
                isSuperAdmin={isSuperAdmin}
                fields={fieldValues}
                onFieldChange={handleFieldChange}
                bodyHtml={bodyHtml}
                onBodyChange={handleBodyChange}
              />
            )
          ) : (
            <FilePreview document={document} />
          )}
        </div>
      </div>

      {/* ─── Footer Bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 bg-white border-t border-stone-100 px-3 sm:px-4 py-1.5 flex-shrink-0 flex-wrap">
        <span className="text-[10px] text-stone-400 whitespace-nowrap">
          {document.is_signed
            ? `✅ Signed${document.signed_by_name ? ` · ${document.signed_by_name}` : ""}`
            : "Not signed"}
        </span>
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
          {(document.file_url || onDownload) && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
          <button className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors whitespace-nowrap">
            🖨 Print
          </button>
          {onSign && !document.is_signed && (
            <button
              onClick={onSign}
              disabled={isSigning}
              className="inline-flex items-center gap-1 rounded bg-[#C29B38] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#a8832e] transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigning && <Spinner className="h-2.5 w-2.5" />}
              {isSigning ? "Signing…" : "Sign Document"}
            </button>
          )}
          {onSend && (
            <button
              onClick={onSend}
              className="rounded bg-[#1E4620] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#163a18] transition-colors whitespace-nowrap"
            >
              Convert to PDF & Send
            </button>
          )}
        </div>
      </div>

      {/* ─── Responses Panel ─────────────────────────────────────────────── */}
      {showResponses && <ResponsesPanel documentId={document.id} />}

      <AnnotationsPanel document={document} />
    </div>
  );
};

// ─── MarkModal ─────────────────────────────────────────────────────────────

interface MarkModalProps {
  document: Document;
  onClose: () => void;
  onMark: (
    id: string,
    data: {
      departmentId: string;
      userId: string;
      instructions: string;
      priority: string;
    },
  ) => void;
}

const MarkModal: React.FC<MarkModalProps> = ({
  document: doc,
  onClose,
  onMark,
}) => {
  const dispatch = useAppDispatch();

  const departments = useAppSelector(selectAllDepartments);
  const departmentsLoading = useAppSelector(selectDepartmentsListLoading);
  const teamMembers = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [userId, setUserId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState("normal");

  useEffect(() => {
    dispatch(fetchDepartments({ is_active: true }));
  }, [dispatch]);

  useEffect(() => {
    if (!deptId) return;
    dispatch(
      fetchUsers({
        is_active: true,
        department_id: deptId,
        limit: 100,
        sort_by: "full_name",
        sort_order: "ASC",
      }),
    );
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
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none flex-shrink-0">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Document
            </label>
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
                {departmentsLoading
                  ? "Loading departments…"
                  : "— Select Department —"}
              </option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.code ? ` (${d.code})` : ""}
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
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.pj_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Priority
            </label>
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
              <span className="font-normal text-stone-400 normal-case">
                (Visible to Secretary)
              </span>
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

// ─── Main Component ──────────────────────────────────────────────────────────

const DHMemoandLetters: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { documents, loading, error, pagination, actionInProgress } =
    useAppSelector((state) => state.documents);

      // Get full user from userSlice which has signature_url
  const fullUser = useAppSelector((state) => state.users.currentUser);

  const [activeTab, setActiveTab] = useState<"all" | "my_action">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showComposer, setShowComposer] = useState<"memo" | "letter" | "certificate" | null>(null);
  const [isCreating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const canUpload = hasRole(user, "staff") || hasRole(user, "super_admin") || hasRole(user, "dept_head");
  const canAdmin = hasRole(user, "dept_head") || hasRole(user, "super_admin");
  const isSuperAdmin = hasRole(user, "super_admin");
  const canView = !!user;

  // Filter to memos, letters, and certificates
  const memoLetterDocs = useMemo(
    () => documents.filter((doc) => doc.type === "memo" || doc.type === "letter" || doc.type === "certificate"),
    [documents]
  );

  // Fetch documents
  useEffect(() => {
    if (!canView) return;
    const params: DocumentFilters = { page: 1, limit: 10 };
    if (activeTab === "my_action") params.for_my_action = true;
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchDocuments(params));
  }, [dispatch, activeTab, searchQuery, canView]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this document?")) dispatch(deleteDocument(id));
  };

  const handleSend = (id: string) => dispatch(sendDocument(id));

  const handleAcknowledge = (id: string) => dispatch(acknowledgeMark(id));

  const handleComplete = (id: string) => dispatch(completeMark(id));

  const handleMark = (
    id: string,
    data: {
      departmentId: string;
      userId: string;
      instructions: string;
      priority: string;
    }
  ) => {
    dispatch(
      markDocument({
        id,
        input: {
          department_id: data.departmentId,
          assigned_to: data.userId || undefined,
          instructions: data.instructions,
          priority: data.priority as "low" | "normal" | "urgent",
        },
      })
    );
    setShowMarkModal(false);
  };

  const handlePageChange = (page: number) => {
    const params: DocumentFilters = { page, limit: 10 };
    if (activeTab === "my_action") params.for_my_action = true;
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchDocuments(params));
  };

  // ─── Save document body ──────────────────────────────────────────────────
  const handleSaveBody = async (
    id: string,
    updates: DocumentUpdatePayload,
  ) => {
    const result = await dispatch(updateDocument({ id, input: updates }));
    if (updateDocument.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
    } else {
      throw new Error((result.payload as string) ?? "Failed to save changes");
    }
  };

  // ─── Field update handler ────────────────────────────────────────────────
  const handleFieldUpdate = async (field: string, value: string) => {
    if (!selectedDocument) return;
    const result = await dispatch(
      updateDocument({
        id: selectedDocument.id,
        input: { [field]: value }
      })
    );
    if (updateDocument.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
    } else {
      toast.error("Failed to update field");
    }
  };

  // ─── Update Mark handler ──────────────────────────────────────────────────
  const handleUpdateMark = (markId: string, text: string) => {
    dispatch(updateMark({ markId, instructions: text }));
    if (selectedDocument && selectedDocument.active_mark) {
      const updatedMark = {
        ...selectedDocument.active_mark,
        instructions: text,
      };
      setSelectedDocument({
        ...selectedDocument,
        active_mark: updatedMark,
      });
    }
  };

  // ─── Attachment handlers ─────────────────────────────────────────────────
  const handleAddAttachment = async (file: File) => {
    if (!selectedDocument) return;
    const result = await dispatch(
      addDocumentAttachment({ id: selectedDocument.id, file }),
    );
    if (addDocumentAttachment.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
    } else {
      throw new Error((result.payload as string) ?? "Failed to add attachment");
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!selectedDocument) return;
    const result = await dispatch(
      removeDocumentAttachment({ id: selectedDocument.id, attachmentId }),
    );
    if (removeDocumentAttachment.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
    } else {
      throw new Error(
        (result.payload as string) ?? "Failed to remove attachment",
      );
    }
  };

// ─── Sign Document (No OTP) ──────────────────────────────────────────────
const handleSignDocument = async () => {
  if (!selectedDocument) return;
  
  if (!selectedDocument.file_url) {
    toast.error('Please generate a PDF first before signing.');
    return;
  }

  if (selectedDocument.is_signed) {
    toast('Document is already signed.', {
      icon: 'ℹ️',
      duration: 3000,
    });
    return;
  }

  // Check if user has a signature
  if (!fullUser?.signature_url) {
    toast.error('Please upload your signature first before signing documents.');
    return;
  }

  setIsSigning(true);
  try {
    // Use the NEW signDocumentNoOtp thunk (no OTP required)
    const result = await dispatch(
      signDocumentNoOtp({ 
        id: selectedDocument.id,
        // Optional: pass position if you want to control where signature goes
        // position_x: 100,
        // position_y: 400,
        // position_width: 200,
        // position_height: 80,
      })
    );

    if (signDocumentNoOtp.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
      toast.success('Document signed successfully.');
      // Refresh the list
      const params: DocumentFilters = { page: 1, limit: 10 };
      if (activeTab === "my_action") params.for_my_action = true;
      if (searchQuery) params.search = searchQuery;
      dispatch(fetchDocuments(params));
    } else {
      toast.error((result.payload as string) ?? 'Failed to sign document.');
    }
  } catch (error) {
    console.error('Sign error:', error);
    toast.error('An error occurred while signing the document.');
  } finally {
    setIsSigning(false);
  }
};

  // ─── Regenerate PDF ──────────────────────────────────────────────────────
  const handleRegeneratePdf = async () => {
    if (!selectedDocument) return;
    const result = await dispatch(regeneratePdf(selectedDocument.id));
    if (regeneratePdf.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
      toast.success('PDF regenerated successfully.');
    } else {
      toast.error((result.payload as string) ?? "Failed to regenerate PDF");
    }
  };

  // ─── Refresh Document ────────────────────────────────────────────────────
  const handleRefreshDocument = async () => {
    if (!selectedDocument) return;
    const result = await dispatch(fetchDocumentById(selectedDocument.id));
    if (fetchDocumentById.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
      toast.success('Document refreshed.');
    } else {
      toast.error('Failed to refresh document.');
    }
  };

  const handleTemplateCreated = (doc: Document) => {
    toast.success(`${doc.type} created successfully`);
    setShowComposer(null);
    setSelectedDocument(doc);
    // Refresh list
    const params: DocumentFilters = { page: 1, limit: 10 };
    if (activeTab === "my_action") params.for_my_action = true;
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchDocuments(params));
  };

  const handleDownload = () => {
    if (!selectedDocument?.file_url) {
      toast.error('No file available to download');
      return;
    }
    window.open(selectedDocument.file_url, '_blank');
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4 text-center">
        <p className="text-stone-400 text-sm">
          You don't have access to Document Management.
        </p>
      </div>
    );
  }

  const isSigningInProgress = !!actionInProgress.signing || isSigning;

  return (
    <div className="flex flex-col h-full">
      {/* Composer Modal */}
      {showComposer && (
        <TemplateComposerModal
          type={showComposer}
          departmentId={user?.department_id ?? null}
          onClose={() => setShowComposer(null)}
          onCreated={handleTemplateCreated}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white flex-wrap">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight truncate">
            Memos, Letters &amp; Certificates
          </h1>
          <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 hidden sm:block">
            Compose, edit, and sign your official documents
          </p>
        </div>

        {canUpload && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setShowComposer("memo")}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8A840] bg-[#F5C24C] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#7A4E0D] hover:bg-[#f0bb40] transition-colors disabled:opacity-50"
            >
              <span>📄</span> New Memo
            </button>
            <button
              onClick={() => setShowComposer("letter")}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <span>✉️</span> New Letter
            </button>
            <button
              onClick={() => setShowComposer("certificate")}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <span>📜</span> New Certificate
            </button>
            <button
              onClick={() => selectedDocument && setShowMarkModal(true)}
              disabled={!selectedDocument || !canAdmin}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors ${
                !selectedDocument || !canAdmin
                  ? "border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed"
                  : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
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

      {/* Tabs */}
      <div className="flex gap-1 px-3 sm:px-6 py-2 border-b border-stone-200 bg-white">
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "all" ? "bg-[#1E4620] text-white" : "text-stone-500 hover:bg-stone-100"
          }`}
        >
          All Documents
        </button>
        <button
          onClick={() => setActiveTab("my_action")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "my_action" ? "bg-[#1E4620] text-white" : "text-stone-500 hover:bg-stone-100"
          }`}
        >
          For My Action
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel */}
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
                placeholder="Search memos, letters & certificates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 pl-8 text-xs placeholder:text-stone-400 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] focus:bg-white"
              />
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Document List */}
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
            ) : memoLetterDocs.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-stone-400">No memos, letters, or certificates found.</p>
                {canUpload && (
                  <p className="text-xs text-stone-300 mt-1">Click "New Memo", "New Letter", or "New Certificate" to start.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {memoLetterDocs.map((doc) => (
                  <ListItem
                    key={doc.id}
                    document={doc}
                    selected={selectedDocument?.id === doc.id}
                    onSelect={() => setSelectedDocument(doc)}
                    hasResponse={(doc.response_count ?? 0) > 0}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-stone-200 bg-stone-50 px-3 py-2.5 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-stone-500 font-medium whitespace-nowrap">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-[10px] text-stone-500 px-1">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Document Editor */}
        <div
          className={`w-full flex-1 flex-col overflow-hidden bg-stone-100 ${
            selectedDocument ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedDocument ? (
            <DocumentEditor
              key={selectedDocument.id}
              document={selectedDocument}
              currentUserName={user?.full_name ?? "Registrar"}
              isSuperAdmin={isSuperAdmin}
              onBack={() => setSelectedDocument(null)}
              onSave={
                (canUpload || isSuperAdmin) &&
                (isSuperAdmin || selectedDocument.status !== "filed")
                  ? handleSaveBody
                  : undefined
              }
              onFieldUpdate={isSuperAdmin ? handleFieldUpdate : undefined}
              onDelete={canAdmin ? () => handleDelete(selectedDocument.id) : undefined}
              onSend={
                canAdmin &&
                !selectedDocument.is_sent &&
                selectedDocument.is_signed
                  ? () => handleSend(selectedDocument.id)
                  : undefined
              }
              onMark={
                canAdmin && selectedDocument.status !== "filed"
                  ? () => setShowMarkModal(true)
                  : undefined
              }
              onAcknowledge={
                (selectedDocument.status === "marked" || selectedDocument.status === "user_assigned") &&
                (selectedDocument.assigned_to === user?.id || isSuperAdmin)
                  ? () => handleAcknowledge(selectedDocument.id)
                  : undefined
              }
              onComplete={
                selectedDocument.status === "in_progress" &&
                (selectedDocument.assigned_to === user?.id || isSuperAdmin)
                  ? () => handleComplete(selectedDocument.id)
                  : undefined
              }
              onUpdateMark={handleUpdateMark}
              onDownload={handleDownload}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              onSign={handleSignDocument}
              isSigning={isSigningInProgress}
              onRegeneratePdf={isSuperAdmin ? handleRegeneratePdf : undefined}
              isRegeneratingPdf={actionInProgress.regeneratingPdf === selectedDocument?.id}
              onRefreshDocument={isSuperAdmin ? handleRefreshDocument : undefined}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-4">
              <div className="text-center max-w-sm">
                <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3 text-sm font-semibold text-stone-500">Select a memo, letter, or certificate</p>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  Choose a document from the list, or create a new one to start writing.
                </p>
              </div>
            </div>
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
    </div>
  );
};

export default DHMemoandLetters;