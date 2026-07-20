// src/components/store/StoreHeader.tsx
import React from 'react';
import { useAppSelector } from '../../store/hook';

interface StoreHeaderProps {
  onMenuClick: () => void;
}

const StoreHeader: React.FC<StoreHeaderProps> = ({ onMenuClick }) => {
  const { user } = useAppSelector((state) => state.auth);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <header className="sticky top-0 z-30 flex h-16 lg:h-20 items-center justify-between border-b border-stone-200 bg-white px-4 lg:px-8 shadow-sm">
      {/* Left: mobile menu toggle + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="text-sm lg:text-base font-bold text-stone-900">Store Department</h1>
          <p className="text-[10px] lg:text-xs text-stone-500">Judiciary of Kenya · ORHC</p>
        </div>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-4">
        <button
          className="relative rounded-lg p-2 text-stone-500 hover:bg-stone-100"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        <div className="hidden sm:flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#1E4620] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-900 truncate max-w-[140px]">
              {user?.full_name ?? 'Unknown'}
            </p>
            <p className="text-[10px] text-stone-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StoreHeader;