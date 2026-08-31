import React, { useState, useEffect, useRef, type ChangeEvent, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createUtility,
  addUtilityItem,
  updateUtilityItem,
  deleteUtilityItem,
  deleteUtility,
  fetchUtilities,
  fetchUtilityByPjNumber,
  updateUtility,
  type UtilityType,
  type UtilityStatus,
  type UtilityItem,
  type JudgeUtility,
  type AddUtilityItemInput,
  type UpdateUtilityInput,
} from '../../store/slices/utilitiesSlice';
import {
  fetchHelpdeskDocuments,
  uploadHelpdeskDocument,
  linkHelpdeskDocument,
  internalApproveDocument,
  sendBackToRequester,
  selectAllHelpdeskDocuments,
  selectDocumentsUploading,
  selectDocumentActionLoading,
  selectUnlinkedHelpdeskDocuments,
  selectDocumentLinking,
  type DocumentFormat,
  type DocumentStatus,
  type DocumentEntityType,
  type HelpdeskDocument,
} from '../../store/slices/helpdeskDocumentsSlice';
import {
  fetchJudges,
  //searchJudges,
  selectAllJudges,
  selectJudgesLoading,
} from '../../store/slices/JudgesSlice';
import {
  getConsolidatedMemoEntityId,
  getConsolidatedMemoEntityType,
} from '../../types/helpdesk-documents.types';
import {
  X,
  Loader2,
  Save,
  Plus,
  Trash2,
  Wallet,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  FileClock,
  Banknote,
  FileText,
  ChevronDown,
  Upload,
  Hash,
  Paperclip,
  ExternalLink,
  Send,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import { generateUtilityMemoDocx } from '../../utils/generateUtilityMemoDocx';
import { generateUtilityMemoExcel } from '../../utils/generateUtilityMemoExcel';
import toast, { Toaster } from 'react-hot-toast';
import type { UtilityMemoData } from '../../types/generateUtilityMemoTypes';
import { generateUtilityMemoPdf } from '../../utils/generateUtilityMemoPdf';
import type { Judge } from '../../types/judges.types';

// ─── Constants ──────────────────────────────────────────────────────────────

const UTILITY_TYPES: UtilityType[] = ['Electricity', 'Water', 'Internet', 'Fuel', 'Other'];

const UTILITY_STATUSES: UtilityStatus[] = [
  'Awaiting',
  'Awaiting Documentation',
  'Awaiting Funding',
  'In Process',
  'Approved',
  'Paid',
  'Payment NA',
];

const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1784363826/ORHC_L_crclut.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

// Hoisted to module scope
const FUEL_MEMO_BODY = `I hereby forward the fuel bill refund claims for the Judges listed below, together with the requisite supporting documentation for processing and reimbursement.\n\nPlease note that these claims, along with the accompanying documentation, had been submitted earlier for processing. However, the claims appear to have stalled within the processing chain and remain outstanding to date.\n\nThis memo therefore serves as a resubmission of the pending claims to facilitate their review and expeditious processing. Kindly accord the matter the necessary attention and take the appropriate action to ensure reimbursement is affected.`;

const UTILITY_MEMO_BODY = `I hereby forward the utility bill refund claims for the Judges listed below, together with the requisite supporting documentation for processing and reimbursement.`;

// ─── Helper Functions ──────────────────────────────────────────────────────

const formatDateForAPI = (dateString: string): string | undefined => {
  if (!dateString) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
};

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

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]';

const smallInputClasses =
  'w-full rounded border border-stone-200 px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none';

function GoldButton({
  children,
  icon,
  type = 'button',
  disabled,
  onClick,
  size = 'default',
  variant = 'default',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'default';
  variant?: 'default' | 'danger' | 'success' | 'outline';
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

function GhostButton({
  children,
  icon,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
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
}

function StatusBadge({ status }: { status: UtilityStatus }) {
  const styles: Record<UtilityStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    Awaiting: { bg: 'bg-stone-100', text: 'text-stone-700', icon: <ClockIcon size={12} className="text-stone-500" /> },
    'Awaiting Documentation': { bg: 'bg-amber-50', text: 'text-amber-700', icon: <FileClock size={12} className="text-amber-500" /> },
    'Awaiting Funding': { bg: 'bg-amber-50', text: 'text-amber-700', icon: <FileClock size={12} className="text-amber-500" /> },
    'In Process': { bg: 'bg-blue-50', text: 'text-blue-700', icon: <ClockIcon size={12} className="text-blue-500" /> },
    Approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle size={12} className="text-emerald-500" /> },
    Paid: { bg: 'bg-green-50', text: 'text-green-700', icon: <Banknote size={12} className="text-green-500" /> },
    'Payment NA': { bg: 'bg-stone-100', text: 'text-stone-500', icon: <XCircle size={12} className="text-stone-400" /> },
  };
  const style = styles[status] || styles.Awaiting;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.icon}
      {status}
    </span>
  );
}

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

// ─── Item Form State ──────────────────────────────────────────────────────

interface UtilityItemFormState {
  id: string | null;
  utility_type: UtilityType;
  requisition_number: string;
  amount: number;
  period: string;
  description: string;
  date_received: string;
  date_forwarded_dass: string;
  date_paid: string;
  status: UtilityStatus;
}

function buildEmptyItem(): UtilityItemFormState {
  return {
    id: null,
    utility_type: 'Electricity',
    requisition_number: '',
    amount: 0,
    period: '',
    description: '',
    date_received: '',
    date_forwarded_dass: '',
    date_paid: '',
    status: 'Awaiting',
  };
}

function itemToFormState(item: UtilityItem): UtilityItemFormState {
  return {
    id: item.id,
    utility_type: item.utility_type,
    requisition_number: item.requisition_number ?? '',
    amount: item.amount,
    period: item.period,
    description: item.description ?? '',
    date_received: item.date_received ?? '',
    date_forwarded_dass: item.date_forwarded_dass ?? '',
    date_paid: item.date_paid ?? '',
    status: item.status,
  };
}

function buildInitialItems(utility?: JudgeUtility | null): UtilityItemFormState[] {
  if (utility && utility.items.length > 0) {
    return utility.items.map(itemToFormState);
  }
  return [buildEmptyItem()];
}

function isItemFilled(item: UtilityItemFormState): boolean {
  return !!item.period.trim() && item.amount > 0;
}

// ─── Utility Item Row ──────────────────────────────────────────────────────

interface UtilityItemRowProps {
  item: UtilityItemFormState;
  index: number;
  isEditing: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  onChange: (index: number, field: keyof UtilityItemFormState, value: string | number) => void;
  onSave?: (index: number) => void;
  onDelete?: (index: number) => void;
  onRemove?: (index: number) => void;
  canRemove?: boolean;
}

