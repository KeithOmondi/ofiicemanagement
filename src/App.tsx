// src/App.tsx

import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store/store';
import { refreshAccessToken } from './store/slices/authSlice';
import AppRoutes from './routes/AppRoutes';
import { useSocket } from './socket/client';

const AppInner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isInitializing = useSelector((state: RootState) => state.auth.isInitializing);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  
  // ── Initialize Socket Connection ──────────────────────────────────────────
  const { isConnected } = useSocket();

  useEffect(() => {
    dispatch(refreshAccessToken());
  }, [dispatch]);

  // Log socket connection status
  useEffect(() => {
    if (accessToken) {
      console.log(`🔌 Socket connection status: ${isConnected ? 'Connected ✅' : 'Connecting... ⏳'}`);
    }
  }, [isConnected, accessToken]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
          <p className="text-sm text-[#5c5144]">Restoring session...</p>
        </div>
      </div>
    );
  }

  return <AppRoutes />;
};

const App: React.FC = () => (
  <Router>
    <AppInner />
  </Router>
);

export default App;