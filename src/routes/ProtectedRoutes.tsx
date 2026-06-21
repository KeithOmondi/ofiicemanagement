// src/Route/ProtectedRoutes.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hook';
import { isSuperAdmin, hasRole, hasDeptAccess, type UserRole } from '../store/slices/authSlice';

interface ProtectedRoutesProps {
  requireSuperAdmin?: boolean;
  // Role-only gate (no dept check) — e.g. dept_head and above
  minRole?: UserRole;
  // Department + role gate
  departmentId?: string;
  minDeptRole?: UserRole;
}

export const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({
  requireSuperAdmin,
  minRole,
  departmentId,
  minDeptRole = 'viewer',
}) => {
  const location = useLocation();
  const { accessToken, user, isInitializing } = useAppSelector((state) => state.auth);

  // 1. Silent refresh in progress — hold until resolved
  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#f5f0e8' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#5c5144' }}>Restoring session…</p>
        </div>
      </div>
    );
  }

  // 2. No session — redirect to login, preserve intended destination
  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Superadmin-only gate
  if (requireSuperAdmin && !isSuperAdmin(user)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Role-only gate (no dept check)
  if (minRole && !hasRole(user, minRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 5. Department + role gate
  if (departmentId && !hasDeptAccess(user, departmentId, minDeptRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 6. Authorized — render children
  return <Outlet />;
};

export default ProtectedRoutes;