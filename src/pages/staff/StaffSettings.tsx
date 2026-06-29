import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchCurrentUser,
  updateCurrentUser,
  selectCurrentUser,
  selectUsersProfileLoading,
  selectUsersMutating,
  selectIsSuperAdmin,
} from '../../store/slices/userSlice';
import { logoutUser as authLogout } from '../../store/slices/authSlice';
import {
  User,
  Lock,
  Bell,
  Shield,
  LogOut,
  CheckCircle,
  Loader2,
  ChevronRight,
  Building2,
  BadgeCheck,
  Save,
} from 'lucide-react';

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 ' +
  'placeholder:text-stone-400 focus:border-[#1a3d1c] focus:bg-white focus:outline-none ' +
  'focus:ring-1 focus:ring-[#1a3d1c] transition disabled:opacity-50 disabled:cursor-not-allowed';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {children}
      {required && <span className="ml-1 text-red-400">*</span>}
    </label>
  );
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex items-start gap-3 border-b border-stone-100 px-5 py-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1a3d1c]/[0.08] text-[#1a3d1c]">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          <p className="mt-0.5 text-xs text-stone-500">{description}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function StatusBadge({ role }: { role: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    super_admin: { bg: 'bg-purple-50',  text: 'text-purple-700',  label: 'Super Admin' },
    dept_head:   { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Dept Head'   },
    staff:       { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Staff'       },
    viewer:      { bg: 'bg-stone-100',  text: 'text-stone-600',   label: 'Viewer'      },
  };
  const s = styles[role] ?? styles.viewer;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <BadgeCheck size={12} />
      {s.label}
    </span>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'account' | 'notifications' | 'security';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Profile',        icon: <User size={15} /> },
  { id: 'account',       label: 'Account',         icon: <Shield size={15} /> },
  { id: 'notifications', label: 'Notifications',   icon: <Bell size={15} /> },
  { id: 'security',      label: 'Security',        icon: <Lock size={15} /> },
];

// ─── Profile Tab ─────────────────────────────────────────────────────────────
// Toast calls live inside the async handler — no setState-in-effect cascade.

function ProfileTab() {
  const dispatch = useAppDispatch();
  const user     = useAppSelector(selectCurrentUser);
  const mutating = useAppSelector(selectUsersMutating);

  const [form, setForm] = useState({ full_name: '', email: '' });

  // Sync form when user data first loads (or changes externally).
  // This effect only sets local form state from an external source (Redux store),
  // which is the legitimate use case React allows.
  const initialised = useRef(false);
  useEffect(() => {
    if (user && !initialised.current) {
      setForm({ full_name: user.full_name, email: user.email });
      initialised.current = true;
    }
  }, [user]);

  const isDirty =
    form.full_name !== (user?.full_name ?? '') ||
    form.email     !== (user?.email     ?? '');

  const handleSave = async () => {
    if (!isDirty) return;
    const payload: { full_name?: string; email?: string } = {};
    if (form.full_name !== user?.full_name) payload.full_name = form.full_name.trim();
    if (form.email     !== user?.email)     payload.email     = form.email.trim();

    // unwrap() throws on rejection, so toast.promise handles both branches imperatively
    toast.promise(
      dispatch(updateCurrentUser(payload)).unwrap(),
      {
        loading: 'Saving changes…',
        success: 'Profile updated successfully.',
        error:   (err: unknown) =>
          typeof err === 'string' ? err : 'Failed to update profile.',
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Read-only identity block */}
      <SectionCard
        title="Your identity"
        description="Your role and department are managed by an administrator."
        icon={<BadgeCheck size={16} />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">PJ Number</p>
            <p className="mt-1 text-sm font-medium text-stone-800">{user?.pj_number ?? '—'}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Role</p>
            <div className="mt-1.5">
              {user?.role ? <StatusBadge role={user.role} /> : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Department</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-stone-800">
              <Building2 size={13} className="text-stone-400" />
              {user?.department_id ? 'Assigned' : 'None'}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Editable fields */}
      <SectionCard
        title="Personal details"
        description="Update your display name and contact email."
        icon={<User size={16} />}
      >
        <div className="space-y-3">
          <div>
            <FieldLabel required>Full name</FieldLabel>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
              className={inputClasses}
              disabled={mutating}
            />
          </div>
          <div>
            <FieldLabel required>Email address</FieldLabel>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              className={inputClasses}
              disabled={mutating}
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={mutating || !isDirty || !form.full_name.trim() || !form.email.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save changes
            </button>
          </div>
        </div>
      </SectionCard>

      {user?.last_login && (
        <p className="text-right text-xs text-stone-400">
          Last login: {new Date(user.last_login).toLocaleString('en-KE')}
        </p>
      )}
    </div>
  );
}

// ─── Account Tab ──────────────────────────────────────────────────────────────

function AccountTab() {
  const dispatch     = useAppDispatch();
  const user         = useAppSelector(selectCurrentUser);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const [confirming, setConfirming] = useState(false);

  const handleLogout = () => {
    dispatch(authLogout());
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Account information"
        description="A summary of your account status."
        icon={<Shield size={16} />}
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="text-stone-500">Account status</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium
                ${user?.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${user?.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {user?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="text-stone-500">Member since</span>
            <span className="font-medium text-stone-800">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Access level</span>
            {user?.role ? <StatusBadge role={user.role} /> : '—'}
          </div>
        </div>
      </SectionCard>

      {isSuperAdmin && (
        <SectionCard
          title="Administrator access"
          description="You have full system access. Changes you make affect all users."
          icon={<Shield size={16} />}
        >
          <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 p-3 text-xs text-purple-700">
            <Shield size={13} className="mt-0.5 shrink-0" />
            Super admin privileges are active. Manage users and departments from the Admin panel.
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Sign out"
        description="Sign out of your session on this device."
        icon={<LogOut size={16} />}
      >
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={14} />
            Sign out
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-600">Are you sure you want to sign out?</p>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <LogOut size={14} />
                Yes, sign out
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

type NotifKey = 'email_events' | 'email_deadlines' | 'email_team' | 'browser_tasks';

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<NotifKey, boolean>>({
    email_events:    true,
    email_deadlines: true,
    email_team:      false,
    browser_tasks:   false,
  });

  const toggle = (key: NotifKey) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleSave = () => {
    // Wire to your notifications API when available — use toast.promise then
    toast.success('Preferences saved.');
  };

  const rows: { key: NotifKey; label: string; description: string }[] = [
    { key: 'email_events',    label: 'Event reminders',    description: 'Email me before hearings and meetings.'             },
    { key: 'email_deadlines', label: 'Deadline alerts',    description: 'Email me when a deadline is approaching.'           },
    { key: 'email_team',      label: 'Team updates',       description: 'Email me when team members act on shared events.'   },
    { key: 'browser_tasks',   label: 'Task notifications', description: 'Show browser notifications for task updates.'       },
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title="Email and browser notifications"
        description="Choose what you hear about, and how."
        icon={<Bell size={16} />}
      >
        <div className="divide-y divide-stone-100">
          {rows.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-stone-800">{label}</p>
                <p className="text-xs text-stone-500">{description}</p>
              </div>
              <button
                role="switch"
                aria-checked={prefs[key]}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3d1c]
                  ${prefs[key] ? 'bg-[#1a3d1c]' : 'bg-stone-200'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform
                    ${prefs[key] ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end border-t border-stone-100 pt-4">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
          >
            <Save size={14} />
            Save preferences
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [showSessions, setShowSessions] = useState(false);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Authentication"
        description="Your account uses OTP-based sign-in — no password to manage."
        icon={<Lock size={16} />}
      >
        <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle size={13} className="mt-0.5 shrink-0" />
          OTP authentication is active. A one-time code is sent to your registered contact each time you sign in.
        </div>
      </SectionCard>

      <SectionCard
        title="Active sessions"
        description="Review devices that have accessed your account."
        icon={<Shield size={16} />}
      >
        <button
          onClick={() => setShowSessions(s => !s)}
          className="flex w-full items-center justify-between text-sm text-stone-700 hover:text-stone-900"
        >
          <span className="font-medium">View active sessions</span>
          <ChevronRight
            size={15}
            className={`text-stone-400 transition-transform ${showSessions ? 'rotate-90' : ''}`}
          />
        </button>

        {showSessions && (
          <div className="mt-3 rounded-lg border border-stone-100 bg-stone-50 p-3 text-xs text-stone-500">
            Session management will be available in a future update. If you suspect unauthorised
            access, sign out and contact your system administrator immediately.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffSettings: React.FC = () => {
  const dispatch       = useAppDispatch();
  const user           = useAppSelector(selectCurrentUser);
  const profileLoading = useAppSelector(selectUsersProfileLoading);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  useEffect(() => {
    if (!user) dispatch(fetchCurrentUser());
  }, [dispatch, user]);

  const tabContent: Record<Tab, React.ReactNode> = {
    profile:       <ProfileTab />,
    account:       <AccountTab />,
    notifications: <NotificationsTab />,
    security:      <SecurityTab />,
  };

  return (
    <div className="min-h-screen w-full bg-stone-50 p-6">
      {/* react-hot-toast portal — position once at the page root */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '10px',
            fontSize:     '13px',
            background:   '#fff',
            color:        '#1c1917',
            boxShadow:    '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage your profile, notifications and account preferences.
        </p>
      </div>

      {profileLoading && !user ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin text-[#c9a84c]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">

          {/* Sidebar nav */}
          <nav className="space-y-1">
            {/* Avatar block */}
            <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1a3d1c] text-lg font-bold text-[#c9a84c]">
                {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-stone-900">
                {user?.full_name ?? '—'}
              </p>
              <p className="truncate text-xs text-stone-500">{user?.email ?? '—'}</p>
              {user?.role && (
                <div className="mt-2 flex justify-center">
                  <StatusBadge role={user.role} />
                </div>
              )}
            </div>

            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition
                  ${activeTab === tab.id
                    ? 'bg-[#1a3d1c] text-white'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <ChevronRight size={14} className="ml-auto opacity-60" />
                )}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div>{tabContent[activeTab]}</div>
        </div>
      )}
    </div>
  );
};

export default StaffSettings;