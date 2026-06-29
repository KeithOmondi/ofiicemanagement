// src/pages/reports/SuperAdminReports.tsx
import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useAppDispatch, useAppSelector } from "../../store/hook";

// ── Documents ──────────────────────────────────────────────────────────────
import { fetchDocuments, selectPagination as selectDocumentsPagination, selectLoading as selectDocumentsLoading } from "../../store/slices/documentSlice";

// ── Users ──────────────────────────────────────────────────────────────────
import { fetchUserStats, selectUserStats, selectUsersDetailLoading } from "../../store/slices/userSlice";

// ── Departments ────────────────────────────────────────────────────────────
import { fetchDepartments, selectAllDepartments, selectDepartmentsListLoading } from "../../store/slices/departmentsSlice";

// ── Financial ──────────────────────────────────────────────────────────────
import {
  fetchFinancialStats,
  selectFinancialStats,
  selectStatsLoading as selectFinancialStatsLoading,
  fetchVoteLines,
  selectAllVoteLines,
  selectVoteLinesLoading,
  fetchActivities as fetchFinancialActivities,
  selectAllActivities as selectAllFinancialActivities,
  selectActivitiesLoading as selectFinancialActivitiesLoading,
} from "../../store/slices/financialSlice";

// ── DSA ────────────────────────────────────────────────────────────────────
import {
  fetchDsaStats,
  selectDsaStats,
  selectDsaStatsLoading,
  fetchActivities as fetchDsaActivities,
  selectActivities as selectDsaActivities,
  selectActivitiesLoading as selectDsaActivitiesLoading,
} from "../../store/slices/dsaSlice";

// ── Help Desk ──────────────────────────────────────────────────────────────
import { fetchHelpDeskStats, selectHelpDeskStats, selectStatsLoading as selectHelpDeskStatsLoading } from "../../store/slices/helpdeskSlice";

// ── Inventory ──────────────────────────────────────────────────────────────
import { fetchInventoryStats, selectInventoryStats, selectInventoryStatsLoading } from "../../store/slices/inventorySlice";

// ── Notices ────────────────────────────────────────────────────────────────
import { fetchNoticesStats, selectNoticesStats, selectStatsLoading as selectNoticesStatsLoading } from "../../store/slices/noticesSlice";

// ── Tasks & Projects ───────────────────────────────────────────────────────
import {
  fetchTaskStats,
  selectTaskStats,
  selectProjectStats,
  selectStatsLoading as selectTasksStatsLoading,
  fetchTasks,
  selectTasks,
  selectTasksLoading,
} from "../../store/slices/tasksSlice";

