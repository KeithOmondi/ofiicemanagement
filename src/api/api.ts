// src/api/api.ts
import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { UnknownAction } from '@reduxjs/toolkit';
import { clearAuth, setAccessToken } from '../store/slices/authSlice';

// A strict structural interface for the slice fields we care about reading dynamically
interface SharedStoreStructure {
  getState: () => {
    auth: {
      accessToken: string | null;
    };
  };
  dispatch: (action: UnknownAction) => UnknownAction; // Safely typed using RTK core action signatures
}

// Replace the 'any' flag with our structural interface signature safely
let storeRef: SharedStoreStructure | null = null;

export const injectStore = (store: SharedStoreStructure): void => {
  storeRef = store;
};

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/* ============================================================
   1. REQUEST INTERCEPTOR
============================================================ */
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Skip adding auth token for public routes
    if (config.url?.includes('/public/')) {
      return config;
    }

    const accessToken = storeRef?.getState().auth.accessToken;
    
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ============================================================
   2. RESPONSE INTERCEPTOR (AUTOMATIC TOKEN REFRESH)
============================================================ */
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Skip token refresh for:
    // 1. Public routes (they don't need auth)
    // 2. Refresh token requests (to avoid infinite loops)
    const isPublicRoute = originalRequest.url?.includes('/public/');
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh-token');

    // If it's a public route or refresh request, reject without trying to refresh
    if (isPublicRoute || isRefreshRequest) {
      return Promise.reject(error);
    }

    // Only handle 401 errors and only retry once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const response = await axios.post(
          `${axiosClient.defaults.baseURL}/auth/refresh-token`,
          {},
          { 
            withCredentials: true, 
            timeout: 10000,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          }
        );

        const { accessToken } = response.data;

        // Update the stored token
        if (storeRef) {
          storeRef.dispatch(setAccessToken(accessToken) as UnknownAction);
        }

        // Update the original request with the new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Retry the original request
        return axiosClient(originalRequest as InternalAxiosRequestConfig);
      } catch (refreshError) {
        // If refresh fails, clear auth and reject
        if (storeRef) {
          storeRef.dispatch(clearAuth() as UnknownAction);
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;