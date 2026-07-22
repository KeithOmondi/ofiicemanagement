import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createCircuit,
  createBench,
  createPartHeard,
  createServiceWeek,
  createOtherPayment,
  updateCircuitStatus,
  updateBenchStatus,
  updatePartHeardStatus,
  updateServiceWeekStatus,
  updateOtherPaymentStatus,
  fetchCircuits,
  fetchBenches,
  fetchPartHeards,
  fetchServiceWeeks,
  fetchOtherPayments,
  fetchHelpDeskStats,
  type Circuit,
  type SpecialBench,
  type PartHeard,
  type ServiceWeek,
  type OtherPayment,
  type DSADetailInput,
  type Status,
  type CreateCircuitInput,
  type CreateSpecialBenchInput,
  type CreatePartHeardInput,
  type CreateServiceWeekInput,
  type CreateOtherPaymentInput,
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
  Plus,
  FileSpreadsheet,
  FileText,
  Users,
  ClipboardList,
  Save,
  ArrowRight,
  ArrowLeft,
  Edit,
  MapPin,
  Gavel,
  FileCheck,
  Calendar,
  Download,
  ChevronDown,
  Upload,
  Trash2,
  Image,
  CreditCard,
} from 'lucide-react';
import { generateMemoDocx } from '../../utils/generateMemoDocx';
import toast, { Toaster } from 'react-hot-toast';
import { generateMemoPdf } from '../../utils/generateMemoPdf';
import { generateMemoExcel } from '../../utils/generateMemoExcel';
import {
  uploadHelpdeskDocument,
  linkHelpdeskDocument,
  type DocumentEntityType,
  type DocumentFormat,
} from '../../store/slices/helpdeskDocumentsSlice';
// ─── Judges imports ──────────────────────────────────────────────────────────
import {
  fetchJudges,
  selectAllJudges,
  selectJudgesLoading,
} from '../../store/slices/JudgesSlice';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CircuitModalMode = 'circuit' | 'bench' | 'partHeard' | 'serviceWeek' | 'otherPayment';

type EditingItem = Circuit | SpecialBench | PartHeard | ServiceWeek | OtherPayment;

type WithDsaDetails = {
  dsa_details?: DSADetailInput[];
};

interface CircuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: CircuitModalMode;
  editingItem?: EditingItem | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

const DESIGNATION_SUGGESTIONS = [
  'Presiding Judge',
  'Judge',
  'Magistrate',
  'Senior Principal Magistrate',
  'Principal Magistrate',
  'Senior Resident Magistrate',
  'Resident Magistrate',
  'Chief Magistrate',
  'Deputy Registrar',
  'Senior Deputy Registrar',
];

const getDefaultDate = (daysOffset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

type BasicInfoType = {
  name?: string;
  location?: string;
  case_reference?: string;
  approved_by?: string;
  week_number?: string;
  year?: string;
  description?: string;
  start_date: string;
  end_date: string;
};

const getDefaultBasicInfo = (mode: CircuitModalMode): BasicInfoType => {
  const base = {
    start_date: getDefaultDate(7),
    end_date: getDefaultDate(14),
  };

  switch (mode) {
    case 'circuit':
      return { name: '', location: '', ...base };
    case 'bench':
      return { name: '', case_reference: '', ...base };
    case 'partHeard':
      return { case_reference: '', approved_by: '', ...base };
    case 'serviceWeek':
      return { name: '', week_number: '', year: new Date().getFullYear().toString(), ...base };
    case 'otherPayment':
      return { name: '', description: '', ...base };
    default:
      return { name: '', ...base };
  }
};

const getDefaultDsaDetails = (): Omit<DSADetailInput, 'id'>[] => [
  { judge_name: '', pj_number: '', designation: '', dsa_per_day: 0, days: 0, notes: '' },
];

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

// ─── Signature Section ──────────────────────────────────────────────────────

interface SignatureSectionProps {
  userSignature: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isLoading: boolean;
}

function SignatureSection({ userSignature, onUpload, onRemove, isLoading }: SignatureSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, WEBP, GIF, or SVG).');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Signature image must be less than 2MB.');
      e.target.value = '';
      return;
    }

    await onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Image size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Digital Signature</h4>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />
          <GhostButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          >
            {isLoading ? 'Uploading…' : 'Upload Signature'}
          </GhostButton>
          {userSignature && (
            <GhostButton onClick={onRemove} disabled={isLoading} icon={<Trash2 size={14} />}>
              Remove
            </GhostButton>
          )}
        </div>
      </div>

      {userSignature ? (
        <div className="flex items-center gap-4 p-3 bg-white rounded border border-stone-200">
          <img src={userSignature} alt="Your signature" className="max-h-16 w-auto object-contain" />
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
  );
}

// ─── Step 1: Basic Info Form ──────────────────────────────────────────────

interface BasicInfoFormProps {
  mode: CircuitModalMode;
  basicInfo: BasicInfoType;
  setBasicInfo: (info: BasicInfoType) => void;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ mode, basicInfo, setBasicInfo }) => {
  const getTitleAndIcon = () => {
    switch (mode) {
      case 'circuit':
        return { title: 'Circuit Information', icon: <MapPin size={16} className="text-[#c9a84c]" /> };
      case 'bench':
        return { title: 'Bench Information', icon: <Gavel size={16} className="text-[#c9a84c]" /> };
      case 'partHeard':
        return { title: 'Part-Heard Information', icon: <FileCheck size={16} className="text-[#c9a84c]" /> };
      case 'serviceWeek':
        return { title: 'Service Week Information', icon: <Calendar size={16} className="text-[#c9a84c]" /> };
      case 'otherPayment':
        return { title: 'Other Payment Information', icon: <CreditCard size={16} className="text-[#c9a84c]" /> };
      default:
        return { title: 'Information', icon: <ClipboardList size={16} className="text-[#c9a84c]" /> };
    }
  };

  const { title, icon } = getTitleAndIcon();

  const renderFields = () => {
    switch (mode) {
      case 'circuit':
        return (
          <>
            <div>
              <FieldLabel required>Circuit Name</FieldLabel>
              <input
                type="text"
                value={basicInfo.name || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                placeholder="e.g. Mombasa Circuit"
                className={inputClasses}
              />
            </div>
            <div>
              <FieldLabel>Location (Optional)</FieldLabel>
              <input
                type="text"
                value={basicInfo.location || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, location: e.target.value })}
                placeholder="e.g. Mombasa"
                className={inputClasses}
              />
            </div>
          </>
        );

      case 'bench':
        return (
          <>
            <div>
              <FieldLabel required>Bench Name / Case</FieldLabel>
              <input
                type="text"
                value={basicInfo.name || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                placeholder="e.g. Special Bench - Criminal Division"
                className={inputClasses}
              />
            </div>
            <div>
              <FieldLabel>Case Reference (Optional)</FieldLabel>
              <input
                type="text"
                value={basicInfo.case_reference || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, case_reference: e.target.value })}
                placeholder="e.g. CR-2024-001"
                className={inputClasses}
              />
            </div>
          </>
        );

      case 'partHeard':
        return (
          <>
            <div>
              <FieldLabel required>Case Reference</FieldLabel>
              <input
                type="text"
                value={basicInfo.case_reference || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, case_reference: e.target.value })}
                placeholder="e.g. CR-2024-001"
                className={inputClasses}
              />
            </div>
            <div>
              <FieldLabel>Approved By (Optional)</FieldLabel>
              <input
                type="text"
                value={basicInfo.approved_by || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, approved_by: e.target.value })}
                placeholder="e.g. Hon. Chief Justice"
                className={inputClasses}
              />
            </div>
          </>
        );

      case 'serviceWeek':
        return (
          <>
            <div>
              <FieldLabel required>Week Name / Title</FieldLabel>
              <input
                type="text"
                value={basicInfo.name || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                placeholder="e.g. Service Week - July 2026"
                className={inputClasses}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Week Number</FieldLabel>
                <input
                  type="text"
                  value={basicInfo.week_number || ''}
                  onChange={(e) => setBasicInfo({ ...basicInfo, week_number: e.target.value })}
                  placeholder="e.g. WK-28"
                  className={inputClasses}
                />
              </div>
              <div>
                <FieldLabel required>Year</FieldLabel>
                <input
                  type="text"
                  value={basicInfo.year || new Date().getFullYear().toString()}
                  onChange={(e) => setBasicInfo({ ...basicInfo, year: e.target.value })}
                  placeholder="e.g. 2026"
                  className={inputClasses}
                />
              </div>
            </div>
          </>
        );

      case 'otherPayment':
        return (
          <>
            <div>
              <FieldLabel required>Payment Name / Description</FieldLabel>
              <input
                type="text"
                value={basicInfo.name || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                placeholder="e.g. Court Annexed Mediation - July 2026"
                className={inputClasses}
              />
            </div>
            <div>
              <FieldLabel>Description (Optional)</FieldLabel>
              <input
                type="text"
                value={basicInfo.description || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, description: e.target.value })}
                placeholder="e.g. Additional details about the payment"
                className={inputClasses}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className="text-sm font-semibold text-stone-800">{title}</h4>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {renderFields()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Start Date</FieldLabel>
              <input
                type="date"
                value={basicInfo.start_date || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, start_date: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <FieldLabel required>End Date</FieldLabel>
              <input
                type="date"
                value={basicInfo.end_date || ''}
                onChange={(e) => setBasicInfo({ ...basicInfo, end_date: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-700 flex items-center gap-2">
              <span className="text-lg">ℹ️</span>
              DSA details can be added in the next step. Days will be automatically calculated from the date range.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step 2: DSA Details Form (with judges integration) ──────────────────

interface DSADetailsFormProps {
  dsaDetails: Omit<DSADetailInput, 'id'>[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onChange: (index: number, field: keyof Omit<DSADetailInput, 'id'>, value: string | number) => void;
  onJudgeSelect: (index: number, judgeId: string) => void;
  onJudgeNameChange: (index: number, value: string) => void;
  calculateTotal: (rate: number, days: number) => number;
  judges: { id: string; name: string; pj_number: string; daily_dsa_rate: number }[];
  judgesLoading: boolean;
  daysFromDates: number; // computed days from start/end dates
}

// ─── Combobox component for judge name ─────────────────────────────────────

interface JudgeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  judges: { id: string; name: string; pj_number: string; daily_dsa_rate: number }[];
  judgesLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
}



// ─── Step 2: DSA Details Form (with judges integration) ──────────────────

interface DSADetailsFormProps {
  dsaDetails: Omit<DSADetailInput, 'id'>[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onChange: (index: number, field: keyof Omit<DSADetailInput, 'id'>, value: string | number) => void;
  onJudgeNameChange: (index: number, value: string) => void;
  calculateTotal: (rate: number, days: number) => number;
  judges: { id: string; name: string; pj_number: string; daily_dsa_rate: number }[];
  judgesLoading: boolean;
  daysFromDates: number;
}

// ─── Combobox component for judge name ─────────────────────────────────────

interface JudgeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  judges: { id: string; name: string; pj_number: string; daily_dsa_rate: number }[];
  judgesLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const JudgeCombobox: React.FC<JudgeComboboxProps> = ({
  value,
  onChange,
  judges,
  judgesLoading,
  placeholder = 'Select or type judge name...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep inputValue in sync with the `value` prop without an effect.
  // This is React's recommended "adjust state during render" pattern —
  // it runs synchronously in the render itself, not after commit, so
  // it doesn't cause an extra render pass the way an effect would.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value);
  }

  // Derived data — no state, no effect, just computed on every render.
  const filteredJudges = useMemo(() => {
    const search = inputValue.toLowerCase().trim();
    if (!search) return judges;
    return judges.filter(
      (j) =>
        j.name.toLowerCase().includes(search) ||
        j.pj_number.toLowerCase().includes(search)
    );
  }, [inputValue, judges]);

  // Legitimate effect: subscribing to a real external system (DOM events).
  // setState happens inside the event callback, not synchronously in the
  // effect body, so this one doesn't trigger the warning.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectJudge = (judge: { id: string; name: string; pj_number: string; daily_dsa_rate: number }) => {
    setInputValue(judge.name);
    setPrevValue(judge.name); // keep the render-time sync check consistent
    onChange(judge.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setPrevValue(val); // avoid the sync check clobbering this on next render
    onChange(val);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        disabled={disabled || judgesLoading}
        className={`w-full rounded border border-stone-200 bg-white px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none ${disabled || judgesLoading ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : ''}`}
      />
      {isOpen && filteredJudges.length > 0 && !judgesLoading && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border border-stone-200 bg-white shadow-lg">
          {filteredJudges.map((judge) => (
            <button
              key={judge.id}
              type="button"
              onClick={() => handleSelectJudge(judge)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0"
            >
              <span className="font-medium text-stone-800">{judge.name}</span>
              <span className="text-stone-400">
                PJ: {judge.pj_number} · Rate: {judge.daily_dsa_rate.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
      {judgesLoading && (
        <div className="absolute inset-y-0 right-2 flex items-center">
          <Loader2 size={14} className="animate-spin text-stone-400" />
        </div>
      )}
    </div>
  );
};

const DSADetailsForm: React.FC<DSADetailsFormProps> = ({
  dsaDetails,
  onAddRow,
  onRemoveRow,
  onChange,
  onJudgeNameChange,
  calculateTotal,
  judges,
  judgesLoading,
  daysFromDates,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#c9a84c]" />
            <h4 className="text-sm font-semibold text-stone-800">DSA Details</h4>
            <span className="text-xs text-stone-400">({dsaDetails.length} members)</span>
            {daysFromDates > 0 && (
              <span className="ml-2 text-xs bg-[#c9a84c]/20 text-[#1a3d1c] px-2 py-0.5 rounded-full">
                {daysFromDates} days (from date range)
              </span>
            )}
          </div>
          <GoldButton size="sm" onClick={onAddRow} icon={<Plus size={14} />}>
            Add Member
          </GoldButton>
        </div>

        <datalist id="designation-suggestions">
          {DESIGNATION_SUGGESTIONS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[10px] uppercase text-stone-500">
                <th className="pb-2 pr-2 font-semibold">Judge Name</th>
                <th className="pb-2 pr-2 font-semibold">PJ Number</th>
                <th className="pb-2 pr-2 font-semibold">Designation</th>
                <th className="pb-2 pr-2 font-semibold text-right">Rate (KES)</th>
                <th className="pb-2 pr-2 font-semibold text-right">Days</th>
                <th className="pb-2 pr-2 font-semibold text-right">Total</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {dsaDetails.map((detail, index) => {
                return (
                  <tr key={index} className="border-b border-stone-100">
                    <td className="py-2 pr-2 min-w-[180px]">
                      <JudgeCombobox
                        value={detail.judge_name}
                        onChange={(val) => onJudgeNameChange(index, val)}
                        judges={judges}
                        judgesLoading={judgesLoading}
                        placeholder="Select or type judge name..."
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={detail.pj_number}
                        onChange={(e) => onChange(index, 'pj_number', e.target.value)}
                        placeholder="Enter PJ number"
                        className="w-full rounded border border-stone-200 px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        list="designation-suggestions"
                        value={detail.designation || ''}
                        onChange={(e) => onChange(index, 'designation', e.target.value)}
                        placeholder="e.g. Judge"
                        className="w-full rounded border border-stone-200 px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={detail.dsa_per_day || ''}
                        onChange={(e) => onChange(index, 'dsa_per_day', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-24 rounded border border-stone-200 px-2 py-1 text-right text-xs focus:border-[#1a3d1c] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={detail.days || ''}
                        onChange={(e) => onChange(index, 'days', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="w-16 rounded border border-stone-200 px-2 py-1 text-right text-xs focus:border-[#1a3d1c] focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2 text-right font-medium text-emerald-700">
                      {calculateTotal(detail.dsa_per_day, detail.days).toLocaleString()}
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => onRemoveRow(index)}
                        disabled={dsaDetails.length <= 1}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-200 bg-stone-100">
                <td colSpan={5} className="py-3 pr-2 text-right font-semibold text-stone-800">
                  Grand Total:
                </td>
                <td className="py-3 pr-2 text-right font-bold text-[#1a3d1c]">
                  {dsaDetails.reduce((sum, d) => sum + (d.dsa_per_day * d.days), 0).toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Step 3: Memo Preview ──────────────────────────────────────────────────

interface MemoPreviewProps {
  mode: CircuitModalMode;
  basicInfo: BasicInfoType;
  dsaDetails: Omit<DSADetailInput, 'id'>[];
  calculateTotal: (rate: number, days: number) => number;
  calculateGrandTotal: () => number;
  formatDate: (date: string) => string;
  onEdit: () => void;
  onEditDsa: () => void;
  signatureUrl?: string | null;
  onDocumentUploaded?: (documentId: string) => void;
}

type DownloadFormat = 'docx' | 'pdf' | 'xlsx';

const MemoPreview: React.FC<MemoPreviewProps> = ({
  mode,
  basicInfo,
  dsaDetails,
  calculateTotal,
  calculateGrandTotal,
  formatDate,
  onEdit,
  onEditDsa,
  signatureUrl,
  onDocumentUploaded,
}) => {
  const getSubject = () => {
    switch (mode) {
      case 'circuit': return basicInfo.name || 'Circuit Details';
      case 'bench': return basicInfo.name || 'Bench Details';
      case 'partHeard': return basicInfo.case_reference || 'Part-Heard Details';
      case 'serviceWeek': return basicInfo.name || 'Service Week Details';
      case 'otherPayment': return basicInfo.name || 'Other Payment Details';
      default: return 'Details';
    }
  };

  const getFrom = () => {
    switch (mode) {
      case 'circuit': return 'HIGH COURT SUPPORT OFFICE -ORHC';
      case 'bench': return 'BENCH MANAGEMENT OFFICE -ORHC';
      case 'partHeard': return 'PART-HEARD MANAGEMENT OFFICE -ORHC';
      case 'serviceWeek': return 'SERVICE WEEK MANAGEMENT OFFICE -ORHC';
      case 'otherPayment': return 'OTHER PAYMENTS MANAGEMENT OFFICE -ORHC';
      default: return 'HIGH COURT SUPPORT OFFICE -ORHC';
    }
  };

  const getTo = () => 'REGISTRAR, HIGH COURT/ ORHC AIE HOLDER';

  const currentUser = useAppSelector((state) => state.auth.user);

  const validDetails = dsaDetails.filter(d => d.judge_name.trim() && d.pj_number.trim() && d.dsa_per_day > 0 && d.days > 0);
  const grandTotal = calculateGrandTotal();

  const [toField, setToField] = useState(() => getTo());
  const [fromField, setFromField] = useState(() => getFrom());
  const [subjectField, setSubjectField] = useState(() => getSubject());
  const dispatch = useAppDispatch();

  const [refField, setRefField] = useState(() => {
    const prefix: Record<string, string> = {
      circuit: 'RHC/CIRCUIT',
      bench: 'RHC/BENCH',
      partHeard: 'RHC/PART',
      serviceWeek: 'RHC/SERVICE',
      otherPayment: 'RHC/OTHER',
    };
    const p = prefix[mode] || 'RHC/AIE';
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${p}/${random}`;
  });

  const [dateField, setDateField] = useState(() => {
    if (!basicInfo.start_date) {
      return new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return new Date(basicInfo.start_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  const [bodyText, setBodyText] = useState(() =>
    `The following is a detailed breakdown of the ${getSubject().toLowerCase()} for the period ${formatDate(basicInfo.start_date)} to ${formatDate(basicInfo.end_date)}.`
  );

  const [signatoryName, setSignatoryName] = useState(() => currentUser?.full_name || '');

  const editableLineClasses =
    'flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none';

  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const buildRows = () =>
    validDetails.map((d) => ({
      judgeName: d.judge_name,
      pjNumber: d.pj_number,
      designation: d.designation || '',
      rate: d.dsa_per_day,
      days: d.days,
      total: calculateTotal(d.dsa_per_day, d.days),
    }));

  const handleDownload = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);

    try {
      const rows = buildRows();
      const shared = {
        to: toField,
        from: fromField,
        ref: refField,
        date: dateField,
        subject: subjectField,
        bodyText,
        rows,
        grandTotal,
        amountInWords: '',
        signatoryName,
      };

      let blob: Blob | null = null;

      if (format === 'docx') {
        blob = await generateMemoDocx({
          ...shared,
          crestUrl: JUDICIARY_CREST_SRC,
          signatureUrl: signatureUrl || undefined,
        });
      } else if (format === 'pdf') {
        blob = await generateMemoPdf({
          ...shared,
          crestUrl: JUDICIARY_CREST_SRC,
          signatureUrl: signatureUrl || undefined,
        });
      } else if (format === 'xlsx') {
        blob = generateMemoExcel(shared);
      }

      if (!blob) {
        throw new Error('Generator returned no blob');
      }

      const safeRef = (refField || 'memo').replace(/[\\/:*?"<>|]/g, '-');
      const filename = `${safeRef}.${format}`;

      const entityTypeMap: Record<CircuitModalMode, DocumentEntityType> = {
        circuit: 'circuit',
        bench: 'bench',
        partHeard: 'partHeard',
        serviceWeek: 'serviceWeek',
        otherPayment: 'otherPayment',
      };

      const result = await dispatch(
        uploadHelpdeskDocument({
          blob,
          filename,
          ref: refField,
          subject: subjectField,
          entity_type: entityTypeMap[mode],
          format: format as DocumentFormat,
        })
      ).unwrap();

      onDocumentUploaded?.(result.id);

      toast.success(`${format.toUpperCase()} document saved to the system.`);

    } catch (err) {
      console.error(`Failed to generate/upload ${format} memo:`, err);
      toast.error('Failed to save document. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Preparing Word…',
    pdf: 'Preparing PDF…',
    xlsx: 'Preparing Excel…',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-[#c9a84c]" />
          Memo Preview
        </h4>
        <div className="flex gap-2">
          <GhostButton onClick={onEdit} icon={<Edit size={12} />}>
            Edit Info
          </GhostButton>
          <GhostButton onClick={onEditDsa} icon={<Edit size={12} />}>
            Edit Details
          </GhostButton>

          <div className="relative">
            <GoldButton
              size="sm"
              onClick={() => setShowDownloadMenu((v) => !v)}
              disabled={downloadingFormat !== null}
              icon={downloadingFormat ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            >
              {downloadingFormat ? downloadLabels[downloadingFormat] : 'Download'}
              {!downloadingFormat && <ChevronDown size={12} />}
            </GoldButton>

            {showDownloadMenu && (
              <>
                <div className="fixed inset-0 z-0" onClick={() => setShowDownloadMenu(false)} />
                <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => handleDownload('docx')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                  >
                    <FileText size={14} className="text-blue-600" />
                    Word (.docx)
                  </button>
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                  >
                    <FileText size={14} className="text-red-600" />
                    PDF (.pdf)
                  </button>
                  <button
                    onClick={() => handleDownload('xlsx')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-600" />
                    Excel (.xlsx)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Memo Preview - Proper A4 layout */}
      <div className="border border-stone-300 bg-white shadow-sm font-sans text-black" style={{ minHeight: '297mm' }}>
        <div className="flex flex-col" style={{ minHeight: '297mm' }}>
          <div className="p-10">
            <div className="flex justify-center mb-3">
              <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-20 w-auto object-contain" />
            </div>
            <div className="text-center mb-6">
              <p className="text-lg font-bold uppercase leading-snug">
                OFFICE OF THE REGISTRAR HIGH COURT
              </p>
              <p className="text-lg font-bold uppercase leading-snug border-b-2 border-black inline-block pb-2 px-1">
                INTERNAL MEMO
              </p>
            </div>

            <div className="space-y-3 text-sm font-bold mb-8">
              <div className="flex">
                <span className="w-24 shrink-0">TO</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={toField}
                  onChange={(e) => setToField(e.target.value)}
                  className={`${editableLineClasses} uppercase`}
                />
              </div>
              <div className="flex">
                <span className="w-24 shrink-0">FROM</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={fromField}
                  onChange={(e) => setFromField(e.target.value)}
                  className={`${editableLineClasses} uppercase`}
                />
              </div>
              <div className="flex">
                <span className="w-24 shrink-0">REF</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={refField}
                  onChange={(e) => setRefField(e.target.value)}
                  className={editableLineClasses}
                />
              </div>
              <div className="flex">
                <span className="w-24 shrink-0">DATE</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value)}
                  className={editableLineClasses}
                />
              </div>
              <div className="flex border-b-2 border-black pb-3">
                <span className="w-24 shrink-0">SUBJECT</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={subjectField}
                  onChange={(e) => setSubjectField(e.target.value)}
                  className={`${editableLineClasses} uppercase`}
                />
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={3}
                className={`${editableLineClasses} block w-full resize-none leading-relaxed`}
              />

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-black">
                  <thead>
                    <tr>
                      <th className="border border-black px-2 py-1 text-left text-xs font-bold">#</th>
                      <th className="border border-black px-2 py-1 text-left text-xs font-bold">Judge Name</th>
                      <th className="border border-black px-2 py-1 text-left text-xs font-bold">P.J Number</th>
                      <th className="border border-black px-2 py-1 text-left text-xs font-bold">Designation</th>
                      <th className="border border-black px-2 py-1 text-right text-xs font-bold">Rate (KES)</th>
                      <th className="border border-black px-2 py-1 text-right text-xs font-bold">Days</th>
                      <th className="border border-black px-2 py-1 text-right text-xs font-bold">Total (KES)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validDetails.length > 0 ? (
                      validDetails.map((detail, index) => (
                        <tr key={index}>
                          <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                          <td className="border border-black px-2 py-1 font-medium">{detail.judge_name}</td>
                          <td className="border border-black px-2 py-1">{detail.pj_number}</td>
                          <td className="border border-black px-2 py-1">{detail.designation || '—'}</td>
                          <td className="border border-black px-2 py-1 text-right">{detail.dsa_per_day.toLocaleString()}</td>
                          <td className="border border-black px-2 py-1 text-right">{detail.days}</td>
                          <td className="border border-black px-2 py-1 text-right font-medium">
                            {calculateTotal(detail.dsa_per_day, detail.days).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="border border-black px-2 py-4 text-center text-stone-500 text-sm">
                          No DSA details available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {validDetails.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={6} className="border border-black px-2 py-2 text-right font-bold">
                          GRAND TOTAL
                        </td>
                        <td className="border border-black px-2 py-2 text-right font-bold">
                          {grandTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          <div className="flex-1"></div>
          <div className="p-10 pt-0">
            <div className="space-y-1">
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Signatory name"
                className={`${editableLineClasses} block text-sm font-bold`}
              />

              {signatureUrl && (
                <div className="py-1">
                  <img src={signatureUrl} alt="Signature" className="max-h-12 w-auto object-contain" />
                </div>
              )}

              <input
                type="text"
                value={fromField}
                onChange={(e) => setFromField(e.target.value)}
                className={`${editableLineClasses} block text-sm font-bold underline uppercase`}
              />
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
      </div>
    </div>
  );
};

// ─── Helper to check item type ─────────────────────────────────────────────

function isCircuit(item: EditingItem | null | undefined): item is Circuit {
  return !!item && 'location' in item && !('case_reference' in item) && !('week_number' in item) && !('description' in item);
}

function isSpecialBench(item: EditingItem | null | undefined): item is SpecialBench {
  return !!item && 'name' in item && 'case_reference' in item && !('approved_by' in item) && !('week_number' in item);
}

function isPartHeard(item: EditingItem | null | undefined): item is PartHeard {
  return !!item && 'case_reference' in item && 'approved_by' in item && !('name' in item);
}

function isServiceWeek(item: EditingItem | null | undefined): item is ServiceWeek {
  return !!item && 'week_number' in item && 'year' in item;
}

function isOtherPayment(item: EditingItem | null | undefined): item is OtherPayment {
  return !!item && 'description' in item && !('location' in item) && !('case_reference' in item) && !('week_number' in item);
}

// ─── Main Circuit Modal ──────────────────────────────────────────────────────

export const CircuitModal: React.FC<CircuitModalProps> = ({
  isOpen,
  onClose,
  mode = 'circuit',
  editingItem,
}) => {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.helpdesk.loading.mutating);
  const currentUser = useAppSelector(selectCurrentUser);
  const signatureLoading = useAppSelector(selectUsersSignatureLoading);
  const judgesFetchedRef = useRef(false);

  // Judges state
  const judges = useAppSelector(selectAllJudges);
  const judgesLoading = useAppSelector(selectJudgesLoading);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [basicInfo, setBasicInfo] = useState<BasicInfoType>(() => getDefaultBasicInfo(mode));

  const [dsaDetails, setDsaDetails] = useState<Omit<DSADetailInput, 'id'>[]>(getDefaultDsaDetails);

  const [pendingDocumentId, setPendingDocumentId] = useState<string | undefined>();

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // ── Fetch judges when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (isOpen && !judgesFetchedRef.current && !judgesLoading) {
      judgesFetchedRef.current = true;
      dispatch(fetchJudges({ is_active: true, limit: 100 }));
    }
  }, [isOpen, judgesLoading, dispatch]);

  // ── Compute days from date range ───────────────────────────────────────
  const computeDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diffTime = e.getTime() - s.getTime();
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return diffDays;
  };

  const daysFromDates = computeDays(basicInfo.start_date, basicInfo.end_date);

  // ── Update basicInfo and, in the same event, sync DSA row days ─────────
  const handleBasicInfoChange = (info: BasicInfoType) => {
    setBasicInfo(info);
    const newDays = computeDays(info.start_date, info.end_date);
    if (newDays > 0) {
      setDsaDetails((prev) =>
        prev.map((row) => ({
          ...row,
          days: newDays,
        }))
      );
    }
  };

  // ── Reset / load editing item ──────────────────────────────────────────
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      if (editingItem) {
        if (isCircuit(editingItem)) {
          setBasicInfo({
            name: editingItem.name,
            location: editingItem.location || '',
            start_date: editingItem.start_date.split('T')[0],
            end_date: editingItem.end_date.split('T')[0],
          });
        } else if (isPartHeard(editingItem)) {
          setBasicInfo({
            case_reference: editingItem.case_reference,
            approved_by: editingItem.approved_by || '',
            start_date: editingItem.start_date.split('T')[0],
            end_date: editingItem.end_date.split('T')[0],
          });
        } else if (isSpecialBench(editingItem)) {
          setBasicInfo({
            name: editingItem.name,
            case_reference: editingItem.case_reference || '',
            start_date: editingItem.start_date.split('T')[0],
            end_date: editingItem.end_date.split('T')[0],
          });
        } else if (isServiceWeek(editingItem)) {
          setBasicInfo({
            name: editingItem.name,
            week_number: editingItem.week_number,
            year: editingItem.year,
            start_date: editingItem.start_date.split('T')[0],
            end_date: editingItem.end_date.split('T')[0],
          });
        } else if (isOtherPayment(editingItem)) {
          setBasicInfo({
            name: editingItem.name,
            description: editingItem.description || '',
            start_date: editingItem.start_date.split('T')[0],
            end_date: editingItem.end_date.split('T')[0],
          });
        }

        const details = (editingItem as EditingItem & WithDsaDetails).dsa_details;
        if (details && details.length > 0) {
          setDsaDetails(
            details.map((d: DSADetailInput) => ({
              judge_name: d.judge_name,
              pj_number: d.pj_number,
              designation: d.designation || '',
              dsa_per_day: d.dsa_per_day,
              days: d.days,
              notes: '',
            }))
          );
        } else {
          setDsaDetails(getDefaultDsaDetails());
        }
        setCurrentStep(2);
      } else {
        setBasicInfo(getDefaultBasicInfo(mode));
        setDsaDetails(getDefaultDsaDetails());
        setCurrentStep(1);
      }
      setPendingDocumentId(undefined);
    }
  }

  const resetForm = () => {
    setBasicInfo(getDefaultBasicInfo(mode));
    setDsaDetails(getDefaultDsaDetails());
    setCurrentStep(1);
    setPendingDocumentId(undefined);
  };

  const handleAddDsaRow = () => {
    setDsaDetails((prev) => [
      ...prev,
      { judge_name: '', pj_number: '', designation: '', dsa_per_day: 0, days: daysFromDates, notes: '' },
    ]);
  };

  const handleRemoveDsaRow = (index: number) => {
    setDsaDetails((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  // ── Field-level DSA change ──────────────────────────────────────────────
  const handleDsaChange = (index: number, field: keyof Omit<DSADetailInput, 'id'>, value: string | number) => {
    setDsaDetails((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // ── Judge selection: derives judge_name, pj_number, and dsa_per_day ─────
  const handleJudgeSelect = (index: number, judgeId: string) => {
    const judge = judges.find((j) => j.id === judgeId);
    if (judge) {
      setDsaDetails((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          judge_name: judge.name,
          pj_number: judge.pj_number,
          dsa_per_day: judge.daily_dsa_rate,
        };
        return updated;
      });
    }
  };

  // ── Judge name free text change ──────────────────────────────────────────
  const handleJudgeNameChange = (index: number, value: string) => {
    setDsaDetails((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], judge_name: value };
      return updated;
    });
  };

  const calculateTotal = (dsa_per_day: number, days: number): number => {
    return dsa_per_day * days;
  };

  const calculateGrandTotal = (): number => {
    return dsaDetails.reduce((sum, d) => sum + (d.dsa_per_day * d.days), 0);
  };

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

  const handleMemoUploaded = (docId: string) => {
    setPendingDocumentId(docId);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      const hasRequiredFields = () => {
        switch (mode) {
          case 'circuit':
            return !!(basicInfo.name?.trim() && basicInfo.start_date && basicInfo.end_date);
          case 'bench':
            return !!(basicInfo.name?.trim() && basicInfo.start_date && basicInfo.end_date);
          case 'partHeard':
            return !!(basicInfo.case_reference?.trim() && basicInfo.start_date && basicInfo.end_date);
          case 'serviceWeek':
            return !!(basicInfo.name?.trim() && basicInfo.start_date && basicInfo.end_date && basicInfo.week_number?.trim());
          case 'otherPayment':
            return !!(basicInfo.name?.trim() && basicInfo.start_date && basicInfo.end_date);
          default:
            return false;
        }
      };
      if (!hasRequiredFields()) {
        toast.error('Please fill in all required fields.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const hasValidRow = dsaDetails.some(d => d.judge_name.trim() && d.pj_number.trim() && d.dsa_per_day > 0 && d.days > 0);
      if (!hasValidRow) {
        toast.error('Please add at least one DSA entry with judge name, PJ number, rate, and days.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  const handleCreate = async () => {
    try {
      const dsaData = dsaDetails
        .filter(d => d.judge_name.trim() && d.pj_number.trim() && d.dsa_per_day > 0 && d.days > 0)
        .map(d => ({
          judge_name: d.judge_name.trim(),
          pj_number: d.pj_number.trim(),
          designation: d.designation || undefined,
          dsa_per_day: d.dsa_per_day,
          days: d.days,
          notes: undefined,
        }));

      let createdId: string | undefined;

      if (editingItem) {
        const statusUpdate = { id: editingItem.id, status: 'Pending' as Status };
        switch (mode) {
          case 'circuit':
            await dispatch(updateCircuitStatus(statusUpdate)).unwrap();
            break;
          case 'bench':
            await dispatch(updateBenchStatus(statusUpdate)).unwrap();
            break;
          case 'partHeard':
            await dispatch(updatePartHeardStatus(statusUpdate)).unwrap();
            break;
          case 'serviceWeek':
            await dispatch(updateServiceWeekStatus(statusUpdate)).unwrap();
            break;
          case 'otherPayment':
            await dispatch(updateOtherPaymentStatus(statusUpdate)).unwrap();
            break;
          default:
            throw new Error('Invalid mode');
        }
        toast.success(`${getModalTitle()} updated successfully.`);
        createdId = editingItem.id;
      } else {
        let result;
        switch (mode) {
          case 'circuit': {
            const input: CreateCircuitInput = {
              name: basicInfo.name!.trim(),
              location: basicInfo.location?.trim() || undefined,
              start_date: basicInfo.start_date,
              end_date: basicInfo.end_date,
              dsa_details: dsaData,
            };
            result = await dispatch(createCircuit(input)).unwrap();
            break;
          }
          case 'bench': {
            const input: CreateSpecialBenchInput = {
              name: basicInfo.name!.trim(),
              case_reference: basicInfo.case_reference?.trim() || undefined,
              start_date: basicInfo.start_date,
              end_date: basicInfo.end_date,
              dsa_details: dsaData,
            };
            result = await dispatch(createBench(input)).unwrap();
            break;
          }
          case 'partHeard': {
            const input: CreatePartHeardInput = {
              case_reference: basicInfo.case_reference!.trim(),
              approved_by: basicInfo.approved_by?.trim() || undefined,
              start_date: basicInfo.start_date,
              end_date: basicInfo.end_date,
              dsa_details: dsaData,
            };
            result = await dispatch(createPartHeard(input)).unwrap();
            break;
          }
          case 'serviceWeek': {
            const input: CreateServiceWeekInput = {
              name: basicInfo.name!.trim(),
              week_number: basicInfo.week_number!.trim(),
              year: basicInfo.year!,
              start_date: basicInfo.start_date,
              end_date: basicInfo.end_date,
              dsa_details: dsaData,
            };
            result = await dispatch(createServiceWeek(input)).unwrap();
            break;
          }
          case 'otherPayment': {
            const input: CreateOtherPaymentInput = {
              name: basicInfo.name!.trim(),
              description: basicInfo.description?.trim() || undefined,
              start_date: basicInfo.start_date,
              end_date: basicInfo.end_date,
              dsa_details: dsaData,
            };
            result = await dispatch(createOtherPayment(input)).unwrap();
            break;
          }
          default:
            throw new Error('Invalid mode');
        }
        toast.success(`${getModalTitle()} created successfully.`);
        createdId = result?.id;
      }

      if (pendingDocumentId && createdId) {
        try {
          await dispatch(
            linkHelpdeskDocument({
              id: pendingDocumentId,
              entity_type: mode as DocumentEntityType,
              entity_id: createdId,
            })
          ).unwrap();
          toast.success('Memo linked to the record.');
        } catch {
          toast.error('Record created, but failed to link the memo. You can attach it manually later.');
        }
      }

      switch (mode) {
        case 'circuit':
          await dispatch(fetchCircuits({}));
          break;
        case 'bench':
          await dispatch(fetchBenches({}));
          break;
        case 'partHeard':
          await dispatch(fetchPartHeards({}));
          break;
        case 'serviceWeek':
          await dispatch(fetchServiceWeeks({}));
          break;
        case 'otherPayment':
          await dispatch(fetchOtherPayments({}));
          break;
        default:
          break;
      }
      await dispatch(fetchHelpDeskStats());

      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error('Failed to save. Please try again.');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getModalTitle = () => {
    const modeMap = {
      circuit: 'Circuit',
      bench: 'Bench',
      partHeard: 'Part-Heard',
      serviceWeek: 'Service Week',
      otherPayment: 'Other Payment',
    };
    const label = modeMap[mode] || 'Item';
    if (editingItem) {
      return `Edit ${label}`;
    }
    return `Add New ${label}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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

      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">{getModalTitle()}</h3>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 1 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                    1
                  </div>
                  <span className="text-xs font-medium">Basic Info</span>
                </div>
                <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-[#c9a84c]' : 'bg-stone-200'}`} />
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 2 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                    2
                  </div>
                  <span className="text-xs font-medium">DSA Details</span>
                </div>
                <div className={`h-0.5 w-8 ${currentStep >= 3 ? 'bg-[#c9a84c]' : 'bg-stone-200'}`} />
                <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 3 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                    3
                  </div>
                  <span className="text-xs font-medium">Preview</span>
                </div>
              </div>
              <span className="text-xs text-stone-400">
                Step {currentStep} of 3
              </span>
            </div>
          </div>

          {currentStep === 1 && (
            <BasicInfoForm
              mode={mode}
              basicInfo={basicInfo}
              setBasicInfo={handleBasicInfoChange}
            />
          )}
          {currentStep === 2 && (
            <DSADetailsForm
              dsaDetails={dsaDetails}
              onAddRow={handleAddDsaRow}
              onRemoveRow={handleRemoveDsaRow}
              onChange={handleDsaChange}
              onJudgeSelect={handleJudgeSelect}
              onJudgeNameChange={handleJudgeNameChange}
              calculateTotal={calculateTotal}
              judges={judges}
              judgesLoading={judgesLoading}
              daysFromDates={daysFromDates}
            />
          )}
          {currentStep === 3 && (
            <div className="space-y-4">
              <SignatureSection
                userSignature={currentUser?.signature_url || null}
                onUpload={handleSignatureUpload}
                onRemove={handleSignatureRemove}
                isLoading={signatureLoading}
              />

              <MemoPreview
                mode={mode}
                basicInfo={basicInfo}
                dsaDetails={dsaDetails}
                calculateTotal={calculateTotal}
                calculateGrandTotal={calculateGrandTotal}
                formatDate={formatDate}
                onEdit={() => setCurrentStep(1)}
                onEditDsa={() => setCurrentStep(2)}
                signatureUrl={currentUser?.signature_url}
                onDocumentUploaded={handleMemoUploaded}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-stone-100 px-4 py-3">
          <div>
            {currentStep > 1 && (
              <GhostButton onClick={handlePrevStep} icon={<ArrowLeft size={14} />}>
                Back
              </GhostButton>
            )}
          </div>
          <div className="flex gap-2">
            <GhostButton onClick={handleClose}>
              Cancel
            </GhostButton>
            {currentStep < 3 ? (
              <GoldButton onClick={handleNextStep} icon={<ArrowRight size={14} />}>
                Next
              </GoldButton>
            ) : (
              <GoldButton
                onClick={handleCreate}
                disabled={mutating}
                icon={mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
              >
                {editingItem ? 'Update' : 'Create'}
              </GoldButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircuitModal;