// src/components/procurement/PSidebar.tsx
import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { useAppSelector } from '../../store/hook';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface PSidebarProps {
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
  inventory: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  purchases: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  suppliers: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  tenders: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  reports: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  orders: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
};

// ── Nav config ────────────────────────────────────────────────────────────────

const navigationConfig: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: 'dashboard', label: 'Dashboard', icon: Icon.dashboard },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { to: 'inventory', label: 'Inventory Management', icon: Icon.inventory },
      { to: 'reports', label: 'Report', icon: Icon.suppliers },
    ],
  },
  {
    title: 'Communication',
    items: [
      { to: 'messages', label: 'Messages', icon: Icon.messages },
      { to: 'notices', label: 'Notices & Broadcasts', icon: Icon.notices },
    ],
  },

  {
    title: 'Planning',
    items: [
      { to: 'calendar', label: 'Calendar', icon: Icon.messages },
      { to: 'tasks', label: 'Task Management', icon: Icon.notices },
    ],
  },

  
  
  {
    title: 'Settings',
    items: [
      { to: 'settings', label: 'Settings', icon: Icon.tenders },
    ],
  },
];

// ── Sidebar link ──────────────────────────────────────────────────────────────

const SidebarLink: React.FC<{ item: NavItem; basePath: string; onClose?: () => void }> = ({ 
  item, 
  basePath, 
  onClose 
}) => {
  const base = 'flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200';
  const fullPath = `${basePath}/${item.to}`;

  return (
    <NavLink
      to={fullPath}
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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const PSidebar: React.FC<PSidebarProps> = ({ isOpen = true, onClose }) => {
  const { user } = useAppSelector((state) => state.auth);
  const { deptId } = useParams<{ deptId: string }>();
  const basePath = `/dept/${deptId}`;

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const roleLabel: Record<string, string> = {
    super_admin: 'Registrar',
    dept_head: 'Department Head',
    staff: 'Staff Officer',
    viewer: 'Viewer',
  };

  return (
    <>
      {!isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

     

<aside className={`
  fixed inset-y-0 left-0 z-50 flex w-64 flex-col
  border-r border-stone-200 bg-white shadow-sm
  transition-transform duration-300 ease-in-out
  ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  lg:translate-x-0
`}>
        {/* Branding */}
        <div className="flex h-16 lg:h-20 items-center justify-between border-b border-stone-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E4620] to-[#2d6a2f] text-[#C29B38] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight text-stone-900">Procurement</h2>
              <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">Department</p>
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
          {navigationConfig.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                {section.title}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <SidebarLink 
                    key={item.to} 
                    item={item} 
                    basePath={basePath}
                    onClose={onClose} 
                  />
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

export default PSidebar;