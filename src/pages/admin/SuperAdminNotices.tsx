import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchBroadcasts,
  fetchNotices,
  fetchNoticesStats,
  fetchUnreadCount,
  fetchNoticesAudit,
  createBroadcast,
  updateBroadcast,
  sendBroadcast,
  deleteBroadcast,
  createNotice,
  updateNotice,
  publishNotice,
  deleteNotice,
  markBroadcastRead,
  markNoticeRead,
  setSearchQuery,
  selectAllBroadcasts,
  selectAllNotices,
  selectNoticesStats,
  selectUnreadCount,
  //selectNoticesAudit,
  selectBroadcastsLoading,
  selectNoticesLoading,
  selectNoticesMutating,
  selectNoticesError,
  selectNoticesSuccess,
  selectNoticesFilters,
  selectNoticesSearch,
  clearError,
  clearSuccess,
  type Broadcast,
  type Notice,
  type AudienceType,
  type DeliveryOption,
  type NoticeCategory,
} from '../../store/slices/noticesSlice';
import {
  Megaphone,
  FileText,
  Bell,
  Search,
  Plus,
  X,
  Users,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  Edit,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUDIENCE_OPTIONS: AudienceType[] = [
  'All Staff',
  'Registry Staff Only',
  'Judicial Officers',
  'Administrative Staff',
];

const DELIVERY_OPTIONS: DeliveryOption[] = [
  'In-App + Email',
  'In-App Only',
  'Email + SMS',
  'All Channels',
];

const CATEGORY_OPTIONS: NoticeCategory[] = [
  'General Notice',
  'Court Vacation',
  'Administrative Circular',
  'Urgent Notice',
  'Staff Information',
];

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </label>
  );
}

function GoldButton({
  children,
  icon,
  type = 'button',
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}

function GhostButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Banners ──────────────────────────────────────────────────────────────────

function ErrorBanner() {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectNoticesError);
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
      <button onClick={() => dispatch(clearError())} className="text-red-500 hover:text-red-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function SuccessBanner() {
  const dispatch = useAppDispatch();
  const success = useAppSelector(selectNoticesSuccess);
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
    return () => clearTimeout(timer);
  }, [success, dispatch]);
  if (!success) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <div className="flex items-start gap-2">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Operation completed successfully!</span>
      </div>
      <button onClick={() => dispatch(clearSuccess())} className="text-emerald-500 hover:text-emerald-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-stone-100 px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ isSent, isPublished }: { isSent?: boolean; isPublished?: boolean }) {
  if (isSent !== undefined) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          isSent ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}
      >
        {isSent ? <CheckCircle size={12} /> : <Clock size={12} />}
        {isSent ? 'Sent' : 'Draft'}
      </span>
    );
  }
  if (isPublished !== undefined) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}
      >
        {isPublished ? <CheckCircle size={12} /> : <Clock size={12} />}
        {isPublished ? 'Published' : 'Draft'}
      </span>
    );
  }
  return null;
}

// ─── Broadcast Card ───────────────────────────────────────────────────────────

function BroadcastCard({
  broadcast,
  onEdit,
  onDelete,
  onSend,
  onMarkRead,
}: {
  broadcast: Broadcast;
  onEdit: (b: Broadcast) => void;
  onDelete: (id: string) => void;
  onSend: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${
        broadcast.is_urgent ? 'border-red-500' : 'border-[#1E4620]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-stone-900">{broadcast.title}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-stone-400">
              {new Date(broadcast.created_at).toLocaleDateString('en-KE', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
            <StatusBadge isSent={broadcast.is_sent} />
            {broadcast.is_urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                <AlertTriangle size={10} />
                Urgent
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!broadcast.is_read && broadcast.is_sent && (
            <button
              onClick={() => onMarkRead(broadcast.id)}
              className="rounded p-1 text-blue-600 hover:bg-blue-50"
              title="Mark as read"
            >
              <Eye size={14} />
            </button>
          )}
          {!broadcast.is_sent && (
            <>
              <button
                onClick={() => onEdit(broadcast)}
                className="rounded p-1 text-blue-600 hover:bg-blue-50"
                title="Edit"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => onDelete(broadcast.id)}
                className="rounded p-1 text-red-600 hover:bg-red-50"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-600">{broadcast.body}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
          <Users size={12} />
          {broadcast.audience}
        </div>
        <div className="flex items-center gap-2">
          {broadcast.created_by_name && (
            <span className="text-xs text-stone-400">By: {broadcast.created_by_name}</span>
          )}
          {broadcast.read_count !== undefined && (
            <span className="text-xs text-stone-400">
              {broadcast.read_count}/{broadcast.total_recipients ?? '?'} read
            </span>
          )}
          {!broadcast.is_sent && (
            <button
              onClick={() => onSend(broadcast.id)}
              className="inline-flex items-center gap-1 rounded-md bg-[#C29B38] px-2 py-1 text-xs font-medium text-[#1E4620] transition-opacity hover:opacity-80"
            >
              <Send size={12} />
              Send Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Notice Card ──────────────────────────────────────────────────────────────

function NoticeCard({
  notice,
  onEdit,
  onDelete,
  onPublish,
  onMarkRead,
}: {
  notice: Notice;
  onEdit: (n: Notice) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${
        notice.category === 'Urgent Notice' ? 'border-[#C29B38]' : 'border-emerald-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-stone-900">{notice.title}</h3>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-stone-400">
              {new Date(notice.created_at).toLocaleDateString('en-KE', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </span>
            <StatusBadge isPublished={notice.is_published} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!notice.is_read && notice.is_published && (
            <button
              onClick={() => onMarkRead(notice.id)}
              className="rounded p-1 text-blue-600 hover:bg-blue-50"
              title="Mark as read"
            >
              <Eye size={14} />
            </button>
          )}
          {!notice.is_published && (
            <>
              <button
                onClick={() => onEdit(notice)}
                className="rounded p-1 text-blue-600 hover:bg-blue-50"
                title="Edit"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => onDelete(notice.id)}
                className="rounded p-1 text-red-600 hover:bg-red-50"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-600">{notice.body}</p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-stone-400">
          {notice.category} · {notice.visibility}
          {notice.read_count !== undefined && ` · ${notice.read_count} read`}
        </span>
        {!notice.is_published && (
          <button
            onClick={() => onPublish(notice.id)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
          >
            <CheckCircle size={12} />
            Publish
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminNotices: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ─────────────────────────────────────────────────────────────
  const broadcasts    = useAppSelector(selectAllBroadcasts);
  const notices       = useAppSelector(selectAllNotices);
  const stats         = useAppSelector(selectNoticesStats);
  const unreadCount   = useAppSelector(selectUnreadCount);
  const filters       = useAppSelector(selectNoticesFilters);
  const searchQuery   = useAppSelector(selectNoticesSearch);
  const loading       = useAppSelector(selectBroadcastsLoading);
  const noticesLoading = useAppSelector(selectNoticesLoading);
  const mutating      = useAppSelector(selectNoticesMutating);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'broadcast' | 'notice';
  } | null>(null);

  // Broadcast form
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [bSendTo, setBSendTo]   = useState<AudienceType>('All Staff');
  const [bSubject, setBSubject] = useState('');
  const [bMessage, setBMessage] = useState('');
  const [bDelivery, setBDelivery] = useState<DeliveryOption>('In-App + Email');
  const [bIsUrgent, setBIsUrgent] = useState(false);

  // Notice form
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [nTitle, setNTitle]         = useState('');
  const [nBody, setNBody]           = useState('');
  const [nCategory, setNCategory]   = useState<NoticeCategory>('General Notice');
  const [nVisibility, setNVisibility] = useState<AudienceType>('All Staff');

  // Quick broadcast
  const [quickAudience, setQuickAudience] = useState<AudienceType>('All Staff');
  const [quickMessage, setQuickMessage]   = useState('');

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchBroadcasts({}));
    dispatch(fetchNotices({}));
    dispatch(fetchNoticesStats());
    dispatch(fetchUnreadCount());
    dispatch(fetchNoticesAudit(20));
  }, [dispatch]);

  // ── Broadcast form helpers ────────────────────────────────────────────────

  const resetBroadcastForm = () => {
    setEditingBroadcast(null);
    setBSendTo('All Staff');
    setBSubject('');
    setBMessage('');
    setBDelivery('In-App + Email');
    setBIsUrgent(false);
  };

  const openBroadcastModal = (broadcast?: Broadcast) => {
    if (broadcast) {
      setEditingBroadcast(broadcast);
      setBSendTo(broadcast.audience);
      setBSubject(broadcast.title);
      setBMessage(broadcast.body);
      setBDelivery(broadcast.delivery_method ?? 'In-App + Email');
      setBIsUrgent(broadcast.is_urgent);
    } else {
      resetBroadcastForm();
    }
    setShowBroadcastModal(true);
  };

  const closeBroadcastModal = () => {
    setShowBroadcastModal(false);
    resetBroadcastForm();
  };

  // ── Notice form helpers ───────────────────────────────────────────────────

  const resetNoticeForm = () => {
    setEditingNotice(null);
    setNTitle('');
    setNBody('');
    setNCategory('General Notice');
    setNVisibility('All Staff');
  };

  const openNoticeModal = (notice?: Notice) => {
    if (notice) {
      setEditingNotice(notice);
      setNTitle(notice.title);
      setNBody(notice.body);
      setNCategory(notice.category);
      setNVisibility(notice.visibility ?? 'All Staff');
    } else {
      resetNoticeForm();
    }
    setShowNoticeModal(true);
  };

  const closeNoticeModal = () => {
    setShowNoticeModal(false);
    resetNoticeForm();
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveBroadcast = async () => {
    if (!bSubject.trim() || !bMessage.trim()) return;
    try {
      if (editingBroadcast) {
        await dispatch(updateBroadcast({
          id: editingBroadcast.id,
          input: {
            title: bSubject.trim(),
            body: bMessage.trim(),
            audience: bSendTo,
            delivery_method: bDelivery,
            is_urgent: bIsUrgent,
          },
        })).unwrap();
      } else {
        await dispatch(createBroadcast({
          title: bSubject.trim(),
          body: bMessage.trim(),
          audience: bSendTo,
          delivery_method: bDelivery,
          is_urgent: bIsUrgent,
        })).unwrap();
      }
      dispatch(fetchBroadcasts(filters));
      dispatch(fetchNoticesStats());
      closeBroadcastModal();
    } catch (err) {
      console.error('Failed to save broadcast:', err);
    }
  };

  const handleSendNow = async (id: string) => {
    try {
      await dispatch(sendBroadcast(id)).unwrap();
      dispatch(fetchBroadcasts(filters));
      dispatch(fetchNoticesStats());
    } catch (err) {
      console.error('Failed to send broadcast:', err);
    }
  };

  const handleSaveNotice = async () => {
    if (!nTitle.trim()) return;
    try {
      if (editingNotice) {
        await dispatch(updateNotice({
          id: editingNotice.id,
          input: {
            title: nTitle.trim(),
            body: nBody.trim(),
            category: nCategory,
            visibility: nVisibility,
          },
        })).unwrap();
      } else {
        await dispatch(createNotice({
          title: nTitle.trim(),
          body: nBody.trim() || `Category: ${nCategory}. Visible to: ${nVisibility}.`,
          category: nCategory,
          visibility: nVisibility,
        })).unwrap();
      }
      dispatch(fetchNotices(filters));
      dispatch(fetchNoticesStats());
      closeNoticeModal();
    } catch (err) {
      console.error('Failed to save notice:', err);
    }
  };

  const handlePublishNotice = async (id: string) => {
    try {
      await dispatch(publishNotice(id)).unwrap();
      dispatch(fetchNotices(filters));
      dispatch(fetchNoticesStats());
    } catch (err) {
      console.error('Failed to publish notice:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'broadcast') {
        await dispatch(deleteBroadcast(deleteTarget.id)).unwrap();
        dispatch(fetchBroadcasts(filters));
      } else {
        await dispatch(deleteNotice(deleteTarget.id)).unwrap();
        dispatch(fetchNotices(filters));
      }
      dispatch(fetchNoticesStats());
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleMarkRead = async (id: string, type: 'broadcast' | 'notice') => {
    try {
      if (type === 'broadcast') {
        await dispatch(markBroadcastRead(id)).unwrap();
      } else {
        await dispatch(markNoticeRead(id)).unwrap();
      }
      dispatch(fetchUnreadCount());
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleQuickSend = async () => {
    if (!quickMessage.trim()) return;
    try {
      await dispatch(createBroadcast({
        title: quickMessage.slice(0, 48) + (quickMessage.length > 48 ? '…' : ''),
        body: quickMessage.trim(),
        audience: quickAudience,
        delivery_method: 'In-App + Email',
        is_urgent: false,
      })).unwrap();
      dispatch(fetchBroadcasts(filters));
      dispatch(fetchNoticesStats());
      setQuickMessage('');
    } catch (err) {
      console.error('Failed to send quick broadcast:', err);
    }
  };

  const handleSearch = (value: string) => {
    dispatch(setSearchQuery(value));
    dispatch(fetchBroadcasts({ ...filters, search: value || undefined }));
    dispatch(fetchNotices({ ...filters, search: value || undefined }));
  };

  const totalUnread = (unreadCount?.broadcasts ?? 0) + (unreadCount?.notices ?? 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[640px] w-full bg-stone-50 p-6">
      <ErrorBanner />
      <SuccessBanner />

      {/* Page header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Notices &amp; Broadcasts</h1>
          <p className="mt-1 text-sm text-stone-500">
            Post notices and broadcast messages to staff
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {totalUnread} unread
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-100"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search..."
              className="h-10 w-48 rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Broadcasts', value: stats?.total_broadcasts ?? 0, color: 'text-stone-900' },
          { label: 'Total Notices',    value: stats?.total_notices    ?? 0, color: 'text-stone-900' },
          { label: 'Pending Broadcasts', value: stats?.pending_broadcasts ?? 0, color: 'text-amber-600' },
          { label: 'Unread', value: totalUnread, color: 'text-[#1E4620]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs text-stone-500">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => openBroadcastModal()}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-[#1E4620] shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: '#C29B38' }}
        >
          <Megaphone size={16} />
          New Broadcast
        </button>
        <button
          type="button"
          onClick={() => openNoticeModal()}
          className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          <FileText size={16} />
          Post Notice
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">

        {/* Broadcasts */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[#1E4620]">
            <Megaphone size={18} />
            Broadcasts
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[#C29B38]" />}
          </h2>

          <div className="space-y-4">
            {broadcasts.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
                <Megaphone className="mx-auto h-8 w-8 text-stone-300" />
                <p className="mt-2 text-sm text-stone-400">No broadcasts yet</p>
                <button
                  onClick={() => openBroadcastModal()}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#1E4620] hover:underline"
                >
                  <Plus size={12} />
                  Create your first broadcast
                </button>
              </div>
            ) : (
              broadcasts.map((b) => (
                <BroadcastCard
                  key={b.id}
                  broadcast={b}
                  onEdit={openBroadcastModal}
                  onDelete={(id) => setDeleteTarget({ id, type: 'broadcast' })}
                  onSend={handleSendNow}
                  onMarkRead={(id) => handleMarkRead(id, 'broadcast')}
                />
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Office Notices */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[#1E4620]">
              <FileText size={18} />
              Office Notices
              {noticesLoading && <Loader2 className="h-4 w-4 animate-spin text-[#C29B38]" />}
            </h2>

            <div className="space-y-4">
              {notices.length === 0 ? (
                <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-stone-300" />
                  <p className="mt-2 text-sm text-stone-400">No notices yet</p>
                  <button
                    onClick={() => openNoticeModal()}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#1E4620] hover:underline"
                  >
                    <Plus size={12} />
                    Post your first notice
                  </button>
                </div>
              ) : (
                notices.map((n) => (
                  <NoticeCard
                    key={n.id}
                    notice={n}
                    onEdit={openNoticeModal}
                    onDelete={(id) => setDeleteTarget({ id, type: 'notice' })}
                    onPublish={handlePublishNotice}
                    onMarkRead={(id) => handleMarkRead(id, 'notice')}
                  />
                ))
              )}
            </div>
          </div>

          {/* Quick Broadcast */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-stone-900">Quick Broadcast</h3>

            <div className="mb-3">
              <FieldLabel>Audience</FieldLabel>
              <select
                value={quickAudience}
                onChange={(e) => setQuickAudience(e.target.value as AudienceType)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <FieldLabel>Message</FieldLabel>
              <textarea
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
                placeholder="Type your broadcast message..."
                rows={3}
                className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleQuickSend}
                disabled={!quickMessage.trim() || mutating}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-[#1E4620] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: '#C29B38' }}
              >
                {mutating
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Megaphone size={14} />
                }
                Send Broadcast
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Broadcast Modal ───────────────────────────────────────────────── */}
      {showBroadcastModal && (
        <ModalShell
          title={editingBroadcast ? 'Edit Broadcast' : 'New Broadcast'}
          onClose={closeBroadcastModal}
          footer={
            <>
              <GhostButton onClick={closeBroadcastModal}>Cancel</GhostButton>
              <GoldButton
                onClick={handleSaveBroadcast}
                disabled={mutating || !bSubject.trim() || !bMessage.trim()}
                icon={mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={14} />}
              >
                {editingBroadcast ? 'Save Changes' : 'Save Broadcast'}
              </GoldButton>
            </>
          }
        >
          <div>
            <FieldLabel>Send To</FieldLabel>
            <select
              value={bSendTo}
              onChange={(e) => setBSendTo(e.target.value as AudienceType)}
              className={inputClasses}
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Subject</FieldLabel>
            <input
              type="text"
              value={bSubject}
              onChange={(e) => setBSubject(e.target.value)}
              placeholder="Broadcast subject line..."
              className={inputClasses}
            />
          </div>

          <div>
            <FieldLabel>Message</FieldLabel>
            <textarea
              value={bMessage}
              onChange={(e) => setBMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className={`${inputClasses} resize-none`}
            />
          </div>

          <div>
            <FieldLabel>Delivery Method</FieldLabel>
            <select
              value={bDelivery}
              onChange={(e) => setBDelivery(e.target.value as DeliveryOption)}
              className={inputClasses}
            >
              {DELIVERY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={bIsUrgent}
              onChange={(e) => setBIsUrgent(e.target.checked)}
              className="rounded border-stone-300"
            />
            <span className="text-sm text-stone-700">Mark as Urgent</span>
          </label>
        </ModalShell>
      )}

      {/* ── Notice Modal ──────────────────────────────────────────────────── */}
      {showNoticeModal && (
        <ModalShell
          title={editingNotice ? 'Edit Notice' : 'Post Notice'}
          onClose={closeNoticeModal}
          footer={
            <>
              <GhostButton onClick={closeNoticeModal}>Cancel</GhostButton>
              <GoldButton
                onClick={handleSaveNotice}
                disabled={mutating || !nTitle.trim()}
                icon={mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText size={14} />}
              >
                {editingNotice ? 'Save Changes' : 'Post Notice'}
              </GoldButton>
            </>
          }
        >
          <div>
            <FieldLabel>Notice Title</FieldLabel>
            <input
              type="text"
              value={nTitle}
              onChange={(e) => setNTitle(e.target.value)}
              placeholder="e.g. Court Vacation Notice"
              className={inputClasses}
            />
          </div>

          <div>
            <FieldLabel>Category</FieldLabel>
            <select
              value={nCategory}
              onChange={(e) => setNCategory(e.target.value as NoticeCategory)}
              className={inputClasses}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Visibility</FieldLabel>
            <select
              value={nVisibility}
              onChange={(e) => setNVisibility(e.target.value as AudienceType)}
              className={inputClasses}
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Body (Optional)</FieldLabel>
            <textarea
              value={nBody}
              onChange={(e) => setNBody(e.target.value)}
              placeholder={`Category: ${nCategory}. Visible to: ${nVisibility}.`}
              rows={3}
              className={`${inputClasses} resize-none`}
            />
          </div>
        </ModalShell>
      )}

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-2 flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-semibold">Confirm Delete</h3>
            </div>
            <p className="mb-4 text-sm text-stone-600">
              Are you sure you want to delete this {deleteTarget.type}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setDeleteTarget(null)}>Cancel</GhostButton>
              <button
                onClick={handleDelete}
                disabled={mutating}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {mutating && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminNotices;