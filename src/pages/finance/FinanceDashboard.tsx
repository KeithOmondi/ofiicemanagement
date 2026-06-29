// src/pages/finance/FinanceDashboard.tsx
import React, { useMemo } from "react";
import { format, subDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinancialStat {
  id: string;
  label: string;
  value: string | number;
  change: number;
  icon: string;
  color: string;
}

interface Transaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  status: "completed" | "pending" | "failed";
  reference: string;
}

interface BudgetItem {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  progress: number;
}

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  description: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "danger";
}

// ─── Dummy Data ──────────────────────────────────────────────────────────────

const TODAY = new Date();

const STATS: FinancialStat[] = [
  {
    id: "stat-1",
    label: "Total Revenue",
    value: "KES 12,847,500",
    change: 12.5,
    icon: "💰",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "stat-2",
    label: "Total Expenses",
    value: "KES 8,234,200",
    change: -3.2,
    icon: "💳",
    color: "bg-rose-50 text-rose-600",
  },
  {
    id: "stat-3",
    label: "Net Profit",
    value: "KES 4,613,300",
    change: 8.7,
    icon: "📈",
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "stat-4",
    label: "Pending Invoices",
    value: "KES 1,245,800",
    change: -15.3,
    icon: "⏳",
    color: "bg-amber-50 text-amber-600",
  },
];

const RECENT_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    description: "Court Filing Fees - Civil Division",
    category: "Fees & Fines",
    amount: 125000,
    type: "income",
    date: format(TODAY, "yyyy-MM-dd"),
    status: "completed",
    reference: "INV-2026-0042",
  },
  {
    id: "tx-2",
    description: "Office Supplies Purchase",
    category: "Administrative",
    amount: 45600,
    type: "expense",
    date: format(subDays(TODAY, 1), "yyyy-MM-dd"),
    status: "completed",
    reference: "PO-2026-0018",
  },
  {
    id: "tx-3",
    description: "Staff Training - Q2 2026",
    category: "Training",
    amount: 320000,
    type: "expense",
    date: format(subDays(TODAY, 2), "yyyy-MM-dd"),
    status: "pending",
    reference: "TRN-2026-0009",
  },
  {
    id: "tx-4",
    description: "Court Recording Equipment",
    category: "ICT Equipment",
    amount: 750000,
    type: "expense",
    date: format(subDays(TODAY, 3), "yyyy-MM-dd"),
    status: "completed",
    reference: "PO-2026-0015",
  },
  {
    id: "tx-5",
    description: "Fine Payments - Criminal Division",
    category: "Fines",
    amount: 450000,
    type: "income",
    date: format(subDays(TODAY, 4), "yyyy-MM-dd"),
    status: "completed",
    reference: "FIN-2026-0023",
  },
  {
    id: "tx-6",
    description: "Internet & Utility Bills",
    category: "Utilities",
    amount: 89200,
    type: "expense",
    date: format(subDays(TODAY, 5), "yyyy-MM-dd"),
    status: "pending",
    reference: "UTIL-2026-0012",
  },
  {
    id: "tx-7",
    description: "Land Registry Fees",
    category: "Fees & Fines",
    amount: 210000,
    type: "income",
    date: format(subDays(TODAY, 6), "yyyy-MM-dd"),
    status: "completed",
    reference: "INV-2026-0038",
  },
  {
    id: "tx-8",
    description: "Printing & Stationery",
    category: "Administrative",
    amount: 34500,
    type: "expense",
    date: format(subDays(TODAY, 7), "yyyy-MM-dd"),
    status: "completed",
    reference: "PO-2026-0016",
  },
];

const BUDGET_ITEMS: BudgetItem[] = [
  {
    id: "bud-1",
    category: "ICT Equipment",
    allocated: 1500000,
    spent: 890000,
    remaining: 610000,
    progress: 59,
  },
  {
    id: "bud-2",
    category: "Office Supplies",
    allocated: 500000,
    spent: 320000,
    remaining: 180000,
    progress: 64,
  },
  {
    id: "bud-3",
    category: "Training & Development",
    allocated: 800000,
    spent: 430000,
    remaining: 370000,
    progress: 54,
  },
  {
    id: "bud-4",
    category: "Utilities",
    allocated: 600000,
    spent: 480000,
    remaining: 120000,
    progress: 80,
  },
  {
    id: "bud-5",
    category: "Facility Maintenance",
    allocated: 900000,
    spent: 510000,
    remaining: 390000,
    progress: 57,
  },
  {
    id: "bud-6",
    category: "Professional Services",
    allocated: 700000,
    spent: 350000,
    remaining: 350000,
    progress: 50,
  },
];

