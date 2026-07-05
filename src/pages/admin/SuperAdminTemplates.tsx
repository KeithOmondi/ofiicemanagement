// src/pages/documents/SuperAdminTemplates.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchAllTemplates,
  uploadTemplate,
  deleteTemplate,
  selectAllTemplates,
  selectTemplatesLoading,
  selectTemplatesUploading,
} from "../../store/slices/templatesSlice";
import {
  fetchDepartments,
  selectAllDepartments,
} from "../../store/slices/departmentsSlice";
import type { DocumentTemplate, TemplateType } from "../../types/templates.types";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToastState {
  type: "success" | "error";
  message: string;
}

const TYPE_LABELS: Record<TemplateType, string> = {
  memo: "Internal Memo",
  letter: "Letterhead",
};

const TYPE_ICONS: Record<TemplateType, string> = {
  memo: "📄",
  letter: "✉️",
};

// ─── Scope helpers ──────────────────────────────────────────────────────────
// A template's "scope" is either global (department_id === null, applies
// everywhere nothing more specific exists) or a single department, which
// overrides the global template for that department only.

const scopeLabel = (template: DocumentTemplate): string =>
  template.department_id ? template.department_name ?? "Unknown Department" : "Global (all departments)";

// ─── Upload Card ──────────────────────────────────────────────────────────────

interface UploadCardProps {
  type: TemplateType;
  active: DocumentTemplate | undefined;
  uploading: boolean;
  departments: { id: string; name: string }[];
  onUpload: (file: File, departmentId?: string) => void;
}

const UploadCard: React.FC<UploadCardProps> = ({
  type,
  active,
  uploading,
  departments,
  onUpload,
}) => {
  const [departmentId, setDepartmentId] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return;
    }
    onUpload(file, departmentId || undefined);
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TYPE_ICONS[type]}</span>
          <span className="text-sm font-bold text-stone-900">{TYPE_LABELS[type]}</span>
        </div>
        {active && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            Active
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Current active template */}
        {active ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs">
            <p className="font-semibold text-stone-800 truncate">
              {active.original_name || "Untitled template"}
            </p>
            <p className="text-stone-400 mt-0.5">
              {scopeLabel(active)} · uploaded{" "}
              {active.created_at
                ? format(new Date(active.created_at), "dd MMM yyyy")
                : "—"}{" "}
              by {active.uploaded_by_name}
            </p>
            {active.footer_image_url ? (
              <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Footer &amp; letterhead detected
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] text-amber-600 font-medium">
                No footer detected in this file — generated documents will have no footer band.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-400 italic">
            No {TYPE_LABELS[type].toLowerCase()} template uploaded yet.
          </p>
        )}

        {/* Department scope */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
            Applies to
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-[#1E4620] focus:outline-none"
          >
            <option value="">Global — all departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-5 cursor-pointer transition-colors ${
            dragOver
              ? "border-[#1E4620] bg-[#1E4620]/5"
              : "border-stone-300 hover:border-[#1E4620]/60 hover:bg-stone-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1E4620] border-t-transparent" />
              <p className="text-xs text-stone-500 font-medium">Uploading &amp; reading template…</p>
            </>
          ) : (
            <>
              <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-xs text-stone-600 font-medium">
                {active ? "Drop a new .docx to replace this template" : "Drop a .docx file, or click to browse"}
              </p>
              <p className="text-[10px] text-stone-400">
                Word document only — crest, fields and footer are read automatically
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── History Row ──────────────────────────────────────────────────────────────

const HistoryRow: React.FC<{
  template: DocumentTemplate;
  onDelete: () => void;
}> = ({ template, onDelete }) => (
  <div className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0">
    <span className="text-sm">{TYPE_ICONS[template.type]}</span>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-stone-700 truncate">
        {template.original_name || "Untitled"}
      </p>
      <p className="text-[10px] text-stone-400">
        {TYPE_LABELS[template.type]} · {scopeLabel(template)} ·{" "}
        {template.created_at ? format(new Date(template.created_at), "dd MMM yyyy, hh:mm aa") : "—"}
      </p>
    </div>
    {template.is_active ? (
      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide whitespace-nowrap">
        Active
      </span>
    ) : (
      <button
        onClick={onDelete}
        className="text-[10px] text-red-500 hover:text-red-700 hover:underline whitespace-nowrap flex-shrink-0"
      >
        Delete
      </button>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminTemplates: React.FC = () => {
  const dispatch = useAppDispatch();
  const templates = useAppSelector(selectAllTemplates);
  const loading = useAppSelector(selectTemplatesLoading);
  const uploading = useAppSelector(selectTemplatesUploading);
  const departments = useAppSelector(selectAllDepartments);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    dispatch(fetchAllTemplates());
    dispatch(fetchDepartments({ is_active: true }));
  }, [dispatch]);

  const showToast = (t: ToastState) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  };

  const handleUpload = async (type: TemplateType, file: File, departmentId?: string) => {
    const result = await dispatch(uploadTemplate({ file, type, departmentId }));
    if (uploadTemplate.fulfilled.match(result)) {
      showToast({ type: "success", message: `${TYPE_LABELS[type]} template activated.` });
    } else {
      showToast({ type: "error", message: (result.payload as string) ?? "Upload failed." });
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    const result = await dispatch(deleteTemplate(id));
    if (deleteTemplate.fulfilled.match(result)) {
      showToast({ type: "success", message: "Template deleted." });
    } else {
      showToast({ type: "error", message: (result.payload as string) ?? "Delete failed." });
    }
  };

  const activeMemo = templates.find((t) => t.type === "memo" && t.is_active && !t.department_id);
  const activeLetter = templates.find((t) => t.type === "letter" && t.is_active && !t.department_id);
  const history = templates.filter((t) => !t.is_active);

  const departmentOptions = departments.map((d) => ({ id: d.id, name: d.name }));

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Page Header */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white">
        <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
          Document Templates
        </h1>
        <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
          Upload the official Word memo and letterhead once — new memos and letters are generated from these automatically.
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
        {/* Upload cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UploadCard
            type="memo"
            active={activeMemo}
            uploading={uploading}
            departments={departmentOptions}
            onUpload={(file, departmentId) => handleUpload("memo", file, departmentId)}
          />
          <UploadCard
            type="letter"
            active={activeLetter}
            uploading={uploading}
            departments={departmentOptions}
            onUpload={(file, departmentId) => handleUpload("letter", file, departmentId)}
          />
        </div>

        {/* Department-scoped active templates, if any exist */}
        {templates.some((t) => t.is_active && t.department_id) && (
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50">
              <span className="text-xs font-semibold text-[#1E4620]">
                Department-specific templates
              </span>
            </div>
            <div>
              {templates
                .filter((t) => t.is_active && t.department_id)
                .map((t) => (
                  <HistoryRow key={t.id} template={t} onDelete={() => {}} />
                ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50">
            <span className="text-xs font-semibold text-[#1E4620]">Replaced templates</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1E4620] border-t-transparent" />
            </div>
          ) : history.length === 0 ? (
            <p className="px-4 py-6 text-xs text-stone-400 italic">
              No replaced templates yet — history appears here once you upload a new version.
            </p>
          ) : (
            history.map((t) => (
              <HistoryRow
                key={t.id}
                template={t}
                onDelete={() => handleDelete(t.id, t.original_name || "this template")}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminTemplates;