// src/features/conference/pages/HelpdeskConference.tsx

import React, { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchConferences,
  deleteConference,
  submitConference,
  approveConference,
  returnConference,
  completeConference,
  cancelConference,
  setConferenceFilters,
  resetConferenceFilters,
  clearConferenceError,
  clearConferenceSuccess,
  selectAllConferences,
  selectConferenceListLoading,
  selectConferenceError,
  selectConferenceSuccess,
  selectConferenceFilters,
  selectConferencePagination,
  selectConferenceActionLoading,
  type ConferenceRequest,
} from '../../store/slices/conferenceSlice';
import {
  fetchHelpdeskDocuments,
  uploadHelpdeskDocument,
  updateDocumentFile,
  linkHelpdeskDocument,
  submitForApproval as submitDocumentForApproval,
  rejectDocument,
  returnDocument as returnHelpdeskDocument,
  selectAllHelpdeskDocuments,
  selectDocumentsFetchLoading,
  selectDocumentsUploading,
  selectDocumentActionLoading,
  selectUnlinkedHelpdeskDocuments,
  selectDocumentLinking,
  clearDocumentError,
  type DocumentFormat,
  type HelpdeskDocument,
  type DocumentStatus,
} from '../../store/slices/helpdeskDocumentsSlice';
import { selectCurrentUser } from '../../store/slices/userSlice';
import {
  getConferenceStatusLabel,
  getConferenceStatusColor,
  getConferenceStatusDotColor,
  formatConferenceDate,
  isConferenceEditable,
  canSubmitConference,
  canApproveConference,
  canCompleteConference,
  canCancelConference,
  canReturnConference,
  canDeleteConference,
  isConferenceOngoing,
  isConferenceUpcoming,
  isConferencePast,
  getConferenceDuration,
  getConferenceStatusOptions,
  type ConferenceStatus,
} from '../../types/conference.types';
import { stampPdfFromUrl } from '../../utils/pdfStamp';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  X,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarCheck,
  CalendarX,
  FileText,
  Paperclip,
  Upload,
  ExternalLink,
  Stamp,
  Download,
  ArrowLeft,
  FileSpreadsheet,
  Clock,
} from 'lucide-react';
import { ConferenceModal } from '../../components/modals/ConferenceModal';

// ─── UI Components ──────────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] transition-colors';

const GhostButton: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ children, icon, onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {icon}
    {children}
  </button>
);

const GoldButton: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'outline';
  size?: 'sm' | 'default';
}> = ({ children, icon, type = 'button', disabled, onClick, variant = 'default', size = 'default' }) => {
  const styles = {
    default: 'bg-[#c9a84c] text-[#1a3d1c] hover:bg-[#b8973f]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
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
};

const StatusBadge: React.FC<{ status: ConferenceStatus }> = ({ status }) => {
  const color = getConferenceStatusColor(status);
  const dotColor = getConferenceStatusDotColor(status);
  const label = getConferenceStatusLabel(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};

// ─── Status Filter Dropdown ──────────────────────────────────────────────────

const StatusFilterDropdown: React.FC<{
  value: ConferenceStatus | '';
  onChange: (value: ConferenceStatus | '') => void;
}> = ({ value, onChange }) => {
  const options = getConferenceStatusOptions();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ConferenceStatus | '')}
      className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
    >
      <option value="">All Statuses</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

// ─── Document Status Badge ───────────────────────────────────────────────────

const DocumentStatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: 'text-stone-600', bg: 'bg-stone-100' },
    pending_approval: { label: 'Pending Approval', color: 'text-amber-700', bg: 'bg-amber-50' },
    approved: { label: 'Approved ✓', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50' },
    returned: { label: 'Returned', color: 'text-blue-700', bg: 'bg-blue-50' },
  };
  const config = configs[status] || configs.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
};

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// ─── Document Viewer Modal ──────────────────────────────────────────────────

interface DocumentViewerModalProps {
  document: HelpdeskDocument;
  entityId: string;
  onClose: () => void;
  onActionComplete: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  entityId,
  onClose,
  onActionComplete,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);

  const [isStamping, setIsStamping] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const canDecide = document.status === 'pending_approval' || document.status === 'draft';
  const canSendToRequester = document.status === 'approved';

  const fetchSignatureBytes = async (): Promise<ArrayBuffer | undefined> => {
    if (!currentUser?.signature_url) {
      toast.error('No signature uploaded. Please upload your signature first.');
      return undefined;
    }
    try {
      const sigRes = await fetch(currentUser.signature_url);
      if (!sigRes.ok) {
        toast.error('Failed to fetch signature image. Please check your signature upload.');
        return undefined;
      }
      const arrayBuffer = await sigRes.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        toast.error('Signature image is empty. Please re-upload your signature.');
        return undefined;
      }
      return arrayBuffer;
    } catch (sigErr) {
      console.error('Signature fetch failed:', sigErr);
      toast.error('Failed to fetch signature image. Please check your signature upload.');
      return undefined;
    }
  };

  const handleApproveAndStamp = async () => {
    if (!currentUser?.signature_url) {
      toast.error('Please upload your signature first before approving documents.');
      return;
    }

    setIsStamping(true);
    try {
      const signatureImageBytes = await fetchSignatureBytes();
      if (!signatureImageBytes) return;

      const stampedBlob = await stampPdfFromUrl(document.file_url, {
        issuer: 'REGISTRAR HIGH COURT',
        approverName: currentUser?.full_name || 'Super Admin',
        signatureImageBytes,
      });

      const safeRef = document.ref.replace(/[\\/:*?"<>|]/g, '-');

      await dispatch(
        updateDocumentFile({
          id: document.id,
          blob: stampedBlob,
          filename: `stamped-${safeRef}.pdf`,
          status: 'approved',
          e_stamp_status: 'stamped',
          comments: 'Document approved and stamped.',
          approved_by: currentUser?.id,
          approved_by_name: currentUser?.full_name,
        })
      ).unwrap();

      await dispatch(approveConference({ id: entityId, data: { comments: 'Document reviewed, stamped, and approved.' } })).unwrap();

      toast.success('Document stamped and conference approved.');
      onActionComplete();
    } catch (err) {
      console.error('Approve & stamp failed:', err);
      toast.error(typeof err === 'string' ? err : 'Failed to approve and stamp the document.');
    } finally {
      setIsStamping(false);
    }
  };

  const handleRejectDocument = async () => {
    const reason = prompt('Please provide a reason for rejecting this document:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }

    try {
      await dispatch(rejectDocument({ id: document.id, reason: reason.trim() })).unwrap();
      await dispatch(returnConference({ id: entityId, data: { reason: reason.trim() } })).unwrap();
      toast.success('Document rejected and conference returned to requester.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to reject document.');
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for returning this document.');
      return;
    }
    try {
      await dispatch(returnHelpdeskDocument({
        id: document.id,
        comments: returnReason.trim(),
        instructions: returnReason.trim(),
      })).unwrap();

      await dispatch(returnConference({ id: entityId, data: { reason: returnReason.trim() } })).unwrap();

      toast.success('Document returned to the requester.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to return the document.');
    }
  };

  const handleDeliverToRequester = async () => {
    try {
      await dispatch(
        returnConference({ id: entityId, data: { reason: 'Approved and stamped. Document ready for collection.' } })
      ).unwrap();
      toast.success('Stamped document sent to the requester.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to send the document to the requester.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-semibold text-[#1a3d1c] truncate">
                {document.subject}
              </h2>
              <DocumentStatusBadge status={document.status} />
            </div>
            <p className="mt-1 text-xs text-stone-400 font-mono">
              Ref: {document.ref} • {document.format.toUpperCase()} • {new Date(document.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {/* Document Info */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Reference</p>
              <p className="mt-0.5 text-sm font-mono text-stone-800">{document.ref}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Format</p>
              <p className="mt-0.5 text-sm font-semibold text-stone-800 uppercase">{document.format}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Entity Type</p>
              <p className="mt-0.5 text-sm capitalize text-stone-800">{document.entity_type}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Uploaded On</p>
              <p className="mt-0.5 text-sm text-stone-800">
                {new Date(document.created_at).toLocaleString()}
              </p>
            </div>
            {document.approved_at && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Approved On</p>
                <p className="mt-0.5 text-sm text-stone-800">
                  {new Date(document.approved_at).toLocaleString()}
                </p>
              </div>
            )}
            {document.approved_by_name && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Approved By</p>
                <p className="mt-0.5 text-sm text-stone-800">{document.approved_by_name}</p>
              </div>
            )}
            {document.e_stamp_status === 'stamped' && (
              <div className="col-span-full">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">E-Stamp Status</p>
                <p className="mt-0.5 text-sm font-medium text-emerald-600 flex items-center gap-2">
                  <Stamp size={16} />
                  Stamped ✓
                </p>
              </div>
            )}
          </div>

          {/* E-Stamp Preview */}
          {document.e_stamp_url && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stamp size={20} className="text-emerald-600" />
                  <h4 className="text-sm font-semibold text-emerald-800">E-Stamp</h4>
                </div>
                <div className="flex gap-2">
                  <a
                    href={document.e_stamp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Eye size={14} />
                    View Stamp
                  </a>
                  <a
                    href={document.e_stamp_url}
                    download={`e-stamp-${document.ref}.png`}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <Download size={14} />
                    Download
                  </a>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 p-3 bg-white rounded border border-emerald-200">
                <img
                  src={document.e_stamp_url}
                  alt="E-Stamp"
                  className="max-h-16 w-auto object-contain"
                />
                <div className="text-xs text-stone-500">
                  <p className="font-mono">{document.ref}</p>
                  <p className="text-emerald-600">✓ Approved on {document.approved_at ? new Date(document.approved_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Download Stamped Document */}
          {canSendToRequester && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-800">Approved Document</h4>
                </div>
                <div className="flex gap-2">
                  <a
                    href={document.file_url}
                    download={`stamped-${document.ref}.${document.format}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Download size={16} />
                    Download
                  </a>
                  <GoldButton
                    variant="success"
                    onClick={handleDeliverToRequester}
                    icon={<Send size={16} />}
                  >
                    Send to Requester
                  </GoldButton>
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-600">
                This document has been approved. Send it back to the requester, or download it directly.
              </p>
            </div>
          )}

          {/* Decision Actions */}
          {canDecide && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <Clock size={16} />
                {document.status === 'draft' ? 'Ready for Review' : 'Pending Your Decision'}
              </h4>
              <p className="mt-1 text-xs text-amber-700">
                {document.status === 'draft'
                  ? 'This document is in draft state. Review and approve it with a registrar stamp, or return it for changes.'
                  : 'Approving will burn a blue registrar stamp into the PDF with your signature, upload the stamped version, and mark the conference approved. Returning sends the request back to the requester unstamped.'
                }
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <GoldButton
                  variant="success"
                  onClick={handleApproveAndStamp}
                  disabled={isStamping || showReturnForm}
                  icon={
                    isStamping ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Stamp size={14} />
                    )
                  }
                >
                  {isStamping ? 'Stamping…' : 'Approve & Stamp'}
                </GoldButton>
                <GoldButton
                  variant="warning"
                  onClick={handleRejectDocument}
                  disabled={isStamping || showReturnForm}
                  icon={<XCircle size={14} />}
                >
                  Reject
                </GoldButton>
                <GoldButton
                  variant="outline"
                  onClick={() => setShowReturnForm((v) => !v)}
                  disabled={isStamping}
                  icon={<ArrowLeft size={14} />}
                >
                  Return
                </GoldButton>
              </div>

              {showReturnForm && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Reason for returning this document to the requester…"
                    rows={3}
                    className={`${inputClasses} resize-none`}
                  />
                  <div className="flex gap-2">
                    <GoldButton
                      variant="danger"
                      size="sm"
                      onClick={handleReturn}
                      icon={<Send size={14} />}
                    >
                      Confirm Return
                    </GoldButton>
                    <GhostButton onClick={() => setShowReturnForm(false)}>
                      Cancel
                    </GhostButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Approval History */}
          {document.approval_history && document.approval_history.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <Clock size={16} className="text-stone-400" />
                Approval History
              </h3>
              <div className="mt-3 space-y-2">
                {document.approval_history.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="relative flex items-start gap-3 rounded-lg border border-stone-100 bg-white p-3"
                  >
                    {index < document.approval_history.length - 1 && (
                      <div className="absolute left-5 top-8 h-full w-0.5 bg-stone-200" />
                    )}
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-100">
                      {entry.action === 'submitted' && <Send size={14} className="text-amber-600" />}
                      {entry.action === 'approved' && <CheckCircle size={14} className="text-emerald-600" />}
                      {entry.action === 'rejected' && <XCircle size={14} className="text-red-600" />}
                      {entry.action === 'returned' && <ArrowLeft size={14} className="text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-stone-800">
                          {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                        </p>
                        <span className="text-xs text-stone-400">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        By: {entry.from_user_name}
                        {entry.to_user_name && ` → ${entry.to_user_name}`}
                      </p>
                      {entry.comments && (
                        <p className="mt-1 text-xs text-stone-600 bg-stone-50 rounded p-2">
                          {entry.comments}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 px-6 py-3">
          <div className="flex gap-2">
            <a
              href={document.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              <ExternalLink size={14} />
              View Document
            </a>
            <a
              href={document.file_url}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              <Download size={14} />
              Download
            </a>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Conference Detail Modal ─────────────────────────────────────────────────

interface ConferenceDetailModalProps {
  conference: ConferenceRequest;
  onClose: () => void;
  onEdit: () => void;
}

const ConferenceDetailModal: React.FC<ConferenceDetailModalProps> = ({
  conference,
  onClose,
  onEdit,
}) => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectConferenceFilters);
  const actionLoading = useAppSelector(selectConferenceActionLoading);
  const currentUser = useAppSelector(selectCurrentUser);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const allDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const documentsLoading = useAppSelector(selectDocumentsFetchLoading);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [selectedDocForView, setSelectedDocForView] = useState<HelpdeskDocument | null>(null);

  const refreshList = () => {
    dispatch(fetchConferences(filters));
  };

  useEffect(() => {
    dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: conference.id }));
  }, [dispatch, conference.id]);

  useEffect(() => {
    if (showLinkPicker) {
      dispatch(fetchHelpdeskDocuments({ unlinked: true }));
    }
  }, [dispatch, showLinkPicker]);

  useEffect(() => {
    return () => {
      dispatch(clearDocumentError());
    };
  }, [dispatch]);

  const linkedDocuments = allDocuments.filter(
    (d) => d.entity_type === 'conference' && d.entity_id === conference.id
  );

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

    setUploadingDocument(true);
    try {
      await dispatch(
        uploadHelpdeskDocument({
          blob: file,
          filename: file.name,
          ref: `CONF/${conference.id.slice(0, 8)}`,
          subject: `Conference Request ${conference.id.slice(0, 8)}`,
          entity_type: 'conference',
          entity_id: conference.id,
          format: format,
        })
      ).unwrap();
      toast.success('Document attached to this request.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: conference.id }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingDocument(false);
      e.target.value = '';
    }
  };

  const handleLinkExisting = async (documentId: string) => {
    try {
      await dispatch(
        linkHelpdeskDocument({
          id: documentId,
          entity_type: 'conference',
          entity_id: conference.id,
        })
      ).unwrap();
      toast.success('Document linked to this request.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: conference.id }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSendDocumentForApproval = async (documentId: string) => {
    try {
      await dispatch(submitDocumentForApproval({ id: documentId })).unwrap();
      toast.success('Document sent for approval.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: conference.id }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleViewDocument = (doc: HelpdeskDocument) => {
    setSelectedDocForView(doc);
    setShowDocViewer(true);
  };

  const handleCloseDocViewer = () => {
    setShowDocViewer(false);
    setSelectedDocForView(null);
  };

  const handleActionComplete = () => {
    handleCloseDocViewer();
    dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: conference.id }));
    refreshList();
  };

  // ─── Conference Action Handlers ──────────────────────────────────────────

  const handleSubmit = async () => {
    try {
      await dispatch(submitConference(conference.id)).unwrap();
      toast.success('Conference request submitted for approval');
      refreshList();
      onClose();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit');
    }
  };

  const handleApprove = async () => {
    const comments = window.prompt('Enter approval comments (optional):');
    if (comments === null) return;
    try {
      await dispatch(approveConference({ id: conference.id, data: { comments: comments || undefined } })).unwrap();
      toast.success('Conference request approved');
      refreshList();
      onClose();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to approve');
    }
  };

  const handleReturn = async () => {
    const reason = window.prompt('Enter reason for returning:');
    if (!reason || reason.trim() === '') return;
    try {
      await dispatch(returnConference({ id: conference.id, data: { reason: reason.trim() } })).unwrap();
      toast.success('Conference request returned');
      refreshList();
      onClose();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to return');
    }
  };

  const handleComplete = async () => {
    const feedback = window.prompt('Enter completion feedback (optional):');
    if (feedback === null) return;
    try {
      await dispatch(completeConference({ id: conference.id, data: { feedback: feedback || undefined } })).unwrap();
      toast.success('Conference marked as completed');
      refreshList();
      onClose();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to complete');
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Enter cancellation reason:');
    if (!reason || reason.trim() === '') return;
    try {
      await dispatch(cancelConference({ id: conference.id, data: { reason: reason.trim() } })).unwrap();
      toast.success('Conference cancelled');
      refreshList();
      onClose();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to cancel');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this conference request?')) return;
    try {
      await dispatch(deleteConference(conference.id)).unwrap();
      toast.success('Conference request deleted');
      refreshList();
      onClose();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete');
    }
  };

  const isLoading = actionLoading[`submit-${conference.id}`] ||
                   actionLoading[`approve-${conference.id}`] ||
                   actionLoading[`return-${conference.id}`] ||
                   actionLoading[`complete-${conference.id}`] ||
                   actionLoading[`cancel-${conference.id}`] ||
                   actionLoading[`delete-${conference.id}`];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-[#1a3d1c]">Conference Details</h3>
              <StatusBadge status={conference.status} />
            </div>
            <p className="text-sm text-stone-500 flex items-center gap-2 mt-1">
              #{conference.serial_number} • ID: {conference.id.slice(0, 8)}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {/* Status Bar */}
          <div className="flex items-center justify-between rounded-lg bg-stone-50 p-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={conference.status} />
              <span className="text-xs text-stone-400">#{conference.serial_number}</span>
            </div>
            <div className="text-xs text-stone-400">
              Created: {formatConferenceDate(conference.created_at)}
            </div>
          </div>

          {/* Details Grid */}
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Particulars</label>
            <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{conference.particulars}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Start Date</p>
              <p className="mt-0.5 text-sm text-stone-800">{formatConferenceDate(conference.start_date)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">End Date</p>
              <p className="mt-0.5 text-sm text-stone-800">{formatConferenceDate(conference.end_date)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Participants</p>
              <p className="mt-0.5 text-sm text-stone-800 flex items-center gap-2">
                <Users size={16} className="text-stone-400" />
                {conference.number_of_pax}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Created By</p>
              <p className="mt-0.5 text-sm text-stone-800">{conference.created_by_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Last Updated</p>
              <p className="mt-0.5 text-sm text-stone-500">{formatConferenceDate(conference.updated_at)}</p>
            </div>
          </div>

          {/* Supporting Documents */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <FileText size={16} className="text-[#c9a84c]" />
                Supporting Documents ({linkedDocuments.length})
              </h4>
              <div className="flex gap-2">
                <GhostButton
                  onClick={() => setShowLinkPicker((v) => !v)}
                  icon={<Paperclip size={14} />}
                >
                  Link Existing
                </GhostButton>
                <input
                  ref={documentFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  onChange={handleAttachDocument}
                  className="hidden"
                  disabled={documentsUploading || uploadingDocument}
                />
                <GhostButton
                  onClick={() => documentFileInputRef.current?.click()}
                  disabled={documentsUploading || uploadingDocument}
                  icon={documentsUploading || uploadingDocument ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                >
                  {documentsUploading || uploadingDocument ? 'Uploading…' : 'Attach Document'}
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

            {documentsLoading && linkedDocuments.length === 0 ? (
              <p className="mt-2 text-xs text-stone-400 italic">Checking for attached documents…</p>
            ) : linkedDocuments.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-400">
                No documents attached yet. Generate one from the memo step when editing this request, link an existing one, or attach a file here.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200">
                {linkedDocuments.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      {documentFormatIcon(doc.format)}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-800">{doc.subject}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${documentStatusColor(
                              doc.status
                            )}`}
                          >
                            {doc.status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-stone-400">{doc.ref}</span>
                        </div>
                        {doc.status === 'rejected' && doc.rejection_reason && (
                          <p className="mt-1 text-[11px] text-red-600">Reason: {doc.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="inline-flex items-center gap-1 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                        title="View Document"
                      >
                        <Eye size={14} />
                      </button>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink size={12} />
                        View
                      </a>
                      {doc.status === 'draft' && isSuperAdmin && (
                        <GhostButton
                          onClick={() => handleViewDocument(doc)}
                          icon={<Eye size={12} />}
                        >
                          Review & Decide
                        </GhostButton>
                      )}
                      {doc.status === 'draft' && !isSuperAdmin && (
                        <GhostButton
                          onClick={() => handleSendDocumentForApproval(doc.id)}
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
                      {doc.status === 'pending_approval' && (
                        <GhostButton
                          onClick={() => handleViewDocument(doc)}
                          icon={<Eye size={12} />}
                        >
                          Review & Decide
                        </GhostButton>
                      )}
                      {doc.status === 'approved' && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={12} />
                          Approved
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {isConferenceEditable(conference.status) && !isSuperAdmin && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                disabled={isLoading}
              >
                <Edit size={16} />
                Edit
              </button>
            )}

            {canSubmitConference(conference.status) && !isSuperAdmin && (
              <button
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
                disabled={isLoading}
              >
                <Send size={16} />
                Submit
              </button>
            )}

            {canApproveConference(conference.status) && isSuperAdmin && (
              <button
                onClick={handleApprove}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                disabled={isLoading}
              >
                <CheckCircle size={16} />
                Approve
              </button>
            )}

            {canReturnConference(conference.status) && isSuperAdmin && (
              <button
                onClick={handleReturn}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                disabled={isLoading}
              >
                <XCircle size={16} />
                Return
              </button>
            )}

            {canCompleteConference(conference.status) && (
              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                disabled={isLoading}
              >
                <CalendarCheck size={16} />
                Complete
              </button>
            )}

            {canCancelConference(conference.status) && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100"
                disabled={isLoading}
              >
                <CalendarX size={16} />
                Cancel
              </button>
            )}

            {canDeleteConference(conference.status) && !isSuperAdmin && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                disabled={isLoading}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Close
          </button>
        </div>
      </div>

      {showDocViewer && selectedDocForView && (
        <DocumentViewerModal
          document={selectedDocForView}
          entityId={conference.id}
          onClose={handleCloseDocViewer}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const SuperAdminConference: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // ─── Selectors ──────────────────────────────────────────────────────────────
  const conferences = useAppSelector(selectAllConferences);
  const loading = useAppSelector(selectConferenceListLoading);
  const error = useAppSelector(selectConferenceError);
  const success = useAppSelector(selectConferenceSuccess);
  const filters = useAppSelector(selectConferenceFilters);
  const pagination = useAppSelector(selectConferencePagination);
  const actionLoading = useAppSelector(selectConferenceActionLoading);

  // ─── Local State ────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConference, setSelectedConference] = useState<ConferenceRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchConferences(filters));
  }, [dispatch, filters]);

  // Handle success/error messages
  useEffect(() => {
    if (success) {
      dispatch(clearConferenceSuccess());
    }
    if (error) {
      toast.error(error);
      dispatch(clearConferenceError());
    }
  }, [success, error, dispatch]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  // Filter conferences client-side by search term (searching in particulars)
  const getFilteredConferences = useCallback(() => {
    if (!searchTerm.trim()) {
      return conferences;
    }
    const term = searchTerm.toLowerCase().trim();
    return conferences.filter(conf => 
      conf.particulars.toLowerCase().includes(term)
    );
  }, [conferences, searchTerm]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Search is handled client-side via getFilteredConferences
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleFilterChange = useCallback(
    (key: keyof typeof filters, value: string | number | undefined) => {
      dispatch(setConferenceFilters({ [key]: value, page: 1 }));
    },
    [dispatch]
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    dispatch(resetConferenceFilters());
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      dispatch(setConferenceFilters({ page: newPage }));
    }
  };

  const handleRefresh = () => {
    dispatch(fetchConferences(filters));
  };

  // ─── Modal Handlers ────────────────────────────────────────────────────────

  const handleCreate = () => {
    setEditingId(null);
    setShowModal(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleModalSuccess = () => {
    dispatch(fetchConferences(filters));
  };

  // ─── Action Handlers ───────────────────────────────────────────────────────

  const handleSubmitForApproval = async (id: string) => {
    if (!window.confirm('Submit this conference request for approval?')) return;
    try {
      await dispatch(submitConference(id)).unwrap();
      toast.success('Conference request submitted for approval');
      dispatch(fetchConferences(filters));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit');
    }
  };

  const handleApprove = async (id: string) => {
    const comments = window.prompt('Enter approval comments (optional):');
    if (comments === null) return;
    try {
      await dispatch(approveConference({ id, data: { comments: comments || undefined } })).unwrap();
      toast.success('Conference request approved');
      dispatch(fetchConferences(filters));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to approve');
    }
  };

  const handleReturn = async (id: string) => {
    const reason = window.prompt('Enter reason for returning:');
    if (!reason || reason.trim() === '') return;
    try {
      await dispatch(returnConference({ id, data: { reason: reason.trim() } })).unwrap();
      toast.success('Conference request returned');
      dispatch(fetchConferences(filters));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to return');
    }
  };

  const handleComplete = async (id: string) => {
    const feedback = window.prompt('Enter completion feedback (optional):');
    if (feedback === null) return;
    try {
      await dispatch(completeConference({ id, data: { feedback: feedback || undefined } })).unwrap();
      toast.success('Conference marked as completed');
      dispatch(fetchConferences(filters));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to complete');
    }
  };

  const handleCancel = async (id: string) => {
    const reason = window.prompt('Enter cancellation reason:');
    if (!reason || reason.trim() === '') return;
    try {
      await dispatch(cancelConference({ id, data: { reason: reason.trim() } })).unwrap();
      toast.success('Conference cancelled');
      dispatch(fetchConferences(filters));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to cancel');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this conference request?')) return;
    try {
      await dispatch(deleteConference(id)).unwrap();
      toast.success('Conference request deleted');
      dispatch(fetchConferences(filters));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete');
    }
  };

  const handleViewDetails = (conference: ConferenceRequest) => {
    setSelectedConference(conference);
    setShowDetailModal(true);
  };

  // ─── Render Helpers ────────────────────────────────────────────────────────

  const renderActionButtons = (conference: ConferenceRequest) => {
    const { id, status } = conference;
    const isLoading = actionLoading[`submit-${id}`] || 
                     actionLoading[`approve-${id}`] ||
                     actionLoading[`return-${id}`] ||
                     actionLoading[`complete-${id}`] ||
                     actionLoading[`cancel-${id}`] ||
                     actionLoading[`delete-${id}`];

    if (isLoading) {
      return <Loader2 size={16} className="animate-spin text-stone-400" />;
    }

    return (
      <div className="flex items-center gap-1">
        {/* View */}
        <button
          onClick={() => handleViewDetails(conference)}
          className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          title="View Details"
        >
          <Eye size={16} />
        </button>

        {/* Edit - Draft or Pending (only for non-Super Admin) */}
        {isConferenceEditable(status) && !isSuperAdmin && (
          <button
            onClick={() => handleEdit(id)}
            className="rounded p-1 text-blue-400 hover:bg-blue-50 hover:text-blue-600"
            title="Edit"
          >
            <Edit size={16} />
          </button>
        )}

        {/* Submit - Draft only (only for non-Super Admin) */}
        {canSubmitConference(status) && !isSuperAdmin && (
          <button
            onClick={() => handleSubmitForApproval(id)}
            className="rounded p-1 text-amber-400 hover:bg-amber-50 hover:text-amber-600"
            title="Submit for Approval"
          >
            <Send size={16} />
          </button>
        )}

        {/* Approve - Pending only (Super Admin only) */}
        {canApproveConference(status) && isSuperAdmin && (
          <button
            onClick={() => handleApprove(id)}
            className="rounded p-1 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
            title="Approve"
          >
            <CheckCircle size={16} />
          </button>
        )}

        {/* Return - Pending only (Super Admin only) */}
        {canReturnConference(status) && isSuperAdmin && (
          <button
            onClick={() => handleReturn(id)}
            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Return"
          >
            <XCircle size={16} />
          </button>
        )}

        {/* Complete - Approved only */}
        {canCompleteConference(status) && (
          <button
            onClick={() => handleComplete(id)}
            className="rounded p-1 text-blue-400 hover:bg-blue-50 hover:text-blue-600"
            title="Mark as Completed"
          >
            <CalendarCheck size={16} />
          </button>
        )}

        {/* Cancel - Draft, Pending, or Approved */}
        {canCancelConference(status) && (
          <button
            onClick={() => handleCancel(id)}
            className="rounded p-1 text-orange-400 hover:bg-orange-50 hover:text-orange-600"
            title="Cancel"
          >
            <CalendarX size={16} />
          </button>
        )}

        {/* Delete - Draft, Pending, or Rejected (only for non-Super Admin) */}
        {canDeleteConference(status) && !isSuperAdmin && (
          <button
            onClick={() => handleDelete(id)}
            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  };

  const renderStatusIndicator = (conference: ConferenceRequest) => {
    const { start_date, end_date, status } = conference;
    
    if (status === 'cancelled') {
      return <span className="text-xs text-stone-400">Cancelled</span>;
    }
    if (status === 'completed') {
      return <span className="text-xs text-blue-600">Completed</span>;
    }
    if (status === 'rejected') {
      return <span className="text-xs text-red-600">Rejected</span>;
    }
    if (status === 'approved') {
      if (isConferenceOngoing(start_date, end_date)) {
        return <span className="text-xs text-emerald-600 font-medium">Ongoing</span>;
      }
      if (isConferenceUpcoming(start_date)) {
        return <span className="text-xs text-amber-600 font-medium">Upcoming</span>;
      }
      if (isConferencePast(end_date)) {
        return <span className="text-xs text-stone-500">Past</span>;
      }
    }
    return null;
  };

  // Get filtered conferences based on search term
  const displayedConferences = getFilteredConferences();

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1a3d1c]">Conference Requests</h1>
            <p className="text-sm text-stone-500">
              Manage conference requests for judicial events and training
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
          >
            <Plus size={18} />
            New Request
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by particulars..."
              className="w-full rounded-md border border-stone-300 pl-9 pr-8 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              showFilters
                ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#1a3d1c]'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {Object.values(filters).some((v) => v !== undefined && v !== '' && v !== 1 && v !== 20) && (
              <span className="ml-1 rounded-full bg-[#c9a84c] px-1.5 py-0.5 text-[10px] font-bold text-[#1a3d1c]">
                !
              </span>
            )}
          </button>

          <button
            onClick={handleRefresh}
            className="rounded-md border border-stone-300 bg-white p-2 text-stone-600 hover:bg-stone-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
            <StatusFilterDropdown
              value={filters.status || ''}
              onChange={(value) => handleFilterChange('status', value || undefined)}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-stone-500">Sort:</span>
              <select
                value={filters.sort_by || 'serial_number'}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
              >
                <option value="serial_number">Serial Number</option>
                <option value="created_at">Created Date</option>
                <option value="updated_at">Updated Date</option>
                <option value="start_date">Start Date</option>
                <option value="end_date">End Date</option>
                <option value="status">Status</option>
              </select>
              <select
                value={filters.sort_order || 'DESC'}
                onChange={(e) => handleFilterChange('sort_order', e.target.value as 'ASC' | 'DESC')}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
              >
                <option value="DESC">Descending</option>
                <option value="ASC">Ascending</option>
              </select>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={32} className="animate-spin text-[#c9a84c]" />
          </div>
        ) : displayedConferences.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-stone-200 bg-white">
            <Calendar size={48} className="text-stone-300" />
            <p className="mt-4 text-sm text-stone-500">
              {searchTerm ? 'No conferences match your search' : 'No conference requests found'}
            </p>
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
            >
              <Plus size={16} />
              Create your first request
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Particulars
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Dates
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      PAX
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {displayedConferences.map((conference) => (
                    <tr key={conference.id} className="hover:bg-stone-50/50 transition">
                      <td className="px-4 py-3">
                        <span className="font-medium text-stone-600">
                          {conference.serial_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[300px]">
                          <p className="text-stone-800" title={conference.particulars}>
                            {conference.particulars.length > 100 
                              ? conference.particulars.substring(0, 100) + '...' 
                              : conference.particulars}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <p>{formatConferenceDate(conference.start_date)}</p>
                          <p className="text-stone-400">→ {formatConferenceDate(conference.end_date)}</p>
                          <p className="text-[10px] text-stone-400">
                            {getConferenceDuration(conference.start_date, conference.end_date)} days
                          </p>
                          {renderStatusIndicator(conference)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Users size={14} className="text-stone-400" />
                          <span>{conference.number_of_pax}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={conference.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          {renderActionButtons(conference)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
                <div className="text-xs text-stone-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="rounded border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-stone-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="rounded border border-stone-300 p-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ConferenceModal
        isOpen={showModal}
        onClose={handleModalClose}
        editingId={editingId}
        initialData={null}
        onSuccess={handleModalSuccess}
      />

      {/* Detail Modal */}
      {showDetailModal && selectedConference && (
        <ConferenceDetailModal
          conference={selectedConference}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedConference(null);
          }}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedConference.id);
          }}
        />
      )}
    </div>
  );
};

export default SuperAdminConference;