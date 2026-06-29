// src/Route/DeptDeskGateway.tsx
import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useMatch } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hook';

import {
  fetchDepartments,
  selectAllDepartments,
  selectDepartmentsListLoading,
} from '../store/slices/departmentsSlice';

import AdmDeskLayout from '../components/admdesk/AdmDeskLayout';
import AdminDashboard from '../pages/admdesk/AdminDashboard';
import AdminDocs from '../pages/admdesk/AdminDocs';

import FinanceLayout from '../components/finance/FinanceLayout';
import FinanceDashboard from '../pages/finance/FinanceDashboard';
import FinanceInventory from '../pages/finance/FinanceInventory';
import FinanceMessages from '../pages/finance/FinanceMessages';

import PDashboard from '../pages/procurement/PDashboard';
import PInventory from '../pages/procurement/PInventory';
import PLayout from '../components/Procurement/PLayout';

// ─── Staff views ──────────────────────────────────────────────────────────────
import StaffLayout from '../components/staff/StaffLayout';
import StaffDashboard from '../pages/staff/StaffDashboard';
import StaffInventory from '../pages/staff/StaffInventory';
import FinanceTransactions from '../pages/finance/FinanceTransactions';
import FinancePayments from '../pages/finance/FinancePayments';
import FinanceExpenses from '../pages/finance/FinanceExpenses';
import StaffMeesages from '../pages/staff/StaffMeesages';
import HelpDeskLayout from '../components/helpdesk/HelpDeskLayout';
import HelpDeskDashboard from '../pages/helpdesk/HelpDeskDashboard';
import Helpdesk from '../pages/helpdesk/Helpdesk';
import HelpdeskMessages from '../pages/helpdesk/HelpdeskMessages';
import HelpDeskNotices from '../pages/helpdesk/HelpDeskNotices';
import HelpdeskCalendar from '../pages/helpdesk/HelpdeskCalendar';
import HelpdeskTasks from '../pages/helpdesk/HelpdeskTasks';
import HelpdeskInventory from '../pages/helpdesk/HelpdeskInventory';
import StaffNotices from '../pages/staff/StaffNotices';
import StaffDocuments from '../pages/staff/StaffDocuments';


// ─── Desk map ─────────────────────────────────────────────────────────────────

type DeskKey = 'finance' | 'procurement' | 'admin' | 'staff' | 'helpdesk';

const resolveDeskKey = (departmentName: string | null | undefined, userRole: string): DeskKey => {
  // If user is staff, they get staff view regardless of department
  if (userRole === 'staff' || userRole === 'viewer') {
    return 'staff';
  }

  // For department heads, use their department
  if (!departmentName) return 'admin';
  
  const lowerName = departmentName.toLowerCase().trim();
  
  if (lowerName.includes('finance')) return 'finance';
  if (lowerName.includes('procurement')) return 'procurement';
  if (lowerName.includes('helpdesk') || lowerName.includes('help desk')) return 'helpdesk';
  
  // Default to admin for any other department
  return 'admin';
};

// ─── Gateway ─────────────────────────────────────────────────────────────────

const DeptDeskGateway: React.FC = () => {
  const dispatch      = useAppDispatch();
  const { user }      = useAppSelector((state) => state.auth);
  const departments   = useAppSelector(selectAllDepartments);
  const loadingDepts  = useAppSelector(selectDepartmentsListLoading);

  const match    = useMatch('/dept/:deptId/*');
  const basePath = match ? `/dept/${match.params.deptId}` : '/';

  // Fetch departments on mount only if not already loaded
  useEffect(() => {
    if (departments.length === 0) {
      dispatch(fetchDepartments({}));
    }
  }, [dispatch, departments.length]);

  if (!user || !user.department_id) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Show spinner while departments are being fetched
  if (loadingDepts && departments.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent" />
      </div>
    );
  }

  // Look up this user's department from the already-fetched list
  const department = departments.find((d) => d.id === user.department_id);
  const deskKey = resolveDeskKey(department?.name, user.role);

  // Debug logging
  console.log('User:', { 
    name: user.full_name, 
    role: user.role, 
    department_id: user.department_id 
  });
  console.log('Department found:', department);
  console.log('Resolved desk key:', deskKey);

  // ── Staff desk ──────────────────────────────────────────────────────────────
  // Staff and viewers get the staff interface
  if (deskKey === 'staff') {
    return (
      <Routes>
        <Route element={<StaffLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="inventory" element={<StaffInventory />} />
          <Route path="messages" element={<StaffMeesages />} />
          <Route path="notices" element={<StaffNotices />} />
          <Route path="documents" element={<StaffDocuments />} />
        </Route>
        <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
      </Routes>
    );
  }

  // ── Finance desk ────────────────────────────────────────────────────────────
  if (deskKey === 'finance') {
    return (
      <Routes>
        <Route element={<FinanceLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FinanceDashboard />} />
          <Route path="inventory" element={<FinanceInventory />} />
          <Route path="messages" element={<FinanceMessages />} />
          <Route path="transactions" element={<FinanceTransactions />} />
          <Route path="payments" element={<FinancePayments />} />
          <Route path="expenses" element={<FinanceExpenses />} />
        </Route>
        <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
      </Routes>
    );
  }

  // ── Helpdesk desk ────────────────────────────────────────────────────────────
  // In DeptDeskGateway.tsx — replace the helpdesk block
if (deskKey === 'helpdesk') {
  return (
    <Routes>
      <Route element={<HelpDeskLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<HelpDeskDashboard />} />
        <Route path="manage" element={<Helpdesk />} />  {/* removed leading slash */}
        <Route path="messages" element={<HelpdeskMessages />} />
        <Route path="notices" element={<HelpDeskNotices />} />
        <Route path="calendar" element={<HelpdeskCalendar />} />
        <Route path="tasks" element={<HelpdeskTasks />} />
        <Route path="inventory" element={<HelpdeskInventory />} />
      </Route>
      <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
    </Routes>
  );
}

  // ── Procurement desk ──────────────────────────────────────────────────────
  if (deskKey === 'procurement') {
    return (
      <Routes>
        <Route element={<PLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PDashboard />} />
          <Route path="inventory" element={<PInventory />} />
          <Route path="purchases" element={<div>Purchases Page</div>} />
          <Route path="orders" element={<div>Purchase Orders Page</div>} />
          <Route path="suppliers" element={<div>Suppliers Page</div>} />
          <Route path="tenders" element={<div>Tenders Page</div>} />
          <Route path="reports" element={<div>Reports Page</div>} />
          <Route path="messages" element={<div>Messages Page</div>} />
          <Route path="notices" element={<div>Notices Page</div>} />
        </Route>
        <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
      </Routes>
    );
  }

  // ── Admin / Registry desk (default) ─────────────────────────────────────────
  // Department heads of admin, registry, etc.
  return (
    <Routes>
      <Route element={<AdmDeskLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="documents" element={<AdminDocs />} />
      </Route>
      <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
    </Routes>
  );
};

export default DeptDeskGateway;