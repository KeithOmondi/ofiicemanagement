// src/pages/PDashboard.tsx

import { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Calendar,
  Bell,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchInventoryStats,
  fetchAllProcurementRequests,
  fetchApprovedProcurement,
  selectInventoryStats,
  selectProcurementRequests,
  selectApprovedProcurement,
  selectInventoryStatsLoading,
} from '../../store/slices/inventorySlice';
// ── REMOVED tasksSlice imports ─────────────────────────────
// import {
//   fetchTaskStats,
//   selectTaskStats,
//   selectProjectStats,
//   selectStatsLoading,
// } from '../../store/slices/tasksSlice';
import {
  fetchNoticesStats,
  fetchUnreadCount,
  selectNoticesStats,
  selectUnreadCount,
  selectStatsLoading as selectNoticesStatsLoading,
} from '../../store/slices/noticesSlice';
import {
  fetchUpcomingEvents,
  selectUpcomingEvents,
  selectCalendarUpcomingLoading,
} from '../../store/slices/calendarSlice';
import type { ProcurementRequest } from '../../store/slices/inventorySlice';
import type { CalendarEvent } from '../../types/calendar.types';

// ─── Sub-Components ──────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'teal' | 'indigo';
  loading?: boolean;
}

const StatCard = ({ title, value, icon: Icon, trend, color, loading = false }: StatCardProps) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="mt-1 h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.direction === 'up' ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-xs font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value}%
              </span>
              <span className="text-xs text-gray-400">from last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color]} border`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

interface ActivityItemProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  description: string;
  time: string;
}

const ActivityItem = ({ icon: Icon, iconColor, title, description, time }: ActivityItemProps) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
    <div className={`p-2 rounded-lg ${iconColor} flex-shrink-0 mt-0.5`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 truncate">{description}</p>
    </div>
    <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
  </div>
);

// ─── Main Dashboard Component ────────────────────────────────────────────────

const PDashboard = () => {
  const dispatch = useAppDispatch();

  // ── Inventory Selectors ──────────────────────────────────────────────────
  const stats = useAppSelector(selectInventoryStats);
  const procurementRequests = useAppSelector(selectProcurementRequests);
  const approvedProcurement = useAppSelector(selectApprovedProcurement);
  const inventoryStatsLoading = useAppSelector(selectInventoryStatsLoading);

  // ── REMOVED tasks selectors ────────────────────────────────────────────

  // ── Notices Selectors ──────────────────────────────────────────────────
  const noticesStats = useAppSelector(selectNoticesStats);
  const unreadCount = useAppSelector(selectUnreadCount);
  const noticesStatsLoading = useAppSelector(selectNoticesStatsLoading);

  // ── Calendar Selectors ──────────────────────────────────────────────────
  const upcomingEvents = useAppSelector(selectUpcomingEvents);
  const calendarLoading = useAppSelector(selectCalendarUpcomingLoading);

  // ── Fetch Data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        dispatch(fetchInventoryStats()),
        dispatch(fetchAllProcurementRequests()),
        dispatch(fetchApprovedProcurement()),
        // ── REMOVED dispatch(fetchTaskStats()) ───────────────────────
        dispatch(fetchNoticesStats()),
        dispatch(fetchUnreadCount()),
        dispatch(fetchUpcomingEvents(5)),
      ]);
    };

    fetchData();
  }, [dispatch]);

  // ── Derived Data ──────────────────────────────────────────────────────
  const pendingProcurement = procurementRequests.filter(
    (r: ProcurementRequest) => r.status === 'Pending'
  ).length;

  const totalApprovedCost = approvedProcurement.reduce(
    (sum, i) => sum + i.total_cost_kes,
    0
  );

  // ── REMOVED task-related derived data ──────────────────────────────────

  // ── Activity Feed (combine recent activity from procurement and calendar) ──
  const activities = [
    ...(procurementRequests.slice(0, 2).map((r: ProcurementRequest) => ({
      icon: r.status === 'Pending' ? Clock : r.status === 'Approved' ? CheckCircle : AlertCircle,
      iconColor: r.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' : 
                 r.status === 'Approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600',
      title: `Procurement Request: ${r.item_name}`,
      description: `${r.quantity} ${r.unit} - ${r.status}`,
      time: new Date(r.created_at).toLocaleDateString(),
    }))),
    ...(upcomingEvents.slice(0, 2).map((e: CalendarEvent) => ({
      icon: Calendar,
      iconColor: 'bg-indigo-50 text-indigo-600',
      title: e.title,
      description: `${e.event_type} - ${e.event_date ? new Date(e.event_date).toLocaleDateString() : ''}`,
      time: e.start_time ? e.start_time.substring(0, 5) : 'All day',
    }))),
  ];

  // ── Compute total unread (broadcasts + notices) ──────────────────────
  const totalUnread = (unreadCount?.broadcasts ?? 0) + (unreadCount?.notices ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">
                Overview of procurement, notices, and calendar
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ─── Stats Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Inventory Items"
            value={stats?.total_items ?? 0}
            icon={Package}
            color="blue"
            loading={inventoryStatsLoading}
          />
          <StatCard
            title="Approved Procurement"
            value={`KES ${totalApprovedCost.toLocaleString()}`}
            icon={DollarSign}
            color="green"
            loading={inventoryStatsLoading}
            trend={{ value: 12, direction: 'up' }}
          />
          <StatCard
            title="Pending Requests"
            value={pendingProcurement}
            icon={Clock}
            color="yellow"
            loading={inventoryStatsLoading}
          />
          <StatCard
            title="Unread Notices"
            value={totalUnread}
            icon={Bell}
            color="red"
            loading={noticesStatsLoading}
          />
          <StatCard
            title="Upcoming Events"
            value={upcomingEvents.length}
            icon={Calendar}
            color="purple"
            loading={calendarLoading}
          />
        </div>

        {/* ─── Main Content Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Recent Activity ────────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Activity</h2>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View All
              </button>
            </div>
            <div className="px-5 py-2 max-h-[400px] overflow-y-auto">
              {activities.length > 0 ? (
                activities.map((activity, idx) => (
                  <ActivityItem key={idx} {...activity} />
                ))
              ) : (
                <div className="py-8 text-center text-gray-400 text-sm">
                  No recent activity
                </div>
              )}
            </div>
          </div>

          {/* ─── Quick Stats / Notices ──────────────────────────────────── */}
          <div className="space-y-4">
            {/* Procurement Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Procurement</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Requests</span>
                  <span className="font-medium">{procurementRequests.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Pending Approval</span>
                  <span className="font-medium text-yellow-600">{pendingProcurement}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Approved Items</span>
                  <span className="font-medium text-green-600">{approvedProcurement.length}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                  <span className="text-gray-500">Total Cost</span>
                  <span className="font-bold text-gray-900">KES {totalApprovedCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Notices Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">Notices</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Notices</span>
                  <span className="font-medium">{noticesStats?.total_notices ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Broadcasts</span>
                  <span className="font-medium">{noticesStats?.total_broadcasts ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                  <span className="text-gray-500">Unread</span>
                  <span className="font-bold text-red-600">{totalUnread}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── REMOVED Task Overview section ────────────────────────────── */}

        {/* ─── Upcoming Events ────────────────────────────────────────────── */}
        {upcomingEvents.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Upcoming Events</h2>
              <span className="text-xs text-gray-400">{upcomingEvents.length} events</span>
            </div>
            <div className="divide-y divide-gray-100">
              {upcomingEvents.slice(0, 4).map((event: CalendarEvent) => (
                <div key={event.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      event.event_type === 'hearing' ? 'bg-red-50 text-red-600' :
                      event.event_type === 'meeting' ? 'bg-blue-50 text-blue-600' :
                      event.event_type === 'deadline' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {event.event_date ? new Date(event.event_date).toLocaleDateString() : ''}
                        {event.start_time && ` at ${event.start_time.substring(0, 5)}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    event.event_type === 'hearing' ? 'bg-red-50 text-red-600' :
                    event.event_type === 'meeting' ? 'bg-blue-50 text-blue-600' :
                    event.event_type === 'deadline' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {event.event_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDashboard;