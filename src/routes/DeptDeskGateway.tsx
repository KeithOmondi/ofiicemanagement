// src/Route/DeptDeskGateway.tsx – corrected
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppSelector } from '../store/hook';

import AdmDeskLayout from '../components/admdesk/AdmDeskLayout';
import AdminDashboard from '../pages/admdesk/AdminDashboard';
import AdminDocs from '../pages/admdesk/AdminDocs';

import FinanceLayout from '../components/finance/FinanceLayout';
import FinanceDashboard from '../pages/finance/FinanceDashboard';

type DeskKey = 'finance' | 'admin';

const resolveDeskKey = (departmentCode: string | null): DeskKey => {
  if (!departmentCode) return 'admin';
  switch (departmentCode.toUpperCase()) {
    case 'FIN':   // matches your DB code
      return 'finance';
    default:
      return 'admin';
  }
};

const DeptDeskGateway: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  if (!user || !user.department_id) {
    return <Navigate to="/unauthorized" replace />;
  }

  const deskKey = resolveDeskKey(user.department_code);
  const basePath = `/dept/${user.department_id}`; // absolute base for redirects

  if (deskKey === 'finance') {
    return (
      <Routes>
        <Route element={<FinanceLayout />}>
          <Route path="dashboard" element={<FinanceDashboard />} />
          {/* add more finance routes here */}
        </Route>
        {/* All unmatched paths under this prefix go to dashboard */}
        <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
      </Routes>
    );
  }

  // Default: Admin / Registry desk
  return (
    <Routes>
      <Route element={<AdmDeskLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="documents" element={<AdminDocs />} />
      </Route>
      <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
    </Routes>
  );
};

export default DeptDeskGateway;