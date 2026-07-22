import React from 'react';
import { NavLink, useMatch, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { logoutUser } from '../../store/slices/authSlice';
import { hasRole, isSuperAdmin } from '../../store/slices/authSlice';
import type { UserRole } from '../../store/slices/authSlice';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  requireSuperAdmin?: boolean;
  minRole?: UserRole;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarLinkProps {
  item: NavItem;
  base: string;
  onClose?: () => void;
}

interface HelpDeskSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const Icon = {
  dashboard: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
    </svg>
  ),
  helpdesk: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  wallet: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  map: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  users: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  fileCheck: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  mail: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  plane: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  calendar: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  home: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
    </svg>
  ),
  logout: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

// ── Nav config ────────────────────────────────────────────────────────────────

const navigationConfig: NavSection[] = [
  {
    title: 'Main',
    items: [
      { to: 'dashboard', label: 'Dashboard', icon: Icon.dashboard },
      { to: 'manage',    label: 'Help Desk', icon: Icon.helpdesk },
      { to: 'documents',    label: 'Documents', icon: Icon.helpdesk },
      { to: 'uploads',    label: 'Document Uploads', icon: Icon.helpdesk },
    ],
  },
  {
    title: 'Communication',
    items: [
      { to: 'messages', label: 'Messages', icon: Icon.wallet },
      { to: 'notices', label: 'Notices & Broadcasts', icon: Icon.wallet },
    ],
  },
  {
    title: 'Planning',
    items: [
      { to: 'calendar',   label: 'Calendar',    icon: Icon.map },
      { to: 'tasks',    label: 'Task Management',     icon: Icon.users },
      { to: 'tickets',    label: 'Tickets & Reports',     icon: Icon.users },
      { to: 'aides',    label: 'Aides',     icon: Icon.users },
    ],
  },
  {
    title: 'Support',
    items: [
      { to: 'inventory', label: 'Inventory',    icon: Icon.mail },
    ],
  },

  {
    title: 'Account',
    items: [
      { to: 'Settings', label: 'Settings',    icon: Icon.mail },
      { to: 'reports', label: 'Reports',    icon: Icon.mail },
    ],
  },
];

// ── Sidebar link ──────────────────────────────────────────────────────────────

const SidebarLink: React.FC<SidebarLinkProps> = ({ item, base, onClose }) => {
  const cls = 'flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200';

  return (
    <NavLink
      to={`${base}/${item.to}`}
      end
      onClick={onClose}
      className={({ isActive }) =>
        `${cls} ${
          isActive
            ? 'bg-[#1E4620] text-white shadow-md'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 group'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            <span className={isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-600 transition-colors'}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </div>
          {item.badge !== undefined && item.badge > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

const HelpDeskSidebar: React.FC<HelpDeskSidebarProps> = ({ isOpen = true, onClose }) => {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const { user }   = useAppSelector((state) => state.auth);
  const superAdmin = isSuperAdmin(user);

  // Resolve the absolute base path so NavLinks always point to the right place
  const match = useMatch('/dept/:deptId/*');
  const base  = match ? `/dept/${match.params.deptId}` : '';

  const visibleSections = navigationConfig
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.requireSuperAdmin) return superAdmin;
        if (item.minRole) return hasRole(user, item.minRole);
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const roleLabel: Record<string, string> = {
    super_admin: 'Registrar',
    dept_head:   'Department Head',
    staff:       'Staff Officer',
    viewer:      'Viewer',
  };

  return (
    <>
      {isOpen === false && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-200 bg-white shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>

        {/* Branding */}
        <div className="flex h-16 lg:h-20 items-center justify-between border-b border-stone-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E4620] to-[#2d6a2f] text-[#C29B38] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight text-stone-900">Help Desk</h2>
              <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">Support Portal</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 text-stone-500 hover:bg-stone-100 lg:hidden"
              aria-label="Close sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                {section.title}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <SidebarLink key={item.to} item={item} base={base} onClose={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-stone-100 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[#1E4620] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-900 truncate">
                {user?.full_name ?? 'Unknown'}
              </p>
              <p className="text-[10px] text-stone-500 truncate">
                {user?.role ? roleLabel[user.role] : 'Staff Officer'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            {Icon.home}
            Back to Home
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            {Icon.logout}
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default HelpDeskSidebar;