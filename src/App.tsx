// src/App.tsx

import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store/store';
import { refreshAccessToken, setInitializationComplete } from './store/slices/authSlice';
import AppRoutes from './routes/AppRoutes';
import { useSocket } from './socket/client';

const PUBLIC_ROUTES = ['/login', '/orhc-form', '/unauthorized'];

const AppInner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const isInitializing = useSelector((state: RootState) => state.auth.isInitializing);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  
  const { isConnected } = useSocket();
  
  // Use a ref to track if we've already dispatched
  const hasDispatched = useRef(false);

  // Check if current route is public
  const isPublic = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));

  console.log('[AppInner Render] Path:', location.pathname);
  console.log('[AppInner Render] isPublic:', isPublic, 'isInitializing:', isInitializing);

  useEffect(() => {
    console.log('[Auth Lifecycle Effect] Triggered for path:', location.pathname);
    console.log('🚩 Dispatch Ref State:', { hasDispatched: hasDispatched.current });

    // If on public route, mark initialization as complete and skip auth
    if (isPublic) {
      console.log('📍 Public route detected, marking initialization as complete');
      dispatch(setInitializationComplete());
      return;
    }

    // Only dispatch once for protected routes
    if (!hasDispatched.current) {
      hasDispatched.current = true;
      console.log('🔄 Dispatching refreshAccessToken for protected route');
      dispatch(refreshAccessToken());
    }
  }, [dispatch, isPublic, location.pathname]);

  // Log socket connection status (only for authenticated routes)
  useEffect(() => {
    if (accessToken && !isPublic) {
      console.log(`🔌 Socket connection status: ${isConnected ? 'Connected ✅' : 'Connecting... ⏳'}`);
    } else {
      console.log('🚫 Socket status logging skipped (no token or public route).');
    }
  }, [isConnected, accessToken, isPublic]);

  // If we're on a public route, don't show the loading state
  if (isPublic) {
    console.log('🖼️ Render Target: Public Route -> AppRoutes');
    return <AppRoutes />;
  }

  // Show loading only for protected routes
  if (isInitializing) {
    console.log('⏳ Showing loading state for protected route');
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
          <p className="text-sm text-[#5c5144]">Restoring session...</p>
        </div>
      </div>
    );
  }

  console.log('🖼️ Render Target: Protected Route -> AppRoutes');
  return <AppRoutes />;
};

const App: React.FC = () => (
  <Router>
    <AppInner />
  </Router>
);

export default App;