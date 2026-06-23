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

// ── Dept Head / Staff / Viewer ─────────────────────────────────────────────────
// AdmDeskLayout/AdminDashboard/AdminDocs and FinanceLayout/FinanceDashboard are
// no longer imported here directly — they're imported inside DeptDeskGateway,
// which picks between them based on the signed-in user's department_code.
// This is what fixes the bug where Finance dept_heads landed on AdminDashboard:
// previously both desks were mounted on the identical path
// "/dept/:departmentId/dashboard" in two separate <Route> blocks, and React
// Router always resolved to whichever was declared first (Admin). Now there's
// exactly one <Route> for that path prefix, and the desk choice happens inside
// DeptDeskGateway instead of via route declaration order.

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
        // department_id drives the URL; department_code (read inside
        // DeptDeskGateway) decides which desk renders underneath it.
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

      {/* ── Root redirect ────────────────────────────────────────────────
           Every role lands on a real route, so the catch-all never loops. */}
      <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />

      {/* ── Super Admin ──────────────────────────────────────────────────
           No department scope — super_admin sees everything.             */}
      <Route element={<ProtectedRoutes requireSuperAdmin />}>
        <Route element={<SuperAdminLayout />}>
          <Route path="/super-admin/dashboard"   element={<SuperAdminDashboard />} />
          <Route path="/super-admin/departments" element={<SuperAdminDepts />} />
          <Route path="/super-admin/documents"   element={<SuperAdminDocuments />} />
          <Route path="/super-admin/dsa-tracker"   element={<SuperAdminDsa />} />
          <Route path="/super-admin/tasks"   element={<SuperAdminTaskM />} />
          <Route path="/super-admin/calendar"   element={<SuperAdminCalendar />} />
          <Route path="/super-admin/registry"   element={<SuperAdminRegistry />} />
          <Route path="/super-admin/users"       element={<AdminUsers />} />
        </Route>
      </Route>

      {/* ── Dept Head / Staff / Viewer ───────────────────────────────────
           Single mount point at /dept/:departmentId/* — DeptDeskGateway
           resolves user.department_code and renders whichever desk
           (Admin, Finance, ...) that department maps to, with its own
           nested layout + routes underneath. */}
      <Route element={<ProtectedRoutes minRole="staff" />}>
        <Route path="/dept/:departmentId/*" element={<DeptDeskGateway />} />
      </Route>

      {/* ── Catch-all ────────────────────────────────────────────────────
           Unknown paths → root → getHomeRoute() → a real destination.  */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;