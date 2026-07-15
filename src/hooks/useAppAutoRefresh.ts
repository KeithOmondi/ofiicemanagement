// src/hooks/useAppAutoRefresh.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '../store/hook';
import {
  fetchDocuments,
  fetchMyMarked,
  fetchReceivedDocuments,
} from '../store/slices/documentSlice';

interface UseAppAutoRefreshOptions {
  /** Interval in milliseconds (default: 5000) */
  interval?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Callback fired after each refresh */
  onRefresh?: () => void;
}

export const useAppAutoRefresh = ({
  interval = 5000,
  enabled = true,
  onRefresh,
}: UseAppAutoRefreshOptions = {}) => {
  const dispatch = useAppDispatch();
  const isRefreshing = useRef(false);

  const refresh = useCallback(() => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    // Fetch all data that should stay fresh across the app.
    // You can add more thunks here (e.g., notifications, users, etc.)
    Promise.all([
      dispatch(fetchDocuments({ page: 1, limit: 50 })), // adjust as needed
      dispatch(fetchMyMarked()),
      dispatch(fetchReceivedDocuments()),
      // dispatch(fetchNotifications()), // uncomment if you have a notification slice
    ]).finally(() => {
      isRefreshing.current = false;
      if (onRefresh) onRefresh();
    });
  }, [dispatch, onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    refresh(); // initial fetch
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [enabled, interval, refresh]);
};