// src/features/tickets/SuperAdminTickets.tsx

import React, { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  setFilters,
  resetFilters,
  clearError,
  selectAllTickets,
  selectTicketStatus,
  selectTicketError,
  selectTicketPagination,
  selectTicketFilters,
  selectTicketActions,
} from '../../store/slices/ticketSlice';
import {
  fetchJudges,
  selectAllJudges,
  selectJudgesLoading,
} from '../../store/slices/JudgesSlice';
import {
  fetchDepartments,
  selectAllDepartments,
  selectDepartmentsListLoading,
} from '../../store/slices/departmentsSlice';
import {
  fetchUsers,
  selectAllUsers,
  selectUsersListLoading,
  selectCurrentUser,
  selectIsDeptHead,
  selectUsersSignatureLoading,
  uploadSignature,
  deleteSignature,
} from '../../store/slices/userSlice';
import type { Judge } from '../../types/judges.types';
import type {
  Ticket,
  TicketStatus,
  TicketFilters,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketPriority,
  TravelClass,
  FlightTimePreference,
} from '../../types/tickets.types';
import {
  uploadHelpdeskDocument,
  fetchHelpdeskDocuments,
  linkHelpdeskDocument,
  submitForApproval,
  selectAllHelpdeskDocuments,
  selectDocumentsFetchLoading,
  selectDocumentError,
  selectUnlinkedHelpdeskDocuments,
  selectDocumentsUploading,
  selectDocumentActionLoading,
  selectDocumentLinking,
  type DocumentFormat,
  type DocumentEntityType,
  type HelpdeskDocument,
  clearDocumentError,
} from '../../store/slices/helpdeskDocumentsSlice';
import toast, { Toaster } from 'react-hot-toast';
import {
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Save,
  Download,
  ChevronDown,
  Upload,
  Trash2,
  Image,
  FileText,
  FileSpreadsheet,
  Eye,
  File,
  ExternalLink,
  Stamp,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Edit,
  Paperclip,
} from 'lucide-react';
import { generateAirTicketMemoDocx } from '../../utils/generateAirTicketMemoDocx';
import { generateAirTicketMemoPdf } from '../../utils/generateAirTicketMemoPdf';
import { generateAirTicketMemoExcel } from '../../utils/generateAirTicketMemoExcel';
import TicketApprovalModal from './ticket/TicketApprovalModal';

// ── Constants ──────────────────────────────────────────────────────────────

const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

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

// ── Document Viewer Modal ──────────────────────────────────────────────────

interface DocumentViewerModalProps {
  document: HelpdeskDocument;
  onClose: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
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
          {/* Document Info */}
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
            {document.e_stamp_status === 'stamped' && (
              <div className="col-span-full">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">E-Stamp Status</p>
                <p className="mt-0.5 text-sm font-medium text-emerald-600 flex items-center gap-2">
                  <Stamp size={16} />
                  Stamped ✓
                </p>
              </div>
            )}
          </div>

          {/* E-Stamp Preview */}
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

          {/* Download Stamped Document */}
          {document.status === 'approved' && document.e_stamp_url && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-800">Stamped Document</h4>
                </div>
                <a
                  href={document.file_url}
                  download={`stamped-${document.ref}.${document.format}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Download size={16} />
                  Download Stamped Document
                </a>
              </div>
              <p className="mt-2 text-xs text-blue-600">
                This document has been approved and e-stamped. Click to download the final version.
              </p>
            </div>
          )}

          {/* Approval History */}
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

        {/* Footer */}
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

// ── Helper: status badge style ──────────────────────────────────────────────

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

// ── Shared UI primitives ─────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] transition-colors';

const labelClasses = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500';

function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] shadow-sm transition hover:bg-[#b8973f] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

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
  variant?: 'default' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'default';
}) {
  const styles = {
    default: 'bg-[#c9a84c] text-[#1a3d1c] hover:bg-[#b8973f]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
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

// ── Signature Section ──────────────────────────────────────────────────────

interface SignatureSectionProps {
  userSignature: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isLoading: boolean;
}

function SignatureSection({ userSignature, onUpload, onRemove, isLoading }: SignatureSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, WEBP, GIF, or SVG).');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Signature image must be less than 2MB.');
      e.target.value = '';
      return;
    }

    await onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Image size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Digital Signature</h4>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
          />
          <GhostButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          >
            {isLoading ? 'Uploading…' : 'Upload Signature'}
          </GhostButton>
          {userSignature && (
            <GhostButton onClick={onRemove} disabled={isLoading} icon={<Trash2 size={14} />}>
              Remove
            </GhostButton>
          )}
        </div>
      </div>

      {userSignature ? (
        <div className="flex items-center gap-4 p-3 bg-white rounded border border-stone-200">
          <img src={userSignature} alt="Your signature" className="max-h-16 w-auto object-contain" />
          <span className="text-xs text-stone-500">✓ Signature uploaded</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-white rounded border border-dashed border-stone-300">
          <Image size={20} className="text-stone-400" />
          <div>
            <p className="text-sm text-stone-600">No signature uploaded</p>
            <p className="text-xs text-stone-400">Upload your signature to include it in the memo</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Judge name autocomplete ──────────────────────────────────────────────

function JudgeSearchField({
  nameValue,
  pjValue,
  onNameChange,
  onSelectJudge,
  judges,
  loading,
}: {
  nameValue: string;
  pjValue: string;
  onNameChange: (name: string) => void;
  onSelectJudge: (judge: Judge) => void;
  judges: Judge[];
  loading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = nameValue.trim().toLowerCase();
  const matches = query
    ? judges.filter((j) => j.name.toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <div className="relative" ref={containerRef}>
      <label className={labelClasses}>Judge Name</label>
      <input
        type="text"
        value={nameValue}
        onChange={(e) => {
          onNameChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={loading ? 'Loading judges…' : "Start typing a judge's name…"}
        className={inputClasses}
        autoComplete="off"
      />

      {isOpen && query && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-stone-200 bg-white shadow-lg">
          {matches.map((j) => (
            <li key={j.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectJudge(j);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50"
              >
                <span className="text-stone-800">{j.name}</span>
                <span className="text-xs text-stone-400">{j.pj_number}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && query && !loading && matches.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-stone-400 shadow-lg">
          No matching judges found — you can still type a name manually.
        </div>
      )}

      {pjValue && (
        <p className="mt-1 text-[11px] font-medium text-emerald-600">
          ✓ PJ Number auto-filled: {pjValue}
        </p>
      )}
    </div>
  );
}

// ── Ticket Memo Preview ────────────────────────────────────────────────────

interface TicketMemoPreviewProps {
  ticketData: TicketFormData;
  referenceNo?: string;
  onEdit: () => void;
  signatureUrl?: string | null;
}

type DownloadFormat = 'docx' | 'pdf' | 'xlsx';

// One row of the fixed schedule table (Name / Date / Preferred Time), styled
// after the sample memo: the traveller's name only appears once, on the
// first leg; the return leg repeats just the date/route/time.
interface ScheduleRow {
  name: string;
  route: string;
  date: string;
  time: string;
}

const flightTimeLabels: Record<FlightTimePreference, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  any: 'Any Time',
};

const TicketMemoPreview: React.FC<TicketMemoPreviewProps> = ({
  ticketData,
  referenceNo,
  onEdit,
  signatureUrl,
}) => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ── Fixed (non-editable) schedule rows, built straight from ticket data ──
  const scheduleRows: ScheduleRow[] = [];
  const travellerName = ticketData.judge_name || '—';
  const timeLabel = flightTimeLabels[ticketData.preferred_flight_time] || 'Any Time';

  if (ticketData.date_of_travel) {
    scheduleRows.push({
      name: travellerName,
      route: `${ticketData.departure_from} - ${ticketData.destination}`,
      date: formatDate(ticketData.date_of_travel),
      time: timeLabel,
    });
  }
  if (ticketData.return_date) {
    scheduleRows.push({
      name: '', // matches the sample: name only shown once, on the first leg
      route: `${ticketData.destination} - ${ticketData.departure_from}`,
      date: formatDate(ticketData.return_date),
      time: timeLabel,
    });
  }

  // Editable fields
  const [toField, setToField] = useState('REGISTRAR, HIGH COURT/AIE HOLDER');
  const [fromField, setFromField] = useState('HIGH COURT SUPPORT OFFICE');
  const [refField, setRefField] = useState(() => referenceNo || 'RHC/AIE/000');
  const [dateField, setDateField] = useState(() =>
    new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
  );
  const [subjectField, setSubjectField] = useState('REQUEST AIR TICKET');

  // Narrative paragraph — styled after the sample memo's prose (traveller,
  // purpose, and a pointer to the schedule table below), not a bullet list.
  const [bodyText, setBodyText] = useState(() => {
    const who = ticketData.judge_name ? `Hon. Justice ${ticketData.judge_name}` : 'The traveller named below';
    return `${who} is scheduled to travel to ${ticketData.destination || '[destination]'} on official duty. In view of the above, kindly approve procurement of an air ticket to facilitate the travel as per the schedule below:`;
  });

  const [signatoryName, setSignatoryName] = useState(() => currentUser?.full_name || '');

  const editableLineClasses =
    'flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none';

  const handleDownload = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);

    try {
      // Build schedule rows for air ticket
      const airTicketScheduleRows = scheduleRows.map(row => ({
        name: row.name || '—',
        date: row.date,
        route: row.route,
        preferredTime: row.time,
      }));

      // Use air ticket specific params
      const airTicketParams = {
        to: toField,
        from: fromField,
        ref: refField,
        date: dateField,
        subject: subjectField,
        bodyText,
        scheduleRows: airTicketScheduleRows,
        signatoryName,
        crestUrl: JUDICIARY_CREST_SRC,
        signatureUrl: signatureUrl || undefined,
        fromDepartment: fromField,
      };

      let blob: Blob | null = null;

      if (format === 'docx') {
        blob = await generateAirTicketMemoDocx(airTicketParams);
      } else if (format === 'pdf') {
        blob = await generateAirTicketMemoPdf(airTicketParams);
      } else if (format === 'xlsx') {
        blob = generateAirTicketMemoExcel(airTicketParams);
      }

      if (!blob) throw new Error('Generator returned no blob');

      const safeRef = refField.replace(/[\\/:*?"<>|]/g, '-');
      const filename = `${safeRef}.${format}`;

      await dispatch(
        uploadHelpdeskDocument({
          blob,
          filename,
          ref: refField,
          subject: subjectField,
          entity_type: 'ticket' as DocumentEntityType,
          format: format as DocumentFormat,
        })
      ).unwrap();

      toast.success(`${format.toUpperCase()} document saved to the system.`);
    } catch (err) {
      console.error(`Failed to generate/upload ${format} memo:`, err);
      toast.error('Failed to save document. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Preparing Word…',
    pdf: 'Preparing PDF…',
    xlsx: 'Preparing Excel…',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-[#c9a84c]" />
          Memo Preview
        </h4>
        <div className="flex gap-2">
          <GhostButton onClick={onEdit} icon={<ArrowLeft size={12} />}>
            Edit Info
          </GhostButton>

          <div className="relative">
            <GoldButton
              size="sm"
              onClick={() => setShowDownloadMenu((v) => !v)}
              disabled={downloadingFormat !== null}
              icon={downloadingFormat ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            >
              {downloadingFormat ? downloadLabels[downloadingFormat] : 'Download'}
              {!downloadingFormat && <ChevronDown size={12} />}
            </GoldButton>

            {showDownloadMenu && (
              <>
                <div className="fixed inset-0 z-0" onClick={() => setShowDownloadMenu(false)} />
                <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => handleDownload('docx')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                  >
                    <FileText size={14} className="text-blue-600" />
                    Word (.docx)
                  </button>
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                  >
                    <FileText size={14} className="text-red-600" />
                    PDF (.pdf)
                  </button>
                  <button
                    onClick={() => handleDownload('xlsx')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-600" />
                    Excel (.xlsx)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Memo Preview - A4 layout */}
      <div className="border border-stone-300 bg-white shadow-sm font-sans text-black" style={{ minHeight: '297mm' }}>
        <div className="flex flex-col" style={{ minHeight: '297mm' }}>
          {/* Header */}
          <div className="p-10">
            <div className="flex justify-center mb-3">
              <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-20 w-auto object-contain" />
            </div>

            <div className="text-center mb-6">
              <p className="text-lg font-bold uppercase leading-snug">
                OFFICE OF THE REGISTRAR HIGH COURT
              </p>
              <p className="text-lg font-bold uppercase leading-snug border-b-2 border-black inline-block pb-2 px-1">
                INTERNAL MEMO
              </p>
            </div>

            <div className="space-y-3 text-sm font-bold mb-8">
              <div className="flex">
                <span className="w-24 shrink-0">TO</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={toField}
                  onChange={(e) => setToField(e.target.value)}
                  className={`${editableLineClasses} uppercase`}
                />
              </div>
              <div className="flex">
                <span className="w-24 shrink-0">FROM</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={fromField}
                  onChange={(e) => setFromField(e.target.value)}
                  className={`${editableLineClasses} uppercase`}
                />
              </div>
              <div className="flex">
                <span className="w-24 shrink-0">REF</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={refField}
                  onChange={(e) => setRefField(e.target.value)}
                  className={editableLineClasses}
                />
              </div>
              <div className="flex">
                <span className="w-24 shrink-0">DATE</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={dateField}
                  onChange={(e) => setDateField(e.target.value)}
                  className={editableLineClasses}
                />
              </div>
              <div className="flex border-b-2 border-black pb-3">
                <span className="w-24 shrink-0">SUBJECT</span>
                <span className="w-4 shrink-0">:</span>
                <input
                  type="text"
                  value={subjectField}
                  onChange={(e) => setSubjectField(e.target.value)}
                  className={`${editableLineClasses} uppercase`}
                />
              </div>
            </div>

            <div className="space-y-4 text-sm">
              {/* Narrative paragraph — editable, mirrors the sample memo's prose */}
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={4}
                className={`${editableLineClasses} block w-full resize-none leading-relaxed`}
              />

              {/* Fixed schedule table — NOT editable, mirrors the sample memo's
                  Name / Date / Preferred Time table exactly. */}
              <table className="w-full border-collapse border border-black text-sm">
                <thead>
                  <tr>
                    <th className="border border-black px-2 py-1.5 text-left text-xs font-bold">Name</th>
                    <th className="border border-black px-2 py-1.5 text-left text-xs font-bold">Date</th>
                    <th className="border border-black px-2 py-1.5 text-left text-xs font-bold">Preferred Time</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRows.length > 0 ? (
                    scheduleRows.map((row, i) => (
                      <tr key={i}>
                        <td className="border border-black px-2 py-1.5 align-top font-medium">{row.name}</td>
                        <td className="border border-black px-2 py-1.5 align-top">
                          {row.date}
                          <br />
                          <span className="text-xs text-stone-600">{row.route}</span>
                        </td>
                        <td className="border border-black px-2 py-1.5 align-top">{row.time}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="border border-black px-2 py-3 text-center text-stone-400">
                        Set a travel date in Step 1 to populate the schedule.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sign-off */}
          <div className="flex-1"></div>
          <div className="p-10 pt-0">
            <div className="space-y-1">
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Signatory name"
                className={`${editableLineClasses} block text-sm font-bold`}
              />
              {signatureUrl && (
                <div className="py-1">
                  <img src={signatureUrl} alt="Signature" className="max-h-12 w-auto object-contain" />
                </div>
              )}
              <input
                type="text"
                value={fromField}
                onChange={(e) => setFromField(e.target.value)}
                className={`${editableLineClasses} block text-sm font-bold underline uppercase`}
              />
            </div>

            <div className="mt-12 pt-3 border-t border-stone-300 flex items-center justify-between gap-3">
              <img src={FOOTER_EMBLEM_SRC} alt="" className="h-10 w-auto object-contain shrink-0" />
              <div className="text-[10px] leading-tight text-stone-700 text-right">
                <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
                <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
                <p className="mt-1 font-bold text-emerald-800">Justice Be Our Shield and Defender</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Ticket Form Data ───────────────────────────────────────────────────────

interface TicketFormData {
  department_id: string;
  date_of_travel: string;
  return_date: string;
  departure_from: string;
  destination: string;
  preferred_flight_time: FlightTimePreference;
  remarks: string;
  judge_name: string;
  pj_number: string;
  travel_class: TravelClass;
  number_of_passengers: number;
  special_requests: string;
  priority: TicketPriority;
  assigned_to: string;
  is_draft: boolean;
}

// ── Ticket Form Modal ──────────────────────────────────────────────────────

interface TicketFormModalProps {
  initialData?: Ticket | null;
  onClose: () => void;
  onSubmit: (data: UpdateTicketRequest | CreateTicketRequest) => void;
  isSubmitting: boolean;
}

const TicketFormModal: React.FC<TicketFormModalProps> = ({
  initialData,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const dispatch = useAppDispatch();
  const judges = useAppSelector(selectAllJudges);
  const judgesLoading = useAppSelector(selectJudgesLoading);
  const currentUser = useAppSelector(selectCurrentUser);
  const isDeptHead = useAppSelector(selectIsDeptHead);
  const departments = useAppSelector(selectAllDepartments);
  const departmentsLoading = useAppSelector(selectDepartmentsListLoading);
  const departmentUsers = useAppSelector(selectAllUsers);
  const departmentUsersLoading = useAppSelector(selectUsersListLoading);
  const signatureLoading = useAppSelector(selectUsersSignatureLoading);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<TicketFormData>(() => ({
    department_id: initialData?.department_id ?? (isDeptHead ? currentUser?.department_id ?? '' : ''),
    date_of_travel: initialData?.date_of_travel ?? '',
    return_date: initialData?.return_date ?? '',
    departure_from: initialData?.departure_from ?? '',
    destination: initialData?.destination ?? '',
    preferred_flight_time: initialData?.preferred_flight_time ?? 'any',
    remarks: initialData?.remarks ?? '',
    judge_name: initialData?.judge_name ?? '',
    pj_number: initialData?.pj_number ?? '',
    travel_class: initialData?.travel_class ?? 'economy',
    number_of_passengers: initialData?.number_of_passengers ?? 1,
    special_requests: initialData?.special_requests ?? '',
    priority: initialData?.priority ?? 'normal',
    assigned_to: initialData?.assigned_to ?? '',
    is_draft: false,
  }));

  // Fetch judges + departments on mount
  useEffect(() => {
    dispatch(fetchJudges({}));
    dispatch(fetchDepartments({}));
  }, [dispatch]);

  // Effective department for dept_head
  const effectiveDepartmentId = isDeptHead
    ? currentUser?.department_id ?? ''
    : formData.department_id;

  // Fetch users for department
  useEffect(() => {
    if (effectiveDepartmentId) {
      dispatch(fetchUsers({ department_id: effectiveDepartmentId, is_active: true, limit: 100 }));
    }
  }, [dispatch, effectiveDepartmentId]);

  const assignableUsers = effectiveDepartmentId
    ? departmentUsers.filter((u) => u.department_id === effectiveDepartmentId)
    : [];

  // Handlers
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDepartmentChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const department_id = e.target.value;
    setFormData((prev) => ({ ...prev, department_id, assigned_to: '' }));
  };

  const handleSelectJudge = (judge: Judge) => {
    setFormData((prev) => ({
      ...prev,
      judge_name: judge.name,
      pj_number: judge.pj_number,
    }));
  };

  const handleJudgeNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, judge_name: name }));
  };

  const handleSignatureUpload = async (file: File) => {
    try {
      await dispatch(uploadSignature(file)).unwrap();
      toast.success('Signature uploaded successfully.');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to upload signature.');
    }
  };

  const handleSignatureRemove = async () => {
    if (!currentUser?.signature_url) return;
    try {
      await dispatch(deleteSignature()).unwrap();
      toast.success('Signature removed successfully.');
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to remove signature.');
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate required fields
      if (!formData.date_of_travel || !formData.departure_from || !formData.destination) {
        toast.error('Please fill in all required fields (Travel Date, Departure, Destination)');
        return;
      }
      if (isDeptHead && !effectiveDepartmentId) {
        toast.error('Your department could not be determined. Please contact an administrator.');
        return;
      }
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) setCurrentStep(1);
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();

    // Build payload
    const derivedTitle =
      initialData?.title ??
      `${formData.judge_name ? `${formData.judge_name} — ` : ''}${formData.departure_from} to ${formData.destination} (${formData.date_of_travel})`;

    const payload: CreateTicketRequest = {
      title: derivedTitle,
      department_id: effectiveDepartmentId || undefined,
      date_of_travel: formData.date_of_travel,
      return_date: formData.return_date || undefined,
      departure_from: formData.departure_from,
      destination: formData.destination,
      preferred_flight_time: formData.preferred_flight_time,
      remarks: formData.remarks || undefined,
      judge_name: formData.judge_name || undefined,
      pj_number: formData.pj_number || undefined,
      travel_class: formData.travel_class,
      number_of_passengers: formData.number_of_passengers,
      special_requests: formData.special_requests || undefined,
      priority: formData.priority,
      assigned_to: formData.assigned_to || undefined,
      is_draft: formData.is_draft,
    };
    onSubmit(payload);
  };

  const handleClose = () => {
    setCurrentStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">
            {initialData ? 'Edit Ticket' : 'New Ticket'}
          </h3>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          {/* Step Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 1 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                    1
                  </div>
                  <span className="text-xs font-medium">Basic Info</span>
                </div>
                <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-[#c9a84c]' : 'bg-stone-200'}`} />
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 2 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                    2
                  </div>
                  <span className="text-xs font-medium">Preview</span>
                </div>
              </div>
              <span className="text-xs text-stone-400">Step {currentStep} of 2</span>
            </div>
          </div>

          {currentStep === 1 && (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Department + Assigned To */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>
                    Department {isDeptHead && <span className="normal-case text-stone-400">(your department)</span>}
                  </label>
                  <select
                    name="department_id"
                    value={effectiveDepartmentId}
                    onChange={handleDepartmentChange}
                    disabled={isDeptHead || departmentsLoading}
                    className={`${inputClasses} disabled:bg-stone-100 disabled:text-stone-500`}
                  >
                    <option value="">
                      {departmentsLoading ? 'Loading departments…' : '-- Select Department --'}
                    </option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {isDeptHead && (
                    <p className="mt-1 text-[11px] text-stone-400">
                      As a department head, tickets you create are scoped to your own department.
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClasses}>Assigned To</label>
                  <select
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleChange}
                    disabled={!effectiveDepartmentId || departmentUsersLoading}
                    className={`${inputClasses} disabled:bg-stone-100 disabled:text-stone-500`}
                  >
                    <option value="">Unassigned</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                  {!effectiveDepartmentId ? (
                    <p className="mt-1 text-[11px] text-stone-400">Select a department first.</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-stone-400">
                      Only showing staff in the selected department.
                    </p>
                  )}
                </div>
              </div>

              {/* Travel Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Date of Travel *</label>
                  <input
                    type="date"
                    name="date_of_travel"
                    value={formData.date_of_travel}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Return Date</label>
                  <input
                    type="date"
                    name="return_date"
                    value={formData.return_date}
                    onChange={handleChange}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Departure From *</label>
                  <input
                    type="text"
                    name="departure_from"
                    value={formData.departure_from}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Destination *</label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Flight Time Preference</label>
                  <select
                    name="preferred_flight_time"
                    value={formData.preferred_flight_time}
                    onChange={handleChange}
                    className={inputClasses}
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                    <option value="any">Any</option>
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Travel Class</label>
                  <select
                    name="travel_class"
                    value={formData.travel_class}
                    onChange={handleChange}
                    className={inputClasses}
                  >
                    <option value="economy">Economy</option>
                    <option value="premium_economy">Premium Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Number of Passengers</label>
                  <input
                    type="number"
                    name="number_of_passengers"
                    value={formData.number_of_passengers}
                    onChange={handleChange}
                    className={inputClasses}
                    min="1"
                  />
                </div>
                <div>
                  <label className={labelClasses}>Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className={inputClasses}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Judge */}
              <div className="grid grid-cols-2 gap-4">
                <JudgeSearchField
                  nameValue={formData.judge_name}
                  pjValue={formData.pj_number}
                  onNameChange={handleJudgeNameChange}
                  onSelectJudge={handleSelectJudge}
                  judges={judges}
                  loading={judgesLoading}
                />
                <div>
                  <label className={labelClasses}>PJ Number</label>
                  <input
                    type="text"
                    name="pj_number"
                    value={formData.pj_number}
                    onChange={handleChange}
                    placeholder="Auto-filled when a judge is selected"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  className={`${inputClasses} resize-none`}
                  rows={2}
                />
              </div>

              <div>
                <label className={labelClasses}>Special Requests</label>
                <textarea
                  name="special_requests"
                  value={formData.special_requests}
                  onChange={handleChange}
                  className={`${inputClasses} resize-none`}
                  rows={2}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name="is_draft"
                  checked={formData.is_draft}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-stone-300 text-[#1a3d1c] focus:ring-[#1a3d1c]"
                />
                Save as Draft
              </label>
            </form>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <SignatureSection
                userSignature={currentUser?.signature_url || null}
                onUpload={handleSignatureUpload}
                onRemove={handleSignatureRemove}
                isLoading={signatureLoading}
              />
              <TicketMemoPreview
                ticketData={formData}
                referenceNo={initialData?.reference_no}
                onEdit={() => setCurrentStep(1)}
                signatureUrl={currentUser?.signature_url}
              />
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-stone-100 px-4 py-3">
          <div>
            {currentStep > 1 && (
              <GhostButton onClick={handlePrevStep} icon={<ArrowLeft size={14} />}>
                Back
              </GhostButton>
            )}
          </div>
          <div className="flex gap-2">
            <GhostButton onClick={handleClose}>Cancel</GhostButton>
            {currentStep === 1 ? (
              <GoldButton onClick={handleNextStep} icon={<ArrowRight size={14} />}>
                Next
              </GoldButton>
            ) : (
              <GoldButton
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                icon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
              >
                {isSubmitting ? 'Saving…' : initialData ? 'Update' : 'Create'}
              </GoldButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

const SuperAdminTickets: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const tickets = useAppSelector(selectAllTickets);
  const status = useAppSelector(selectTicketStatus);
  const error = useAppSelector(selectTicketError);
  const pagination = useAppSelector(selectTicketPagination);
  const filters = useAppSelector(selectTicketFilters);
  const actionsLoading = useAppSelector(selectTicketActions);

  // Helpdesk documents state
  const helpdeskDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const docsLoading = useAppSelector(selectDocumentsFetchLoading);
  const docError = useAppSelector(selectDocumentError);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const isLinking = useAppSelector(selectDocumentLinking);

  // Local UI state
  const [approvalTicketId, setApprovalTicketId] = useState<string | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [selectedDocForView, setSelectedDocForView] = useState<HelpdeskDocument | null>(null);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const documentFileInputRef = useRef<HTMLInputElement>(null);

  // Determine user role for the approval modal
  const isDeptHead = useAppSelector(selectIsDeptHead);
  const userRole = isDeptHead ? 'dept_head' : 'staff';

  // Fetch tickets when filters change
  useEffect(() => {
    dispatch(fetchTickets(filters));
  }, [dispatch, filters]);

  // Fetch documents when a ticket is expanded
  useEffect(() => {
  if (expandedTicketId) {
    dispatch(fetchHelpdeskDocuments({ entity_type: 'ticket', entity_id: expandedTicketId }));
  }
}, [dispatch, expandedTicketId]);

  // Fetch unlinked documents when link picker is opened
  useEffect(() => {
    if (showLinkPicker) {
      // After adding `unlinked` to the filters type, remove `as any`
      dispatch(fetchHelpdeskDocuments({ unlinked: true }));
    }
  }, [dispatch, showLinkPicker]);

  // Clear document error on unmount
  useEffect(() => {
    return () => {
      if (docError) {
        dispatch(clearDocumentError());
      }
    };
  }, [dispatch, docError]);

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  const handleOpenCreate = () => {
    setEditingTicket(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setShowCreateModal(true);
  };

  const handleCloseCreate = () => {
    setShowCreateModal(false);
    setEditingTicket(null);
  };

  const handleCreateSubmit = (data: CreateTicketRequest) => {
    dispatch(createTicket(data)).then(() => {
      handleCloseCreate();
    });
  };

  const handleUpdateSubmit = (id: string, data: UpdateTicketRequest) => {
    dispatch(updateTicket({ id, data })).then(() => {
      handleCloseCreate();
      // If the updated ticket is currently expanded, refresh its documents
      if (expandedTicketId === id) {
        dispatch(fetchHelpdeskDocuments({
          entity_type: 'ticket',
          entity_id: id,
        }));
      }
    });
  };

  const handleOpenApprovalModal = (id: string) => {
    setApprovalTicketId(id);
    setShowApprovalModal(true);
  };

  const handleCloseApprovalModal = () => {
    setShowApprovalModal(false);
    setApprovalTicketId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this ticket?')) {
      dispatch(deleteTicket(id));
      if (approvalTicketId === id) {
        setApprovalTicketId(null);
      }
      if (expandedTicketId === id) {
        setExpandedTicketId(null);
      }
    }
  };

  // ── Document Handlers ─────────────────────────────────────────────────────
  const handleViewDocument = (doc: HelpdeskDocument) => {
    setSelectedDocForView(doc);
    setShowDocViewer(true);
  };

  const handleCloseDocViewer = () => {
    setShowDocViewer(false);
    setSelectedDocForView(null);
  };

  const handleAttachDocument = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const format: DocumentFormat | null =
      ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : ext === 'xlsx' ? 'xlsx' : null;

    if (!format) {
      toast.error('Please upload a PDF, Word (.docx), or Excel (.xlsx) file.');
      e.target.value = '';
      return;
    }

    // Find the expanded ticket to get its reference and subject
    const ticket = tickets.find(t => t.id === expandedTicketId);
    if (!ticket) {
      toast.error('Ticket not found.');
      e.target.value = '';
      return;
    }

    try {
      await dispatch(
        uploadHelpdeskDocument({
          blob: file,
          filename: file.name,
          ref: ticket.reference_no,
          subject: ticket.title,
          entity_type: 'ticket',
          entity_id: ticket.id,
          format,
        })
      ).unwrap();
      toast.success('Document attached to this ticket.');
      // Refresh documents
      dispatch(fetchHelpdeskDocuments({
        entity_type: 'ticket',
        entity_id: ticket.id,
      }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to attach document.');
    } finally {
      e.target.value = '';
    }
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
      // Refresh documents
      dispatch(fetchHelpdeskDocuments({
        entity_type: 'ticket',
        entity_id: expandedTicketId,
      }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  };

  const handleSendDocumentForApproval = async (documentId: string) => {
    try {
      await dispatch(submitForApproval({ id: documentId })).unwrap();
      toast.success('Document sent to the super admin for approval.');
      // Refresh documents
      if (expandedTicketId) {
        dispatch(fetchHelpdeskDocuments({
          entity_type: 'ticket',
          entity_id: expandedTicketId,
        }));
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit document for approval.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1a3d1c]">Helpdesk Tickets</h1>
            <p className="mt-0.5 text-sm text-stone-500">
              {pagination.total} ticket{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
          <PrimaryButton onClick={handleOpenCreate}>
            <span className="text-base leading-none">+</span> New Ticket
          </PrimaryButton>
        </div>

        {/* ── Filter Bar ───────────────────────────────────────────────── */}
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
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
            <input
              type="text"
              placeholder="PJ Number"
              value={filters.pj_number ?? ''}
              onChange={(e) => handleFilterChange('pj_number', e.target.value || undefined)}
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

        {/* ── Ticket Table ─────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  {['Ref', 'Title', 'Status', 'Priority', 'Travel Date', 'Judge', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 ${
                        h === 'Actions' ? 'text-center' : 'text-left'
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
                          {/* Document toggle */}
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
                          {/* Review/Approval Button */}
                          <button
                            onClick={() => handleOpenApprovalModal(ticket.id)}
                            className="rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-50 hover:text-amber-800"
                            title="Review & Manage Ticket"
                          >
                            <Eye size={16} />
                          </button>
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(ticket)}
                            className="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                            title="Edit Ticket"
                          >
                            <Edit size={16} />
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(ticket.id)}
                            className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Delete Ticket"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ─────────────────────────────────────────────── */}
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

        {/* ── Associated Documents Section ────────────────────────────── */}
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
                {/* Link Existing Button */}
                <GhostButton
                  onClick={() => setShowLinkPicker((v) => !v)}
                  icon={<Paperclip size={14} />}
                  disabled={isUploading}
                >
                  Link Existing
                </GhostButton>
                {/* Attach Document Button */}
                <input
                  ref={documentFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  onChange={handleAttachDocument}
                  className="hidden"
                  disabled={isUploading}
                />
                <GhostButton
                  onClick={() => documentFileInputRef.current?.click()}
                  disabled={isUploading}
                  icon={isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                >
                  {isUploading ? 'Uploading…' : 'Attach Document'}
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

            {/* Link Existing Picker */}
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
                <p className="text-xs text-stone-400">Attach a document or generate one from the ticket edit modal.</p>
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
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                        title="View Document Details"
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
                      {doc.status === 'draft' && (
                        <GhostButton
                          onClick={() => handleSendDocumentForApproval(doc.id)}
                          disabled={!!documentActionLoading[doc.id]?.submitting}
                          icon={
                            documentActionLoading[doc.id]?.submitting ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )
                          }
                        >
                          {documentActionLoading[doc.id]?.submitting ? 'Sending…' : 'Send for Approval'}
                        </GhostButton>
                      )}
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

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      {showCreateModal && (
        <TicketFormModal
          key={editingTicket?.id ?? 'new'}
          initialData={editingTicket}
          onClose={handleCloseCreate}
          onSubmit={(data) => {
            if (editingTicket) {
              handleUpdateSubmit(editingTicket.id, data);
            } else {
              handleCreateSubmit(data as CreateTicketRequest);
            }
          }}
          isSubmitting={actionsLoading.submitting || status === 'loading'}
        />
      )}

      {/* ── Ticket Approval Modal ──────────────────────────────────────────── */}
      {showApprovalModal && approvalTicketId && (
        <TicketApprovalModal
          ticketId={approvalTicketId}
          onClose={handleCloseApprovalModal}
          onRefresh={() => {
            dispatch(fetchTickets(filters));
          }}
          userRole={userRole}
        />
      )}

      {/* ── Document Viewer Modal ──────────────────────────────────────────── */}
      {showDocViewer && selectedDocForView && (
        <DocumentViewerModal
          document={selectedDocForView}
          onClose={handleCloseDocViewer}
        />
      )}
    </div>
  );
};

export default SuperAdminTickets;