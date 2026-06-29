// src/components/notifications/NotificationBell.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchUnreadCount,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  selectUnreadCount,
  selectNotificationsLoading,
  selectRecentNotifications,
  setSelectedNotification,
  clearNewNotification,
} from '../../store/slices/notificationsSlice';
import NotificationDropdown from './NotificationDropdown';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector(selectUnreadCount);
  // Remove unused hasUnread
  const isLoading = useAppSelector(selectNotificationsLoading);
  const recentNotifications = useAppSelector(selectRecentNotifications(5));
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount
  useEffect(() => {
    dispatch(fetchUnreadCount());
    
    // Optional: Fetch notifications periodically
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        dispatch(clearNewNotification());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dispatch]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchNotifications({ limit: 20 }));
    }
  }, [isOpen, dispatch]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Clear new notification indicator when opening
      dispatch(clearNewNotification());
    }
  };

  const handleNotificationClick = (notificationId: string) => {
    dispatch(markAsRead(notificationId));
    dispatch(setSelectedNotification(
      recentNotifications.find(n => n.id === notificationId) || null
    ));
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  // Determine if there are unread notifications for styling
  const hasUnread = unreadCount > 0;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`relative rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors ${
          hasUnread ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        }`}
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown
          notifications={recentNotifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          onNotificationClick={handleNotificationClick}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;