// src/pages/principalregistry/DHRegistryDashboard.tsx
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  Calendar,
  Clock,
  FileText,
  Inbox,
  Bell,
  Package,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle,
  Clock as ClockIcon,
} from 'lucide-react';

// ── Slice imports ─────────────────────────────────────────────────────────────
import {
  fetchMyMarked,
  selectMyMarked,
  selectLoading as selectDocLoading,
} from '../../store/slices/documentSlice';
import {
  fetchUnreadCount as fetchMessagesUnread,
  selectUnreadCount as selectMessagesUnread,
  selectMessagesLoading,
} from '../../store/slices/messagesSlice';
import {
  fetchUnreadCount as fetchNoticesUnread,
  selectUnreadCount as selectNoticesUnread,
  selectNoticesLoading,
} from '../../store/slices/noticesSlice';
import {
  fetchUpcomingEvents,
  selectUpcomingEvents,
  selectCalendarUpcomingLoading,
} from '../../store/slices/calendarSlice';
import {
  fetchInventoryStats,
  selectInventoryStats,
  selectInventoryStatsLoading,
} from '../../store/slices/inventorySlice';
import {
  fetchReports,
  selectAllReportsData,
  selectReportsLoading,
  selectReportsError,
} from '../../store/slices/principalRegistryReportSlice';

// ── Auth selector ─────────────────────────────────────────────────────────────
import { selectCurrentUser } from '../../store/slices/userSlice';

// ── Types ─────────────────────────────────────────────────────────────────────
import type { Document } from '../../types/documents.types';
import type { CalendarEvent } from '../../types/calendar.types';
import type { ReportStatus } from '../../types/principal-registry-report.types';
import { getStatusLabel } from '../../types/principal-registry-report.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const statusClasses: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800',
  in_progress:    'bg-blue-100 text-blue-800',
  completed:      'bg-emerald-100 text-emerald-800',
  draft:          'bg-stone-100 text-stone-600',
};

const reportStatusStyles: Record<ReportStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-50 text-blue-700',
  reviewed: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-purple-50 text-purple-700',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  subtext: string;
  accent: string;
  textAccent: string;
  to: string;
}

const StatCard = ({ icon: Icon, label, value, subtext, accent, textAccent, to }: StatCardProps) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-xl border border-stone-200 bg-white p-5 transition hover:shadow-md hover:border-stone-300"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
        <p className={`mt-1.5 text-3xl font-bold ${textAccent}`}>{value}</p>
        <p className="mt-1 text-xs text-stone-400">{subtext}</p>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent} transition group-hover:scale-105`}>
        <Icon size={18} />
      </div>
    </div>
    <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#c9a84c] transition-all duration-300 group-hover:w-full" />
  </Link>
);

interface PanelProps {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  viewAllLink?: string;
  children: React.ReactNode;
}

const Panel = ({ title, icon: Icon, viewAllLink, children }: PanelProps) => (
  <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
    <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-[#1a3d1c]" />
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
      </div>
      {viewAllLink && (
        <Link
          to={viewAllLink}
          className="flex items-center gap-1 text-xs font-medium text-[#c9a84c] hover:text-[#b8973f]"
        >
          View all <ArrowRight size={12} />
        </Link>
      )}
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

const Empty = ({ message }: { message: string }) => (
  <p className="py-6 text-center text-sm text-stone-400">{message}</p>
);

const LoadingSkeleton = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-50">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-[#c9a84c]" />
      <p className="text-sm text-stone-400">Loading dashboard…</p>
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="p-6 max-w-7xl mx-auto">
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 flex items-start gap-3">
      <svg className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="font-semibold text-rose-900">Error loading dashboard</p>
        <p className="text-sm mt-0.5 text-rose-700">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const DHRegistryDashboard = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ─────────────────────────────────────────────────────────────
  const currentUser    = useAppSelector(selectCurrentUser);
  const myMarked       = useAppSelector(selectMyMarked) as Document[];
  const unreadMessages = useAppSelector(selectMessagesUnread);
  const unreadNotices  = useAppSelector(selectNoticesUnread);
  const upcomingEvents = useAppSelector(selectUpcomingEvents) as CalendarEvent[];
  const inventoryStats = useAppSelector(selectInventoryStats);
  const reports        = useAppSelector(selectAllReportsData);
  const reportsError   = useAppSelector(selectReportsError);

  const docLoading      = useAppSelector(selectDocLoading);
  const messagesLoading = useAppSelector(selectMessagesLoading);
  const noticesLoading  = useAppSelector(selectNoticesLoading);
  const calendarLoading = useAppSelector(selectCalendarUpcomingLoading);
  const statsLoading    = useAppSelector(selectInventoryStatsLoading);
  const reportsLoading  = useAppSelector(selectReportsLoading);

  const isLoading =
    docLoading || messagesLoading || noticesLoading || calendarLoading || statsLoading || reportsLoading;

  // ── Data fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMyMarked());
    dispatch(fetchMessagesUnread());
    dispatch(fetchNoticesUnread());
    dispatch(fetchUpcomingEvents(5));
    dispatch(fetchInventoryStats());
    // ✅ Fix: Pass undefined instead of {} to avoid sending departmentId
    dispatch(fetchReports(undefined));
  }, [dispatch]);

  const handleRetry = () => {
    dispatch(fetchReports(undefined));
    dispatch(fetchMyMarked());
    dispatch(fetchMessagesUnread());
    dispatch(fetchNoticesUnread());
    dispatch(fetchUpcomingEvents(5));
    dispatch(fetchInventoryStats());
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const firstName       = currentUser?.full_name?.split(' ')[0] ?? 'there';
  const totalUnread     = (unreadNotices?.broadcasts ?? 0) + (unreadNotices?.notices ?? 0);
  const pendingDocs     = myMarked?.filter(d => d.status === 'pending_review') ?? [];
  
  // Report stats
  const reportStats = useMemo(() => {
    const total = reports.length;
    const draft = reports.filter(r => r.status === 'draft').length;
    const submitted = reports.filter(r => r.status === 'submitted').length;
    const reviewed = reports.filter(r => r.status === 'reviewed').length;
    const archived = reports.filter(r => r.status === 'archived').length;
    const withPDF = reports.filter(r => r.pdfSecureUrl).length;
    return { total, draft, submitted, reviewed, archived, withPDF };
  }, [reports]);

  // Recent reports (last 5)
  const recentReports = useMemo(() => {
    const sorted = [...reports].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.slice(0, 5);
  }, [reports]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderReportStatusBadge = (status: ReportStatus) => {
    const label = getStatusLabel(status);
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${reportStatusStyles[status] || reportStatusStyles.draft}`}>
        {label}
      </span>
    );
  };

  // ── Loading / Error States ──────────────────────────────────────────────
  if (isLoading && reports.length === 0) {
    return <LoadingSkeleton />;
  }

  if (reportsError) {
    return <ErrorState message={reportsError} onRetry={handleRetry} />;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-serif font-semibold uppercase tracking-widest text-[#c9a84c]">
              {timeGreeting()}
            </p>
            <h1 className="mt-0.5 font-serif text-2xl font-bold text-stone-900">
              {firstName}
            </h1>
            <p className="mt-1 text-sm font-serif text-stone-500">
              Here's what needs your attention today.
            </p>
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={FileText}
            label="Documents"
            value={myMarked?.length ?? 0}
            subtext={`${pendingDocs.length} pending review`}
            accent="bg-blue-50 text-blue-600"
            textAccent="text-stone-900"
            to="/documents"
          />
          <StatCard
            icon={Inbox}
            label="Messages"
            value={unreadMessages?.total ?? 0}
            subtext={`${unreadMessages?.by_group?.length ?? 0} active groups`}
            accent="bg-emerald-50 text-emerald-600"
            textAccent="text-stone-900"
            to="/messages"
          />
          <StatCard
            icon={Bell}
            label="Notices"
            value={totalUnread}
            subtext={`${unreadNotices?.broadcasts ?? 0} broadcasts`}
            accent="bg-amber-50 text-amber-600"
            textAccent="text-stone-900"
            to="/notices"
          />
          <StatCard
            icon={Calendar}
            label="Events"
            value={upcomingEvents?.length ?? 0}
            subtext="Upcoming events"
            accent="bg-purple-50 text-purple-600"
            textAccent="text-stone-900"
            to="/calendar"
          />
        </div>

        {/* ── Report Stats ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Reports</div>
            <div className="text-2xl font-bold text-stone-900 mt-1">{reportStats.total}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Draft</div>
            <div className="text-2xl font-bold text-stone-900 mt-1">{reportStats.draft}</div>
          </div>
          <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-xs bg-blue-50/30">
            <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Submitted</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{reportStats.submitted}</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-emerald-50/30">
            <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Reviewed</div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{reportStats.reviewed}</div>
          </div>
          <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-xs bg-purple-50/30">
            <div className="text-xs font-medium text-purple-600 uppercase tracking-wider">Archived</div>
            <div className="text-2xl font-bold text-purple-700 mt-1">{reportStats.archived}</div>
          </div>
          <div className="bg-white border border-cyan-200 rounded-xl p-4 shadow-xs bg-cyan-50/30">
            <div className="text-xs font-medium text-cyan-600 uppercase tracking-wider">PDF Attached</div>
            <div className="text-2xl font-bold text-cyan-700 mt-1">{reportStats.withPDF}</div>
          </div>
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Link
            to="/dept/pr/reports/month"
            className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">View Reports</p>
                <p className="text-xs text-stone-500">Browse all weekly reports</p>
              </div>
            </div>
          </Link>

          <Link
            to="/dept/pr/reports/new"
            className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">New Report</p>
                <p className="text-xs text-stone-500">Create weekly submission</p>
              </div>
            </div>
          </Link>

          <Link
            to="/dept/pr/submitted"
            className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <ClockIcon size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">Pending Review</p>
                <p className="text-xs text-stone-500">{reportStats.submitted} reports waiting</p>
              </div>
            </div>
          </Link>

          <Link
            to="/dept/pr/approved"
            className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs hover:border-purple-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">Archived</p>
                <p className="text-xs text-stone-500">{reportStats.archived} completed reports</p>
              </div>
            </div>
          </Link>
        </div>

        {/* ── Main grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left: Documents + Reports */}
          <div className="space-y-6 lg:col-span-2">

            {/* Documents */}
            <Panel title="Documents Awaiting Action" icon={FileText} viewAllLink="/documents">
              {pendingDocs.length === 0 ? (
                <Empty message="No documents pending your review." />
              ) : (
                <div className="divide-y divide-stone-100">
                  {pendingDocs.slice(0, 4).map(doc => (
                    <Link
                      key={doc.id}
                      to={`/documents/${doc.id}`}
                      className="group flex items-center justify-between py-3 hover:bg-stone-50 -mx-5 px-5 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-900">{doc.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span className={`rounded-full px-2 py-0.5 ${statusClasses[doc.status] ?? statusClasses.draft}`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                          <span>{doc.type}</span>
                          {doc.reference_no && (
                            <span className="font-mono text-stone-400">{doc.reference_no}</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={14} className="ml-3 shrink-0 text-stone-300 group-hover:text-[#c9a84c] transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            {/* Recent Reports */}
            <Panel title="Recent Reports" icon={FileSpreadsheet} viewAllLink="/dept/pr/reports/month">
              {recentReports.length === 0 ? (
                <Empty message="No reports submitted yet." />
              ) : (
                <div className="divide-y divide-stone-100">
                  {recentReports.map(report => (
                    <Link
                      key={report.id}
                      to={`/dept/pr/reports/month`}
                      className="group flex items-center justify-between py-3 hover:bg-stone-50 -mx-5 px-5 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-900">
                          {formatDate(report.reportPeriodStart)} – {formatDate(report.reportPeriodEnd)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          {renderReportStatusBadge(report.status)}
                          <span>·</span>
                          <span>{report.weekEndingDates?.length ?? 0} week(s)</span>
                          {report.pdfSecureUrl && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-600">PDF attached</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={14} className="ml-3 shrink-0 text-stone-300 group-hover:text-[#c9a84c] transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Right: Inventory + Events */}
          <div className="space-y-6">

            {/* Inventory */}
            <Panel title="Inventory Summary" icon={Package} viewAllLink="/inventory">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total Items',   value: inventoryStats?.total_items ?? 0,   dot: 'bg-blue-500'    },
                  { label: 'In Stock',      value: inventoryStats?.in_stock    ?? 0,   dot: 'bg-emerald-500' },
                  { label: 'Low Stock',     value: inventoryStats?.low_stock   ?? 0,   dot: 'bg-amber-500'   },
                  { label: 'Out of Stock',  value: inventoryStats?.out_of_stock ?? 0,  dot: 'bg-red-500'     },
                ].map(({ label, value, dot }) => (
                  <div key={label} className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${dot}`} />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{label}</span>
                    </div>
                    <p className="mt-1.5 text-xl font-bold text-stone-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Pending store requests</span>
                  <span className="font-semibold text-stone-800">
                    {inventoryStats?.pending_store_requests ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>Pending procurement</span>
                  <span className="font-semibold text-stone-800">
                    {inventoryStats?.pending_procurement_requests ?? 0}
                  </span>
                </div>
              </div>
            </Panel>

            {/* Upcoming events */}
            <Panel title="Upcoming Events" icon={Calendar} viewAllLink="/calendar">
              {upcomingEvents?.length === 0 ? (
                <Empty message="No upcoming events." />
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 4).map(event => (
                    <Link
                      key={event.id}
                      to={`/calendar`}
                      className="group flex items-start gap-3 rounded-lg border border-stone-100 p-3 transition hover:border-[#c9a84c]/40 hover:bg-[#c9a84c]/5"
                    >
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[#1a3d1c] text-white">
                        <span className="text-[10px] font-medium uppercase leading-none text-[#c9a84c]">
                          {new Date(event.event_date).toLocaleDateString('en', { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold leading-none">
                          {new Date(event.event_date).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-900">{event.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                          <span className="capitalize">{event.event_type}</span>
                          {event.start_time && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <Clock size={10} />
                                {event.start_time.slice(0, 5)}
                              </span>
                            </>
                          )}
                          {event.location && (
                            <>
                              <span>·</span>
                              <span className="truncate">{event.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DHRegistryDashboard;