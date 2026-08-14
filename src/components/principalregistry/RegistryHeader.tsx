// ============================================================
// src/features/station-engagement/components/RegistryHeader.tsx
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Menu,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { logoutUser } from '../../store/slices/authSlice';
import NotificationBell from '../notifications/NotificationBell';

interface RegistryHeaderProps {
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
}

const RegistryHeader: React.FC<RegistryHeaderProps> = ({
  title = 'Station Engagement Report',
  subtitle = 'Weekly station engagement tracking',
  onSearch,
  onMenuClick,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

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
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-stone-900">{title}</h1>
          <p className="hidden text-xs text-stone-500 sm:block">{subtitle}</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search reports, stations, or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-48 lg:w-64 rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          />
        </form>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Help */}
        <button className="hidden rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 sm:block">
          <HelpCircle className="h-5 w-5" />
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
              <ChevronDown className="h-4 w-4" />
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
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 border-t border-stone-100 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
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

export default RegistryHeader;