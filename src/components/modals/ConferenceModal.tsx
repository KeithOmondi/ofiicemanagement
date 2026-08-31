// src/features/conference/components/ConferenceModal.tsx

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createConference,
  updateConference,
  fetchConferences,
} from '../../store/slices/conferenceSlice';
import {
  uploadHelpdeskDocument,
  linkHelpdeskDocument,
  submitForApproval,
  selectAllHelpdeskDocuments,
  selectDocumentsUploading,
  selectDocumentActionLoading,
  selectDocumentLinking,
  selectUnlinkedHelpdeskDocuments,
  type DocumentFormat,
  type DocumentStatus,
  type DocumentEntityType,
  fetchHelpdeskDocuments,
} from '../../store/slices/helpdeskDocumentsSlice';
import {
  generateConferenceMemoPdf,
  buildConferenceMemoParams,
  type ConferenceMemoParams,
} from '../../utils/generateConferenceMemoPdf';
import toast from 'react-hot-toast';
import {
  X,
  Loader2,
  FileText,
  Paperclip,
  Upload,
  ExternalLink,
  Send,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Save,
  Download,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  Copy,
  Image,
} from 'lucide-react';
import { generateConferenceDocx } from '../../utils/generateConferenceDocx';
import {
  selectCurrentUser,
  selectUsersSignatureLoading,
  uploadSignature,
  deleteSignature,
} from '../../store/slices/userSlice';

// ─── Constants ────────────────────────────────────────────────────────────────

const CREST_URL = 'https://res.cloudinary.com/do0yflasl/image/upload/v1784363826/ORHC_L_crclut.jpg';
const FOOTER_EMBLEM_URL = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConferenceEntry {
  id: string;
  particulars: string;
  start_date: string;
  end_date: string;
  pax: number;
}

interface ConferenceFormData {
  entries: ConferenceEntry[];
}

interface MemoDraft {
  ref: string;
  date: string;
  to: string;
  fromDepartment: string;
  caseReference: string;
  bodyText: string;
  conferenceDetailsText: string;
  closingText: string;
  fromName: string;
  fromTitle: string;
  ccList: string[];
}

interface ValidationError {
  field: string;
  message: string;
}

interface ConferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId?: string | null;
  initialData?: Partial<ConferenceFormData> | null;
  onSuccess?: () => void;
}

type DownloadFormat = 'pdf' | 'docx';

// ─── UI Components ───────────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] transition-colors';

const labelClasses = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500';

const docFieldClasses =
  'bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none';

const GhostButton: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ children, icon, onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {icon}
    {children}
  </button>
);

const GoldButton: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'default';
}> = ({ children, icon, type = 'button', disabled, onClick, variant = 'default', size = 'default' }) => {
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
};

const StatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  const map: Record<DocumentStatus, string> = {
    draft: 'bg-stone-100 text-stone-600 ring-stone-200',
    pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
    ready_to_send: 'bg-blue-50 text-blue-700 ring-blue-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
    returned: 'bg-orange-50 text-orange-700 ring-orange-200',
  };
  const labels: Record<DocumentStatus, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    ready_to_send: 'Ready to Send',
    approved: 'Approved',
    rejected: 'Rejected',
    returned: 'Returned',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${map[status]}`}>
      {labels[status]}
    </span>
  );
};

const Spinner: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <Loader2 className={`animate-spin ${className}`} />
);

// ─── Document helpers ──────────────────────────────────────────────────────

const documentFormatIcon = (format: DocumentFormat) => {
  if (format === 'xlsx') return <FileSpreadsheet size={16} className="text-emerald-600" />;
  if (format === 'docx') return <FileText size={16} className="text-blue-600" />;
  return <FileText size={16} className="text-red-600" />;
};

const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleString('en', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

/** Triggers an actual browser file download for a Blob. */
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createEmptyEntry(): ConferenceEntry {
  return {
    id: generateId(),
    particulars: '',
    start_date: '',
    end_date: '',
    pax: 1,
  };
}

// ─── EMPTY_FORM ──────────────────────────────────────────────────────────────

const EMPTY_FORM: ConferenceFormData = {
  entries: [createEmptyEntry()],
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function draftFromParams(params: ConferenceMemoParams): MemoDraft {
  return {
    ref: params.ref,
    date: params.date,
    to: params.to,
    fromDepartment: params.fromDepartment || 'HIGH COURT SUPPORT OFFICE - ORHC',
    caseReference: params.caseReference,
    bodyText: params.bodyText,
    conferenceDetailsText: params.conferenceDetailsText || '',
    closingText:
      params.closingText ||
      'In view of the foregoing, kindly approve the procurement of conference facilities for the retreat at the above-mentioned venue, in accordance with the schedule set out below.',
    fromName: params.fromName || '',
    fromTitle: params.fromTitle || 'HIGH COURT SUPPORT OFFICE-ORHC',
    ccList: params.ccList && params.ccList.length > 0 ? params.ccList : [''],
  };
}

function buildMemoParamsFromDraft(
  draft: MemoDraft,
  crestUrl: string,
  formData: ConferenceFormData,
  signatureUrl?: string
): ConferenceMemoParams {
  const totalPax = formData.entries.reduce((sum, e) => sum + e.pax, 0);

  return {
    ref: draft.ref,
    date: draft.date,
    to: draft.to,
    caseReference: draft.caseReference,
    conferenceDescription: 'Conference facilities request',
    bodyText: draft.bodyText,
    conferenceDetailsText: draft.conferenceDetailsText || '',
    closingText: draft.closingText,
    conferenceType: 'retreat',
    retreatStartDate: formData.entries[0]?.start_date || '',
    retreatEndDate: formData.entries[0]?.end_date || '',
    facilityStartDate: formData.entries[0]?.start_date || '',
    facilityEndDate: formData.entries[0]?.end_date || '',
    numberOfPax: totalPax,
    venue: 'Conference Venue',
    location: 'Conference Location',
    budgetEstimate: undefined,
    judgeNames: [],
    supportingStaff: 0,
    driversAndGuardsCount: 0,
    secretariatPax: 2,
    fromDepartment: draft.fromDepartment || 'HIGH COURT SUPPORT OFFICE - ORHC',
    fromName: draft.fromName || '',
    fromTitle: draft.fromTitle || 'HIGH COURT SUPPORT OFFICE-ORHC',
    ccList: draft.ccList.filter((cc) => cc.trim()),
    crestUrl,
    footerEmblemUrl: FOOTER_EMBLEM_URL,
    signatureUrl,
    entries: formData.entries.map((e) => ({
      particulars: e.particulars,
      start_date: e.start_date,
      end_date: e.end_date,
      pax: e.pax,
    })),
  };
}

// ─── Signature Section ──────────────────────────────────────────────────────

interface SignatureSectionProps {
  userSignature: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isLoading: boolean;
}

const SignatureSection: React.FC<SignatureSectionProps> = ({
  userSignature,
  onUpload,
  onRemove,
  isLoading,
}) => {
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
};

// ─── Main Conference Modal ────────────────────────────────────────────────────

export const ConferenceModal: React.FC<ConferenceModalProps> = ({
  isOpen,
  onClose,
  editingId,
  initialData,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const isEditing = !!editingId;
  const mutating = useAppSelector((state) => state.conference.loading.mutating);
  const currentUser = useAppSelector(selectCurrentUser);
  const signatureLoading = useAppSelector(selectUsersSignatureLoading);

  const allDocs = useAppSelector(selectAllHelpdeskDocuments);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);

  // ─── Helper to convert null → undefined for signature ──────────────────────
  const getSignatureUrl = (): string | undefined => {
    return currentUser?.signature_url ?? undefined;
  };

  // ─── State ──────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<ConferenceFormData>(() => ({
    ...EMPTY_FORM,
    ...(initialData || {}),
    entries: initialData?.entries?.length ? initialData.entries : [createEmptyEntry()],
  }));

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [memoDraft, setMemoDraft] = useState<MemoDraft | null>(null);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | undefined>();
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<DownloadFormat | null>(null);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevIsOpenRef = useRef(isOpen);

  const docs = useMemo(
    () => allDocs.filter((d) => d.entity_type === 'conference' && d.entity_id === editingId),
    [allDocs, editingId]
  );

  // ─── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && editingId) {
      dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: editingId }));
    }
  }, [dispatch, isOpen, editingId]);

  // ─── Reset form when modal closes ──────────────────────────────────────────
  useEffect(() => {
    if (prevIsOpenRef.current === true && isOpen === false) {
      setCurrentStep(1);
      setMemoDraft(null);
      setPendingDocumentId(undefined);
      setShowLinkPicker(false);
      setShowDownloadMenu(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // ─── Signature Handlers ─────────────────────────────────────────────────────

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

  // ─── Entry Handlers ─────────────────────────────────────────────────────────

  const addEntry = () => {
    setFormData((prev) => ({
      ...prev,
      entries: [...prev.entries, createEmptyEntry()],
    }));
  };

  const removeEntry = (index: number) => {
    if (formData.entries.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }));
  };

  const duplicateEntry = (index: number) => {
    const entry = formData.entries[index];
    setFormData((prev) => ({
      ...prev,
      entries: [
        ...prev.entries.slice(0, index + 1),
        { ...entry, id: generateId() },
        ...prev.entries.slice(index + 1),
      ],
    }));
  };

  const updateEntry = (
    index: number,
    field: keyof ConferenceEntry,
    value: string | number
  ) => {
    setFormData((prev) => {
      const updated = [...prev.entries];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, entries: updated };
    });
  };

  // ─── Memo draft editing helpers ─────────────────────────────────────────────

  const updateDraft = <K extends keyof MemoDraft>(field: K, value: MemoDraft[K]) => {
    setMemoDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateCcLine = (index: number, value: string) => {
    setMemoDraft((prev) => {
      if (!prev) return prev;
      const ccList = [...prev.ccList];
      ccList[index] = value;
      return { ...prev, ccList };
    });
  };

  const addCcLine = () => {
    setMemoDraft((prev) => (prev ? { ...prev, ccList: [...prev.ccList, ''] } : prev));
  };

  const removeCcLine = (index: number) => {
    setMemoDraft((prev) => {
      if (!prev) return prev;
      const ccList = prev.ccList.filter((_, i) => i !== index);
      return { ...prev, ccList: ccList.length > 0 ? ccList : [''] };
    });
  };

  // ─── Validation ──────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    if (formData.entries.length === 0) {
      toast.error('Please add at least one conference entry');
      return false;
    }

    const invalidEntries = formData.entries.filter(
      (e) => !e.particulars.trim() || !e.start_date || !e.end_date || e.pax < 1
    );

    if (invalidEntries.length > 0) {
      toast.error(`Please fill in all fields for all entries (${invalidEntries.length} incomplete)`);
      return false;
    }

    for (const entry of formData.entries) {
      if (entry.start_date && entry.end_date) {
        const start = new Date(entry.start_date);
        const end = new Date(entry.end_date);
        if (start > end) {
          toast.error('Start date must be before or equal to end date');
          return false;
        }
      }
    }

    return true;
  };

  // ─── Step Navigation ────────────────────────────────────────────────────────
// ─── Step Navigation ────────────────────────────────────────────────────────

const handleNextStep = () => {
  if (!validateForm()) return;

  if (!memoDraft) {
    // Get the logged-in user's full name
    const userFullName = currentUser?.full_name || '';
    // Always use "HIGH COURT SUPPORT OFFICE-ORHC" as the title
    const fromTitle = 'HIGH COURT SUPPORT OFFICE-ORHC';

    const firstEntry = formData.entries[0];
    const totalPax = formData.entries.reduce((sum, e) => sum + e.pax, 0);

    const seedParams = buildConferenceMemoParams({
      refNumber: `RHC/CONF/${Date.now().toString().slice(-6)}`,
      requestDate: new Date().toISOString().split('T')[0],
      caseReference: formData.entries.map(e => e.particulars).join(', ').substring(0, 100),
      conferenceDescription: `Conference facilities request (${formData.entries.length} items)`,
      conferenceType: 'retreat',
      retreatStartDate: firstEntry?.start_date || '',
      retreatEndDate: firstEntry?.end_date || '',
      facilityStartDate: firstEntry?.start_date || '',
      facilityEndDate: firstEntry?.end_date || '',
      numberOfPax: totalPax,
      venue: 'Conference Venue',
      location: 'Conference Location',
      budgetEstimate: undefined,
      fromDepartment: 'HIGH COURT SUPPORT OFFICE - ORHC',
      additionalNotes: undefined,
      judgeNames: [],
      supportingStaff: 0,
      driversAndGuardsCount: 0,
      secretariatPax: 2,
      crestUrl: CREST_URL,
      fromName: userFullName,  // ← This will be the logged-in user's name
      fromTitle: fromTitle,    // ← Always "HIGH COURT SUPPORT OFFICE-ORHC"
      ccList: [],
      signatureUrl: getSignatureUrl(),
    });
    setMemoDraft(draftFromParams(seedParams));
  }

  setCurrentStep(2);
};

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  // ─── Document Handlers ──────────────────────────────────────────────────────

  const handleAttachDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!editingId) {
      toast.error('Please save the conference request first before attaching documents.');
      e.target.value = '';
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const format: DocumentFormat | null =
      ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : ext === 'xlsx' ? 'xlsx' : null;
    if (!format) {
      toast.error('Please upload a PDF, Word (.docx), or Excel (.xlsx) file.');
      e.target.value = '';
      return;
    }

    try {
      await dispatch(
        uploadHelpdeskDocument({
          blob: file,
          filename: file.name,
          ref: `CONF/${editingId.slice(0, 8)}`,
          subject: `Conference Request ${editingId.slice(0, 8)}`,
          entity_type: 'conference' as DocumentEntityType,
          entity_id: editingId,
          format,
        })
      ).unwrap();
      toast.success('Document attached successfully.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: editingId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to attach document.');
    } finally {
      e.target.value = '';
    }
  };

  const handleLinkExisting = async (docId: string) => {
    if (!editingId) {
      toast.error('Please save the record first before linking documents.');
      return;
    }
    try {
      await dispatch(
        linkHelpdeskDocument({ id: docId, entity_type: 'conference' as DocumentEntityType, entity_id: editingId })
      ).unwrap();
      toast.success('Document linked successfully.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: editingId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  };

  const handleSendForApproval = async (docId: string) => {
    try {
      await dispatch(submitForApproval({ id: docId })).unwrap();
      toast.success('Document sent for approval.');
      if (editingId) {
        dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: editingId }));
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit for approval.');
    }
  };

  // ─── Generate Memo ──────────────────────────────────────────────────────────

  const handleGenerateAndSaveMemo = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    if (!memoDraft) {
      toast.error('Memo draft not initialized');
      return;
    }

    if (!validateForm()) return;

    setGeneratingFormat(format);
    setIsSavingMemo(true);

    try {
      const memoParams = buildMemoParamsFromDraft(
        memoDraft,
        CREST_URL,
        formData,
        getSignatureUrl()
      );

      let blob: Blob | null = null;

      if (format === 'pdf') {
        blob = await generateConferenceMemoPdf(memoParams);
      } else if (format === 'docx') {
        blob = await generateConferenceDocx(memoParams);
      }

      if (!blob) {
        throw new Error('Failed to generate memo - no blob returned');
      }

      const filename = `${memoDraft.ref || 'conference-memo'}.${format}`;

      triggerBrowserDownload(blob, filename);

      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      const subject = `CONFERENCE REQUEST -- ${memoDraft.caseReference}`;

      const uploadPayload: {
        blob: File;
        filename: string;
        ref: string;
        subject: string;
        format: DocumentFormat;
        entity_type: DocumentEntityType;
        entity_id?: string;
      } = {
        blob: file,
        filename,
        ref: memoDraft.ref,
        subject,
        format: format as DocumentFormat,
        entity_type: 'conference' as DocumentEntityType,
      };

      if (editingId) {
        uploadPayload.entity_id = editingId;
      }

      const result = await dispatch(uploadHelpdeskDocument(uploadPayload)).unwrap();
      setPendingDocumentId(result.id);

      if (editingId) {
        dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: editingId }));
      }

      toast.success(`${format.toUpperCase()} memo downloaded and saved to the system.`);

    } catch (err) {
      console.error(`Failed to generate ${format} memo:`, err);
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to generate document.';
      toast.error(message);
    } finally {
      setGeneratingFormat(null);
      setIsSavingMemo(false);
    }
  };

  // ─── Handle Create/Update ──────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateForm()) {
      setCurrentStep(1);
      return;
    }

    setIsSaving(true);

    try {
      const particulars = formData.entries
        .map(e => `${e.particulars.trim()} (${formatDateDisplay(e.start_date)} - ${formatDateDisplay(e.end_date)})`)
        .join(' | ');

      const firstEntry = formData.entries[0];
      const totalPax = formData.entries.reduce((sum, e) => sum + e.pax, 0);

      const payload = {
        particulars,
        start_date: firstEntry.start_date,
        end_date: firstEntry.end_date,
        number_of_pax: totalPax,
      };

      let createdId: string | undefined;

      if (editingId) {
        await dispatch(updateConference({ id: editingId, data: payload })).unwrap();
        toast.success('Conference request updated successfully');
        createdId = editingId;
      } else {
        const result = await dispatch(createConference(payload)).unwrap();
        toast.success('Conference request created successfully');
        createdId = result.id;

        if (pendingDocumentId && createdId) {
          try {
            await dispatch(
              linkHelpdeskDocument({
                id: pendingDocumentId,
                entity_type: 'conference' as DocumentEntityType,
                entity_id: createdId,
              })
            ).unwrap();
            toast.success('Memo linked to the record.');
            setPendingDocumentId(undefined);
            dispatch(fetchHelpdeskDocuments({ entity_type: 'conference', entity_id: createdId }));
          } catch {
            toast.error('Record created, but failed to link the memo. You can attach it manually later.');
          }
        }
      }

      dispatch(fetchConferences({}));

      onSuccess?.();
      onClose();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string; error?: string; details?: ValidationError[] } }; message?: string };
      if (error.response?.data?.details) {
        const errorMessages = error.response.data.details
          .map((e: ValidationError) => `• ${e.field.replace('body.', '').replace(/_/g, ' ')}: ${e.message}`)
          .join('\n');
        toast.error(<div className="whitespace-pre-line"><strong>Validation failed:</strong>{'\n' + errorMessages}</div>, { duration: 8000 });
      } else {
        toast.error(error.response?.data?.message || error.response?.data?.error || error.message || 'Operation failed');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Test PDF Generation ──────────────────────────────────────────────────

  const handleTestPdf = async () => {
    setIsGeneratingTest(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstEntry = formData.entries[0] || { start_date: today, end_date: today };
      const totalPax = formData.entries.reduce((sum, e) => sum + e.pax, 0);

      const testParams: ConferenceMemoParams = {
        ref: 'TEST/001',
        date: today,
        to: 'TEST RECIPIENT',
        caseReference: 'TEST MEMO - CONFERENCE REQUEST',
        conferenceDescription: 'Test conference description',
        bodyText: 'This is a test memo generated from the conference modal.',
        conferenceDetailsText: formData.entries.map(e => `• ${e.particulars}`).join('\n'),
        closingText: 'Kindly approve the test conference.',
        conferenceType: 'retreat',
        retreatStartDate: firstEntry.start_date || today,
        retreatEndDate: firstEntry.end_date || today,
        facilityStartDate: firstEntry.start_date || today,
        facilityEndDate: firstEntry.end_date || today,
        numberOfPax: totalPax || 10,
        venue: 'Test Venue',
        location: 'Test Location',
        crestUrl: CREST_URL,
        fromDepartment: 'HIGH COURT SUPPORT OFFICE - ORHC',
        fromName: currentUser?.full_name || 'REGISTRAR HIGH COURT',
        fromTitle: 'HIGH COURT SUPPORT OFFICE-ORHC',
        ccList: [],
        budgetEstimate: undefined,
        judgeNames: [],
        supportingStaff: 0,
        driversAndGuardsCount: 0,
        secretariatPax: 2,
        footerEmblemUrl: FOOTER_EMBLEM_URL,
        signatureUrl: getSignatureUrl(),
        entries: formData.entries.map((e) => ({
          particulars: e.particulars,
          start_date: e.start_date,
          end_date: e.end_date,
          pax: e.pax,
        })),
      };

      const blob = await generateConferenceMemoPdf(testParams);

      if (!blob) {
        throw new Error('Test PDF generation returned no blob');
      }

      triggerBrowserDownload(blob, 'test-memo.pdf');

      toast.success('Test PDF generated successfully!');
    } catch (err) {
      console.error('Test PDF generation failed:', err);
      toast.error(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Generating Word…',
    pdf: 'Generating PDF…',
  };

  const canGenerateMemo = !!memoDraft && !generatingFormat && !isSavingMemo;
  const totalPax = formData.entries.reduce((sum, e) => sum + e.pax, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-[#1a3d1c]">
            {isEditing ? 'Edit Conference Request' : 'New Conference Request'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestPdf}
              disabled={isGeneratingTest}
              className="text-xs text-stone-400 hover:text-stone-600"
              title="Test PDF Generation"
            >
              {isGeneratingTest ? <Spinner className="h-3.5 w-3.5" /> : <Check size={14} />}
            </button>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="shrink-0 border-b border-stone-100 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 1 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                1
              </div>
              <span className="text-xs font-medium">Conference Entries</span>
            </div>
            <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-[#c9a84c]' : 'bg-stone-200'}`} />
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 2 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                2
              </div>
              <span className="text-xs font-medium">Memo &amp; Documents</span>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className={labelClasses}>Conference Entries</label>
                  <p className="text-xs text-stone-400">
                    {formData.entries.length} item{formData.entries.length > 1 ? 's' : ''} · Total PAX: {totalPax}
                  </p>
                </div>
                <GoldButton
                  size="sm"
                  onClick={addEntry}
                  icon={<Plus size={14} />}
                >
                  Add Entry
                </GoldButton>
              </div>

              <div className="space-y-3">
                {formData.entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-stone-300"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-xs font-medium text-stone-500">
                        Entry #{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateEntry(index)}
                          className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(index)}
                          disabled={formData.entries.length <= 1}
                          className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                          Particulars *
                        </label>
                        <input
                          type="text"
                          value={entry.particulars}
                          onChange={(e) => updateEntry(index, 'particulars', e.target.value)}
                          placeholder="e.g., Full day conference facilities"
                          className={inputClasses}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                            Start Date *
                          </label>
                          <input
                            type="date"
                            value={entry.start_date}
                            onChange={(e) => updateEntry(index, 'start_date', e.target.value)}
                            className={inputClasses}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                            End Date *
                          </label>
                          <input
                            type="date"
                            value={entry.end_date}
                            onChange={(e) => updateEntry(index, 'end_date', e.target.value)}
                            className={inputClasses}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                          PAX *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={entry.pax || ''}
                          onChange={(e) => updateEntry(index, 'pax', parseInt(e.target.value) || 1)}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formData.entries.length === 0 && (
                <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-center">
                  <p className="text-sm text-stone-400">No entries added. Click "Add Entry" to begin.</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && memoDraft && (
            <div className="space-y-4">
              {/* Signature Section */}
              <SignatureSection
                userSignature={currentUser?.signature_url || null}
                onUpload={handleSignatureUpload}
                onRemove={handleSignatureRemove}
                isLoading={signatureLoading}
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-400">
                  Edit any field directly in the letter below — it's exactly what gets saved.
                </p>
                <div className="relative">
                  <GoldButton
                    size="sm"
                    onClick={() => setShowDownloadMenu((v) => !v)}
                    disabled={!canGenerateMemo}
                    icon={generatingFormat ? <Spinner className="h-3.5 w-3.5" /> : <Download size={14} />}
                  >
                    {generatingFormat ? downloadLabels[generatingFormat] : 'Generate Memo'}
                    {!generatingFormat && <ChevronDown size={12} />}
                  </GoldButton>
                  {showDownloadMenu && (
                    <>
                      <div className="fixed inset-0 z-0" onClick={() => setShowDownloadMenu(false)} />
                      <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                        <button
                          onClick={() => handleGenerateAndSaveMemo('pdf')}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                        >
                          <FileText size={14} className="text-red-600" />
                          PDF (.pdf)
                        </button>
                        <button
                          onClick={() => handleGenerateAndSaveMemo('docx')}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                        >
                          <FileText size={14} className="text-blue-600" />
                          Word (.docx)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Live editable letter preview */}
              <div className="rounded-lg border border-stone-300 bg-white p-8 shadow-sm font-serif text-black text-[13px] leading-relaxed">
                {/* Crest */}
                <div className="flex justify-center mb-2">
                  <img
                    src={CREST_URL}
                    alt="Crest"
                    className="h-16 w-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>

                {/* Title */}
                <p className="text-center text-base font-bold tracking-wide">
                  OFFICE OF THE REGISTRAR HIGH COURT
                </p>
                <p className="text-center text-base font-bold tracking-wide mb-4">
                  INTERNAL MEMO
                </p>
                <hr className="border-t border-black mb-4" />

                {/* Header Fields */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 font-bold">
                    <span className="w-12 shrink-0">FROM :</span>
                    <input
                      value={memoDraft.fromDepartment}
                      onChange={(e) => updateDraft('fromDepartment', e.target.value)}
                      className={`${docFieldClasses} flex-1 uppercase`}
                    />
                  </div>

                  <div className="flex items-center gap-1 font-bold">
                    <span className="w-12 shrink-0">TO :</span>
                    <input
                      value={memoDraft.to}
                      onChange={(e) => updateDraft('to', e.target.value)}
                      className={`${docFieldClasses} flex-1 uppercase`}
                    />
                  </div>

                  <div className="flex items-center gap-1 font-bold">
                    <span className="w-12 shrink-0">REF :</span>
                    <input
                      value={memoDraft.ref}
                      onChange={(e) => updateDraft('ref', e.target.value)}
                      className={`${docFieldClasses} flex-1`}
                    />
                  </div>

                  <div className="flex items-center gap-1 font-bold">
                    <span className="w-12 shrink-0">DATE :</span>
                    <input
                      type="date"
                      value={memoDraft.date}
                      onChange={(e) => updateDraft('date', e.target.value)}
                      className={docFieldClasses}
                    />
                  </div>

                  <div className="flex items-start gap-1 font-bold">
                    <span className="w-12 shrink-0 pt-0.5">SUBJECT :</span>
                    <div className="flex-1">
                      <span className="mr-1 font-bold">
                        CONFERENCE REQUEST --
                      </span>
                      <input
                        value={memoDraft.caseReference}
                        onChange={(e) => updateDraft('caseReference', e.target.value)}
                        className={`${docFieldClasses} uppercase`}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-t border-black my-4" />

                {/* Body */}
                <div className="space-y-3">
                  <textarea
                    value={memoDraft.bodyText}
                    onChange={(e) => updateDraft('bodyText', e.target.value)}
                    rows={3}
                    className={`${docFieldClasses} block w-full resize-none text-justify`}
                  />

                  <textarea
                    value={memoDraft.conferenceDetailsText}
                    onChange={(e) => updateDraft('conferenceDetailsText', e.target.value)}
                    rows={3}
                    className={`${docFieldClasses} block w-full resize-none text-justify`}
                  />
                </div>

                {/* ─── CLOSING PARAGRAPH (MOVED ABOVE TABLE) ─── */}
                <div className="mb-4">
                  <textarea
                    value={memoDraft.closingText}
                    onChange={(e) => updateDraft('closingText', e.target.value)}
                    rows={2}
                    className={`${docFieldClasses} block w-full resize-none text-justify`}
                  />
                </div>

                {/* Table */}
                <div className="my-4">
                  <p className="text-[11px] italic text-stone-400 mb-2">
                    Conference details:
                  </p>
                  <div className="border border-stone-300 rounded overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-[#c9a84c] text-[#1a3d1c]">
                        <tr>
                          <th className="border border-stone-300 px-3 py-1.5 text-left font-bold">S/No</th>
                          <th className="border border-stone-300 px-3 py-1.5 text-left font-bold">Particulars</th>
                          <th className="border border-stone-300 px-3 py-1.5 text-left font-bold">Dates</th>
                          <th className="border border-stone-300 px-3 py-1.5 text-left font-bold">PAX</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.entries.map((entry, index) => (
                          <tr key={entry.id} className="odd:bg-white even:bg-[#faf9f6]">
                            <td className="border border-stone-300 px-3 py-1.5 text-center">{index + 1}</td>
                            <td className="border border-stone-300 px-3 py-1.5">{entry.particulars}</td>
                            <td className="border border-stone-300 px-3 py-1.5">
                              {formatDateDisplay(entry.start_date)} to {formatDateDisplay(entry.end_date)}
                            </td>
                            <td className="border border-stone-300 px-3 py-1.5 text-center">{entry.pax}</td>
                          </tr>
                        ))}
                        {formData.entries.length > 1 && (
                          <tfoot>
                            <tr className="bg-stone-100 font-bold">
                              <td colSpan={3} className="border border-stone-300 px-3 py-1.5 text-right">TOTAL</td>
                              <td className="border border-stone-300 px-3 py-1.5 text-center">{totalPax}</td>
                            </tr>
                          </tfoot>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signature Block */}
                <div className="mt-8">
                  {/* Show signature image if available */}
                  {currentUser?.signature_url && (
                    <div className="mb-4">
                      <img
                        src={currentUser.signature_url}
                        alt="Signature"
                        className="max-h-16 w-auto object-contain"
                      />
                    </div>
                  )}
                  <div className="h-8" />
                  <input
                    value={memoDraft.fromName}
                    onChange={(e) => updateDraft('fromName', e.target.value)}
                    className={`${docFieldClasses} block w-full font-bold mb-0.5`}
                    placeholder="Signatory name"
                  />
                  <input
                    value={memoDraft.fromTitle}
                    onChange={(e) => updateDraft('fromTitle', e.target.value)}
                    className={`${docFieldClasses} block w-full text-sm underline`}
                    placeholder="Designation/Title"
                  />
                </div>

                {/* Copy to */}
                <div className="mt-6 pt-4 border-t border-stone-200">
                  <p className="font-bold mb-1 text-sm">Copy to:</p>
                  <div className="space-y-1">
                    {memoDraft.ccList.map((cc, i) => (
                      <div key={i} className="flex items-center gap-1 text-sm">
                        <span className="w-6 shrink-0">{i + 1}.</span>
                        <input
                          value={cc}
                          onChange={(e) => updateCcLine(i, e.target.value)}
                          className={`${docFieldClasses} flex-1`}
                          placeholder="Add recipient..."
                        />
                        <button
                          type="button"
                          onClick={() => removeCcLine(i)}
                          className="text-stone-300 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addCcLine}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-[#1a3d1c]"
                    >
                      <Plus size={12} /> Add copy line
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-[#c9a84c] flex items-center justify-between gap-4">
                  <img
                    src={FOOTER_EMBLEM_URL}
                    alt=""
                    className="h-10 w-auto object-contain shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="text-[10px] leading-tight text-stone-600 text-right">
                    <p className="font-bold text-[#1a3d1c]">Social Transformation through Access to Justice</p>
                    <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
                    <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
                    <p className="font-bold text-[#1a3d1c]">Justice Be Our Shield and Defender</p>
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="rounded-lg border border-stone-200 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                    <FileText size={16} className="text-[#c9a84c]" />
                    Documents ({docs.length})
                  </h4>
                  <div className="flex gap-2">
                    <GhostButton
                      onClick={() => setShowLinkPicker((v) => !v)}
                      icon={<Paperclip size={14} />}
                      disabled={!editingId}
                    >
                      Link Existing
                    </GhostButton>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.xlsx"
                      onChange={handleAttachDocument}
                      className="hidden"
                      disabled={documentsUploading || !editingId}
                    />
                    <GhostButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={documentsUploading || !editingId}
                      icon={documentsUploading ? <Spinner className="h-3.5 w-3.5" /> : <Upload size={14} />}
                    >
                      {documentsUploading ? 'Uploading…' : 'Attach'}
                    </GhostButton>
                  </div>
                </div>

                {!editingId && pendingDocumentId ? (
                  <p className="mt-2 text-[11px] text-amber-600">
                    ⚡ Memo generated! It will be linked automatically when you save this record.
                  </p>
                ) : !editingId && (
                  <p className="mt-2 text-[11px] text-stone-400 italic">
                    Generate a memo above, then save the record to link it automatically.
                  </p>
                )}

                {showLinkPicker && (
                  <div className="mt-2 rounded-lg border border-stone-200 bg-white p-2 max-h-48 overflow-y-auto">
                    {unlinkedDocuments.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-stone-400 italic">No unlinked documents found.</p>
                    ) : (
                      <ul className="divide-y divide-stone-100">
                        {unlinkedDocuments.map((doc) => (
                          <li key={doc.id} className="flex items-center justify-between gap-2 px-2 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {documentFormatIcon(doc.format)}
                              <span className="truncate text-sm text-stone-700">{doc.subject}</span>
                              <span className="shrink-0 text-[11px] text-stone-400">{doc.ref}</span>
                            </div>
                            <GhostButton
                              onClick={() => handleLinkExisting(doc.id)}
                              disabled={isLinking || !editingId}
                              icon={isLinking ? <Spinner className="h-3.5 w-3.5" /> : undefined}
                            >
                              Attach
                            </GhostButton>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {docs.length === 0 ? (
                  <p className="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-400">
                    No documents attached yet.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200">
                    {docs.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          {documentFormatIcon(doc.format)}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-stone-800">{doc.subject}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <StatusBadge status={doc.status} />
                              <span className="text-[11px] text-stone-400">{doc.ref}</span>
                              <span className="text-[11px] text-stone-400 uppercase">{doc.format}</span>
                            </div>
                            {doc.status === 'rejected' && doc.rejection_reason && (
                              <p className="mt-1 text-[11px] text-red-600">Reason: {doc.rejection_reason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink size={12} />
                            View
                          </a>
                          {doc.status === 'draft' && (
                            <GhostButton
                              onClick={() => handleSendForApproval(doc.id)}
                              disabled={!!documentActionLoading[doc.id]?.submitting}
                              icon={
                                documentActionLoading[doc.id]?.submitting ? (
                                  <Spinner className="h-3.5 w-3.5" />
                                ) : (
                                  <Send size={12} />
                                )
                              }
                            >
                              {documentActionLoading[doc.id]?.submitting ? 'Sending…' : 'Send for Approval'}
                            </GhostButton>
                          )}
                          {doc.status === 'pending_approval' && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <Send size={12} />
                              Pending
                            </span>
                          )}
                          {doc.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <Check size={12} />
                              Approved
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-stone-100 px-6 py-4">
          <div className="flex justify-between">
            <div>
              {currentStep === 2 && (
                <GhostButton onClick={handlePrevStep} icon={<ArrowLeft size={14} />}>
                  Back
                </GhostButton>
              )}
            </div>
            <div className="flex gap-2">
              <GhostButton onClick={onClose}>Cancel</GhostButton>
              {currentStep === 1 ? (
                <GoldButton onClick={handleNextStep} icon={<ArrowRight size={14} />}>
                  Next
                </GoldButton>
              ) : (
                <GoldButton
                  onClick={handleSubmit}
                  disabled={mutating || isSaving}
                  icon={mutating || isSaving ? <Spinner className="h-4 w-4" /> : <Save size={14} />}
                >
                  {mutating || isSaving ? 'Saving...' : isEditing ? 'Update Request' : 'Create Request'}
                </GoldButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConferenceModal;