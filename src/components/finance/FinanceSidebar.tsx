// src/components/finance/FinanceSidebar.tsx
import React from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import { useAppSelector } from '../../store/hook';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  /** Relative segment after the dept base, e.g. "dashboard", "inventory" */
  segment: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface FinanceSidebarProps {
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
  transactions: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  budgets: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  invoices: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  reports: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  expenses: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  payments: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  inventory: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
};

// ── Nav config ────────────────────────────────────────────────────────────────

const navigationConfig: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { segment: 'dashboard',    label: 'Dashboard',        icon: Icon.dashboard },
    ],
  },
  {
    title: 'Transactions',
    items: [
      { segment: 'transactions', label: 'All Transactions', icon: Icon.transactions },
      { segment: 'payments',     label: 'Payments',         icon: Icon.payments },
      { segment: 'expenses',     label: 'Expenses',         icon: Icon.expenses },
    ],
  },
  {
    title: 'Planning',
    items: [
      { segment: 'budgets',      label: 'Budgets',          icon: Icon.budgets },
      { segment: 'invoices',     label: 'Invoices',         icon: Icon.invoices },
      { segment: 'reports',      label: 'Reports',          icon: Icon.reports },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { segment: 'inventory',    label: 'Inventory',        icon: Icon.inventory },
      { segment: 'messages',    label: 'Messages',        icon: Icon.inventory },
    ],
  },

  {
    title: 'System',
    items: [
      { segment: 'settings',    label: 'Settings',        icon: Icon.inventory },
    ],
  },
];

// ── Sidebar link ──────────────────────────────────────────────────────────────

/**
 * Builds an absolute href from the dept base path + the route segment.
 * This sidesteps all relative-path resolution ambiguity in nested <Routes>.
 */
const SidebarLink: React.FC<{
  item: NavItem;
  basePath: string;
  onClose?: () => void;
}> = ({ item, basePath, onClose }) => {
  const to = `${basePath}/${item.segment}`;
  const base = 'flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200';

  return (
    <NavLink
      to={to}
      end
      onClick={onClose}
      className={({ isActive }) =>
        `${base} ${
          isActive
            ? 'bg-[#1E4620] text-white shadow-md'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 group'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            <span className={
              isActive
                ? 'text-white'
                : 'text-stone-400 group-hover:text-stone-600 transition-colors'
            }>
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

const FinanceSidebar: React.FC<FinanceSidebarProps> = ({ isOpen = false, onClose }) => {
  const { user } = useAppSelector((state) => state.auth);

  // Derive the absolute base path from the current match so links are always
  // correct regardless of how deep the sidebar is nested in the router tree.
  const match = useMatch('/dept/:deptId/*');
  const basePath = match ? `/dept/${match.params.deptId}` : '';

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const roleLabel: Record<string, string> = {
    super_admin: 'Registrar',
    dept_head:   'Department Head',
    staff:       'Staff Officer',
    viewer:      'Viewer',
  };

  return (
    <>
      {/* ── Mobile backdrop ─────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Sidebar panel ───────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50
        flex w-64 flex-col
        border-r border-stone-200 bg-white shadow-sm
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Branding */}
        <div className="flex h-16 items-center justify-between border-b border-stone-100 px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-900 text-[#C29B38] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight text-stone-900">Finance</h2>
              <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">Department</p>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden rounded p-1 text-stone-500 hover:bg-stone-100 transition-colors"
            aria-label="Close navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
                    key={item.segment}
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
        <div className="shrink-0 border-t border-stone-100 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[#1E4620] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-900 truncate">
                {user?.full_name ?? 'Unknown'}
              </p>
              <p className="text-[10px] text-stone-500 truncate">
                {user?.role ? roleLabel[user.role] ?? 'Staff Officer' : 'Staff Officer'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default FinanceSidebar;