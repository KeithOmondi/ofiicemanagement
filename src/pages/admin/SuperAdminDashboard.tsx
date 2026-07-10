// src/pages/SuperAdminDashboard.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchUserStats,
  selectUserStats,
  selectUsersError,
  selectUsersListLoading,
} from '../../store/slices/userSlice';
// ── REMOVED tasksSlice imports ─────────────────────────────
// import { fetchTaskStats, selectTaskStats, selectProjectStats, selectStatsLoading, selectTasksError } from '../../store/slices/tasksSlice';
import {
  fetchStationCounts,
  selectStationCounts,
  selectStationCountsLoading,
  selectRegistryError,
} from '../../store/slices/registrySlice';
import {
  fetchNoticesStats,
  selectNoticesStats,
  selectStatsLoading as selectNoticesStatsLoading,
  selectNoticesError,
} from '../../store/slices/noticesSlice';
import {
  fetchUnreadCount as fetchMessagesUnread,
  selectUnreadCount as selectMessagesUnread,
  selectMessagesError,
} from '../../store/slices/messagesSlice';
import {
  fetchInventoryStats,
  selectInventoryStats,
  selectInventoryStatsLoading,
  selectInventoryError,
} from '../../store/slices/inventorySlice';
import {
  fetchFinancialStats,
  selectFinancialStats,
  selectStatsLoading as selectFinancialStatsLoading,
  selectFinancialError,
} from '../../store/slices/financialSlice';
import {
  fetchDsaStats,
  selectDsaStats,
  selectDsaStatsLoading,
  selectDsaError,
} from '../../store/slices/dsaSlice';
import {
  fetchDocuments,
  selectDocuments,
  selectLoading as selectDocumentsLoading,
  selectError as selectDocumentsError,
  selectPagination as selectDocumentPagination,
} from '../../store/slices/documentSlice';

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

// ── Mock trend data ────────────────────────────────────────────────────────
// Replace with real thunks (fetchFinancialTrend, fetchDsaTrend, etc.) when available.

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

const Badge: React.FC<{ children: React.ReactNode; variant: 'warn' | 'danger' | 'ok' }> = ({
  children,
  variant,
}) => {
  const cls = {
    warn:   'bg-amber-50 text-amber-700',
    danger: 'bg-red-50   text-red-700',
    ok:     'bg-green-50  text-green-700',
  }[variant];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {children}
    </span>
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

  // ── Selectors ──────────────────────────────────────────────────────────
  const userStats       = useAppSelector(selectUserStats);
  const usersLoading    = useAppSelector(selectUsersListLoading);
  const usersError      = useAppSelector(selectUsersError);

  // ── REMOVED tasks selectors ──────────────────────────────────────────

  const stationCounts   = useAppSelector(selectStationCounts);
  const registryLoading = useAppSelector(selectStationCountsLoading);
  const registryError   = useAppSelector(selectRegistryError);

  const noticesStats    = useAppSelector(selectNoticesStats);
  const noticesLoading  = useAppSelector(selectNoticesStatsLoading);
  const noticesError    = useAppSelector(selectNoticesError);

  const messagesUnread  = useAppSelector(selectMessagesUnread);
  const messagesError   = useAppSelector(selectMessagesError);

  const inventoryStats   = useAppSelector(selectInventoryStats);
  const inventoryLoading = useAppSelector(selectInventoryStatsLoading);
  const inventoryError   = useAppSelector(selectInventoryError);

  const financialStats   = useAppSelector(selectFinancialStats);
  const financialLoading = useAppSelector(selectFinancialStatsLoading);
  const financialError   = useAppSelector(selectFinancialError);

  const dsaStats    = useAppSelector(selectDsaStats);
  const dsaLoading  = useAppSelector(selectDsaStatsLoading);
  const dsaError    = useAppSelector(selectDsaError);

  const documents   = useAppSelector(selectDocuments);
  const docPagination = useAppSelector(selectDocumentPagination);
  const docsLoading = useAppSelector(selectDocumentsLoading);
  const docsError   = useAppSelector(selectDocumentsError);

  // ── Derived document stats ──────────────────────────────────────────────
  const totalDocuments = docPagination?.total ?? documents.length;
  const pendingReview = documents.filter(d => d.status === 'pending_review').length;
  const marked = documents.filter(d => d.status === 'marked').length;
  const inProgress = documents.filter(d => d.status === 'in_progress').length;
  const completed = documents.filter(d => d.status === 'completed').length;
  const filed = documents.filter(d => d.status === 'filed').length;
  const draft = documents.filter(d => d.status === 'draft').length;
  const uploaded = documents.filter(d => d.status === 'uploaded').length;

  // ── Derived notice stats ──────────────────────────────────────────────
  const totalNotices =
    (noticesStats?.total_broadcasts ?? 0) + (noticesStats?.total_notices ?? 0);
  const totalUnreadNotices =
    (noticesStats?.unread_broadcasts ?? 0) + (noticesStats?.unread_notices ?? 0);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(() => {
    dispatch(fetchUserStats());
    // ── REMOVED dispatch(fetchTaskStats()) ─────────────────────────────
    dispatch(fetchStationCounts());
    dispatch(fetchNoticesStats());
    dispatch(fetchMessagesUnread());
    dispatch(fetchInventoryStats());
    dispatch(fetchFinancialStats());
    dispatch(fetchDsaStats());
    dispatch(fetchDocuments({ limit: 100, page: 1 }));
  }, [dispatch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived values ─────────────────────────────────────────────────────
  const anyError =
    usersError || registryError || noticesError ||
    messagesError || inventoryError || financialError || dsaError || docsError;

  const totalRegistryFiles =
    stationCounts?.reduce((acc, s) => acc + s.file_count, 0) ?? 0;

  const topStations = stationCounts
    ? [...stationCounts].sort((a, b) => b.file_count - a.file_count).slice(0, 6)
    : [];

  const maxStationCount = topStations[0]?.file_count ?? 1;

  const inStock    = inventoryStats?.in_stock    ?? 0;
  const lowStock   = inventoryStats?.low_stock   ?? 0;
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

        {/* Error banner */}
        {anyError && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
            Some modules failed to load. Check your connection and try refreshing.
          </div>
        )}

        {/* ── Key metrics ── */}
        <section>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">Key metrics</p>
          {/* First row: Documents, Users, Stations (3 tiles) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile
              icon="ti-file"
              label="Documents"
              value={fmt(totalDocuments, docsLoading)}
              sub={
                pendingReview > 0 || marked > 0 ? (
                  <span className="flex items-center gap-2 flex-wrap">
                    {pendingReview > 0 && <Badge variant="warn">{pendingReview} pending</Badge>}
                    {marked > 0 && <Badge variant="danger">{marked} marked</Badge>}
                    {inProgress > 0 && <Badge variant="ok">{inProgress} in progress</Badge>}
                  </span>
                ) : (
                  '0 pending · 0 marked'
                )
              }
            />
            <StatTile
              icon="ti-users"
              label="Users"
              value={fmt(userStats?.totalUsers, usersLoading)}
              sub={`${fmt(userStats?.activeUsers, usersLoading)} active · ${userStats?.byRole?.length ?? 0} roles`}
            />
            <StatTile
              icon="ti-building-bank"
              label="Court Stations"
              value={fmt(stationCounts?.length, registryLoading)}
              sub={`${fmt(totalRegistryFiles, registryLoading)} files`}
            />
          </div>
          {/* Second row: Notices, Inventory, Allocated, DSA payable, Messages (5 tiles) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
            <StatTile
              icon="ti-speakerphone"
              label="Notices"
              value={fmt(totalNotices, noticesLoading)}
              sub={totalUnreadNotices > 0
                ? <Badge variant="warn">{totalUnreadNotices} unread</Badge>
                : '0 unread'}
            />
            <StatTile
              icon="ti-package"
              label="Inventory"
              value={fmt(inventoryStats?.total_items, inventoryLoading)}
              sub={lowStock > 0
                ? <Badge variant="warn">{lowStock} low stock</Badge>
                : 'all stocked'}
            />
            <StatTile
              icon="ti-cash"
              label="Allocated"
              value={fmtKes(financialStats?.total_allocated, financialLoading)}
              sub={`${fmtKes(financialStats?.total_paid, financialLoading)} paid`}
            />
            <StatTile
              icon="ti-map-pin"
              label="DSA payable"
              value={fmtKes(dsaStats?.total_kes_payable, dsaLoading)}
              sub={`${fmt(dsaStats?.total_activities, dsaLoading)} activities`}
            />
            <StatTile
              icon="ti-message-2"
              label="Messages"
              value={fmt(messagesUnread?.total, false)}
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
            {/* ── REMOVED TasksChart ────────────────────────────────────── */}

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

            {/* ── NEW: Documents and notices card ────────────────────────── */}
            <ModuleCard icon="ti-file" title="Documents and notices">
              <div className="divide-y divide-gray-50">
                <DetailRow label="Total documents"  value={fmt(totalDocuments, docsLoading)} color="text-blue-600" />
                <DetailRow label="Pending review"   value={fmt(pendingReview, docsLoading)} color="text-amber-600" />
                <DetailRow label="Marked"           value={fmt(marked, docsLoading)} color="text-red-600" />
                <DetailRow label="In progress"      value={fmt(inProgress, docsLoading)} color="text-indigo-600" />
                <DetailRow label="Completed"        value={fmt(completed, docsLoading)} color="text-green-600" />
                <DetailRow label="Filed"            value={fmt(filed, docsLoading)} color="text-gray-500" />
                <DetailRow label="Draft"            value={fmt(draft, docsLoading)} color="text-gray-400" />
                <DetailRow label="Uploaded"         value={fmt(uploaded, docsLoading)} color="text-blue-400" />
              </div>
              <div className="my-2 border-t border-gray-100" />
              <div className="divide-y divide-gray-50">
                <DetailRow label="Notices and broadcasts" value={fmt(totalNotices,           noticesLoading)} />
                <DetailRow label="Unread notices"         value={fmt(totalUnreadNotices,     noticesLoading)} color="text-amber-600" />
              </div>
            </ModuleCard>

            {/* ── Financial and DSA card (unchanged) ────────────────────── */}
            <ModuleCard icon="ti-cash" title="Financial and DSA">
              <div className="divide-y divide-gray-50">
                <DetailRow label="Total allocated"   value={fmtKes(financialStats?.total_allocated,  financialLoading)} />
                <DetailRow label="Paid"              value={fmtKes(financialStats?.total_paid,        financialLoading)} color="text-green-600" />
                <DetailRow label="Committed unpaid"  value={fmtKes(financialStats?.committed_unpaid,  financialLoading)} color="text-amber-600" />
                <DetailRow label="Pro bono approved" value={fmt(financialStats?.pro_bono_approved,    financialLoading)} color="text-blue-600" />
              </div>
              <div className="my-2 border-t border-gray-100" />
              <p className="text-xs font-medium text-gray-500 mb-1">DSA breakdown</p>
              <div className="divide-y divide-gray-50">
                <DetailRow label="Activities"     value={fmt(dsaStats?.total_activities, dsaLoading)} />
                <DetailRow label="Night outs"     value={fmt(dsaStats?.total_night_outs, dsaLoading)} />
                <DetailRow label="Staff involved" value={fmt(dsaStats?.staff_involved,   dsaLoading)} />
                <DetailRow label="Total payable"  value={fmtKes(dsaStats?.total_kes_payable, dsaLoading)} color="text-blue-600" />
              </div>
              <div className="my-2 border-t border-gray-100" />
              <p className="text-xs font-medium text-gray-500 mb-1">Inventory</p>
              <div className="divide-y divide-gray-50">
                <DetailRow label="Total items"  value={fmt(inventoryStats?.total_items,  inventoryLoading)} />
                <DetailRow label="In stock"     value={fmt(inventoryStats?.in_stock,     inventoryLoading)} color="text-green-600" />
                <DetailRow label="Low stock"    value={fmt(inventoryStats?.low_stock,    inventoryLoading)} color="text-amber-600" />
                <DetailRow label="Out of stock" value={fmt(inventoryStats?.out_of_stock, inventoryLoading)} color="text-red-600" />
              </div>
            </ModuleCard>

            {/* ── Registry stations card (unchanged) ────────────────────── */}
            <ModuleCard icon="ti-building-bank" title="Registry stations">
              <div className="divide-y divide-gray-50 mb-3">
                <DetailRow label="Total stations"   value={fmt(stationCounts?.length, registryLoading)} />
                <DetailRow label="Files in transit" value={fmt(totalRegistryFiles,    registryLoading)} />
              </div>
              {registryLoading ? (
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
                <DetailRow label="Unread messages"    value={fmt(messagesUnread?.total, false)} />
                <DetailRow
                  label="Groups with unread"
                  value={messagesUnread?.by_group ? String(messagesUnread.by_group.length) : '—'}
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