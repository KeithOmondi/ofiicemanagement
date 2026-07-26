// src/pages/SuperAdminDashboard.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchDashboardStats,
  selectDashboardLoading,
  selectDashboardError,
  selectDocumentStats,
  selectUserStats,
  selectRegistryStats,
  selectNoticeStats,
  selectInventoryStats,
  selectFinancialStats,
  selectDSAStats,
  selectMessageStats,
  selectActiveDocuments,
  selectAssignedDocuments,
  selectActiveUsers,
  selectTotalUsers,
} from '../../store/slices/dashboardSlice';

// ── Chart.js — register every component we use ────────────────────────────
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { Chart as ChartInstance, ChartConfiguration, TooltipItem } from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  BarController,
  LineController,
  DoughnutController,
  Filler,
  Tooltip,
  Legend,
);

// ── Types ──────────────────────────────────────────────────────────────────

type Range = '7d' | '30d' | '3m';

interface FinPoint {
  label: string;
  allocated: number;
  paid: number;
}

interface DsaPoint {
  label: string;
  nights: number;
  staff: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (value: number | undefined | null, loading: boolean): string => {
  if (loading) return '…';
  if (value === undefined || value === null) return '—';
  return value.toLocaleString();
};

const fmtKes = (value: number | undefined | null, loading: boolean): string => {
  if (loading) return '…';
  if (value === undefined || value === null) return '—';
  return `KES ${value.toLocaleString()}`;
};

const fmtNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString();
};

// ── Mock trend data ────────────────────────────────────────────────────────
// Replace with real thunks when available.

const MOCK_TRENDS: Record<
  Range,
  { labels: string[]; fin: FinPoint[]; dsa: DsaPoint[] }
> = {
  '7d': {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    fin: [
      { label: 'Mon', allocated: 120000, paid: 100000 },
      { label: 'Tue', allocated:  80000, paid:  60000 },
      { label: 'Wed', allocated: 200000, paid: 180000 },
      { label: 'Thu', allocated: 150000, paid: 130000 },
      { label: 'Fri', allocated:  90000, paid:  80000 },
      { label: 'Sat', allocated:  60000, paid:  50000 },
      { label: 'Sun', allocated: 110000, paid:  90000 },
    ],
    dsa: [
      { label: 'Mon', nights: 1, staff: 3 },
      { label: 'Tue', nights: 0, staff: 0 },
      { label: 'Wed', nights: 2, staff: 5 },
      { label: 'Thu', nights: 1, staff: 4 },
      { label: 'Fri', nights: 0, staff: 0 },
      { label: 'Sat', nights: 1, staff: 2 },
      { label: 'Sun', nights: 2, staff: 6 },
    ],
  },
  '30d': {
    labels: ['W1', 'W2', 'W3', 'W4'],
    fin: [
      { label: 'W1', allocated: 520000, paid: 480000 },
      { label: 'W2', allocated: 680000, paid: 610000 },
      { label: 'W3', allocated: 410000, paid: 390000 },
      { label: 'W4', allocated: 730000, paid: 700000 },
    ],
    dsa: [
      { label: 'W1', nights:  4, staff: 12 },
      { label: 'W2', nights:  6, staff: 18 },
      { label: 'W3', nights:  3, staff: 10 },
      { label: 'W4', nights:  8, staff: 22 },
    ],
  },
  '3m': {
    labels: ['January', 'February', 'March'],
    fin: [
      { label: 'January',  allocated: 2100000, paid: 1900000 },
      { label: 'February', allocated: 1800000, paid: 1650000 },
      { label: 'March',    allocated: 2600000, paid: 2400000 },
    ],
    dsa: [
      { label: 'January',  nights: 14, staff: 42 },
      { label: 'February', nights: 11, staff: 36 },
      { label: 'March',    nights: 18, staff: 55 },
    ],
  },
};

const RANGE_LABELS: Record<Range, string> = {
  '7d':  'last 7 days',
  '30d': 'last 30 days',
  '3m':  'last 3 months',
};

