// src/components/layout/AdminSidebar.tsx
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hook';
import { isSuperAdmin, hasRole } from '../../store/slices/authSlice';
import type { UserRole } from '../../store/slices/authSlice';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavChild {
  to:     string;
  label:  string;
}

interface NavItem {
  to:                  string;
  label:               string;
  requireSuperAdmin?:  boolean;
  minRole?:            UserRole;
  badge?:              number;
  icon:                React.ReactNode;
  children?:           NavChild[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarLinkProps {
  item:      NavItem;
  onClose?:  () => void;
}

interface SuperAdminSidebarProps {
  isOpen:   boolean;
  onClose:  () => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const Icon = {
  dashboard: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
    </svg>
  ),
  document: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  registry: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  ),
  messages: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  notices: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  calendar: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  tasks: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  reports: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  dsa: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  inventory: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  finance: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  helpdesk: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  team: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  users: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  departments: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
    title: 'Main',
    items: [
      { to: '/super-admin/dashboard',  label: 'Dashboard',          icon: Icon.dashboard },
      { to: '/super-admin/documents',  label: 'Document Management', icon: Icon.document  },
      { to: '/super-admin/registry',   label: 'ORHC Registry',       icon: Icon.registry  },
      { to: '/super-admin/memo-letters',   label: 'Memo and Letters',       icon: Icon.registry  },
      { to: '/super-admin/bring-up',   label: 'Bring Up',       icon: Icon.registry  },
    ],
  },
  {
    title: 'Communication',
    items: [
      { to: '/super-admin/messages',  label: 'Messages',            icon: Icon.messages },
      { to: '/super-admin/notices',   label: 'Notices & Broadcasts', icon: Icon.notices  },
    ],
  },
  {
    title: 'Planning',
    items: [
      { to: '/super-admin/calendar',      label: 'Calendar',         icon: Icon.calendar  },
      { to: '/super-admin/tasks',         label: 'Task Management',  icon: Icon.tasks     },
      { to: '/super-admin/reports',       label: 'Reports',          icon: Icon.reports   },
      { to: '/super-admin/dsa-tracker',   label: 'DSA Tracker',      icon: Icon.dsa       },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/super-admin/inventory',     label: 'Inventory Management', icon: Icon.inventory },
      { to: '/super-admin/finance',       label: 'Financial & Pro Bono', icon: Icon.finance   },
    ],
  },
  {
    title: 'Help Desk',
    items: [
      {
        to:     '/super-admin/helpdesk',
        label:  'Help Desk Portal',
        icon:   Icon.helpdesk,
        // Clicking the row label still navigates to the portal itself;
        // the chevron toggles this dropdown open to reveal the two
        // sub-sections.
        children: [
          { to: '/super-admin/helpdesk/tickets',    label: 'Tickets' },
          { to: '/super-admin/helpdesk/conference', label: 'Conference' },
        ],
      },
      { to: '/super-admin/team-members',  label: 'Team Members',     icon: Icon.team     },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        to:                 '/super-admin/users',
        label:              'User Management',
        requireSuperAdmin:  true,
        icon:               Icon.users,
      },
      {
        to:       '/super-admin/departments',
        label:    'Departments',
        minRole:  'dept_head',
        icon:     Icon.settings,
      },
      {
        to:       '/super-admin/settings',
        label:    'Settings',
        minRole:  'dept_head',
        icon:     Icon.settings,
      },
    ],
  },

  {
    title: 'Signature Management',
    items: [
      {
        to:                 '/super-admin/signature',
        label:              'Signature Management',
        requireSuperAdmin:  true,
        icon:               Icon.users,
      },
    ],
  },

  {
    title: 'Others',
    items: [
      { to: '/super-admin/links',      label: 'Other Links', icon: Icon.helpdesk },
      { to: '/super-admin/orhc-folders',      label: 'Folders', icon: Icon.helpdesk },
    ],
  },
];

// ── Sidebar link ──────────────────────────────────────────────────────────────

const SidebarLink: React.FC<SidebarLinkProps> = ({ item, onClose }) => {
  const location = useLocation();
  const hasChildren = !!item.children?.length;
  const childActive = hasChildren && item.children!.some((c) => location.pathname.startsWith(c.to));

  // Start expanded if a child route is already active, so refreshing on a
  // sub-page doesn't hide the fact that it's nested under this item.
  const [open, setOpen] = useState(childActive);

  const base = 'flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200';

  // ── Plain link, no dropdown ──────────────────────────────────────────────
  if (!hasChildren) {
    return (
      <NavLink
        to={item.to}
        end
        onClick={onClose}
        className={({ isActive }) =>
          `${base} ${isActive
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
  }

  // ── Link + dropdown: the row itself still navigates to `item.to`;
  // the chevron button is a separate click target that only toggles
  // the sub-list open/closed. ──────────────────────────────────────────────
  return (
    <div>
      <div
        className={`${base} ${
          childActive ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 group'
        }`}
      >
        <NavLink
          to={item.to}
          end
          onClick={onClose}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {({ isActive }) => (
            <>
              <span className={isActive ? 'text-[#1E4620]' : 'text-stone-400 group-hover:text-stone-600 transition-colors'}>
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
              key={child.to}
              to={child.to}
              end
              onClick={onClose}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#1E4620]/10 font-semibold text-[#1E4620]'
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

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAppSelector((state) => state.auth);
  const superAdmin = isSuperAdmin(user);

  const visibleSections = navigationConfig
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.requireSuperAdmin) return superAdmin;
        if (item.minRole)           return hasRole(user, item.minRole);
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  // Role label shown in the footer
  const roleLabel: Record<string, string> = {
    super_admin: 'Registrar',
    dept_head:   'Department Head',
    staff:       'Staff Officer',
    viewer:      'Viewer',
  };

  return (
    <>
      {isOpen && (
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
              <h2 className="text-xs font-bold tracking-tight text-stone-900">ORHC</h2>
              <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">Office of the Registrar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-stone-500 hover:bg-stone-100 lg:hidden"
            aria-label="Close sidebar"
          >
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
                  <SidebarLink key={item.to} item={item} onClose={onClose} />
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
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;