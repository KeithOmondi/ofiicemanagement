// src/components/staff/StaffHeader.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, X } from 'lucide-react';
import { useAppDispatch } from '../../store/hook';
import { logoutUser } from '../../store/slices/authSlice';
import NotificationBell from '../notifications/NotificationBell';

interface StaffHeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  userName: string;
  userRole: string;
  // notificationCount removed - NotificationBell handles this internally
}

const StaffHeader: React.FC<StaffHeaderProps> = ({
  onMenuToggle,
  isMenuOpen,
  userName,
  userRole,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape, same UX users expect
  // from any menu — without this it only toggles via the avatar button.
  useEffect(() => {
    if (!isProfileOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileOpen]);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await dispatch(logoutUser());
    navigate('/login');
  };

  const handleProfile = () => {
    setIsProfileOpen(false);
    navigate('settings'); // adjust if a dedicated profile route exists
  };

  const handleSettings = () => {
    setIsProfileOpen(false);
    navigate('settings');
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Left section - Logo and menu toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors lg:hidden"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1d3331]">
              Staff Portal
            </h1>
            <p className="text-[10px] font-medium text-stone-400 hidden sm:block">
              Office of the Registrar
            </p>
          </div>
        </div>

        {/* Right section - Notifications and Profile */}
        <div className="flex items-center gap-3">
          {/* Notification Bell - Replaces the old Bell button */}
          <NotificationBell />

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-100 transition-colors"
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#1d3331] text-white flex items-center justify-center font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-stone-800">{userName}</p>
                <p className="text-[10px] text-stone-400 capitalize">{userRole}</p>
              </div>
              <ChevronDown size={16} className="text-stone-400 hidden md:block" />
            </button>

            {/* Dropdown menu */}
            {isProfileOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-stone-200 shadow-lg py-1 z-50"
              >
                <button
                  onClick={handleProfile}
                  className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={handleSettings}
                  className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Settings
                </button>
                <hr className="my-1 border-stone-100" />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default StaffHeader;