// ── Chart constants ────────────────────────────────────────────────────────

const CHART_COLORS = {
  blue:   '#2a78d6',
  green:  '#1baf7a',
  amber:  '#eda100',
  red:    '#e34948',
  violet: '#4a3aa7',
};

const GRID_COLOR = '#e1e0d9';
const TICK_COLOR = '#898781';

const baseScales = {
  x: {
    grid:  { color: GRID_COLOR, drawBorder: false },
    ticks: { color: TICK_COLOR, font: { size: 10 } },
  },
  y: {
    grid:       { color: GRID_COLOR, drawBorder: false },
    ticks:      { color: TICK_COLOR, font: { size: 10 } },
    beginAtZero: true,
  },
};

// ── Reusable chart hook ────────────────────────────────────────────────────

function useChart(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  buildConfig: () => ChartConfiguration,
  deps: unknown[],
) {
  const instanceRef = useRef<ChartInstance | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    instanceRef.current?.destroy();
    Chart.getChart(canvas)?.destroy();

    instanceRef.current = new Chart(canvas, buildConfig());

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface StatTileProps {
  icon: string;
  label: string;
  value: string;
  sub?: React.ReactNode;
}

const StatTile: React.FC<StatTileProps> = ({ icon, label, value, sub }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-1.5">
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <i className={`ti ${icon} text-sm`} aria-hidden="true" />
      {label}
    </div>
    <p className="text-2xl font-medium text-gray-900 tabular-nums leading-none">{value}</p>
    {sub && <div className="text-xs text-gray-400">{sub}</div>}
  </div>
);

interface ChartCardProps {
  title: string;
  sub: string;
  legend: { color: string; label: string }[];
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, sub, legend, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <div className="mb-3">
      <p className="text-sm font-medium text-gray-800">{title}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
    <div className="flex flex-wrap gap-3 mb-3">
      {legend.map((l) => (
        <span key={l.label} className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: l.color }} />
          {l.label}
        </span>
      ))}
    </div>
    {children}
  </div>
);

interface ModuleCardProps {
  icon: string;
  title: string;
  children: React.ReactNode;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ icon, title, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800 mb-3">
      <i className={`ti ${icon}`} aria-hidden="true" />
      {title}
    </p>
    {children}
  </div>
);

interface DetailRowProps {
  label: string;
  value: string;
  color?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, color = 'text-gray-800' }) => (
  <div className="flex items-center justify-between text-xs py-1">
    <span className="text-gray-500">{label}</span>
    <span className={`font-medium tabular-nums ${color}`}>{value}</span>
  </div>
);

interface StationBarProps {
  name: string;
  count: number;
  max: number;
}

const StationBar: React.FC<StationBarProps> = ({ name, count, max }) => (
  <div className="flex items-center gap-2 text-xs mb-2">
    <span className="text-gray-500 w-28 truncate flex-shrink-0">{name}</span>
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-500 rounded-full"
        style={{ width: `${max > 0 ? Math.round((count / max) * 100) : 0}%` }}
      />
    </div>
    <span className="text-gray-400 w-6 text-right flex-shrink-0">{count}</span>
  </div>
);

const Badge: React.FC<{ children: React.ReactNode; variant: 'warn' | 'danger' | 'ok' | 'info' }> = ({
  children,
  variant,
}) => {
  const cls = {
    warn:   'bg-amber-50 text-amber-700',
    danger: 'bg-red-50   text-red-700',
    ok:     'bg-green-50  text-green-700',
    info:   'bg-blue-50   text-blue-700',
  }[variant];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
};

// ── Document Distribution Component ────────────────────────────────────────

interface DocumentDistributionProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    byStatus: {
      draft: number;
      uploaded: number;
      pending_review: number;
      marked: number;
      dept_assigned: number;
      user_assigned: number;
      in_progress: number;
      completed: number;
      filed: number;
      ready_to_release: number;
      released: number;
    };
    assigned: {
      total: number;
      marked: number;
      dept_assigned: number;
    };
  };
  loading: boolean;
  error: string | null;
  onViewDocuments: () => void;
}

