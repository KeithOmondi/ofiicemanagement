// src/components/layout/AdmDeskHeader.tsx
import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { logoutUser } from '../../store/slices/authSlice';
import NotificationBell from '../notifications/NotificationBell';

interface AdmDeskHeaderProps {
  onMenuToggle: () => void;
}

const roleLabel: Record<string, string> = {
  super_admin: 'Registrar — High Court',
  dept_head:   'Department Head',
  staff:       'Staff Officer',
  viewer:      'Viewer',
};

export const AdmDeskHeader: React.FC<AdmDeskHeaderProps> = ({ onMenuToggle }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const userRoleLabel = user?.role ? roleLabel[user.role] : 'Staff Officer';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 lg:px-8 shadow-sm">
      {/* Left — mobile menu + session badge */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 lg:hidden"
          aria-label="Open Navigation Drawer"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] lg:text-xs font-medium text-[#1E4620] ring-1 ring-inset ring-emerald-600/10">
          <span className="hidden sm:inline">Secure Session Active</span>
          <span className="sm:hidden">Secure</span>
        </span>
      </div>

      {/* Right — notifications + user info + logout */}
      <div className="flex items-center gap-3 lg:gap-6">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Info */}
        <div className="flex items-center gap-2 lg:gap-3 border-r border-stone-200 pr-3 lg:pr-6 text-right">
          <div className="min-w-0">
            <p className="text-xs lg:text-sm font-semibold text-stone-900 truncate max-w-[140px] sm:max-w-xs">
              {user?.full_name ?? 'Unknown'}
            </p>
            <p className="text-[10px] lg:text-xs text-stone-500 truncate max-w-[140px] sm:max-w-xs">
              {userRoleLabel}
            </p>
          </div>
          <div className="flex h-8 w-8 lg:h-9 lg:w-9 shrink-0 items-center justify-center rounded-full bg-[#1E4620] text-xs lg:text-sm font-bold text-white ring-1 ring-stone-200">
            {initials}
          </div>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={() => dispatch(logoutUser())}
          className="rounded p-1.5 text-stone-400 transition-colors hover:bg-stone-50 hover:text-red-600"
          title="Terminate Session"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default AdmDeskHeader;