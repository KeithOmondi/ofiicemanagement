import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../store/store";
import {
  fetchBudgetReports,
  createBudgetReport,
  submitBudgetReport,
  approveBudgetReport,
  fetchFinancialAuditLog,
  selectAllBudgetReports,
  selectAllAuditLog,
  selectReportsLoading,
  selectAuditLogLoading,
  selectMutating,
  clearError,
  selectFinancialError,
} from "../../store/slices/financialSlice";
import {
  CalendarPlus,
  X,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Clock,
  History,
  User,
} from "lucide-react";
import { selectCurrentUser } from "../../store/slices/userSlice";

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

const currentMonthIso = () => `${new Date().toISOString().slice(0, 7)}-01`;

// ─── UI Components ────────────────────────────────────────────────────────────

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

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Draft: "bg-stone-100 text-stone-600 border-stone-200",
    Submitted: "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

// ─── Main Component ───────────────────────────────────────────────────────────

const FinanceTransactions = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const budgetReports = useSelector(selectAllBudgetReports);
  const auditLog = useSelector(selectAllAuditLog);
  const reportsLoading = useSelector(selectReportsLoading);
  const auditLoading = useSelector(selectAuditLogLoading);
  const mutating = useSelector(selectMutating);
  const currentUser = useSelector(selectCurrentUser);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchBudgetReports());
    dispatch(fetchFinancialAuditLog(50));
  }, [dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleGenerateReport = () => {
    dispatch(createBudgetReport({ report_month: currentMonthIso() }));
  };

  const handleSubmitReport = (id: string) => {
    dispatch(submitBudgetReport(id));
  };

  const handleApproveReport = (id: string) => {
    dispatch(approveBudgetReport(id));
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <ErrorBanner />

      {/* Current User Info Banner */}
      <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a3d1c]/10">
            <User className="h-4 w-4 text-[#1a3d1c]" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">
              Logged in as: <span className="text-[#1a3d1c]">{currentUser?.full_name || "Loading..."}</span>
            </p>
            <p className="text-xs text-stone-400">
              {currentUser?.email || ""} · {currentUser?.role?.replace('_', ' ') || ""}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Budget Report Table */}
      <div className="rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1a3d1c]">
            <FileSpreadsheet className="h-4 w-4" />
            Monthly Budget Reports
            <span className="text-xs font-normal text-stone-400">({budgetReports.length})</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export Excel</GhostButton>
            <GhostButton icon={<FileText className="h-3.5 w-3.5" />}>Export PDF</GhostButton>
            <GoldOutlineButton
              icon={reportsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
              onClick={handleGenerateReport}
              disabled={mutating || reportsLoading}
            >
              Generate This Month
            </GoldOutlineButton>
          </div>
        </div>

        <div className="overflow-x-auto">
          {reportsLoading && budgetReports.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#1a3d1c]" />
            </div>
          ) : budgetReports.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-stone-400">No monthly reports generated yet.</p>
              <button
                onClick={handleGenerateReport}
                className="mt-2 text-sm font-medium text-[#c9a84c] hover:underline"
              >
                Generate your first report
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-400">
                  <th className="px-4 py-3 font-medium">Month</th>
                  <th className="px-4 py-3 font-medium text-right">Allocated</th>
                  <th className="px-4 py-3 font-medium text-right">Spent</th>
                  <th className="px-4 py-3 font-medium text-right">Committed</th>
                  <th className="px-4 py-3 font-medium text-right">Available</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Submitted</th>
                  <th className="px-4 py-3 font-medium text-center">Approved</th>
                  <th className="px-4 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {budgetReports.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800">
                      {formatDate(r.report_month)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-700">
                      {formatKes(r.total_allocated)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {formatKes(r.total_spent)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {formatKes(r.total_committed)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {formatKes(r.total_available)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-center text-stone-600 text-xs">
                      {r.submitted_date ? formatDate(r.submitted_date) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-stone-600 text-xs">
                      {r.approved_date ? formatDate(r.approved_date) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.status === "Draft" && (
                        <button
                          onClick={() => handleSubmitReport(r.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                          disabled={mutating}
                        >
                          <Clock className="h-3 w-3" />
                          Submit
                        </button>
                      )}
                      {r.status === "Submitted" && (
                        <button
                          onClick={() => handleApproveReport(r.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                          disabled={mutating}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Approve
                        </button>
                      )}
                      {r.status === "Approved" && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1a3d1c]">
            <History className="h-4 w-4" />
            Financial Audit Log
            <span className="text-xs font-normal text-stone-400">({auditLog.length})</span>
          </h3>
          <div className="flex items-center gap-2">
            <GhostButton icon={<FileText className="h-3.5 w-3.5" />}>Export PDF</GhostButton>
          </div>
        </div>

        <div className="overflow-x-auto">
          {auditLoading && auditLog.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#1a3d1c]" />
            </div>
          ) : auditLog.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-stone-400">No audit entries recorded yet.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-400">
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium text-center">Entity Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditLog.slice(0, 50).map((entry) => {
                  // Determine if the current user is the actor
                  const isCurrentUser = currentUser && 
                    (entry.actor === currentUser.id || 
                     entry.actor_name?.toLowerCase() === currentUser.full_name?.toLowerCase());
                  
                  return (
                    <tr key={entry.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-stone-500">
                        {formatDateTime(entry.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isCurrentUser ? 'text-[#1a3d1c]' : 'text-stone-700'}`}>
                            {entry.actor_name ?? "System"}
                          </span>
                          {isCurrentUser && (
                            <span className="inline-flex items-center rounded-full bg-[#1a3d1c]/10 px-2 py-0.5 text-[10px] font-medium text-[#1a3d1c]">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 max-w-xs truncate">
                        {entry.detail || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-stone-50 px-2.5 py-0.5 text-[10px] font-medium text-stone-500 border border-stone-200">
                          {entry.entity_type || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {auditLog.length > 50 && (
          <div className="border-t border-stone-100 px-4 py-3 text-center">
            <button
              onClick={() => dispatch(fetchFinancialAuditLog(100))}
              className="text-xs font-medium text-[#c9a84c] hover:underline"
            >
              Load more entries
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceTransactions;