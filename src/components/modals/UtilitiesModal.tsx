// src/components/Helpdesk/UtilitiesModal.tsx
import React, { useState } from 'react';
import { useAppDispatch } from '../../store/hook';
import {
  createUtility,
  updateUtilityStatus,
  deleteUtility,
  fetchUtilities,
  fetchHelpDeskStats,
  type UtilityType,
  type Status,
  type JudgeUtility,
} from '../../store/slices/helpdeskSlice';
import {
  X,
  Loader2,
  Save,
  Trash2,
  Wallet,
  User,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

const UTILITY_TYPES: UtilityType[] = ['Electricity', 'Water', 'Internet', 'Fuel', 'Other'];

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
      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
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
      className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    Pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending', icon: <ClockIcon size={12} className="text-amber-500" /> },
    Signed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Signed', icon: <CheckCircle size={12} className="text-emerald-500" /> },
    Rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected', icon: <XCircle size={12} className="text-red-500" /> },
    'In Progress': { bg: 'bg-blue-50', text: 'text-blue-700', label: 'In Progress', icon: <ClockIcon size={12} className="text-blue-500" /> },
    Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed', icon: <CheckCircle size={12} className="text-emerald-500" /> },
    Active: { bg: 'bg-green-50', text: 'text-green-700', label: 'Active', icon: <CheckCircle size={12} className="text-green-500" /> },
    Resolved: { bg: 'bg-stone-50', text: 'text-stone-700', label: 'Resolved', icon: <CheckCircle size={12} className="text-stone-500" /> },
  };
  const style = styles[status] || styles.Pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.icon}
      {style.label}
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

// ─── Form State Helper ──────────────────────────────────────────────────────
// Builds the initial form shape from an (optional) utility being edited.
// Kept outside the component so identity is stable and it's usable as a
// lazy useState initializer — no effect-based syncing needed.

interface UtilityFormState {
  judge_name: string;
  utility_type: UtilityType;
  amount: number;
  period: string;
  description: string;
}

function buildInitialForm(utility?: JudgeUtility | null): UtilityFormState {
  return {
    judge_name: utility?.judge_name ?? '',
    utility_type: (utility?.utility_type ?? 'Electricity') as UtilityType,
    amount: utility?.amount ?? 0,
    period: utility?.period ?? '',
    description: utility?.description ?? '',
  };
}

// ─── Main Modal Component ──────────────────────────────────────────────────

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

  // ─── Form State ──────────────────────────────────────────────────────────
  // Initialized lazily from editingUtility. The parent is expected to
  // remount this component (via a `key` keyed on editingUtility?.id ?? 'new')
  // whenever it opens the modal for a different record, so this initializer
  // is always correct on mount — no synchronization effect required.
  const [form, setForm] = useState<UtilityFormState>(() => buildInitialForm(editingUtility));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setForm(buildInitialForm(null));
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.judge_name.trim()) {
      return;
    }
    if (!form.period.trim()) {
      return;
    }
    if (form.amount <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUtility) {
        // Update status for existing utility
        await dispatch(updateUtilityStatus({
          id: editingUtility.id,
          status: 'Signed' as Status,
        })).unwrap();
      } else {
        // Create new utility
        await dispatch(createUtility({
          judge_name: form.judge_name.trim(),
          utility_type: form.utility_type,
          amount: form.amount,
          period: form.period.trim(),
          description: form.description.trim() || undefined,
        })).unwrap();
      }

      await dispatch(fetchUtilities({}));
      await dispatch(fetchHelpDeskStats());
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to save utility:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteUtility(deleteTarget)).unwrap();
      await dispatch(fetchUtilities({}));
      await dispatch(fetchHelpDeskStats());
      setDeleteTarget(null);
      onClose();
    } catch (err) {
      console.error('Failed to delete utility:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDeleteClick = () => {
    if (editingUtility) {
      setDeleteTarget(editingUtility.id);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-[#c9a84c]" />
              <h3 className="text-sm font-semibold text-[#1a3d1c]">
                {editingUtility ? 'Edit Utility' : 'Add New Utility'}
              </h3>
            </div>
            <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="max-h-[65vh] overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Judge Name */}
              <div>
                <FieldLabel required>Judge Name</FieldLabel>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={form.judge_name}
                    onChange={(e) => setForm({ ...form, judge_name: e.target.value })}
                    placeholder="e.g. Hon. Justice Korir"
                    className={`${inputClasses} pl-9`}
                    required
                  />
                </div>
              </div>

              {/* Utility Type */}
              <div>
                <FieldLabel required>Utility Type</FieldLabel>
                <select
                  value={form.utility_type}
                  onChange={(e) => setForm({ ...form, utility_type: e.target.value as UtilityType })}
                  className={inputClasses}
                  required
                >
                  {UTILITY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <FieldLabel required>Amount (KES)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amount || ''}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className={inputClasses}
                  required
                />
              </div>

              {/* Period */}
              <div>
                <FieldLabel required>Period / Reference</FieldLabel>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    placeholder="e.g. May 2026"
                    className={`${inputClasses} pl-9`}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <FieldLabel>Description (Optional)</FieldLabel>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-3 text-stone-400" />
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Additional notes about this utility..."
                    className={`${inputClasses} pl-9 resize-none min-h-[80px]`}
                    rows={3}
                  />
                </div>
              </div>

              {/* Info Box */}
              {editingUtility && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-700 flex items-center gap-2">
                    <span className="text-lg">ℹ️</span>
                    Editing will update the status to "Signed". Current status: <StatusBadge status={editingUtility.status} />
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-stone-100 mt-6 pt-4">
              {editingUtility && (
                <GhostButton
                  onClick={handleDeleteClick}
                  disabled={isSubmitting || isDeleting}
                >
                  <Trash2 size={14} />
                  Delete
                </GhostButton>
              )}
              <GhostButton onClick={handleClose} disabled={isSubmitting || isDeleting}>
                Cancel
              </GhostButton>
              <GoldButton type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {editingUtility ? 'Update Utility' : 'Create Utility'}
              </GoldButton>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Utility Entry?"
          message="This action cannot be undone. The entry will be permanently removed from the system."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={isDeleting}
        />
      )}
    </>
  );
};

export default UtilitiesModal;