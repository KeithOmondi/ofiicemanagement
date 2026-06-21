// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import axiosClient from '../../api/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'dept_head' | 'staff' | 'viewer';

export interface UserMetadata {
  id:               string;
  email:            string;
  full_name:        string;
  role:             UserRole;
  department_id:    string | null;
  department_code:  string | null;  // e.g. "FINANCE", "REGISTRY" — drives which desk UI renders
}

interface AuthState {
  user:              UserMetadata | null;
  accessToken:       string | null;
  isLoading:         boolean;
  error:             string | null;
  otpRequested:      boolean;
  isInitializing:    boolean;
  createUserSuccess: boolean;
}

const initialState: AuthState = {
  user:              null,
  accessToken:       null,
  isLoading:         false,
  error:             null,
  otpRequested:      false,
  isInitializing:    true,
  createUserSuccess: false,
};

// ─── Utility ──────────────────────────────────────────────────────────────────

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    return (
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message ||
      'Request failed'
    );
  }
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred';
};

// ─── Permission helpers ───────────────────────────────────────────────────────

const ROLE_RANK: Record<UserRole, number> = {
  viewer:      0,
  staff:       1,
  dept_head:   2,
  super_admin: 3,
};

/** True if the user is super_admin */
export const isSuperAdmin = (user: UserMetadata | null): boolean =>
  user?.role === 'super_admin';

/** True if user's role is at or above minRole */
export const hasRole = (
  user: UserMetadata | null,
  minRole: UserRole
): boolean => {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[minRole];
};

/** True if user belongs to the given department (by ID) */
export const isInDepartment = (
  user: UserMetadata | null,
  departmentId: string
): boolean => {
  if (!user) return false;
  if (user.role === 'super_admin') return true;  // super_admin sees all
  return user.department_id === departmentId;
};

/** True if user has at least minRole AND is in the given department */
export const hasDeptAccess = (
  user: UserMetadata | null,
  departmentId: string,
  minRole: UserRole = 'viewer'
): boolean => {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return user.department_id === departmentId && ROLE_RANK[user.role] >= ROLE_RANK[minRole];
};

/** True if the user's department has the given code (case-insensitive). */
export const hasDepartmentCode = (
  user: UserMetadata | null,
  code: string
): boolean => {
  if (!user?.department_code) return false;
  return user.department_code.toUpperCase() === code.toUpperCase();
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const requestOtp = createAsyncThunk(
  'auth/requestOtp',
  async (pj_number: string, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/auth/request-otp', { pj_number });
      return response.data.message;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (payload: { pj_number: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/auth/verify-otp', payload);
      return response.data as { accessToken: string; user: UserMetadata };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const refreshAccessToken = createAsyncThunk(
  'auth/refreshAccessToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/auth/refresh-token');
      return response.data as { accessToken: string; user: UserMetadata };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await axiosClient.post('/auth/logout');
      return null;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export interface CreateUserPayload {
  full_name:     string;
  email:         string;
  pj_number:     string;
  role:          UserRole;
  department_id: string | null;
}

export const createUser = createAsyncThunk(
  'auth/createUser',
  async (payload: CreateUserPayload, { rejectWithValue }) => {
    try {
      const response = await axiosClient.post('/auth/register-admin', payload);
      return response.data.data as UserMetadata;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    clearAuth: (state) => {
      state.user         = null;
      state.accessToken  = null;
      state.otpRequested = false;
      state.error        = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCreateUserSuccess: (state) => {
      state.createUserSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Request OTP ────────────────────────────────────────────────────────
      .addCase(requestOtp.pending,   (state) => { state.isLoading = true;  state.error = null; })
      .addCase(requestOtp.fulfilled, (state) => { state.isLoading = false; state.otpRequested = true; })
      .addCase(requestOtp.rejected,  (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // ── Verify OTP ─────────────────────────────────────────────────────────
      .addCase(verifyOtp.pending,    (state) => { state.isLoading = true; state.error = null; })
      .addCase(verifyOtp.fulfilled,  (state, action: PayloadAction<{ accessToken: string; user: UserMetadata }>) => {
        state.isLoading    = false;
        state.accessToken  = action.payload.accessToken;
        state.user         = action.payload.user;
        state.otpRequested = false;
      })
      .addCase(verifyOtp.rejected,   (state, action) => { state.isLoading = false; state.error = action.payload as string; })

      // ── Refresh Token ──────────────────────────────────────────────────────
      .addCase(refreshAccessToken.pending,   (state) => { state.isInitializing = true; })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken    = action.payload.accessToken;
        state.user           = action.payload.user;
        state.isInitializing = false;
      })
      .addCase(refreshAccessToken.rejected,  (state) => {
        state.user           = null;
        state.accessToken    = null;
        state.isInitializing = false;
      })

      // ── Logout ─────────────────────────────────────────────────────────────
      .addCase(logoutUser.pending,   (state) => { state.isLoading = true; })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user         = null;
        state.accessToken  = null;
        state.otpRequested = false;
        state.isLoading    = false;
      })
      .addCase(logoutUser.rejected,  (state) => {
        state.user         = null;
        state.accessToken  = null;
        state.otpRequested = false;
        state.isLoading    = false;
      })

      // ── Create User ────────────────────────────────────────────────────────
      .addCase(createUser.pending,   (state) => { state.isLoading = true;  state.error = null; state.createUserSuccess = false; })
      .addCase(createUser.fulfilled, (state) => { state.isLoading = false; state.createUserSuccess = true; })
      .addCase(createUser.rejected,  (state, action) => { state.isLoading = false; state.error = action.payload as string; state.createUserSuccess = false; });
  },
});

export const { setAccessToken, clearAuth, clearError, clearCreateUserSuccess } = authSlice.actions;
export default authSlice.reducer;