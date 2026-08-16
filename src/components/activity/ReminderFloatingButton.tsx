// Updated ReminderFloatingButton.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useMatch } from 'react-router-dom';
import { Bell, BellRing, X, Check, Clock, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchActiveReminders,
  updateReminderStatus,
  completeReminder,
  snoozeReminder,
  selectActiveReminders,
  selectActiveRemindersLoading,
  selectActiveRemindersCount,
} from '../../store/slices/activityTrackingSlice';
import {
  isReminderOverdue,
  isReminderDueToday,
  isReminderUpcoming,
  REMINDER_STATUS_LABELS,
  REMINDER_STATUS_COLORS,
  type ReminderStatus,
} from '../../types/activity-tracking.types';

interface ReminderFloatingButtonProps {
  departmentId?: string;
  staffId?: string;
  enabled?: boolean;
}

// Status badge component
const StatusBadge: React.FC<{ status: ReminderStatus }> = ({ status }) => {
  const colors = REMINDER_STATUS_COLORS[status];
  const label = REMINDER_STATUS_LABELS[status];
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span>{colors.icon}</span>
      {label}
    </span>
  );
};

const ReminderFloatingButton: React.FC<ReminderFloatingButtonProps> = ({
  departmentId: propDepartmentId,
  staffId: propStaffId,
  enabled = true,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { user } = useAppSelector((state) => state.auth);
  const activeReminders = useAppSelector(selectActiveReminders);
  const activeRemindersLoading = useAppSelector(selectActiveRemindersLoading);
  const activeRemindersCount = useAppSelector(selectActiveRemindersCount);

  const match = useMatch('/dept/:deptId/*');
  const urlDepartmentId = match?.params?.deptId;
  const departmentId = propDepartmentId || urlDepartmentId;
  const staffId = propStaffId || user?.id;
  const isSuperAdmin = user?.role === 'super_admin';

  const shouldShow = enabled && user && (isSuperAdmin || user.department_id);

  // Fetch active reminders
  useEffect(() => {
    if (!shouldShow || !staffId) return;

    const fetchReminders = () => {
      const filters: { staffId?: string; departmentId?: string } = {};
      if (isSuperAdmin) {
        // Don't filter - get everything for super admin
      } else if (staffId) {
        filters.staffId = staffId;
      } else if (departmentId) {
        filters.departmentId = departmentId;
      }
      
      dispatch(fetchActiveReminders(filters));
    };

    fetchReminders();
    const interval = setInterval(fetchReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch, shouldShow, staffId, departmentId, isSuperAdmin]);

  // Handle status update
  const handleStatusUpdate = useCallback(
    async (id: string, newStatus: ReminderStatus, event: React.ChangeEvent<HTMLSelectElement>) => {
      event.stopPropagation();
      await dispatch(updateReminderStatus({ id, status: newStatus }));
      // Refetch to update the list
      const filters: { staffId?: string; departmentId?: string } = {};
      if (isSuperAdmin) {
        // Don't filter
      } else if (staffId) {
        filters.staffId = staffId;
      } else if (departmentId) {
        filters.departmentId = departmentId;
      }
      dispatch(fetchActiveReminders(filters));
    },
    [dispatch, staffId, departmentId, isSuperAdmin]
  );

  const handleComplete = useCallback(
    async (id: string, event: React.MouseEvent) => {
      event.stopPropagation();
      await dispatch(completeReminder(id));
      const filters: { staffId?: string; departmentId?: string } = {};
      if (isSuperAdmin) {
        // Don't filter
      } else if (staffId) {
        filters.staffId = staffId;
      } else if (departmentId) {
        filters.departmentId = departmentId;
      }
      dispatch(fetchActiveReminders(filters));
    },
    [dispatch, staffId, departmentId, isSuperAdmin]
  );

  const handleSnooze = useCallback(
    async (id: string, event: React.MouseEvent) => {
      event.stopPropagation();
      const input = window.prompt('Snooze until (YYYY-MM-DD):');
      if (!input) return;
      await dispatch(snoozeReminder({ id, dueDate: input }));
      const filters: { staffId?: string; departmentId?: string } = {};
      if (isSuperAdmin) {
        // Don't filter
      } else if (staffId) {
        filters.staffId = staffId;
      } else if (departmentId) {
        filters.departmentId = departmentId;
      }
      dispatch(fetchActiveReminders(filters));
    },
    [dispatch, staffId, departmentId, isSuperAdmin]
  );

  const handleNavigateToActivities = () => {
    setIsOpen(false);
    const basePath = departmentId ? `/dept/${departmentId}/activity-logs` : '/activity-logs';
    navigate(basePath);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime())
      ? '-'
      : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Status options for dropdown
  const statusOptions: ReminderStatus[] = ['pending', 'in_progress', 'upcoming', 'overdue', 'completed', 'cancelled'];

  // Always render the button structure, but conditionally show/hide
  if (!shouldShow || !staffId) {
    return null;
  }

  // Show the bell even if no reminders
  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300
          ${isOpen ? 'bg-stone-600 hover:bg-stone-700' : 'bg-[#1E4620] hover:bg-[#2d6a2f]'}
          text-white
        `}
        aria-label="Reminders"
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <>
            <BellRing size={24} />
            {activeRemindersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
                {activeRemindersCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 max-h-[500px] overflow-hidden rounded-xl bg-white shadow-2xl border border-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 bg-stone-50">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[#1E4620]" />
              <h3 className="font-semibold text-stone-900">
                Active Reminders
                {activeRemindersCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-stone-500">
                    ({activeRemindersCount})
                  </span>
                )}
              </h3>
            </div>
            <button
              onClick={handleNavigateToActivities}
              className="text-xs font-medium text-[#1E4620] hover:underline"
            >
              View All
            </button>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto p-2">
            {activeRemindersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1E4620] border-t-transparent" />
              </div>
            ) : activeReminders.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-stone-500">No active reminders</p>
                <p className="text-xs text-stone-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activeReminders.map((reminder) => {
                  const overdue = isReminderOverdue(reminder);
                  const dueToday = isReminderDueToday(reminder);
                  const upcoming = isReminderUpcoming(reminder);

                  return (
                    <div
                      key={reminder.id}
                      className="group flex items-start gap-3 rounded-lg p-3 hover:bg-stone-50 transition-colors"
                    >
                      {/* Status Icon */}
                      <div className="mt-0.5 shrink-0">
                        {overdue ? (
                          <AlertTriangle size={16} className="text-red-500" />
                        ) : dueToday ? (
                          <Clock size={16} className="text-amber-500" />
                        ) : upcoming ? (
                          <Bell size={16} className="text-blue-500" />
                        ) : (
                          <Bell size={16} className="text-stone-400" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">
                          {reminder.message}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span>{reminder.contactName}</span>
                          <span>·</span>
                          <span>Due {formatDate(reminder.dueDate)}</span>
                          {overdue && (
                            <span className="text-red-600 font-medium">Overdue</span>
                          )}
                          {dueToday && !overdue && (
                            <span className="text-amber-600 font-medium">Today</span>
                          )}
                          {isSuperAdmin && reminder.departmentId && (
                            <>
                              <span>·</span>
                              <span className="text-stone-400 text-xs">
                                Dept: {reminder.departmentId.slice(0, 8)}
                              </span>
                            </>
                          )}
                        </div>
                        {/* Status Badge */}
                        <div className="mt-1">
                          <StatusBadge status={reminder.status} />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Status Dropdown */}
                        <div className="relative">
                          <select
                            value={reminder.status}
                            onChange={(e) => handleStatusUpdate(reminder.id, e.target.value as ReminderStatus, e)}
                            className="rounded px-1.5 py-0.5 text-xs border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {REMINDER_STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => handleSnooze(reminder.id, e)}
                            className="rounded px-1.5 py-0.5 text-xs text-stone-600 hover:bg-stone-200 transition-colors"
                            title="Snooze"
                          >
                            <Clock size={12} />
                          </button>
                          <button
                            onClick={(e) => handleComplete(reminder.id, e)}
                            className="rounded px-1.5 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Mark complete"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-stone-200 px-4 py-2 bg-stone-50/80">
            <button
              onClick={handleNavigateToActivities}
              className="w-full text-center text-xs text-[#1E4620] hover:underline font-medium"
            >
              Go to Activities Logs →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderFloatingButton;