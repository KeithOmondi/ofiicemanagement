// src/store/slices/ticketSlice.ts

import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import { ticketApi } from '../../services/ticketApi';
import type {
  Ticket,
  TicketWithHistory,
  TicketPaginationResponse,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketFilters,
  TicketStatus,
  TicketTripType,
} from '../../types/tickets.types';

// ── State Interface ──────────────────────────────────────────────────────────

interface TicketState {
  tickets: Ticket[];
  selectedTicket: TicketWithHistory | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: TicketFilters;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  actions: {
    submitting: boolean;
    approving: boolean;
    rejecting: boolean;
    returning: boolean;
    booking: boolean;
    cancelling: boolean;
    completing: boolean;
  };
}

// ── Initial State ────────────────────────────────────────────────────────────

const initialState: TicketState = {
  tickets: [],
  selectedTicket: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
  filters: {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'DESC',
  },
  status: 'idle',
  error: null,
  actions: {
    submitting: false,
    approving: false,
    rejecting: false,
    returning: false,
    booking: false,
    cancelling: false,
    completing: false,
  },
};

// ── Async Thunks ─────────────────────────────────────────────────────────────

// ── Create ────────────────────────────────────────────────────────────────────

export const createTicket = createAsyncThunk(
  'tickets/create',
  async (data: CreateTicketRequest) => {
    return await ticketApi.create(data);
  }
);

// ── Read ──────────────────────────────────────────────────────────────────────

export const fetchTickets = createAsyncThunk(
  'tickets/fetchAll',
  async (filters: TicketFilters = {}) => {
    return await ticketApi.getAll(filters);
  }
);

export const fetchTicketById = createAsyncThunk(
  'tickets/fetchById',
  async (id: string) => {
    return await ticketApi.getById(id);
  }
);

// ── Update ────────────────────────────────────────────────────────────────────

export const updateTicket = createAsyncThunk(
  'tickets/update',
  async ({ id, data }: { id: string; data: UpdateTicketRequest }) => {
    return await ticketApi.update(id, data);
  }
);

// ── Workflow ──────────────────────────────────────────────────────────────────

export const submitTicketForApproval = createAsyncThunk(
  'tickets/submitForApproval',
  async (id: string) => {
    return await ticketApi.submitForApproval(id);
  }
);

export const approveTicket = createAsyncThunk(
  'tickets/approve',
  async ({ id, comments }: { id: string; comments?: string }) => {
    return await ticketApi.approve(id, comments);
  }
);

export const rejectTicket = createAsyncThunk(
  'tickets/reject',
  async ({ id, reason }: { id: string; reason: string }) => {
    return await ticketApi.reject(id, reason);
  }
);

export const returnTicket = createAsyncThunk(
  'tickets/return',
  async ({ id, reason, instructions }: { id: string; reason: string; instructions?: string }) => {
    return await ticketApi.return(id, reason, instructions);
  }
);

export const bookTicket = createAsyncThunk(
  'tickets/book',
  async ({ id, booking_reference, comments }: { id: string; booking_reference: string; comments?: string }) => {
    return await ticketApi.book(id, booking_reference, comments);
  }
);

export const cancelTicket = createAsyncThunk(
  'tickets/cancel',
  async (id: string) => {
    return await ticketApi.cancel(id);
  }
);

export const completeTicket = createAsyncThunk(
  'tickets/complete',
  async (id: string) => {
    return await ticketApi.complete(id);
  }
);

// ── Comments ──────────────────────────────────────────────────────────────────

export const addTicketComment = createAsyncThunk(
  'tickets/addComment',
  async ({ id, comment, isInternal }: { id: string; comment: string; isInternal: boolean }) => {
    return await ticketApi.addComment(id, comment, isInternal);
  }
);

export const deleteTicketComment = createAsyncThunk(
  'tickets/deleteComment',
  async ({ id, commentId }: { id: string; commentId: string }) => {
    await ticketApi.deleteComment(id, commentId);
    return commentId;
  }
);