const UtilityItemRow: React.FC<UtilityItemRowProps> = ({
  item,
  index,
  isEditing,
  isDirty,
  isSaving,
  isDeleting,
  onChange,
  onSave,
  onDelete,
  onRemove,
  canRemove,
}) => {
  const handleChange = (field: keyof UtilityItemFormState, value: string | number) => {
    onChange(index, field, value);
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={item.utility_type}
            onChange={(e) => handleChange('utility_type', e.target.value as UtilityType)}
            className={`${smallInputClasses} w-32 bg-white font-medium`}
          >
            {UTILITY_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <StatusBadge status={item.status} />
          {isEditing && isDirty && (
            <span className="text-xs text-amber-600">• Unsaved</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isEditing && onSave && (
            <button
              onClick={() => onSave(index)}
              disabled={isSaving || isDeleting || !isDirty}
              title="Save changes"
              className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            </button>
          )}
          {isEditing && onDelete && (
            <button
              onClick={() => onDelete(index)}
              disabled={isSaving || isDeleting}
              title="Delete item"
              className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
          {!isEditing && onRemove && (
            <button
              onClick={() => onRemove(index)}
              disabled={!canRemove}
              className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <FieldLabel>Requisition Number</FieldLabel>
        <div className="relative">
          <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={item.requisition_number}
            onChange={(e) => handleChange('requisition_number', e.target.value)}
            placeholder="e.g. REQ-2026-001"
            className={`${smallInputClasses} pl-8`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel required>Amount (KES)</FieldLabel>
          <input
            type="number"
            min={0}
            step={0.01}
            value={item.amount || ''}
            onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className={smallInputClasses}
          />
        </div>
        <div>
          <FieldLabel required>Period / Reference</FieldLabel>
          <input
            type="text"
            value={item.period}
            onChange={(e) => handleChange('period', e.target.value)}
            placeholder="e.g. May 2026"
            className={smallInputClasses}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <FieldLabel>Date Received</FieldLabel>
          <input
            type="date"
            value={item.date_received}
            onChange={(e) => handleChange('date_received', e.target.value)}
            className={smallInputClasses}
          />
        </div>
        <div>
          <FieldLabel>Fwd to DASS</FieldLabel>
          <input
            type="date"
            value={item.date_forwarded_dass}
            onChange={(e) => handleChange('date_forwarded_dass', e.target.value)}
            className={smallInputClasses}
          />
        </div>
        <div>
          <FieldLabel>Date Paid</FieldLabel>
          <input
            type="date"
            value={item.date_paid}
            onChange={(e) => handleChange('date_paid', e.target.value)}
            className={smallInputClasses}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Status</FieldLabel>
          <select
            value={item.status}
            onChange={(e) => handleChange('status', e.target.value as UtilityStatus)}
            className={`${smallInputClasses} bg-white`}
          >
            {UTILITY_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <input
            type="text"
            value={item.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional notes"
            className={smallInputClasses}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Memo Modal ──────────────────────────────────────────────────────────

interface JudgeTotals {
  judge_name: string;
  pj_number?: string | null;
  kplc: number;
  water: number;
  wifi: number;
  fuel: number;
  other: number;
  total: number;
}

interface HiddenSentItem {
  judge_name: string;
  item_id: string;
  utility_type: UtilityType;
  amount: number;
  period: string;
  document_status: DocumentStatus;
  document_ref: string;
  document_id: string;
}

interface TotalsResult {
  rows: JudgeTotals[];
  includedItemIds: string[];
  includedItemIdsByJudge: Record<string, string[]>;
  hiddenSentItems: HiddenSentItem[];
}

// ─── Check if an item has an approved document ────────────────────────────
function hasApprovedDocument(
  item: UtilityItem,
  approvedDocumentIds: Set<string>
): boolean {
  if (!item.last_document_id) return false;
  return approvedDocumentIds.has(item.last_document_id);
}

// ─── Check if an item has a pending document ──────────────────────────────
function hasPendingDocument(
  item: UtilityItem,
  allDocuments: HelpdeskDocument[]
): boolean {
  if (!item.last_document_id) return false;
  const doc = allDocuments.find(d => d.id === item.last_document_id);
  return doc?.status === 'pending_approval' || doc?.requester_status === 'pending_approval';
}

// ─── Get document info for an item ────────────────────────────────────────
function getDocumentInfoForItem(
  item: UtilityItem,
  allDocuments: HelpdeskDocument[]
): { document_id: string; document_status: DocumentStatus; document_ref: string } | null {
  if (!item.last_document_id) return null;
  const doc = allDocuments.find(d => d.id === item.last_document_id);
  if (!doc) return null;
  return {
    document_id: doc.id,
    document_status: doc.status || doc.requester_status,
    document_ref: doc.ref,
  };
}

function computeFuelTotals(
  judges: JudgeUtility[],
  allDocuments: HelpdeskDocument[],
  approvedDocumentIds: Set<string>,
  manualIncludeIds: Set<string>,
): TotalsResult {
  const includedItemIds: string[] = [];
  const includedItemIdsByJudge: Record<string, string[]> = {};
  const hiddenSentItems: HiddenSentItem[] = [];

  const rows = judges
    .map((j) => {
      let fuel = 0;
      const itemIdsForJudge: string[] = [];
      j.items.forEach((item) => {
        if (item.utility_type !== 'Fuel' || item.status !== 'Awaiting') return;

        const isApproved = hasApprovedDocument(item, approvedDocumentIds);
        const docInfo = getDocumentInfoForItem(item, allDocuments);

        if (isApproved && !manualIncludeIds.has(item.id) && docInfo) {
          hiddenSentItems.push({
            judge_name: j.judge_name,
            item_id: item.id,
            utility_type: item.utility_type,
            amount: item.amount,
            period: item.period,
            document_status: docInfo.document_status,
            document_ref: docInfo.document_ref,
            document_id: docInfo.document_id,
          });
          return;
        }

        if (hasPendingDocument(item, allDocuments)) {
          return;
        }

        fuel += item.amount;
        includedItemIds.push(item.id);
        itemIdsForJudge.push(item.id);
      });
      includedItemIdsByJudge[j.judge_name] = itemIdsForJudge;
      return {
        judge_name: j.judge_name,
        pj_number: j.pj_number ?? undefined,
        kplc: 0,
        water: 0,
        wifi: 0,
        fuel,
        other: 0,
        total: fuel,
      };
    })
    .filter((row) => row.fuel > 0)
    .sort((a, b) => a.judge_name.localeCompare(b.judge_name));

  return { rows, includedItemIds, includedItemIdsByJudge, hiddenSentItems };
}

function computeNonFuelTotals(
  judges: JudgeUtility[],
  allDocuments: HelpdeskDocument[],
  approvedDocumentIds: Set<string>,
  manualIncludeIds: Set<string>,
): TotalsResult {
  const includedItemIds: string[] = [];
  const includedItemIdsByJudge: Record<string, string[]> = {};
  const hiddenSentItems: HiddenSentItem[] = [];

  const rows = judges
    .map((j) => {
      let kplc = 0,
        water = 0,
        wifi = 0;
      const itemIdsForJudge: string[] = [];
      j.items.forEach((item) => {
        if (item.status !== 'Awaiting') return;
        if (!['Electricity', 'Water', 'Internet'].includes(item.utility_type)) return;

        const isApproved = hasApprovedDocument(item, approvedDocumentIds);
        const docInfo = getDocumentInfoForItem(item, allDocuments);

        if (isApproved && !manualIncludeIds.has(item.id) && docInfo) {
          hiddenSentItems.push({
            judge_name: j.judge_name,
            item_id: item.id,
            utility_type: item.utility_type,
            amount: item.amount,
            period: item.period,
            document_status: docInfo.document_status,
            document_ref: docInfo.document_ref,
            document_id: docInfo.document_id,
          });
          return;
        }

        if (hasPendingDocument(item, allDocuments)) {
          return;
        }

        switch (item.utility_type) {
          case 'Electricity':
            kplc += item.amount;
            break;
          case 'Water':
            water += item.amount;
            break;
          case 'Internet':
            wifi += item.amount;
            break;
          default:
            break;
        }
        includedItemIds.push(item.id);
        itemIdsForJudge.push(item.id);
      });
      includedItemIdsByJudge[j.judge_name] = itemIdsForJudge;
      const total = kplc + water + wifi;
      return {
        judge_name: j.judge_name,
        pj_number: j.pj_number ?? undefined,
        kplc,
        water,
        wifi,
        fuel: 0,
        other: 0,
        total,
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => a.judge_name.localeCompare(b.judge_name));

  return { rows, includedItemIds, includedItemIdsByJudge, hiddenSentItems };
}

interface MemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  judges: JudgeUtility[];
  onMemoGenerated: (docId: string) => void;
  entityId?: string;
  isConsolidated?: boolean;
  entityType?: DocumentEntityType;
  entityIdOverride?: string;
  allJudgesForConsolidated?: JudgeUtility[];
}

type DownloadFormat = 'docx' | 'pdf' | 'xlsx';

const MemoModal: React.FC<MemoModalProps> = ({
  isOpen,
  onClose,
  judges,
  onMemoGenerated,
  entityId,
  isConsolidated = false,
  entityType: propEntityType,
  entityIdOverride: propEntityId,
  allJudgesForConsolidated,
}) => {
  const dispatch = useAppDispatch();

  const allDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const documentsLoading = useAppSelector((state) => state.helpdeskDocuments.loading.fetch);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'all' | 'fuel'>('all');
  const [manualIncludeIds, setManualIncludeIds] = useState<Set<string>>(new Set());
  const [showSentPanel, setShowSentPanel] = useState(false);
  const [excludedJudgeNames, setExcludedJudgeNames] = useState<Set<string>>(new Set());
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // ─── Memo field state ──────────────────────────────────────────────────
  const [toField, setToField] = useState('DEPUTY DIRECTOR - DASS');
  const [fromField, setFromField] = useState('OFFICE OF THE REGISTRAR');
  const [refField] = useState(() => {
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RHC/UTILITY/${random}`;
  });
  const [dateField, setDateField] = useState(() =>
    new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
  );
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [subjectField, setSubjectField] = useState('UTILITY BILL CLAIMS');
  const [bodyText, setBodyText] = useState(UTILITY_MEMO_BODY);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // ─── Body texts ────────────────────────────────────────────────────────
  const fuelBody = FUEL_MEMO_BODY;
  const utilityBody = UTILITY_MEMO_BODY;

  // ─── Track approved document IDs ──────────────────────────────────────
  const approvedDocumentIds = useMemo(() => {
    const approvedIds = new Set<string>();
    allDocuments.forEach((doc) => {
      if (doc.status === 'approved' || doc.requester_status === 'approved') {
        approvedIds.add(doc.id);
      }
    });
    return approvedIds;
  }, [allDocuments]);

  // ─── Derived values ────────────────────────────────────────────────────
  const effectiveJudges = useMemo(() => {
    if (isConsolidated && allJudgesForConsolidated && allJudgesForConsolidated.length > 0) {
      return allJudgesForConsolidated;
    }
    return judges;
  }, [isConsolidated, allJudgesForConsolidated, judges]);

  const currentEntityType = useMemo(() => {
    if (propEntityType) return propEntityType;
    if (!isConsolidated) return 'utility_memo' as DocumentEntityType;
    return getConsolidatedMemoEntityType(activeTab);
  }, [propEntityType, isConsolidated, activeTab]);

  const currentEntityId = useMemo(() => {
    if (propEntityId) return propEntityId;
    if (!isConsolidated) return entityId;
    return getConsolidatedMemoEntityId(activeTab);
  }, [propEntityId, isConsolidated, entityId, activeTab]);

  // ─── Reset state when modal opens ──────────────────────────────────────
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setManualIncludeIds(new Set());
      setShowSentPanel(false);
      setExcludedJudgeNames(new Set());
    }
  }

  // ─── Fetch documents when modal opens ──────────────────────────────────
  useEffect(() => {
    if (isOpen && currentEntityId) {
      dispatch(fetchHelpdeskDocuments({
        entity_type: currentEntityType,
        entity_id: currentEntityId
      }));
    }
  }, [dispatch, isOpen, currentEntityType, currentEntityId]);

  useEffect(() => {
    if (showLinkPicker) {
      dispatch(fetchHelpdeskDocuments({ unlinked: true }));
    }
  }, [dispatch, showLinkPicker]);

  // ─── Tab change handler ──────────────────────────────────────────────
  const handleTabChange = useCallback((tab: 'all' | 'fuel') => {
    setActiveTab(tab);
    setSubjectField(tab === 'fuel' ? 'FUEL BILL CLAIMS' : 'UTILITY BILL CLAIMS');
    setBodyText(tab === 'fuel' ? fuelBody : utilityBody);
  }, [fuelBody, utilityBody]);

  // ─── Formatting ────────────────────────────────────────────────────────
  const formatAmount = (amount: number) =>
    amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatCurrencyWords = (amount: number): string => {
    const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const numberToWords = (num: number): string => {
      if (num < 20) return words[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + words[num % 10] : '');
      if (num < 1000) return words[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + numberToWords(num % 100) : '');
      if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
      return 'Amount too large';
    };
    const dollars = Math.floor(amount);
    const cents = Math.round((amount - dollars) * 100);
    let result = numberToWords(dollars) + ' Kenya Shillings';
    if (cents > 0) result += ' and ' + numberToWords(cents) + ' Cents';
    return result;
  };

  // ─── Compute totals ────────────────────────────────────────────────────
  const { rows: computedRows, hiddenSentItems } = useMemo(() => {
    return activeTab === 'fuel'
      ? computeFuelTotals(effectiveJudges, allDocuments, approvedDocumentIds, manualIncludeIds)
      : computeNonFuelTotals(effectiveJudges, allDocuments, approvedDocumentIds, manualIncludeIds);
  }, [activeTab, effectiveJudges, allDocuments, approvedDocumentIds, manualIncludeIds]);

  const judgeTotals = useMemo(
    () => computedRows.filter((row) => !excludedJudgeNames.has(row.judge_name)),
    [computedRows, excludedJudgeNames],
  );

  const grandKplc = judgeTotals.reduce((s, r) => s + r.kplc, 0);
  const grandWater = judgeTotals.reduce((s, r) => s + r.water, 0);
  const grandWifi = judgeTotals.reduce((s, r) => s + r.wifi, 0);
  const grandFuel = judgeTotals.reduce((s, r) => s + r.fuel, 0);
  const grandTotal = judgeTotals.reduce((s, r) => s + r.total, 0);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const toggleManualInclude = useCallback((itemId: string, checked: boolean) => {
    setManualIncludeIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const toggleJudgeExclusion = useCallback((judgeName: string) => {
    setExcludedJudgeNames((prev) => {
      const next = new Set(prev);
      if (next.has(judgeName)) next.delete(judgeName);
      else next.add(judgeName);
      return next;
    });
  }, []);

  // ─── Build memo data ────────────────────────────────────────────────────
  const buildMemoData = useCallback((): UtilityMemoData => ({
    to: toField,
    from: fromField,
    ref: refField,
    date: dateField,
    subject: subjectField,
    bodyText: bodyText + (additionalNotes ? `\n\n${additionalNotes}` : ''),
    rows: judgeTotals.map((r) => ({
      judge_name: r.judge_name,
      pj_number: r.pj_number || null,
      kplc: r.kplc,
      water: r.water,
      wifi: r.wifi,
      total: r.total,
    })),
    grandKplc,
    grandWater,
    grandWifi,
    grandTotal,
    amountInWords: formatCurrencyWords(grandTotal),
    crestUrl: JUDICIARY_CREST_SRC,
    footerEmblemUrl: FOOTER_EMBLEM_SRC,
    memoType: activeTab,
    signatoryName: 'REGISTRAR HIGH COURT',
  }), [toField, fromField, refField, dateField, subjectField, bodyText, additionalNotes, judgeTotals, grandKplc, grandWater, grandWifi, grandTotal, activeTab]);

  // ─── Document handlers ──────────────────────────────────────────────────
  const handleAttachDocument = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentEntityId) {
      toast.error('Entity ID is required to attach a document.');
      e.target.value = '';
      return;
    }

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
          ref: refField,
          subject: subjectField,
          entity_type: currentEntityType,
          entity_id: currentEntityId,
          format,
        })
      ).unwrap();
      toast.success('Document attached to this memo.');
      dispatch(fetchHelpdeskDocuments({
        entity_type: currentEntityType,
        entity_id: currentEntityId
      }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to attach document.');
    } finally {
      setUploadingDocument(false);
      e.target.value = '';
    }
  }, [currentEntityId, currentEntityType, refField, subjectField, dispatch]);

  const handleLinkExisting = useCallback(async (docId: string) => {
    if (!currentEntityId) {
      toast.error('Entity ID is required to link a document.');
      return;
    }

    try {
      await dispatch(
        linkHelpdeskDocument({
          id: docId,
          entity_type: currentEntityType,
          entity_id: currentEntityId,
        })
      ).unwrap();
      toast.success('Document linked to this memo.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({
        entity_type: currentEntityType,
        entity_id: currentEntityId
      }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  }, [currentEntityId, currentEntityType, dispatch]);

  const handleSendDocumentForApproval = useCallback(async (docId: string) => {
    try {
      const approvedDoc = await dispatch(internalApproveDocument({
        id: docId,
        action: 'approve',
        comments: 'Document approved via utility memo.',
        generate_e_stamp: true,
      })).unwrap();

      await dispatch(sendBackToRequester({
        id: approvedDoc.id,
        final_status: 'approved',
        comments: 'Document approved and sent back to requester.',
        notify_requester: true,
      })).unwrap();

      toast.success('Document approved and sent back to requester.');
      dispatch(fetchHelpdeskDocuments({
        entity_type: currentEntityType,
        entity_id: currentEntityId
      }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to process document approval.');
    }
  }, [currentEntityType, currentEntityId, dispatch]);

  // ─── Generate memo ─────────────────────────────────────────────────────
  const handleGenerate = useCallback(async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);

    try {
      const memoData = buildMemoData();

      let blob: Blob | null = null;

      switch (format) {
        case 'docx':
          blob = await generateUtilityMemoDocx(memoData);
          break;
        case 'pdf':
          blob = await generateUtilityMemoPdf(memoData);
          break;
        case 'xlsx':
          blob = generateUtilityMemoExcel(memoData);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      if (!blob) {
        throw new Error('Generator returned no blob');
      }

      const filename = `${refField}.${format}`;
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });

      const uploadPayload = {
        blob: file,
        filename,
        ref: refField,
        subject: subjectField,
        entity_type: currentEntityType,
        entity_id: currentEntityId || undefined,
        format: format as DocumentFormat,
      };

      const result = await dispatch(uploadHelpdeskDocument(uploadPayload)).unwrap();

      toast.success(`${format.toUpperCase()} memo saved to the system.`);

      if (!isConsolidated && entityId) {
        try {
          await dispatch(linkHelpdeskDocument({
            id: result.id,
            entity_type: currentEntityType,
            entity_id: entityId,
          })).unwrap();
          toast.success('Memo linked to the judge utility record.');
        } catch (linkErr) {
          console.warn('Saved but failed to link to the judge record:', linkErr);
          toast.error('Memo saved, but could not link it automatically. You can link it manually.');
        }
      } else if (!isConsolidated && !entityId) {
        onMemoGenerated(result.id);
      }

      dispatch(fetchHelpdeskDocuments({
        entity_type: currentEntityType,
        entity_id: currentEntityId
      }));
    } catch (err) {
      console.error(`Failed to generate ${format} memo:`, err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Failed to generate document. Please try again.';
      toast.error(message);
    } finally {
      setDownloadingFormat(null);
    }
  }, [buildMemoData, refField, subjectField, currentEntityType, currentEntityId, isConsolidated, entityId, dispatch, onMemoGenerated]);

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Preparing Word…',
    pdf: 'Preparing PDF…',
    xlsx: 'Preparing Excel…',
  };

  const linkedDocuments = allDocuments.filter(
    (d) => d.entity_type === currentEntityType &&
      d.entity_id === currentEntityId &&
      d.ref === refField
  );

  if (!isOpen) return null;

  const showNonFuelColumns = activeTab === 'all';
  const showFuelColumn = activeTab === 'fuel';

  const modalTitle = isConsolidated
    ? (activeTab === 'fuel' ? 'Consolidated Fuel Memo' : 'Consolidated Utility Memo')
    : (activeTab === 'fuel' ? 'Fuel Memo' : 'Utility Memo');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#1c1917' },
          success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">
            {modalTitle}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        {effectiveJudges.length > 0 && (
          <div className="flex gap-2 border-b border-stone-200 px-4 py-2">
            <button
              onClick={() => handleTabChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${activeTab === 'all'
                  ? 'bg-[#c9a84c] text-[#1a3d1c]'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
            >
              All Utilities
            </button>
            <button
              onClick={() => handleTabChange('fuel')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${activeTab === 'fuel'
                  ? 'bg-[#c9a84c] text-[#1a3d1c]'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
            >
              Fuel Only
            </button>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
          {effectiveJudges.length > 0 ? (
            <div className="border border-stone-300 bg-white p-10 shadow-sm font-sans text-black">
              <div className="flex justify-center mb-2">
                <img
                  src={JUDICIARY_CREST_SRC}
                  alt="Judiciary of Kenya crest"
                  className="h-24 w-auto object-contain"
                />
              </div>
              <div className="text-center mb-1">
                <p className="text-base font-bold uppercase leading-snug tracking-wide text-stone-800">
                  OFFICE OF THE REGISTRAR HIGH COURT
                </p>
              </div>
              <div className="text-center mb-6">
                <p className="text-base font-bold uppercase tracking-wide text-stone-800">
                  INTERNAL MEMO
                </p>
                <hr className="border-t-2 border-black w-full mt-1" />
              </div>

              <div className="space-y-3 text-sm font-bold mb-8">
                <div className="flex">
                  <span className="w-24 shrink-0">FROM</span>
                  <span className="w-4 shrink-0">:</span>
                  <input
                    type="text"
                    value={fromField}
                    onChange={(e) => setFromField(e.target.value)}
                    className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase font-bold"
                    placeholder="Department/Office"
                  />
                </div>
                <div className="flex">
                  <span className="w-24 shrink-0">TO</span>
                  <span className="w-4 shrink-0">:</span>
                  <input type="text" value={toField} onChange={(e) => setToField(e.target.value)}
                    className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase" />
                </div>
                <div className="flex">
                  <span className="w-24 shrink-0">DATE</span>
                  <span className="w-4 shrink-0">:</span>
                  <input type="text" value={dateField} onChange={(e) => setDateField(e.target.value)}
                    className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none" />
                </div>
                <div className="flex border-b-2 border-black pb-3">
                  <span className="w-24 shrink-0">SUBJECT</span>
                  <span className="w-4 shrink-0">:</span>
                  <input type="text" value={subjectField} onChange={(e) => setSubjectField(e.target.value)}
                    className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase" />
                </div>
              </div>

              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={6}
                className="w-full bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none resize-none text-sm leading-relaxed mb-6"
              />

              {hiddenSentItems.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <button
                    onClick={() => setShowSentPanel((v) => !v)}
                    className="flex w-full items-center justify-between text-xs font-medium text-amber-800"
                  >
                    <span>
                      {hiddenSentItems.length} item{hiddenSentItems.length > 1 ? 's' : ''} already approved in a
                      previous memo — hidden from this one
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${showSentPanel ? 'rotate-180' : ''}`} />
                  </button>
                  {showSentPanel && (
                    <ul className="mt-2 divide-y divide-amber-100">
                      {hiddenSentItems.map((h) => (
                        <li key={h.item_id} className="flex items-center justify-between gap-2 py-1.5 text-xs text-amber-900">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={manualIncludeIds.has(h.item_id)}
                              onChange={(e) => toggleManualInclude(h.item_id, e.target.checked)}
                            />
                            {h.judge_name} — {h.utility_type} ({h.period})
                          </label>
                          <span className="text-amber-500">
                            {h.document_ref} ({h.document_status})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-black">
                  <thead>
                    <tr>
                      <th className="border border-black px-2 py-1 text-center text-xs font-bold w-10">
                        <span className="sr-only">Include</span>
                      </th>
                      <th className="border border-black px-2 py-1 text-left text-xs font-bold">S/NO.</th>
                      <th className="border border-black px-2 py-1 text-left text-xs font-bold">NAMES</th>
                      {showNonFuelColumns && (
                        <>
                          <th className="border border-black px-2 py-1 text-right text-xs font-bold">KPLC</th>
                          <th className="border border-black px-2 py-1 text-right text-xs font-bold">WATER</th>
                          <th className="border border-black px-2 py-1 text-right text-xs font-bold">WIFI</th>
                        </>
                      )}
                      {showFuelColumn && (
                        <th className="border border-black px-2 py-1 text-right text-xs font-bold">FUEL</th>
                      )}
                      {showNonFuelColumns && (
                        <th className="border border-black px-2 py-1 text-right text-xs font-bold">TOTAL</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {computedRows.map((row, index) => {
                      const isExcluded = excludedJudgeNames.has(row.judge_name);
                      return (
                        <tr key={row.judge_name} className={isExcluded ? 'opacity-40' : undefined}>
                          <td className="border border-black px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={() => toggleJudgeExclusion(row.judge_name)}
                              title={isExcluded ? 'Excluded from this memo — click to include' : 'Included in this memo — click to exclude'}
                            />
                          </td>
                          <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                          <td className="border border-black px-2 py-1 font-medium">{row.judge_name}</td>
                          {showNonFuelColumns && (
                            <>
                              <td className="border border-black px-2 py-1 text-right">{row.kplc > 0 ? formatAmount(row.kplc) : ''}</td>
                              <td className="border border-black px-2 py-1 text-right">{row.water > 0 ? formatAmount(row.water) : ''}</td>
                              <td className="border border-black px-2 py-1 text-right">{row.wifi > 0 ? formatAmount(row.wifi) : ''}</td>
                            </>
                          )}
                          {showFuelColumn && (
                            <td className="border border-black px-2 py-1 text-right font-medium">{formatAmount(row.fuel)}</td>
                          )}
                          {showNonFuelColumns && (
                            <td className="border border-black px-2 py-1 text-right font-bold">{formatAmount(row.total)}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  {judgeTotals.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={showNonFuelColumns ? 3 : (showFuelColumn ? 3 : 2)} className="border border-black px-2 py-2 text-right font-bold">GRAND TOTAL</td>
                        {showNonFuelColumns && (
                          <>
                            <td className="border border-black px-2 py-2 text-right font-bold">{formatAmount(grandKplc)}</td>
                            <td className="border border-black px-2 py-2 text-right font-bold">{formatAmount(grandWater)}</td>
                            <td className="border border-black px-2 py-2 text-right font-bold">{formatAmount(grandWifi)}</td>
                          </>
                        )}
                        {showFuelColumn && (
                          <td className="border border-black px-2 py-2 text-right font-bold">{formatAmount(grandFuel)}</td>
                        )}
                        {showNonFuelColumns && (
                          <td className="border border-black px-2 py-2 text-right font-bold">{formatAmount(grandTotal)}</td>
                        )}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {computedRows.length === 0 && hiddenSentItems.length > 0 && (
                <p className="mt-3 text-xs text-stone-400 italic">
                  Everything eligible for this memo has already been approved in a previous memo.
                  Expand the panel above to resend specific items if needed.
                </p>
              )}

              {computedRows.length > 0 && judgeTotals.length === 0 && (
                <p className="mt-3 text-xs text-amber-600 italic">
                  Every judge has been excluded from this memo. Check the boxes in the table above to include
                  at least one before saving.
                </p>
              )}

              <div className="mt-6">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Add any additional remarks, clarifications, or instructions..."
                  rows={4}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] resize-y"
                />
                <p className="mt-1 text-[10px] text-stone-400 italic">
                  These notes will appear at the bottom of the memo, above the signature block.
                </p>
              </div>

              <div className="mt-16">
                <p className="text-xs text-stone-400 italic">
                  Signature block will be added by the system when the document is processed.
                </p>
              </div>

              <div className="mt-12 pt-3 border-t border-stone-300 flex items-center justify-between gap-3">
                <img src={FOOTER_EMBLEM_SRC} alt="" className="h-10 w-auto object-contain shrink-0" />
                <div className="text-[10px] leading-tight text-stone-700 text-right">
                  <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
                  <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
                  <p className="mt-1 font-bold text-emerald-800">Justice Be Our Shield and Defender</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
              <p className="text-sm text-stone-500">No judges with utility claims to display.</p>
            </div>
          )}

          {/* Document Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">Supporting Documents</h3>
              <div className="flex gap-2">
                <GhostButton
                  onClick={() => setShowLinkPicker((v) => !v)}
                  icon={<Paperclip size={14} />}
                  disabled={!currentEntityId}
                >
                  Link Existing
                </GhostButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  onChange={handleAttachDocument}
                  className="hidden"
                  disabled={documentsUploading || uploadingDocument || !currentEntityId}
                />
                <GhostButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={documentsUploading || uploadingDocument || !currentEntityId}
                  icon={documentsUploading || uploadingDocument ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                >
                  {documentsUploading || uploadingDocument ? 'Uploading…' : 'Attach Document'}
                </GhostButton>
              </div>
            </div>

            {!currentEntityId && (
              <p className="mt-2 text-[11px] text-stone-400 italic">
                {isConsolidated
                  ? 'Entity ID is being generated automatically.'
                  : 'Attaching and linking documents will be available once this judge utility record has been saved.'}
              </p>
            )}

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
                          disabled={isLinking || !currentEntityId}
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
                No documents attached yet.
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
                      <a href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink size={12} />
                        View
                      </a>
                      {doc.status === 'draft' && (
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-stone-100 px-4 py-3">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={downloadingFormat !== null || judgeTotals.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-[#1a3d1c] hover:bg-[#b8973f] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingFormat ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {downloadLabels[downloadingFormat]}
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Memo
                  <ChevronDown size={12} />
                </>
              )}
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 bottom-full z-20 mb-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => handleGenerate('docx')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                >
                  <FileText size={14} className="text-blue-600" />
                  Word (.docx)
                </button>
                <button
                  onClick={() => handleGenerate('pdf')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                >
                  <FileText size={14} className="text-red-600" />
                  PDF (.pdf)
                </button>
                <button
                  onClick={() => handleGenerate('xlsx')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  Excel (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDownloadMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
      )}
    </div>
  );
};

// ─── Main UtilitiesModal ──────────────────────────────────────────────────

// ─── Main UtilitiesModal ──────────────────────────────────────────────────

interface UtilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUtility?: JudgeUtility | null;
}

export const UtilitiesModal: React.FC<UtilitiesModalProps> = ({
  isOpen,
  onClose,
  editingUtility,
}) => {
  const dispatch = useAppDispatch();

  // ─── Judge Selection State ──────────────────────────────────────────────
  const allJudges = useAppSelector(selectAllJudges);
  const judgesLoading = useAppSelector(selectJudgesLoading);
  const [judgeSearchTerm, setJudgeSearchTerm] = useState('');
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [showJudgeDropdown, setShowJudgeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Form State ──────────────────────────────────────────────────────────
  const [judgeName, setJudgeName] = useState('');
  const [pjNumber, setPjNumber] = useState('');
  const [items, setItems] = useState<UtilityItemFormState[]>(() => [buildEmptyItem()]);

  const isEditing = !!editingUtility;

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | undefined>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingItemIndex, setSavingItemIndex] = useState<number | null>(null);
  const [deletingItemIndex, setDeletingItemIndex] = useState<number | null>(null);
  const [dirtyItemIds, setDirtyItemIds] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<'judge' | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Load judges on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchJudges({ limit: 100, is_active: true }));
    }
  }, [dispatch, isOpen]);

  // ─── Click outside dropdown ─────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowJudgeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Filter judges based on search ──────────────────────────────────────
  const filteredJudges = useMemo(() => {
    if (!judgeSearchTerm.trim()) return allJudges;
    const term = judgeSearchTerm.toLowerCase().trim();
    return allJudges.filter(
      (j) =>
        j.name.toLowerCase().includes(term) ||
        j.pj_number.toLowerCase().includes(term)
    );
  }, [allJudges, judgeSearchTerm]);

  // ─── resetForm function ──────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setJudgeName('');
    setPjNumber('');
    setSelectedJudge(null);
    setJudgeSearchTerm('');
    setItems(buildInitialItems(null));
    setDirtyItemIds(new Set());
    setCurrentStep(1);
    setPendingDocumentId(undefined);
  }, []);

  // ─── populateForm function ──────────────────────────────────────────────
  const populateForm = useCallback((utility: JudgeUtility) => {
    setJudgeName(utility.judge_name ?? '');
    setPjNumber(utility.pj_number ?? '');
    const matchingJudge = allJudges.find(
      (j) => j.pj_number === utility.pj_number || j.name === utility.judge_name
    );
    if (matchingJudge) {
      setSelectedJudge(matchingJudge);
      setJudgeSearchTerm(matchingJudge.name);
    }
    setItems(buildInitialItems(utility));
    setDirtyItemIds(new Set());
    setCurrentStep(1);
    setPendingDocumentId(undefined);
  }, [allJudges]);

  // ─── Sync form state to props ─────────────────────────────────────────
  const syncKey = isOpen ? (editingUtility?.id ?? 'new') : null;
  const [lastSyncedKey, setLastSyncedKey] = useState<string | null>(null);

  if (syncKey !== lastSyncedKey) {
    setLastSyncedKey(syncKey);
    if (syncKey !== null) {
      if (editingUtility) {
        populateForm(editingUtility);
      } else {
        resetForm();
      }
    }
  }

  // ─── Handle judge selection ─────────────────────────────────────────────
  const handleSelectJudge = useCallback((judge: Judge) => {
    setSelectedJudge(judge);
    setJudgeName(judge.name);
    setPjNumber(judge.pj_number);
    setJudgeSearchTerm(judge.name);
    setShowJudgeDropdown(false);
  }, []);

  // ─── Helper to get judges for memo ──────────────────────────────────────
  const getJudgesForMemo = useCallback((): JudgeUtility[] => {
    if (isEditing && editingUtility) {
      return [editingUtility];
    }

    const filledItems = items.filter(isItemFilled);
    if (filledItems.length === 0 || !judgeName.trim()) {
      return [];
    }

    const tempId = `temp-${judgeName.trim().toLowerCase().replace(/\s+/g, '-') || 'judge'}`;

    const tempJudge: JudgeUtility = {
      id: tempId,
      pj_number: pjNumber.trim() || null,
      judge_name: judgeName.trim(),
      created_by: null,
      items: filledItems.map((item, index) => ({
        id: `temp-item-${index}`,
        request_id: '',
        utility_type: item.utility_type,
        requisition_number: item.requisition_number || null,
        amount: item.amount,
        period: item.period,
        description: item.description || null,
        date_received: item.date_received || null,
        date_forwarded_dass: item.date_forwarded_dass || null,
        date_paid: item.date_paid || null,
        status: item.status,
        supporting_document_url: null,
        approval_status: 'pending',
        memo_id: null,
        memo_sent_at: null,
        document_sync_status: 'not_applicable',
        document_synced_at: null,
        document_sync_error: null,
        last_document_id: null,
        last_document_status: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return [tempJudge];
  }, [isEditing, editingUtility, items, judgeName, pjNumber]);

  const handleMemoGenerated = useCallback((docId: string) => {
    setPendingDocumentId(docId);
  }, []);

  const handleAddNewRow = useCallback(() => {
    setItems((prev) => [...prev, buildEmptyItem()]);
  }, []);

  const handleRemoveRow = useCallback((index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, [items.length]);

  const handleRowChange = useCallback((
    index: number,
    field: keyof UtilityItemFormState,
    value: string | number,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    if (isEditing && items[index]?.id) {
      setDirtyItemIds((prev) => new Set(prev).add(items[index].id!));
    }
  }, [isEditing, items]);

  const handleSaveRow = useCallback(async (index: number) => {
    if (!editingUtility) return;
    const item = items[index];
    if (!item.id) return;

    setSavingItemIndex(index);
    try {
      await dispatch(
        updateUtilityItem({
          id: editingUtility.id,
          itemId: item.id,
          updates: {
            status: item.status,
            requisition_number: item.requisition_number.trim() || undefined,
            date_received: formatDateForAPI(item.date_received),
            date_forwarded_dass: formatDateForAPI(item.date_forwarded_dass),
            date_paid: formatDateForAPI(item.date_paid),
            amount: item.amount,
            period: item.period.trim(),
            description: item.description.trim() || undefined,
            utility_type: item.utility_type,
          },
        }),
      ).unwrap();

      setDirtyItemIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id!);
        return next;
      });
      await dispatch(fetchUtilities({}));
      toast.success('Utility item updated successfully.');
    } catch (err) {
      console.error('Failed to update utility item:', err);
      toast.error('Failed to update utility item.');
    } finally {
      setSavingItemIndex(null);
    }
  }, [editingUtility, items, dispatch]);

  const handleDeleteRow = useCallback(async (index: number) => {
    if (!editingUtility) return;
    const item = items[index];
    if (!item.id) return;

    setDeletingItemIndex(index);
    try {
      await dispatch(deleteUtilityItem({ id: editingUtility.id, itemId: item.id })).unwrap();
      setItems((prev) => prev.filter((_, i) => i !== index));
      toast.success('Utility item deleted successfully.');
    } catch (err) {
      console.error('Failed to delete utility item:', err);
      toast.error('Failed to delete utility item.');
    } finally {
      setDeletingItemIndex(null);
    }
  }, [editingUtility, items, dispatch]);

  const handleAddItemToExisting = useCallback(async () => {
    if (!editingUtility) return;

    const utilityPjNumber = editingUtility.pj_number;
    if (!utilityPjNumber || utilityPjNumber.trim() === '') {
      toast.error('PJ number is required to add a utility item. Please update the utility record first.');
      return;
    }

    const newItem = buildEmptyItem();
    setSavingItemIndex(items.length);
    try {
      const addInput: AddUtilityItemInput = {
        pj_number: utilityPjNumber,
        utility_type: newItem.utility_type,
        requisition_number: newItem.requisition_number.trim() || undefined,
        amount: 0,
        period: 'New item',
        status: newItem.status,
      };
      const result = await dispatch(addUtilityItem(addInput)).unwrap();
      setItems(buildInitialItems(result));
      toast.success('New utility item added.');
    } catch (err) {
      console.error('Failed to add utility item:', err);
      toast.error('Failed to add utility item. Please ensure the PJ number is correct.');
    } finally {
      setSavingItemIndex(null);
    }
  }, [editingUtility, items.length, dispatch]);

  const handleNextStep = useCallback(() => {
    if (!judgeName.trim()) {
      toast.error('Please select or enter a judge name.');
      return;
    }
    if (!pjNumber.trim()) {
      toast.error('PJ number is required.');
      return;
    }
    const filledItems = items.filter(isItemFilled);
    if (filledItems.length === 0) {
      toast.error('Please fill in at least one utility item (Amount and Period are required).');
      return;
    }
    setCurrentStep(2);
  }, [judgeName, pjNumber, items]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep(1);
  }, []);

  const handleCreateRecord = useCallback(async () => {
    if (isEditing) return;

    if (currentStep !== 2) return;

    if (!judgeName.trim()) {
      toast.error('Judge name is required.');
      return;
    }

    if (!pjNumber.trim()) {
      toast.error('PJ number is required.');
      return;
    }

    const filledItems = items.filter(isItemFilled);
    if (filledItems.length === 0) {
      toast.error('Please fill in at least one utility item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalPjNumber = pjNumber.trim();

      // ─── Check if PJ number already exists ──────────────────────────────────
      let existingUtility: JudgeUtility | null = null;
      try {
        existingUtility = await dispatch(fetchUtilityByPjNumber(finalPjNumber)).unwrap();
      } catch {
        // PJ number doesn't exist - we'll create a new record
      }

      let result: JudgeUtility;

      if (existingUtility) {
        // ─── PJ EXISTS: Add items to existing record ──────────────────────────
        for (const item of filledItems) {
          const addInput: AddUtilityItemInput = {
            pj_number: finalPjNumber,
            utility_type: item.utility_type,
            requisition_number: item.requisition_number.trim() || undefined,
            amount: item.amount,
            period: item.period.trim(),
            description: item.description.trim() || undefined,
            date_received: formatDateForAPI(item.date_received),
            date_forwarded_dass: formatDateForAPI(item.date_forwarded_dass),
            date_paid: formatDateForAPI(item.date_paid),
            status: item.status,
          };
          await dispatch(addUtilityItem(addInput)).unwrap();
        }
        
        result = await dispatch(fetchUtilityByPjNumber(finalPjNumber)).unwrap();
        toast.success(`${filledItems.length} utility item(s) added to existing record for ${judgeName.trim()}.`);
      } else {
        // ─── PJ DOES NOT EXIST: Create new record ─────────────────────────────
        result = await dispatch(
          createUtility({
            pj_number: finalPjNumber,
            judge_name: judgeName.trim(),
            items: filledItems.map((item) => ({
              utility_type: item.utility_type,
              requisition_number: item.requisition_number.trim() || undefined,
              amount: item.amount,
              period: item.period.trim(),
              description: item.description.trim() || undefined,
              date_received: formatDateForAPI(item.date_received),
              date_forwarded_dass: formatDateForAPI(item.date_forwarded_dass),
              date_paid: formatDateForAPI(item.date_paid),
              status: item.status,
            })),
          }),
        ).unwrap();
        toast.success(`New judge utility record created for ${judgeName.trim()}.`);
      }

      if (pendingDocumentId && result?.id) {
        try {
          await dispatch(
            linkHelpdeskDocument({
              id: pendingDocumentId,
              entity_type: 'utility_memo',
              entity_id: result.id,
            }),
          ).unwrap();
          toast.success('Memo linked to the utility record.');
        } catch {
          toast.error('Record created, but failed to link the memo. You can attach it manually later.');
        }
      }

      await dispatch(fetchUtilities({}));
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to create/add utility record:', err);
      
      let errorMessage = 'Failed to create judge utility record.';
      
      const isAxiosError = (error: unknown): error is { 
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      } => {
        return typeof error === 'object' && error !== null;
      };
      
      if (isAxiosError(err)) {
        if (err.response?.status === 409) {
          errorMessage = `A record with PJ number "${pjNumber.trim()}" already exists. Please use a different PJ number or add items to the existing record.`;
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditing, currentStep, judgeName, pjNumber, items, pendingDocumentId, dispatch, onClose, resetForm]);

  const handleUpdateUtilityRecord = useCallback(async () => {
    if (!editingUtility) return;

    const updates: UpdateUtilityInput = {};
    if (judgeName !== editingUtility.judge_name) {
      updates.judge_name = judgeName.trim();
    }
    if (pjNumber !== editingUtility.pj_number) {
      updates.pj_number = pjNumber.trim() || undefined;
    }

    if (Object.keys(updates).length === 0) {
      toast('No changes to save.', {
        icon: 'ℹ️',
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        updateUtility({
          id: editingUtility.id,
          updates,
        }),
      ).unwrap();
      await dispatch(fetchUtilities({}));
      toast.success('Utility record updated successfully.');

      if (pjNumber.trim()) {
        try {
          const updated = await dispatch(fetchUtilityByPjNumber(pjNumber.trim())).unwrap();
          if (updated) {
            setItems(buildInitialItems(updated));
          }
        } catch {
          await dispatch(fetchUtilities({}));
        }
      }
    } catch (err) {
      console.error('Failed to update utility record:', err);
      toast.error('Failed to update utility record.');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingUtility, judgeName, pjNumber, dispatch]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteTarget === null) return;
    setIsDeleting(true);
    try {
      if (deleteTarget === 'judge' && editingUtility) {
        await dispatch(deleteUtility(editingUtility.id)).unwrap();
        await dispatch(fetchUtilities({}));
        setDeleteTarget(null);
        onClose();
        resetForm();
        toast.success('Utility record deleted successfully.');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete utility record.');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, editingUtility, dispatch, onClose, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  if (!isOpen) return null;

  const filledItemsForPreview = items.filter(isItemFilled);
  const previewTotal = filledItemsForPreview.reduce((sum, i) => sum + i.amount, 0);

  // ─── Render Editable Preview Table ──────────────────────────────────────
  const renderEditablePreviewTable = () => (
    <div className="overflow-hidden rounded-lg border border-stone-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-400">
              <th className="px-3 py-2 text-left font-medium w-32">Type</th>
              <th className="px-3 py-2 text-left font-medium">Requisition #</th>
              <th className="px-3 py-2 text-right font-medium w-28">Amount (KES)</th>
              <th className="px-3 py-2 text-left font-medium">Period</th>
              <th className="px-3 py-2 text-center font-medium w-36">Status</th>
              <th className="px-3 py-2 text-center font-medium w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((item, index) => {
              const isFilled = isItemFilled(item);
              return (
                <tr key={index} className={!isFilled ? 'opacity-50' : ''}>
                  <td className="px-3 py-2">
                    <select
                      value={item.utility_type}
                      onChange={(e) => handleRowChange(index, 'utility_type', e.target.value as UtilityType)}
                      className="w-full rounded border border-stone-200 bg-white px-1.5 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                    >
                      {UTILITY_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.requisition_number}
                      onChange={(e) => handleRowChange(index, 'requisition_number', e.target.value)}
                      placeholder="e.g. REQ-001"
                      className="w-full rounded border border-stone-200 px-1.5 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.amount || ''}
                      onChange={(e) => handleRowChange(index, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full rounded border border-stone-200 px-1.5 py-1 text-right text-xs focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.period}
                      onChange={(e) => handleRowChange(index, 'period', e.target.value)}
                      placeholder="e.g. May 2026"
                      className="w-full rounded border border-stone-200 px-1.5 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={item.status}
                      onChange={(e) => handleRowChange(index, 'status', e.target.value as UtilityStatus)}
                      className="w-full rounded border border-stone-200 bg-white px-1.5 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                    >
                      {UTILITY_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleRemoveRow(index)}
                      disabled={items.length <= 1}
                      className="text-stone-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
                      title={items.length <= 1 ? "Cannot remove last item" : "Remove this item"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {/* Add row button */}
            <tr>
              <td colSpan={6} className="px-3 py-2">
                <button
                  onClick={handleAddNewRow}
                  className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-stone-300 py-2 text-xs text-stone-500 hover:border-[#1a3d1c] hover:text-[#1a3d1c] transition-colors"
                >
                  <Plus size={14} />
                  Add Another Utility Item
                </button>
              </td>
            </tr>
          </tbody>
          {filledItemsForPreview.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-stone-200 bg-stone-50">
                <td colSpan={2} className="px-3 py-2 text-right font-semibold text-stone-700">
                  Total
                </td>
                <td className="px-3 py-2 text-right font-semibold text-stone-800">
                  {previewTotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {items.filter(isItemFilled).length === 0 && (
        <div className="px-3 py-4 text-center text-xs text-stone-400">
          Fill in at least one utility item to proceed.
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-[#c9a84c]" />
              <h3 className="text-sm font-semibold text-[#1a3d1c]">
                {isEditing ? `Utilities — ${editingUtility!.judge_name}` : 'Add Judge Utilities'}
              </h3>
            </div>
            <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!isEditing && (
            <div className="px-4 pt-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 1 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                      1
                    </div>
                    <span className="text-xs font-medium">Judge Details</span>
                  </div>
                  <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-[#c9a84c]' : 'bg-stone-200'}`} />
                  <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 2 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                      2
                    </div>
                    <span className="text-xs font-medium">Review &amp; Edit</span>
                  </div>
                </div>
                <span className="text-xs text-stone-400">Step {currentStep} of 2</span>
              </div>
            </div>
          )}

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4">
              {isEditing ? (
                <div className="space-y-4">
                  {/* ─── Judge Name with Search ──────────────────────────────── */}
                  <div>
                    <FieldLabel required>Judge Name</FieldLabel>
                    <div className="relative" ref={dropdownRef}>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={judgeSearchTerm}
                          onChange={(e) => {
                            setJudgeSearchTerm(e.target.value);
                            setShowJudgeDropdown(true);
                            if (selectedJudge && selectedJudge.name !== e.target.value) {
                              setSelectedJudge(null);
                              setJudgeName(e.target.value);
                              if (pjNumber === selectedJudge.pj_number) {
                                setPjNumber('');
                              }
                            } else {
                              setJudgeName(e.target.value);
                            }
                          }}
                          onFocus={() => setShowJudgeDropdown(true)}
                          placeholder="Search judge by name or PJ number..."
                          className={`${inputClasses} pl-9`}
                        />
                        {judgesLoading && (
                          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
                        )}
                      </div>

                      {showJudgeDropdown && filteredJudges.length > 0 && (
                        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
                          {filteredJudges.map((judge) => (
                            <button
                              key={judge.id}
                              onClick={() => handleSelectJudge(judge)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-b-0"
                            >
                              <span className="font-medium text-stone-800">{judge.name}</span>
                              <span className="text-xs text-stone-400 font-mono">{judge.pj_number}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {showJudgeDropdown && filteredJudges.length === 0 && judgeSearchTerm.trim() && (
                        <div className="absolute z-20 mt-1 w-full rounded-lg border border-stone-200 bg-white p-3 text-center text-sm text-stone-500 shadow-lg">
                          No matching judges found. Enter name manually.
                        </div>
                      )}
                    </div>
                    {selectedJudge && (
                      <p className="mt-1 text-[11px] text-emerald-600">
                        ✓ Selected: {selectedJudge.name} ({selectedJudge.pj_number})
                      </p>
                    )}
                  </div>

                  {/* ─── PJ Number ──────────────────────────────────────────────── */}
                  <div>
                    <FieldLabel required>PJ Number</FieldLabel>
                    <div className="relative">
                      <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={pjNumber}
                        onChange={(e) => setPjNumber(e.target.value)}
                        placeholder="e.g. PJ/2024/001"
                        className={`${inputClasses} pl-9`}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-stone-400">
                      PJ number is required for adding utility items.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <GoldButton
                      size="sm"
                      onClick={handleUpdateUtilityRecord}
                      disabled={isSubmitting}
                      icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    >
                      {isSubmitting ? 'Saving…' : 'Update Record'}
                    </GoldButton>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <FieldLabel>Utility Items ({items.length})</FieldLabel>
                      <GhostButton
                        onClick={handleAddItemToExisting}
                        disabled={savingItemIndex === items.length || !pjNumber.trim()}
                        icon={
                          savingItemIndex === items.length ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Plus size={12} />
                          )
                        }
                      >
                        Add Utility
                      </GhostButton>
                    </div>
                    {!pjNumber.trim() && (
                      <p className="mb-2 text-[11px] text-amber-600">
                        Please enter a PJ number above to add utility items.
                      </p>
                    )}

                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <UtilityItemRow
                          key={item.id ?? `pending-${index}`}
                          item={item}
                          index={index}
                          isEditing
                          isDirty={!!item.id && dirtyItemIds.has(item.id)}
                          isSaving={savingItemIndex === index}
                          isDeleting={deletingItemIndex === index}
                          onChange={handleRowChange}
                          onSave={handleSaveRow}
                          onDelete={handleDeleteRow}
                        />
                      ))}
                    </div>

                    {items.length === 0 && (
                      <p className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs text-stone-400">
                        No utility items yet. Click "Add Utility" above to record one.
                      </p>
                    )}
                  </div>
                </div>
              ) : currentStep === 1 ? (
                <div className="space-y-4">
                  {/* ─── Judge Name with Search ──────────────────────────────── */}
                  <div>
                    <FieldLabel required>Judge Name</FieldLabel>
                    <div className="relative" ref={dropdownRef}>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={judgeSearchTerm}
                          onChange={(e) => {
                            setJudgeSearchTerm(e.target.value);
                            setShowJudgeDropdown(true);
                            if (selectedJudge && selectedJudge.name !== e.target.value) {
                              setSelectedJudge(null);
                              setJudgeName(e.target.value);
                              if (pjNumber === selectedJudge.pj_number) {
                                setPjNumber('');
                              }
                            } else {
                              setJudgeName(e.target.value);
                            }
                          }}
                          onFocus={() => setShowJudgeDropdown(true)}
                          placeholder="Search judge by name or PJ number..."
                          className={`${inputClasses} pl-9`}
                        />
                        {judgesLoading && (
                          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
                        )}
                      </div>

                      {showJudgeDropdown && filteredJudges.length > 0 && (
                        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
                          {filteredJudges.map((judge) => (
                            <button
                              key={judge.id}
                              onClick={() => handleSelectJudge(judge)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-b-0"
                            >
                              <span className="font-medium text-stone-800">{judge.name}</span>
                              <span className="text-xs text-stone-400 font-mono">{judge.pj_number}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {showJudgeDropdown && filteredJudges.length === 0 && judgeSearchTerm.trim() && (
                        <div className="absolute z-20 mt-1 w-full rounded-lg border border-stone-200 bg-white p-3 text-center text-sm text-stone-500 shadow-lg">
                          No matching judges found. Enter name manually.
                        </div>
                      )}
                    </div>
                    {selectedJudge && (
                      <p className="mt-1 text-[11px] text-emerald-600">
                        ✓ Selected: {selectedJudge.name} ({selectedJudge.pj_number})
                      </p>
                    )}
                  </div>

                  {/* ─── PJ Number ──────────────────────────────────────────────── */}
                  <div>
                    <FieldLabel required>PJ Number</FieldLabel>
                    <div className="relative">
                      <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={pjNumber}
                        onChange={(e) => setPjNumber(e.target.value)}
                        placeholder="e.g. PJ/2024/001"
                        className={`${inputClasses} pl-9`}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-stone-400">
                      PJ number is required to create a utility record.
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <FieldLabel required>Utility Items</FieldLabel>
                      <GhostButton onClick={handleAddNewRow} icon={<Plus size={12} />}>
                        Add Utility
                      </GhostButton>
                    </div>

                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <UtilityItemRow
                          key={`pending-${index}`}
                          item={item}
                          index={index}
                          isEditing={false}
                          onChange={handleRowChange}
                          onRemove={handleRemoveRow}
                          canRemove={items.length > 1}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ─── Summary Section ───────────────────────────────────────── */}
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                          Judge
                        </p>
                        <p className="text-sm font-semibold text-stone-800">{judgeName}</p>
                        {pjNumber && (
                          <p className="mt-1 text-xs text-stone-500">PJ: {pjNumber}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                          Total Amount
                        </p>
                        <p className="text-lg font-bold text-[#1a3d1c]">
                          KES {previewTotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-stone-400">
                          {filledItemsForPreview.length} item{filledItemsForPreview.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ─── Editable Preview Table ────────────────────────────────── */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                        Utility Items — Click any field to edit
                      </p>
                      <span className="text-[10px] text-stone-400">
                        {items.filter(isItemFilled).length} filled
                      </span>
                    </div>
                    {renderEditablePreviewTable()}
                  </div>

                  <p className="text-xs text-stone-400">
                    ✏️ All fields in the table above are editable. Review and adjust before creating the record.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3">
              <div>
                {isEditing ? (
                  <GhostButton onClick={() => setDeleteTarget('judge')} disabled={isDeleting}>
                    <Trash2 size={14} />
                    Delete Judge Record
                  </GhostButton>
                ) : (
                  currentStep === 2 && (
                    <GhostButton type="button" onClick={handlePrevStep} icon={<ArrowLeft size={14} />}>
                      Back to Details
                    </GhostButton>
                  )
                )}
              </div>
              <div className="flex gap-2">
                {!isEditing && currentStep === 2 && (
                  <GoldButton
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => setShowMemoModal(true)}
                    icon={<FileText size={14} />}
                  >
                    Generate Memo
                  </GoldButton>
                )}
                <GhostButton type="button" onClick={handleClose} disabled={isSubmitting || isDeleting}>
                  {isEditing ? 'Close' : 'Cancel'}
                </GhostButton>
                {!isEditing ? (
                  currentStep === 1 ? (
                    <GoldButton type="button" onClick={handleNextStep} icon={<ArrowRight size={14} />}>
                      Review &amp; Edit
                    </GoldButton>
                  ) : (
                    <GoldButton 
                      type="button" 
                      onClick={handleCreateRecord} 
                      disabled={isSubmitting || !pjNumber.trim() || items.filter(isItemFilled).length === 0}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Create Utility Record
                    </GoldButton>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Memo Modal ────────────────────────────────────────────────────── */}
      <MemoModal
        isOpen={showMemoModal}
        onClose={() => setShowMemoModal(false)}
        judges={getJudgesForMemo()}
        onMemoGenerated={handleMemoGenerated}
        entityId={editingUtility?.id}
        isConsolidated={false}
      />

      {deleteTarget !== null && (
        <ConfirmDialog
          title={deleteTarget === 'judge' ? 'Delete Judge Utility Record?' : 'Delete Utility Item?'}
          message={
            deleteTarget === 'judge'
              ? 'This will permanently remove this judge and all their utility items from the system.'
              : 'This action cannot be undone. The utility item will be permanently removed.'
          }
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={isDeleting}
        />
      )}
    </>
  );
};

export default UtilitiesModal;
export { MemoModal as UtilitiesMemoModal };