// src/components/layout/JudicialOfficerSidebar.tsx
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hook';
import { hasRole } from '../../store/slices/authSlice';
import type { UserRole } from '../../store/slices/authSlice';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavChild {
  to: (deptId: string) => string;
  label: string;
}

interface NavItem {
  to: (deptId: string) => string;
  label: string;
  minRole?: UserRole;
  badge?: number;
  icon: React.ReactNode;
  children?: NavChild[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarLinkProps {
  item: NavItem;
  deptId: string;
  onClose?: () => void;
}

interface JudicialOfficerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const Icon = {
  dashboard: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
    </svg>
  ),
  cases: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  calendar: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  messages: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  tasks: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
};

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

// ── Nav config ────────────────────────────────────────────────────────────────

const navigationConfig: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: (id) => `/judicial/${id}/dashboard`, label: 'Dashboard', icon: Icon.dashboard },
    ],
  },
  {
    title: 'Case Management',
    items: [
      { to: (id) => `/judicial/${id}/my-causes`, label: 'Cause List & Hearings', icon: Icon.calendar },
      {
        to: (id) => `/judicial/${id}/cases`,
        label: 'Case Files',
        icon: Icon.cases,
        children: [
          { to: (id) => `/judicial/${id}/cases/active`, label: 'Active Trials' },
          { to: (id) => `/judicial/${id}/cases/judgments`, label: 'Pending Judgments' },
        ],
      },
    ],
  },
  {
    title: 'Chamber Activities',
    items: [
      { to: (id) => `/judicial/${id}/messages`, label: 'Inter-Chamber Mail', icon: Icon.messages },
      { to: (id) => `/judicial/${id}/tasks`, label: 'Chamber Tasks', icon: Icon.tasks },
    ],
  },
];

// ── Sidebar link ──────────────────────────────────────────────────────────────

const SidebarLink: React.FC<SidebarLinkProps> = ({ item, deptId, onClose }) => {
  const location = useLocation();
  const hasChildren = !!item.children?.length;
  const childActive = hasChildren && item.children!.some((c) => location.pathname.startsWith(c.to(deptId)));
  const [open, setOpen] = useState(childActive);

  const base = 'flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200';

  if (!hasChildren) {
    return (
      <NavLink
        to={item.to(deptId)}
        end
        onClick={onClose}
        className={({ isActive }) =>
          `${base} ${isActive
            ? 'bg-[#1a365d] text-white shadow-md'
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
  }

  return (
    <div>
      <div className={`${base} ${childActive ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 group'}`}>
        <NavLink to={item.to(deptId)} end onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
          {({ isActive }) => (
            <>
              <span className={isActive ? 'text-[#1a365d]' : 'text-stone-400 group-hover:text-stone-600 transition-colors'}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          className="ml-2 shrink-0 rounded p-1 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-700"
        >
          <ChevronIcon open={open} />
        </button>
      </div>

      {open && (
        <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-stone-200 pl-3">
          {item.children!.map((child) => (
            <NavLink
              key={child.to(deptId)}
              to={child.to(deptId)}
              end
              onClick={onClose}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#1a365d]/10 font-semibold text-[#1a365d]'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                }`
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

export const JudicialOfficerSidebar: React.FC<JudicialOfficerSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAppSelector((state) => state.auth);
  const deptId = user?.department_id ?? null;

  const visibleSections = navigationConfig
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.minRole) return hasRole(user, item.minRole);
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    dept_head: 'Chamber/Dept Head',
    staff: 'Chamber Staff',
    viewer: 'Viewer',
  };

  if (!deptId) {
    return (
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-200 bg-white shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-16 lg:h-20 items-center border-b border-stone-100 px-6">
          <h2 className="text-xs font-bold tracking-tight text-stone-900">Judicial Chambers</h2>
        </div>
        <div className="p-4 text-sm text-stone-500">
          No dynamic assignment configuration discovered. Contact an administrator for chamber setup.
        </div>
      </aside>
    );
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-200 bg-white shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Branding */}
        <div className="flex h-16 lg:h-20 items-center justify-between border-b border-stone-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a365d] to-[#2a4365] text-[#C29B38] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight text-stone-900">ORHC</h2>
              <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">Judicial Chambers</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-stone-500 hover:bg-stone-100 lg:hidden" aria-label="Close sidebar">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
                  <SidebarLink key={item.label} item={item} deptId={deptId} onClose={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-stone-100 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[#1a365d] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-900 truncate">
                {user?.full_name ?? 'Unknown'}
              </p>
              <p className="text-[10px] text-stone-500 truncate">
                {user?.role ? roleLabel[user.role] : 'Judicial Officer'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default JudicialOfficerSidebar;