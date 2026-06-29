import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../store/store"; // adjust to your actual store path
import {
  fetchFinancialStats,
  fetchVoteLines,
  createVoteLine,
  updateVoteLine,
  deleteVoteLine,
  fetchActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  fetchProBonoRequests,
  createProBono,
  updateProBono,
  deleteProBono,
  fetchBudgetReports,
  createBudgetReport,
  submitBudgetReport,
  approveBudgetReport,
  fetchFinancialAuditLog,
  setActivityFilters,
  setProBonoFilters,
  clearError,
  selectFinancialStats,
  selectAllVoteLines,
  selectAllActivities,
  selectAllProBonoRequests,
  selectAllBudgetReports,
  selectAllAuditLog,
  selectVoteLinesLoading,
  selectActivitiesLoading,
  selectProBonoLoading,
  selectReportsLoading,
  selectAuditLogLoading,
  selectStatsLoading,
  selectMutating,
  selectActivityFilters,
  selectProBonoFilters,
  selectFinancialError,
  type VoteLine,
  type FinancialActivity,
  type FinancialActivityType,
  type FinancialStatus,
  type ProBonoRequest,
  type ProBonoStatus,
  type CreateVoteLineInput,
  type CreateFinancialActivityInput,
  type UpdateFinancialActivityInput,
  type CreateProBonoInput,
  type UpdateProBonoInput,
} from "../../store/slices/financialSlice"; // adjust to your actual slice path
import {
  Wallet,
  CheckCircle2,
  Hourglass,
  HandHeart,
  Search,
  FileSpreadsheet,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CalendarPlus,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Postgres NUMERIC/DECIMAL columns come back from node-postgres as
 * strings (e.g. "1000000.00"), not numbers, even though the TS types
 * say `number`. Always coerce through this before formatting or doing
 * arithmetic — this is what was causing "spent.toFixed is not a function".
 */
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

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const currentMonthIso = () => `${new Date().toISOString().slice(0, 7)}-01`;

const extractErrorMessage = (err: unknown): string => {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Something went wrong. Please try again.";
};

/* ------------------------------------------------------------------ */
/*  Small shared UI bits (gold/green design system)                     */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  iconBg,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 sm:px-5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-stone-900 leading-none sm:text-xl">{value}</p>
        <p className="mt-1 text-sm font-medium text-stone-700">{label}</p>
        <p className="text-xs text-stone-400">{sub}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1a3d1c]">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
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
  type = "button",
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
    Draft: "bg-stone-100 text-stone-600 border-stone-200",
    Submitted: "bg-amber-50 text-amber-700 border-amber-200",
    Expenditure: "bg-stone-100 text-stone-700 border-stone-200",
    Commitment: "bg-amber-50 text-amber-700 border-amber-200",
    "Pro Bono": "bg-violet-50 text-violet-700 border-violet-200",
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</label>
      {children}
    </div>
  );
}

const inputClasses =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]";

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

/* ------------------------------------------------------------------ */
/*  Vote line card + create/edit                                       */
/* ------------------------------------------------------------------ */

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

function VoteLineFormModal({
  voteLine,
  onClose,
}: {
  voteLine: VoteLine | null; // null = create mode
  onClose: () => void;
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
      await dispatch(fetchVoteLines());
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

/* ------------------------------------------------------------------ */
/*  Financial activity create/edit                                     */
/* ------------------------------------------------------------------ */

function ActivityFormModal({
  activity,
  voteLines,
  onClose,
}: {
  activity: FinancialActivity | null; // null = create mode
  voteLines: VoteLine[];
  onClose: () => void;
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
      await dispatch(fetchActivities({}));
      await dispatch(fetchFinancialStats());
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

/* ------------------------------------------------------------------ */
/*  Pro bono create/edit                                               */
/* ------------------------------------------------------------------ */

function ProBonoFormModal({
  request,
  onClose,
}: {
  request: ProBonoRequest | null; // null = create mode
  onClose: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const mutating = useSelector(selectMutating);
  const [form, setForm] = useState({
    organization: request?.organization ?? "",
    serviceType: request?.service_type ?? "",
    description: request?.description ?? "",
    value: String(toNum(request?.value)),
    status: request?.status ?? ("Pending" as ProBonoStatus),
    submittedDate: request?.submitted_date?.slice(0, 10) ?? todayIso(),
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!form.organization.trim() || !form.serviceType.trim() || !form.value) {
      setError("Organization, service type and value are required.");
      return;
    }
    try {
      if (request) {
        const input: UpdateProBonoInput = {
          organization: form.organization.trim(),
          service_type: form.serviceType.trim(),
          description: form.description.trim() || null,
          value: toNum(form.value),
          status: form.status,
        };
        await dispatch(updateProBono({ id: request.id, input })).unwrap();
      } else {
        const input: CreateProBonoInput = {
          organization: form.organization.trim(),
          service_type: form.serviceType.trim(),
          description: form.description.trim() || undefined,
          value: toNum(form.value),
          status: form.status,
          submitted_date: form.submittedDate,
        };
        await dispatch(createProBono(input)).unwrap();
      }
      await dispatch(fetchProBonoRequests({}));
      await dispatch(fetchFinancialStats());
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <ModalShell
      title={request ? "Edit Pro Bono Request" : "New Pro Bono Request"}
      onClose={onClose}
      footer={
        <>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <GoldOutlineButton
            icon={mutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
            onClick={handleSubmit}
            disabled={mutating}
          >
            {request ? "Save Changes" : "Add Request"}
          </GoldOutlineButton>
        </>
      }
    >
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <Field label="Organization / Station">
        <input
          className={inputClasses}
          value={form.organization}
          onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
          placeholder="e.g. Kibera Law Centre"
        />
      </Field>
      <Field label="Service Type">
        <input
          className={inputClasses}
          value={form.serviceType}
          onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
          placeholder="e.g. Legal representation"
        />
      </Field>
      <Field label="Description (optional)">
        <textarea
          className={`${inputClasses} h-20 resize-none`}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estimated Value (KES)">
          <input
            type="number"
            min={0}
            className={inputClasses}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
          />
        </Field>
        {!request && (
          <Field label="Date of Request">
            <input
              type="date"
              className={inputClasses}
              value={form.submittedDate}
              onChange={(e) => setForm((f) => ({ ...f, submittedDate: e.target.value }))}
            />
          </Field>
        )}
      </div>
      <Field label="Status">
        <select
          className={inputClasses}
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProBonoStatus }))}
        >
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
        </select>
      </Field>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Budget Management tab                                              */
/* ------------------------------------------------------------------ */

function BudgetManagementTab() {
  const dispatch = useDispatch<AppDispatch>();
  const voteLines = useSelector(selectAllVoteLines);
  const activities = useSelector(selectAllActivities);
  const budgetReports = useSelector(selectAllBudgetReports);
  const auditLog = useSelector(selectAllAuditLog);
  const filters = useSelector(selectActivityFilters);
  const activitiesLoading = useSelector(selectActivitiesLoading);
  const reportsLoading = useSelector(selectReportsLoading);
  const mutating = useSelector(selectMutating);

  const [voteLineModal, setVoteLineModal] = useState<{ open: boolean; line: VoteLine | null }>({
    open: false,
    line: null,
  });
  const [activityModal, setActivityModal] = useState<{ open: boolean; activity: FinancialActivity | null }>({
    open: false,
    activity: null,
  });
  const [deleteVoteLineTarget, setDeleteVoteLineTarget] = useState<VoteLine | null>(null);
  const [deleteActivityTarget, setDeleteActivityTarget] = useState<FinancialActivity | null>(null);

  const [search, setSearch] = useState(filters.search ?? "");

  // Debounced search -> filter dispatch
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(setActivityFilters({ search }));
      dispatch(fetchActivities({ ...filters, search }));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleVoteChange = (vote: string) => {
    dispatch(setActivityFilters({ vote }));
    dispatch(fetchActivities({ ...filters, vote }));
  };

  const handleTypeChange = (type: string) => {
    dispatch(setActivityFilters({ type }));
    dispatch(fetchActivities({ ...filters, type }));
  };

  const handleDeleteVoteLine = async () => {
    if (!deleteVoteLineTarget) return;
    await dispatch(deleteVoteLine(deleteVoteLineTarget.id));
    setDeleteVoteLineTarget(null);
  };

  const handleDeleteActivity = async () => {
    if (!deleteActivityTarget) return;
    await dispatch(deleteActivity(deleteActivityTarget.id));
    await dispatch(fetchFinancialStats());
    setDeleteActivityTarget(null);
  };

  const handleGenerateReport = () => {
    dispatch(createBudgetReport({ report_month: currentMonthIso() }));
  };

  const voteOptions = useMemo(() => ["All Votes", ...voteLines.map((v) => v.name)], [voteLines]);
  const typeOptions: (FinancialActivityType | "All Types")[] = ["All Types", "Expenditure", "Commitment", "Pro Bono"];

  return (
    <div className="space-y-4">
      {voteLineModal.open && (
        <VoteLineFormModal
          voteLine={voteLineModal.line}
          onClose={() => setVoteLineModal({ open: false, line: null })}
        />
      )}
      {activityModal.open && (
        <ActivityFormModal
          activity={activityModal.activity}
          voteLines={voteLines}
          onClose={() => setActivityModal({ open: false, activity: null })}
        />
      )}
      {deleteVoteLineTarget && (
        <ConfirmDialog
          title="Delete vote line?"
          message={`"${deleteVoteLineTarget.name}" will be archived and removed from active budget tracking.`}
          onConfirm={handleDeleteVoteLine}
          onCancel={() => setDeleteVoteLineTarget(null)}
          loading={mutating}
        />
      )}
      {deleteActivityTarget && (
        <ConfirmDialog
          title="Delete activity?"
          message={`"${deleteActivityTarget.activity}" will be removed from recorded activities.`}
          onConfirm={handleDeleteActivity}
          onCancel={() => setDeleteActivityTarget(null)}
          loading={mutating}
        />
      )}

      <Panel
        title="Vote / Budget Line Summary"
        action={
          <GoldOutlineButton
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setVoteLineModal({ open: true, line: null })}
          >
            Add Vote Line
          </GoldOutlineButton>
        }
      >
        {voteLines.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No vote lines configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {voteLines.map((line) => (
              <VoteLineCard
                key={line.id}
                line={line}
                onEdit={() => setVoteLineModal({ open: true, line })}
                onDelete={() => setDeleteVoteLineTarget(line)}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Recorded Activities"
        action={
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
            <GoldOutlineButton
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setActivityModal({ open: true, activity: null })}
            >
              New Activity
            </GoldOutlineButton>
          </div>
        }
      >
        {activitiesLoading ? (
          <p className="py-8 text-center text-sm text-stone-400">Loading activities…</p>
        ) : activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">No entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-stone-400">
                  <th className="py-2 pr-3">Activity</th>
                  <th className="py-2 pr-3">Payee</th>
                  <th className="py-2 pr-3">Vote</th>
                  <th className="py-2 pr-3">Amount (KES)</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {activities.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 font-medium text-stone-800">{a.activity}</td>
                    <td className="py-2 pr-3 text-stone-600">{a.payee}</td>
                    <td className="py-2 pr-3 text-stone-600">{a.vote_name}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{formatKes(a.amount)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{formatDate(a.date)}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={a.type} />
                    </td>
                    <td className="py-2 pr-3">
                      <StatusPill status={a.status} />
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <IconButton
                          icon={<Pencil className="h-3 w-3" />}
                          title="Edit activity"
                          onClick={() => setActivityModal({ open: true, activity: a })}
                        />
                        <IconButton
                          icon={<Trash2 className="h-3 w-3" />}
                          title="Delete activity"
                          tone="danger"
                          onClick={() => setDeleteActivityTarget(a)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Monthly Budget Report"
        action={
          <div className="flex flex-wrap gap-2">
            <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Excel</GhostButton>
            <GhostButton icon={<FileText className="h-3.5 w-3.5" />}>PDF Report</GhostButton>
            <GoldOutlineButton
              icon={reportsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
              onClick={handleGenerateReport}
            >
              Generate This Month
            </GoldOutlineButton>
          </div>
        }
      >
        {budgetReports.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No monthly reports submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-stone-400">
                  <th className="py-2 pr-3">Month</th>
                  <th className="py-2 pr-3">Allocated</th>
                  <th className="py-2 pr-3">Spent</th>
                  <th className="py-2 pr-3">Committed</th>
                  <th className="py-2 pr-3">Available</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {budgetReports.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 font-medium text-stone-800">{formatDate(r.report_month)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{formatKes(r.total_allocated)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{formatKes(r.total_spent)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{formatKes(r.total_committed)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{formatKes(r.total_available)}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="py-2">
                      {r.status === "Draft" && (
                        <button
                          onClick={() => dispatch(submitBudgetReport(r.id))}
                          className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          Submit
                        </button>
                      )}
                      {r.status === "Submitted" && (
                        <button
                          onClick={() => dispatch(approveBudgetReport(r.id))}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                      )}
                      {r.status === "Approved" && <span className="text-xs text-stone-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Budget Audit Log">
        {auditLog.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No actions recorded yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {auditLog
              .filter((e) => e.entity_type !== "probono")
              .map((entry) => (
                <li key={entry.id} className="py-2">
                  <p className="font-medium text-stone-800">
                    {entry.actor_name ?? "System"} — {entry.action}
                  </p>
                  {entry.detail && <p className="text-xs text-stone-500">{entry.detail}</p>}
                  <p className="text-xs text-stone-400">{formatDateTime(entry.timestamp)}</p>
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pro Bono Management tab                                            */
/* ------------------------------------------------------------------ */

function ProBonoManagementTab() {
  const dispatch = useDispatch<AppDispatch>();
  const proBonoRequests = useSelector(selectAllProBonoRequests);
  const auditLog = useSelector(selectAllAuditLog);
  const proBonoLoading = useSelector(selectProBonoLoading);
  const filters = useSelector(selectProBonoFilters);
  const mutating = useSelector(selectMutating);

  const [search, setSearch] = useState(filters.search ?? "");
  const [formModal, setFormModal] = useState<{ open: boolean; request: ProBonoRequest | null }>({
    open: false,
    request: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<ProBonoRequest | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(setProBonoFilters({ search }));
      dispatch(fetchProBonoRequests({ ...filters, search }));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleStatusFilterChange = (status: string) => {
    dispatch(setProBonoFilters({ status }));
    dispatch(fetchProBonoRequests({ ...filters, status }));
  };

  const handleStatusChange = (id: string, status: ProBonoStatus) => {
    dispatch(updateProBono({ id, input: { status } })).then(() => dispatch(fetchFinancialStats()));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteProBono(deleteTarget.id));
    await dispatch(fetchFinancialStats());
    setDeleteTarget(null);
  };

  const proBonoAuditEntries = auditLog.filter((a) => a.entity_type === "probono");
  const statusOptions: (ProBonoStatus | "All Statuses")[] = ["All Statuses", "Pending", "Approved", "Completed", "Rejected"];

  return (
    <div className="space-y-4">
      {formModal.open && (
        <ProBonoFormModal request={formModal.request} onClose={() => setFormModal({ open: false, request: null })} />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete pro bono request?"
          message={`The request from "${deleteTarget.organization}" will be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}

      <Panel
        title="Pro Bono Requests"
        action={
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
              value={filters.status ?? "All Statuses"}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="rounded-md border border-stone-300 px-2 py-1.5 text-xs"
            >
              {statusOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Excel</GhostButton>
            <GhostButton icon={<FileText className="h-3.5 w-3.5" />}>PDF Report</GhostButton>
            <GoldOutlineButton
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setFormModal({ open: true, request: null })}
            >
              New Request
            </GoldOutlineButton>
          </div>
        }
      >
        {proBonoLoading ? (
          <p className="py-8 text-center text-sm text-stone-400">Loading pro bono requests…</p>
        ) : proBonoRequests.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">No pro bono requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-stone-400">
                  <th className="py-2 pr-3">Organization</th>
                  <th className="py-2 pr-3">Service Type</th>
                  <th className="py-2 pr-3">Value (KES)</th>
                  <th className="py-2 pr-3">Date of Request</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Approved Date</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {proBonoRequests.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 font-medium text-stone-800">{p.organization}</td>
                    <td className="py-2 pr-3 text-stone-600">{p.service_type}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{formatKes(p.value)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{formatDate(p.submitted_date)}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-stone-600">{formatDate(p.approved_date)}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {p.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(p.id, "Approved")}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(p.id, "Rejected")}
                              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {p.status === "Approved" && (
                          <button
                            onClick={() => handleStatusChange(p.id, "Completed")}
                            className="rounded-md border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Mark Completed
                          </button>
                        )}
                        <IconButton
                          icon={<Pencil className="h-3 w-3" />}
                          title="Edit request"
                          onClick={() => setFormModal({ open: true, request: p })}
                        />
                        <IconButton
                          icon={<Trash2 className="h-3 w-3" />}
                          title="Delete request"
                          tone="danger"
                          onClick={() => setDeleteTarget(p)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Pro Bono Activity Log">
        {proBonoAuditEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No actions yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {proBonoAuditEntries.map((entry) => (
              <li key={entry.id} className="py-2">
                <p className="font-medium text-stone-800">
                  {entry.actor_name ?? "System"} — {entry.action}
                </p>
                {entry.detail && <p className="text-xs text-stone-500">{entry.detail}</p>}
                <p className="text-xs text-stone-400">{formatDateTime(entry.timestamp)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

type TabKey = "budget" | "proBono";

const SuperAdminFinancial = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState<TabKey>("budget");

  const stats = useSelector(selectFinancialStats);
  const statsLoading = useSelector(selectStatsLoading);
  const voteLinesLoading = useSelector(selectVoteLinesLoading);
  const auditLoading = useSelector(selectAuditLogLoading);

  useEffect(() => {
    dispatch(fetchFinancialStats());
    dispatch(fetchVoteLines());
    dispatch(fetchActivities({}));
    dispatch(fetchProBonoRequests({}));
    dispatch(fetchBudgetReports());
    dispatch(fetchFinancialAuditLog(50));
  }, [dispatch]);

  const loadingAny = statsLoading || voteLinesLoading || auditLoading;

  return (
    <div className="min-h-screen bg-stone-50 p-3 sm:p-6">
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 sm:text-2xl">Financial &amp; Pro Bono Management</h1>
            <p className="text-sm text-stone-500">Budget tracking, pro bono workflows and financial reporting</p>
          </div>
          {loadingAny && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-stone-400" />}
        </div>

        <ErrorBanner />

        {/* Registrar banner */}
        <div className="mb-4 rounded-xl border border-[#c9a84c]/40 bg-[#1a3d1c]/[0.03] px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold text-[#1a3d1c]">Hon. Clare Otieno-Omondi</span>
            <span className="text-stone-500"> — Registrar</span>
          </p>
          <p className="text-xs text-stone-500">
            You have full visibility of budget, pro bono workflows, and reports. You can sign consolidated memos.
          </p>
        </div>

        {/* Stat cards */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Wallet className="h-5 w-5 text-[#1a3d1c]" />}
            iconBg="bg-[#c9a84c]/15"
            value={formatKes(stats?.total_allocated)}
            label="Total Allocated"
            sub="Across all votes"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />}
            iconBg="bg-emerald-100"
            value={formatKes(stats?.total_paid)}
            label="Total Paid"
            sub="All paid activities"
          />
          <StatCard
            icon={<Hourglass className="h-5 w-5 text-[#1a3d1c]" />}
            iconBg="bg-[#c9a84c]/15"
            value={formatKes(stats?.committed_unpaid)}
            label="Committed (Unpaid)"
            sub="Pending obligations"
          />
          <StatCard
            icon={<HandHeart className="h-5 w-5 text-[#1a3d1c]" />}
            iconBg="bg-[#c9a84c]/15"
            value={stats?.pro_bono_approved ?? 0}
            label="Pro Bono Approved"
            sub="Approved requests"
          />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-xl border border-stone-200 bg-white p-1">
          <button
            onClick={() => setActiveTab("budget")}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition sm:flex-none ${
              activeTab === "budget" ? "bg-[#1a3d1c] text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Budget Management
          </button>
          <button
            onClick={() => setActiveTab("proBono")}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition sm:flex-none ${
              activeTab === "proBono" ? "bg-[#1a3d1c] text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Pro Bono Management
          </button>
        </div>

        {activeTab === "budget" ? <BudgetManagementTab /> : <ProBonoManagementTab />}
      </div>
    </div>
  );
};

export default SuperAdminFinancial;