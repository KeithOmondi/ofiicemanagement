// src/components/modals/SensitizationModal.tsx

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createSensitization,
  updateSensitization,
} from '../../store/slices/principalRegistryReportSlice';
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
  Plus,
  Trash2,
  Users,
  CheckCircle,
  Clock as ClockIcon,
  FileText,
  ChevronDown,
  Upload,
  Paperclip,
  ExternalLink,
  Send,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  MapPin,
  ClipboardList,
  Download,
  UserCheck,
  FileSignature,
  X as XIcon,
} from 'lucide-react';
import { generateSensitizationDocx } from '../../utils/generateSensitizationDocx';
import { generateSensitizationExcel } from '../../utils/generateSensitizationExcel';
import { generateSensitizationPdf } from '../../utils/generateSensitizationPdf';
import toast, { Toaster } from 'react-hot-toast';
import type { SensitizationResponse } from '../../types/principal-registry-report.types';

// ─── Constants ──────────────────────────────────────────────────────────────

const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1784363826/ORHC_L_crclut.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

const DEFAULT_SUBJECT = 'SENSITISATION OF AUTOMATED PRINCIPAL REGISTRY OPERATIONS';

// ─── Helper Functions ──────────────────────────────────────────────────────

const formatAmount = (amount: number): string =>
  amount > 0
    ? amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

const documentStatusColor = (status: DocumentStatus): string => {
  const map: Record<DocumentStatus, string> = {
    draft: 'bg-stone-100 text-stone-600 ring-stone-200',
    pending_approval: 'bg-amber-50 text-amber-700 ring-amber-200',
    ready_to_send: 'bg-blue-50 text-blue-700 ring-blue-200',
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

const getDefaultMemoNumber = () => {
  const random = Math.floor(Math.random() * 100000).toString().padStart(6, '0');
  return `SENS-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${random}`;
};

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

const smallInputClasses =
  'w-full rounded border border-stone-200 px-2 py-1 text-xs focus:border-[#1a3d1c] focus:outline-none';

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
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Step Indicator ─────────────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: number;
  steps: { id: number; label: string; icon: React.ReactNode }[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              isActive
                ? 'bg-[#c9a84c]/20 text-[#1a3d1c] font-semibold'
                : isCompleted
                ? 'text-emerald-600'
                : 'text-stone-400'
            }`}>
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                isActive
                  ? 'bg-[#c9a84c] text-white'
                  : isCompleted
                  ? 'bg-emerald-500 text-white'
                  : 'bg-stone-200 text-stone-500'
              }`}>
                {isCompleted ? <CheckCircle size={14} /> : index + 1}
              </span>
              <span className="text-sm hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                isCompleted ? 'bg-emerald-500' : 'bg-stone-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Team Member Row ──────────────────────────────────────────────────────

interface TeamMemberFormState {
  id?: string;
  s_no: number;
  name: string;
  pjNumber: string;
  rank: string;
  days: number;
  dsaRate: number;
  total: number;
  isDriver: boolean;
}

function buildEmptyTeamMember(): TeamMemberFormState {
  return {
    s_no: 0,
    name: '',
    pjNumber: '',
    rank: '',
    days: 0,
    dsaRate: 0,
    total: 0,
    isDriver: false,
  };
}

function calculateTotal(days: number, dsaRate: number): number {
  return days * dsaRate;
}

interface TeamMemberRowProps {
  member: TeamMemberFormState;
  index: number;
  onChange: (index: number, field: keyof TeamMemberFormState, value: string | number | boolean) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

const TeamMemberRow: React.FC<TeamMemberRowProps> = ({
  member,
  index,
  onChange,
  onRemove,
  canRemove,
}) => {
  const handleChange = (field: keyof TeamMemberFormState, value: string | number | boolean) => {
    onChange(index, field, value);

    if (field === 'days' || field === 'dsaRate') {
      const days = field === 'days' ? Number(value) : member.days;
      const dsaRate = field === 'dsaRate' ? Number(value) : member.dsaRate;
      const total = calculateTotal(days, dsaRate);
      onChange(index, 'total', total);
    }
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-500">Member #{index + 1}</span>
        <button
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel required>Name</FieldLabel>
          <input
            type="text"
            value={member.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Full name"
            className={smallInputClasses}
          />
        </div>
        <div>
          <FieldLabel required>PJ Number</FieldLabel>
          <input
            type="text"
            value={member.pjNumber}
            onChange={(e) => handleChange('pjNumber', e.target.value)}
            placeholder="PJ Number"
            className={smallInputClasses}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <FieldLabel required>Rank</FieldLabel>
          <input
            type="text"
            value={member.rank}
            onChange={(e) => handleChange('rank', e.target.value)}
            placeholder="e.g., DR, JSG 6"
            className={smallInputClasses}
          />
        </div>
        <div>
          <FieldLabel required>Days</FieldLabel>
          <input
            type="number"
            min={0}
            value={member.days || ''}
            onChange={(e) => handleChange('days', parseInt(e.target.value) || 0)}
            placeholder="0"
            className={smallInputClasses}
          />
        </div>
        <div>
          <FieldLabel required>DSA Rate (KES)</FieldLabel>
          <input
            type="number"
            min={0}
            step={0.01}
            value={member.dsaRate || ''}
            onChange={(e) => handleChange('dsaRate', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className={smallInputClasses}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Total (KES)</FieldLabel>
          <input
            type="number"
            value={member.total || ''}
            readOnly
            className={`${smallInputClasses} bg-stone-50 text-stone-600`}
          />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={member.isDriver}
            onChange={(e) => handleChange('isDriver', e.target.checked)}
            className="rounded border-stone-300 text-[#c9a84c] focus:ring-[#c9a84c]"
          />
          <label className="text-xs text-stone-600">Pool Driver</label>
        </div>
      </div>
    </div>
  );
};

// ─── Step 1: Basic Info Form ──────────────────────────────────────────────

interface BasicInfoState {
  memoNumber: string;
  date: string;
  fromField: string;
  toField: string;
  subject: string;
  location: string;
  travelStartDate: string;
  travelEndDate: string;
  sensitizationPeriod: string;
}

interface BasicInfoFormProps {
  info: BasicInfoState;
  setInfo: (info: BasicInfoState) => void;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ info, setInfo }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Memo Details</h4>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Memo Number</FieldLabel>
              <input
                type="text"
                value={info.memoNumber}
                onChange={(e) => setInfo({ ...info, memoNumber: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <FieldLabel required>Date</FieldLabel>
              <input
                type="date"
                value={info.date}
                onChange={(e) => setInfo({ ...info, date: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>From</FieldLabel>
              <input
                type="text"
                value={info.fromField}
                onChange={(e) => setInfo({ ...info, fromField: e.target.value })}
                placeholder="Deputy Registrar"
                className={inputClasses}
              />
            </div>
            <div>
              <FieldLabel required>To</FieldLabel>
              <input
                type="text"
                value={info.toField}
                onChange={(e) => setInfo({ ...info, toField: e.target.value })}
                placeholder="Registrar High Court"
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>Subject</FieldLabel>
            <input
              type="text"
              value={info.subject}
              onChange={(e) => setInfo({ ...info, subject: e.target.value })}
              placeholder="Sensitisation of Automated Principal Registry Operations"
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Location &amp; Travel</h4>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <FieldLabel required>Location</FieldLabel>
            <input
              type="text"
              value={info.location}
              onChange={(e) => setInfo({ ...info, location: e.target.value })}
              placeholder="e.g., Kakamega Law Courts"
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel required>Travel Start Date</FieldLabel>
              <input
                type="date"
                value={info.travelStartDate}
                onChange={(e) => setInfo({ ...info, travelStartDate: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <FieldLabel required>Travel End Date</FieldLabel>
              <input
                type="date"
                value={info.travelEndDate}
                onChange={(e) => setInfo({ ...info, travelEndDate: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <FieldLabel required>Sensitization Period</FieldLabel>
            <input
              type="text"
              value={info.sensitizationPeriod}
              onChange={(e) => setInfo({ ...info, sensitizationPeriod: e.target.value })}
              placeholder="e.g., August 2026 to 5th August 2026"
              className={inputClasses}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step 2: Team Members Form ─────────────────────────────────────────────

interface TeamMembersFormProps {
  teamMembers: TeamMemberFormState[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: keyof TeamMemberFormState, value: string | number | boolean) => void;
  grandTotal: number;
  preparedBy: string;
  setPreparedBy: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
}

const TeamMembersForm: React.FC<TeamMembersFormProps> = ({
  teamMembers,
  onAdd,
  onRemove,
  onChange,
  grandTotal,
  preparedBy,
  setPreparedBy,
  title,
  setTitle,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#c9a84c]" />
            <h4 className="text-sm font-semibold text-stone-800">Team Members</h4>
            <span className="text-xs text-stone-400">({teamMembers.length})</span>
          </div>
          <GoldButton size="sm" onClick={onAdd} icon={<Plus size={14} />}>
            Add Member
          </GoldButton>
        </div>

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {teamMembers.map((member, index) => (
            <TeamMemberRow
              key={index}
              member={member}
              index={index}
              onChange={onChange}
              onRemove={onRemove}
              canRemove={teamMembers.length > 1}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-[#c9a84c]/10 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-600">Grand Total</span>
          <span className="text-sm font-bold text-[#1a3d1c]">
            KES {formatAmount(grandTotal) || '0.00'}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Signatory</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>Prepared By</FieldLabel>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="Name of person preparing"
              className={inputClasses}
            />
          </div>
          <div>
            <FieldLabel required>Title</FieldLabel>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Deputy Registrar, Principal Registry"
              className={inputClasses}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step 3: Preview ────────────────────────────────────────────────────────

type DownloadFormat = 'docx' | 'pdf' | 'xlsx';

interface MemoPreviewStepProps {
  info: BasicInfoState;
  teamMembers: TeamMemberFormState[];
  grandTotal: number;
  preparedBy: string;
  title: string;
  sensitizationId?: string;
  pendingDocumentId: string | undefined;
  onDocumentUploaded: (docId: string) => void;
  onEditInfo: () => void;
  onEditDetails: () => void;
}

const MemoPreviewStep: React.FC<MemoPreviewStepProps> = ({
  info,
  teamMembers,
  grandTotal,
  preparedBy,
  title,
  sensitizationId,
  pendingDocumentId,
  onDocumentUploaded,
  onEditInfo,
  onEditDetails,
}) => {
  const dispatch = useAppDispatch();
  const allDocuments = useAppSelector(selectAllHelpdeskDocuments);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);
  
  // Get current user for auto-populating name
  const currentUser = useAppSelector((state) => state.auth.user);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const handleSignatureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG or JPG) for the signature.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSignatureDataUrl(reader.result as string);
    };
    reader.onerror = () => {
      toast.error('Failed to read signature image.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleRemoveSignature = () => {
    setSignatureDataUrl(null);
    if (signatureInputRef.current) {
      signatureInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (sensitizationId) {
      dispatch(fetchHelpdeskDocuments({ entity_type: 'sensitization', entity_id: sensitizationId }));
    }
  }, [dispatch, sensitizationId]);

  useEffect(() => {
    if (showLinkPicker) {
      dispatch(fetchHelpdeskDocuments({ unlinked: true }));
    }
  }, [dispatch, showLinkPicker]);

  // ─── Build memo data WITH signature ────────────────────────────────────
  const buildMemoData = useCallback(() => ({
    memoNumber: info.memoNumber,
    date: formatDateForDisplay(info.date),
    from: info.fromField,
    to: info.toField,
    subject: info.subject,
    location: info.location,
    travelStartDate: formatDateForDisplay(info.travelStartDate),
    travelEndDate: formatDateForDisplay(info.travelEndDate),
    sensitizationPeriod: info.sensitizationPeriod,
    teamMembers: teamMembers.map((m) => ({
      s_no: m.s_no,
      name: m.name,
      pjNumber: m.pjNumber,
      rank: m.rank,
      days: m.days,
      dsaRate: m.dsaRate,
      total: m.total,
      isDriver: m.isDriver,
    })),
    grandTotal,
    preparedBy,
    title,
    crestUrl: JUDICIARY_CREST_SRC,
    // ─── Signature data ──────────────────────────────────────────────────
    signature: signatureDataUrl || undefined,
    signatureName: currentUser?.full_name || preparedBy || undefined,
    signatureTitle: title || 'DEPUTY REGISTRAR, PRINCIPAL REGISTRY',
  }), [info, teamMembers, grandTotal, preparedBy, title, signatureDataUrl, currentUser]);

  const handleGenerate = useCallback(async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);

    try {
      const memoData = buildMemoData();
      let blob: Blob | null = null;

      switch (format) {
        case 'docx':
          blob = await generateSensitizationDocx(memoData);
          break;
        case 'pdf':
          blob = await generateSensitizationPdf(memoData);
          break;
        case 'xlsx':
          blob = generateSensitizationExcel(memoData);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      if (!blob) {
        throw new Error('Generator returned no blob');
      }

      const filename = `SENSITIZATION_${info.memoNumber}.${format}`;
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });

      const result = await dispatch(
        uploadHelpdeskDocument({
          blob: file,
          filename,
          ref: info.memoNumber,
          subject: info.subject,
          entity_type: 'sensitization' as DocumentEntityType,
          entity_id: sensitizationId || undefined,
          format: format as DocumentFormat,
        })
      ).unwrap();

      toast.success(`${format.toUpperCase()} sensitization memo saved to the system.`);

      if (sensitizationId) {
        try {
          await dispatch(linkHelpdeskDocument({
            id: result.id,
            entity_type: 'sensitization',
            entity_id: sensitizationId,
          })).unwrap();
          toast.success('Memo linked to the sensitization record.');
          dispatch(fetchHelpdeskDocuments({ entity_type: 'sensitization', entity_id: sensitizationId }));
        } catch (linkErr) {
          console.warn('Failed to link memo to sensitization record:', linkErr);
        }
      }

      onDocumentUploaded(result.id);
    } catch (err) {
      console.error(`Failed to generate ${format} memo:`, err);
      toast.error('Failed to generate document. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  }, [buildMemoData, info.memoNumber, info.subject, sensitizationId, dispatch, onDocumentUploaded]);

  const handleAttachDocument = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!sensitizationId) {
      toast.error('Save the sensitization first, then attach documents.');
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
          ref: info.memoNumber,
          subject: info.subject,
          entity_type: 'sensitization',
          entity_id: sensitizationId,
          format,
        })
      ).unwrap();
      toast.success('Document attached to this sensitization.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'sensitization', entity_id: sensitizationId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to attach document.');
    } finally {
      setUploadingDocument(false);
      e.target.value = '';
    }
  }, [sensitizationId, info.memoNumber, info.subject, dispatch]);

  const handleLinkExisting = useCallback(async (docId: string) => {
    if (!sensitizationId) {
      toast.error('Save the sensitization first, then link documents.');
      return;
    }
    try {
      await dispatch(
        linkHelpdeskDocument({ id: docId, entity_type: 'sensitization', entity_id: sensitizationId })
      ).unwrap();
      toast.success('Document linked to this sensitization.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: 'sensitization', entity_id: sensitizationId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  }, [sensitizationId, dispatch]);

  const handleSubmitForApproval = useCallback(async (docId: string) => {
    try {
      await dispatch(submitForApproval({
        id: docId,
        comments: 'Submitted for approval via sensitization memo.',
      })).unwrap();
      toast.success('Document submitted to Super Admin for review and approval.');
      dispatch(fetchHelpdeskDocuments({ entity_type: 'sensitization', entity_id: sensitizationId }));
    } catch (err) {
      console.error('Failed to submit document for approval:', err);
      toast.error(typeof err === 'string' ? err : 'Failed to submit document for approval.');
    }
  }, [sensitizationId, dispatch]);

  const linkedDocuments = allDocuments.filter(
    (d) => d.entity_type === 'sensitization' && d.entity_id === sensitizationId
  );

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
        <div className="flex items-center gap-2">
          <GhostButton onClick={onEditInfo} icon={<ClipboardList size={14} />}>
            Edit Info
          </GhostButton>
          <GhostButton onClick={onEditDetails} icon={<Users size={14} />}>
            Edit Details
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
                    onClick={() => handleGenerate('docx')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                  >
                    <FileText size={14} className="text-blue-600" />
                    Word (.docx)
                  </button>
                  <button
                    onClick={() => handleGenerate('pdf')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                  >
                    <FileText size={14} className="text-red-600" />
                    PDF (.pdf)
                  </button>
                  <button
                    onClick={() => handleGenerate('xlsx')}
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

      {/* Digital Signature - Simplified */}
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSignature size={16} className="text-[#c9a84c]" />
            <h4 className="text-sm font-semibold text-stone-800">Digital Signature</h4>
          </div>
          <input
            ref={signatureInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleSignatureUpload}
            className="hidden"
          />
          <div className="flex gap-2">
            {signatureDataUrl && (
              <GhostButton
                onClick={handleRemoveSignature}
                icon={<XIcon size={14} />}
              >
                Remove
              </GhostButton>
            )}
            <GhostButton
              onClick={() => signatureInputRef.current?.click()}
              icon={<Upload size={14} />}
            >
              {signatureDataUrl ? 'Replace Signature' : 'Upload Signature'}
            </GhostButton>
          </div>
        </div>

        {signatureDataUrl ? (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3">
            <img
              src={signatureDataUrl}
              alt="Uploaded signature"
              className="h-14 w-auto max-w-[200px] object-contain"
            />
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-stone-300 bg-white px-3 py-4 text-center">
            <p className="text-xs text-stone-400">No signature uploaded</p>
            <p className="mt-0.5 text-[11px] text-stone-400">Upload your signature to include it in the memo</p>
          </div>
        )}
      </div>

      {/* Memo Preview - shows signature in preview */}
      <div className="border border-stone-300 bg-white p-4 sm:p-10 shadow-sm font-sans text-black overflow-x-auto max-h-[500px] overflow-y-auto">
        <div className="flex justify-center mb-2">
          <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-16 sm:h-24 w-auto object-contain" />
        </div>
        <div className="text-center mb-1">
          <p className="text-sm sm:text-base font-bold uppercase leading-snug tracking-wide text-stone-800">
            OFFICE OF THE REGISTRAR HIGH COURT
          </p>
        </div>
        <div className="text-center mb-6">
          <p className="text-sm sm:text-base font-bold uppercase tracking-wide text-stone-800">
            INTERNAL MEMO
          </p>
          <hr className="border-t-2 border-black w-full mt-1" />
        </div>

        <div className="space-y-1 text-sm font-bold mb-8">
          <div className="flex flex-wrap">
            <span className="w-28 shrink-0">MEMO NO.</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 font-mono font-normal">{info.memoNumber}</span>
          </div>
          <div className="flex flex-wrap">
            <span className="w-28 shrink-0">DATE</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 font-normal">{formatDateForDisplay(info.date)}</span>
          </div>
          <div className="flex flex-wrap">
            <span className="w-28 shrink-0">FROM</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 uppercase">{info.fromField}</span>
          </div>
          <div className="flex flex-wrap">
            <span className="w-28 shrink-0">TO</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 uppercase">{info.toField}</span>
          </div>
          <div className="flex flex-wrap border-b-2 border-black pb-3">
            <span className="w-28 shrink-0">SUBJECT</span>
            <span className="w-4 shrink-0">:</span>
            <span className="flex-1 uppercase">{info.subject}</span>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-stone-700 mb-6">
          <p>
            The Principal Registry has achieved an end-to-end automated process of its operations.
            Consequently, and pursuant to the Hon. Chief Registrar's memo on implementation of
            automated processing of gazette notices in succession causes, all stations are required
            to submit these notices through the CTS.
          </p>
          <p><span className="font-semibold">Location:</span> {info.location || '—'}</p>
          <p>
            <span className="font-semibold">Travel:</span>{' '}
            {info.travelStartDate ? formatDateForDisplay(info.travelStartDate) : '—'} to{' '}
            {info.travelEndDate ? formatDateForDisplay(info.travelEndDate) : '—'}
          </p>
          <p><span className="font-semibold">Period:</span> {info.sensitizationPeriod || '—'}</p>
        </div>

        <p className="text-sm text-stone-700 mb-4">
          We request for approval and facilitation of DSA as tabulated below:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-black min-w-[500px]">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-center text-xs font-bold w-10">S/NO.</th>
                <th className="border border-black px-2 py-1 text-left text-xs font-bold">NAME</th>
                <th className="border border-black px-2 py-1 text-left text-xs font-bold">PJ NO.</th>
                <th className="border border-black px-2 py-1 text-left text-xs font-bold">RANK</th>
                <th className="border border-black px-2 py-1 text-center text-xs font-bold w-12">DAYS</th>
                <th className="border border-black px-2 py-1 text-right text-xs font-bold">DSA RATE</th>
                <th className="border border-black px-2 py-1 text-right text-xs font-bold">TOTAL</th>
                <th className="border border-black px-2 py-1 text-center text-xs font-bold w-14">DRIVER</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, index) => (
                <tr key={index}>
                  <td className="border border-black px-2 py-1 text-center text-xs">{index + 1}</td>
                  <td className="border border-black px-2 py-1 text-xs">{member.name}</td>
                  <td className="border border-black px-2 py-1 text-xs">{member.pjNumber}</td>
                  <td className="border border-black px-2 py-1 text-xs">{member.rank}</td>
                  <td className="border border-black px-2 py-1 text-center text-xs">{member.days}</td>
                  <td className="border border-black px-2 py-1 text-right text-xs">{formatAmount(member.dsaRate)}</td>
                  <td className="border border-black px-2 py-1 text-right text-xs font-medium">
                    {formatAmount(member.total)}
                  </td>
                  <td className="border border-black px-2 py-1 text-center text-xs">
                    {member.isDriver ? '✓' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-stone-50 font-bold">
                <td colSpan={5} className="border border-black px-2 py-2 text-right">GRAND TOTAL</td>
                <td className="border border-black px-2 py-2 text-right"></td>
                <td className="border border-black px-2 py-2 text-right">{formatAmount(grandTotal)}</td>
                <td className="border border-black px-2 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

{/* Signature section in memo preview - Inline */}
{/* Signature section in memo preview - Vertical */}
<div className="mt-8 pt-6 border-t border-stone-200">
  {/* Signature - on top */}
  {signatureDataUrl && (
    <div className="mb-3">
      <img
        src={signatureDataUrl}
        alt="Signature"
        className="h-14 w-auto max-w-[180px] object-contain"
      />
    </div>
  )}

  {/* Name - below signature */}
  <div>
    <p className="text-sm font-medium font-bold uppercase text-stone-800">
      {currentUser?.full_name || preparedBy || '—'}
    </p>
  </div>

  {/* Designation - below name - Bold, Underline, Uppercase */}
  <div>
    <p className="text-sm font-bold underline uppercase text-stone-800">
      {title || 'DEPUTY REGISTRAR, PRINCIPAL REGISTRY'}
    </p>
  </div>
</div>

        <div className="mt-8 sm:mt-12 pt-3 border-t border-stone-300 flex flex-wrap items-center justify-between gap-3">
          <img src={FOOTER_EMBLEM_SRC} alt="" className="h-8 sm:h-10 w-auto object-contain shrink-0" />
          <div className="text-[8px] sm:text-[10px] leading-tight text-stone-700 text-right">
            <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
            <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
            <p className="mt-1 font-bold text-emerald-800">Justice Be Our Shield and Defender</p>
          </div>
        </div>
      </div>

      {/* Supporting Documents */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-stone-800">Supporting Documents</h4>
          <div className="flex flex-wrap gap-2">
            <GhostButton
              onClick={() => setShowLinkPicker((v) => !v)}
              icon={<Paperclip size={14} />}
              disabled={!sensitizationId}
            >
              Link Existing
            </GhostButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx"
              onChange={handleAttachDocument}
              className="hidden"
              disabled={documentsUploading || uploadingDocument || !sensitizationId}
            />
            <GhostButton
              onClick={() => fileInputRef.current?.click()}
              disabled={documentsUploading || uploadingDocument || !sensitizationId}
              icon={documentsUploading || uploadingDocument ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            >
              {documentsUploading || uploadingDocument ? 'Uploading…' : 'Attach Document'}
            </GhostButton>
          </div>
        </div>

        {!sensitizationId && !pendingDocumentId && (
          <p className="mt-2 text-[11px] text-stone-400 italic">
            Generate the memo above, or save the record, to attach and link documents.
          </p>
        )}

        {showLinkPicker && (
          <div className="mt-2 rounded-lg border border-stone-200 bg-white p-2 max-h-48 overflow-y-auto">
            {unlinkedDocuments.length === 0 ? (
              <p className="px-2 py-2 text-xs text-stone-400 italic">No unlinked documents found.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {unlinkedDocuments.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-2 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {documentFormatIcon(doc.format)}
                      <span className="truncate text-sm text-stone-700">{doc.subject}</span>
                      <span className="shrink-0 text-[11px] text-stone-400">{doc.ref}</span>
                    </div>
                    <GhostButton
                      onClick={() => handleLinkExisting(doc.id)}
                      disabled={isLinking || !sensitizationId}
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

        {linkedDocuments.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-400">
            No documents attached yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200">
            {linkedDocuments.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  {documentFormatIcon(doc.format)}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-800">{doc.subject}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${documentStatusColor(doc.status)}`}
                      >
                        {doc.status === 'pending_approval' ? 'Pending Review' : doc.status.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-stone-400">{doc.ref}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 flex-wrap">
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
                      onClick={() => handleSubmitForApproval(doc.id)}
                      disabled={!!documentActionLoading[doc.id]?.submitting}
                      icon={
                        documentActionLoading[doc.id]?.submitting ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )
                      }
                    >
                      {documentActionLoading[doc.id]?.submitting ? 'Submitting…' : 'Submit for Approval'}
                    </GhostButton>
                  )}
                  {doc.status === 'pending_approval' && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <ClockIcon size={12} />
                      Waiting for Review
                    </span>
                  )}
                  {doc.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle size={12} />
                      Approved ✓
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ─── Main SensitizationModal ─────────────────────────────────────────────

interface SensitizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSensitization?: SensitizationResponse | null;
}

export const SensitizationModal: React.FC<SensitizationModalProps> = ({
  isOpen,
  onClose,
  editingSensitization,
}) => {
  const dispatch = useAppDispatch();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | undefined>();

  const [info, setInfo] = useState<BasicInfoState>({
    memoNumber: getDefaultMemoNumber(),
    date: new Date().toISOString().split('T')[0],
    fromField: 'DEPUTY REGISTRAR',
    toField: 'REGISTRAR HIGH COURT',
    subject: DEFAULT_SUBJECT,
    location: '',
    travelStartDate: '',
    travelEndDate: '',
    sensitizationPeriod: '',
  });
  const [teamMembers, setTeamMembers] = useState<TeamMemberFormState[]>([buildEmptyTeamMember()]);
  const [preparedBy, setPreparedBy] = useState('');
  const [title, setTitle] = useState('Deputy Registrar, Principal Registry');

  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!editingSensitization;

  const steps = [
    { id: 1, label: 'Basic Info', icon: <ClipboardList size={16} /> },
    { id: 2, label: 'Team Members', icon: <Users size={16} /> },
    { id: 3, label: 'Preview', icon: <FileText size={16} /> },
  ];

  // ─── Reset form ──────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setInfo({
      memoNumber: getDefaultMemoNumber(),
      date: new Date().toISOString().split('T')[0],
      fromField: 'DEPUTY REGISTRAR',
      toField: 'REGISTRAR HIGH COURT',
      subject: DEFAULT_SUBJECT,
      location: '',
      travelStartDate: '',
      travelEndDate: '',
      sensitizationPeriod: '',
    });
    setTeamMembers([buildEmptyTeamMember()]);
    setPreparedBy('');
    setTitle('Deputy Registrar, Principal Registry');
    setCurrentStep(1);
    setPendingDocumentId(undefined);
  }, []);

  // ─── Load a record's data into form state ───────────────────────────────
  const loadEditingData = useCallback((record: SensitizationResponse) => {
    const data = record.data;
    setInfo({
      memoNumber: record.memoNumber,
      date: data.date,
      fromField: data.from,
      toField: data.to,
      subject: data.subject,
      location: data.location,
      travelStartDate: data.travelStartDate,
      travelEndDate: data.travelEndDate,
      sensitizationPeriod: data.sensitizationPeriod,
    });
    setTeamMembers(data.teamMembers.map((m: { s_no: number; name: string; pjNumber: string; rank: string; days: number; dsaRate: number; total: number; isDriver?: boolean }) => ({
      s_no: m.s_no,
      name: m.name,
      pjNumber: m.pjNumber,
      rank: m.rank,
      days: m.days,
      dsaRate: m.dsaRate,
      total: m.total,
      isDriver: m.isDriver || false,
    })));
    setPreparedBy(data.preparedBy);
    setTitle(data.title);
    setCurrentStep(1);
    setPendingDocumentId(undefined);
  }, []);

  // ─── Sync form state to the isOpen open/close transition ──────────────
  const syncKey = isOpen ? (editingSensitization?.id ?? 'new') : null;
  const [lastSyncedKey, setLastSyncedKey] = useState<string | null>(null);

  if (syncKey !== lastSyncedKey) {
    setLastSyncedKey(syncKey);
    if (syncKey !== null) {
      if (editingSensitization) {
        loadEditingData(editingSensitization);
      } else {
        resetForm();
      }
    }
  }

  // ─── Team member handlers ────────────────────────────────────────────────
  const handleTeamMemberChange = useCallback((
    index: number,
    field: keyof TeamMemberFormState,
    value: string | number | boolean
  ) => {
    setTeamMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleAddTeamMember = useCallback(() => {
    setTeamMembers(prev => [...prev, { ...buildEmptyTeamMember(), s_no: prev.length + 1 }]);
  }, []);

  const handleRemoveTeamMember = useCallback((index: number) => {
    setTeamMembers(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const grandTotal = useMemo(() => teamMembers.reduce((sum, m) => sum + m.total, 0), [teamMembers]);

  const handleDocumentUploaded = useCallback((docId: string) => {
    setPendingDocumentId(docId);
  }, []);

  // ─── Step navigation ──────────────────────────────────────────────────────
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!info.location.trim()) {
        toast.error('Location is required.');
        return;
      }
      if (!info.travelStartDate) {
        toast.error('Travel start date is required.');
        return;
      }
      if (!info.travelEndDate) {
        toast.error('Travel end date is required.');
        return;
      }
      if (!info.sensitizationPeriod.trim()) {
        toast.error('Sensitization period is required.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const validMembers = teamMembers.filter(
        m => m.name.trim() && m.pjNumber.trim() && m.rank.trim() && m.days > 0 && m.dsaRate > 0
      );
      if (validMembers.length === 0) {
        toast.error('Add at least one team member with name, PJ number, rank, days, and DSA rate.');
        return;
      }
      if (!preparedBy.trim()) {
        toast.error('Prepared by name is required.');
        return;
      }
      if (!title.trim()) {
        toast.error('Title is required.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  // ─── Save ───────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!preparedBy.trim()) {
      toast.error('Prepared by name is required.');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }

    const validMembers = teamMembers.filter(
      m => m.name.trim() && m.pjNumber.trim() && m.rank.trim() && m.days > 0 && m.dsaRate > 0
    );
    if (validMembers.length === 0) {
      toast.error('Add at least one team member with name, PJ number, rank, days, and DSA rate.');
      return;
    }

    setIsSaving(true);
    try {
      const input = {
        date: info.date,
        from: info.fromField,
        to: info.toField,
        subject: info.subject,
        location: info.location.trim(),
        travelStartDate: info.travelStartDate,
        travelEndDate: info.travelEndDate,
        sensitizationPeriod: info.sensitizationPeriod.trim(),
        teamMembers: validMembers.map((m, index) => ({
          s_no: index + 1,
          name: m.name.trim(),
          pjNumber: m.pjNumber.trim(),
          rank: m.rank.trim(),
          days: m.days,
          dsaRate: m.dsaRate,
          total: m.total,
          isDriver: m.isDriver,
        })),
        preparedBy: preparedBy.trim(),
        title: title.trim(),
      };

      let result;
      if (isEditing && editingSensitization) {
        result = await dispatch(updateSensitization({
          id: editingSensitization.id,
          data: input,
        })).unwrap();
        toast.success('Sensitization updated successfully.');
      } else {
        result = await dispatch(createSensitization(input)).unwrap();
        toast.success('Sensitization created successfully.');
      }

      if (pendingDocumentId && result?.id) {
        try {
          await dispatch(linkHelpdeskDocument({
            id: pendingDocumentId,
            entity_type: 'sensitization',
            entity_id: result.id,
          })).unwrap();
          toast.success('Memo linked to the sensitization record.');
        } catch {
          toast.error('Record saved, but failed to link the memo.');
        }
      }

      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to save sensitization:', err);
      toast.error('Failed to save sensitization. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [info, teamMembers, preparedBy, title, isEditing, editingSensitization, pendingDocumentId, dispatch, onClose, resetForm]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#1c1917' },
          success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      <div className="flex max-h-[95vh] sm:max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#c9a84c]" />
            <h3 className="text-sm font-semibold text-[#1a3d1c]">
              {isEditing ? 'Edit Sensitization' : 'New Sensitization'}
            </h3>
          </div>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Step indicator */}
          <div className="mb-6">
            <StepIndicator currentStep={currentStep} steps={steps} />
          </div>

          {currentStep === 1 && <BasicInfoForm info={info} setInfo={setInfo} />}

          {currentStep === 2 && (
            <TeamMembersForm
              teamMembers={teamMembers}
              onAdd={handleAddTeamMember}
              onRemove={handleRemoveTeamMember}
              onChange={handleTeamMemberChange}
              grandTotal={grandTotal}
              preparedBy={preparedBy}
              setPreparedBy={setPreparedBy}
              title={title}
              setTitle={setTitle}
            />
          )}

          {currentStep === 3 && (
            <MemoPreviewStep
              info={info}
              teamMembers={teamMembers}
              grandTotal={grandTotal}
              preparedBy={preparedBy}
              title={title}
              sensitizationId={editingSensitization?.id}
              pendingDocumentId={pendingDocumentId}
              onDocumentUploaded={handleDocumentUploaded}
              onEditInfo={() => setCurrentStep(1)}
              onEditDetails={() => setCurrentStep(2)}
            />
          )}
        </div>

        <div className="flex justify-between border-t border-stone-100 px-4 py-3 shrink-0">
          <div>
            {currentStep > 1 && (
              <GhostButton onClick={handlePrevStep} icon={<ArrowLeft size={14} />}>
                Back
              </GhostButton>
            )}
          </div>
          <div className="flex gap-2">
            <GhostButton onClick={handleClose}>Cancel</GhostButton>
            {currentStep < 3 ? (
              <GoldButton onClick={handleNextStep} icon={<ArrowRight size={14} />}>
                Next
              </GoldButton>
            ) : (
              <GoldButton
                onClick={handleCreate}
                disabled={isSaving}
                icon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
              >
                {isEditing ? 'Update Sensitization' : 'Create Sensitization'}
              </GoldButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensitizationModal;