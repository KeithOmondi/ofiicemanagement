// src/components/store/StoreLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import StoreSidebar from './StoreSidebar';
import StoreHeader from './StoreHeader';

const StoreLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-stone-50">
      <StoreSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        <StoreHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StoreLayout;