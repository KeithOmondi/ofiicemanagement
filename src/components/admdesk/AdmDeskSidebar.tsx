// src/components/layout/AdmDeskSidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppSelector } from '../../store/hook';
import { hasRole } from '../../store/slices/authSlice';
import type { UserRole } from '../../store/slices/authSlice';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  to:        (deptId: string) => string;
  label:     string;
  minRole?:  UserRole;
  badge?:    number;
  icon:      React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarLinkProps {
  item:      NavItem;
  deptId:    string;
  onClose?:  () => void;
}

interface AdmDeskSidebarProps {
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
  messages: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
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
};

// ── Nav config ────────────────────────────────────────────────────────────────
// `to` is a function of departmentId so links always stay scoped to the
// signed-in dept_head/staff/viewer's own department.

const navigationConfig: NavSection[] = [
  {
    title: 'Main',
    items: [
      { to: (id) => `/dept/${id}/dashboard`,  label: 'Dashboard',           icon: Icon.dashboard },
      { to: (id) => `/dept/${id}/documents`,  label: 'Document Management', icon: Icon.document  },
      { to: (id) => `/dept/${id}/registry`,  label: 'Document Registry', icon: Icon.document  },
      { to: (id) => `/dept/${id}/memo-letter`,  label: 'Memo and Letters', icon: Icon.document  },
    ],
  },
  {
    title: 'Communication',
    items: [
      { to: (id) => `/dept/${id}/messages`,  label: 'Messages', icon: Icon.messages },
    ],
  },
  {
    title: 'Planning',
    items: [
      { to: (id) => `/dept/${id}/calendar`,  label: 'Calendar',        icon: Icon.calendar },
      { to: (id) => `/dept/${id}/tasks`,     label: 'Task Management', icon: Icon.tasks    },
      { to: (id) => `/dept/${id}/bring-up`,     label: 'Bring Up', icon: Icon.tasks    },
      { to: (id) => `/dept/${id}/reports`,   label: 'Reports',         icon: Icon.reports  },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        to:       (id) => `/dept/${id}/team`,
        label:    'Department Team',
        minRole:  'dept_head',
        icon:     Icon.team,
      },
      {
        to:       (id) => `/dept/${id}/settings`,
        label:    'Settings',
        minRole:  'dept_head',
        icon:     Icon.settings,
      },

      {
        to:       (id) => `/dept/${id}/orhc-folders`,
        label:    'Folders',
        minRole:  'dept_head',
        icon:     Icon.settings,
      },
    ],
  },
];

// ── Sidebar link ──────────────────────────────────────────────────────────────

const SidebarLink: React.FC<SidebarLinkProps> = ({ item, deptId, onClose }) => {
  const base = 'flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200';

  return (
    <NavLink
      to={item.to(deptId)}
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
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

export const AdmDeskSidebar: React.FC<AdmDeskSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAppSelector((state) => state.auth);
  const departmentId = user?.department_id ?? null;

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
    super_admin: 'Registrar',
    dept_head:   'Department Head',
    staff:       'Staff Officer',
    viewer:      'Viewer',
  };

  // Without a department, none of the scoped links are valid — show a notice
  // instead of building broken /dept/null/... paths.
  if (!departmentId) {
    return (
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-200 bg-white shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-16 lg:h-20 items-center border-b border-stone-100 px-6">
          <h2 className="text-xs font-bold tracking-tight text-stone-900">Department Desk</h2>
        </div>
        <div className="p-4 text-sm text-stone-500">
          No department is assigned to your account. Contact a super admin for access.
        </div>
      </aside>
    );
  }

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
              <h2 className="text-xs font-bold tracking-tight text-stone-900">Department Desk</h2>
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
                  <SidebarLink key={item.label} item={item} deptId={departmentId} onClose={onClose} />
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

export default AdmDeskSidebar;