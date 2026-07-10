// src/components/tickets/TicketApprovalModal.tsx
//
// CHANGES IN THIS VERSION:
// 1. `DocumentViewer` now has Approve / Return buttons.
// 2. Clicking Approve stamps the PDF client-side (rotated "APPROVED" stamp,
//    centered horizontally, aligned with the signatory's vertical position)
//    BEFORE the approval request is sent — see src/utils/pdfStamp.ts.
// 3. `handleApproveDocument` / `handleReturnDocument` are wired to placeholder
//    API calls (clearly marked TODO) since the exact helpdesk-documents
//    approve/return endpoint wasn't available to me. Swap in your real thunk
//    or fetch call there — the UI/stamping logic above it needs no changes.

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hook';
import {
  fetchTicketById,
  submitTicketForApproval,
  approveTicket,
  rejectTicket,
  returnTicket,
  bookTicket,
  cancelTicket,
  completeTicket,
  addTicketComment,
  deleteTicketComment,
  clearSelectedTicket,
  selectSelectedTicket,
  selectTicketStatus,
  selectTicketActions,
} from '../../../store/slices/ticketSlice';
import {
  fetchHelpdeskDocuments,
  selectAllHelpdeskDocuments,
  selectDocumentsFetchLoading,
  type HelpdeskDocument,
} from '../../../store/slices/helpdeskDocumentsSlice';
import { stampPdfFromUrl } from '../../../utils/pdfStamp';
import {
  X,
  Loader2,
  Eye,
  Download,
  FileText,
  Stamp,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  ArrowLeft,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { TicketStatus } from '../../../types/tickets.types';

// ── Types ──────────────────────────────────────────────────────────────────

interface TicketApprovalModalProps {
  ticketId: string;
  onClose: () => void;
  onRefresh?: () => void;
  userRole: 'dept_head' | 'super_admin' | 'staff';
  /** Used as the printed name on the stamp. Fall back to a generic label if not provided. */
  currentUserName?: string;
  currentUserTitle?: string;
}

// ── Status Badge ───────────────────────────────────────────────────────────

const TicketStatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const configs: Record<TicketStatus, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: 'text-stone-600', bg: 'bg-stone-100' },
    pending_approval: { label: 'Pending Approval', color: 'text-amber-700', bg: 'bg-amber-50' },
    approved: { label: 'Approved', color: 'text-blue-700', bg: 'bg-blue-50' },
    rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50' },
    booked: { label: 'Booked', color: 'text-indigo-700', bg: 'bg-indigo-50' },
    cancelled: { label: 'Cancelled', color: 'text-stone-500', bg: 'bg-stone-100' },
    completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  };

  const config = configs[status] || configs.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
};

// ── Document Status Badge ─────────────────────────────────────────────────

const DocumentStatusBadge: React.FC<{ status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'returned' }> = ({ status }) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: 'text-stone-600', bg: 'bg-stone-100' },
    pending_approval: { label: 'Pending Approval', color: 'text-amber-700', bg: 'bg-amber-50' },
    approved: { label: 'Approved ✓', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50' },
    returned: { label: 'Returned', color: 'text-blue-700', bg: 'bg-blue-50' },
  };

  const config = configs[status] || configs.draft;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
};

// ── Document Viewer Modal ──────────────────────────────────────────────────

interface DocumentViewerProps {
  document: HelpdeskDocument;
  onClose: () => void;
  /** Called with the stamped PDF blob once the user confirms Approve. */
  onApprove?: (doc: HelpdeskDocument, stampedFile: Blob) => Promise<void>;
  onReturn?: (doc: HelpdeskDocument, reason: string) => Promise<void>;
  currentUserName?: string;
  currentUserTitle?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onClose,
  onApprove,
  onReturn,
  currentUserName,
  currentUserTitle,
}) => {
  const [isStamping, setIsStamping] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [showReturnInput, setShowReturnInput] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [stampPreviewUrl, setStampPreviewUrl] = useState<string | null>(null);

  const canReview = document.status === 'pending_approval';
  const busy = isStamping || isApproving || isReturning;

  const handleApproveClick = async () => {
    if (!onApprove) {
      toast.error('Approve action is not wired up yet for documents.');
      return;
    }
    if (document.format.toLowerCase() !== 'pdf') {
      toast.error('Stamping is only supported for PDF documents right now.');
      return;
    }
    if (!window.confirm('Approve this document? A stamp will be embedded before it is saved.')) return;

    setIsStamping(true);
    try {
      const stampedBlob = await stampPdfFromUrl(document.file_url, {
        approverName: currentUserName ?? 'Authorized Signatory',
        approverTitle: currentUserTitle,
        label: 'APPROVED',
      });

      // Optional: let the user see the stamp before it's sent off
      const previewUrl = URL.createObjectURL(stampedBlob);
      setStampPreviewUrl(previewUrl);

      setIsStamping(false);
      setIsApproving(true);
      await onApprove(document, stampedBlob);
      toast.success('Document stamped and approved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to stamp/approve the document');
    } finally {
      setIsStamping(false);
      setIsApproving(false);
    }
  };

  const handleReturnClick = async () => {
    if (!onReturn) {
      toast.error('Return action is not wired up yet for documents.');
      return;
    }
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for returning this document');
      return;
    }
    setIsReturning(true);
    try {
      await onReturn(document, returnReason.trim());
      toast.success('Document returned');
      setShowReturnInput(false);
      setReturnReason('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to return the document');
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-stone-800 truncate">{document.subject}</h3>
            <p className="text-xs text-stone-400 font-mono">Ref: {document.ref} • {document.format.toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Document Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase text-stone-400">Status</p>
              <DocumentStatusBadge status={document.status} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-stone-400">Format</p>
              <p className="font-medium uppercase">{document.format}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-stone-400">Uploaded</p>
              <p className="text-stone-600">{new Date(document.created_at).toLocaleString()}</p>
            </div>
            {document.approved_at && (
              <div>
                <p className="text-[10px] font-semibold uppercase text-stone-400">Approved</p>
                <p className="text-stone-600">{new Date(document.approved_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Review Actions — Approve / Return */}
          {canReview && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs text-stone-500 mb-3">
                Approving will embed a tilted "APPROVED" stamp into the document, centered
                on the page and aligned with the signatory, before saving.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleApproveClick}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isStamping ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Stamping…
                    </>
                  ) : isApproving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Approving…
                    </>
                  ) : (
                    <>
                      <Stamp size={16} /> Approve &amp; Stamp
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowReturnInput((v) => !v)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <ArrowLeft size={16} />
                  Return
                </button>
              </div>

              {showReturnInput && (
                <div className="mt-3">
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Reason for returning this document..."
                    rows={3}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={() => { setShowReturnInput(false); setReturnReason(''); }}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReturnClick}
                      disabled={isReturning || !returnReason.trim()}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isReturning ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Return'}
                    </button>
                  </div>
                </div>
              )}

              {stampPreviewUrl && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                  <p className="text-[10px] font-semibold uppercase text-emerald-700 mb-1">Stamped preview</p>
                  <a
                    href={stampPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 underline hover:text-emerald-800"
                  >
                    Open stamped PDF in new tab
                  </a>
                </div>
              )}
            </div>
          )}

          {/* E-Stamp */}
          {document.e_stamp_url && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stamp size={18} className="text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-800">E-Stamp</span>
                </div>
                <div className="flex gap-2">
                  <a href={document.e_stamp_url} target="_blank" rel="noopener noreferrer"
                    className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700">
                    View
                  </a>
                  <a href={document.e_stamp_url} download={`e-stamp-${document.ref}.png`}
                    className="rounded border border-emerald-300 bg-white px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50">
                    Download
                  </a>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 p-2 bg-white rounded border border-emerald-200">
                <img src={document.e_stamp_url} alt="E-Stamp" className="max-h-12 w-auto object-contain" />
                <span className="text-xs text-stone-500">✓ Approved and stamped</span>
              </div>
            </div>
          )}

          {/* Download Stamped Document */}
          {document.status === 'approved' && document.e_stamp_url && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <FileText size={16} />
                  Stamped Document
                </span>
                <a href={document.file_url} download={`stamped-${document.ref}.${document.format}`}
                  className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 flex items-center gap-1">
                  <Download size={14} /> Download
                </a>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-stone-100">
            <a href={document.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
              <ExternalLink size={14} /> View
            </a>
            <a href={document.file_url} download
              className="inline-flex items-center gap-1 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
              <Download size={14} /> Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

export const TicketApprovalModal: React.FC<TicketApprovalModalProps> = ({
  ticketId,
  onClose,
  onRefresh,
  userRole,
  currentUserName,
  currentUserTitle,
}) => {
  const dispatch = useAppDispatch();
  const ticket = useAppSelector(selectSelectedTicket);
  const status = useAppSelector(selectTicketStatus);
  const actionsLoading = useAppSelector(selectTicketActions);
  const helpdeskDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const docsLoading = useAppSelector(selectDocumentsFetchLoading);

  const [newComment, setNewComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnComments, setReturnComments] = useState('');
  const [selectedDocForView, setSelectedDocForView] = useState<HelpdeskDocument | null>(null);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch ticket and documents
  useEffect(() => {
    if (ticketId) {
      dispatch(fetchTicketById(ticketId));
      dispatch(fetchHelpdeskDocuments({
        entity_type: 'ticket',
        entity_id: ticketId,
      }));
    }
    return () => {
      dispatch(clearSelectedTicket());
    };
  }, [dispatch, ticketId]);

  // ── Action Handlers ──────────────────────────────────────────────────────

  const handleSubmitForApproval = async () => {
    if (!ticket) return;
    if (!window.confirm('Submit this ticket for approval?')) return;
    setIsSubmitting(true);
    try {
      await dispatch(submitTicketForApproval(ticket.id)).unwrap();
      toast.success('Ticket submitted for approval');
      onRefresh?.();
      dispatch(fetchTicketById(ticket.id));
    } catch {
      toast.error('Failed to submit for approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!ticket) return;
    if (!window.confirm('Approve this ticket?')) return;
    setIsSubmitting(true);
    try {
      await dispatch(approveTicket({ id: ticket.id })).unwrap();
      toast.success('Ticket approved');
      onRefresh?.();
      dispatch(fetchTicketById(ticket.id));
      dispatch(fetchHelpdeskDocuments({ entity_type: 'ticket', entity_id: ticket.id })); // NEW
    } catch {
      toast.error('Failed to approve ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!ticket) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setIsSubmitting(true);
    try {
      await dispatch(rejectTicket({ id: ticket.id, reason: rejectReason.trim() })).unwrap();
      toast.success('Ticket rejected');
      setShowRejectModal(false);
      setRejectReason('');
      onRefresh?.();
      dispatch(fetchTicketById(ticket.id));
      dispatch(fetchHelpdeskDocuments({ entity_type: 'ticket', entity_id: ticket.id })); // NEW
    } catch {
      toast.error('Failed to reject ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!ticket) return;
    setIsSubmitting(true);
    try {
      await dispatch(returnTicket({
        id: ticket.id,
        reason: 'Returned for action',
        instructions: returnComments.trim() || undefined,
      })).unwrap();
      toast.success('Ticket returned');
      setShowReturnModal(false);
      setReturnComments('');
      onRefresh?.();
      dispatch(fetchTicketById(ticket.id));
      dispatch(fetchHelpdeskDocuments({ entity_type: 'ticket', entity_id: ticket.id })); // NEW
    } catch {
      toast.error('Failed to return ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBook = async () => {
    if (!ticket) return;
    const bookingRef = prompt('Enter booking reference:');
    if (!bookingRef) return;
    setIsSubmitting(true);
    try {
      await dispatch(bookTicket({ id: ticket.id, booking_reference: bookingRef })).unwrap();
      toast.success('Ticket booked');
      onRefresh?.();
      dispatch(fetchTicketById(ticket.id));
    } catch {
      toast.error('Failed to book ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!ticket) return;
    if (!window.confirm('Mark this ticket as completed?')) return;
    setIsSubmitting(true);
    try {
      await dispatch(completeTicket(ticket.id)).unwrap();
      toast.success('Ticket completed');
      onRefresh?.();
      dispatch(fetchTicketById(ticket.id));
    } catch {
      toast.error('Failed to complete ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!ticket) return;
    if (!window.confirm('Cancel this ticket?')) return;
    setIsSubmitting(true);
    try {
      await dispatch(cancelTicket(ticket.id)).unwrap();
      toast.success('Ticket cancelled');
      onRefresh?.();
      dispatch(fetchTicketById(ticket.id));
    } catch {
      toast.error('Failed to cancel ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!ticket || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await dispatch(addTicketComment({ id: ticket.id, comment: newComment.trim(), isInternal: false })).unwrap();
      setNewComment('');
      dispatch(fetchTicketById(ticket.id));
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!ticket) return;
    if (!window.confirm('Delete this comment?')) return;
    try {
      await dispatch(deleteTicketComment({ id: ticket.id, commentId })).unwrap();
      dispatch(fetchTicketById(ticket.id));
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleViewDocument = (doc: HelpdeskDocument) => {
    setSelectedDocForView(doc);
    setShowDocViewer(true);
  };

  // ── Document-level Approve / Return ──────────────────────────────────────
  //
  // TODO: These two functions are the integration point. Replace the fetch()
  // calls below with whatever your backend actually expects — e.g. a thunk
  // from helpdeskDocumentsSlice such as `approveHelpdeskDocument({ id, file })`
  // and `returnHelpdeskDocument({ id, reason })`, following the same pattern
  // as ticketSlice's thunks. The stamping itself (above, in DocumentViewer)
  // does not need to change regardless of how you wire the upload.

  const handleApproveDocument = async (doc: HelpdeskDocument, stampedFile: Blob) => {
    const formData = new FormData();
    formData.append('file', stampedFile, `stamped-${doc.ref}.pdf`);
    formData.append('approver_name', currentUserName ?? '');

    const res = await fetch(`/api/helpdesk-documents/${doc.id}/approve`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Approve request failed (${res.status})`);
    }

    dispatch(fetchHelpdeskDocuments({ entity_type: 'ticket', entity_id: ticketId }));
    onRefresh?.();
  };

  const handleReturnDocument = async (doc: HelpdeskDocument, reason: string) => {
    const res = await fetch(`/api/helpdesk-documents/${doc.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      throw new Error(`Return request failed (${res.status})`);
    }

    dispatch(fetchHelpdeskDocuments({ entity_type: 'ticket', entity_id: ticketId }));
    onRefresh?.();
  };

  // ── Render Helpers ───────────────────────────────────────────────────────

  const renderActionButtons = () => {
    if (!ticket) return null;

    const isSubmittingAction = isSubmitting || actionsLoading.submitting;

    switch (ticket.status) {
      case 'draft':
        if (userRole === 'dept_head') {
          return (
            <button
              onClick={handleSubmitForApproval}
              disabled={isSubmittingAction}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {isSubmittingAction ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit for Approval
            </button>
          );
        }
        return null;

      case 'pending_approval':
        if (userRole === 'super_admin') {
          return (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleApprove}
                disabled={isSubmittingAction}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmittingAction ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Approve
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isSubmittingAction}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle size={16} />
                Reject
              </button>
              <button
                onClick={() => setShowReturnModal(true)}
                disabled={isSubmittingAction}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowLeft size={16} />
                Return
              </button>
            </div>
          );
        }
        return null;

      case 'approved':
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleBook}
              disabled={isSubmittingAction}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmittingAction ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Book
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmittingAction}
              className="inline-flex items-center gap-2 rounded-lg bg-stone-500 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-600 disabled:opacity-50"
            >
              <XCircle size={16} />
              Cancel
            </button>
          </div>
        );

      case 'booked':
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleComplete}
              disabled={isSubmittingAction}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmittingAction ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Complete
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmittingAction}
              className="inline-flex items-center gap-2 rounded-lg bg-stone-500 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-600 disabled:opacity-50"
            >
              <XCircle size={16} />
              Cancel
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Loading State ────────────────────────────────────────────────────────

  if (status === 'loading' && !ticket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="rounded-xl bg-white p-8 shadow-2xl">
          <Loader2 size={32} className="animate-spin text-[#c9a84c] mx-auto" />
          <p className="mt-3 text-sm text-stone-500">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="rounded-xl bg-white p-6 shadow-2xl max-w-md">
          <div className="text-center">
            <AlertCircle size={32} className="text-red-500 mx-auto" />
            <p className="mt-2 text-stone-600">Ticket not found</p>
            <button onClick={onClose} className="mt-4 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c]">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-[#1a3d1c] truncate">
                  {ticket.title}
                </h2>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <p className="mt-1 text-xs text-stone-400 font-mono flex items-center gap-2">
                <span>Ref: {ticket.reference_no}</span>
                <span>•</span>
                <span>{new Date(ticket.date_of_travel).toLocaleDateString()}</span>
                {ticket.judge_name && (
                  <>
                    <span>•</span>
                    <span>Judge: {ticket.judge_name}</span>
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-6">
            {/* ── Ticket Details ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Priority</p>
                <p className={`mt-0.5 text-sm font-medium capitalize ${ticket.priority === 'urgent' ? 'text-red-600' : 'text-stone-800'}`}>
                  {ticket.priority}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Travel Class</p>
                <p className="mt-0.5 text-sm capitalize text-stone-800">{ticket.travel_class}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Passengers</p>
                <p className="mt-0.5 text-sm text-stone-800">{ticket.number_of_passengers}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Departure</p>
                <p className="mt-0.5 text-sm text-stone-800">{ticket.departure_from}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Destination</p>
                <p className="mt-0.5 text-sm text-stone-800">{ticket.destination}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Return Date</p>
                <p className="mt-0.5 text-sm text-stone-800">
                  {ticket.return_date ? new Date(ticket.return_date).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Created By</p>
                <p className="mt-0.5 text-sm text-stone-800">{ticket.created_by_name}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Assigned To</p>
                <p className="mt-0.5 text-sm text-stone-800">{ticket.assigned_to_name || 'Unassigned'}</p>
              </div>
              {ticket.booking_reference && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Booking Reference</p>
                  <p className="mt-0.5 text-sm font-mono text-stone-800">{ticket.booking_reference}</p>
                </div>
              )}
              {ticket.rejected_reason && (
                <div className="col-span-full">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400">Rejection Reason</p>
                  <p className="mt-0.5 text-sm text-red-700">{ticket.rejected_reason}</p>
                </div>
              )}
            </div>

            {/* ── Actions ────────────────────────────────────────────────── */}
            <div className="mt-4">
              {renderActionButtons()}
            </div>

            {/* ── Associated Documents ──────────────────────────────────── */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <FileText size={16} className="text-[#c9a84c]" />
                Associated Documents
                <span className="text-xs font-normal text-stone-400">
                  ({helpdeskDocuments.length})
                </span>
              </h3>

              {docsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-[#c9a84c]" />
                </div>
              ) : helpdeskDocuments.length === 0 ? (
                <p className="mt-2 text-sm text-stone-400 italic">No documents attached.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {helpdeskDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 transition hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="rounded-lg bg-stone-100 p-1.5">
                          <FileText size={16} className="text-stone-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{doc.subject}</p>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span className="font-mono">{doc.ref}</span>
                            <span className="uppercase">{doc.format}</span>
                            <DocumentStatusBadge status={doc.status} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                          title="View Document"
                        >
                          <Eye size={16} />
                        </button>
                        <a
                          href={doc.file_url}
                          download
                          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                          title="Download Document"
                        >
                          <Download size={16} />
                        </a>
                        {doc.e_stamp_status === 'stamped' && (
                          <span className="ml-1 inline-flex items-center gap-1 text-xs text-emerald-600">
                            <Stamp size={12} />
                            Stamped
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Approval History ──────────────────────────────────────── */}
            {ticket.approval_history && ticket.approval_history.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <Clock size={16} className="text-stone-400" />
                  Approval History
                </h3>
                <div className="mt-2 space-y-2">
                  {ticket.approval_history.map((step) => (
                    <div key={step.id} className="rounded-lg border border-stone-100 bg-white p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-stone-800">{step.action}</span>
                        <span className="text-xs text-stone-400">{new Date(step.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-stone-500">By: {step.from_user_name}</p>
                      {step.comments && (
                        <p className="mt-1 text-xs text-stone-600 bg-stone-50 rounded p-2">{step.comments}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Comments ────────────────────────────────────────────────── */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <MessageSquare size={16} className="text-stone-400" />
                Comments ({ticket.comments?.length || 0})
              </h3>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                {ticket.comments && ticket.comments.length > 0 ? (
                  ticket.comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-stone-100 bg-white p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-stone-700">{comment.user_name}</p>
                        <span className="text-[10px] text-stone-400">{new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-sm text-stone-700">{comment.comment}</p>
                      {userRole === 'super_admin' && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="mt-1 text-[10px] font-medium text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-400 italic">No comments yet.</p>
                )}
              </div>

              {/* Add Comment */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  disabled={isSubmitting}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Post'}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 px-6 py-3">
            <div className="text-xs text-stone-400">
              {ticket.status === 'approved' && ticket.booking_reference && (
                <span className="text-emerald-600">✓ Booked: {ticket.booking_reference}</span>
              )}
              {ticket.status === 'completed' && (
                <span className="text-emerald-600">✓ Completed</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ── Reject Modal ────────────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-stone-900">Reject Ticket</h3>
            <p className="mt-1 text-sm text-stone-500">Please provide a reason for rejection.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="mt-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Modal ────────────────────────────────────────────────── */}
      {showReturnModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-stone-900">Return Ticket</h3>
            <p className="mt-1 text-sm text-stone-500">Add instructions for the department head.</p>
            <textarea
              value={returnComments}
              onChange={(e) => setReturnComments(e.target.value)}
              placeholder="Enter return instructions..."
              rows={4}
              className="mt-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowReturnModal(false); setReturnComments(''); }}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReturn}
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Viewer ──────────────────────────────────────────────── */}
      {showDocViewer && selectedDocForView && (
        <DocumentViewer
          document={selectedDocForView}
          onClose={() => { setShowDocViewer(false); setSelectedDocForView(null); }}
          onApprove={handleApproveDocument}
          onReturn={handleReturnDocument}
          currentUserName={currentUserName}
          currentUserTitle={currentUserTitle}
        />
      )}
    </>
  );
};

export default TicketApprovalModal;