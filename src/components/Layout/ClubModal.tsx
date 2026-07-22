// src/components/modals/ClubModal.tsx

import React, { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createClubMembership,
  updateClubMembershipStatus,
  fetchClubMemberships,
  fetchHelpDeskStats,
  type ClubMembership,
  type CreateClubMembershipInput,
  type Status,
} from '../../store/slices/helpdeskSlice';
import {
  selectCurrentUser,
  selectUsersSignatureLoading,
  uploadSignature,
  deleteSignature,
} from '../../store/slices/userSlice';
import {
  fetchHelpdeskDocuments,
  uploadHelpdeskDocument,
  linkHelpdeskDocument,
  submitForApproval,
  selectAllHelpdeskDocuments,
  selectDocumentsUploading,
  selectDocumentActionLoading,
  selectUnlinkedHelpdeskDocuments,
  selectDocumentLinking,
  type DocumentFormat,
  type DocumentStatus,
  type DocumentEntityType,
} from '../../store/slices/helpdeskDocumentsSlice';
import {
  X,
  Loader2,
  Save,
  User,
  Building2,
  Hash,
  Calendar as CalendarIcon,
  CreditCard,
  FileSignature,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Image,
  Upload,
  Paperclip,
  ExternalLink,
  Send,
  Download,
  Trash2,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ─── Constants ──────────────────────────────────────────────────────────────

const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

const CLUB_ENTITY_TYPE: DocumentEntityType = 'club';

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]';

function GhostButton({
  children,
  icon,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
  size = 'default',
  variant = 'default',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'default';
  variant?: 'default' | 'danger' | 'success' | 'outline';
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

// ─── Document helpers ─────────────────────────────────────────────────────────

const documentStatusColor = (status: DocumentStatus): string => {
  const map: Record<DocumentStatus, string> = {
    draft: 'bg-stone-100 text-stone-600 ring-stone-200',
    pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
    returned: 'bg-orange-50 text-orange-700 ring-orange-200',
  };
  return map[status] || 'bg-stone-100 text-stone-600 ring-stone-200';
};

const documentFormatIcon = (format: DocumentFormat) => {
  if (format === 'xlsx') return <FileSpreadsheet size={16} className="text-emerald-600" />;
  if (format === 'docx') return <FileText size={16} className="text-blue-600" />;
  return <FileText size={16} className="text-red-600" />;
};

// ─── Signature Section ──────────────────────────────────────────────────────

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

// ─── Form helpers ─────────────────────────────────────────────────────────────

const emptyForm: CreateClubMembershipInput = {
  pj_no: '',
  judge_name: '',
  club_name: '',
  entry_fee: 0,
  annual_fee: 0,
  date_submitted_dass: '',
  court: '',
  payment_date: '',
  remarks: '',
};

const buildFormFromItem = (item: ClubMembership | null | undefined): CreateClubMembershipInput => {
  if (!item) return emptyForm;
  return {
    pj_no: item.pj_no || '',
    judge_name: item.judge_name,
    club_name: item.club_name,
    entry_fee: item.entry_fee || 0,
    annual_fee: item.annual_fee || 0,
    date_submitted_dass: item.date_submitted_dass || '',
    court: item.court || '',
    payment_date: item.payment_date || '',
    remarks: item.remarks || '',
  };
};

// ─── Step 1: Club Details Form ──────────────────────────────────────────────

interface ClubDetailsFormProps {
  form: CreateClubMembershipInput;
  onChange: (field: keyof CreateClubMembershipInput, value: string | number) => void;
}

const ClubDetailsForm: React.FC<ClubDetailsFormProps> = ({ form, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Club Membership Details</h4>
        </div>

        {/* PJ Number */}
        <div>
          <FieldLabel>PJ Number</FieldLabel>
          <div className="relative">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className={`${inputClasses} pl-9`}
              value={form.pj_no}
              onChange={(e) => onChange('pj_no', e.target.value)}
              placeholder="e.g. 14960"
            />
          </div>
        </div>

        {/* Judge Name */}
        <div>
          <FieldLabel required>Judge Name</FieldLabel>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className={`${inputClasses} pl-9`}
              value={form.judge_name}
              onChange={(e) => onChange('judge_name', e.target.value)}
              placeholder="e.g. Hon. Justice John Chigiti"
              required
            />
          </div>
        </div>

        {/* Club Name */}
        <div>
          <FieldLabel required>Club Name</FieldLabel>
          <div className="relative">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className={`${inputClasses} pl-9`}
              value={form.club_name}
              onChange={(e) => onChange('club_name', e.target.value)}
              placeholder="e.g. Royal Golf Club"
              required
            />
          </div>
        </div>

        {/* Entry Fee */}
        <div>
          <FieldLabel>Entry Fee (KES)</FieldLabel>
          <div className="relative">
            <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="number"
              min={0}
              step={0.01}
              className={`${inputClasses} pl-9`}
              value={form.entry_fee || ''}
              onChange={(e) => onChange('entry_fee', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Annual Fee */}
        <div>
          <FieldLabel>Annual Fee (KES)</FieldLabel>
          <div className="relative">
            <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="number"
              min={0}
              step={0.01}
              className={`${inputClasses} pl-9`}
              value={form.annual_fee || ''}
              onChange={(e) => onChange('annual_fee', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Date Submitted to DASS */}
        <div>
          <FieldLabel>Date Submitted to DASS</FieldLabel>
          <div className="relative">
            <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="date"
              className={`${inputClasses} pl-9`}
              value={form.date_submitted_dass}
              onChange={(e) => onChange('date_submitted_dass', e.target.value)}
            />
          </div>
        </div>

        {/* Court */}
        <div>
          <FieldLabel>Court</FieldLabel>
          <div className="relative">
            <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className={`${inputClasses} pl-9`}
              value={form.court}
              onChange={(e) => onChange('court', e.target.value)}
              placeholder="e.g. HIGH COURT, ELC"
            />
          </div>
        </div>

        {/* Payment Date */}
        <div>
          <FieldLabel>Payment Date</FieldLabel>
          <div className="relative">
            <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="date"
              className={`${inputClasses} pl-9`}
              value={form.payment_date}
              onChange={(e) => onChange('payment_date', e.target.value)}
            />
          </div>
        </div>

        {/* Remarks */}
        <div>
          <FieldLabel>Remarks</FieldLabel>
          <div className="relative">
            <FileSignature size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className={`${inputClasses} pl-9`}
              value={form.remarks}
              onChange={(e) => onChange('remarks', e.target.value)}
              placeholder="e.g. Club paid, Refunded to Judge"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step 2: Memo Preview ─────────────────────────────────────────────────────

// ─── Step 2: Memo Preview ─────────────────────────────────────────────────────

interface ClubMemoPreviewProps {
  form: CreateClubMembershipInput;
  onEdit: () => void;
  signatureUrl?: string | null;
  entityId?: string;
  onMemoGenerated?: (docId: string) => void;
}

type DownloadFormat = 'docx' | 'pdf' | 'xlsx';

const ClubMemoPreview: React.FC<ClubMemoPreviewProps> = ({
  form,
  //onEdit,
  signatureUrl,
  entityId,
  onMemoGenerated,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const signatureLoading = useAppSelector(selectUsersSignatureLoading);
  
  const allDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const documentsLoading = useAppSelector((state) => state.helpdeskDocuments.loading.fetch);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Memo editable fields
  const [toField, setToField] = useState('DEPUTY DIRECTOR - DASS');
  const [fromField, setFromField] = useState('REGISTRAR, HIGH COURT');
  const [refField] = useState(() => {
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RHC/CLUB/${random}`;
  });
  const [dateField, setDateField] = useState(() =>
    new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
  );
  const [subjectField, setSubjectField] = useState('CLUB MEMBERSHIP REQUEST');
  const [bodyText, setBodyText] = useState(
    `I hereby forward the club membership request for the judge listed below for processing and action.\n\nPlease note that this request has been submitted with the requisite supporting documentation for your review and approval.`
  );

  // ✅ Add state for signatory name so it can be edited
  const [signatoryName, setSignatoryName] = useState(() => currentUser?.full_name || '');

  useEffect(() => {
    if (entityId) {
      dispatch(fetchHelpdeskDocuments({ entity_type: CLUB_ENTITY_TYPE, entity_id: entityId }));
    }
  }, [dispatch, entityId]);

  useEffect(() => {
    if (showLinkPicker) {
      dispatch(fetchHelpdeskDocuments({ unlinked: true }));
    }
  }, [dispatch, showLinkPicker]);

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

  const handleAttachDocument = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!entityId) {
      toast.error('Save the club membership record first before attaching a document.');
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

    setUploadingDocument(true);
    try {
      await dispatch(
        uploadHelpdeskDocument({
          blob: file,
          filename: file.name,
          ref: refField,
          subject: subjectField,
          entity_type: CLUB_ENTITY_TYPE,
          entity_id: entityId,
          format,
        })
      ).unwrap();
      toast.success('Document attached to this memo.');
      dispatch(fetchHelpdeskDocuments({ entity_type: CLUB_ENTITY_TYPE, entity_id: entityId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to attach document.');
    } finally {
      setUploadingDocument(false);
      e.target.value = '';
    }
  };

  const handleLinkExisting = async (docId: string) => {
    if (!entityId) {
      toast.error('Save the club membership record first before linking a document.');
      return;
    }

    try {
      await dispatch(
        linkHelpdeskDocument({
          id: docId,
          entity_type: CLUB_ENTITY_TYPE,
          entity_id: entityId,
        })
      ).unwrap();
      toast.success('Document linked to this memo.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: CLUB_ENTITY_TYPE, entity_id: entityId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  };

  const handleSendDocumentForApproval = async (docId: string) => {
    try {
      await dispatch(submitForApproval({ id: docId })).unwrap();
      toast.success('Document sent for approval.');
      dispatch(fetchHelpdeskDocuments({ entity_type: CLUB_ENTITY_TYPE, entity_id: entityId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit document for approval.');
    }
  };

  const handleGenerateMemo = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);

    try {
      // Build memo data
      const memoData = {
        to: toField,
        from: fromField,
        ref: refField,
        date: dateField,
        subject: subjectField,
        bodyText,
        judge_name: form.judge_name,
        pj_no: form.pj_no,
        club_name: form.club_name,
        entry_fee: form.entry_fee,
        annual_fee: form.annual_fee,
        court: form.court,
        remarks: form.remarks,
        signatoryName,
        crestUrl: JUDICIARY_CREST_SRC,
        signatureUrl: signatureUrl || undefined,
      };

      console.log(`Generating ${format} memo:`, memoData);
      
      // Simulate file generation
      const blob = new Blob([JSON.stringify(memoData, null, 2)], { type: 'application/json' });
      const filename = `${refField}.${format}`;
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });

      const uploadPayload = {
        blob: file,
        filename,
        ref: refField,
        subject: subjectField,
        entity_type: CLUB_ENTITY_TYPE,
        entity_id: entityId,
        format: format as DocumentFormat,
      };

      const result = await dispatch(uploadHelpdeskDocument(uploadPayload)).unwrap();

      toast.success(`${format.toUpperCase()} memo saved to the system.`);

      if (entityId) {
        try {
          await dispatch(
            linkHelpdeskDocument({
              id: result.id,
              entity_type: CLUB_ENTITY_TYPE,
              entity_id: entityId,
            })
          ).unwrap();
          toast.success('Memo linked to the club membership record.');
        } catch (linkErr) {
          console.error('Failed to link memo:', linkErr);
          toast.error('Memo saved, but could not link it automatically.');
        }
      } else if (onMemoGenerated) {
        onMemoGenerated(result.id);
      }

      dispatch(fetchHelpdeskDocuments({ entity_type: CLUB_ENTITY_TYPE, entity_id: entityId }));
    } catch (err) {
      console.error('Failed to generate memo:', err);
      toast.error('Failed to generate memo. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Preparing Word…',
    pdf: 'Preparing PDF…',
    xlsx: 'Preparing Excel…',
  };

  const linkedDocuments = allDocuments.filter(
    (d) => d.entity_type === CLUB_ENTITY_TYPE && d.entity_id === entityId
  );

  const editableLineClasses =
    'flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none';

  return (
    <div className="space-y-4">
      {/* Signature Section */}
      <SignatureSection
        userSignature={currentUser?.signature_url || null}
        onUpload={handleSignatureUpload}
        onRemove={handleSignatureRemove}
        isLoading={signatureLoading}
      />

      {/* Memo Preview */}
      <div className="border border-stone-300 bg-white p-10 shadow-sm font-sans text-black">
        <div className="flex justify-center mb-3">
          <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-20 w-auto object-contain" />
        </div>

        <div className="text-center mb-6">
          <p className="text-lg font-bold uppercase leading-snug">OFFICE OF THE REGISTRAR HIGH COURT</p>
          <p className="text-lg font-bold uppercase leading-snug border-b-2 border-black inline-block pb-2 px-1">
            INTERNAL MEMO
          </p>
        </div>

        <div className="space-y-3 text-sm font-bold mb-8">
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
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={4}
            className={`${editableLineClasses} block w-full resize-none leading-relaxed`}
          />

          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Judge Name:</span>
                <p className="font-medium">{form.judge_name || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">PJ Number:</span>
                <p className="font-medium">{form.pj_no || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">Club:</span>
                <p className="font-medium">{form.club_name || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">Court:</span>
                <p className="font-medium">{form.court || '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">Entry Fee:</span>
                <p className="font-medium">{form.entry_fee ? `KES ${form.entry_fee.toLocaleString()}` : '—'}</p>
              </div>
              <div>
                <span className="text-stone-500">Annual Fee:</span>
                <p className="font-medium">{form.annual_fee ? `KES ${form.annual_fee.toLocaleString()}` : '—'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-stone-500">Remarks:</span>
                <p className="font-medium">{form.remarks || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 space-y-1">
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

      {/* Document Section */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-800">Supporting Documents</h3>
          <div className="flex gap-2">
            <GhostButton
              onClick={() => setShowLinkPicker((v) => !v)}
              icon={<Paperclip size={14} />}
              disabled={!entityId}
            >
              Link Existing
            </GhostButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx"
              onChange={handleAttachDocument}
              className="hidden"
              disabled={documentsUploading || uploadingDocument || !entityId}
            />
            <GhostButton
              onClick={() => fileInputRef.current?.click()}
              disabled={documentsUploading || uploadingDocument || !entityId}
              icon={documentsUploading || uploadingDocument ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            >
              {documentsUploading || uploadingDocument ? 'Uploading…' : 'Attach Document'}
            </GhostButton>
          </div>
        </div>

        {!entityId && (
          <p className="mt-2 text-[11px] text-stone-400 italic">
            Attaching and linking documents will be available once this club membership record has been saved.
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

        {documentsLoading && linkedDocuments.length === 0 ? (
          <p className="mt-2 text-xs text-stone-400 italic">Checking for attached documents…</p>
        ) : linkedDocuments.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-400">
            No documents attached yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200">
            {linkedDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  {documentFormatIcon(doc.format)}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-800">{doc.subject}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${documentStatusColor(doc.status)}`}
                      >
                        {doc.status.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-stone-400">{doc.ref}</span>
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Download Memo Button */}
      <div className="flex justify-end">
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            disabled={downloadingFormat !== null}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] hover:bg-[#b8973f] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingFormat ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {downloadLabels[downloadingFormat]}
              </>
            ) : (
              <>
                <Download size={16} />
                Save Memo
                <ChevronDown size={16} />
              </>
            )}
          </button>

          {showDownloadMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => handleGenerateMemo('docx')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                >
                  <FileText size={14} className="text-blue-600" />
                  Word (.docx)
                </button>
                <button
                  onClick={() => handleGenerateMemo('pdf')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                >
                  <FileText size={14} className="text-red-600" />
                  PDF (.pdf)
                </button>
                <button
                  onClick={() => handleGenerateMemo('xlsx')}
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
  );
};

// ─── Main Club Modal ─────────────────────────────────────────────────────────

interface ClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: ClubMembership | null;
}

const ClubModal: React.FC<ClubModalProps> = ({
  isOpen,
  onClose,
  editingItem,
}) => {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.helpdesk.loading.mutating);
  const currentUser = useAppSelector(selectCurrentUser);

  const [form, setForm] = useState<CreateClubMembershipInput>(() => buildFormFromItem(editingItem));
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | undefined>();
  const [createdEntityId, setCreatedEntityId] = useState<string | undefined>();

  // ── Sync form to `editingItem` during render ─────────────────────────────
  const [prevEditingItem, setPrevEditingItem] = useState(editingItem);
  if (editingItem !== prevEditingItem) {
    setPrevEditingItem(editingItem);
    setForm(buildFormFromItem(editingItem));
    setCurrentStep(1);
    setPendingDocumentId(undefined);
    setCreatedEntityId(undefined);
  }

  const isEditing = !!editingItem;

  const handleChange = (field: keyof CreateClubMembershipInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (!form.judge_name.trim() || !form.club_name.trim()) {
      toast.error('Judge Name and Club Name are required.');
      return;
    }
    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  const handleMemoGenerated = (docId: string) => {
    setPendingDocumentId(docId);
  };

  const handleSubmit = async () => {
    if (!form.judge_name.trim() || !form.club_name.trim()) {
      toast.error('Judge Name and Club Name are required.');
      return;
    }

    try {
      let result;
      if (isEditing && editingItem) {
        await dispatch(updateClubMembershipStatus({
          id: editingItem.id,
          status: 'Signed' as Status,
        })).unwrap();
        result = editingItem;
      } else {
        result = await dispatch(createClubMembership(form)).unwrap();
        setCreatedEntityId(result.id);
      }

      if (pendingDocumentId && result?.id) {
        try {
          await dispatch(
            linkHelpdeskDocument({
              id: pendingDocumentId,
              entity_type: CLUB_ENTITY_TYPE,
              entity_id: result.id,
            })
          ).unwrap();
          toast.success('Memo linked to the club membership record.');
        } catch {
          toast.error('Record created, but failed to link the memo. You can attach it manually later.');
        }
      }

      await dispatch(fetchClubMemberships({}));
      await dispatch(fetchHelpDeskStats());
      toast.success(isEditing ? 'Club membership updated successfully.' : 'Club membership created successfully.');
      onClose();
    } catch (err) {
      console.error('Failed to save club membership:', err);
      toast.error('Failed to save club membership. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#1c1917' },
          success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">
            {isEditing ? 'Edit Club Membership' : 'Add Club Membership'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-4">
          {/* Step Indicator */}
          {!isEditing && (
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 1 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                      1
                    </div>
                    <span className="text-xs font-medium">Club Details</span>
                  </div>
                  <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-[#c9a84c]' : 'bg-stone-200'}`} />
                  <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 2 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                      2
                    </div>
                    <span className="text-xs font-medium">Memo & Review</span>
                  </div>
                </div>
                <span className="text-xs text-stone-400">Step {currentStep} of 2</span>
              </div>
            </div>
          )}

          {isEditing ? (
            // Edit mode - show form only (no memo generation for editing)
            <ClubDetailsForm form={form} onChange={handleChange} />
          ) : currentStep === 1 ? (
            <ClubDetailsForm form={form} onChange={handleChange} />
          ) : (
            <ClubMemoPreview
              form={form}
              onEdit={handlePrevStep}
              signatureUrl={currentUser?.signature_url}
              entityId={createdEntityId}
              onMemoGenerated={handleMemoGenerated}
            />
          )}
        </div>

        <div className="flex justify-between border-t border-stone-100 px-4 py-3">
          <div>
            {!isEditing && currentStep === 2 && (
              <GhostButton onClick={handlePrevStep} icon={<ArrowLeft size={14} />}>
                Back
              </GhostButton>
            )}
          </div>
          <div className="flex gap-2">
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            {isEditing ? (
              <button
                onClick={handleSubmit}
                disabled={mutating}
                className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
                Update
              </button>
            ) : currentStep === 1 ? (
              <GoldButton onClick={handleNextStep} icon={<ArrowRight size={14} />}>
                Next
              </GoldButton>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={mutating}
                className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
                Create
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubModal;