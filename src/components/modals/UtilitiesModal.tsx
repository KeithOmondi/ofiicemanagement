// src/components/Helpdesk/UtilitiesModal.tsx

import React, { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createUtility,
  addUtilityItem,
  updateUtilityItem,
  deleteUtilityItem,
  deleteUtility,
  fetchUtilities,
  fetchHelpDeskStats,
  selectAllUtilities,
  type UtilityType,
  type UtilityStatus,
  type UtilityItem,
  type UtilityItemInput,
  type JudgeUtility,
} from '../../store/slices/helpdeskSlice';
import {
  selectCurrentUser,
  selectUsersSignatureLoading,
  uploadSignature,
  deleteSignature,
} from '../../store/slices/userSlice';
import {
  fetchHelpdeskDocuments,
  uploadHelpdeskDocument,
  linkHelpdeskDocument,
  submitForApproval,
  selectAllHelpdeskDocuments,
  selectDocumentsUploading,
  selectDocumentActionLoading,
  selectUnlinkedHelpdeskDocuments,
  selectDocumentLinking,
  type DocumentFormat,
  type DocumentStatus,
  type DocumentEntityType,
} from '../../store/slices/helpdeskDocumentsSlice';
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
  Image,
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
import { generateUtilityMemoPdf } from '../../utils/generateUtilityMemoPdf';
import { generateUtilityMemoExcel } from '../../utils/generateUtilityMemoExcel';
import toast, { Toaster } from 'react-hot-toast';
import type { UtilityMemoData } from '../../types/generateUtilityMemoTypes';

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

// ✅ Define the entity type as a constant for reuse
const UTILITY_MEMO_ENTITY_TYPE: DocumentEntityType = 'utility_memo';

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
  kplc: number;
  water: number;
  wifi: number;
  fuel: number;
  other: number;
  total: number;
}

function computeFuelTotals(judges: JudgeUtility[]): JudgeTotals[] {
  return judges
    .map((j) => {
      let fuel = 0;
      j.items.forEach((item) => {
        if (item.utility_type === 'Fuel') {
          fuel += item.amount;
        }
      });
      return {
        judge_name: j.judge_name,
        kplc: 0,
        water: 0,
        wifi: 0,
        fuel,
        other: 0,
        total: fuel
      };
    })
    .filter((row) => row.fuel > 0)
    .sort((a, b) => a.judge_name.localeCompare(b.judge_name));
}

function computeNonFuelTotals(judges: JudgeUtility[]): JudgeTotals[] {
  return judges
    .map((j) => {
      let kplc = 0, water = 0, wifi = 0;
      j.items.forEach((item) => {
        switch (item.utility_type) {
          case 'Electricity': kplc += item.amount; break;
          case 'Water': water += item.amount; break;
          case 'Internet': wifi += item.amount; break;
          default: break;
        }
      });
      const total = kplc + water + wifi;
      return { judge_name: j.judge_name, kplc, water, wifi, fuel: 0, other: 0, total };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => a.judge_name.localeCompare(b.judge_name));
}

interface MemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  judges: JudgeUtility[];
  memoType: 'all' | 'fuel';
  onMemoGenerated: (docId: string) => void;
  entityId?: string; // the JudgeUtility.id this memo belongs to, if editing an existing record
}

type DownloadFormat = 'docx' | 'pdf' | 'xlsx';

const MemoModal: React.FC<MemoModalProps> = ({
  isOpen,
  onClose,
  judges,
  memoType,
  onMemoGenerated,
  entityId,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const signatureLoading = useAppSelector(selectUsersSignatureLoading);

  const allDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const documentsLoading = useAppSelector((state) => state.helpdeskDocuments.loading.fetch);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const [toField, setToField] = useState('DEPUTY DIRECTOR - DASS');
  const [fromField, setFromField] = useState('REGISTRAR, HIGH COURT');
  const [refField] = useState(() => {
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RHC/UTILITY/${random}`;
  });
  const [dateField, setDateField] = useState(() =>
    new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
  );
  const [subjectField, setSubjectField] = useState(
    memoType === 'fuel' ? 'FUEL BILL CLAIMS' : 'UTILITY BILL CLAIMS'
  );
  const [bodyText, setBodyText] = useState(
    memoType === 'fuel'
      ? `I hereby forward the fuel bill refund claims for the Judges listed below, together with the requisite supporting documentation for processing and reimbursement.\n\nPlease note that these claims, along with the accompanying documentation, had been submitted earlier for processing. However, the claims appear to have stalled within the processing chain and remain outstanding to date.\n\nThis memo therefore serves as a resubmission of the pending claims to facilitate their review and expeditious processing. Kindly accord the matter the necessary attention and take the appropriate action to ensure reimbursement is affected.`
      : `I hereby forward the utility bill refund claims for the Judges listed below, together with the requisite supporting documentation for processing and reimbursement.\n\nPlease note that these claims, along with the accompanying documentation, had been submitted earlier for processing. However, the claims appear to have stalled within the processing chain and remain outstanding to date.\n\nThis memo therefore serves as a resubmission of the pending claims to facilitate their review and expeditious processing. Kindly accord the matter the necessary attention and take the appropriate action to ensure reimbursement is affected.`
  );

  const signatoryName = currentUser?.full_name || '';

  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchHelpdeskDocuments({ entity_type: UTILITY_MEMO_ENTITY_TYPE }));
    }
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (showLinkPicker) {
      dispatch(fetchHelpdeskDocuments({ unlinked: true }));
    }
  }, [dispatch, showLinkPicker]);

  const handleSignatureUpload = async (file: File) => {
    try {
      await dispatch(uploadSignature(file)).unwrap();
      toast.success('Signature uploaded successfully.');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to upload signature.');
    }
  };

  const handleSignatureRemove = async () => {
    if (!currentUser?.signature_url) return;
    try {
      await dispatch(deleteSignature()).unwrap();
      toast.success('Signature removed successfully.');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to remove signature.');
    }
  };

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

  const judgeTotals = memoType === 'fuel'
    ? computeFuelTotals(judges)
    : computeNonFuelTotals(judges);

  const grandKplc = judgeTotals.reduce((s, r) => s + r.kplc, 0);
  const grandWater = judgeTotals.reduce((s, r) => s + r.water, 0);
  const grandWifi = judgeTotals.reduce((s, r) => s + r.wifi, 0);
  const grandFuel = judgeTotals.reduce((s, r) => s + r.fuel, 0);
  const grandTotal = judgeTotals.reduce((s, r) => s + r.total, 0);

  const buildMemoData = (): UtilityMemoData => ({
    to: toField,
    from: fromField,
    ref: refField,
    date: dateField,
    subject: subjectField,
    bodyText,
    rows: judgeTotals.map((r) => ({
      judge_name: r.judge_name,
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
    signatoryName,
    crestUrl: JUDICIARY_CREST_SRC,
    footerEmblemUrl: FOOTER_EMBLEM_SRC,
    signatureUrl: currentUser?.signature_url || undefined,
  });

  // ─── Attach an existing local file to this memo ─────────────────────────
  const handleAttachDocument = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!entityId) {
      toast.error('Save the judge utility record first before attaching a document.');
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
          entity_type: UTILITY_MEMO_ENTITY_TYPE,
          entity_id: entityId,
          format,
        })
      ).unwrap();
      toast.success('Document attached to this memo.');
      dispatch(fetchHelpdeskDocuments({ entity_type: UTILITY_MEMO_ENTITY_TYPE }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to attach document.');
    } finally {
      setUploadingDocument(false);
      e.target.value = '';
    }
  };

  // ─── Link an existing unlinked document to this memo's judge record ────
  const handleLinkExisting = async (docId: string) => {
    if (!entityId) {
      toast.error('Save the judge utility record first before linking a document.');
      return;
    }

    try {
      await dispatch(
        linkHelpdeskDocument({
          id: docId,
          entity_type: UTILITY_MEMO_ENTITY_TYPE,
          entity_id: entityId,
        })
      ).unwrap();
      toast.success('Document linked to this memo.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: UTILITY_MEMO_ENTITY_TYPE }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  };

  const handleSendDocumentForApproval = async (docId: string) => {
    try {
      await dispatch(submitForApproval({ id: docId })).unwrap();
      toast.success('Document sent for approval.');
      dispatch(fetchHelpdeskDocuments({ entity_type: UTILITY_MEMO_ENTITY_TYPE }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit document for approval.');
    }
  };

  // ─── Generate the memo file and save it into the system ────────────────
  const handleGenerate = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);

    console.group(`🧾 handleGenerate("${format}")`);
    console.log('entityId (judge record id, if editing):', entityId);
    console.log('refField:', refField);
    console.log('subjectField:', subjectField);
    console.log('judges passed in:', judges);

    try {
      const memoData = buildMemoData();
      console.log('memoData built:', memoData);

      let blob: Blob | null = null;

      console.log(`⏳ generating ${format} blob...`);
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
      console.log('✅ blob generated:', {
        size: blob.size,
        type: blob.type,
      });

      const filename = `${refField}.${format}`;
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      console.log('📦 File object built:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const uploadPayload = {
        blob: file,
        filename,
        ref: refField,
        subject: subjectField,
        entity_type: UTILITY_MEMO_ENTITY_TYPE,
        entity_id: entityId,
        format: format as DocumentFormat,
      };
      console.log('📤 dispatching uploadHelpdeskDocument with payload:', {
        ...uploadPayload,
        blob: `[File: ${file.name}, ${file.size} bytes]`,
      });

      const result = await dispatch(uploadHelpdeskDocument(uploadPayload)).unwrap();
      console.log('✅ upload succeeded, server response:', result);

      toast.success(`${format.toUpperCase()} memo saved to the system.`);

      if (entityId) {
        console.log(`🔗 entityId present (${entityId}) — linking immediately...`);
        try {
          const linkPayload = {
            id: result.id,
            entity_type: UTILITY_MEMO_ENTITY_TYPE,
            entity_id: entityId,
          };
          console.log('📤 dispatching linkHelpdeskDocument with payload:', linkPayload);
          const linkResult = await dispatch(linkHelpdeskDocument(linkPayload)).unwrap();
          console.log('✅ link succeeded:', linkResult);
          toast.success('Memo linked to the judge utility record.');
        } catch (linkErr) {
          console.error('❌ link failed:', linkErr);
          console.warn('Saved but failed to link to the judge record:', linkErr);
          toast.error('Memo saved, but could not link it automatically. You can link it manually.');
        }
      } else {
        console.log('🕓 no entityId yet — deferring link via onMemoGenerated(docId):', result.id);
        onMemoGenerated(result.id);
      }

      dispatch(fetchHelpdeskDocuments({ entity_type: UTILITY_MEMO_ENTITY_TYPE }));
    } catch (err) {
      console.error(`❌ Failed to generate ${format} memo — raw error:`, err);
      console.log('typeof err:', typeof err);
      console.log('err instanceof Error:', err instanceof Error);
      try {
        console.log('JSON.stringify(err):', JSON.stringify(err));
      } catch {
        console.log('err is not JSON-serializable');
      }

      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Failed to generate document. Please try again.';

      console.log('📢 toast message resolved to:', message);
      toast.error(message);
    } finally {
      console.groupEnd();
      setDownloadingFormat(null);
    }
  };

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Preparing Word…',
    pdf: 'Preparing PDF…',
    xlsx: 'Preparing Excel…',
  };

  // Match on `ref` (always set correctly) rather than `entity_id`
  const linkedDocuments = allDocuments.filter(
    (d) => d.entity_type === UTILITY_MEMO_ENTITY_TYPE && d.ref === refField
  );

  if (!isOpen) return null;

  const showNonFuelColumns = memoType === 'all';
  const showFuelColumn = memoType === 'fuel';

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
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">
            {memoType === 'fuel' ? 'Fuel Memo' : 'Utility Memo'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
          {/* Signature Section */}
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Image size={16} className="text-[#c9a84c]" />
                <h4 className="text-sm font-semibold text-stone-800">Digital Signature</h4>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSignatureUpload(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                  id="memo-signature-upload"
                  disabled={signatureLoading}
                />
                <label
                  htmlFor="memo-signature-upload"
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer disabled:opacity-50"
                >
                  {signatureLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {signatureLoading ? 'Uploading…' : 'Upload Signature'}
                </label>
                {currentUser?.signature_url && (
                  <GhostButton onClick={handleSignatureRemove} disabled={signatureLoading} icon={<Trash2 size={14} />}>
                    Remove
                  </GhostButton>
                )}
              </div>
            </div>
            {currentUser?.signature_url ? (
              <div className="flex items-center gap-4 p-3 bg-white rounded border border-stone-200">
                <img src={currentUser.signature_url} alt="Your signature" className="max-h-16 w-auto object-contain" />
                <span className="text-xs text-stone-500">✓ Signature uploaded</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-white rounded border border-dashed border-stone-300">
                <Image size={20} className="text-stone-400" />
                <div>
                  <p className="text-sm text-stone-600">No signature uploaded</p>
                  <p className="text-xs text-stone-400">Upload your signature to include it in the memo</p>
                </div>
              </div>
            )}
          </div>

          {/* ─── Memo Preview ───────────────────────────────────────────────────────── */}
          <div className="border border-stone-300 bg-white p-10 shadow-sm font-sans text-black">
            {/* Crest - properly centered with spacing */}
            <div className="flex justify-center mb-2">
              <img 
                src={JUDICIARY_CREST_SRC} 
                alt="Judiciary of Kenya crest" 
                className="h-24 w-auto object-contain" 
              />
            </div>

            {/* Office title with registrar's name */}
            <div className="text-center mb-1">
              <p className="text-base font-bold uppercase leading-snug tracking-wide text-stone-800">
                OFFICE OF THE REGISTRAR HIGH COURT
              </p>
              <p className="text-sm font-semibold uppercase text-stone-600 mt-0.5">
                {currentUser?.full_name || 'REGISTRAR, HIGH COURT'}
              </p>
            </div>

            {/* Internal Memo with full-width underline */}
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
                <input type="text" value={fromField} onChange={(e) => setFromField(e.target.value)}
                  className="flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none uppercase" />
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

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-black">
                <thead>
                  <tr>
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
                  {judgeTotals.length === 0 ? (
                    <tr>
                      <td colSpan={showNonFuelColumns ? 7 : (showFuelColumn ? 4 : 1)} className="border border-black px-2 py-4 text-center text-stone-400">
                        No outstanding {memoType === 'fuel' ? 'fuel' : 'utility'} claims found.
                      </td>
                    </tr>
                  ) : (
                    judgeTotals.map((row, index) => (
                      <tr key={row.judge_name}>
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
                    ))
                  )}
                </tbody>
                {judgeTotals.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={showNonFuelColumns ? 2 : (showFuelColumn ? 2 : 1)} className="border border-black px-2 py-2 text-right font-bold">GRAND TOTAL</td>
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

            <div className="mt-16 space-y-1">
              <p className="text-sm font-bold text-black">{signatoryName}</p>
              {currentUser?.signature_url && (
                <div className="py-1">
                  <img src={currentUser.signature_url} alt="Signature" className="max-h-12 w-auto object-contain" />
                </div>
              )}
              <input type="text" value={fromField} onChange={(e) => setFromField(e.target.value)}
                className="block w-full bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none text-sm font-bold underline uppercase" />
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

          {/* Document Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">Supporting Documents</h3>
              <div className="flex gap-2">
                <GhostButton
                  onClick={() => setShowLinkPicker((v) => !v)}
                  icon={<Paperclip size={14} />}
                  disabled={!entityId}
                >
                  Link Existing
                </GhostButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  onChange={handleAttachDocument}
                  className="hidden"
                  disabled={documentsUploading || uploadingDocument || !entityId}
                />
                <GhostButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={documentsUploading || uploadingDocument || !entityId}
                  icon={documentsUploading || uploadingDocument ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                >
                  {documentsUploading || uploadingDocument ? 'Uploading…' : 'Attach Document'}
                </GhostButton>
              </div>
            </div>

            {!entityId && (
              <p className="mt-2 text-[11px] text-stone-400 italic">
                Attaching and linking documents will be available once this judge utility record has been saved.
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
  const allJudges = useAppSelector(selectAllUtilities);
  void allJudges;

  const [judgeName, setJudgeName] = useState(() => editingUtility?.judge_name ?? '');
  const [items, setItems] = useState<UtilityItemFormState[]>(() => buildInitialItems(editingUtility));

  const isEditing = !!editingUtility;

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoType, setMemoType] = useState<'all' | 'fuel'>('all');
  const [pendingDocumentId, setPendingDocumentId] = useState<string | undefined>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingItemIndex, setSavingItemIndex] = useState<number | null>(null);
  const [deletingItemIndex, setDeletingItemIndex] = useState<number | null>(null);
  const [dirtyItemIds, setDirtyItemIds] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<'judge' | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Helper to get judges for memo ──────────────────────────────────────
  const getJudgesForMemo = (): JudgeUtility[] => {
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
      judge_name: judgeName.trim(),
      created_by: null,
      items: filledItems.map((item, index) => ({
        id: `temp-item-${index}`,
        utility_type: item.utility_type,
        requisition_number: item.requisition_number || null,
        amount: item.amount,
        period: item.period,
        description: item.description || null,
        date_received: item.date_received || null,
        date_forwarded_dass: item.date_forwarded_dass || null,
        date_paid: item.date_paid || null,
        status: item.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        request_id: '',
        supporting_document_url: null,
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return [tempJudge];
  };

  const resetForm = () => {
    setJudgeName('');
    setItems(buildInitialItems(null));
    setDirtyItemIds(new Set());
    setCurrentStep(1);
    setPendingDocumentId(undefined);
  };

  const handleGenerateMemo = (type: 'all' | 'fuel') => {
    setMemoType(type);
    setShowMemoModal(true);
  };

  const handleMemoGenerated = (docId: string) => {
    setPendingDocumentId(docId);
  };

  const handleAddNewRow = () => {
    setItems((prev) => [...prev, buildEmptyItem()]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (
    index: number,
    field: keyof UtilityItemFormState,
    value: string | number,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    if (isEditing && items[index].id) {
      setDirtyItemIds((prev) => new Set(prev).add(items[index].id!));
    }
  };

  const handleSaveRow = async (index: number) => {
    if (!editingUtility) return;
    const item = items[index];
    if (!item.id) return;

    setSavingItemIndex(index);
    try {
      await dispatch(updateUtilityItem({
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
      })).unwrap();

      setDirtyItemIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id!);
        return next;
      });
      await dispatch(fetchUtilities({}));
      await dispatch(fetchHelpDeskStats());
    } catch (err) {
      console.error('Failed to update utility item:', err);
    } finally {
      setSavingItemIndex(null);
    }
  };

  const handleDeleteRow = async (index: number) => {
    if (!editingUtility) return;
    const item = items[index];
    if (!item.id) return;

    setDeletingItemIndex(index);
    try {
      await dispatch(deleteUtilityItem({ id: editingUtility.id, itemId: item.id })).unwrap();
      setItems((prev) => prev.filter((_, i) => i !== index));
      await dispatch(fetchHelpDeskStats());
    } catch (err) {
      console.error('Failed to delete utility item:', err);
    } finally {
      setDeletingItemIndex(null);
    }
  };

  const handleAddItemToExisting = async () => {
    if (!editingUtility) return;

    const newItem = buildEmptyItem();
    setSavingItemIndex(items.length);
    try {
      const input: UtilityItemInput = {
        utility_type: newItem.utility_type,
        requisition_number: newItem.requisition_number.trim() || undefined,
        amount: 0,
        period: 'New item',
        status: newItem.status,
      };
      const result = await dispatch(addUtilityItem({ id: editingUtility.id, item: input })).unwrap();
      setItems(buildInitialItems(result));
      await dispatch(fetchHelpDeskStats());
    } catch (err) {
      console.error('Failed to add utility item:', err);
    } finally {
      setSavingItemIndex(null);
    }
  };

  const handleNextStep = () => {
    if (!judgeName.trim()) {
      toast.error('Please enter the judge name.');
      return;
    }
    const filledItems = items.filter(isItemFilled);
    if (filledItems.length === 0) {
      toast.error('Please fill in at least one utility item (Amount and Period are required).');
      return;
    }
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  const handleCreateRecord = async () => {
    if (isEditing) {
      return;
    }

    if (currentStep !== 2) {
      return;
    }

    if (!judgeName.trim()) {
      toast.error('Judge name is required.');
      return;
    }

    const filledItems = items.filter(isItemFilled);
    if (filledItems.length === 0) {
      toast.error('Please fill in at least one utility item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dispatch(createUtility({
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
      })).unwrap();

      if (pendingDocumentId && result?.id) {
        try {
          await dispatch(
            linkHelpdeskDocument({
              id: pendingDocumentId,
              entity_type: UTILITY_MEMO_ENTITY_TYPE,
              entity_id: result.id,
            })
          ).unwrap();
          toast.success('Memo linked to the utility record.');
        } catch {
          toast.error('Record created, but failed to link the memo. You can attach it manually later.');
        }
      }

      await dispatch(fetchUtilities({}));
      await dispatch(fetchHelpDeskStats());
      toast.success('Judge utility record created successfully.');
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to create judge utility record:', err);
      toast.error('Failed to create judge utility record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget === null) return;
    setIsDeleting(true);
    try {
      if (deleteTarget === 'judge' && editingUtility) {
        await dispatch(deleteUtility(editingUtility.id)).unwrap();
        await dispatch(fetchUtilities({}));
        await dispatch(fetchHelpDeskStats());
        setDeleteTarget(null);
        onClose();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const filledItemsForPreview = items.filter(isItemFilled);
  const previewTotal = filledItemsForPreview.reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
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
                    <span className="text-xs font-medium">Utility Details</span>
                  </div>
                  <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-[#c9a84c]' : 'bg-stone-200'}`} />
                  <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 2 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                      2
                    </div>
                    <span className="text-xs font-medium">Review & Create</span>
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
                  <div>
                    <FieldLabel required>Judge Name</FieldLabel>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={editingUtility!.judge_name}
                        disabled
                        className={`${inputClasses} pl-9`}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-stone-400">
                      A judge can have multiple utilities — add each utility type below.
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <FieldLabel>Utility Items ({items.length})</FieldLabel>
                      <GhostButton
                        onClick={handleAddItemToExisting}
                        disabled={savingItemIndex === items.length}
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
                  <div>
                    <FieldLabel required>Judge Name</FieldLabel>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={judgeName}
                        onChange={(e) => setJudgeName(e.target.value)}
                        placeholder="e.g. Hon. Justice Korir"
                        className={`${inputClasses} pl-9`}
                        required                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
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
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Judge
                    </p>
                    <p className="text-sm font-semibold text-stone-800">{judgeName}</p>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Utility Items ({filledItemsForPreview.length})
                    </p>
                    <div className="overflow-hidden rounded-lg border border-stone-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-400">
                            <th className="px-3 py-2 text-left font-medium">Type</th>
                            <th className="px-3 py-2 text-left font-medium">Requisition #</th>
                            <th className="px-3 py-2 text-right font-medium">Amount (KES)</th>
                            <th className="px-3 py-2 text-left font-medium">Period</th>
                            <th className="px-3 py-2 text-center font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {filledItemsForPreview.map((item, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-medium text-stone-800">{item.utility_type}</td>
                              <td className="px-3 py-2 text-stone-600">{item.requisition_number || '—'}</td>
                              <td className="px-3 py-2 text-right text-stone-600">
                                {item.amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-stone-600">{item.period}</td>
                              <td className="px-3 py-2 text-center">
                                <StatusBadge status={item.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-stone-200 bg-stone-50">
                            <td colSpan={2} className="px-3 py-2 text-right font-semibold text-stone-700">
                              Total
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-stone-800">
                              {previewTotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs text-stone-400">
                    Review the details above, then click "Create Utility Record" to save.
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
                      Back
                    </GhostButton>
                  )
                )}
              </div>
              <div className="flex gap-2">
                {!isEditing && currentStep === 2 && (
                  <>
                    <GoldButton
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => handleGenerateMemo('all')}
                      icon={<FileText size={14} />}
                    >
                      Memo
                    </GoldButton>
                    <GoldButton
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => handleGenerateMemo('fuel')}
                      icon={<FileText size={14} />}
                    >
                      Fuel Memo
                    </GoldButton>
                  </>
                )}
                <GhostButton type="button" onClick={handleClose} disabled={isSubmitting || isDeleting}>
                  {isEditing ? 'Close' : 'Cancel'}
                </GhostButton>
                {!isEditing ? (
                  currentStep === 1 ? (
                    <GoldButton type="button" onClick={handleNextStep} icon={<ArrowRight size={14} />}>
                      Next
                    </GoldButton>
                  ) : (
                    <GoldButton type="button" onClick={handleCreateRecord} disabled={isSubmitting}>
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

      <MemoModal
        isOpen={showMemoModal}
        onClose={() => setShowMemoModal(false)}
        judges={getJudgesForMemo()}
        memoType={memoType}
        onMemoGenerated={handleMemoGenerated}
        entityId={editingUtility?.id}
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