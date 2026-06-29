import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchHelpDeskStats,
  fetchHelpDeskAudit,
  fetchUtilities,
  fetchClubMemberships,
  fetchCircuits,
  fetchBenches,
  fetchPartHeards,
  fetchRequests,
  fetchVisaRequests,
  fetchProtocolEvents,
  selectHelpDeskStats,
  selectHelpDeskAudit,
  selectAllUtilities,
  selectAllClubMemberships,
  selectAllCircuits,
  selectAllBenches,
  selectAllPartHeards,
  selectAllRequests,
  selectAllVisaRequests,
  selectAllProtocolEvents,
  selectStatsLoading,
  selectAuditLoading,
  selectHelpDeskError,
  clearError,
} from '../../store/slices/helpdeskSlice';
import {
  BarChart3,
  Clock3,
  Stamp,
  ShieldCheck,
  FileText,
  Pencil,
  Wallet,
  Users,
  MapPin,
  Gavel,
  FileCheck,
  Mail,
  Plane,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 
  | 'overview'
  | 'utilities'
  | 'club'
  | 'circuits'
  | 'benches'
  | 'partHeard'
  | 'requests'
  | 'visa'
  | 'protocol';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Signed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  return map[status] ?? 'bg-stone-50 text-stone-600 border-stone-200';
};

const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'Signed':
    case 'Resolved':
    case 'Active':
    case 'Completed':
      return <CheckCircle className="h-3 w-3" />;
    case 'Pending':
    case 'In Progress':
      return <ClockIcon className="h-3 w-3" />;
    case 'Rejected':
      return <XCircle className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
};

// ─── UI Components ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(status)}`}
    >
      {getStatusIcon(status)}
      {status}
    </span>
  );
}

function StatCard({
  icon,
  value,
  label,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sub: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c9a84c]/15 text-[#1a3d1c]">
        {icon}
      </div>
      <div>
        {loading ? (
          <div className="h-7 w-16 animate-pulse rounded bg-stone-100" />
        ) : (
          <p className="text-xl font-semibold text-stone-900 leading-none">{value}</p>
        )}
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
  loading,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1a3d1c]">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="py-8 text-center">
      <div className="flex justify-center mb-2">
        <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center">
          <FileText className="h-6 w-6 text-stone-300" />
        </div>
      </div>
      <p className="text-sm text-stone-400">{message || 'No records found.'}</p>
    </div>
  );
}

function ErrorBanner() {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectHelpDeskError);
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
      <button onClick={() => dispatch(clearError())} className="text-red-500 hover:text-red-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Tab Content Components ──────────────────────────────────────────────────

function OverviewTab() {
  const stats = useAppSelector(selectHelpDeskStats);
  const loading = useAppSelector(selectStatsLoading);
  const auditLog = useAppSelector(selectHelpDeskAudit);
  const auditLoading = useAppSelector(selectAuditLoading);

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          value={stats?.total_records ?? 0}
          label="Total Records"
          sub="Across all modules"
          loading={loading}
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5" />}
          value={stats?.in_progress ?? 0}
          label="In Progress"
          sub="Payments pending"
          loading={loading}
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          value={stats?.visa_active ?? 0}
          label="Visa Active"
          sub="Pending outcome"
          loading={loading}
        />
        <StatCard
          icon={<Stamp className="h-5 w-5" />}
          value={stats?.protocol_pending ?? 0}
          label="Protocol Pending"
          sub="Awaiting review/sign"
          loading={loading}
        />
      </div>

      {/* Module Summaries */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SummaryCard
          title="Judge Utilities"
          icon={<Wallet className="h-4 w-4" />}
          moduleData={useAppSelector(selectAllUtilities)}
          statusKey="status"
        />
        <SummaryCard
          title="Club Membership"
          icon={<Users className="h-4 w-4" />}
          moduleData={useAppSelector(selectAllClubMemberships)}
          statusKey="status"
        />
        <SummaryCard
          title="Circuits"
          icon={<MapPin className="h-4 w-4" />}
          moduleData={useAppSelector(selectAllCircuits)}
          statusKey="status"
        />
        <SummaryCard
          title="Special Benches"
          icon={<Gavel className="h-4 w-4" />}
          moduleData={useAppSelector(selectAllBenches)}
          statusKey="status"
        />
        <SummaryCard
          title="Part-Heards"
          icon={<FileCheck className="h-4 w-4" />}
          moduleData={useAppSelector(selectAllPartHeards)}
          statusKey="status"
        />
        <SummaryCard
          title="Judges' Requests"
          icon={<Mail className="h-4 w-4" />}
          moduleData={useAppSelector(selectAllRequests)}
          statusKey="status"
        />
        <SummaryCard
          title="Visa Support"
          icon={<Plane className="h-4 w-4" />}
          moduleData={useAppSelector(selectAllVisaRequests)}
          statusKey="status"
        />
        <SummaryCard
          title="Protocol Support"
          icon={<Calendar className="h-4 w-4" />}
          moduleData={useAppSelector(selectAllProtocolEvents)}
          statusKey="status"
        />
      </div>

      {/* Recent Audit Log */}
      <Panel
        title="Recent Activity"
        icon={<Pencil className="h-4 w-4" />}
        action={
          <span className="text-xs text-stone-400">
            Last 10 actions
          </span>
        }
        loading={auditLoading}
      >
        {auditLog.length === 0 ? (
          <EmptyState message="No recent activity." />
        ) : (
          <div className="space-y-2">
            {auditLog.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-stone-100 px-3 py-2.5 hover:bg-stone-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-700">
                    <span className="font-medium text-stone-900">
                      {entry.actor_name || 'System'}
                    </span>
                    {' — '}
                    {entry.action}
                  </p>
                  {entry.detail && (
                    <p className="text-xs text-stone-400 mt-0.5">{entry.detail}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-stone-400">
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps<T> {
  title: string;
  icon: React.ReactNode;
  moduleData: T[];
  statusKey: keyof T;
}

function SummaryCard<T extends { status: string; total_dsa?: number }>({
  title,
  icon,
  moduleData,
  statusKey,
}: SummaryCardProps<T>) {
  const total = moduleData.length;
  const pending = moduleData.filter(item => {
    const status = String(item[statusKey]);
    return status === 'Pending' || status === 'In Progress';
  }).length;
  const signed = moduleData.filter(item => {
    const status = String(item[statusKey]);
    return status === 'Signed' || status === 'Completed' || status === 'Resolved' || status === 'Active';
  }).length;

  // Calculate total DSA for modules that have it
  const hasDSA = moduleData.some(item => 'total_dsa' in item);
  const totalDSA = hasDSA
    ? moduleData.reduce((sum, item) => sum + (item.total_dsa || 0), 0)
    : 0;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[#1a3d1c]">{icon}</div>
        <h4 className="text-sm font-semibold text-stone-800">{title}</h4>
        <span className="ml-auto text-xs text-stone-400">{total} records</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-stone-50 p-2">
          <p className="text-lg font-semibold text-stone-800">{total}</p>
          <p className="text-[10px] text-stone-400">Total</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-2">
          <p className="text-lg font-semibold text-amber-700">{pending}</p>
          <p className="text-[10px] text-amber-500">Pending</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2">
          <p className="text-lg font-semibold text-emerald-700">{signed}</p>
          <p className="text-[10px] text-emerald-500">Signed</p>
        </div>
      </div>

      {hasDSA && totalDSA > 0 && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          <p className="text-center text-xs text-stone-500">
            Total DSA: <span className="font-semibold text-stone-700">{formatCurrency(totalDSA)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── View-Only Table Component ──────────────────────────────────────────────

interface ViewOnlyTableProps<T> {
  data: T[];
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  renderRow: (item: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
}

function ViewOnlyTable<T extends { id?: string }>({
  data,
  columns,
  renderRow,
  loading,
  emptyMessage,
}: ViewOnlyTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState message={emptyMessage || 'No records found.'} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-xs uppercase text-stone-400">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 font-medium ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {data.map((item, index) => (
            <tr key={item.id || String(index)} className="hover:bg-stone-50 transition-colors">
              {renderRow(item)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── View-Only Tab Components ───────────────────────────────────────────────

function UtilitiesViewTab() {
  const data = useAppSelector(selectAllUtilities);
  const loading = useAppSelector((state) => state.helpdesk.loading.utilities);

  return (
    <Panel title="Judge Utilities" icon={<Wallet className="h-4 w-4" />}>
      <ViewOnlyTable
        data={data}
        loading={loading}
        columns={[
          { key: 'judge_name', label: 'Judge' },
          { key: 'utility_type', label: 'Type' },
          { key: 'amount', label: 'Amount', align: 'right' },
          { key: 'period', label: 'Period' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.judge_name}</td>
            <td className="px-3 py-2 text-stone-600">{item.utility_type}</td>
            <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.amount)}</td>
            <td className="px-3 py-2 text-stone-600">{item.period}</td>
            <td className="px-3 py-2 text-center">
              <StatusPill status={item.status} />
            </td>
          </>
        )}
      />
    </Panel>
  );
}

function ClubViewTab() {
  const data = useAppSelector(selectAllClubMemberships);
  const loading = useAppSelector((state) => state.helpdesk.loading.club);

  return (
    <Panel title="Club Membership" icon={<Users className="h-4 w-4" />}>
      <ViewOnlyTable
        data={data}
        loading={loading}
        columns={[
          { key: 'judge_name', label: 'Judge' },
          { key: 'club_name', label: 'Club' },
          { key: 'annual_fee', label: 'Annual Fee', align: 'right' },
          { key: 'period', label: 'Period' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.judge_name}</td>
            <td className="px-3 py-2 text-stone-600">{item.club_name}</td>
            <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.annual_fee)}</td>
            <td className="px-3 py-2 text-stone-600">{item.period}</td>
            <td className="px-3 py-2 text-center">
              <StatusPill status={item.status} />
            </td>
          </>
        )}
      />
    </Panel>
  );
}

function CircuitsViewTab() {
  const data = useAppSelector(selectAllCircuits);
  const loading = useAppSelector((state) => state.helpdesk.loading.circuits);

  return (
    <Panel title="Circuits" icon={<MapPin className="h-4 w-4" />}>
      <ViewOnlyTable
        data={data}
        loading={loading}
        columns={[
          { key: 'name', label: 'Circuit' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.name}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.start_date)}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.end_date)}</td>
            <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
            <td className="px-3 py-2 text-center">
              <StatusPill status={item.status} />
            </td>
          </>
        )}
      />
    </Panel>
  );
}

function BenchesViewTab() {
  const data = useAppSelector(selectAllBenches);
  const loading = useAppSelector((state) => state.helpdesk.loading.benches);

  return (
    <Panel title="Special Benches" icon={<Gavel className="h-4 w-4" />}>
      <ViewOnlyTable
        data={data}
        loading={loading}
        columns={[
          { key: 'name', label: 'Bench / Case' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.name}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.start_date)}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.end_date)}</td>
            <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
            <td className="px-3 py-2 text-center">
              <StatusPill status={item.status} />
            </td>
          </>
        )}
      />
    </Panel>
  );
}

function PartHeardViewTab() {
  const data = useAppSelector(selectAllPartHeards);
  const loading = useAppSelector((state) => state.helpdesk.loading.partHeards);

  return (
    <Panel title="Part-Heards" icon={<FileCheck className="h-4 w-4" />}>
      <ViewOnlyTable
        data={data}
        loading={loading}
        columns={[
          { key: 'case_reference', label: 'Reference' },
          { key: 'approved_by', label: 'Approved By' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.case_reference}</td>
            <td className="px-3 py-2 text-stone-600">{item.approved_by || '—'}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.start_date)}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.end_date)}</td>
            <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
            <td className="px-3 py-2 text-center">
              <StatusPill status={item.status} />
            </td>
          </>
        )}
      />
    </Panel>
  );
}

