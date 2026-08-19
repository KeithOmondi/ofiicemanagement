import React, { useEffect } from "react";
import { Navigate, Route, Routes, useMatch } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hook";

import {
  fetchDepartments,
  selectAllDepartments,
  selectDepartmentsListLoading,
} from "../store/slices/departmentsSlice";

import AdmDeskLayout from "../components/admdesk/AdmDeskLayout";
import AdminDashboard from "../pages/admdesk/AdminDashboard";
import AdminDocs from "../pages/admdesk/AdminDocs";

import FinanceLayout from "../components/finance/FinanceLayout";
import FinanceDashboard from "../pages/finance/FinanceDashboard";
import FinanceInventory from "../pages/finance/FinanceInventory";
import FinanceMessages from "../pages/finance/FinanceMessages";

import PDashboard from "../pages/procurement/PDashboard";
import PLayout from "../components/Procurement/PLayout";

// ─── Staff views ──────────────────────────────────────────────────────────────
import StaffLayout from "../components/staff/StaffLayout";
import StaffDashboard from "../pages/staff/StaffDashboard";
import StaffInventory from "../pages/staff/StaffInventory";
import FinanceTransactions from "../pages/finance/FinanceTransactions";
import FinancePayments from "../pages/finance/FinancePayments";
import FinanceExpenses from "../pages/finance/FinanceExpenses";
import StaffMeesages from "../pages/staff/StaffMeesages";
import HelpDeskLayout from "../components/helpdesk/HelpDeskLayout";
import HelpDeskDashboard from "../pages/helpdesk/HelpDeskDashboard";
import Helpdesk from "../pages/helpdesk/Helpdesk";
import HelpdeskMessages from "../pages/helpdesk/HelpdeskMessages";
import HelpDeskNotices from "../pages/helpdesk/HelpDeskNotices";
import HelpdeskCalendar from "../pages/helpdesk/HelpdeskCalendar";
import HelpdeskTasks from "../pages/helpdesk/HelpdeskTasks";
import HelpdeskInventory from "../pages/helpdesk/HelpdeskInventory";
import StaffNotices from "../pages/staff/StaffNotices";
import StaffDocuments from "../pages/staff/StaffDocuments";
import StaffClendar from "../pages/staff/StaffClendar";
import StaffTasks from "../pages/staff/StaffTasks";
import StaffSettings from "../pages/staff/StaffSettings";
import FinanceSettings from "../pages/finance/FinanceSettings";
import ProcurementMessages from "../pages/procurement/ProcurementMessages";
import ProcurementNotices from "../pages/procurement/ProcurementNotices";
import PInventory from "../pages/procurement/PInventory";
import ProcurementSettings from "../pages/procurement/ProcurementSettings";
import ProcurementReports from "../pages/procurement/ProcurementReports";
import ProcurementCalendar from "../pages/procurement/ProcurementCalendar";
import ProcurementTasks from "../pages/procurement/ProcurementTasks";
import AdminMessages from "../pages/admdesk/AdminMessages";
import AdminCalendar from "../pages/admdesk/AdminCalendar";
import AdminTasks from "../pages/admdesk/AdminTasks";
import AdminSettings from "../pages/admdesk/AdminSettings";
import HelpDeskDocuments from "../pages/helpdesk/HelpDeskDocuments";
import ProcurementDocuments from "../pages/procurement/ProcurementDocs";
import HelpdeskSettings from "../pages/helpdesk/HelpdeskSettings";
import AdminRegistry from "../pages/admdesk/AdminRegistry";
import HelpdeskDocs from "../pages/helpdesk/HelpdeskDocs";
import HelpdeskReport from "../pages/helpdesk/HelpdeskReport";
import HelpdeskTickets from "../pages/helpdesk/HelpdeskTickets";
import AdminFolders from "../pages/admdesk/AdminFolders";
import AdminBringUp from "../pages/admdesk/AdminBringUp";
import AdminMemoandLetters from "../pages/admdesk/AdminMemoandLetters";
import HelpdeskStuff from "../pages/staff/HelpdeskStuff";
import HelpdeskStuffTickets from "../pages/staff/HelpdeskStuffTickets";
import { getStaffDeptFlags } from "../utils/staffDept";
import JODashboard from "../pages/JO/JODashboard";
import JudicialOfficerLayout from "../components/JO/JudicialOfficerLayout";
import StoreLayout from "../components/store/StoreLayout";
import StoreDashboard from "../pages/store/StoreDashboard";
import StoreDocuments from "../pages/store/StoreDocuments";
import StoreStock from "../pages/store/StoreStock";
import HelpdeskAides from "../pages/helpdesk/HelpdeskAides";
import JODocuments from "../pages/JO/JODocuments";
import StuffHelpdeskDocs from "../pages/staff/StuffHelpDeskDoscs";
import MemoandLetters from "../pages/admin/MemoandLetters";
import HelpdeskStaffAides from "../pages/staff/HelpdeskStaffAides";
import HelpdeskMemoandLetters from "../pages/staff/HelpdeskMemoandLetters";
import HelpdeskConference from "../pages/helpdesk/HelpdeskConference";
import RegistryReports from "../pages/staff/RegistryReports";
import RegistryLayout from "../components/principalregistry/RegistryLayout";
import DHRegistryDashboard from "../pages/principalregistry/DHRegistryDashboard";
//import DHRegistryReports from '../pages/principalregistry/DHRegistryReports';
import RegistryNewReport from "../pages/staff/RegistryNewReport";
import RegistryWeeklyReports from "../pages/staff/RegistryWeeklyReports";
import RegistrySubmitted from "../pages/staff/RegistrySubmitted";
import DHRegistryReports from "../pages/principalregistry/DHRegistryReports";
import DHDocuments from "../pages/principalregistry/DHDocuments";
import DHMemoandLetters from "../pages/principalregistry/DHMemoandLetters";
import DHMessages from "../pages/principalregistry/DHMessages";
import DHNotices from "../pages/principalregistry/DHNotices";
import HelpDeskLogs from "../pages/helpdesk/HelpDeskLogs";
import JOServiceWeek from "../pages/JO/JOServiceWeek";
import JOMessages from "../pages/JO/JOMessages";
import DrDocuments from "../pages/staff/DrDocuments";
import JOMemosandLetters from "../pages/JO/JOMemosandLetters";

// ─── Desk map ─────────────────────────────────────────────────────────────────

type DeskKey =
  | "finance"
  | "procurement"
  | "admin"
  | "staff"
  | "helpdesk"
  | "jo"
  | "store"
  | "pr";

const resolveDeskKey = (
  departmentName: string | null | undefined,
  userRole: string,
): DeskKey => {
  if (userRole === "staff" || userRole === "viewer") {
    return "staff";
  }

  if (!departmentName) return "admin";

  const lowerName = departmentName.toLowerCase().trim();

  if (lowerName.includes("finance")) return "finance";
  if (lowerName.includes("procurement")) return "procurement";
  if (lowerName.includes("store")) return "store";
  if (lowerName === "jo" || lowerName.includes("judicial officer")) return "jo";
  if (
    lowerName === "pr" ||
    lowerName.includes("principal registry") ||
    lowerName.includes("principle registry") // tolerate the "Principle Registry" misspelling seen in prod data
  ) {
    return "pr";
  }
  if (lowerName.includes("helpdesk") || lowerName.includes("help desk"))
    return "helpdesk";

  return "admin";
};

// ─── Gateway ─────────────────────────────────────────────────────────────────

const DeptDeskGateway: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const departments = useAppSelector(selectAllDepartments);
  const loadingDepts = useAppSelector(selectDepartmentsListLoading);

  const match = useMatch("/dept/:deptId/*");
  const basePath = match ? `/dept/${match.params.deptId}` : "/";

  useEffect(() => {
    if (departments.length === 0) {
      dispatch(fetchDepartments({}));
    }
  }, [dispatch, departments.length]);

  if (!user || !user.department_id) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (loadingDepts && departments.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent" />
      </div>
    );
  }

  const department = departments.find((d) => d.id === user.department_id);
  const deskKey = resolveDeskKey(department?.name, user.role);

  // ── Staff desk ──────────────────────────────────────────────────────────────
  if (deskKey === "staff") {
    const { isHelpdeskStaff, isRegistryStaff, isJOStaff } = getStaffDeptFlags(
      department?.name,
    );

    return (
      <Routes>
        <Route element={<StaffLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* Shared routes */}
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="inventory" element={<StaffInventory />} />
          <Route path="messages" element={<StaffMeesages />} />
          <Route path="notices" element={<StaffNotices />} />
          <Route path="documents" element={<StaffDocuments />} />
          <Route path="calendar" element={<StaffClendar />} />
          <Route path="tasks" element={<StaffTasks />} />
          <Route path="settings" element={<StaffSettings />} />

          {/* Helpdesk Staff routes */}
          {isHelpdeskStaff && (
            <>
              <Route path="help-desk" element={<HelpdeskStuff />} />
              <Route path="helpdesk-docs" element={<StuffHelpdeskDocs />} />
              <Route
                path="helpdesk-tickets"
                element={<HelpdeskStuffTickets />}
              />
              <Route path="aides" element={<HelpdeskStaffAides />} />
              <Route
                path="memos-letters"
                element={<HelpdeskMemoandLetters />}
              />
            </>
          )}

          {/* Judicial Officer Staff routes
              These paths must mirror the `to` values used for isJOStaff in
              StaffSidebar.tsx (jdocuments, jo-messages, jo-serviceweek).
              Previously missing here, so links fell through to the staff
              desk's catch-all and bounced back to /dashboard. */}
          {isJOStaff && (
            <>
              <Route path="jdocuments" element={<DrDocuments />} />
              <Route path="jo-messages" element={<JOMessages />} />
              <Route path="jo-serviceweek" element={<JOServiceWeek />} />
            </>
          )}

          {/* Registry Staff routes */}
          {isRegistryStaff ? (
            <>
              <Route path="reports/new" element={<RegistryNewReport />} />
              <Route path="reports/week" element={<RegistryWeeklyReports />} />
              <Route path="submitted" element={<RegistrySubmitted />} />
            </>
          ) : (
            <Route path="reports" element={<RegistryReports />} />
          )}

          {/* Non-registry staff still see a plain "All Reports" link (Workspace
              section) — keep this route available regardless of isRegistryStaff. */}
          <Route path="reports" element={<RegistryReports />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={`${basePath}/dashboard`} replace />}
        />
      </Routes>
    );
  }

  // ── Finance desk ────────────────────────────────────────────────────────────
  if (deskKey === "finance") {
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
        <Route
          path="*"
          element={<Navigate to={`${basePath}/dashboard`} replace />}
        />
      </Routes>
    );
  }

  // ── Helpdesk desk ────────────────────────────────────────────────────────────
  if (deskKey === "helpdesk") {
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
          <Route path="uploads" element={<HelpdeskDocs />} />
          <Route path="reports" element={<HelpdeskReport />} />
          <Route path="tickets" element={<HelpdeskTickets />} />
          <Route path="aides" element={<HelpdeskAides />} />
          <Route path="conference" element={<HelpdeskConference />} />
          <Route path="memos" element={<MemoandLetters />} />
          <Route path="activity-logs" element={<HelpDeskLogs />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={`${basePath}/dashboard`} replace />}
        />
      </Routes>
    );
  }

  // ── Judicial Officer desk ──────────────────────────────────────────────────
  // NOTE: resolveDeskKey() returns "staff" for any user with role "staff" or
  // "viewer" *before* it ever checks department name — so this block is only
  // reached by JO users whose role is something else (e.g. dept_head). If all
  // real JO users have role "staff", this block is effectively dead code; the
  // routes actually used by isJOStaff staff members live in the staff desk
  // block above. Keeping this here in case a non-"staff"-role JO user exists,
  // but worth confirming and removing if not.
  if (deskKey === "jo") {
    return (
      <Routes>
        <Route element={<JudicialOfficerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<JODashboard />} />
          <Route path="documents" element={<JODocuments />} />
          <Route path="jo-serviceweek" element={<JOServiceWeek />} />
          <Route path="jo-messages" element={<JOMessages />} />
          <Route path="jdocuments" element={<DrDocuments />} />
          <Route path="memoandletters" element={<JOMemosandLetters />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={`${basePath}/dashboard`} replace />}
        />
      </Routes>
    );
  }

  // ── Procurement desk ──────────────────────────────────────────────────────
  if (deskKey === "procurement") {
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
        <Route
          path="*"
          element={<Navigate to={`${basePath}/dashboard`} replace />}
        />
      </Routes>
    );
  }

  // ── Store desk ────────────────────────────────────────────────────────────
  if (deskKey === "store") {
    return (
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StoreDashboard />} />
          <Route path="documents" element={<StoreDocuments />} />
          <Route path="inventory" element={<StoreStock />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={`${basePath}/dashboard`} replace />}
        />
      </Routes>
    );
  }

  // ── Principal Registry desk ────────────────────────────────────────────────
  // NOTE: deskKey 'pr' was previously unhandled here, so any non-staff user in
  // a "Principal Registry" department fell through to the Admin desk, which
  // has no "reports" route — that's why /reports bounced back to /dashboard
  // via the wildcard route. Every path below must mirror the `to` values in
  // RegistrySidebar.tsx, or the same bug happens again for that link.
  // RegistryDashboard / RegistryNewReport / RegistryWeeklyReports /
  // RegistrySubmitted / RegistryApproved / RegistryRejected / RegistryStats
  // are placeholder pages — swap in real implementations when ready.
  if (deskKey === "pr") {
    return (
      <Routes>
        <Route element={<RegistryLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DHRegistryDashboard />} />
          <Route path="documents" element={<DHDocuments />} />
          <Route path="memoandletters" element={<DHMemoandLetters />} />
          <Route path="messages" element={<DHMessages />} />
          <Route path="notices" element={<DHNotices />} />
          <Route path="reports/month" element={<DHRegistryReports />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={`${basePath}/dashboard`} replace />}
        />
      </Routes>
    );
  }

  // ── Admin desk ────────────────────────────────────────────────────────────
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
        <Route path="orhc-folders" element={<AdminFolders />} />
        <Route path="bring-up" element={<AdminBringUp />} />
        <Route path="memo-letter" element={<AdminMemoandLetters />} />
      </Route>
      <Route
        path="*"
        element={<Navigate to={`${basePath}/dashboard`} replace />}
      />
    </Routes>
  );
};

export default DeptDeskGateway;