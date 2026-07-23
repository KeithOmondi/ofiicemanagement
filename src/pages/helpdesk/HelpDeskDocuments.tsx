// src/pages/helpdesk/HelpDeskDocuments.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchMyMarked,
  fetchDocumentById,
  acknowledgeMark,
  completeMark,
  markDocument,
  selectMyMarked,
  selectLoading,
  selectActionInProgress,
  fetchDocuments,
} from '../../store/slices/documentSlice';
import {
  fetchUsers,
  selectCurrentUser,
  selectIsDeptHead,
  selectAllUsers,
} from '../../store/slices/userSlice';
import {
  fetchDepartments,
  selectAllDepartments,
} from '../../store/slices/departmentsSlice';
import type { Document, DocumentWithAnnotations, MarkDocumentInput } from '../../types/documents.types';
import {
  Search,
  FileText,
  Eye,
  Info,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  Check,
  X,
  ExternalLink,
  Download,
  Users,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'marked' | 'in_progress' | 'completed';

interface PreviewTarget {
  url: string;
  fileName: string;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    draft:          { bg: 'bg-stone-50',   text: 'text-stone-600',   label: 'Draft',         icon: <FileText    size={12} className="text-stone-400"   /> },
    uploaded:       { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Uploaded',      icon: <FileText    size={12} className="text-blue-500"    /> },
    pending_review: { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Pending Review',icon: <Clock       size={12} className="text-amber-500"   /> },
    dept_assigned:  { bg: 'bg-violet-50',  text: 'text-violet-700',  label: 'Dept Assigned', icon: <Users       size={12} className="text-violet-500"  /> },
    user_assigned:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  label: 'User Assigned', icon: <User       size={12} className="text-indigo-500"  /> },
    marked:         { bg: 'bg-violet-50',  text: 'text-violet-700',  label: 'Marked',        icon: <Clock       size={12} className="text-violet-500"  /> },
    in_progress:    { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'In Progress',   icon: <Clock       size={12} className="text-blue-500"    /> },
    completed:      { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Completed',     icon: <CheckCircle size={12} className="text-emerald-500" /> },
    filed:          { bg: 'bg-stone-50',   text: 'text-stone-600',   label: 'Filed',         icon: <FileText    size={12} className="text-stone-400"   /> },
    ready_to_release: { bg: 'bg-amber-50', text: 'text-amber-700',   label: 'Ready to Release', icon: <Clock   size={12} className="text-amber-500" /> },
    released:       { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Released',      icon: <CheckCircle size={12} className="text-emerald-500" /> },
  };

  const style = styles[status] || styles.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
      {style.icon}
      {style.label}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    low:    { bg: 'bg-stone-50', text: 'text-stone-500', label: 'Low'    },
    normal: { bg: 'bg-blue-50',  text: 'text-blue-600',  label: 'Normal' },
    urgent: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Urgent' },
  };

  const style = styles[priority] || styles.normal;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

// ─── Inline File Preview Modal ──────────────────────────────────────────────

interface InlineFilePreviewModalProps {
  url: string;
  fileName: string;
  onClose: () => void;
}

const InlineFilePreviewModal: React.FC<InlineFilePreviewModalProps> = ({ url, fileName, onClose }) => {
  const ext = (url.split('/').pop() ?? '').split('.').pop()?.toLowerCase() ?? '';

  const renderContent = () => {
    if (ext === 'pdf') {
      return (
        <iframe
          src={`${url}#toolbar=0`}
          title={fileName}
          className="w-full h-full border-0"
        />
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      return (
        <div className="flex items-center justify-center h-full p-6 bg-stone-50">
          <img
            src={url}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded shadow-sm"
          />
        </div>
      );
    }

    if (['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
      return (
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
          title={fileName}
          className="w-full h-full border-0"
        />
      );
    }

    // Unsupported type — offer open / download links
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <FileText size={48} className="text-stone-300" />
        <p className="text-sm text-stone-600 font-medium text-center break-all">{fileName}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d3331] px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 transition-colors"
          >
            <ExternalLink size={13} />
            Open in New Tab
          </a>
          <a
            href={url}
            download
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Download size={13} />
            Download
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0">
          <p className="text-sm font-semibold text-stone-800 truncate pr-4">{fileName}</p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-500 text-[10px] font-bold hover:bg-stone-50 transition-colors"
            >
              <ExternalLink size={12} />
              Open
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// ─── Delegate Modal ──────────────────────────────────────────────────────────

interface DelegateModalProps {
  isOpen: boolean;
  document: Document | null;
  departmentUsers: { id: string; name: string }[];
  onClose: () => void;
  onDelegate: (userId: string, instructions: string, priority: string) => void;
  isSubmitting: boolean;
}

const DelegateModal: React.FC<DelegateModalProps> = ({
  isOpen,
  document,
  departmentUsers,
  onClose,
  onDelegate,
  isSubmitting,
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    onDelegate(selectedUserId, instructions, priority);
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900">Delegate Document</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Document
            </label>
            <p className="text-sm font-medium text-stone-800 truncate">{document.title}</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Assign to User *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors"
              required
              disabled={isSubmitting || departmentUsers.length === 0}
            >
              <option value="">Select a user</option>
              {departmentUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            {departmentUsers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No users found in your department</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Instructions (optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors resize-none"
              placeholder="Add instructions for the user..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'urgent')}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors"
              disabled={isSubmitting}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1d3331] text-white text-sm font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || departmentUsers.length === 0}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Delegate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Mark Modal ──────────────────────────────────────────────────────────────

interface MarkModalProps {
  isOpen: boolean;
  document: Document | null;
  departments: { id: string; name: string }[];
  departmentUsers: { id: string; name: string }[];
  defaultDepartmentId: string;
  onClose: () => void;
  onMark: (userId: string, instructions: string, priority: string) => void;
  isSubmitting: boolean;
}

const MarkModal: React.FC<MarkModalProps> = ({
  isOpen,
  document,
  departments,
  departmentUsers,
  defaultDepartmentId,
  onClose,
  onMark,
  isSubmitting,
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    onMark(selectedUserId, instructions, priority);
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900">Mark Document</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Document
            </label>
            <p className="text-sm font-medium text-stone-800 truncate">{document.title}</p>
          </div>

          {/* Department dropdown (disabled for Dept Head) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Department *
            </label>
            <select
              value={defaultDepartmentId}
              disabled
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none cursor-not-allowed"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-stone-400 mt-0.5">
              You can only mark to your own department.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Assign to User *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors"
              required
              disabled={isSubmitting || departmentUsers.length === 0}
            >
              <option value="">Select a user</option>
              {departmentUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            {departmentUsers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No users found in this department</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Instructions (optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors resize-none"
              placeholder="Add instructions for the user..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'urgent')}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors"
              disabled={isSubmitting}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1d3331] text-white text-sm font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || departmentUsers.length === 0}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Mark
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  document: Document;
  onView: () => void;
  onPreviewFile?: () => void;
  onAcknowledge?: () => void;
  onComplete?: () => void;
  onDelegate?: () => void;
  isActionInProgress?: boolean;
  isDeptHead?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onPreviewFile,
  onAcknowledge,
  onComplete,
  onDelegate,
  isActionInProgress,
  isDeptHead,
}) => {
  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return format(d, 'dd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const mark = document.active_mark;
  const isPendingAcknowledge = (document.status === 'marked' || document.status === 'user_assigned') && mark?.assigned_to === document.assigned_to;
  const isInProgress         = document.status === 'in_progress' && mark?.assigned_to === document.assigned_to;
  const canDelegate = isDeptHead && !!mark && (document.status === 'user_assigned' || document.status === 'in_progress');

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="p-2 rounded-xl bg-[#1d3331]/5 text-[#1d3331] shrink-0 mt-0.5">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-stone-900 truncate">{document.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {document.created_by_name}
                </span>
                <span className="text-stone-300">•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(document.created_at)}
                </span>
                {document.reference_no && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="font-mono text-[10px] text-stone-400">{document.reference_no}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {mark && (
            <div className="mt-2 pl-9">
              <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-700">
                    {document.status === 'dept_assigned' ? 'Assigned to' : 'Marked to'}:
                  </span>
                  <span className="text-stone-600">{mark.marked_to_dept_name}</span>
                  {mark.assigned_to_name && (
                    <>
                      <span className="text-stone-300">•</span>
                      <span className="text-stone-600">Assigned: {mark.assigned_to_name}</span>
                    </>
                  )}
                  <PriorityBadge priority={mark.priority} />
                </div>
                {mark.instructions && (
                  <p className="mt-1 text-stone-500 line-clamp-2">{mark.instructions}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-stone-400">
                  <span>Marked: {formatDate(mark.marked_at)}</span>
                  {mark.acknowledged_at && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600">Acknowledged: {formatDate(mark.acknowledged_at)}</span>
                    </>
                  )}
                  {mark.completed_at && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600">Completed: {formatDate(mark.completed_at)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <StatusBadge status={document.status} />

          {isPendingAcknowledge && onAcknowledge && (
            <button
              onClick={onAcknowledge}
              disabled={isActionInProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1d3331] text-white text-[10px] font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionInProgress ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
              Acknowledge
            </button>
          )}

          {isInProgress && onComplete && (
            <button
              onClick={onComplete}
              disabled={isActionInProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionInProgress ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={14} />}
              Complete
            </button>
          )}

          {canDelegate && onDelegate && (
            <button
              onClick={onDelegate}
              disabled={isActionInProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus size={14} />
              Delegate
            </button>
          )}

          {onPreviewFile && (
            <button
              onClick={onPreviewFile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[10px] font-bold hover:bg-stone-50 transition-colors"
            >
              <Eye size={14} />
              Preview
            </button>
          )}

          <button
            onClick={onView}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[10px] font-bold hover:bg-stone-50 transition-colors"
          >
            <Info size={14} />
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Document Detail Modal ────────────────────────────────────────────────────

interface DocumentDetailModalProps {
  document: DocumentWithAnnotations | null;
  isOpen: boolean;
  onClose: () => void;
  onPreviewFile?: () => void;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  isOpen,
  onClose,
  onPreviewFile,
}) => {
  if (!isOpen || !document) return null;

  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return format(d, 'dd MMM yyyy, HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const mark = document.active_mark;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900">{document.title}</h3>
            <p className="text-[10px] text-stone-400 mt-0.5">
              {document.reference_no || 'No reference'} • {document.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Status */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={document.status} />
            {mark && <PriorityBadge priority={mark.priority} />}
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Created By</p>
              <p className="text-stone-700 font-medium flex items-center gap-1.5">
                <User size={14} className="text-stone-400" />
                {document.created_by_name}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Created At</p>
              <p className="text-stone-700 font-medium flex items-center gap-1.5">
                <Calendar size={14} className="text-stone-400" />
                {formatDate(document.created_at)}
              </p>
            </div>
            
            {mark && (
              <>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Marked By</p>
                  <p className="text-stone-700 font-medium flex items-center gap-1.5">
                    <Users size={14} className="text-stone-400" />
                    {mark.marked_by_name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Marked To</p>
                  <p className="text-stone-700 font-medium flex items-center gap-1.5">
                    <Users size={14} className="text-stone-400" />
                    {mark.marked_to_dept_name}
                    {mark.assigned_to_name && (
                      <span className="text-xs text-stone-400 font-normal">
                        (Assigned: {mark.assigned_to_name})
                      </span>
                    )}
                  </p>
                </div>
              </>
            )}

            {document.department_name && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Department</p>
                <p className="text-stone-700 font-medium">{document.department_name}</p>
              </div>
            )}
          </div>

          {/* Attached file preview */}
          {document.file_url && onPreviewFile && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Attached File</p>
              <button
                onClick={onPreviewFile}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <span className="truncate font-medium">{document.original_name || document.title}</span>
                <span className="inline-flex items-center gap-1 text-[#1d3331] text-xs font-bold shrink-0">
                  <Eye size={14} />
                  Preview
                </span>
              </button>
            </div>
          )}

          {/* Body */}
          {document.body && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Body</p>
              <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700 whitespace-pre-wrap border border-stone-100">
                {document.body}
              </div>
            </div>
          )}

          {/* Mark Details */}
          {mark && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Mark Details</p>
              <div className="rounded-lg bg-violet-50 border border-violet-100 p-3 space-y-1.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-700">Marked By:</span>
                  <span className="text-stone-600">{mark.marked_by_name}</span>
                  <span className="text-xs text-stone-400">({formatDate(mark.marked_at)})</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-700">To Department:</span>
                  <span className="text-stone-600">{mark.marked_to_dept_name}</span>
                </div>
                {mark.assigned_to_name && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-stone-700">Assigned To:</span>
                    <span className="text-stone-600">{mark.assigned_to_name}</span>
                  </div>
                )}
                {mark.instructions && (
                  <div>
                    <span className="font-medium text-stone-700">Instructions:</span>
                    <p className="text-stone-600 mt-0.5">{mark.instructions}</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 pt-1.5 border-t border-violet-100">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Marked: {formatDate(mark.marked_at)}
                  </span>
                  {mark.acknowledged_at && (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Acknowledged: {formatDate(mark.acknowledged_at)}
                    </span>
                  )}
                  {mark.completed_at && (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Completed: {formatDate(mark.completed_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Signature */}
          {document.is_signed && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-sm font-medium text-emerald-700">✓ Signed</p>
              {document.signed_by_name && (
                <p className="text-xs text-emerald-600">By: {document.signed_by_name}</p>
              )}
              {document.signed_at && (
                <p className="text-xs text-emerald-600">On: {formatDate(document.signed_at)}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const HelpDeskDocuments: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const myMarked          = useAppSelector(selectMyMarked);
  const loading           = useAppSelector(selectLoading);
  const actionInProgress  = useAppSelector(selectActionInProgress);
  const currentUser       = useAppSelector(selectCurrentUser);
  const isDeptHead        = useAppSelector(selectIsDeptHead);
  const allDepartments    = useAppSelector(selectAllDepartments);
  const allUsers          = useAppSelector(selectAllUsers);

  // ── Local State ────────────────────────────────────────────────────────────
  const [searchTerm,         setSearchTerm]         = useState('');
  const [statusFilter,       setStatusFilter]       = useState<StatusFilter>('all');
  const [selectedDocument,   setSelectedDocument]   = useState<DocumentWithAnnotations | null>(null);
  const [isModalOpen,        setIsModalOpen]        = useState(false);
  const [fetchError,         setFetchError]         = useState<string | null>(null);
  const [previewTarget,      setPreviewTarget]      = useState<PreviewTarget | null>(null);

  // Delegate state
  const [delegateModalOpen,  setDelegateModalOpen]  = useState(false);
  const [delegateDocument,   setDelegateDocument]   = useState<Document | null>(null);
  const [isDelegating,       setIsDelegating]       = useState(false);
  const [delegateModalKey,   setDelegateModalKey]   = useState(0);

  // Mark state
  const [markModalOpen,      setMarkModalOpen]      = useState(false);
  const [markDocumentTarget, setMarkDocumentTarget] = useState<Document | null>(null);
  const [isMarking,          setIsMarking]          = useState(false);
  const [markModalKey,       setMarkModalKey]       = useState(0);

  // Department documents (local state)
  const [departmentDocs,     setDepartmentDocs]     = useState<Document[]>([]);
  const [deptDocsLoading,    setDeptDocsLoading]    = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────

  // 1. Fetch my marked documents
  useEffect(() => {
    let cancelled = false;

    dispatch(fetchMyMarked())
      .unwrap()
      .catch((err: string) => {
        if (!cancelled) setFetchError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // 2. Fetch department documents if user is Dept Head
  useEffect(() => {
    if (!isDeptHead || !currentUser?.department_id) return;

    const fetchDeptDocs = async () => {
      setDeptDocsLoading(true);
      try {
        const result = await dispatch(
          fetchDocuments({ 
            department_id: currentUser.department_id ?? undefined, 
            limit: 100,
            status: 'dept_assigned',
          })
        ).unwrap();
        setDepartmentDocs(result.data);
      } catch (err) {
        toast.error(typeof err === 'string' ? err : 'Failed to load department documents');
      } finally {
        setDeptDocsLoading(false);
      }
    };

    fetchDeptDocs();
  }, [dispatch, isDeptHead, currentUser?.department_id]);

  // 3. Fetch departments (active) for the Mark Modal dropdown
  useEffect(() => {
    if (isDeptHead) {
      dispatch(fetchDepartments({ is_active: true }));
    }
  }, [dispatch, isDeptHead]);

  // 4. Fetch department users when component mounts and user is Dept Head
  useEffect(() => {
    if (isDeptHead && currentUser?.department_id) {
      dispatch(fetchUsers({
        department_id: currentUser.department_id ?? undefined,
        limit: 100,
      }));
    }
  }, [dispatch, isDeptHead, currentUser?.department_id]);

  // ── Memoized department users ─────────────────────────────────────────────

  // ✅ Fixed: Include currentUser as dependency to satisfy React Compiler
  const departmentUsers = useMemo(() => {
    const departmentId = currentUser?.department_id;
    if (!departmentId) return [];
    return allUsers
      .filter(u => u.department_id === departmentId)
      .map(u => ({ id: u.id, name: u.full_name }));
  }, [allUsers, currentUser]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleViewDocument = async (document: Document) => {
    try {
      const result = await dispatch(fetchDocumentById(document.id)).unwrap();
      setSelectedDocument(result);
      setIsModalOpen(true);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to load document details');
    }
  };

  const handlePreviewFile = (document: Document | DocumentWithAnnotations) => {
    if (!document.file_url) return;
    setPreviewTarget({
      url:      document.file_url,
      fileName: document.original_name || document.title,
    });
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await dispatch(acknowledgeMark(id)).unwrap();
      toast.success('Document acknowledged successfully');
      dispatch(fetchMyMarked());
      // Refresh department docs if dept head
      if (isDeptHead && currentUser?.department_id) {
        const result = await dispatch(
          fetchDocuments({ department_id: currentUser.department_id ?? undefined, limit: 100 })
        ).unwrap();
        setDepartmentDocs(result.data);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to acknowledge document');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await dispatch(completeMark(id)).unwrap();
      toast.success('Document marked as completed');
      dispatch(fetchMyMarked());
      // Refresh department docs if dept head
      if (isDeptHead && currentUser?.department_id) {
        const result = await dispatch(
          fetchDocuments({ department_id: currentUser.department_id ?? undefined, limit: 100 })
        ).unwrap();
        setDepartmentDocs(result.data);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to complete document');
    }
  };

  // ── Delegate handlers ─────────────────────────────────────────────────────

  const openDelegateModal = (document: Document) => {
    if (!isDeptHead || !currentUser?.department_id) {
      toast.error('You are not authorized to delegate');
      return;
    }
    setDelegateDocument(document);
    setDelegateModalKey((k) => k + 1);
    setDelegateModalOpen(true);
  };

  const handleDelegate = async (userId: string, instructions: string, priority: string) => {
    if (!delegateDocument || !currentUser?.department_id) return;

    setIsDelegating(true);
    try {
      const input: MarkDocumentInput = {
        department_id: currentUser.department_id,
        assigned_to: userId,
        instructions: instructions || undefined,
        priority: priority as 'low' | 'normal' | 'urgent',
      };

      await dispatch(markDocument({ id: delegateDocument.id, input })).unwrap();
      toast.success('Document delegated successfully');
      setDelegateModalOpen(false);
      setDelegateDocument(null);
      dispatch(fetchMyMarked());
      if (isDeptHead && currentUser.department_id) {
        const result = await dispatch(
          fetchDocuments({ department_id: currentUser.department_id ?? undefined, limit: 100 })
        ).unwrap();
        setDepartmentDocs(result.data);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delegate document');
    } finally {
      setIsDelegating(false);
    }
  };

  const closeDelegateModal = () => {
    setDelegateModalOpen(false);
    setDelegateDocument(null);
  };

  // ── Mark handlers ──────────────────────────────────────────────────────────

  const openMarkModal = (document: Document) => {
    if (!isDeptHead || !currentUser?.department_id) {
      toast.error('You are not authorized to mark documents');
      return;
    }
    setMarkDocumentTarget(document);
    setMarkModalKey((k) => k + 1);
    setMarkModalOpen(true);
  };

  const handleMark = async (userId: string, instructions: string, priority: string) => {
    if (!markDocumentTarget || !currentUser?.department_id) return;

    setIsMarking(true);
    try {
      const input: MarkDocumentInput = {
        department_id: currentUser.department_id,
        assigned_to: userId,
        instructions: instructions || undefined,
        priority: priority as 'low' | 'normal' | 'urgent',
      };

      await dispatch(markDocument({ id: markDocumentTarget.id, input })).unwrap();
      toast.success('Document marked successfully');
      setMarkModalOpen(false);
      setMarkDocumentTarget(null);
      dispatch(fetchMyMarked());
      if (isDeptHead && currentUser.department_id) {
        const result = await dispatch(
          fetchDocuments({ department_id: currentUser.department_id ?? undefined, limit: 100 })
        ).unwrap();
        setDepartmentDocs(result.data);
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to mark document');
    } finally {
      setIsMarking(false);
    }
  };

  const closeMarkModal = () => {
    setMarkModalOpen(false);
    setMarkDocumentTarget(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredDocuments = useMemo(() => {
    return (myMarked || []).filter((doc: Document) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.reference_no?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [myMarked, searchTerm, statusFilter]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:      myMarked?.length || 0,
    marked:     (myMarked || []).filter((d: Document) => d.status === 'marked').length,
    inProgress: (myMarked || []).filter((d: Document) => d.status === 'in_progress').length,
    completed:  (myMarked || []).filter((d: Document) => d.status === 'completed').length,
  }), [myMarked]);

  // ── Loading State ──────────────────────────────────────────────────────────

  if (loading && (myMarked?.length || 0) === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="animate-spin text-[#1d3331]" size={32} />
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────

  if (fetchError && !loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{fetchError}</span>
        </div>
      </div>
    );
  }

  // ── Prepare department list for Mark Modal ────────────────────────────────
  const userDepartment = allDepartments.find(d => d.id === currentUser?.department_id);
  const departmentsForModal = userDepartment ? [userDepartment] : [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1d3331]">My Documents</h1>
            <p className="text-sm text-stone-500 mt-1">Documents marked for your action</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <FileText size={16} className="text-stone-400" />
            <span>{stats.total} documents</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-stone-900">{stats.total}</p>
          <p className="text-[10px] text-stone-400 font-medium">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-violet-600">{stats.marked}</p>
          <p className="text-[10px] text-stone-400 font-medium">To Acknowledge</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-blue-600">{stats.inProgress}</p>
          <p className="text-[10px] text-stone-400 font-medium">In Progress</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-[10px] text-stone-400 font-medium">Completed</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">Status:</span>
            {(['all', 'marked', 'in_progress', 'completed'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-[#1d3331] text-white'
                    : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State for My Documents */}
      {!loading && filteredDocuments.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <FileText size={48} className="mx-auto text-stone-300 mb-4" />
          <h3 className="text-base font-serif font-bold text-stone-400">No documents found</h3>
          <p className="text-sm text-stone-400 mt-1">
            {searchTerm
              ? 'Try adjusting your search'
              : 'No documents have been marked for your action'}
          </p>
        </div>
      )}

      {/* My Documents List */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="space-y-3">
          {filteredDocuments.map((document: Document) => {
            const isAcknowledging = actionInProgress?.acknowledging === document.id;
            const isCompleting    = actionInProgress?.completing    === document.id;
            const isDelegatingDoc = isDelegating && delegateDocument?.id === document.id;

            return (
              <DocumentCard
                key={document.id}
                document={document}
                onView={() => handleViewDocument(document)}
                onPreviewFile={document.file_url ? () => handlePreviewFile(document) : undefined}
                onAcknowledge={document.status === 'marked' || document.status === 'user_assigned' ? () => handleAcknowledge(document.id) : undefined}
                onComplete={document.status === 'in_progress' ? () => handleComplete(document.id) : undefined}
                onDelegate={isDeptHead ? () => openDelegateModal(document) : undefined}
                isActionInProgress={isAcknowledging || isCompleting || isDelegatingDoc}
                isDeptHead={isDeptHead}
              />
            );
          })}
        </div>
      )}

      {/* ─── Department Documents Section (for Dept Head) ──────────────── */}
      {isDeptHead && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-bold text-[#1d3331]">Department Documents</h2>
            <span className="text-sm text-stone-500">
              {departmentDocs?.length || 0} documents
            </span>
          </div>

          {deptDocsLoading && (!departmentDocs || departmentDocs.length === 0) ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-[#1d3331]" size={24} />
            </div>
          ) : departmentDocs && departmentDocs.length > 0 ? (
            <div className="space-y-3">
              {departmentDocs.map((doc: Document) => {
                const isMarkingThis = isMarking && markDocumentTarget?.id === doc.id;
                // Show Mark button only for statuses that indicate department assignment
                const showMarkButton = doc.status === 'dept_assigned' || doc.status === 'marked';

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow p-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="p-2 rounded-xl bg-[#1d3331]/5 text-[#1d3331] shrink-0 mt-0.5">
                            <FileText size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-stone-900 truncate">{doc.title}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-500">
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {doc.created_by_name}
                              </span>
                              <span className="text-stone-300">•</span>
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {format(new Date(doc.created_at), 'dd MMM yyyy')}
                              </span>
                              {doc.reference_no && (
                                <>
                                  <span className="text-stone-300">•</span>
                                  <span className="font-mono text-[10px] text-stone-400">{doc.reference_no}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {doc.active_mark && (
                          <div className="mt-2 pl-9 text-xs text-stone-500">
                            <span className="font-medium">
                              {doc.status === 'dept_assigned' ? 'Assigned to' : 'Marked to'}:
                            </span> {doc.active_mark.marked_to_dept_name}
                            {doc.active_mark.assigned_to_name && ` (Assigned: ${doc.active_mark.assigned_to_name})`}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <StatusBadge status={doc.status} />

                        {showMarkButton && (
                          <button
                            onClick={() => openMarkModal(doc)}
                            disabled={isMarkingThis}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1d3331] text-white text-[10px] font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Mark this document to a user"
                          >
                            {isMarkingThis ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <UserPlus size={14} />
                            )}
                            Mark
                          </button>
                        )}

                        {/* Preview and Details */}
                        {doc.file_url && (
                          <button
                            onClick={() => handlePreviewFile(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[10px] font-bold hover:bg-stone-50 transition-colors"
                          >
                            <Eye size={14} />
                            Preview
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-[10px] font-bold hover:bg-stone-50 transition-colors"
                        >
                          <Info size={14} />
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <FileText size={32} className="mx-auto text-stone-300 mb-2" />
              <p className="text-sm text-stone-400">No documents found in your department</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Modals ──────────────────────────────────────────────────────── */}

      {/* Document Detail Modal */}
      <DocumentDetailModal
        document={selectedDocument}
        isOpen={isModalOpen}
        onClose={closeModal}
        onPreviewFile={
          selectedDocument?.file_url ? () => handlePreviewFile(selectedDocument) : undefined
        }
      />

      {/* Inline File Preview Modal */}
      {previewTarget && (
        <InlineFilePreviewModal
          url={previewTarget.url}
          fileName={previewTarget.fileName}
          onClose={() => setPreviewTarget(null)}
        />
      )}

      {/* Delegate Modal */}
      <DelegateModal
        key={delegateModalKey}
        isOpen={delegateModalOpen}
        document={delegateDocument}
        departmentUsers={departmentUsers}
        onClose={closeDelegateModal}
        onDelegate={handleDelegate}
        isSubmitting={isDelegating}
      />

      {/* Mark Modal */}
      <MarkModal
        key={markModalKey}
        isOpen={markModalOpen}
        document={markDocumentTarget}
        departments={departmentsForModal}
        departmentUsers={departmentUsers}
        defaultDepartmentId={currentUser?.department_id ?? ''}
        onClose={closeMarkModal}
        onMark={handleMark}
        isSubmitting={isMarking}
      />
    </div>
  );
};

export default HelpDeskDocuments;