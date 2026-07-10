import React, { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  // Actions
  fetchHelpDeskStats,
  fetchHelpDeskAudit,
  fetchUtilities,
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
  deleteUtility,
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
  updateUtilityItem,
  // Selectors
  selectHelpDeskStats,
  selectHelpDeskAudit,
  selectAllUtilities,
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
  selectAuditLoading,
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
  type JudgeUtility,
  type UtilityStatus,
} from '../../store/slices/helpdeskSlice';

// ─── Helpdesk Documents imports ───────────────────────────────────────────────
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
} from '../../store/slices/helpdeskDocumentsSlice';

import {
  BarChart3,
  Clock3,
  Stamp,
  ShieldCheck,
  Plus,
  FileSpreadsheet,
  FileText,
  Pencil,
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
  User,
  CreditCard,
  Stethoscope,
  Paperclip,
  Upload,
  ExternalLink,
  Send,
} from 'lucide-react';
import CircuitModal from '../../components/modals/CircuitModal';
import UtilitiesModal, { UtilitiesMemoModal } from '../../components/modals/UtilitiesModal';
import { ProtocolModal } from '../../components/modals/ProtocolModal';
import { VisaModal } from '../../components/modals/VisaModal';
import { RequestModal } from '../../components/modals/RequestModal';
import ClubModal from '../../components/Layout/ClubModal';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Document helpers ─────────────────────────────────────────────────────────

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

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const stats = useAppSelector(selectHelpDeskStats);
  const loading = useAppSelector(selectStatsLoading);
  const auditLog = useAppSelector(selectHelpDeskAudit);
  const auditLoading = useAppSelector(selectAuditLoading);

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

      <Panel
        title="Recent Activity"
        icon={<Pencil className="h-4 w-4" />}
        action={<span className="text-xs text-stone-400">Last 10 actions</span>}
        loading={auditLoading}
      >
        {auditLog.length === 0 ? (
          <EmptyState message="No recent activity." />
        ) : (
          <div className="space-y-2">
            {auditLog.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-4 rounded-lg border border-stone-100 px-3 py-2.5 hover:bg-stone-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-700">
                    <span className="font-medium text-stone-900">{entry.actor_name || 'System'}</span>
                    {' — '}{entry.action}
                  </p>
                  {entry.detail && <p className="text-xs text-stone-400 mt-0.5">{entry.detail}</p>}
                </div>
                <span className="shrink-0 text-xs text-stone-400">
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ─── Utilities Tab ───────────────────────────────────────────────────────────

function UtilitiesTab({
  onViewJudge,
}: {
  onViewJudge?: (judgeName: string) => void;
}) {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllUtilities);
  const loading = useAppSelector((state) => state.helpdesk.loading.utilities);
  const mutating = useAppSelector(selectHelpDeskMutating);

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

  return (
    <>
      <Panel
        title="Judge Utilities"
        icon={<Wallet className="h-4 w-4" />}
        action={
          <div className="flex gap-2">
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
        <TableWithActions
          data={data}
          loading={loading}
          columns={[
            { key: 'judge_name', label: 'Judge' },
            { key: 'requisition', label: 'Requisition #' },
            { key: 'utility_type', label: 'Type' },
            { key: 'amount', label: 'Amount', align: 'right' },
            { key: 'period', label: 'Period' },
            { key: 'status', label: 'Status', align: 'center' },
          ]}
          renderRow={(utility: JudgeUtility) => {
            const firstItem = utility.items?.[0];
            return (
              <>
                <td className="px-3 py-2 font-medium text-stone-800">{utility.judge_name}</td>
                <td className="px-3 py-2 text-stone-600">
                  {firstItem?.requisition_number || '—'}
                </td>
                <td className="px-3 py-2 text-stone-600">
                  {firstItem?.utility_type || '—'}
                </td>
                <td className="px-3 py-2 text-right text-stone-600">
                  {firstItem ? formatCurrency(firstItem.amount) : '—'}
                </td>
                <td className="px-3 py-2 text-stone-600">
                  {firstItem?.period || '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {firstItem ? (
                    <UtilityStatusDropdown
                      status={firstItem.status}
                      onStatusChange={(s) => handleStatusChange(utility.id, firstItem.id, s)}
                      disabled={mutating}
                    />
                  ) : (
                    <span className="text-xs text-stone-400">No items</span>
                  )}
                </td>
              </>
            );
          }}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTarget(id)}
          mutating={mutating}
          onView={handleView}
        />
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
      />
    </>
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
          extraActions={(item: ClubMembership) => (
            <button
              onClick={() => console.log('View club:', item)}
              disabled={mutating}
              className="rounded p-1 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              title="View Details"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
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

  return (
    <>
      <DSATab
        title="Circuits"
        icon={<MapPin className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'name', label: 'Circuit' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: Circuit) => (
          <>
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
        )}
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
        <CircuitDetailModal
          item={selectedItem}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedItem);
          }}
          onStatusChange={handleStatusChange}
          mutating={mutating}
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

// ─── Circuit Detail Modal (with document support) ─────────────────────────────

interface CircuitDetailModalProps {
  item: Circuit;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: Status) => void;
  mutating: boolean;
}

function CircuitDetailModal({ item, onClose, onEdit, onStatusChange, mutating }: CircuitDetailModalProps) {
  const dispatch = useAppDispatch();
  const allDocs = useAppSelector(selectAllHelpdeskDocuments);
  const docs = allDocs.filter(
    (d) => d.entity_type === 'circuit' && d.entity_id === item.id
  );
  const documentsLoading = useAppSelector((state) => state.helpdeskDocuments.loading.fetch);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);

  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current user role – adjust from your auth store
  const currentUserRole: 'dept_head' | 'super_admin' | 'staff' = 'dept_head';

  useEffect(() => {
    dispatch(fetchHelpdeskDocuments({ entity_type: 'circuit', entity_id: item.id }));
  }, [dispatch, item.id]);

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
          ref: `CIRC/${item.id.slice(0, 8)}`,
          subject: `Memo for ${item.name}`,
          entity_type: 'circuit',
          entity_id: item.id,
          format,
        })
      ).unwrap();
      toast.success('Document attached to this circuit.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'circuit', entity_id: item.id }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to attach document.');
    } finally {
      e.target.value = '';
    }
  };

  const handleLinkExisting = async (docId: string) => {
    try {
      await dispatch(linkHelpdeskDocument({ id: docId, entity_type: 'circuit', entity_id: item.id })).unwrap();
      toast.success('Document linked to this circuit.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: 'circuit', entity_id: item.id }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  };

  const handleSendForApproval = async (docId: string) => {
    try {
      await dispatch(submitForApproval({ id: docId })).unwrap();
      toast.success('Document sent to the super admin for approval.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'circuit', entity_id: item.id }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit for approval.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1a3d1c]">{item.name}</h3>
            {item.location && (
              <p className="text-sm text-stone-500 flex items-center gap-1">
                <MapPin size={14} />
                {item.location}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {/* ─── Basic Info ──────────────────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-stone-50 p-4">
            <div>
              <p className="text-xs text-stone-400">Status</p>
              <div className="mt-1">
                <StatusDropdown
                  status={item.status}
                  onStatusChange={(s) => onStatusChange(item.id, s)}
                  disabled={mutating}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-stone-400">Total DSA</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(item.total_dsa)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Period</p>
              <p className="text-sm font-medium text-stone-800">
                {formatDate(item.start_date)} — {formatDate(item.end_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Members</p>
              <p className="text-sm font-medium text-stone-800">
                {item.dsa_details?.length || 0} judges
              </p>
            </div>
          </div>

          {/* ─── DSA Details ────────────────────────────────────────────── */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-stone-800 flex items-center gap-2">
              <Users size={16} className="text-[#c9a84c]" />
              DSA Details
              <span className="text-xs font-normal text-stone-400">
                ({item.dsa_details?.length || 0} members)
              </span>
            </h4>

            {!item.dsa_details || item.dsa_details.length === 0 ? (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-8 text-center">
                <p className="text-sm text-stone-400">No DSA details available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-stone-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50">
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-stone-500">#</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-stone-500">Particulars</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-stone-500">PJ Number</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-stone-500">Designation</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-stone-500">Rate (KES)</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-stone-500">Days</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-stone-500">Total (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {item.dsa_details.map((detail, index) => (
                      <tr key={detail.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-2 text-center text-stone-400">{index + 1}</td>
                        <td className="px-4 py-2 font-medium text-stone-800">{detail.judge_name}</td>
                        <td className="px-4 py-2 text-stone-600">{detail.pj_number}</td>
                        <td className="px-4 py-2 text-stone-600">{detail.designation || '—'}</td>
                        <td className="px-4 py-2 text-right text-stone-600">
                          {detail.dsa_per_day.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-stone-600">{detail.days}</td>
                        <td className="px-4 py-2 text-right font-medium text-emerald-700">
                          {detail.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-200 bg-stone-50">
                      <td colSpan={6} className="px-4 py-3 text-right font-bold text-stone-800">
                        Grand Total
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {formatCurrency(item.total_dsa)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ─── Document Section ─────────────────────────────────────────────── */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">Supporting Document</h3>
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
              <div className="mt-2 rounded-lg border border-stone-200 bg-white p-2">
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
              <p className="mt-2 text-xs text-stone-400 italic">Checking for an attached document…</p>
            ) : docs.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-400">
                No document attached yet. Generate one from the memo step when editing this circuit, link an existing one, or attach a file here.
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
                      {doc.status === 'draft' && currentUserRole === 'dept_head' && (
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

          <div className="mt-6 border-t border-stone-100 pt-4">
            <div className="grid grid-cols-2 gap-2 text-xs text-stone-400">
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(item.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Updated:</span>{' '}
                {new Date(item.updated_at).toLocaleString()}
              </div>
              <div className="col-span-2">
                <span className="font-medium">ID:</span> {item.id}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <GoldOutlineButton icon={<Edit size={14} />} onClick={onEdit}>
            Edit Circuit
          </GoldOutlineButton>
        </div>
      </div>
    </div>
  );
}

// ─── Other Payments Tab ──────────────────────────────────────────────────────

function OtherPaymentsTab() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectAllOtherPayments);
  const loading = useAppSelector((state) => state.helpdesk.loading.otherPayments);
  const mutating = useAppSelector(selectHelpDeskMutating);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<OtherPayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: OtherPayment) => {
    setEditingItem(item);
    setShowModal(true);
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

  return (
    <>
      <DSATab
        title="Other Payments"
        icon={<CreditCard className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'name', label: 'Payment' },
          { key: 'description', label: 'Description' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: OtherPayment) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.name}</td>
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
        )}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget(id)}
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
  const [editingItem, setEditingItem] = useState<SpecialBench | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: SpecialBench) => {
    setEditingItem(item);
    setShowModal(true);
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

  return (
    <>
      <DSATab
        title="Special Benches"
        icon={<Gavel className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'name', label: 'Bench / Case' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: SpecialBench) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.name}</td>
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
        )}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget(id)}
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
  const [editingItem, setEditingItem] = useState<PartHeard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: PartHeard) => {
    setEditingItem(item);
    setShowModal(true);
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

  return (
    <>
      <DSATab
        title="Part-Heards"
        icon={<FileCheck className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'case_reference', label: 'Reference' },
          { key: 'approved_by', label: 'Approved By' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: PartHeard) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.case_reference}</td>
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
        )}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget(id)}
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
  const [editingItem, setEditingItem] = useState<ServiceWeek | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: ServiceWeek) => {
    setEditingItem(item);
    setShowModal(true);
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

  return (
    <>
      <DSATab
        title="Service Week / RRI"
        icon={<Calendar className="h-4 w-4" />}
        data={data}
        loading={loading}
        mutating={mutating}
        columns={[
          { key: 'name', label: 'Week Name' },
          { key: 'week_number', label: 'Week #' },
          { key: 'year', label: 'Year' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item: ServiceWeek) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.name}</td>
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
        )}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTarget(id)}
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
  const [editingItem, setEditingItem] = useState<MedicalClaim | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: MedicalClaim) => {
    setEditingItem(item);
    setShowModal(true);
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
              <td className="px-3 py-2 font-medium text-stone-800">{item.officer_name}</td>
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
  const [editingItem, setEditingItem] = useState<GeneralRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: GeneralRequest) => {
    setEditingItem(item);
    setShowModal(true);
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
        title="General Requests"
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
              <td className="px-3 py-2 font-medium text-stone-800">{item.judge_name}</td>
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
  const [editingItem, setEditingItem] = useState<VisaRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: VisaRequest) => {
    setEditingItem(item);
    setShowModal(true);
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
              <td className="px-3 py-2 font-medium text-stone-800">{item.name}</td>
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
  const [editingItem, setEditingItem] = useState<ProtocolEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: ProtocolEvent) => {
    setEditingItem(item);
    setShowModal(true);
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
              <td className="px-3 py-2 font-medium text-stone-800">{item.activity}</td>
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
          onView={(item) => {
            console.log('View protocol:', item);
          }}
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

// ─── Main Component ───────────────────────────────────────────────────────────

const Helpdesk: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeTabUI, setActiveTabUI] = useState<HelpDeskTab | 'overview'>('overview');

  const [utilitiesModalOpen, setUtilitiesModalOpen] = useState(false);
  const [editingUtility, setEditingUtility] = useState<JudgeUtility | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedJudgeForDetail, setSelectedJudgeForDetail] = useState<string | null>(null);

  const utilities = useAppSelector(selectAllUtilities);

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

export default Helpdesk;