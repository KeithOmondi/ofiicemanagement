// src/pages/ActivityTrackingPage.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, Mail, MessageSquare, FileText, Bell, Check, Clock, AlertTriangle, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchActivityLogs,
  fetchDueReminders,
  completeReminder,
  snoozeReminder,
  selectAllActivityLogs,
  selectActivityLogsLoading,
  selectActivityLogsError,
  selectActivityLogsPagination,
  selectDueReminders,
  selectDueRemindersLoading,
} from '../../store/slices/activityTrackingSlice';
import {
  fetchJudges,
  selectAllJudges,
} from '../../store/slices/JudgesSlice';
import {
  isReminderOverdue,
  isReminderDueToday,
  CHANNEL_LABELS,
} from '../../types/activity-tracking.types';
import type { ActivityChannel, JudgeOption } from '../../types/activity-tracking.types';
import LogActivityModal from '../../components/activity/LogActivityModal';

const ADMIN_ROLES = ['dept_head', 'super_admin'];

const CHANNEL_ICON: Record<ActivityChannel, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  whatsapp: <MessageSquare size={14} />,
  in_person: <FileText size={14} />,
  letter: <FileText size={14} />,
  other: <FileText size={14} />,
};

const HelpDeskLogs = () => {
  const dispatch = useAppDispatch();
  const { departmentId } = useParams<{ departmentId: string }>();

  const currentUser = useAppSelector((state: { auth: { user: { role: string } | null } }) => state.auth.user);
  const isAdmin = ADMIN_ROLES.includes(currentUser?.role ?? '');

  const logs = useAppSelector(selectAllActivityLogs);
  const logsLoading = useAppSelector(selectActivityLogsLoading);
  const logsError = useAppSelector(selectActivityLogsError);
  const pagination = useAppSelector(selectActivityLogsPagination);

  const dueReminders = useAppSelector(selectDueReminders);
  const dueRemindersLoading = useAppSelector(selectDueRemindersLoading);

  // Judges from the judges slice
  const judges = useAppSelector(selectAllJudges);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState<ActivityChannel | ''>('');

  // Transform Judge[] to JudgeOption[] for the modal
  const judgeOptions: JudgeOption[] = useMemo(
    () =>
      judges.map((judge) => ({
        id: judge.id,
        name: judge.name,
        phone: undefined,
        email: undefined,
      })),
    [judges]
  );

  const logFilters = useMemo(
    () => ({
      departmentId,
      channel: channelFilter || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }),
    [departmentId, channelFilter, pagination.page, pagination.pageSize]
  );

  // Fetch judges when component mounts
  useEffect(() => {
    dispatch(fetchJudges({ page: 1, limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchActivityLogs(logFilters));
  }, [dispatch, logFilters]);

  useEffect(() => {
    dispatch(fetchDueReminders({ departmentId }));
  }, [dispatch, departmentId]);

  const refreshDueReminders = useCallback(() => {
    dispatch(fetchDueReminders({ departmentId }));
  }, [dispatch, departmentId]);

  const handleLogged = useCallback(() => {
    dispatch(fetchActivityLogs(logFilters));
    refreshDueReminders();
    dispatch(fetchJudges({ page: 1, limit: 100 }));
  }, [dispatch, logFilters, refreshDueReminders]);

  const handleComplete = useCallback(
    (id: string) => {
      dispatch(completeReminder(id));
    },
    [dispatch]
  );

  const handleSnooze = useCallback(
    (id: string) => {
      const input = window.prompt('Snooze until (YYYY-MM-DD):');
      if (!input) return;
      dispatch(snoozeReminder({ id, dueDate: input }));
    },
    [dispatch]
  );

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime())
      ? '-'
      : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime())
      ? '-'
      : parsed.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? 'Team Activity Tracking' : 'My Activity Log'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'See what the team has discussed and what still needs follow-up.'
              : 'Log every call, email, or visit — and never lose track of a follow-up.'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-xs"
        >
          <Plus size={16} />
          Log Activity
        </button>
      </div>

      {/* Due Reminders Panel */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center gap-2">
          <Bell size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Due Today &amp; Overdue</h2>
          {dueReminders.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">
              {dueReminders.length}
            </span>
          )}
        </div>

        {dueRemindersLoading ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">Loading reminders...</div>
        ) : dueReminders.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            Nothing due — you're all caught up.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {dueReminders.map((reminder) => {
              const overdue = isReminderOverdue(reminder);
              const dueToday = isReminderDueToday(reminder);
              return (
                <div key={reminder.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 shrink-0 ${overdue ? 'text-rose-500' : 'text-amber-500'}`}
                    >
                      {overdue ? <AlertTriangle size={16} /> : <Clock size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{reminder.message}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {reminder.contactName} · Due {formatDate(reminder.dueDate)}
                        {overdue && <span className="text-rose-600 font-medium"> (Overdue)</span>}
                        {dueToday && <span className="text-amber-600 font-medium"> (Today)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSnooze(reminder.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Snooze
                    </button>
                    <button
                      onClick={() => handleComplete(reminder.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <Check size={12} />
                      Done
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Channel Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setChannelFilter('')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            channelFilter === ''
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        {(Object.keys(CHANNEL_LABELS) as ActivityChannel[]).map((c) => (
          <button
            key={c}
            onClick={() => setChannelFilter(c)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              channelFilter === c
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {CHANNEL_ICON[c]}
            {CHANNEL_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Activity Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {logsLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                    Loading activity...
                  </td>
                </tr>
              ) : logsError ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-rose-600">
                    {logsError}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-900">No activity logged yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click "Log Activity" to record your first interaction.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{log.contactName}</div>
                      {log.contactPhone && (
                        <div className="text-xs text-slate-500">{log.contactPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        {CHANNEL_ICON[log.channel]}
                        {CHANNEL_LABELS[log.channel]}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <p className="text-sm text-slate-700 line-clamp-2">{log.summary}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatDateTime(log.occurredAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Activity Modal - pass loading state if needed */}
      <LogActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        departmentId={departmentId || ''}
        judges={judgeOptions}
        onLogged={handleLogged}
      />
    </div>
  );
};

export default HelpDeskLogs;