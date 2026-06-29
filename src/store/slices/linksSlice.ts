// src/store/slices/linksSlice.ts
import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */

export interface ExternalLinkCategory {
    id: string;
    name: string;
    emoji: string | null;
    description: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    link_count?: number;
}

export interface ExternalLink {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    url: string;
    icon_name: string | null;
    color: string;
    tags: string[];
    is_featured: boolean;
    sort_order: number;
    is_active: boolean;
    click_count: number;
    last_clicked_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    category?: ExternalLinkCategory;
}

export interface LinkStats {
    total_links: number;
    total_categories: number;
    total_clicks: number;
    featured_links: number;
    recent_clicks: { date: string; count: number }[];
    top_links: { id: string; name: string; click_count: number }[];
}

export interface CreateCategoryInput {
    name: string;
    emoji?: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
}

export interface UpdateCategoryInput {
    name?: string;
    emoji?: string;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
}

export interface CreateLinkInput {
    category_id: string;
    name: string;
    description?: string;
    url: string;
    icon_name?: string;
    color?: string;
    tags?: string[];
    is_featured?: boolean;
    sort_order?: number;
    is_active?: boolean;
}

export interface UpdateLinkInput {
    category_id?: string;
    name?: string;
    description?: string;
    url?: string;
    icon_name?: string;
    color?: string;
    tags?: string[];
    is_featured?: boolean;
    sort_order?: number;
    is_active?: boolean;
}

export interface LinkFilters {
    category_id?: string;
    search?: string;
    is_active?: boolean;
    is_featured?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
}

export interface LinksResponse {
    links: ExternalLink[];
    total: number;
}

/* ============================================================
   STATE
============================================================ */

interface LinksState {
    links: ExternalLink[];
    categories: ExternalLinkCategory[];
    selectedLink: ExternalLink | null;
    selectedCategory: ExternalLinkCategory | null;
    stats: LinkStats | null;
    filters: LinkFilters;
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    loading: {
        links: boolean;
        categories: boolean;
        stats: boolean;
        mutating: boolean;
    };
    error: string | null;
    success: boolean;
}

type RootState = { links: LinksState };

const initialState: LinksState = {
    links: [],
    categories: [],
    selectedLink: null,
    selectedCategory: null,
    stats: null,
    filters: { is_active: true, limit: 50, offset: 0 },
    pagination: { total: 0, page: 1, limit: 50, totalPages: 0 },
    loading: { links: false, categories: false, stats: false, mutating: false },
    error: null,
    success: false,
};

/* ============================================================
   HELPERS
============================================================ */

const getErrorMessage = (error: unknown): string => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

const buildQueryString = (filters: LinkFilters): string => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, Array.isArray(value) ? value.join(',') : String(value));
        }
    });
    return params.toString() ? `?${params.toString()}` : '';
};

/* ============================================================
   THUNKS — CATEGORIES
============================================================ */

export const fetchCategories = createAsyncThunk(
    'links/fetchCategories',
    async (params: { include_inactive?: boolean; include_counts?: boolean } = {}, { rejectWithValue }) => {
        try {
            const query = new URLSearchParams();
            if (params.include_inactive) query.append('include_inactive', 'true');
            if (params.include_counts)   query.append('include_counts',   'true');
            const qs = query.toString();
            const { data } = await axiosClient.get(`/links/categories${qs ? `?${qs}` : ''}`);
            return data.data as ExternalLinkCategory[];
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const fetchCategoryById = createAsyncThunk(
    'links/fetchCategoryById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/links/categories/${id}`);
            return data.data as ExternalLinkCategory;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const createCategory = createAsyncThunk(
    'links/createCategory',
    async (input: CreateCategoryInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/links/categories', input);
            return data.data as ExternalLinkCategory;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const updateCategory = createAsyncThunk(
    'links/updateCategory',
    async ({ id, input }: { id: string; input: UpdateCategoryInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/links/categories/${id}`, input);
            return data.data as ExternalLinkCategory;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const deleteCategory = createAsyncThunk(
    'links/deleteCategory',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/links/categories/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   THUNKS — LINKS
============================================================ */

export const fetchLinks = createAsyncThunk(
    'links/fetchLinks',
    async (filters: LinkFilters = {}, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/links${buildQueryString(filters)}`);
            return data.data as LinksResponse;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const fetchLinkById = createAsyncThunk(
    'links/fetchLinkById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/links/${id}`);
            return data.data as ExternalLink;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const createLink = createAsyncThunk(
    'links/createLink',
    async (input: CreateLinkInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/links', input);
            return data.data as ExternalLink;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const updateLink = createAsyncThunk(
    'links/updateLink',
    async ({ id, input }: { id: string; input: UpdateLinkInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/links/${id}`, input);
            return data.data as ExternalLink;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const deleteLink = createAsyncThunk(
    'links/deleteLink',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/links/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   THUNKS — CLICK TRACKING & STATS
============================================================ */

export const trackLinkClick = createAsyncThunk(
    'links/trackClick',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.post(`/links/${id}/click`);
            return id;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

export const fetchLinkStats = createAsyncThunk(
    'links/fetchStats',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/links/stats');
            return data.data as LinkStats;
        } catch (err) {
            return rejectWithValue(getErrorMessage(err));
        }
    }
);

/* ============================================================
   SLICE
============================================================ */

const linksSlice = createSlice({
    name: 'links',
    initialState,
    reducers: {
        setSelectedLink(state, action: PayloadAction<ExternalLink | null>) {
            state.selectedLink = action.payload;
            state.error = null;
        },
        setSelectedCategory(state, action: PayloadAction<ExternalLinkCategory | null>) {
            state.selectedCategory = action.payload;
            state.error = null;
        },
        setLinkFilters(state, action: PayloadAction<Partial<LinkFilters>>) {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.page = 1;
            state.filters.offset = 0;
        },
        clearLinkFilters(state) {
            state.filters = { is_active: true, limit: 50, offset: 0 };
            state.pagination.page = 1;
        },
        setLinkPagination(state, action: PayloadAction<{ page: number; limit?: number }>) {
            const { page, limit } = action.payload;
            state.pagination.page = page;
            if (limit) state.pagination.limit = limit;
            state.filters.offset = (page - 1) * state.pagination.limit;
        },
        incrementLinkClicks(state, action: PayloadAction<string>) {
            const link = state.links.find(l => l.id === action.payload);
            if (link) {
                link.click_count += 1;
                link.last_clicked_at = new Date().toISOString();
            }
        },
        clearLinkError(state) {
            state.error = null;
        },
        clearLinkSuccess(state) {
            state.success = false;
        },
        resetLinksState: () => initialState,
    },
    extraReducers: (builder) => {
        /* ── FETCH CATEGORIES ─────────────────────────────────────────────── */
        builder
            .addCase(fetchCategories.pending, (state) => {
                state.loading.categories = true;
                state.error = null;
            })
            .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<ExternalLinkCategory[]>) => {
                state.loading.categories = false;
                state.categories = action.payload;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.loading.categories = false;
                state.error = action.payload as string;
            });

        /* ── FETCH CATEGORY BY ID ─────────────────────────────────────────── */
        builder
            .addCase(fetchCategoryById.pending, (state) => {
                state.loading.categories = true;
                state.error = null;
            })
            .addCase(fetchCategoryById.fulfilled, (state, action: PayloadAction<ExternalLinkCategory>) => {
                state.loading.categories = false;
                state.selectedCategory = action.payload;
            })
            .addCase(fetchCategoryById.rejected, (state, action) => {
                state.loading.categories = false;
                state.error = action.payload as string;
            });

        /* ── CREATE CATEGORY ──────────────────────────────────────────────── */
        builder
            .addCase(createCategory.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createCategory.fulfilled, (state, action: PayloadAction<ExternalLinkCategory>) => {
                state.loading.mutating = false;
                state.success = true;
                state.categories = [action.payload, ...state.categories];
            })
            .addCase(createCategory.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ── UPDATE CATEGORY ──────────────────────────────────────────────── */
        builder
            .addCase(updateCategory.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateCategory.fulfilled, (state, action: PayloadAction<ExternalLinkCategory>) => {
                state.loading.mutating = false;
                state.success = true;
                const idx = state.categories.findIndex(c => c.id === action.payload.id);
                if (idx !== -1) state.categories[idx] = action.payload;
                if (state.selectedCategory?.id === action.payload.id) {
                    state.selectedCategory = action.payload;
                }
            })
            .addCase(updateCategory.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ── DELETE CATEGORY ──────────────────────────────────────────────── */
        builder
            .addCase(deleteCategory.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(deleteCategory.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                state.success = true;
                state.categories = state.categories.filter(c => c.id !== action.payload);
                if (state.selectedCategory?.id === action.payload) state.selectedCategory = null;
                state.links = state.links.filter(l => l.category_id !== action.payload);
            })
            .addCase(deleteCategory.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ── FETCH LINKS ──────────────────────────────────────────────────── */
        builder
            .addCase(fetchLinks.pending, (state) => {
                state.loading.links = true;
                state.error = null;
            })
            .addCase(fetchLinks.fulfilled, (state, action: PayloadAction<LinksResponse>) => {
                state.loading.links = false;
                state.links = action.payload.links;
                state.pagination.total = action.payload.total;
                state.pagination.totalPages = Math.ceil(action.payload.total / state.pagination.limit);
            })
            .addCase(fetchLinks.rejected, (state, action) => {
                state.loading.links = false;
                state.error = action.payload as string;
            });

        /* ── FETCH LINK BY ID ─────────────────────────────────────────────── */
        builder
            .addCase(fetchLinkById.pending, (state) => {
                state.loading.links = true;
                state.error = null;
            })
            .addCase(fetchLinkById.fulfilled, (state, action: PayloadAction<ExternalLink>) => {
                state.loading.links = false;
                state.selectedLink = action.payload;
            })
            .addCase(fetchLinkById.rejected, (state, action) => {
                state.loading.links = false;
                state.error = action.payload as string;
            });

        /* ── CREATE LINK ──────────────────────────────────────────────────── */
        builder
            .addCase(createLink.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createLink.fulfilled, (state, action: PayloadAction<ExternalLink>) => {
                state.loading.mutating = false;
                state.success = true;
                state.links = [action.payload, ...state.links];
                const category = state.categories.find(c => c.id === action.payload.category_id);
                if (category) category.link_count = (category.link_count ?? 0) + 1;
            })
            .addCase(createLink.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ── UPDATE LINK ──────────────────────────────────────────────────── */
        builder
            .addCase(updateLink.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateLink.fulfilled, (state, action: PayloadAction<ExternalLink>) => {
                state.loading.mutating = false;
                state.success = true;
                const idx = state.links.findIndex(l => l.id === action.payload.id);
                if (idx !== -1) state.links[idx] = action.payload;
                if (state.selectedLink?.id === action.payload.id) state.selectedLink = action.payload;
            })
            .addCase(updateLink.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ── DELETE LINK ──────────────────────────────────────────────────── */
        builder
            .addCase(deleteLink.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(deleteLink.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                state.success = true;
                const deleted = state.links.find(l => l.id === action.payload);
                state.links = state.links.filter(l => l.id !== action.payload);
                if (state.selectedLink?.id === action.payload) state.selectedLink = null;
                if (deleted) {
                    const category = state.categories.find(c => c.id === deleted.category_id);
                    if (category && category.link_count) {
                        category.link_count = Math.max(0, category.link_count - 1);
                    }
                }
            })
            .addCase(deleteLink.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ── TRACK CLICK ──────────────────────────────────────────────────── */
        builder
            .addCase(trackLinkClick.fulfilled, (state, action: PayloadAction<string>) => {
                // Mirror the optimistic increment on confirmed success
                const link = state.links.find(l => l.id === action.payload);
                if (link) {
                    link.click_count += 1;
                    link.last_clicked_at = new Date().toISOString();
                }
            })
            .addCase(trackLinkClick.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        /* ── FETCH STATS ──────────────────────────────────────────────────── */
        builder
            .addCase(fetchLinkStats.pending, (state) => {
                state.loading.stats = true;
                state.error = null;
            })
            .addCase(fetchLinkStats.fulfilled, (state, action: PayloadAction<LinkStats>) => {
                state.loading.stats = false;
                state.stats = action.payload;
            })
            .addCase(fetchLinkStats.rejected, (state, action) => {
                state.loading.stats = false;
                state.error = action.payload as string;
            });
    },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
    setSelectedLink,
    setSelectedCategory,
    setLinkFilters,
    clearLinkFilters,
    setLinkPagination,
    incrementLinkClicks,
    clearLinkError,
    clearLinkSuccess,
    resetLinksState,
} = linksSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ─── Primitive slices (inputs to createSelector) ──────────────────────────────
const selectLinksArray      = (state: RootState) => state.links.links;
const selectCategoriesArray = (state: RootState) => state.links.categories;

// ─── Scalar selectors (return primitives — no memoization needed) ─────────────
export const selectAllLinks         = (state: RootState) => state.links.links;
export const selectAllCategories    = (state: RootState) => state.links.categories;
export const selectLinkStats        = (state: RootState) => state.links.stats;
export const selectSelectedLink     = (state: RootState) => state.links.selectedLink;
export const selectSelectedCategory = (state: RootState) => state.links.selectedCategory;
export const selectLinkFilters      = (state: RootState) => state.links.filters;
export const selectLinkPagination   = (state: RootState) => state.links.pagination;
export const selectLinksLoading     = (state: RootState) => state.links.loading.links;
export const selectCategoriesLoading = (state: RootState) => state.links.loading.categories;
export const selectStatsLoading     = (state: RootState) => state.links.loading.stats;
export const selectMutatingLinks    = (state: RootState) => state.links.loading.mutating;
export const selectLinkError        = (state: RootState) => state.links.error;
export const selectLinkSuccess      = (state: RootState) => state.links.success;
export const selectHasLinks         = (state: RootState) => state.links.links.length > 0;

// ─── Derived selectors (return new references — must be memoized) ─────────────
export const selectFeaturedLinks = createSelector(
    selectLinksArray,
    (links) => links.filter(l => l.is_featured && l.is_active)
);

export const selectActiveLinks = createSelector(
    selectLinksArray,
    (links) => links.filter(l => l.is_active)
);

export const selectCategoriesWithLinks = createSelector(
    selectCategoriesArray,
    selectLinksArray,
    (categories, links) =>
        categories.filter(c =>
            c.is_active && links.some(l => l.category_id === c.id && l.is_active)
        )
);

// Factory selectors: call once outside the component and reuse the instance,
// or use useMemo(() => makeSelectLinksByCategory(id), [id]) inside a component.
export const makeSelectLinksByCategory = (categoryId: string) =>
    createSelector(
        selectLinksArray,
        (links) => links.filter(l => l.category_id === categoryId && l.is_active)
    );

export const makeSelectLinksByTag = (tag: string) =>
    createSelector(
        selectLinksArray,
        (links) => links.filter(l => l.tags.includes(tag) && l.is_active)
    );

export const makeSelectPopularLinks = (limit = 5) =>
    createSelector(
        selectLinksArray,
        (links) =>
            [...links]
                .filter(l => l.is_active)
                .sort((a, b) => b.click_count - a.click_count)
                .slice(0, limit)
    );

export default linksSlice.reducer;