// src/components/Helpdesk/UtilitiesModal.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createUtility,
  addUtilityItem,
  updateUtilityItem,
  deleteUtilityItem,
  deleteUtility,
  fetchUtilities,
  fetchHelpDeskStats,
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
  FileSpreadsheet,
  Download,
  ChevronDown,
  Image,
  Upload,
  Hash,
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

const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

// ─── Helper Functions ──────────────────────────────────────────────────────

const formatDateForAPI = (dateString: string): string | undefined => {
  if (!dateString) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
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

/** Local editable shape for a utility item */
interface UtilityItemFormState {
  id: string | null;
  utility_type: UtilityType;
  requisition_number: string;  // ADDED
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
    requisition_number: '',  // ADDED
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
    requisition_number: item.requisition_number ?? '',  // ADDED
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

      {/* ADDED: Requisition Number field */}
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

// ─── Consolidated Memo Modal (ALL judges — KPLC / WATER / WIFI / TOTAL) ────

interface JudgeTotals {
  judge_name: string;
  kplc: number;
  water: number;
  wifi: number;
  other: number;
  total: number;
}

function computeJudgeTotals(judges: JudgeUtility[]): JudgeTotals[] {
  return judges
    .map((j) => {
      let kplc = 0, water = 0, wifi = 0, other = 0;
      j.items.forEach((item) => {
        switch (item.utility_type) {
          case 'Electricity': kplc += item.amount; break;
          case 'Water': water += item.amount; break;
          case 'Internet': wifi += item.amount; break;
          default: other += item.amount; break;
        }
      });
      return { judge_name: j.judge_name, kplc, water, wifi, other, total: kplc + water + wifi + other };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => a.judge_name.localeCompare(b.judge_name));
}

interface UtilitiesMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  judges: JudgeUtility[];
}

type DownloadFormat = 'docx' | 'pdf' | 'xlsx';

const UtilitiesMemoModal: React.FC<UtilitiesMemoModalProps> = ({ isOpen, onClose, judges }) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const signatureLoading = useAppSelector(selectUsersSignatureLoading);

  const [toField, setToField] = useState('DEPUTY DIRECTOR - DASS');
  const [fromField, setFromField] = useState('REGISTRAR, HIGH COURT');
  const [refField] = useState(() => {
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RHC/UTILITY/${random}`;
  });
  const [dateField, setDateField] = useState(() =>
    new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
  );
  const [subjectField, setSubjectField] = useState('UTILITY BILL CLAIMS');
  const [bodyText, setBodyText] = useState(
    `I hereby forward the utility bill refund claims for the Judges listed below, together with the requisite supporting documentation for processing and reimbursement.\n\nPlease note that these claims, along with the accompanying documentation, had been submitted earlier for processing. However, the claims appear to have stalled within the processing chain and remain outstanding to date.\n\nThis memo therefore serves as a resubmission of the pending claims to facilitate their review and expeditious processing. Kindly accord the matter the necessary attention and take the appropriate action to ensure reimbursement is affected.`
  );

  const signatoryName = currentUser?.full_name || '';

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

  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

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

  const judgeTotals = computeJudgeTotals(judges);
  const grandKplc = judgeTotals.reduce((s, r) => s + r.kplc, 0);
  const grandWater = judgeTotals.reduce((s, r) => s + r.water, 0);
  const grandWifi = judgeTotals.reduce((s, r) => s + r.wifi, 0);
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

  const handleDownload = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);
    try {
      const memoData = buildMemoData();

      if (format === 'docx') {
        await generateUtilityMemoDocx(memoData);
      } else if (format === 'pdf') {
        await generateUtilityMemoPdf(memoData);
      } else {
        generateUtilityMemoExcel(memoData);
      }
    } catch (err) {
      console.error(`Failed to generate ${format} memo:`, err);
      toast.error('Failed to generate document. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Preparing Word…',
    pdf: 'Preparing PDF…',
    xlsx: 'Preparing Excel…',
  };

  if (!isOpen) return null;

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
          <h3 className="text-sm font-semibold text-[#1a3d1c]">Generate Utility Memo — All Judges</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
          {/* Signature */}
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
                  id="utility-signature-upload"
                  disabled={signatureLoading}
                />
                <label
                  htmlFor="utility-signature-upload"
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

          {/* Memo Preview */}
          <div className="border border-stone-300 bg-white p-10 shadow-sm font-sans text-black">
            <div className="flex justify-center mb-3">
              <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-20 w-auto object-contain" />
            </div>

            <div className="text-center mb-6">
              <p className="text-lg font-bold uppercase leading-snug">OFFICE OF THE REGISTRAR HIGH COURT</p>
              <p className="text-lg font-bold uppercase leading-snug border-b-2 border-black inline-block pb-2 px-1">
                INTERNAL MEMO
              </p>
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

            {/* Consolidated Judges Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-black">
                <thead>
                  <tr>
                    <th className="border border-black px-2 py-1 text-left text-xs font-bold">S/NO.</th>
                    <th className="border border-black px-2 py-1 text-left text-xs font-bold">NAMES</th>
                    <th className="border border-black px-2 py-1 text-right text-xs font-bold">KPLC</th>
                    <th className="border border-black px-2 py-1 text-right text-xs font-bold">WATER</th>
                    <th className="border border-black px-2 py-1 text-right text-xs font-bold">WIFI</th>
                    <th className="border border-black px-2 py-1 text-right text-xs font-bold">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {judgeTotals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-black px-2 py-4 text-center text-stone-400">
                        No outstanding utility claims found.
                      </td>
                    </tr>
                  ) : (
                    judgeTotals.map((row, index) => (
                      <tr key={row.judge_name}>
                        <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                        <td className="border border-black px-2 py-1 font-medium">{row.judge_name}</td>
                        <td className="border border-black px-2 py-1 text-right">{row.kplc > 0 ? formatAmount(row.kplc) : ''}</td>
                        <td className="border border-black px-2 py-1 text-right">{row.water > 0 ? formatAmount(row.water) : ''}</td>
                        <td className="border border-black px-2 py-1 text-right">{row.wifi > 0 ? formatAmount(row.wifi) : ''}</td>
                        <td className="border border-black px-2 py-1 text-right font-medium">{formatAmount(row.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {judgeTotals.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="border border-black px-2 py-2 text-right font-bold">GRAND TOTAL</td>
                      <td className="border border-black px-2 py-2 text-right font-bold">{formatAmount(grandKplc)}</td>
                      <td className="border border-black px-2 py-2 text-right font-bold">{formatAmount(grandWater)}</td>
                      <td className="border border-black px-2 py-2 text-right font-bold">{formatAmount(grandWifi)}</td>
                      <td className="border border-black px-2 py-2 text-right font-bold">{formatAmount(grandTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Sign-off */}
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
        </div>

        <div className="flex justify-between border-t border-stone-100 px-4 py-3">
          <div></div>
          <div className="flex gap-2">
            <GhostButton onClick={onClose}>Close</GhostButton>
            <div className="relative">
              <GoldButton
                size="sm"
                onClick={() => setShowDownloadMenu((v) => !v)}
                disabled={downloadingFormat !== null || judgeTotals.length === 0}
                icon={downloadingFormat ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              >
                {downloadingFormat ? downloadLabels[downloadingFormat] : 'Download'}
                {!downloadingFormat && <ChevronDown size={12} />}
              </GoldButton>
              {showDownloadMenu && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setShowDownloadMenu(false)} />
                  <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                    <button onClick={() => handleDownload('docx')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50">
                      <FileText size={14} className="text-blue-600" /> Word (.docx)
                    </button>
                    <button onClick={() => handleDownload('pdf')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50">
                      <FileText size={14} className="text-red-600" /> PDF (.pdf)
                    </button>
                    <button onClick={() => handleDownload('xlsx')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50">
                      <FileSpreadsheet size={14} className="text-emerald-600" /> Excel (.xlsx)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main UtilitiesModal ───────────────────────────────────────────────

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

  const [judgeName, setJudgeName] = useState(() => editingUtility?.judge_name ?? '');
  const [items, setItems] = useState<UtilityItemFormState[]>(() => buildInitialItems(editingUtility));

  const isEditing = !!editingUtility;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingItemIndex, setSavingItemIndex] = useState<number | null>(null);
  const [deletingItemIndex, setDeletingItemIndex] = useState<number | null>(null);
  const [dirtyItemIds, setDirtyItemIds] = useState<Set<string>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<'judge' | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setJudgeName('');
    setItems(buildInitialItems(null));
    setDirtyItemIds(new Set());
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
          requisition_number: item.requisition_number.trim() || undefined,  // ADDED
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
        requisition_number: newItem.requisition_number.trim() || undefined,  // ADDED
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) return;

    if (!judgeName.trim()) return;

    const filledItems = items.filter(isItemFilled);
    if (filledItems.length === 0) return;

    setIsSubmitting(true);
    try {
      await dispatch(createUtility({
        judge_name: judgeName.trim(),
        items: filledItems.map((item) => ({
          utility_type: item.utility_type,
          requisition_number: item.requisition_number.trim() || undefined,  // ADDED
          amount: item.amount,
          period: item.period.trim(),
          description: item.description.trim() || undefined,
          date_received: formatDateForAPI(item.date_received),
          date_forwarded_dass: formatDateForAPI(item.date_forwarded_dass),
          date_paid: formatDateForAPI(item.date_paid),
          status: item.status,
        })),
      })).unwrap();

      await dispatch(fetchUtilities({}));
      await dispatch(fetchHelpDeskStats());
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to create judge utility record:', err);
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
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

          <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-4">
            <div className="space-y-4">
              <div>
                <FieldLabel required>Judge Name</FieldLabel>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={isEditing ? editingUtility!.judge_name : judgeName}
                    onChange={(e) => !isEditing && setJudgeName(e.target.value)}
                    placeholder="e.g. Hon. Justice Korir"
                    className={`${inputClasses} pl-9`}
                    disabled={isEditing}
                    required
                  />
                </div>
                {isEditing && (
                  <p className="mt-1 text-[11px] text-stone-400">
                    A judge can have multiple utilities — add each utility type below.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <FieldLabel required={!isEditing}>
                    Utility Items {isEditing && `(${items.length})`}
                  </FieldLabel>
                  <GhostButton
                    onClick={isEditing ? handleAddItemToExisting : handleAddNewRow}
                    disabled={isEditing && savingItemIndex === items.length}
                    icon={
                      isEditing && savingItemIndex === items.length ? (
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
                      isEditing={isEditing}
                      isDirty={!!item.id && dirtyItemIds.has(item.id)}
                      isSaving={savingItemIndex === index}
                      isDeleting={deletingItemIndex === index}
                      onChange={handleRowChange}
                      onSave={isEditing ? handleSaveRow : undefined}
                      onDelete={isEditing ? handleDeleteRow : undefined}
                      onRemove={!isEditing ? handleRemoveRow : undefined}
                      canRemove={!isEditing && items.length > 1}
                    />
                  ))}
                </div>

                {isEditing && items.length === 0 && (
                  <p className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs text-stone-400">
                    No utility items yet. Click "Add Utility" above to record one.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-stone-100 mt-6 pt-4">
              {isEditing && (
                <GhostButton onClick={() => setDeleteTarget('judge')} disabled={isDeleting}>
                  <Trash2 size={14} />
                  Delete Judge Record
                </GhostButton>
              )}
              <GhostButton onClick={handleClose} disabled={isSubmitting || isDeleting}>
                {isEditing ? 'Close' : 'Cancel'}
              </GhostButton>
              {!isEditing && (
                <GoldButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Create Utility Record
                </GoldButton>
              )}
            </div>
          </form>
        </div>
      </div>

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
export { UtilitiesMemoModal };