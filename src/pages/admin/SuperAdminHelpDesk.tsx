// src/features/helpdesk/SuperAdminHelpdesk.tsx - UPDATED with utilitiesSlice

import React, { useState, useEffect, useRef, type ChangeEvent, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  // Actions
  fetchHelpDeskStats,
  fetchHelpDeskAudit,
  fetchClubMemberships,
  fetchCircuits,
  fetchOtherPayments,
  fetchBenches,
  fetchPartHeards,
  fetchServiceWeeks,
  fetchMedicalClaims,
  fetchGeneralRequests,
  fetchVisaRequests,
  fetchProtocolEvents,
  updateClubMembershipStatus,
  updateCircuitStatus,
  updateOtherPaymentStatus,
  updateBenchStatus,
  updatePartHeardStatus,
  updateServiceWeekStatus,
  updateMedicalClaimStatus,
  updateGeneralRequestStatus,
  updateVisaStatus,
  updateProtocolStatus,
  deleteClubMembership,
  deleteCircuit,
  deleteOtherPayment,
  deleteBench,
  deletePartHeard,
  deleteServiceWeek,
  deleteMedicalClaim,
  deleteGeneralRequest,
  deleteVisaRequest,
  deleteProtocolEvent,
  // Selectors from helpdeskSlice
  selectHelpDeskStats,
  selectAllClubMemberships,
  selectAllCircuits,
  selectAllOtherPayments,
  selectAllBenches,
  selectAllPartHeards,
  selectAllServiceWeeks,
  selectAllMedicalClaims,
  selectAllGeneralRequests,
  selectAllVisaRequests,
  selectAllProtocolEvents,
  selectStatsLoading,
  selectHelpDeskMutating,
  selectHelpDeskError,
  clearError,
  clearSuccess,
  setActiveTab,
  type Status,
  type HelpDeskTab,
  type PartHeard,
  type MedicalClaim,
  type GeneralRequest,
  type VisaRequest,
  type ProtocolEvent,
  type SpecialBench,
  type Circuit,
  type OtherPayment,
  type ServiceWeek,
  type ClubMembership,
  type UtilityStatus,
  type UtilityItem,
} from '../../store/slices/helpdeskSlice';

// ─── IMPORT FROM UTILITIES SLICE ──────────────────────────────────────────
import {
  fetchUtilities,
  deleteUtility,
  updateUtilityItem,
  selectAllUtilities as selectAllUtilitiesFromSlice,
  selectUtilitiesLoading,
  selectUtilitiesMutating,
  type JudgeUtility,
} from '../../store/slices/utilitiesSlice';

// ─── Helpdesk Documents imports ───────────────────────────────────────────
import {
  fetchHelpdeskDocuments,
  uploadHelpdeskDocument,
  updateDocumentFile,
  linkHelpdeskDocument,
  cancelInternalApproval,
  sendBackToRequester,
  internalRequestChanges,
  internalRejectDocument,
  internalApproveDocument,
  internalPreviewDocument,
  selectAllHelpdeskDocuments,
  selectDocumentsUploading,
  selectDocumentLinking,
  selectUnlinkedHelpdeskDocuments,
  type DocumentFormat,
  type DocumentStatus,
  type HelpdeskDocument,
  type InternalApprovalStatus,
  type RequesterVisibleStatus,
} from '../../store/slices/helpdeskDocumentsSlice';

// ─── User & Stamping ─────────────────────────────────────────────────────────
import {
  selectCurrentUser,
  fetchCurrentUser,
} from '../../store/slices/userSlice';

import {
  BarChart3,
  Clock3,
  Stamp,
  ShieldCheck,
  Plus,
  FileSpreadsheet,
  FileText,
  Wallet,
  Users,
  MapPin,
  Gavel,
  FileCheck,
  Plane,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Trash2,
  Edit,
  X,
  Eye,
  CreditCard,
  Stethoscope,
  Paperclip,
  Upload,
  ExternalLink,
  Send,
  Download,
  ArrowLeft,
  Clock,
  User,
  RefreshCw,
  Check,
  Info,
} from 'lucide-react';
import CircuitModal from '../../components/modals/CircuitModal';
import UtilitiesModal, { UtilitiesMemoModal } from '../../components/modals/UtilitiesModal';
import { ProtocolModal } from '../../components/modals/ProtocolModal';
import { VisaModal } from '../../components/modals/VisaModal';
import { RequestModal } from '../../components/modals/RequestModal';
import ClubModal from '../../components/Layout/ClubModal';
import { toast } from 'react-hot-toast';
import { stampPdfFromUrl } from '../../utils/pdfStamp';

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityType = 'circuit' | 'bench' | 'partHeard' | 'serviceWeek' | 'otherPayment' | 'utility_memo' | 'protocol' | 'visa' | 'generalRequest' | 'medicalClaim' | 'ticket' | 'aide' | 'sentry';

interface TabDef {
  key: HelpDeskTab | 'overview';
  label: string;
  icon: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(amount)) return 'KES 0.00';
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Signed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
    Awaiting: 'bg-stone-100 text-stone-700 border-stone-200',
    'Awaiting Documentation': 'bg-amber-50 text-amber-700 border-amber-200',
    'Awaiting Funding': 'bg-amber-50 text-amber-700 border-amber-200',
    'In Process': 'bg-blue-50 text-blue-700 border-blue-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Paid: 'bg-green-50 text-green-700 border-green-200',
    'Payment NA': 'bg-stone-100 text-stone-500 border-stone-200',
  };
  return map[status] ?? 'bg-stone-50 text-stone-600 border-stone-200';
};

const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'Signed':
    case 'Resolved':
    case 'Active':
    case 'Completed':
    case 'Approved':
    case 'Paid':
      return <CheckCircle className="h-3 w-3" />;
    case 'Pending':
    case 'In Progress':
    case 'Awaiting':
    case 'Awaiting Documentation':
    case 'Awaiting Funding':
    case 'In Process':
      return <ClockIcon className="h-3 w-3" />;
    case 'Rejected':
    case 'Payment NA':
      return <XCircle className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
};

const getStatusOptions = (): Status[] => {
  return ['Pending', 'Signed', 'Rejected', 'In Progress', 'Completed', 'Active', 'Resolved'];
};

// ─── Internal Approval Status Helpers ────────────────────────────────────────

const getInternalStatusLabel = (status: InternalApprovalStatus): string => {
  const map: Record<InternalApprovalStatus, string> = {
    pending: 'Pending Review',
    previewed: 'Previewed',
    approved_internal: 'Approved (Internal)',
    rejected_internal: 'Rejected (Internal)',
    changes_requested_internal: 'Changes Requested',
    changes_ready: 'Changes Ready',
  };
  return map[status] || status;
};

const getInternalStatusColor = (status: InternalApprovalStatus): string => {
  const map: Record<InternalApprovalStatus, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    previewed: 'bg-blue-50 text-blue-700 border-blue-200',
    approved_internal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected_internal: 'bg-red-50 text-red-700 border-red-200',
    changes_requested_internal: 'bg-orange-50 text-orange-700 border-orange-200',
    changes_ready: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return map[status] || 'bg-stone-50 text-stone-600 border-stone-200';
};

const getRequesterStatusLabel = (status: RequesterVisibleStatus): string => {
  const map: Record<RequesterVisibleStatus, string> = {
    pending_approval: 'Pending Approval',
    approved: 'Approved ✓',
    rejected: 'Rejected ✗',
    changes_requested: 'Changes Requested',
    in_revision: 'In Revision',
  };
  return map[status] || status;
};

const getRequesterStatusColor = (status: RequesterVisibleStatus): string => {
  const map: Record<RequesterVisibleStatus, string> = {
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    changes_requested: 'bg-orange-50 text-orange-700 border-orange-200',
    in_revision: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return map[status] || 'bg-stone-50 text-stone-600 border-stone-200';
};

// ─── Document helpers ─────────────────────────────────────────────────────────

const documentFormatIcon = (format: DocumentFormat) => {
  if (format === 'xlsx') return <FileSpreadsheet size={16} className="text-emerald-600" />;
  if (format === 'docx') return <FileText size={16} className="text-blue-600" />;
  return <FileText size={16} className="text-red-600" />;
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

// ─── UI Components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sub: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c9a84c]/15 text-[#1a3d1c]">
        {icon}
      </div>
      <div>
        {loading ? (
          <div className="h-7 w-16 animate-pulse rounded bg-stone-100" />
        ) : (
          <p className="text-xl font-semibold text-stone-900 leading-none">{value}</p>
        )}
        <p className="mt-1 text-sm font-medium text-stone-700">{label}</p>
        <p className="text-xs text-stone-400">{sub}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  action,
  children,
  loading,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1a3d1c]">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="py-8 text-center">
      <div className="flex justify-center mb-2">
        <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center">
          <FileText className="h-6 w-6 text-stone-300" />
        </div>
      </div>
      <p className="text-sm text-stone-400">{message || 'No records found.'}</p>
    </div>
  );
}

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
      className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

