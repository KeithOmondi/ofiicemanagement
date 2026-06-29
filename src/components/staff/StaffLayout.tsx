// src/components/staff/StaffLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import StaffHeader from './StaffHeader';
import StaffSidebar from './StaffSidebar';
import { useAppSelector } from '../../store/hook';

interface StaffLayoutProps {
  children?: React.ReactNode;
}

// Must match the actual rendered width of StaffSidebar (its fixed-position
// panel width, e.g. `w-64` = 16rem = 256px). If StaffSidebar's width ever
// changes, update this constant alongside it.
const SIDEBAR_WIDTH_CLASS = 'lg:pl-64';

const StaffLayout: React.FC<StaffLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Get user from Redux
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <StaffHeader
        onMenuToggle={toggleSidebar}
        isMenuOpen={isSidebarOpen}
        userName={user?.full_name || "Staff Member"}
        userRole={user?.role || "Staff"}
        notificationCount={3}
      />

      {/* Main Content Area */}
      <div className="flex">
        {/* Sidebar — rendered fixed-position internally, so it does NOT take
            up space in this flex row. We compensate with padding on <main>
            below rather than relying on flex to push content over. */}
        <StaffSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Main Content */}
        <main
          className={`
            flex-1 min-w-0 transition-all duration-300 ease-in-out
            ${isMobile ? 'p-4' : `p-6 ${SIDEBAR_WIDTH_CLASS}`}
          `}
        >
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb - Optional */}
            <div className="mb-4 md:mb-6">
              <nav className="flex items-center gap-2 text-sm">
                <span className="text-stone-500">Home</span>
                <span className="text-stone-300">/</span>
                <span className="text-stone-500">Staff</span>
                <span className="text-stone-300">/</span>
                <span className="font-medium text-stone-800 capitalize">
                  {activeTab}
                </span>
              </nav>
            </div>

            {/* Page Content */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-4 md:p-6">
                {children || <Outlet />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;