const RECENT_ACTIVITIES: RecentActivity[] = [
  {
    id: "act-1",
    user: "John Mwangi",
    action: "Created Invoice",
    description: "Invoice INV-2026-0042 issued to Civil Division",
    timestamp: "2 hours ago",
    type: "success",
  },
  {
    id: "act-2",
    user: "Sarah Wanjiru",
    action: "Approved Purchase",
    description: "Purchase Order PO-2026-0018 approved for supplies",
    timestamp: "4 hours ago",
    type: "info",
  },
  {
    id: "act-3",
    user: "David Kiprop",
    action: "Budget Alert",
    description: "Utilities budget at 80% usage. Review recommended.",
    timestamp: "6 hours ago",
    type: "warning",
  },
  {
    id: "act-4",
    user: "Mary Akinyi",
    action: "Payment Received",
    description: "Fine payment FIN-2026-0023 received: KES 450,000",
    timestamp: "1 day ago",
    type: "success",
  },
  {
    id: "act-5",
    user: "Peter Njoroge",
    action: "Expense Report",
    description: "Q1 2026 expense report submitted for review",
    timestamp: "2 days ago",
    type: "info",
  },
  {
    id: "act-6",
    user: "Grace Mwangi",
    action: "Overdue Alert",
    description: "3 invoices overdue for more than 30 days",
    timestamp: "2 days ago",
    type: "danger",
  },
];

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StatCard: React.FC<{ stat: FinancialStat }> = ({ stat }) => {
  const isPositive = stat.change > 0;
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">{stat.label}</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{stat.value}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
              {isPositive ? "↑" : "↓"} {Math.abs(stat.change)}%
            </span>
            <span className="text-xs text-stone-400">vs last month</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${stat.color}`}>
          {stat.icon}
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: Transaction["status"] }> = ({ status }) => {
  const colors = {
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ActivityIcon: React.FC<{ type: RecentActivity["type"] }> = ({ type }) => {
  const colors = {
    info: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
  };
  const icons = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    danger: "🚨",
  };
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[type]}`}>
      <span className="text-sm">{icons[type]}</span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const FinanceDashboard: React.FC = () => {
  // ── Derived Data ──────────────────────────────────────────────────────────
  const totalIncome = useMemo(
    () => RECENT_TRANSACTIONS.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
    []
  );

  const totalExpenses = useMemo(
    () => RECENT_TRANSACTIONS.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
    []
  );

  const totalBudget = useMemo(
    () => BUDGET_ITEMS.reduce((sum, b) => sum + b.allocated, 0),
    []
  );

  const totalSpent = useMemo(
    () => BUDGET_ITEMS.reduce((sum, b) => sum + b.spent, 0),
    []
  );

  const totalRemaining = useMemo(
    () => BUDGET_ITEMS.reduce((sum, b) => sum + b.remaining, 0),
    []
  );

  const recentTransactions = useMemo(
    () => RECENT_TRANSACTIONS.slice(0, 5),
    []
  );

  return (
    <div className="p-6 space-y-6 bg-stone-50 min-h-full">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Finance Dashboard</h1>
        <p className="text-sm text-stone-500 mt-1">
          Overview of financial performance, budgets, and transactions
        </p>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      {/* ── Quick Summary ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-sm text-stone-500">Total Income (30 days)</p>
          <p className="text-xl font-bold text-emerald-600">{formatKes(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-sm text-stone-500">Total Expenses (30 days)</p>
          <p className="text-xl font-bold text-rose-600">{formatKes(totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-sm text-stone-500">Net Income</p>
          <p className={`text-xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatKes(totalIncome - totalExpenses)}
          </p>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* ── Transactions Table ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Recent Transactions</h3>
            <button className="text-xs text-[#1E4620] font-medium hover:underline">
              View All →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                  <th className="px-4 py-2 font-semibold">Description</th>
                  <th className="px-4 py-2 font-semibold">Category</th>
                  <th className="px-4 py-2 font-semibold text-right">Amount</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">{tx.description}</p>
                      <p className="text-[10px] text-stone-400">{tx.reference}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {tx.type === "income" ? "+" : "-"} {formatKes(tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-medium ${
                        tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {format(new Date(tx.date), "dd MMM yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right Sidebar ────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* ── Budget Progress ────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
            <h3 className="font-semibold text-stone-800 mb-3">Budget Overview</h3>
            <div className="flex items-center justify-between text-xs text-stone-500 mb-4">
              <span>Total Budget: {formatKes(totalBudget)}</span>
              <span>Spent: {formatKes(totalSpent)}</span>
              <span>Remaining: {formatKes(totalRemaining)}</span>
            </div>
            <div className="space-y-3">
              {BUDGET_ITEMS.slice(0, 4).map((item) => {
                const isOverBudget = item.progress > 80;
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-stone-700">{item.category}</span>
                      <span className="text-stone-500">
                        {formatKes(item.spent)} / {formatKes(item.allocated)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverBudget ? "bg-rose-500" : "bg-[#1E4620]"
                        }`}
                        style={{ width: `${Math.min(item.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 mt-0.5">
                      <span>{item.progress}% used</span>
                      <span>{formatKes(item.remaining)} remaining</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Recent Activity ────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
            <h3 className="font-semibold text-stone-800 mb-3">Recent Activity</h3>
            <div className="space-y-3">
              {RECENT_ACTIVITIES.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <ActivityIcon type={activity.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800">
                      {activity.user}
                      <span className="font-normal text-stone-500"> — {activity.action}</span>
                    </p>
                    <p className="text-xs text-stone-500">{activity.description}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Additional Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-xs text-stone-500">Total Budget</p>
          <p className="text-lg font-bold text-stone-900">{formatKes(totalBudget)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-xs text-stone-500">Total Spent</p>
          <p className="text-lg font-bold text-stone-900">{formatKes(totalSpent)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-xs text-stone-500">Total Remaining</p>
          <p className="text-lg font-bold text-stone-900">{formatKes(totalRemaining)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <p className="text-xs text-stone-500">Budget Utilization</p>
          <p className="text-lg font-bold text-stone-900">
            {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatKes = (value: number) =>
  `KES ${value.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default FinanceDashboard;