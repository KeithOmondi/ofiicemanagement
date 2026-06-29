// src/store/slices/messagesSlice.ts
import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axiosClient from "../../api/api";
import type { AxiosError } from "axios";

/* ============================================================
   TYPES
============================================================ */

export type MessageType = "text" | "broadcast" | "announcement";
export type MessagePriority = "low" | "normal" | "high" | "urgent";
export type GroupType = "department" | "project" | "broadcast";
export type GroupRole = "admin" | "member";

export interface User {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  department_name?: string;
  role?: string;
  is_active?: boolean;
}

export interface MessageGroup {
  id: string;
  name: string;
  description: string | null;
  group_type: GroupType;
  department_id: string | null;
  department_name?: string;
  created_by: string;
  created_by_name?: string;
  member_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: GroupRole;
  joined_at: string;
  is_active: boolean;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface MessageStatus {
  id: string;
  message_id: string;
  user_id: string;
  user_name?: string;
  is_read: boolean;
  read_at: string | null;
  delivered_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  sender_email?: string;
  group_id: string | null;
  group_name?: string;
  recipient_id: string | null;
  recipient_name?: string;
  content: string;
  message_type: MessageType;
  priority: MessagePriority;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  parent_message_id: string | null;
  attachments: MessageAttachment[];
  statuses?: MessageStatus[];
  created_at: string;
  updated_at: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string | null;
  group_type: GroupType;
  department_id?: string | null;
  member_ids?: string[];
}

export interface UpdateGroupInput {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface AddGroupMembersInput {
  user_ids: string[];
  role?: GroupRole;
}

export interface SendMessageInput {
  content: string;
  group_id?: string | null;
  recipient_id?: string | null;
  message_type?: MessageType;
  priority?: MessagePriority;
  parent_message_id?: string | null;
}

export interface MessageFilters {
  search?: string;
  group_id?: string;
  recipient_id?: string;
  sender_id?: string;
  message_type?: MessageType;
  priority?: MessagePriority;
  is_read?: boolean;
  is_archived?: boolean;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface UnreadCount {
  total: number;
  by_group: { group_id: string; group_name: string; count: number }[];
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
}

/* ============================================================
   STATE INTERFACE
============================================================ */

interface MessagesState {
  groups: MessageGroup[];
  selectedGroup: MessageGroup | null;
  groupMembers: GroupMember[];
  messages: Message[];
  selectedMessage: Message | null;
  currentThread: Message[];
  unreadCount: UnreadCount | null;
  activeTab: "inbox" | "sent" | "broadcast";
  searchQuery: string;
  filters: MessageFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: {
    groups: boolean;
    groupMembers: boolean;
    messages: boolean;
    sending: boolean;
    mutating: boolean;
    unread: boolean;
  };
  socketConnected: boolean;
  typingUsers: Record<
    string,
    { user_id: string; user_name: string; is_typing: boolean }
  >;
  error: string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: MessagesState = {
  groups: [],
  selectedGroup: null,
  groupMembers: [],
  messages: [],
  selectedMessage: null,
  currentThread: [],
  unreadCount: null,
  activeTab: "inbox",
  searchQuery: "",
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  loading: {
    groups: false,
    groupMembers: false,
    messages: false,
    sending: false,
    mutating: false,
    unread: false,
  },
  socketConnected: false,
  typingUsers: {},
  error: null,
  success: false,
};

/* ============================================================
   HELPERS
============================================================ */

const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    axiosError.message ??
    "An unexpected error occurred"
  );
};

const buildQueryString = (filters: MessageFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  return params.toString() ? `?${params.toString()}` : "";
};

/* ============================================================
   THUNKS - GROUPS
============================================================ */

export const fetchGroups = createAsyncThunk(
  "messages/fetchGroups",
  async (payload: { group_type?: string } | undefined, { rejectWithValue }) => {
    try {
      const groupType = payload?.group_type;
      const url = groupType
        ? `/messages/groups?group_type=${groupType}`
        : "/messages/groups";
      const { data } = await axiosClient.get(url);
      return data.data as MessageGroup[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchGroupById = createAsyncThunk(
  "messages/fetchGroupById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/messages/groups/${id}`);
      return data.data as MessageGroup;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createGroup = createAsyncThunk(
  "messages/createGroup",
  async (input: CreateGroupInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/messages/groups", input);
      return data.data as MessageGroup;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateGroup = createAsyncThunk(
  "messages/updateGroup",
  async (
    { id, input }: { id: string; input: UpdateGroupInput },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/messages/groups/${id}`, input);
      return data.data as MessageGroup;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteGroup = createAsyncThunk(
  "messages/deleteGroup",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/messages/groups/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - GROUP MEMBERS
============================================================ */

export const fetchGroupMembers = createAsyncThunk(
  "messages/fetchGroupMembers",
  async (groupId: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(
        `/messages/groups/${groupId}/members`,
      );
      return { groupId, members: data.data as GroupMember[] };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const addGroupMembers = createAsyncThunk(
  "messages/addGroupMembers",
  async (
    { groupId, input }: { groupId: string; input: AddGroupMembersInput },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.post(
        `/messages/groups/${groupId}/members`,
        input,
      );
      return { groupId, members: data.data as GroupMember[] };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const removeGroupMember = createAsyncThunk(
  "messages/removeGroupMember",
  async (
    { groupId, userId }: { groupId: string; userId: string },
    { rejectWithValue },
  ) => {
    try {
      await axiosClient.delete(`/messages/groups/${groupId}/members/${userId}`);
      return { groupId, userId };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - MESSAGES
============================================================ */

export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async (filters: MessageFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/messages${query}`);
      return data.data as MessagesResponse;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const sendMessage = createAsyncThunk(
  "messages/sendMessage",
  async (input: SendMessageInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/messages", input);
      return data.data as Message;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchUnreadCount = createAsyncThunk(
  "messages/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get("/messages/unread");
      return data.data as UnreadCount;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const markMessageAsRead = createAsyncThunk(
  "messages/markMessageAsRead",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.put(`/messages/${id}/read`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

// ─── FIX: Required parameter cannot follow optional parameter ──────────────
export const markAllRead = createAsyncThunk(
  "messages/markAllRead",
  async (groupId: string | undefined = undefined, { rejectWithValue }) => {
    try {
      const url = groupId
        ? `/messages/read/all?groupId=${groupId}`
        : "/messages/read/all";
      await axiosClient.put(url);
      return groupId || null;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const archiveMessage = createAsyncThunk(
  "messages/archiveMessage",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.put(`/messages/${id}/archive`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);


export const fetchConversation = createAsyncThunk(
  "messages/fetchConversation",
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/messages/conversation/${userId}`);
      return data.data as MessagesResponse;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);
 

/* ============================================================
   SLICE
============================================================ */

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    // ─── UI State ──────────────────────────────────────────────────────
    setActiveTab(state, action: PayloadAction<"inbox" | "sent" | "broadcast">) {
      state.activeTab = action.payload;
      state.pagination.page = 1;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setFilters(state, action: PayloadAction<Partial<MessageFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters(state) {
      state.filters = {};
      state.searchQuery = "";
      state.pagination.page = 1;
    },
    setPagination(
      state,
      action: PayloadAction<
        Partial<{
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        }>
      >,
    ) {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    // ─── Selection ─────────────────────────────────────────────────────
    setSelectedGroup(state, action: PayloadAction<MessageGroup | null>) {
      state.selectedGroup = action.payload;
    },
    setSelectedMessage(state, action: PayloadAction<Message | null>) {
      state.selectedMessage = action.payload;
    },
    setCurrentThread(state, action: PayloadAction<Message[]>) {
      state.currentThread = action.payload;
    },

    // ─── WebSocket ─────────────────────────────────────────────────────
    setSocketConnected(state, action: PayloadAction<boolean>) {
      state.socketConnected = action.payload;
    },
    addTypingUser(
      state,
      action: PayloadAction<{
        user_id: string;
        user_name: string;
        is_typing: boolean;
      }>,
    ) {
      const { user_id, user_name, is_typing } = action.payload;
      if (is_typing) {
        state.typingUsers[user_id] = { user_id, user_name, is_typing: true };
      } else {
        delete state.typingUsers[user_id];
      }
    },
    clearTypingUsers(state) {
      state.typingUsers = {};
    },

    // ─── Optimistic Updates ────────────────────────────────────────────
    addMessageOptimistic(state, action: PayloadAction<Message>) {
      state.messages = [action.payload, ...state.messages];
      if (state.currentThread.some((m) => m.id === action.payload.id)) {
        state.currentThread = [action.payload, ...state.currentThread];
      }
    },
    updateMessageStatus(
      state,
      action: PayloadAction<{
        message_id: string;
        is_read: boolean;
        read_at: string;
      }>,
    ) {
      const { message_id, is_read, read_at } = action.payload;
      const message = state.messages.find((m) => m.id === message_id);
      if (message) {
        message.is_read = is_read;
        message.read_at = read_at;
      }
      const threadMessage = state.currentThread.find(
        (m) => m.id === message_id,
      );
      if (threadMessage) {
        threadMessage.is_read = is_read;
        threadMessage.read_at = read_at;
      }
    },
    updateMessageStatuses(
      state,
      action: PayloadAction<{ message_id: string; status: MessageStatus }>,
    ) {
      const { message_id, status } = action.payload;
      const message = state.messages.find((m) => m.id === message_id);
      if (message) {
        if (!message.statuses) message.statuses = [];
        const existing = message.statuses.find(
          (s) => s.user_id === status.user_id,
        );
        if (existing) {
          Object.assign(existing, status);
        } else {
          message.statuses.push(status);
        }
      }
    },

    // ─── Status ────────────────────────────────────────────────────────
    clearError(state) {
      state.error = null;
    },
    clearSuccess(state) {
      state.success = false;
    },
    resetMessagesState: () => initialState,
  },
  extraReducers: (builder) => {
    /* ──────── FETCH GROUPS ───────────────────────────────────────────── */
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading.groups = true;
        state.error = null;
      })
      .addCase(
        fetchGroups.fulfilled,
        (state, action: PayloadAction<MessageGroup[]>) => {
          state.loading.groups = false;
          state.groups = action.payload;
        },
      )
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading.groups = false;
        state.error = action.payload as string;
      });

    /* ──────── FETCH GROUP BY ID ───────────────────────────────────────── */
    builder
      .addCase(fetchGroupById.pending, (state) => {
        state.loading.groups = true;
        state.error = null;
      })
      .addCase(
        fetchGroupById.fulfilled,
        (state, action: PayloadAction<MessageGroup>) => {
          state.loading.groups = false;
          state.selectedGroup = action.payload;
        },
      )
      .addCase(fetchGroupById.rejected, (state, action) => {
        state.loading.groups = false;
        state.error = action.payload as string;
      });

    /* ──────── CREATE GROUP ────────────────────────────────────────────── */
    builder
      .addCase(createGroup.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createGroup.fulfilled,
        (state, action: PayloadAction<MessageGroup>) => {
          state.loading.mutating = false;
          state.success = true;
          state.groups = [action.payload, ...state.groups];
          state.selectedGroup = action.payload;
        },
      )
      .addCase(createGroup.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ──────── UPDATE GROUP ────────────────────────────────────────────── */
    builder
      .addCase(updateGroup.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateGroup.fulfilled,
        (state, action: PayloadAction<MessageGroup>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.groups.findIndex(
            (g) => g.id === action.payload.id,
          );
          if (index !== -1) {
            state.groups[index] = action.payload;
          }
          if (state.selectedGroup?.id === action.payload.id) {
            state.selectedGroup = action.payload;
          }
        },
      )
      .addCase(updateGroup.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });


      builder
  .addCase(fetchConversation.pending, (state) => {
    state.loading.messages = true;
    state.error = null;
  })
  .addCase(fetchConversation.fulfilled, (state, action: PayloadAction<MessagesResponse>) => {
    state.loading.messages = false;
    state.messages = action.payload.messages;
    state.pagination.total = action.payload.total;
    state.pagination.totalPages = Math.ceil(
      action.payload.total / state.pagination.limit
    );
  })
  .addCase(fetchConversation.rejected, (state, action) => {
    state.loading.messages = false;
    state.error = action.payload as string;
  });

    /* ──────── DELETE GROUP ────────────────────────────────────────────── */
    builder
      .addCase(deleteGroup.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteGroup.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.groups = state.groups.filter((g) => g.id !== action.payload);
          if (state.selectedGroup?.id === action.payload) {
            state.selectedGroup = null;
          }
        },
      )
      .addCase(deleteGroup.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── FETCH GROUP MEMBERS ──────────────────────────────────────── */
    builder
      .addCase(fetchGroupMembers.pending, (state) => {
        state.loading.groupMembers = true;
        state.error = null;
      })
      .addCase(fetchGroupMembers.fulfilled, (state, action) => {
        state.loading.groupMembers = false;
        state.groupMembers = action.payload.members;
      })
      .addCase(fetchGroupMembers.rejected, (state, action) => {
        state.loading.groupMembers = false;
        state.error = action.payload as string;
      });

    /* ──────── ADD GROUP MEMBERS ────────────────────────────────────────── */
    builder
      .addCase(addGroupMembers.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(addGroupMembers.fulfilled, (state, action) => {
        state.loading.mutating = false;
        state.success = true;
        const newMembers = action.payload.members;
        const existingIds = new Set(state.groupMembers.map((m) => m.user_id));
        const uniqueNewMembers = newMembers.filter(
          (m) => !existingIds.has(m.user_id),
        );
        state.groupMembers = [...state.groupMembers, ...uniqueNewMembers];
        const group = state.groups.find((g) => g.id === action.payload.groupId);
        if (group) {
          group.member_count =
            (group.member_count || 0) + uniqueNewMembers.length;
        }
      })
      .addCase(addGroupMembers.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ──────── REMOVE GROUP MEMBER ──────────────────────────────────────── */
    builder
      .addCase(removeGroupMember.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(removeGroupMember.fulfilled, (state, action) => {
        state.loading.mutating = false;
        state.groupMembers = state.groupMembers.filter(
          (m) => m.user_id !== action.payload.userId,
        );
        const group = state.groups.find((g) => g.id === action.payload.groupId);
        if (group && group.member_count) {
          group.member_count -= 1;
        }
      })
      .addCase(removeGroupMember.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── FETCH MESSAGES ───────────────────────────────────────────── */
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading.messages = true;
        state.error = null;
      })
      .addCase(
        fetchMessages.fulfilled,
        (state, action: PayloadAction<MessagesResponse>) => {
          state.loading.messages = false;
          state.messages = action.payload.messages;
          state.pagination.total = action.payload.total;
          state.pagination.totalPages = Math.ceil(
            action.payload.total / state.pagination.limit,
          );
        },
      )
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading.messages = false;
        state.error = action.payload as string;
      });

    /* ──────── SEND MESSAGE ────────────────────────────────────────────── */
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading.sending = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        sendMessage.fulfilled,
        (state, action: PayloadAction<Message>) => {
          state.loading.sending = false;
          state.success = true;
          state.messages = [action.payload, ...state.messages];
          state.currentThread = [action.payload, ...state.currentThread];
        },
      )
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading.sending = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ──────── FETCH UNREAD COUNT ──────────────────────────────────────── */
    builder
      .addCase(fetchUnreadCount.pending, (state) => {
        state.loading.unread = true;
        state.error = null;
      })
      .addCase(
        fetchUnreadCount.fulfilled,
        (state, action: PayloadAction<UnreadCount>) => {
          state.loading.unread = false;
          state.unreadCount = action.payload;
        },
      )
      .addCase(fetchUnreadCount.rejected, (state, action) => {
        state.loading.unread = false;
        state.error = action.payload as string;
      });

    /* ──────── MARK MESSAGE AS READ ────────────────────────────────────── */
    builder
      .addCase(markMessageAsRead.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        markMessageAsRead.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          const message = state.messages.find((m) => m.id === action.payload);
          if (message) {
            message.is_read = true;
            message.read_at = new Date().toISOString();
          }
          const threadMessage = state.currentThread.find(
            (m) => m.id === action.payload,
          );
          if (threadMessage) {
            threadMessage.is_read = true;
            threadMessage.read_at = new Date().toISOString();
          }
          if (state.unreadCount) {
            state.unreadCount.total = Math.max(0, state.unreadCount.total - 1);
          }
        },
      )
      .addCase(markMessageAsRead.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── MARK ALL READ ────────────────────────────────────────────── */
    builder
      .addCase(markAllRead.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        markAllRead.fulfilled,
        (state, action: PayloadAction<string | null>) => {
          state.loading.mutating = false;
          if (action.payload) {
            if (state.unreadCount) {
              const group = state.unreadCount.by_group.find(
                (g) => g.group_id === action.payload,
              );
              if (group) {
                state.unreadCount.total -= group.count;
                group.count = 0;
              }
            }
            state.messages = state.messages.map((m) => {
              if (m.group_id === action.payload && !m.is_read) {
                return {
                  ...m,
                  is_read: true,
                  read_at: new Date().toISOString(),
                };
              }
              return m;
            });
          } else {
            state.unreadCount = { total: 0, by_group: [] };
            state.messages = state.messages.map((m) => {
              if (!m.is_read) {
                return {
                  ...m,
                  is_read: true,
                  read_at: new Date().toISOString(),
                };
              }
              return m;
            });
          }
          state.currentThread = state.currentThread.map((m) => {
            if (!m.is_read) {
              return { ...m, is_read: true, read_at: new Date().toISOString() };
            }
            return m;
          });
        },
      )
      .addCase(markAllRead.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── ARCHIVE MESSAGE ──────────────────────────────────────────── */
    builder
      .addCase(archiveMessage.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        archiveMessage.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.messages = state.messages.filter(
            (m) => m.id !== action.payload,
          );
          state.currentThread = state.currentThread.filter(
            (m) => m.id !== action.payload,
          );
        },
      )
      .addCase(archiveMessage.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setActiveTab,
  setSearchQuery,
  setFilters,
  clearFilters,
  setPagination,
  setSelectedGroup,
  setSelectedMessage,
  setCurrentThread,
  setSocketConnected,
  addTypingUser,
  clearTypingUsers,
  addMessageOptimistic,
  updateMessageStatus,
  updateMessageStatuses,
  clearError,
  clearSuccess,
  resetMessagesState,
} = messagesSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllGroups = (state: { messages: MessagesState }) =>
  state.messages.groups;
export const selectSelectedGroup = (state: { messages: MessagesState }) =>
  state.messages.selectedGroup;
export const selectGroupMembers = (state: { messages: MessagesState }) =>
  state.messages.groupMembers;
export const selectGroupsLoading = (state: { messages: MessagesState }) =>
  state.messages.loading.groups;

export const selectAllMessages = (state: { messages: MessagesState }) =>
  state.messages.messages;
export const selectSelectedMessage = (state: { messages: MessagesState }) =>
  state.messages.selectedMessage;
export const selectCurrentThread = (state: { messages: MessagesState }) =>
  state.messages.currentThread;
export const selectUnreadCount = (state: { messages: MessagesState }) =>
  state.messages.unreadCount;
export const selectMessagesLoading = (state: { messages: MessagesState }) =>
  state.messages.loading.messages;
export const selectSending = (state: { messages: MessagesState }) =>
  state.messages.loading.sending;

export const selectActiveTab = (state: { messages: MessagesState }) =>
  state.messages.activeTab;
export const selectSearchQuery = (state: { messages: MessagesState }) =>
  state.messages.searchQuery;
export const selectFilters = (state: { messages: MessagesState }) =>
  state.messages.filters;
export const selectPagination = (state: { messages: MessagesState }) =>
  state.messages.pagination;

export const selectSocketConnected = (state: { messages: MessagesState }) =>
  state.messages.socketConnected;
export const selectTypingUsers = (state: { messages: MessagesState }) =>
  state.messages.typingUsers;

export const selectMessagesError = (state: { messages: MessagesState }) =>
  state.messages.error;
export const selectMessagesSuccess = (state: { messages: MessagesState }) =>
  state.messages.success;
export const selectMutating = (state: { messages: MessagesState }) =>
  state.messages.loading.mutating;

export const selectMessagesForGroup =
  (groupId: string) => (state: { messages: MessagesState }) =>
    state.messages.messages.filter((m) => m.group_id === groupId);

export const selectMessagesForUser =
  (userId: string) => (state: { messages: MessagesState }) =>
    state.messages.messages.filter(
      (m) => m.recipient_id === userId || m.sender_id === userId,
    );

export const selectUnreadCountForGroup =
  (groupId: string) => (state: { messages: MessagesState }) => {
    if (!state.messages.unreadCount) return 0;
    const group = state.messages.unreadCount.by_group.find(
      (g) => g.group_id === groupId,
    );
    return group?.count || 0;
  };

export default messagesSlice.reducer;
