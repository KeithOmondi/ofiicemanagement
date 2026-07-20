// src/store/slices/documentSlice.ts

/*
 * ✅ This slice is fully compatible with the new DocumentStatus values:
 * 'dept_assigned' and 'user_assigned'. The status is a string field
 * passed from the backend; the slice doesn't need any changes because
 * the type is imported from documents.types.ts.
 */

import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axiosClient from "../../api/api";
import type { AxiosError } from "axios";
import type {
  Document,
  DocumentWithAnnotations,
  DocumentPaginationResponse,
  DocumentMark,
  DocumentAnnotation,
  DocumentFlowEntry,
  DocumentResponse,
  DocumentFilters,
  CreateComposedDocumentInput,
  CreateUploadDocumentInput,
  UpdateDocumentInput,
  MarkDocumentInput,
  CreateAnnotationInput,
  FinalizeDraftInput,
  ReturnDocumentInput,
  RespondToDocumentInput,
  ComposeMemoInput,
  ComposeLetterInput,
  SendToUserInput,
} from "../../types/documents.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentState {
  documents: Document[];
  currentDocument: DocumentWithAnnotations | null;
  myMarked: Document[];
  markHistory: DocumentMark[];
  flowHistory: DocumentFlowEntry[];
  responses: DocumentResponse[];
  lastFetchParams: DocumentFilters | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  latestDocumentsRequestId: string | null;
  actionInProgress: {
    signing?: string;
    releasing?: string;
    sending?: string;
    marking?: string;
    acknowledging?: string;
    completing?: string;
    deleting?: string;
    finalizingDraft?: string;
    returning?: string;
    responding?: string;
    creatingMemo?: boolean;
    creatingLetter?: boolean;
    sendingToUser?: string;
    uploading?: boolean;
    updatingMark?: string;
    redirectingToFolder?: string;
    removingFromFolder?: string;
    regeneratingPdf?: string;
  };
}

const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  myMarked: [],
  markHistory: [],
  flowHistory: [],
  responses: [],
  loading: false,
  error: null,
  pagination: null,
  latestDocumentsRequestId: null,
  lastFetchParams: null,
  actionInProgress: {},
};

// ─── Utility ──────────────────────────────────────────────────────────────────

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

// ─── Thunks ───────────────────────────────────────────────────────────────────

// ── Fetch documents with filters (paginated) ──────────────────────────────

export const fetchDocuments = createAsyncThunk(
  "documents/fetchDocuments",
  async (filters: DocumentFilters, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: DocumentPaginationResponse;
      }>("/documents", { params: filters });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Fetch single document with annotations & mark history ─────────────────

export const fetchDocumentById = createAsyncThunk(
  "documents/fetchDocumentById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: DocumentWithAnnotations;
      }>(`/documents/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Fetch documents marked to me ────────────────────────────────────────────

export const fetchMyMarked = createAsyncThunk(
  "documents/fetchMyMarked",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: Document[];
      }>("/documents/my-marked");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Fetch received documents ────────────────────────────────────────────────

export const fetchReceivedDocuments = createAsyncThunk(
  "documents/fetchReceivedDocuments",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: Document[];
      }>("/documents/received");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Fetch mark history for a document ─────────────────────────────────────

export const fetchMarkHistory = createAsyncThunk(
  "documents/fetchMarkHistory",
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: DocumentMark[];
      }>(`/documents/${documentId}/mark-history`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Fetch flow history for a document ──────────────────────────────────────

export const fetchFlowHistory = createAsyncThunk(
  "documents/fetchFlowHistory",
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: DocumentFlowEntry[];
      }>(`/documents/${documentId}/flow`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Fetch response thread for a document ────────────────────────────────────

export const fetchResponses = createAsyncThunk(
  "documents/fetchResponses",
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: DocumentResponse[];
      }>(`/documents/${documentId}/responses`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Create composed (judgments, rulings, orders) ───────────────────────────

export const createComposedDocument = createAsyncThunk(
  "documents/createComposed",
  async (input: CreateComposedDocumentInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>("/documents/compose", input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Create Memo (generates PDF from HTML template) ─────────────────────────

export const createMemo = createAsyncThunk(
  "documents/createMemo",
  async (data: ComposeMemoInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>("/documents/compose-memo", data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Create Letter (generates PDF from HTML template) ────────────────────────

export const createLetter = createAsyncThunk(
  "documents/createLetter",
  async (data: ComposeLetterInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>("/documents/compose-letter", data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Send document to user ───────────────────────────────────────────────────

export const sendDocumentToUser = createAsyncThunk(
  "documents/sendDocumentToUser",
  async (
    { id, input }: { id: string; input: SendToUserInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/send-to-user`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Create upload (with file) ──────────────────────────────────────────────

export const createUploadDocument = createAsyncThunk(
  "documents/createUpload",
  async (
    { input, file }: { input: CreateUploadDocumentInput; file: File },
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
        data: Document;
      }>("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Update document ─────────────────────────────────────────────────────────

export const updateDocument = createAsyncThunk(
  "documents/updateDocument",
  async (
    { id, input }: { id: string; input: UpdateDocumentInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.put<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Soft delete ─────────────────────────────────────────────────────────────

export const deleteDocument = createAsyncThunk(
  "documents/deleteDocument",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/documents/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Request OTP ───────────────────────────────────────────────────────────────

export const requestSignOtp = createAsyncThunk(
  'documents/requestSignOtp',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.post(`/documents/${id}/request-sign-otp`);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Sign with OTP (including optional custom position) ──────────────────────

export const signDocument = createAsyncThunk(
  'documents/signDocument',
  async ({ 
    id, 
    otp,
    position_x,
    position_y,
    position_width,
    position_height,
  }: { 
    id: string; 
    otp: string;
    position_x?: number;
    position_y?: number;
    position_width?: number;
    position_height?: number;
  }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/sign`, { 
        otp,
        position_x,
        position_y,
        position_width,
        position_height,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Release Document to Admin Side ──────────────────────────────────────────

export const releaseDocument = createAsyncThunk(
  'documents/releaseDocument',
  async ({ id, note, recipient_id }: { id: string; note?: string; recipient_id?: string }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/release`, { note, recipient_id });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);


// ── Send document ───────────────────────────────────────────────────────────

export const sendDocument = createAsyncThunk(
  "documents/sendDocument",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/send`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Finalize draft (assign to user or send to super admin) ──────────────────

export const finalizeDraft = createAsyncThunk(
  "documents/finalizeDraft",
  async (
    { id, input }: { id: string; input: FinalizeDraftInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/finalize-draft`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Return document for action ──────────────────────────────────────────────

export const returnDocument = createAsyncThunk(
  "documents/returnDocument",
  async (
    { id, input }: { id: string; input: ReturnDocumentInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/return`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Respond to a document (threaded reply, optional file) ───────────────────

export const respondToDocument = createAsyncThunk(
  "documents/respondToDocument",
  async (
    { id, input, file }: { id: string; input: RespondToDocumentInput; file?: File },
    { rejectWithValue },
  ) => {
    const formData = new FormData();
    formData.append("note", input.note);
    if (file) formData.append("file", file);

    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: DocumentResponse;
      }>(`/documents/${id}/respond`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { documentId: id, response: response.data.data };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Mark to Department ──────────────────────────────────────────────────────

export const markDocument = createAsyncThunk(
  "documents/markDocument",
  async (
    { id, input }: { id: string; input: MarkDocumentInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/mark`, input);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Acknowledge mark ──────────────────────────────────────────────────────

export const acknowledgeMark = createAsyncThunk(
  "documents/acknowledgeMark",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/acknowledge`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Complete mark ─────────────────────────────────────────────────────────

export const completeMark = createAsyncThunk(
  "documents/completeMark",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/complete`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Add annotation ──────────────────────────────────────────────────────────

export const addAnnotation = createAsyncThunk(
  "documents/addAnnotation",
  async (
    { id, input }: { id: string; input: CreateAnnotationInput },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: DocumentAnnotation;
      }>(`/documents/${id}/annotations`, input);
      return { documentId: id, annotation: response.data.data };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Delete annotation ────────────────────────────────────────────────────────

export const deleteAnnotation = createAsyncThunk(
  "documents/deleteAnnotation",
  async (
    { documentId, annotationId }: { documentId: string; annotationId: string },
    { rejectWithValue },
  ) => {
    try {
      await axiosClient.delete(
        `/documents/${documentId}/annotations/${annotationId}`,
      );
      return { documentId, annotationId };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ── Update Mark (instructions & bring‑up date) ──────────────────────────────

export const updateMark = createAsyncThunk(
  "documents/updateMark",
  async (
    { markId, instructions, bring_up_date }: 
    { markId: string; instructions: string; bring_up_date: string | null },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.patch<{
        success: boolean;
        data: DocumentMark;
      }>(`/documents/marks/${markId}`, { instructions, bring_up_date });
      return { markId, updatedMark: response.data.data };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
//  Folder Operations
// ════════════════════════════════════════════════════════════════════════════

// ── Redirect Document to Folder ────────────────────────────────────────────

export const redirectDocumentToFolder = createAsyncThunk(
  "documents/redirectDocumentToFolder",
  async (
    { id, folder_id, note }: { id: string; folder_id: string; note?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/redirect-to-folder`, { folder_id, note });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Remove Document from Folder ────────────────────────────────────────────

export const removeDocumentFromFolder = createAsyncThunk(
  "documents/removeDocumentFromFolder",
  async (
    { id, note }: { id: string; note?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.delete<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/remove-from-folder`, { data: { note } });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Fetch Documents by Folder ──────────────────────────────────────────────

export const fetchDocumentsByFolder = createAsyncThunk(
  "documents/fetchDocumentsByFolder",
  async (
    { folderId, page, limit, search, type, status }: 
    { folderId: string; page?: number; limit?: number; search?: string; type?: string; status?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.get<{
        success: boolean;
        data: DocumentPaginationResponse;
      }>(`/documents/folder/${folderId}`, {
        params: { page, limit, search, type, status }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ── Regenerate PDF from current edited fields/body ──────────────────────────

export const regeneratePdf = createAsyncThunk(
  "documents/regeneratePdf",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/regenerate-pdf`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const documentSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    clearCurrentDocument: (state) => {
      state.currentDocument = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearMyMarked: (state) => {
      state.myMarked = [];
    },
    clearFlowHistory: (state) => {
      state.flowHistory = [];
    },
    clearResponses: (state) => {
      state.responses = [];
    },
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ── fetchDocuments ──────────────────────────────────────────────────────
      .addCase(fetchDocuments.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.latestDocumentsRequestId = action.meta.requestId;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        if (action.meta.requestId !== state.latestDocumentsRequestId) return;
        state.documents = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        if (action.meta.requestId !== state.latestDocumentsRequestId) return;
        state.error = action.payload as string;
      })

      // ── regeneratePdf ─────────────────────────────────────────────────────────
      .addCase(regeneratePdf.pending, (state, action) => {
        state.actionInProgress.regeneratingPdf = action.meta.arg;
        state.error = null;
      })
      .addCase(
        regeneratePdf.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.regeneratingPdf = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
        },
      )
      .addCase(regeneratePdf.rejected, (state, action) => {
        state.actionInProgress.regeneratingPdf = undefined;
        state.error = action.payload as string;
      })

      // ── fetchDocumentById ──────────────────────────────────────────────────
      .addCase(fetchDocumentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDocumentById.fulfilled,
        (state, action: PayloadAction<DocumentWithAnnotations>) => {
          state.loading = false;
          state.currentDocument = action.payload;
          state.responses = action.payload.responses ?? [];
        },
      )
      .addCase(fetchDocumentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchMyMarked ──────────────────────────────────────────────────────
      .addCase(fetchMyMarked.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchMyMarked.fulfilled,
        (state, action: PayloadAction<Document[]>) => {
          state.loading = false;
          state.myMarked = action.payload;
        },
      )
      .addCase(fetchMyMarked.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchReceivedDocuments ─────────────────────────────────────────────
      .addCase(fetchReceivedDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchReceivedDocuments.fulfilled,
        (state, action: PayloadAction<Document[]>) => {
          state.loading = false;
          const existingIds = new Set(state.documents.map(d => d.id));
          const newDocs = action.payload.filter(d => !existingIds.has(d.id));
          state.documents = [...newDocs, ...state.documents];
        },
      )
      .addCase(fetchReceivedDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchMarkHistory ──────────────────────────────────────────────────
      .addCase(fetchMarkHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchMarkHistory.fulfilled,
        (state, action: PayloadAction<DocumentMark[]>) => {
          state.loading = false;
          state.markHistory = action.payload;
        },
      )
      .addCase(fetchMarkHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchFlowHistory ────────────────────────────────────────────────────
      .addCase(fetchFlowHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchFlowHistory.fulfilled,
        (state, action: PayloadAction<DocumentFlowEntry[]>) => {
          state.loading = false;
          state.flowHistory = action.payload;
        },
      )
      .addCase(fetchFlowHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── fetchResponses ──────────────────────────────────────────────────────
      .addCase(fetchResponses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchResponses.fulfilled,
        (state, action: PayloadAction<DocumentResponse[]>) => {
          state.loading = false;
          state.responses = action.payload;
        },
      )
      .addCase(fetchResponses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── createComposedDocument ─────────────────────────────────────────────
      .addCase(createComposedDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        createComposedDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.loading = false;
          state.documents = [action.payload, ...state.documents];
        },
      )
      .addCase(createComposedDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── createMemo ─────────────────────────────────────────────────────────
      .addCase(createMemo.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.actionInProgress.creatingMemo = true;
      })
      .addCase(
        createMemo.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.loading = false;
          state.actionInProgress.creatingMemo = false;
          state.documents = [action.payload, ...state.documents];
        },
      )
      .addCase(createMemo.rejected, (state, action) => {
        state.loading = false;
        state.actionInProgress.creatingMemo = false;
        state.error = action.payload as string;
      })

      // ── createLetter ───────────────────────────────────────────────────────
      .addCase(createLetter.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.actionInProgress.creatingLetter = true;
      })
      .addCase(
        createLetter.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.loading = false;
          state.actionInProgress.creatingLetter = false;
          state.documents = [action.payload, ...state.documents];
        },
      )
      .addCase(createLetter.rejected, (state, action) => {
        state.loading = false;
        state.actionInProgress.creatingLetter = false;
        state.error = action.payload as string;
      })

      // ── sendDocumentToUser ─────────────────────────────────────────────────
      .addCase(sendDocumentToUser.pending, (state, action) => {
        state.actionInProgress.sendingToUser = action.meta.arg.id;
        state.error = null;
      })
      .addCase(
        sendDocumentToUser.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.sendingToUser = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
        },
      )
      .addCase(sendDocumentToUser.rejected, (state, action) => {
        state.actionInProgress.sendingToUser = undefined;
        state.error = action.payload as string;
      })

      // ── createUploadDocument ──────────────────────────────────────────────
      .addCase(createUploadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.actionInProgress.uploading = true;
      })
      .addCase(
        createUploadDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.loading = false;
          state.actionInProgress.uploading = false;
          state.documents = [action.payload, ...state.documents];
        },
      )
      .addCase(createUploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.actionInProgress.uploading = false;
        state.error = action.payload as string;
      })

      // ── updateDocument ──────────────────────────────────────────────────────
      .addCase(updateDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.loading = false;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
        },
      )
      .addCase(updateDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── deleteDocument ──────────────────────────────────────────────────────
      .addCase(deleteDocument.pending, (state, action) => {
        state.actionInProgress.deleting = action.meta.arg;
      })
      .addCase(
        deleteDocument.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.documents = state.documents.filter(
            (d) => d.id !== action.payload,
          );
          state.actionInProgress.deleting = undefined;
          if (state.currentDocument?.id === action.payload) {
            state.currentDocument = null;
          }
        },
      )
      .addCase(deleteDocument.rejected, (state) => {
        state.actionInProgress.deleting = undefined;
      })

      // ── requestSignOtp ─────────────────────────────────────────────────────
      .addCase(requestSignOtp.pending, (state) => {
        state.error = null;
      })
      .addCase(requestSignOtp.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // ── signDocument ────────────────────────────────────────────────────────
      .addCase(signDocument.pending, (state, action) => {
        state.actionInProgress.signing = action.meta.arg.id;
        state.error = null;
      })
      .addCase(
        signDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.signing = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              annotations: state.currentDocument.annotations,
              mark_history: state.currentDocument.mark_history,
              responses: state.currentDocument.responses,
              ...action.payload,
            };
          }
        },
      )
      .addCase(signDocument.rejected, (state, action) => {
        state.actionInProgress.signing = undefined;
        state.error = action.payload as string;
      })

      // ── releaseDocument ────────────────────────────────────────────────────
      .addCase(releaseDocument.pending, (state, action) => {
        state.actionInProgress.releasing = action.meta.arg.id;
        state.error = null;
      })
      .addCase(
        releaseDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.releasing = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              annotations: state.currentDocument.annotations,
              mark_history: state.currentDocument.mark_history,
              responses: state.currentDocument.responses,
              ...action.payload,
            };
          }
        },
      )
      .addCase(releaseDocument.rejected, (state, action) => {
        state.actionInProgress.releasing = undefined;
        state.error = action.payload as string;
      })

      // ── sendDocument ────────────────────────────────────────────────────────
      .addCase(sendDocument.pending, (state, action) => {
        state.actionInProgress.sending = action.meta.arg;
      })
      .addCase(
        sendDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.sending = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
        },
      )
      .addCase(sendDocument.rejected, (state) => {
        state.actionInProgress.sending = undefined;
      })

      // ── finalizeDraft ──────────────────────────────────────────────────────
      .addCase(finalizeDraft.pending, (state, action) => {
        state.actionInProgress.finalizingDraft = action.meta.arg.id;
      })
      .addCase(
        finalizeDraft.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.finalizingDraft = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
        },
      )
      .addCase(finalizeDraft.rejected, (state) => {
        state.actionInProgress.finalizingDraft = undefined;
      })

      // ── returnDocument ──────────────────────────────────────────────────────
      .addCase(returnDocument.pending, (state, action) => {
        state.actionInProgress.returning = action.meta.arg.id;
      })
      .addCase(
        returnDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.returning = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
        },
      )
      .addCase(returnDocument.rejected, (state) => {
        state.actionInProgress.returning = undefined;
      })

      // ── respondToDocument ──────────────────────────────────────────────────
      .addCase(respondToDocument.pending, (state, action) => {
        state.actionInProgress.responding = action.meta.arg.id;
      })
      .addCase(respondToDocument.fulfilled, (state, action) => {
        state.actionInProgress.responding = undefined;
        const { documentId, response } = action.payload;

        state.responses.push(response);

        if (state.currentDocument?.id === documentId) {
          state.currentDocument.responses = [
            ...state.currentDocument.responses,
            response,
          ];
          state.currentDocument.response_count = (state.currentDocument.response_count || 0) + 1;
          state.currentDocument.status = "pending_review";
        }

        const docIndex = state.documents.findIndex((d) => d.id === documentId);
        if (docIndex !== -1) {
          state.documents[docIndex].response_count = (state.documents[docIndex].response_count || 0) + 1;
          state.documents[docIndex].status = "pending_review";
        }
      })
      .addCase(respondToDocument.rejected, (state, action) => {
        state.actionInProgress.responding = undefined;
        state.error = action.payload as string;
      })

      // ── markDocument ──────────────────────────────────────────────────────
      .addCase(markDocument.pending, (state, action) => {
        state.actionInProgress.marking = action.meta.arg.id;
      })
      .addCase(
        markDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.marking = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
        },
      )
      .addCase(markDocument.rejected, (state) => {
        state.actionInProgress.marking = undefined;
      })

      // ── acknowledgeMark ──────────────────────────────────────────────────
      .addCase(acknowledgeMark.pending, (state, action) => {
        state.actionInProgress.acknowledging = action.meta.arg;
      })
      .addCase(
        acknowledgeMark.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.acknowledging = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
          const myIndex = state.myMarked.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (myIndex !== -1) state.myMarked[myIndex] = action.payload;
        },
      )
      .addCase(acknowledgeMark.rejected, (state) => {
        state.actionInProgress.acknowledging = undefined;
      })

      // ── completeMark ──────────────────────────────────────────────────────
      .addCase(completeMark.pending, (state, action) => {
        state.actionInProgress.completing = action.meta.arg;
      })
      .addCase(
        completeMark.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.completing = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
          const myIndex = state.myMarked.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (myIndex !== -1) state.myMarked[myIndex] = action.payload;
        },
      )
      .addCase(completeMark.rejected, (state) => {
        state.actionInProgress.completing = undefined;
      })

      // ── addAnnotation ──────────────────────────────────────────────────────
      .addCase(addAnnotation.fulfilled, (state, action) => {
        const { documentId, annotation } = action.payload;
        if (state.currentDocument?.id === documentId) {
          state.currentDocument.annotations.push(annotation);
        }
      })

      // ── deleteAnnotation ──────────────────────────────────────────────────
      .addCase(deleteAnnotation.fulfilled, (state, action) => {
        const { documentId, annotationId } = action.payload;
        if (state.currentDocument?.id === documentId) {
          state.currentDocument.annotations =
            state.currentDocument.annotations.filter(
              (a) => a.id !== annotationId,
            );
        }
      })

      // ── updateMark ────────────────────────────────────────────────────────
      .addCase(updateMark.pending, (state, action) => {
        state.actionInProgress.updatingMark = action.meta.arg.markId;
        state.error = null;
      })
      .addCase(updateMark.fulfilled, (state, action) => {
        state.actionInProgress.updatingMark = undefined;
        const { markId, updatedMark } = action.payload;

        state.documents = state.documents.map(doc => {
          if (doc.active_mark?.id === markId) {
            return {
              ...doc,
              active_mark: {
                ...doc.active_mark,
                instructions: updatedMark.instructions,
                bring_up_date: updatedMark.bring_up_date,
              },
            };
          }
          return doc;
        });

        if (state.currentDocument?.active_mark?.id === markId) {
          state.currentDocument = {
            ...state.currentDocument,
            active_mark: {
              ...state.currentDocument.active_mark,
              instructions: updatedMark.instructions,
              bring_up_date: updatedMark.bring_up_date,
            },
          };
        }

        state.myMarked = state.myMarked.map(doc => {
          if (doc.active_mark?.id === markId) {
            return {
              ...doc,
              active_mark: {
                ...doc.active_mark,
                instructions: updatedMark.instructions,
                bring_up_date: updatedMark.bring_up_date,
              },
            };
          }
          return doc;
        });
      })
      .addCase(updateMark.rejected, (state, action) => {
        state.actionInProgress.updatingMark = undefined;
        state.error = action.payload as string;
      })

      // ── redirectDocumentToFolder ──────────────────────────────────────────
      .addCase(redirectDocumentToFolder.pending, (state, action) => {
        state.actionInProgress.redirectingToFolder = action.meta.arg.id;
        state.error = null;
      })
      .addCase(
        redirectDocumentToFolder.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.redirectingToFolder = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
          const myIndex = state.myMarked.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (myIndex !== -1) state.myMarked[myIndex] = action.payload;
        },
      )
      .addCase(redirectDocumentToFolder.rejected, (state, action) => {
        state.actionInProgress.redirectingToFolder = undefined;
        state.error = action.payload as string;
      })

      // ── removeDocumentFromFolder ──────────────────────────────────────────
      .addCase(removeDocumentFromFolder.pending, (state, action) => {
        state.actionInProgress.removingFromFolder = action.meta.arg.id;
        state.error = null;
      })
      .addCase(
        removeDocumentFromFolder.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.actionInProgress.removingFromFolder = undefined;
          const index = state.documents.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (index !== -1) state.documents[index] = action.payload;
          if (state.currentDocument?.id === action.payload.id) {
            state.currentDocument = {
              ...state.currentDocument,
              ...action.payload,
            };
          }
          const myIndex = state.myMarked.findIndex(
            (d) => d.id === action.payload.id,
          );
          if (myIndex !== -1) state.myMarked[myIndex] = action.payload;
        },
      )
      .addCase(removeDocumentFromFolder.rejected, (state, action) => {
        state.actionInProgress.removingFromFolder = undefined;
        state.error = action.payload as string;
      })

      // ── fetchDocumentsByFolder ─────────────────────────────────────────────
      .addCase(fetchDocumentsByFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDocumentsByFolder.fulfilled,
        (state, action: PayloadAction<DocumentPaginationResponse>) => {
          state.loading = false;
          state.documents = action.payload.data;
          state.pagination = {
            total: action.payload.total,
            page: action.payload.page,
            limit: action.payload.limit,
            totalPages: action.payload.totalPages,
          };
        },
      )
      .addCase(fetchDocumentsByFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearCurrentDocument,
  clearError,
  clearMyMarked,
  clearFlowHistory,
  clearResponses,
  resetState,
} = documentSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectDocuments = (state: { documents: DocumentState }) =>
  state.documents.documents;

export const selectCurrentDocument = (state: { documents: DocumentState }) =>
  state.documents.currentDocument;

export const selectMyMarked = (state: { documents: DocumentState }) =>
  state.documents.myMarked;

export const selectMarkHistory = (state: { documents: DocumentState }) =>
  state.documents.markHistory;

export const selectFlowHistory = (state: { documents: DocumentState }) =>
  state.documents.flowHistory;

export const selectResponses = (state: { documents: DocumentState }) =>
  state.documents.responses;

export const selectLoading = (state: { documents: DocumentState }) =>
  state.documents.loading;

export const selectError = (state: { documents: DocumentState }) =>
  state.documents.error;

export const selectPagination = (state: { documents: DocumentState }) =>
  state.documents.pagination;

export const selectActionInProgress = (state: { documents: DocumentState }) =>
  state.documents.actionInProgress;

export const selectCurrentDocumentResponses = (state: { documents: DocumentState }) =>
  state.documents.currentDocument?.responses ?? [];

export const selectIsResponding = (state: { documents: DocumentState }, documentId: string) =>
  state.documents.actionInProgress.responding === documentId;

export const selectIsCreatingMemo = (state: { documents: DocumentState }) =>
  state.documents.actionInProgress.creatingMemo || false;

export const selectIsCreatingLetter = (state: { documents: DocumentState }) =>
  state.documents.actionInProgress.creatingLetter || false;

export const selectIsSendingToUser = (state: { documents: DocumentState }) =>
  state.documents.actionInProgress.sendingToUser || null;

export const selectIsUploading = (state: { documents: DocumentState }) =>
  state.documents.actionInProgress.uploading || false;

export const selectIsUpdatingMark = (state: { documents: DocumentState }, markId: string) =>
  state.documents.actionInProgress.updatingMark === markId;

export const selectIsRedirectingToFolder = (state: { documents: DocumentState }, documentId: string) =>
  state.documents.actionInProgress.redirectingToFolder === documentId;

export const selectIsRemovingFromFolder = (state: { documents: DocumentState }, documentId: string) =>
  state.documents.actionInProgress.removingFromFolder === documentId;

export const selectIsRegeneratingPdf = (state: { documents: DocumentState }, documentId: string) =>
  state.documents.actionInProgress.regeneratingPdf === documentId;

export const selectIsSigning = (state: { documents: DocumentState }, documentId: string) =>
  state.documents.actionInProgress.signing === documentId;

export const selectIsReleasing = (state: { documents: DocumentState }, documentId: string) =>
  state.documents.actionInProgress.releasing === documentId;

export type { DocumentState };

export default documentSlice.reducer;