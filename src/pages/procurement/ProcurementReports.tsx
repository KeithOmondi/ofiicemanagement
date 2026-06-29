// src/pages/admin/ProcurementReports.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  ShoppingCart,
  CheckCircle,
  Clock,
  DollarSign,
  FileSearch,
  Inbox,
} from 'lucide-react';

// ─── Redux Imports ──────────────────────────────────────────────────────────
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchAllProcurementRequests,
  fetchApprovedProcurement,
  fetchInventoryStats,
  selectProcurementRequests,
  selectApprovedProcurement,
  selectInventoryStats,
  selectProcurementRequestsLoading,
  selectApprovedProcurementLoading,
  selectInventoryStatsLoading,
  type ProcurementRequest,
  type ApprovedProcurementItem,
} from '../../store/slices/inventorySlice';

// ─── View Types ──────────────────────────────────────────────────────────────
// The slice only gives us procurement requests, approved items, and stats —
// there is no backend report-generation or file endpoint. So "reports" here
// are just filtered/derived views over real slice data, exportable as CSV.

type ReportCategory = 'requests' | 'approved' | 'purchased' | 'financial';

interface DerivedReport {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  count: number;
  rows: Record<string, string | number>[];
}



const CATEGORY_LABELS: Record<ReportCategory, string> = {
  requests: 'Procurement Requests',
  approved: 'Approved Items',
  purchased: 'Purchased Items',
  financial: 'Financial',
};

const CATEGORY_STYLES: Record<ReportCategory, { bg: string; text: string }> = {
  requests: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
  approved: { bg: 'bg-green-50', text: 'text-green-600' },
  purchased: { bg: 'bg-teal-50', text: 'text-teal-600' },
  financial: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

// ─── CSV Export Helper ───────────────────────────────────────────────────────

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Derive Reports From Slice State ─────────────────────────────────────────

function deriveReports(
  procurementRequests: ProcurementRequest[],
  approvedProcurement: ApprovedProcurementItem[]
): DerivedReport[] {
  const pending = procurementRequests.filter(r => r.status === 'Pending');
  const approved = procurementRequests.filter(r => r.status === 'Approved');
  const rejected = procurementRequests.filter(r => r.status === 'Rejected');
  const purchased = approvedProcurement.filter(i => i.is_purchased);
  const awaitingPurchase = approvedProcurement.filter(i => !i.is_purchased);

  const requestRow = (r: ProcurementRequest) => ({
    'Item': r.item_name,
    'Category': r.category,
    'Quantity': r.quantity,
    'Unit': r.unit,
    'Urgency': r.urgency,
    'Status': r.status,
    'Requested By': r.requested_by_name ?? r.requested_by,
    'Requested On': new Date(r.created_at).toLocaleDateString(),
  });

  const approvedRow = (i: ApprovedProcurementItem) => ({
    'Item': i.item_name,
    'Category': i.category,
    'Quantity': i.quantity,
    'Unit': i.unit,
    'Unit Cost (KES)': i.unit_cost_kes,
    'Total Cost (KES)': i.total_cost_kes,
    'Approved By': i.approved_by_name ?? i.approved_by,
    'Approved On': new Date(i.approved_at).toLocaleDateString(),
    'Purchased': i.is_purchased ? 'Yes' : 'No',
    'Purchase Reference': i.purchase_reference ?? '—',
  });

  return [
    {
      id: 'pending-requests',
      title: 'Pending Procurement Requests',
      description: `${pending.length} request${pending.length === 1 ? '' : 's'} awaiting approval`,
      category: 'requests',
      count: pending.length,
      rows: pending.map(requestRow),
    },
    {
      id: 'approved-requests',
      title: 'Approved Procurement Requests',
      description: `${approved.length} request${approved.length === 1 ? '' : 's'} approved, ready for purchase`,
      category: 'requests',
      count: approved.length,
      rows: approved.map(requestRow),
    },
    {
      id: 'rejected-requests',
      title: 'Rejected Procurement Requests',
      description: `${rejected.length} request${rejected.length === 1 ? '' : 's'} rejected`,
      category: 'requests',
      count: rejected.length,
      rows: rejected.map(r => ({ ...requestRow(r), 'Rejection Reason': r.rejection_reason ?? '—' })),
    },
    {
      id: 'all-requests',
      title: 'All Procurement Requests',
      description: `${procurementRequests.length} request${procurementRequests.length === 1 ? '' : 's'} total`,
      category: 'requests',
      count: procurementRequests.length,
      rows: procurementRequests.map(requestRow),
    },
    {
      id: 'approved-items',
      title: 'Approved Procurement Items',
      description: `${approvedProcurement.length} item${approvedProcurement.length === 1 ? '' : 's'} approved for purchase`,
      category: 'approved',
      count: approvedProcurement.length,
      rows: approvedProcurement.map(approvedRow),
    },
    {
      id: 'purchased-items',
      title: 'Purchased Items',
      description: `${purchased.length} item${purchased.length === 1 ? '' : 's'} purchased`,
      category: 'purchased',
      count: purchased.length,
      rows: purchased.map(approvedRow),
    },
    {
      id: 'pending-purchase',
      title: 'Awaiting Purchase',
      description: `${awaitingPurchase.length} approved item${awaitingPurchase.length === 1 ? '' : 's'} not yet purchased`,
      category: 'purchased',
      count: awaitingPurchase.length,
      rows: awaitingPurchase.map(approvedRow),
    },
    {
      id: 'financial-summary',
      title: 'Financial Summary',
      description: `Total approved: KES ${approvedProcurement.reduce((s, i) => s + i.total_cost_kes, 0).toLocaleString()}`,
      category: 'financial',
      count: approvedProcurement.length,
      rows: approvedProcurement.map(approvedRow),
    },
  ];
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ProcurementReports = () => {
  const dispatch = useAppDispatch();

  // ── Redux State ──────────────────────────────────────────────────────────
  const procurementRequests = useAppSelector(selectProcurementRequests);
  const approvedProcurement = useAppSelector(selectApprovedProcurement);
  const stats = useAppSelector(selectInventoryStats);

  const requestsLoading = useAppSelector(selectProcurementRequestsLoading);
  const approvedLoading = useAppSelector(selectApprovedProcurementLoading);
  const statsLoading = useAppSelector(selectInventoryStatsLoading);
  const loading = requestsLoading || approvedLoading || statsLoading;

  // ── Local State ──────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all'>('all');
  const [justDownloadedId, setJustDownloadedId] = useState<string | null>(null);

  // ── Fetch Data ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchAllProcurementRequests());
    dispatch(fetchApprovedProcurement());
    dispatch(fetchInventoryStats());
  }, [dispatch]);

  const refresh = () => {
    dispatch(fetchAllProcurementRequests());
    dispatch(fetchApprovedProcurement());
    dispatch(fetchInventoryStats());
  };

  // ── Derive Reports ───────────────────────────────────────────────────────
  const reports = useMemo(
    () => deriveReports(procurementRequests, approvedProcurement),
    [procurementRequests, approvedProcurement]
  );

  // ── Filter Reports ─────────────────────────────────────────────────────
  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ── Group by Category ────────────────────────────────────────────────
  const groupedReports = filteredReports.reduce((acc, report) => {
    (acc[report.category] ??= []).push(report);
    return acc;
  }, {} as Record<ReportCategory, DerivedReport[]>);

  // ── Handle Export ────────────────────────────────────────────────────
  const handleExport = (report: DerivedReport) => {
    if (report.rows.length === 0) return;
    const filename = `${report.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, report.rows);
    setJustDownloadedId(report.id);
    setTimeout(() => setJustDownloadedId(null), 2000);
  };

  const totalApprovedCost = approvedProcurement.reduce((sum, i) => sum + i.total_cost_kes, 0);
  const pendingCount = procurementRequests.filter(r => r.status === 'Pending').length;

  if (loading && reports.every(r => r.count === 0) && procurementRequests.length === 0 && approvedProcurement.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileSpreadsheet className="h-7 w-7 text-blue-600" />
            Procurement Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Export procurement data as CSV
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ─── Stats Summary ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatBox icon={ShoppingCart} label="Total Requests" value={procurementRequests.length} bg="bg-purple-50" text="text-purple-600" />
        <StatBox icon={CheckCircle} label="Approved Items" value={approvedProcurement.length} bg="bg-green-50" text="text-green-600" />
        <StatBox icon={DollarSign} label="Total Approved Cost" value={`KES ${totalApprovedCost.toLocaleString()}`} bg="bg-emerald-50" text="text-emerald-600" />
        <StatBox icon={Clock} label="Pending Approval" value={stats?.pending_procurement_requests ?? pendingCount} bg="bg-yellow-50" text="text-yellow-600" />
      </div>

      {/* ─── Filters ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ReportCategory | 'all')}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
          >
            <option value="all">All Categories</option>
            <option value="requests">Requests</option>
            <option value="approved">Approved Items</option>
            <option value="purchased">Purchased Items</option>
            <option value="financial">Financial</option>
          </select>
        </div>
      </div>

      {/* ─── Report Categories ────────────────────────────────────────────── */}
      <div className="space-y-6">
        {Object.entries(groupedReports).map(([category, categoryReports]) => {
          const catKey = category as ReportCategory;
          const style = CATEGORY_STYLES[catKey];

          return (
            <div key={category} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${style.bg.replace('50', '500')}`}></span>
                <h2 className="font-semibold text-gray-800">{CATEGORY_LABELS[catKey]}</h2>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {categoryReports.length} report{categoryReports.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryReports.map((report) => {
                  const isEmpty = report.rows.length === 0;
                  const justDownloaded = justDownloadedId === report.id;

                  return (
                    <div
                      key={report.id}
                      className="group p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md bg-white transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${style.bg} ${style.text} flex-shrink-0`}>
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                            {report.title}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                            {report.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              CSV
                            </span>
                            <span className="text-[10px] text-gray-400">{report.count} row{report.count === 1 ? '' : 's'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleExport(report)}
                          disabled={isEmpty}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isEmpty
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : justDownloaded
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {justDownloaded ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              Downloaded
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              {isEmpty ? 'No data' : 'Export CSV'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Empty State ───────────────────────────────────────────────────── */}
      {filteredReports.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileSearch className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No Reports Found</h3>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {!loading && procurementRequests.length === 0 && approvedProcurement.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 mt-6">
          <Inbox className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No Procurement Data Yet</h3>
          <p className="text-gray-400 text-sm mt-1">
            Reports will populate once procurement requests are submitted
          </p>
        </div>
      )}

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-400 border-t border-gray-200 pt-4 gap-2">
        <div>
          <span className="font-medium text-gray-500">Procurement Reports</span>
          <span className="mx-2">•</span>
          <span>{reports.length} reports available</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            {loading ? 'Loading...' : 'Up to date'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

interface StatBoxProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  bg: string;
  text: string;
}

const StatBox = ({ icon: Icon, label, value, bg, text }: StatBoxProps) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${bg} ${text}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  </div>
);

export default ProcurementReports;