// src/components/staff/StaffSidebar.tsx
import React from 'react';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Settings,
  LogOut,
  X,
  Home,
  Bell,
  Folder,
  Calendar,
  Workflow,
  HelpCircle,
  Tickets,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { logoutUser } from '../../store/slices/authSlice';
import { selectAllDepartments } from '../../store/slices/departmentsSlice';
import { getStaffDeptFlags } from '../../utils/staffDept';

interface StaffSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  tab: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const StaffSidebar: React.FC<StaffSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const departments = useAppSelector(selectAllDepartments);

  // Resolve the real base path from the current URL
  const match = useMatch('/dept/:deptId/*');
  const base = match ? `/dept/${match.params.deptId}` : '';

  // Same department lookup DeptDeskGateway uses, so the routes it registers
  // and the nav items shown here never drift out of sync.
  const department = departments.find((d) => d.id === user?.department_id);
  const { isHelpdeskStaff } = getStaffDeptFlags(department?.name);

  // Grouped into sections, mirroring the Help Desk sidebar's
  // OVERVIEW / WORKSPACE / COMMUNICATION / SYSTEM style breakdown.
  const sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { to: `${base}/dashboard`, label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, tab: 'dashboard' },
        // Department-scoped: only shown to staff in the Helpdesk department,
        // matching the routes gated in DeptDeskGateway.
        ...(isHelpdeskStaff
          ? [
              { to: `${base}/help-desk`, label: 'Help Desk', icon: <HelpCircle className="h-4 w-4" />, tab: 'help' },
              { to: `${base}/helpdesk-tickets`, label: 'Tickets', icon: <Tickets className="h-4 w-4" />, tab: 'tickets' },
            ]
          : []),
        { to: `${base}/documents`, label: 'Documents', icon: <Folder className="h-4 w-4" />, tab: 'documents' },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { to: `${base}/inventory`, label: 'Staff Inventory', icon: <Package className="h-4 w-4" />, tab: 'inventory' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { to: `${base}/messages`, label: 'Messages', icon: <MessageSquare className="h-4 w-4" />, tab: 'messages' },
        { to: `${base}/notices`, label: 'Notices', icon: <Bell className="h-4 w-4" />, tab: 'notices' },
      ],
    },

    {
      title: 'Planning',
      items: [
        { to: `${base}/calendar`, label: 'Calendar', icon: <Calendar className="h-4 w-4" />, tab: 'calendar' },
        { to: `${base}/tasks`, label: 'Tasks', icon: <Workflow className="h-4 w-4" />, tab: 'tasks' },
      ],
    },

    {
      title: 'System',
      items: [
        { to: `${base}/settings`, label: 'Settings', icon: <Settings className="h-4 w-4" />, tab: 'settings' },
      ],
    },
  ];

  const handleTabClick = (tab: string) => {
    onTabChange(tab);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const roleLabel: Record<string, string> = {
    super_admin: 'Registrar',
    dept_head: 'Department Head',
    staff: 'Staff Officer',
    viewer: 'Viewer',
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-200 bg-white shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding */}
        <div className="flex h-16 lg:h-20 items-center justify-between border-b border-stone-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E4620] to-[#2d6a2f] text-[#C29B38] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight text-stone-900">Staff Portal</h2>
              <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">Office of the Registrar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-stone-500 hover:bg-stone-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-6">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = activeTab === item.tab;
                  return (
                    <Link
                      key={item.tab}
                      to={item.to}
                      onClick={() => handleTabClick(item.tab)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-[#1E4620] text-white shadow-md'
                          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 group'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-600 transition-colors'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-stone-100 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[#1E4620] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-900 truncate">
                {user?.full_name ?? 'Unknown'}
              </p>
              <p className="text-[10px] text-stone-500 truncate">
                {user?.role ? roleLabel[user.role] : 'Staff Officer'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default StaffSidebar;