function GoldOutlineButton({
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
      className="inline-flex items-center gap-2 rounded-md bg-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-[#1a3d1c] hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
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
  variant?: 'default' | 'danger' | 'success' | 'outline' | 'warning' | 'info';
  size?: 'sm' | 'default';
}) {
  const styles = {
    default: 'bg-[#c9a84c] text-[#1a3d1c] hover:bg-[#b8973f]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
    info: 'bg-blue-600 text-white hover:bg-blue-700',
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

function ErrorBanner() {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectHelpDeskError);
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
  const success = useAppSelector((state) => state.helpdesk.success);

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

// ─── Modal Components ─────────────────────────────────────────────────────────

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

// ─── Status Dropdown ─────────────────────────────────────────────────────────

function StatusDropdown({
  status,
  onStatusChange,
  disabled,
}: {
  status: string;
  onStatusChange: (status: Status) => void;
  disabled?: boolean;
}) {
  const options = getStatusOptions();
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-stone-500">{getStatusIcon(status)}</span>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as Status)}
        disabled={disabled}
        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(status)} focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Reusable Table with Actions ────────────────────────────────────────────

interface TableWithActionsProps<T> {
  data: T[];
  loading: boolean;
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  renderRow: (item: T) => React.ReactNode;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  mutating: boolean;
  onView?: (item: T) => void;
  extraActions?: (item: T) => React.ReactNode;
}

function TableWithActions<T extends { id: string }>({
  data,
  loading,
  columns,
  renderRow,
  onEdit,
  onDelete,
  mutating,
  onView,
  extraActions,
}: TableWithActionsProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState message="No records found. Click 'Add' to create one." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 font-medium ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
              >
                {col.label}
              </th>
            ))}
            <th className="px-3 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-stone-50 transition-colors">
              {renderRow(item)}
              <td className="px-3 py-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  {onView && (
                    <button
                      onClick={() => onView(item)}
                      disabled={mutating}
                      className="rounded p-1 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                      title="View Details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(item)}
                    disabled={mutating}
                    className="rounded p-1 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    disabled={mutating}
                    className="rounded p-1 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {extraActions && extraActions(item)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Document Viewer Modal with Two-Step Approval ──────────────────────────

interface DocumentViewerModalProps {
  document: HelpdeskDocument;
  entityId: string;
  entityType: EntityType;
  onClose: () => void;
  onActionComplete: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  onClose,
  onActionComplete,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isInternalApproving = useAppSelector((state) => 
    state.helpdeskDocuments.actionLoading[document.id]?.internalApproving || false
  );
  const isInternalRejecting = useAppSelector((state) => 
    state.helpdeskDocuments.actionLoading[document.id]?.internalRejecting || false
  );
  const isRequestingChanges = useAppSelector((state) => 
    state.helpdeskDocuments.actionLoading[document.id]?.requestingChanges || false
  );
  const isPreviewing = useAppSelector((state) => 
    state.helpdeskDocuments.actionLoading[document.id]?.previewing || false
  );
  const isSendingBack = useAppSelector((state) => 
    state.helpdeskDocuments.actionLoading[document.id]?.sendingBack || false
  );

  const [isStamping, setIsStamping] = useState(false);
  const [showSendBackPreview, setShowSendBackPreview] = useState(false);
  const [sendBackStatus, setSendBackStatus] = useState<'approved' | 'rejected' | 'changes_requested'>('approved');
  const [sendBackMessage, setSendBackMessage] = useState('');

  // Determine what actions are available
  const canPreview = document.status === 'pending_approval' && 
    (document.internal_approval_status === 'pending' || document.internal_approval_status === 'changes_ready');

  const canMakeInternalDecision = document.status === 'pending_approval' && 
    (document.internal_approval_status === 'pending' || 
     document.internal_approval_status === 'previewed' || 
     document.internal_approval_status === 'changes_ready');

  const canSendBack = document.is_internal_approval_complete && !document.is_sent_back_to_requester;

  useEffect(() => {
    if (!currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser]);

  const handlePreview = async () => {
    try {
      await dispatch(internalPreviewDocument({
        id: document.id,
        previewed_by: currentUser?.id,
        previewed_by_name: currentUser?.full_name,
        comments: 'Document previewed by Super Admin',
      })).unwrap();
      toast.success('Document previewed successfully.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to preview document.');
    }
  };

  const handleInternalApprove = async () => {
    setIsStamping(true);
    try {
      let signatureImageBytes: ArrayBuffer | undefined;
      if (currentUser?.signature_url) {
        try {
          const sigRes = await fetch(currentUser.signature_url);
          if (sigRes.ok) {
            signatureImageBytes = await sigRes.arrayBuffer();
          }
        } catch (sigErr) {
          console.warn('Signature fetch failed:', sigErr);
        }
      }

      const stampedBlob = await stampPdfFromUrl(document.file_url, {
        issuer: 'REGISTRAR HIGH COURT',
        approverName: currentUser?.full_name || 'Super Admin',
        signatureImageBytes,
      });

      const safeRef = document.ref.replace(/[\\/:*?"<>|]/g, '-');

      // First, update the file with the stamped version
      await dispatch(
        updateDocumentFile({
          id: document.id,
          blob: stampedBlob,
          filename: `stamped-${safeRef}.pdf`,
          status: 'pending_approval',
          e_stamp_status: 'stamped',
          comments: 'Document stamped and approved internally.',
          approved_by: currentUser?.id,
        })
      ).unwrap();

      // Then, perform internal approval
      await dispatch(internalApproveDocument({
        id: document.id,
        action: 'approve',
        approved_by: currentUser?.id,
        approved_by_name: currentUser?.full_name,
        comments: 'Document approved internally. Send back to requester when ready.',
        generate_e_stamp: true,
      })).unwrap();

      toast.success('Document approved internally. Ready to send back to requester.');
      onActionComplete();
    } catch (err) {
      console.error('Internal approve failed:', err);
      toast.error(typeof err === 'string' ? err : 'Failed to approve document internally.');
    } finally {
      setIsStamping(false);
    }
  };

  const handleInternalReject = async () => {
    const reason = prompt('Please provide a reason for rejecting this document:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }

    try {
      await dispatch(internalRejectDocument({
        id: document.id,
        action: 'reject',
        rejection_reason: reason.trim(),
        comments: `Rejected internally: ${reason.trim()}`,
        approved_by: currentUser?.id,
        approved_by_name: currentUser?.full_name,
      })).unwrap();
      toast.success('Document rejected internally. Send back to requester when ready.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to reject document internally.');
    }
  };

  const handleInternalRequestChanges = async () => {
    const changes = prompt('Please list the changes requested (comma separated):');
    if (changes === null) return;
    if (!changes.trim()) {
      toast.error('At least one change request is required.');
      return;
    }

    const changesList = changes.split(',').map(c => c.trim()).filter(c => c.length > 0);
    if (changesList.length === 0) {
      toast.error('At least one valid change request is required.');
      return;
    }

    try {
      await dispatch(internalRequestChanges({
        id: document.id,
        action: 'request_changes',
        changes_requested: changesList,
        comments: `Changes requested internally: ${changesList.join(', ')}`,
        approved_by: currentUser?.id,
        approved_by_name: currentUser?.full_name,
      })).unwrap();
      toast.success('Changes requested internally. Send back to requester when ready.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to request changes internally.');
    }
  };

  const handleSendBackToRequester = async () => {
    try {
      await dispatch(sendBackToRequester({
        id: document.id,
        final_status: sendBackStatus,
        sent_by: currentUser?.id,
        sent_by_name: currentUser?.full_name,
        comments: sendBackMessage || undefined,
        notify_requester: true,
      })).unwrap();

      const statusMessages = {
        approved: 'Document approved and sent back to requester.',
        rejected: 'Document rejected and sent back to requester.',
        changes_requested: 'Changes requested and sent back to requester.',
      };

      toast.success(statusMessages[sendBackStatus]);
      setShowSendBackPreview(false);
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to send document back to requester.');
    }
  };

  const handleOpenSendBackPreview = (status: 'approved' | 'rejected' | 'changes_requested') => {
    setSendBackStatus(status);
    setSendBackMessage('');
    setShowSendBackPreview(true);
  };

  const handleCancelDecision = () => {
    if (window.confirm('Cancel the internal approval decision? This will reset the document to pending review.')) {
      dispatch(cancelInternalApproval({
        id: document.id,
        cancelled_by: currentUser?.id,
        cancelled_by_name: currentUser?.full_name,
        reason: 'Decision cancelled by Super Admin',
      })).unwrap()
        .then(() => {
          toast.success('Internal decision cancelled.');
          onActionComplete();
        })
        .catch((err) => {
          toast.error(typeof err === 'string' ? err : 'Failed to cancel decision.');
        });
    }
  };

  const isLoading = isInternalApproving || isInternalRejecting || isRequestingChanges || isPreviewing || isSendingBack || isStamping;

  return (
    <>
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
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <p className="text-xs text-stone-400 font-mono">
                  Ref: {document.ref} • {document.format.toUpperCase()} • {new Date(document.created_at).toLocaleDateString()}
                </p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getInternalStatusColor(document.internal_approval_status)}`}>
                  Internal: {getInternalStatusLabel(document.internal_approval_status)}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getRequesterStatusColor(document.requester_status)}`}>
                  Requester: {getRequesterStatusLabel(document.requester_status)}
                </span>
              </div>
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
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Preview Count</p>
                <p className="mt-0.5 text-sm text-stone-800">{document.internal_preview_count || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Resubmit Count</p>
                <p className="mt-0.5 text-sm text-stone-800">{document.resubmit_count || 0}</p>
              </div>
            </div>

            {/* Internal Approval Status Section */}
            <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
              <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                <Clock size={16} className="text-stone-400" />
                Approval Status
              </h4>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-stone-500">Internal Status:</span>
                  <p className={`font-medium ${getInternalStatusColor(document.internal_approval_status)} inline-block px-2 py-0.5 rounded-full text-xs`}>
                    {getInternalStatusLabel(document.internal_approval_status)}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">Requester Status:</span>
                  <p className={`font-medium ${getRequesterStatusColor(document.requester_status)} inline-block px-2 py-0.5 rounded-full text-xs`}>
                    {getRequesterStatusLabel(document.requester_status)}
                  </p>
                </div>
                {document.internal_approved_at && (
                  <div>
                    <span className="text-stone-500">Approved At:</span>
                    <p className="font-medium">{new Date(document.internal_approved_at).toLocaleString()}</p>
                  </div>
                )}
                {document.requester_visible_at && (
                  <div>
                    <span className="text-stone-500">Sent Back At:</span>
                    <p className="font-medium">{new Date(document.requester_visible_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {document.internal_changes_requested && document.internal_changes_requested.length > 0 && (
                <div className="mt-2">
                  <span className="text-stone-500">Changes Requested:</span>
                  <ul className="mt-1 list-disc list-inside text-sm text-stone-700">
                    {document.internal_changes_requested.map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}
              {document.internal_rejection_reason && (
                <div className="mt-2">
                  <span className="text-stone-500">Rejection Reason:</span>
                  <p className="text-sm text-red-600">{document.internal_rejection_reason}</p>
                </div>
              )}
            </div>

            {/* E-Stamp Preview */}
            {document.e_stamp_url && document.e_stamp_status === 'stamped' && (
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
                    <p className="text-emerald-600">✓ Approved internally on {document.internal_approved_at ? new Date(document.internal_approved_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Action */}
            {canPreview && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Eye size={16} />
                  Preview Required
                </h4>
                <p className="mt-1 text-xs text-blue-700">
                  Preview the document before making a decision. This will mark it as previewed.
                </p>
                <div className="mt-3">
                  <GoldButton
                    variant="info"
                    onClick={handlePreview}
                    disabled={isLoading}
                    icon={isPreviewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  >
                    {isPreviewing ? 'Previewing…' : 'Preview Document'}
                  </GoldButton>
                </div>
              </div>
            )}

            {/* Internal Decision Actions */}
            {canMakeInternalDecision && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <Clock size={16} />
                  {document.internal_approval_status === 'previewed' ? 'Make Decision' : 'Pending Your Decision'}
                </h4>
                <p className="mt-1 text-xs text-amber-700">
                  {document.internal_approval_status === 'previewed'
                    ? 'You have previewed this document. Now make your decision: approve, reject, or request changes.'
                    : 'Review the document and make a decision. Approving will stamp the document internally. Requester will not see this until you send it back.'
                  }
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <GoldButton
                    variant="success"
                    onClick={handleInternalApprove}
                    disabled={isLoading}
                    icon={isInternalApproving || isStamping ? <Loader2 size={14} className="animate-spin" /> : <Stamp size={14} />}
                  >
                    {isInternalApproving || isStamping ? 'Processing…' : 'Approve Internally'}
                  </GoldButton>
                  <GoldButton
                    variant="danger"
                    onClick={handleInternalReject}
                    disabled={isLoading}
                    icon={isInternalRejecting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  >
                    {isInternalRejecting ? 'Rejecting…' : 'Reject Internally'}
                  </GoldButton>
                  <GoldButton
                    variant="warning"
                    onClick={handleInternalRequestChanges}
                    disabled={isLoading}
                    icon={isRequestingChanges ? <Loader2 size={14} className="animate-spin" /> : <Edit size={14} />}
                  >
                    {isRequestingChanges ? 'Requesting…' : 'Request Changes'}
                  </GoldButton>
                </div>
              </div>
            )}

            {/* Send Back Section */}
            {canSendBack && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <Send size={16} />
                  Decision Made - Send Back to Requester
                </h4>
                <p className="mt-1 text-xs text-emerald-700">
                  You have made an internal decision. Send the document back to the requester to make it visible to them.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {document.internal_approval_status === 'approved_internal' && (
                    <GoldButton
                      variant="success"
                      onClick={() => handleOpenSendBackPreview('approved')}
                      disabled={isLoading}
                      icon={<Check size={14} />}
                    >
                      Send Approved
                    </GoldButton>
                  )}
                  {document.internal_approval_status === 'rejected_internal' && (
                    <GoldButton
                      variant="danger"
                      onClick={() => handleOpenSendBackPreview('rejected')}
                      disabled={isLoading}
                      icon={<XCircle size={14} />}
                    >
                      Send Rejected
                    </GoldButton>
                  )}
                  {document.internal_approval_status === 'changes_requested_internal' && (
                    <GoldButton
                      variant="warning"
                      onClick={() => handleOpenSendBackPreview('changes_requested')}
                      disabled={isLoading}
                      icon={<Edit size={14} />}
                    >
                      Send Changes Requested
                    </GoldButton>
                  )}
                  <GoldButton
                    variant="outline"
                    onClick={handleCancelDecision}
                    disabled={isLoading}
                    icon={<ArrowLeft size={14} />}
                  >
                    Cancel Decision
                  </GoldButton>
                </div>
              </div>
            )}

            {/* Already Sent Back */}
            {document.is_sent_back_to_requester && (
              <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
                <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600" />
                  Sent Back to Requester
                </h4>
                <p className="mt-1 text-xs text-stone-600">
                  This document has been sent back to the requester with status:{' '}
                  <span className={`font-medium ${getRequesterStatusColor(document.requester_status)}`}>
                    {getRequesterStatusLabel(document.requester_status)}
                  </span>
                </p>
                {document.requester_visible_at && (
                  <p className="mt-1 text-xs text-stone-500">
                    Sent on: {new Date(document.requester_visible_at).toLocaleString()}
                  </p>
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
                        {entry.action === 'previewed' && <Eye size={14} className="text-blue-600" />}
                        {entry.action === 'sent_back' && <Send size={14} className="text-purple-600" />}
                        {entry.action === 'resubmitted' && <RefreshCw size={14} className="text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-stone-800">
                            {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                            {entry.internal_action && (
                              <span className="ml-2 text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                                Internal
                              </span>
                            )}
                            {entry.requester_visible && (
                              <span className="ml-2 text-xs text-emerald-400 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Visible
                              </span>
                            )}
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

      {/* Send Back Preview Modal */}
      {showSendBackPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-[#1a3d1c] flex items-center gap-2">
                <Eye size={20} className="text-[#c9a84c]" />
                Preview Send Back
              </h3>
              <button
                onClick={() => setShowSendBackPreview(false)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-600">
                  You are about to send this document back to the requester with status:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${getRequesterStatusColor(sendBackStatus)}`}>
                    {sendBackStatus === 'approved' && <CheckCircle size={16} />}
                    {sendBackStatus === 'rejected' && <XCircle size={16} />}
                    {sendBackStatus === 'changes_requested' && <Edit size={16} />}
                    {getRequesterStatusLabel(sendBackStatus)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700">Message to Requester (Optional)</label>
                <textarea
                  value={sendBackMessage}
                  onChange={(e) => setSendBackMessage(e.target.value)}
                  placeholder="Add a message for the requester..."
                  rows={3}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] resize-none"
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700">
                  The requester will be notified via email and will see the updated status in their dashboard.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
              <GhostButton onClick={() => setShowSendBackPreview(false)}>
                Cancel
              </GhostButton>
              <GoldButton
                variant="success"
                onClick={handleSendBackToRequester}
                disabled={isSendingBack}
                icon={isSendingBack ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              >
                {isSendingBack ? 'Sending…' : 'Confirm Send Back'}
              </GoldButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Entity Detail Modal with Document Approval ─────────────────────────────

interface EntityDetailModalProps<T> {
  item: T;
  entityType: EntityType;
  entityName: string;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: Status) => void;
  mutating: boolean;
  renderContent: (item: T) => React.ReactNode;
}

function EntityDetailModal<T extends { id: string; status: Status; created_at: string; updated_at: string }>({
  item,
  entityType,
  entityName,
  onClose,
  onEdit,
  onStatusChange,
  mutating,
  renderContent,
}: EntityDetailModalProps<T>) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const allDocs = useAppSelector(selectAllHelpdeskDocuments);
  const docs = allDocs.filter(
    (d) => d.entity_type === entityType && d.entity_id === item.id
  );
  const documentsLoading = useAppSelector((state) => state.helpdeskDocuments.loading.fetch);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);

  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [selectedDocForView, setSelectedDocForView] = useState<HelpdeskDocument | null>(null);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    dispatch(fetchHelpdeskDocuments({ entity_type: entityType, entity_id: item.id }));
  }, [dispatch, entityType, item.id]);

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
          ref: `${entityType.toUpperCase()}/${item.id.slice(0, 8)}`,
          subject: `Memo for ${entityName}`,
          entity_type: entityType,
          entity_id: item.id,
          format,
        })
      ).unwrap();
      toast.success('Document attached successfully.');
      dispatch(fetchHelpdeskDocuments({ entity_type: entityType, entity_id: item.id }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to attach document.');
    } finally {
      e.target.value = '';
    }
  };

  const handleLinkExisting = async (docId: string) => {
    try {
      await dispatch(linkHelpdeskDocument({ id: docId, entity_type: entityType, entity_id: item.id })).unwrap();
      toast.success('Document linked successfully.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: entityType, entity_id: item.id }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
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
    dispatch(fetchHelpdeskDocuments({ entity_type: entityType, entity_id: item.id }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1a3d1c]">{entityName}</h3>
            <p className="text-sm text-stone-500">ID: {item.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-stone-500">Status:</span>
            <StatusDropdown
              status={item.status}
              onStatusChange={(s) => onStatusChange(item.id, s)}
              disabled={mutating}
            />
          </div>

          <div className="mb-6">{renderContent(item)}</div>

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
                No documents attached yet. Upload or link a document above.
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
                          <DocumentStatusBadge status={doc.status} />
                          <span className="text-[11px] text-stone-400">{doc.ref}</span>
                          <span className="text-[11px] text-stone-400 uppercase">{doc.format}</span>
                        </div>
                        {doc.status === 'rejected' && doc.rejection_reason && (
                          <p className="mt-1 text-[11px] text-red-600">Reason: {doc.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink size={12} />
                        Open
                      </a>
                      {doc.status === 'draft' && (
                        <GhostButton
                          onClick={() => handleViewDocument(doc)}
                          icon={<Eye size={12} />}
                        >
                          Review & Decide
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
                      {doc.status === 'approved' && doc.e_stamp_url && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <Stamp size={12} />
                          Stamped
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 border-t border-stone-100 pt-4 text-xs text-stone-400">
            <div className="grid grid-cols-2 gap-1">
              <span>Created: {new Date(item.created_at).toLocaleString()}</span>
              <span>Updated: {new Date(item.updated_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <GoldOutlineButton icon={<Edit size={14} />} onClick={onEdit}>
            Edit {entityName}
          </GoldOutlineButton>
        </div>
      </div>

      {showDocViewer && selectedDocForView && (
        <DocumentViewerModal
          document={selectedDocForView}
          entityId={item.id}
          entityType={entityType}
          onClose={handleCloseDocViewer}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
}

// ─── Generic DSA Tab ─────────────────────────────────────────────────────────

interface DSATabProps<T> {
  title: string;
  icon: React.ReactNode;
  data: T[];
  loading: boolean;
  mutating: boolean;
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  renderRow: (item: T) => React.ReactNode;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  onView?: (item: T) => void;
}

function DSATab<T extends { id: string }>({
  title,
  icon,
  data,
  loading,
  mutating,
  columns,
  renderRow,
  onAdd,
  onEdit,
  onDelete,
  onView,
}: DSATabProps<T>) {
  return (
    <Panel
      title={title}
      icon={icon}
      action={
        <div className="flex gap-2">
          <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export</GhostButton>
          <GoldOutlineButton icon={<Plus className="h-3.5 w-3.5" />} onClick={onAdd}>
            Add {title.slice(0, -1)}
          </GoldOutlineButton>
        </div>
      }
    >
      <TableWithActions
        data={data}
        loading={loading}
        columns={columns}
        renderRow={renderRow}
        onEdit={onEdit}
        onDelete={onDelete}
        mutating={mutating}
        onView={onView}
      />
    </Panel>
  );
}

// ─── Circuits Tab ────────────────────────────────────────────────────────────

// ─── Circuits Tab ────────────────────────────────────────────────────────────

function CircuitsTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllCircuits);
  const loading = useAppSelector((state) => state.helpdesk.loading.circuits);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Circuit | null>(null);
  const [selectedItem, setSelectedItem] = useState<Circuit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: Circuit) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleView = (item: Circuit) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updateCircuitStatus({ id, status }));
    await dispatch(fetchCircuits({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteCircuit(deleteTarget));
    await dispatch(fetchCircuits({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  // Helper to get unique judge names from DSA details
  const getJudgeNames = (item: Circuit) => {
    if (!item.dsa_details || item.dsa_details.length === 0) return null;
    const uniqueJudges = [...new Set(item.dsa_details.map(d => d.judge_name).filter(Boolean))];
    return uniqueJudges;
  };

  return (
    <>
      <DSATab
        title="Circuits"
        icon={<MapPin className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'judges', label: 'Judge(s)' },
          { key: 'name', label: 'Circuit' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: Circuit) => {
          const judgeNames = getJudgeNames(item);
          return (
            <>
              <td className="px-3 py-2">
                {judgeNames ? (
                  <div className="flex flex-col gap-0.5">
                    {judgeNames.slice(0, 2).map((name, i) => (
                      <span key={i} className="text-sm text-stone-700">
                        {name}
                      </span>
                    ))}
                    {judgeNames.length > 2 && (
                      <span className="text-xs text-stone-400">
                        +{judgeNames.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-stone-400 text-sm">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleView(item)}
                  className="font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left"
                >
                  {item.name}
                </button>
                {item.location && (
                  <span className="ml-2 text-xs text-stone-400">({item.location})</span>
                )}
              </td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.start_date)}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.end_date)}</td>
              <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
            </>
          );
        }}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget(id)}
        onView={handleView}
      />

      <CircuitModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        mode="circuit"
        editingItem={editingItem}
      />

      {showDetailModal && selectedItem && (
        <EntityDetailModal
          item={selectedItem}
          entityType="circuit"
          entityName={selectedItem.name}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
          renderContent={(item) => (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Judge(s):</span>
                <p className="font-medium">
                  {item.dsa_details && item.dsa_details.length > 0 ? (
                    [...new Set(item.dsa_details.map(d => d.judge_name))].join(', ')
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Location:</span>
                <p className="font-medium">{item.location || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">Period:</span>
                <p className="font-medium">{formatDate(item.start_date)} — {formatDate(item.end_date)}</p>
              </div>
              <div>
                <span className="text-stone-500">Total DSA:</span>
                <p className="font-bold text-emerald-700">{formatCurrency(item.total_dsa)}</p>
              </div>
              <div>
                <span className="text-stone-500">Members:</span>
                <p className="font-medium">{item.dsa_details?.length || 0}</p>
              </div>
            </div>
          )}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Circuit?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── Other Payments Tab ──────────────────────────────────────────────────────

function OtherPaymentsTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllOtherPayments);
  const loading = useAppSelector((state) => state.helpdesk.loading.otherPayments);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OtherPayment | null>(null);
  const [selectedItem, setSelectedItem] = useState<OtherPayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: OtherPayment) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleView = (item: OtherPayment) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updateOtherPaymentStatus({ id, status }));
    await dispatch(fetchOtherPayments({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteOtherPayment(deleteTarget));
    await dispatch(fetchOtherPayments({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  const getJudgeNames = (item: OtherPayment) => {
    if (!item.dsa_details || item.dsa_details.length === 0) return null;
    const uniqueJudges = [...new Set(item.dsa_details.map(d => d.judge_name).filter(Boolean))];
    return uniqueJudges;
  };

  return (
    <>
      <DSATab
        title="Other Payments"
        icon={<CreditCard className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'judges', label: 'Judge(s)' },
          { key: 'name', label: 'Payment' },
          { key: 'description', label: 'Description' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: OtherPayment) => {
          const judgeNames = getJudgeNames(item);
          return (
            <>
              <td className="px-3 py-2">
                {judgeNames ? (
                  <div className="flex flex-col gap-0.5">
                    {judgeNames.slice(0, 2).map((name, i) => (
                      <span key={i} className="text-sm text-stone-700">
                        {name}
                      </span>
                    ))}
                    {judgeNames.length > 2 && (
                      <span className="text-xs text-stone-400">
                        +{judgeNames.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-stone-400 text-sm">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleView(item)}
                  className="font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left"
                >
                  {item.name}
                </button>
              </td>
              <td className="px-3 py-2 text-stone-600 max-w-xs truncate">{item.description || '—'}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.start_date)}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.end_date)}</td>
              <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
            </>
          );
        }}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget(id)}
        onView={handleView}
      />

      <CircuitModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        mode="otherPayment"
        editingItem={editingItem}
      />

      {showDetailModal && selectedItem && (
        <EntityDetailModal
          item={selectedItem}
          entityType="otherPayment"
          entityName={selectedItem.name}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
          renderContent={(item) => (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Judge(s):</span>
                <p className="font-medium">
                  {item.dsa_details && item.dsa_details.length > 0 ? (
                    [...new Set(item.dsa_details.map(d => d.judge_name))].join(', ')
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Description:</span>
                <p className="font-medium">{item.description || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">Period:</span>
                <p className="font-medium">{formatDate(item.start_date)} — {formatDate(item.end_date)}</p>
              </div>
              <div>
                <span className="text-stone-500">Total DSA:</span>
                <p className="font-bold text-emerald-700">{formatCurrency(item.total_dsa)}</p>
              </div>
              <div>
                <span className="text-stone-500">Members:</span>
                <p className="font-medium">{item.dsa_details?.length || 0}</p>
              </div>
            </div>
          )}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Other Payment?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── Benches Tab ────────────────────────────────────────────────────────────

function BenchesTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllBenches);
  const loading = useAppSelector((state) => state.helpdesk.loading.benches);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SpecialBench | null>(null);
  const [selectedItem, setSelectedItem] = useState<SpecialBench | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: SpecialBench) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleView = (item: SpecialBench) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updateBenchStatus({ id, status }));
    await dispatch(fetchBenches({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteBench(deleteTarget));
    await dispatch(fetchBenches({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  const getJudgeNames = (item: SpecialBench) => {
    if (!item.dsa_details || item.dsa_details.length === 0) return null;
    const uniqueJudges = [...new Set(item.dsa_details.map(d => d.judge_name).filter(Boolean))];
    return uniqueJudges;
  };

  return (
    <>
      <DSATab
        title="Special Benches"
        icon={<Gavel className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'judges', label: 'Judge(s)' },
          { key: 'name', label: 'Bench / Case' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: SpecialBench) => {
          const judgeNames = getJudgeNames(item);
          return (
            <>
              <td className="px-3 py-2">
                {judgeNames ? (
                  <div className="flex flex-col gap-0.5">
                    {judgeNames.slice(0, 2).map((name, i) => (
                      <span key={i} className="text-sm text-stone-700">
                        {name}
                      </span>
                    ))}
                    {judgeNames.length > 2 && (
                      <span className="text-xs text-stone-400">
                        +{judgeNames.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-stone-400 text-sm">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleView(item)}
                  className="font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left"
                >
                  {item.name}
                </button>
              </td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.start_date)}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.end_date)}</td>
              <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
            </>
          );
        }}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget(id)}
        onView={handleView}
      />

      <CircuitModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        mode="bench"
        editingItem={editingItem}
      />

      {showDetailModal && selectedItem && (
        <EntityDetailModal
          item={selectedItem}
          entityType="bench"
          entityName={selectedItem.name}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
          renderContent={(item) => (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Judge(s):</span>
                <p className="font-medium">
                  {item.dsa_details && item.dsa_details.length > 0 ? (
                    [...new Set(item.dsa_details.map(d => d.judge_name))].join(', ')
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Bench Name:</span>
                <p className="font-medium">{item.name}</p>
              </div>
              <div>
                <span className="text-stone-500">Period:</span>
                <p className="font-medium">{formatDate(item.start_date)} — {formatDate(item.end_date)}</p>
              </div>
              <div>
                <span className="text-stone-500">Total DSA:</span>
                <p className="font-bold text-emerald-700">{formatCurrency(item.total_dsa)}</p>
              </div>
              <div>
                <span className="text-stone-500">Members:</span>
                <p className="font-medium">{item.dsa_details?.length || 0}</p>
              </div>
            </div>
          )}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Bench?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── Part-Heards Tab ─────────────────────────────────────────────────────────

function PartHeardTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllPartHeards);
  const loading = useAppSelector((state) => state.helpdesk.loading.partHeards);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PartHeard | null>(null);
  const [selectedItem, setSelectedItem] = useState<PartHeard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: PartHeard) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleView = (item: PartHeard) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updatePartHeardStatus({ id, status }));
    await dispatch(fetchPartHeards({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deletePartHeard(deleteTarget));
    await dispatch(fetchPartHeards({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  const getJudgeNames = (item: PartHeard) => {
    if (!item.dsa_details || item.dsa_details.length === 0) return null;
    const uniqueJudges = [...new Set(item.dsa_details.map(d => d.judge_name).filter(Boolean))];
    return uniqueJudges;
  };

  return (
    <>
      <DSATab
        title="Part-Heards"
        icon={<FileCheck className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'judges', label: 'Judge(s)' },
          { key: 'case_reference', label: 'Reference' },
          { key: 'approved_by', label: 'Approved By' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: PartHeard) => {
          const judgeNames = getJudgeNames(item);
          return (
            <>
              <td className="px-3 py-2">
                {judgeNames ? (
                  <div className="flex flex-col gap-0.5">
                    {judgeNames.slice(0, 2).map((name, i) => (
                      <span key={i} className="text-sm text-stone-700">
                        {name}
                      </span>
                    ))}
                    {judgeNames.length > 2 && (
                      <span className="text-xs text-stone-400">
                        +{judgeNames.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-stone-400 text-sm">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleView(item)}
                  className="font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left"
                >
                  {item.case_reference}
                </button>
              </td>
              <td className="px-3 py-2 text-stone-600">{item.approved_by || '—'}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.start_date)}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.end_date)}</td>
              <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
            </>
          );
        }}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget(id)}
        onView={handleView}
      />

      <CircuitModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        mode="partHeard"
        editingItem={editingItem}
      />

      {showDetailModal && selectedItem && (
        <EntityDetailModal
          item={selectedItem}
          entityType="partHeard"
          entityName={selectedItem.case_reference}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
          renderContent={(item) => (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Judge(s):</span>
                <p className="font-medium">
                  {item.dsa_details && item.dsa_details.length > 0 ? (
                    [...new Set(item.dsa_details.map(d => d.judge_name))].join(', ')
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Approved By:</span>
                <p className="font-medium">{item.approved_by || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">Period:</span>
                <p className="font-medium">{formatDate(item.start_date)} — {formatDate(item.end_date)}</p>
              </div>
              <div>
                <span className="text-stone-500">Total DSA:</span>
                <p className="font-bold text-emerald-700">{formatCurrency(item.total_dsa)}</p>
              </div>
              <div>
                <span className="text-stone-500">Members:</span>
                <p className="font-medium">{item.dsa_details?.length || 0}</p>
              </div>
            </div>
          )}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Part-Heard?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── Service Week Tab ────────────────────────────────────────────────────────

function ServiceWeekTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllServiceWeeks);
  const loading = useAppSelector((state) => state.helpdesk.loading.serviceWeeks);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceWeek | null>(null);
  const [selectedItem, setSelectedItem] = useState<ServiceWeek | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: ServiceWeek) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleView = (item: ServiceWeek) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updateServiceWeekStatus({ id, status }));
    await dispatch(fetchServiceWeeks({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteServiceWeek(deleteTarget));
    await dispatch(fetchServiceWeeks({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  const getJudgeNames = (item: ServiceWeek) => {
    if (!item.dsa_details || item.dsa_details.length === 0) return null;
    const uniqueJudges = [...new Set(item.dsa_details.map(d => d.judge_name).filter(Boolean))];
    return uniqueJudges;
  };

  return (
    <>
      <DSATab
        title="Service Week / RRI"
        icon={<Calendar className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'judges', label: 'Judge(s)' },
          { key: 'name', label: 'Week Name' },
          { key: 'week_number', label: 'Week #' },
          { key: 'year', label: 'Year' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: ServiceWeek) => {
          const judgeNames = getJudgeNames(item);
          return (
            <>
              <td className="px-3 py-2">
                {judgeNames ? (
                  <div className="flex flex-col gap-0.5">
                    {judgeNames.slice(0, 2).map((name, i) => (
                      <span key={i} className="text-sm text-stone-700">
                        {name}
                      </span>
                    ))}
                    {judgeNames.length > 2 && (
                      <span className="text-xs text-stone-400">
                        +{judgeNames.length - 2} more
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-stone-400 text-sm">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleView(item)}
                  className="font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left"
                >
                  {item.name}
                </button>
              </td>
              <td className="px-3 py-2 text-stone-600">{item.week_number}</td>
              <td className="px-3 py-2 text-stone-600">{item.year}</td>
              <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
            </>
          );
        }}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget(id)}
        onView={handleView}
      />

      <CircuitModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        mode="serviceWeek"
        editingItem={editingItem}
      />

      {showDetailModal && selectedItem && (
        <EntityDetailModal
          item={selectedItem}
          entityType="serviceWeek"
          entityName={selectedItem.name}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
          renderContent={(item) => (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Judge(s):</span>
                <p className="font-medium">
                  {item.dsa_details && item.dsa_details.length > 0 ? (
                    [...new Set(item.dsa_details.map(d => d.judge_name))].join(', ')
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Week Number:</span>
                <p className="font-medium">Week {item.week_number}</p>
              </div>
              <div>
                <span className="text-stone-500">Year:</span>
                <p className="font-medium">{item.year}</p>
              </div>
              <div>
                <span className="text-stone-500">Total DSA:</span>
                <p className="font-bold text-emerald-700">{formatCurrency(item.total_dsa)}</p>
              </div>
              <div>
                <span className="text-stone-500">Members:</span>
                <p className="font-medium">{item.dsa_details?.length || 0}</p>
              </div>
            </div>
          )}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Service Week?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── Medical Claims Tab ──────────────────────────────────────────────────────

function MedicalClaimsTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllMedicalClaims);
  const loading = useAppSelector((state) => state.helpdesk.loading.medicalClaims);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MedicalClaim | null>(null);
  const [selectedItem, setSelectedItem] = useState<MedicalClaim | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: MedicalClaim) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleView = (item: MedicalClaim) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updateMedicalClaimStatus({ id, status }));
    await dispatch(fetchMedicalClaims({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteMedicalClaim(deleteTarget));
    await dispatch(fetchMedicalClaims({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  return (
    <>
      <Panel
        title="Medical Expense Claims"
        icon={<Stethoscope className="h-4 w-4" />}
        action={
          <div className="flex gap-2">
            <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export</GhostButton>
            <GoldOutlineButton icon={<Plus className="h-3.5 w-3.5" />} onClick={handleAdd}>
              Add Claim
            </GoldOutlineButton>
          </div>
        }
      >
        <TableWithActions
          data={data}
          loading={loading}
          columns={[
            { key: 's_no', label: 'S/No.' },
            { key: 'officer_name', label: "Officer's Name" },
            { key: 'claim_amount', label: 'Claim Amount', align: 'right' },
            { key: 'date_forwarded_dhr', label: 'Date Forwarded to DHR' },
            { key: 'status', label: 'Status', align: 'center' },
            { key: 'remarks', label: 'Remarks' },
          ]}
          renderRow={(item: MedicalClaim) => (
            <>
              <td className="px-3 py-2 text-center text-stone-600">{item.s_no || '—'}</td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleView(item)}
                  className="font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left"
                >
                  {item.officer_name}
                </button>
              </td>
              <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.claim_amount)}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.date_forwarded_dhr)}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
              <td className="px-3 py-2 text-stone-600 max-w-xs truncate">{item.remarks || '—'}</td>
            </>
          )}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTarget(id)}
          mutating={mutating}
          onView={handleView}
        />
      </Panel>

      <RequestModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        mode="medical"
        editingItem={editingItem}
      />

      {showDetailModal && selectedItem && (
        <EntityDetailModal
          item={selectedItem}
          entityType="medicalClaim"
          entityName={selectedItem.officer_name}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
          renderContent={(item) => (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Claim Amount:</span>
                <p className="font-bold text-emerald-700">{formatCurrency(item.claim_amount)}</p>
              </div>
              <div>
                <span className="text-stone-500">Date Forwarded to DHR:</span>
                <p className="font-medium">{formatDate(item.date_forwarded_dhr)}</p>
              </div>
              <div>
                <span className="text-stone-500">Remarks:</span>
                <p className="font-medium">{item.remarks || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">S/No.:</span>
                <p className="font-medium">{item.s_no || '—'}</p>
              </div>
            </div>
          )}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Medical Claim?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── General Requests Tab ────────────────────────────────────────────────────

function GeneralRequestsTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllGeneralRequests);
  const loading = useAppSelector((state) => state.helpdesk.loading.generalRequests);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GeneralRequest | null>(null);
  const [selectedItem, setSelectedItem] = useState<GeneralRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: GeneralRequest) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleView = (item: GeneralRequest) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updateGeneralRequestStatus({ id, status }));
    await dispatch(fetchGeneralRequests({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteGeneralRequest(deleteTarget));
    await dispatch(fetchGeneralRequests({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  return (
    <>
      <Panel
        title="General / Personnel Requests"
        icon={<FileText className="h-4 w-4" />}
        action={
          <div className="flex gap-2">
            <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export</GhostButton>
            <GoldOutlineButton icon={<Plus className="h-3.5 w-3.5" />} onClick={handleAdd}>
              Add Request
            </GoldOutlineButton>
          </div>
        }
      >
        <TableWithActions
          data={data}
          loading={loading}
          columns={[
            { key: 's_no', label: 'S/No.' },
            { key: 'judge_name', label: "Judge's Name" },
            { key: 'request', label: 'Request' },
            { key: 'date_received', label: 'Date Received' },
            { key: 'officer_assigned', label: 'Officer Assigned' },
            { key: 'status', label: 'Status', align: 'center' },
            { key: 'remarks', label: 'Remarks' },
          ]}
          renderRow={(item: GeneralRequest) => (
            <>
              <td className="px-3 py-2 text-center text-stone-600">{item.s_no || '—'}</td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleView(item)}
                  className="font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left"
                >
                  {item.judge_name}
                </button>
              </td>
              <td className="px-3 py-2 text-stone-600 max-w-xs truncate">{item.request}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.date_received)}</td>
              <td className="px-3 py-2 text-stone-600">{item.officer_assigned || '—'}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
              <td className="px-3 py-2 text-stone-600 max-w-xs truncate">{item.remarks || '—'}</td>
            </>
          )}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTarget(id)}
          mutating={mutating}
          onView={handleView}
        />
      </Panel>

      <RequestModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        mode="general"
        editingItem={editingItem}
      />

      {showDetailModal && selectedItem && (
        <EntityDetailModal
          item={selectedItem}
          entityType="generalRequest"
          entityName={selectedItem.judge_name}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
          renderContent={(item) => (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Request:</span>
                <p className="font-medium">{item.request}</p>
              </div>
              <div>
                <span className="text-stone-500">Date Received:</span>
                <p className="font-medium">{formatDate(item.date_received)}</p>
              </div>
              <div>
                <span className="text-stone-500">Officer Assigned:</span>
                <p className="font-medium">{item.officer_assigned || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">Remarks:</span>
                <p className="font-medium">{item.remarks || '—'}</p>
              </div>
            </div>
          )}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete General Request?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── Visa Tab ─────────────────────────────────────────────────────────────────

function VisaTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllVisaRequests);
  const loading = useAppSelector((state) => state.helpdesk.loading.visa);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VisaRequest | null>(null);
  const [selectedItem, setSelectedItem] = useState<VisaRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: VisaRequest) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleView = (item: VisaRequest) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updateVisaStatus({ id, status }));
    await dispatch(fetchVisaRequests({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteVisaRequest(deleteTarget));
    await dispatch(fetchVisaRequests({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  return (
    <>
      <Panel
        title="Visa Support"
        icon={<Plane className="h-4 w-4" />}
        action={
          <div className="flex gap-2">
            <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export</GhostButton>
            <GoldOutlineButton icon={<Plus className="h-3.5 w-3.5" />} onClick={handleAdd}>
              Add Visa Request
            </GoldOutlineButton>
          </div>
        }
      >
        <TableWithActions
          data={data}
          loading={loading}
          columns={[
            { key: 's_no', label: 'S/No.' },
            { key: 'name', label: 'Name' },
            { key: 'destination_country', label: 'Destination' },
            { key: 'date_of_travel', label: 'Travel Date' },
            { key: 'date_of_return', label: 'Return Date' },
            { key: 'visa_type', label: 'Visa Type' },
            { key: 'purpose_of_travel', label: 'Purpose' },
            { key: 'remarks', label: 'Remarks' },
            { key: 'status', label: 'Status', align: 'center' },
          ]}
          renderRow={(item: VisaRequest) => (
            <>
              <td className="px-3 py-2 text-center text-stone-600">{item.s_no || '—'}</td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleView(item)}
                  className="font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left"
                >
                  {item.judge_name}
                </button>
              </td>
              <td className="px-3 py-2 text-stone-600">{item.destination_country}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.date_of_travel)}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.date_of_return)}</td>
              <td className="px-3 py-2 text-stone-600">{item.visa_type}</td>
              <td className="px-3 py-2 text-stone-600 max-w-xs truncate">{item.purpose_of_travel || '—'}</td>
              <td className="px-3 py-2 text-stone-600 max-w-xs truncate">{item.remarks || '—'}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
            </>
          )}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTarget(id)}
          mutating={mutating}
          onView={handleView}
        />
      </Panel>

      <VisaModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
      />

      {showDetailModal && selectedItem && (
        <EntityDetailModal
          item={selectedItem}
          entityType="visa"
          entityName={selectedItem.judge_name}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
          renderContent={(item) => (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Destination:</span>
                <p className="font-medium">{item.destination_country}</p>
              </div>
              <div>
                <span className="text-stone-500">Visa Type:</span>
                <p className="font-medium">{item.visa_type}</p>
              </div>
              <div>
                <span className="text-stone-500">Travel Date:</span>
                <p className="font-medium">{formatDate(item.date_of_travel)}</p>
              </div>
              <div>
                <span className="text-stone-500">Return Date:</span>
                <p className="font-medium">{formatDate(item.date_of_return)}</p>
              </div>
              <div>
                <span className="text-stone-500">Purpose:</span>
                <p className="font-medium">{item.purpose_of_travel || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">Remarks:</span>
                <p className="font-medium">{item.remarks || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">S/No.:</span>
                <p className="font-medium">{item.s_no || '—'}</p>
              </div>
            </div>
          )}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Visa Request?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── Protocol Tab ─────────────────────────────────────────────────────────────

function ProtocolTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllProtocolEvents);
  const loading = useAppSelector((state) => state.helpdesk.loading.protocol);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ProtocolEvent | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProtocolEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: ProtocolEvent) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleView = (item: ProtocolEvent) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updateProtocolStatus({ id, status }));
    await dispatch(fetchProtocolEvents({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteProtocolEvent(deleteTarget));
    await dispatch(fetchProtocolEvents({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  return (
    <>
      <Panel
        title="Protocol Support"
        icon={<Calendar className="h-4 w-4" />}
        action={
          <div className="flex gap-2">
            <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export</GhostButton>
            <GoldOutlineButton icon={<Plus className="h-3.5 w-3.5" />} onClick={handleAdd}>
              Add Protocol Event
            </GoldOutlineButton>
          </div>
        }
      >
        <TableWithActions
          data={data}
          loading={loading}
          columns={[
            { key: 's_no', label: 'S/No.' },
            { key: 'activity', label: 'Activity' },
            { key: 'period_from', label: 'Period From' },
            { key: 'period_to', label: 'Period To' },
            { key: 'officers_assigned', label: 'Officers Assigned' },
            { key: 'remarks', label: 'Remarks' },
            { key: 'dsa_required', label: 'DSA', align: 'center' },
            { key: 'total_dsa', label: 'Total DSA', align: 'right' },
            { key: 'status', label: 'Status', align: 'center' },
          ]}
          renderRow={(item: ProtocolEvent) => (
            <>
              <td className="px-3 py-2 text-center text-stone-600">{item.s_no || '—'}</td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleView(item)}
                  className="font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left"
                >
                  {item.activity}
                </button>
              </td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.period_from)}</td>
              <td className="px-3 py-2 text-stone-600">{formatDate(item.period_to)}</td>
              <td className="px-3 py-2 text-stone-600 max-w-xs truncate">{item.officers_assigned || '—'}</td>
              <td className="px-3 py-2 text-stone-600 max-w-xs truncate">{item.remarks || '—'}</td>
              <td className="px-3 py-2 text-center text-stone-600">{item.dsa_required ? 'Yes' : 'No'}</td>
              <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
            </>
          )}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTarget(id)}
          mutating={mutating}
          onView={handleView}
        />
      </Panel>

      <ProtocolModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
      />

      {showDetailModal && selectedItem && (
        <EntityDetailModal
          item={selectedItem}
          entityType="protocol"
          entityName={selectedItem.activity}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
          renderContent={(item) => (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Period:</span>
                <p className="font-medium">{formatDate(item.period_from)} — {formatDate(item.period_to)}</p>
              </div>
              <div>
                <span className="text-stone-500">Officers Assigned:</span>
                <p className="font-medium">{item.officers_assigned || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">DSA Required:</span>
                <p className="font-medium">{item.dsa_required ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-stone-500">Total DSA:</span>
                <p className="font-bold text-emerald-700">{formatCurrency(item.total_dsa)}</p>
              </div>
              <div>
                <span className="text-stone-500">Members:</span>
                <p className="font-medium">{item.dsa_details?.length || 0} judges</p>
              </div>
              <div className="col-span-2">
                <span className="text-stone-500">Remarks:</span>
                <p className="font-medium">{item.remarks || '—'}</p>
              </div>
            </div>
          )}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Protocol Event?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── Club Tab ─────────────────────────────────────────────────────────────────

function ClubTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllClubMemberships);
  const loading = useAppSelector((state) => state.helpdesk.loading.club);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ClubMembership | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: ClubMembership) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await dispatch(updateClubMembershipStatus({ id, status }));
    await dispatch(fetchClubMemberships({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteClubMembership(deleteTarget));
    await dispatch(fetchClubMemberships({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  return (
    <>
      <Panel
        title="Club Membership"
        icon={<Users className="h-4 w-4" />}
        action={
          <div className="flex gap-2">
            <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export</GhostButton>
            <GoldOutlineButton icon={<Plus className="h-3.5 w-3.5" />} onClick={handleAdd}>
              Add Club
            </GoldOutlineButton>
          </div>
        }
      >
        <TableWithActions
          data={data}
          loading={loading}
          columns={[
            { key: 'pj_no', label: 'PJ No.' },
            { key: 'judge_name', label: 'Judge' },
            { key: 'club_name', label: 'Club' },
            { key: 'entry_fee', label: 'Entry Fee', align: 'right' },
            { key: 'annual_fee', label: 'Annual Fee', align: 'right' },
            { key: 'court', label: 'Court' },
            { key: 'status', label: 'Status', align: 'center' },
          ]}
          renderRow={(item: ClubMembership) => (
            <>
              <td className="px-3 py-2 font-mono text-xs text-stone-600">{item.pj_no || '—'}</td>
              <td className="px-3 py-2 font-medium text-stone-800">{item.judge_name}</td>
              <td className="px-3 py-2 text-stone-600">{item.club_name}</td>
              <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.entry_fee)}</td>
              <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.annual_fee)}</td>
              <td className="px-3 py-2 text-stone-600">{item.court || '—'}</td>
              <td className="px-3 py-2 text-center">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => handleStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </td>
            </>
          )}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTarget(id)}
          mutating={mutating}
        />
      </Panel>

      <ClubModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Club Membership?"
          message="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}
    </>
  );
}

// ─── Utilities Tab (UPDATED to use utilitiesSlice) ──────────────────────────

function UtilitiesTab({
  onViewJudge,
}: {
  onViewJudge?: (judgeName: string) => void;
}) {
  const dispatch = useAppDispatch();
  
  // ─── Use selectors from utilities slice ──────────────────────────────
  const data = useAppSelector(selectAllUtilitiesFromSlice);
  const loading = useAppSelector(selectUtilitiesLoading);
  const mutating = useAppSelector(selectUtilitiesMutating);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<JudgeUtility | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showMemoModal, setShowMemoModal] = useState(false);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: JudgeUtility) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleStatusChange = async (utilityId: string, itemId: string, status: UtilityStatus) => {
    await dispatch(updateUtilityItem({
      id: utilityId,
      itemId: itemId,
      updates: { status }
    }));
    await dispatch(fetchUtilities({}));
    await dispatch(fetchHelpDeskStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteUtility(deleteTarget));
    await dispatch(fetchUtilities({}));
    await dispatch(fetchHelpDeskStats());
    setDeleteTarget(null);
  };

  const handleView = (item: JudgeUtility) => {
    if (onViewJudge) {
      onViewJudge(item.judge_name);
    }
  };

  const handleMemoGenerated = (docId: string) => {
    console.log('Memo generated with ID:', docId);
    toast.success('Memo generated successfully');
    setShowMemoModal(false);
    dispatch(fetchUtilities({}));
  };

  // ─── Flatten data for table ──────────────────────────────────────────────
  const flattenedData = useMemo(() => {
    const rows: Array<{
      judgeId: string;
      judgeName: string;
      pjNumber: string | null;
      itemId: string;
      item: UtilityItem;
      isFirstRow: boolean;
      rowSpan: number;
    }> = [];

    data.forEach((utility) => {
      const items = utility.items.length > 0 ? utility.items : [];
      const rowSpan = items.length || 1;

      items.forEach((item, index) => {
        rows.push({
          judgeId: utility.id,
          judgeName: utility.judge_name,
          pjNumber: utility.pj_number,
          itemId: item.id,
          item: item,
          isFirstRow: index === 0,
          rowSpan: rowSpan,
        });
      });
    });

    return rows;
  }, [data]);

  return (
    <>
      <Panel
        title="Judge Utilities"
        icon={<Wallet className="h-4 w-4" />}
        action={
          <div className="flex gap-2 flex-wrap">
            <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export</GhostButton>
            <GoldOutlineButton icon={<FileText className="h-3.5 w-3.5" />} onClick={() => setShowMemoModal(true)}>
              Generate Memo
            </GoldOutlineButton>
            <GoldOutlineButton icon={<Plus className="h-3.5 w-3.5" />} onClick={handleAdd}>
              Add Utility
            </GoldOutlineButton>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
          </div>
        ) : flattenedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Info className="h-8 w-8 text-stone-300 mb-2" />
            <p className="text-sm font-medium text-stone-600">No utility records found</p>
            <p className="text-xs text-stone-400">Click 'Add Utility' to create a new entry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Judge
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    PJ Number
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Type
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Requisition #
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Amount (KES)
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Period
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Description
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {flattenedData.map((row) => (
                  <tr key={row.itemId} className="hover:bg-amber-50/30 transition-colors duration-150">
                    {row.isFirstRow && (
                      <>
                        <td
                          rowSpan={row.rowSpan}
                          className="px-3 py-2.5 align-top border-r border-stone-100 bg-stone-50/30"
                        >
                          <button
                            onClick={() => {
                              const utility = data.find((u) => u.id === row.judgeId);
                              if (utility) handleView(utility);
                            }}
                            className="text-sm font-medium text-stone-800 hover:text-[#c9a84c] hover:underline text-left transition-colors"
                          >
                            {row.judgeName}
                          </button>
                          <span className="block text-[10px] text-stone-400 mt-0.5">
                            {row.rowSpan} item{row.rowSpan !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td
                          rowSpan={row.rowSpan}
                          className="px-3 py-2.5 align-top border-r border-stone-100 bg-stone-50/30"
                        >
                          <span className="font-mono text-sm text-stone-600">
                            {row.pjNumber || (
                              <span className="text-stone-300 italic text-xs">Not assigned</span>
                            )}
                          </span>
                        </td>
                      </>
                    )}

                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <UtilityTypeBadge type={row.item.utility_type} />
                    </td>

                    <td className="px-3 py-2.5 font-mono text-xs text-stone-600 whitespace-nowrap">
                      {row.item.requisition_number ? (
                        <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">
                          {row.item.requisition_number}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right font-medium text-stone-800 whitespace-nowrap">
                      {formatCurrency(row.item.amount)}
                    </td>

                    <td className="px-3 py-2.5 text-stone-600 whitespace-nowrap">
                      {row.item.period}
                    </td>

                    <td
                      className="px-3 py-2.5 text-stone-500 max-w-[150px] truncate"
                      title={row.item.description || ""}
                    >
                      {row.item.description || <span className="text-stone-300">—</span>}
                    </td>

                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <UtilityStatusDropdown
                        status={row.item.status}
                        onStatusChange={(s) =>
                          handleStatusChange(row.judgeId, row.itemId, s)
                        }
                        disabled={mutating}
                      />
                    </td>

                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            const utility = data.find((u) => u.id === row.judgeId);
                            if (utility) handleView(utility);
                          }}
                          disabled={mutating}
                          className="rounded-lg p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-all duration-150 disabled:opacity-40"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            const utility = data.find((u) => u.id === row.judgeId);
                            if (utility) handleEdit(utility);
                          }}
                          disabled={mutating}
                          className="rounded-lg p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 disabled:opacity-40"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(row.judgeId)}
                          disabled={mutating}
                          className="rounded-lg p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <UtilitiesModal
        isOpen={showModal}
        onClose={handleCloseModal}
        editingUtility={editingItem}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Utility Entry?"
          message="This action cannot be undone. The entry will be permanently removed."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}

      <UtilitiesMemoModal
        isOpen={showMemoModal}
        onClose={() => setShowMemoModal(false)}
        judges={data}
        isConsolidated={true}
        onMemoGenerated={handleMemoGenerated}
      />
    </>
  );
}

// ─── Utility Type Badge ──────────────────────────────────────────────────────

function UtilityTypeBadge({ type }: { type: string }) {
  const normalized = type.toLowerCase();
  
  let style = "bg-stone-100 text-stone-700 border-stone-200";
  if (normalized.includes("internet") || normalized.includes("wifi")) {
    style = "bg-blue-50 text-blue-700 border-blue-200/60";
  } else if (normalized.includes("airtime") || normalized.includes("phone")) {
    style = "bg-purple-50 text-purple-700 border-purple-200/60";
  } else if (normalized.includes("electricity") || normalized.includes("power")) {
    style = "bg-amber-50 text-amber-700 border-amber-200/60";
  } else if (normalized.includes("water")) {
    style = "bg-cyan-50 text-cyan-700 border-cyan-200/60";
  } else if (normalized.includes("fuel")) {
    style = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${style}`}>
      {type}
    </span>
  );
}

// ─── Utility Status Dropdown ─────────────────────────────────────────────────

function UtilityStatusDropdown({
  status,
  onStatusChange,
  disabled,
}: {
  status: UtilityStatus;
  onStatusChange: (status: UtilityStatus) => void;
  disabled?: boolean;
}) {
  const options: UtilityStatus[] = [
    'Awaiting',
    'Awaiting Documentation',
    'Awaiting Funding',
    'In Process',
    'Approved',
    'Paid',
    'Payment NA',
  ];

  const getStatusColor = (s: UtilityStatus): string => {
    const map: Record<UtilityStatus, string> = {
      Awaiting: 'bg-stone-100 text-stone-700 border-stone-200',
      'Awaiting Documentation': 'bg-amber-50 text-amber-700 border-amber-200',
      'Awaiting Funding': 'bg-amber-50 text-amber-700 border-amber-200',
      'In Process': 'bg-blue-50 text-blue-700 border-blue-200',
      Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Paid: 'bg-green-50 text-green-700 border-green-200',
      'Payment NA': 'bg-stone-100 text-stone-500 border-stone-200',
    };
    return map[s] || 'bg-stone-50 text-stone-600 border-stone-200';
  };

  const getStatusIcon = (s: UtilityStatus): React.ReactNode => {
    switch (s) {
      case 'Approved':
      case 'Paid':
        return <CheckCircle className="h-3 w-3" />;
      case 'Awaiting':
      case 'Awaiting Documentation':
      case 'Awaiting Funding':
      case 'In Process':
        return <ClockIcon className="h-3 w-3" />;
      case 'Payment NA':
        return <XCircle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-stone-500">{getStatusIcon(status)}</span>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as UtilityStatus)}
        disabled={disabled}
        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(status)} focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Judge Detail Modal ─────────────────────────────────────────────────────

interface JudgeDetailModalProps {
  judgeName: string;
  utilities: JudgeUtility[];
  onClose: () => void;
  onEdit: () => void;
}

function JudgeDetailModal({ judgeName, utilities, onClose, onEdit }: JudgeDetailModalProps) {
  const totalItems = utilities.reduce((acc, u) => acc + u.items.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a3d1c] text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#1a3d1c]">{judgeName}</h3>
              <p className="text-sm text-stone-500">
                {totalItems} utility item{totalItems !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {totalItems === 0 ? (
            <EmptyState message={`No utility records found for ${judgeName}.`} />
          ) : (
            <div className="space-y-4">
              {utilities.map((utility) => (
                <div
                  key={utility.id}
                  className="rounded-lg border border-stone-200 p-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-stone-700">
                      {utility.items.length} item{utility.items.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-stone-400">
                      {new Date(utility.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {utility.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-800">{item.utility_type}</span>
                          {item.requisition_number && (
                            <span className="text-xs text-stone-400 bg-stone-200 px-1.5 py-0.5 rounded">
                              #{item.requisition_number}
                            </span>
                          )}
                          <span className="text-stone-600">• {formatCurrency(item.amount)}</span>
                          <span className="text-stone-500">• {item.period}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {item.date_received && (
                            <span className="text-stone-400">Received: {formatDate(item.date_received)}</span>
                          )}
                          {item.date_forwarded_dass && (
                            <span className="text-stone-400">Fwd: {formatDate(item.date_forwarded_dass)}</span>
                          )}
                          {item.date_paid && (
                            <span className="text-stone-400">Paid: {formatDate(item.date_paid)}</span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}
                          >
                            {getStatusIcon(item.status)}
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          {totalItems > 0 && (
            <GoldOutlineButton icon={<Edit size={14} />} onClick={onEdit}>
              Edit Utilities
            </GoldOutlineButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const stats = useAppSelector(selectHelpDeskStats);
  const loading = useAppSelector(selectStatsLoading);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          value={stats?.total_records ?? 0}
          label="Total Records"
          sub="Across all modules"
          loading={loading}
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5" />}
          value={stats?.in_progress ?? 0}
          label="In Progress"
          sub="Payments pending"
          loading={loading}
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          value={stats?.visa_active ?? 0}
          label="Visa Active"
          sub="Pending outcome"
          loading={loading}
        />
        <StatCard
          icon={<Stamp className="h-5 w-5" />}
          value={stats?.protocol_pending ?? 0}
          label="Protocol Pending"
          sub="Awaiting review/sign"
          loading={loading}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminHelpdesk: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeTabUI, setActiveTabUI] = useState<HelpDeskTab | 'overview'>('overview');

  const [utilitiesModalOpen, setUtilitiesModalOpen] = useState(false);
  const [editingUtility, setEditingUtility] = useState<JudgeUtility | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedJudgeForDetail, setSelectedJudgeForDetail] = useState<string | null>(null);

  // ─── Use utilities from utilities slice ──────────────────────────────────
  const utilities = useAppSelector(selectAllUtilitiesFromSlice);

  const handleViewJudge = (judgeName: string) => {
    setSelectedJudgeForDetail(judgeName);
    setDetailModalOpen(true);
  };

  const handleEditUtility = (judgeName: string) => {
    const utility = utilities.find((u) => u.judge_name === judgeName);
    if (utility) {
      setEditingUtility(utility);
      setUtilitiesModalOpen(true);
      setDetailModalOpen(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedJudgeForDetail(null);
  };

  const closeUtilitiesModal = () => {
    setUtilitiesModalOpen(false);
    setEditingUtility(null);
  };

  useEffect(() => {
    dispatch(fetchHelpDeskStats());
    dispatch(fetchHelpDeskAudit(50));
    dispatch(fetchUtilities({}));
    dispatch(fetchClubMemberships({}));
    dispatch(fetchCircuits({}));
    dispatch(fetchOtherPayments({}));
    dispatch(fetchBenches({}));
    dispatch(fetchPartHeards({}));
    dispatch(fetchServiceWeeks({}));
    dispatch(fetchMedicalClaims({}));
    dispatch(fetchGeneralRequests({}));
    dispatch(fetchVisaRequests({}));
    dispatch(fetchProtocolEvents({}));
  }, [dispatch]);

  const tabs: TabDef[] = [
    { key: 'utilities', label: 'Utilities', icon: <Wallet className="h-3.5 w-3.5" /> },
    { key: 'club', label: 'Club', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'circuits', label: 'Circuits', icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: 'otherPayments', label: 'Other Payments', icon: <CreditCard className="h-3.5 w-3.5" /> },
    { key: 'benches', label: 'Benches', icon: <Gavel className="h-3.5 w-3.5" /> },
    { key: 'partHeard', label: 'Part-Heards', icon: <FileCheck className="h-3.5 w-3.5" /> },
    { key: 'serviceWeek', label: 'Service Week', icon: <Calendar className="h-3.5 w-3.5" /> },
    { key: 'medicalClaims', label: 'Medical Claims', icon: <Stethoscope className="h-3.5 w-3.5" /> },
    { key: 'generalRequests', label: 'General Requests', icon: <FileText className="h-3.5 w-3.5" /> },
    { key: 'visa', label: 'Visa', icon: <Plane className="h-3.5 w-3.5" /> },
    { key: 'protocol', label: 'Protocol', icon: <Calendar className="h-3.5 w-3.5" /> },
  ];

  const allTabs: TabDef[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
    ...tabs,
  ];

  const handleTabChange = (tabKey: HelpDeskTab | 'overview') => {
    setActiveTabUI(tabKey);
    if (tabKey !== 'overview') {
      dispatch(setActiveTab(tabKey));
    }
  };

  const judgeUtilities = selectedJudgeForDetail
    ? utilities.filter((u) => u.judge_name === selectedJudgeForDetail)
    : [];

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Help Desk</h1>
            <p className="text-sm text-stone-500">Manage support requests and operations</p>
          </div>
          <span className="text-xs text-stone-400">Last updated: {new Date().toLocaleString()}</span>
        </div>

        <ErrorBanner />
        <SuccessBanner />

        <div className="mb-4 rounded-xl border border-[#c9a84c]/40 bg-[#1a3d1c]/[0.03] px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold text-[#1a3d1c]">Help Desk Team</span>
            <span className="text-stone-500"> — Full management access</span>
          </p>
          <p className="text-xs text-stone-500">Add, edit, and manage all help desk records across all modules.</p>
        </div>

        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1">
          {allTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTabUI === t.key ? 'bg-[#1a3d1c] text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          {activeTabUI === 'overview' && <OverviewTab />}
          {activeTabUI === 'utilities' && <UtilitiesTab onViewJudge={handleViewJudge} />}
          {activeTabUI === 'club' && <ClubTab />}
          {activeTabUI === 'circuits' && <CircuitsTab />}
          {activeTabUI === 'otherPayments' && <OtherPaymentsTab />}
          {activeTabUI === 'benches' && <BenchesTab />}
          {activeTabUI === 'partHeard' && <PartHeardTab />}
          {activeTabUI === 'serviceWeek' && <ServiceWeekTab />}
          {activeTabUI === 'medicalClaims' && <MedicalClaimsTab />}
          {activeTabUI === 'generalRequests' && <GeneralRequestsTab />}
          {activeTabUI === 'visa' && <VisaTab />}
          {activeTabUI === 'protocol' && <ProtocolTab />}
        </div>
      </div>

      {detailModalOpen && selectedJudgeForDetail && (
        <JudgeDetailModal
          judgeName={selectedJudgeForDetail}
          utilities={judgeUtilities}
          onClose={closeDetailModal}
          onEdit={() => handleEditUtility(selectedJudgeForDetail)}
        />
      )}

      <UtilitiesModal
        isOpen={utilitiesModalOpen}
        onClose={closeUtilitiesModal}
        editingUtility={editingUtility}
      />
    </div>
  );
};

export default SuperAdminHelpdesk;