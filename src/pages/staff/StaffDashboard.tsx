// src/pages/staff/StaffDashboard.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Package,
  Users,
  Folder,
  Bell,
  Mail,
  Phone,
  MoreVertical,
} from 'lucide-react';

/* ─── DUMMY DATA ──────────────────────────────────────────────────────────── */

// Dummy user data
const dummyUser = {
  name: 'John Doe',
  email: 'john.doe@court.go.ke',
  pjNumber: 'PJ1001',
  role: 'Staff',
  department: 'Judges Help Desk',
  departmentId: 'dept_001',
  phone: '+254 712 345 678',
  joinedDate: '2024-01-15',
};

// Dummy folder/assignment data
const dummyFolders = [
  {
    id: 'folder_001',
    objectiveTitle: 'Case File Management System',
    perspective: 'Core Business / Mandate',
    totalIndicators: 12,
    completed: 7,
    pending: 3,
    overdue: 2,
    assignedAt: '2024-06-01',
  },
  {
    id: 'folder_002',
    objectiveTitle: 'Court Registry Efficiency',
    perspective: 'Internal Process',
    totalIndicators: 8,
    completed: 5,
    pending: 2,
    overdue: 1,
    assignedAt: '2024-06-05',
  },
  {
    id: 'folder_003',
    objectiveTitle: 'Customer Service Excellence',
    perspective: 'Customer Perspective',
    totalIndicators: 6,
    completed: 3,
    pending: 3,
    overdue: 0,
    assignedAt: '2024-06-10',
  },
  {
    id: 'folder_004',
    objectiveTitle: 'Staff Training & Development',
    perspective: 'Innovation & Learning',
    totalIndicators: 5,
    completed: 2,
    pending: 2,
    overdue: 1,
    assignedAt: '2024-06-15',
  },
];

// Dummy recent activities
const dummyActivities = [
  {
    id: 'act_001',
    title: 'Submitted evidence for Case File Management',
    status: 'Pending Review',
    date: '2024-06-22T14:30:00',
    type: 'submission',
  },
  {
    id: 'act_002',
    title: 'Updated progress on Court Registry Efficiency',
    status: 'Completed',
    date: '2024-06-21T10:15:00',
    type: 'update',
  },
  {
    id: 'act_003',
    title: 'New feedback received on Customer Service',
    status: 'Action Required',
    date: '2024-06-20T16:45:00',
    type: 'feedback',
  },
  {
    id: 'act_004',
    title: 'Training module completed',
    status: 'Completed',
    date: '2024-06-19T09:00:00',
    type: 'training',
  },
  {
    id: 'act_005',
    title: 'Overdue: Staff Training documentation',
    status: 'Overdue',
    date: '2024-06-18T11:30:00',
    type: 'overdue',
  },
];

// Dummy notifications
const dummyNotifications = [
  {
    id: 'notif_001',
    title: 'New task assigned',
    message: 'You have been assigned to review Case File Management System',
    time: '2 hours ago',
    read: false,
    priority: 'high',
  },
  {
    id: 'notif_002',
    title: 'Submission approved',
    message: 'Your evidence submission for Court Registry Efficiency has been approved',
    time: '5 hours ago',
    read: false,
    priority: 'medium',
  },
  {
    id: 'notif_003',
    title: 'Overdue reminder',
    message: 'Staff Training documentation is overdue by 2 days',
    time: '1 day ago',
    read: true,
    priority: 'high',
  },
  {
    id: 'notif_004',
    title: 'New feedback received',
    message: 'Feedback on Customer Service Excellence is available for review',
    time: '2 days ago',
    read: true,
    priority: 'low',
  },
];

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: number;
}

const StatCard = ({ label, value, icon: Icon, color, bgColor, trend }: StatCardProps) => (
  <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-3xl font-serif font-bold" style={{ color }}>
          {value}
        </p>
        <p className="text-[9px] font-black uppercase text-stone-400 tracking-wider mt-2">
          {label}
        </p>
      </div>
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <Icon size={20} className={color} />
      </div>
    </div>
    {trend !== undefined && (
      <div className="mt-3 flex items-center gap-1">
        <span className={`text-[10px] font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
        <span className="text-[10px] text-stone-400">from last month</span>
      </div>
    )}
  </div>
);

/* ─── RECENT ACTIVITY ITEM ──────────────────────────────────────────────────── */

interface ActivityItemProps {
  activity: typeof dummyActivities[0];
}

const ActivityItem = ({ activity }: ActivityItemProps) => {
  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      'Pending Review': 'bg-amber-100 text-amber-700 border-amber-200',
      'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Action Required': 'bg-blue-100 text-blue-700 border-blue-200',
      'Overdue': 'bg-red-100 text-red-700 border-red-200',
    };
    return map[status] || 'bg-stone-100 text-stone-700 border-stone-200';
  };

  const getStatusIcon = (status: string) => {
    const map: Record<string, React.ReactNode> = {
      'Pending Review': <Clock size={12} />,
      'Completed': <CheckCircle2 size={12} />,
      'Action Required': <AlertCircle size={12} />,
      'Overdue': <AlertCircle size={12} />,
    };
    return map[status] || <FileText size={12} />;
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors">
      <div className={`p-1.5 rounded-lg border ${getStatusColor(activity.status)}`}>
        {getStatusIcon(activity.status)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-stone-800">{activity.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(activity.status)}`}>
            {activity.status}
          </span>
          <span className="text-[10px] text-stone-400">
            {new Date(activity.date).toLocaleDateString('en-KE', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
      <button className="text-stone-400 hover:text-stone-600 transition-colors">
        <MoreVertical size={16} />
      </button>
    </div>
  );
};

/* ─── NOTIFICATION ITEM ──────────────────────────────────────────────────── */

interface NotificationItemProps {
  notification: typeof dummyNotifications[0];
}

const NotificationItem = ({ notification }: NotificationItemProps) => (
  <div className={`p-3 rounded-xl transition-colors ${notification.read ? 'hover:bg-stone-50' : 'bg-amber-50/50 hover:bg-amber-50'}`}>
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${notification.priority === 'high' ? 'bg-red-500' : notification.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-stone-800">{notification.title}</p>
        <p className="text-[11px] text-stone-600 mt-0.5">{notification.message}</p>
        <p className="text-[9px] text-stone-400 mt-1">{notification.time}</p>
      </div>
      {!notification.read && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
      )}
    </div>
  </div>
);

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */

const StaffDashboard = () => {
  const [user] = useState(dummyUser);
  const [folders] = useState(dummyFolders);
  const [activities] = useState(dummyActivities);
  const [notifications] = useState(dummyNotifications);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  // Calculate stats
  const totalFolders = folders.length;
  const totalIndicators = folders.reduce((acc, f) => acc + f.totalIndicators, 0);
  const totalCompleted = folders.reduce((acc, f) => acc + f.completed, 0);
  const totalPending = folders.reduce((acc, f) => acc + f.pending, 0);
  const totalOverdue = folders.reduce((acc, f) => acc + f.overdue, 0);

  const completionRate = totalIndicators > 0 
    ? Math.round((totalCompleted / totalIndicators) * 100) 
    : 0;

  // Get unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  // Display notifications (limited or all)
  const displayedNotifications = showAllNotifications 
    ? notifications 
    : notifications.slice(0, 3);

  return (
    <div className="p-4 md:p-6">
      {/* Welcome section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1d3331]">
              Welcome back, {user.name.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              You have {totalFolders} folder{totalFolders !== 1 ? 's' : ''} assigned • {totalPending} pending review
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-stone-200 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium text-stone-600">Active</span>
            </div>
            <button className="p-2.5 bg-white rounded-xl border border-stone-200 hover:border-[#1d3331] transition-colors relative">
              <Bell size={18} className="text-stone-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Tasks"
          value={totalIndicators}
          icon={FileText}
          color="#1d3331"
          bgColor="bg-stone-50"
          trend={8}
        />
        <StatCard
          label="Completed"
          value={totalCompleted}
          icon={CheckCircle2}
          color="#3B6D11"
          bgColor="bg-emerald-50"
          trend={12}
        />
        <StatCard
          label="Pending Review"
          value={totalPending}
          icon={Clock}
          color="#BA7517"
          bgColor="bg-amber-50"
          trend={-5}
        />
        <StatCard
          label="Overdue"
          value={totalOverdue}
          icon={AlertCircle}
          color="#E24B4A"
          bgColor="bg-red-50"
          trend={3}
        />
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400">
              Overall Progress
            </h3>
            <p className="text-3xl font-serif font-bold text-[#1d3331] mt-1">
              {completionRate}%
            </p>
            <p className="text-[11px] text-stone-500">
              {totalCompleted} of {totalIndicators} tasks completed
            </p>
          </div>
          <div className="flex-1 max-w-md">
            <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-[#1d3331]"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-stone-400 mt-1.5">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Folders & Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link
              to="/staff/inventory"
              className="bg-white p-4 rounded-2xl border border-stone-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#1d3331]/10 text-[#1d3331]">
                  <Package size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#1d3331] group-hover:text-emerald-700 transition-colors">
                    Inventory
                  </p>
                  <p className="text-[9px] text-stone-400">View items</p>
                </div>
              </div>
            </Link>
            <Link
              to="/staff/requests"
              className="bg-white p-4 rounded-2xl border border-stone-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#1d3331] group-hover:text-emerald-700 transition-colors">
                    Requests
                  </p>
                  <p className="text-[9px] text-stone-400">{totalPending} pending</p>
                </div>
              </div>
            </Link>
            <Link
              to="/staff/users"
              className="bg-white p-4 rounded-2xl border border-stone-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Users size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-[#1d3331] group-hover:text-emerald-700 transition-colors">
                    Team
                  </p>
                  <p className="text-[9px] text-stone-400">View members</p>
                </div>
              </div>
            </Link>
          </div>

          {/* My Folders */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-serif font-bold text-[#1d3331]">
                My Folders ({totalFolders})
              </h3>
              <Link
                to="/staff/folders"
                className="text-[9px] font-bold text-stone-400 hover:text-[#1d3331] transition-colors flex items-center gap-1"
              >
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="space-y-3">
              {folders.map((folder) => (
                <Link
                  key={folder.id}
                  to={`/staff/folders/${folder.id}`}
                  className="block bg-white p-4 rounded-2xl border border-stone-200 hover:shadow-md hover:border-emerald-200 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Folder size={14} className="text-[#1d3331]" />
                        <h4 className="text-[13px] font-bold text-[#1d3331] truncate">
                          {folder.objectiveTitle}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-stone-500">
                        <span>{folder.perspective}</span>
                        <span>•</span>
                        <span>{folder.totalIndicators} tasks</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-600 font-bold">{folder.completed} done</span>
                        <span className="text-amber-600 font-bold">{folder.pending} pending</span>
                        {folder.overdue > 0 && (
                          <span className="text-red-600 font-bold">{folder.overdue} overdue</span>
                        )}
                      </div>
                      <div className="w-20">
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1d3331]"
                            style={{ width: `${(folder.completed / folder.totalIndicators) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Notifications & Activity */}
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1d3331] text-white flex items-center justify-center font-serif font-bold text-xl">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[15px] font-serif font-bold text-[#1d3331]">{user.name}</h4>
                <p className="text-[10px] font-medium text-stone-500 capitalize">{user.role}</p>
                <p className="text-[9px] text-stone-400">{user.department}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-[10px] text-stone-500">
                <Mail size={12} className="text-stone-400" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-stone-500">
                <Phone size={12} className="text-stone-400" />
                <span>{user.phone}</span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[8px] rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowAllNotifications(!showAllNotifications)}
                className="text-[9px] font-bold text-stone-400 hover:text-[#1d3331] transition-colors"
              >
                {showAllNotifications ? 'Show less' : 'View all'}
              </button>
            </div>
            <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
              {displayedNotifications.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-4">No notifications</p>
              ) : (
                displayedNotifications.map((notif) => (
                  <NotificationItem key={notif.id} notification={notif} />
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-stone-400">
                Recent Activity
              </h3>
            </div>
            <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
              {activities.slice(0, 4).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;