// ── Delete ────────────────────────────────────────────────────────────────────

export const deleteTicket = createAsyncThunk(
  'tickets/delete',
  async (id: string) => {
    await ticketApi.delete(id);
    return id;
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const ticketSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<TicketFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'DESC',
      };
    },
    clearSelectedTicket: (state) => {
      state.selectedTicket = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetStatus: (state) => {
      state.status = 'idle';
    },
    resetActions: (state) => {
      state.actions = {
        submitting: false,
        approving: false,
        rejecting: false,
        returning: false,
        booking: false,
        cancelling: false,
        completing: false,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch All ──────────────────────────────────────────────────────────
      .addCase(fetchTickets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTickets.fulfilled, (state, action: PayloadAction<TicketPaginationResponse>) => {
        state.status = 'succeeded';
        state.tickets = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch tickets';
      })

      // ── Fetch By ID ────────────────────────────────────────────────────────
      .addCase(fetchTicketById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTicketById.fulfilled, (state, action: PayloadAction<TicketWithHistory>) => {
        state.status = 'succeeded';
        state.selectedTicket = action.payload;
      })
      .addCase(fetchTicketById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch ticket';
      })

      // ── Create ─────────────────────────────────────────────────────────────
      .addCase(createTicket.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createTicket.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.status = 'succeeded';
        state.tickets = [action.payload, ...state.tickets];
        state.pagination.total += 1;
      })
      .addCase(createTicket.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to create ticket';
      })

      // ── Update ─────────────────────────────────────────────────────────────
      .addCase(updateTicket.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateTicket.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.status = 'succeeded';
        const index = state.tickets.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
        if (state.selectedTicket?.id === action.payload.id) {
          state.selectedTicket = { ...state.selectedTicket, ...action.payload };
        }
      })
      .addCase(updateTicket.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to update ticket';
      })

      // ── Submit for Approval ──────────────────────────────────────────────
      .addCase(submitTicketForApproval.pending, (state) => {
        state.actions.submitting = true;
        state.error = null;
      })
      .addCase(submitTicketForApproval.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.actions.submitting = false;
        const index = state.tickets.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
        if (state.selectedTicket?.id === action.payload.id) {
          state.selectedTicket = { ...state.selectedTicket, ...action.payload };
        }
      })
      .addCase(submitTicketForApproval.rejected, (state, action) => {
        state.actions.submitting = false;
        state.error = action.error.message || 'Failed to submit ticket';
      })

      // ── Approve ────────────────────────────────────────────────────────────
      .addCase(approveTicket.pending, (state) => {
        state.actions.approving = true;
        state.error = null;
      })
      .addCase(approveTicket.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.actions.approving = false;
        const index = state.tickets.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
        if (state.selectedTicket?.id === action.payload.id) {
          state.selectedTicket = { ...state.selectedTicket, ...action.payload };
        }
      })
      .addCase(approveTicket.rejected, (state, action) => {
        state.actions.approving = false;
        state.error = action.error.message || 'Failed to approve ticket';
      })

      // ── Reject ─────────────────────────────────────────────────────────────
      .addCase(rejectTicket.pending, (state) => {
        state.actions.rejecting = true;
        state.error = null;
      })
      .addCase(rejectTicket.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.actions.rejecting = false;
        const index = state.tickets.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
        if (state.selectedTicket?.id === action.payload.id) {
          state.selectedTicket = { ...state.selectedTicket, ...action.payload };
        }
      })
      .addCase(rejectTicket.rejected, (state, action) => {
        state.actions.rejecting = false;
        state.error = action.error.message || 'Failed to reject ticket';
      })

      // ── Return ─────────────────────────────────────────────────────────────
      .addCase(returnTicket.pending, (state) => {
        state.actions.returning = true;
        state.error = null;
      })
      .addCase(returnTicket.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.actions.returning = false;
        const index = state.tickets.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
        if (state.selectedTicket?.id === action.payload.id) {
          state.selectedTicket = { ...state.selectedTicket, ...action.payload };
        }
      })
      .addCase(returnTicket.rejected, (state, action) => {
        state.actions.returning = false;
        state.error = action.error.message || 'Failed to return ticket';
      })

      // ── Book ───────────────────────────────────────────────────────────────
      .addCase(bookTicket.pending, (state) => {
        state.actions.booking = true;
        state.error = null;
      })
      .addCase(bookTicket.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.actions.booking = false;
        const index = state.tickets.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
        if (state.selectedTicket?.id === action.payload.id) {
          state.selectedTicket = { ...state.selectedTicket, ...action.payload };
        }
      })
      .addCase(bookTicket.rejected, (state, action) => {
        state.actions.booking = false;
        state.error = action.error.message || 'Failed to book ticket';
      })

      // ── Cancel ─────────────────────────────────────────────────────────────
      .addCase(cancelTicket.pending, (state) => {
        state.actions.cancelling = true;
        state.error = null;
      })
      .addCase(cancelTicket.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.actions.cancelling = false;
        const index = state.tickets.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
        if (state.selectedTicket?.id === action.payload.id) {
          state.selectedTicket = { ...state.selectedTicket, ...action.payload };
        }
      })
      .addCase(cancelTicket.rejected, (state, action) => {
        state.actions.cancelling = false;
        state.error = action.error.message || 'Failed to cancel ticket';
      })

      // ── Complete ───────────────────────────────────────────────────────────
      .addCase(completeTicket.pending, (state) => {
        state.actions.completing = true;
        state.error = null;
      })
      .addCase(completeTicket.fulfilled, (state, action: PayloadAction<Ticket>) => {
        state.actions.completing = false;
        const index = state.tickets.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tickets[index] = action.payload;
        }
        if (state.selectedTicket?.id === action.payload.id) {
          state.selectedTicket = { ...state.selectedTicket, ...action.payload };
        }
      })
      .addCase(completeTicket.rejected, (state, action) => {
        state.actions.completing = false;
        state.error = action.error.message || 'Failed to complete ticket';
      })

      // ── Add Comment ────────────────────────────────────────────────────────
      .addCase(addTicketComment.fulfilled, (state, action) => {
        if (state.selectedTicket) {
          state.selectedTicket.comments.push(action.payload);
        }
      })

      // ── Delete Comment ─────────────────────────────────────────────────────
      .addCase(deleteTicketComment.fulfilled, (state, action: PayloadAction<string>) => {
        if (state.selectedTicket) {
          state.selectedTicket.comments = state.selectedTicket.comments.filter(
            c => c.id !== action.payload
          );
        }
      })

      // ── Delete ─────────────────────────────────────────────────────────────
      .addCase(deleteTicket.fulfilled, (state, action: PayloadAction<string>) => {
        state.tickets = state.tickets.filter(t => t.id !== action.payload);
        state.pagination.total -= 1;
        if (state.selectedTicket?.id === action.payload) {
          state.selectedTicket = null;
        }
      });
  },
});

