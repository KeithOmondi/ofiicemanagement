import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../store/store";
import {
  fetchVoteLines,
  createVoteLine,
  updateVoteLine,
  deleteVoteLine,
  fetchFinancialStats,
  selectAllVoteLines,
  selectVoteLinesLoading,
  selectMutating,
  clearError,
  selectFinancialError,
  type VoteLine,
  type CreateVoteLineInput,
} from "../../store/slices/financialSlice";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toNum = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
};

const formatKes = (value: unknown): string =>
  `KES ${toNum(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const extractErrorMessage = (err: unknown): string => {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Something went wrong. Please try again.";
};

// ─── UI Components ────────────────────────────────────────────────────────────

const inputClasses =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]";

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
      className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}

function GoldOutlineButton({
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
      className="inline-flex items-center gap-2 rounded-md bg-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-[#1a3d1c] hover:bg-[#b8973f] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {children}
    </button>
  );
}

function IconButton({
  icon,
  onClick,
  title,
  tone = "default",
}: {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-md border p-1.5 transition ${
        tone === "danger"
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-stone-200 text-stone-600 hover:bg-stone-50"
      }`}
    >
      {icon}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</label>
      {children}
    </div>
  );
}

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

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
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

function ErrorBanner() {
  const dispatch = useDispatch<AppDispatch>();
  const error = useSelector(selectFinancialError);
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
      <button onClick={() => dispatch(clearError())} className="text-red-500 hover:text-red-700">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Vote Line Card ──────────────────────────────────────────────────────────

function VoteLineCard({
  line,
  onEdit,
  onDelete,
}: {
  line: VoteLine;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const allocated = toNum(line.allocated);
  const spent = toNum(line.spent);
  const committed = toNum(line.committed);
  const available = toNum(line.available);
  const pctSpent = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0;

  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-stone-800">{line.name}</span>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs text-stone-400">{formatKes(available)} avail</span>
          <IconButton icon={<Pencil className="h-3 w-3" />} title="Edit vote line" onClick={onEdit} />
          <IconButton icon={<Trash2 className="h-3 w-3" />} title="Delete vote line" tone="danger" onClick={onDelete} />
        </div>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-stone-400">Allocated</p>
          <p className="font-medium text-stone-700">{formatKes(allocated)}</p>
        </div>
        <div>
          <p className="text-stone-400">Spent</p>
          <p className="font-medium text-stone-700">{formatKes(spent)}</p>
        </div>
        <div>
          <p className="text-stone-400">Committed</p>
          <p className="font-medium text-stone-700">{formatKes(committed)}</p>
        </div>
      </div>

      {line.has_allocation ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div className="h-full bg-[#1a3d1c]" style={{ width: `${pctSpent}%` }} />
        </div>
      ) : (
        <p className="text-xs text-stone-400">No allocation set — use Edit to set one.</p>
      )}
    </div>
  );
}

// ─── Vote Line Form Modal ────────────────────────────────────────────────────

function VoteLineFormModal({
  voteLine,
  onClose,
  onSuccess,
}: {
  voteLine: VoteLine | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const mutating = useSelector(selectMutating);
  const [name, setName] = useState(voteLine?.name ?? "");
  const [allocated, setAllocated] = useState(String(toNum(voteLine?.allocated)));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Vote line name is required.");
      return;
    }
    try {
      if (voteLine) {
        const newAllocated = toNum(allocated);
        await dispatch(
          updateVoteLine({
            id: voteLine.id,
            input: { name: name.trim(), allocated: newAllocated, has_allocation: newAllocated > 0 },
          })
        ).unwrap();
      } else {
        const input: CreateVoteLineInput = { name: name.trim(), allocated: toNum(allocated) };
        await dispatch(createVoteLine(input)).unwrap();
      }
      await onSuccess();
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <ModalShell
      title={voteLine ? "Edit Vote Line" : "Add Vote Line"}
      onClose={onClose}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <GoldOutlineButton
            icon={mutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
            onClick={handleSubmit}
            disabled={mutating}
          >
            {voteLine ? "Save Changes" : "Add Vote Line"}
          </GoldOutlineButton>
        </>
      }
    >
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
      <Field label="Vote Line Name">
        <input className={inputClasses} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operations" />
      </Field>
      <Field label="Allocated (KES)">
        <input
          type="number"
          min={0}
          className={inputClasses}
          value={allocated}
          onChange={(e) => setAllocated(e.target.value)}
        />
      </Field>
    </ModalShell>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FinancePayments = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const voteLines = useSelector(selectAllVoteLines);
  const loading = useSelector(selectVoteLinesLoading);
  const mutating = useSelector(selectMutating);

  const [voteModal, setVoteModal] = useState<{ open: boolean; line: VoteLine | null }>({
    open: false,
    line: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<VoteLine | null>(null);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchVoteLines());
    dispatch(fetchFinancialStats());
  }, [dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    dispatch(fetchVoteLines());
    dispatch(fetchFinancialStats());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteVoteLine(deleteTarget.id));
    await dispatch(fetchFinancialStats());
    setDeleteTarget(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <ErrorBanner />

      {voteModal.open && (
        <VoteLineFormModal
          voteLine={voteModal.line}
          onClose={() => setVoteModal({ open: false, line: null })}
          onSuccess={handleRefresh}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete vote line?"
          message={`"${deleteTarget.name}" will be archived and removed from active budget tracking.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1a3d1c]">
          Vote / Budget Line Summary
          <span className="text-xs font-normal text-stone-400">({voteLines.length})</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Excel</GhostButton>
          <GhostButton icon={<FileText className="h-3.5 w-3.5" />}>PDF</GhostButton>
          <GoldOutlineButton
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setVoteModal({ open: true, line: null })}
          >
            Add Vote Line
          </GoldOutlineButton>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#1a3d1c]" />
          </div>
        ) : voteLines.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-400">No vote lines configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {voteLines.map((line) => (
              <VoteLineCard
                key={line.id}
                line={line}
                onEdit={() => setVoteModal({ open: true, line })}
                onDelete={() => setDeleteTarget(line)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancePayments;