// src/components/modals/VisaModal.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createVisaRequest,
  updateVisaStatus,
  fetchVisaRequests,
  fetchHelpDeskStats,
  type VisaRequest,
  type Status,
  type CreateVisaRequestInput,
  type VisaType,
} from '../../store/slices/helpdeskSlice';
import {
  X,
  Loader2,
  Save,
  ArrowRight,
  ArrowLeft,
  Plane,
  User,
  MapPin,
  FileText,
  CreditCard,
  FileSignature,
  Briefcase,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ─── Constants ──────────────────────────────────────────────────────────────

const VISA_TYPES: VisaType[] = ['Official', 'Conference', 'Personal', 'Other'];

// ─── Types ──────────────────────────────────────────────────────────────────

interface VisaModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: VisaRequest | null;
}

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
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
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

// ─── Main Visa Modal ─────────────────────────────────────────────────────────

export const VisaModal: React.FC<VisaModalProps> = ({
  isOpen,
  onClose,
  editingItem,
}) => {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.helpdesk.loading.mutating);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // s_no removed - auto-generated on backend
  const [formData, setFormData] = useState<CreateVisaRequestInput>({
    judge_name: '',
    destination_country: '',
    date_of_travel: '',
    date_of_return: '',
    visa_type: 'Official',
    purpose_of_travel: '',
    remarks: '',
    notes: '',
  });

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen && editingItem) {
      setFormData({
        judge_name: editingItem.judge_name || '',
        destination_country: editingItem.destination_country || '',
        date_of_travel: editingItem.date_of_travel || '',
        date_of_return: editingItem.date_of_return || '',
        visa_type: editingItem.visa_type || 'Official',
        purpose_of_travel: editingItem.purpose_of_travel || '',
        remarks: editingItem.remarks || '',
        notes: editingItem.notes || '',
      });
      setCurrentStep(2);
    } else if (isOpen && !editingItem) {
      setFormData({
        judge_name: '',
        destination_country: '',
        date_of_travel: '',
        date_of_return: '',
        visa_type: 'Official',
        purpose_of_travel: '',
        remarks: '',
        notes: '',
      });
      setCurrentStep(1);
    }
  }

  const resetForm = () => {
    setFormData({
      judge_name: '',
      destination_country: '',
      date_of_travel: '',
      date_of_return: '',
      visa_type: 'Official',
      purpose_of_travel: '',
      remarks: '',
      notes: '',
    });
    setCurrentStep(1);
  };

  const handleChange = (field: keyof CreateVisaRequestInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.judge_name?.trim() || !formData.destination_country?.trim()) {
        toast.error('Please enter the judge name and destination country.');
        return;
      }
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) setCurrentStep(1);
  };

  const handleCreate = async () => {
    try {
      // s_no removed - auto-generated on backend
      const input: CreateVisaRequestInput = {
        judge_name: formData.judge_name?.trim() || '',
        destination_country: formData.destination_country?.trim() || '',
        date_of_travel: formData.date_of_travel || undefined,
        date_of_return: formData.date_of_return || undefined,
        visa_type: formData.visa_type || 'Official',
        purpose_of_travel: formData.purpose_of_travel?.trim() || undefined,
        remarks: formData.remarks?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      };

      if (editingItem) {
        await dispatch(updateVisaStatus({
          id: editingItem.id,
          status: 'Active' as Status,
        })).unwrap();
        toast.success('Visa request updated successfully.');
      } else {
        await dispatch(createVisaRequest(input)).unwrap();
        toast.success('Visa request created successfully.');
      }

      await dispatch(fetchVisaRequests({}));
      await dispatch(fetchHelpDeskStats());

      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
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

      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">
            {editingItem ? 'Edit Visa Request' : 'Add Visa Request'}
          </h3>
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
                  <span className="text-xs font-medium">Details</span>
                </div>
                <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-[#c9a84c]' : 'bg-stone-200'}`} />
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 2 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                    2
                  </div>
                  <span className="text-xs font-medium">Review</span>
                </div>
              </div>
              <span className="text-xs text-stone-400">
                Step {currentStep} of 2
              </span>
            </div>
          </div>

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Plane size={16} className="text-[#c9a84c]" />
                  <h4 className="text-sm font-semibold text-stone-800">Visa Request Details</h4>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {/* S/No. - Removed - auto-generated on backend */}

                  <div>
                    <FieldLabel required>Judge Name</FieldLabel>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={formData.judge_name || ''}
                        onChange={(e) => handleChange('judge_name', e.target.value)}
                        placeholder="e.g. Hon. Justice Mella"
                        className={`${inputClasses} pl-9`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel required>Destination Country</FieldLabel>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={formData.destination_country || ''}
                        onChange={(e) => handleChange('destination_country', e.target.value)}
                        placeholder="e.g. United Kingdom"
                        className={`${inputClasses} pl-9`}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Date of Travel</FieldLabel>
                      <input
                        type="date"
                        value={formData.date_of_travel || ''}
                        onChange={(e) => handleChange('date_of_travel', e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <FieldLabel>Date of Return</FieldLabel>
                      <input
                        type="date"
                        value={formData.date_of_return || ''}
                        onChange={(e) => handleChange('date_of_return', e.target.value)}
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel required>Visa Type</FieldLabel>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <select
                        value={formData.visa_type || 'Official'}
                        onChange={(e) => handleChange('visa_type', e.target.value as VisaType)}
                        className={`${inputClasses} pl-9 appearance-none bg-white`}
                        required
                      >
                        {VISA_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Purpose of Travel / Activity</FieldLabel>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={formData.purpose_of_travel || ''}
                        onChange={(e) => handleChange('purpose_of_travel', e.target.value)}
                        placeholder="e.g. Judicial Conference 2026"
                        className={`${inputClasses} pl-9`}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Remarks</FieldLabel>
                    <div className="relative">
                      <FileSignature size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={formData.remarks || ''}
                        onChange={(e) => handleChange('remarks', e.target.value)}
                        placeholder="Additional remarks"
                        className={`${inputClasses} pl-9`}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Notes</FieldLabel>
                    <input
                      type="text"
                      value={formData.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder="Internal notes"
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-[#c9a84c]" />
                  <h4 className="text-sm font-semibold text-stone-800">Review Visa Request</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-stone-100 py-2">
                    <span className="text-stone-500">Judge Name</span>
                    <span className="font-medium">{formData.judge_name || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-100 py-2">
                    <span className="text-stone-500">Destination</span>
                    <span className="font-medium">{formData.destination_country || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-100 py-2">
                    <span className="text-stone-500">Travel Dates</span>
                    <span className="font-medium">
                      {formData.date_of_travel || '—'} → {formData.date_of_return || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-stone-100 py-2">
                    <span className="text-stone-500">Visa Type</span>
                    <span className="font-medium">{formData.visa_type || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-100 py-2">
                    <span className="text-stone-500">Purpose</span>
                    <span className="font-medium">{formData.purpose_of_travel || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-100 py-2">
                    <span className="text-stone-500">Remarks</span>
                    <span className="font-medium">{formData.remarks || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-stone-500">Notes</span>
                    <span className="font-medium">{formData.notes || '—'}</span>
                  </div>
                </div>
              </div>
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
            <GhostButton onClick={handleClose}>Cancel</GhostButton>
            {currentStep < 2 ? (
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

export default VisaModal;