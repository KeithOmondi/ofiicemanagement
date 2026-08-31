// src/features/aide/HelpdeskAides.tsx

import React, { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchAideRequests,
  fetchAideRequestById,
  deleteAideRequest,
  fetchAideStats,
  setFilters as setAideFilters,
  resetFilters as resetAideFilters,
  clearSelectedItem as clearSelectedAide,
  clearError as clearAideError,
  clearSuccess as clearAideSuccess,
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
  approveAideRequest,
  returnAideRequest,
  type AideStatus,
} from '../../store/slices/aidesSlice';
import {
  fetchSentryRequests,
  fetchSentryRequestById,
  deleteSentryRequest,
  fetchSentryStats,
  setSentryFilters,
  resetSentryFilters,
  clearSelectedSentryItem,
  clearSentryError,
  clearSentrySuccess,
  selectAllSentryRequests,
  selectSelectedSentry,
  selectSentryPagination,
  selectSentryFilters,
  selectSentryListLoading,
  selectSentryDetailLoading,
  selectSentryError,
  selectSentrySuccess,
  selectSentryTotalCount,
  selectSentryActiveCount,
  selectSentryResolvedCount,
  selectSentryRejectedCount,
  selectSentryPendingCount,
  approveSentryRequest,
  returnSentryRequest,
  type SentryStatus,
} from '../../store/slices/sentrySlice';
import {
  AIDE_STATUSES,
  SENTRY_STATUSES,
  getAideStatusLabel,
  getAideStatusColor,
  getAideStatusDotColor,
  getSentryStatusLabel,
  getSentryStatusColor,
  getSentryStatusDotColor,
  getOfficerRankLabel,
  getOfficerRankColor,
  getUnitTypeLabel,
  getUnitTypeColor,
  formatAideDate,
  formatAideDateTime,
  type OfficerRank,
  type UnitType,
} from '../../types/aide.types';
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
  //type DocumentEntityType,
  type HelpdeskDocument,
  type DocumentStatus,
} from '../../store/slices/helpdeskDocumentsSlice';
import {
  selectCurrentUser,
  fetchCurrentUser,
} from '../../store/slices/userSlice';
import toast, { Toaster } from 'react-hot-toast';
import {
  Plus,
  X,
  Loader2,
  Eye,
  Edit,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Hash,
  Home,
  User,
  MapPin,
  Paperclip,
  Upload,
  ExternalLink,
  Send,
  FileSpreadsheet,
  Stamp,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { SentryModal } from '../../components/modals/SentryModal';
import { AidesModal } from '../../components/modals/AidesModal';
import { stampPdfFromUrl } from '../../utils/pdfStamp';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AideFormData {
  judge_name: string;
  judge_location: string;
  officer_rank: OfficerRank;
  officer_name: string;
  employment_number: string;
  current_station: string;
  current_unit: UnitType;
  proposed_assignment: string;
  reporting_date?: string;
  remarks: string;
}

interface SentryFormData {
  judge_name: string;
  residence_location: string;
  remarks: string;
}

// ─── UI Components ───────────────────────────────────────────────────────────

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
  variant?: 'default' | 'danger' | 'success' | 'outline' | 'warning';
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

const StatusBadge: React.FC<{ status: AideStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getAideStatusColor(status)}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${getAideStatusDotColor(status)}`} />
    {getAideStatusLabel(status)}
  </span>
);

const SentryStatusBadge: React.FC<{ status: SentryStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getSentryStatusColor(status)}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${getSentryStatusDotColor(status)}`} />
    {getSentryStatusLabel(status)}
  </span>
);

const RankBadge: React.FC<{ rank: OfficerRank }> = ({ rank }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getOfficerRankColor(rank)}`}
  >
    {getOfficerRankLabel(rank)}
  </span>
);

const UnitBadge: React.FC<{ unit: UnitType }> = ({ unit }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getUnitTypeColor(unit)}`}
  >
    {getUnitTypeLabel(unit)}
  </span>
);

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  loading?: boolean;
}> = ({ icon, value, label, loading }) => (
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

const ErrorBanner: React.FC<{ error: string | null; onClear: () => void }> = ({ error, onClear }) => {
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
      <button onClick={onClear} className="text-red-500 hover:text-red-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
};

const SuccessBanner: React.FC<{ success: boolean; onClear: () => void }> = ({ success, onClear }) => {
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      onClear();
    }, 3000);
    return () => clearTimeout(timer);
  }, [success, onClear]);

  if (!success) return null;

  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <div className="flex items-start gap-2">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Operation completed successfully!</span>
      </div>
      <button onClick={onClear} className="text-emerald-500 hover:text-emerald-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
};

// ─── Document Status Badge ───────────────────────────────────────────────────

// ── Document Status Badge ───────────────────────────────────────────────────

interface DocumentStatusBadgeProps {
  status: 'draft' | 'pending_approval' | 'ready_to_send' | 'approved' | 'rejected' | 'returned';
}

const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({ status }) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: 'text-stone-600', bg: 'bg-stone-100' },
    pending_approval: { label: 'Pending Approval', color: 'text-amber-700', bg: 'bg-amber-50' },
    ready_to_send: { label: 'Ready to Send', color: 'text-blue-700', bg: 'bg-blue-50' },
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

// ─── Document Viewer Modal ──────────────────────────────────────────────────

interface DocumentViewerModalProps {
  document: HelpdeskDocument;
  entityId: string;
  entityType: 'aide' | 'sentry';
  onClose: () => void;
  onActionComplete: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  entityId,
  entityType,
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
      console.warn('No signature URL found for current user');
      toast.error('No signature uploaded. Please upload your signature first.');
      return undefined;
    }
    
    try {
      console.log('Fetching signature from:', currentUser.signature_url);
      const sigRes = await fetch(currentUser.signature_url);
      
      if (!sigRes.ok) {
        console.warn('Signature fetch returned non-OK status:', sigRes.status);
        toast.error('Failed to fetch signature image. Please check your signature upload.');
        return undefined;
      }
      
      const arrayBuffer = await sigRes.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.warn('Signature array buffer is empty');
        toast.error('Signature image is empty. Please re-upload your signature.');
        return undefined;
      }
      
      console.log('Signature fetched successfully, size:', arrayBuffer.byteLength);
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
      
      if (!signatureImageBytes) {
        return;
      }

      console.log('Stamping PDF with signature...');
      const stampedBlob = await stampPdfFromUrl(document.file_url, {
        issuer: 'REGISTRAR HIGH COURT',
        approverName: currentUser?.full_name || 'Super Admin',
        signatureImageBytes,
      });

      const safeRef = document.ref.replace(/[\\/:*?"<>|]/g, '-');

      console.log('Updating existing document with stamped version...');
      // ✅ UPDATE the existing document instead of creating a new one
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

      console.log(`Approving ${entityType}...`);
      if (entityType === 'aide') {
        await dispatch(approveAideRequest({ id: entityId, comments: 'Document reviewed, stamped, and approved.' })).unwrap();
      } else {
        await dispatch(approveSentryRequest({ id: entityId, comments: 'Document reviewed, stamped, and approved.' })).unwrap();
      }

      toast.success('Document stamped and request approved.');
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
      
      if (entityType === 'aide') {
        await dispatch(returnAideRequest({ id: entityId, reason: reason.trim() })).unwrap();
      } else {
        await dispatch(returnSentryRequest({ id: entityId, reason: reason.trim() })).unwrap();
      }
      
      toast.success('Document rejected and request returned to requester.');
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
      
      if (entityType === 'aide') {
        await dispatch(returnAideRequest({ id: entityId, reason: returnReason.trim() })).unwrap();
      } else {
        await dispatch(returnSentryRequest({ id: entityId, reason: returnReason.trim() })).unwrap();
      }
      
      toast.success('Document returned to the requester.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to return the document.');
    }
  };

  const handleDeliverToRequester = async () => {
    try {
      if (entityType === 'aide') {
        await dispatch(
          returnAideRequest({ id: entityId, reason: 'Approved and stamped. Document ready for collection.' })
        ).unwrap();
      } else {
        await dispatch(
          returnSentryRequest({ id: entityId, reason: 'Approved and stamped. Document ready for collection.' })
        ).unwrap();
      }
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
                  : 'Approving will burn a blue registrar stamp into the PDF with your signature, upload the stamped version, and mark the request approved. Returning sends the request back to the requester unstamped.'
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

// ─── Document helpers ──────────────────────────────────────────────────────

const documentStatusColor = (status: DocumentStatus): string => {
  const map: Record<DocumentStatus, string> = {
    draft: 'bg-stone-100 text-stone-600 ring-stone-200',
    pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
    ready_to_send: 'bg-blue-50 text-blue-700 ring-blue-200',
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

// ─── Confirm Dialog ─────────────────────────────────────────────────────────

const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}> = ({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }) => (
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

// ─── Aide Detail Modal ─────────────────────────────────────────────────────

interface AideDetailModalProps {
  aideId: string;
  onClose: () => void;
  onEdit: () => void;
}

const AideDetailModal: React.FC<AideDetailModalProps> = ({ aideId, onClose, onEdit }) => {
  const dispatch = useAppDispatch();
  const aide = useAppSelector(selectSelectedAide);
  const loading = useAppSelector(selectAideDetailLoading);
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

  useEffect(() => {
    if (!currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    dispatch(fetchAideRequestById(aideId));
  }, [dispatch, aideId]);

  useEffect(() => {
    dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: aideId }));
  }, [dispatch, aideId]);

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
    (d) => d.entity_type === 'aide' && d.entity_id === aideId
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
          ref: `AIDE/${aideId.slice(0, 8)}`,
          subject: `Memo for ${aide?.judge_name || 'Aide Request'}`,
          entity_type: 'aide',
          entity_id: aideId,
          format: format,
        })
      ).unwrap();
      toast.success('Document attached to this request.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: aideId }));
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
          entity_type: 'aide',
          entity_id: aideId,
        })
      ).unwrap();
      toast.success('Document linked to this request.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: aideId }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSendDocumentForApproval = async (documentId: string) => {
    try {
      await dispatch(submitDocumentForApproval({ id: documentId })).unwrap();
      toast.success('Document sent for approval.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: aideId }));
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
    dispatch(fetchAideRequestById(aideId));
    dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: aideId }));
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

          {/* Supporting Documents - with approval actions based on role */}
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
                          {doc.rank && (
                            <span className="text-[11px] text-stone-400">Rank: {doc.rank}</span>
                          )}
                          {doc.reporting_date && (
                            <span className="text-[11px] text-stone-400">Reporting: {new Date(doc.reporting_date).toLocaleDateString()}</span>
                          )}
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
                      {/* Super Admin sees Review & Decide on draft documents */}
                      {doc.status === 'draft' && isSuperAdmin && (
                        <GhostButton
                          onClick={() => handleViewDocument(doc)}
                          icon={<Eye size={12} />}
                        >
                          Review & Decide
                        </GhostButton>
                      )}
                      {/* Non-Super Admin sees Send for Approval on draft documents */}
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
                      {/* Everyone sees Review & Decide on pending_approval */}
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

        <div className="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          {!isSuperAdmin && (
            <GoldButton icon={<Edit size={14} />} onClick={onEdit}>
              Edit Request
            </GoldButton>
          )}
        </div>
      </div>

      {showDocViewer && selectedDocForView && (
        <DocumentViewerModal
          document={selectedDocForView}
          entityId={aideId}
          entityType="aide"
          onClose={handleCloseDocViewer}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
};

// ─── Sentry Detail Modal ────────────────────────────────────────────────────

interface SentryDetailModalProps {
  sentryId: string;
  onClose: () => void;
  onEdit: () => void;
}

const SentryDetailModal: React.FC<SentryDetailModalProps> = ({ sentryId, onClose, onEdit }) => {
  const dispatch = useAppDispatch();
  const sentry = useAppSelector(selectSelectedSentry);
  const loading = useAppSelector(selectSentryDetailLoading);
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

  useEffect(() => {
    if (!currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    if (sentryId) {
      dispatch(fetchSentryRequestById(sentryId));
    }
  }, [dispatch, sentryId]);

  useEffect(() => {
    dispatch(fetchHelpdeskDocuments({ entity_type: 'sentry', entity_id: sentryId }));
  }, [dispatch, sentryId]);

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
    (d) => d.entity_type === 'sentry' && d.entity_id === sentryId
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
          ref: `SENTRY/${sentryId.slice(0, 8)}`,
          subject: `Sentry for ${sentry?.judge_name || 'Sentry Request'}`,
          entity_type: 'sentry',
          entity_id: sentryId,
          format: format,
        })
      ).unwrap();
      toast.success('Document attached to this request.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'sentry', entity_id: sentryId }));
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
          entity_type: 'sentry',
          entity_id: sentryId,
        })
      ).unwrap();
      toast.success('Document linked to this request.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: 'sentry', entity_id: sentryId }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSendDocumentForApproval = async (documentId: string) => {
    try {
      await dispatch(submitDocumentForApproval({ id: documentId })).unwrap();
      toast.success('Document sent for approval.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'sentry', entity_id: sentryId }));
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
    dispatch(fetchSentryRequestById(sentryId));
    dispatch(fetchHelpdeskDocuments({ entity_type: 'sentry', entity_id: sentryId }));
  };

  if (loading || !sentry) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
          <p className="text-sm text-stone-500">Loading sentry request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-[#1a3d1c]">{sentry.judge_name}</h3>
              <SentryStatusBadge status={sentry.status} />
            </div>
            <p className="text-sm text-stone-500 flex items-center gap-2 mt-1">
              <Hash size={14} />
              ID: {sentry.id.slice(0, 8)}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="col-span-full">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Judge Name</p>
              <p className="mt-0.5 text-sm font-medium text-stone-800">{sentry.judge_name}</p>
            </div>
            <div className="col-span-full">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Residence Location</p>
              <p className="mt-0.5 text-sm text-stone-800">{sentry.residence_location}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Status</p>
              <p className="mt-0.5">
                <SentryStatusBadge status={sentry.status} />
              </p>
            </div>
            {sentry.remarks && (
              <div className="col-span-full">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Remarks</p>
                <p className="mt-0.5 text-sm text-stone-600">{sentry.remarks}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Created By</p>
              <p className="mt-0.5 text-sm text-stone-800">{sentry.created_by_name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Created At</p>
              <p className="mt-0.5 text-sm text-stone-500">{formatAideDateTime(sentry.created_at)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Last Updated</p>
              <p className="mt-0.5 text-sm text-stone-500">{formatAideDateTime(sentry.updated_at)}</p>
            </div>
          </div>

          {/* Supporting Documents - with approval actions based on role */}
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
                No documents attached yet. Link an existing one or attach a file here.
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
                      {/* Super Admin sees Review & Decide on draft documents */}
                      {doc.status === 'draft' && isSuperAdmin && (
                        <GhostButton
                          onClick={() => handleViewDocument(doc)}
                          icon={<Eye size={12} />}
                        >
                          Review & Decide
                        </GhostButton>
                      )}
                      {/* Non-Super Admin sees Send for Approval on draft documents */}
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
                      {/* Everyone sees Review & Decide on pending_approval */}
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

        <div className="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          {!isSuperAdmin && (
            <GoldButton icon={<Edit size={14} />} onClick={onEdit}>
              Edit Request
            </GoldButton>
          )}
        </div>
      </div>

      {showDocViewer && selectedDocForView && (
        <DocumentViewerModal
          document={selectedDocForView}
          entityId={sentryId}
          entityType="sentry"
          onClose={handleCloseDocViewer}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
};

// ─── Sentry Tab Component ──────────────────────────────────────────────────

const SentryTab: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const sentries = useAppSelector(selectAllSentryRequests);
  const pagination = useAppSelector(selectSentryPagination);
  const filters = useAppSelector(selectSentryFilters);
  const loading = useAppSelector(selectSentryListLoading);
  const total = useAppSelector(selectSentryTotalCount);
  const pending = useAppSelector(selectSentryPendingCount);
  const active = useAppSelector(selectSentryActiveCount);
  const resolved = useAppSelector(selectSentryResolvedCount);
  const rejected = useAppSelector(selectSentryRejectedCount);
  const error = useAppSelector(selectSentryError);
  const success = useAppSelector(selectSentrySuccess);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<SentryFormData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchSentryRequests(filters));
    dispatch(fetchSentryStats());
  }, [dispatch, filters]);

  const handleFilterChange = useCallback((key: keyof typeof filters, value: string | undefined) => {
    dispatch(setSentryFilters({ [key]: value }));
  }, [dispatch]);

  const handleResetFilters = useCallback(() => {
    dispatch(resetSentryFilters());
  }, [dispatch]);

  const handlePageChange = useCallback((newPage: number) => {
    dispatch(setSentryFilters({ page: newPage }));
  }, [dispatch]);

  const handleLimitChange = useCallback((newLimit: number) => {
    dispatch(setSentryFilters({ limit: newLimit, page: 1 }));
  }, [dispatch]);

  const handleView = useCallback((id: string) => {
    setSelectedId(id);
    setShowDetailModal(true);
  }, []);

  const handleEdit = useCallback((id: string) => {
    const sentry = sentries.find((s) => s.id === id);
    if (sentry) {
      setEditingId(id);
      setEditingData({
        judge_name: sentry.judge_name,
        residence_location: sentry.residence_location,
        remarks: sentry.remarks || '',
      });
      setShowCreateModal(true);
    }
  }, [sentries]);

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setEditingData(null);
    setShowCreateModal(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteSentryRequest(deleteTarget)).unwrap();
      toast.success('Sentry request deleted successfully');
      setDeleteTarget(null);
      dispatch(fetchSentryRequests(filters));
      dispatch(fetchSentryStats());
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete');
    }
  }, [dispatch, deleteTarget, filters]);

  if (loading && sentries.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c9a84c] border-t-transparent" />
          <p className="text-sm text-stone-500">Loading sentry requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} onClear={() => dispatch(clearSentryError())} />
      <SuccessBanner success={success} onClear={() => dispatch(clearSentrySuccess())} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={<Shield size={20} />} value={total} label="Total Requests" loading={loading} />
        <StatCard icon={<Clock size={20} className="text-amber-600" />} value={pending} label="Pending" loading={loading} />
        <StatCard icon={<CheckCircle size={20} className="text-emerald-600" />} value={active} label="Active" loading={loading} />
        <StatCard icon={<Home size={20} className="text-blue-600" />} value={resolved} label="Resolved" loading={loading} />
        <StatCard icon={<XCircle size={20} className="text-red-600" />} value={rejected} label="Rejected" loading={loading} />
      </div>

      {/* Only show Create button for non-Super Admins */}
      {!isSuperAdmin && (
        <div className="flex justify-end">
          <GoldButton icon={<Plus size={16} />} onClick={handleCreate}>
            New Sentry Request
          </GoldButton>
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <input
            type="text"
            placeholder="Search judge name..."
            value={filters.judge_name ?? ''}
            onChange={(e) => handleFilterChange('judge_name', e.target.value || undefined)}
            className={inputClasses}
          />
          <input
            type="text"
            placeholder="Search location..."
            value={filters.residence_location ?? ''}
            onChange={(e) => handleFilterChange('residence_location', e.target.value || undefined)}
            className={inputClasses}
          />
          <select
            value={filters.status ?? ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className={inputClasses}
          >
            <option value="">All Status</option>
            {SENTRY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getSentryStatusLabel(status)}
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

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse border border-stone-200 text-sm">
            <thead>
              <tr className="bg-[#c9a84c]/10 border-b border-stone-200">
                <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                  <div className="flex items-center gap-2"><User size={14} /> Judge</div>
                </th>
                <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                  <div className="flex items-center gap-2"><Home size={14} /> Residence Location</div>
                </th>
                <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">
                  <div className="flex items-center gap-2"><MapPin size={14} /> Status</div>
                </th>
                <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Remarks</th>
                <th className="border border-stone-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-stone-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sentries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-stone-200 py-16 text-center text-sm text-stone-400">
                    No sentry requests found
                  </td>
                </tr>
              ) : (
                sentries.map((sentry) => (
                  <tr key={sentry.id} className="border-b border-stone-100 transition hover:bg-stone-50/60">
                    <td className="border border-stone-200 px-4 py-3 font-medium text-stone-900">{sentry.judge_name}</td>
                    <td className="border border-stone-200 px-4 py-3 text-stone-600">{sentry.residence_location}</td>
                    <td className="border border-stone-200 px-4 py-3"><SentryStatusBadge status={sentry.status} /></td>
                    <td className="border border-stone-200 px-4 py-3 text-stone-600 max-w-xs truncate">{sentry.remarks || '—'}</td>
                    <td className="border border-stone-200 px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleView(sentry.id)} className="rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800" title="View Details">
                          <Eye size={16} />
                        </button>
                        {!isSuperAdmin && (
                          <>
                            <button onClick={() => handleEdit(sentry.id)} className="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800" title="Edit">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => setDeleteTarget(sentry.id)} className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 hover:text-red-800" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
            <span className="px-1 text-xs text-stone-500">Page {pagination.page} of {pagination.totalPages}</span>
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

      {/* Only show Create Modal for non-Super Admins */}
      {showCreateModal && !isSuperAdmin && (
        <SentryModal
          key={editingId ?? 'new'}
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setEditingId(null); setEditingData(null); }}
          editingId={editingId}
          initialData={editingData}
          onSuccess={() => {
            dispatch(fetchSentryRequests(filters));
            dispatch(fetchSentryStats());
          }}
        />
      )}

      {showDetailModal && selectedId && (
        <SentryDetailModal
          sentryId={selectedId}
          onClose={() => { setShowDetailModal(false); setSelectedId(null); dispatch(clearSelectedSentryItem()); }}
          onEdit={() => { setShowDetailModal(false); handleEdit(selectedId); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Sentry Request?"
          message="This action cannot be undone. The sentry request will be permanently removed."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={false}
        />
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const HelpdeskAides: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const aides = useAppSelector(selectAllAides);
  const pagination = useAppSelector(selectAidePagination);
  const filters = useAppSelector(selectAideFilters);
  const loading = useAppSelector(selectAideListLoading);
  const total = useAppSelector(selectAideTotalCount);
  const inProgress = useAppSelector(selectAideInProgressCount);
  const attached = useAppSelector(selectAideAttachedCount);
  const rejected = useAppSelector(selectAideRejectedCount);
  const error = useAppSelector(selectAideError);
  const success = useAppSelector(selectAideSuccess);

  const [activeTab, setActiveTab] = useState<'aide' | 'sentry'>('aide');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<AideFormData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'aide') {
      dispatch(fetchAideRequests(filters));
      dispatch(fetchAideStats());
    }
  }, [dispatch, filters, activeTab]);

  const handleFilterChange = useCallback((key: keyof typeof filters, value: string | undefined) => {
    dispatch(setAideFilters({ [key]: value }));
  }, [dispatch]);

  const handleResetFilters = useCallback(() => {
    dispatch(resetAideFilters());
  }, [dispatch]);

  const handlePageChange = useCallback((newPage: number) => {
    dispatch(setAideFilters({ page: newPage }));
  }, [dispatch]);

  const handleLimitChange = useCallback((newLimit: number) => {
    dispatch(setAideFilters({ limit: newLimit, page: 1 }));
  }, [dispatch]);

  const handleView = useCallback((id: string) => {
    setSelectedId(id);
    setShowDetailModal(true);
  }, []);

  const handleEdit = useCallback((id: string) => {
    const aide = aides.find((a) => a.id === id);
    if (aide) {
      setEditingId(id);
      setEditingData({
        judge_name: aide.judge_name,
        judge_location: (aide as { judge_location?: string }).judge_location || '',
        officer_rank: aide.officer_rank,
        officer_name: aide.officer_name,
        employment_number: aide.employment_number,
        current_station: aide.current_station,
        current_unit: aide.current_unit,
        proposed_assignment: aide.proposed_assignment,
        reporting_date: aide.reporting_date 
          ? new Date(aide.reporting_date).toISOString().split('T')[0]
          : '',
        remarks: aide.remarks || '',
      });
      setShowCreateModal(true);
    }
  }, [aides]);

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setEditingData(null);
    setShowCreateModal(true);
  }, []);

  const handleDelete = useCallback(async () => {
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
  }, [dispatch, deleteTarget, filters]);

  if (loading && aides.length === 0 && activeTab === 'aide') {
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
          style: { borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#1c1917', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
          success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1a3d1c] flex items-center gap-2">
              <Shield size={24} className="text-[#c9a84c]" />
              Security & Personnel Management
            </h1>
            <p className="mt-0.5 text-sm text-stone-500">
              {isSuperAdmin 
                ? 'Review and approve police officer aide requests and sentry services' 
                : 'Manage police officer aide requests and sentry services'}
            </p>
          </div>
        </div>

        <ErrorBanner error={error} onClear={() => dispatch(clearAideError())} />
        <SuccessBanner success={success} onClear={() => dispatch(clearAideSuccess())} />

        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1">
          <button
            onClick={() => setActiveTab('aide')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'aide' ? 'bg-[#1a3d1c] text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <User size={16} />
            Aide Requests
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${activeTab === 'aide' ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-600'}`}>
              {total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('sentry')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'sentry' ? 'bg-[#1a3d1c] text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Home size={16} />
            Sentry Services
          </button>
        </div>

        {activeTab === 'aide' ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<FileText size={20} />} value={total} label="Total Requests" loading={loading} />
              <StatCard icon={<Clock size={20} className="text-blue-600" />} value={inProgress} label="In Progress" loading={loading} />
              <StatCard icon={<CheckCircle size={20} className="text-emerald-600" />} value={attached} label="Attached" loading={loading} />
              <StatCard icon={<XCircle size={20} className="text-red-600" />} value={rejected} label="Rejected" loading={loading} />
            </div>

            {/* Only show Create button for non-Super Admins */}
            {!isSuperAdmin && (
              <div className="mb-4 flex justify-end">
                <GoldButton icon={<Plus size={16} />} onClick={handleCreate}>New Aide Request</GoldButton>
              </div>
            )}

            <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <input
                  type="text"
                  placeholder="Search judge name..."
                  value={filters.judge_name ?? ''}
                  onChange={(e) => handleFilterChange('judge_name', e.target.value || undefined)}
                  className={inputClasses}
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
                    <option key={status} value={status}>{getAideStatusLabel(status)}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={handleResetFilters} className="text-xs font-medium text-stone-500 underline decoration-dotted hover:text-stone-700">
                  Reset filters
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse border border-stone-200 text-sm">
                  <thead>
                    <tr className="bg-[#c9a84c]/10 border-b border-stone-200">
                      <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Judge</th>
                      <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Officer</th>
                      <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Rank</th>
                      <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Station</th>
                      <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Unit</th>
                      <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Reporting Date</th>
                      <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Status</th>
                      <th className="border border-stone-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-stone-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aides.length === 0 ? (
                      <tr><td colSpan={8} className="border border-stone-200 py-16 text-center text-sm text-stone-400">No aide requests found</td></tr>
                    ) : (
                      aides.map((aide) => (
                        <tr key={aide.id} className="border-b border-stone-100 transition hover:bg-stone-50/60">
                          <td className="border border-stone-200 px-4 py-3 font-medium text-stone-900">{aide.judge_name}</td>
                          <td className="border border-stone-200 px-4 py-3 text-stone-600">{aide.officer_name}</td>
                          <td className="border border-stone-200 px-4 py-3"><RankBadge rank={aide.officer_rank} /></td>
                          <td className="border border-stone-200 px-4 py-3 text-stone-600">{aide.current_station}</td>
                          <td className="border border-stone-200 px-4 py-3"><UnitBadge unit={aide.current_unit} /></td>
                          <td className="border border-stone-200 px-4 py-3 text-stone-600">{formatAideDate(aide.reporting_date)}</td>
                          <td className="border border-stone-200 px-4 py-3"><StatusBadge status={aide.status} /></td>
                          <td className="border border-stone-200 px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleView(aide.id)} className="rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-800" title="View Details">
                                <Eye size={16} />
                              </button>
                              {!isSuperAdmin && (
                                <>
                                  <button onClick={() => handleEdit(aide.id)} className="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800" title="Edit">
                                    <Edit size={16} />
                                  </button>
                                  <button onClick={() => setDeleteTarget(aide.id)} className="rounded-lg p-1.5 text-red-600 transition hover:bg-red-50 hover:text-red-800" title="Delete">
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-stone-200 bg-stone-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-stone-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-2">
                  <select value={pagination.limit} onChange={(e) => handleLimitChange(Number(e.target.value))} className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none">
                    {[10, 20, 50, 100].map((size) => (<option key={size} value={size}>{size} / page</option>))}
                  </select>
                  <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
                  <span className="px-1 text-xs text-stone-500">Page {pagination.page} of {pagination.totalPages}</span>
                  <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <SentryTab />
        )}
      </div>

      {/* Only show Create Modal for non-Super Admins */}
      {showCreateModal && !isSuperAdmin && (
        <AidesModal
          key={editingId ?? 'new'}
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setEditingId(null); setEditingData(null); }}
          editingId={editingId}
          initialData={editingData}
          onSuccess={() => {
            dispatch(fetchAideRequests(filters));
            dispatch(fetchAideStats());
          }}
        />
      )}

      {showDetailModal && selectedId && (
        <AideDetailModal
          aideId={selectedId}
          onClose={() => { setShowDetailModal(false); setSelectedId(null); dispatch(clearSelectedAide()); }}
          onEdit={() => { setShowDetailModal(false); handleEdit(selectedId); }}
        />
      )}

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