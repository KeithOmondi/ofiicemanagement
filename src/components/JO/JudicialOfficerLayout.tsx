// src/components/layout/JudicialOfficerLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import JudicialOfficerSidebar from './JudicialOfficerSidebar';
import JudicialOfficerHeader from './JudicialOfficerHeader';

export const JudicialOfficerLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 font-sans antialiased">
      <JudicialOfficerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col min-h-screen lg:pl-64">
        <JudicialOfficerHeader onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default JudicialOfficerLayout;