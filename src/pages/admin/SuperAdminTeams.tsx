// src/pages/super-admin/SuperAdminTeams.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchUsers,
  fetchUserStats,
  selectAllUsers,
  selectUserStats,
  selectUsersListLoading,
  selectUsersError,
  selectUsersSuccess,
  clearError,
  clearSuccess,
  type User,
  type UserRole,
} from '../../store/slices/userSlice';
import {
  fetchDepartments,
  selectAllDepartments,
  selectDepartmentsListLoading,
  type DepartmentWithUserCount,
} from '../../store/slices/departmentsSlice';
import { 
  Users, 
  Calendar, 
  Building2,
  Search,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  UserCircle,
  BadgeCheck,
  UserX,
  RefreshCw,
  Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'super_admin' | 'dept_head' | 'staff' | 'viewer';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  dept_head: 'Department Head',
  staff: 'Staff',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  dept_head: 'bg-blue-100 text-blue-700',
  staff: 'bg-emerald-100 text-emerald-700',
  viewer: 'bg-stone-100 text-stone-600',
};

const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StatsCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
}> = ({ label, value, icon, color, loading }) => (
  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-stone-500 font-medium">{label}</p>
        {loading ? (
          <div className="h-8 w-16 mt-1 animate-pulse rounded bg-stone-100" />
        ) : (
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color.replace('text', 'bg').replace('-700', '-100')}`}>
        {icon}
      </div>
    </div>
  </div>
);

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => (
  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>
    {ROLE_LABELS[role]}
  </span>
);

const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
    isActive 
      ? 'bg-emerald-100 text-emerald-700' 
      : 'bg-red-100 text-red-700'
  }`}>
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-8 w-8 animate-spin text-[#1E4620]" />
  </div>
);

// ─── User Card Component ─────────────────────────────────────────────────────

const UserCard: React.FC<{ user: User }> = ({ user }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-stone-200 hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#1E4620] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-stone-900 text-sm">
                  {user.full_name}
                </h4>
                <RoleBadge role={user.role} />
                <StatusBadge isActive={user.is_active} />
              </div>
              <p className="text-sm text-stone-500 truncate">{user.email}</p>
              <p className="text-xs text-stone-400">PJ: {user.pj_number}</p>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-stone-600">
                      <Building2 className="w-4 h-4 text-stone-400" />
                      <span>Department: {user.department_id || 'Not Assigned'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-600">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <span>Joined: {formatDate(user.created_at)}</span>
                    </div>
                    {user.last_login && (
                      <div className="flex items-center gap-2 text-stone-600">
                        <RefreshCw className="w-4 h-4 text-stone-400" />
                        <span>Last Login: {formatDate(user.last_login)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-start gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-stone-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-stone-500" />
              )}
            </button>
            <button className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
              <MoreVertical className="w-4 h-4 text-stone-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Department Group Component ─────────────────────────────────────────────

const DepartmentGroup: React.FC<{
  department: DepartmentWithUserCount | null;
  users: User[];
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ department, users, isExpanded, onToggle }) => {
  const activeUsers = users.filter(u => u.is_active).length;
  const userCount = users.length;

  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Department Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-stone-600" />
          <div className="text-left">
            <h3 className="font-semibold text-stone-800">
              {department ? department.name : 'Unassigned'}
            </h3>
            {department && (
              <p className="text-xs text-stone-500">
                Code: {department.code || 'N/A'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <span>{userCount} {userCount === 1 ? 'member' : 'members'}</span>
            <span className="hidden sm:inline">
              • {activeUsers} active
            </span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-stone-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-stone-400" />
          )}
        </div>
      </button>

      {/* Department Users */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-stone-100">
          {users.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">
              No users in this department
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 mt-3">
              {users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const SuperAdminTeams: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const users = useAppSelector(selectAllUsers);
  const stats = useAppSelector(selectUserStats);
  const departments = useAppSelector(selectAllDepartments);
  const loadingUsers = useAppSelector(selectUsersListLoading);
  const loadingDepartments = useAppSelector(selectDepartmentsListLoading);
  const error = useAppSelector(selectUsersError);
  const success = useAppSelector(selectUsersSuccess);

  // ── Local State ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState<TabKey>('all');
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

  // ── Initial Fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchUsers({}));
    dispatch(fetchUserStats());
    dispatch(fetchDepartments({}));
  }, [dispatch]);

  // ── Auto-clear messages ────────────────────────────────────────────────────
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // ── Filter Users ───────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = users;

    // Filter by role
    if (activeRole !== 'all') {
      result = result.filter(user => user.role === activeRole);
    }

    // Filter by active status
    if (!showInactive) {
      result = result.filter(user => user.is_active);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(user => 
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.pj_number.toLowerCase().includes(query)
      );
    }

    return result;
  }, [users, activeRole, showInactive, searchQuery]);

  // ── Group Users by Department ─────────────────────────────────────────────
  const groupedUsers = useMemo(() => {
    const groups: { [key: string]: User[] } = {};
    
    // Initialize groups for all departments
    departments.forEach(dept => {
      groups[dept.id] = [];
    });
    groups['unassigned'] = [];

    // Assign users to groups
    filteredUsers.forEach(user => {
      const key = user.department_id || 'unassigned';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(user);
    });

    // Sort users within each group by name
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.full_name.localeCompare(b.full_name));
    });

    return groups;
  }, [filteredUsers, departments]);

  // ── Toggle Department Expansion ──────────────────────────────────────────
  const toggleDepartment = useCallback((deptId: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  }, []);

  // ── Expand/Collapse All ───────────────────────────────────────────────────
  const toggleAllDepartments = useCallback(() => {
    const allDeptIds = Object.keys(groupedUsers).filter(id => groupedUsers[id].length > 0);
    if (allDeptIds.length === 0) return;

    const allExpanded = allDeptIds.every(id => expandedDepartments.has(id));
    const newSet = new Set(expandedDepartments);
    
    if (allExpanded) {
      allDeptIds.forEach(id => newSet.delete(id));
    } else {
      allDeptIds.forEach(id => newSet.add(id));
    }
    setExpandedDepartments(newSet);
  }, [groupedUsers, expandedDepartments]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const statsData = useMemo(() => {
    // If we have stats from the API, use them
    if (stats) {
      const byRole = stats.byRole.reduce((acc, item) => {
        acc[item.role] = item.count;
        return acc;
      }, {} as Record<UserRole, number>);
      
      return {
        total: stats.totalUsers,
        active: stats.activeUsers,
        byRole,
      };
    }
    
    // Fallback to local calculation
    const total = users.length;
    const active = users.filter(u => u.is_active).length;
    const byRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<UserRole, number>);

    return { total, active, byRole };
  }, [stats, users]);

  const isLoading = loadingUsers || loadingDepartments;

  // ── Role Tabs ──────────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All Teams', icon: <Users className="w-4 h-4" /> },
    { key: 'super_admin', label: 'Super Admins', icon: <BadgeCheck className="w-4 h-4" /> },
    { key: 'dept_head', label: 'Department Heads', icon: <Building2 className="w-4 h-4" /> },
    { key: 'staff', label: 'Staff', icon: <UserCircle className="w-4 h-4" /> },
    { key: 'viewer', label: 'Viewers', icon: <UserCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif uppercase text-stone-900">Team Management</h1>
          <p className="text-sm text-stone-500 font-serif mt-1">
            Manage users across departments and roles
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600">
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="rounded-lg font-serif bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
          <span>✓ Users updated successfully</span>
          <button onClick={() => dispatch(clearSuccess())} className="text-emerald-400 hover:text-emerald-600">
            ×
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 font-serif lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Users"
          value={statsData.total}
          icon={<Users className="w-5 h-5 text-stone-600" />}
          color="text-stone-700"
          loading={isLoading}
        />
        <StatsCard
          label="Active Users"
          value={statsData.active}
          icon={<UserCircle className="w-5 h-5 text-emerald-600" />}
          color="text-emerald-700"
          loading={isLoading}
        />
        <StatsCard
          label="Departments"
          value={departments.length}
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          color="text-blue-700"
          loading={isLoading}
        />
        <StatsCard
          label="Inactive Users"
          value={statsData.total - statsData.active}
          icon={<UserX className="w-5 h-5 text-red-600" />}
          color="text-red-700"
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or PJ number..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#1E4620] focus:ring-1 focus:ring-[#1E4620] transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Show Inactive Toggle */}
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-stone-300 text-[#1E4620] focus:ring-[#1E4620]"
              />
              Show inactive
            </label>

            {/* Expand/Collapse All */}
            <button
              onClick={toggleAllDepartments}
              className="text-sm text-stone-500 hover:text-stone-700 font-medium"
            >
              {Object.keys(groupedUsers).some(id => groupedUsers[id].length > 0 && expandedDepartments.has(id))
                ? 'Collapse All'
                : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Role Tabs */}
        <div className="flex flex-wrap font-serif items-center gap-1 mt-4 border-t border-stone-100 pt-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveRole(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                activeRole === tab.key
                  ? 'bg-[#1E4620] text-white border-[#1E4620]'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key !== 'all' && statsData.byRole[tab.key as UserRole] !== undefined && (
                <span className={`ml-1 text-[10px] ${
                  activeRole === tab.key ? 'text-white/80' : 'text-stone-400'
                }`}>
                  ({statsData.byRole[tab.key as UserRole] || 0})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && users.length === 0 && <Spinner />}

      {/* Department Groups */}
      {!isLoading && (
        <div className="space-y-3 font-serif">
          {Object.keys(groupedUsers)
            .filter(id => groupedUsers[id].length > 0)
            .map((deptId) => {
              const department = departments.find(d => d.id === deptId);
              const usersInDept = groupedUsers[deptId];
              const isExpanded = expandedDepartments.has(deptId);

              return (
                <DepartmentGroup
                  key={deptId}
                  department={department || null}
                  users={usersInDept}
                  isExpanded={isExpanded}
                  onToggle={() => toggleDepartment(deptId)}
                />
              );
            })}

          {/* Empty State */}
          {Object.keys(groupedUsers).every(id => groupedUsers[id].length === 0) && (
            <div className="text-center font-serif py-12 bg-white rounded-xl border border-stone-200">
              <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500">No users found matching your filters</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveRole('all');
                  setShowInactive(true);
                }}
                className="mt-2 text-sm text-[#1E4620] font-medium hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuperAdminTeams;