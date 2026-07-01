// src/components/Helpdesk/CircuitModal.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createCircuit,
  updateCircuitStatus,
  fetchCircuits,
  fetchHelpDeskStats,
  type Circuit,
  type DSADetailInput,
  type Status,
  type CreateCircuitInput,
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
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

const getDefaultDate = (daysOffset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const getDefaultBasicInfo = () => ({
  name: '',
  location: '',
  start_date: getDefaultDate(7),
  end_date: getDefaultDate(14),
});

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

// ─── Step 1: Circuit Basic Form ──────────────────────────────────────────────

interface CircuitBasicFormProps {
  basicInfo: {
    name: string;
    location: string;
    start_date: string;
    end_date: string;
  };
  setBasicInfo: React.Dispatch<React.SetStateAction<{
    name: string;
    location: string;
    start_date: string;
    end_date: string;
  }>>;
}

const CircuitBasicForm: React.FC<CircuitBasicFormProps> = ({ basicInfo, setBasicInfo }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Circuit Information</h4>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <FieldLabel required>Circuit Name</FieldLabel>
            <input
              type="text"
              value={basicInfo.name}
              onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
              placeholder="e.g. Mombasa Circuit"
              className={inputClasses}
            />
          </div>

          <div>
            <FieldLabel>Location (Optional)</FieldLabel>
            <input
              type="text"
              value={basicInfo.location}
              onChange={(e) => setBasicInfo({ ...basicInfo, location: e.target.value })}
              placeholder="e.g. Mombasa"
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Start Date</FieldLabel>
              <input
                type="date"
                value={basicInfo.start_date}
                onChange={(e) => setBasicInfo({ ...basicInfo, start_date: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <FieldLabel required>End Date</FieldLabel>
              <input
                type="date"
                value={basicInfo.end_date}
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

interface CircuitDSADetailsFormProps {
  dsaDetails: Omit<DSADetailInput, 'id'>[];
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onChange: (index: number, field: keyof Omit<DSADetailInput, 'id'>, value: string | number) => void;
  calculateTotal: (rate: number, days: number) => number;
}

const CircuitDSADetailsForm: React.FC<CircuitDSADetailsFormProps> = ({
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

// ─── Step 3: Circuit Memo Preview ──────────────────────────────────────────

interface CircuitMemoProps {
  basicInfo: {
    name: string;
    location: string;
    start_date: string;
    end_date: string;
  };
  dsaDetails: Omit<DSADetailInput, 'id'>[];
  calculateTotal: (rate: number, days: number) => number;
  calculateGrandTotal: () => number;
  formatDate: (date: string) => string;
  onEdit: () => void;
  onEditDsa: () => void;
}

const CircuitMemo: React.FC<CircuitMemoProps> = ({
  basicInfo,
  dsaDetails,
  calculateTotal,
  calculateGrandTotal,
  formatDate,
  onEdit,
  onEditDsa,
}) => {
  const validDetails = dsaDetails.filter(d => d.judge_name.trim() && d.pj_number.trim() && d.dsa_per_day > 0 && d.days > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-[#c9a84c]" />
          Circuit Memo Preview
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

      <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="mb-6 border-b border-stone-200 pb-4 text-center">
          <h2 className="text-xl font-bold text-[#1a3d1c]">{basicInfo.name}</h2>
          <p className="text-sm text-stone-500">Circuit Memo</p>
        </div>

        {/* Circuit Info */}
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-stone-400">Location</p>
            <p className="font-medium text-stone-800">{basicInfo.location || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Period</p>
            <p className="font-medium text-stone-800">
              {formatDate(basicInfo.start_date)} - {formatDate(basicInfo.end_date)}
            </p>
          </div>
        </div>

        {/* DSA Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-stone-300 bg-stone-100">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-stone-600">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-stone-600">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-stone-600">PJ Number</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-stone-600">Rate (KES)</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-stone-600">Days</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-stone-600">Total (KES)</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-stone-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {validDetails.map((detail, index) => (
                <tr key={index} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="px-3 py-2 text-center text-stone-500">{index + 1}</td>
                  <td className="px-3 py-2 font-medium text-stone-800">{detail.judge_name}</td>
                  <td className="px-3 py-2 text-stone-600">{detail.pj_number}</td>
                  <td className="px-3 py-2 text-right text-stone-600">{detail.dsa_per_day.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-stone-600">{detail.days}</td>
                  <td className="px-3 py-2 text-right font-medium text-emerald-700">
                    {calculateTotal(detail.dsa_per_day, detail.days).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-500">{detail.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-300 bg-stone-50">
                <td colSpan={5} className="px-3 py-3 text-right font-bold text-stone-800">
                  Grand Total
                </td>
                <td className="px-3 py-3 text-right font-bold text-[#1a3d1c]">
                  {calculateGrandTotal().toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-stone-200 pt-4 text-center text-xs text-stone-400">
          <p>Generated on {new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          <p className="mt-1">This is a system-generated memo for official use only.</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Circuit Modal ──────────────────────────────────────────────────────

interface CircuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCircuit?: Circuit | null;
}

export const CircuitModal: React.FC<CircuitModalProps> = ({
  isOpen,
  onClose,
  editingCircuit,
}) => {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.helpdesk.loading.mutating);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basic Circuit Info
  const [basicInfo, setBasicInfo] = useState(getDefaultBasicInfo);

  // Step 2: DSA Details
  const [dsaDetails, setDsaDetails] = useState<Omit<DSADetailInput, 'id'>[]>(getDefaultDsaDetails);

  // ── Render-time state sync (no useEffect) ───────────────────────────────
  // Tracks the modal's open state across renders so we can detect the
  // false → true transition and (re)initialize the form during render,
  // rather than in a useEffect (which would cause a synchronous setState
  // -> cascading render warning). This is React's recommended pattern for
  // "adjusting state when a prop changes": https://react.dev/learn/you-might-not-need-an-effect
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      if (editingCircuit) {
        setBasicInfo({
          name: editingCircuit.name,
          location: editingCircuit.location || '',
          start_date: editingCircuit.start_date.split('T')[0],
          end_date: editingCircuit.end_date.split('T')[0],
        });
        setDsaDetails(
          editingCircuit.dsa_details?.map(d => ({
            judge_name: d.judge_name,
            pj_number: d.pj_number,
            dsa_per_day: d.dsa_per_day,
            days: d.days,
            notes: d.notes || '',
          })) || getDefaultDsaDetails()
        );
        setCurrentStep(2);
      } else {
        setBasicInfo(getDefaultBasicInfo());
        setDsaDetails(getDefaultDsaDetails());
        setCurrentStep(1);
      }
    }
  }

  const resetForm = () => {
    setBasicInfo(getDefaultBasicInfo());
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
      if (!basicInfo.name.trim() || !basicInfo.start_date || !basicInfo.end_date) {
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const hasValidRow = dsaDetails.some(d => d.judge_name.trim() && d.pj_number.trim() && d.dsa_per_day > 0 && d.days > 0);
      if (!hasValidRow) {
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  const handleCreateCircuit = async () => {
    try {
      const input: CreateCircuitInput = {
        name: basicInfo.name.trim(),
        location: basicInfo.location.trim() || undefined,
        start_date: basicInfo.start_date,
        end_date: basicInfo.end_date,
        dsa_details: dsaDetails
          .filter(d => d.judge_name.trim() && d.pj_number.trim() && d.dsa_per_day > 0 && d.days > 0)
          .map(d => ({
            judge_name: d.judge_name.trim(),
            pj_number: d.pj_number.trim(),
            dsa_per_day: d.dsa_per_day,
            days: d.days,
            notes: d.notes || undefined,
          })),
      };

      if (editingCircuit) {
        await dispatch(updateCircuitStatus({
          id: editingCircuit.id,
          status: 'Pending' as Status,
        })).unwrap();
      } else {
        await dispatch(createCircuit(input)).unwrap();
      }

      await dispatch(fetchCircuits({}));
      await dispatch(fetchHelpDeskStats());
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to save circuit:', err);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">
            {editingCircuit ? 'Edit Circuit' : 'Add New Circuit'}
          </h3>
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
            <CircuitBasicForm basicInfo={basicInfo} setBasicInfo={setBasicInfo} />
          )}
          {currentStep === 2 && (
            <CircuitDSADetailsForm
              dsaDetails={dsaDetails}
              onAddRow={handleAddDsaRow}
              onRemoveRow={handleRemoveDsaRow}
              onChange={handleDsaChange}
              calculateTotal={calculateTotal}
            />
          )}
          {currentStep === 3 && (
            <CircuitMemo
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
                onClick={handleCreateCircuit}
                disabled={mutating}
                icon={mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
              >
                {editingCircuit ? 'Update Circuit' : 'Create Circuit'}
              </GoldButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircuitModal;