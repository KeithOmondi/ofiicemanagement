// src/components/procurement/PLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import PHeader from './PHeader';
import PSidebar from './PSidebar';

const PLayout: React.FC = () => {
  // false = hidden by default; on lg+ screens CSS keeps it visible via
  // lg:translate-x-0 regardless of this state value.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-stone-50">
      <PSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* lg:pl-64 reserves space for the fixed sidebar on desktop */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        <PHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PLayout;