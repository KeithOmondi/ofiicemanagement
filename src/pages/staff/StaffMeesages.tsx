import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchGroups,
  fetchMessages,
  fetchConversation,
  sendMessage,
  fetchUnreadCount,
  setSelectedGroup,
  clearError,
  clearSuccess,
  selectAllGroups,
  selectAllMessages,
  selectSelectedGroup,
  selectUnreadCount,
  selectGroupsLoading,
  selectMessagesLoading,
  selectSending,
  selectMessagesError,
  selectMessagesSuccess,
  selectTypingUsers,
  type Message,
  type MessageGroup,
  type SendMessageInput,
  type MessagePriority,
} from '../../store/slices/messagesSlice';
import {
  fetchDepartments,
  selectAllDepartments,
} from '../../store/slices/departmentsSlice';
import {
  fetchUsers,
  selectAllUsers,
  selectUsersListLoading,
  selectCurrentUser,
  type User,
} from '../../store/slices/userSlice';
import { useSocket } from '../../socket/client';
import {
  Send,
  Paperclip,
  Users,
  Check,
  CheckCheck,
  Loader2,
  Search,
  Plus,
  Menu,
  Building2,
  User as UserIcon,
  Circle,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ChatTab = 'groups' | 'direct';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  currentUserId?: string;
}

interface MessageInputProps {
  onSend: (content: string) => void;
  sending: boolean;
  disabled?: boolean;
}

interface GroupListProps {
  groups: MessageGroup[];
  selectedGroupId?: string;
  onSelectGroup: (group: MessageGroup) => void;
  loading: boolean;
}

interface UserListProps {
  users: User[];
  currentUserId?: string;
  departmentId?: string | null;
  onSelectUser: (user: User) => void;
  selectedUserId?: string;
  loading: boolean;
  searchQuery: string;
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getPriorityColor = (priority: MessagePriority): string => {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
    case 'high':   return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'low':    return 'bg-gray-100 text-gray-700 border-gray-200';
    default:       return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const isUnread = !isOwn && !message.is_read;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
          isOwn
            ? 'bg-[#1E4620] text-white'
            : `bg-white border ${isUnread ? 'border-[#c9a84c] shadow-md' : 'border-stone-200'} text-stone-800`
        }`}
      >
        {isUnread && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#c9a84c] animate-pulse" />
            <span className="text-[10px] font-medium text-[#c9a84c]">New</span>
          </div>
        )}

        {!isOwn && message.sender_name && (
          <p className="mb-1 text-xs font-semibold text-[#1E4620]">
            {message.sender_name}
          </p>
        )}

        {message.priority !== 'normal' && (
          <span
            className={`inline-block mb-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${getPriorityColor(
              message.priority
            )}`}
          >
            {message.priority.toUpperCase()}
          </span>
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        <div className="mt-1.5 flex items-center justify-end gap-1.5">
          <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-stone-400'}`}>
            {formatMessageTime(message.created_at)}
          </span>
          {isOwn && (
            <span className="text-white/60">
              {message.is_read
                ? <CheckCheck className="h-3 w-3" />
                : <Check className="h-3 w-3" />
              }
            </span>
          )}
        </div>

        {message.message_type !== 'text' && (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
              message.message_type === 'broadcast'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {message.message_type}
          </span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const MessageList: React.FC<MessageListProps> = ({ messages, loading, currentUserId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const unreadCount = messages.filter(
    (m) => !m.is_read && m.sender_id !== currentUserId
  ).length;

  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 10);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-stone-400">
        <div className="mb-4 rounded-full bg-stone-100 p-4">
          <MessageIcon className="h-8 w-8" />
        </div>
        <p className="text-sm font-medium">No messages yet</p>
        <p className="text-xs">Start the conversation</p>
      </div>
    );
  }

  // Sort messages oldest → newest for correct chat layout
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="relative h-full">
      {unreadCount > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-center bg-amber-50/90 py-1.5 text-xs font-medium text-amber-700 backdrop-blur-sm border-b border-amber-200">
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 mr-2 animate-pulse" />
          {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
        </div>
      )}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex h-full flex-col overflow-y-auto px-4 py-3"
      >
        {sorted.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender_id === currentUserId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const MessageInput: React.FC<MessageInputProps> = ({ onSend, sending, disabled }) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!content.trim() || sending || disabled) return;
    onSend(content.trim());
    setContent('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-stone-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <button
          className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Select a conversation to start messaging' : 'Type a message...'}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E4620] text-white transition hover:bg-[#2d6a2f] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const GroupList: React.FC<GroupListProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  loading,
}) => {
  const { unreadCount } = useAppSelector((state) => state.messages);

  const getUnreadForGroup = (groupId: string): number => {
    if (!unreadCount) return 0;
    return unreadCount.by_group.find((g) => g.group_id === groupId)?.count || 0;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-8 text-stone-400">
        <Users className="mb-2 h-8 w-8" />
        <p className="text-sm font-medium">No groups</p>
        <p className="text-xs">You haven't joined any groups yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {groups.map((group) => {
        const unread = getUnreadForGroup(group.id);
        return (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
              selectedGroupId === group.id
                ? 'bg-[#1E4620] text-white'
                : 'hover:bg-stone-100'
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                selectedGroupId === group.id
                  ? 'bg-white/20 text-white'
                  : 'bg-[#1E4620]/10 text-[#1E4620]'
              }`}
            >
              {group.group_type === 'department'
                ? <Building2 className="h-4 w-4" />
                : <Users className="h-4 w-4" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`truncate text-sm font-medium ${selectedGroupId === group.id ? 'text-white' : 'text-stone-800'}`}>
                {group.name}
              </p>
              <p className={`truncate text-xs ${selectedGroupId === group.id ? 'text-white/60' : 'text-stone-400'}`}>
                {group.member_count || 0} members
              </p>
            </div>
            {unread > 0 && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#c9a84c] text-[10px] font-bold text-[#1E4620]">
                {unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const UserList: React.FC<UserListProps> = ({
  users,
  currentUserId,
  departmentId,
  onSelectUser,
  selectedUserId,
  loading,
  searchQuery,
}) => {
  const messages = useAppSelector(selectAllMessages);

  // Count unread DMs from a specific user
  const getUnreadFromUser = (userId: string): number =>
    messages.filter(
      (m) =>
        !m.group_id &&
        m.sender_id === userId &&
        m.recipient_id === currentUserId &&
        !m.is_read
    ).length;

  const filtered = [...users]
    .filter((u) => u.id !== currentUserId)
    .filter((u) => {
      if (!searchQuery) return true;
      return (
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aInDept = a.department_id === departmentId;
      const bInDept = b.department_id === departmentId;
      if (aInDept && !bInDept) return -1;
      if (!aInDept && bInDept) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-8 text-stone-400">
        <UserIcon className="mb-2 h-8 w-8" />
        <p className="text-sm font-medium">No users found</p>
        <p className="text-xs">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filtered.map((user) => {
        const isInDepartment = user.department_id === departmentId;
        const unread = getUnreadFromUser(user.id);
        const isSelected = user.id === selectedUserId;

        return (
          <button
            key={user.id}
            onClick={() => onSelectUser(user)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
              isSelected
                ? 'bg-[#1E4620] text-white'
                : unread > 0
                  ? 'bg-amber-50/60 border border-amber-200 hover:bg-amber-50'
                  : 'hover:bg-stone-100'
            }`}
          >
            <div className="relative">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#1E4620]/10 text-[#1E4620]'
                }`}
              >
                <span className="text-xs font-medium">{getInitials(user.full_name)}</span>
              </div>
              {/* Static online dot — replace with real presence when available */}
              <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-emerald-500 text-emerald-500" />
            </div>

            <div className="flex-1 min-w-0">
              <p className={`truncate text-sm font-medium ${isSelected ? 'text-white' : 'text-stone-800'}`}>
                {user.full_name}
              </p>
              <p className={`truncate text-xs ${isSelected ? 'text-white/60' : 'text-stone-400'}`}>
                {isInDepartment ? 'Your Department' : (user.role || 'Staff')}
              </p>
            </div>

            {unread > 0 && !isSelected && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#c9a84c] px-1 text-[10px] font-bold text-[#1E4620]">
                {unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const StaffMessages: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { isConnected, sendMessage: sendSocketMessage } = useSocket();

  // Redux state
  const groups        = useAppSelector(selectAllGroups);
  const messages      = useAppSelector(selectAllMessages);
  const selectedGroup = useAppSelector(selectSelectedGroup);
  const unreadCount   = useAppSelector(selectUnreadCount);
  const groupsLoading = useAppSelector(selectGroupsLoading);
  const messagesLoading = useAppSelector(selectMessagesLoading);
  const sending       = useAppSelector(selectSending);
  const error         = useAppSelector(selectMessagesError);
  const success       = useAppSelector(selectMessagesSuccess);
  const typingUsers   = useAppSelector(selectTypingUsers);
  const departments   = useAppSelector(selectAllDepartments);
  const users         = useAppSelector(selectAllUsers);
  const usersLoading  = useAppSelector(selectUsersListLoading);
  const currentUser   = useAppSelector(selectCurrentUser);

  // Local state
  const [activeTab, setActiveTab]     = useState<ChatTab>('groups');
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const autoSelectDone = useRef(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectGroup = useCallback((group: MessageGroup) => {
    dispatch(setSelectedGroup(group));
    setSelectedUser(null);
    if (window.innerWidth < 768) setShowSidebar(false);
  }, [dispatch]);

  const handleSelectUser = useCallback((u: User) => {
    setSelectedUser(u);
    dispatch(setSelectedGroup(null));
    if (window.innerWidth < 768) setShowSidebar(false);
  }, [dispatch]);

  // ─── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchGroups({}));
    dispatch(fetchUnreadCount());
    if (departments.length === 0) dispatch(fetchDepartments({}));
    if (users.length === 0)       dispatch(fetchUsers({ limit: 100 }));
  }, [dispatch, departments.length, users.length]);

  // Load group messages
  useEffect(() => {
    if (selectedGroup) {
      dispatch(fetchMessages({ group_id: selectedGroup.id, limit: 50 }));
    }
  }, [dispatch, selectedGroup]);

  // ─── KEY FIX: use fetchConversation for DMs (bidirectional) ───────────────
  useEffect(() => {
    if (selectedUser) {
      dispatch(fetchConversation(selectedUser.id));
    }
  }, [dispatch, selectedUser]);

  // Auto-select on first load
  useLayoutEffect(() => {
    if (autoSelectDone.current) return;
    if (messages.length === 0 || users.length === 0) return;
    if (selectedGroup || selectedUser) {
      autoSelectDone.current = true;
      return;
    }

    // Prefer group with unread
    const groupWithUnread = groups.find((g) =>
      messages.some((m) => m.group_id === g.id && !m.is_read && m.sender_id !== user?.id)
    );
    if (groupWithUnread) {
      autoSelectDone.current = true;
      queueMicrotask(() => handleSelectGroup(groupWithUnread));
      return;
    }

    // Prefer user with unread DM
    const userWithUnread = users.find((u) =>
      messages.some(
        (m) =>
          !m.group_id &&
          m.sender_id === u.id &&
          m.recipient_id === user?.id &&
          !m.is_read
      )
    );
    if (userWithUnread) {
      autoSelectDone.current = true;
      queueMicrotask(() => handleSelectUser(userWithUnread));
      return;
    }

    // Fallback: first group
    if (groups.length > 0) {
      autoSelectDone.current = true;
      queueMicrotask(() => handleSelectGroup(groups[0]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, users.length, groups.length]);

  // Clear error / success toasts
  useEffect(() => {
    if (!error && !success) return;
    const timer = setTimeout(() => {
      if (error)   dispatch(clearError());
      if (success) dispatch(clearSuccess());
    }, 3000);
    return () => clearTimeout(timer);
  }, [error, success, dispatch]);

  // ─── Send handler ──────────────────────────────────────────────────────────

  const handleSendMessage = async (content: string) => {
    if (!selectedGroup && !selectedUser) return;

    const payload: SendMessageInput = {
      content,
      message_type: 'text',
      priority: 'normal',
      ...(selectedGroup  ? { group_id: selectedGroup.id }    : {}),
      ...(selectedUser   ? { recipient_id: selectedUser.id } : {}),
    };

    try {
      const result = await sendSocketMessage(payload);
      if (!result.success) {
        await dispatch(sendMessage(payload)).unwrap();
      }

      // Refresh the current conversation
      if (selectedGroup) {
        dispatch(fetchMessages({ group_id: selectedGroup.id, limit: 50 }));
      } else if (selectedUser) {
        dispatch(fetchConversation(selectedUser.id));   // ← bidirectional refresh
      }
      dispatch(fetchUnreadCount());
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Messages to display in the chat pane
  const displayMessages = React.useMemo(() => {
    if (selectedGroup) {
      return messages.filter((m) => m.group_id === selectedGroup.id);
    }
    if (selectedUser) {
      // fetchConversation already loaded only this DM thread, but filter
      // defensively in case the store has other messages mixed in.
      return messages.filter(
        (m) =>
          !m.group_id &&
          ((m.sender_id === user?.id    && m.recipient_id === selectedUser.id) ||
           (m.sender_id === selectedUser.id && m.recipient_id === user?.id))
      );
    }
    return [];
  }, [messages, selectedGroup, selectedUser, user?.id]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-stone-200 bg-white overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div
        className={`${
          showSidebar ? 'w-72' : 'w-0'
        } flex-shrink-0 border-r border-stone-200 bg-stone-50 transition-all duration-300 overflow-hidden md:w-72`}
      >
        <div className="flex h-full flex-col">

          {/* Sidebar header */}
          <div className="border-b border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-800">Messages</h2>
              <button className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-3 flex gap-1 rounded-lg bg-stone-100 p-1">
              {(['groups', 'direct'] as ChatTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    activeTab === tab
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {tab === 'groups'
                      ? <Users   className="h-3.5 w-3.5" />
                      : <UserIcon className="h-3.5 w-3.5" />
                    }
                    {tab === 'groups' ? 'Groups' : 'Direct'}
                  </div>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'groups' ? 'Search groups...' : 'Search users...'}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-9 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'groups' ? (
              <GroupList
                groups={filteredGroups}
                selectedGroupId={selectedGroup?.id}
                onSelectGroup={handleSelectGroup}
                loading={groupsLoading}
              />
            ) : (
              <UserList
                users={users}
                currentUserId={currentUser?.id}
                departmentId={currentUser?.department_id}
                onSelectUser={handleSelectUser}
                selectedUserId={selectedUser?.id}
                loading={usersLoading}
                searchQuery={searchQuery}
              />
            )}
          </div>

          {/* Sidebar footer */}
          <div className="border-t border-stone-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              {unreadCount && unreadCount.total > 0 && (
                <span className="ml-auto rounded-full bg-[#c9a84c] px-2 py-0.5 text-[10px] font-bold text-[#1E4620]">
                  {unreadCount.total} unread
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">

        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {selectedGroup || selectedUser ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E4620]/10 text-[#1E4620]">
                  {selectedGroup ? (
                    selectedGroup.group_type === 'department'
                      ? <Building2 className="h-4 w-4" />
                      : <Users className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">
                      {getInitials(selectedUser?.full_name || '')}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-800">
                    {selectedGroup ? selectedGroup.name : selectedUser?.full_name}
                  </h3>
                  {selectedUser && (
                    <div className="flex items-center gap-1.5">
                      <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                      <span className="text-xs text-stone-400">Online</span>
                    </div>
                  )}
                  {selectedGroup && (
                    <p className="text-xs text-stone-400">
                      {selectedGroup.member_count || 0} members
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-stone-400">Select a conversation</h3>
                <p className="text-xs text-stone-300">Choose a group or user to start messaging</p>
              </div>
            )}
          </div>

          {/* Typing indicator */}
          {selectedGroup && Object.values(typingUsers).some((u) => u.is_typing) && (
            <div className="text-xs text-stone-400 italic">
              {Object.values(typingUsers)
                .filter((u) => u.is_typing)
                .map((u) => u.user_name)
                .join(', ')}{' is typing...'}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden bg-stone-50/50">
          <MessageList
            messages={displayMessages}
            loading={messagesLoading}
            currentUserId={user?.id}
          />
        </div>

        {/* Input */}
        <MessageInput
          onSend={handleSendMessage}
          sending={sending}
          disabled={!selectedGroup && !selectedUser}
        />
      </div>
    </div>
  );
};

// ─── Icon ──────────────────────────────────────────────────────────────────────

const MessageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
    />
  </svg>
);

export default StaffMessages;