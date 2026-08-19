// src/store/slices/joSlice.ts

import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axiosClient from "../../api/api";
import type { AxiosError } from "axios";
import type {
  JoDocument,
  JoDocumentWithResponses,
  JoDocumentResponse,
  JoDocumentFlowEntry,
  JoDocumentPaginationResponse,
  JoDocumentFilters,
  CreateJoDocumentInput,
  UpdateJoDocumentInput,
  SendToSuperAdminInput,
  RespondToJoDocumentInput,
  ApproveJoDocumentInput,
  RejectJoDocumentInput,
  ResubmitJoDocumentInput,
} from "../../types/jo.types";

// ─── Types ────────────────────────────────────────────────────────────────

interface JoState {
  documents: JoDocument[];
  currentDocument: JoDocumentWithResponses | null;
  flowHistory: JoDocumentFlowEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  loading: boolean;
  error: string | null;
  actionInProgress: {
    creating?: boolean;
    updatingDraft?: string;
    replacingFile?: string;
    sending?: string;
    responding?: string;
    approving?: string;
    rejecting?: string;
    resubmitting?: string;
    deleting?: string;
    fetchingFlow?: boolean;
  };
}

const initialState: JoState = {
  documents: [],
  currentDocument: null,
  flowHistory: [],
  pagination: null,
  loading: false,
  error: null,
  actionInProgress: {},
};

// ─── Utility ──────────────────────────────────────────────────────────────

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "isAxiosError" in error) {
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string;
    }>;
    return (
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      "Request failed"
    );
  }
  if (error instanceof Error) return error.message;
  return "An unknown error occurred";
};

// ─── Thunks ───────────────────────────────────────────────────────────────

// ── Fetch documents (list) ──────────────────────────────────────────────

