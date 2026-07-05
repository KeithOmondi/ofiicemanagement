// src/components/modals/ClubModal.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createClubMembership,
  updateClubMembershipStatus,
  fetchClubMemberships,
  fetchHelpDeskStats,
  type ClubMembership,
  type CreateClubMembershipInput,
  type Status,
} from '../../store/slices/helpdeskSlice';
import { X, Loader2, Save, User, Building2, Hash, Calendar as CalendarIcon, CreditCard, FileSignature, Briefcase } from 'lucide-react';

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

// ─── Modal Shell ─────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-stone-100 px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

const emptyForm: CreateClubMembershipInput = {
  pj_no: '',
  judge_name: '',
  club_name: '',
  entry_fee: 0,
  annual_fee: 0,
  date_submitted_dass: '',
  court: '',
  payment_date: '',
  remarks: '',
};

const buildFormFromItem = (item: ClubMembership | null | undefined): CreateClubMembershipInput => {
  if (!item) return emptyForm;
  return {
    pj_no: item.pj_no || '',
    judge_name: item.judge_name,
    club_name: item.club_name,
    entry_fee: item.entry_fee || 0,
    annual_fee: item.annual_fee || 0,
    date_submitted_dass: item.date_submitted_dass || '',
    court: item.court || '',
    payment_date: item.payment_date || '',
    remarks: item.remarks || '',
  };
};

// ─── Main Club Modal ─────────────────────────────────────────────────────────

interface ClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: ClubMembership | null;
}

const ClubModal: React.FC<ClubModalProps> = ({
  isOpen,
  onClose,
  editingItem,
}) => {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.helpdesk.loading.mutating);

  const [form, setForm] = useState<CreateClubMembershipInput>(() => buildFormFromItem(editingItem));

  // ── Sync form to `editingItem` during render, not in an effect ───────────
  //
  // Previously this used `useEffect(() => { setForm(...) }, [editingItem])`.
  // That's the "syncing props to state" anti-pattern React's linter flags:
  // the effect runs *after* the initial render with stale form values, then
  // immediately calls setState, forcing an extra cascading render before the
  // user ever sees the populated form.
  //
  // The fix recommended at https://react.dev/learn/you-might-not-need-an-effect
  // ("Adjusting some state when a prop changes") is to detect the prop
  // change during rendering itself and call setState right there. React
  // specifically supports this: calling setState while rendering throws
  // away the in-progress render and immediately re-renders with the new
  // state, so the DOM is never painted with stale data and there's no
  // separate effect pass.
  const [prevEditingItem, setPrevEditingItem] = useState(editingItem);
  if (editingItem !== prevEditingItem) {
    setPrevEditingItem(editingItem);
    setForm(buildFormFromItem(editingItem));
  }

  const isEditing = !!editingItem;

  const handleChange = (field: keyof CreateClubMembershipInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.judge_name.trim() || !form.club_name.trim()) {
      return;
    }

    try {
      if (isEditing && editingItem) {
        // For editing, we only update the status (or you could add a full update endpoint)
        await dispatch(updateClubMembershipStatus({
          id: editingItem.id,
          status: 'Signed' as Status,
        })).unwrap();
      } else {
        await dispatch(createClubMembership(form)).unwrap();
      }
      await dispatch(fetchClubMemberships({}));
      await dispatch(fetchHelpDeskStats());
      onClose();
    } catch (err) {
      console.error('Failed to save club membership:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      title={isEditing ? 'Edit Club Membership' : 'Add Club Membership'}
      onClose={onClose}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <button
            onClick={handleSubmit}
            disabled={mutating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
            {isEditing ? 'Update' : 'Add'}
          </button>
        </>
      }
    >
      {/* PJ Number */}
      <div>
        <FieldLabel>PJ Number</FieldLabel>
        <div className="relative">
          <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className={`${inputClasses} pl-9`}
            value={form.pj_no}
            onChange={(e) => handleChange('pj_no', e.target.value)}
            placeholder="e.g. 14960"
          />
        </div>
      </div>

      {/* Judge Name */}
      <div>
        <FieldLabel required>Judge Name</FieldLabel>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className={`${inputClasses} pl-9`}
            value={form.judge_name}
            onChange={(e) => handleChange('judge_name', e.target.value)}
            placeholder="e.g. Hon. Justice John Chigiti"
            required
          />
        </div>
      </div>

      {/* Club Name */}
      <div>
        <FieldLabel required>Club Name</FieldLabel>
        <div className="relative">
          <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className={`${inputClasses} pl-9`}
            value={form.club_name}
            onChange={(e) => handleChange('club_name', e.target.value)}
            placeholder="e.g. Royal Golf Club"
            required
          />
        </div>
      </div>

      {/* Entry Fee */}
      <div>
        <FieldLabel>Entry Fee (KES)</FieldLabel>
        <div className="relative">
          <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="number"
            min={0}
            step={0.01}
            className={`${inputClasses} pl-9`}
            value={form.entry_fee || ''}
            onChange={(e) => handleChange('entry_fee', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Annual Fee */}
      <div>
        <FieldLabel>Annual Fee (KES)</FieldLabel>
        <div className="relative">
          <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="number"
            min={0}
            step={0.01}
            className={`${inputClasses} pl-9`}
            value={form.annual_fee || ''}
            onChange={(e) => handleChange('annual_fee', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Date Submitted to DASS */}
      <div>
        <FieldLabel>Date Submitted to DASS</FieldLabel>
        <div className="relative">
          <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="date"
            className={`${inputClasses} pl-9`}
            value={form.date_submitted_dass}
            onChange={(e) => handleChange('date_submitted_dass', e.target.value)}
          />
        </div>
      </div>

      {/* Court */}
      <div>
        <FieldLabel>Court</FieldLabel>
        <div className="relative">
          <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className={`${inputClasses} pl-9`}
            value={form.court}
            onChange={(e) => handleChange('court', e.target.value)}
            placeholder="e.g. HIGH COURT, ELC"
          />
        </div>
      </div>

      {/* Payment Date */}
      <div>
        <FieldLabel>Payment Date</FieldLabel>
        <div className="relative">
          <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="date"
            className={`${inputClasses} pl-9`}
            value={form.payment_date}
            onChange={(e) => handleChange('payment_date', e.target.value)}
          />
        </div>
      </div>

      {/* Remarks */}
      <div>
        <FieldLabel>Remarks</FieldLabel>
        <div className="relative">
          <FileSignature size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className={`${inputClasses} pl-9`}
            value={form.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            placeholder="e.g. Club paid, Refunded to Judge"
          />
        </div>
      </div>
    </ModalShell>
  );
};

export default ClubModal;