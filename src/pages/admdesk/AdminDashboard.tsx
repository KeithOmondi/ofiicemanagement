// src/pages/admin/AdminDashboard.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";

// ─── Document Slice ──────────────────────────────────────────────────────────
import {
  fetchDocuments,
  fetchMyMarked,
  selectDocuments,
  selectMyMarked,
  selectPagination as selectDocumentsPagination,
} from "../../store/slices/documentSlice";

// ─── Messages Slice ──────────────────────────────────────────────────────────
import {
  fetchGroups,
  fetchMessages,
  fetchUnreadCount,
  selectAllGroups,
  selectAllMessages,
  selectUnreadCount,
} from "../../store/slices/messagesSlice";

// ─── Icons ──────────────────────────────────────────────────────────────────
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Users,
  Clock,
  Activity,
  FileCheck,
  ArrowRight,
  RefreshCw,
  Bell,
  Inbox,
  UserCheck,
  PieChart,
  Sparkles,
} from "lucide-react";

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

interface ActivityItemProps {
  title: string;
  description: string;
  time: string;
  type: "document" | "message" | "system";
  icon?: React.ReactNode;
}

interface DocumentStats {
  total: number;
  draft: number;
  pendingReview: number;
  completed: number;
  marked: number;
}

interface MessageStats {
  total: number;
  unread: number;
  sent: number;
  groups: number;
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
            <span className="text-xs text-gray-400 ml-1">vs last week</span>
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
  type,
  icon,
}) => {
  const typeColors = {
    document: "bg-blue-50 text-blue-600",
    message: "bg-purple-50 text-purple-600",
    system: "bg-gray-50 text-gray-600",
  };

  const typeIcons = {
    document: <FileText className="w-4 h-4" />,
    message: <MessageSquare className="w-4 h-4" />,
    system: <Activity className="w-4 h-4" />,
  };

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-shrink-0">
        {icon || (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${typeColors[type]}`}
          >
            {typeIcons[type]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 truncate">{description}</p>
        <span className="text-xs text-gray-400 mt-1 block">{time}</span>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const dispatch = useAppDispatch();

  // ─── Document State ──────────────────────────────────────────────────────
  const documents = useAppSelector(selectDocuments);
  const myMarked = useAppSelector(selectMyMarked);
  const documentsPagination = useAppSelector(selectDocumentsPagination);

  // ─── Message State ───────────────────────────────────────────────────────
  const groups = useAppSelector(selectAllGroups);
  const messages = useAppSelector(selectAllMessages);
  const unreadCount = useAppSelector(selectUnreadCount);

  // ─── Local State ─────────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month"
  >("week");

  // ─── Data Loading ────────────────────────────────────────────────────────

  const loadDashboardData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(
          fetchDocuments({
            page: 1,
            limit: 100,
          })
        ).unwrap(),
        dispatch(fetchMyMarked()).unwrap(),
        dispatch(fetchGroups({})).unwrap(),
        dispatch(
          fetchMessages({
            limit: 50,
          })
        ).unwrap(),
        dispatch(fetchUnreadCount()).unwrap(),
      ]);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }, [dispatch]);

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  // ─── Computed Values ─────────────────────────────────────────────────────

  // Document Statistics
  const documentStats: DocumentStats = {
    total: documents?.length || 0,
    draft: documents?.filter((d) => d.status === "draft").length || 0,
    pendingReview:
      documents?.filter((d) => d.status === "pending_review" || d.status === "marked")
        .length || 0,
    completed: documents?.filter((d) => d.status === "completed").length || 0,
    marked: myMarked?.length || 0,
  };

  // Message Statistics
  const messageStats: MessageStats = {
    total: messages?.length || 0,
    unread: unreadCount?.total || 0,
    sent: messages?.filter((m) => !m.is_archived).length || 0,
    groups: groups?.length || 0,
  };

  // Recent Activity - Combine documents and messages
  const recentActivities: ActivityItemProps[] = [];

  // Add recent documents
  if (documents && documents.length > 0) {
    const recentDocs = documents.slice(0, 5);
    recentDocs.forEach((doc) => {
      recentActivities.push({
        title: `Document: ${doc.title}`,
        description: `Status: ${doc.status} • ${doc.type}`,
        time: new Date(doc.created_at).toLocaleString(),
        type: "document",
        icon: <FileCheck className="w-5 h-5 text-blue-500" />,
      });
    });
  }

  // Add recent messages
  if (messages && messages.length > 0) {
    const recentMsgs = messages.slice(0, 5);
    recentMsgs.forEach((msg) => {
      recentActivities.push({
        title: `Message from ${msg.sender_name || "Unknown"}`,
        description: msg.content.substring(0, 60) + "...",
        time: new Date(msg.created_at).toLocaleString(),
        type: "message",
        icon: <MessageSquare className="w-5 h-5 text-purple-500" />,
      });
    });
  }

  // Sort by time (most recent first) and limit
  const sortedActivities = recentActivities
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
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
                    Admin Dashboard
                  </h1>
                  <p className="text-xs text-gray-500">
                    Overview of documents and messages
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
                {messageStats.unread > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ─── Stats Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Documents"
            value={documentStats.total}
            icon={<FileText className="w-5 h-5 text-white" />}
            color="bg-blue-500"
            subtitle={`${documentStats.draft} draft, ${documentStats.completed} completed`}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Pending Review"
            value={documentStats.pendingReview}
            icon={<Clock className="w-5 h-5 text-white" />}
            color="bg-amber-500"
            subtitle="Documents awaiting action"
          />
          <StatCard
            title="Total Messages"
            value={messageStats.total}
            icon={<MessageSquare className="w-5 h-5 text-white" />}
            color="bg-purple-500"
            subtitle={`${messageStats.sent} sent, ${messageStats.unread} unread`}
            trend={{ value: 15, isPositive: true }}
          />
          <StatCard
            title="Marked to Me"
            value={documentStats.marked}
            icon={<UserCheck className="w-5 h-5 text-white" />}
            color="bg-green-500"
            subtitle="Documents requiring your attention"
          />
        </div>

        {/* ─── Quick Stats Row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400">Drafts</p>
            <p className="text-lg font-bold text-gray-900">{documentStats.draft}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400">Completed</p>
            <p className="text-lg font-bold text-gray-900">{documentStats.completed}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400">Unread</p>
            <p className="text-lg font-bold text-gray-900">{messageStats.unread}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400">Groups</p>
            <p className="text-lg font-bold text-gray-900">{messageStats.groups}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400">Total Pages</p>
            <p className="text-lg font-bold text-gray-900">
              {documentsPagination?.totalPages || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-400">Active Users</p>
            <p className="text-lg font-bold text-gray-900">
              {groups.reduce((acc, g) => acc + (g.member_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* ─── Two-Column Layout ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left Column ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Quick Actions</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "New Document", icon: <FileText />, color: "bg-blue-50 text-blue-600" },
                  { label: "Compose Message", icon: <MessageSquare />, color: "bg-purple-50 text-purple-600" },
                  { label: "Create Group", icon: <Users />, color: "bg-green-50 text-green-600" },
                  { label: "View Messages", icon: <Inbox />, color: "bg-amber-50 text-amber-600" },
                ].map((action, index) => (
                  <button
                    key={index}
                    className={`p-4 rounded-lg ${action.color} hover:shadow-md transition-all duration-200 text-left`}
                  >
                    <div className="mb-1">{action.icon}</div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
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
                {sortedActivities.length > 0 ? (
                  sortedActivities.map((activity, index) => (
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
            {/* Document Status Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <PieChart className="w-5 h-5 text-indigo-400" />
                <span>Document Status</span>
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Draft</span>
                    <span className="font-medium text-gray-900">{documentStats.draft}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-400 h-2 rounded-full"
                      style={{
                        width: `${documentStats.total > 0 ? (documentStats.draft / documentStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Pending Review</span>
                    <span className="font-medium text-gray-900">{documentStats.pendingReview}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-400 h-2 rounded-full"
                      style={{
                        width: `${documentStats.total > 0 ? (documentStats.pendingReview / documentStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-medium text-gray-900">{documentStats.completed}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{
                        width: `${documentStats.total > 0 ? (documentStats.completed / documentStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Message Groups Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Message Groups</span>
              </h3>
              <div className="space-y-2">
                {groups.slice(0, 5).map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{group.name}</p>
                        <p className="text-xs text-gray-400">{group.group_type}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {group.member_count || 0} members
                    </span>
                  </div>
                ))}
                {groups.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No groups available
                  </div>
                )}
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="font-semibold text-white/90 mb-3">
                Summary Overview
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Total Documents</span>
                  <span className="font-medium">{documentStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Pending Review</span>
                  <span className="font-medium">{documentStats.pendingReview}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Unread Messages</span>
                  <span className="font-medium">{messageStats.unread}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Active Groups</span>
                  <span className="font-medium">{messageStats.groups}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Completion Rate</span>
                  <span className="font-medium">
                    {documentStats.total > 0
                      ? Math.round((documentStats.completed / documentStats.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;