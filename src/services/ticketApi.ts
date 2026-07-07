// src/services/ticketApi.ts
import { axiosClient } from '../api/api';
import type {
  Ticket,
  TicketWithHistory,
  TicketPaginationResponse,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketFilters,
  TicketComment,
} from '../types/tickets.types';

// Helper to build query string from filters
const buildQueryString = (filters: TicketFilters): string => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const ticketApi = {
  // ── Create ────────────────────────────────────────────────────────────────────
  
  create: async (data: CreateTicketRequest): Promise<Ticket> => {
    const response = await axiosClient.post('/tickets', data);
    return response.data.data;
  },

  // ── Read ──────────────────────────────────────────────────────────────────────
  
  getAll: async (filters: TicketFilters = {}): Promise<TicketPaginationResponse> => {
    const query = buildQueryString(filters);
    const response = await axiosClient.get(`/tickets${query}`);
    return response.data.data;
  },

  getById: async (id: string): Promise<TicketWithHistory> => {
    const response = await axiosClient.get(`/tickets/${id}`);
    return response.data.data;
  },

  // ── Update ────────────────────────────────────────────────────────────────────
  
  update: async (id: string, data: UpdateTicketRequest): Promise<Ticket> => {
    const response = await axiosClient.put(`/tickets/${id}`, data);
    return response.data.data;
  },

  // ── Workflow ──────────────────────────────────────────────────────────────────
  
  submitForApproval: async (id: string): Promise<Ticket> => {
    const response = await axiosClient.post(`/tickets/${id}/submit`);
    return response.data.data;
  },

  approve: async (id: string, comments?: string): Promise<Ticket> => {
    const response = await axiosClient.post(`/tickets/${id}/approve`, { comments });
    return response.data.data;
  },

  reject: async (id: string, reason: string): Promise<Ticket> => {
    const response = await axiosClient.post(`/tickets/${id}/reject`, { reason });
    return response.data.data;
  },

  return: async (id: string, reason: string, instructions?: string): Promise<Ticket> => {
    const response = await axiosClient.post(`/tickets/${id}/return`, { reason, instructions });
    return response.data.data;
  },

  book: async (id: string, booking_reference: string, comments?: string): Promise<Ticket> => {
    const response = await axiosClient.post(`/tickets/${id}/book`, { booking_reference, comments });
    return response.data.data;
  },

  cancel: async (id: string): Promise<Ticket> => {
    const response = await axiosClient.post(`/tickets/${id}/cancel`);
    return response.data.data;
  },

  complete: async (id: string): Promise<Ticket> => {
    const response = await axiosClient.post(`/tickets/${id}/complete`);
    return response.data.data;
  },

  // ── Comments ──────────────────────────────────────────────────────────────────
  
  addComment: async (id: string, comment: string, isInternal: boolean = false): Promise<TicketComment> => {
    const response = await axiosClient.post(`/tickets/${id}/comments`, { 
      comment, 
      is_internal: isInternal 
    });
    return response.data.data;
  },

  deleteComment: async (id: string, commentId: string): Promise<void> => {
    await axiosClient.delete(`/tickets/${id}/comments/${commentId}`);
  },

  // ── Delete ────────────────────────────────────────────────────────────────────
  
  delete: async (id: string): Promise<void> => {
    await axiosClient.delete(`/tickets/${id}`);
  },
};