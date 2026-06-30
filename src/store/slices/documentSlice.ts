// src/features/documents/documentSlice.ts
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
  DocumentFilters,
  CreateComposedDocumentInput,
  CreateUploadDocumentInput,
  UpdateDocumentInput,
  MarkDocumentInput,
  CreateAnnotationInput,
  FinalizeDraftInput,
  ReturnDocumentInput,
} from "../../types/documents.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentState {
  documents: Document[];
  currentDocument: DocumentWithAnnotations | null;
  myMarked: Document[];
  markHistory: DocumentMark[];
  flowHistory: DocumentFlowEntry[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  // For optimistic updates / action status
  actionInProgress: {
    signing?: string;
    sending?: string;
    marking?: string;
    acknowledging?: string;
    completing?: string;
    deleting?: string;
    finalizingDraft?: string;
    returning?: string;
  };
}

const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  myMarked: [],
  markHistory: [],
  flowHistory: [],
  loading: false,
  error: null,
  pagination: null,
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

// ── Create composed (memo/letter) ───────────────────────────────────────────

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

// ── Sign with OTP — update existing signDocument thunk ───────────────────────
export const signDocument = createAsyncThunk(
  'documents/signDocument',
  async ({ id, otp }: { id: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post<{
        success: boolean;
        data: Document;
      }>(`/documents/${id}/sign`, { otp });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
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
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ── fetchDocuments ──────────────────────────────────────────────────────
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDocuments.fulfilled,
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
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
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

      // ── createUploadDocument ──────────────────────────────────────────────
      .addCase(createUploadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        createUploadDocument.fulfilled,
        (state, action: PayloadAction<Document>) => {
          state.loading = false;
          state.documents = [action.payload, ...state.documents];
        },
      )
      .addCase(createUploadDocument.rejected, (state, action) => {
        state.loading = false;
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

      // ── signDocument ────────────────────────────────────────────────────────
      .addCase(signDocument.pending, (state, action) => {
        state.actionInProgress.signing = action.meta.arg.id;
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
              ...action.payload,
            };
          }
        },
      )
      .addCase(signDocument.rejected, (state) => {
        state.actionInProgress.signing = undefined;
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
      });
  },
});

export const {
  clearCurrentDocument,
  clearError,
  clearMyMarked,
  clearFlowHistory,
  resetState,
} = documentSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────
// Typed against the local slice shape so this file has no dependency on the
// store's RootState (avoids circular imports). Adjust the key ("documents")
// if you mount this reducer under a different slice name in the root reducer.

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

export const selectLoading = (state: { documents: DocumentState }) =>
  state.documents.loading;

export const selectError = (state: { documents: DocumentState }) =>
  state.documents.error;

export const selectPagination = (state: { documents: DocumentState }) =>
  state.documents.pagination;

export const selectActionInProgress = (state: { documents: DocumentState }) =>
  state.documents.actionInProgress;

export type { DocumentState };

export default documentSlice.reducer;