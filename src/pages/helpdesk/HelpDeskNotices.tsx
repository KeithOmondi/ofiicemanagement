import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  // Actions
  fetchBroadcasts,
  fetchNotices,
  fetchNoticesStats,
  fetchUnreadCount,
  markBroadcastRead,
  markNoticeRead,
  setSearchQuery,
  // Selectors
  selectAllBroadcasts,
  selectAllNotices,
  selectNoticesStats,
  selectUnreadCount,
  selectBroadcastsLoading,
  selectNoticesLoading,
  selectNoticesMutating,
  selectNoticesError,
  selectNoticesFilters,
  selectNoticesSearch,
  clearError,
} from '../../store/slices/noticesSlice';
import {
  Megaphone,
  FileText,
  Search,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Wifi,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AudienceTag = {
  label: string;
  icon: 'users' | 'check' | 'urgent';
};

// ─── UI Helpers ──────────────────────────────────────────────────────────────

const AudienceBadge = ({ tag }: { tag: AudienceTag }) => {
  const styles: Record<AudienceTag['icon'], { bg: string; text: string; Icon: typeof Users }> = {
    check: { bg: 'bg-emerald-50', text: 'text-emerald-700', Icon: Users },
    users: { bg: 'bg-stone-100', text: 'text-stone-600', Icon: Users },
    urgent: { bg: 'bg-red-50', text: 'text-red-700', Icon: AlertTriangle },
  };
  const { bg, text, Icon } = styles[tag.icon];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${bg} ${text}`}>
      <Icon size={12} />
      {tag.label}
    </span>
  );
};

const StatusBadge = ({ isSent, isPublished }: { isSent?: boolean; isPublished?: boolean }) => {
  if (isSent !== undefined) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isSent ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}>
        {isSent ? <CheckCircle size={12} /> : <Clock size={12} />}
        {isSent ? 'Sent' : 'Draft'}
      </span>
    );
  }
  if (isPublished !== undefined) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}>
        {isPublished ? <CheckCircle size={12} /> : <Clock size={12} />}
        {isPublished ? 'Published' : 'Draft'}
      </span>
    );
  }
  return null;
};

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

// ─── Main Component ───────────────────────────────────────────────────────────

const HelpDeskNotices: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const broadcasts = useAppSelector(selectAllBroadcasts);
  const notices = useAppSelector(selectAllNotices);
  const stats = useAppSelector(selectNoticesStats);
  const unreadCount = useAppSelector(selectUnreadCount);
  const filters = useAppSelector(selectNoticesFilters);
  const searchQuery = useAppSelector(selectNoticesSearch);
  const loading = useAppSelector(selectBroadcastsLoading);
  const noticesLoading = useAppSelector(selectNoticesLoading);
  const mutating = useAppSelector(selectNoticesMutating);

  // ── Local State ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'notices'>('broadcasts');

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchBroadcasts({}));
    dispatch(fetchNotices({}));
    dispatch(fetchNoticesStats());
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleMarkRead = async (id: string, type: 'broadcast' | 'notice') => {
    try {
      if (type === 'broadcast') {
        await dispatch(markBroadcastRead(id)).unwrap();
        await dispatch(fetchUnreadCount());
      } else {
        await dispatch(markNoticeRead(id)).unwrap();
        await dispatch(fetchUnreadCount());
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleSearch = (value: string) => {
    dispatch(setSearchQuery(value));
    dispatch(fetchBroadcasts({ ...filters, search: value || undefined }));
    dispatch(fetchNotices({ ...filters, search: value || undefined }));
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[640px] w-full bg-stone-50 p-6">
      {/* Error Banner */}
      <ErrorBanner />

      {/* Page header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 font-serif">Notices &amp; Broadcasts</h1>
          <p className="mt-1 text-sm text-stone-500 font-serif">
            View notices and broadcast messages from the Registrar
            {unreadCount && (unreadCount.broadcasts + unreadCount.notices > 0) && (
              <span className="ml-2 font-serif inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {unreadCount.broadcasts + unreadCount.notices} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
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
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 font-serif">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Total Broadcasts</p>
          <p className="text-xl font-bold text-stone-900">{stats?.total_broadcasts || 0}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Total Notices</p>
          <p className="text-xl font-bold text-stone-900">{stats?.total_notices || 0}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Pending Broadcasts</p>
          <p className="text-xl font-bold text-amber-600">{stats?.pending_broadcasts || 0}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Unread</p>
          <p className="text-xl font-bold text-[#1E4620]">
            {(unreadCount?.broadcasts || 0) + (unreadCount?.notices || 0)}
          </p>
        </div>
      </div>

      

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-stone-200 bg-white p-1">
        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
            activeTab === 'broadcasts' ? 'bg-[#1a3d1c] text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Megaphone className="inline h-4 w-4 mr-2" />
          Broadcasts
          {loading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
            activeTab === 'notices' ? 'bg-[#1a3d1c] text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <FileText className="inline h-4 w-4 mr-2" />
          Notices
          {noticesLoading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main content */}
        <div>
          {activeTab === 'broadcasts' ? (
            <>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold" style={{ color: '#1E4620' }}>
                <Megaphone size={18} />
                Broadcasts
              </h2>
              <div className="space-y-4">
                {broadcasts.length === 0 ? (
                  <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
                    <Megaphone className="mx-auto h-8 w-8 text-stone-300" />
                    <p className="mt-2 text-sm text-stone-400">No broadcasts yet</p>
                  </div>
                ) : (
                  broadcasts.map((b) => (
                    <div
                      key={b.id}
                      className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${
                        b.is_urgent ? 'border-red-500' : 'border-[#1E4620]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-stone-900 truncate">{b.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-stone-400">
                              {new Date(b.created_at).toLocaleDateString()}
                            </span>
                            <StatusBadge isSent={b.is_sent} />
                          </div>
                        </div>
                        {!b.is_read && b.is_sent && (
                          <button
                            onClick={() => handleMarkRead(b.id, 'broadcast')}
                            className="rounded p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Mark as read"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{b.body}</p>
                      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                        <AudienceBadge tag={{
                          label: `Sent to ${b.audience}`,
                          icon: b.audience === 'All Staff' ? 'check' : 'users',
                        }} />
                        <span className="text-xs text-stone-400">By: {b.created_by_name || 'System'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold" style={{ color: '#1E4620' }}>
                <FileText size={18} />
                Office Notices
              </h2>
              <div className="space-y-4">
                {notices.length === 0 ? (
                  <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
                    <FileText className="mx-auto h-8 w-8 text-stone-300" />
                    <p className="mt-2 text-sm text-stone-400">No notices yet</p>
                  </div>
                ) : (
                  notices.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${
                        n.category === 'Urgent Notice' ? 'border-[#C29B38]' : 'border-emerald-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-stone-900 truncate">{n.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-stone-400">
                              {new Date(n.created_at).toLocaleDateString()}
                            </span>
                            <StatusBadge isPublished={n.is_published} />
                          </div>
                        </div>
                        {!n.is_read && n.is_published && (
                          <button
                            onClick={() => handleMarkRead(n.id, 'notice')}
                            className="rounded p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Mark as read"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{n.body}</p>
                      <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-stone-400">
                          {n.category} · {n.visibility}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Right column: Quick stats */}
        <div className="space-y-6">
          {/* Unread summary */}
          {unreadCount && (unreadCount.broadcasts + unreadCount.notices > 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-800">Unread Items</h4>
              <div className="mt-2 space-y-1 text-sm text-amber-700">
                <p>Broadcasts: {unreadCount.broadcasts}</p>
                <p>Notices: {unreadCount.notices}</p>
              </div>
              <button
                onClick={() => {
                  // Mark all as read - could be implemented as a bulk action
                  broadcasts.forEach(b => {
                    if (!b.is_read && b.is_sent) {
                      handleMarkRead(b.id, 'broadcast');
                    }
                  });
                  notices.forEach(n => {
                    if (!n.is_read && n.is_published) {
                      handleMarkRead(n.id, 'notice');
                    }
                  });
                }}
                className="mt-3 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                Mark all as read
              </button>
            </div>
          )}

          {/* Connection status */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h4 className="mb-2 text-sm font-medium text-stone-700">Status</h4>
            <div className="flex items-center gap-2">
              {mutating ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#C29B38]" />
              ) : (
                <Wifi className="h-4 w-4 text-emerald-500" />
              )}
              <span className="text-xs text-stone-500">
                {mutating ? 'Syncing...' : 'Connected'}
              </span>
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpDeskNotices;