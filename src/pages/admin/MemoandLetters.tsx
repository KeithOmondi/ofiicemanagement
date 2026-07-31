// src/pages/MemoandLetters.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchDocuments,
  deleteDocument,
  signDocument,
  sendDocument,
  markDocument,
  acknowledgeMark,
  completeMark,
  updateDocument,
  clearError,
  requestSignOtp,
  updateMark,
  regeneratePdf,
  releaseDocument,
  setBringUp,
  updateBringUp,
  completeBringUp,
  fetchDocumentById,
} from "../../store/slices/documentSlice";
import { hasRole } from "../../store/slices/authSlice";
import {
  fetchUsers,
  selectAllUsers,
  selectUsersListLoading,
} from "../../store/slices/userSlice";
import {
  fetchDepartments,
  selectAllDepartments,
  selectDepartmentsListLoading,
} from "../../store/slices/departmentsSlice";
import type {
  Document,
  DocumentStatus,
  DocumentFilters,
  SetBringUpInput,
  UpdateBringUpInput,
  CompleteBringUpInput,
} from "../../types/documents.types";
import type { User } from "../../store/slices/userSlice";
import type { DepartmentWithUserCount } from "../../store/slices/departmentsSlice";
import { format } from "date-fns";
import toast from "react-hot-toast";
import TemplateComposerModal from "../../components/templates/TemplateComposerModal";

// ─── Helpdesk Document Imports ──────────────────────────────────────────────
import {
  fetchHelpdeskDocuments,
  internalPreviewDocument,
  internalApproveDocument,
  internalRejectDocument,
  internalRequestChanges,
  sendBackToRequester,
  cancelInternalApproval,
  selectAllHelpdeskDocuments,
  type HelpdeskDocument,
  type InternalApprovalStatus,
  type RequesterVisibleStatus,
  type DocumentStatus as HelpdeskDocumentStatus,
  type DocumentEntityType,
} from "../../store/slices/helpdeskDocumentsSlice";
import { selectCurrentUser } from "../../store/slices/userSlice";

// ─── Helper Components ──────────────────────────────────────────────────────

// (1) StatusBadge
const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: "bg-stone-100 text-stone-500 border border-stone-200",
  uploaded: "bg-blue-50 text-blue-700 border border-blue-100",
  pending_review: "bg-amber-50 text-amber-700 border border-amber-100",
  dept_assigned: "bg-violet-50 text-violet-700 border border-violet-100",
  user_assigned: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  marked: "bg-violet-50 text-violet-700 border border-violet-100",
  in_progress: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  filed: "bg-stone-100 text-stone-500 border border-stone-200",
  ready_to_release: "bg-amber-50 text-amber-700 border border-amber-200",
  released: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "DRAFT",
  uploaded: "UPLOADED",
  pending_review: "PENDING",
  dept_assigned: "DEPT ASSIGNED",
  user_assigned: "USER ASSIGNED",
  marked: "MARKED",
  in_progress: "IN PROGRESS",
  completed: "COMPLETED",
  filed: "FILED",
  ready_to_release: "READY TO RELEASE",
  released: "RELEASED",
};

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${STATUS_STYLES[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
);

// ─── Helpdesk Document Status Badge ─────────────────────────────────────────

const HELPEDSK_STATUS_STYLES: Record<HelpdeskDocumentStatus, string> = {
  draft: "bg-stone-100 text-stone-500 border border-stone-200",
  pending_approval: "bg-amber-50 text-amber-700 border border-amber-100",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  rejected: "bg-red-50 text-red-700 border border-red-100",
  returned: "bg-blue-50 text-blue-700 border border-blue-100",
};

const HELPEDSK_STATUS_LABELS: Record<HelpdeskDocumentStatus, string> = {
  draft: "DRAFT",
  pending_approval: "PENDING APPROVAL",
  approved: "APPROVED ✓",
  rejected: "REJECTED ✗",
  returned: "RETURNED",
};

const HelpdeskStatusBadge: React.FC<{ status: HelpdeskDocumentStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${HELPEDSK_STATUS_STYLES[status]}`}
  >
    {HELPEDSK_STATUS_LABELS[status]}
  </span>
);

// ─── Internal Approval Status Badge ─────────────────────────────────────────

const INTERNAL_STATUS_STYLES: Record<InternalApprovalStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  previewed: "bg-blue-50 text-blue-700 border border-blue-100",
  approved_internal: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  rejected_internal: "bg-red-50 text-red-700 border border-red-100",
  changes_requested_internal: "bg-orange-50 text-orange-700 border border-orange-100",
  changes_ready: "bg-purple-50 text-purple-700 border border-purple-100",
};

const INTERNAL_STATUS_LABELS: Record<InternalApprovalStatus, string> = {
  pending: "PENDING REVIEW",
  previewed: "PREVIEWED",
  approved_internal: "APPROVED (INTERNAL)",
  rejected_internal: "REJECTED (INTERNAL)",
  changes_requested_internal: "CHANGES REQUESTED",
  changes_ready: "CHANGES READY",
};

const InternalStatusBadge: React.FC<{ status: InternalApprovalStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${INTERNAL_STATUS_STYLES[status]}`}
  >
    {INTERNAL_STATUS_LABELS[status]}
  </span>
);

// ─── Requester Visible Status Badge ─────────────────────────────────────────

const REQUESTER_STATUS_STYLES: Record<RequesterVisibleStatus, string> = {
  pending_approval: "bg-amber-50 text-amber-700 border border-amber-100",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  rejected: "bg-red-50 text-red-700 border border-red-100",
  changes_requested: "bg-orange-50 text-orange-700 border border-orange-100",
  in_revision: "bg-blue-50 text-blue-700 border border-blue-100",
};

const REQUESTER_STATUS_LABELS: Record<RequesterVisibleStatus, string> = {
  pending_approval: "PENDING APPROVAL",
  approved: "APPROVED ✓",
  rejected: "REJECTED ✗",
  changes_requested: "CHANGES REQUESTED",
  in_revision: "IN REVISION",
};

