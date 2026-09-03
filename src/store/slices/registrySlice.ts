// src/store/slices/registrySlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';
import type {
  RegistryEntry,
  RegistryPaginationResponse,
  StationWithFileCount,
  RouteFileInput,
  ReturnFileInput,
  RegistryFilters,
  RHCFolder,
  FolderDocument,
  FolderHierarchy,
  FolderStatistics,
  FolderCategoryCount,
  BulkAddDocumentsResult,
  CreateFolderInput,
  UpdateFolderInput,
  MoveFolderInput,
  BulkAddDocumentsInput,
  FolderFilters,
  FolderRegistryEntry,
  FolderRegistryPaginationResponse,
  DirectDocumentUploadInput,
  BulkDirectDocumentUploadInput,
  UploadDocumentToFolderInput,
  UpdateDocumentMetadataInput,
  DeleteDocumentInput,
  DirectDocumentUploadResponse,
  DocumentDetailsResponse,
  DocumentSource,
} from '../../types/registry.types';

/* ============================================================
   STATE
============================================================ */

interface RegistryState {
  entries:        RegistryEntry[];
  selectedEntry:  RegistryEntry | null;
  history:        RegistryEntry[];       // route history for one document
  historyDocId:   string | null;         // which document `history` belongs to
  stationCounts:  StationWithFileCount[];
  
  // Folder state
  folders:        RHCFolder[];
  selectedFolder: RHCFolder | null;
  folderHierarchy: FolderHierarchy | null;
  folderDocuments: FolderDocument[];
  folderCategories: FolderCategoryCount[];
  folderStatistics: FolderStatistics | null;
  
  // Folder documents by station
  stationFolderDocuments: FolderRegistryEntry[];
  stationFolderPagination: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
  
  pagination: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
  filters: RegistryFilters;
  folderFilters: FolderFilters;
  
  // Direct upload state
  uploadProgress: Record<string, number>;
  uploadStatus: Record<string, 'idle' | 'uploading' | 'success' | 'error'>;
  uploadErrors: Record<string, string>;
  uploadResults: Record<string, DirectDocumentUploadResponse>;
  
  loading: {
    list:     boolean;
    detail:   boolean;
    history:  boolean;
    counts:   boolean;
    mutating: boolean;
    folders:  boolean;
    folderDetail: boolean;
    folderChildren: boolean;
    folderDocuments: boolean;
    folderCategories: boolean;
    folderStatistics: boolean;
    folderMutating: boolean;
    stationFolderDocuments: boolean;
    uploading: boolean;
    documentDetail: boolean;
  };
  error:   string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: RegistryState = {
  entries:       [],
  selectedEntry: null,
  history:       [],
  historyDocId:  null,
  stationCounts: [],
  
  folders: [],
  selectedFolder: null,
  folderHierarchy: null,
  folderDocuments: [],
  folderCategories: [],
  folderStatistics: null,
  
  stationFolderDocuments: [],
  stationFolderPagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
  
  pagination: {
    total:      0,
    page:       1,
    limit:      100,
    totalPages: 0,
  },
  filters: {
    page:       1,
    limit:      100,
    sort_by:    'routed_at',
    sort_order: 'DESC',
  },
  folderFilters: {
    include_sub_folders: true,
  },
  
  uploadProgress: {},
  uploadStatus: {},
  uploadErrors: {},
  uploadResults: {},
  
  loading: {
    list:     false,
    detail:   false,
    history:  false,
    counts:   false,
    mutating: false,
    folders:  false,
    folderDetail: false,
    folderChildren: false,
    folderDocuments: false,
    folderCategories: false,
    folderStatistics: false,
    folderMutating: false,
    stationFolderDocuments: false,
    uploading: false,
    documentDetail: false,
  },
  error:   null,
  success: false,
};

/* ============================================================
   HELPERS
============================================================ */

const extractErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

/* ============================================================
   REGISTRY ENTRY ASYNC THUNKS
============================================================ */

export const routeFile = createAsyncThunk(
  'registry/routeFile',
  async (input: RouteFileInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/registry/entries', input);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchRegistryEntries = createAsyncThunk(
  'registry/fetchAll',
  async (filters: RegistryFilters, { rejectWithValue }) => {
    try {
      const safeFilters = {
        ...filters,
        limit: Math.min(filters.limit || 100, 100),
      };

      const params = new URLSearchParams();
      Object.entries(safeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const response = await axiosClient.get(`/registry/entries?${params.toString()}`);
      return response.data.data as RegistryPaginationResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchRegistryEntryById = createAsyncThunk(
  'registry/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/entries/${id}`);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchRegistryHistory = createAsyncThunk(
  'registry/fetchHistory',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/document/${documentId}/history`);
      return { documentId, history: response.data.data as RegistryEntry[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchDocumentDetails = createAsyncThunk(
  'registry/fetchDocumentDetails',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/document/${documentId}/details`);
      return response.data.data as DocumentDetailsResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchStationCounts = createAsyncThunk(
  'registry/fetchStationCounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/registry/stations/counts');
      return response.data.data as StationWithFileCount[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const receiveFile = createAsyncThunk(
  'registry/receiveFile',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/registry/entries/${id}/receive`);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const returnFile = createAsyncThunk(
  'registry/returnFile',
  async ({ id, input }: { id: string; input: ReturnFileInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/registry/entries/${id}/return`, input);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// ── Direct Upload Thunks ─────────────────────────────────────────────────────

// Single direct upload with file
export const directUpload = createAsyncThunk(
  'registry/directUpload',
  async (
    { input, file }: { input: DirectDocumentUploadInput; file: File },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const formData = new FormData();
      
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      formData.append('document', file);

      const response = await axiosClient.post('/registry/upload/station', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            dispatch(setUploadProgress({ fileName: file.name, progress }));
          }
        },
      });
      
      return response.data.data as DirectDocumentUploadResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Bulk direct upload
export const bulkDirectUpload = createAsyncThunk(
  'registry/bulkDirectUpload',
  async (
    { input, files }: { input: BulkDirectDocumentUploadInput; files: File[] },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const formData = new FormData();
      
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      files.forEach((file) => {
        formData.append('documents', file);
      });

      let overallProgress = 0;
      const response = await axiosClient.post('/registry/upload/station/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            overallProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Dispatch overall progress for the first file as a proxy
            if (files.length > 0) {
              dispatch(setUploadProgress({ fileName: files[0].name, progress: overallProgress }));
            }
          }
        },
      });
      
      return response.data.data as DirectDocumentUploadResponse[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// Upload document to folder
export const uploadDocumentToFolder = createAsyncThunk(
  'registry/uploadDocumentToFolder',
  async (
    { folderId, input, file }: { folderId: string; input: UploadDocumentToFolderInput; file: File },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const formData = new FormData();
      
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      formData.append('document', file);

      const response = await axiosClient.post(`/registry/upload/folder/${folderId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            dispatch(setUploadProgress({ fileName: file.name, progress }));
          }
        },
      });
      
      return response.data.data as DirectDocumentUploadResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

// ── Document Management Thunks ──────────────────────────────────────────────

export const updateDocumentMetadata = createAsyncThunk(
  'registry/updateDocumentMetadata',
  async (
    { documentId, input }: { documentId: string; input: UpdateDocumentMetadataInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.put(`/registry/documents/${documentId}`, input);
      return response.data.data as RegistryEntry;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'registry/deleteDocument',
  async (
    { documentId, input }: { documentId: string; input?: DeleteDocumentInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosClient.delete(`/registry/documents/${documentId}`, {
        data: input || {},
      });
      return { 
        documentId, 
        result: response.data.data as { deleted: boolean; filePublicIds?: string[] }
      };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchDocumentsBySource = createAsyncThunk(
  'registry/fetchDocumentsBySource',
  async (
    { source, stationId }: { source: DocumentSource; stationId?: string },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (stationId) params.append('stationId', stationId);
      const response = await axiosClient.get(`/registry/source/${source}?${params.toString()}`);
      return { source, entries: response.data.data as RegistryEntry[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   FOLDER ASYNC THUNKS
============================================================ */

export const createFolder = createAsyncThunk(
  'registry/createFolder',
  async (input: CreateFolderInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/registry/folders', input);
      return response.data.data as RHCFolder;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchFolders = createAsyncThunk(
  'registry/fetchFolders',
  async (filters: FolderFilters, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const response = await axiosClient.get(`/registry/folders?${params.toString()}`);
      return response.data.data as RHCFolder[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchRootFolders = createAsyncThunk(
  'registry/fetchRootFolders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/registry/folders/root');
      return response.data.data as RHCFolder[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchActiveFolders = createAsyncThunk(
  'registry/fetchActiveFolders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/registry/folders/active');
      return response.data.data as RHCFolder[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchFolderById = createAsyncThunk(
  'registry/fetchFolderById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/folders/${id}`);
      return response.data.data as RHCFolder;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchFolderChildren = createAsyncThunk(
  'registry/fetchFolderChildren',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/folders/${id}/children`);
      return { id, children: response.data.data as RHCFolder[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchFolderHierarchy = createAsyncThunk(
  'registry/fetchFolderHierarchy',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/folders/${id}/hierarchy`);
      return response.data.data as FolderHierarchy;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchFolderCategories = createAsyncThunk(
  'registry/fetchFolderCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/registry/folders/categories');
      return response.data.data as FolderCategoryCount[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchFolderStatistics = createAsyncThunk(
  'registry/fetchFolderStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/registry/folders/statistics');
      return response.data.data as FolderStatistics;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const searchFolders = createAsyncThunk(
  'registry/searchFolders',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/folders/search?q=${encodeURIComponent(query)}`);
      return response.data.data as RHCFolder[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchFolderDocuments = createAsyncThunk(
  'registry/fetchFolderDocuments',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/registry/folders/${id}/documents`);
      return { id, documents: response.data.data as FolderDocument[] };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchStationFolderDocuments = createAsyncThunk(
  'registry/fetchStationFolderDocuments',
  async (
    { stationId, page = 1, limit = 20, source }: 
    { stationId: string; page?: number; limit?: number; source?: DocumentSource },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', String(page));
      if (limit) params.append('limit', String(limit));
      if (source) params.append('source', source);
      const response = await axiosClient.get(`/registry/folders/station/${stationId}?${params.toString()}`);
      return response.data.data as FolderRegistryPaginationResponse;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateFolder = createAsyncThunk(
  'registry/updateFolder',
  async ({ id, input }: { id: string; input: UpdateFolderInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.patch(`/registry/folders/${id}`, input);
      return response.data.data as RHCFolder;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteFolder = createAsyncThunk(
  'registry/deleteFolder',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/registry/folders/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const moveFolder = createAsyncThunk(
  'registry/moveFolder',
  async ({ id, input }: { id: string; input: MoveFolderInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/registry/folders/${id}/move`, input);
      return response.data.data as RHCFolder;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const addDocumentToFolder = createAsyncThunk(
  'registry/addDocumentToFolder',
  async ({ folderId, documentId }: { folderId: string; documentId: string }, { rejectWithValue }) => {
    try {
      await axiosClient.post(`/registry/folders/${folderId}/documents`, { document_id: documentId });
      return { folderId, documentId };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const removeDocumentFromFolder = createAsyncThunk(
  'registry/removeDocumentFromFolder',
  async ({ folderId, documentId }: { folderId: string; documentId: string }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/registry/folders/${folderId}/documents/${documentId}`);
      return { folderId, documentId };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const bulkAddDocumentsToFolder = createAsyncThunk(
  'registry/bulkAddDocumentsToFolder',
  async ({ folderId, input }: { folderId: string; input: BulkAddDocumentsInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post(`/registry/folders/${folderId}/documents/bulk`, input);
      return { folderId, result: response.data.data as BulkAddDocumentsResult };
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const registrySlice = createSlice({
  name: 'registry',
  initialState,
  reducers: {
    setRegistryFilters(state, action: PayloadAction<Partial<RegistryFilters>>) {
      const newFilters = { ...action.payload };
      if (newFilters.limit && newFilters.limit > 100) {
        newFilters.limit = 100;
      }
      state.filters = { ...state.filters, ...newFilters };
    },
    resetRegistryFilters(state) {
      state.filters = {
        page:       1,
        limit:      100,
        sort_by:    'routed_at',
        sort_order: 'DESC',
      };
    },
    
    setFolderFilters(state, action: PayloadAction<Partial<FolderFilters>>) {
      state.folderFilters = { ...state.folderFilters, ...action.payload };
    },
    resetFolderFilters(state) {
      state.folderFilters = { include_sub_folders: true };
    },
    
    setUploadProgress(state, action: PayloadAction<{ fileName: string; progress: number }>) {
      const { fileName, progress } = action.payload;
      state.uploadProgress[fileName] = progress;
      state.uploadStatus[fileName] = progress < 100 ? 'uploading' : 'success';
    },
    
    setUploadStatus(state, action: PayloadAction<{ fileName: string; status: 'idle' | 'uploading' | 'success' | 'error'; error?: string }>) {
      const { fileName, status, error } = action.payload;
      state.uploadStatus[fileName] = status;
      if (status === 'error' && error) {
        state.uploadErrors[fileName] = error;
      }
      if (status === 'success') {
        state.uploadProgress[fileName] = 100;
        delete state.uploadErrors[fileName];
      }
    },
    
    clearUploadState(state) {
      state.uploadProgress = {};
      state.uploadStatus = {};
      state.uploadErrors = {};
      state.uploadResults = {};
    },
    
    clearSelectedEntry(state) { state.selectedEntry = null; },
    clearSelectedFolder(state) { state.selectedFolder = null; state.folderHierarchy = null; },
    clearHistory(state) { state.history = []; state.historyDocId = null; },
    clearFolderDocuments(state) { state.folderDocuments = []; },
    clearStationFolderDocuments(state) { state.stationFolderDocuments = []; },
    clearError(state) { state.error = null; },
    clearSuccess(state) { state.success = false; },
    resetRegistryState: () => initialState,
  },
  extraReducers: (builder) => {
    /* ══════════════════════════════════════════════════════════════════════════
       REGISTRY ENTRY REDUCERS
       ══════════════════════════════════════════════════════════════════════════ */

    builder
      .addCase(routeFile.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(routeFile.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.mutating = false;
        state.success = true;
        state.entries = [action.payload, ...state.entries];
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(routeFile.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(fetchRegistryEntries.pending, (state) => { state.loading.list = true; state.error = null; })
      .addCase(fetchRegistryEntries.fulfilled, (state, action: PayloadAction<RegistryPaginationResponse>) => {
        state.loading.list = false;
        state.entries = action.payload.data;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchRegistryEntries.rejected, (state, action) => { state.loading.list = false; state.error = action.payload as string; });

    builder
      .addCase(fetchRegistryEntryById.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchRegistryEntryById.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.detail = false;
        state.selectedEntry = action.payload;
      })
      .addCase(fetchRegistryEntryById.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    builder
      .addCase(fetchRegistryHistory.pending, (state) => { state.loading.history = true; state.error = null; })
      .addCase(fetchRegistryHistory.fulfilled, (state, action: PayloadAction<{ documentId: string; history: RegistryEntry[] }>) => {
        state.loading.history = false;
        state.history = action.payload.history;
        state.historyDocId = action.payload.documentId;
      })
      .addCase(fetchRegistryHistory.rejected, (state, action) => { state.loading.history = false; state.error = action.payload as string; });

    builder
      .addCase(fetchStationCounts.pending, (state) => { state.loading.counts = true; state.error = null; })
      .addCase(fetchStationCounts.fulfilled, (state, action: PayloadAction<StationWithFileCount[]>) => {
        state.loading.counts = false;
        state.stationCounts = action.payload;
      })
      .addCase(fetchStationCounts.rejected, (state, action) => { state.loading.counts = false; state.error = action.payload as string; });

    builder
      .addCase(receiveFile.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(receiveFile.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.entries.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) state.entries[index] = action.payload;
        if (state.selectedEntry?.id === action.payload.id) state.selectedEntry = action.payload;
      })
      .addCase(receiveFile.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(returnFile.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(returnFile.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.entries.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) state.entries[index] = action.payload;
        if (state.selectedEntry?.id === action.payload.id) state.selectedEntry = action.payload;
      })
      .addCase(returnFile.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- DIRECT UPLOAD REDUCERS ---------- */
    
    builder
      .addCase(directUpload.pending, (state) => { 
        state.loading.uploading = true; 
        state.error = null; 
        state.success = false; 
      })
      .addCase(directUpload.fulfilled, (state, action: PayloadAction<DirectDocumentUploadResponse>) => {
        state.loading.uploading = false;
        state.success = true;
        state.entries = [action.payload.entry, ...state.entries];
        state.uploadResults[action.payload.file.file_name] = action.payload;
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(directUpload.rejected, (state, action) => { 
        state.loading.uploading = false; 
        state.error = action.payload as string; 
        state.success = false; 
      });

    builder
      .addCase(bulkDirectUpload.pending, (state) => { 
        state.loading.uploading = true; 
        state.error = null; 
        state.success = false; 
      })
      .addCase(bulkDirectUpload.fulfilled, (state, action: PayloadAction<DirectDocumentUploadResponse[]>) => {
        state.loading.uploading = false;
        state.success = true;
        const newEntries = action.payload.map((r) => r.entry);
        state.entries = [...newEntries, ...state.entries];
        action.payload.forEach((r) => {
          state.uploadResults[r.file.file_name] = r;
        });
        state.pagination.total += newEntries.length;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(bulkDirectUpload.rejected, (state, action) => { 
        state.loading.uploading = false; 
        state.error = action.payload as string; 
        state.success = false; 
      });

    builder
      .addCase(uploadDocumentToFolder.pending, (state) => { 
        state.loading.uploading = true; 
        state.error = null; 
        state.success = false; 
      })
      .addCase(uploadDocumentToFolder.fulfilled, (state, action: PayloadAction<DirectDocumentUploadResponse>) => {
        state.loading.uploading = false;
        state.success = true;
        state.entries = [action.payload.entry, ...state.entries];
        state.uploadResults[action.payload.file.file_name] = action.payload;
        state.pagination.total += 1;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
      })
      .addCase(uploadDocumentToFolder.rejected, (state, action) => { 
        state.loading.uploading = false; 
        state.error = action.payload as string; 
        state.success = false; 
      });

    /* ---------- DOCUMENT MANAGEMENT REDUCERS ---------- */
    
    builder
      .addCase(fetchDocumentDetails.pending, (state) => { state.loading.documentDetail = true; state.error = null; })
      .addCase(fetchDocumentDetails.fulfilled, (state, action: PayloadAction<DocumentDetailsResponse>) => {
        state.loading.documentDetail = false;
        state.selectedEntry = action.payload.current;
        state.history = action.payload.history;
      })
      .addCase(fetchDocumentDetails.rejected, (state, action) => { state.loading.documentDetail = false; state.error = action.payload as string; });

    builder
      .addCase(updateDocumentMetadata.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(updateDocumentMetadata.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.entries.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) state.entries[index] = action.payload;
        if (state.selectedEntry?.id === action.payload.id) state.selectedEntry = action.payload;
      })
      .addCase(updateDocumentMetadata.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(deleteDocument.pending, (state) => { state.loading.mutating = true; state.error = null; state.success = false; })
      .addCase(deleteDocument.fulfilled, (state, action: PayloadAction<{ documentId: string; result: { deleted: boolean; filePublicIds?: string[] } }>) => {
        state.loading.mutating = false;
        state.success = true;
        state.entries = state.entries.filter((e) => e.document_id !== action.payload.documentId);
        if (state.selectedEntry?.document_id === action.payload.documentId) state.selectedEntry = null;
        state.history = state.history.filter((e) => e.document_id !== action.payload.documentId);
      })
      .addCase(deleteDocument.rejected, (state, action) => { state.loading.mutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(fetchDocumentsBySource.pending, (state) => { state.loading.list = true; state.error = null; })
      .addCase(fetchDocumentsBySource.fulfilled, (state, action: PayloadAction<{ source: DocumentSource; entries: RegistryEntry[] }>) => {
        state.loading.list = false;
        state.entries = action.payload.entries;
        state.pagination.total = action.payload.entries.length;
      })
      .addCase(fetchDocumentsBySource.rejected, (state, action) => { state.loading.list = false; state.error = action.payload as string; });

    /* ══════════════════════════════════════════════════════════════════════════
       FOLDER REDUCERS
       ══════════════════════════════════════════════════════════════════════════ */

    builder
      .addCase(createFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(createFolder.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
        state.loading.folderMutating = false;
        state.success = true;
        state.folders = [action.payload, ...state.folders];
      })
      .addCase(createFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(fetchFolders.pending, (state) => { state.loading.folders = true; state.error = null; })
      .addCase(fetchFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
        state.loading.folders = false;
        state.folders = action.payload;
      })
      .addCase(fetchFolders.rejected, (state, action) => { state.loading.folders = false; state.error = action.payload as string; });

    builder
      .addCase(fetchRootFolders.pending, (state) => { state.loading.folders = true; state.error = null; })
      .addCase(fetchRootFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
        state.loading.folders = false;
        state.folders = action.payload;
      })
      .addCase(fetchRootFolders.rejected, (state, action) => { state.loading.folders = false; state.error = action.payload as string; });

    builder
      .addCase(fetchActiveFolders.pending, (state) => { state.loading.folders = true; state.error = null; })
      .addCase(fetchActiveFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
        state.loading.folders = false;
        state.folders = action.payload;
      })
      .addCase(fetchActiveFolders.rejected, (state, action) => { state.loading.folders = false; state.error = action.payload as string; });

    builder
      .addCase(fetchFolderById.pending, (state) => { state.loading.folderDetail = true; state.error = null; })
      .addCase(fetchFolderById.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
        state.loading.folderDetail = false;
        state.selectedFolder = action.payload;
      })
      .addCase(fetchFolderById.rejected, (state, action) => { state.loading.folderDetail = false; state.error = action.payload as string; });

    builder
      .addCase(fetchFolderChildren.pending, (state) => { state.loading.folderChildren = true; state.error = null; })
      .addCase(fetchFolderChildren.fulfilled, (state) => {
        state.loading.folderChildren = false;
      })
      .addCase(fetchFolderChildren.rejected, (state, action) => { state.loading.folderChildren = false; state.error = action.payload as string; });

    builder
      .addCase(fetchFolderHierarchy.pending, (state) => { state.loading.folderDetail = true; state.error = null; })
      .addCase(fetchFolderHierarchy.fulfilled, (state, action: PayloadAction<FolderHierarchy>) => {
        state.loading.folderDetail = false;
        state.folderHierarchy = action.payload;
        state.selectedFolder = action.payload;
      })
      .addCase(fetchFolderHierarchy.rejected, (state, action) => { state.loading.folderDetail = false; state.error = action.payload as string; });

    builder
      .addCase(fetchFolderCategories.pending, (state) => { state.loading.folderCategories = true; state.error = null; })
      .addCase(fetchFolderCategories.fulfilled, (state, action: PayloadAction<FolderCategoryCount[]>) => {
        state.loading.folderCategories = false;
        state.folderCategories = action.payload;
      })
      .addCase(fetchFolderCategories.rejected, (state, action) => { state.loading.folderCategories = false; state.error = action.payload as string; });

    builder
      .addCase(fetchFolderStatistics.pending, (state) => { state.loading.folderStatistics = true; state.error = null; })
      .addCase(fetchFolderStatistics.fulfilled, (state, action: PayloadAction<FolderStatistics>) => {
        state.loading.folderStatistics = false;
        state.folderStatistics = action.payload;
      })
      .addCase(fetchFolderStatistics.rejected, (state, action) => { state.loading.folderStatistics = false; state.error = action.payload as string; });

    builder
      .addCase(searchFolders.pending, (state) => { state.loading.folders = true; state.error = null; })
      .addCase(searchFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
        state.loading.folders = false;
        state.folders = action.payload;
      })
      .addCase(searchFolders.rejected, (state, action) => { state.loading.folders = false; state.error = action.payload as string; });

    builder
      .addCase(fetchFolderDocuments.pending, (state) => { state.loading.folderDocuments = true; state.error = null; })
      .addCase(fetchFolderDocuments.fulfilled, (state, action: PayloadAction<{ id: string; documents: FolderDocument[] }>) => {
        state.loading.folderDocuments = false;
        state.folderDocuments = action.payload.documents;
      })
      .addCase(fetchFolderDocuments.rejected, (state, action) => { state.loading.folderDocuments = false; state.error = action.payload as string; });

    builder
      .addCase(fetchStationFolderDocuments.pending, (state) => {
        state.loading.stationFolderDocuments = true;
        state.error = null;
      })
      .addCase(fetchStationFolderDocuments.fulfilled, (state, action: PayloadAction<FolderRegistryPaginationResponse>) => {
        state.loading.stationFolderDocuments = false;
        state.stationFolderDocuments = action.payload.data;
        state.stationFolderPagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchStationFolderDocuments.rejected, (state, action) => {
        state.loading.stationFolderDocuments = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(updateFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(updateFolder.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
        state.loading.folderMutating = false;
        state.success = true;
        const index = state.folders.findIndex((f) => f.id === action.payload.id);
        if (index !== -1) state.folders[index] = action.payload;
        if (state.selectedFolder?.id === action.payload.id) state.selectedFolder = action.payload;
        if (state.folderHierarchy?.id === action.payload.id) {
          state.folderHierarchy = { ...state.folderHierarchy, ...action.payload };
        }
      })
      .addCase(updateFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(deleteFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(deleteFolder.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.folderMutating = false;
        state.success = true;
        state.folders = state.folders.filter((f) => f.id !== action.payload);
        if (state.selectedFolder?.id === action.payload) state.selectedFolder = null;
        if (state.folderHierarchy?.id === action.payload) state.folderHierarchy = null;
      })
      .addCase(deleteFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(moveFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(moveFolder.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
        state.loading.folderMutating = false;
        state.success = true;
        const index = state.folders.findIndex((f) => f.id === action.payload.id);
        if (index !== -1) state.folders[index] = action.payload;
        if (state.selectedFolder?.id === action.payload.id) state.selectedFolder = action.payload;
        if (state.folderHierarchy?.id === action.payload.id) {
          state.folderHierarchy = { ...state.folderHierarchy, ...action.payload };
        }
      })
      .addCase(moveFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(addDocumentToFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(addDocumentToFolder.fulfilled, (state) => {
        state.loading.folderMutating = false;
        state.success = true;
      })
      .addCase(addDocumentToFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(removeDocumentFromFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(removeDocumentFromFolder.fulfilled, (state, action: PayloadAction<{ folderId: string; documentId: string }>) => {
        state.loading.folderMutating = false;
        state.success = true;
        state.folderDocuments = state.folderDocuments.filter((d) => d.id !== action.payload.documentId);
      })
      .addCase(removeDocumentFromFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    builder
      .addCase(bulkAddDocumentsToFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(bulkAddDocumentsToFolder.fulfilled, (state) => {
        state.loading.folderMutating = false;
        state.success = true;
      })
      .addCase(bulkAddDocumentsToFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setRegistryFilters,
  resetRegistryFilters,
  setFolderFilters,
  resetFolderFilters,
  setUploadProgress,
  setUploadStatus,
  clearUploadState,
  clearSelectedEntry,
  clearSelectedFolder,
  clearHistory,
  clearFolderDocuments,
  clearStationFolderDocuments,
  clearError,
  clearSuccess,
  resetRegistryState,
} = registrySlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllRegistryEntries = (state: { registry: RegistryState }) => state.registry.entries;
export const selectSelectedEntry = (state: { registry: RegistryState }) => state.registry.selectedEntry;
export const selectRegistryHistory = (state: { registry: RegistryState }) => state.registry.history;
export const selectRegistryHistoryDocId = (state: { registry: RegistryState }) => state.registry.historyDocId;
export const selectStationCounts = (state: { registry: RegistryState }) => state.registry.stationCounts;
export const selectRegistryPagination = (state: { registry: RegistryState }) => state.registry.pagination;
export const selectRegistryFilters = (state: { registry: RegistryState }) => state.registry.filters;

export const selectAllFolders = (state: { registry: RegistryState }) => state.registry.folders;
export const selectSelectedFolder = (state: { registry: RegistryState }) => state.registry.selectedFolder;
export const selectFolderHierarchy = (state: { registry: RegistryState }) => state.registry.folderHierarchy;
export const selectFolderDocuments = (state: { registry: RegistryState }) => state.registry.folderDocuments;
export const selectFolderCategories = (state: { registry: RegistryState }) => state.registry.folderCategories;
export const selectFolderStatistics = (state: { registry: RegistryState }) => state.registry.folderStatistics;
export const selectFolderFilters = (state: { registry: RegistryState }) => state.registry.folderFilters;

export const selectStationFolderDocuments = (state: { registry: RegistryState }) => state.registry.stationFolderDocuments;
export const selectStationFolderPagination = (state: { registry: RegistryState }) => state.registry.stationFolderPagination;

export const selectUploadProgress = (state: { registry: RegistryState }, fileName: string) => 
  state.registry.uploadProgress[fileName] || 0;
export const selectUploadStatus = (state: { registry: RegistryState }, fileName: string) => 
  state.registry.uploadStatus[fileName] || 'idle';
export const selectUploadError = (state: { registry: RegistryState }, fileName: string) => 
  state.registry.uploadErrors[fileName] || null;
export const selectUploadResult = (state: { registry: RegistryState }, fileName: string) => 
  state.registry.uploadResults[fileName] || null;
export const selectAllUploadResults = (state: { registry: RegistryState }) => 
  state.registry.uploadResults;
export const selectIsUploading = (state: { registry: RegistryState }) => 
  state.registry.loading.uploading;

export const selectRegistryListLoading = (state: { registry: RegistryState }) => state.registry.loading.list;
export const selectRegistryDetailLoading = (state: { registry: RegistryState }) => state.registry.loading.detail;
export const selectRegistryHistoryLoading = (state: { registry: RegistryState }) => state.registry.loading.history;
export const selectStationCountsLoading = (state: { registry: RegistryState }) => state.registry.loading.counts;
export const selectRegistryMutating = (state: { registry: RegistryState }) => state.registry.loading.mutating;
export const selectFoldersLoading = (state: { registry: RegistryState }) => state.registry.loading.folders;
export const selectFolderDetailLoading = (state: { registry: RegistryState }) => state.registry.loading.folderDetail;
export const selectFolderDocumentsLoading = (state: { registry: RegistryState }) => state.registry.loading.folderDocuments;
export const selectFolderCategoriesLoading = (state: { registry: RegistryState }) => state.registry.loading.folderCategories;
export const selectFolderStatisticsLoading = (state: { registry: RegistryState }) => state.registry.loading.folderStatistics;
export const selectFolderMutating = (state: { registry: RegistryState }) => state.registry.loading.folderMutating;
export const selectStationFolderDocumentsLoading = (state: { registry: RegistryState }) => state.registry.loading.stationFolderDocuments;
export const selectDocumentDetailLoading = (state: { registry: RegistryState }) => state.registry.loading.documentDetail;

export const selectRegistryError = (state: { registry: RegistryState }) => state.registry.error;
export const selectRegistrySuccess = (state: { registry: RegistryState }) => state.registry.success;

export const selectRootFolders = (state: { registry: RegistryState }) => 
  state.registry.folders.filter((f) => f.parent_folder_id === null);

export const selectActiveFolders = (state: { registry: RegistryState }) => 
  state.registry.folders.filter((f) => f.status === 'active');

export const selectFolderById = (state: { registry: RegistryState }, id: string) => 
  state.registry.folders.find((f) => f.id === id);

export const selectFolderChildren = (state: { registry: RegistryState }, id: string) => 
  state.registry.folders.filter((f) => f.parent_folder_id === id);

export const selectRoutedEntries = (state: { registry: RegistryState }) => 
  state.registry.entries.filter((e) => e.source === 'routed');

export const selectDirectEntries = (state: { registry: RegistryState }) => 
  state.registry.entries.filter((e) => e.source === 'direct');

export const selectEntriesByStation = (state: { registry: RegistryState }, stationId: string) => 
  state.registry.entries.filter((e) => e.station_id === stationId);

export default registrySlice.reducer;