// ── Selectors ─────────────────────────────────────────────────────────────────

// Basic selectors
export const selectAllTickets = (state: { tickets: TicketState }) => state.tickets.tickets;
export const selectSelectedTicket = (state: { tickets: TicketState }) => state.tickets.selectedTicket;
export const selectTicketStatus = (state: { tickets: TicketState }) => state.tickets.status;
export const selectTicketError = (state: { tickets: TicketState }) => state.tickets.error;
export const selectTicketPagination = (state: { tickets: TicketState }) => state.tickets.pagination;
export const selectTicketFilters = (state: { tickets: TicketState }) => state.tickets.filters;
export const selectTicketActions = (state: { tickets: TicketState }) => state.tickets.actions;

// ── Derived Selectors ──────────────────────────────────────────────────────

// Selector for tickets by status
export const selectTicketsByStatus = createSelector(
  [
    selectAllTickets,
    (_state: { tickets: TicketState }, status: TicketStatus) => status
  ],
  (tickets, status) => tickets.filter(t => t.status === status)
);

export const selectPendingTickets = createSelector(
  [selectAllTickets],
  (tickets) => tickets.filter(t => t.status === 'pending_approval')
);

// Selector for tickets by trip type
export const selectTicketsByTripType = createSelector(
  [
    selectAllTickets,
    (_state: { tickets: TicketState }, tripType: TicketTripType) => tripType
  ],
  (tickets, tripType) => tickets.filter(t => t.trip_type === tripType)
);

export const selectOneWayTickets = createSelector(
  [selectAllTickets],
  (tickets) => tickets.filter(t => t.trip_type === 'one_way')
);

export const selectRoundTripTickets = createSelector(
  [selectAllTickets],
  (tickets) => tickets.filter(t => t.trip_type === 'round_trip')
);

// Selector for tickets by user
export const selectMyTickets = createSelector(
  [
    selectAllTickets,
    (_state: { tickets: TicketState }, userId: string) => userId
  ],
  (tickets, userId) => tickets.filter(t => t.created_by === userId)
);

export const selectTicketsAssignedToMe = createSelector(
  [
    selectAllTickets,
    (_state: { tickets: TicketState }, userId: string) => userId
  ],
  (tickets, userId) => tickets.filter(t => t.assigned_to === userId)
);

// Selector for tickets by priority
export const selectTicketsByPriority = createSelector(
  [
    selectAllTickets,
    (_state: { tickets: TicketState }, priority: string) => priority
  ],
  (tickets, priority) => tickets.filter(t => t.priority === priority)
);

// Selector for tickets by judge name
export const selectTicketsByJudgeName = createSelector(
  [
    selectAllTickets,
    (_state: { tickets: TicketState }, judgeName: string) => judgeName
  ],
  (tickets, judgeName) => tickets.filter(t => 
    t.judge_name && t.judge_name.toLowerCase().includes(judgeName.toLowerCase())
  )
);

// Selector for tickets by PJ number
export const selectTicketsByPJNumber = createSelector(
  [
    selectAllTickets,
    (_state: { tickets: TicketState }, pjNumber: string) => pjNumber
  ],
  (tickets, pjNumber) => tickets.filter(t => 
    t.pj_number && t.pj_number.toLowerCase().includes(pjNumber.toLowerCase())
  )
);

// Selector for ticket counts
export const selectTicketCounts = createSelector(
  [selectAllTickets],
  (tickets) => ({
    total: tickets.length,
    pending: tickets.filter(t => t.status === 'pending_approval').length,
    approved: tickets.filter(t => t.status === 'approved').length,
    booked: tickets.filter(t => t.status === 'booked').length,
    completed: tickets.filter(t => t.status === 'completed').length,
    cancelled: tickets.filter(t => t.status === 'cancelled').length,
    rejected: tickets.filter(t => t.status === 'rejected').length,
    draft: tickets.filter(t => t.status === 'draft').length,
    oneWay: tickets.filter(t => t.trip_type === 'one_way').length,
    roundTrip: tickets.filter(t => t.trip_type === 'round_trip').length,
  })
);

// Selector for tickets with judge information
export const selectTicketsWithJudgeInfo = createSelector(
  [selectAllTickets],
  (tickets) => tickets.filter(t => t.judge_name || t.pj_number)
);

// Selector for tickets with travel dates
export const selectTicketsByDateRange = createSelector(
  [
    selectAllTickets,
    (_state: { tickets: TicketState }, dateFrom: string, dateTo: string) => ({ dateFrom, dateTo })
  ],
  (tickets, { dateFrom, dateTo }) => tickets.filter(t => {
    const travelDate = new Date(t.date_of_travel);
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return travelDate >= from && travelDate <= to;
  })
);

// Actions
export const {
  setFilters,
  resetFilters,
  clearSelectedTicket,
  clearError,
  resetStatus,
  resetActions,
} = ticketSlice.actions;

export default ticketSlice.reducer;