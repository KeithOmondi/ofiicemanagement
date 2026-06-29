// src/socket/client.ts
import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import {
  addMessageOptimistic,
  updateMessageStatus,
  updateMessageStatuses,
  addTypingUser,
  clearTypingUsers,
  setSocketConnected,
  fetchUnreadCount,
  type Message,
  type MessageStatus,
} from '../store/slices/messagesSlice';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendMessageData {
  content: string;
  group_id?: string | null;
  recipient_id?: string | null;
  message_type?: 'text' | 'broadcast' | 'announcement';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  parent_message_id?: string | null;
}

interface TypingData {
  group_id?: string;
  recipient_id?: string;
  is_typing: boolean;
}

interface SocketConfig {
  url: string;
  token: string;
  autoConnect?: boolean;
}

// ─── Response Types ──────────────────────────────────────────────────────────

interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

interface UnreadCountResponse {
  success: boolean;
  unread?: number;
  error?: string;
}

// ─── Socket Service ──────────────────────────────────────────────────────────

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Initialize the socket connection
   */
  initialize(config: SocketConfig): Socket {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(config.url, {
      auth: {
        token: config.token,
      },
      transports: ['websocket', 'polling'],
      autoConnect: config.autoConnect ?? true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 10000,
    });

    this.setupEventListeners();

    return this.socket;
  }

  /**
   * Get the socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected || false;
  }

  /**
   * Connect to the socket server
   */
  connect(): void {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      store.dispatch(setSocketConnected(false));
      store.dispatch(clearTypingUsers());
    }
  }

  /**
   * Send a message
   */
  sendMessage(data: SendMessageData): Promise<SendMessageResponse> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      this.socket.emit('send_message', data, (response: SendMessageResponse) => {
        if (response.success) {
          resolve({ success: true, message: response.message });
        } else {
          resolve({ success: false, error: response.error || 'Failed to send message' });
        }
      });
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(data: TypingData): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('typing', data);
  }

  /**
   * Mark a message as read
   */
  markAsRead(messageId: string): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('mark_read', { message_id: messageId });
  }

  /**
   * Get unread count
   */
  getUnreadCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('get_unread_count', (response: UnreadCountResponse) => {
        if (response.success) {
          resolve(response.unread ?? 0);
        } else {
          reject(new Error(response.error || 'Failed to get unread count'));
        }
      });
    });
  }

  /**
   * Join a group room
   */
  joinGroup(groupId: string): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('join_group', { group_id: groupId });
  }

  /**
   * Leave a group room
   */
  leaveGroup(groupId: string): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('leave_group', { group_id: groupId });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // ── Connection events ──────────────────────────────────────────────────────

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      store.dispatch(setSocketConnected(true));
      
      // Fetch unread count on reconnect
      store.dispatch(fetchUnreadCount());
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${reason}`);
      this.isConnected = false;
      store.dispatch(setSocketConnected(false));
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnect attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('reconnect', (attempt: number) => {
      console.log(`Socket reconnected after ${attempt} attempts`);
      this.isConnected = true;
      store.dispatch(setSocketConnected(true));
    });

    this.socket.on('reconnect_attempt', (attempt: number) => {
      console.log(`Socket reconnect attempt ${attempt}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnect failed');
      this.isConnected = false;
      store.dispatch(setSocketConnected(false));
    });

    // ── Message events ──────────────────────────────────────────────────────

    this.socket.on('new_message', (message: Message) => {
      // Dispatch to Redux
      store.dispatch(addMessageOptimistic(message));
      
      // Update unread count
      store.dispatch(fetchUnreadCount());
    });

    // ── Read receipt events ───────────────────────────────────────────────────

    this.socket.on('message_read', (data: { message_id: string; user_id: string; user_name?: string; read_at: string }) => {
      // Update message status in Redux
      const status: MessageStatus = {
        id: `status-${data.message_id}-${data.user_id}`,
        message_id: data.message_id,
        user_id: data.user_id,
        user_name: data.user_name,
        is_read: true,
        read_at: data.read_at,
        delivered_at: data.read_at,
      };
      
      store.dispatch(updateMessageStatuses({ message_id: data.message_id, status }));
      store.dispatch(updateMessageStatus({
        message_id: data.message_id,
        is_read: true,
        read_at: data.read_at,
      }));
    });

    // ── Typing events ────────────────────────────────────────────────────────

    this.socket.on('typing', (data: { user_id: string; user_name: string; is_typing: boolean }) => {
      store.dispatch(addTypingUser({
        user_id: data.user_id,
        user_name: data.user_name,
        is_typing: data.is_typing,
      }));

      // Auto-clear typing after 3 seconds if not cleared
      if (data.is_typing) {
        setTimeout(() => {
          store.dispatch(addTypingUser({
            user_id: data.user_id,
            user_name: data.user_name,
            is_typing: false,
          }));
        }, 3000);
      }
    });

    // ── Group events ──────────────────────────────────────────────────────────

    this.socket.on('group_joined', (data: { group_id: string }) => {
      console.log(`Joined group: ${data.group_id}`);
    });

    this.socket.on('group_left', (data: { group_id: string }) => {
      console.log(`Left group: ${data.group_id}`);
    });

    // ── Error events ──────────────────────────────────────────────────────────

    this.socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });
  }
}

// ─── Singleton instance ─────────────────────────────────────────────────────

const socketService = new SocketService();

export default socketService;

// ─── Hook for React components ──────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '../store/hook';

export function useSocket() {
  const { accessToken } = useAppSelector((state) => state.auth);
  const socketConnected = useAppSelector((state) => state.messages.socketConnected);
  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(socketConnected);

  // Keep ref in sync with Redux state
  useEffect(() => {
    isConnectedRef.current = socketConnected;
  }, [socketConnected]);

  useEffect(() => {
    if (!accessToken) {
      if (socketService.isSocketConnected()) {
        socketService.disconnect();
      }
      socketRef.current = null;
      return;
    }

    const socket = socketService.initialize({
      url: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
      token: accessToken,
      autoConnect: true,
    });

    socketRef.current = socket;

    return () => {
      socketService.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  const sendMessage = useCallback(async (data: SendMessageData) => {
    return socketService.sendMessage(data);
  }, []);

  const sendTyping = useCallback((data: TypingData) => {
    socketService.sendTyping(data);
  }, []);

  const markAsRead = useCallback((messageId: string) => {
    socketService.markAsRead(messageId);
  }, []);

  const getUnreadCount = useCallback(async () => {
    return socketService.getUnreadCount();
  }, []);

  const joinGroup = useCallback((groupId: string) => {
    socketService.joinGroup(groupId);
  }, []);

  const leaveGroup = useCallback((groupId: string) => {
    socketService.leaveGroup(groupId);
  }, []);

  // Return functions only, not the socket ref directly
  // This avoids the "Cannot access refs during render" error
  return {
    isConnected: socketConnected,
    sendMessage,
    sendTyping,
    markAsRead,
    getUnreadCount,
    joinGroup,
    leaveGroup,
  };
}