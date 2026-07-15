// src/components/modals/RequestModal.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createMedicalClaim,
  updateMedicalClaimStatus,
  createGeneralRequest,
  updateGeneralRequestStatus,
  fetchMedicalClaims,
  fetchGeneralRequests,
  fetchHelpDeskStats,
  type MedicalClaim,
  type GeneralRequest,
  type Status,
  type CreateMedicalClaimInput,
  type CreateGeneralRequestInput,
} from '../../store/slices/helpdeskSlice';
import {
  X,
  Loader2,
  Save,
  User,
  Calendar,
  FileSignature,
  Briefcase,
  Stethoscope,
  FileText,
  Users,
  CreditCard,
  Mail,
  Send,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RequestMode = 'medical' | 'general';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: RequestMode;
  editingItem?: MedicalClaim | GeneralRequest | null;
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

// ─── Main Request Modal ─────────────────────────────────────────────────────

export const RequestModal: React.FC<RequestModalProps> = ({
  isOpen,
  onClose,
  mode = 'medical',
  editingItem,
}) => {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.helpdesk.loading.mutating);

  const isMedical = mode === 'medical';

  // Medical Claim Form (s_no removed - auto-generated)
  const [medicalForm, setMedicalForm] = useState<CreateMedicalClaimInput>({
    officer_name: '',
    claim_amount: 0,
    date_forwarded_dhr: '',
    status: 'Pending',
    remarks: '',
  });

  // General Request Form (s_no removed - auto-generated)
  const [generalForm, setGeneralForm] = useState<CreateGeneralRequestInput>({
    judge_name: '',
    request: '',
    date_received: '',
    officer_assigned: '',
    status: 'Pending',
    remarks: '',
    email: '',
    send_email: false, // Default: don't send email (manual control by dep_head)
  });

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen && editingItem) {
      if (isMedical) {
        const item = editingItem as MedicalClaim;
        setMedicalForm({
          officer_name: item.officer_name || '',
          claim_amount: item.claim_amount || 0,
          date_forwarded_dhr: item.date_forwarded_dhr || '',
          status: item.status || 'Pending',
          remarks: item.remarks || '',
        });
      } else {
        const item = editingItem as GeneralRequest;
        setGeneralForm({
          judge_name: item.judge_name || '',
          request: item.request || '',
          date_received: item.date_received || '',
          officer_assigned: item.officer_assigned || '',
          status: item.status || 'Pending',
          remarks: item.remarks || '',
          email: '',
          send_email: false,
        });
      }
    } else if (isOpen && !editingItem) {
      setMedicalForm({
        officer_name: '',
        claim_amount: 0,
        date_forwarded_dhr: '',
        status: 'Pending',
        remarks: '',
      });
      setGeneralForm({
        judge_name: '',
        request: '',
        date_received: '',
        officer_assigned: '',
        status: 'Pending',
        remarks: '',
        email: '',
        send_email: false,
      });
    }
  }

  const resetForm = () => {
    setMedicalForm({
      officer_name: '',
      claim_amount: 0,
      date_forwarded_dhr: '',
      status: 'Pending',
      remarks: '',
    });
    setGeneralForm({
      judge_name: '',
      request: '',
      date_received: '',
      officer_assigned: '',
      status: 'Pending',
      remarks: '',
      email: '',
      send_email: false,
    });
  };

  const handleMedicalChange = (field: keyof CreateMedicalClaimInput, value: string | number) => {
    setMedicalForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeneralChange = (field: keyof CreateGeneralRequestInput, value: string | number | boolean) => {
    setGeneralForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    try {
      if (isMedical) {
        if (!medicalForm.officer_name?.trim()) {
          toast.error('Please enter the officer name.');
          return;
        }
        if (!medicalForm.claim_amount || medicalForm.claim_amount <= 0) {
          toast.error('Please enter a valid claim amount.');
          return;
        }

        // s_no removed - auto-generated on backend
        const input: CreateMedicalClaimInput = {
          officer_name: medicalForm.officer_name.trim(),
          claim_amount: medicalForm.claim_amount,
          date_forwarded_dhr: medicalForm.date_forwarded_dhr || undefined,
          status: medicalForm.status,
          remarks: medicalForm.remarks?.trim() || undefined,
        };

        if (editingItem) {
          await dispatch(updateMedicalClaimStatus({
            id: editingItem.id,
            status: 'Signed' as Status,
          })).unwrap();
          toast.success('Medical claim updated successfully.');
        } else {
          await dispatch(createMedicalClaim(input)).unwrap();
          toast.success('Medical claim created successfully.');
        }

        await dispatch(fetchMedicalClaims({}));
      } else {
        if (!generalForm.judge_name?.trim()) {
          toast.error('Please enter the judge name.');
          return;
        }
        if (!generalForm.request?.trim()) {
          toast.error('Please enter the request details.');
          return;
        }

        // Validate email if send_email is true
        if (generalForm.send_email && !generalForm.email?.trim()) {
          toast.error('Please enter a recipient email address to send the notification.');
          return;
        }

        if (generalForm.send_email && generalForm.email?.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(generalForm.email.trim())) {
            toast.error('Please enter a valid email address.');
            return;
          }
        }

        // s_no removed - auto-generated on backend
        const input: CreateGeneralRequestInput = {
          judge_name: generalForm.judge_name.trim(),
          request: generalForm.request.trim(),
          date_received: generalForm.date_received || undefined,
          officer_assigned: generalForm.officer_assigned?.trim() || undefined,
          status: generalForm.status,
          remarks: generalForm.remarks?.trim() || undefined,
          email: generalForm.send_email ? generalForm.email?.trim() : undefined,
          send_email: generalForm.send_email,
        };

        if (editingItem) {
          await dispatch(updateGeneralRequestStatus({
            id: editingItem.id,
            status: 'Signed' as Status,
          })).unwrap();
          toast.success('General request updated successfully.');
        } else {
          // Create the request - we don't need to use the result directly
          await dispatch(createGeneralRequest(input)).unwrap();
          toast.success('General request created successfully.');
          
          if (generalForm.send_email && generalForm.email) {
            toast.success(`Notification email sent to ${generalForm.email}`);
          }
        }

        await dispatch(fetchGeneralRequests({}));
      }

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

  const getTitle = () => {
    if (editingItem) {
      return isMedical ? 'Edit Medical Claim' : 'Edit General Request';
    }
    return isMedical ? 'Add Medical Claim' : 'Add General Request';
  };

  const getIcon = () => {
    return isMedical ? <Stethoscope size={18} className="text-[#c9a84c]" /> : <FileText size={18} className="text-[#c9a84c]" />;
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
          <div className="flex items-center gap-2">
            {getIcon()}
            <h3 className="text-sm font-semibold text-[#1a3d1c]">{getTitle()}</h3>
          </div>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              {isMedical ? (
                <Stethoscope size={16} className="text-[#c9a84c]" />
              ) : (
                <FileText size={16} className="text-[#c9a84c]" />
              )}
              <h4 className="text-sm font-semibold text-stone-800">
                {isMedical ? 'Medical Claim Details' : 'General Request Details'}
              </h4>
              {!isMedical && generalForm.send_email && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <Send size={10} />
                  Email On
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* S/No. - Removed - auto-generated on backend */}

              {/* Name */}
              <div>
                <FieldLabel required>
                  {isMedical ? "Officer's Name" : "Judge's Name"}
                </FieldLabel>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={isMedical ? medicalForm.officer_name || '' : generalForm.judge_name || ''}
                    onChange={(e) => {
                      if (isMedical) {
                        handleMedicalChange('officer_name', e.target.value);
                      } else {
                        handleGeneralChange('judge_name', e.target.value);
                      }
                    }}
                    placeholder={isMedical ? "e.g. Hon. Justice Mella" : "e.g. Hon. Justice Korir"}
                    className={`${inputClasses} pl-9`}
                    required
                  />
                </div>
              </div>

              {/* Medical: Claim Amount | General: Request */}
              {isMedical ? (
                <div>
                  <FieldLabel required>Claim Amount (KES)</FieldLabel>
                  <div className="relative">
                    <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={medicalForm.claim_amount || ''}
                      onChange={(e) => handleMedicalChange('claim_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={`${inputClasses} pl-9`}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <FieldLabel required>Request Details</FieldLabel>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <textarea
                      value={generalForm.request || ''}
                      onChange={(e) => handleGeneralChange('request', e.target.value)}
                      placeholder="Describe the request"
                      className={`${inputClasses} pl-9 min-h-[80px] resize-y`}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Medical: Date Forwarded to DHR | General: Date Received */}
              <div>
                <FieldLabel>
                  {isMedical ? 'Date Forwarded to DHR' : 'Date Received'}
                </FieldLabel>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="date"
                    value={isMedical ? medicalForm.date_forwarded_dhr || '' : generalForm.date_received || ''}
                    onChange={(e) => {
                      if (isMedical) {
                        handleMedicalChange('date_forwarded_dhr', e.target.value);
                      } else {
                        handleGeneralChange('date_received', e.target.value);
                      }
                    }}
                    className={`${inputClasses} pl-9`}
                  />
                </div>
              </div>

              {/* General: Officer Assigned */}
              {!isMedical && (
                <div>
                  <FieldLabel>Officer Assigned</FieldLabel>
                  <div className="relative">
                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={generalForm.officer_assigned || ''}
                      onChange={(e) => handleGeneralChange('officer_assigned', e.target.value)}
                      placeholder="e.g. John Doe"
                      className={`${inputClasses} pl-9`}
                    />
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <FieldLabel>Remarks</FieldLabel>
                <div className="relative">
                  <FileSignature size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={isMedical ? medicalForm.remarks || '' : generalForm.remarks || ''}
                    onChange={(e) => {
                      if (isMedical) {
                        handleMedicalChange('remarks', e.target.value);
                      } else {
                        handleGeneralChange('remarks', e.target.value);
                      }
                    }}
                    placeholder="Additional notes"
                    className={`${inputClasses} pl-9`}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <FieldLabel>Status</FieldLabel>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <select
                    value={isMedical ? medicalForm.status || 'Pending' : generalForm.status || 'Pending'}
                    onChange={(e) => {
                      const value = e.target.value as Status;
                      if (isMedical) {
                        handleMedicalChange('status', value);
                      } else {
                        handleGeneralChange('status', value);
                      }
                    }}
                    className={`${inputClasses} pl-9 appearance-none bg-white`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Signed">Signed</option>
                    <option value="Rejected">Rejected</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Active">Active</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* ─── General Request Only: Email Notification ─────────────── */}
              {!isMedical && (
                <div className="mt-2 border-t border-stone-200 pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="send_email"
                      checked={generalForm.send_email || false}
                      onChange={(e) => handleGeneralChange('send_email', e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-[#c9a84c] focus:ring-[#c9a84c]"
                    />
                    <label htmlFor="send_email" className="text-sm font-medium text-stone-700 flex items-center gap-2">
                      <Mail size={14} className="text-stone-400" />
                      Send Acknowledgement Email
                      <span className="text-xs text-stone-400 font-normal">
                        (Department Head control)
                      </span>
                    </label>
                  </div>

                  {generalForm.send_email && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <FieldLabel required>Recipient Email</FieldLabel>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="email"
                          value={generalForm.email || ''}
                          onChange={(e) => handleGeneralChange('email', e.target.value)}
                          placeholder="judge@court.go.ke"
                          className={`${inputClasses} pl-9 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500`}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-stone-400">
                        The judge will receive a confirmation email with their ticket number.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-100 px-4 py-3">
          <GhostButton onClick={handleClose}>Cancel</GhostButton>
          <GoldButton
            onClick={handleCreate}
            disabled={mutating}
            icon={mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
          >
            {editingItem ? 'Update' : 'Create'}
          </GoldButton>
        </div>
      </div>
    </div>
  );
};

export default RequestModal;