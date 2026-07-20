// src/features/tickets/SuperAdminTickets.tsx
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchTickets,
  setFilters,
  resetFilters,
  clearError,
  selectAllTickets,
  selectTicketStatus,
  selectTicketError,
  selectTicketPagination,
  selectTicketFilters,
  selectTicketActions,
  approveTicket,
  returnTicket,
} from '../../store/slices/ticketSlice';
import {
  fetchHelpdeskDocuments,
  linkHelpdeskDocument,
  rejectDocument,
  returnDocument as returnHelpdeskDocument,
  selectAllHelpdeskDocuments,
  selectDocumentsFetchLoading,
  selectDocumentError,
  selectUnlinkedHelpdeskDocuments,
  selectDocumentsUploading,
  selectDocumentLinking,
  clearDocumentError,
  type DocumentFormat,
  type DocumentEntityType,
  type HelpdeskDocument,
  uploadHelpdeskDocument,
} from '../../store/slices/helpdeskDocumentsSlice';
import toast, { Toaster } from 'react-hot-toast';
import {
  X,
  Loader2,
  Download,
  FileText,
  Eye,
  File,
  ExternalLink,
  Stamp,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Paperclip,
  ArrowLeft,
} from 'lucide-react';
import { stampPdfFromUrl } from '../../utils/pdfStamp';
import type {
  TicketStatus,
  TicketFilters,
  TicketPriority,
} from '../../types/tickets.types';

// ── Constants ──────────────────────────────────────────────────────────────

// ── Document Status Badge ───────────────────────────────────────────────────

interface DocumentStatusBadgeProps {
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'returned';
}

const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({ status }) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: 'text-stone-600', bg: 'bg-stone-100' },
    pending_approval: { label: 'Pending Approval', color: 'text-amber-700', bg: 'bg-amber-50' },
    approved: { label: 'Approved ✓', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50' },
    returned: { label: 'Returned', color: 'text-blue-700', bg: 'bg-blue-50' },
  };

  const config = configs[status] || configs.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
};

// ─── Helper: status badge style ──────────────────────────────────────────────

const statusColor = (status: TicketStatus): string => {
  const map: Record<TicketStatus, string> = {
    draft: 'bg-stone-100 text-stone-600 ring-stone-200',
    pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-blue-50 text-blue-700 ring-blue-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
    booked: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    cancelled: 'bg-stone-200 text-stone-600 ring-stone-300',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  };
  return map[status] || 'bg-stone-100 text-stone-600 ring-stone-200';
};

const statusDot = (status: TicketStatus): string => {
  const map: Record<TicketStatus, string> = {
    draft: 'bg-stone-400',
    pending_approval: 'bg-amber-500',
    approved: 'bg-blue-500',
    rejected: 'bg-red-500',
    booked: 'bg-indigo-500',
    cancelled: 'bg-stone-500',
    completed: 'bg-emerald-500',
  };
  return map[status] || 'bg-stone-400';
};

const priorityColor = (priority: TicketPriority): string => {
  const map: Record<TicketPriority, string> = {
    low: 'text-stone-500',
    normal: 'text-blue-600',
    high: 'text-amber-600',
    urgent: 'text-red-600',
  };
  return map[priority] || 'text-stone-500';
};

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] transition-colors';



function GhostButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

function GoldButton({
  children,
  icon,
  type = 'button',
  disabled,
  onClick,
  variant = 'default',
  size = 'default',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'success' | 'outline' | 'warning';
  size?: 'sm' | 'default';
}) {
  const styles = {
    default: 'bg-[#c9a84c] text-[#1a3d1c] hover:bg-[#b8973f]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
    outline: 'border border-[#c9a84c] text-[#1a3d1c] hover:bg-[#c9a84c]/10',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    default: 'px-4 py-2 text-sm',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition ${styles[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Document Viewer Modal ──────────────────────────────────────────────────

interface DocumentViewerModalProps {
  document: HelpdeskDocument;
  ticketId: string;
  onClose: () => void;
  onActionComplete: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  ticketId,
  onClose,
  onActionComplete,
}) => {
  const dispatch = useAppDispatch();

  const [isStamping, setIsStamping] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const canDecide = document.status === 'pending_approval';
  const canSendToRequester = document.status === 'approved';

  const handleApproveAndStamp = async () => {
    setIsStamping(true);
    try {
      const stampedBlob = await stampPdfFromUrl(document.file_url, {
        issuer: 'REGISTRAR HIGH COURT',
        approverName: 'Super Admin',
        signatureImageBytes: undefined,
      });

      const safeRef = document.ref.replace(/[\\/:*?"<>|]/g, '-');

      await dispatch(
        uploadHelpdeskDocument({
          blob: stampedBlob,
          filename: `stamped-${safeRef}.pdf`,
          ref: document.ref,
          subject: document.subject,
          entity_type: 'ticket' as DocumentEntityType,
          entity_id: ticketId,
          format: 'pdf' as DocumentFormat,
        })
      ).unwrap();

      await dispatch(approveTicket({ id: ticketId, comments: 'Document reviewed, stamped, and approved.' })).unwrap();

      toast.success('Document stamped and ticket approved.');
      onActionComplete();
    } catch (err) {
      console.error('Approve & stamp failed:', err);
      toast.error(typeof err === 'string' ? err : 'Failed to approve and stamp the document.');
    } finally {
      setIsStamping(false);
    }
  };

  const handleRejectDocument = async () => {
    const reason = prompt('Please provide a reason for rejecting this document:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }

    try {
      await dispatch(rejectDocument({ id: document.id, reason: reason.trim() })).unwrap();
      await dispatch(returnTicket({ id: ticketId, reason: reason.trim() })).unwrap();
      toast.success('Document rejected and ticket returned to requester.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to reject document.');
    }
  };

  const handleReturn = async () => {
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for returning this document.');
      return;
    }
    try {
      await dispatch(returnHelpdeskDocument({ id: document.id, comments: returnReason.trim() })).unwrap();
      await dispatch(returnTicket({ id: ticketId, reason: returnReason.trim() })).unwrap();
      toast.success('Document returned to the requester.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to return the document.');
    }
  };

  const handleDeliverToRequester = async () => {
    try {
      await dispatch(
        returnTicket({ id: ticketId, reason: 'Approved and stamped. Document ready for collection.' })
      ).unwrap();
      toast.success('Stamped document sent to the requester.');
      onActionComplete();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to send the document to the requester.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-stone-100 bg-stone-50 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-semibold text-[#1a3d1c] truncate">
                {document.subject}
              </h2>
              <DocumentStatusBadge status={document.status} />
            </div>
            <p className="mt-1 text-xs text-stone-400 font-mono">
              Ref: {document.ref} • {document.format.toUpperCase()} • {new Date(document.created_at).toLocaleDateString()}
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
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
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
              <p className="mt-0.5 text-sm capitalize text-stone-800">{document.entity_type}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Uploaded On</p>
              <p className="mt-0.5 text-sm text-stone-800">
                {new Date(document.created_at).toLocaleString()}
              </p>
            </div>
            {document.approved_at && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Approved On</p>
                <p className="mt-0.5 text-sm text-stone-800">
                  {new Date(document.approved_at).toLocaleString()}
                </p>
              </div>
            )}
            {document.approved_by_name && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Approved By</p>
                <p className="mt-0.5 text-sm text-stone-800">{document.approved_by_name}</p>
              </div>
            )}
          </div>

          {document.e_stamp_url && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stamp size={20} className="text-emerald-600" />
                  <h4 className="text-sm font-semibold text-emerald-800">E-Stamp</h4>
                </div>
                <div className="flex gap-2">
                  <a
                    href={document.e_stamp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Eye size={14} />
                    View Stamp
                  </a>
                  <a
                    href={document.e_stamp_url}
                    download={`e-stamp-${document.ref}.png`}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                  >
                    <Download size={14} />
                    Download
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
                  <p className="text-emerald-600">✓ Approved on {document.approved_at ? new Date(document.approved_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {canSendToRequester && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-800">Approved Document</h4>
                </div>
                <div className="flex gap-2">
                  <a
                    href={document.file_url}
                    download={`stamped-${document.ref}.${document.format}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Download size={16} />
                    Download
                  </a>
                  <GoldButton
                    variant="success"
                    onClick={handleDeliverToRequester}
                    icon={<Send size={16} />}
                  >
                    Send to Requester
                  </GoldButton>
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-600">
                This document has been approved. Send it back to the requester, or download it directly.
              </p>
            </div>
          )}

          {canDecide && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <Clock size={16} />
                Pending Your Decision
              </h4>
              <p className="mt-1 text-xs text-amber-700">
                Approving will burn a blue registrar stamp into the PDF, upload the stamped version,
                and mark the ticket approved. Returning sends the ticket back to the requester unstamped.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <GoldButton
                  variant="success"
                  onClick={handleApproveAndStamp}
                  disabled={isStamping || showReturnForm}
                  icon={
                    isStamping ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Stamp size={14} />
                    )
                  }
                >
                  {isStamping ? 'Stamping…' : 'Approve & Stamp'}
                </GoldButton>
                <GoldButton
                  variant="warning"
                  onClick={handleRejectDocument}
                  disabled={isStamping || showReturnForm}
                  icon={<XCircle size={14} />}
                >
                  Reject
                </GoldButton>
                <GoldButton
                  variant="outline"
                  onClick={() => setShowReturnForm((v) => !v)}
                  disabled={isStamping}
                  icon={<ArrowLeft size={14} />}
                >
                  Return
                </GoldButton>
              </div>

              {showReturnForm && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Reason for returning this document to the requester…"
                    rows={3}
                    className={`${inputClasses} resize-none`}
                  />
                  <div className="flex gap-2">
                    <GoldButton
                      variant="danger"
                      size="sm"
                      onClick={handleReturn}
                      icon={<Send size={14} />}
                    >
                      Confirm Return
                    </GoldButton>
                    <GhostButton onClick={() => setShowReturnForm(false)}>
                      Cancel
                    </GhostButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {document.approval_history && document.approval_history.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <Clock size={16} className="text-stone-400" />
                Approval History
              </h3>
              <div className="mt-3 space-y-2">
                {document.approval_history.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="relative flex items-start gap-3 rounded-lg border border-stone-100 bg-white p-3"
                  >
                    {index < document.approval_history.length - 1 && (
                      <div className="absolute left-5 top-8 h-full w-0.5 bg-stone-200" />
                    )}
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-100">
                      {entry.action === 'submitted' && <Send size={14} className="text-amber-600" />}
                      {entry.action === 'approved' && <CheckCircle size={14} className="text-emerald-600" />}
                      {entry.action === 'rejected' && <XCircle size={14} className="text-red-600" />}
                      {entry.action === 'returned' && <ArrowLeft size={14} className="text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-stone-800">
                          {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 px-6 py-3">
          <div className="flex gap-2">
            <a
              href={document.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              <ExternalLink size={14} />
              View Document
            </a>
            <a
              href={document.file_url}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              <Download size={14} />
              Download
            </a>
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
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const SuperAdminTickets: React.FC = () => {
  const dispatch = useAppDispatch();

  const tickets = useAppSelector(selectAllTickets);
  const status = useAppSelector(selectTicketStatus);
  const error = useAppSelector(selectTicketError);
  const pagination = useAppSelector(selectTicketPagination);
  const filters = useAppSelector(selectTicketFilters);
  const actionsLoading = useAppSelector(selectTicketActions);

  const helpdeskDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const docsLoading = useAppSelector(selectDocumentsFetchLoading);
  const docError = useAppSelector(selectDocumentError);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isUploading = useAppSelector(selectDocumentsUploading);
  const isLinking = useAppSelector(selectDocumentLinking);

  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [selectedDocForView, setSelectedDocForView] = useState<HelpdeskDocument | null>(null);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  useEffect(() => {
    dispatch(fetchTickets(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    if (expandedTicketId) {
      dispatch(fetchHelpdeskDocuments({ entity_type: 'ticket', entity_id: expandedTicketId }));
    }
  }, [dispatch, expandedTicketId]);

  useEffect(() => {
    if (showLinkPicker) {
      dispatch(fetchHelpdeskDocuments({ unlinked: true }));
    }
  }, [dispatch, showLinkPicker]);

  useEffect(() => {
    return () => {
      if (docError) {
        dispatch(clearDocumentError());
      }
    };
  }, [dispatch, docError]);

  const handleFilterChange = (key: keyof TicketFilters, value: string | undefined) => {
    dispatch(setFilters({ [key]: value }));
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setFilters({ page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setFilters({ limit: newLimit, page: 1 }));
  };

  const handleViewDocument = (doc: HelpdeskDocument) => {
    setSelectedDocForView(doc);
    setShowDocViewer(true);
  };

  const handleCloseDocViewer = () => {
    setShowDocViewer(false);
    setSelectedDocForView(null);
  };

  const handleLinkExisting = async (documentId: string) => {
    if (!expandedTicketId) return;
    try {
      await dispatch(
        linkHelpdeskDocument({
          id: documentId,
          entity_type: 'ticket',
          entity_id: expandedTicketId,
        })
      ).unwrap();
      toast.success('Document linked to this ticket.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({
        entity_type: 'ticket',
        entity_id: expandedTicketId,
      }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  };

  const handleDeliverToRequester = async (ticketId: string) => {
    try {
      await dispatch(
        returnTicket({ id: ticketId, reason: 'Approved and stamped. Document ready for collection.' })
      ).unwrap();
      toast.success('Stamped document sent to the requester.');
      dispatch(fetchTickets(filters));
      dispatch(fetchHelpdeskDocuments({ entity_type: 'ticket', entity_id: ticketId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to send the document to the requester.');
    }
  };

  if (status === 'loading' && tickets.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c9a84c] border-t-transparent" />
          <p className="text-sm text-stone-500">Loading tickets…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">Error: {error}</p>
          <button
            onClick={() => dispatch(clearError())}
            className="mt-3 text-xs font-semibold text-red-600 underline decoration-dotted hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '10px',
            fontSize: '13px',
            background: '#fff',
            color: '#1c1917',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1a3d1c]">Ticket Approvals</h1>
            <p className="mt-0.5 text-sm text-stone-500">
              Review and approve documents submitted for your action
            </p>
          </div>
          <div className="text-sm text-stone-500">
            {pagination.total} ticket{pagination.total !== 1 ? 's' : ''} in the system
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <input
              type="text"
              placeholder="Search title, reference, judge…"
              value={filters.search ?? ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className={`${inputClasses} lg:col-span-2`}
            />
            <select
              value={filters.status ?? ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className={inputClasses}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="booked">Booked</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filters.priority ?? ''}
              onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
              className={inputClasses}
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="text"
              placeholder="Judge name"
              value={filters.judge_name ?? ''}
              onChange={(e) => handleFilterChange('judge_name', e.target.value || undefined)}
              className={inputClasses}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleResetFilters}
              className="text-xs font-medium text-stone-500 underline decoration-dotted hover:text-stone-700"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {['Ref', 'Title', 'Status', 'Priority', 'Travel Date', 'Judge', 'Documents'].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 ${
                        h === 'Documents' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-stone-400">
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-stone-50 transition hover:bg-stone-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-stone-500">{ticket.reference_no}</td>
                      <td className="px-4 py-3 font-medium text-stone-900">{ticket.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColor(
                            ticket.status
                          )}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDot(ticket.status)}`} />
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium capitalize ${priorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {new Date(ticket.date_of_travel).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">{ticket.judge_name || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setExpandedTicketId(prev => prev === ticket.id ? null : ticket.id)}
                            className={`rounded-lg p-1.5 transition ${
                              expandedTicketId === ticket.id
                                ? 'bg-stone-100 text-stone-700'
                                : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
                            }`}
                            title="View Associated Documents"
                          >
                            <FileText size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-stone-100 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-stone-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-1 text-xs text-stone-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {expandedTicketId && (
          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                  <FileText size={16} className="text-[#c9a84c]" />
                  Supporting Documents
                </h2>
                <p className="text-xs text-stone-500">
                  {helpdeskDocuments.length} document{helpdeskDocuments.length !== 1 ? 's' : ''} attached
                </p>
              </div>
              <div className="flex items-center gap-2">
                <GhostButton
                  onClick={() => setShowLinkPicker((v) => !v)}
                  icon={<Paperclip size={14} />}
                  disabled={isUploading}
                >
                  Link Existing
                </GhostButton>
                <button
                  onClick={() => setExpandedTicketId(null)}
                  className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {docError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                Failed to load documents: {docError}
              </p>
            )}

            {showLinkPicker && (
              <div className="mt-2 rounded-lg border border-stone-200 bg-white p-2">
                {unlinkedDocuments.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-stone-400 italic">No unlinked documents found.</p>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {unlinkedDocuments.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-2 px-2 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText size={14} className="text-stone-400" />
                          <span className="truncate text-sm text-stone-700">{doc.subject}</span>
                          <span className="shrink-0 text-[11px] text-stone-400">{doc.ref}</span>
                        </div>
                        <GhostButton
                          onClick={() => handleLinkExisting(doc.id)}
                          disabled={isLinking}
                          icon={isLinking ? <Loader2 size={12} className="animate-spin" /> : undefined}
                        >
                          Attach
                        </GhostButton>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {docsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-[#c9a84c]" />
              </div>
            ) : helpdeskDocuments.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 p-8 text-center">
                <File size={32} className="mx-auto text-stone-300" />
                <p className="mt-2 text-sm text-stone-500">No documents attached to this ticket.</p>
                <p className="text-xs text-stone-400">Documents submitted for approval will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {helpdeskDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 transition hover:shadow-sm hover:border-stone-300"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-stone-100 p-1.5">
                        <FileText size={16} className="text-stone-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{doc.subject}</p>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <span className="font-mono">Ref: {doc.ref}</span>
                          <span className="uppercase">{doc.format}</span>
                          <DocumentStatusBadge status={doc.status} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* View Document Button - Always visible */}
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                        title="View Document Details"
                      >
                        <Eye size={16} />
                      </button>
                      
                      {/* Download Button - Always visible */}
                      <a
                        href={doc.file_url}
                        download
                        className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                        title="Download Document"
                      >
                        <Download size={16} />
                      </a>

                      {/* If document is approved, show "Send to Requester" */}
                      {doc.status === 'approved' && (
                        <GhostButton
                          onClick={() => expandedTicketId && handleDeliverToRequester(expandedTicketId)}
                          disabled={actionsLoading.returning}
                          icon={
                            actionsLoading.returning ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )
                          }
                        >
                          {actionsLoading.returning ? 'Sending…' : 'Send to Requester'}
                        </GhostButton>
                      )}

                      {/* If document is pending_approval, show "Review & Decide" button */}
                      {doc.status === 'pending_approval' && (
                        <GhostButton
                          onClick={() => handleViewDocument(doc)}
                          icon={<Eye size={12} />}
                        >
                          Review & Decide
                        </GhostButton>
                      )}

                      {/* If document is draft, Super Admin can only view/download */}
                      {doc.status === 'draft' && (
                        <span className="text-xs text-stone-400">Draft</span>
                      )}

                      {/* E-Stamp indicator */}
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
        )}
      </div>

      {showDocViewer && selectedDocForView && expandedTicketId && (
        <DocumentViewerModal
          document={selectedDocForView}
          ticketId={expandedTicketId}
          onClose={handleCloseDocViewer}
          onActionComplete={() => {
            handleCloseDocViewer();
            dispatch(fetchTickets(filters));
            dispatch(fetchHelpdeskDocuments({ entity_type: 'ticket', entity_id: expandedTicketId }));
          }}
        />
      )}
    </div>
  );
};

export default SuperAdminTickets;