import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchMessages,
  fetchGroups,
  fetchUnreadCount,
  sendMessage,
  markMessageAsRead,
  createGroup,
  setActiveTab,
  setSelectedGroup,
  setSelectedMessage,
  setCurrentThread,
  selectAllMessages,
  selectAllGroups,
  selectUnreadCount,
  selectActiveTab,
  selectMessagesLoading,
  selectSending,
  selectSocketConnected,
  selectTypingUsers,
  type Message,
} from '../../store/slices/messagesSlice';
import { fetchUsers, selectAllUsers, selectUsersListLoading, selectUsersError } from '../../store/slices/userSlice';
import { useSocket, type SendMessageData } from '../../socket/client';
import {
  Search,
  Bell,
  Plus,
  Inbox,
  Send as SendIcon,
  Megaphone,
  Paperclip,
  Loader2,
  Wifi,
  WifiOff,
  User,
  X,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabKey = 'inbox' | 'sent' | 'broadcast';
type GroupType = 'department' | 'project' | 'broadcast';

interface GroupModalState {
  isOpen: boolean;
  name: string;
  description: string;
  groupType: GroupType;
  selectedMembers: string[];
  isLoading: boolean;
  searchTerm: string;
  error: string | null;
}

// Typed shape of the Redux root state
interface RootState {
  auth: {
    user: {
      id: string;
      full_name?: string;
      email?: string;
    } | null;
    accessToken: string | null;
  };
}

const INITIAL_MODAL: GroupModalState = {
  isOpen: false,
  name: '',
  description: '',
  groupType: 'project',
  selectedMembers: [],
  isLoading: false,
  searchTerm: '',
  error: null,
};

// ─── Component ─────────────────────────────────────────────────────────────────

const SuperAdminMessages: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    sendMessage: sendSocketMessage,
    sendTyping,
    markAsRead: markAsReadSocket,
    joinGroup,
  } = useSocket();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const currentUserId = useAppSelector(
    (state: RootState) => state.auth.user?.id ?? ''
  );
  const authToken = useAppSelector((state: RootState) => state.auth.accessToken);

  // ── Redux Selectors ───────────────────────────────────────────────────────
  const messages = useAppSelector(selectAllMessages);
  const groups = useAppSelector(selectAllGroups);
  const unreadCount = useAppSelector(selectUnreadCount);
  const activeTab = useAppSelector(selectActiveTab);
  const loading = useAppSelector(selectMessagesLoading);
  const sending = useAppSelector(selectSending);
  const socketConnected = useAppSelector(selectSocketConnected);
  const typingUsers = useAppSelector(selectTypingUsers);
  const allUsers = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);
  const usersError = useAppSelector(selectUsersError);

  // ── Local State ───────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newDMUserId, setNewDMUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [groupModal, setGroupModal] = useState<GroupModalState>(INITIAL_MODAL);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [showNewChatDropdown, setShowNewChatDropdown] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const newChatRef = useRef<HTMLDivElement | null>(null);
  const initialFetchDone = useRef(false);

  // ── Memoized Values ──────────────────────────────────────────────────────

  // Memoize filtered messages to prevent unnecessary re-renders
  const filteredMessages = useMemo(
    () =>
      messages.filter((thread) => {
        if (!searchTerm.trim()) return true;
        const name = (thread.sender_name ?? thread.group_name ?? '').toLowerCase();
        return (
          name.includes(searchTerm.toLowerCase()) ||
          thread.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }),
    [messages, searchTerm]
  );

  // Memoize selected thread with proper grouping
  const selectedThread = useMemo(() => {
    if (selectedGroupId) {
      const groupMessages = messages.filter(m => m.group_id === selectedGroupId);
      return groupMessages.length > 0 ? groupMessages[0] : null;
    }
    if (selectedUserId) {
      const dmMessages = messages.filter(m => 
        !m.group_id && 
        ((m.sender_id === currentUserId && m.recipient_id === selectedUserId) ||
         (m.sender_id === selectedUserId && m.recipient_id === currentUserId))
      );
      return dmMessages.length > 0 ? dmMessages[0] : null;
    }
    if (selectedThreadId) {
      return messages.find(m => m.id === selectedThreadId) ?? null;
    }
    return null;
  }, [messages, selectedThreadId, selectedGroupId, selectedUserId, currentUserId]);

  // Memoize new DM user
  const newDMUser = useMemo(
    () => (newDMUserId ? (allUsers.find((u) => u.id === newDMUserId) ?? null) : null),
    [allUsers, newDMUserId]
  );

  // Memoize conversation name
  const conversationName = useMemo(() => {
    if (selectedGroupId) {
      const group = groups.find(g => g.id === selectedGroupId);
      return group?.name ?? 'Group Chat';
    }
    if (selectedUserId) {
      const user = allUsers.find(u => u.id === selectedUserId);
      return user?.full_name ?? 'Unknown User';
    }
    if (newDMUser) return newDMUser.full_name;
    return selectedThread?.group_name ?? selectedThread?.sender_name ?? '';
  }, [selectedGroupId, selectedUserId, newDMUser, selectedThread, groups, allUsers]);

  // Memoize thread messages - FIXED to properly group by conversation
  const threadMessages = useMemo(() => {
    if (selectedGroupId) {
      // Group chat - all messages with this group_id
      return messages.filter((m) => m.group_id === selectedGroupId);
    }
    if (selectedUserId) {
      // DM - messages between current user and selected user
      return messages.filter(
        (m) =>
          !m.group_id &&
          ((m.sender_id === currentUserId && m.recipient_id === selectedUserId) ||
           (m.sender_id === selectedUserId && m.recipient_id === currentUserId))
      );
    }
    if (selectedThreadId) {
      // Single message thread - find all messages in this conversation
      const thread = messages.find(m => m.id === selectedThreadId);
      if (!thread) return [];
      if (thread.group_id) {
        return messages.filter((m) => m.group_id === thread.group_id);
      }
      // DM thread
      const otherId = thread.sender_id === currentUserId 
        ? thread.recipient_id 
        : thread.sender_id;
      if (!otherId) return [thread];
      return messages.filter(
        (m) =>
          !m.group_id &&
          ((m.sender_id === currentUserId && m.recipient_id === otherId) ||
           (m.sender_id === otherId && m.recipient_id === currentUserId))
      );
    }
    return [];
  }, [messages, selectedGroupId, selectedUserId, selectedThreadId, currentUserId]);

  // Memoize new chat users
  const newChatUsers = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          u.is_active &&
          u.id !== currentUserId &&
          (u.full_name.toLowerCase().includes(newChatSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(newChatSearch.toLowerCase()))
      ),
    [allUsers, currentUserId, newChatSearch]
  );

  // Memoize filtered modal users
  const filteredModalUsers = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          u.is_active &&
          !groupModal.selectedMembers.includes(u.id) &&
          (u.full_name.toLowerCase().includes(groupModal.searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(groupModal.searchTerm.toLowerCase()))
      ),
    [allUsers, groupModal.selectedMembers, groupModal.searchTerm]
  );

  // Memoize show conversation flag
  const showConversation = useMemo(
    () => selectedThreadId !== null || selectedGroupId !== null || selectedUserId !== null || newDMUserId !== null,
    [selectedThreadId, selectedGroupId, selectedUserId, newDMUserId]
  );

  // ── Initial data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    // Only fetch once
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;

    dispatch(fetchGroups({}));
    dispatch(fetchMessages({}));
    dispatch(fetchUnreadCount());
    
    // Debug: Log the auth token to verify it exists
    console.log('Auth token exists:', !!authToken);
    
    // Fetch users - handle the response properly
    dispatch(fetchUsers({}))
      .unwrap()
      .then((response) => {
        // response is UserPaginationResponse with { data, total, page, limit, totalPages }
        const userCount = response?.data?.length ?? 0;
        console.log('Users fetched successfully:', userCount, 'users');
        setFetchError(null);
      })
      .catch((err) => {
        console.error('Failed to fetch users:', err);
        setFetchError(typeof err === 'string' ? err : 'Failed to load users');
      });
  }, [dispatch, authToken]);

  // Retry fetching users if they failed
  const handleRetryUsers = () => {
    setFetchError(null);
    dispatch(fetchUsers({}))
      .unwrap()
      .then((response) => {
        const userCount = response?.data?.length ?? 0;
        console.log('Users fetched successfully on retry:', userCount, 'users');
        setFetchError(null);
      })
      .catch((err) => {
        console.error('Failed to fetch users on retry:', err);
        setFetchError(typeof err === 'string' ? err : 'Failed to load users');
      });
  };

  // Join group socket rooms when groups load
  useEffect(() => {
    if (socketConnected && groups.length > 0) {
      groups.forEach((g) => joinGroup(g.id));
    }
  }, [groups, socketConnected, joinGroup]);

  // Auto-scroll to bottom on new messages or thread change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  // Close "New Chat" dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        newChatRef.current &&
        !newChatRef.current.contains(e.target as Node)
      ) {
        setShowNewChatDropdown(false);
        setNewChatSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTabChange = (tab: TabKey) => {
    dispatch(setActiveTab(tab));
    dispatch(fetchMessages({}));
    // Clear selection when changing tabs
    setSelectedThreadId(null);
    setSelectedGroupId(null);
    setSelectedUserId(null);
    setNewDMUserId(null);
    dispatch(setSelectedGroup(null));
    dispatch(setCurrentThread([]));
  };

  // FIX: Handle thread selection properly
  const handleSelectThread = (message: Message) => {
    if (message.group_id) {
      // Group chat
      setSelectedGroupId(message.group_id);
      setSelectedThreadId(null);
      setSelectedUserId(null);
      setNewDMUserId(null);
      dispatch(setSelectedGroup(groups.find(g => g.id === message.group_id) ?? null));
      // Mark unread messages in this group as read
      const unreadInGroup = messages.filter(
        m => m.group_id === message.group_id && !m.is_read && m.sender_id !== currentUserId
      );
      unreadInGroup.forEach(m => handleMarkAsRead(m.id));
    } else {
      // DM - find the other participant
      const otherId = message.sender_id === currentUserId 
        ? message.recipient_id 
        : message.sender_id;
      if (otherId) {
        setSelectedUserId(otherId);
        setSelectedThreadId(null);
        setSelectedGroupId(null);
        setNewDMUserId(null);
        // Mark unread messages from this user as read
        const unreadFromUser = messages.filter(
          m => 
            !m.group_id && 
            m.sender_id === otherId && 
            m.recipient_id === currentUserId && 
            !m.is_read
        );
        unreadFromUser.forEach(m => handleMarkAsRead(m.id));
      }
    }
    dispatch(setSelectedMessage(message));
  };

  const handleSendMessage = async () => {
    if (!draft.trim()) return;

    // Case 1 — reply in a group chat
    if (selectedGroupId) {
      const messageData: SendMessageData = {
        content: draft.trim(),
        group_id: selectedGroupId,
        recipient_id: null,
        message_type: activeTab === 'broadcast' ? 'broadcast' : 'text',
      };
      try {
        if (socketConnected) {
          const result = await sendSocketMessage(messageData);
          if (!result.success) {
            await dispatch(sendMessage(messageData)).unwrap();
          }
        } else {
          await dispatch(sendMessage(messageData)).unwrap();
        }
        setDraft('');
        // Refresh messages
        dispatch(fetchMessages({}));
      } catch (err) {
        console.error('Failed to send message:', err);
      }
      return;
    }

    // Case 2 — reply in a DM
    if (selectedUserId) {
      const messageData: SendMessageData = {
        content: draft.trim(),
        group_id: null,
        recipient_id: selectedUserId,
        message_type: 'text',
      };
      try {
        if (socketConnected) {
          const result = await sendSocketMessage(messageData);
          if (!result.success) {
            await dispatch(sendMessage(messageData)).unwrap();
          }
        } else {
          await dispatch(sendMessage(messageData)).unwrap();
        }
        setDraft('');
        dispatch(fetchMessages({}));
      } catch (err) {
        console.error('Failed to send message:', err);
      }
      return;
    }

    // Case 3 — start a brand-new DM (no thread exists yet)
    if (newDMUserId) {
      const messageData: SendMessageData = {
        content: draft.trim(),
        group_id: null,
        recipient_id: newDMUserId,
        message_type: 'text',
      };
      try {
        let sent: Message | undefined;
        if (socketConnected) {
          const result = await sendSocketMessage(messageData);
          if (!result.success) {
            sent = await dispatch(sendMessage(messageData)).unwrap();
          } else {
            sent = result.message;
          }
        } else {
          sent = await dispatch(sendMessage(messageData)).unwrap();
        }
        setDraft('');
        // After sending, switch to the DM view
        if (sent) {
          setNewDMUserId(null);
          setSelectedUserId(newDMUserId);
          setSelectedThreadId(null);
          setSelectedGroupId(null);
          dispatch(fetchMessages({}));
        }
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    }
  };

  const handleMarkAsRead = (messageId: string) => {
    if (socketConnected) markAsReadSocket(messageId);
    dispatch(markMessageAsRead(messageId));
  };

  const handleTyping = (isTyping: boolean) => {
    if (selectedGroupId) {
      sendTyping({
        group_id: selectedGroupId,
        recipient_id: undefined,
        is_typing: isTyping,
      });
    } else if (selectedUserId) {
      sendTyping({
        group_id: undefined,
        recipient_id: selectedUserId,
        is_typing: isTyping,
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedGroupId) {
          sendTyping({
            group_id: selectedGroupId,
            recipient_id: undefined,
            is_typing: false,
          });
        } else if (selectedUserId) {
          sendTyping({
            group_id: undefined,
            recipient_id: selectedUserId,
            is_typing: false,
          });
        }
      }, 2000);
    }
  };

  const handleStartDM = (userId: string) => {
    // Check if there's an existing DM thread
    const existing = messages.find(
      (m) =>
        !m.group_id &&
        ((m.sender_id === currentUserId && m.recipient_id === userId) ||
          (m.sender_id === userId && m.recipient_id === currentUserId))
    );
    if (existing) {
      // Switch to existing DM
      setSelectedUserId(userId);
      setSelectedThreadId(null);
      setSelectedGroupId(null);
      setNewDMUserId(null);
      dispatch(setSelectedMessage(existing));
    } else {
      // Start new DM
      setSelectedUserId(null);
      setSelectedThreadId(null);
      setSelectedGroupId(null);
      setNewDMUserId(userId);
    }
    setShowNewChatDropdown(false);
    setNewChatSearch('');
  };

  const handleOpenGroupModal = () => setGroupModal({ ...INITIAL_MODAL, isOpen: true });
  const handleCloseGroupModal = () => setGroupModal(INITIAL_MODAL);

  const handleAddMember = (userId: string) => {
    if (groupModal.selectedMembers.includes(userId)) return;
    setGroupModal((prev) => ({
      ...prev,
      selectedMembers: [...prev.selectedMembers, userId],
      searchTerm: '',
    }));
  };

  const handleRemoveMember = (userId: string) => {
    setGroupModal((prev) => ({
      ...prev,
      selectedMembers: prev.selectedMembers.filter((id) => id !== userId),
    }));
  };

  const handleGroupSubmit = async () => {
    if (!groupModal.name.trim() || groupModal.selectedMembers.length === 0) return;
    setGroupModal((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await dispatch(
        createGroup({
          name: groupModal.name.trim(),
          description: groupModal.description.trim() || null,
          group_type: groupModal.groupType,
          member_ids: groupModal.selectedMembers,
        })
      ).unwrap();
      setGroupModal(INITIAL_MODAL);
      dispatch(fetchGroups({}));
      dispatch(fetchMessages({}));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to create group. Please try again.';
      setGroupModal((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  };

  const getTypingText = (senderId: string): string | null => {
    const t = typingUsers[senderId];
    return t?.is_typing ? `${t.user_name} is typing…` : null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Determine if we should show an error state
  const showError = fetchError || usersError;

  return (
    <div className="flex h-full min-h-[640px] w-full flex-col bg-stone-50 p-6">
      {/* Connection banner */}
      <div className="mb-2 flex items-center gap-2">
        {socketConnected ? (
          <Wifi className="h-4 w-4 text-emerald-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className={`text-xs ${socketConnected ? 'text-emerald-600' : 'text-red-500'}`}>
          {socketConnected ? 'Connected' : 'Disconnected'}
        </span>
        {!socketConnected && (
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-amber-600 hover:underline"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Page header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Messages</h1>
          <p className="mt-1 text-sm text-stone-500">
            Communicate with your team
            {unreadCount && unreadCount.total > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {unreadCount.total} unread
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-100"
          >
            <Bell size={18} />
          </button>

          {/* New Chat dropdown */}
          <div className="relative" ref={newChatRef}>
            <button
              type="button"
              onClick={() => setShowNewChatDropdown((v) => !v)}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
            >
              <SendIcon size={15} />
              New Chat
              <ChevronDown size={14} />
            </button>

            {showNewChatDropdown && (
              <div className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-stone-200 bg-white shadow-lg">
                <div className="border-b border-stone-100 p-3">
                  <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                    <Search size={14} className="text-stone-400" />
                    <input
                      autoFocus
                      type="text"
                      value={newChatSearch}
                      onChange={(e) => setNewChatSearch(e.target.value)}
                      placeholder="Search people…"
                      className="w-full bg-transparent text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {usersLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-[#C29B38]" />
                      <p className="text-xs text-stone-400">Loading users…</p>
                    </div>
                  ) : showError ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <p className="text-xs text-red-500 text-center">{fetchError || usersError}</p>
                      <button
                        onClick={handleRetryUsers}
                        className="text-xs text-[#C29B38] hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : allUsers.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-stone-400">
                      No users available
                    </p>
                  ) : newChatUsers.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-stone-400">
                      No users found
                    </p>
                  ) : (
                    newChatUsers.slice(0, 20).map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleStartDM(user.id)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-stone-50"
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: '#1E4620' }}
                        >
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-stone-800">
                            {user.full_name}
                          </p>
                          <p className="truncate text-xs text-stone-400">
                            {user.email}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New Group */}
          <button
            type="button"
            onClick={handleOpenGroupModal}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-[#1E4620] shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: '#C29B38' }}
          >
            <Plus size={16} />
            New Group
          </button>
        </div>
      </div>

      {/* Error banner for users fetch */}
      {showError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">Failed to load users: {fetchError || usersError}</span>
          <button
            onClick={handleRetryUsers}
            className="rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main panel */}
      <div className="grid flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[400px_1fr]">
        {/* ── Thread list ───────────────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
          {/* Tabs */}
          <div className="flex border-b border-stone-200 px-2">
            {(
              [
                { key: 'inbox' as TabKey, label: 'Inbox', icon: Inbox },
                { key: 'sent' as TabKey, label: 'Sent', icon: SendIcon },
                { key: 'broadcast' as TabKey, label: 'Broadcast', icon: Megaphone },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabChange(key)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition ${
                    isActive ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <Icon size={15} style={isActive ? { color: '#C29B38' } : undefined} />
                  {label}
                  {key === 'inbox' && (unreadCount?.total ?? 0) > 0 && (
                    <span
                      className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: '#C29B38' }}
                    >
                      {unreadCount!.total}
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="absolute inset-x-3 -bottom-px h-0.5 rounded-full"
                      style={{ backgroundColor: '#C29B38' }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="p-3">
            <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
              <Search size={15} className="text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search messages…"
                className="w-full bg-transparent text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}>
                  <X size={14} className="text-stone-400 hover:text-stone-600" />
                </button>
              )}
            </div>
          </div>

          {/* Thread items */}
          <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#C29B38]" />
                <p className="text-xs text-stone-400">Loading messages…</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                  <Inbox size={20} className="text-stone-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-600">
                    {searchTerm ? 'No results found' : 'No messages yet'}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {searchTerm
                      ? 'Try a different search term'
                      : 'Start a new chat or create a group above'}
                  </p>
                </div>
              </div>
            ) : (
              // Group messages by conversation
              (() => {
                // Create a map of unique conversations
                const conversationMap = new Map();
                
                filteredMessages.forEach((msg) => {
                  let key: string;
                  let displayName: string;
                  let isUnread = false;
                  
                  if (msg.group_id) {
                    key = `group_${msg.group_id}`;
                    const group = groups.find(g => g.id === msg.group_id);
                    displayName = group?.name ?? 'Group Chat';
                  } else {
                    // DM - use sorted participant IDs as key
                    const participants = [msg.sender_id, msg.recipient_id].filter(Boolean).sort();
                    key = `dm_${participants.join('_')}`;
                    const otherId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
                    const user = allUsers.find(u => u.id === otherId);
                    displayName = user?.full_name ?? 'Unknown User';
                  }
                  
                  // Check if this message is unread
                  if (!msg.is_read && msg.sender_id !== currentUserId) {
                    isUnread = true;
                  }
                  
                  // Only keep the latest message per conversation
                  if (!conversationMap.has(key) || 
                      new Date(msg.created_at) > new Date(conversationMap.get(key).created_at)) {
                    conversationMap.set(key, {
                      ...msg,
                      displayName,
                      isUnread,
                      conversationKey: key,
                      isGroup: !!msg.group_id,
                    });
                  }
                });
                
                // Convert to array and sort by latest message
                const uniqueConversations = Array.from(conversationMap.values())
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                return uniqueConversations.map((thread) => {
                  const isSelected = 
                    (selectedGroupId && thread.group_id === selectedGroupId) ||
                    (selectedUserId && !thread.group_id && 
                      (thread.sender_id === selectedUserId || thread.recipient_id === selectedUserId));
                  
                  const typingText = getTypingText(thread.sender_id);
                  
                  return (
                    <button
                      key={thread.conversationKey}
                      type="button"
                      onClick={() => handleSelectThread(thread)}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? 'border-[#C29B38] bg-amber-50/40'
                          : 'border-transparent hover:bg-stone-50'
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: thread.isUnread ? '#1E4620' : '#9CA3AF' }}
                      >
                        {thread.displayName.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-sm ${
                              thread.isUnread
                                ? 'font-semibold text-stone-900'
                                : 'font-medium text-stone-700'
                            }`}
                          >
                            {thread.displayName}
                          </span>
                          <span className="shrink-0 text-xs text-stone-400">
                            {new Date(thread.created_at).toLocaleDateString()}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-xs ${
                              typingText
                                ? 'text-amber-500'
                                : thread.isUnread
                                ? 'text-stone-700'
                                : 'text-stone-500'
                            }`}
                          >
                            {typingText ?? thread.content}
                          </span>
                          {thread.isUnread && (
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                              style={{ backgroundColor: '#C29B38' }}
                            >
                              1
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* ── Conversation panel ────────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
          {showConversation ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: '#1E4620' }}
                  >
                    {(conversationName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {conversationName || 'Unknown'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {newDMUserId
                        ? 'New conversation'
                        : socketConnected
                        ? 'Online'
                        : 'Offline'}
                    </p>
                  </div>
                </div>
                {selectedGroupId && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[#1E4620] transition hover:opacity-80"
                    style={{ backgroundColor: '#C29B38' }}
                  >
                    <Megaphone size={14} />
                    Broadcast
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {newDMUserId ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                      style={{ backgroundColor: '#1E4620' }}
                    >
                      {(conversationName || '?').charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-stone-700">
                      {conversationName}
                    </p>
                    <p className="text-xs text-stone-400">
                      This is the start of your conversation. Say hello!
                    </p>
                  </div>
                ) : threadMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-stone-400">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {threadMessages.map((message) => {
                      const isMe = message.sender_id === currentUserId;
                      const hasReadReceipt = message.statuses?.some((s) => s.is_read);
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div
                              className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center self-end rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: '#9CA3AF' }}
                            >
                              {(message.sender_name ?? '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div
                            className={`max-w-[72%] rounded-xl px-4 py-3 text-sm ${
                              isMe
                                ? 'text-white'
                                : 'border border-stone-200 bg-stone-50 text-stone-700'
                            }`}
                            style={isMe ? { backgroundColor: '#1E4620' } : undefined}
                          >
                            {!isMe && message.sender_name && (
                              <p className="mb-1 text-[11px] font-semibold text-stone-400">
                                {message.sender_name}
                              </p>
                            )}
                            <p className="leading-relaxed">{message.content}</p>
                            <div
                              className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${
                                isMe ? 'justify-end text-stone-300' : 'text-stone-400'
                              }`}
                            >
                              <span>
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isMe && (
                                <span className={hasReadReceipt ? 'text-emerald-400' : 'text-stone-400'}>
                                  {hasReadReceipt ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="flex items-center gap-3 border-t border-stone-200 px-5 py-4">
                <button
                  type="button"
                  aria-label="Attach file"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 text-stone-400 transition hover:bg-stone-50"
                >
                  <Paperclip size={16} />
                </button>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (!newDMUserId) handleTyping(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                      if (!newDMUserId) handleTyping(false);
                    }
                  }}
                  placeholder={
                    newDMUserId
                      ? `Message ${conversationName}…`
                      : 'Type a message…'
                  }
                  className="flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!draft.trim() || sending}
                  className="shrink-0 rounded-lg px-5 py-2.5 text-sm font-medium text-[#1E4620] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: '#C29B38' }}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
                <SendIcon size={22} className="text-stone-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-600">
                  No conversation selected
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  Choose a thread on the left or start a new chat
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Create Group Modal ──────────────────────────────────────────── */}
      {groupModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h3 className="text-base font-bold text-stone-900">Create New Group</h3>
              <button
                onClick={handleCloseGroupModal}
                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {groupModal.error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {groupModal.error}
                </div>
              )}

              {/* Group name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupModal.name}
                  onChange={(e) =>
                    setGroupModal((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Project Alpha Team"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                />
              </div>

              {/* Group type */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">
                  Group Type
                </label>
                <select
                  value={groupModal.groupType}
                  onChange={(e) =>
                    setGroupModal((prev) => ({
                      ...prev,
                      groupType: e.target.value as GroupType,
                    }))
                  }
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                >
                  <option value="project">Project</option>
                  <option value="department">Department</option>
                  <option value="broadcast">Broadcast</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">
                  Description
                </label>
                <textarea
                  value={groupModal.description}
                  onChange={(e) =>
                    setGroupModal((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="What's this group about?"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                />
              </div>

              {/* Add members */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">
                  Add Members <span className="text-red-500">*</span>
                </label>

                {/* Selected chips */}
                <div className="mb-2 flex min-h-[36px] flex-wrap gap-1.5">
                  {groupModal.selectedMembers.length === 0 ? (
                    <span className="text-xs text-stone-400">No members selected yet</span>
                  ) : (
                    groupModal.selectedMembers.map((userId) => {
                      const user = allUsers.find((u) => u.id === userId);
                      return (
                        <span
                          key={userId}
                          className="inline-flex items-center gap-1 rounded-full bg-[#1E4620]/10 px-2.5 py-1 text-xs font-medium text-[#1E4620]"
                        >
                          <User size={11} />
                          {user?.full_name ?? userId.slice(0, 8)}
                          <button
                            onClick={() => handleRemoveMember(userId)}
                            className="ml-0.5 rounded-full hover:text-red-500"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    value={groupModal.searchTerm}
                    onChange={(e) =>
                      setGroupModal((prev) => ({ ...prev, searchTerm: e.target.value }))
                    }
                    placeholder={
                      usersLoading ? 'Loading users…' : 'Search by name or email…'
                    }
                    disabled={usersLoading || allUsers.length === 0}
                    className="w-full rounded-lg border border-stone-200 py-2 pl-8 pr-3 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] disabled:bg-stone-50 disabled:text-stone-400"
                  />
                  {usersLoading && (
                    <Loader2
                      size={14}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-stone-400"
                    />
                  )}
                </div>

                {/* Results */}
                {groupModal.searchTerm.trim() !== '' && !usersLoading && !showError && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-sm">
                    {filteredModalUsers.length === 0 ? (
                      <p className="px-4 py-4 text-center text-xs text-stone-400">
                        No users found for &quot;{groupModal.searchTerm}&quot;
                      </p>
                    ) : (
                      filteredModalUsers.slice(0, 15).map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleAddMember(user.id)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-stone-50"
                        >
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: '#1E4620' }}
                          >
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-stone-700">{user.full_name}</p>
                            <p className="truncate text-xs text-stone-400">{user.email}</p>
                          </div>
                          <Plus size={14} className="ml-auto shrink-0 text-[#1E4620]" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-stone-100 px-6 py-4">
              <button
                onClick={handleCloseGroupModal}
                disabled={groupModal.isLoading}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGroupSubmit}
                disabled={
                  !groupModal.name.trim() ||
                  groupModal.selectedMembers.length === 0 ||
                  groupModal.isLoading
                }
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: '#1E4620' }}
              >
                {groupModal.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Create Group
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminMessages;