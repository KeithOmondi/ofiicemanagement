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
import {
  fetchDocuments,
  fetchMyMarked,
  fetchDocumentById,
} from '../store/slices/documentSlice';
import {
  fetchAideRequests,
  fetchAideStats,
} from '../store/slices/aidesSlice';
import {
  fetchTickets,
} from '../store/slices/ticketSlice';
import {
  fetchHelpDeskStats,
  fetchUtilities,
  fetchClubMemberships,
  fetchCircuits,
  fetchOtherPayments,
  fetchBenches,
  fetchPartHeards,
  fetchServiceWeeks,
  fetchMedicalClaims,
  fetchGeneralRequests,
  fetchVisaRequests,
  fetchProtocolEvents,
} from '../store/slices/helpdeskSlice';
import { toast } from 'react-hot-toast';

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

type EventCallback = (data: unknown) => void;

// ─── Toast Helper ────────────────────────────────────────────────────────────

// ─── Toast Helper ────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

function showToast(message: string, type: ToastType = 'info', options?: { icon?: string; duration?: number }): void {
  const iconMap: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const toastOptions = {
    duration: options?.duration || 4000,
    icon: options?.icon || iconMap[type],
    ...options,
  };

  switch (type) {
    case 'success':
      toast.success(message, toastOptions);
      break;
    case 'error':
      toast.error(message, toastOptions);
      break;
    case 'warning':
      toast.error(message, { ...toastOptions, icon: '⚠️' });
      break;
    case 'info':
    default:
      // react-hot-toast doesn't have info(), use custom with icon
      toast(message, {
        ...toastOptions,
        icon: 'ℹ️',
        style: {
          background: '#eff6ff',
          color: '#1e40af',
          border: '1px solid #93c5fd',
        },
      });
      break;
  }
}

// ─── Socket Service ──────────────────────────────────────────────────────────

class SocketService {
  private socketInstance: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<string, EventCallback[]> = new Map();

  /**
   * Initialize the socket connection
   */
  initialize(config: SocketConfig): Socket {
    if (this.socketInstance) {
      this.disconnect();
    }

    this.socketInstance = io(config.url, {
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

    return this.socketInstance;
  }

  /**
   * Get the socket instance
   */
  getSocket(): Socket | null {
    return this.socketInstance;
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socketInstance?.connected || false;
  }

  /**
   * Connect to the socket server
   */
  connect(): void {
    if (this.socketInstance && !this.socketInstance.connected) {
      this.socketInstance.connect();
    }
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.socketInstance) {
      this.socketInstance.disconnect();
      this.socketInstance = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      this.eventListeners.clear();
      store.dispatch(setSocketConnected(false));
      store.dispatch(clearTypingUsers());
    }
  }

  /**
   * Register an event listener
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
    
    if (this.socketInstance) {
      this.socketInstance.on(event, callback);
    }
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback?: EventCallback): void {
    if (callback) {
      const listeners = this.eventListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (this.socketInstance) {
        this.socketInstance.off(event, callback);
      }
    } else {
      this.eventListeners.delete(event);
      if (this.socketInstance) {
        this.socketInstance.off(event);
      }
    }
  }

  /**
   * Send a message
   */
  sendMessage(data: SendMessageData): Promise<SendMessageResponse> {
    return new Promise((resolve) => {
      if (!this.socketInstance || !this.isConnected) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      this.socketInstance.emit('send_message', data, (response: SendMessageResponse) => {
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
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('typing', data);
  }

  /**
   * Mark a message as read
   */
  markAsRead(messageId: string): void {
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('mark_read', { message_id: messageId });
  }

  /**
   * Get unread count
   */
  getUnreadCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socketInstance || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socketInstance.emit('get_unread_count', (response: UnreadCountResponse) => {
        if (response.success) {
          resolve(response.unread ?? 0);
        } else {
          reject(new Error(response.error || 'Failed to get unread count'));
        }
      });
    });
  }

  /**
   * Join a document room
   */
  joinDocumentRoom(documentId: string): void {
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('join_document_room', documentId);
  }

  /**
   * Leave a document room
   */
  leaveDocumentRoom(documentId: string): void {
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('leave_document_room', documentId);
  }

  /**
   * Join a ticket room
   */
  joinTicketRoom(ticketId: string): void {
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('join_ticket_room', ticketId);
  }

  /**
   * Leave a ticket room
   */
  leaveTicketRoom(ticketId: string): void {
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('leave_ticket_room', ticketId);
  }

  /**
   * Join an aide room
   */
  joinAideRoom(aideId: string): void {
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('join_aide_room', aideId);
  }

  /**
   * Leave an aide room
   */
  leaveAideRoom(aideId: string): void {
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('leave_aide_room', aideId);
  }

  /**
   * Join a group room
   */
  joinGroup(groupId: string): void {
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('join_group', { group_id: groupId });
  }

  /**
   * Leave a group room
   */
  leaveGroup(groupId: string): void {
    if (!this.socketInstance || !this.isConnected) return;
    this.socketInstance.emit('leave_group', { group_id: groupId });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.socketInstance) return;

    // ── Connection events ──────────────────────────────────────────────────────

    this.socketInstance.on('connect', () => {
      console.log('🔌 Socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      store.dispatch(setSocketConnected(true));
      store.dispatch(fetchUnreadCount());
    });

    this.socketInstance.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${reason}`);
      this.isConnected = false;
      store.dispatch(setSocketConnected(false));
    });

    this.socketInstance.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnect attempts reached');
        this.disconnect();
      }
    });

    this.socketInstance.on('reconnect', (attempt: number) => {
      console.log(`Socket reconnected after ${attempt} attempts`);
      this.isConnected = true;
      store.dispatch(setSocketConnected(true));
    });

    // ── Message events ──────────────────────────────────────────────────────

    this.socketInstance.on('new_message', (message: Message) => {
      store.dispatch(addMessageOptimistic(message));
      store.dispatch(fetchUnreadCount());
    });

    this.socketInstance.on('message_read', (data: { message_id: string; user_id: string; user_name?: string; read_at: string }) => {
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

    this.socketInstance.on('typing', (data: { user_id: string; user_name: string; is_typing: boolean }) => {
      store.dispatch(addTypingUser({
        user_id: data.user_id,
        user_name: data.user_name,
        is_typing: data.is_typing,
      }));

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

    // ─── Document Events ──────────────────────────────────────────────────────

    this.socketInstance.on('document_created', (data: { title: string; created_by?: string }) => {
      console.log('📄 Document created:', data);
      store.dispatch(fetchDocuments({ limit: 100 }));
      store.dispatch(fetchMyMarked());
      if (data.created_by) {
        showToast(`New document: ${data.title}`, 'success');
      }
    });

    this.socketInstance.on('document_updated', (data: { id: string; title?: string }) => {
      console.log('📄 Document updated:', data);
      store.dispatch(fetchDocuments({ limit: 100 }));
      store.dispatch(fetchMyMarked());
      if (data.id) {
        store.dispatch(fetchDocumentById(data.id));
      }
    });

    this.socketInstance.on('document_deleted', () => {
      console.log('📄 Document deleted');
      store.dispatch(fetchDocuments({ limit: 100 }));
      store.dispatch(fetchMyMarked());
    });

    this.socketInstance.on('document_assigned', (data: { title: string }) => {
      console.log('📄 Document assigned:', data);
      showToast(`Document assigned: ${data.title}`, 'info');
      store.dispatch(fetchMyMarked());
    });

    this.socketInstance.on('document_released', (data: { title: string }) => {
      console.log('📄 Document released:', data);
      showToast(`Document released: ${data.title}`, 'info');
      store.dispatch(fetchDocuments({ limit: 100 }));
    });

    this.socketInstance.on('document_signed', (data: { signed_by: string }) => {
      console.log('📄 Document signed:', data);
      showToast(`Document signed by ${data.signed_by}`, 'success');
      store.dispatch(fetchDocuments({ limit: 100 }));
    });

    // ── Mark Events ──────────────────────────────────────────────────────────

    this.socketInstance.on('mark_updated', (data: { document_title?: string; status: string }) => {
      console.log('📌 Mark updated:', data);
      store.dispatch(fetchMyMarked());
      store.dispatch(fetchDocuments({ limit: 100 }));
      if (data.document_title) {
        showToast(`Document "${data.document_title}" - Status: ${data.status}`, 'info');
      }
    });

    // ── Aide Events ──────────────────────────────────────────────────────────

    this.socketInstance.on('aide_created', (data: { judge_name: string }) => {
      console.log('🛡️ Aide created:', data);
      store.dispatch(fetchAideRequests({}));
      store.dispatch(fetchAideStats());
      showToast(`New aide request for ${data.judge_name}`, 'success');
    });

    this.socketInstance.on('aide_updated', () => {
      console.log('🛡️ Aide updated');
      store.dispatch(fetchAideRequests({}));
      store.dispatch(fetchAideStats());
    });

    this.socketInstance.on('aide_deleted', () => {
      console.log('🛡️ Aide deleted');
      store.dispatch(fetchAideRequests({}));
      store.dispatch(fetchAideStats());
    });

    // ─── Ticket Events ──────────────────────────────────────────────────────

    this.socketInstance.on('ticket_created', (data: { title: string }) => {
      console.log('🎫 Ticket created:', data);
      store.dispatch(fetchTickets({}));
      showToast(`New ticket: ${data.title}`, 'success');
    });

    this.socketInstance.on('ticket_updated', () => {
      console.log('🎫 Ticket updated');
      store.dispatch(fetchTickets({}));
    });

    this.socketInstance.on('ticket_submitted', (data: { title: string }) => {
      console.log('🎫 Ticket submitted:', data);
      store.dispatch(fetchTickets({}));
      showToast(`Ticket "${data.title}" submitted for approval`, 'info');
    });

    this.socketInstance.on('ticket_approved', (data: { title: string; approved_by: string }) => {
      console.log('🎫 Ticket approved:', data);
      store.dispatch(fetchTickets({}));
      showToast(`Ticket "${data.title}" approved by ${data.approved_by}`, 'success');
    });

    this.socketInstance.on('ticket_rejected', (data: { title: string }) => {
      console.log('🎫 Ticket rejected:', data);
      store.dispatch(fetchTickets({}));
      showToast(`Ticket "${data.title}" rejected`, 'error');
    });

    this.socketInstance.on('ticket_returned', (data: { title: string }) => {
      console.log('🎫 Ticket returned:', data);
      store.dispatch(fetchTickets({}));
      showToast(`Ticket "${data.title}" returned`, 'info');
    });

    this.socketInstance.on('ticket_booked', (data: { title: string; booking_reference: string }) => {
      console.log('🎫 Ticket booked:', data);
      store.dispatch(fetchTickets({}));
      showToast(`Ticket "${data.title}" booked (Ref: ${data.booking_reference})`, 'success');
    });

    this.socketInstance.on('ticket_cancelled', () => {
      console.log('🎫 Ticket cancelled');
      store.dispatch(fetchTickets({}));
    });

    this.socketInstance.on('ticket_completed', (data: { title: string }) => {
      console.log('🎫 Ticket completed:', data);
      store.dispatch(fetchTickets({}));
      showToast(`Ticket "${data.title}" completed`, 'success');
    });

    this.socketInstance.on('ticket_deleted', () => {
      console.log('🎫 Ticket deleted');
      store.dispatch(fetchTickets({}));
    });

    this.socketInstance.on('ticket_comment_added', () => {
      console.log('💬 Ticket comment added');
      store.dispatch(fetchTickets({}));
    });

    this.socketInstance.on('ticket_comment_deleted', () => {
      console.log('💬 Ticket comment deleted');
      store.dispatch(fetchTickets({}));
    });

    // ─── Help Desk Events ──────────────────────────────────────────────────

    this.socketInstance.on('general_request_created', () => {
      store.dispatch(fetchGeneralRequests({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('general_request_updated', () => {
      store.dispatch(fetchGeneralRequests({}));
    });

    this.socketInstance.on('general_request_status_updated', () => {
      store.dispatch(fetchGeneralRequests({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('general_request_deleted', () => {
      store.dispatch(fetchGeneralRequests({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Utility Events ──────────────────────────────────────────────────────

    this.socketInstance.on('utility_created', () => {
      store.dispatch(fetchUtilities({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('utility_item_added', () => {
      store.dispatch(fetchUtilities({}));
    });

    this.socketInstance.on('utility_item_updated', () => {
      store.dispatch(fetchUtilities({}));
    });

    this.socketInstance.on('utility_item_deleted', () => {
      store.dispatch(fetchUtilities({}));
    });

    this.socketInstance.on('utility_deleted', () => {
      store.dispatch(fetchUtilities({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Club Events ────────────────────────────────────────────────────────

    this.socketInstance.on('club_membership_created', () => {
      store.dispatch(fetchClubMemberships({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('club_membership_updated', () => {
      store.dispatch(fetchClubMemberships({}));
    });

    this.socketInstance.on('club_membership_deleted', () => {
      store.dispatch(fetchClubMemberships({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Circuit Events ──────────────────────────────────────────────────────

    this.socketInstance.on('circuit_created', () => {
      store.dispatch(fetchCircuits({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('circuit_updated', () => {
      store.dispatch(fetchCircuits({}));
    });

    this.socketInstance.on('circuit_dsa_updated', () => {
      store.dispatch(fetchCircuits({}));
    });

    this.socketInstance.on('circuit_deleted', () => {
      store.dispatch(fetchCircuits({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Bench Events ────────────────────────────────────────────────────────

    this.socketInstance.on('bench_created', () => {
      store.dispatch(fetchBenches({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('bench_updated', () => {
      store.dispatch(fetchBenches({}));
    });

    this.socketInstance.on('bench_status_updated', () => {
      store.dispatch(fetchBenches({}));
    });

    this.socketInstance.on('bench_deleted', () => {
      store.dispatch(fetchBenches({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Part Heard Events ──────────────────────────────────────────────────

    this.socketInstance.on('part_heard_created', () => {
      store.dispatch(fetchPartHeards({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('part_heard_updated', () => {
      store.dispatch(fetchPartHeards({}));
    });

    this.socketInstance.on('part_heard_status_updated', () => {
      store.dispatch(fetchPartHeards({}));
    });

    this.socketInstance.on('part_heard_deleted', () => {
      store.dispatch(fetchPartHeards({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Service Week Events ────────────────────────────────────────────────

    this.socketInstance.on('service_week_created', () => {
      store.dispatch(fetchServiceWeeks({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('service_week_updated', () => {
      store.dispatch(fetchServiceWeeks({}));
    });

    this.socketInstance.on('service_week_deleted', () => {
      store.dispatch(fetchServiceWeeks({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Medical Claim Events ──────────────────────────────────────────────

    this.socketInstance.on('medical_claim_created', () => {
      store.dispatch(fetchMedicalClaims({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('medical_claim_updated', () => {
      store.dispatch(fetchMedicalClaims({}));
    });

    this.socketInstance.on('medical_claim_deleted', () => {
      store.dispatch(fetchMedicalClaims({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Visa Events ────────────────────────────────────────────────────────

    this.socketInstance.on('visa_request_created', () => {
      store.dispatch(fetchVisaRequests({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('visa_request_updated', () => {
      store.dispatch(fetchVisaRequests({}));
    });

    this.socketInstance.on('visa_request_deleted', () => {
      store.dispatch(fetchVisaRequests({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Protocol Events ────────────────────────────────────────────────────

    this.socketInstance.on('protocol_event_created', () => {
      store.dispatch(fetchProtocolEvents({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('protocol_event_updated', () => {
      store.dispatch(fetchProtocolEvents({}));
    });

    this.socketInstance.on('protocol_event_deleted', () => {
      store.dispatch(fetchProtocolEvents({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Other Payment Events ───────────────────────────────────────────────

    this.socketInstance.on('other_payment_created', () => {
      store.dispatch(fetchOtherPayments({}));
      store.dispatch(fetchHelpDeskStats());
    });

    this.socketInstance.on('other_payment_updated', () => {
      store.dispatch(fetchOtherPayments({}));
    });

    this.socketInstance.on('other_payment_dsa_updated', () => {
      store.dispatch(fetchOtherPayments({}));
    });

    this.socketInstance.on('other_payment_deleted', () => {
      store.dispatch(fetchOtherPayments({}));
      store.dispatch(fetchHelpDeskStats());
    });

    // ─── Notification Events ────────────────────────────────────────────────

    this.socketInstance.on('notification', (data: { type: string; message: string }) => {
      console.log('🔔 Notification:', data);
      if (data.type === 'success') {
        showToast(data.message, 'success');
      } else if (data.type === 'warning') {
        showToast(data.message, 'warning');
      } else {
        showToast(data.message, 'info');
      }
    });

    this.socketInstance.on('broadcast_notification', (data: { message: string }) => {
      console.log('📢 Broadcast notification:', data);
      showToast(data.message, 'info', { icon: '📢', duration: 8000 });
    });

    // ─── User Status Events ──────────────────────────────────────────────────

    this.socketInstance.on('user_status', (data: { userId: string; status: string }) => {
      console.log('👤 User status:', data);
    });

    // ─── Group events ──────────────────────────────────────────────────────────

    this.socketInstance.on('group_joined', (data: { group_id: string }) => {
      console.log(`Joined group: ${data.group_id}`);
    });

    this.socketInstance.on('group_left', (data: { group_id: string }) => {
      console.log(`Left group: ${data.group_id}`);
    });

    // ─── Error events ──────────────────────────────────────────────────────────

    this.socketInstance.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });
  }
}

// ─── Singleton instance ─────────────────────────────────────────────────────

const socketService = new SocketService();

export default socketService;

// ─── Hook for React components ──────────────────────────────────────────────

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppSelector } from '../store/hook';

export function useSocket() {
  const { accessToken } = useAppSelector((state) => state.auth);
  const socketConnected = useAppSelector((state) => state.messages.socketConnected);
  const isConnectedRef = useRef(socketConnected);

  useEffect(() => {
    isConnectedRef.current = socketConnected;
  }, [socketConnected]);

  useEffect(() => {
    if (!accessToken) {
      if (socketService.isSocketConnected()) {
        socketService.disconnect();
      }
      return;
    }

    socketService.initialize({
      url: import.meta.env.VITE_WS_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}`,
      token: accessToken,
      autoConnect: true,
    });

    return () => {
      socketService.disconnect();
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

  const joinDocumentRoom = useCallback((documentId: string) => {
    socketService.joinDocumentRoom(documentId);
  }, []);

  const leaveDocumentRoom = useCallback((documentId: string) => {
    socketService.leaveDocumentRoom(documentId);
  }, []);

  const joinTicketRoom = useCallback((ticketId: string) => {
    socketService.joinTicketRoom(ticketId);
  }, []);

  const leaveTicketRoom = useCallback((ticketId: string) => {
    socketService.leaveTicketRoom(ticketId);
  }, []);

  const joinAideRoom = useCallback((aideId: string) => {
    socketService.joinAideRoom(aideId);
  }, []);

  const leaveAideRoom = useCallback((aideId: string) => {
    socketService.leaveAideRoom(aideId);
  }, []);

  const joinGroup = useCallback((groupId: string) => {
    socketService.joinGroup(groupId);
  }, []);

  const leaveGroup = useCallback((groupId: string) => {
    socketService.leaveGroup(groupId);
  }, []);

  // Return functions only
  return useMemo(() => ({
    isConnected: socketConnected,
    sendMessage,
    sendTyping,
    markAsRead,
    getUnreadCount,
    joinDocumentRoom,
    leaveDocumentRoom,
    joinTicketRoom,
    leaveTicketRoom,
    joinAideRoom,
    leaveAideRoom,
    joinGroup,
    leaveGroup,
  }), [
    socketConnected,
    sendMessage,
    sendTyping,
    markAsRead,
    getUnreadCount,
    joinDocumentRoom,
    leaveDocumentRoom,
    joinTicketRoom,
    leaveTicketRoom,
    joinAideRoom,
    leaveAideRoom,
    joinGroup,
    leaveGroup,
  ]);
}