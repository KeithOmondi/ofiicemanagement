// src/components/notifications/NotificationDropdown.tsx
import React from 'react';
import { type Notification } from '../../store/slices/notificationsSlice';

// Simple date formatter without date-fns
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onNotificationClick: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  isLoading,
  onNotificationClick,
  onMarkAllAsRead,
  onClose,
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <div className="absolute right-0 mt-2 w-96 max-h-[480px] bg-white rounded-lg shadow-xl border border-stone-200 overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-stone-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto max-h-[360px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#1E4620]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-stone-100 p-3 mb-3">
              <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm text-stone-500">No notifications yet</p>
            <p className="text-xs text-stone-400 mt-1">We'll notify you when something arrives</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => onNotificationClick(notification.id)}
                className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50 hover:bg-blue-100' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Priority Badge */}
                  <div className="flex-shrink-0">
                    <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getPriorityColor(notification.priority)}`}>
                      {getPriorityLabel(notification.priority)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.is_read ? 'font-semibold text-stone-900' : 'text-stone-600'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-stone-500 truncate mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-stone-400 mt-1">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.is_read && (
                    <div className="flex-shrink-0">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-stone-200 bg-stone-50 px-4 py-2 flex justify-between items-center">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-stone-500 hover:text-stone-700 font-medium transition-colors"
        >
          Close
        </button>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={() => {
              // View all notifications - you can navigate to a notifications page
              onClose();
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            View all
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;