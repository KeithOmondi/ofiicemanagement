// src/types/activity-tracking.types.ts

export type ContactSource = 'judge' | 'manual';

export type ActivityChannel = 'call' | 'email' | 'whatsapp' | 'in_person' | 'letter' | 'other';

export interface ContactReference {
  contactSource: ContactSource;
  judgeId: string | null;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
}

// Staff information that comes from the backend with activity logs
export interface StaffInfo {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
  pj_number?: string;
}

export interface ActivityLog extends ContactReference {
  id: string;
  staffId: string;
  staff?: StaffInfo;  // Full staff details (populated by backend when available)
  departmentId: string;
  channel: ActivityChannel;
  summary: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

// Updated ReminderStatus with more granular statuses
export type ReminderStatus = 
  | 'pending'      // Created but not yet actioned
  | 'in_progress'  // Currently being worked on
  | 'upcoming'     // Scheduled for future (not yet due)
  | 'overdue'      // Past due date
  | 'completed'    // Successfully finished
  | 'cancelled';   // No longer needed

export interface ActivityReminder extends ContactReference {
  id: string;
  staffId: string;
  staff?: StaffInfo;  // Full staff details (populated by backend when available)
  departmentId: string;
  relatedActivityId: string | null;
  message: string;
  dueDate: string;
  status: ReminderStatus;
  completedAt: string | null;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Lightweight shape for populating a judge picker — adjust to match
// whatever your existing judges list endpoint actually returns.
export interface JudgeOption {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface ActivityLogFilters {
  staffId?: string;
  departmentId?: string;
  judgeId?: string;
  channel?: ActivityChannel;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  search?: string;  // Search by staff name or contact name
}

export interface ReminderFilters {
  staffId?: string;
  departmentId?: string;
  status?: ReminderStatus;
  dueBefore?: string;
  dueOn?: string;
  page?: number;
  pageSize?: number;
}

export interface ActivityLogFormData {
  contactSource: ContactSource;
  judgeId: string | null;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  departmentId: string;
  channel: ActivityChannel;
  summary: string;
  occurredAt: string;
}

export interface ReminderFormData {
  contactSource: ContactSource;
  judgeId: string | null;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  departmentId: string;
  relatedActivityId: string | null;
  message: string;
  dueDate: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export const CHANNEL_LABELS: Record<ActivityChannel, string> = {
  call: 'Phone Call',
  email: 'Email',
  whatsapp: 'WhatsApp',
  in_person: 'In Person',
  letter: 'Letter',
  other: 'Other',
};

// Updated REMINDER_STATUS_LABELS with new statuses
export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Status color configuration for UI badges
export const REMINDER_STATUS_COLORS: Record<ReminderStatus, { bg: string; text: string; border: string; icon: string }> = {
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: '🕐'
  },
  in_progress: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: '🔄'
  },
  upcoming: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    icon: '📅'
  },
  overdue: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: '⚠️'
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: '✅'
  },
  cancelled: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200',
    icon: '🚫'
  }
};

// Updated helper functions for the new statuses
export function isReminderOverdue(reminder: ActivityReminder): boolean {
  // Only check due date for active statuses
  if (!['pending', 'in_progress', 'upcoming'].includes(reminder.status)) return false;
  const today = new Date().toISOString().split('T')[0];
  return reminder.dueDate < today;
}

export function isReminderDueToday(reminder: ActivityReminder): boolean {
  if (!['pending', 'in_progress', 'upcoming'].includes(reminder.status)) return false;
  const today = new Date().toISOString().split('T')[0];
  return reminder.dueDate === today;
}

export function isReminderUpcoming(reminder: ActivityReminder): boolean {
  if (!['pending', 'in_progress', 'upcoming'].includes(reminder.status)) return false;
  const today = new Date().toISOString().split('T')[0];
  return reminder.dueDate > today;
}

export function isReminderActive(reminder: ActivityReminder): boolean {
  return ['pending', 'in_progress', 'upcoming', 'overdue'].includes(reminder.status);
}

export function isReminderCompleted(reminder: ActivityReminder): boolean {
  return reminder.status === 'completed';
}

export function isReminderCancelled(reminder: ActivityReminder): boolean {
  return reminder.status === 'cancelled';
}

export function canCompleteReminder(reminder: ActivityReminder): boolean {
  // Can complete if status is pending, in_progress, upcoming, or overdue
  return ['pending', 'in_progress', 'upcoming', 'overdue'].includes(reminder.status);
}

export function canSnoozeReminder(reminder: ActivityReminder): boolean {
  // Can snooze if status is pending, in_progress, upcoming, or overdue
  return ['pending', 'in_progress', 'upcoming', 'overdue'].includes(reminder.status);
}

export function canEditReminder(reminder: ActivityReminder): boolean {
  // Can edit if not completed or cancelled
  return !['completed', 'cancelled'].includes(reminder.status);
}

export function canUpdateStatus(reminder: ActivityReminder, newStatus: ReminderStatus): boolean {
  // Can't update if already completed or cancelled
  if (['completed', 'cancelled'].includes(reminder.status)) return false;
  // Can't go back from completed or cancelled
  if (['completed', 'cancelled'].includes(newStatus)) return true;
  // Can update to any other status
  return true;
}

// Helper to get the appropriate status based on due date
export function getAutoStatusFromDueDate(dueDate: string): ReminderStatus {
  const today = new Date().toISOString().split('T')[0];
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'pending';
  return 'upcoming';
}

// Helper to get status badge info
export function getStatusBadgeInfo(status: ReminderStatus) {
  return REMINDER_STATUS_COLORS[status];
}

// ── Helper to get display name ──────────────────────────────────────────────

export function getStaffDisplayName(log: ActivityLog | ActivityReminder): string {
  if (log.staff?.full_name) {
    return log.staff.full_name;
  }
  return `User ${log.staffId.slice(0, 8)}`;
}