function RequestsViewTab() {
  const data = useAppSelector(selectAllRequests);
  const loading = useAppSelector((state) => state.helpdesk.loading.requests);

  return (
    <Panel title="Judges' Requests" icon={<Mail className="h-4 w-4" />}>
      <ViewOnlyTable
        data={data}
        loading={loading}
        columns={[
          { key: 'judge_name', label: 'Judge' },
          { key: 'nature', label: 'Nature of Request' },
          { key: 'mode', label: 'Mode' },
          { key: 'received_date', label: 'Received' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.judge_name}</td>
            <td className="px-3 py-2 text-stone-600 max-w-xs truncate">{item.nature}</td>
            <td className="px-3 py-2 text-stone-600">{item.mode}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.received_date)}</td>
            <td className="px-3 py-2 text-center">
              <StatusPill status={item.status} />
            </td>
          </>
        )}
      />
    </Panel>
  );
}

function VisaViewTab() {
  const data = useAppSelector(selectAllVisaRequests);
  const loading = useAppSelector((state) => state.helpdesk.loading.visa);

  return (
    <Panel title="Visa Support" icon={<Plane className="h-4 w-4" />}>
      <ViewOnlyTable
        data={data}
        loading={loading}
        columns={[
          { key: 'judge_name', label: 'Judge' },
          { key: 'destination_country', label: 'Destination' },
          { key: 'visa_type', label: 'Type' },
          { key: 'travel_date', label: 'Travel Date' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.judge_name}</td>
            <td className="px-3 py-2 text-stone-600">{item.destination_country}</td>
            <td className="px-3 py-2 text-stone-600">{item.visa_type}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.travel_date)}</td>
            <td className="px-3 py-2 text-center">
              <StatusPill status={item.status} />
            </td>
          </>
        )}
      />
    </Panel>
  );
}

function ProtocolViewTab() {
  const data = useAppSelector(selectAllProtocolEvents);
  const loading = useAppSelector((state) => state.helpdesk.loading.protocol);

  return (
    <Panel title="Protocol Support" icon={<Calendar className="h-4 w-4" />}>
      <ViewOnlyTable
        data={data}
        loading={loading}
        columns={[
          { key: 'event_name', label: 'Event' },
          { key: 'start_date', label: 'Start' },
          { key: 'end_date', label: 'End' },
          { key: 'dsa_required', label: 'DSA', align: 'center' },
          { key: 'total_dsa', label: 'Total DSA', align: 'right' },
          { key: 'status', label: 'Status', align: 'center' },
        ]}
        renderRow={(item) => (
          <>
            <td className="px-3 py-2 font-medium text-stone-800">{item.event_name}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.start_date)}</td>
            <td className="px-3 py-2 text-stone-600">{formatDate(item.end_date)}</td>
            <td className="px-3 py-2 text-center text-stone-600">
              {item.dsa_required ? 'Yes' : 'No'}
            </td>
            <td className="px-3 py-2 text-right text-stone-600">{formatCurrency(item.total_dsa)}</td>
            <td className="px-3 py-2 text-center">
              <StatusPill status={item.status} />
            </td>
          </>
        )}
      />
    </Panel>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminHelpDesk: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Fetch all data on mount
    dispatch(fetchHelpDeskStats());
    dispatch(fetchHelpDeskAudit(50));
    dispatch(fetchUtilities({}));
    dispatch(fetchClubMemberships({}));
    dispatch(fetchCircuits({}));
    dispatch(fetchBenches({}));
    dispatch(fetchPartHeards({}));
    dispatch(fetchRequests({}));
    dispatch(fetchVisaRequests({}));
    dispatch(fetchProtocolEvents({}));
  }, [dispatch]);

  // ── Tab Config ─────────────────────────────────────────────────────────────

  const tabs: TabDef[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { key: 'utilities', label: 'Utilities', icon: <Wallet className="h-3.5 w-3.5" /> },
    { key: 'club', label: 'Club', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'circuits', label: 'Circuits', icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: 'benches', label: 'Benches', icon: <Gavel className="h-3.5 w-3.5" /> },
    { key: 'partHeard', label: 'Part-Heards', icon: <FileCheck className="h-3.5 w-3.5" /> },
    { key: 'requests', label: 'Requests', icon: <Mail className="h-3.5 w-3.5" /> },
    { key: 'visa', label: 'Visa', icon: <Plane className="h-3.5 w-3.5" /> },
    { key: 'protocol', label: 'Protocol', icon: <Calendar className="h-3.5 w-3.5" /> },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Help Desk Dashboard</h1>
            <p className="text-sm text-stone-500">
              Executive oversight — Judges utilities, circuits, requests, visa &amp; protocol support
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">
              Last updated: {new Date().toLocaleString()}
            </span>
          </div>
        </div>

        <ErrorBanner />

        {/* Registrar banner */}
        <div className="mb-4 rounded-xl border border-[#c9a84c]/40 bg-[#1a3d1c]/[0.03] px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold text-[#1a3d1c]">Hon. Clare Otieno-Omondi</span>
            <span className="text-stone-500"> — Registrar</span>
          </p>
          <p className="text-xs text-stone-500">
            Full executive oversight. View all submissions, track all modules, access consolidated reports.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === t.key
                  ? 'bg-[#1a3d1c] text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mb-4">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'utilities' && <UtilitiesViewTab />}
          {activeTab === 'club' && <ClubViewTab />}
          {activeTab === 'circuits' && <CircuitsViewTab />}
          {activeTab === 'benches' && <BenchesViewTab />}
          {activeTab === 'partHeard' && <PartHeardViewTab />}
          {activeTab === 'requests' && <RequestsViewTab />}
          {activeTab === 'visa' && <VisaViewTab />}
          {activeTab === 'protocol' && <ProtocolViewTab />}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminHelpDesk;