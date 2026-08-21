// src/pages/admin/StandaloneTasks.tsx
import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchStandaloneTasks,
  fetchStandaloneTaskStats,
  createStandaloneTask,
  updateStandaloneTaskStatus,
  archiveStandaloneTask,
  unarchiveStandaloneTask,
  deleteStandaloneTask,
  setStandaloneFilters,
  clearError,
  selectAllStandaloneTasks,
  selectStandalonePagination,
  selectStandaloneStats,
  selectStandaloneLoading,
  selectStandaloneError,
  selectStandaloneFilters,
  selectIsCreatingStandaloneTask,
} from '../../store/slices/standaloneSlice';
import {
  fetchUsers,
  selectAllUsers,
  selectUsersListLoading,
} from '../../store/slices/userSlice';
import { X, Plus, Trash2, Archive, RotateCcw, CheckCircle } from 'lucide-react';
import type {
  CreateStandaloneTaskInput,
  StandaloneTask,
  StandaloneTaskStatus,
  StandaloneTaskPriority,
  RecurrenceType,
} from '../../types/standalone.types';
import {
  STANDALONE_TASK_STATUS_LABELS,
  STANDALONE_TASK_STATUS_COLORS,
  STANDALONE_TASK_PRIORITY_LABELS,
  STANDALONE_TASK_PRIORITY_COLORS,
  formatDate,
  formatTimeAgo,
  isTaskOverdue,
  getDeadlineLabel,
  getDeadlineColor,
  RECURRENCE_OPTIONS,
} from '../../types/standalone.types';

// ─── Add Task Modal ──────────────────────────────────────────────────────────
const AddStandaloneTaskModal: React.FC<{
  onClose: () => void;
  onSave: (input: CreateStandaloneTaskInput) => void;
  isSaving: boolean;
  initialData?: Partial<CreateStandaloneTaskInput>;
}> = ({ onClose, onSave, isSaving, initialData }) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [formData, setFormData] = useState<CreateStandaloneTaskInput>({
    title: initialData?.title || '',
    description: initialData?.description || null,
    status: initialData?.status || 'pending',
    priority: initialData?.priority || 'normal',
    assigned_to: initialData?.assigned_to || null,
    assigned_to_team: initialData?.assigned_to_team || null,
    start_date: initialData?.start_date || null,
    end_date: initialData?.end_date || '',
    estimated_hours: initialData?.estimated_hours || null,
    is_recurring: initialData?.is_recurring || false,
    recurrence_type: initialData?.recurrence_type || 'none',
    recurrence_end_date: initialData?.recurrence_end_date || null,
  });

  useEffect(() => {
    dispatch(fetchUsers({}));
  }, [dispatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const endDate = formData.end_date
      ? (formData.end_date.includes('T') ? formData.end_date : new Date(`${formData.end_date}T00:00:00.000Z`).toISOString())
      : undefined;

    onSave({
      ...formData,
      end_date: endDate || formData.end_date,
      start_date: formData.start_date
        ? (formData.start_date.includes('T') ? formData.start_date : new Date(`${formData.start_date}T00:00:00.000Z`).toISOString())
        : null,
      recurrence_end_date: formData.recurrence_end_date
        ? (formData.recurrence_end_date.includes('T') ? formData.recurrence_end_date : new Date(`${formData.recurrence_end_date}T00:00:00.000Z`).toISOString())
        : null,
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Add Standalone Task</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter task title"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter task description"
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as StandaloneTaskPriority })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as StandaloneTaskStatus })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={formData.start_date ? formData.start_date.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">End Date *</label>
            <input
              type="date"
              value={formData.end_date ? formData.end_date.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Assignee</label>
          <select
            value={formData.assigned_to || ''}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value || null })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            disabled={usersLoading}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} {user.pj_number ? `(${user.pj_number})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Estimated Hours</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={formData.estimated_hours || ''}
            onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || null })}
            placeholder="e.g., 2.5"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        {/* Recurring Section */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={formData.is_recurring}
              onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-900/20"
            />
            <label className="text-sm font-medium text-slate-700">Recurring Task</label>
          </div>

          {formData.is_recurring && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Recurrence</label>
                <select
                  value={formData.recurrence_type}
                  onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as RecurrenceType })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  {RECURRENCE_OPTIONS.filter(opt => opt.value !== 'none').map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.recurrence_end_date ? formData.recurrence_end_date.split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving || !formData.title.trim() || !formData.end_date}
            className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Task'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Task Detail Modal ──────────────────────────────────────────────────────
const TaskDetailModal: React.FC<{
  task: StandaloneTask;
  onClose: () => void;
  onStatusChange: (id: string, status: StandaloneTaskStatus) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ task, onClose, onStatusChange, onArchive, onUnarchive, onDelete }) => {
  return (
    <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${STANDALONE_TASK_STATUS_COLORS[task.status]}`}>
            {STANDALONE_TASK_STATUS_LABELS[task.status]}
          </span>
          {task.is_archived && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Archived</span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-2">{task.title}</h2>
      {task.description && <p className="text-sm text-slate-600 mb-4">{task.description}</p>}

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-24">Priority:</span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${STANDALONE_TASK_PRIORITY_COLORS[task.priority]}`}>
            {STANDALONE_TASK_PRIORITY_LABELS[task.priority]}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-24">Assignee:</span>
          <span className="text-slate-700">{task.assigned_to_name || 'Unassigned'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-24">Dates:</span>
          <span className="text-slate-700">
            {task.start_date ? formatDate(task.start_date) : '—'} → {formatDate(task.end_date)}
          </span>
        </div>
        {task.estimated_hours && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-24">Est. Hours:</span>
            <span className="text-slate-700">{task.estimated_hours}h</span>
          </div>
        )}
        {task.actual_hours && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-24">Actual Hours:</span>
            <span className="text-slate-700">{task.actual_hours}h</span>
          </div>
        )}
        {task.is_recurring && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 w-24">Recurring:</span>
            <span className="text-slate-700 capitalize">{task.recurrence_type}</span>
            {task.recurrence_end_date && (
              <span className="text-slate-500 text-xs">until {formatDate(task.recurrence_end_date)}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-24">Created:</span>
          <span className="text-slate-700">{formatTimeAgo(task.created_at)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-24">Updated:</span>
          <span className="text-slate-700">{formatTimeAgo(task.updated_at)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {!task.is_archived && (
          <>
            {task.status !== 'complete' && (
              <button
                onClick={() => onStatusChange(task.id, 'complete')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Mark Complete
              </button>
            )}
            {task.status === 'pending' && (
              <button
                onClick={() => onStatusChange(task.id, 'in_progress')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Progress
              </button>
            )}
            {task.status === 'complete' ? (
              <button
                onClick={() => onArchive(task.id)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                <Archive className="w-4 h-4 inline mr-1" />
                Archive
              </button>
            ) : (
              <span className="px-4 py-2 text-xs text-slate-400 flex items-center">
                Mark complete before archiving
              </span>
            )}
          </>
        )}
        {task.is_archived && (
          <button
            onClick={() => onUnarchive(task.id)}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4 inline mr-1" />
            Unarchive
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4 inline mr-1" />
          Delete
        </button>
      </div>
    </div>
  );
};

// ─── Main Standalone Tasks Component ───────────────────────────────────────
const JOStandaloneTasks: React.FC = () => {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectAllStandaloneTasks);
  const pagination = useAppSelector(selectStandalonePagination);
  const stats = useAppSelector(selectStandaloneStats);
  const loading = useAppSelector(selectStandaloneLoading);
  const error = useAppSelector(selectStandaloneError);
  const filters = useAppSelector(selectStandaloneFilters);
  const isCreating = useAppSelector(selectIsCreatingStandaloneTask);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StandaloneTask | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<StandaloneTaskStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<StandaloneTaskPriority | ''>('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    dispatch(fetchStandaloneTasks({
      ...filters,
      search: searchQuery || undefined,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      is_archived: showArchived || undefined,
    }));
    dispatch(fetchStandaloneTaskStats());
  }, [dispatch, filters, searchQuery, filterStatus, filterPriority, showArchived]);

  // Surface any slice error as a toast instead of blanking the page
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleCreateTask = (input: CreateStandaloneTaskInput) => {
    dispatch(createStandaloneTask(input));
    setShowAddModal(false);
  };

  const handleStatusChange = (id: string, status: StandaloneTaskStatus) => {
    dispatch(updateStandaloneTaskStatus({ id, status }));
  };

  const handleArchive = (id: string) => {
    dispatch(archiveStandaloneTask(id));
  };

  const handleUnarchive = (id: string) => {
    dispatch(unarchiveStandaloneTask(id));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      dispatch(deleteStandaloneTask(id));
    }
  };

  const handlePageChange = (page: number) => {
    dispatch(setStandaloneFilters({ page }));
  };

  const renderStatusBadge = (status: StandaloneTaskStatus) => {
    const label = STANDALONE_TASK_STATUS_LABELS[status];
    const color = STANDALONE_TASK_STATUS_COLORS[status];
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>{label}</span>;
  };

  const renderPriorityBadge = (priority: StandaloneTaskPriority) => {
    const label = STANDALONE_TASK_PRIORITY_LABELS[priority];
    const color = STANDALONE_TASK_PRIORITY_COLORS[priority];
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>{label}</span>;
  };

  const renderTaskRow = (task: StandaloneTask) => {
    const isOverdue = isTaskOverdue(task);
    const deadlineLabel = getDeadlineLabel(task.end_date, task.status);
    const deadlineColor = getDeadlineColor(task.end_date, task.status);

    return (
      <tr
        key={task.id}
        className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
        onClick={() => setSelectedTask(task)}
      >
        <td className="px-4 py-3">
          <div className="font-medium text-slate-700">{task.title}</div>
          {task.description && (
            <div className="text-xs text-slate-400 truncate max-w-[300px]">{task.description}</div>
          )}
        </td>
        <td className="px-4 py-3">{renderPriorityBadge(task.priority)}</td>
        <td className="px-4 py-3">{renderStatusBadge(task.status)}</td>
        <td className="px-4 py-3 text-sm text-slate-600">{task.assigned_to_name || '—'}</td>
        <td className="px-4 py-3">
          <span className={`text-sm font-medium ${deadlineColor}`}>
            {deadlineLabel}
            {isOverdue && task.status !== 'complete' && ' 🔴'}
          </span>
        </td>
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={task.status === 'complete'}
            onChange={(e) => {
              e.stopPropagation();
              handleStatusChange(task.id, e.target.checked ? 'complete' : 'pending');
            }}
            className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-900/20 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        {showArchived && (
          <td className="px-4 py-3">
            <span className="text-xs text-slate-400">{task.is_archived ? 'Archived' : 'Active'}</span>
          </td>
        )}
      </tr>
    );
  };

  // Stats cards data with proper typing
  const getStatsData = () => {
    if (stats) {
      return [
        { label: 'Pending', value: stats.pending, color: 'bg-amber-100 text-amber-700' },
        { label: 'In Progress', value: stats.in_progress, color: 'bg-blue-100 text-blue-700' },
        { label: 'Complete', value: stats.complete, color: 'bg-emerald-100 text-emerald-700' },
        { label: 'Overdue', value: stats.overdue, color: 'bg-rose-100 text-rose-700' },
      ];
    }
    return [
      { label: 'Pending', value: 0, color: 'bg-slate-100 text-slate-600' },
      { label: 'In Progress', value: 0, color: 'bg-slate-100 text-slate-600' },
      { label: 'Complete', value: 0, color: 'bg-slate-100 text-slate-600' },
      { label: 'Overdue', value: 0, color: 'bg-slate-100 text-slate-600' },
    ];
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px' },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error: { iconTheme: { primary: '#e11d48', secondary: '#fff' } },
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {getStatsData().map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4 text-center`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-[10px] font-medium uppercase tracking-wider opacity-70">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 w-40 sm:w-56"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StandaloneTaskStatus | '')}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as StandaloneTaskPriority | '')}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-900/20"
            />
            Show Archived
          </label>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Tasks */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <div className="text-slate-400 text-sm">No standalone tasks found</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Deadline</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-14">Done</th>
                  {showArchived && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Archived</th>
                  )}
                </tr>
              </thead>
              <tbody>{tasks.map(renderTaskRow)}</tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>
                Showing {pagination.page} of {pagination.totalPages} pages ({pagination.total} total)
              </span>
              <div className="flex gap-1">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AddStandaloneTaskModal
              onClose={() => setShowAddModal(false)}
              onSave={handleCreateTask}
              isSaving={isCreating}
            />
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm"
          onClick={() => setSelectedTask(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <TaskDetailModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onStatusChange={handleStatusChange}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default JOStandaloneTasks;