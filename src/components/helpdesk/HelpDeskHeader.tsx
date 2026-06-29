import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { logoutUser } from '../../store/slices/authSlice';
import NotificationBell from '../notifications/NotificationBell';

// ── Icons ─────────────────────────────────────────────────────────────────────

const Icon = {
  menu: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  search: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  help: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  chevronDown: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  user: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  logout: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

// ── Header ───────────────────────────────────────────────────────────────────

interface HelpDeskHeaderProps {
  onMenuClick?: () => void;
}

const HelpDeskHeader: React.FC<HelpDeskHeaderProps> = ({ onMenuClick }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 lg:px-6">
      {/* Left: Menu + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 lg:hidden"
          aria-label="Toggle sidebar"
        >
          {Icon.menu}
        </button>

        <div>
          <h1 className="text-lg font-semibold text-stone-900">Help Desk</h1>
          <p className="hidden text-xs text-stone-500 sm:block">
            Manage support requests and operations
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
            {Icon.search}
          </span>
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-48 lg:w-64 rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          />
        </div>

        {/* Notification Bell - Replaces the old bell button */}
        <NotificationBell />

        {/* Help */}
        <button className="hidden rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 sm:block">
          {Icon.help}
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E4620] text-sm font-medium text-white">
              {user?.full_name ? getInitials(user.full_name) : 'U'}
            </div>
            <span className="hidden text-sm font-medium text-stone-700 lg:block">
              {user?.full_name || 'User'}
            </span>
            <span className="hidden text-stone-400 lg:block">
              {Icon.chevronDown}
            </span>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                <div className="border-b border-stone-100 px-4 py-2">
                  <p className="text-sm font-medium text-stone-900">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-stone-500">{user?.email || ''}</p>
                  <p className="mt-1 text-xs text-stone-500">Role: {user?.role || 'Staff'}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/profile');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  {Icon.user}
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  {Icon.settings}
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 border-t border-stone-100 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  {Icon.logout}
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default HelpDeskHeader;