const DocumentDistribution: React.FC<DocumentDistributionProps> = ({
  stats,
  loading,
  error,
  onViewDocuments,
}) => {
  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-xs text-red-600">⚠️ Failed to load document data</p>
        <p className="text-xs text-red-400 mt-1">{error}</p>
      </div>
    );
  }

  const { byStatus } = stats;

  return (
    <div className="space-y-3">
      {/* Status breakdown grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-600 font-medium">📄 Total</p>
          <p className="text-xl font-bold text-blue-700 tabular-nums">
            {loading ? '…' : stats.total}
          </p>
          <p className="text-[10px] text-blue-400 mt-0.5">all documents</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xs text-green-600 font-medium">✅ Active</p>
          <p className="text-xl font-bold text-green-700 tabular-nums">
            {loading ? '…' : stats.active}
          </p>
          <p className="text-[10px] text-green-400 mt-0.5">active documents</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600 font-medium">📦 Inactive</p>
          <p className="text-xl font-bold text-gray-700 tabular-nums">
            {loading ? '…' : stats.inactive}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">archived/filed</p>
        </div>
      </div>

      {/* Status flow */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500 mb-2">Status breakdown</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <DetailRow label="Draft" value={fmt(byStatus.draft, loading)} color="text-gray-400" />
          <DetailRow label="Uploaded" value={fmt(byStatus.uploaded, loading)} color="text-blue-500" />
          <DetailRow label="Pending Review" value={fmt(byStatus.pending_review, loading)} color="text-amber-600" />
          <DetailRow label="Marked (SA→Dept)" value={fmt(byStatus.marked, loading)} color="text-indigo-600" />
          <DetailRow label="Dept Assigned" value={fmt(byStatus.dept_assigned, loading)} color="text-purple-600" />
          <DetailRow label="User Assigned" value={fmt(byStatus.user_assigned, loading)} color="text-cyan-600" />
          <DetailRow label="In Progress" value={fmt(byStatus.in_progress, loading)} color="text-teal-600" />
          <DetailRow label="Completed" value={fmt(byStatus.completed, loading)} color="text-green-600" />
          <DetailRow label="Ready to Release" value={fmt(byStatus.ready_to_release, loading)} color="text-emerald-600" />
          <DetailRow label="Released" value={fmt(byStatus.released, loading)} color="text-green-700" />
          <DetailRow label="Filed" value={fmt(byStatus.filed, loading)} color="text-gray-500" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="border-t border-gray-100 pt-3 flex gap-2">
        <button
          onClick={onViewDocuments}
          className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded transition-colors text-center"
        >
          📄 View All Documents
        </button>
      </div>
    </div>
  );
};

// ── Chart components ───────────────────────────────────────────────────────

const FinancialChart: React.FC<{ range: Range }> = ({ range }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const data = MOCK_TRENDS[range];

  useChart(
    canvasRef,
    () => ({
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Allocated',
            data: data.fin.map((d) => d.allocated),
            backgroundColor: CHART_COLORS.blue,
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: 'Paid',
            data: data.fin.map((d) => d.paid),
            backgroundColor: CHART_COLORS.green,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          ...baseScales,
          y: {
            ...baseScales.y,
            ticks: {
              ...baseScales.y.ticks,
              callback: (v: string | number) =>
                typeof v === 'number' ? `${(v / 1000).toFixed(0)}k` : v,
            },
          },
        },
      },
    }),
    [range],
  );

  return (
    <div className="relative h-40">
      <canvas ref={canvasRef} role="img" aria-label="Financial allocated vs paid" />
    </div>
  );
};

interface InventoryChartProps {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

const InventoryChart: React.FC<InventoryChartProps> = ({ inStock, lowStock, outOfStock }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const total = inStock + lowStock + outOfStock || 1;

  useChart(
    canvasRef,
    () => ({
      type: 'doughnut',
      data: {
        labels: ['In stock', 'Low stock', 'Out of stock'],
        datasets: [
          {
            data: [inStock, lowStock, outOfStock],
            backgroundColor: [CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.red],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) =>
                ` ${ctx.label}: ${ctx.parsed} (${Math.round((ctx.parsed / total) * 100)}%)`,
            },
          },
        },
        cutout: '65%',
      },
    }),
    [inStock, lowStock, outOfStock],
  );

  return (
    <div className="relative h-40">
      <canvas ref={canvasRef} role="img" aria-label="Inventory status doughnut chart" />
    </div>
  );
};

const DsaChart: React.FC<{ range: Range }> = ({ range }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const data = MOCK_TRENDS[range];

  useChart(
    canvasRef,
    () => ({
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Night outs',
            data: data.dsa.map((d) => d.nights),
            backgroundColor: CHART_COLORS.violet,
            borderRadius: 4,
            borderSkipped: false,
          },
          {
            label: 'Staff',
            data: data.dsa.map((d) => d.staff),
            backgroundColor: CHART_COLORS.blue,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: baseScales,
      },
    }),
    [range],
  );

  return (
    <div className="relative h-40">
      <canvas ref={canvasRef} role="img" aria-label="DSA night outs and staff over time" />
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

const SuperAdminDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const [range, setRange] = useState<Range>('7d');

  // ── Dashboard Selectors (single source of truth) ──────────────────────
  const dashboardLoading = useAppSelector(selectDashboardLoading);
  const dashboardError = useAppSelector(selectDashboardError);

  // ── Individual stats for convenience ────────────────────────────────────
  const documentStats = useAppSelector(selectDocumentStats);
  const userStats = useAppSelector(selectUserStats);
  const registryStats = useAppSelector(selectRegistryStats);
  const noticeStats = useAppSelector(selectNoticeStats);
  const inventoryStats = useAppSelector(selectInventoryStats);
  const financialStats = useAppSelector(selectFinancialStats);
  const dsaStats = useAppSelector(selectDSAStats);
  const messageStats = useAppSelector(selectMessageStats);

  // ── Derived values from dashboard stats ────────────────────────────────
  const activeDocuments = useAppSelector(selectActiveDocuments);
  const totalAssigned = useAppSelector(selectAssignedDocuments);
  const totalUsers = useAppSelector(selectTotalUsers);
  const activeUsers = useAppSelector(selectActiveUsers);

  // ── Loading & Error states ──────────────────────────────────────────────
  const loading = dashboardLoading;
  const error = dashboardError;

  // ── Document stats from dashboard ──────────────────────────────────────
  const docStats = documentStats || {
    total: 0,
    active: 0,
    inactive: 0,
    byStatus: {
      draft: 0,
      uploaded: 0,
      pending_review: 0,
      marked: 0,
      dept_assigned: 0,
      user_assigned: 0,
      in_progress: 0,
      completed: 0,
      filed: 0,
      ready_to_release: 0,
      released: 0,
    },
    assigned: {
      total: 0,
      marked: 0,
      dept_assigned: 0,
    },
  };

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Navigation helpers ──────────────────────────────────────────────────
  const navigateToDocuments = useCallback(() => {
    window.location.href = '/documents';
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────
  const totalRegistryFiles = registryStats?.totalFiles ?? 0;
  const topStations = registryStats?.topStations ?? [];
  const maxStationCount = topStations[0]?.file_count ?? 1;
  const inStock = inventoryStats?.in_stock ?? 0;
  const lowStock = inventoryStats?.low_stock ?? 0;
  const outOfStock = inventoryStats?.out_of_stock ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900">System overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">Super admin · ORHC Office Management</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-medium">
            {(['7d', '30d', '3m'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 transition-colors ${
                  range === r
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 1 0 4.582 9" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">

        {/* Error banner - shows specific error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
            <div>
              <p className="font-medium">Failed to load dashboard data.</p>
              <p className="text-red-600 mt-0.5">{error}</p>
              <button
                onClick={fetchAll}
                className="mt-1.5 text-red-700 font-medium underline hover:text-red-900"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Key metrics ── */}
        <section>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Key metrics</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile
              icon="ti-file"
              label="Documents"
              value={fmt(activeDocuments, loading)}
              sub={
                <span className="flex items-center gap-2 flex-wrap">
                  <Badge variant="info">{totalAssigned} assigned</Badge>
                  {docStats.byStatus.marked > 0 && (
                    <Badge variant="info">({docStats.byStatus.marked} marked)</Badge>
                  )}
                  {docStats.byStatus.pending_review > 0 && (
                    <Badge variant="warn">{docStats.byStatus.pending_review} pending</Badge>
                  )}
                  {docStats.byStatus.in_progress > 0 && (
                    <Badge variant="ok">{docStats.byStatus.in_progress} in progress</Badge>
                  )}
                  {docStats.byStatus.released > 0 && (
                    <Badge variant="info">{docStats.byStatus.released} released</Badge>
                  )}
                </span>
              }
            />
            <StatTile
              icon="ti-users"
              label="Users"
              value={fmt(totalUsers, loading)}
              sub={`${fmt(activeUsers, loading)} active · ${userStats?.byRole?.length ?? 0} roles`}
            />
            <StatTile
              icon="ti-building-bank"
              label="Court Stations"
              value={fmt(registryStats?.stations?.active ?? 0, loading)}
              sub={`${fmt(totalRegistryFiles, loading)} files`}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
            <StatTile
              icon="ti-speakerphone"
              label="Notices"
              value={fmt(noticeStats?.total, loading)}
              sub={(noticeStats?.unread ?? 0) > 0
                ? <Badge variant="warn">{noticeStats?.unread} unread</Badge>
                : '0 unread'}
            />
            <StatTile
              icon="ti-package"
              label="Inventory"
              value={fmt(inventoryStats?.total, loading)}
              sub={lowStock > 0
                ? <Badge variant="warn">{lowStock} low stock</Badge>
                : 'all stocked'}
            />
            <StatTile
              icon="ti-cash"
              label="Allocated"
              value={fmtKes(financialStats?.total_allocated, loading)}
              sub={`${fmtKes(financialStats?.total_paid, loading)} paid`}
            />
            <StatTile
              icon="ti-map-pin"
              label="DSA payable"
              value={fmtKes(dsaStats?.total_kes_payable, loading)}
              sub={`${fmt(dsaStats?.total_activities, loading)} activities`}
            />
            <StatTile
              icon="ti-message-2"
              label="Messages"
              value={fmt(messageStats?.unread_total, false)}
              sub="unread"
            />
          </div>
        </section>

        {/* ── Trends ── */}
        <section>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">
            Trends · {RANGE_LABELS[range]}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ChartCard
              title="Financial flow"
              sub={`Allocated vs paid · ${RANGE_LABELS[range]}`}
              legend={[
                { color: CHART_COLORS.blue,  label: 'Allocated' },
                { color: CHART_COLORS.green, label: 'Paid' },
              ]}
            >
              <FinancialChart range={range} />
            </ChartCard>

            <ChartCard
              title="Inventory status"
              sub="Stock levels by category"
              legend={[
                { color: CHART_COLORS.green, label: 'In stock' },
                { color: CHART_COLORS.amber, label: 'Low stock' },
                { color: CHART_COLORS.red,   label: 'Out of stock' },
              ]}
            >
              <InventoryChart inStock={inStock} lowStock={lowStock} outOfStock={outOfStock} />
            </ChartCard>

            <ChartCard
              title="DSA activity"
              sub={`Night outs and staff · ${RANGE_LABELS[range]}`}
              legend={[
                { color: CHART_COLORS.violet, label: 'Night outs' },
                { color: CHART_COLORS.blue,   label: 'Staff' },
              ]}
            >
              <DsaChart range={range} />
            </ChartCard>
          </div>
        </section>

        {/* ── Module detail ── */}
        <section>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Module detail</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* ── Document Distribution Card ───────────────────────────── */}
            <ModuleCard icon="ti-file" title="Document Distribution">
              <DocumentDistribution
                stats={docStats}
                loading={loading}
                error={error}
                onViewDocuments={navigateToDocuments}
              />
            </ModuleCard>

            {/* ── Financial and DSA card ────────────────────────────────── */}
            <ModuleCard icon="ti-cash" title="Financial and DSA">
              <div className="divide-y divide-gray-50">
                <DetailRow label="Total allocated"   value={fmtKes(financialStats?.total_allocated,  loading)} />
                <DetailRow label="Paid"              value={fmtKes(financialStats?.total_paid,        loading)} color="text-green-600" />
                <DetailRow label="Committed unpaid"  value={fmtKes(financialStats?.committed_unpaid,  loading)} color="text-amber-600" />
                <DetailRow label="Pro bono approved" value={fmt(financialStats?.pro_bono_approved,    loading)} color="text-blue-600" />
              </div>
              <div className="my-2 border-t border-gray-100" />
              <p className="text-xs font-medium text-gray-500 mb-1">DSA breakdown</p>
              <div className="divide-y divide-gray-50">
                <DetailRow label="Activities"     value={fmt(dsaStats?.total_activities, loading)} />
                <DetailRow label="Night outs"     value={fmt(dsaStats?.total_night_outs, loading)} />
                <DetailRow label="Staff involved" value={fmt(dsaStats?.staff_involved,   loading)} />
                <DetailRow label="Total payable"  value={fmtKes(dsaStats?.total_kes_payable, loading)} color="text-blue-600" />
              </div>
              <div className="my-2 border-t border-gray-100" />
              <p className="text-xs font-medium text-gray-500 mb-1">Inventory</p>
              <div className="divide-y divide-gray-50">
                <DetailRow label="Total items"  value={fmt(inventoryStats?.total,  loading)} />
                <DetailRow label="In stock"     value={fmt(inventoryStats?.in_stock,     loading)} color="text-green-600" />
                <DetailRow label="Low stock"    value={fmt(inventoryStats?.low_stock,    loading)} color="text-amber-600" />
                <DetailRow label="Out of stock" value={fmt(inventoryStats?.out_of_stock, loading)} color="text-red-600" />
              </div>
            </ModuleCard>

            {/* ── Registry stations card ────────────────────────────────── */}
            <ModuleCard icon="ti-building-bank" title="Registry stations">
              <div className="divide-y divide-gray-50 mb-3">
                <DetailRow label="Total stations"   value={fmt(registryStats?.stations?.total, loading)} />
                <DetailRow label="Active stations"  value={fmt(registryStats?.stations?.active, loading)} color="text-green-600" />
                <DetailRow label="Inactive stations" value={fmt(registryStats?.stations?.inactive, loading)} color="text-gray-500" />
                <DetailRow label="Files in transit" value={fmt(totalRegistryFiles, loading)} />
              </div>
              {loading ? (
                <p className="text-xs text-gray-400">Loading stations…</p>
              ) : topStations.length > 0 ? (
                <>
                  <p className="text-xs font-medium text-gray-500 mb-2">Top stations by file count</p>
                  {topStations.map((s) => (
                    <StationBar key={s.name} name={s.name} count={s.file_count} max={maxStationCount} />
                  ))}
                </>
              ) : (
                <p className="text-xs text-gray-400">No station data yet.</p>
              )}
              <div className="my-2 border-t border-gray-100" />
              <p className="text-xs font-medium text-gray-500 mb-1">Messages</p>
              <div className="divide-y divide-gray-50">
                <DetailRow label="Unread messages" value={fmt(messageStats?.unread_total, false)} />
                <DetailRow
                  label="Groups with unread"
                  value={fmtNumber(messageStats?.groups_with_unread)}
                />
              </div>
            </ModuleCard>

          </div>
        </section>

      </div>
    </div>
  );
};

export default SuperAdminDashboard;