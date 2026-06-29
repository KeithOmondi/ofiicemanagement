// src/components/procurement/PHeader.tsx
import React from 'react';
import { useAppSelector } from '../../store/hook';
import NotificationBell from '../notifications/NotificationBell';

interface PHeaderProps {
  onMenuClick: () => void;
}

const PHeader: React.FC<PHeaderProps> = ({ onMenuClick }) => {
  const { user } = useAppSelector((state) => state.auth);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4">
      {/* Left: hamburger (mobile only) + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 transition-colors lg:hidden"
          aria-label="Open navigation"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h1 className="text-base font-bold text-stone-900">Procurement</h1>
          <p className="text-[11px] text-stone-400">Procurement management dashboard</p>
        </div>
      </div>

      {/* Right: actions + user chip */}
      <div className="flex items-center gap-2">
        {/* Notification Bell - Replaces the old bell button */}
        <NotificationBell />

        {/* Search */}
        <button className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 transition-colors" aria-label="Search">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
        </button>

        {/* User Chip */}
        <div className="flex items-center gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1E4620] text-xs font-bold text-white">
            {initials}
          </div>
          <span className="hidden text-sm font-medium text-stone-700 sm:block">
            {user?.full_name ?? 'User'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default PHeader;