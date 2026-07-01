// src/pages/super-admin/SuperAdminTemplates.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchDepartmentTemplates,
  fetchTemplateHistory,
  uploadTemplate,
  deactivateTemplate,
  clearTemplateError,
} from '../../store/slices/templatesSlice';
import { fetchDepartments, selectAllDepartments, selectDepartmentsListLoading } from '../../store/slices/departmentsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { GLOBAL_KEY, type DepartmentTemplate, type TemplateType } from '../../types/templates.types';

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: 'memo', label: 'Memo' },
  { value: 'letter', label: 'Letter' },
];

const ACCEPTED_EXT = '.doc,.docx,.odt';
const MAX_SIZE_MB = 15;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getFileExtension(url: string | null | undefined): string {
  if (!url) return '';
  const fileName = url.split('/').pop() || '';
  return fileName.split('.').pop()?.toLowerCase() || '';
}

// ─── Template Preview Panel ───────────────────────────────────────────────
// Same modal-overlay + viewer pattern as DocumentPreviewPanel in AdminDocs.tsx.
// Templates are always office docs (.doc/.docx/.odt), so we route straight
// to the Google Docs Viewer instead of branching on every file type.

interface TemplatePreviewPanelProps {
  template: DepartmentTemplate | null;
  onClose: () => void;
}

const TemplatePreviewPanel: React.FC<TemplatePreviewPanelProps> = ({ template, onClose }) => {
  if (!template) return null;

  const fileUrl = template.file_url;
  const ext = getFileExtension(fileUrl);
  const officeViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-semibold text-slate-900 truncate max-w-md">
              {template.original_name}
            </span>
            <span className="text-xs text-slate-400">
              ({formatBytes(template.file_size_bytes)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            
            <a  href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Open in new tab
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-hidden bg-slate-100">
          {['doc', 'docx', 'odt'].includes(ext) ? (
            <iframe
              src={officeViewerUrl}
              title={template.original_name}
              className="w-full h-full border-0 rounded-sm"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 gap-3">
              <svg className="h-16 w-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-slate-500 text-center">
                This file type can't be previewed inline.{' '}
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Open in new tab
                </a>{' '}
                instead.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function SuperAdminTemplates() {
  const dispatch = useAppDispatch();

  const user = useAppSelector((s) => s.auth.user);
  const departments = useAppSelector(selectAllDepartments);
  const departmentsLoading = useAppSelector(selectDepartmentsListLoading);
  const byDepartment = useAppSelector((s) => s.templates.byDepartment);
  const history = useAppSelector((s) => s.templates.history);
  const uploadStatus = useAppSelector((s) => s.templates.uploadStatus);
  const error = useAppSelector((s) => s.templates.error);

  const isDeptHead = user?.role === 'dept_head';
  const isSuperAdmin = user?.role === 'super_admin';

  // '' = nothing selected, GLOBAL_KEY = global/default, otherwise a real department id
  const [selectedDept, setSelectedDept] = useState<string>(
    isDeptHead ? user?.department_id ?? '' : ''
  );
  const [activeType, setActiveType] = useState<TemplateType>('memo');
  const [showHistory, setShowHistory] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Preview state ──────────────────────────────────────────────────────
  const [previewTemplate, setPreviewTemplate] = useState<DepartmentTemplate | null>(null);

  const isGlobalSelected = selectedDept === GLOBAL_KEY;
  // the real value to send to the API / thunks: null for global, otherwise the id
  const apiDepartmentId = isGlobalSelected ? null : selectedDept || null;

  // ── Load data ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isDeptHead) dispatch(fetchDepartments({}));
  }, [dispatch, isDeptHead]);

  useEffect(() => {
    if (selectedDept && !isGlobalSelected) dispatch(fetchDepartmentTemplates(selectedDept));
  }, [dispatch, selectedDept, isGlobalSelected]);

  useEffect(() => {
    if (selectedDept && showHistory) {
      dispatch(fetchTemplateHistory({ departmentId: apiDepartmentId, type: activeType }));
    }
  }, [dispatch, selectedDept, apiDepartmentId, activeType, showHistory]);

  const deptOptions = isDeptHead
    ? departments.filter((d) => d.id === user?.department_id)
    : departments.filter((d) => d.is_active);

  const currentTemplate: DepartmentTemplate | undefined = byDepartment[selectedDept]?.[activeType];
  const currentHistory = history[`${selectedDept}:${activeType}`] ?? [];

  const selectedDeptName = useMemo(() => {
    if (isGlobalSelected) return 'Global / Default';
    return departments.find((d) => d.id === selectedDept)?.name;
  }, [departments, selectedDept, isGlobalSelected]);

  const displayError = validationError ?? error;

  // ── Handlers ───────────────────────────────────────────────────────────

  const dismissError = () => {
    setValidationError(null);
    dispatch(clearTemplateError());
  };

  const handleFile = (file: File) => {
    dismissError();

    if (!/\.(docx?|odt)$/i.test(file.name)) {
      setValidationError('Please choose a .doc, .docx, or .odt file');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setValidationError(`File must be under ${MAX_SIZE_MB}MB`);
      return;
    }
    if (!selectedDept) return;

    dispatch(uploadTemplate({ departmentId: apiDepartmentId, type: activeType, file }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDeactivate = (template: DepartmentTemplate) => {
    if (!selectedDept) return;
    const target = isGlobalSelected ? 'the global default' : selectedDeptName;
    const confirmed = window.confirm(
      `Remove ${target} ${activeType} template? Until a new one is uploaded, "New ${activeType}" will fall back to ${
        isGlobalSelected ? 'nothing' : 'the global default, if one is set'
      }.`
    );
    if (!confirmed) return;
    dispatch(deactivateTemplate({ id: template.id, departmentId: apiDepartmentId, type: activeType }));
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">
      {/* Preview panel */}
      <TemplatePreviewPanel template={previewTemplate} onClose={() => setPreviewTemplate(null)} />

      <header className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Document Templates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage the memo and letter templates used when composing new documents. Super admins can
          also set a global default used when a department hasn't uploaded its own.
        </p>
      </header>

      {/* Department selector */}
      <div className="mb-6">
        <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">
          Department
        </label>
        {isDeptHead ? (
          <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {selectedDeptName ?? 'Your department'}
          </div>
        ) : (
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            disabled={departmentsLoading}
            className="w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800"
          >
            <option value="">Select a department…</option>
            {isSuperAdmin && (
              <option value={GLOBAL_KEY}>— Global / Default —</option>
            )}
            {deptOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!selectedDept ? (
        <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          Choose a department, or Global / Default, to view or upload its templates.
        </div>
      ) : (
        <>
          {isGlobalSelected && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This template applies to every department that hasn't uploaded its own {activeType}{' '}
              template.
            </div>
          )}

          {/* Type tabs */}
          <div className="mb-4 flex gap-1 border-b border-gray-200">
            {TEMPLATE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setActiveType(t.value);
                  setShowHistory(false);
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeType === t.value
                    ? 'border-emerald-800 text-emerald-900'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Error banner */}
          {displayError && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <span>{displayError}</span>
              <button onClick={dismissError} className="text-red-400 hover:text-red-600" aria-label="Dismiss">
                ×
              </button>
            </div>
          )}

          {/* Current active template */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">Current {activeType} template</h2>
              {currentTemplate && (
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2"
                >
                  {showHistory ? 'Hide history' : 'View history'}
                </button>
              )}
            </div>

            {currentTemplate ? (
              <div className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-800 text-xs font-semibold">
                    DOC
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{currentTemplate.original_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(currentTemplate.file_size_bytes)} · Uploaded by{' '}
                      {currentTemplate.uploaded_by_name} on {formatDate(currentTemplate.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 ml-3">
                  <button
                    onClick={() => setPreviewTemplate(currentTemplate)}
                    className="text-sm font-medium text-emerald-800 hover:text-emerald-900"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeactivate(currentTemplate)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No {activeType} template uploaded yet for {selectedDeptName ?? 'this selection'}.
              </p>
            )}
          </div>

          {/* History */}
          {showHistory && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Previous versions</h3>
              {currentHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No earlier versions on record.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {currentHistory.map((tpl) => (
                    <li key={tpl.id} className="flex items-center justify-between py-2 text-sm">
                      <button
                        onClick={() => setPreviewTemplate(tpl)}
                        className="min-w-0 text-left flex-1 hover:underline"
                      >
                        <span className="truncate text-gray-800">{tpl.original_name}</span>
                        <span className="ml-2 text-xs text-gray-400">{formatDate(tpl.created_at)}</span>
                      </button>
                      {tpl.is_active && <span className="text-xs font-medium text-emerald-700 ml-2">Active</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Upload zone */}
          <div>
            <h2 className="mb-2 text-sm font-medium text-gray-900">Upload new {activeType} template</h2>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                dragActive ? 'border-emerald-800 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <input ref={fileInputRef} type="file" accept={ACCEPTED_EXT} onChange={handleInputChange} className="hidden" />
              {uploadStatus === 'loading' ? (
                <p className="text-sm text-gray-600">Uploading…</p>
              ) : (
                <>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-emerald-800">Click to upload</span> or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Word document (.doc, .docx, .odt), up to {MAX_SIZE_MB}MB
                  </p>
                </>
              )}
            </div>
            {currentTemplate && (
              <p className="mt-2 text-xs text-gray-400">
                Uploading a new file replaces the current template. The previous version stays available under history.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}