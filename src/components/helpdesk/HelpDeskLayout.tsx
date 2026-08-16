import React, { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import HelpDeskSidebar from './HelpDeskSidebar';
import HelpDeskHeader from './HelpDeskHeader';
import ReminderFloatingButton from '../activity/ReminderFloatingButton';

const HelpDeskLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { departmentId } = useParams<{ departmentId: string }>();

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">

      {/* Sidebar — fixed on mobile (overlay), static on lg+ */}
      <HelpDeskSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area — offset by sidebar width on lg+ */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        <HelpDeskHeader onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Floating Reminder Button */}
      <ReminderFloatingButton departmentId={departmentId} />
    </div>
  );
};

export default HelpDeskLayout;