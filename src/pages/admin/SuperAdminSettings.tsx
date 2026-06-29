// src/pages/super-admin/SuperAdminSettings.tsx
import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  selectAllDepartments,
  selectDepartmentsListLoading,
  selectDepartmentMutating,
  selectDepartmentsError,
  selectDepartmentsSuccess,
  clearError,
  clearSuccess,
  type DepartmentWithUserCount,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from '../../store/slices/departmentsSlice';
import {
  fetchUsers,
  selectAllUsers,
  selectUsersListLoading,
  type UserRole,
} from '../../store/slices/userSlice';
import {
  Settings,
  Building2,
  Users,
  Shield,
  Bell,
  Palette,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Search,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsTab = 'general' | 'departments' | 'users' | 'roles' | 'notifications' | 'appearance';

// ─── Sub-Components ──────────────────────────────────────────────────────────

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-8 w-8 animate-spin text-[#1E4620]" />
  </div>
);

// ─── General Settings Tab ────────────────────────────────────────────────────

const GeneralSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState({
    siteName: 'Stuff Management System',
    siteDescription: 'Manage inventory, requests, and team members',
    timezone: 'Africa/Nairobi',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle save settings
    console.log('Saving settings:', settings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-900">General Settings</h3>
        <p className="text-sm text-stone-500">Configure general application settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Site Name
            </label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Site Description
            </label>
            <input
              type="text"
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            >
              <option value="Africa/Nairobi">Africa/Nairobi</option>
              <option value="Africa/Lagos">Africa/Lagos</option>
              <option value="Africa/Cairo">Africa/Cairo</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Date Format
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Time Format
            </label>
            <select
              value={settings.timeFormat}
              onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="bg-[#1E4620] text-white px-6 py-2 rounded-lg hover:bg-[#163a18] transition-colors text-sm font-medium"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

// ─── Departments Tab ─────────────────────────────────────────────────────────

const DepartmentsTab: React.FC = () => {
  const dispatch = useAppDispatch();
  const departments = useAppSelector(selectAllDepartments);
  const loading = useAppSelector(selectDepartmentsListLoading);
  const mutating = useAppSelector(selectDepartmentMutating);
  const error = useAppSelector(selectDepartmentsError);
  const success = useAppSelector(selectDepartmentsSuccess);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithUserCount | null>(null);
  const [formData, setFormData] = useState<CreateDepartmentInput>({
    name: '',
    code: '',
  });

  useEffect(() => {
    dispatch(fetchDepartments({}));
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
      return () => clearTimeout(timer);
    }
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error, dispatch]);

  const handleOpenModal = (department?: DepartmentWithUserCount) => {
    if (department) {
      setEditingDepartment(department);
      setFormData({ name: department.name, code: department.code || '' });
    } else {
      setEditingDepartment(null);
      setFormData({ name: '', code: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setFormData({ name: '', code: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDepartment) {
      await dispatch(updateDepartment({
        id: editingDepartment.id,
        data: formData as UpdateDepartmentInput,
      })).unwrap();
    } else {
      await dispatch(createDepartment(formData)).unwrap();
    }
    handleCloseModal();
    dispatch(fetchDepartments({}));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      await dispatch(deleteDepartment(id)).unwrap();
      dispatch(fetchDepartments({}));
    }
  };

  if (loading && departments.length === 0) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Departments</h3>
          <p className="text-sm text-stone-500">Manage departments and their members</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#1E4620] text-white px-4 py-2 rounded-lg hover:bg-[#163a18] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
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
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
          <span>✓ Department updated successfully</span>
          <button onClick={() => dispatch(clearSuccess())} className="text-emerald-400 hover:text-emerald-600">
            ×
          </button>
        </div>
      )}

      {/* Departments List */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Members</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {departments.map((dept) => (
              <tr key={dept.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-4 py-3 font-medium text-stone-800">{dept.name}</td>
                <td className="px-4 py-3 text-stone-600">{dept.code || '—'}</td>
                <td className="px-4 py-3 text-stone-600">{dept.user_count}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    dept.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenModal(dept)}
                      className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-stone-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-900">
                {editingDepartment ? 'Edit Department' : 'Add Department'}
              </h3>
              <button onClick={handleCloseModal} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Department Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., IT, HR, FIN"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] uppercase"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutating}
                  className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] transition-colors disabled:opacity-50"
                >
                  {mutating ? 'Saving...' : (editingDepartment ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Users Tab ──────────────────────────────────────────────────────────────

const UsersTab: React.FC = () => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const loading = useAppSelector(selectUsersListLoading);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(fetchUsers({}));
  }, [dispatch]);

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && users.length === 0) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-900">User Management</h3>
        <p className="text-sm text-stone-500">View and manage all users in the system</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#1E4620] focus:ring-1 focus:ring-[#1E4620]"
        />
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">PJ Number</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-stone-800">{user.full_name}</td>
                  <td className="px-4 py-3 text-stone-600">{user.email}</td>
                  <td className="px-4 py-3 text-stone-600">{user.pj_number}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Roles Tab ──────────────────────────────────────────────────────────────

const RolesTab: React.FC = () => {
  const roles: { role: UserRole; description: string; permissions: string[] }[] = [
    {
      role: 'super_admin',
      description: 'Full system access with all permissions',
      permissions: ['All permissions'],
    },
    {
      role: 'dept_head',
      description: 'Department management and approval access',
      permissions: ['Manage department', 'Approve requests', 'View reports'],
    },
    {
      role: 'staff',
      description: 'Standard staff access for daily tasks',
      permissions: ['Create requests', 'View inventory', 'View reports'],
    },
    {
      role: 'viewer',
      description: 'Read-only access to view content',
      permissions: ['View inventory', 'View reports'],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-900">Roles & Permissions</h3>
        <p className="text-sm text-stone-500">Manage system roles and their permissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <div key={role.role} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-[#1E4620]" />
              <h4 className="font-semibold text-stone-800 capitalize">
                {role.role.replace('_', ' ')}
              </h4>
            </div>
            <p className="text-sm text-stone-500 mb-3">{role.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map((perm) => (
                <span key={perm} className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                  {perm}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Notifications Tab ──────────────────────────────────────────────────────

const NotificationsTab: React.FC = () => {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    requestApprovals: true,
    stockAlerts: true,
    systemUpdates: false,
    weeklyDigest: true,
  });

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-900">Notification Preferences</h3>
        <p className="text-sm text-stone-500">Configure how you receive notifications</p>
      </div>

      <div className="space-y-4">
        {[
          { key: 'emailNotifications', label: 'Email Notifications' },
          { key: 'pushNotifications', label: 'Push Notifications' },
          { key: 'requestApprovals', label: 'Request Approvals' },
          { key: 'stockAlerts', label: 'Stock Alerts' },
          { key: 'systemUpdates', label: 'System Updates' },
          { key: 'weeklyDigest', label: 'Weekly Digest' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-stone-100">
            <span className="text-sm text-stone-700">{label}</span>
            <button
              onClick={() => handleToggle(key as keyof typeof preferences)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                preferences[key as keyof typeof preferences] ? 'bg-[#1E4620]' : 'bg-stone-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences[key as keyof typeof preferences] ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <button className="bg-[#1E4620] text-white px-6 py-2 rounded-lg hover:bg-[#163a18] transition-colors text-sm font-medium">
        Save Preferences
      </button>
    </div>
  );
};

// ─── Appearance Tab ─────────────────────────────────────────────────────────

const AppearanceTab: React.FC = () => {
  const [theme, setTheme] = useState('light');
  const [primaryColor, setPrimaryColor] = useState('#1E4620');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-stone-900">Appearance</h3>
        <p className="text-sm text-stone-500">Customize the look and feel of the application</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Theme</label>
          <div className="flex gap-3">
            {['light', 'dark', 'system'].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  theme === t
                    ? 'border-[#1E4620] bg-[#1E4620] text-white'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Primary Color</label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border border-stone-200"
            />
            <span className="text-sm text-stone-600">{primaryColor}</span>
          </div>
        </div>
      </div>

      <button className="bg-[#1E4620] text-white px-6 py-2 rounded-lg hover:bg-[#163a18] transition-colors text-sm font-medium">
        Apply Theme
      </button>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const SuperAdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> },
    { key: 'departments', label: 'Departments', icon: <Building2 className="w-4 h-4" /> },
    { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { key: 'roles', label: 'Roles', icon: <Shield className="w-4 h-4" /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { key: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettingsTab />;
      case 'departments':
        return <DepartmentsTab />;
      case 'users':
        return <UsersTab />;
      case 'roles':
        return <RolesTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'appearance':
        return <AppearanceTab />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage system settings and configurations
        </p>
      </div>

      {/* Settings Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden sticky top-4">
            <div className="p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[#1E4620] text-white'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;