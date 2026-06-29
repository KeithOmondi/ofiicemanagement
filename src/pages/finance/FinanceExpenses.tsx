import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../store/store";
import {
  fetchActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  fetchFinancialStats,
  fetchVoteLines,
  setActivityFilters,
  selectAllActivities,
  selectAllVoteLines,
  selectActivityFilters,
  selectActivitiesLoading,
  selectMutating,
  clearError,
  selectFinancialError,
  type FinancialActivity,
  type FinancialActivityType,
  type FinancialStatus,
  type CreateFinancialActivityInput,
  type UpdateFinancialActivityInput,
} from "../../store/slices/financialSlice";
import {
  Search,
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

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const extractErrorMessage = (err: unknown): string => {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Something went wrong. Please try again.";
};

// ─── UI Components ────────────────────────────────────────────────────────────

const inputClasses =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        map[status] ?? "bg-stone-50 text-stone-600 border-stone-200"
      }`}
    >
      {status}
    </span>
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

// ─── Activity Form Modal ──────────────────────────────────────────────────────

function ActivityFormModal({
  activity,
  voteLines,
  onClose,
  onSuccess,
}: {
  activity: FinancialActivity | null;
  voteLines: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const mutating = useSelector(selectMutating);
  const [form, setForm] = useState({
    activityName: activity?.activity ?? "",
    payee: activity?.payee ?? "",
    voteId: activity?.vote_id ?? voteLines[0]?.id ?? "",
    amount: String(toNum(activity?.amount)),
    date: activity?.date?.slice(0, 10) ?? todayIso(),
    type: activity?.type ?? ("Expenditure" as FinancialActivityType),
    status: activity?.status ?? ("Pending" as FinancialStatus),
  });
  const [error, setError] = useState<string | null>(null);

  const selectedVote = voteLines.find((v) => v.id === form.voteId);

  const handleSubmit = async () => {
    setError(null);
    if (!form.activityName.trim() || !form.payee.trim() || !form.amount || !form.date) {
      setError("Activity, payee, amount and date are required.");
      return;
    }
    try {
      if (activity) {
        const input: UpdateFinancialActivityInput = {
          activity: form.activityName.trim(),
          payee: form.payee.trim(),
          vote_id: selectedVote?.id ?? null,
          vote_name: selectedVote?.name ?? "Unassigned",
          amount: toNum(form.amount),
          date: form.date,
          type: form.type,
          status: form.status,
        };
        await dispatch(updateActivity({ id: activity.id, input })).unwrap();
      } else {
        const input: CreateFinancialActivityInput = {
          activity: form.activityName.trim(),
          payee: form.payee.trim(),
          vote_id: selectedVote?.id ?? null,
          vote_name: selectedVote?.name ?? "Unassigned",
          amount: toNum(form.amount),
          date: form.date,
          type: form.type,
          status: form.status,
        };
        await dispatch(createActivity(input)).unwrap();
      }
      await onSuccess();
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <ModalShell
      title={activity ? "Edit Activity" : "Record New Activity"}
      onClose={onClose}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <GoldOutlineButton
            icon={mutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
            onClick={handleSubmit}
            disabled={mutating}
          >
            {activity ? "Save Changes" : "Add Activity"}
          </GoldOutlineButton>
        </>
      }
    >
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <Field label="Activity">
        <input
          className={inputClasses}
          value={form.activityName}
          onChange={(e) => setForm((f) => ({ ...f, activityName: e.target.value }))}
          placeholder="e.g. Office supplies — Q3"
        />
      </Field>
      <Field label="Payee">
        <input
          className={inputClasses}
          value={form.payee}
          onChange={(e) => setForm((f) => ({ ...f, payee: e.target.value }))}
          placeholder="e.g. ABC Suppliers Ltd"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vote">
          <select
            className={inputClasses}
            value={form.voteId}
            onChange={(e) => setForm((f) => ({ ...f, voteId: e.target.value }))}
          >
            {voteLines.length === 0 && <option value="">No vote lines yet</option>}
            {voteLines.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount (KES)">
          <input
            type="number"
            min={0}
            className={inputClasses}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input
            type="date"
            className={inputClasses}
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </Field>
        <Field label="Type">
          <select
            className={inputClasses}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FinancialActivityType }))}
          >
            <option value="Expenditure">Expenditure</option>
            <option value="Commitment">Commitment</option>
            <option value="Pro Bono">Pro Bono</option>
          </select>
        </Field>
      </div>
      <Field label="Status">
        <select
          className={inputClasses}
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FinancialStatus }))}
        >
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Paid">Paid</option>
          <option value="Rejected">Rejected</option>
        </select>
      </Field>
    </ModalShell>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const FinanceExpenses = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const activities = useSelector(selectAllActivities);
  const voteLines = useSelector(selectAllVoteLines);
  const filters = useSelector(selectActivityFilters);
  const loading = useSelector(selectActivitiesLoading);
  const mutating = useSelector(selectMutating);

  const [search, setSearch] = useState(filters.search ?? "");
  const [activityModal, setActivityModal] = useState<{ open: boolean; activity: FinancialActivity | null }>({
    open: false,
    activity: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<FinancialActivity | null>(null);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchVoteLines());
    dispatch(fetchActivities({}));
    dispatch(fetchFinancialStats());
  }, [dispatch]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(setActivityFilters({ search }));
      dispatch(fetchActivities({ ...filters, search }));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    dispatch(fetchActivities(filters));
    dispatch(fetchFinancialStats());
  };

  const handleVoteChange = (vote: string) => {
    dispatch(setActivityFilters({ vote }));
    dispatch(fetchActivities({ ...filters, vote }));
  };

  const handleTypeChange = (type: string) => {
    dispatch(setActivityFilters({ type }));
    dispatch(fetchActivities({ ...filters, type }));
  };

  const handleStatusChange = (status: string) => {
    dispatch(setActivityFilters({ status }));
    dispatch(fetchActivities({ ...filters, status }));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteActivity(deleteTarget.id));
    await dispatch(fetchFinancialStats());
    setDeleteTarget(null);
  };

  // ── Derived Data ────────────────────────────────────────────────────────────

  const voteOptions = useMemo(() => ["All Votes", ...voteLines.map((v) => v.name)], [voteLines]);
  const typeOptions: (FinancialActivityType | "All Types")[] = ["All Types", "Expenditure", "Commitment", "Pro Bono"];
  const statusOptions: (FinancialStatus | "All Statuses")[] = ["All Statuses", "Pending", "Approved", "Paid", "Rejected"];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <ErrorBanner />

      {activityModal.open && (
        <ActivityFormModal
          activity={activityModal.activity}
          voteLines={voteLines}
          onClose={() => setActivityModal({ open: false, activity: null })}
          onSuccess={handleRefresh}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete activity?"
          message={`"${deleteTarget.activity}" will be removed from recorded activities.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1a3d1c]">
          Recorded Activities
          <span className="text-xs font-normal text-stone-400">({activities.length})</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-32 rounded-md border border-stone-300 py-1.5 pl-7 pr-2 text-xs focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] sm:w-40"
            />
          </div>
          <select
            value={filters.vote ?? "All Votes"}
            onChange={(e) => handleVoteChange(e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1.5 text-xs"
          >
            {voteOptions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            value={filters.type ?? "All Types"}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1.5 text-xs"
          >
            {typeOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            value={filters.status ?? "All Statuses"}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1.5 text-xs"
          >
            {statusOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Excel</GhostButton>
          <GhostButton icon={<FileText className="h-3.5 w-3.5" />}>PDF</GhostButton>
          <GoldOutlineButton
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setActivityModal({ open: true, activity: null })}
          >
            New Activity
          </GoldOutlineButton>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#1a3d1c]" />
          </div>
        ) : activities.length === 0 ? (
          <p className="py-12 text-center text-sm text-stone-400">No entries found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-400">
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Payee</th>
                <th className="px-4 py-3">Vote</th>
                <th className="px-4 py-3">Amount (KES)</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {activities.map((a) => (
                <tr key={a.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800">{a.activity}</td>
                  <td className="px-4 py-3 text-stone-600">{a.payee}</td>
                  <td className="px-4 py-3 text-stone-600">{a.vote_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">{formatKes(a.amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">{formatDate(a.date)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.type} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <IconButton
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        title="Edit activity"
                        onClick={() => setActivityModal({ open: true, activity: a })}
                      />
                      <IconButton
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        title="Delete activity"
                        tone="danger"
                        onClick={() => setDeleteTarget(a)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FinanceExpenses;