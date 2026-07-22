// src/features/aide/HelpdeskAides.tsx

import React, { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchAideRequests,
  fetchAideRequestById,
  createAideRequest,
  updateAideRequest,
  deleteAideRequest,
  fetchAideStats,
  setFilters,
  resetFilters,
  clearSelectedItem,
  clearError,
  clearSuccess,
  selectAllAides,
  selectSelectedAide,
  selectAidePagination,
  selectAideFilters,
  selectAideListLoading,
  selectAideDetailLoading,
  selectAideError,
  selectAideSuccess,
  selectAideTotalCount,
  selectAideInProgressCount,
  selectAideAttachedCount,
  selectAideRejectedCount,
  type AideStatus,
  type OfficerRank,
  type UnitType,
} from '../../store/slices/aidesSlice';
import {
  fetchHelpdeskDocuments,
  uploadHelpdeskDocument,
  linkHelpdeskDocument,
  submitForApproval,
  selectAllHelpdeskDocuments,
  selectDocumentsUploading,
  selectDocumentActionLoading,
  selectDocumentLinking,
  selectUnlinkedHelpdeskDocuments,
  type DocumentFormat,
  type DocumentStatus,
  type DocumentEntityType,
} from '../../store/slices/helpdeskDocumentsSlice';
import {
  OFFICER_RANKS,
  UNIT_TYPES,
  AIDE_STATUSES,
  getAideStatusLabel,
  getAideStatusColor,
  getAideStatusDotColor,
  getOfficerRankLabel,
  getOfficerRankColor,
  getUnitTypeLabel,
  getUnitTypeColor,
  formatAideDate,
  formatAideDateTime,
} from '../../types/aide.types';
import toast, { Toaster } from 'react-hot-toast';
import {
  Plus,
  X,
  Loader2,
  Eye,
  Edit,
  Trash2,
  FileText,
  Paperclip,
  Upload,
  ExternalLink,
  Send,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Hash,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AideFormData {
  judge_name: string;
  officer_rank: OfficerRank;
  officer_name: string;
  employment_number: string;
  current_station: string;
  current_unit: UnitType;
  proposed_assignment: string;
  reporting_date: string;
  remarks: string;
}

interface ValidationError {
  field: string;
  message: string;
}

// ─── UI Components ───────────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] transition-colors';

const labelClasses = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500';

function GhostButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

function GoldButton({
  children,
  icon,
  type = 'button',
  disabled,
  onClick,
  variant = 'default',
  size = 'default',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'default';
}) {
  const styles = {
    default: 'bg-[#c9a84c] text-[#1a3d1c] hover:bg-[#b8973f]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    outline: 'border border-[#c9a84c] text-[#1a3d1c] hover:bg-[#c9a84c]/10',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    default: 'px-4 py-2 text-sm',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition ${styles[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: AideStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getAideStatusColor(status)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${getAideStatusDotColor(status)}`} />
      {getAideStatusLabel(status)}
    </span>
  );
}

function RankBadge({ rank }: { rank: OfficerRank }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getOfficerRankColor(rank)}`}
    >
      {getOfficerRankLabel(rank)}
    </span>
  );
}

function UnitBadge({ unit }: { unit: UnitType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getUnitTypeColor(unit)}`}
    >
      {getUnitTypeLabel(unit)}
    </span>
  );
}

function StatCard({
  icon,
  value,
  label,
  loading,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c9a84c]/15 text-[#1a3d1c]">
        {icon}
      </div>
      <div>
        {loading ? (
          <div className="h-7 w-12 animate-pulse rounded bg-stone-100" />
        ) : (
          <p className="text-xl font-semibold text-stone-900 leading-none">{value}</p>
        )}
        <p className="mt-1 text-sm font-medium text-stone-700">{label}</p>
      </div>
    </div>
  );
}

function ErrorBanner() {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectAideError);
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
      <button onClick={() => dispatch(clearError())} className="text-red-500 hover:text-red-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function SuccessBanner() {
  const dispatch = useAppDispatch();
  const success = useAppSelector(selectAideSuccess);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
    return () => clearTimeout(timer);
  }, [success, dispatch]);

  if (!success) return null;

  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <div className="flex items-start gap-2">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Operation completed successfully!</span>
      </div>
      <button onClick={() => dispatch(clearSuccess())} className="text-emerald-500 hover:text-emerald-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Confirm Dialog ─────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="mb-4 text-sm text-stone-600">{message}</p>
        <div className="flex justify-end gap-2">
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Document helpers ──────────────────────────────────────────────────────

const documentStatusColor = (status: DocumentStatus): string => {
  const map: Record<DocumentStatus, string> = {
    draft: 'bg-stone-100 text-stone-600 ring-stone-200',
    pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
    returned: 'bg-orange-50 text-orange-700 ring-orange-200',
  };
  return map[status] || 'bg-stone-100 text-stone-600 ring-stone-200';
};

const documentFormatIcon = (format: DocumentFormat) => {
  if (format === 'xlsx') return <FileSpreadsheet size={16} className="text-emerald-600" />;
  if (format === 'docx') return <FileText size={16} className="text-blue-600" />;
  return <FileText size={16} className="text-red-600" />;
};

// ─── Aide Detail Modal with Document Support ─────────────────────────────

interface AideDetailModalProps {
  aideId: string;
  onClose: () => void;
  onEdit: () => void;
}

function AideDetailModal({ aideId, onClose, onEdit }: AideDetailModalProps) {
  const dispatch = useAppDispatch();
  const aide = useAppSelector(selectSelectedAide);
  const loading = useAppSelector(selectAideDetailLoading);
  const allDocs = useAppSelector(selectAllHelpdeskDocuments);
  const documentsLoading = useAppSelector((state) => state.helpdeskDocuments.loading.fetch);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);

  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docs = allDocs.filter(
    (d) => d.entity_type === 'aide' && d.entity_id === aideId
  );

  useEffect(() => {
    dispatch(fetchAideRequestById(aideId));
    dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: aideId }));
  }, [dispatch, aideId]);

  useEffect(() => {
    if (showLinkPicker) {
      dispatch(fetchHelpdeskDocuments({ unlinked: true }));
    }
  }, [dispatch, showLinkPicker]);

  const handleAttachDocument = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const format: DocumentFormat | null =
      ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : ext === 'xlsx' ? 'xlsx' : null;
    if (!format) {
      toast.error('Please upload a PDF, Word (.docx), or Excel (.xlsx) file.');
      e.target.value = '';
      return;
    }

    try {
      await dispatch(
        uploadHelpdeskDocument({
          blob: file,
          filename: file.name,
          ref: `AIDE/${aideId.slice(0, 8)}`,
          subject: `Memo for ${aide?.judge_name || 'Aide Request'}`,
          entity_type: 'aide' as DocumentEntityType,
          entity_id: aideId,
          format,
        })
      ).unwrap();
      toast.success('Document attached successfully.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: aideId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to attach document.');
    } finally {
      e.target.value = '';
    }
  };

  const handleLinkExisting = async (docId: string) => {
    try {
      await dispatch(
        linkHelpdeskDocument({ id: docId, entity_type: 'aide' as DocumentEntityType, entity_id: aideId })
      ).unwrap();
      toast.success('Document linked successfully.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: aideId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  };

  const handleSendForApproval = async (docId: string) => {
    try {
      await dispatch(submitForApproval({ id: docId })).unwrap();
      toast.success('Document sent to the super admin for approval.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: aideId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit for approval.');
    }
  };

  if (loading || !aide) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
          <p className="text-sm text-stone-500">Loading aide request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-[#1a3d1c]">{aide.judge_name}</h3>
              <StatusBadge status={aide.status} />
            </div>
            <p className="text-sm text-stone-500 flex items-center gap-2 mt-1">
              <Hash size={14} />
              ID: {aide.id.slice(0, 8)}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Officer Name</p>
              <p className="mt-0.5 text-sm font-medium text-stone-800">{aide.officer_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Rank</p>
              <p className="mt-0.5">
                <RankBadge rank={aide.officer_rank} />
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Employment Number</p>
              <p className="mt-0.5 text-sm font-mono text-stone-800">{aide.employment_number}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Current Station</p>
              <p className="mt-0.5 text-sm text-stone-800">{aide.current_station}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Unit</p>
              <p className="mt-0.5">
                <UnitBadge unit={aide.current_unit} />
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Reporting Date</p>
              <p className="mt-0.5 text-sm text-stone-800">{formatAideDate(aide.reporting_date)}</p>
            </div>
            <div className="col-span-full">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Proposed Assignment</p>
              <p className="mt-0.5 text-sm text-stone-800">{aide.proposed_assignment}</p>
            </div>
            {aide.remarks && (
              <div className="col-span-full">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Remarks</p>
                <p className="mt-0.5 text-sm text-stone-600">{aide.remarks}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Created By</p>
              <p className="mt-0.5 text-sm text-stone-800">{aide.created_by_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Created At</p>
              <p className="mt-0.5 text-sm text-stone-500">{formatAideDateTime(aide.created_at)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Last Updated</p>
              <p className="mt-0.5 text-sm text-stone-500">{formatAideDateTime(aide.updated_at)}</p>
            </div>
          </div>

          {/* ─── Documents Section ─────────────────────────────────────────────── */}
          <div className="mt-6 border-t border-stone-200 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <FileText size={16} className="text-[#c9a84c]" />
                Supporting Documents ({docs.length})
              </h3>
              <div className="flex gap-2">
                <GhostButton
                  onClick={() => setShowLinkPicker((v) => !v)}
                  icon={<Paperclip size={14} />}
                >
                  Link Existing
                </GhostButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  onChange={handleAttachDocument}
                  className="hidden"
                  disabled={documentsUploading}
                />
                <GhostButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={documentsUploading}
                  icon={documentsUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                >
                  {documentsUploading ? 'Uploading…' : 'Attach Document'}
                </GhostButton>
              </div>
            </div>

            {showLinkPicker && (
              <div className="mt-2 rounded-lg border border-stone-200 bg-white p-2 max-h-48 overflow-y-auto">
                {unlinkedDocuments.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-stone-400 italic">No unlinked documents found.</p>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {unlinkedDocuments.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-2 px-2 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {documentFormatIcon(doc.format)}
                          <span className="truncate text-sm text-stone-700">{doc.subject}</span>
                          <span className="shrink-0 text-[11px] text-stone-400">{doc.ref}</span>
                        </div>
                        <GhostButton
                          onClick={() => handleLinkExisting(doc.id)}
                          disabled={isLinking}
                          icon={isLinking ? <Loader2 size={12} className="animate-spin" /> : undefined}
                        >
                          Attach
                        </GhostButton>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {documentsLoading && docs.length === 0 ? (
              <p className="mt-2 text-xs text-stone-400 italic">Loading documents…</p>
            ) : docs.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-400">
                No documents attached yet. Upload a document or link an existing one above.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200">
                {docs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {documentFormatIcon(doc.format)}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-800">{doc.subject}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${documentStatusColor(doc.status)}`}
                          >
                            {doc.status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-stone-400">{doc.ref}</span>
                          <span className="text-[11px] text-stone-400 uppercase">{doc.format}</span>
                        </div>
                        {doc.status === 'rejected' && doc.rejection_reason && (
                          <p className="mt-1 text-[11px] text-red-600">Reason: {doc.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink size={12} />
                        View
                      </a>
                      {doc.status === 'draft' && (
                        <GhostButton
                          onClick={() => handleSendForApproval(doc.id)}
                          disabled={!!documentActionLoading[doc.id]?.submitting}
                          icon={
                            documentActionLoading[doc.id]?.submitting ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )
                          }
                        >
                          {documentActionLoading[doc.id]?.submitting ? 'Sending…' : 'Send for Approval'}
                        </GhostButton>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <GoldButton icon={<Edit size={14} />} onClick={onEdit}>
            Edit Request
          </GoldButton>
        </div>
      </div>
    </div>
  );
}

// ─── Aide Form Modal ──────────────────────────────────────────────────────

interface AideFormModalProps {
  initialData?: AideFormData | null;
  editingId?: string | null;
  onClose: () => void;
  onSubmit: (data: AideFormData) => void;
  isSubmitting: boolean;
}

function AideFormModal({
  initialData,
  editingId,
  onClose,
  onSubmit,
  isSubmitting,
}: AideFormModalProps) {
  const [formData, setFormData] = useState<AideFormData>(() => ({
    judge_name: initialData?.judge_name || '',
    officer_rank: initialData?.officer_rank || 'Police Constable (PC)',
    officer_name: initialData?.officer_name || '',
    employment_number: initialData?.employment_number || '',
    current_station: initialData?.current_station || '',
    current_unit: initialData?.current_unit || 'KPS',
    proposed_assignment: initialData?.proposed_assignment || '',
    reporting_date: initialData?.reporting_date || '',
    remarks: initialData?.remarks || '',
  }));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submission - raw data:', formData);
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-[#1a3d1c]">
            {editingId ? 'Edit Aide Request' : 'New Aide Request'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Judge Name */}
            <div>
              <label className={labelClasses}>Judge Name *</label>
              <input
                type="text"
                name="judge_name"
                value={formData.judge_name}
                onChange={handleChange}
                placeholder="e.g., Hon. Justice John Doe"
                className={inputClasses}
                required
              />
            </div>

            {/* Officer Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Officer Rank *</label>
                <select
                  name="officer_rank"
                  value={formData.officer_rank}
                  onChange={handleChange}
                  className={inputClasses}
                  required
                >
                  {OFFICER_RANKS.map((rank) => (
                    <option key={rank} value={rank}>
                      {getOfficerRankLabel(rank)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClasses}>Officer Name *</label>
                <input
                  type="text"
                  name="officer_name"
                  value={formData.officer_name}
                  onChange={handleChange}
                  placeholder="e.g., John M. Doe"
                  className={inputClasses}
                  required
                />
              </div>
            </div>

            {/* Employment Number & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Employment/Service Number *</label>
                <input
                  type="text"
                  name="employment_number"
                  value={formData.employment_number}
                  onChange={handleChange}
                  placeholder="e.g., 12345"
                  className={inputClasses}
                  required
                />
              </div>
              <div>
                <label className={labelClasses}>Unit *</label>
                <select
                  name="current_unit"
                  value={formData.current_unit}
                  onChange={handleChange}
                  className={inputClasses}
                  required
                >
                  {UNIT_TYPES.map((unit) => (
                    <option key={unit} value={unit}>
                      {getUnitTypeLabel(unit)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Station */}
            <div>
              <label className={labelClasses}>Current Station *</label>
              <input
                type="text"
                name="current_station"
                value={formData.current_station}
                onChange={handleChange}
                placeholder="e.g., Nairobi Police Station"
                className={inputClasses}
                required
              />
            </div>

            {/* Proposed Assignment */}
            <div>
              <label className={labelClasses}>Proposed Assignment *</label>
              <textarea
                name="proposed_assignment"
                value={formData.proposed_assignment}
                onChange={handleChange}
                placeholder="Describe the proposed assignment..."
                rows={2}
                className={`${inputClasses} resize-none`}
                required
              />
            </div>

            {/* Reporting Date */}
            <div>
              <label className={labelClasses}>Reporting Date *</label>
              <input
                type="date"
                name="reporting_date"
                value={formData.reporting_date}
                onChange={handleChange}
                className={inputClasses}
                required
              />
            </div>

            {/* Remarks */}
            <div>
              <label className={labelClasses}>Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Additional remarks..."
                rows={2}
                className={`${inputClasses} resize-none`}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-stone-100 pt-4">
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <GoldButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingId ? (
                'Update Request'
              ) : (
                'Create Request'
              )}
            </GoldButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const HelpdeskAides: React.FC = () => {
  const dispatch = useAppDispatch();

  // ─── Selectors ─────────────────────────────────────────────────────────────
  const aides = useAppSelector(selectAllAides);
  const pagination = useAppSelector(selectAidePagination);
  const filters = useAppSelector(selectAideFilters);
  const loading = useAppSelector(selectAideListLoading);
  const total = useAppSelector(selectAideTotalCount);
  const inProgress = useAppSelector(selectAideInProgressCount);
  const attached = useAppSelector(selectAideAttachedCount);
  const rejected = useAppSelector(selectAideRejectedCount);

  // ─── Local State ──────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<AideFormData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAideRequests(filters));
    dispatch(fetchAideStats());
  }, [dispatch, filters]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleFilterChange = (key: keyof typeof filters, value: string | undefined) => {
    dispatch(setFilters({ [key]: value }));
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setFilters({ page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setFilters({ limit: newLimit, page: 1 }));
  };

  const handleView = (id: string) => {
    setSelectedId(id);
    setShowDetailModal(true);
  };

  const handleEdit = (id: string) => {
    const aide = aides.find((a) => a.id === id);
    if (aide) {
      setEditingId(id);
      setEditingData({
        judge_name: aide.judge_name,
        officer_rank: aide.officer_rank,
        officer_name: aide.officer_name,
        employment_number: aide.employment_number,
        current_station: aide.current_station,
        current_unit: aide.current_unit,
        proposed_assignment: aide.proposed_assignment,
        reporting_date: typeof aide.reporting_date === 'string' 
          ? aide.reporting_date.split('T')[0] 
          : aide.reporting_date.toISOString().split('T')[0],
        remarks: aide.remarks || '',
      });
      setShowCreateModal(true);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setEditingData(null);
    setShowCreateModal(true);
  };

  const handleSubmit = async (data: AideFormData) => {
    console.log('🚀 Submitting aide request with data:', data);
    
    // Validate required fields
    const requiredFields = ['judge_name', 'officer_rank', 'officer_name', 'employment_number', 'current_station', 'current_unit', 'proposed_assignment', 'reporting_date'] as const;
    const missingFields = requiredFields.filter(field => !data[field as keyof AideFormData]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure date is in YYYY-MM-DD format
      const formattedDate = data.reporting_date 
        ? new Date(data.reporting_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const payload = {
        judge_name: data.judge_name.trim(),
        officer_rank: data.officer_rank,
        officer_name: data.officer_name.trim(),
        employment_number: data.employment_number.trim(),
        current_station: data.current_station.trim(),
        current_unit: data.current_unit,
        proposed_assignment: data.proposed_assignment.trim(),
        reporting_date: formattedDate,
        remarks: data.remarks?.trim() || undefined,
      };

      console.log('📦 Final payload:', payload);

      if (editingId) {
        await dispatch(updateAideRequest({
          id: editingId,
          data: payload,
        })).unwrap();
        toast.success('Aide request updated successfully');
      } else {
        await dispatch(createAideRequest(payload)).unwrap();
        toast.success('Aide request created successfully');
      }
      setShowCreateModal(false);
      dispatch(fetchAideRequests(filters));
      dispatch(fetchAideStats());
    } catch (err) {
      console.error('❌ Submit error - full error:', err);
      
      type AxiosErrorResponse = {
        response?: {
          data?: {
            message?: string;
            error?: string;
            details?: ValidationError[];
          };
          status?: number;
        };
        message?: string;
      };

      const error = err as AxiosErrorResponse;
      
      // Check if we have validation details
      if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
        // Show all validation errors in a single toast
        const errorMessages = error.response.data.details
          .map((e: ValidationError) => {
            const fieldName = e.field.replace('body.', '').replace(/_/g, ' ');
            return `• ${fieldName}: ${e.message}`;
          })
          .join('\n');
        
        toast.error(
          <div className="whitespace-pre-line">
            <strong>Validation failed:</strong>
            {'\n' + errorMessages}
          </div>,
          {
            duration: 8000,
            style: {
              maxWidth: '500px',
              whiteSpace: 'pre-line',
            },
          }
        );
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error(error.message || 'Operation failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteAideRequest(deleteTarget)).unwrap();
      toast.success('Aide request deleted successfully');
      setDeleteTarget(null);
      dispatch(fetchAideRequests(filters));
      dispatch(fetchAideStats());
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading && aides.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c9a84c] border-t-transparent" />
          <p className="text-sm text-stone-500">Loading aide requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '10px',
            fontSize: '13px',
            background: '#fff',
            color: '#1c1917',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1a3d1c] flex items-center gap-2">
              <Shield size={24} className="text-[#c9a84c]" />
              Aide Requests
            </h1>
            <p className="mt-0.5 text-sm text-stone-500">
              Manage police officer aide requests for judges
            </p>
          </div>
          <GoldButton icon={<Plus size={16} />} onClick={handleCreate}>
            New Aide Request
          </GoldButton>
        </div>

        <ErrorBanner />
        <SuccessBanner />

        {/* Stats */}
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<FileText size={20} />}
            value={total}
            label="Total Requests"
            loading={loading}
          />
          <StatCard
            icon={<Clock size={20} className="text-blue-600" />}
            value={inProgress}
            label="In Progress"
            loading={loading}
          />
          <StatCard
            icon={<CheckCircle size={20} className="text-emerald-600" />}
            value={attached}
            label="Attached"
            loading={loading}
          />
          <StatCard
            icon={<XCircle size={20} className="text-red-600" />}
            value={rejected}
            label="Rejected"
            loading={loading}
          />
        </div>

        {/* Filter Bar */}
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <input
              type="text"
              placeholder="Search judge name..."
              value={filters.judge_name ?? ''}
              onChange={(e) => handleFilterChange('judge_name', e.target.value || undefined)}
              className={`${inputClasses} lg:col-span-1`}
            />
            <input
              type="text"
              placeholder="Search officer name..."
              value={filters.officer_name ?? ''}
              onChange={(e) => handleFilterChange('officer_name', e.target.value || undefined)}
              className={inputClasses}
            />
            <input
              type="text"
              placeholder="Search station..."
              value={filters.current_station ?? ''}
              onChange={(e) => handleFilterChange('current_station', e.target.value || undefined)}
              className={inputClasses}
            />
            <select
              value={filters.status ?? ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className={inputClasses}
            >
              <option value="">All Status</option>
              {AIDE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getAideStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleResetFilters}
              className="text-xs font-medium text-stone-500 underline decoration-dotted hover:text-stone-700"
            >
              Reset filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse border border-stone-200 text-sm">
              <thead>
                <tr className="bg-[#c9a84c]/10 border-b border-stone-200">
                  <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                    Judge
                  </th>
                  <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                    Officer
                  </th>
                  <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                    Rank
                  </th>
                  <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                    Station
                  </th>
                  <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                    Unit
                  </th>
                  <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                    Reporting Date
                  </th>
                  <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                    Status
                  </th>
                  <th className="border border-stone-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-stone-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {aides.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-stone-200 py-16 text-center text-sm text-stone-400">
                      No aide requests found
                    </td>
                  </tr>
                ) : (
                  aides.map((aide) => (
                    <tr key={aide.id} className="border-b border-stone-100 transition hover:bg-stone-50/60">
                      <td className="border border-stone-200 px-4 py-3 font-medium text-stone-900">
                        {aide.judge_name}
                      </td>
                      <td className="border border-stone-200 px-4 py-3 text-stone-600">
                        {aide.officer_name}
                      </td>
                      <td className="border border-stone-200 px-4 py-3">
                        <RankBadge rank={aide.officer_rank} />
                      </td>
                      <td className="border border-stone-200 px-4 py-3 text-stone-600">
                        {aide.current_station}
                      </td>
                      <td className="border border-stone-200 px-4 py-3">
                        <UnitBadge unit={aide.current_unit} />
                      </td>
                      <td className="border border-stone-200 px-4 py-3 text-stone-600">
                        {formatAideDate(aide.reporting_date)}
                      </td>
                      <td className="border border-stone-200 px-4 py-3">
                        <StatusBadge status={aide.status} />
                      </td>
                      <td className="border border-stone-200 px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleView(aide.id)}
                            className="rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(aide.id)}
                            className="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(aide.id)}
                            className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-stone-200 bg-stone-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-stone-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-1 text-xs text-stone-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <AideFormModal
          initialData={editingData}
          editingId={editingId}
          onClose={() => {
            setShowCreateModal(false);
            setEditingId(null);
            setEditingData(null);
          }}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedId && (
        <AideDetailModal
          aideId={selectedId}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedId(null);
            dispatch(clearSelectedItem());
          }}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedId);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Aide Request?"
          message="This action cannot be undone. The aide request will be permanently removed."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={false}
        />
      )}
    </div>
  );
};

export default HelpdeskAides;