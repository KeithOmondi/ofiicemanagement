// src/components/modals/CircuitModal.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createCircuit,
  createBench,
  createPartHeard,
  createServiceWeek,
  updateCircuitStatus,
  updateBenchStatus,
  updatePartHeardStatus,
  updateServiceWeekStatus,
  fetchCircuits,
  fetchBenches,
  fetchPartHeards,
  fetchServiceWeeks,
  fetchHelpDeskStats,
  type Circuit,
  type SpecialBench,
  type PartHeard,
  type ServiceWeek,
  type DSADetailInput,
  type Status,
  type CreateCircuitInput,
  type CreateSpecialBenchInput,
  type CreatePartHeardInput,
  type CreateServiceWeekInput,
} from '../../store/slices/helpdeskSlice';
import {
  X,
  Loader2,
  Plus,
  FileSpreadsheet,
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
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CircuitModalMode = 'circuit' | 'bench' | 'partHeard' | 'serviceWeek';

type EditingItem = Circuit | SpecialBench | PartHeard | ServiceWeek;

// Some editing items may carry a `dsa_details` array that isn't part of the
// base type definitions imported above. This narrows that access without `any`.
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

// Swap these for wherever the assets live in your app (e.g. imported from
// src/assets or served from /public). Extracted directly from the approved
// memo template so the preview matches pixel-for-pixel.
const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

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
    default:
      return { name: '', ...base };
  }
};

const getDefaultDsaDetails = (): Omit<DSADetailInput, 'id'>[] => [
  { judge_name: '', pj_number: '', dsa_per_day: 0, days: 0, notes: '' },
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
              DSA details can be added in the next step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step 2: DSA Details Form ──────────────────────────────────────────────

interface DSADetailsFormProps {
  dsaDetails: Omit<DSADetailInput, 'id'>[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onChange: (index: number, field: keyof Omit<DSADetailInput, 'id'>, value: string | number) => void;
  calculateTotal: (rate: number, days: number) => number;
}

const DSADetailsForm: React.FC<DSADetailsFormProps> = ({
  dsaDetails,
  onAddRow,
  onRemoveRow,
  onChange,
  calculateTotal,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#c9a84c]" />
            <h4 className="text-sm font-semibold text-stone-800">DSA Details</h4>
            <span className="text-xs text-stone-400">({dsaDetails.length} members)</span>
          </div>
          <GoldButton size="sm" onClick={onAddRow} icon={<Plus size={14} />}>
            Add Member
          </GoldButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[10px] uppercase text-stone-500">
                <th className="pb-2 pr-2 font-semibold">Name</th>
                <th className="pb-2 pr-2 font-semibold">PJ Number</th>
                <th className="pb-2 pr-2 font-semibold text-right">Rate (KES)</th>
                <th className="pb-2 pr-2 font-semibold text-right">Days</th>
                <th className="pb-2 pr-2 font-semibold text-right">Total</th>
                <th className="pb-2 pr-2 font-semibold">Notes</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {dsaDetails.map((detail, index) => (
                <tr key={index} className="border-b border-stone-100">
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={detail.judge_name}
                      onChange={(e) => onChange(index, 'judge_name', e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded border border-stone-200 px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={detail.pj_number}
                      onChange={(e) => onChange(index, 'pj_number', e.target.value)}
                      placeholder="PJ-XXX"
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
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={detail.notes || ''}
                      onChange={(e) => onChange(index, 'notes', e.target.value)}
                      placeholder="Additional notes"
                      className="w-full rounded border border-stone-200 px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none"
                    />
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
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-200 bg-stone-100">
                <td colSpan={4} className="py-3 pr-2 text-right font-semibold text-stone-800">
                  Grand Total:
                </td>
                <td className="py-3 pr-2 text-right font-bold text-[#1a3d1c]">
                  {dsaDetails.reduce((sum, d) => sum + (d.dsa_per_day * d.days), 0).toLocaleString()}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Step 3: Memo Preview ──────────────────────────────────────────────────
//
// This mirrors the approved ORHC memo template 1:1:
//   - centered crest
//   - centered "OFFICE OF THE REGISTRAR HIGH COURT" / "INTERNAL MEMO"
//   - plain bold left-aligned TO / FROM / REF / DATE / SUBJECT lines
//   - a blank/plain body area (no cards, no color) with the DSA schedule
//   - a bold underlined sign-off line at the bottom
//   - the standard court footer strip
//
// No rounded cards, accent colors, or boxed sections — the source document
// is intentionally austere, so the preview stays black-on-white throughout.

interface MemoPreviewProps {
  mode: CircuitModalMode;
  basicInfo: BasicInfoType;
  dsaDetails: Omit<DSADetailInput, 'id'>[];
  calculateTotal: (rate: number, days: number) => number;
  calculateGrandTotal: () => number;
  formatDate: (date: string) => string;
  onEdit: () => void;
  onEditDsa: () => void;
}

const MemoPreview: React.FC<MemoPreviewProps> = ({
  mode,
  basicInfo,
  dsaDetails,
  calculateTotal,
  calculateGrandTotal,
  formatDate,
  onEdit,
  onEditDsa,
}) => {
  const getSubject = () => {
    switch (mode) {
      case 'circuit': return basicInfo.name || 'Circuit Details';
      case 'bench': return basicInfo.name || 'Bench Details';
      case 'partHeard': return basicInfo.case_reference || 'Part-Heard Details';
      case 'serviceWeek': return basicInfo.name || 'Service Week Details';
      default: return 'Details';
    }
  };

  const getFrom = () => {
    switch (mode) {
      case 'circuit': return 'HIGH COURT SUPPORT OFFICE -ORHC';
      case 'bench': return 'BENCH MANAGEMENT OFFICE -ORHC';
      case 'partHeard': return 'PART-HEARD MANAGEMENT OFFICE -ORHC';
      case 'serviceWeek': return 'SERVICE WEEK MANAGEMENT OFFICE -ORHC';
      default: return 'HIGH COURT SUPPORT OFFICE -ORHC';
    }
  };

  const getTo = () => 'REGISTRAR ,HIGH COURT/ ORHC AIE HOLDER';

  // Currently logged-in user, used to sign the memo. Adjust the `state.auth`
  // path below if your root reducer registers the auth slice under a
  // different key.
  const currentUser = useAppSelector((state) => state.auth.user);

  const validDetails = dsaDetails.filter(d => d.judge_name.trim() && d.pj_number.trim() && d.dsa_per_day > 0 && d.days > 0);
  const grandTotal = calculateGrandTotal();

  // Format currency with words
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
    if (cents > 0) {
      result += ' and ' + numberToWords(cents) + ' Cents';
    }
    return result;
  };

  // ─── Editable memo fields ─────────────────────────────────────────────────
  // TO / FROM / REF / DATE / SUBJECT are seeded from sensible defaults (mode,
  // basicInfo, a generated ref number) but are then plain controlled inputs —
  // the office officer reviewing the memo can correct or override any of
  // them before it's finalized. Lazy useState initializers run exactly once
  // at mount, which is fine here since MemoPreview only mounts when
  // currentStep === 3, so the seed always reflects the current mode/basicInfo.

  const [toField, setToField] = useState(() => getTo());
  const [fromField, setFromField] = useState(() => getFrom());
  const [subjectField, setSubjectField] = useState(() => getSubject());

  const [refField, setRefField] = useState(() => {
    const prefix: Record<string, string> = {
      circuit: 'RHC/CIRCUIT',
      bench: 'RHC/BENCH',
      partHeard: 'RHC/PART',
      serviceWeek: 'RHC/SERVICE',
    };
    const p = prefix[mode] || 'RHC/AIE';
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${p}/${random}`;
  });

  const [dateField, setDateField] = useState(() => {
    if (!basicInfo.start_date || !basicInfo.end_date) {
      return new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const startDate = new Date(basicInfo.start_date);
    const endDate = new Date(basicInfo.end_date);
    const generated = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    return generated.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  // Signature name defaults to the logged-in user but stays editable in case
  // someone is signing on another officer's behalf.
  const [signatoryName, setSignatoryName] = useState(() => currentUser?.full_name || '');

  const editableLineClasses =
    'flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none';

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
        </div>
      </div>

      {/* ─── The memo sheet itself — plain black-on-white, matches the .docx ─── */}
      <div className="border border-stone-300 bg-white p-10 shadow-sm font-sans text-black">
        {/* Crest */}
        <div className="flex justify-center mb-3">
          <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-20 w-auto object-contain" />
        </div>

        {/* Title block */}
        <div className="text-center mb-6">
          <p className="text-lg font-bold uppercase leading-snug">
            OFFICE OF THE REGISTRAR HIGH COURT
          </p>
          <p className="text-lg font-bold uppercase leading-snug border-b-2 border-black inline-block pb-2 px-1">
            INTERNAL MEMO
          </p>
        </div>

        {/* TO / FROM / REF / DATE / SUBJECT — plain stacked lines, now editable */}
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

        {/* Body — plain prose + plain black-bordered table, no color/rounded cards */}
        <div className="space-y-4 text-sm">
          <p>
            The following is a detailed breakdown of the {(subjectField || getSubject()).toLowerCase()} for the period{' '}
            <span className="font-semibold">
              {formatDate(basicInfo.start_date)} to {formatDate(basicInfo.end_date)}
            </span>
            .
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-black">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left text-xs font-bold">#</th>
                  <th className="border border-black px-2 py-1 text-left text-xs font-bold">Judge Name</th>
                  <th className="border border-black px-2 py-1 text-left text-xs font-bold">PJ Number</th>
                  <th className="border border-black px-2 py-1 text-right text-xs font-bold">Rate (KES)</th>
                  <th className="border border-black px-2 py-1 text-right text-xs font-bold">Days</th>
                  <th className="border border-black px-2 py-1 text-right text-xs font-bold">Total (KES)</th>
                  <th className="border border-black px-2 py-1 text-left text-xs font-bold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {validDetails.length > 0 ? (
                  validDetails.map((detail, index) => (
                    <tr key={index}>
                      <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                      <td className="border border-black px-2 py-1 font-medium">{detail.judge_name}</td>
                      <td className="border border-black px-2 py-1">{detail.pj_number}</td>
                      <td className="border border-black px-2 py-1 text-right">{detail.dsa_per_day.toLocaleString()}</td>
                      <td className="border border-black px-2 py-1 text-right">{detail.days}</td>
                      <td className="border border-black px-2 py-1 text-right font-medium">
                        {calculateTotal(detail.dsa_per_day, detail.days).toLocaleString()}
                      </td>
                      <td className="border border-black px-2 py-1 text-xs">{detail.notes || '-'}</td>
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
                    <td colSpan={5} className="border border-black px-2 py-2 text-right font-bold">
                      GRAND TOTAL
                    </td>
                    <td className="border border-black px-2 py-2 text-right font-bold">
                      {grandTotal.toLocaleString()}
                    </td>
                    <td className="border border-black"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {grandTotal > 0 && (
            <p className="text-sm">
              <span className="font-bold">Amount in Words: </span>
              <span className="uppercase">{formatCurrencyWords(grandTotal)}</span>
            </p>
          )}
        </div>

        {/* Sign-off — signatory name (defaults to the logged-in user) above the
            office line, both editable, bold + underlined to match the memo */}
        <div className="mt-16 space-y-1">
          <input
            type="text"
            value={signatoryName}
            onChange={(e) => setSignatoryName(e.target.value)}
            placeholder="Signatory name"
            className={`${editableLineClasses} block text-sm font-bold`}
          />
          <input
            type="text"
            value={fromField}
            onChange={(e) => setFromField(e.target.value)}
            className={`${editableLineClasses} block text-sm font-bold underline uppercase`}
          />
        </div>

        {/* Standard court footer strip */}
        <div className="mt-12 pt-3 border-t border-stone-300 flex items-center gap-3">
          <img src={FOOTER_EMBLEM_SRC} alt="" className="h-10 w-auto object-contain" />
          <div className="text-[10px] leading-tight text-stone-700">
            <p>
              Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi
            </p>
            <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
            <p className="mt-1 font-bold text-emerald-800">Justice Be Our Shield and Defender</p>
          </div>
        </div>
      </div>
    </div>
  );
};
// ─── Helper to check item type ─────────────────────────────────────────────

function isCircuit(item: EditingItem | null | undefined): item is Circuit {
  return !!item && 'location' in item && !('case_reference' in item) && !('week_number' in item);
}

function isSpecialBench(item: EditingItem | null | undefined): item is SpecialBench {
  return !!item && 'name' in item && 'case_reference' in item && !('approved_by' in item);
}

function isPartHeard(item: EditingItem | null | undefined): item is PartHeard {
  return !!item && 'case_reference' in item && 'approved_by' in item && !('name' in item);
}

function isServiceWeek(item: EditingItem | null | undefined): item is ServiceWeek {
  return !!item && 'week_number' in item && 'year' in item;
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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState<BasicInfoType>(() => getDefaultBasicInfo(mode));

  // Step 2: DSA Details
  const [dsaDetails, setDsaDetails] = useState<Omit<DSADetailInput, 'id'>[]>(getDefaultDsaDetails);

  // ── Render-time state sync ──────────────────────────────────────────────
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      if (editingItem) {
        // Populate form based on the type using type guards
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
        }

        // Load DSA details if available
        const details = (editingItem as EditingItem & WithDsaDetails).dsa_details;
        if (details && details.length > 0) {
          setDsaDetails(
            details.map((d: DSADetailInput) => ({
              judge_name: d.judge_name,
              pj_number: d.pj_number,
              dsa_per_day: d.dsa_per_day,
              days: d.days,
              notes: d.notes || '',
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
    }
  }

  const resetForm = () => {
    setBasicInfo(getDefaultBasicInfo(mode));
    setDsaDetails(getDefaultDsaDetails());
    setCurrentStep(1);
  };

  const handleAddDsaRow = () => {
    setDsaDetails([...dsaDetails, { judge_name: '', pj_number: '', dsa_per_day: 0, days: 0, notes: '' }]);
  };

  const handleRemoveDsaRow = (index: number) => {
    if (dsaDetails.length <= 1) return;
    setDsaDetails(dsaDetails.filter((_, i) => i !== index));
  };

  const handleDsaChange = (index: number, field: keyof Omit<DSADetailInput, 'id'>, value: string | number) => {
    const updated = [...dsaDetails];
    updated[index] = { ...updated[index], [field]: value };
    setDsaDetails(updated);
  };

  const calculateTotal = (dsa_per_day: number, days: number): number => {
    return dsa_per_day * days;
  };

  const calculateGrandTotal = (): number => {
    return dsaDetails.reduce((sum, d) => sum + (d.dsa_per_day * d.days), 0);
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
          default:
            return false;
        }
      };
      if (!hasRequiredFields()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const hasValidRow = dsaDetails.some(d => d.judge_name.trim() && d.pj_number.trim() && d.dsa_per_day > 0 && d.days > 0);
      if (!hasValidRow) return;
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
          dsa_per_day: d.dsa_per_day,
          days: d.days,
          notes: d.notes || undefined,
        }));

      if (editingItem) {
        // Update status based on mode
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
          default:
            throw new Error('Invalid mode');
        }
      } else {
        // Create new based on mode
        switch (mode) {
          case 'circuit': {
            const input: CreateCircuitInput = {
              name: basicInfo.name!.trim(),
              location: basicInfo.location?.trim() || undefined,
              start_date: basicInfo.start_date,
              end_date: basicInfo.end_date,
              dsa_details: dsaData,
            };
            await dispatch(createCircuit(input)).unwrap();
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
            await dispatch(createBench(input)).unwrap();
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
            await dispatch(createPartHeard(input)).unwrap();
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
            await dispatch(createServiceWeek(input)).unwrap();
            break;
          }
          default:
            throw new Error('Invalid mode');
        }
      }

      // Refresh data based on mode
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
        default:
          break;
      }
      await dispatch(fetchHelpDeskStats());

      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to save:', err);
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">{getModalTitle()}</h3>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto p-4">
          {/* Step Indicator */}
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

          {/* Step Content */}
          {currentStep === 1 && (
            <BasicInfoForm
              mode={mode}
              basicInfo={basicInfo}
              setBasicInfo={setBasicInfo}
            />
          )}
          {currentStep === 2 && (
            <DSADetailsForm
              dsaDetails={dsaDetails}
              onAddRow={handleAddDsaRow}
              onRemoveRow={handleRemoveDsaRow}
              onChange={handleDsaChange}
              calculateTotal={calculateTotal}
            />
          )}
          {currentStep === 3 && (
            <MemoPreview
              mode={mode}
              basicInfo={basicInfo}
              dsaDetails={dsaDetails}
              calculateTotal={calculateTotal}
              calculateGrandTotal={calculateGrandTotal}
              formatDate={formatDate}
              onEdit={() => setCurrentStep(1)}
              onEditDsa={() => setCurrentStep(2)}
            />
          )}
        </div>

        {/* Footer */}
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