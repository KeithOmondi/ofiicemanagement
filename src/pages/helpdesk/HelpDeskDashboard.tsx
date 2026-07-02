// src/features/helpdesk/components/HelpDeskDashboard.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
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
  selectHelpDeskError,
  selectHelpDeskSuccess,
  selectAllUtilities,
  selectAllClubMemberships,
  selectAllCircuits,
  selectAllBenches,
  selectAllPartHeards,
  selectAllRequests,
  selectAllVisaRequests,
  selectAllProtocolEvents,
  setActiveTab,
  clearError,
  clearSuccess,
  type HelpDeskTab,
  type Status,
} from "../../store/slices/helpdeskSlice";

import {
  fetchMyMarked,
  selectMyMarked,
} from "../../store/slices/documentSlice";

// Icons
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Plane,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Mail,
  Globe,
  FileCheck,
  ArrowRight,
  RefreshCw,
  Bell,
  Plus,
  ChevronRight,
  Sparkles,
  Zap,
  Wallet,
} from "lucide-react";

// ─── Import the UtilitiesModal ──────────────────────────────────────────────
import { UtilitiesModal } from "../../components/modals/UtilitiesModal";
import type { JudgeUtility } from "../../store/slices/helpdeskSlice";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

type ActivityStatus = "pending" | "completed" | "rejected" | "in-progress";

interface ActivityItemProps {
  title: string;
  description: string;
  time: string;
  status?: ActivityStatus;
  icon?: React.ReactNode;
}

interface ModuleCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  statusBreakdown?: Record<Status, number>;
  onClick: () => void;
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
  trend,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-200 ${
      onClick ? "cursor-pointer hover:shadow-md hover:border-gray-200" : ""
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={`text-xs font-medium ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? "+" : "-"}{trend.value}%
            </span>
            <span className="text-xs text-gray-400 ml-1">vs last month</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    </div>
  </div>
);

const ActivityItem: React.FC<ActivityItemProps> = ({
  title,
  description,
  time,
  status,
  icon,
}) => {
  const statusColors: Record<ActivityStatus, string> = {
    pending: "bg-yellow-100 text-yellow-600",
    completed: "bg-green-100 text-green-600",
    rejected: "bg-red-100 text-red-600",
    "in-progress": "bg-blue-100 text-blue-600",
  };

  const statusIcons: Record<ActivityStatus, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    completed: <CheckCircle className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
    "in-progress": <Activity className="w-3 h-3" />,
  };

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-shrink-0">
        {icon || (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <FileText className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 truncate">{description}</p>
        <div className="flex items-center mt-1 space-x-2">
          <span className="text-xs text-gray-400">{time}</span>
          {status && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                statusColors[status]
              }`}
            >
              {statusIcons[status]}
              <span className="ml-1 capitalize">{status}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  count,
  icon,
  color,
  statusBreakdown,
  onClick,
}) => (
  <div
    onClick={onClick}
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{count}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </div>
    {statusBreakdown && (
      <div className="mt-4 flex items-center space-x-4 text-xs">
        {Object.entries(statusBreakdown).map(([status, value]) => (
          <div key={status} className="flex items-center space-x-1">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "Pending"
                  ? "bg-yellow-400"
                  : status === "Completed" || status === "Signed"
                  ? "bg-green-400"
                  : status === "Rejected"
                  ? "bg-red-400"
                  : "bg-blue-400"
              }`}
            />
            <span className="text-gray-500 capitalize">{status}</span>
            <span className="font-medium text-gray-700">{value}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

const HelpDeskDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Helpdesk data
  const stats = useAppSelector(selectHelpDeskStats);
  const auditLog = useAppSelector(selectHelpDeskAudit);
  const error = useAppSelector(selectHelpDeskError);
  const success = useAppSelector(selectHelpDeskSuccess);

  // Data counts
  const utilities = useAppSelector(selectAllUtilities);
  const clubMemberships = useAppSelector(selectAllClubMemberships);
  const circuits = useAppSelector(selectAllCircuits);
  const benches = useAppSelector(selectAllBenches);
  const partHeards = useAppSelector(selectAllPartHeards);
  const requests = useAppSelector(selectAllRequests);
  const visaRequests = useAppSelector(selectAllVisaRequests);
  const protocolEvents = useAppSelector(selectAllProtocolEvents);

  // Document data
  const myMarked = useAppSelector(selectMyMarked);

  // ─── Modal State ──────────────────────────────────────────────────────────
  const [isUtilitiesModalOpen, setIsUtilitiesModalOpen] = useState(false);
  const [editingUtility, setEditingUtility] = useState<JudgeUtility | null>(null);

  // ─── Local state ──────────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month"
  >("week");

  // ─── Data Loading ────────────────────────────────────────────────────────

  const loadDashboardData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(fetchHelpDeskStats()).unwrap(),
        dispatch(fetchHelpDeskAudit(20)).unwrap(),
        dispatch(fetchUtilities({ limit: 100 })).unwrap(),
        dispatch(fetchClubMemberships({ limit: 100 })).unwrap(),
        dispatch(fetchCircuits({ limit: 100 })).unwrap(),
        dispatch(fetchBenches({ limit: 100 })).unwrap(),
        dispatch(fetchPartHeards({ limit: 100 })).unwrap(),
        dispatch(fetchRequests({ limit: 100 })).unwrap(),
        dispatch(fetchVisaRequests({ limit: 100 })).unwrap(),
        dispatch(fetchProtocolEvents({ limit: 100 })).unwrap(),
        dispatch(fetchMyMarked()).unwrap(),
      ]);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }, [dispatch]);

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const navigateToTab = (tab: HelpDeskTab) => {
    dispatch(setActiveTab(tab));
  };

  // ─── Utility Modal Handlers ─────────────────────────────────────────────

  const handleOpenUtilitiesModal = (utility?: JudgeUtility | null) => {
    setEditingUtility(utility || null);
    setIsUtilitiesModalOpen(true);
  };

  const handleCloseUtilitiesModal = () => {
    setIsUtilitiesModalOpen(false);
    setEditingUtility(null);
  };

  // ─── Computed Values ──────────────────────────────────────────────────────

  const totalRecords = stats?.total_records || 0;
  const inProgress = stats?.in_progress || 0;
  const visaActive = stats?.visa_active || 0;
  const protocolPending = stats?.protocol_pending || 0;

  // Status breakdowns for module cards
  // JudgeUtility has items with individual statuses, aggregate them
  const utilityStatusBreakdown = utilities.reduce((acc, u) => {
    u.items?.forEach(item => {
      const status = item.status as Status;
      acc[status] = (acc[status] || 0) + 1;
    });
    return acc;
  }, {} as Record<Status, number>);

  const circuitStatusBreakdown = circuits.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<Status, number>);

  const requestStatusBreakdown = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<Status, number>);

  // Helper function to determine activity status
  const getActivityStatus = (action: string): ActivityStatus => {
    if (action.includes("Complete")) return "completed";
    if (action.includes("Reject")) return "rejected";
    if (action.includes("Progress")) return "in-progress";
    return "pending";
  };

  // ─── Recent Activities ──────────────────────────────────────────────────

  // Create audit activities with proper typing
  const auditActivities: ActivityItemProps[] = auditLog.slice(0, 8).map((entry) => ({
    title: entry.action,
    description: entry.detail || `${entry.actor_name || "System"} action`,
    time: new Date(entry.timestamp).toLocaleString(),
    status: getActivityStatus(entry.action),
  }));

  // Create document activities with proper typing
  const documentActivities: ActivityItemProps[] = myMarked.slice(0, 3).map((doc) => ({
    title: `Document: ${doc.title}`,
    description: `Marked to you - ${doc.status}`,
    time: new Date(doc.updated_at).toLocaleString(),
    status: doc.status === "completed" ? "completed" : "pending",
    icon: <FileCheck className="w-5 h-5 text-blue-500" />,
  }));

  // Combine and limit
  const recentActivities: ActivityItemProps[] = [
    ...auditActivities,
    ...documentActivities,
  ].slice(0, 10);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      Help Desk Dashboard
                    </h1>
                    <p className="text-xs text-gray-500">
                      Overview of all judicial support activities
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Period Selector */}
                <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                  {(["today", "week", "month"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        selectedPeriod === period
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </button>

                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Content ────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Error/Success Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => dispatch(clearError())}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-700">Operation successful!</p>
              </div>
              <button
                onClick={() => dispatch(clearSuccess())}
                className="text-green-500 hover:text-green-700"
              >
                ×
              </button>
            </div>
          )}

          {/* ─── Stats Grid ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Records"
              value={totalRecords}
              icon={<FileText className="w-5 h-5 text-white" />}
              color="bg-indigo-500"
              subtitle="Across all modules"
              trend={{ value: 12, isPositive: true }}
              onClick={() => navigateToTab("utilities")}
            />
            <StatCard
              title="In Progress"
              value={inProgress}
              icon={<Activity className="w-5 h-5 text-white" />}
              color="bg-blue-500"
              subtitle="Active tasks"
              onClick={() => navigateToTab("requests")}
            />
            <StatCard
              title="Active Visas"
              value={visaActive}
              icon={<Plane className="w-5 h-5 text-white" />}
              color="bg-green-500"
              subtitle="Visa applications in progress"
              onClick={() => navigateToTab("visa")}
            />
            <StatCard
              title="Pending Protocol"
              value={protocolPending}
              icon={<Calendar className="w-5 h-5 text-white" />}
              color="bg-amber-500"
              subtitle="Awaiting approval"
              onClick={() => navigateToTab("protocol")}
            />
          </div>

          {/* ─── Quick Stats Row ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <div 
              className="bg-white rounded-lg border border-gray-100 p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => handleOpenUtilitiesModal()}
            >
              <p className="text-xs text-gray-400">Utilities</p>
              <p className="text-lg font-bold text-gray-900">{utilities.length}</p>
            </div>
            <div 
              className="bg-white rounded-lg border border-gray-100 p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => navigateToTab("circuits")}
            >
              <p className="text-xs text-gray-400">Circuits</p>
              <p className="text-lg font-bold text-gray-900">{circuits.length}</p>
            </div>
            <div 
              className="bg-white rounded-lg border border-gray-100 p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => navigateToTab("benches")}
            >
              <p className="text-xs text-gray-400">Benches</p>
              <p className="text-lg font-bold text-gray-900">{benches.length}</p>
            </div>
            <div 
              className="bg-white rounded-lg border border-gray-100 p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => navigateToTab("partHeard")}
            >
              <p className="text-xs text-gray-400">Part-Heard</p>
              <p className="text-lg font-bold text-gray-900">{partHeards.length}</p>
            </div>
            <div 
              className="bg-white rounded-lg border border-gray-100 p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => navigateToTab("club")}
            >
              <p className="text-xs text-gray-400">Club Members</p>
              <p className="text-lg font-bold text-gray-900">
                {clubMemberships.length}
              </p>
            </div>
            <div 
              className="bg-white rounded-lg border border-gray-100 p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => navigateToTab("utilities")}
            >
              <p className="text-xs text-gray-400">Marked to Me</p>
              <p className="text-lg font-bold text-gray-900">{myMarked.length}</p>
            </div>
          </div>

          {/* ─── Two-Column Layout ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── Left Column ──────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Module Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModuleCard
                  title="Judge Utilities"
                  count={utilities.length}
                  icon={<Zap className="w-5 h-5 text-white" />}
                  color="bg-indigo-500"
                  statusBreakdown={utilityStatusBreakdown}
                  onClick={() => handleOpenUtilitiesModal()}
                />
                <ModuleCard
                  title="Circuits"
                  count={circuits.length}
                  icon={<Globe className="w-5 h-5 text-white" />}
                  color="bg-blue-500"
                  statusBreakdown={circuitStatusBreakdown}
                  onClick={() => navigateToTab("circuits")}
                />
                <ModuleCard
                  title="Judges' Requests"
                  count={requests.length}
                  icon={<Mail className="w-5 h-5 text-white" />}
                  color="bg-purple-500"
                  statusBreakdown={requestStatusBreakdown}
                  onClick={() => navigateToTab("requests")}
                />
                <ModuleCard
                  title="Visa Support"
                  count={visaRequests.length}
                  icon={<Plane className="w-5 h-5 text-white" />}
                  color="bg-green-500"
                  onClick={() => navigateToTab("visa")}
                />
                <ModuleCard
                  title="Protocol Events"
                  count={protocolEvents.length}
                  icon={<Calendar className="w-5 h-5 text-white" />}
                  color="bg-amber-500"
                  onClick={() => navigateToTab("protocol")}
                />
                <ModuleCard
                  title="Documents Marked"
                  count={myMarked.length}
                  icon={<FileCheck className="w-5 h-5 text-white" />}
                  color="bg-teal-500"
                  onClick={() => navigateToTab("utilities")}
                />
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">
                      Recent Activity
                    </h3>
                  </div>
                  <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1">
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-6 py-2 max-h-80 overflow-y-auto">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, index) => (
                      <ActivityItem key={index} {...activity} />
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-400">
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Right Column ─────────────────────────────────────────────── */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Quick Actions</span>
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleOpenUtilitiesModal()}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-400 group-hover:text-indigo-500 transition-colors">
                        <Wallet className="w-4 h-4" />
                      </span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        New Utility Request
                      </span>
                    </div>
                    <Plus className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </button>
                  {[
                    { label: "Create Circuit", icon: <Globe />, tab: "circuits" as HelpDeskTab },
                    { label: "New Visa Application", icon: <Plane />, tab: "visa" as HelpDeskTab },
                    { label: "Create Protocol Event", icon: <Calendar />, tab: "protocol" as HelpDeskTab },
                    { label: "Compose Document", icon: <FileText />, tab: "utilities" as HelpDeskTab },
                  ].map((action, index) => (
                    <button
                      key={index}
                      onClick={() => navigateToTab(action.tab)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400 group-hover:text-indigo-500 transition-colors">
                          {action.icon}
                        </span>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {action.label}
                        </span>
                      </div>
                      <Plus className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Pending Items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <span>Pending Actions</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {protocolPending} Protocol Events
                      </p>
                      <p className="text-xs text-gray-500">Awaiting approval</p>
                    </div>
                    <button
                      onClick={() => navigateToTab("protocol")}
                      className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                    >
                      Review
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {inProgress} In Progress
                      </p>
                      <p className="text-xs text-gray-500">Active tasks</p>
                    </div>
                    <button
                      onClick={() => navigateToTab("requests")}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View
                    </button>
                  </div>
                  {myMarked.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {myMarked.length} Documents
                        </p>
                        <p className="text-xs text-gray-500">Marked to you</p>
                      </div>
                      <button
                        onClick={() => navigateToTab("utilities")}
                        className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Card */}
              {stats && (
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                  <h3 className="font-semibold text-white/90 mb-3">
                    Summary Overview
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Total Records</span>
                      <span className="font-medium">{stats.total_records}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">In Progress</span>
                      <span className="font-medium">{stats.in_progress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Active Visas</span>
                      <span className="font-medium">{stats.visa_active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Pending Protocol</span>
                      <span className="font-medium">{stats.protocol_pending}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Completion Rate</span>
                      <span className="font-medium">
                        {stats.total_records > 0
                          ? Math.round(
                              ((stats.total_records -
                                stats.in_progress -
                                stats.protocol_pending) /
                                stats.total_records) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Utilities Modal ────────────────────────────────────────────────── */}
      <UtilitiesModal
        isOpen={isUtilitiesModalOpen}
        onClose={handleCloseUtilitiesModal}
        editingUtility={editingUtility}
      />
    </>
  );
};

export default HelpDeskDashboard;