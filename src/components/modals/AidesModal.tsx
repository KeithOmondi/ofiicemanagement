// src/features/aide/components/AidesModal.tsx

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createAideRequest,
  updateAideRequest,
} from '../../store/slices/aidesSlice';
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
  OFFICER_RANKS,
  UNIT_TYPES,
  getOfficerRankLabel,
  getUnitTypeLabel,
  type OfficerRank,
  type UnitType,
} from '../../types/aide.types';
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
} from 'lucide-react';
import {
  generateAidesMemoPdf,
  buildAideMemoParams,
  type AideMemoParams,
} from '../../utils/generateAidesMemoPdf';
import { generateAidesDocx } from '../../utils/generateAidesDocx';

// ─── Constants ────────────────────────────────────────────────────────────────

const CREST_URL = 'https://res.cloudinary.com/do0yflasl/image/upload/v1784363826/ORHC_L_crclut.jpg';
const FOOTER_EMBLEM_URL = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AideFormData {
  judge_name: string;
  judge_location: string;
  officer_rank: OfficerRank;
  officer_name: string;
  employment_number: string;
  current_station: string;
  current_unit: UnitType;
  proposed_assignment: string;
  reporting_date?: string;
  remarks: string;
}

// The single source of truth for everything printed on the memo. Built once
// (from AideMemoParams) when the user reaches Step 2, then edited directly
// in the live preview — nothing gets silently regenerated out from under
// the user after that.
interface MemoDraft {
  ref: string;
  date: string;
  toTitle: string;
  toOrganization: string;
  toBuilding: string;
  toPOBox: string;
  toCity: string;
  subject: string;
  greeting: string;
  bodyText: string;
  officerSuitabilityText: string;
  closingText: string;
  fromDepartment: string;
  ccList: string[];
}

function draftFromParams(params: AideMemoParams): MemoDraft {
  return {
    ref: params.ref,
    date: params.date,
    toTitle: params.to,
    toOrganization: params.toOrganization,
    toBuilding: params.toBuilding || '',
    toPOBox: params.toPOBox || '',
    toCity: params.toCity || '',
    subject: params.subject,
    greeting: params.greetingText || 'Greetings from the Office of the Registrar, High Court.',
    bodyText: params.bodyText,
    officerSuitabilityText: params.officerSuitabilityText || '',
    closingText:
      params.closingText ||
      'We take this opportunity to thank you for your continued partnership and kindly request your favourable consideration of this matter.',
    fromDepartment: params.fromDepartment || '',
    ccList: params.ccList && params.ccList.length > 0 ? params.ccList : [''],
  };
}

function paramsFromDraft(draft: MemoDraft, crestUrl: string): AideMemoParams {
  return {
    ref: draft.ref,
    date: draft.date,
    to: draft.toTitle,
    toOrganization: draft.toOrganization,
    toBuilding: draft.toBuilding || undefined,
    toPOBox: draft.toPOBox || undefined,
    toCity: draft.toCity || undefined,
    subject: draft.subject,
    greetingText: draft.greeting,
    bodyText: draft.bodyText,
    officerSuitabilityText: draft.officerSuitabilityText || undefined,
    closingText: draft.closingText,
    judgeName: '',
    officerName: '',
    officerRank: '',
    officerNumber: '',
    currentStation: '',
    assignmentType: '',
    fromDepartment: draft.fromDepartment || undefined,
    ccList: draft.ccList.filter((cc) => cc.trim()),
    crestUrl,
  };
}

interface ValidationError {
  field: string;
  message: string;
}

interface AidesModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId?: string | null;
  initialData?: AideFormData | null;
  onSuccess?: () => void;
}

type DownloadFormat = 'pdf' | 'docx';

// ─── UI Components ───────────────────────────────────────────────────────────

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c] transition-colors';

const labelClasses = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500';

// Inline "edit in place" field used inside the letter preview itself —
// looks like static document text until focused/hovered.
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

// ─── Document helpers ──────────────────────────────────────────────────────

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

const EMPTY_FORM: AideFormData = {
  judge_name: '',
  judge_location: '',
  officer_rank: 'Police Constable (PC)',
  officer_name: '',
  employment_number: '',
  current_station: '',
  current_unit: 'KPS',
  proposed_assignment: '',
  reporting_date: '',
  remarks: '',
};

// ─── Main Modal ──────────────────────────────────────────────────────────────

export const AidesModal: React.FC<AidesModalProps> = ({
  isOpen,
  onClose,
  editingId,
  initialData,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const isEditing = !!editingId;
  const mutating = useAppSelector((state) => state.aides.loading.create || state.aides.loading.update);

  const allDocs = useAppSelector(selectAllHelpdeskDocuments);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Single source of truth for initial form state. Because the parent
  // remounts this component (key={editingId ?? 'new'}) whenever the
  // editing target changes, this lazy initializer is all that's needed —
  // no effects required to keep formData in sync with initialData/isOpen.
  const getInitialFormData = (): AideFormData => {
    if (initialData) {
      return {
        judge_name: initialData.judge_name || '',
        judge_location: initialData.judge_location || '',
        officer_rank: initialData.officer_rank || 'Police Constable (PC)',
        officer_name: initialData.officer_name || '',
        employment_number: initialData.employment_number || '',
        current_station: initialData.current_station || '',
        current_unit: initialData.current_unit || 'KPS',
        proposed_assignment: initialData.proposed_assignment || '',
        reporting_date: initialData.reporting_date || '',
        remarks: initialData.remarks || '',
      };
    }
    return EMPTY_FORM;
  };

  const [formData, setFormData] = useState<AideFormData>(getInitialFormData);
  const [memoDraft, setMemoDraft] = useState<MemoDraft | null>(null);

  const [pendingDocumentId, setPendingDocumentId] = useState<string | undefined>();
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docs = useMemo(
    () => allDocs.filter((d) => d.entity_type === 'aide' && d.entity_id === editingId),
    [allDocs, editingId]
  );

  // ─── Effects ──────────────────────────────────────────────────────────────────

  // Fetch documents when editing
  useEffect(() => {
    if (isOpen && editingId) {
      dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: editingId }));
    }
  }, [dispatch, isOpen, editingId]);

  // ─── Handlers ──────────────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttachDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      await dispatch(
        uploadHelpdeskDocument({
          blob: file,
          filename: file.name,
          ref: `AIDE/${editingId?.slice(0, 8) || 'NEW'}`,
          subject: `Memo for ${formData.judge_name || 'Aide Request'}`,
          entity_type: 'aide' as DocumentEntityType,
          entity_id: editingId || undefined,
          format,
        })
      ).unwrap();
      toast.success('Document attached successfully.');
      if (editingId) {
        dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: editingId }));
      }
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
        linkHelpdeskDocument({ id: docId, entity_type: 'aide' as DocumentEntityType, entity_id: editingId })
      ).unwrap();
      toast.success('Document linked successfully.');
      setShowLinkPicker(false);
      dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: editingId }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to link document.');
    }
  };

  const handleSendForApproval = async (docId: string) => {
    try {
      await dispatch(submitForApproval({ id: docId })).unwrap();
      toast.success('Document sent for approval.');
      if (editingId) {
        dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: editingId }));
      }
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit for approval.');
    }
  };

  // ─── Memo draft editing helpers ─────────────────────────────────────────

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

  // ─── Step navigation ─────────────────────────────────────────────────────

  const requiredStep1Fields = [
    'judge_name',
    'officer_rank',
    'officer_name',
    'employment_number',
    'current_station',
    'current_unit',
    'proposed_assignment',
  ] as const;

  const handleNextStep = () => {
    const missingFields = requiredStep1Fields.filter((field) => !formData[field] || formData[field] === '');
    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Seed the editable draft the first time we land on Step 2. If the
    // user goes Back and Next again, their edits are preserved.
    if (!memoDraft) {
      const seedParams = buildAideMemoParams({
        judgeName: formData.judge_name.trim(),
        judgeLocation: formData.judge_location.trim() || undefined,
        officerName: formData.officer_name.trim(),
        officerRank: formData.officer_rank,
        officerNumber: formData.employment_number.trim() || 'N/A',
        currentStation: formData.current_station.trim(),
        assignmentType: formData.proposed_assignment.trim(),
        requestDate: formData.reporting_date || new Date().toISOString().split('T')[0],
        refNumber: `RHC/AIDE/${Date.now().toString().slice(-6)}`,
        fromDepartment: 'Office of the Registrar High Court',
        additionalNotes: formData.remarks || undefined,
      });
      setMemoDraft(draftFromParams(seedParams));
    }

    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  // ─── Generate + download / save ─────────────────────────────────────────

  const generateMemoBlob = async (format: DownloadFormat): Promise<Blob | null> => {
    if (!memoDraft) return null;
    const params = paramsFromDraft(
      memoDraft,
      CREST_URL
    );
    return format === 'pdf' ? await generateAidesMemoPdf(params) : await generateAidesDocx(params);
  };

  const handleDownloadMemo = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    if (!memoDraft) return;
    setDownloadingFormat(format);

    try {
      const blob = await generateMemoBlob(format);
      if (!blob) throw new Error('Failed to generate memo');

      const filename = `${memoDraft.ref || 'aide-memo'}.${format}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Also save it into the document system as a draft, same as before.
      const result = await dispatch(
        uploadHelpdeskDocument({
          blob,
          filename,
          ref: memoDraft.ref,
          subject: memoDraft.subject,
          entity_type: 'aide' as DocumentEntityType,
          entity_id: editingId || undefined,
          format,
        })
      ).unwrap();
      setPendingDocumentId(result.id);
      if (editingId) {
        dispatch(fetchHelpdeskDocuments({ entity_type: 'aide', entity_id: editingId }));
      }

      toast.success(`${format.toUpperCase()} memo downloaded and saved.`);
    } catch (err) {
      console.error('Failed to download memo:', err);
      toast.error('Failed to download memo. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleSubmit = async () => {
    const missingFields = requiredStep1Fields.filter((field) => !formData[field] || formData[field] === '');
    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      setCurrentStep(1);
      return;
    }

    try {
      let formattedDate = undefined;
      if (formData.reporting_date) {
        formattedDate = new Date(formData.reporting_date).toISOString().split('T')[0];
      }

      const payload = {
        judge_name: formData.judge_name.trim(),
        officer_rank: formData.officer_rank,
        officer_name: formData.officer_name.trim(),
        employment_number: formData.employment_number.trim(),
        current_station: formData.current_station.trim(),
        current_unit: formData.current_unit,
        proposed_assignment: formData.proposed_assignment.trim(),
        reporting_date: formattedDate,
        remarks: formData.remarks?.trim() || undefined,
      };

      let createdId: string | undefined;

      if (editingId) {
        await dispatch(updateAideRequest({ id: editingId, data: payload })).unwrap();
        toast.success('Aide request updated successfully');
        createdId = editingId;
      } else {
        const result = await dispatch(createAideRequest(payload)).unwrap();
        toast.success('Aide request created successfully');
        createdId = result.id;
      }

      if (pendingDocumentId && createdId) {
        try {
          await dispatch(
            linkHelpdeskDocument({
              id: pendingDocumentId,
              entity_type: 'aide' as DocumentEntityType,
              entity_id: createdId,
            })
          ).unwrap();
          toast.success('Memo linked to the record.');
        } catch {
          toast.error('Record created, but failed to link the memo. You can attach it manually later.');
        }
      }

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
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header - fixed */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-[#1a3d1c]">
            {isEditing ? 'Edit Aide Request' : 'New Aide Request'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator - fixed */}
        <div className="shrink-0 border-b border-stone-100 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 1 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>
                1
              </div>
              <span className="text-xs font-medium">Request Details</span>
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

        {/* Scrollable content - fills remaining space */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Judge Name *</label>
                  <input
                    type="text"
                    name="judge_name"
                    value={formData.judge_name}
                    onChange={handleChange}
                    placeholder="e.g., Hon. Lady Justice Roseline Oganyo"
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Judge's Court / Location</label>
                  <input
                    type="text"
                    name="judge_location"
                    value={formData.judge_location}
                    onChange={handleChange}
                    placeholder="e.g., Milimani Law Courts"
                    className={inputClasses}
                  />
                  <p className="mt-1 text-xs text-stone-400">Used in the memo's Copy-to line</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Officer Rank *</label>
                  <select
                    name="officer_rank"
                    value={formData.officer_rank}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  >
                    {OFFICER_RANKS.map((rank) => (
                      <option key={rank} value={rank}>
                        {getOfficerRankLabel(rank)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Officer Name *</label>
                  <input
                    type="text"
                    name="officer_name"
                    value={formData.officer_name}
                    onChange={handleChange}
                    placeholder="e.g., John M. Doe"
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Employment/Service Number *</label>
                  <input
                    type="text"
                    name="employment_number"
                    value={formData.employment_number}
                    onChange={handleChange}
                    placeholder="e.g., 12345"
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Unit *</label>
                  <select
                    name="current_unit"
                    value={formData.current_unit}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  >
                    {UNIT_TYPES.map((unit) => (
                      <option key={unit} value={unit}>
                        {getUnitTypeLabel(unit)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Current Station *</label>
                <input
                  type="text"
                  name="current_station"
                  value={formData.current_station}
                  onChange={handleChange}
                  placeholder="e.g., Nairobi Police Station"
                  className={inputClasses}
                  required
                />
              </div>

              <div>
                <label className={labelClasses}>Proposed Assignment *</label>
                <textarea
                  name="proposed_assignment"
                  value={formData.proposed_assignment}
                  onChange={handleChange}
                  placeholder="Describe the proposed assignment..."
                  rows={2}
                  className={`${inputClasses} resize-none`}
                  required
                />
              </div>

              <div>
                <label className={labelClasses}>Reporting Date</label>
                <input
                  type="date"
                  name="reporting_date"
                  value={formData.reporting_date || ''}
                  onChange={handleChange}
                  className={inputClasses}
                />
                <p className="mt-1 text-xs text-stone-400">Optional - leave blank if not applicable</p>
              </div>

              <div>
                <label className={labelClasses}>Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  placeholder="Additional remarks..."
                  rows={2}
                  className={`${inputClasses} resize-none`}
                />
                <p className="mt-1 text-xs text-stone-400">Included as additional notes on the memo</p>
              </div>
            </div>
          )}

          {currentStep === 2 && memoDraft && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-400">
                  Edit any field directly in the letter below — it's exactly what downloads.
                </p>
                <div className="relative">
                  <GoldButton
                    size="sm"
                    onClick={() => setShowDownloadMenu((v) => !v)}
                    disabled={downloadingFormat !== null}
                    icon={downloadingFormat ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  >
                    {downloadingFormat ? 'Downloading...' : 'Download'}
                    {!downloadingFormat && <ChevronDown size={12} />}
                  </GoldButton>
                  {showDownloadMenu && (
                    <>
                      <div className="fixed inset-0 z-0" onClick={() => setShowDownloadMenu(false)} />
                      <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                        <button
                          onClick={() => handleDownloadMemo('pdf')}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                        >
                          <FileText size={14} className="text-red-600" />
                          PDF (.pdf)
                        </button>
                        <button
                          onClick={() => handleDownloadMemo('docx')}
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

              {/* ─── Live editable letter preview ──────────────────────────────── */}
              <div className="rounded-lg border border-stone-300 bg-white p-8 shadow-sm font-serif text-black text-[13px] leading-relaxed">
                <div className="flex items-center gap-4 mb-1">
                  <img
                    src={CREST_URL}
                    alt="Crest"
                    className="h-14 w-14 object-contain shrink-0"
                  />
                  <div>
                    <p className="text-lg font-bold leading-tight">THE JUDICIARY</p>
                    <p className="text-sm font-bold leading-tight">OFFICE OF THE REGISTRAR HIGH COURT</p>
                  </div>
                </div>
                <hr className="border-t-2 border-[#c9a84c] mb-4" />

                <div className="flex justify-between font-bold mb-4">
                  <span className="flex items-center gap-1">
                    Ref:
                    <input
                      value={memoDraft.ref}
                      onChange={(e) => updateDraft('ref', e.target.value)}
                      className={`${docFieldClasses} w-40`}
                    />
                  </span>
                  <input
                    type="date"
                    value={memoDraft.date}
                    onChange={(e) => updateDraft('date', e.target.value)}
                    className={`${docFieldClasses} text-right`}
                  />
                </div>

                <div className="font-bold mb-1">
                  <input
                    value={memoDraft.toTitle}
                    onChange={(e) => updateDraft('toTitle', e.target.value)}
                    className={`${docFieldClasses} w-full`}
                  />
                  ,
                </div>
                <div className="mb-0.5">
                  <input
                    value={memoDraft.toOrganization}
                    onChange={(e) => updateDraft('toOrganization', e.target.value)}
                    className={`${docFieldClasses} w-full`}
                    placeholder="Organization, e.g. Kenya Police Service"
                  />
                  ,
                </div>
                <div className="mb-0.5">
                  <input
                    value={memoDraft.toBuilding}
                    onChange={(e) => updateDraft('toBuilding', e.target.value)}
                    className={`${docFieldClasses} w-full`}
                    placeholder="Building, e.g. Vigilance House"
                  />
                  ,
                </div>
                <div className="mb-0.5">
                  <input
                    value={memoDraft.toPOBox}
                    onChange={(e) => updateDraft('toPOBox', e.target.value)}
                    className={`${docFieldClasses} w-full`}
                    placeholder="P.O. Box"
                  />
                </div>
                <div className="font-bold mb-4">
                  <input
                    value={memoDraft.toCity}
                    onChange={(e) => updateDraft('toCity', e.target.value)}
                    className={`${docFieldClasses} w-full uppercase`}
                    placeholder="City"
                  />
                </div>

                <div className="font-bold underline mb-4">
                  RE:{' '}
                  <input
                    value={memoDraft.subject}
                    onChange={(e) => updateDraft('subject', e.target.value)}
                    className={`${docFieldClasses} w-[85%] uppercase`}
                  />
                </div>

                <input
                  value={memoDraft.greeting}
                  onChange={(e) => updateDraft('greeting', e.target.value)}
                  className={`${docFieldClasses} block w-full mb-3`}
                />

                <textarea
                  value={memoDraft.bodyText}
                  onChange={(e) => updateDraft('bodyText', e.target.value)}
                  rows={4}
                  className={`${docFieldClasses} block w-full mb-3 resize-none text-justify`}
                />

                <textarea
                  value={memoDraft.officerSuitabilityText}
                  onChange={(e) => updateDraft('officerSuitabilityText', e.target.value)}
                  rows={3}
                  className={`${docFieldClasses} block w-full mb-3 resize-none text-justify`}
                />

                <textarea
                  value={memoDraft.closingText}
                  onChange={(e) => updateDraft('closingText', e.target.value)}
                  rows={2}
                  className={`${docFieldClasses} block w-full mb-6 resize-none text-justify`}
                />

                <p className="font-bold mb-8">Yours sincerely,</p>

                {/* ─── Signature Block ────────────────────────────────────────────── */}
                {/* Signature space reserved for backend - increased spacing */}
                <div className="h-24 mb-4">
                  {/* Signature will be embedded by the backend via embedSignatureBlockIntoPDF */}
                </div>

                {/* Department - normal text */}
                <input
                  value={memoDraft.fromDepartment}
                  onChange={(e) => updateDraft('fromDepartment', e.target.value)}
                  className={`${docFieldClasses} block w-full text-sm mb-8`}
                  placeholder="Department"
                />

                {/* ─── Copy to: MOVED BELOW signature block ──────────────────────── */}
                <p className="font-bold mb-1">Copy to:</p>
                <div className="space-y-1">
                  {memoDraft.ccList.map((cc, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span>{i + 1}.</span>
                      <input
                        value={cc}
                        onChange={(e) => updateCcLine(i, e.target.value)}
                        className={`${docFieldClasses} flex-1`}
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

                <div className="mt-10 pt-3 border-t border-stone-300 flex items-center justify-between gap-3">
                  <img
                    src={FOOTER_EMBLEM_URL}
                    alt=""
                    className="h-8 w-auto object-contain shrink-0"
                  />
                  <div className="text-[10px] leading-tight text-stone-600 text-right">
                    <p className="italic">Social Transformation through Access to Justice</p>
                    <p>Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi</p>
                    <p>Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke</p>
                    <p className="font-bold text-[#1a3d1c]">Justice Be Our Shield and Defender</p>
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              {isEditing && (
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
                      >
                        Link Existing
                      </GhostButton>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.xlsx"
                        onChange={handleAttachDocument}
                        className="hidden"
                        disabled={documentsUploading}
                      />
                      <GhostButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={documentsUploading}
                        icon={documentsUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      >
                        {documentsUploading ? 'Uploading…' : 'Attach'}
                      </GhostButton>
                    </div>
                  </div>

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

                  {docs.length === 0 ? (
                    <p className="mt-2 text-xs text-stone-400 italic">No documents attached.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200">
                      {docs.map((doc) => (
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
                                <span className="text-[11px] text-stone-400 uppercase">{doc.format}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            
                             <a href={doc.file_url}
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
              )}
            </div>
          )}
        </div>

        {/* Footer - fixed at bottom */}
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
                  disabled={mutating}
                  icon={mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
                >
                  {mutating ? 'Saving...' : isEditing ? 'Update Request' : 'Create Request'}
                </GoldButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};