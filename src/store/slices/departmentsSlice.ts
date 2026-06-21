// src/store/slices/departmentsSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';
import type {
  Department,
  DepartmentWithUserCount,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from '../../types/departments.types';

// Re-export types for convenience
export type { Department, DepartmentWithUserCount, CreateDepartmentInput, UpdateDepartmentInput };

/* ============================================================
   STATE TYPES
============================================================ */

export interface DepartmentFilters {
  search?: string;
  is_active?: boolean;
}

export interface DepartmentState {
  departments: DepartmentWithUserCount[];
  selectedDepartment: DepartmentWithUserCount | null;
  filters: DepartmentFilters;
  loading: {
    list: boolean;
    detail: boolean;
    mutating: boolean;
  };
  error: string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: DepartmentState = {
  departments: [],
  selectedDepartment: null,
  filters: {},
  loading: {
    list: false,
    detail: false,
    mutating: false,
  },
  error: null,
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
   ASYNC THUNKS
============================================================ */

export const fetchDepartments = createAsyncThunk(
  'departments/fetchAll',
  async (filters: DepartmentFilters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await axiosClient.get(`/departments${query}`);
      return response.data.data as DepartmentWithUserCount[];
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const fetchDepartmentById = createAsyncThunk(
  'departments/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get(`/departments/${id}`);
      return response.data.data as DepartmentWithUserCount;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const createDepartment = createAsyncThunk(
  'departments/create',
  async (data: CreateDepartmentInput, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/departments', data);
      return response.data.data as DepartmentWithUserCount;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const updateDepartment = createAsyncThunk(
  'departments/update',
  async ({ id, data }: { id: string; data: UpdateDepartmentInput }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.put(`/departments/${id}`, data);
      return response.data.data as DepartmentWithUserCount;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  'departments/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/departments/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const departmentsSlice = createSlice({
  name: 'departments',
  initialState,
  reducers: {
    setDepartmentFilters(state, action: PayloadAction<DepartmentFilters>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetDepartmentFilters(state) {
      state.filters = {};
    },
    setSelectedDepartment(state, action: PayloadAction<DepartmentWithUserCount>) {
      state.selectedDepartment = action.payload;
    },
    clearSelectedDepartment(state) {
      state.selectedDepartment = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearSuccess(state) {
      state.success = false;
    },
    resetDepartmentState: () => initialState,
  },
  extraReducers: (builder) => {
    // ---------- FETCH ALL ----------
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.loading.list = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action: PayloadAction<DepartmentWithUserCount[]>) => {
        state.loading.list = false;
        state.departments = action.payload;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading.list = false;
        state.error = action.payload as string;
      });

    // ---------- FETCH BY ID ----------
    builder
      .addCase(fetchDepartmentById.pending, (state) => {
        state.loading.detail = true;
        state.error = null;
      })
      .addCase(fetchDepartmentById.fulfilled, (state, action: PayloadAction<DepartmentWithUserCount>) => {
        state.loading.detail = false;
        state.selectedDepartment = action.payload;
      })
      .addCase(fetchDepartmentById.rejected, (state, action) => {
        state.loading.detail = false;
        state.error = action.payload as string;
      });

    // ---------- CREATE ----------
    builder
      .addCase(createDepartment.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createDepartment.fulfilled, (state, action: PayloadAction<DepartmentWithUserCount>) => {
        state.loading.mutating = false;
        state.success = true;
        state.departments = [action.payload, ...state.departments];
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ---------- UPDATE ----------
    builder
      .addCase(updateDepartment.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateDepartment.fulfilled, (state, action: PayloadAction<DepartmentWithUserCount>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.departments.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) state.departments[index] = action.payload;
        if (state.selectedDepartment?.id === action.payload.id) {
          state.selectedDepartment = action.payload;
        }
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    // ---------- DELETE ----------
    builder
      .addCase(deleteDepartment.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(deleteDepartment.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.success = true;
        state.departments = state.departments.filter((d) => d.id !== action.payload);
        if (state.selectedDepartment?.id === action.payload) {
          state.selectedDepartment = null;
        }
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
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
  setDepartmentFilters,
  resetDepartmentFilters,
  setSelectedDepartment,
  clearSelectedDepartment,
  clearError,
  clearSuccess,
  resetDepartmentState,
} = departmentsSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectAllDepartments = (state: { departments: DepartmentState }) =>
  state.departments.departments;

export const selectSelectedDepartment = (state: { departments: DepartmentState }) =>
  state.departments.selectedDepartment;

export const selectDepartmentFilters = (state: { departments: DepartmentState }) =>
  state.departments.filters;

export const selectDepartmentsLoading = (state: { departments: DepartmentState }) =>
  state.departments.loading;

export const selectDepartmentsListLoading = (state: { departments: DepartmentState }) =>
  state.departments.loading.list;

export const selectDepartmentDetailLoading = (state: { departments: DepartmentState }) =>
  state.departments.loading.detail;

export const selectDepartmentMutating = (state: { departments: DepartmentState }) =>
  state.departments.loading.mutating;

export const selectDepartmentsError = (state: { departments: DepartmentState }) =>
  state.departments.error;

export const selectDepartmentsSuccess = (state: { departments: DepartmentState }) =>
  state.departments.success;

export const selectDepartmentById = (id: string) =>
  createSelector(
    [selectAllDepartments],
    (departments) => departments.find((d) => d.id === id) ?? null
  );

export default departmentsSlice.reducer;