import {
  RefreshCw,
  FileText,
  Users,
  Building2,
  Wallet,
  Plane,
  LifeBuoy,
  Boxes,
  Megaphone,
  ListChecks,
  Loader2,
  BarChart3,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatKes = (amount: number | undefined | null): string => {
  const value = amount ?? 0;
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
};

const formatNum = (n: number | undefined | null): string => (n ?? 0).toLocaleString("en-KE");

// ─── Trend / granularity helpers ────────────────────────────────────────────
// All trend charts below are built from real, fetched records — no synthetic
// or placeholder data points are generated. Periods with zero matching
// records simply don't appear (or render as zero-height bars) in the chart.

type Granularity = "daily" | "monthly" | "quarterly" | "annual";

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

// How many trailing periods to show per granularity, so the chart stays
// readable regardless of how much history exists in the underlying data.
const WINDOW_SIZE: Record<Granularity, number> = {
  daily: 30,
  monthly: 12,
  quarterly: 8,
  annual: 5,
};

const getPeriodKey = (dateStr: string, granularity: Granularity): string | null => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  switch (granularity) {
    case "daily":
      return format(d, "yyyy-MM-dd");
    case "monthly":
      return format(d, "yyyy-MM");
    case "quarterly":
      return `${year}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    case "annual":
      return `${year}`;
  }
};

const getPeriodLabel = (key: string, granularity: Granularity): string => {
  switch (granularity) {
    case "daily":
      return format(new Date(key), "dd MMM");
    case "monthly":
      return format(new Date(`${key}-01`), "MMM yyyy");
    case "quarterly":
      return key.replace("-", " ");
    case "annual":
      return key;
  }
};

interface TrendPoint {
  key: string;
  label: string;
  value: number;
}

/**
 * Buckets real records into periods and sums a numeric value per bucket.
 * Records with a missing/invalid date are silently skipped (not zero-filled),
 * so the chart never implies data that wasn't actually fetched.
 */
function aggregateByPeriod<T>(
  records: T[],
  getDate: (r: T) => string | null | undefined,
  getValue: (r: T) => number,
  granularity: Granularity,
): TrendPoint[] {
  const buckets = new Map<string, number>();
  for (const r of records) {
    const dateStr = getDate(r);
    if (!dateStr) continue;
    const key = getPeriodKey(dateStr, granularity);
    if (!key) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + getValue(r));
  }
  const sortedKeys = Array.from(buckets.keys()).sort();
  const windowed = sortedKeys.slice(-WINDOW_SIZE[granularity]);
  return windowed.map((key) => ({
    key,
    label: getPeriodLabel(key, granularity),
    value: buckets.get(key) ?? 0,
  }));
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  loading?: boolean;
}> = ({ icon, title, subtitle, loading }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 rounded-xl bg-[#1E4620]/5 text-[#1E4620]">{icon}</div>
    <div className="flex-1 min-w-0">
      <h2 className="text-sm font-bold text-stone-900">{title}</h2>
      {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
    </div>
    {loading && <Loader2 size={16} className="animate-spin text-stone-300" />}
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger" | "success";
}> = ({ label, value, tone = "default" }) => {
  const toneStyles: Record<string, string> = {
    default: "text-stone-900",
    warning: "text-amber-600",
    danger: "text-red-600",
    success: "text-emerald-600",
  };
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3.5">
      <p className={`text-lg font-bold leading-tight ${toneStyles[tone]}`}>{value}</p>
      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
};

// Simple proportional bar — no chart library dependency.
const ProportionBar: React.FC<{
  segments: { label: string; value: number; color: string }[];
}> = ({ segments }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-stone-100">
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.color}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[10px] text-stone-500">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            {s.label} ({formatNum(s.value)})
          </span>
        ))}
      </div>
    </div>
  );
};

// Horizontal vote-line allocation bar (allocated vs spent vs committed)
const VoteLineRow: React.FC<{
  name: string;
  allocated: number;
  spent: number;
  committed: number;
}> = ({ name, allocated, spent, committed }) => {
  const safeAllocated = allocated || 1;
  const spentPct = Math.min(100, (spent / safeAllocated) * 100);
  const committedPct = Math.min(100 - spentPct, (committed / safeAllocated) * 100);
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-stone-700 truncate">{name}</span>
        <span className="text-stone-400 text-[10px]">{formatKes(allocated)} allocated</span>
      </div>
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-stone-100">
        <div className="bg-[#1E4620]" style={{ width: `${spentPct}%` }} />
        <div className="bg-amber-400" style={{ width: `${committedPct}%` }} />
      </div>
    </div>
  );
};

// Vertical bar trend chart — built purely from `data`, no library dependency.
const TrendChart: React.FC<{
  title: string;
  unit?: "kes" | "count";
  data: TrendPoint[];
  color?: string;
  loading?: boolean;
}> = ({ title, unit = "count", data, color = "bg-[#1E4620]", loading }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const formatValue = unit === "kes" ? formatKes : formatNum;
  const dense = data.length > 15;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{title}</p>
        {loading && <Loader2 size={12} className="animate-spin text-stone-300" />}
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-stone-400 italic py-6 text-center">
          No dated records found for this period.
        </p>
      ) : (
        <>
          <div className="flex items-end gap-1.5 h-32 overflow-x-auto pb-1">
            {data.map((d) => (
              <div
                key={d.key}
                className="flex flex-col items-center justify-end h-full flex-shrink-0"
                style={{ minWidth: dense ? "16px" : "32px" }}
              >
                <div
                  className={`${color} rounded-t w-full transition-all`}
                  style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` }}
                  title={`${d.label}: ${formatValue(d.value)}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] text-stone-400">
            <span>{data[0].label}</span>
            {data.length > 1 && <span>{data[data.length - 1].label}</span>}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const SuperAdminReports: React.FC = () => {
  const dispatch = useAppDispatch();

  // Documents
  const docsPagination = useAppSelector(selectDocumentsPagination);
  const docsLoading = useAppSelector(selectDocumentsLoading);

  // Users
  const userStats = useAppSelector(selectUserStats);
  const userStatsLoading = useAppSelector(selectUsersDetailLoading);

  // Departments
  const departments = useAppSelector(selectAllDepartments);
  const departmentsLoading = useAppSelector(selectDepartmentsListLoading);

  // Financial
  const financialStats = useAppSelector(selectFinancialStats);
  const financialStatsLoading = useAppSelector(selectFinancialStatsLoading);
  const voteLines = useAppSelector(selectAllVoteLines);
  const voteLinesLoading = useAppSelector(selectVoteLinesLoading);
  const financialActivities = useAppSelector(selectAllFinancialActivities);
  const financialActivitiesLoading = useAppSelector(selectFinancialActivitiesLoading);

  // DSA
  const dsaStats = useAppSelector(selectDsaStats);
  const dsaStatsLoading = useAppSelector(selectDsaStatsLoading);
  const dsaActivities = useAppSelector(selectDsaActivities);
  const dsaActivitiesLoading = useAppSelector(selectDsaActivitiesLoading);

  // Help Desk
  const helpDeskStats = useAppSelector(selectHelpDeskStats);
  const helpDeskStatsLoading = useAppSelector(selectHelpDeskStatsLoading);

  // Inventory
  const inventoryStats = useAppSelector(selectInventoryStats);
  const inventoryStatsLoading = useAppSelector(selectInventoryStatsLoading);

  // Notices
  const noticesStats = useAppSelector(selectNoticesStats);
  const noticesStatsLoading = useAppSelector(selectNoticesStatsLoading);

  // Tasks & Projects
  const taskStats = useAppSelector(selectTaskStats);
  const projectStats = useAppSelector(selectProjectStats);
  const tasksStatsLoading = useAppSelector(selectTasksStatsLoading);
  const allTasks = useAppSelector(selectTasks);
  const allTasksLoading = useAppSelector(selectTasksLoading);

  // ── Trend granularity (shared across all trend charts) ──────────────────
  const [granularity, setGranularity] = useState<Granularity>("monthly");

  // ── Load everything ──────────────────────────────────────────────────────
  const loadAll = () => {
    dispatch(fetchDocuments({ page: 1, limit: 1 }));
    dispatch(fetchUserStats());
    dispatch(fetchDepartments({ is_active: true }));
    dispatch(fetchFinancialStats());
    dispatch(fetchVoteLines());
    dispatch(fetchFinancialActivities({ limit: 500 }));
    dispatch(fetchDsaStats());
    dispatch(fetchDsaActivities());
    dispatch(fetchHelpDeskStats());
    dispatch(fetchInventoryStats());
    dispatch(fetchNoticesStats());
    dispatch(fetchTaskStats());
    dispatch(fetchTasks(undefined));
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const totalDepartmentUsers = departments.reduce((sum, d) => sum + (d.user_count || 0), 0);

  // ── Trend data (recomputed only when source records or granularity change) ──
  const financialValueTrend = useMemo(
    () => aggregateByPeriod(financialActivities, (a) => a.date, (a) => a.amount, granularity),
    [financialActivities, granularity],
  );

  const dsaPayableTrend = useMemo(
    () => aggregateByPeriod(dsaActivities, (a) => a.date_from, (a) => a.total_kes, granularity),
    [dsaActivities, granularity],
  );

  const tasksCompletedTrend = useMemo(
    () =>
      aggregateByPeriod(
        allTasks.filter((t) => t.status === "done" && t.completed_at),
        (t) => t.completed_at,
        () => 1,
        granularity,
      ),
    [allTasks, granularity],
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-xs text-stone-400 mt-0.5">Office-wide overview across all modules</p>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh All
        </button>
      </div>

      {/* ── Cross-cutting summary ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Documents on Record" value={formatNum(docsPagination?.total)} />
        <StatCard label="Active Users" value={formatNum(userStats?.activeUsers)} />
        <StatCard label="Departments" value={formatNum(departments.length)} />
        <StatCard
          label="DSA Payable"
          value={formatKes(dsaStats?.total_kes_payable)}
          tone="warning"
        />
      </div>

      <div className="space-y-8">
        {/* ── Trends ────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <SectionHeader
              icon={<BarChart3 size={16} />}
              title="Trends"
              subtitle="Activity over time across finance, DSA, and tasks"
            />
            <div className="inline-flex items-center gap-1 bg-stone-100 rounded-lg p-1">
              {GRANULARITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGranularity(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                    granularity === opt.value
                      ? "bg-[#1E4620] text-white"
                      : "text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TrendChart
              title="Financial Activity Value"
              unit="kes"
              data={financialValueTrend}
              color="bg-[#1E4620]"
              loading={financialActivitiesLoading}
            />
            <TrendChart
              title="DSA Payable"
              unit="kes"
              data={dsaPayableTrend}
              color="bg-amber-500"
              loading={dsaActivitiesLoading}
            />
            <TrendChart
              title="Tasks Completed"
              unit="count"
              data={tasksCompletedTrend}
              color="bg-blue-500"
              loading={allTasksLoading}
            />
          </div>

          <p className="text-[10px] text-stone-400 mt-2">
            Financial Activity Value is capped at the most recent 500 fetched records (no backend
            trend endpoint exists yet); DSA and Tasks trends reflect the full dataset returned by
            their respective list endpoints.
          </p>
        </section>

        {/* ── Financial ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<Wallet size={16} />} title="Financial" subtitle="Vote lines, expenditure, pro bono" loading={financialStatsLoading || voteLinesLoading} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatCard label="Total Allocated" value={formatKes(financialStats?.total_allocated)} />
            <StatCard label="Total Paid" value={formatKes(financialStats?.total_paid)} tone="success" />
            <StatCard label="Committed (Unpaid)" value={formatKes(financialStats?.committed_unpaid)} tone="warning" />
            <StatCard label="Pro Bono Approved" value={formatNum(financialStats?.pro_bono_approved)} />
          </div>
          {voteLines.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Vote Line Utilization</p>
              <div className="divide-y divide-stone-100">
                {voteLines.slice(0, 6).map((v) => (
                  <VoteLineRow key={v.id} name={v.name} allocated={v.allocated} spent={v.spent} committed={v.committed} />
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-stone-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1E4620]" /> Spent</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Committed</span>
              </div>
            </div>
          )}
        </section>

        {/* ── DSA & Travel ──────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<Plane size={16} />} title="DSA & Travel" subtitle="Circuits, benches, part-heards, allowances" loading={dsaStatsLoading} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Activities" value={formatNum(dsaStats?.total_activities)} />
            <StatCard label="Night Outs" value={formatNum(dsaStats?.total_night_outs)} />
            <StatCard label="Staff Involved" value={formatNum(dsaStats?.staff_involved)} />
            <StatCard label="Total Payable" value={formatKes(dsaStats?.total_kes_payable)} tone="warning" />
          </div>
        </section>

        {/* ── Help Desk ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<LifeBuoy size={16} />} title="Judges' Help Desk" subtitle="Utilities, visas, protocol, requests" loading={helpDeskStatsLoading} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Records" value={formatNum(helpDeskStats?.total_records)} />
            <StatCard label="In Progress" value={formatNum(helpDeskStats?.in_progress)} />
            <StatCard label="Active Visas" value={formatNum(helpDeskStats?.visa_active)} />
            <StatCard label="Protocol Pending" value={formatNum(helpDeskStats?.protocol_pending)} tone="warning" />
          </div>
        </section>

        {/* ── Inventory ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<Boxes size={16} />} title="Inventory & Procurement" subtitle="Stock levels and pending requests" loading={inventoryStatsLoading} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatCard label="Total Items" value={formatNum(inventoryStats?.total_items)} />
            <StatCard label="Low Stock" value={formatNum(inventoryStats?.low_stock)} tone="warning" />
            <StatCard label="Out of Stock" value={formatNum(inventoryStats?.out_of_stock)} tone="danger" />
            <StatCard label="In Stock" value={formatNum(inventoryStats?.in_stock)} tone="success" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Pending Store Requests" value={formatNum(inventoryStats?.pending_store_requests)} />
            <StatCard label="Pending Procurement" value={formatNum(inventoryStats?.pending_procurement_requests)} />
          </div>
        </section>

        {/* ── Tasks & Projects ──────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<ListChecks size={16} />} title="Tasks & Projects" subtitle="Workload distribution and delivery status" loading={tasksStatsLoading} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard label="Active Projects" value={formatNum(projectStats?.active)} />
            <StatCard label="Completed Projects" value={formatNum(projectStats?.completed)} tone="success" />
            <StatCard label="Overdue Tasks" value={formatNum(taskStats?.overdue)} tone="danger" />
            <StatCard label="Total Tasks" value={formatNum((taskStats?.todo ?? 0) + (taskStats?.in_progress ?? 0) + (taskStats?.done ?? 0))} />
          </div>
          {taskStats && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Task Status Breakdown</p>
              <ProportionBar
                segments={[
                  { label: "To Do", value: taskStats.todo, color: "bg-stone-300" },
                  { label: "In Progress", value: taskStats.in_progress, color: "bg-blue-400" },
                  { label: "Done", value: taskStats.done, color: "bg-emerald-500" },
                ]}
              />
            </div>
          )}
        </section>

        {/* ── Notices & Broadcasts ──────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<Megaphone size={16} />} title="Notices & Broadcasts" subtitle="Communication reach and pending sends" loading={noticesStatsLoading} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Broadcasts" value={formatNum(noticesStats?.total_broadcasts)} />
            <StatCard label="Pending Broadcasts" value={formatNum(noticesStats?.pending_broadcasts)} tone="warning" />
            <StatCard label="Total Notices" value={formatNum(noticesStats?.total_notices)} />
            <StatCard label="Unread (Notices)" value={formatNum(noticesStats?.unread_notices)} />
          </div>
        </section>

        {/* ── Users & Departments ───────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<Users size={16} />} title="Users & Departments" subtitle="Headcount and role distribution" loading={userStatsLoading || departmentsLoading} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard label="Total Users" value={formatNum(userStats?.totalUsers)} />
            <StatCard label="Active Users" value={formatNum(userStats?.activeUsers)} tone="success" />
            <StatCard label="Departments" value={formatNum(departments.length)} />
            <StatCard label="Users (by Dept)" value={formatNum(totalDepartmentUsers)} />
          </div>

          {userStats && userStats.byRole.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">By Role</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {userStats.byRole.map((r) => (
                  <div key={r.role} className="rounded-lg bg-stone-50 px-3 py-2 text-center">
                    <p className="text-sm font-bold text-stone-800">{formatNum(r.count)}</p>
                    <p className="text-[9px] text-stone-400 uppercase tracking-wide">{r.role.replace("_", " ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {departments.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">By Department</p>
              <div className="divide-y divide-stone-100">
                {departments.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="flex items-center gap-2 text-stone-700">
                      <Building2 size={13} className="text-stone-400" />
                      {d.name}
                      {d.code && <span className="text-[10px] font-mono text-stone-400">({d.code})</span>}
                    </span>
                    <span className="font-semibold text-stone-800">{formatNum(d.user_count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Documents ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<FileText size={16} />} title="Documents" subtitle="Office of the Registrar document volume" loading={docsLoading} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Documents" value={formatNum(docsPagination?.total)} />
          </div>
          <p className="text-[10px] text-stone-400 mt-2">
            A per-status breakdown (marked / in progress / completed / filed) needs a dedicated
            <code className="mx-1 px-1 py-0.5 bg-stone-100 rounded">GET /documents/stats</code>
            endpoint on the backend — looping <code className="mx-1 px-1 py-0.5 bg-stone-100 rounded">fetchDocuments</code>
            per status here would repeatedly overwrite the shared document list other pages depend on.
          </p>
        </section>
      </div>
    </div>
  );
};

export default SuperAdminReports;