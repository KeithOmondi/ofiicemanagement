// src/pages/HelpdeskApprovals.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchPendingInternalApprovals,
  internalApproveDocument,
  internalRejectDocument,
  internalRequestChanges,
  sendBackToRequester,
  cancelInternalApproval,
  selectPendingInternalApprovals,
  type HelpdeskDocument,
  type DocumentEntityType,
  fetchHelpdeskDocumentById,
} from "../../store/slices/helpdeskDocumentsSlice";
import { fetchCurrentUser, selectCurrentUser } from "../../store/slices/userSlice";
import { hasRole } from "../../store/slices/authSlice";
import type { UserMetadata } from "../../store/slices/authSlice";
import type { User } from "../../store/slices/userSlice";
import toast from "react-hot-toast";

// ─── Type guard to check if a user has a signature_url ──────────────────────
function hasSignatureUrl(user: User | UserMetadata | null): user is User {
  return user !== null && 'signature_url' in user && user.signature_url !== null;
}

// ─── Helper Components ──────────────────────────────────────────────────────

const Spinner: React.FC<{ className?: string }> = ({
  className = "h-3.5 w-3.5",
}) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── SINGLE UNIFIED STATUS BADGE ──────────────────────────────────────────
// This replaces all three separate badges with ONE clean status

type UnifiedStatus = 'pending_review' | 'approved' | 'rejected' | 'changes_requested' | 'ready_to_send';

const UNIFIED_STATUS_STYLES: Record<UnifiedStatus, string> = {
  pending_review: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
  changes_requested: "bg-orange-50 text-orange-700 border border-orange-200",
  ready_to_send: "bg-blue-50 text-blue-700 border border-blue-200",
};

const UNIFIED_STATUS_LABELS: Record<UnifiedStatus, string> = {
  pending_review: "PENDING",
  approved: "APPROVED ✓",
  rejected: "REJECTED ✗",
  changes_requested: "CHANGES",
  ready_to_send: "READY",
};

// ─── Helper to determine unified status ──────────────────────────────────
function getUnifiedStatus(doc: HelpdeskDocument): UnifiedStatus {
  // If already sent back to requester, show the requester status
  if (doc.is_sent_back_to_requester) {
    if (doc.requester_status === 'approved') return 'approved';
    if (doc.requester_status === 'rejected') return 'rejected';
    if (doc.requester_status === 'changes_requested') return 'changes_requested';
  }
  
  // If internally approved but not sent back yet, show as "READY"
  if (doc.internal_approval_status === 'approved_internal' && !doc.is_sent_back_to_requester) {
    return 'ready_to_send';
  }
  
  // If changes were requested internally but not sent back
  if (doc.internal_approval_status === 'changes_requested_internal' && !doc.is_sent_back_to_requester) {
    return 'changes_requested';
  }
  
  // If rejected internally but not sent back
  if (doc.internal_approval_status === 'rejected_internal' && !doc.is_sent_back_to_requester) {
    return 'rejected';
  }
  
  // Default: pending review
  return 'pending_review';
}

