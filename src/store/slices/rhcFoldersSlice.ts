// src/store/slices/rhcFoldersSlice.ts

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import axiosClient from '../../api/api';
import type { RootState } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FolderStatus = 'active' | 'archived' | 'closed';

export type FolderCategory = 
    | 'court'
    | 'directorate'
    | 'general'
    | 'judges'
    | 'committee'
    | 'training'
    | 'hr'
    | 'finance'
    | 'procurement'
    | 'ict'
    | 'legal'
    | 'projects'
    | 'other';

export interface RHCFolder {
    id: string;
    ref_no: string;
    name: string;
    category: FolderCategory;
    description?: string;
    parent_folder_id: string | null;
    status: FolderStatus;
    department_id: string | null;
    created_by: string;
    created_by_name?: string;
    created_at: string;
    updated_at: string;
    updated_by?: string;
    updated_by_name?: string;
    is_active: boolean;
    document_count?: number;
    sub_folder_count?: number;
}

export interface RHCFolderWithStats extends RHCFolder {
    document_count: number;
    sub_folder_count: number;
}

export interface CreateRHCFolderInput {
    ref_no: string;
    name: string;
    category: FolderCategory;
    description?: string;
    parent_folder_id?: string;
    status?: FolderStatus;
    department_id?: string;
}

export interface UpdateRHCFolderInput {
    name?: string;
    description?: string;
    status?: FolderStatus;
    department_id?: string;
}

export interface RHCFolderFilters {
    search?: string;
    category?: FolderCategory;
    status?: FolderStatus;
    parent_folder_id?: string | null;
    department_id?: string;
    limit?: number;
    offset?: number;
    include_sub_folders?: boolean;
}

export interface CategoryWithCount {
    category: FolderCategory;
    count: number;
}

export interface FolderHierarchy {
    folder: RHCFolder;
    children: RHCFolder[];
}

export interface FolderDocument {
    id: string;
    ref: string;
    subject: string;
    entity_type: string;
    entity_id: string;
    format: string;
    file_url: string;
    public_id: string;
    file_size: number | null;
    uploaded_by: string | null;
    uploaded_by_name?: string;
    status: string;
    e_stamp_status: string;
    e_stamp_url?: string | null;
    e_stamp_public_id?: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<FolderCategory, string> = {
    court: 'Courts',
    directorate: 'Directorates',
    general: 'General',
    judges: 'Judges & Registrars',
    committee: 'Committees',
    training: 'Training & Workshops',
    hr: 'Human Resources',
    finance: 'Finance & Budget',
    procurement: 'Procurement & Supply Chain',
    ict: 'ICT & Information',
    legal: 'Legal & Judicial',
    projects: 'Projects & Programs',
    other: 'Other',
};

export const CATEGORY_COLORS: Record<FolderCategory, string> = {
    court: 'bg-blue-50 text-blue-700 border-blue-200',
    directorate: 'bg-purple-50 text-purple-700 border-purple-200',
    general: 'bg-stone-50 text-stone-700 border-stone-200',
    judges: 'bg-amber-50 text-amber-700 border-amber-200',
    committee: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    training: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hr: 'bg-pink-50 text-pink-700 border-pink-200',
    finance: 'bg-green-50 text-green-700 border-green-200',
    procurement: 'bg-orange-50 text-orange-700 border-orange-200',
    ict: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    legal: 'bg-red-50 text-red-700 border-red-200',
    projects: 'bg-teal-50 text-teal-700 border-teal-200',
    other: 'bg-stone-50 text-stone-700 border-stone-200',
};

export const STATUS_LABELS: Record<FolderStatus, string> = {
    active: 'Active',
    archived: 'Archived',
    closed: 'Closed',
};

export const STATUS_COLORS: Record<FolderStatus, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    archived: 'bg-stone-50 text-stone-700 border-stone-200',
    closed: 'bg-red-50 text-red-700 border-red-200',
};

// ─── State ────────────────────────────────────────────────────────────────────

interface RHCFoldersState {
    items: RHCFolder[];
    selectedFolder: RHCFolder | null;
    hierarchy: FolderHierarchy | null;
    categories: CategoryWithCount[];
    folderDocuments: FolderDocument[];
    loading: {
        fetch: boolean;
        create: boolean;
        update: boolean;
        delete: boolean;
        fetchOne: boolean;
        fetchChildren: boolean;
        fetchHierarchy: boolean;
        fetchCategories: boolean;
        search: boolean;
        fetchDocuments: boolean;
    };
    error: string | null;
    pagination: {
        limit: number;
        offset: number;
        total: number;
    };
    searchResults: RHCFolder[];
}

const initialState: RHCFoldersState = {
    items: [],
    selectedFolder: null,
    hierarchy: null,
    categories: [],
    folderDocuments: [],
    loading: {
        fetch: false,
        create: false,
        update: false,
        delete: false,
        fetchOne: false,
        fetchChildren: false,
        fetchHierarchy: false,
        fetchCategories: false,
        search: false,
        fetchDocuments: false,
    },
    error: null,
    pagination: {
        limit: 50,
        offset: 0,
        total: 0,
    },
    searchResults: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildParams(filters: RHCFolderFilters): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.category) params.category = filters.category;
    if (filters.status) params.status = filters.status;
    if (filters.parent_folder_id !== undefined && filters.parent_folder_id !== null) {
        params.parent_folder_id = filters.parent_folder_id;
    }
    if (filters.department_id) params.department_id = filters.department_id;
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.offset) params.offset = String(filters.offset);
    if (filters.include_sub_folders !== undefined) {
        params.include_sub_folders = String(filters.include_sub_folders);
    }
    return params;
}

function getErrorMessage(err: unknown, fallback: string): string {
    const error = err as AxiosError<{ message?: string }>;
    return error.response?.data?.message ?? fallback;
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

// ── Fetch all folders ──────────────────────────────────────────────────────
export const fetchRHCFolders = createAsyncThunk<
    RHCFolder[],
    RHCFolderFilters | undefined,
    { rejectValue: string }
>(
    'rhcFolders/fetchAll',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/orhc-folders/folders', {
                params: buildParams(filters),
            });
            return data.data as RHCFolder[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch folders'));
        }
    }
);

// ── Fetch folder by ID ─────────────────────────────────────────────────────
export const fetchRHCFolderById = createAsyncThunk<
    RHCFolder,
    string,
    { rejectValue: string }
>(
    'rhcFolders/fetchById',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/orhc-folders/folders/${id}`);
            return data.data as RHCFolder;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch folder'));
        }
    }
);

// ── Fetch folder children ──────────────────────────────────────────────────
export const fetchRHCFolderChildren = createAsyncThunk<
    RHCFolder[],
    { id: string; limit?: number; offset?: number },
    { rejectValue: string }
>(
    'rhcFolders/fetchChildren',
    async ({ id, limit, offset }, { rejectWithValue }) => {
        try {
            const params: Record<string, string> = {};
            if (limit) params.limit = String(limit);
            if (offset) params.offset = String(offset);
            const { data } = await axiosClient.get(`/orhc-folders/folders/${id}/children`, { params });
            return data.data as RHCFolder[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch folder children'));
        }
    }
);

// ── Fetch folder hierarchy ─────────────────────────────────────────────────
export const fetchRHCFolderHierarchy = createAsyncThunk<
    FolderHierarchy,
    string,
    { rejectValue: string }
>(
    'rhcFolders/fetchHierarchy',
    async (id, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/orhc-folders/folders/${id}/hierarchy`);
            return data.data as FolderHierarchy;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch folder hierarchy'));
        }
    }
);

// ── Fetch categories with counts ──────────────────────────────────────────
export const fetchRHCFolderCategories = createAsyncThunk<
    CategoryWithCount[],
    void,
    { rejectValue: string }
>(
    'rhcFolders/fetchCategories',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/orhc-folders/folders/categories');
            return data.data as CategoryWithCount[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch categories'));
        }
    }
);

// ── Search folders ──────────────────────────────────────────────────────────
export const searchRHCFolders = createAsyncThunk<
    RHCFolder[],
    string,
    { rejectValue: string }
>(
    'rhcFolders/search',
    async (query, { rejectWithValue }) => {
        try {
            if (query.length < 2) {
                return [];
            }
            const { data } = await axiosClient.get('/orhc-folders/folders/search', {
                params: { q: query },
            });
            return data.data as RHCFolder[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to search folders'));
        }
    }
);

// ── Create folder ──────────────────────────────────────────────────────────
export const createRHCFolder = createAsyncThunk<
    RHCFolder,
    CreateRHCFolderInput,
    { rejectValue: string }
>(
    'rhcFolders/create',
    async (input, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/orhc-folders/folders', input);
            return data.data as RHCFolder;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to create folder'));
        }
    }
);

// ── Update folder ──────────────────────────────────────────────────────────
export const updateRHCFolder = createAsyncThunk<
    RHCFolder,
    { id: string; input: UpdateRHCFolderInput },
    { rejectValue: string }
>(
    'rhcFolders/update',
    async ({ id, input }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/orhc-folders/folders/${id}`, input);
            return data.data as RHCFolder;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to update folder'));
        }
    }
);

// ── Delete folder ──────────────────────────────────────────────────────────
export const deleteRHCFolder = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>(
    'rhcFolders/delete',
    async (id, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/orhc-folders/folders/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to delete folder'));
        }
    }
);

// ── Get folder documents ──────────────────────────────────────────────────
export const fetchRHCFolderDocuments = createAsyncThunk<
    FolderDocument[],
    { id: string; limit?: number; offset?: number },
    { rejectValue: string }
>(
    'rhcFolders/fetchDocuments',
    async ({ id, limit, offset }, { rejectWithValue }) => {
        try {
            const params: Record<string, string> = {};
            if (limit) params.limit = String(limit);
            if (offset) params.offset = String(offset);
            const { data } = await axiosClient.get(`/orhc-folders/folders/${id}/documents`, { params });
            return data.data as FolderDocument[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err, 'Failed to fetch folder documents'));
        }
    }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const rhcFoldersSlice = createSlice({
    name: 'rhcFolders',
    initialState,
    reducers: {
        clearFolderError(state) {
            state.error = null;
        },
        clearSelectedFolder(state) {
            state.selectedFolder = null;
        },
        clearHierarchy(state) {
            state.hierarchy = null;
        },
        clearSearchResults(state) {
            state.searchResults = [];
        },
        clearFolderDocuments(state) {
            state.folderDocuments = [];
        },
        resetFolderState: () => initialState,
    },
    extraReducers: (builder) => {

        // ── fetchRHCFolders ──────────────────────────────────────────────────
        builder
            .addCase(fetchRHCFolders.pending, (state) => {
                state.loading.fetch = true;
                state.error = null;
            })
            .addCase(fetchRHCFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
                state.loading.fetch = false;
                state.items = action.payload;
                state.pagination.total = action.payload.length;
            })
            .addCase(fetchRHCFolders.rejected, (state, action) => {
                state.loading.fetch = false;
                state.error = action.payload as string;
            });

        // ── fetchRHCFolderById ───────────────────────────────────────────────
        builder
            .addCase(fetchRHCFolderById.pending, (state) => {
                state.loading.fetchOne = true;
                state.error = null;
            })
            .addCase(fetchRHCFolderById.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
                state.loading.fetchOne = false;
                state.selectedFolder = action.payload;
                // Update in list if exists
                const index = state.items.findIndex(f => f.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(fetchRHCFolderById.rejected, (state, action) => {
                state.loading.fetchOne = false;
                state.error = action.payload as string;
            });

        // ── fetchRHCFolderChildren ───────────────────────────────────────────
        builder
            .addCase(fetchRHCFolderChildren.pending, (state) => {
                state.loading.fetchChildren = true;
                state.error = null;
            })
            .addCase(fetchRHCFolderChildren.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
                state.loading.fetchChildren = false;
                // Store children in the hierarchy
                if (state.hierarchy) {
                    state.hierarchy.children = action.payload;
                }
            })
            .addCase(fetchRHCFolderChildren.rejected, (state, action) => {
                state.loading.fetchChildren = false;
                state.error = action.payload as string;
            });

        // ── fetchRHCFolderHierarchy ──────────────────────────────────────────
        builder
            .addCase(fetchRHCFolderHierarchy.pending, (state) => {
                state.loading.fetchHierarchy = true;
                state.error = null;
            })
            .addCase(fetchRHCFolderHierarchy.fulfilled, (state, action: PayloadAction<FolderHierarchy>) => {
                state.loading.fetchHierarchy = false;
                state.hierarchy = action.payload;
            })
            .addCase(fetchRHCFolderHierarchy.rejected, (state, action) => {
                state.loading.fetchHierarchy = false;
                state.error = action.payload as string;
            });

        // ── fetchRHCFolderCategories ─────────────────────────────────────────
        builder
            .addCase(fetchRHCFolderCategories.pending, (state) => {
                state.loading.fetchCategories = true;
                state.error = null;
            })
            .addCase(fetchRHCFolderCategories.fulfilled, (state, action: PayloadAction<CategoryWithCount[]>) => {
                state.loading.fetchCategories = false;
                state.categories = action.payload;
            })
            .addCase(fetchRHCFolderCategories.rejected, (state, action) => {
                state.loading.fetchCategories = false;
                state.error = action.payload as string;
            });

        // ── searchRHCFolders ──────────────────────────────────────────────────
        builder
            .addCase(searchRHCFolders.pending, (state) => {
                state.loading.search = true;
                state.error = null;
            })
            .addCase(searchRHCFolders.fulfilled, (state, action: PayloadAction<RHCFolder[]>) => {
                state.loading.search = false;
                state.searchResults = action.payload;
            })
            .addCase(searchRHCFolders.rejected, (state, action) => {
                state.loading.search = false;
                state.error = action.payload as string;
            });

        // ── createRHCFolder ──────────────────────────────────────────────────
        builder
            .addCase(createRHCFolder.pending, (state) => {
                state.loading.create = true;
                state.error = null;
            })
            .addCase(createRHCFolder.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
                state.loading.create = false;
                state.items.unshift(action.payload);
            })
            .addCase(createRHCFolder.rejected, (state, action) => {
                state.loading.create = false;
                state.error = action.payload as string;
            });

        // ── updateRHCFolder ──────────────────────────────────────────────────
        builder
            .addCase(updateRHCFolder.pending, (state) => {
                state.loading.update = true;
                state.error = null;
            })
            .addCase(updateRHCFolder.fulfilled, (state, action: PayloadAction<RHCFolder>) => {
                state.loading.update = false;
                const index = state.items.findIndex(f => f.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedFolder?.id === action.payload.id) {
                    state.selectedFolder = action.payload;
                }
                if (state.hierarchy?.folder.id === action.payload.id) {
                    state.hierarchy.folder = action.payload;
                }
            })
            .addCase(updateRHCFolder.rejected, (state, action) => {
                state.loading.update = false;
                state.error = action.payload as string;
            });

        // ── deleteRHCFolder ──────────────────────────────────────────────────
        builder
            .addCase(deleteRHCFolder.pending, (state) => {
                state.loading.delete = true;
                state.error = null;
            })
            .addCase(deleteRHCFolder.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.delete = false;
                state.items = state.items.filter(f => f.id !== action.payload);
                if (state.selectedFolder?.id === action.payload) {
                    state.selectedFolder = null;
                }
                if (state.hierarchy?.folder.id === action.payload) {
                    state.hierarchy = null;
                }
            })
            .addCase(deleteRHCFolder.rejected, (state, action) => {
                state.loading.delete = false;
                state.error = action.payload as string;
            });

        // ── fetchRHCFolderDocuments ──────────────────────────────────────────
        builder
            .addCase(fetchRHCFolderDocuments.pending, (state) => {
                state.loading.fetchDocuments = true;
                state.error = null;
            })
            .addCase(fetchRHCFolderDocuments.fulfilled, (state, action: PayloadAction<FolderDocument[]>) => {
                state.loading.fetchDocuments = false;
                state.folderDocuments = action.payload;
            })
            .addCase(fetchRHCFolderDocuments.rejected, (state, action) => {
                state.loading.fetchDocuments = false;
                state.error = action.payload as string;
            });
    },
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export const {
    clearFolderError,
    clearSelectedFolder,
    clearHierarchy,
    clearSearchResults,
    clearFolderDocuments,
    resetFolderState,
} = rhcFoldersSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAllRHCFolders = (state: RootState) => state.rhcFolders.items;
export const selectSelectedRHCFolder = (state: RootState) => state.rhcFolders.selectedFolder;
export const selectRHCFolderHierarchy = (state: RootState) => state.rhcFolders.hierarchy;
export const selectRHCFolderCategories = (state: RootState) => state.rhcFolders.categories;
export const selectRHCFolderSearchResults = (state: RootState) => state.rhcFolders.searchResults;
export const selectRHCFolderDocuments = (state: RootState) => state.rhcFolders.folderDocuments;
export const selectRHCFoldersLoading = (state: RootState) => state.rhcFolders.loading;
export const selectRHCFoldersError = (state: RootState) => state.rhcFolders.error;
export const selectRHCFoldersPagination = (state: RootState) => state.rhcFolders.pagination;

// ── Filtered selectors ──────────────────────────────────────────────────────

export const selectFoldersByCategory = (category: FolderCategory) => (state: RootState) =>
    state.rhcFolders.items.filter(f => f.category === category);

export const selectFoldersByStatus = (status: FolderStatus) => (state: RootState) =>
    state.rhcFolders.items.filter(f => f.status === status);

export const selectRootFolders = (state: RootState) =>
    state.rhcFolders.items.filter(f => f.parent_folder_id === null);

export const selectFolderChildren = (parentId: string) => (state: RootState) =>
    state.rhcFolders.items.filter(f => f.parent_folder_id === parentId);

export const selectActiveFolders = (state: RootState) =>
    state.rhcFolders.items.filter(f => f.status === 'active');

export default rhcFoldersSlice.reducer;