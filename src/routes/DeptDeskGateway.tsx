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
import StaffClendar from '../pages/staff/StaffClendar';
import StaffTasks from '../pages/staff/StaffTasks';
import StaffSettings from '../pages/staff/StaffSettings';
import FinanceSettings from '../pages/finance/FinanceSettings';
import ProcurementMessages from '../pages/procurement/ProcurementMessages';
import ProcurementNotices from '../pages/procurement/ProcurementNotices';
import PInventory from '../pages/procurement/PInventory';
import ProcurementSettings from '../pages/procurement/ProcurementSettings';
import ProcurementReports from '../pages/procurement/ProcurementReports';
import ProcurementCalendar from '../pages/procurement/ProcurementCalendar';
import ProcurementTasks from '../pages/procurement/ProcurementTasks';
import AdminMessages from '../pages/admdesk/AdminMessages';
import AdminCalendar from '../pages/admdesk/AdminCalendar';
import AdminTasks from '../pages/admdesk/AdminTasks';
import AdminSettings from '../pages/admdesk/AdminSettings';
import HelpDeskDocuments from '../pages/helpdesk/HelpDeskDocuments';
import ProcurementDocuments from '../pages/procurement/ProcurementDocs';
import HelpdeskSettings from '../pages/helpdesk/HelpdeskSettings';
import AdminRegistry from '../pages/admdesk/AdminRegistry';


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
          <Route path="calendar" element={<StaffClendar />} />
          <Route path="tasks" element={<StaffTasks />} />
          <Route path="settings" element={<StaffSettings />} />
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
          <Route path="settings" element={<FinanceSettings />} />
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
        <Route path="manage" element={<Helpdesk />} />  
        <Route path="messages" element={<HelpdeskMessages />} />
        <Route path="notices" element={<HelpDeskNotices />} />
        <Route path="calendar" element={<HelpdeskCalendar />} />
        <Route path="tasks" element={<HelpdeskTasks />} />
        <Route path="inventory" element={<HelpdeskInventory />} />
        <Route path="documents" element={<HelpDeskDocuments />} />
        <Route path="settings" element={<HelpdeskSettings />} />
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
          <Route path="messages" element={<ProcurementMessages />} />
          <Route path="notices" element={<ProcurementNotices />} />
          <Route path="settings" element={<ProcurementSettings />} />
          <Route path="reports" element={<ProcurementReports />} />
          <Route path="calendar" element={<ProcurementCalendar />} />
          <Route path="tasks" element={<ProcurementTasks />} />
          <Route path="documents" element={<ProcurementDocuments />} />
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
        <Route path="messages" element={<AdminMessages />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="tasks" element={<AdminTasks />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="registry" element={<AdminRegistry />} />
      </Route>
      <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
    </Routes>
  );
};

export default DeptDeskGateway;