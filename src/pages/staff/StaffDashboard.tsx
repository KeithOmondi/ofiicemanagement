import { useEffect } from 'react';
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
} from 'lucide-react';

// ── Slice imports ─────────────────────────────────────────────────────────────
import {
  fetchMyMarked,
  selectMyMarked,
  selectLoading as selectDocLoading,
} from '../../store/slices/documentSlice';
// ── REMOVED tasksSlice imports ──────────────────────────────────────────────
// import {
//   fetchTaskStats,
//   fetchStandaloneTasks,
//   selectTaskStats,
//   selectStandaloneTasks,
//   selectTasksLoading,
// } from '../../store/slices/tasksSlice';
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

// ── Auth selector for user name ───────────────────────────────────────────────
import { selectCurrentUser } from '../../store/slices/userSlice';

// ── Types ─────────────────────────────────────────────────────────────────────
import type { Document } from '../../types/documents.types';
import type { CalendarEvent } from '../../types/calendar.types';

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



// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  subtext: string;
  accent: string;   // Tailwind bg class for icon pill
  textAccent: string; // Tailwind text class for value
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
    {/* Gold bottom accent line */}
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

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffDashboard = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ─────────────────────────────────────────────────────────────
  const currentUser    = useAppSelector(selectCurrentUser);
  const myMarked       = useAppSelector(selectMyMarked) as Document[];
  // ── REMOVED taskStats, standaloneTasks, tasksLoading ──────────────────
  const unreadMessages = useAppSelector(selectMessagesUnread);
  const unreadNotices  = useAppSelector(selectNoticesUnread);
  const upcomingEvents = useAppSelector(selectUpcomingEvents) as CalendarEvent[];
  const inventoryStats = useAppSelector(selectInventoryStats);

  const docLoading      = useAppSelector(selectDocLoading);
  // ── REMOVED tasksLoading ──────────────────────────────────────────────
  const messagesLoading = useAppSelector(selectMessagesLoading);
  const noticesLoading  = useAppSelector(selectNoticesLoading);
  const calendarLoading = useAppSelector(selectCalendarUpcomingLoading);
  const statsLoading    = useAppSelector(selectInventoryStatsLoading);

  const isLoading =
    docLoading || messagesLoading || noticesLoading || calendarLoading || statsLoading;

  // ── Data fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMyMarked());
    // ── REMOVED dispatch(fetchTaskStats()) and fetchStandaloneTasks() ───
    dispatch(fetchMessagesUnread());
    dispatch(fetchNoticesUnread());
    dispatch(fetchUpcomingEvents(5));
    dispatch(fetchInventoryStats());
  }, [dispatch]);

  // ── Derived values ────────────────────────────────────────────────────────
  const firstName       = currentUser?.full_name?.split(' ')[0] ?? 'there';
  const totalUnread     = (unreadNotices?.broadcasts ?? 0) + (unreadNotices?.notices ?? 0);
  const pendingDocs     = myMarked?.filter(d => d.status === 'pending_review') ?? [];
  // ── REMOVED activeTasks, overdueTasks ──────────────────────────────────

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-[#c9a84c]" />
          <p className="text-sm text-stone-400">Loading dashboard…</p>
        </div>
      </div>
    );
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

          {/* ── REMOVED overdue alert pill ────────────────────────────────── */}
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
          {/* ── REMOVED Tasks StatCard ──────────────────────────────────── */}
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

        {/* ── Main grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left: Documents only (was Documents + Tasks) */}
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

            {/* ── REMOVED Tasks Panel ────────────────────────────────────── */}
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
                      {/* Date pill */}
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

            {/* ── REMOVED Task Progress mini-card ────────────────────────── */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;