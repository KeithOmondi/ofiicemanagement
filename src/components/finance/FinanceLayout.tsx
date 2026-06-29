// src/components/finance/FinanceLayout.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import FinanceHeader from './FinanceHeader';
import FinanceSidebar from './FinanceSidebar';

const FinanceLayout: React.FC = () => {
  // On desktop the sidebar is always visible; on mobile it starts closed.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close on Escape key — safe because setSidebarOpen is called inside the
  // event callback, not synchronously in the effect body.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Route-change auto-close is NOT done via useEffect (that triggers the
  // cascading-render warning). Instead, every SidebarLink already calls
  // onClose via its onClick prop, so navigating closes the drawer naturally
  // through the user interaction that caused the route change.

  const openSidebar  = useCallback(() => setSidebarOpen(true),  []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50">

      {/* ── Sidebar ─────────────────────────────────────────────────────────
          On lg+ it is always on-screen (lg:translate-x-0 inside FinanceSidebar).
          On mobile it slides in/out based on sidebarOpen.
      ──────────────────────────────────────────────────────────────────── */}
      <FinanceSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {/*
        lg:ml-64 pushes content right of the always-visible desktop sidebar.
        On mobile (no ml) content fills full width; sidebar overlays on top.
      */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
        <FinanceHeader onMenuToggle={openSidebar} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FinanceLayout;