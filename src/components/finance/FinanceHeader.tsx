// src/components/finance/FinanceHeader.tsx
import React from 'react';
import { useAppSelector } from '../../store/hook';
import NotificationBell from '../notifications/NotificationBell';

interface FinanceHeaderProps {
  onMenuToggle: () => void;
}

const FinanceHeader: React.FC<FinanceHeaderProps> = ({ onMenuToggle }) => {
  const { user } = useAppSelector((state) => state.auth);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
      {/* Left — hamburger (mobile only) + title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — only visible on mobile where sidebar is hidden */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden flex items-center justify-center rounded-lg p-2 text-stone-500 hover:bg-stone-100 transition-colors shrink-0"
          aria-label="Open navigation"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-stone-900 leading-tight truncate">
            Finance
          </h1>
          <p className="text-[11px] sm:text-xs text-stone-400 hidden sm:block">
            Financial management dashboard
          </p>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Notification Bell - Replaces the emoji bell */}
        <NotificationBell />

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1E4620] text-white flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          {/* Name hidden on very small screens to save space */}
          <span className="hidden sm:block text-sm font-medium text-stone-700 max-w-[140px] truncate">
            {user?.full_name ?? 'User'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default FinanceHeader;