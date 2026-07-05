// src/Route/AppRoutes.tsx
import React from 'react';
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/auth/LoginPage";
import { useAppSelector } from "../store/hook";
import UnauthorizedView from '../UnauthorizedView';
import ProtectedRoutes from './ProtectedRoutes';

// ── Super Admin ───────────────────────────────────────────────────────────────
import SuperAdminLayout    from '../components/admin/SuperAdminLayout';
import SuperAdminDashboard from '../pages/admin/SuperAdminDashboard';
import SuperAdminDepts     from '../pages/admin/SuperAdminDepts';
import SuperAdminDocuments from '../pages/admin/SuperAdminDocuments';
import AdminUsers          from '../pages/admin/SuperAdminUsers';
import DeptDeskGateway from './DeptDeskGateway';
import SuperAdminRegistry from '../pages/admin/SuperAdminRegistry';
import SuperAdminCalendar from '../pages/admin/SuperAdminCalendar';
import SuperAdminDsa from '../pages/admin/SuperAdminDsa';
import SuperAdminTaskM from '../pages/admin/SuperAdminTaskM';
import SuperAdminInventory from '../pages/admin/SuperAdminInventory';
import SuperAdminMessages from '../pages/admin/SuperAdminMessages';
import SuperAdminNotices from '../pages/admin/SuperAdminNotices';
import SuperAdminFinancial from '../pages/admin/SuperAdminFinancial';
import SuperAdminSignature from '../pages/admin/SuperAdminSignature';
import SuperAdminHelpDesk from '../pages/admin/SuperAdminHelpDesk';
import SuperAdminTeams from '../pages/admin/SuperAdminTeams';
import SuperAdminSettings from '../pages/admin/SuperAdminSettings';
import SuperAdminReports from '../pages/admin/SuperAdminReports';
import SuperAdminLinks from '../pages/admin/SuperAdminLinks';
import MemoandLetters from '../pages/admin/MemoandLetters';
import SuperAdminTemplates from '../pages/admin/SuperAdminTemplates';

// ─────────────────────────────────────────────────────────────────────────────

const AppRoutes: React.FC = () => {
  const { accessToken, user, isInitializing } = useAppSelector((state) => state.auth);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E4620] border-t-transparent" />
      </div>
    );
  }

  /** Maps the logged-in user to the first route they should land on. */
  const getHomeRoute = (): string => {
    if (!accessToken || !user) return '/login';

    switch (user.role) {
      case 'super_admin':
        return '/super-admin/dashboard';

      case 'dept_head':
      case 'staff':
      case 'viewer':
        // All non-super-admin users go to their department desk
        return user.department_id
          ? `/dept/${user.department_id}/dashboard`
          : '/unauthorized';

      default:
        return '/unauthorized';
    }
  };

  return (
    <Routes>
      {/* ── Public ──────────────────────────────────────────────────────── */}
      <Route path="/login"        element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedView />} />

      {/* ── Root redirect ──────────────────────────────────────────────── */}
      <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />

      {/* ── Super Admin ────────────────────────────────────────────────── */}
      <Route element={<ProtectedRoutes requireSuperAdmin />}>
        <Route element={<SuperAdminLayout />}>
          <Route path="/super-admin/dashboard"     element={<SuperAdminDashboard />} />
          <Route path="/super-admin/departments"   element={<SuperAdminDepts />} />
          <Route path="/super-admin/documents"     element={<SuperAdminDocuments />} />
          <Route path="/super-admin/helpdesk"     element={<SuperAdminHelpDesk />} />
          <Route path="/super-admin/dsa-tracker"   element={<SuperAdminDsa />} />
          <Route path="/super-admin/tasks"         element={<SuperAdminTaskM />} />
          <Route path="/super-admin/messages"      element={<SuperAdminMessages />} />
          <Route path="/super-admin/inventory"     element={<SuperAdminInventory />} />
          <Route path="/super-admin/calendar"      element={<SuperAdminCalendar />} />
          <Route path="/super-admin/registry"      element={<SuperAdminRegistry />} />
          <Route path="/super-admin/users"         element={<AdminUsers />} />
          <Route path="/super-admin/finance"         element={<SuperAdminFinancial />} />
          <Route path="/super-admin/notices"         element={<SuperAdminNotices />} />
          <Route path="/super-admin/signature"         element={<SuperAdminSignature />} />
          <Route path="/super-admin/team-members"         element={<SuperAdminTeams />} />
          <Route path="/super-admin/settings"         element={<SuperAdminSettings />} />
          <Route path="/super-admin/reports"         element={<SuperAdminReports />} />
          <Route path="/super-admin/links"         element={<SuperAdminLinks />} />
          <Route path="/super-admin/memo-letters"         element={<MemoandLetters />} />
          <Route path="/super-admin/templates"         element={<SuperAdminTemplates />} />
        </Route>
      </Route>

      {/* ── Dept Head / Staff / Viewer ───────────────────────────────────
           All non-super-admin users go through DeptDeskGateway which
           determines which desk to show based on role and department. */}
      <Route element={<ProtectedRoutes minRole="staff" />}>
        <Route path="/dept/:departmentId/*" element={<DeptDeskGateway />} />
      </Route>

      {/* ── Catch-all ──────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;