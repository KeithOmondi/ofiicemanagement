// ============================================================
// utilitiesSlice.ts - Dedicated Utilities Slice with Memo Support
// ============================================================

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

export type UtilityType = "Electricity" | "Water" | "Internet" | "Fuel" | "Other";

export type UtilityStatus =
  | "Awaiting"
  | "Awaiting Documentation"
  | "Awaiting Funding"
  | "In Process"
  | "Approved"
  | "Paid"
  | "Payment NA";

// ─── NEW: Approval Status Types ──────────────────────────────────────────

export type UtilityApprovalStatus = "pending" | "sent" | "approved" | "rejected";

export type MemoStatus = "draft" | "sent" | "approved" | "rejected" | "cancelled";

export type ConsolidatedMemoType = "all" | "fuel";

// ─── NEW: Utility Item with Approval Fields ──────────────────────────────

export interface UtilityItem {
  id: string;
  request_id: string;
  utility_type: UtilityType;
  requisition_number: string | null;
  amount: number;
  period: string;
  description: string | null;
  date_received: string | null;
  date_forwarded_dass: string | null;
  date_paid: string | null;
  status: UtilityStatus;
  supporting_document_url: string | null;
  
  // ─── NEW: Approval tracking fields ────────────────────────────────────
  approval_status: UtilityApprovalStatus;
  memo_id: string | null;
  memo_sent_at: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface JudgeUtility {
  id: string;
  pj_number: string | null;
  judge_name: string;
  items: UtilityItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── NEW: Consolidated Memo ──────────────────────────────────────────────

export interface ConsolidatedMemo {
  id: string;
  type: ConsolidatedMemoType;
  entity_id: string;
  title: string;
  period: string;
  generated_at: string;
  sent_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  status: MemoStatus;
  utility_item_ids: string[];
  total_amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Input Types ──────────────────────────────────────────────────────────

export interface UtilityItemInput {
  utility_type: UtilityType;
  requisition_number?: string;
  amount: number;
  period: string;
  description?: string;
  date_received?: string;
  date_forwarded_dass?: string;
  date_paid?: string;
  status?: UtilityStatus;
  approval_status?: UtilityApprovalStatus;
}

export interface CreateUtilityInput {
  pj_number: string;
  judge_name: string;
  items: UtilityItemInput[];
}

export interface AddUtilityItemInput {
  pj_number: string;
  utility_type: UtilityType;
  requisition_number?: string;
  amount: number;
  period: string;
  description?: string;
  date_received?: string;
  date_forwarded_dass?: string;
  date_paid?: string;
  status?: UtilityStatus;
}

export interface UpdateUtilityItemInput {
  status?: UtilityStatus;
  date_received?: string;
  date_forwarded_dass?: string;
  date_paid?: string;
  amount?: number;
  period?: string;
  description?: string;
  utility_type?: UtilityType;
  requisition_number?: string;
  approval_status?: UtilityApprovalStatus;
  memo_id?: string | null;
}

export interface UpdateUtilityInput {
  pj_number?: string;
  judge_name?: string;
}

export interface UtilityFilters {
  search?: string;
  pj_number?: string;
  judge_name?: string;
  status?: UtilityStatus;
  approval_status?: UtilityApprovalStatus;
  period?: string;
  limit?: number;
  offset?: number;
}

// ─── NEW: Memo Input Types ───────────────────────────────────────────────

export interface GenerateMemoInput {
  type: ConsolidatedMemoType;
  period: string;
  utility_item_ids: string[];
  title?: string;
}

export interface MemoFilters {
  period?: string;
  type?: ConsolidatedMemoType;
  status?: MemoStatus;
  limit?: number;
  offset?: number;
}

export interface BulkUpdateUtilityItemsInput {
  item_ids: string[];
  approval_status: UtilityApprovalStatus;
  memo_id?: string | null;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface UtilityStats {
  totalRequests: number;
  totalItems: number;
  byStatus: Record<UtilityStatus, number>;
  byApprovalStatus: Record<UtilityApprovalStatus, number>;
  byType: Record<string, number>;
  totalAmount: number;
}

export interface MemoSummary {
  totalMemos: number;
  byStatus: Record<string, number>;
  totalAmount: number;
  pendingItems: number;
}

/* ============================================================
   STATE INTERFACE
============================================================ */

interface UtilitiesState {
  // Data
  utilities: JudgeUtility[];
  memos: ConsolidatedMemo[];
  
  // Selected items
  selectedUtility: JudgeUtility | null;
  selectedMemo: ConsolidatedMemo | null;
  
  // Filters
  filters: UtilityFilters;
  memoFilters: MemoFilters;
  
  // Pagination
  pagination: {
    utilities: { total: number; page: number; limit: number };
    memos: { total: number; page: number; limit: number };
  };
  
  // Loading states
  loading: {
    utilities: boolean;
    memos: boolean;
    mutating: boolean;
    generating: boolean;
    stats: boolean;
  };
  
  // Stats
  stats: UtilityStats | null;
  memoSummary: MemoSummary | null;
  availablePeriods: string[];
  
  // UI state
  error: string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: UtilitiesState = {
  utilities: [],
  memos: [],
  
  selectedUtility: null,
  selectedMemo: null,
  
  filters: {},
  memoFilters: {},
  
  pagination: {
    utilities: { total: 0, page: 1, limit: 20 },
    memos: { total: 0, page: 1, limit: 20 },
  },
  
  loading: {
    utilities: false,
    memos: false,
    mutating: false,
    generating: false,
    stats: false,
  },
  
  stats: null,
  memoSummary: null,
  availablePeriods: [],
  
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

/* ============================================================
   THUNKS - UTILITIES
============================================================ */

// ─── Fetch Utilities ──────────────────────────────────────────────────────

export const fetchUtilities = createAsyncThunk(
  "utilities/fetchUtilities",
  async (filters: UtilityFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/utilities${query}`);
      return data.data as JudgeUtility[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchUtilityById = createAsyncThunk(
  "utilities/fetchUtilityById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/utilities/${id}`);
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchUtilityByPjNumber = createAsyncThunk(
  "utilities/fetchUtilityByPjNumber",
  async (pjNumber: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/utilities/by-pj/${encodeURIComponent(pjNumber)}`);
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

// ─── Create/Update Utilities ─────────────────────────────────────────────

export const createUtility = createAsyncThunk(
  "utilities/createUtility",
  async (input: CreateUtilityInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/utilities", input);
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const addUtilityItem = createAsyncThunk(
  "utilities/addUtilityItem",
  async (input: AddUtilityItemInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/utilities/items", input);
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const updateUtilityItem = createAsyncThunk(
  "utilities/updateUtilityItem",
  async (
    { id, itemId, updates }: { id: string; itemId: string; updates: UpdateUtilityItemInput },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axiosClient.put(`/utilities/${id}/items/${itemId}`, updates);
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const updateUtility = createAsyncThunk(
  "utilities/updateUtility",
  async ({ id, updates }: { id: string; updates: UpdateUtilityInput }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.put(`/utilities/${id}`, updates);
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const deleteUtilityItem = createAsyncThunk(
  "utilities/deleteUtilityItem",
  async ({ id, itemId }: { id: string; itemId: string }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/utilities/${id}/items/${itemId}`);
      return { id, itemId };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const deleteUtility = createAsyncThunk(
  "utilities/deleteUtility",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/utilities/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

// ─── Memo Thunks ─────────────────────────────────────────────────────────

const buildQueryString = <T extends object>(filters: T): string => {
  const params = new URLSearchParams();
  Object.entries(filters as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        params.append(key, value.join(","));
      } else {
        params.append(key, String(value));
      }
    }
  });
  return params.toString() ? `?${params.toString()}` : "";
};

export const fetchMemoById = createAsyncThunk(
  "utilities/fetchMemoById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/utilities/memos/${id}`);
      return data.data as ConsolidatedMemo;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchMemoByEntityId = createAsyncThunk(
  "utilities/fetchMemoByEntityId",
  async (entityId: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/utilities/memos/entity/${entityId}`);
      return data.data as ConsolidatedMemo;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const generateMemo = createAsyncThunk(
  "utilities/generateMemo",
  async (input: GenerateMemoInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/utilities/memos/generate", input);
      return data.data as ConsolidatedMemo;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchMemos = createAsyncThunk(
  "utilities/fetchMemos",
  async (filters: MemoFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/utilities/memos${query}`);
      return data.data as ConsolidatedMemo[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const sendMemoForApproval = createAsyncThunk(
  "utilities/sendMemoForApproval",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`/utilities/memos/${id}/send`);
      return data.data as ConsolidatedMemo;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const approveMemo = createAsyncThunk(
  "utilities/approveMemo",
  async ({ id, notes }: { id: string; notes?: string }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`/utilities/memos/${id}/approve`, { notes });
      return data.data as ConsolidatedMemo;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const rejectMemo = createAsyncThunk(
  "utilities/rejectMemo",
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`/utilities/memos/${id}/reject`, { reason });
      return data.data as ConsolidatedMemo;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const cancelMemo = createAsyncThunk(
  "utilities/cancelMemo",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`/utilities/memos/${id}/cancel`);
      return data.data as ConsolidatedMemo;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

// ─── Utility Query Thunks ─────────────────────────────────────────────────

export const fetchPendingUtilities = createAsyncThunk(
  "utilities/fetchPendingUtilities",
  async (
    params: { period?: string; utility_type?: UtilityType; judge_name?: string; pj_number?: string; limit?: number; offset?: number } = {},
    { rejectWithValue }
  ) => {
    try {
      const query = buildQueryString(params);
      const { data } = await axiosClient.get(`/utilities/pending${query}`);
      return data.data as UtilityItem[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchUtilitiesByApprovalStatus = createAsyncThunk(
  "utilities/fetchUtilitiesByApprovalStatus",
  async (
    { status, period, utility_type, limit, offset }: 
    { status: UtilityApprovalStatus; period?: string; utility_type?: UtilityType; limit?: number; offset?: number },
    { rejectWithValue }
  ) => {
    try {
      const query = buildQueryString({ period, utility_type, limit, offset });
      const { data } = await axiosClient.get(`/utilities/by-approval-status/${status}${query}`);
      return data.data as UtilityItem[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchAvailablePeriods = createAsyncThunk(
  "utilities/fetchAvailablePeriods",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get("/utilities/available-periods");
      return data.data as string[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchUtilitySummary = createAsyncThunk(
  "utilities/fetchUtilitySummary",
  async (period: string | undefined, { rejectWithValue }) => {
    try {
      const query = period ? `?period=${encodeURIComponent(period)}` : "";
      const { data } = await axiosClient.get(`/utilities/summary${query}`);
      return data.data as UtilityStats & MemoSummary;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchUtilityStats = createAsyncThunk(
  "utilities/fetchUtilityStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get("/utilities/stats");
      return data.data as UtilityStats;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const fetchUtilityEnums = createAsyncThunk(
  "utilities/fetchUtilityEnums",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get("/utilities/enums");
      return data.data as {
        utilityTypes: UtilityType[];
        utilityStatuses: UtilityStatus[];
        approvalStatuses: UtilityApprovalStatus[];
        memoStatuses: MemoStatus[];
        memoTypes: ConsolidatedMemoType[];
      };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

// ─── Bulk Operations ──────────────────────────────────────────────────────

export const bulkUpdateUtilityItems = createAsyncThunk(
  "utilities/bulkUpdateUtilityItems",
  async (input: BulkUpdateUtilityItemsInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/utilities/bulk-update", input);
      return data.data as { updated: number };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const utilitiesSlice = createSlice({
  name: "utilities",
  initialState,
  reducers: {
    // ─── Filters ──────────────────────────────────────────────────────────
    setUtilityFilters(state, action: PayloadAction<Partial<UtilityFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setMemoFilters(state, action: PayloadAction<Partial<MemoFilters>>) {
      state.memoFilters = { ...state.memoFilters, ...action.payload };
    },
    clearUtilityFilters(state) {
      state.filters = {};
      state.memoFilters = {};
    },
    
    // ─── Pagination ──────────────────────────────────────────────────────
    setUtilityPagination(
      state,
      action: PayloadAction<{ page: number; limit?: number }>
    ) {
      state.pagination.utilities.page = action.payload.page;
      if (action.payload.limit) {
        state.pagination.utilities.limit = action.payload.limit;
      }
    },
    setMemoPagination(
      state,
      action: PayloadAction<{ page: number; limit?: number }>
    ) {
      state.pagination.memos.page = action.payload.page;
      if (action.payload.limit) {
        state.pagination.memos.limit = action.payload.limit;
      }
    },
    
    // ─── Selection ──────────────────────────────────────────────────────
    setSelectedUtility(state, action: PayloadAction<JudgeUtility | null>) {
      state.selectedUtility = action.payload;
    },
    setSelectedMemo(state, action: PayloadAction<ConsolidatedMemo | null>) {
      state.selectedMemo = action.payload;
    },
    
    // ─── Optimistic Updates ─────────────────────────────────────────────
    updateUtilityItemOptimistically(
      state,
      action: PayloadAction<{ id: string; itemId: string; status: UtilityStatus }>
    ) {
      const { id, itemId, status } = action.payload;
      const utility = state.utilities.find((u) => u.id === id);
      const item = utility?.items.find((i) => i.id === itemId);
      if (item) item.status = status;
      if (state.selectedUtility?.id === id) {
        const selectedItem = state.selectedUtility.items.find((i) => i.id === itemId);
        if (selectedItem) selectedItem.status = status;
      }
    },
    
    updateMemoOptimistically(
      state,
      action: PayloadAction<{ id: string; status: MemoStatus }>
    ) {
      const { id, status } = action.payload;
      const memo = state.memos.find((m) => m.id === id);
      if (memo) memo.status = status;
      if (state.selectedMemo?.id === id) {
        state.selectedMemo.status = status;
      }
    },
    
    // ─── Clear State ────────────────────────────────────────────────────
    clearUtilityError(state) {
      state.error = null;
    },
    clearUtilitySuccess(state) {
      state.success = false;
    },
    resetUtilitiesState: () => initialState,
  },
  extraReducers: (builder) => {
    // ─── fetchUtilities ──────────────────────────────────────────────────
    builder
      .addCase(fetchUtilities.pending, (state) => {
        state.loading.utilities = true;
        state.error = null;
      })
      .addCase(fetchUtilities.fulfilled, (state, action: PayloadAction<JudgeUtility[]>) => {
        state.loading.utilities = false;
        state.utilities = action.payload;
        state.pagination.utilities.total = action.payload.length;
      })
      .addCase(fetchUtilities.rejected, (state, action) => {
        state.loading.utilities = false;
        state.error = action.payload as string;
      });

    // ─── fetchUtilityById ─────────────────────────────────────────────────
    builder
      .addCase(fetchUtilityById.pending, (state) => {
        state.loading.utilities = true;
        state.error = null;
      })
      .addCase(fetchUtilityById.fulfilled, (state, action: PayloadAction<JudgeUtility>) => {
        state.loading.utilities = false;
        state.selectedUtility = action.payload;
      })
      .addCase(fetchUtilityById.rejected, (state, action) => {
        state.loading.utilities = false;
        state.error = action.payload as string;
      });

    // ─── fetchUtilityByPjNumber ──────────────────────────────────────────
    builder
      .addCase(fetchUtilityByPjNumber.pending, (state) => {
        state.loading.utilities = true;
        state.error = null;
      })
      .addCase(fetchUtilityByPjNumber.fulfilled, (state, action: PayloadAction<JudgeUtility>) => {
        state.loading.utilities = false;
        state.selectedUtility = action.payload;
      })
      .addCase(fetchUtilityByPjNumber.rejected, (state, action) => {
        state.loading.utilities = false;
        state.error = action.payload as string;
      });

    // ─── createUtility ────────────────────────────────────────────────────
    builder
      .addCase(createUtility.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createUtility.fulfilled, (state, action: PayloadAction<JudgeUtility>) => {
        state.loading.mutating = false;
        state.success = true;
        state.utilities = [action.payload, ...state.utilities];
        if (state.stats) {
          state.stats.totalRequests += 1;
        }
      })
      .addCase(createUtility.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ─── addUtilityItem ──────────────────────────────────────────────────
    builder
      .addCase(addUtilityItem.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(addUtilityItem.fulfilled, (state, action: PayloadAction<JudgeUtility>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.utilities.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) state.utilities[index] = action.payload;
        if (state.selectedUtility?.id === action.payload.id) {
          state.selectedUtility = action.payload;
        }
      })
      .addCase(addUtilityItem.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ─── updateUtilityItem ───────────────────────────────────────────────
    builder
      .addCase(updateUtilityItem.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateUtilityItem.fulfilled, (state, action: PayloadAction<JudgeUtility>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.utilities.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) state.utilities[index] = action.payload;
        if (state.selectedUtility?.id === action.payload.id) {
          state.selectedUtility = action.payload;
        }
      })
      .addCase(updateUtilityItem.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ─── updateUtility ────────────────────────────────────────────────────
    builder
      .addCase(updateUtility.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateUtility.fulfilled, (state, action: PayloadAction<JudgeUtility>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.utilities.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) state.utilities[index] = action.payload;
        if (state.selectedUtility?.id === action.payload.id) {
          state.selectedUtility = action.payload;
        }
      })
      .addCase(updateUtility.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ─── deleteUtilityItem ───────────────────────────────────────────────
    builder
      .addCase(deleteUtilityItem.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteUtilityItem.fulfilled, (state, action: PayloadAction<{ id: string; itemId: string }>) => {
        state.loading.mutating = false;
        const { id, itemId } = action.payload;
        const utility = state.utilities.find((u) => u.id === id);
        if (utility) {
          utility.items = utility.items.filter((i) => i.id !== itemId);
        }
        if (state.selectedUtility?.id === id) {
          state.selectedUtility.items = state.selectedUtility.items.filter((i) => i.id !== itemId);
        }
      })
      .addCase(deleteUtilityItem.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    // ─── deleteUtility ────────────────────────────────────────────────────
    builder
      .addCase(deleteUtility.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteUtility.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.utilities = state.utilities.filter((u) => u.id !== action.payload);
        if (state.selectedUtility?.id === action.payload) {
          state.selectedUtility = null;
        }
        if (state.stats) {
          state.stats.totalRequests -= 1;
        }
      })
      .addCase(deleteUtility.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    // ─── fetchMemos ──────────────────────────────────────────────────────
    builder
      .addCase(fetchMemos.pending, (state) => {
        state.loading.memos = true;
        state.error = null;
      })
      .addCase(fetchMemos.fulfilled, (state, action: PayloadAction<ConsolidatedMemo[]>) => {
        state.loading.memos = false;
        state.memos = action.payload;
        state.pagination.memos.total = action.payload.length;
      })
      .addCase(fetchMemos.rejected, (state, action) => {
        state.loading.memos = false;
        state.error = action.payload as string;
      });

    // ─── fetchMemoById ────────────────────────────────────────────────────
    builder
      .addCase(fetchMemoById.pending, (state) => {
        state.loading.memos = true;
        state.error = null;
      })
      .addCase(fetchMemoById.fulfilled, (state, action: PayloadAction<ConsolidatedMemo>) => {
        state.loading.memos = false;
        state.selectedMemo = action.payload;
      })
      .addCase(fetchMemoById.rejected, (state, action) => {
        state.loading.memos = false;
        state.error = action.payload as string;
      });

    // ─── generateMemo ────────────────────────────────────────────────────
    builder
      .addCase(generateMemo.pending, (state) => {
        state.loading.generating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(generateMemo.fulfilled, (state, action: PayloadAction<ConsolidatedMemo>) => {
        state.loading.generating = false;
        state.success = true;
        state.memos = [action.payload, ...state.memos];
        state.selectedMemo = action.payload;
      })
      .addCase(generateMemo.rejected, (state, action) => {
        state.loading.generating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ─── sendMemoForApproval ─────────────────────────────────────────────
    builder
      .addCase(sendMemoForApproval.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(sendMemoForApproval.fulfilled, (state, action: PayloadAction<ConsolidatedMemo>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.memos.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) state.memos[index] = action.payload;
        if (state.selectedMemo?.id === action.payload.id) {
          state.selectedMemo = action.payload;
        }
      })
      .addCase(sendMemoForApproval.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ─── approveMemo ─────────────────────────────────────────────────────
    builder
      .addCase(approveMemo.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(approveMemo.fulfilled, (state, action: PayloadAction<ConsolidatedMemo>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.memos.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) state.memos[index] = action.payload;
        if (state.selectedMemo?.id === action.payload.id) {
          state.selectedMemo = action.payload;
        }
      })
      .addCase(approveMemo.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ─── rejectMemo ──────────────────────────────────────────────────────
    builder
      .addCase(rejectMemo.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(rejectMemo.fulfilled, (state, action: PayloadAction<ConsolidatedMemo>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.memos.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) state.memos[index] = action.payload;
        if (state.selectedMemo?.id === action.payload.id) {
          state.selectedMemo = action.payload;
        }
      })
      .addCase(rejectMemo.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ─── cancelMemo ──────────────────────────────────────────────────────
    builder
      .addCase(cancelMemo.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(cancelMemo.fulfilled, (state, action: PayloadAction<ConsolidatedMemo>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.memos.findIndex((m) => m.id === action.payload.id);
        if (index !== -1) state.memos[index] = action.payload;
        if (state.selectedMemo?.id === action.payload.id) {
          state.selectedMemo = action.payload;
        }
      })
      .addCase(cancelMemo.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ─── fetchPendingUtilities ────────────────────────────────────────────
    builder
      .addCase(fetchPendingUtilities.pending, (state) => {
        state.loading.utilities = true;
        state.error = null;
      })
    .addCase(fetchPendingUtilities.fulfilled, (state) => {
  state.loading.utilities = false;
  // These are just items, not full utilities - we don't store them in state
  // They're used for the memo generation UI
})
      .addCase(fetchPendingUtilities.rejected, (state, action) => {
        state.loading.utilities = false;
        state.error = action.payload as string;
      });

    // ─── fetchAvailablePeriods ───────────────────────────────────────────
    builder
      .addCase(fetchAvailablePeriods.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchAvailablePeriods.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.loading.stats = false;
        state.availablePeriods = action.payload;
      })
      .addCase(fetchAvailablePeriods.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload as string;
      });

    // ─── fetchUtilitySummary ─────────────────────────────────────────────
    builder
      .addCase(fetchUtilitySummary.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchUtilitySummary.fulfilled, (state, action: PayloadAction<UtilityStats & MemoSummary>) => {
        state.loading.stats = false;
        state.stats = {
          totalRequests: action.payload.totalRequests,
          totalItems: action.payload.totalItems,
          byStatus: action.payload.byStatus,
          byApprovalStatus: action.payload.byApprovalStatus,
          byType: action.payload.byType,
          totalAmount: action.payload.totalAmount,
        };
        state.memoSummary = {
          totalMemos: action.payload.totalMemos,
          byStatus: action.payload.byStatus,
          totalAmount: action.payload.totalAmount,
          pendingItems: action.payload.pendingItems,
        };
      })
      .addCase(fetchUtilitySummary.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload as string;
      });

    // ─── fetchUtilityStats ───────────────────────────────────────────────
    builder
      .addCase(fetchUtilityStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchUtilityStats.fulfilled, (state, action: PayloadAction<UtilityStats>) => {
        state.loading.stats = false;
        state.stats = action.payload;
      })
      .addCase(fetchUtilityStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload as string;
      });

    // ─── bulkUpdateUtilityItems ──────────────────────────────────────────
    builder
      .addCase(bulkUpdateUtilityItems.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(bulkUpdateUtilityItems.fulfilled, (state) => {
        state.loading.mutating = false;
        state.success = true;
        // We don't have the updated items, so we'll refetch
      })
      .addCase(bulkUpdateUtilityItems.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setUtilityFilters,
  setMemoFilters,
  clearUtilityFilters,
  setUtilityPagination,
  setMemoPagination,
  setSelectedUtility,
  setSelectedMemo,
  updateUtilityItemOptimistically,
  updateMemoOptimistically,
  clearUtilityError,
  clearUtilitySuccess,
  resetUtilitiesState,
} = utilitiesSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ─── Data ──────────────────────────────────────────────────────────────────

export const selectAllUtilities = (state: { utilities: UtilitiesState }) =>
  state.utilities.utilities;

export const selectAllMemos = (state: { utilities: UtilitiesState }) =>
  state.utilities.memos;

export const selectAllUtilityItems = (state: { utilities: UtilitiesState }) =>
  state.utilities.utilities.flatMap((u) =>
    u.items.map((item) => ({ ...item, judge_name: u.judge_name }))
  );

// ─── Selected Items ──────────────────────────────────────────────────────

export const selectSelectedUtility = (state: { utilities: UtilitiesState }) =>
  state.utilities.selectedUtility;

export const selectSelectedMemo = (state: { utilities: UtilitiesState }) =>
  state.utilities.selectedMemo;

// ─── Filters ─────────────────────────────────────────────────────────────

export const selectUtilityFilters = (state: { utilities: UtilitiesState }) =>
  state.utilities.filters;

export const selectMemoFilters = (state: { utilities: UtilitiesState }) =>
  state.utilities.memoFilters;

// ─── Loading States ──────────────────────────────────────────────────────

export const selectUtilitiesLoading = (state: { utilities: UtilitiesState }) =>
  state.utilities.loading.utilities;

export const selectMemosLoading = (state: { utilities: UtilitiesState }) =>
  state.utilities.loading.memos;

export const selectUtilitiesMutating = (state: { utilities: UtilitiesState }) =>
  state.utilities.loading.mutating;

export const selectUtilitiesGenerating = (state: { utilities: UtilitiesState }) =>
  state.utilities.loading.generating;

export const selectUtilitiesStatsLoading = (state: { utilities: UtilitiesState }) =>
  state.utilities.loading.stats;

// ─── Stats ────────────────────────────────────────────────────────────────

export const selectUtilityStats = (state: { utilities: UtilitiesState }) =>
  state.utilities.stats;

export const selectMemoSummary = (state: { utilities: UtilitiesState }) =>
  state.utilities.memoSummary;

export const selectAvailablePeriods = (state: { utilities: UtilitiesState }) =>
  state.utilities.availablePeriods;

// ─── Derived Selectors ──────────────────────────────────────────────────

export const selectUtilitiesByStatus = (status: UtilityStatus) =>
  (state: { utilities: UtilitiesState }) =>
    state.utilities.utilities.filter((u) =>
      u.items.some((item) => item.status === status)
    );

export const selectMemosByStatus = (status: MemoStatus) =>
  (state: { utilities: UtilitiesState }) =>
    state.utilities.memos.filter((m) => m.status === status);

export const selectMemosByType = (type: ConsolidatedMemoType) =>
  (state: { utilities: UtilitiesState }) =>
    state.utilities.memos.filter((m) => m.type === type);

export const selectMemosByPeriod = (period: string) =>
  (state: { utilities: UtilitiesState }) =>
    state.utilities.memos.filter((m) => m.period === period);

export const selectPendingItemsCount = (state: { utilities: UtilitiesState }) =>
  state.utilities.utilities.reduce(
    (sum, u) => sum + u.items.filter((item) => item.approval_status === "pending").length,
    0
  );

export const selectSentItemsCount = (state: { utilities: UtilitiesState }) =>
  state.utilities.utilities.reduce(
    (sum, u) => sum + u.items.filter((item) => item.approval_status === "sent").length,
    0
  );

export const selectApprovedItemsCount = (state: { utilities: UtilitiesState }) =>
  state.utilities.utilities.reduce(
    (sum, u) => sum + u.items.filter((item) => item.approval_status === "approved").length,
    0
  );

export const selectRejectedItemsCount = (state: { utilities: UtilitiesState }) =>
  state.utilities.utilities.reduce(
    (sum, u) => sum + u.items.filter((item) => item.approval_status === "rejected").length,
    0
  );

export const selectTotalUtilityAmount = (state: { utilities: UtilitiesState }) =>
  state.utilities.utilities.reduce(
    (sum, u) => sum + u.items.reduce((itemSum, item) => itemSum + item.amount, 0),
    0
  );

export const selectUtilityItemsByPeriod = (period: string) =>
  (state: { utilities: UtilitiesState }) =>
    state.utilities.utilities.flatMap((u) =>
      u.items
        .filter((item) => item.period === period)
        .map((item) => ({ ...item, judge_name: u.judge_name }))
    );

export const selectPendingUtilityItemsByPeriod = (period: string) =>
  (state: { utilities: UtilitiesState }) =>
    state.utilities.utilities.flatMap((u) =>
      u.items
        .filter((item) => item.period === period && item.approval_status === "pending")
        .map((item) => ({ ...item, judge_name: u.judge_name }))
    );

export const selectItemsByApprovalStatus = (status: UtilityApprovalStatus) =>
  (state: { utilities: UtilitiesState }) =>
    state.utilities.utilities.flatMap((u) =>
      u.items
        .filter((item) => item.approval_status === status)
        .map((item) => ({ ...item, judge_name: u.judge_name }))
    );

// ─── Pagination ──────────────────────────────────────────────────────────

export const selectUtilitiesPagination = (state: { utilities: UtilitiesState }) =>
  state.utilities.pagination.utilities;

export const selectMemosPagination = (state: { utilities: UtilitiesState }) =>
  state.utilities.pagination.memos;

// ─── Status ──────────────────────────────────────────────────────────────

export const selectUtilitiesError = (state: { utilities: UtilitiesState }) =>
  state.utilities.error;

export const selectUtilitiesSuccess = (state: { utilities: UtilitiesState }) =>
  state.utilities.success;

export default utilitiesSlice.reducer;