const RequesterStatusBadge: React.FC<{ status: RequesterVisibleStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${REQUESTER_STATUS_STYLES[status]}`}
  >
    {REQUESTER_STATUS_LABELS[status]}
  </span>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({
  className = "h-3.5 w-3.5",
}) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── formatDate ──────────────────────────────────────────────────────────────

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Helper: Format Document Type Display ──────────────────────────────────

const getHelpdeskEntityDisplay = (entityType: DocumentEntityType): string => {
  const labels: Record<DocumentEntityType, string> = {
    circuit: "Circuit",
    bench: "Bench",
    partHeard: "Part-Heard",
    serviceWeek: "Service Week",
    otherPayment: "Other Payment",
    ticket: "Travel Ticket",
    medicalClaim: "Medical Claim",
    generalRequest: "General Request",
    securityRequest: "Security Request",
    visa: "Visa Support",
    protocol: "Protocol Event",
    club: "Club Membership",
    utility_memo: "Utility Memo",
    consolidated_utility_memo: "Consolidated Utility Memo",
    consolidated_fuel_memo: "Consolidated Fuel Memo",
    aide: "Aide Request",
    sentry: "Sentry Request",
  };
  return labels[entityType] || entityType;
};

// ─── ListItem ────────────────────────────────────────────────────────────────

interface ListItemProps {
  document: Document;
  selected: boolean;
  onSelect: () => void;
  hasResponse?: boolean;
}

const ListItem: React.FC<ListItemProps> = ({
  document,
  selected,
  onSelect,
  hasResponse = false,
}) => {
  const mark = document.active_mark;
  const showMarkInfo = mark && (document.status === "marked" || document.status === "dept_assigned" || document.status === "user_assigned");

  return (
    <div
      onClick={onSelect}
      className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
        selected
          ? "bg-[#1E4620]/5 border-l-2 border-[#1E4620]"
          : hasResponse
            ? "hover:bg-blue-50/50 border-l-2 border-blue-300/50 bg-blue-50/20"
            : "hover:bg-stone-50 border-l-2 border-transparent"
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1.5">
          <p
            className={`text-xs font-semibold leading-snug truncate ${selected ? "text-[#1E4620]" : "text-stone-800"}`}
          >
            {document.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {hasResponse && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-medium text-blue-700 border border-blue-200">
                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
                {document.response_count || 1}
              </span>
            )}
            <StatusBadge status={document.status} />
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400 flex-wrap">
          <span>
            {document.created_at
              ? format(new Date(document.created_at), "yyyy-MM-dd")
              : "—"}
          </span>
          <span>·</span>
          <span className="truncate">
            {document.reference_no || document.created_by_name || "RHC"}
          </span>
          {document.bring_up_date && (
            <>
              <span>·</span>
              <span className="text-amber-600 font-medium">
                📅 {format(new Date(document.bring_up_date), "dd MMM yyyy")}
              </span>
            </>
          )}
        </div>

        {document.is_signed && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Signed
            {document.is_sent && <span className="ml-1 text-blue-500">· Sent</span>}
          </div>
        )}

        {showMarkInfo && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-violet-600">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                clipRule="evenodd"
              />
            </svg>
            Marked to: {mark.marked_to_dept_name}
            {mark.assigned_to_name && (
              <span className="ml-1">→ {mark.assigned_to_name}</span>
            )}
          </div>
        )}

        {document.status === "ready_to_release" && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-600">
            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Ready for release
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Helpdesk Document List Item ────────────────────────────────────────────

interface HelpdeskListItemProps {
  document: HelpdeskDocument;
  selected: boolean;
  onSelect: () => void;
}

const HelpdeskListItem: React.FC<HelpdeskListItemProps> = ({
  document,
  selected,
  onSelect,
}) => {
  const entityLabel = getHelpdeskEntityDisplay(document.entity_type);
  
  return (
    <div
      onClick={onSelect}
      className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
        selected
          ? "bg-[#1E4620]/5 border-l-2 border-[#1E4620]"
          : "hover:bg-stone-50 border-l-2 border-transparent"
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1.5">
          <p
            className={`text-xs font-semibold leading-snug truncate ${selected ? "text-[#1E4620]" : "text-stone-800"}`}
          >
            {document.subject}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[9px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
              {entityLabel}
            </span>
            <HelpdeskStatusBadge status={document.status} />
          </div>
        </div>

        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400 flex-wrap">
          <span>Ref: {document.ref}</span>
          <span>·</span>
          <span>{document.format.toUpperCase()}</span>
          <span>·</span>
          <span>{formatDate(document.created_at)}</span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
          <InternalStatusBadge status={document.internal_approval_status} />
          <RequesterStatusBadge status={document.requester_status} />
          {document.e_stamp_status === 'stamped' && (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
              📜 Stamped
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── MarkModal ─────────────────────────────────────────────────────────────

interface MarkModalProps {
  document: Document;
  onClose: () => void;
  onMark: (
    id: string,
    data: {
      departmentId: string;
      userId: string;
      instructions: string;
      priority: string;
    },
  ) => void;
}

const MarkModal: React.FC<MarkModalProps> = ({
  document: doc,
  onClose,
  onMark,
}) => {
  const dispatch = useAppDispatch();

  const departments = useAppSelector(selectAllDepartments);
  const departmentsLoading = useAppSelector(selectDepartmentsListLoading);
  const teamMembers = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [userId, setUserId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState("normal");

  useEffect(() => {
    dispatch(fetchDepartments({ is_active: true }));
  }, [dispatch]);

  useEffect(() => {
    if (!deptId) return;
    dispatch(
      fetchUsers({
        is_active: true,
        department_id: deptId,
        limit: 100,
        sort_by: "full_name",
        sort_order: "ASC",
      }),
    );
  }, [dispatch, deptId]);

  const activeDepartments = departments.filter((d) => d.is_active);

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDeptId(e.target.value);
    setUserId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) return;
    onMark(doc.id, { departmentId: deptId, userId, instructions, priority });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
            <span className="text-red-500">📌</span> Mark Document to Department
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none flex-shrink-0">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Document
            </label>
            <div className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 font-medium truncate">
              {doc.title}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Department *
            </label>
            <select
              value={deptId}
              onChange={handleDeptChange}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none disabled:bg-stone-50 disabled:text-stone-400"
              required
              disabled={departmentsLoading}
            >
              <option value="">
                {departmentsLoading
                  ? "Loading departments…"
                  : "— Select Department —"}
              </option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.code ? ` (${d.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Assign to (Optional)
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none disabled:bg-stone-50 disabled:text-stone-400"
              disabled={usersLoading || !deptId}
            >
              <option value="">
                {usersLoading
                  ? "Loading team members…"
                  : !deptId
                    ? "— Select a department first —"
                    : teamMembers.length === 0
                      ? "No active users in this department"
                      : "— Assign to specific user (optional) —"}
              </option>
              {teamMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.pj_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Registrar's Comment{" "}
              <span className="font-normal text-stone-400 normal-case">
                (Visible to Secretary)
              </span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Add instructions, annotations, or comments for this department..."
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-800 order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] flex items-center justify-center gap-1.5 order-1 sm:order-2"
            >
              <span className="text-red-400">📌</span> Mark Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── OtpModal ─────────────────────────────────────────────────────────────

interface OtpModalProps {
  isSigningInProgress: boolean;
  otpLoading: boolean;
  otpValue: string;
  otpError: string | null;
  signingDocId: string | null;
  onOtpChange: (val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onResend: () => void;
  showPositionBox?: boolean;
  positionBox?: { x: number; y: number; width: number; height: number };
}

const OtpModal: React.FC<OtpModalProps> = ({
  isSigningInProgress,
  otpLoading,
  otpValue,
  otpError,
  onOtpChange,
  onSubmit,
  onCancel,
  onResend,
  showPositionBox = false,
  positionBox = { x: 0, y: 0, width: 200, height: 80 },
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4"
    style={{ pointerEvents: 'none' }}
  >
    <div
      className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-900">Confirm E-Signature</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Enter the OTP sent to the <strong>Super Admin</strong>'s email
          </p>
        </div>
      </div>

      {showPositionBox && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-[10px] text-blue-700 font-medium">
            📍 Signature position set
          </p>
          <p className="text-[9px] text-blue-600 mt-0.5">
            Position: ({Math.round(positionBox.x)}, {Math.round(positionBox.y)}) · Size: {Math.round(positionBox.width)}×{Math.round(positionBox.height)}
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-2">
          One-Time PIN
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpValue}
          onChange={(e) =>
            onOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          onKeyDown={(e) =>
            e.key === "Enter" &&
            otpValue.length === 6 &&
            !isSigningInProgress &&
            onSubmit()
          }
          placeholder="● ● ● ● ● ●"
          className="w-full rounded-lg border border-stone-200 px-4 py-3 text-center text-xl font-bold tracking-[0.5em] text-stone-900 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          autoFocus
        />
        <p className="text-[10px] text-stone-400 mt-1.5 text-center">OTP expires in 5 minutes</p>
      </div>

      {otpError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <svg className="h-3.5 w-3.5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-700">{otpError}</p>
        </div>
      )}

      <p className="text-[10px] text-stone-400 text-center mb-5">
        Didn't receive it?{" "}
        <button
          onClick={onResend}
          disabled={otpLoading || isSigningInProgress}
          className="text-[#1E4620] font-semibold hover:underline disabled:opacity-50"
        >
          {otpLoading ? "Sending…" : "Resend OTP"}
        </button>
      </p>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isSigningInProgress}
          className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button          onClick={onSubmit}
          disabled={otpValue.length !== 6 || isSigningInProgress}
          className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isSigningInProgress ? (
            <>
              <Spinner className="h-3.5 w-3.5" /> Verifying…
            </>
          ) : (
            "Confirm & Sign"
          )}
        </button>
      </div>
    </div>
  </div>
);

// ─── ReleaseConfirmationModal ─────────────────────────────────────────────

interface ReleaseConfirmationModalProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note?: string, recipientId?: string) => void;
  isReleasing: boolean;
  users: User[];
  departments: DepartmentWithUserCount[];
}

const ReleaseConfirmationModal: React.FC<ReleaseConfirmationModalProps> = ({
  document,
  isOpen,
  onClose,
  onConfirm,
  isReleasing,
  users = [],
  departments = [],
}) => {
  const [note, setNote] = useState("");
  const [recipientId, setRecipientId] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  const filteredUsers = useMemo(() => {
    if (!selectedDepartment) return users;
    return users.filter((u) => u.department_id === selectedDepartment);
  }, [users, selectedDepartment]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">Release Document</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              This action will make the document visible to the admin side.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs text-amber-800">
            <strong>Document:</strong> {document.title}
          </p>
          <p className="text-xs text-amber-800 mt-1">
            <strong>Status:</strong> {document.status.replace('_', ' ')}
          </p>
          {document.signed_by_name && (
            <p className="text-xs text-amber-800 mt-1">
              <strong>Signed by:</strong> {document.signed_by_name}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
            Department *
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setRecipientId("");
            }}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            disabled={isReleasing}
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.user_count || 0} users)
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
            Assign to User (Optional)
          </label>
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] disabled:opacity-50"
            disabled={!selectedDepartment || isReleasing}
          >
            <option value="">Select User</option>
            {filteredUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name} — {user.pj_number}
              </option>
            ))}
          </select>
          {selectedDepartment && filteredUsers.length === 0 && (
            <p className="mt-1 text-[10px] text-amber-600">
              No active users found in this department.
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
            Release Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add a note about this release..."
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] resize-none"
            disabled={isReleasing}
          />
        </div>

        <div className="flex items-start gap-2 mb-4 p-2 bg-red-50 rounded-lg border border-red-100">
          <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-red-700">
            <strong>Warning:</strong> This action cannot be undone. Once released, 
            the document will be visible to all admin users.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isReleasing}
            className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note || undefined, recipientId || undefined)}
            disabled={!selectedDepartment || isReleasing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReleasing ? (
              <>
                <Spinner className="h-4 w-4" />
                Releasing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Confirm Release
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── BringUpModal ───────────────────────────────────────────────────────────

interface BringUpModalProps {
  document: Document;
  onClose: () => void;
  onSetBringUp: (input: SetBringUpInput) => Promise<void>;
  onUpdateBringUp: (input: UpdateBringUpInput) => Promise<void>;
  onCompleteBringUp: (input: CompleteBringUpInput) => Promise<void>;
  isSetting: boolean;
  isUpdating: boolean;
  isCompleting: boolean;
}

const BringUpModal: React.FC<BringUpModalProps> = ({
  document,
  onClose,
  onSetBringUp,
  onUpdateBringUp,
  onCompleteBringUp,
  isSetting,
  isUpdating,
  isCompleting,
}) => {
  const dispatch = useAppDispatch();
  const users = useAppSelector(selectAllUsers);
  const usersLoading = useAppSelector(selectUsersListLoading);

  const [bringUpDate, setBringUpDate] = useState<string>(
    document.bring_up_date ? new Date(document.bring_up_date).toISOString().split('T')[0] : ''
  );
  const [notes, setNotes] = useState<string>(document.bring_up_notes || '');
  const [assignTo, setAssignTo] = useState<string>(document.assigned_to || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchUsers({ is_active: true, limit: 100 }));
  }, [dispatch]);

  const isEditing = !!document.bring_up_date;
  const isCompleted = !!document.bring_up_completed_at;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bringUpDate) {
      setError('Please select a bring up date');
      return;
    }
    setError(null);

    try {
      if (isEditing) {
        await onUpdateBringUp({
          bring_up_date: new Date(bringUpDate).toISOString(),
          notes: notes || undefined,
        });
      } else {
        await onSetBringUp({
          bring_up_date: new Date(bringUpDate).toISOString(),
          notes: notes || undefined,
          assign_to: assignTo || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to set bring up date');
    }
  };

  const handleComplete = async () => {
    try {
      await onCompleteBringUp({
        notes: notes || undefined,
      });
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to complete bring up');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {isEditing ? 'Update Bring Up Date' : 'Set Bring Up Date'}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
              Document
            </label>
            <div className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 font-medium truncate">
              {document.title}
            </div>
          </div>

          {document.bring_up_date && !document.bring_up_completed_at && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <p><strong>Current Bring Up Date:</strong> {new Date(document.bring_up_date).toLocaleDateString()}</p>
              {document.bring_up_notes && <p className="mt-1"><strong>Notes:</strong> {document.bring_up_notes}</p>}
            </div>
          )}

          {isCompleted && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <p><strong>✅ Bring Up Completed</strong></p>
              <p className="mt-1">Completed on: {new Date(document.bring_up_completed_at!).toLocaleDateString()}</p>
              {document.bring_up_notes && <p className="mt-1"><strong>Notes:</strong> {document.bring_up_notes}</p>}
            </div>
          )}

          {!isCompleted && (
            <>
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                  Bring Up Date *
                </label>
                <input
                  type="date"
                  value={bringUpDate}
                  onChange={(e) => setBringUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                  Notes <span className="font-normal text-stone-400 normal-case">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about this bring up..."
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none resize-none"
                />
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1">
                    Assign To <span className="font-normal text-stone-400 normal-case">(optional)</span>
                  </label>
                  <select
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none disabled:bg-stone-50 disabled:text-stone-400"
                    disabled={usersLoading}
                  >
                    <option value="">
                      {usersLoading ? 'Loading users…' : '— Assign to specific user (optional) —'}
                    </option>
                    {users.filter(u => u.is_active).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} — {u.pj_number}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            {isEditing && !isCompleted && (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isCompleting}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isCompleting ? <Spinner className="h-3.5 w-3.5" /> : '✓ Complete'}
              </button>
            )}
            {!isCompleted && (
              <button
                type="submit"
                disabled={isSetting || isUpdating || !bringUpDate}
                className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {(isSetting || isUpdating) ? <Spinner className="h-3.5 w-3.5" /> : null}
                {isEditing ? 'Update Bring Up' : 'Set Bring Up'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── DocumentEditor ────────────────────────────────────────────────────────

// ─── DocumentEditor ────────────────────────────────────────────────────────

interface DocumentEditorProps {
  document: Document;
  currentUserName: string;
  isSuperAdmin: boolean;
  isReleased?: boolean;
  onBack: () => void;
  onSave?: (id: string, body: string) => Promise<void>;
  onFieldUpdate?: (field: string, value: string) => void;
  onDelete?: () => void;
  onSign?: () => void;
  isSigning?: boolean;
  onSend?: () => void;
  onMark?: () => void;
  onAcknowledge?: () => void;
  onComplete?: () => void;
  onUpdateMark?: (markId: string, text: string) => void;
  onDownload?: () => void;
  onRegeneratePdf?: () => Promise<void>;
  isRegeneratingPdf?: boolean;
  showSignatureBox?: boolean;
  signatureBoxPosition?: { x: number; y: number; width: number; height: number };
  onSignatureBoxChange?: (pos: { x: number; y: number; width: number; height: number }) => void;
  onAutoSignaturePosition?: (pos: { x: number; y: number; width: number; height: number }) => void;
  isOtpModalOpen?: boolean;
  onOpenBringUp?: () => void;
  isSettingBringUp?: boolean;
  isUpdatingBringUp?: boolean;
  isCompletingBringUp?: boolean;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  currentUserName,
  isSuperAdmin,
  isReleased = false,
  onBack,
  onSave,
  onDelete,
  onSign,
  isSigning = false,
  onSend,
  onMark,
  onAcknowledge,
  onComplete,
  onDownload,
  isRegeneratingPdf = false,
  onOpenBringUp,
  isSettingBringUp = false,
  isUpdatingBringUp = false,
  isCompletingBringUp = false,
}) => {
  const isComposed = document.type === "memo" || document.type === "letter" || document.type === "certificate";
  const isEditable = !!onSave && isComposed;

  const formattedDate = document.created_at
    ? format(new Date(document.created_at), "dd MMM yyyy")
    : "—";

  const [isEditMode, setIsEditMode] = useState(false);

  const hasBringUp = !!document.bring_up_date;
  const isBringUpCompleted = !!document.bring_up_completed_at;
  const isBringUpOverdue = hasBringUp && !isBringUpCompleted && new Date(document.bring_up_date!) < new Date();

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (document.file_url) {
      window.open(document.file_url, '_blank');
    } else {
      toast.error('No file available to download');
    }
  };

  const handleToggleEdit = () => {
    if (isReleased) return;
    setIsEditMode(!isEditMode);
  };

  const handleSave = async () => {
    if (!onSave || !document.body) return;
    try {
      await onSave(document.id, document.body);
      toast.success('Document saved successfully');
    } catch {
      toast.error('Failed to save document');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 sm:gap-3 bg-white border-b border-stone-200 px-3 sm:px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="lg:hidden flex-shrink-0 rounded-md p-1 text-stone-500 hover:bg-stone-100 transition-colors -ml-1"
            aria-label="Back to document list"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-stone-900 truncate">
            {document.title}
          </span>
          <span className="text-stone-300 text-xs hidden sm:inline">—</span>
          <span className="text-xs text-stone-400 hidden sm:inline">
            {formattedDate}
          </span>
          {hasBringUp && !isBringUpCompleted && (
            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${
              isBringUpOverdue 
                ? 'bg-red-100 text-red-700 border border-red-200' 
                : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              📅 {format(new Date(document.bring_up_date!), 'dd MMM yyyy')}
              {isBringUpOverdue && ' ⚠️ OVERDUE'}
            </span>
          )}
          {isBringUpCompleted && (
            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
              ✅ Completed
            </span>
          )}
          <StatusBadge status={document.status} />
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto w-full sm:w-auto">
          {isSuperAdmin && onOpenBringUp && (
            <button
              onClick={onOpenBringUp}
              disabled={isSettingBringUp || isUpdatingBringUp || isCompletingBringUp}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                hasBringUp && !isBringUpCompleted
                  ? isBringUpOverdue
                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : isBringUpCompleted
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {(isSettingBringUp || isUpdatingBringUp || isCompletingBringUp) ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              )}
              {hasBringUp && !isBringUpCompleted ? 'Update Bring Up' : hasBringUp ? 'Bring Up Completed' : 'Set Bring Up'}
            </button>
          )}

          {isSuperAdmin && isComposed && !isReleased && (
            <button
              onClick={handleToggleEdit}
              disabled={isRegeneratingPdf}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap disabled:opacity-50 ${
                isEditMode
                  ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {isRegeneratingPdf ? <Spinner className="h-3.5 w-3.5" /> : isEditMode ? "Done" : "Edit"}
            </button>
          )}

          {isEditable && isEditMode && (
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap"
            >
              Save
            </button>
          )}

          {(document.file_url || onDownload) && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}

          {onMark && document.status !== "filed" && (
            <button
              onClick={onMark}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Mark
            </button>
          )}

          {onAcknowledge && (
            <button
              onClick={onAcknowledge}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors whitespace-nowrap"
            >
              Acknowledge
            </button>
          )}

          {onComplete && (
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap"
            >
              Complete
            </button>
          )}

          {onSign && (
            <button
              onClick={onSign}
              disabled={isSigning}
              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isSigning ? <Spinner className="h-3 w-3" /> : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
              {isSigning ? "Sending OTP…" : "Request E-Sign"}
            </button>
          )}

          {onSend && (
            <button
              onClick={onSend}
              className="rounded-md bg-[#1E4620] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#163a18] transition-colors whitespace-nowrap"
            >
              <svg className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Convert to PDF & Send
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="rounded-md p-1.5 text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-stone-100 py-3 px-2 sm:py-6 sm:px-6">
        <div className="mx-auto max-w-[794px] w-full bg-white shadow-sm rounded-sm pdf-page-surface p-8">
          <div className="flex justify-center mb-3">
            <img
              src="/JOB_LOGO.jpg"
              alt="Judiciary of Kenya crest"
              className="h-[78px] w-auto object-contain"
              onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
            />
          </div>
          <div className="text-center mt-4 mb-2">
            <p className="text-[19px] font-bold uppercase leading-snug">
              OFFICE OF THE REGISTRAR HIGH COURT
            </p>
          </div>
          <div className="border-t-[2.5px] border-black mb-2.5" />

          <div className="mt-4">
            <div className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
              <span className="w-24 shrink-0 uppercase">REF</span>
              <span className="w-5 shrink-0">:</span>
              <span className="flex-1">{document.reference_no || 'RHC/000/2024'}</span>
            </div>
            <div className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
              <span className="w-24 shrink-0 uppercase">DATE</span>
              <span className="w-5 shrink-0">:</span>
              <span className="flex-1">{formattedDate}</span>
            </div>
            <div className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
              <span className="w-24 shrink-0 uppercase">TO</span>
              <span className="w-5 shrink-0">:</span>
              <span className="flex-1">{document.to_recipient || document.assigned_to_name || 'All Staff'}</span>
            </div>
            <div className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
              <span className="w-24 shrink-0 uppercase">FROM</span>
              <span className="w-5 shrink-0">:</span>
              <span className="flex-1">{document.from_sender || document.department_name || 'Registrar, High Court'}</span>
            </div>
            <div className="flex text-[13.5px] font-bold border-b-2 border-black pb-3" style={{ lineHeight: 2 }}>
              <span className="w-24 shrink-0 uppercase">SUBJECT</span>
              <span className="w-5 shrink-0">:</span>
              <span className="flex-1">{document.subject || document.title}</span>
            </div>
          </div>

          <div className="mt-8 min-h-[200px] text-[13.5px] leading-[1.8] text-justify">
            {document.body ? (
              <div dangerouslySetInnerHTML={{ __html: document.body }} />
            ) : (
              <p className="text-stone-400 italic">No content available.</p>
            )}
          </div>

          <div className="mt-16">
            <div className="font-bold uppercase text-[13.5px]">
              {document.signature_name || currentUserName || 'REGISTRAR, HIGH COURT'}
            </div>
            <div className="font-bold underline uppercase text-[13.5px]">
              {document.signature_title || 'REGISTRAR, HIGH COURT'}
            </div>
          </div>

          <div className="mt-12 pt-3 border-t border-stone-300 flex items-center gap-3">
            <div className="flex-1 text-[10px] leading-tight text-stone-700">
              <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
              <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
              <p className="font-bold text-[#1E4620] mt-1">Justice Be Our Shield and Defender</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MemoandLetters: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { documents, loading, error, pagination, actionInProgress } =
    useAppSelector((state) => state.documents);

  const users = useAppSelector(selectAllUsers);
  const departments = useAppSelector(selectAllDepartments);

  // ─── Helpdesk document state ──────────────────────────────────────────────
  const helpdeskDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const helpdeskLoading = useAppSelector((state) => state.helpdeskDocuments.loading.fetch);
  const currentUser = useAppSelector(selectCurrentUser);

  const [activeTab, setActiveTab] = useState<"all" | "my_action" | "helpdesk_approvals">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedHelpdeskDoc, setSelectedHelpdeskDoc] = useState<HelpdeskDocument | null>(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [showComposer, setShowComposer] = useState<"memo" | "letter" | "certificate" | null>(null);
  const [signToast, setSignToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isCreating] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [signingDocId, setSigningDocId] = useState<string | null>(null);

  const [signatureBoxPosition, setSignatureBoxPosition] = useState({
    x: 100,
    y: 400,
    width: 160,
    height: 55,
  });
  const [showSignatureBox, setShowSignatureBox] = useState(false);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const [showBringUpModal, setShowBringUpModal] = useState(false);

  const canUpload = hasRole(user, "staff") || hasRole(user, "super_admin");
  const canAdmin = hasRole(user, "dept_head") || hasRole(user, "super_admin");
  const isSuperAdmin = hasRole(user, "super_admin");
  const canView = !!user;

  // ─── Filter regular documents ──────────────────────────────────────────────
  const memoLetterDocs = useMemo(
    () => documents.filter(
      (doc) => (doc.type === "memo" || doc.type === "letter" || doc.type === "certificate") && doc.status !== "released"
    ),
    [documents]
  );

  // ─── Filter helpdesk docs pending approval ────────────────────────────────────
  const pendingApprovalDocs = useMemo(
    () => helpdeskDocuments.filter(
      (doc) => doc.status === 'pending_approval' || 
               (doc.internal_approval_status === 'pending' || doc.internal_approval_status === 'previewed')
    ),
    [helpdeskDocuments]
  );

  const displayedHelpdeskDocs = activeTab === 'helpdesk_approvals' ? pendingApprovalDocs : helpdeskDocuments;

  useEffect(() => {
    if (!canView) return;
    const params: DocumentFilters = { page: 1, limit: 10 };
    if (activeTab === "my_action") params.for_my_action = true;
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchDocuments(params));
  }, [dispatch, activeTab, searchQuery, canView]);

  // ─── Fetch helpdesk documents for approval ─────────────────────────────────
  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchHelpdeskDocuments({ 
        pending_internal_approval: true,
        status: 'pending_approval'
      }));
    }
  }, [dispatch, isSuperAdmin, activeTab]);

  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchUsers({ is_active: true, limit: 100 }));
      dispatch(fetchDepartments({ is_active: true }));
    }
  }, [dispatch, isSuperAdmin]);

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this document?")) {
      dispatch(deleteDocument(id));
    }
  };

  const handleSend = (id: string) => {
    dispatch(sendDocument(id));
  };

  const handleAcknowledge = (id: string) => {
    dispatch(acknowledgeMark(id));
  };

  const handleComplete = (id: string) => {
    dispatch(completeMark(id));
  };

  const showToast = (toastMsg: { type: "success" | "error"; message: string }) => {
    setSignToast(toastMsg);
    setTimeout(() => setSignToast(null), 4000);
  };

  const handleSign = async (id: string) => {
    setOtpError(null);
    setOtpValue("");
    setSigningDocId(id);
    setOtpLoading(true);
    setShowSignatureBox(true);

    const result = await dispatch(requestSignOtp(id));
    setOtpLoading(false);

    if (requestSignOtp.fulfilled.match(result)) {
      setShowOtpModal(true);
      toast.success("OTP sent. Drag the signature box to position it, then enter the OTP.");
    } else {
      setShowSignatureBox(false);
      showToast({
        type: "error",
        message:
          (result.payload as string) ?? "Failed to send OTP. Please try again.",
      });
    }
  };

  const handleSignatureBoxChange = (pos: { x: number; y: number; width: number; height: number }) => {
    setSignatureBoxPosition(pos);
  };

  const handleOtpSubmit = async () => {
    if (!signingDocId || !otpValue.trim()) return;
    setOtpError(null);

    const PDF_PAGE_WIDTH_PT = 595.28;
    const pageSurfaceEl = window.document.querySelector('.pdf-page-surface');
    const renderedPageWidthPx = pageSurfaceEl
      ? pageSurfaceEl.getBoundingClientRect().width
      : 794;
    const scale = PDF_PAGE_WIDTH_PT / renderedPageWidthPx;

    const positionX = signatureBoxPosition.x * scale;
    const positionY = (signatureBoxPosition.y + 5) * scale;
    const positionWidth = signatureBoxPosition.width * scale;
    const positionHeight = signatureBoxPosition.height * scale;

    const payload = {
      id: signingDocId,
      otp: otpValue.trim(),
      position_x: positionX,
      position_y: positionY,
      position_width: positionWidth,
      position_height: positionHeight,
    };

    const result = await dispatch(signDocument(payload));

    if (signDocument.fulfilled.match(result)) {
      setShowOtpModal(false);
      setShowSignatureBox(false);
      setOtpValue("");
      setSigningDocId(null);

      const signedDoc = result.payload as Document;
      setSelectedDocument(signedDoc);

      toast.success("Document signed successfully. Ready for release.");

      const params: DocumentFilters = { page: 1, limit: 10 };
      if (activeTab === "my_action") params.for_my_action = true;
      if (searchQuery) params.search = searchQuery;
      dispatch(fetchDocuments(params));
    } else {
      setOtpError(
        (result.payload as string) ?? "Invalid OTP. Please try again."
      );
    }
  };

  const handleOtpCancel = () => {
    setShowOtpModal(false);
    setShowSignatureBox(false);
    setOtpValue("");
    setOtpError(null);
    setSigningDocId(null);
  };

  const handleOtpChange = (val: string) => {
    setOtpError(null);
    setOtpValue(val);
  };

  const handleReleaseConfirm = async (note?: string, recipientId?: string) => {
    if (!selectedDocument) return;

    setIsReleasing(true);
    try {
      const result = await dispatch(releaseDocument({
        id: selectedDocument.id,
        note,
        recipient_id: recipientId,
      }));

      if (releaseDocument.fulfilled.match(result)) {
        setSelectedDocument(result.payload as Document);
        toast.success('Document released to admin side successfully.');
        const params: DocumentFilters = { page: 1, limit: 10 };
        if (activeTab === "my_action") params.for_my_action = true;
        if (searchQuery) params.search = searchQuery;
        dispatch(fetchDocuments(params));
      } else {
        toast.error((result.payload as string) ?? 'Failed to release document.');
      }
    } catch {
      toast.error('An error occurred while releasing the document.');
    } finally {
      setIsReleasing(false);
      setShowReleaseModal(false);
    }
  };

  const handleRelease = () => {
    setShowReleaseModal(true);
  };

  // ─── Bring Up handlers ──────────────────────────────────────────────────────

  const handleOpenBringUp = () => {
    setShowBringUpModal(true);
  };

  const handleSetBringUp = async (input: SetBringUpInput) => {
    if (!selectedDocument) return;
    await dispatch(setBringUp({ id: selectedDocument.id, input })).unwrap();
    const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
    setSelectedDocument(refreshed);
    refreshDocuments();
    toast.success('Bring up date set successfully');
  };

  const handleUpdateBringUp = async (input: UpdateBringUpInput) => {
    if (!selectedDocument) return;
    await dispatch(updateBringUp({ id: selectedDocument.id, input })).unwrap();
    const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
    setSelectedDocument(refreshed);
    refreshDocuments();
    toast.success('Bring up date updated successfully');
  };

  const handleCompleteBringUp = async (input: CompleteBringUpInput) => {
    if (!selectedDocument) return;
    await dispatch(completeBringUp({ id: selectedDocument.id, input })).unwrap();
    const refreshed = await dispatch(fetchDocumentById(selectedDocument.id)).unwrap();
    setSelectedDocument(refreshed);
    refreshDocuments();
    toast.success('Bring up completed successfully');
  };

  const refreshDocuments = useCallback(() => {
    const params: DocumentFilters = { page: 1, limit: 10 };
    if (activeTab === "my_action") params.for_my_action = true;
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchDocuments(params));
  }, [dispatch, activeTab, searchQuery]);

  const handleMark = (
    id: string,
    data: {
      departmentId: string;
      userId: string;
      instructions: string;
      priority: string;
    }
  ) => {
    dispatch(
      markDocument({
        id,
        input: {
          department_id: data.departmentId,
          assigned_to: data.userId || undefined,
          instructions: data.instructions,
          priority: data.priority as "low" | "normal" | "urgent",
        },
      })
    );
    setShowMarkModal(false);
  };

  const handlePageChange = (page: number) => {
    const params: DocumentFilters = { page, limit: 10 };
    if (activeTab === "my_action") params.for_my_action = true;
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchDocuments(params));
  };

  const handleSaveBody = async (id: string, body: string) => {
    const result = await dispatch(updateDocument({ id, input: { body } }));
    if (updateDocument.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
    } else {
      throw new Error((result.payload as string) ?? "Failed to save changes");
    }
  };

  const handleFieldUpdate = async (field: string, value: string) => {
    if (!selectedDocument) return;
    const result = await dispatch(
      updateDocument({
        id: selectedDocument.id,
        input: { [field]: value }
      })
    );
    if (updateDocument.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
    } else {
      toast.error("Failed to update field");
    }
  };

  const handleUpdateMark = (markId: string, text: string) => {
    dispatch(updateMark({ markId, instructions: text }));
    if (selectedDocument && selectedDocument.active_mark) {
      const updatedMark = {
        ...selectedDocument.active_mark,
        instructions: text,
      };
      setSelectedDocument({
        ...selectedDocument,
        active_mark: updatedMark,
      });
    }
  };

  const handleRegeneratePdf = async () => {
    if (!selectedDocument) return;
    const result = await dispatch(regeneratePdf(selectedDocument.id));
    if (regeneratePdf.fulfilled.match(result)) {
      setSelectedDocument(result.payload as Document);
    } else {
      toast.error((result.payload as string) ?? "Failed to regenerate PDF");
    }
  };

  const handleTemplateCreated = (doc: Document) => {
    toast.success(`${doc.type} created successfully`);
    setShowComposer(null);
    setSelectedDocument(doc);
    const params: DocumentFilters = { page: 1, limit: 10 };
    if (activeTab === "my_action") params.for_my_action = true;
    if (searchQuery) params.search = searchQuery;
    dispatch(fetchDocuments(params));
  };

  const handleDownload = () => {
    if (!selectedDocument?.file_url) {
      toast.error('No file available to download');
      return;
    }
    window.open(selectedDocument.file_url, '_blank');
  };

  // ─── Helpdesk Document Handlers ───────────────────────────────────────────

  const handleSelectHelpdeskDoc = (doc: HelpdeskDocument) => {
    setSelectedHelpdeskDoc(doc);
  };

  const handleHelpdeskPreview = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    try {
      await dispatch(internalPreviewDocument({
        id: doc.id,
        previewed_by: currentUser?.id,
        previewed_by_name: currentUser?.full_name,
        comments: 'Document previewed by Super Admin',
      })).unwrap();
      toast.success('Document previewed successfully.');
      dispatch(fetchHelpdeskDocuments({ pending_internal_approval: true }));
      const refreshed = helpdeskDocuments.find(d => d.id === doc.id);
      if (refreshed) setSelectedHelpdeskDoc(refreshed);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to preview document.');
    }
  };

  const handleHelpdeskApprove = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    try {
      await dispatch(internalApproveDocument({
        id: doc.id,
        action: 'approve',
        approved_by: currentUser?.id,
        approved_by_name: currentUser?.full_name,
        comments: 'Document approved internally.',
        generate_e_stamp: true,
      })).unwrap();
      toast.success('Document approved internally.');
      dispatch(fetchHelpdeskDocuments({ pending_internal_approval: true }));
      const refreshed = helpdeskDocuments.find(d => d.id === doc.id);
      if (refreshed) setSelectedHelpdeskDoc(refreshed);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to approve document.');
    }
  };

  const handleHelpdeskReject = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    const reason = prompt('Please provide a reason for rejecting this document:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    try {
      await dispatch(internalRejectDocument({
        id: doc.id,
        action: 'reject',
        rejection_reason: reason.trim(),
        comments: `Rejected internally: ${reason.trim()}`,
        approved_by: currentUser?.id,
        approved_by_name: currentUser?.full_name,
      })).unwrap();
      toast.success('Document rejected internally.');
      dispatch(fetchHelpdeskDocuments({ pending_internal_approval: true }));
      const refreshed = helpdeskDocuments.find(d => d.id === doc.id);
      if (refreshed) setSelectedHelpdeskDoc(refreshed);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to reject document.');
    }
  };

  const handleHelpdeskRequestChanges = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    const changes = prompt('Please list the changes requested (comma separated):');
    if (changes === null) return;
    if (!changes.trim()) {
      toast.error('At least one change request is required.');
      return;
    }
    const changesList = changes.split(',').map(c => c.trim()).filter(c => c.length > 0);
    if (changesList.length === 0) {
      toast.error('At least one valid change request is required.');
      return;
    }
    try {
      await dispatch(internalRequestChanges({
        id: doc.id,
        action: 'request_changes',
        changes_requested: changesList,
        comments: `Changes requested internally: ${changesList.join(', ')}`,
        approved_by: currentUser?.id,
        approved_by_name: currentUser?.full_name,
      })).unwrap();
      toast.success('Changes requested internally.');
      dispatch(fetchHelpdeskDocuments({ pending_internal_approval: true }));
      const refreshed = helpdeskDocuments.find(d => d.id === doc.id);
      if (refreshed) setSelectedHelpdeskDoc(refreshed);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to request changes.');
    }
  };

  const handleHelpdeskSendBack = async (doc: HelpdeskDocument, finalStatus: 'approved' | 'rejected' | 'changes_requested') => {
    if (!isSuperAdmin) return;
    try {
      await dispatch(sendBackToRequester({
        id: doc.id,
        final_status: finalStatus,
        sent_by: currentUser?.id,
        sent_by_name: currentUser?.full_name,
        comments: `Document sent back to requester with status: ${finalStatus}`,
        notify_requester: true,
      })).unwrap();
      const statusMessages = {
        approved: 'Document approved and sent back to requester.',
        rejected: 'Document rejected and sent back to requester.',
        changes_requested: 'Changes requested and sent back to requester.',
      };
      toast.success(statusMessages[finalStatus]);
      dispatch(fetchHelpdeskDocuments({ pending_internal_approval: true }));
      setSelectedHelpdeskDoc(null);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to send document back to requester.');
    }
  };

  const handleHelpdeskCancelDecision = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Cancel the internal approval decision? This will reset the document to pending review.')) return;
    try {
      await dispatch(cancelInternalApproval({
        id: doc.id,
        cancelled_by: currentUser?.id,
        cancelled_by_name: currentUser?.full_name,
        reason: 'Decision cancelled by Super Admin',
      })).unwrap();
      toast.success('Internal decision cancelled.');
      dispatch(fetchHelpdeskDocuments({ pending_internal_approval: true }));
      const refreshed = helpdeskDocuments.find(d => d.id === doc.id);
      if (refreshed) setSelectedHelpdeskDoc(refreshed);
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to cancel decision.');
    }
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4 text-center">
        <p className="text-stone-400 text-sm">
          You don't have access to Document Management.
        </p>
      </div>
    );
  }

  const isSigningInProgress = !!actionInProgress.signing;
  const isSettingBringUp = !!actionInProgress.settingBringUp;
  const isUpdatingBringUp = !!actionInProgress.updatingBringUp;
  const isCompletingBringUp = !!actionInProgress.completingBringUp;

  const displayList = activeTab === 'helpdesk_approvals' ? displayedHelpdeskDocs : memoLetterDocs;
  const isLoading = activeTab === 'helpdesk_approvals' ? helpdeskLoading : loading;

  return (
    <div className="flex flex-col h-full">
      {signToast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            signToast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <span>{signToast.type === "success" ? "✅" : "❌"}</span>
          <span>{signToast.message}</span>
          <button
            onClick={() => setSignToast(null)}
            className="ml-2 text-white/70 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {showComposer && (
        <TemplateComposerModal
          type={showComposer}
          departmentId={user?.department_id ?? null}
          onClose={() => setShowComposer(null)}
          onCreated={handleTemplateCreated}
        />
      )}

      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white flex-wrap">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight truncate">
            Memos, Letters &amp; Approvals
          </h1>
          <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 hidden sm:block">
            Compose, edit, and manage your official documents and helpdesk approvals
          </p>
        </div>

        {canUpload && activeTab !== 'helpdesk_approvals' && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setShowComposer("memo")}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8A840] bg-[#F5C24C] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#7A4E0D] hover:bg-[#f0bb40] transition-colors disabled:opacity-50"
            >
              <span>📄</span> New Memo
            </button>
            <button
              onClick={() => setShowComposer("letter")}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <span>✉️</span> New Letter
            </button>
            <button
              onClick={() => setShowComposer("certificate")}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <span>📜</span> New Certificate
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div
          className={`w-full lg:w-[300px] flex-shrink-0 flex-col border-r border-stone-200 bg-white overflow-hidden ${
            selectedDocument || selectedHelpdeskDoc ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="px-4 pt-4 pb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 pl-8 text-xs placeholder:text-stone-400 focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] focus:bg-white"
              />
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 rounded-md px-1.5 py-1.5 text-[9px] font-semibold transition-colors ${
                activeTab === "all" ? "bg-[#1E4620] text-white" : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("my_action")}
              className={`flex-1 rounded-md px-1.5 py-1.5 text-[9px] font-semibold transition-colors ${
                activeTab === "my_action" ? "bg-[#1E4620] text-white" : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              For My Action
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab("helpdesk_approvals")}
                className={`flex-1 rounded-md px-1.5 py-1.5 text-[9px] font-semibold transition-colors ${
                  activeTab === "helpdesk_approvals" ? "bg-[#1E4620] text-white" : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                Approvals
                {pendingApprovalDocs.length > 0 && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
                    {pendingApprovalDocs.length}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="mx-3 mb-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => dispatch(clearError())} className="underline ml-2">✕</button>
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1E4620] border-t-transparent" />
              </div>
            ) : displayList.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-stone-400">
                  {activeTab === 'helpdesk_approvals' 
                    ? 'No pending approvals.' 
                    : 'No documents found.'}
                </p>
                {canUpload && activeTab !== 'helpdesk_approvals' && (
                  <p className="text-xs text-stone-300 mt-1">Click "New Memo", "New Letter", or "New Certificate" to start.</p>
                )}
              </div>
            ) : activeTab === 'helpdesk_approvals' ? (
              <div className="divide-y divide-stone-100">
                {(displayList as HelpdeskDocument[]).map((doc) => (
                  <HelpdeskListItem
                    key={doc.id}
                    document={doc}
                    selected={selectedHelpdeskDoc?.id === doc.id}
                    onSelect={() => handleSelectHelpdeskDoc(doc)}
                  />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {(displayList as Document[]).map((doc) => (
                  <ListItem
                    key={doc.id}
                    document={doc}
                    selected={selectedDocument?.id === doc.id}
                    onSelect={() => setSelectedDocument(doc)}
                    hasResponse={(doc.response_count ?? 0) > 0}
                  />
                ))}
              </div>
            )}
          </div>

          {!isLoading && activeTab !== 'helpdesk_approvals' && pagination && pagination.totalPages > 1 && (
            <div className="border-t border-stone-200 bg-stone-50 px-3 py-2.5 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-stone-500 font-medium whitespace-nowrap">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-[10px] text-stone-500 px-1">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Main Content Area ────────────────────────────────────────────── */}
        <div
          className={`w-full flex-1 flex-col overflow-hidden bg-stone-100 ${
            selectedDocument || selectedHelpdeskDoc ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedDocument ? (
            <DocumentEditor
              key={selectedDocument.id}
              document={selectedDocument}
              currentUserName={user?.full_name ?? "Registrar"}
              isSuperAdmin={isSuperAdmin}
              isReleased={selectedDocument.status === 'released'}
              onBack={() => setSelectedDocument(null)}
              onSave={
                (isSuperAdmin && (selectedDocument.type === 'memo' || selectedDocument.type === 'letter' || selectedDocument.type === 'certificate')) ||
                (canUpload && selectedDocument.status !== "filed")
                  ? handleSaveBody
                  : undefined
              }
              onFieldUpdate={isSuperAdmin ? handleFieldUpdate : undefined}
              onDelete={canAdmin ? () => handleDelete(selectedDocument.id) : undefined}
              onSign={
                !selectedDocument.is_signed 
                  ? () => handleSign(selectedDocument.id)
                  : undefined
              }
              isSigning={otpLoading || actionInProgress.signing === selectedDocument.id}
              onSend={
                canAdmin &&
                !selectedDocument.is_sent &&
                selectedDocument.status === 'released'
                  ? () => handleSend(selectedDocument.id)
                  : undefined
              }
              onMark={
                canAdmin && selectedDocument.status !== "filed"
                  ? () => setShowMarkModal(true)
                  : undefined
              }
              onAcknowledge={
                (selectedDocument.status === "marked" || selectedDocument.status === "user_assigned") &&
                (selectedDocument.assigned_to === user?.id || isSuperAdmin)
                  ? () => handleAcknowledge(selectedDocument.id)
                  : undefined
              }
              onComplete={
                selectedDocument.status === "in_progress" &&
                (selectedDocument.assigned_to === user?.id || isSuperAdmin)
                  ? () => handleComplete(selectedDocument.id)
                  : undefined
              }
              onUpdateMark={handleUpdateMark}
              onDownload={handleDownload}
              onRegeneratePdf={
                isSuperAdmin && (selectedDocument.type === 'memo' || selectedDocument.type === 'letter' || selectedDocument.type === 'certificate')
                  ? handleRegeneratePdf
                  : undefined
              }
              isRegeneratingPdf={actionInProgress.regeneratingPdf === selectedDocument.id}
              showSignatureBox={showSignatureBox}
              signatureBoxPosition={signatureBoxPosition}
              onSignatureBoxChange={handleSignatureBoxChange}
              onAutoSignaturePosition={handleSignatureBoxChange}
              isOtpModalOpen={showOtpModal}
              onOpenBringUp={isSuperAdmin ? handleOpenBringUp : undefined}
              isSettingBringUp={isSettingBringUp}
              isUpdatingBringUp={isUpdatingBringUp}
              isCompletingBringUp={isCompletingBringUp}
            />
          ) : selectedHelpdeskDoc ? (
            // ─── Helpdesk Document Detail View ──────────────────────────────────
            <div className="flex flex-col h-full overflow-hidden bg-white">
              <div className="flex items-center justify-between gap-2 sm:gap-3 bg-white border-b border-stone-200 px-3 sm:px-4 py-2.5 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setSelectedHelpdeskDoc(null)}
                    className="lg:hidden flex-shrink-0 rounded-md p-1 text-stone-500 hover:bg-stone-100 transition-colors -ml-1"
                    aria-label="Back"
                  >
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-stone-900 truncate">
                    {selectedHelpdeskDoc.subject}
                  </span>
                  <HelpdeskStatusBadge status={selectedHelpdeskDoc.status} />
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto w-full sm:w-auto">
                  <a
                    href={selectedHelpdeskDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View
                  </a>
                  <a
                    href={selectedHelpdeskDoc.file_url}
                    download
                    className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 transition-colors whitespace-nowrap"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                  <button
                    onClick={() => setSelectedHelpdeskDoc(null)}
                    className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Document Info */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Reference</p>
                    <p className="mt-0.5 text-sm font-mono text-stone-800">{selectedHelpdeskDoc.ref}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Format</p>
                    <p className="mt-0.5 text-sm font-semibold text-stone-800 uppercase">{selectedHelpdeskDoc.format}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Entity Type</p>
                    <p className="mt-0.5 text-sm capitalize text-stone-800">
                      {getHelpdeskEntityDisplay(selectedHelpdeskDoc.entity_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Uploaded On</p>
                    <p className="mt-0.5 text-sm text-stone-800">
                      {new Date(selectedHelpdeskDoc.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Preview Count</p>
                    <p className="mt-0.5 text-sm text-stone-800">{selectedHelpdeskDoc.internal_preview_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Resubmit Count</p>
                    <p className="mt-0.5 text-sm text-stone-800">{selectedHelpdeskDoc.resubmit_count || 0}</p>
                  </div>
                </div>

                {/* Approval Status Section */}
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                    <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Approval Status
                  </h4>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-stone-500">Internal Status:</span>
                      <div className="mt-1">
                        <InternalStatusBadge status={selectedHelpdeskDoc.internal_approval_status} />
                      </div>
                    </div>
                    <div>
                      <span className="text-stone-500">Requester Status:</span>
                      <div className="mt-1">
                        <RequesterStatusBadge status={selectedHelpdeskDoc.requester_status} />
                      </div>
                    </div>
                    {selectedHelpdeskDoc.internal_approved_at && (
                      <div>
                        <span className="text-stone-500">Approved At:</span>
                        <p className="font-medium">{new Date(selectedHelpdeskDoc.internal_approved_at).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedHelpdeskDoc.requester_visible_at && (
                      <div>
                        <span className="text-stone-500">Sent Back At:</span>
                        <p className="font-medium">{new Date(selectedHelpdeskDoc.requester_visible_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {selectedHelpdeskDoc.internal_changes_requested && selectedHelpdeskDoc.internal_changes_requested.length > 0 && (
                    <div className="mt-2">
                      <span className="text-stone-500">Changes Requested:</span>
                      <ul className="mt-1 list-disc list-inside text-sm text-stone-700">
                        {selectedHelpdeskDoc.internal_changes_requested.map((change, idx) => (
                          <li key={idx}>{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedHelpdeskDoc.internal_rejection_reason && (
                    <div className="mt-2">
                      <span className="text-stone-500">Rejection Reason:</span>
                      <p className="text-sm text-red-600">{selectedHelpdeskDoc.internal_rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* E-Stamp Preview */}
                {selectedHelpdeskDoc.e_stamp_url && selectedHelpdeskDoc.e_stamp_status === 'stamped' && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="text-sm font-semibold text-emerald-800">E-Stamp</h4>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={selectedHelpdeskDoc.e_stamp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Stamp
                        </a>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 p-3 bg-white rounded border border-emerald-200">
                      <img
                        src={selectedHelpdeskDoc.e_stamp_url}
                        alt="E-Stamp"
                        className="max-h-16 w-auto object-contain"
                      />
                      <div className="text-xs text-stone-500">
                        <p className="font-mono">{selectedHelpdeskDoc.ref}</p>
                        <p className="text-emerald-600">✓ Approved internally on {selectedHelpdeskDoc.internal_approved_at ? new Date(selectedHelpdeskDoc.internal_approved_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Preview */}
                <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
                  <div className="border-b border-stone-100 px-4 py-2 bg-stone-50">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Document Preview</span>
                  </div>
                  <div className="p-4 min-h-[200px] flex items-center justify-center bg-stone-50">
                    <iframe
                      src={`${selectedHelpdeskDoc.file_url}#toolbar=0`}
                      title={selectedHelpdeskDoc.subject}
                      className="w-full h-[400px] border-0 rounded"
                    />
                  </div>
                </div>

                {/* ─── Approval Actions ────────────────────────────────────────── */}
                {isSuperAdmin && selectedHelpdeskDoc.status === 'pending_approval' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {selectedHelpdeskDoc.internal_approval_status === 'pending' ? 'Pending Your Decision' : 'Decision Made - Send Back to Requester'}
                    </h4>
                    <p className="mt-1 text-xs text-amber-700">
                      {selectedHelpdeskDoc.internal_approval_status === 'pending'
                        ? 'Review the document and make a decision. Approving will stamp the document internally.'
                        : selectedHelpdeskDoc.internal_approval_status === 'approved_internal'
                        ? 'Document approved internally. Send back to requester to make it visible.'
                        : selectedHelpdeskDoc.internal_approval_status === 'rejected_internal'
                        ? 'Document rejected internally. Send back to requester with the rejection reason.'
                        : selectedHelpdeskDoc.internal_approval_status === 'changes_requested_internal'
                        ? 'Changes requested internally. Send back to requester with the list of changes.'
                        : 'Changes ready for re-review. Preview again before deciding.'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* Preview Button */}
                      {(selectedHelpdeskDoc.internal_approval_status === 'pending' || selectedHelpdeskDoc.internal_approval_status === 'changes_ready') && (
                        <button
                          onClick={() => handleHelpdeskPreview(selectedHelpdeskDoc)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Preview
                        </button>
                      )}

                      {/* Approve Button */}
                      {(selectedHelpdeskDoc.internal_approval_status === 'pending' || selectedHelpdeskDoc.internal_approval_status === 'previewed') && (
                        <button
                          onClick={() => handleHelpdeskApprove(selectedHelpdeskDoc)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Approve
                        </button>
                      )}

                      {/* Reject Button */}
                      {(selectedHelpdeskDoc.internal_approval_status === 'pending' || selectedHelpdeskDoc.internal_approval_status === 'previewed') && (
                        <button
                          onClick={() => handleHelpdeskReject(selectedHelpdeskDoc)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          Reject
                        </button>
                      )}

                      {/* Request Changes Button */}
                      {(selectedHelpdeskDoc.internal_approval_status === 'pending' || selectedHelpdeskDoc.internal_approval_status === 'previewed') && (
                        <button
                          onClick={() => handleHelpdeskRequestChanges(selectedHelpdeskDoc)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Request Changes
                        </button>
                      )}

                      {/* Send Back Buttons */}
                      {selectedHelpdeskDoc.is_internal_approval_complete && selectedHelpdeskDoc.internal_approval_status !== 'pending' && !selectedHelpdeskDoc.is_sent_back_to_requester && (
                        <>
                          {selectedHelpdeskDoc.internal_approval_status === 'approved_internal' && (
                            <button
                              onClick={() => handleHelpdeskSendBack(selectedHelpdeskDoc, 'approved')}
                              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              Send Approved
                            </button>
                          )}
                          {selectedHelpdeskDoc.internal_approval_status === 'rejected_internal' && (
                            <button
                              onClick={() => handleHelpdeskSendBack(selectedHelpdeskDoc, 'rejected')}
                              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              Send Rejected
                            </button>
                          )}
                          {selectedHelpdeskDoc.internal_approval_status === 'changes_requested_internal' && (
                            <button
                              onClick={() => handleHelpdeskSendBack(selectedHelpdeskDoc, 'changes_requested')}
                              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              Send Changes Requested
                            </button>
                          )}
                          <button
                            onClick={() => handleHelpdeskCancelDecision(selectedHelpdeskDoc)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Cancel Decision
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Already Sent Back */}
                {selectedHelpdeskDoc.is_sent_back_to_requester && (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                    <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                      <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Sent Back to Requester
                    </h4>
                    <p className="mt-1 text-xs text-stone-600">
                      This document has been sent back to the requester with status:{' '}
                      <RequesterStatusBadge status={selectedHelpdeskDoc.requester_status} />
                    </p>
                    {selectedHelpdeskDoc.requester_visible_at && (
                      <p className="mt-1 text-xs text-stone-500">
                        Sent on: {new Date(selectedHelpdeskDoc.requester_visible_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Approval History */}
                {selectedHelpdeskDoc.approval_history && selectedHelpdeskDoc.approval_history.length > 0 && (
                  <div className="mt-2">
                    <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                      <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Approval History
                    </h3>
                    <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                      {selectedHelpdeskDoc.approval_history.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="relative flex items-start gap-3 rounded-lg border border-stone-100 bg-white p-3"
                        >
                          {index < selectedHelpdeskDoc.approval_history.length - 1 && (
                            <div className="absolute left-5 top-8 h-full w-0.5 bg-stone-200" />
                          )}
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-100">
                            {entry.action === 'submitted' && <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                            {entry.action === 'approved' && <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            {entry.action === 'rejected' && <svg className="h-3.5 w-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>}
                            {entry.action === 'returned' && <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>}
                            {entry.action === 'previewed' && <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                            {entry.action === 'sent_back' && <svg className="h-3.5 w-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                            {entry.action === 'resubmitted' && <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <p className="text-sm font-medium text-stone-800">
                                {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                                {entry.internal_action && (
                                  <span className="ml-2 text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                                    Internal
                                  </span>
                                )}
                                {entry.requester_visible && (
                                  <span className="ml-2 text-xs text-emerald-400 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    Visible
                                  </span>
                                )}
                              </p>
                              <span className="text-xs text-stone-400">
                                {new Date(entry.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-stone-500">
                              By: {entry.from_user_name}
                              {entry.to_user_name && ` → ${entry.to_user_name}`}
                            </p>
                            {entry.comments && (
                              <p className="mt-1 text-xs text-stone-600 bg-stone-50 rounded p-2">
                                {entry.comments}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4">
              <div className="text-center max-w-sm">
                <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3 text-sm font-semibold text-stone-500">Select a document</p>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  Choose a document from the list, or create a new one to start writing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showMarkModal && selectedDocument && (
        <MarkModal
          document={selectedDocument}
          onClose={() => setShowMarkModal(false)}
          onMark={handleMark}
        />
      )}

      {showOtpModal && (
        <OtpModal
          isSigningInProgress={isSigningInProgress}
          otpLoading={otpLoading}
          otpValue={otpValue}
          otpError={otpError}
          signingDocId={signingDocId}
          onOtpChange={handleOtpChange}
          onSubmit={handleOtpSubmit}
          onCancel={handleOtpCancel}
          onResend={() => signingDocId && handleSign(signingDocId)}
          showPositionBox={true}
          positionBox={signatureBoxPosition}
        />
      )}

      {showReleaseModal && selectedDocument && (
        <ReleaseConfirmationModal
          document={selectedDocument}
          isOpen={showReleaseModal}
          onClose={() => setShowReleaseModal(false)}
          onConfirm={handleReleaseConfirm}
          isReleasing={isReleasing}
          users={users}
          departments={departments}
        />
      )}

      {showBringUpModal && selectedDocument && (
        <BringUpModal
          document={selectedDocument}
          onClose={() => setShowBringUpModal(false)}
          onSetBringUp={handleSetBringUp}
          onUpdateBringUp={handleUpdateBringUp}
          onCompleteBringUp={handleCompleteBringUp}
          isSetting={isSettingBringUp}
          isUpdating={isUpdatingBringUp}
          isCompleting={isCompletingBringUp}
        />
      )}

      {isSuperAdmin && selectedDocument && selectedDocument.status === 'ready_to_release' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handleRelease}
            className="inline-flex items-center gap-2 rounded-full bg-[#1E4620] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#163a18] transition-all hover:shadow-xl hover:scale-105"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Release to Admin
          </button>
        </div>
      )}
    </div>
  );
};

export default MemoandLetters;