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
  //AddDocumentToFolderInput,
  BulkAddDocumentsInput,
  FolderFilters,
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
  
  pagination: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
  filters: RegistryFilters;
  folderFilters: FolderFilters;
  
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

// ── REMOVED: markFiled ──────────────────────────────────────────────────────
// No longer needed since we only have 'active' and 'returned' statuses

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

/* ============================================================
   FOLDER ASYNC THUNKS
============================================================ */

// ── Create ────────────────────────────────────────────────────────────────────

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

// ── Read ──────────────────────────────────────────────────────────────────────

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

// ── Update ────────────────────────────────────────────────────────────────────

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

// ── Delete ────────────────────────────────────────────────────────────────────

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

// ── Move ─────────────────────────────────────────────────────────────────────

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

// ── Document Operations ──────────────────────────────────────────────────────

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
    // ── Registry Filters ──────────────────────────────────────────────────────
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
    
    // ── Folder Filters ──────────────────────────────────────────────────────
    setFolderFilters(state, action: PayloadAction<Partial<FolderFilters>>) {
      state.folderFilters = { ...state.folderFilters, ...action.payload };
    },
    resetFolderFilters(state) {
      state.folderFilters = { include_sub_folders: true };
    },
    
    // ── Clear State ──────────────────────────────────────────────────────────
    clearSelectedEntry(state) { state.selectedEntry = null; },
    clearSelectedFolder(state) { state.selectedFolder = null; state.folderHierarchy = null; },
    clearHistory(state) { state.history = []; state.historyDocId = null; },
    clearFolderDocuments(state) { state.folderDocuments = []; },
    clearError(state) { state.error = null; },
    clearSuccess(state) { state.success = false; },
    resetRegistryState: () => initialState,
  },
  extraReducers: (builder) => {
    /* ══════════════════════════════════════════════════════════════════════════
       REGISTRY ENTRY REDUCERS
       ══════════════════════════════════════════════════════════════════════════ */

    /* ---------- ROUTE FILE ---------- */
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

    /* ---------- FETCH ALL ---------- */
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

    /* ---------- FETCH BY ID ---------- */
    builder
      .addCase(fetchRegistryEntryById.pending, (state) => { state.loading.detail = true; state.error = null; })
      .addCase(fetchRegistryEntryById.fulfilled, (state, action: PayloadAction<RegistryEntry>) => {
        state.loading.detail = false;
        state.selectedEntry = action.payload;
      })
      .addCase(fetchRegistryEntryById.rejected, (state, action) => { state.loading.detail = false; state.error = action.payload as string; });

    /* ---------- FETCH HISTORY ---------- */
    builder
      .addCase(fetchRegistryHistory.pending, (state) => { state.loading.history = true; state.error = null; })
      .addCase(fetchRegistryHistory.fulfilled, (state, action: PayloadAction<{ documentId: string; history: RegistryEntry[] }>) => {
        state.loading.history = false;
        state.history = action.payload.history;
        state.historyDocId = action.payload.documentId;
      })
      .addCase(fetchRegistryHistory.rejected, (state, action) => { state.loading.history = false; state.error = action.payload as string; });

    /* ---------- FETCH STATION COUNTS ---------- */
    builder
      .addCase(fetchStationCounts.pending, (state) => { state.loading.counts = true; state.error = null; })
      .addCase(fetchStationCounts.fulfilled, (state, action: PayloadAction<StationWithFileCount[]>) => {
        state.loading.counts = false;
        state.stationCounts = action.payload;
      })
      .addCase(fetchStationCounts.rejected, (state, action) => { state.loading.counts = false; state.error = action.payload as string; });

    /* ---------- RECEIVE FILE ---------- */
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

    /* ---------- RETURN FILE ---------- */
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

    /* ══════════════════════════════════════════════════════════════════════════
       FOLDER REDUCERS
       ══════════════════════════════════════════════════════════════════════════ */

    /* ---------- CREATE FOLDER ---------- */
    builder
      .addCase(createFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(createFolder.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
        state.loading.folderMutating = false;
        state.success = true;
        state.folders = [action.payload, ...state.folders];
      })
      .addCase(createFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- FETCH FOLDERS ---------- */
    builder
      .addCase(fetchFolders.pending, (state) => { state.loading.folders = true; state.error = null; })
      .addCase(fetchFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
        state.loading.folders = false;
        state.folders = action.payload;
      })
      .addCase(fetchFolders.rejected, (state, action) => { state.loading.folders = false; state.error = action.payload as string; });

    /* ---------- FETCH ROOT FOLDERS ---------- */
    builder
      .addCase(fetchRootFolders.pending, (state) => { state.loading.folders = true; state.error = null; })
      .addCase(fetchRootFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
        state.loading.folders = false;
        state.folders = action.payload;
      })
      .addCase(fetchRootFolders.rejected, (state, action) => { state.loading.folders = false; state.error = action.payload as string; });

    /* ---------- FETCH ACTIVE FOLDERS ---------- */
    builder
      .addCase(fetchActiveFolders.pending, (state) => { state.loading.folders = true; state.error = null; })
      .addCase(fetchActiveFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
        state.loading.folders = false;
        state.folders = action.payload;
      })
      .addCase(fetchActiveFolders.rejected, (state, action) => { state.loading.folders = false; state.error = action.payload as string; });

    /* ---------- FETCH FOLDER BY ID ---------- */
    builder
      .addCase(fetchFolderById.pending, (state) => { state.loading.folderDetail = true; state.error = null; })
      .addCase(fetchFolderById.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
        state.loading.folderDetail = false;
        state.selectedFolder = action.payload;
      })
      .addCase(fetchFolderById.rejected, (state, action) => { state.loading.folderDetail = false; state.error = action.payload as string; });

    /* ---------- FETCH FOLDER CHILDREN ---------- */
    builder
      .addCase(fetchFolderChildren.pending, (state) => { state.loading.folderChildren = true; state.error = null; })
      .addCase(fetchFolderChildren.fulfilled, (state, action: PayloadAction<{ id: string; children: RHCFolder[] }>) => {
        state.loading.folderChildren = false;
        // Update the folder's children in the folders list
        const folder = state.folders.find(f => f.id === action.payload.id);
        if (folder) {
          // We store children separately, but we can also update the sub_folder_count
          // The actual children are stored in folderHierarchy
        }
      })
      .addCase(fetchFolderChildren.rejected, (state, action) => { state.loading.folderChildren = false; state.error = action.payload as string; });

    /* ---------- FETCH FOLDER HIERARCHY ---------- */
    builder
      .addCase(fetchFolderHierarchy.pending, (state) => { state.loading.folderDetail = true; state.error = null; })
      .addCase(fetchFolderHierarchy.fulfilled, (state, action: PayloadAction<FolderHierarchy>) => {
        state.loading.folderDetail = false;
        state.folderHierarchy = action.payload;
        state.selectedFolder = action.payload;
      })
      .addCase(fetchFolderHierarchy.rejected, (state, action) => { state.loading.folderDetail = false; state.error = action.payload as string; });

    /* ---------- FETCH FOLDER CATEGORIES ---------- */
    builder
      .addCase(fetchFolderCategories.pending, (state) => { state.loading.folderCategories = true; state.error = null; })
      .addCase(fetchFolderCategories.fulfilled, (state, action: PayloadAction<FolderCategoryCount[]>) => {
        state.loading.folderCategories = false;
        state.folderCategories = action.payload;
      })
      .addCase(fetchFolderCategories.rejected, (state, action) => { state.loading.folderCategories = false; state.error = action.payload as string; });

    /* ---------- FETCH FOLDER STATISTICS ---------- */
    builder
      .addCase(fetchFolderStatistics.pending, (state) => { state.loading.folderStatistics = true; state.error = null; })
      .addCase(fetchFolderStatistics.fulfilled, (state, action: PayloadAction<FolderStatistics>) => {
        state.loading.folderStatistics = false;
        state.folderStatistics = action.payload;
      })
      .addCase(fetchFolderStatistics.rejected, (state, action) => { state.loading.folderStatistics = false; state.error = action.payload as string; });

    /* ---------- SEARCH FOLDERS ---------- */
    builder
      .addCase(searchFolders.pending, (state) => { state.loading.folders = true; state.error = null; })
      .addCase(searchFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
        state.loading.folders = false;
        state.folders = action.payload;
      })
      .addCase(searchFolders.rejected, (state, action) => { state.loading.folders = false; state.error = action.payload as string; });

    /* ---------- FETCH FOLDER DOCUMENTS ---------- */
    builder
      .addCase(fetchFolderDocuments.pending, (state) => { state.loading.folderDocuments = true; state.error = null; })
      .addCase(fetchFolderDocuments.fulfilled, (state, action: PayloadAction<{ id: string; documents: FolderDocument[] }>) => {
        state.loading.folderDocuments = false;
        state.folderDocuments = action.payload.documents;
      })
      .addCase(fetchFolderDocuments.rejected, (state, action) => { state.loading.folderDocuments = false; state.error = action.payload as string; });

    /* ---------- UPDATE FOLDER ---------- */
    builder
      .addCase(updateFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(updateFolder.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
        state.loading.folderMutating = false;
        state.success = true;
        const index = state.folders.findIndex(f => f.id === action.payload.id);
        if (index !== -1) state.folders[index] = action.payload;
        if (state.selectedFolder?.id === action.payload.id) state.selectedFolder = action.payload;
        if (state.folderHierarchy?.id === action.payload.id) state.folderHierarchy = { ...state.folderHierarchy, ...action.payload };
      })
      .addCase(updateFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- DELETE FOLDER ---------- */
    builder
      .addCase(deleteFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(deleteFolder.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.folderMutating = false;
        state.success = true;
        state.folders = state.folders.filter(f => f.id !== action.payload);
        if (state.selectedFolder?.id === action.payload) state.selectedFolder = null;
        if (state.folderHierarchy?.id === action.payload) state.folderHierarchy = null;
      })
      .addCase(deleteFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- MOVE FOLDER ---------- */
    builder
      .addCase(moveFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(moveFolder.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
        state.loading.folderMutating = false;
        state.success = true;
        const index = state.folders.findIndex(f => f.id === action.payload.id);
        if (index !== -1) state.folders[index] = action.payload;
        if (state.selectedFolder?.id === action.payload.id) state.selectedFolder = action.payload;
        if (state.folderHierarchy?.id === action.payload.id) state.folderHierarchy = { ...state.folderHierarchy, ...action.payload };
      })
      .addCase(moveFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- ADD DOCUMENT TO FOLDER ---------- */
    builder
      .addCase(addDocumentToFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(addDocumentToFolder.fulfilled, (state) => {
        state.loading.folderMutating = false;
        state.success = true;
        // Refresh folder documents - the caller should refetch
      })
      .addCase(addDocumentToFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- REMOVE DOCUMENT FROM FOLDER ---------- */
    builder
      .addCase(removeDocumentFromFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(removeDocumentFromFolder.fulfilled, (state, action: PayloadAction<{ folderId: string; documentId: string }>) => {
        state.loading.folderMutating = false;
        state.success = true;
        state.folderDocuments = state.folderDocuments.filter(d => d.id !== action.payload.documentId);
      })
      .addCase(removeDocumentFromFolder.rejected, (state, action) => { state.loading.folderMutating = false; state.error = action.payload as string; state.success = false; });

    /* ---------- BULK ADD DOCUMENTS ---------- */
    builder
      .addCase(bulkAddDocumentsToFolder.pending, (state) => { state.loading.folderMutating = true; state.error = null; state.success = false; })
      .addCase(bulkAddDocumentsToFolder.fulfilled, (state) => {
        state.loading.folderMutating = false;
        state.success = true;
        // Refresh folder documents - the caller should refetch
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
  clearSelectedEntry,
  clearSelectedFolder,
  clearHistory,
  clearFolderDocuments,
  clearError,
  clearSuccess,
  resetRegistryState,
} = registrySlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ── Registry Entry Selectors ─────────────────────────────────────────────────
export const selectAllRegistryEntries = (state: { registry: RegistryState }) => state.registry.entries;
export const selectSelectedEntry = (state: { registry: RegistryState }) => state.registry.selectedEntry;
export const selectRegistryHistory = (state: { registry: RegistryState }) => state.registry.history;
export const selectRegistryHistoryDocId = (state: { registry: RegistryState }) => state.registry.historyDocId;
export const selectStationCounts = (state: { registry: RegistryState }) => state.registry.stationCounts;
export const selectRegistryPagination = (state: { registry: RegistryState }) => state.registry.pagination;
export const selectRegistryFilters = (state: { registry: RegistryState }) => state.registry.filters;

// ── Folder Selectors ─────────────────────────────────────────────────────────
export const selectAllFolders = (state: { registry: RegistryState }) => state.registry.folders;
export const selectSelectedFolder = (state: { registry: RegistryState }) => state.registry.selectedFolder;
export const selectFolderHierarchy = (state: { registry: RegistryState }) => state.registry.folderHierarchy;
export const selectFolderDocuments = (state: { registry: RegistryState }) => state.registry.folderDocuments;
export const selectFolderCategories = (state: { registry: RegistryState }) => state.registry.folderCategories;
export const selectFolderStatistics = (state: { registry: RegistryState }) => state.registry.folderStatistics;
export const selectFolderFilters = (state: { registry: RegistryState }) => state.registry.folderFilters;

// ── Loading Selectors ────────────────────────────────────────────────────────
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

// ── Error/Success Selectors ──────────────────────────────────────────────────
export const selectRegistryError = (state: { registry: RegistryState }) => state.registry.error;
export const selectRegistrySuccess = (state: { registry: RegistryState }) => state.registry.success;

// ── Computed Selectors ──────────────────────────────────────────────────────
export const selectRootFolders = (state: { registry: RegistryState }) => 
  state.registry.folders.filter(f => f.parent_folder_id === null);

export const selectActiveFolders = (state: { registry: RegistryState }) => 
  state.registry.folders.filter(f => f.status === 'active');

export const selectFolderById = (state: { registry: RegistryState }, id: string) => 
  state.registry.folders.find(f => f.id === id);

export const selectFolderChildren = (state: { registry: RegistryState }, id: string) => 
  state.registry.folders.filter(f => f.parent_folder_id === id);

export default registrySlice.reducer;