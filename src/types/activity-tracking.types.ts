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

export type ReminderStatus = 'pending' | 'completed' | 'snoozed' | 'cancelled';

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

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  snoozed: 'Snoozed',
  cancelled: 'Cancelled',
};

export function isReminderOverdue(reminder: ActivityReminder): boolean {
  if (reminder.status !== 'pending') return false;
  const today = new Date().toISOString().split('T')[0];
  return reminder.dueDate < today;
}

export function isReminderDueToday(reminder: ActivityReminder): boolean {
  if (reminder.status !== 'pending') return false;
  const today = new Date().toISOString().split('T')[0];
  return reminder.dueDate === today;
}

export function canCompleteReminder(reminder: ActivityReminder): boolean {
  return reminder.status === 'pending' || reminder.status === 'snoozed';
}

export function canSnoozeReminder(reminder: ActivityReminder): boolean {
  return reminder.status === 'pending' || reminder.status === 'snoozed';
}

// ── Helper to get display name ──────────────────────────────────────────────

export function getStaffDisplayName(log: ActivityLog | ActivityReminder): string {
  if (log.staff?.full_name) {
    return log.staff.full_name;
  }
  return `User ${log.staffId.slice(0, 8)}`;
}