export const fetchJoDocuments = createAsyncThunk(
  "jo/fetchJoDocuments",
  async (filters: JoDocumentFilters, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: JoDocumentPaginationResponse;
      }>("/jo", { params: filters });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Fetch single document (with response thread) ───────────────────────

export const fetchJoDocumentById = createAsyncThunk(
  "jo/fetchJoDocumentById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: JoDocumentWithResponses;
      }>(`/jo/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Fetch flow history ──────────────────────────────────────────────────

export const fetchJoDocumentFlowHistory = createAsyncThunk(
  "jo/fetchJoDocumentFlowHistory",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: JoDocumentFlowEntry[];
      }>(`/jo/${id}/flow`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Create (upload, draft or immediately sent) ──────────────────────────

export const createJoDocument = createAsyncThunk(
  "jo/createJoDocument",
  async (
    { input, file }: { input: CreateJoDocumentInput; file: File },
    { rejectWithValue },
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: JoDocument;
      }>("/jo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Update draft (title only) ───────────────────────────────────────────

export const updateJoDocumentDraft = createAsyncThunk(
  "jo/updateJoDocumentDraft",
  async (
    { id, input }: { id: string; input: UpdateJoDocumentInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.patch<{
        success: boolean;
        data: JoDocument;
      }>(`/jo/${id}`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Replace file (draft or rejected only) ───────────────────────────────

export const replaceJoDocumentFile = createAsyncThunk(
  "jo/replaceJoDocumentFile",
  async (
    { id, file }: { id: string; file: File },
    { rejectWithValue },
  ) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axiosClient.put<{
        success: boolean;
        data: JoDocument;
      }>(`/jo/${id}/file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Send draft to super admin ───────────────────────────────────────────

export const sendJoDocumentToSuperAdmin = createAsyncThunk(
  "jo/sendJoDocumentToSuperAdmin",
  async (
    { id, input }: { id: string; input: SendToSuperAdminInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: JoDocument;
      }>(`/jo/${id}/send`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Respond (chat thread, JO or super admin) ────────────────────────────

export const respondToJoDocument = createAsyncThunk(
  "jo/respondToJoDocument",
  async (
    { id, input }: { id: string; input: RespondToJoDocumentInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: JoDocumentResponse;
      }>(`/jo/${id}/respond`, input);
      return { documentId: id, response: response.data.data };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Approve ──────────────────────────────────────────────────────────────

export const approveJoDocument = createAsyncThunk(
  "jo/approveJoDocument",
  async (
    { id, input }: { id: string; input: ApproveJoDocumentInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: JoDocument;
      }>(`/jo/${id}/approve`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Reject ───────────────────────────────────────────────────────────────

export const rejectJoDocument = createAsyncThunk(
  "jo/rejectJoDocument",
  async (
    { id, input }: { id: string; input: RejectJoDocumentInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: JoDocument;
      }>(`/jo/${id}/reject`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Resubmit (JO, after rejection) ──────────────────────────────────────

export const resubmitJoDocument = createAsyncThunk(
  "jo/resubmitJoDocument",
  async (
    { id, input }: { id: string; input: ResubmitJoDocumentInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: JoDocument;
      }>(`/jo/${id}/resubmit`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Delete draft ─────────────────────────────────────────────────────────

export const deleteJoDocumentDraft = createAsyncThunk(
  "jo/deleteJoDocumentDraft",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/jo/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────

const joSlice = createSlice({
  name: "jo",
  initialState,
  reducers: {
    clearCurrentJoDocument: (state) => {
      state.currentDocument = null;
    },
    clearJoError: (state) => {
      state.error = null;
    },
    clearJoFlowHistory: (state) => {
      state.flowHistory = [];
    },
    resetJoState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ── fetchJoDocuments ────────────────────────────────────────────────
      .addCase(fetchJoDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJoDocuments.fulfilled, (state, action: PayloadAction<JoDocumentPaginationResponse>) => {
        state.loading = false;
        state.documents = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchJoDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchJoDocumentById ─────────────────────────────────────────────
      .addCase(fetchJoDocumentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJoDocumentById.fulfilled, (state, action: PayloadAction<JoDocumentWithResponses>) => {
        state.loading = false;
        state.currentDocument = action.payload;
      })
      .addCase(fetchJoDocumentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchJoDocumentFlowHistory ──────────────────────────────────────
      .addCase(fetchJoDocumentFlowHistory.pending, (state) => {
        state.actionInProgress.fetchingFlow = true;
        state.error = null;
      })
      .addCase(fetchJoDocumentFlowHistory.fulfilled, (state, action: PayloadAction<JoDocumentFlowEntry[]>) => {
        state.actionInProgress.fetchingFlow = false;
        state.flowHistory = action.payload;
      })
      .addCase(fetchJoDocumentFlowHistory.rejected, (state, action) => {
        state.actionInProgress.fetchingFlow = false;
        state.error = action.payload as string;
      })

      // ── createJoDocument ────────────────────────────────────────────────
      .addCase(createJoDocument.pending, (state) => {
        state.actionInProgress.creating = true;
        state.error = null;
      })
      .addCase(createJoDocument.fulfilled, (state, action: PayloadAction<JoDocument>) => {
        state.actionInProgress.creating = false;
        state.documents = [action.payload, ...state.documents];
      })
      .addCase(createJoDocument.rejected, (state, action) => {
        state.actionInProgress.creating = false;
        state.error = action.payload as string;
      })

      // ── updateJoDocumentDraft ───────────────────────────────────────────
      .addCase(updateJoDocumentDraft.pending, (state, action) => {
        state.actionInProgress.updatingDraft = action.meta.arg.id;
        state.error = null;
      })
      .addCase(updateJoDocumentDraft.fulfilled, (state, action: PayloadAction<JoDocument>) => {
        state.actionInProgress.updatingDraft = undefined;
        const index = state.documents.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) state.documents[index] = action.payload;
        if (state.currentDocument?.id === action.payload.id) {
          state.currentDocument = { ...state.currentDocument, ...action.payload };
        }
      })
      .addCase(updateJoDocumentDraft.rejected, (state, action) => {
        state.actionInProgress.updatingDraft = undefined;
        state.error = action.payload as string;
      })

      // ── replaceJoDocumentFile ───────────────────────────────────────────
      .addCase(replaceJoDocumentFile.pending, (state, action) => {
        state.actionInProgress.replacingFile = action.meta.arg.id;
        state.error = null;
      })
      .addCase(replaceJoDocumentFile.fulfilled, (state, action: PayloadAction<JoDocument>) => {
        state.actionInProgress.replacingFile = undefined;
        const index = state.documents.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) state.documents[index] = action.payload;
        if (state.currentDocument?.id === action.payload.id) {
          state.currentDocument = { ...state.currentDocument, ...action.payload };
        }
      })
      .addCase(replaceJoDocumentFile.rejected, (state, action) => {
        state.actionInProgress.replacingFile = undefined;
        state.error = action.payload as string;
      })

      // ── sendJoDocumentToSuperAdmin ──────────────────────────────────────
      .addCase(sendJoDocumentToSuperAdmin.pending, (state, action) => {
        state.actionInProgress.sending = action.meta.arg.id;
        state.error = null;
      })
      .addCase(sendJoDocumentToSuperAdmin.fulfilled, (state, action: PayloadAction<JoDocument>) => {
        state.actionInProgress.sending = undefined;
        const index = state.documents.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) state.documents[index] = action.payload;
        if (state.currentDocument?.id === action.payload.id) {
          state.currentDocument = { ...state.currentDocument, ...action.payload };
        }
      })
      .addCase(sendJoDocumentToSuperAdmin.rejected, (state, action) => {
        state.actionInProgress.sending = undefined;
        state.error = action.payload as string;
      })

      // ── respondToJoDocument ─────────────────────────────────────────────
      .addCase(respondToJoDocument.pending, (state, action) => {
        state.actionInProgress.responding = action.meta.arg.id;
        state.error = null;
      })
      .addCase(respondToJoDocument.fulfilled, (state, action) => {
        state.actionInProgress.responding = undefined;
        const { documentId, response } = action.payload;
        if (state.currentDocument?.id === documentId) {
          state.currentDocument.responses = [...state.currentDocument.responses, response];
          state.currentDocument.response_count = (state.currentDocument.response_count || 0) + 1;
        }
        const docIndex = state.documents.findIndex((d) => d.id === documentId);
        if (docIndex !== -1) {
          state.documents[docIndex].response_count = (state.documents[docIndex].response_count || 0) + 1;
        }
      })
      .addCase(respondToJoDocument.rejected, (state, action) => {
        state.actionInProgress.responding = undefined;
        state.error = action.payload as string;
      })

      // ── approveJoDocument ───────────────────────────────────────────────
      .addCase(approveJoDocument.pending, (state, action) => {
        state.actionInProgress.approving = action.meta.arg.id;
        state.error = null;
      })
      .addCase(approveJoDocument.fulfilled, (state, action: PayloadAction<JoDocument>) => {
        state.actionInProgress.approving = undefined;
        const index = state.documents.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) state.documents[index] = action.payload;
        if (state.currentDocument?.id === action.payload.id) {
          state.currentDocument = { ...state.currentDocument, ...action.payload };
        }
      })
      .addCase(approveJoDocument.rejected, (state, action) => {
        state.actionInProgress.approving = undefined;
        state.error = action.payload as string;
      })

      // ── rejectJoDocument ────────────────────────────────────────────────
      .addCase(rejectJoDocument.pending, (state, action) => {
        state.actionInProgress.rejecting = action.meta.arg.id;
        state.error = null;
      })
      .addCase(rejectJoDocument.fulfilled, (state, action: PayloadAction<JoDocument>) => {
        state.actionInProgress.rejecting = undefined;
        const index = state.documents.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) state.documents[index] = action.payload;
        if (state.currentDocument?.id === action.payload.id) {
          state.currentDocument = { ...state.currentDocument, ...action.payload };
        }
      })
      .addCase(rejectJoDocument.rejected, (state, action) => {
        state.actionInProgress.rejecting = undefined;
        state.error = action.payload as string;
      })

      // ── resubmitJoDocument ──────────────────────────────────────────────
      .addCase(resubmitJoDocument.pending, (state, action) => {
        state.actionInProgress.resubmitting = action.meta.arg.id;
        state.error = null;
      })
      .addCase(resubmitJoDocument.fulfilled, (state, action: PayloadAction<JoDocument>) => {
        state.actionInProgress.resubmitting = undefined;
        const index = state.documents.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) state.documents[index] = action.payload;
        if (state.currentDocument?.id === action.payload.id) {
          state.currentDocument = { ...state.currentDocument, ...action.payload };
        }
      })
      .addCase(resubmitJoDocument.rejected, (state, action) => {
        state.actionInProgress.resubmitting = undefined;
        state.error = action.payload as string;
      })

      // ── deleteJoDocumentDraft ───────────────────────────────────────────
      .addCase(deleteJoDocumentDraft.pending, (state, action) => {
        state.actionInProgress.deleting = action.meta.arg;
      })
      .addCase(deleteJoDocumentDraft.fulfilled, (state, action: PayloadAction<string>) => {
        state.actionInProgress.deleting = undefined;
        state.documents = state.documents.filter((d) => d.id !== action.payload);
        if (state.currentDocument?.id === action.payload) {
          state.currentDocument = null;
        }
      })
      .addCase(deleteJoDocumentDraft.rejected, (state, action) => {
        state.actionInProgress.deleting = undefined;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearCurrentJoDocument,
  clearJoError,
  clearJoFlowHistory,
  resetJoState,
} = joSlice.actions;

// ── Selectors ────────────────────────────────────────────────────────────

export const selectJoDocuments = (state: { jo: JoState }) => state.jo.documents;

export const selectCurrentJoDocument = (state: { jo: JoState }) => state.jo.currentDocument;

export const selectJoFlowHistory = (state: { jo: JoState }) => state.jo.flowHistory;

export const selectJoPagination = (state: { jo: JoState }) => state.jo.pagination;

export const selectJoLoading = (state: { jo: JoState }) => state.jo.loading;

export const selectJoError = (state: { jo: JoState }) => state.jo.error;

export const selectJoActionInProgress = (state: { jo: JoState }) => state.jo.actionInProgress;

export const selectIsCreatingJoDocument = (state: { jo: JoState }) =>
  state.jo.actionInProgress.creating || false;

export const selectIsUpdatingJoDraft = (state: { jo: JoState }, id: string) =>
  state.jo.actionInProgress.updatingDraft === id;

export const selectIsReplacingJoFile = (state: { jo: JoState }, id: string) =>
  state.jo.actionInProgress.replacingFile === id;

export const selectIsSendingJoDocument = (state: { jo: JoState }, id: string) =>
  state.jo.actionInProgress.sending === id;

export const selectIsRespondingToJoDocument = (state: { jo: JoState }, id: string) =>
  state.jo.actionInProgress.responding === id;

export const selectIsApprovingJoDocument = (state: { jo: JoState }, id: string) =>
  state.jo.actionInProgress.approving === id;

export const selectIsRejectingJoDocument = (state: { jo: JoState }, id: string) =>
  state.jo.actionInProgress.rejecting === id;

export const selectIsResubmittingJoDocument = (state: { jo: JoState }, id: string) =>
  state.jo.actionInProgress.resubmitting === id;

export const selectIsDeletingJoDraft = (state: { jo: JoState }, id: string) =>
  state.jo.actionInProgress.deleting === id;

export type { JoState };

export default joSlice.reducer;