// ─── Unified Status Badge ──────────────────────────────────────────────────
const UnifiedStatusBadge: React.FC<{ document: HelpdeskDocument }> = ({ document }) => {
  const status = getUnifiedStatus(document);
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest whitespace-nowrap ${UNIFIED_STATUS_STYLES[status]}`}
    >
      {UNIFIED_STATUS_LABELS[status]}
    </span>
  );
};

// ─── Helper: Format Document Type Display ──────────────────────────────────

// src/pages/HelpdeskApprovals.tsx

// Update the getHelpdeskEntityDisplay function to include all DocumentEntityType values
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
    conference: "Conference Request",
    sensitization: "Sensitization Memo",
    principalregistry: "Principal Registry",  // ← Added
    procurement: "Procurement",               // ← Added
  };
  return labels[entityType] || entityType;
};

// ─── formatDate ──────────────────────────────────────────────────────────────

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
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
  const unifiedStatus = getUnifiedStatus(document);
  
  // Show additional indicators
  const showStampIndicator = document.e_stamp_status === 'stamped';
  const showSignedIndicator = document.is_signed;
  const isPending = unifiedStatus === 'pending_review';
  const isReady = unifiedStatus === 'ready_to_send';

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
            {/* ─── SINGLE STATUS BADGE ──────────────────────────────── */}
            <UnifiedStatusBadge document={document} />
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
          <span className="text-[9px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
            {entityLabel}
          </span>
          
          {isPending && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200">
              ⏳ Awaiting review
            </span>
          )}
          
          {isReady && (
            <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 border border-blue-200">
              📤 Ready to send
            </span>
          )}
          
          {showStampIndicator && (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 border border-emerald-200">
              📜 Stamped
            </span>
          )}
          
          {showSignedIndicator && (
            <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 border border-blue-200">
              ✍️ Signed
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Signature Display Component ─────────────────────────────────────────────

interface SignatureDisplayProps {
  signatureUrl: string | null;
  signatoryName: string;
  signatoryTitle: string;
  className?: string;
  showLine?: boolean;
}

const SignatureDisplay: React.FC<SignatureDisplayProps> = ({
  signatureUrl,
  signatoryName,
  signatoryTitle,
  className = "",
  showLine = true,
}) => {
  const [imageError, setImageError] = useState(false);

  const hasValidSignature = signatureUrl && !imageError;

  return (
    <div className={`mt-4 ${className}`}>
      <div className="flex flex-col items-start">
        {showLine && (
          <div className="w-48 border-t-2 border-stone-700 mb-1" />
        )}
        
        {hasValidSignature ? (
          <div className="mb-1">
            <img
              src={signatureUrl}
              alt={`Signature of ${signatoryName}`}
              className="max-h-[50px] w-auto object-contain"
              style={{ maxWidth: "200px" }}
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="mb-1 text-stone-400 text-xs italic">
            (No signature uploaded)
          </div>
        )}
        
        <div className="font-bold uppercase text-sm tracking-wide">
          {signatoryName}
        </div>
        <div className="font-bold uppercase text-sm tracking-wide">
          {signatoryTitle}
        </div>
      </div>
    </div>
  );
};

// ─── Helpdesk Document Detail View ──────────────────────────────────────────

interface HelpdeskDocumentDetailProps {
  document: HelpdeskDocument;
  onBack: () => void;
  isSuperAdmin: boolean;
  onApprove: (doc: HelpdeskDocument) => Promise<void>;
  onReject: (doc: HelpdeskDocument) => Promise<void>;
  onRequestChanges: (doc: HelpdeskDocument) => Promise<void>;
  onSendBack: (doc: HelpdeskDocument, status: 'approved' | 'rejected' | 'changes_requested') => Promise<void>;
  onCancelDecision: (doc: HelpdeskDocument) => Promise<void>;
  onStampAndApprove: (doc: HelpdeskDocument) => Promise<void>;
  onSignOnly: (doc: HelpdeskDocument) => Promise<void>;
  isApproving?: boolean;
  isRejecting?: boolean;
  isRequestingChanges?: boolean;
  isSendingBack?: boolean;
  isCancelling?: boolean;
  isStamping?: boolean;
}

const HelpdeskDocumentDetail: React.FC<HelpdeskDocumentDetailProps> = ({
  document,
  onBack,
  isSuperAdmin,
  onReject,
  onRequestChanges,
  onSendBack,
  onCancelDecision,
  onStampAndApprove,
  onSignOnly,
  isApproving = false,
  isRejecting = false,
  isRequestingChanges = false,
  isSendingBack = false,
  isCancelling = false,
  isStamping = false,
}) => {
  const isPending = document.internal_approval_status === 'pending' || 
                    document.internal_approval_status === 'previewed' ||
                    document.internal_approval_status === 'changes_ready';

  const isDecisionMade = document.is_internal_approval_complete && 
                         document.internal_approval_status !== 'pending';

  const currentUser = useAppSelector(selectCurrentUser);
  const signatureUrl = currentUser?.signature_url || null;

  const signatoryName = document.internal_approved_by_name || 
                        document.signed_by_name || 
                        currentUser?.full_name || 
                        "Registrar, High Court";
  
  const signatoryTitle = "Registrar, High Court";

  // Use stamped_file_url if available (for requester view), otherwise use original file_url
  const previewUrl = document.stamped_file_url || document.file_url;
  
  const unifiedStatus = getUnifiedStatus(document);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 bg-white border-b border-stone-200 px-3 sm:px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="flex-shrink-0 rounded-md p-1 text-stone-500 hover:bg-stone-100 transition-colors -ml-1"
            aria-label="Back"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-stone-900 truncate">
            {document.subject}
          </span>
          {/* ─── SINGLE STATUS BADGE ──────────────────────────────────────── */}
          <UnifiedStatusBadge document={document} />
          {document.is_signed && (
            <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-200">
              ✍️ Signed
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto w-full sm:w-auto">
          <a
            href={previewUrl}
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
            href={previewUrl}
            download
            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 transition-colors whitespace-nowrap"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
          <button
            onClick={onBack}
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
            <p className="mt-0.5 text-sm font-mono text-stone-800">{document.ref}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Format</p>
            <p className="mt-0.5 text-sm font-semibold text-stone-800 uppercase">{document.format}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Entity Type</p>
            <p className="mt-0.5 text-sm capitalize text-stone-800">
              {getHelpdeskEntityDisplay(document.entity_type)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Uploaded On</p>
            <p className="mt-0.5 text-sm text-stone-800">
              {new Date(document.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Preview Count</p>
            <p className="mt-0.5 text-sm text-stone-800">{document.internal_preview_count || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Resubmit Count</p>
            <p className="mt-0.5 text-sm text-stone-800">{document.resubmit_count || 0}</p>
          </div>
        </div>

        {/* ─── Status Summary ───────────────────────────────────────────── */}
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Status Summary
            </h4>
            <UnifiedStatusBadge document={document} />
          </div>
          
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded bg-stone-50 p-2">
              <span className="text-stone-500">Internal</span>
              <p className="font-medium text-stone-800 capitalize">
                {document.internal_approval_status.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="rounded bg-stone-50 p-2">
              <span className="text-stone-500">Requester</span>
              <p className="font-medium text-stone-800 capitalize">
                {document.requester_status.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="rounded bg-stone-50 p-2">
              <span className="text-stone-500">Overall</span>
              <p className="font-medium text-stone-800">
                {unifiedStatus === 'pending_review' && 'Awaiting Review'}
                {unifiedStatus === 'ready_to_send' && 'Ready to Send Back'}
                {unifiedStatus === 'approved' && 'Approved ✓'}
                {unifiedStatus === 'rejected' && 'Rejected ✗'}
                {unifiedStatus === 'changes_requested' && 'Changes Requested'}
              </p>
            </div>
          </div>
        </div>

        {/* E-Stamp Preview */}
        {document.e_stamp_url && document.e_stamp_status === 'stamped' && (
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
                  href={document.e_stamp_url}
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
                src={document.e_stamp_url}
                alt="E-Stamp"
                className="max-h-16 w-auto object-contain"
              />
              <div className="text-xs text-stone-500">
                <p className="font-mono">{document.ref}</p>
                <p className="text-emerald-600">✓ Approved internally on {document.internal_approved_at ? new Date(document.internal_approved_at).toLocaleDateString() : 'N/A'}</p>
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
              src={`${previewUrl}#toolbar=0`}
              title={document.subject}
              className="w-full h-[400px] border-0 rounded"
            />
          </div>
        </div>

        {/* ─── Approval Actions ────────────────────────────────────────── */}
        {isSuperAdmin && document.status === 'pending_approval' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {isPending ? 'Pending Your Decision' : 'Decision Made - Send Back to Requester'}
            </h4>
            <p className="mt-1 text-xs text-amber-700">
              {isPending
                ? 'Review the document and make a decision. Choose "Approve & Stamp" to apply the official court stamp with your signature, or "Approve & Sign" to add a signature block only.'
                : document.internal_approval_status === 'approved_internal'
                ? 'Document approved and signed. Send back to requester to make it visible.'
                : document.internal_approval_status === 'rejected_internal'
                ? 'Document rejected internally. Send back to requester with the rejection reason.'
                : document.internal_approval_status === 'changes_requested_internal'
                ? 'Changes requested internally. Send back to requester with the list of changes.'
                : ''}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {/* Approve & Stamp Button - Applies official court stamp with signature */}
              {isPending && (
                <button
                  onClick={() => onStampAndApprove(document)}
                  disabled={isStamping}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  title="Apply official court stamp with your signature embedded inside"
                >
                  {isStamping ? <Spinner className="h-4 w-4" /> : null}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Approve & Stamp
                </button>
              )}

              {/* Approve & Sign Button - Adds signature block only */}
              {isPending && (
                <button
                  onClick={() => onSignOnly(document)}
                  disabled={isApproving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  title="Add signature block on a separate page (no stamp)"
                >
                  {isApproving ? <Spinner className="h-4 w-4" /> : null}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Approve & Sign
                </button>
              )}

              {/* Reject Button */}
              {isPending && (
                <button
                  onClick={() => onReject(document)}
                  disabled={isRejecting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isRejecting ? <Spinner className="h-4 w-4" /> : null}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
              )}

              {/* Request Changes Button */}
              {isPending && (
                <button
                  onClick={() => onRequestChanges(document)}
                  disabled={isRequestingChanges}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {isRequestingChanges ? <Spinner className="h-4 w-4" /> : null}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Request Changes
                </button>
              )}

              {/* Send Back Buttons - Only show after decision is made */}
              {isDecisionMade && !document.is_sent_back_to_requester && (
                <>
                  {document.internal_approval_status === 'approved_internal' && (
                    <button
                      onClick={() => onSendBack(document, 'approved')}
                      disabled={isSendingBack}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {isSendingBack ? <Spinner className="h-4 w-4" /> : null}
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Send Approved to Requester
                    </button>
                  )}
                  {document.internal_approval_status === 'rejected_internal' && (
                    <button
                      onClick={() => onSendBack(document, 'rejected')}
                      disabled={isSendingBack}
                      className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {isSendingBack ? <Spinner className="h-4 w-4" /> : null}
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Send Rejected to Requester
                    </button>
                  )}
                  {document.internal_approval_status === 'changes_requested_internal' && (
                    <button
                      onClick={() => onSendBack(document, 'changes_requested')}
                      disabled={isSendingBack}
                      className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                    >
                      {isSendingBack ? <Spinner className="h-4 w-4" /> : null}
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Send Changes to Requester
                    </button>
                  )}
                  
                  {/* Cancel/Recall Decision Button */}
                  <button
                    onClick={() => onCancelDecision(document)}
                    disabled={isCancelling}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  >
                    {isCancelling ? <Spinner className="h-4 w-4" /> : null}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Recall / Cancel Decision
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Already Sent Back */}
        {document.is_sent_back_to_requester && (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sent Back to Requester
            </h4>
            <p className="mt-1 text-xs text-stone-600">
              This document has been sent back to the requester with status:{' '}
              <span className="font-medium capitalize">{document.requester_status.replace(/_/g, ' ')}</span>
            </p>
            {document.requester_visible_at && (
              <p className="mt-1 text-xs text-stone-500">
                Sent on: {new Date(document.requester_visible_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* ─── Signature Section ────────────────────────────────────────── */}
        {document.is_signed && document.is_sent_back_to_requester && document.requester_status === 'approved' && (
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-stone-700 flex items-center gap-2 mb-3">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Official Signature
            </h4>
            <div className="flex flex-col items-start border-t border-stone-200 pt-4">
              <SignatureDisplay
                signatureUrl={signatureUrl}
                signatoryName={signatoryName}
                signatoryTitle={signatoryTitle}
                showLine={true}
              />
              <div className="mt-2 text-[10px] text-stone-400">
                <p>Signed on: {document.signed_at || document.internal_approved_at ? new Date(document.signed_at || document.internal_approved_at!).toLocaleString() : 'N/A'}</p>
                <p>Reference: {document.ref}</p>
              </div>
            </div>
          </div>
        )}

        {/* Approval History */}
        {document.approval_history && document.approval_history.length > 0 && (
          <div className="mt-2">
            <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
              <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Approval History
            </h3>
            <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
              {document.approval_history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="relative flex items-start gap-3 rounded-lg border border-stone-100 bg-white p-3"
                >
                  {index < document.approval_history.length - 1 && (
                    <div className="absolute left-5 top-8 h-full w-0.5 bg-stone-200" />
                  )}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-100">
                    {entry.action === 'submitted' && (
                      <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {entry.action === 'approved' && (
                      <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {entry.action === 'rejected' && (
                      <svg className="h-3.5 w-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {entry.action === 'returned' && (
                      <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    )}
                    {entry.action === 'previewed' && (
                      <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                    {entry.action === 'sent_back' && (
                      <svg className="h-3.5 w-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {entry.action === 'resubmitted' && (
                      <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {entry.action === 'signed' && (
                      <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    )}
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
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const HelpdeskApprovals: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { documents: helpdeskDocuments } = useAppSelector(selectPendingInternalApprovals);
  const currentUser = useAppSelector(selectCurrentUser);
  const isLoading = useAppSelector((state) => state.helpdeskDocuments.loading.pendingInternal);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<HelpdeskDocument | null>(null);
  const [loadingAction, setLoadingAction] = useState<{
    approve?: string;
    reject?: string;
    requestChanges?: string;
    sendBack?: string;
    cancel?: string;
    stamp?: string;
  }>({});

  const isSuperAdmin = hasRole(user, "super_admin");

  // Fetch current user to ensure signature_url is available
  useEffect(() => {
    if (isSuperAdmin && !currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, isSuperAdmin, currentUser]);

  // Fetch pending approvals on mount - include both pending and ready to send back
  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchPendingInternalApprovals({ 
        pending_internal_approval: true,
        ready_to_send_back: true,
        limit: 100 
      }));
    }
  }, [dispatch, isSuperAdmin]);

  // Filter documents by search - show both pending and internally approved
// In HelpdeskApprovals.tsx
const filteredDocuments = useMemo(() => {
    // First, filter out drafts (Super Admin shouldn't see drafts)
    const submittedDocs = helpdeskDocuments.filter(doc => 
        doc.status !== 'draft'  // ← Exclude drafts
    );
    
    // Then apply search filter
    if (!searchQuery.trim()) return submittedDocs;
    
    const query = searchQuery.toLowerCase().trim();
    return submittedDocs.filter(
        (doc) => 
            doc.subject.toLowerCase().includes(query) ||
            doc.ref.toLowerCase().includes(query) ||
            doc.entity_type.toLowerCase().includes(query)
    );
}, [helpdeskDocuments, searchQuery]);

  const refreshDocuments = useCallback(() => {
    if (isSuperAdmin) {
      dispatch(fetchPendingInternalApprovals({ 
        pending_internal_approval: true,
        ready_to_send_back: true,
        limit: 100 
      }));
    }
  }, [dispatch, isSuperAdmin]);

  // ─── Handler for Stamp & Approve ──────────────────────────────────────────

  const handleStampAndApprove = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    
    const activeUser = user || currentUser;
    
    if (!activeUser?.id) {
      toast.error('User not found. Please log in again.');
      return;
    }

    const hasSignature = hasSignatureUrl(currentUser);
    
    if (!hasSignature) {
      toast.error(
        '⚠️ No signature uploaded. A real signature is required for the official court stamp. ' +
        'Please upload your signature in your profile settings first.',
        { duration: 6000 }
      );
      return;
    }

    setLoadingAction(prev => ({ ...prev, stamp: doc.id }));
    
    try {
      await dispatch(internalApproveDocument({
        id: doc.id,
        action: 'approve',
        approved_by: activeUser.id,
        approved_by_name: activeUser.full_name || 'Super Admin',
        comments: 'Document approved and stamped with official court stamp.',
        generate_e_stamp: true,
      })).unwrap();

      const updatedDoc = await dispatch(fetchHelpdeskDocumentById(doc.id)).unwrap();
      setSelectedDocument(updatedDoc);
      
      toast.success('Document approved and stamped with official court stamp!');
      await refreshDocuments();
      
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to stamp and approve document.';
      toast.error(errorMessage);
      console.error('Stamp and approve error:', err);
    } finally {
      setLoadingAction(prev => ({ ...prev, stamp: undefined }));
    }
  };

  const handleApprove = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    
    const activeUser = user || currentUser;
    
    if (!activeUser?.id) {
      toast.error('User not found. Please log in again.');
      return;
    }
    
    const hasSignature = hasSignatureUrl(currentUser);
    
    if (!hasSignature) {
      toast('⚠️ No signature uploaded. The document will be approved but without your signature.', {
        duration: 5000,
        icon: '⚠️',
      });
    }
    
    setLoadingAction(prev => ({ ...prev, approve: doc.id }));
    try {
      const result = await dispatch(internalApproveDocument({
        id: doc.id,
        action: 'approve',
        approved_by: activeUser.id,
        approved_by_name: activeUser.full_name || 'Super Admin',
        comments: 'Document approved internally.',
        generate_e_stamp: true,
      })).unwrap();
      
      toast.success('Document approved. Click "Send Approved" to notify the requester.');
      setSelectedDocument(result);
      await refreshDocuments();
      
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to approve document.';
      toast.error(errorMessage);
      console.error('Approve error:', err);
    } finally {
      setLoadingAction(prev => ({ ...prev, approve: undefined }));
    }
  };

  const handleSignOnly = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    
    const activeUser = user || currentUser;
    
    if (!activeUser?.id) {
      toast.error('User not found. Please log in again.');
      return;
    }
    
    const hasSignature = hasSignatureUrl(currentUser);
    if (!hasSignature) {
      toast('⚠️ No signature uploaded. The document will be approved but without your signature.', {
        duration: 5000,
        icon: '⚠️',
      });
    }
    
    setLoadingAction(prev => ({ ...prev, approve: doc.id }));
    try {
      const result = await dispatch(internalApproveDocument({
        id: doc.id,
        action: 'approve',
        approved_by: activeUser.id,
        approved_by_name: activeUser.full_name || 'Super Admin',
        comments: 'Document signed internally.',
        generate_e_stamp: false,
      })).unwrap();
      
      toast.success('Document signed. Click "Send Back" to notify the requester.');
      setSelectedDocument(result);
      await refreshDocuments();
      
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to sign document.';
      toast.error(errorMessage);
      console.error('Sign error:', err);
    } finally {
      setLoadingAction(prev => ({ ...prev, approve: undefined }));
    }
  };

  const handleReject = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    const reason = prompt('Please provide a reason for rejecting this document:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }
    setLoadingAction(prev => ({ ...prev, reject: doc.id }));
    try {
      const result = await dispatch(internalRejectDocument({
        id: doc.id,
        action: 'reject',
        rejection_reason: reason.trim(),
        comments: `Rejected internally: ${reason.trim()}`,
        approved_by: currentUser?.id || '',
        approved_by_name: currentUser?.full_name,
      })).unwrap();
      toast.success('Document rejected internally. Click "Send Rejected" to notify the requester.');
      setSelectedDocument(result);
      await refreshDocuments();
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to reject document.';
      toast.error(errorMessage);
    } finally {
      setLoadingAction(prev => ({ ...prev, reject: undefined }));
    }
  };

  const handleRequestChanges = async (doc: HelpdeskDocument) => {
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
    setLoadingAction(prev => ({ ...prev, requestChanges: doc.id }));
    try {
      const result = await dispatch(internalRequestChanges({
        id: doc.id,
        action: 'request_changes',
        changes_requested: changesList,
        comments: `Changes requested internally: ${changesList.join(', ')}`,
        approved_by: currentUser?.id || '',
        approved_by_name: currentUser?.full_name,
      })).unwrap();
      toast.success('Changes requested internally. Click "Send Changes Requested" to notify the requester.');
      setSelectedDocument(result);
      await refreshDocuments();
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to request changes.';
      toast.error(errorMessage);
    } finally {
      setLoadingAction(prev => ({ ...prev, requestChanges: undefined }));
    }
  };

  const handleSendBack = async (doc: HelpdeskDocument, finalStatus: 'approved' | 'rejected' | 'changes_requested') => {
    if (!isSuperAdmin) return;
    
    setLoadingAction(prev => ({ ...prev, sendBack: doc.id }));
    
    try {
      const result = await dispatch(sendBackToRequester({
        id: doc.id,
        final_status: finalStatus,
        sent_by: currentUser?.id || '',
        sent_by_name: currentUser?.full_name,
        comments: `Document sent back to requester with status: ${finalStatus}`,
        notify_requester: true,
      })).unwrap();
      
      const statusMessages = {
        approved: 'Document approved and sent back to requester with signature.',
        rejected: 'Document rejected and sent back to requester.',
        changes_requested: 'Changes requested and sent back to requester.',
      };
      
      toast.success(statusMessages[finalStatus]);
      setSelectedDocument(result);
      await refreshDocuments();
      
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to send document back to requester.';
      toast.error(errorMessage);
    } finally {
      setLoadingAction(prev => ({ ...prev, sendBack: undefined }));
    }
  };

  const handleCancelDecision = async (doc: HelpdeskDocument) => {
    if (!isSuperAdmin) return;
    if (!window.confirm('Cancel the internal approval decision? This will reset the document to pending review.')) return;
    setLoadingAction(prev => ({ ...prev, cancel: doc.id }));
    try {
      const result = await dispatch(cancelInternalApproval({
        id: doc.id,
        cancelled_by: currentUser?.id || '',
        cancelled_by_name: currentUser?.full_name,
        reason: 'Decision cancelled by Super Admin',
      })).unwrap();
      toast.success('Internal decision cancelled. Document reset to pending review.');
      setSelectedDocument(result);
      await refreshDocuments();
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : 'Failed to cancel decision.';
      toast.error(errorMessage);
    } finally {
      setLoadingAction(prev => ({ ...prev, cancel: undefined }));
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4 text-center">
        <p className="text-stone-400 text-sm">
          You don't have access to helpdesk approvals.
        </p>
      </div>
    );
  }

  // Count uses unified status
  const pendingCount = helpdeskDocuments.filter(
    d => getUnifiedStatus(d) === 'pending_review'
  ).length;

  const readyCount = helpdeskDocuments.filter(
    d => getUnifiedStatus(d) === 'ready_to_send'
  ).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white flex-wrap">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight truncate">
            Helpdesk Approvals
          </h1>
          <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 hidden sm:block">
            Review and manage helpdesk documents pending your approval
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Pending: {pendingCount}
            </span>
            {readyCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                Ready: {readyCount}
              </span>
            )}
          </div>
          <button
            onClick={refreshDocuments}
            disabled={isLoading}
            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Spinner className="h-3 w-3" /> : null}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={`w-full lg:w-[300px] flex-shrink-0 flex-col border-r border-stone-200 bg-white overflow-hidden lg:sticky lg:top-0 lg:self-start lg:h-full ${
            selectedDocument ? "hidden lg:flex" : "flex"
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

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1E4620] border-t-transparent" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-stone-400">
                  {searchQuery ? 'No matching documents found.' : 'No pending approvals.'}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-stone-300 mt-1">
                    All helpdesk documents have been processed.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredDocuments.map((doc) => (
                  <HelpdeskListItem
                    key={doc.id}
                    document={doc}
                    selected={selectedDocument?.id === doc.id}
                    onSelect={() => setSelectedDocument(doc)}
                  />
                ))}
              </div>
            )}
          </div>

          {!isLoading && filteredDocuments.length > 0 && (
            <div className="border-t border-stone-200 bg-stone-50 px-3 py-2.5 flex-shrink-0">
              <span className="text-[10px] text-stone-500 font-medium">
                {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Detail View */}
        <div
          className={`w-full flex-1 flex-col overflow-hidden bg-stone-100 ${
            selectedDocument ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedDocument ? (
            <HelpdeskDocumentDetail
              document={selectedDocument}
              onBack={() => setSelectedDocument(null)}
              isSuperAdmin={isSuperAdmin}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestChanges={handleRequestChanges}
              onSendBack={handleSendBack}
              onCancelDecision={handleCancelDecision}
              onStampAndApprove={handleStampAndApprove}
              onSignOnly={handleSignOnly}
              isApproving={loadingAction.approve === selectedDocument.id}
              isRejecting={loadingAction.reject === selectedDocument.id}
              isRequestingChanges={loadingAction.requestChanges === selectedDocument.id}
              isSendingBack={loadingAction.sendBack === selectedDocument.id}
              isCancelling={loadingAction.cancel === selectedDocument.id}
              isStamping={loadingAction.stamp === selectedDocument.id}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-4">
              <div className="text-center max-w-sm">
                <svg className="mx-auto h-12 w-12 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3 text-sm font-semibold text-stone-500">Select a document to review</p>
                <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                  Choose a pending approval from the list to review and take action.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpdeskApprovals;