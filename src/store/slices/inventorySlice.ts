import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */

export interface Category {
    id: string;
    name: string;
    parent_id: string | null;
    case_code: string | null;
    colour: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export type StoreRequestStatus = 'Pending' | 'Approved' | 'Issued' | 'Received' | 'Rejected';
export type ProcurementRequestStatus = 'Pending' | 'Submitted' | 'Approved' | 'Rejected';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type Urgency = 'Normal' | 'Urgent' | 'Critical';

export interface InventoryItem {
    id: string;
    name: string;
    subtitle: string | null;
    category_id: string;
    category?: Category;
    qty_available: number;
    unit: string;
    location: string | null;
    status: StockStatus;
    min_stock_threshold: number;
    created_by: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface StoreRequest {
    id: string;
    item_name: string;
    item_id: string | null;
    quantity: number;
    unit: string;
    reason: string;
    requested_by: string;
    requested_by_name?: string;
    status: StoreRequestStatus;
    approved_by: string | null;
    approved_by_name?: string;
    approved_at: string | null;
    rejection_reason: string | null;
    issued_by: string | null;
    issued_by_name?: string;
    issued_at: string | null;
    received_by: string | null;
    received_by_name?: string;
    received_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProcurementRequest {
    id: string;
    item_name: string;
    category_id: string;
    category?: Category;
    quantity: number;
    unit: string;
    estimated_unit_cost: number | null;
    justification: string;
    urgency: Urgency;
    requested_by: string;
    requested_by_name?: string;
    status: ProcurementRequestStatus;
    approved_by: string | null;
    approved_by_name?: string;
    approved_at: string | null;
    rejection_reason: string | null;
    is_restock: boolean;
    inventory_item_id: string | null;
    memo_url: string | null;
    memo_uploaded_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ApprovedProcurementItem {
    id: string;
    procurement_request_id: string;
    item_name: string;
    category_id: string;
    category?: Category;
    quantity: number;
    unit: string;
    unit_cost_kes: number;
    total_cost_kes: number;
    requested_by: string;
    requested_by_name?: string;
    approved_by: string;
    approved_by_name?: string;
    approved_at: string;
    is_purchased: boolean;
    purchase_date: string | null;
    purchase_reference: string | null;
    created_at: string;
    updated_at: string;
}

export interface ActivityLogEntry {
    id: string;
    icon: string | null;
    title: string;
    description: string | null;
    user_id: string | null;
    user_name?: string;
    entity_type: string | null;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface InventoryStats {
    total_items: number;
    in_stock: number;
    low_stock: number;
    out_of_stock: number;
    pending_store_requests: number;
    pending_procurement_requests: number;
}

export interface CreateInventoryItemInput {
    name: string;
    subtitle?: string;
    category_id: string;
    qty_available?: number;
    unit: string;
    location?: string;
    min_stock_threshold?: number;
}

export interface UpdateInventoryItemInput {
    name?: string;
    subtitle?: string | null;
    category_id?: string;
    qty_available?: number;
    unit?: string;
    location?: string | null;
    min_stock_threshold?: number;
    is_active?: boolean;
}

export interface CreateStoreRequestInput {
    item_name: string;
    quantity: number;
    unit?: string;
    reason: string;
}

export interface UpdateStoreRequestInput {
    status?: 'Approved' | 'Rejected';
    rejection_reason?: string;
}

export interface CreateProcurementRequestInput {
    item_name: string;
    category_id: string;
    quantity: number;
    unit: string;
    estimated_unit_cost?: number;
    justification: string;
    urgency?: Urgency;
    is_restock?: boolean;
    inventory_item_id?: string;
}

export interface UpdateProcurementRequestInput {
    status?: ProcurementRequestStatus;
    rejection_reason?: string;
    estimated_unit_cost?: number;
}

export interface CreateApprovedProcurementInput {
    procurement_request_id: string;
    unit_cost_kes: number;
    purchase_reference?: string;
}

export interface SubmitProcurementMemoInput {
    to: string;
    from: string;
    ref: string;
    date: string;
    subject: string;
    body: string;
    signatoryName: string;
    signatorySignature?: string;
}

interface InventoryState {
    items: InventoryItem[];
    selectedItem: InventoryItem | null;
    categories: Category[];
    storeRequests: StoreRequest[];
    procurementRequests: ProcurementRequest[];
    approvedProcurement: ApprovedProcurementItem[];
    activityLog: ActivityLogEntry[];
    stats: InventoryStats | null;
    loading: {
        items: boolean;
        storeRequests: boolean;
        procurementRequests: boolean;
        approvedProcurement: boolean;
        activityLog: boolean;
        stats: boolean;
        categories: boolean;
        mutating: boolean;
    };
    error: string | null;
    success: boolean;
    filters: {
        category_id: string | null;
        status: string | null;
    };
}

const initialState: InventoryState = {
    items: [],
    selectedItem: null,
    categories: [],
    storeRequests: [],
    procurementRequests: [],
    approvedProcurement: [],
    activityLog: [],
    stats: null,
    loading: {
        items: false,
        storeRequests: false,
        procurementRequests: false,
        approvedProcurement: false,
        activityLog: false,
        stats: false,
        categories: false,
        mutating: false,
    },
    error: null,
    success: false,
    filters: {
        category_id: null,
        status: null,
    },
};

const extractError = (error: unknown): string => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

/* ============================================================
   THUNKS
============================================================ */

export const fetchInventoryStats = createAsyncThunk(
    'inventory/fetchStats',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/inventory/stats');
            return data.data as InventoryStats;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchActivityLog = createAsyncThunk(
    'inventory/fetchActivityLog',
    async (limit: number = 50, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/inventory/activity-log?limit=${limit}`);
            return data.data as ActivityLogEntry[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchCategories = createAsyncThunk(
    'inventory/fetchCategories',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/inventory/categories');
            return data.data as Category[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchInventoryItems = createAsyncThunk(
    'inventory/fetchItems',
    async ({ category_id }: { category_id?: string } = {}, { rejectWithValue }) => {
        try {
            const url = category_id ? `/inventory/items?category_id=${encodeURIComponent(category_id)}` : '/inventory/items';
            const { data } = await axiosClient.get(url);
            return data.data as InventoryItem[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchInventoryItemById = createAsyncThunk(
    'inventory/fetchItemById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/inventory/items/${id}`);
            return data.data as InventoryItem;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const createInventoryItem = createAsyncThunk(
    'inventory/createItem',
    async (input: CreateInventoryItemInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/inventory/items', input);
            return data.data as InventoryItem;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const updateInventoryItem = createAsyncThunk(
    'inventory/updateItem',
    async ({ id, input }: { id: string; input: UpdateInventoryItemInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/inventory/items/${id}`, input);
            return data.data as InventoryItem;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const deleteInventoryItem = createAsyncThunk(
    'inventory/deleteItem',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/inventory/items/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

// ─── Store Requests ─────────────────────────────────────────────────────────

export const fetchMyStoreRequests = createAsyncThunk(
    'inventory/fetchMyStoreRequests',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/inventory/store-requests/my');
            return data.data as StoreRequest[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchAllStoreRequests = createAsyncThunk(
    'inventory/fetchAllStoreRequests',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/inventory/store-requests');
            return data.data as StoreRequest[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchStoreRequestById = createAsyncThunk(
    'inventory/fetchStoreRequestById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/inventory/store-requests/${id}`);
            return data.data as StoreRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const createStoreRequest = createAsyncThunk(
    'inventory/createStoreRequest',
    async (input: CreateStoreRequestInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/inventory/store-requests', input);
            return data.data as StoreRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const updateStoreRequest = createAsyncThunk(
    'inventory/updateStoreRequest',
    async ({ id, input }: { id: string; input: UpdateStoreRequestInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/inventory/store-requests/${id}`, input);
            return data.data as StoreRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const issueStoreRequest = createAsyncThunk(
    'inventory/issueStoreRequest',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/inventory/store-requests/${id}/issue`, {});
            return data.data as StoreRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const receiveStoreRequest = createAsyncThunk(
    'inventory/receiveStoreRequest',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/inventory/store-requests/${id}/receive`, {});
            return data.data as StoreRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const deleteStoreRequest = createAsyncThunk(
    'inventory/deleteStoreRequest',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/inventory/store-requests/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

// ─── Procurement Requests ────────────────────────────────────────────────────

export const fetchMyProcurementRequests = createAsyncThunk(
    'inventory/fetchMyProcurementRequests',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/inventory/procurement-requests/my');
            return data.data as ProcurementRequest[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchAllProcurementRequests = createAsyncThunk(
    'inventory/fetchAllProcurementRequests',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/inventory/procurement-requests');
            return data.data as ProcurementRequest[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchProcurementRequestById = createAsyncThunk(
    'inventory/fetchProcurementRequestById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/inventory/procurement-requests/${id}`);
            return data.data as ProcurementRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const createProcurementRequest = createAsyncThunk(
    'inventory/createProcurementRequest',
    async (input: CreateProcurementRequestInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/inventory/procurement-requests', input);
            return data.data as ProcurementRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const updateProcurementRequest = createAsyncThunk(
    'inventory/updateProcurementRequest',
    async ({ id, input }: { id: string; input: UpdateProcurementRequestInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/inventory/procurement-requests/${id}`, input);
            return data.data as ProcurementRequest;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const deleteProcurementRequest = createAsyncThunk(
    'inventory/deleteProcurementRequest',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosClient.delete(`/inventory/procurement-requests/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

// ─── Memo Submission ─────────────────────────────────────────────────────────

export const submitProcurementMemo = createAsyncThunk(
    'inventory/submitProcurementMemo',
    async ({ id, memoData }: { id: string; memoData: SubmitProcurementMemoInput }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post(`/inventory/procurement-requests/${id}/memo`, memoData);
            return data.data as { memoUrl: string; status: ProcurementRequestStatus };
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

// ─── Approved Procurement ────────────────────────────────────────────────────

export const fetchApprovedProcurement = createAsyncThunk(
    'inventory/fetchApprovedProcurement',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get('/inventory/approved');
            return data.data as ApprovedProcurementItem[];
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const fetchApprovedProcurementById = createAsyncThunk(
    'inventory/fetchApprovedProcurementById',
    async (id: string, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.get(`/inventory/approved/${id}`);
            return data.data as ApprovedProcurementItem;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const createApprovedProcurement = createAsyncThunk(
    'inventory/createApprovedProcurement',
    async (input: CreateApprovedProcurementInput, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.post('/inventory/approved', input);
            return data.data as ApprovedProcurementItem;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

export const markProcurementPurchased = createAsyncThunk(
    'inventory/markProcurementPurchased',
    async ({ id, purchase_reference }: { id: string; purchase_reference?: string }, { rejectWithValue }) => {
        try {
            const { data } = await axiosClient.put(`/inventory/approved/${id}/purchase`, { purchase_reference });
            return data.data as ApprovedProcurementItem;
        } catch (err) {
            return rejectWithValue(extractError(err));
        }
    }
);

/* ============================================================
   SLICE
============================================================ */

const inventorySlice = createSlice({
    name: 'inventory',
    initialState,
    reducers: {
        setSelectedItem(state, action: PayloadAction<InventoryItem | null>) {
            state.selectedItem = action.payload;
            state.error = null;
        },
        setInventoryFilter(state, action: PayloadAction<{ category_id?: string | null; status?: string | null }>) {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearInventoryFilters(state) {
            state.filters = { category_id: null, status: null };
        },
        clearError(state) {
            state.error = null;
        },
        clearSuccess(state) {
            state.success = false;
        },
        resetInventoryState: () => initialState,
        updateItemQuantityLocally(state, action: PayloadAction<{ itemId: string; quantity: number }>) {
            const { itemId, quantity } = action.payload;
            const item = state.items.find(i => i.id === itemId);
            if (item) {
                item.qty_available = quantity;
                if (quantity <= 0) item.status = 'out_of_stock';
                else if (quantity <= item.min_stock_threshold) item.status = 'low_stock';
                else item.status = 'in_stock';
            }
            if (state.selectedItem?.id === itemId) {
                state.selectedItem.qty_available = quantity;
            }
        },
        addStoreRequestLocally(state, action: PayloadAction<StoreRequest>) {
            state.storeRequests = [action.payload, ...state.storeRequests];
        },
        updateStoreRequestStatusLocally(state, action: PayloadAction<{ id: string; status: StoreRequestStatus }>) {
            const { id, status } = action.payload;
            const request = state.storeRequests.find(r => r.id === id);
            if (request) {
                request.status = status;
            }
        },
        // Local update for procurement request (e.g., after memo submission)
        updateProcurementRequestLocally(state, action: PayloadAction<ProcurementRequest>) {
            const index = state.procurementRequests.findIndex(r => r.id === action.payload.id);
            if (index !== -1) {
                state.procurementRequests[index] = action.payload;
            }
        },
    },
    extraReducers: (builder) => {
        /* ---------- FETCH STATS ---------- */
        builder
            .addCase(fetchInventoryStats.pending, (state) => {
                state.loading.stats = true;
                state.error = null;
            })
            .addCase(fetchInventoryStats.fulfilled, (state, action: PayloadAction<InventoryStats>) => {
                state.loading.stats = false;
                state.stats = action.payload;
            })
            .addCase(fetchInventoryStats.rejected, (state, action) => {
                state.loading.stats = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH ACTIVITY LOG ---------- */
        builder
            .addCase(fetchActivityLog.pending, (state) => {
                state.loading.activityLog = true;
                state.error = null;
            })
            .addCase(fetchActivityLog.fulfilled, (state, action: PayloadAction<ActivityLogEntry[]>) => {
                state.loading.activityLog = false;
                state.activityLog = action.payload;
            })
            .addCase(fetchActivityLog.rejected, (state, action) => {
                state.loading.activityLog = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH CATEGORIES ---------- */
        builder
            .addCase(fetchCategories.pending, (state) => {
                state.loading.categories = true;
                state.error = null;
            })
            .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
                state.loading.categories = false;
                const uniqueCategories = Array.from(
                    new Map(action.payload.map(c => [c.id, c])).values()
                );
                state.categories = uniqueCategories;
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.loading.categories = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH INVENTORY ITEMS ---------- */
        builder
            .addCase(fetchInventoryItems.pending, (state) => {
                state.loading.items = true;
                state.error = null;
            })
            .addCase(fetchInventoryItems.fulfilled, (state, action: PayloadAction<InventoryItem[]>) => {
                state.loading.items = false;
                state.items = action.payload;
            })
            .addCase(fetchInventoryItems.rejected, (state, action) => {
                state.loading.items = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH INVENTORY ITEM BY ID ---------- */
        builder
            .addCase(fetchInventoryItemById.pending, (state) => {
                state.loading.items = true;
                state.error = null;
            })
            .addCase(fetchInventoryItemById.fulfilled, (state, action: PayloadAction<InventoryItem>) => {
                state.loading.items = false;
                state.selectedItem = action.payload;
            })
            .addCase(fetchInventoryItemById.rejected, (state, action) => {
                state.loading.items = false;
                state.error = action.payload as string;
            });

        /* ---------- CREATE INVENTORY ITEM ---------- */
        builder
            .addCase(createInventoryItem.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createInventoryItem.fulfilled, (state, action: PayloadAction<InventoryItem>) => {
                state.loading.mutating = false;
                state.success = true;
                state.items = [action.payload, ...state.items];
                if (state.stats) {
                    state.stats.total_items += 1;
                    if (action.payload.status === 'in_stock') state.stats.in_stock += 1;
                    else if (action.payload.status === 'low_stock') state.stats.low_stock += 1;
                    else state.stats.out_of_stock += 1;
                }
            })
            .addCase(createInventoryItem.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- UPDATE INVENTORY ITEM ---------- */
        builder
            .addCase(updateInventoryItem.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateInventoryItem.fulfilled, (state, action: PayloadAction<InventoryItem>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.items.findIndex(i => i.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
                if (state.selectedItem?.id === action.payload.id) {
                    state.selectedItem = action.payload;
                }
            })
            .addCase(updateInventoryItem.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- DELETE INVENTORY ITEM ---------- */
        builder
            .addCase(deleteInventoryItem.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
            })
            .addCase(deleteInventoryItem.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                state.items = state.items.filter(i => i.id !== action.payload);
                if (state.selectedItem?.id === action.payload) {
                    state.selectedItem = null;
                }
                if (state.stats) {
                    state.stats.total_items -= 1;
                }
            })
            .addCase(deleteInventoryItem.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH MY STORE REQUESTS ---------- */
        builder
            .addCase(fetchMyStoreRequests.pending, (state) => {
                state.loading.storeRequests = true;
                state.error = null;
            })
            .addCase(fetchMyStoreRequests.fulfilled, (state, action: PayloadAction<StoreRequest[]>) => {
                state.loading.storeRequests = false;
                state.storeRequests = action.payload;
            })
            .addCase(fetchMyStoreRequests.rejected, (state, action) => {
                state.loading.storeRequests = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH ALL STORE REQUESTS ---------- */
        builder
            .addCase(fetchAllStoreRequests.pending, (state) => {
                state.loading.storeRequests = true;
                state.error = null;
            })
            .addCase(fetchAllStoreRequests.fulfilled, (state, action: PayloadAction<StoreRequest[]>) => {
                state.loading.storeRequests = false;
                state.storeRequests = action.payload;
            })
            .addCase(fetchAllStoreRequests.rejected, (state, action) => {
                state.loading.storeRequests = false;
                state.error = action.payload as string;
            });

        /* ---------- CREATE STORE REQUEST ---------- */
        builder
            .addCase(createStoreRequest.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createStoreRequest.fulfilled, (state, action: PayloadAction<StoreRequest>) => {
                state.loading.mutating = false;
                state.success = true;
                state.storeRequests = [action.payload, ...state.storeRequests];
                if (state.stats) {
                    state.stats.pending_store_requests += 1;
                }
            })
            .addCase(createStoreRequest.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- UPDATE STORE REQUEST ---------- */
        builder
            .addCase(updateStoreRequest.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateStoreRequest.fulfilled, (state, action: PayloadAction<StoreRequest>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.storeRequests.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.storeRequests[index] = action.payload;
                }
                if (state.stats) {
                    state.stats.pending_store_requests = state.storeRequests.filter(r => r.status === 'Pending').length;
                }
            })
            .addCase(updateStoreRequest.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- ISSUE STORE REQUEST ---------- */
        builder
            .addCase(issueStoreRequest.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(issueStoreRequest.fulfilled, (state, action: PayloadAction<StoreRequest>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.storeRequests.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.storeRequests[index] = action.payload;
                }
                const item = state.items.find(i => i.id === action.payload.item_id);
                if (item) {
                    const newQty = item.qty_available - action.payload.quantity;
                    state.items = state.items.map(i =>
                        i.id === item.id
                            ? { ...i, qty_available: newQty, status: newQty <= 0 ? 'out_of_stock' : newQty < i.min_stock_threshold ? 'low_stock' : 'in_stock' }
                            : i
                    );
                    if (state.selectedItem?.id === item.id) {
                        state.selectedItem = { ...state.selectedItem, qty_available: newQty };
                    }
                }
                if (state.stats) {
                    state.stats.pending_store_requests = state.storeRequests.filter(r => r.status === 'Pending').length;
                }
            })
            .addCase(issueStoreRequest.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- RECEIVE STORE REQUEST ---------- */
        builder
            .addCase(receiveStoreRequest.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(receiveStoreRequest.fulfilled, (state, action: PayloadAction<StoreRequest>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.storeRequests.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.storeRequests[index] = action.payload;
                }
            })
            .addCase(receiveStoreRequest.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- DELETE STORE REQUEST ---------- */
        builder
            .addCase(deleteStoreRequest.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
            })
            .addCase(deleteStoreRequest.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                state.storeRequests = state.storeRequests.filter(r => r.id !== action.payload);
                if (state.stats) {
                    state.stats.pending_store_requests = state.storeRequests.filter(r => r.status === 'Pending').length;
                }
            })
            .addCase(deleteStoreRequest.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH MY PROCUREMENT REQUESTS ---------- */
        builder
            .addCase(fetchMyProcurementRequests.pending, (state) => {
                state.loading.procurementRequests = true;
                state.error = null;
            })
            .addCase(fetchMyProcurementRequests.fulfilled, (state, action: PayloadAction<ProcurementRequest[]>) => {
                state.loading.procurementRequests = false;
                state.procurementRequests = action.payload;
            })
            .addCase(fetchMyProcurementRequests.rejected, (state, action) => {
                state.loading.procurementRequests = false;
                state.error = action.payload as string;
            });

        /* ---------- FETCH ALL PROCUREMENT REQUESTS ---------- */
        builder
            .addCase(fetchAllProcurementRequests.pending, (state) => {
                state.loading.procurementRequests = true;
                state.error = null;
            })
            .addCase(fetchAllProcurementRequests.fulfilled, (state, action: PayloadAction<ProcurementRequest[]>) => {
                state.loading.procurementRequests = false;
                state.procurementRequests = action.payload;
            })
            .addCase(fetchAllProcurementRequests.rejected, (state, action) => {
                state.loading.procurementRequests = false;
                state.error = action.payload as string;
            });

        /* ---------- CREATE PROCUREMENT REQUEST ---------- */
        builder
            .addCase(createProcurementRequest.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createProcurementRequest.fulfilled, (state, action: PayloadAction<ProcurementRequest>) => {
                state.loading.mutating = false;
                state.success = true;
                state.procurementRequests = [action.payload, ...state.procurementRequests];
                if (state.stats) {
                    state.stats.pending_procurement_requests += 1;
                }
            })
            .addCase(createProcurementRequest.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- UPDATE PROCUREMENT REQUEST ---------- */
        builder
            .addCase(updateProcurementRequest.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateProcurementRequest.fulfilled, (state, action: PayloadAction<ProcurementRequest>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.procurementRequests.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.procurementRequests[index] = action.payload;
                }
                if (state.stats) {
                    state.stats.pending_procurement_requests = state.procurementRequests.filter(r => r.status === 'Pending').length;
                }
            })
            .addCase(updateProcurementRequest.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- DELETE PROCUREMENT REQUEST ---------- */
        builder
            .addCase(deleteProcurementRequest.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
            })
            .addCase(deleteProcurementRequest.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading.mutating = false;
                state.procurementRequests = state.procurementRequests.filter(r => r.id !== action.payload);
                if (state.stats) {
                    state.stats.pending_procurement_requests = state.procurementRequests.filter(r => r.status === 'Pending').length;
                }
            })
            .addCase(deleteProcurementRequest.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
            });

        /* ---------- SUBMIT PROCUREMENT MEMO ---------- */
        builder
            .addCase(submitProcurementMemo.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(submitProcurementMemo.fulfilled, (state, action) => {
                state.loading.mutating = false;
                state.success = true;
                const { id } = action.meta.arg;
                const request = state.procurementRequests.find(r => r.id === id);
                if (request) {
                    request.status = 'Submitted';
                    request.memo_url = action.payload.memoUrl;
                    request.memo_uploaded_at = new Date().toISOString();
                }
                if (state.stats) {
                    state.stats.pending_procurement_requests = state.procurementRequests.filter(r => r.status === 'Pending').length;
                }
            })
            .addCase(submitProcurementMemo.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- FETCH APPROVED PROCUREMENT ---------- */
        builder
            .addCase(fetchApprovedProcurement.pending, (state) => {
                state.loading.approvedProcurement = true;
                state.error = null;
            })
            .addCase(fetchApprovedProcurement.fulfilled, (state, action: PayloadAction<ApprovedProcurementItem[]>) => {
                state.loading.approvedProcurement = false;
                state.approvedProcurement = action.payload;
            })
            .addCase(fetchApprovedProcurement.rejected, (state, action) => {
                state.loading.approvedProcurement = false;
                state.error = action.payload as string;
            });

        /* ---------- CREATE APPROVED PROCUREMENT ---------- */
        builder
            .addCase(createApprovedProcurement.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(createApprovedProcurement.fulfilled, (state, action: PayloadAction<ApprovedProcurementItem>) => {
                state.loading.mutating = false;
                state.success = true;
                state.approvedProcurement = [action.payload, ...state.approvedProcurement];
            })
            .addCase(createApprovedProcurement.rejected, (state, action) => {
                state.loading.mutating = false;
                state.error = action.payload as string;
                state.success = false;
            });

        /* ---------- MARK PROCUREMENT PURCHASED ---------- */
        builder
            .addCase(markProcurementPurchased.pending, (state) => {
                state.loading.mutating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(markProcurementPurchased.fulfilled, (state, action: PayloadAction<ApprovedProcurementItem>) => {
                state.loading.mutating = false;
                state.success = true;
                const index = state.approvedProcurement.findIndex(i => i.id === action.payload.id);
                if (index !== -1) {
                    state.approvedProcurement[index] = action.payload;
                }
            })
            .addCase(markProcurementPurchased.rejected, (state, action) => {
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
    setSelectedItem,
    setInventoryFilter,
    clearInventoryFilters,
    clearError,
    clearSuccess,
    resetInventoryState,
    updateItemQuantityLocally,
    addStoreRequestLocally,
    updateStoreRequestStatusLocally,
    updateProcurementRequestLocally,
} = inventorySlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectInventoryItems = (state: { inventory: InventoryState }) => state.inventory.items;
export const selectSelectedItem = (state: { inventory: InventoryState }) => state.inventory.selectedItem;
export const selectCategories = (state: { inventory: InventoryState }) => state.inventory.categories;
export const selectStoreRequests = (state: { inventory: InventoryState }) => state.inventory.storeRequests;
export const selectProcurementRequests = (state: { inventory: InventoryState }) => state.inventory.procurementRequests;
export const selectApprovedProcurement = (state: { inventory: InventoryState }) => state.inventory.approvedProcurement;
export const selectActivityLog = (state: { inventory: InventoryState }) => state.inventory.activityLog;
export const selectInventoryStats = (state: { inventory: InventoryState }) => state.inventory.stats;
export const selectInventoryError = (state: { inventory: InventoryState }) => state.inventory.error;
export const selectInventorySuccess = (state: { inventory: InventoryState }) => state.inventory.success;
export const selectInventoryFilters = (state: { inventory: InventoryState }) => state.inventory.filters;

export const selectInventoryItemsLoading = (state: { inventory: InventoryState }) => state.inventory.loading.items;
export const selectStoreRequestsLoading = (state: { inventory: InventoryState }) => state.inventory.loading.storeRequests;
export const selectProcurementRequestsLoading = (state: { inventory: InventoryState }) => state.inventory.loading.procurementRequests;
export const selectApprovedProcurementLoading = (state: { inventory: InventoryState }) => state.inventory.loading.approvedProcurement;
export const selectActivityLogLoading = (state: { inventory: InventoryState }) => state.inventory.loading.activityLog;
export const selectInventoryStatsLoading = (state: { inventory: InventoryState }) => state.inventory.loading.stats;
export const selectCategoriesLoading = (state: { inventory: InventoryState }) => state.inventory.loading.categories;
export const selectInventoryMutating = (state: { inventory: InventoryState }) => state.inventory.loading.mutating;

export const selectItemsByCategoryId = (categoryId: string) => (state: { inventory: InventoryState }) =>
    state.inventory.items.filter(i => i.category_id === categoryId);

export const selectItemsByStatus = (status: StockStatus) => (state: { inventory: InventoryState }) =>
    state.inventory.items.filter(i => i.status === status);

export const selectPendingStoreRequests = (state: { inventory: InventoryState }) =>
    state.inventory.storeRequests.filter(r => r.status === 'Pending');

export const selectApprovedStoreRequests = (state: { inventory: InventoryState }) =>
    state.inventory.storeRequests.filter(r => r.status === 'Approved');

export const selectIssuedStoreRequests = (state: { inventory: InventoryState }) =>
    state.inventory.storeRequests.filter(r => r.status === 'Issued');

export const selectReceivedStoreRequests = (state: { inventory: InventoryState }) =>
    state.inventory.storeRequests.filter(r => r.status === 'Received');

export const selectPendingProcurementRequests = (state: { inventory: InventoryState }) =>
    state.inventory.procurementRequests.filter(r => r.status === 'Pending');

export const selectApprovedProcurementTotal = (state: { inventory: InventoryState }) =>
    state.inventory.approvedProcurement.reduce((sum, item) => sum + item.total_cost_kes, 0);

// New selector: get a procurement request by ID
export const selectProcurementRequestById = (id: string) => (state: { inventory: InventoryState }) =>
    state.inventory.procurementRequests.find(r => r.id === id);

export default inventorySlice.reducer;