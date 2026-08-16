// ============================================================
// src/features/station-engagement/components/RegistrySidebar.tsx
// ============================================================

import React from 'react';
import { NavLink, useMatch, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle,
  Clock,
  FileCheck,
  TrendingUp,
  Calendar,
  Home,
  LogOut,
  BoxIcon,
  Calendar1,
  Book,
} from 'lucide-react';
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

interface RegistrySidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// ── Nav config ────────────────────────────────────────────────────────────────
// NOTE: every `to` here must have a matching <Route path="..."> registered
// under the 'pr' desk block in DeptDeskGateway.tsx, or it'll fall through to
// the `*` catch-all and bounce back to dashboard.

const navigationConfig: NavSection[] = [
  {
    title: 'Main',
    items: [
      { to: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
      { to: 'documents', label: 'Documents', icon: <BoxIcon className="h-4 w-4" /> },
      { to: 'memoandletters', label: 'Memo and letters', icon: <BoxIcon className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Reports',
    items: [
      { to: 'reports/month', label: 'Monthly Reports', icon: <Calendar className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Communication',
    items: [
      { to: 'messages', label: 'Messages', icon: <Clock className="h-4 w-4" />, badge: 3 },
      { to: 'notices', label: 'Notices and Broadcast', icon: <CheckCircle className="h-4 w-4" />, badge: 7 },
    ],
  },

    {
    title: 'planning',
    items: [
      { to: 'calendar', label: 'Calendar', icon: <Calendar1 className="h-4 w-4" />, badge: 3 },
      { to: 'task-management', label: 'Task Management', icon: <Book className="h-4 w-4" />, badge: 7 },
    ],
  },

  {
    title: 'Insights',
    items: [
      { to: 'stats', label: 'Statistics', icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
];

// ── Sidebar link ──────────────────────────────────────────────────────────────

const SidebarLink: React.FC<SidebarLinkProps> = ({ item, base, onClose }) => {
  const cls =
    'flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200';

  return (
    <NavLink
      to={`${base}/${item.to}`}
      end
      onClick={onClose}
      className={({ isActive }) =>
        `${cls} ${
          isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white group'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            <span className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-white transition-colors'}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </div>
          {item.badge !== undefined && item.badge > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

const RegistrySidebar: React.FC<RegistrySidebarProps> = ({ isOpen = true, onClose }) => {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const { user }   = useAppSelector((state) => state.auth);
  const superAdmin = isSuperAdmin(user);

  // Resolve the absolute base path so NavLinks always point at the route
  // actually mounted for this dept (e.g. /dept/abc123), never a hardcoded
  // top-level path like /registry/*.
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
    dept_head: 'Department Head',
    staff: 'Staff Officer',
    viewer: 'Viewer',
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-900 text-white shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding */}
        <div className="flex h-16 lg:h-20 items-center justify-between border-b border-gray-800 px-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Station Registry</h1>
              <p className="text-xs text-gray-400">Engagement Reports</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-800 lg:hidden"
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
              <p className="mb-2 px-3 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
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
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-gray-800/60 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name ?? 'Unknown'}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {user?.role ? roleLabel[user.role] : 'Registry Officer'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default RegistrySidebar;