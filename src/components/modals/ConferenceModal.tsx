// src/features/conference/components/ConferenceModal.tsx

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createConference,
  updateConference,
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
} from 'lucide-react';
import { generateConferenceDocx } from '../../utils/generateConferenceDocx';

// ─── Constants ────────────────────────────────────────────────────────────────

const CREST_URL = 'https://res.cloudinary.com/do0yflasl/image/upload/v1784363826/ORHC_L_crclut.jpg';
const FOOTER_EMBLEM_URL = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConferenceFormData {
  // Registry / subject
  ref_number: string;
  case_reference: string; // short, used in the subject line e.g. "BENCH PETITION E051 OF 2026"
  conference_description: string; // longer phrase used in the body sentence
  conference_type: string; // e.g. "retreat"

  // Retreat approval dates (used in the body sentence)
  retreat_start_date: string;
  retreat_end_date: string;

  // Facility booking dates (used in the table — may be a narrower window)
  facility_start_date: string;
  facility_end_date: string;

  number_of_pax: number;
  venue: string;
  location: string;

  judge_names: string[];
  supporting_staff: number;
  drivers_and_guards_count: number;
  secretariat_pax: number;
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

const EMPTY_FORM: ConferenceFormData = {
  ref_number: '',
  case_reference: '',
  conference_description: '',
  conference_type: 'retreat',
  retreat_start_date: '',
  retreat_end_date: '',
  facility_start_date: '',
  facility_end_date: '',
  number_of_pax: 1,
  venue: '',
  location: '',
  judge_names: [''],
  supporting_staff: 0,
  drivers_and_guards_count: 0,
  secretariat_pax: 2,
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
    fromName: params.fromName || 'JOSLYNE NDUBI',
    fromTitle: params.fromTitle || 'HIGH COURT SUPPORT OFFICE-ORHC',
    ccList: params.ccList && params.ccList.length > 0 ? params.ccList : [''],
  };
}

function buildMemoParamsFromDraft(
  draft: MemoDraft,
  crestUrl: string,
  formData: ConferenceFormData
): ConferenceMemoParams {
  return {
    ref: draft.ref,
    date: draft.date,
    to: draft.to,
    caseReference: draft.caseReference,
    conferenceDescription: formData.conference_description,
    bodyText: draft.bodyText,
    conferenceDetailsText: draft.conferenceDetailsText || undefined,
    closingText: draft.closingText,
    conferenceType: formData.conference_type,
    retreatStartDate: formData.retreat_start_date,
    retreatEndDate: formData.retreat_end_date,
    facilityStartDate: formData.facility_start_date,
    facilityEndDate: formData.facility_end_date,
    numberOfPax: formData.number_of_pax,
    venue: formData.venue,
    location: formData.location,
    budgetEstimate: undefined,
    judgeNames: formData.judge_names.filter((n) => n.trim()),
    supportingStaff: formData.supporting_staff,
    driversAndGuardsCount: formData.drivers_and_guards_count,
    secretariatPax: formData.secretariat_pax,
    fromDepartment: draft.fromDepartment || undefined,
    fromName: draft.fromName || undefined,
    fromTitle: draft.fromTitle || undefined,
    ccList: draft.ccList.filter((cc) => cc.trim()),
    crestUrl,
    footerEmblemUrl: FOOTER_EMBLEM_URL,
  };
}

function formatDateDisplay(dateStr: string): string {
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
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

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

  const allDocs = useAppSelector(selectAllHelpdeskDocuments);
  const documentsUploading = useAppSelector(selectDocumentsUploading);
  const documentActionLoading = useAppSelector(selectDocumentActionLoading);
  const unlinkedDocuments = useAppSelector(selectUnlinkedHelpdeskDocuments);
  const isLinking = useAppSelector(selectDocumentLinking);

  // ─── State with lazy initializers ──────────────────────────────────────────

  const [formData, setFormData] = useState<ConferenceFormData>(() => ({
    ...EMPTY_FORM,
    ...(initialData || {}),
    judge_names:
      initialData?.judge_names && initialData.judge_names.length > 0
        ? initialData.judge_names
        : [''],
  }));

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [memoDraft, setMemoDraft] = useState<MemoDraft | null>(null);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | undefined>();
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [generatingFormat, setGeneratingFormat] = useState<DownloadFormat | null>(null);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ─── Handlers ──────────────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseInt(value, 10);
    setFormData((prev) => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
  };

  const updateJudgeName = (index: number, value: string) => {
    setFormData((prev) => {
      const judge_names = [...prev.judge_names];
      judge_names[index] = value;
      return { ...prev, judge_names };
    });
  };

  const addJudgeName = () => {
    setFormData((prev) => ({ ...prev, judge_names: [...prev.judge_names, ''] }));
  };

  const removeJudgeName = (index: number) => {
    setFormData((prev) => {
      const judge_names = prev.judge_names.filter((_, i) => i !== index);
      return { ...prev, judge_names: judge_names.length > 0 ? judge_names : [''] };
    });
  };

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
    'ref_number',
    'case_reference',
    'conference_description',
    'retreat_start_date',
    'retreat_end_date',
    'facility_start_date',
    'facility_end_date',
    'number_of_pax',
    'venue',
    'location',
    'supporting_staff',
    'drivers_and_guards_count',
  ] as const;

  const validateStep1 = (): boolean => {
    const missingFields = requiredStep1Fields.filter((field) => {
      const value = formData[field];
      return value === undefined || value === null || value === '' || value === 0;
    });
    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }

    if (formData.judge_names.filter((n) => n.trim()).length === 0) {
      toast.error('Please add at least one judge name.');
      return false;
    }

    if (formData.retreat_start_date && formData.retreat_end_date) {
      const start = new Date(formData.retreat_start_date);
      const end = new Date(formData.retreat_end_date);
      if (start > end) {
        toast.error('Retreat start date must be before or equal to retreat end date');
        return false;
      }
    }

    if (formData.facility_start_date && formData.facility_end_date) {
      const start = new Date(formData.facility_start_date);
      const end = new Date(formData.facility_end_date);
      if (start > end) {
        toast.error('Facility start date must be before or equal to facility end date');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep1()) return;

    if (!memoDraft) {
      const seedParams = buildConferenceMemoParams({
        refNumber: formData.ref_number,
        requestDate: new Date().toISOString().split('T')[0],
        caseReference: formData.case_reference,
        conferenceDescription: formData.conference_description,
        conferenceType: formData.conference_type,
        retreatStartDate: formData.retreat_start_date,
        retreatEndDate: formData.retreat_end_date,
        facilityStartDate: formData.facility_start_date,
        facilityEndDate: formData.facility_end_date,
        numberOfPax: formData.number_of_pax,
        venue: formData.venue,
        location: formData.location,
        budgetEstimate: undefined,
        fromDepartment: 'HIGH COURT SUPPORT OFFICE - ORHC',
        additionalNotes: undefined,
        judgeNames: formData.judge_names.filter((n) => n.trim()),
        supportingStaff: formData.supporting_staff,
        driversAndGuardsCount: formData.drivers_and_guards_count,
        secretariatPax: formData.secretariat_pax,
        crestUrl: CREST_URL,
      });
      setMemoDraft(draftFromParams(seedParams));
    }

    setCurrentStep(2);
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  // ─── Generate and save memo ──────────────────────────────────────────────

  const handleGenerateAndSaveMemo = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    if (!memoDraft) {
      toast.error('Memo draft not initialized');
      return;
    }

    if (!validateStep1()) return;

    setGeneratingFormat(format);
    setIsSavingMemo(true);

    try {
      const memoParams = buildMemoParamsFromDraft(memoDraft, CREST_URL, formData);

      const blob = format === 'pdf'
        ? await generateConferenceMemoPdf(memoParams)
        : await generateConferenceDocx(memoParams);

      if (!blob) {
        throw new Error('Failed to generate memo - no blob returned');
      }

      // Download the file directly for testing
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${memoDraft.ref || 'conference-memo'}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // Upload to system
      const filename = `${memoDraft.ref || 'conference-memo'}.${format}`;
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      const subject = `REQUEST FOR PROCUREMENT OF CONFERENCE FACILITIES -- ${memoDraft.caseReference}`;

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

      toast.success(`${format.toUpperCase()} memo generated and saved to the system.`);

    } catch (err) {
      console.error(`Failed to generate ${format} memo:`, err);
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to generate document.';
      toast.error(message);
    } finally {
      setGeneratingFormat(null);
      setIsSavingMemo(false);
    }
  };

  // ─── Test PDF Generation ──────────────────────────────────────────────────

  const handleTestPdf = async () => {
    setIsGeneratingTest(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const testParams: ConferenceMemoParams = {
        ref: 'TEST/001',
        date: today,
        to: 'TEST RECIPIENT',
        caseReference: 'TEST MEMO - CONFERENCE REQUEST',
        conferenceDescription: 'test bench handling a sample matter',
        bodyText: 'This is a test memo generated from the conference modal.',
        conferenceDetailsText: 'The test conference will be held at the test venue.',
        closingText: 'Kindly approve the test conference.',
        conferenceType: 'retreat',
        retreatStartDate: formData.retreat_start_date || today,
        retreatEndDate: formData.retreat_end_date || today,
        facilityStartDate: formData.facility_start_date || today,
        facilityEndDate: formData.facility_end_date || today,
        numberOfPax: formData.number_of_pax || 10,
        venue: formData.venue || 'Test Venue',
        location: formData.location || 'Test Location',
        crestUrl: CREST_URL,
        fromDepartment: 'HIGH COURT SUPPORT OFFICE - ORHC',
        fromName: 'JOSLYNE NDUBI',
        fromTitle: 'HIGH COURT SUPPORT OFFICE-ORHC',
        ccList: ['Test CC 1', 'Test CC 2'],
        budgetEstimate: undefined,
        judgeNames: [],
        supportingStaff: formData.supporting_staff || 7,
        driversAndGuardsCount: formData.drivers_and_guards_count || 7,
        secretariatPax: formData.secretariat_pax || 2,
        footerEmblemUrl: FOOTER_EMBLEM_URL,
      };

      console.log('Generating test PDF with params:', testParams);
      const blob = await generateConferenceMemoPdf(testParams);

      if (!blob) {
        throw new Error('Test PDF generation returned no blob');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-memo.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success('Test PDF generated successfully!');
    } catch (err) {
      console.error('Test PDF generation failed:', err);
      toast.error(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  // ─── Handle create/update ────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    try {
      // NOTE: CreateConferenceRequestInput (backend contract) still only knows about
      // `particulars` / `start_date` / `end_date` from the old single-date-range form.
      // Until that type is updated to accept the richer fields below, we derive the
      // legacy fields from the new ones so the record still saves something meaningful.
      // TODO: update CreateConferenceRequestInput to accept ref_number, case_reference,
      // conference_description, conference_type, retreat_start_date/retreat_end_date,
      // facility_start_date/facility_end_date, venue, location, judge_names,
      // supporting_staff, drivers_and_guards_count, secretariat_pax directly — once done,
      // this derivation block can be removed and the object below sent as-is.
      const particulars = [
        formData.case_reference.trim(),
        formData.conference_description.trim(),
        formData.venue.trim() && formData.location.trim()
          ? `Venue: ${formData.venue.trim()}, ${formData.location.trim()}`
          : '',
      ]
        .filter(Boolean)
        .join(' — ');

      const payload = {
        // Legacy fields required by the current CreateConferenceRequestInput contract
        particulars,
        start_date: formData.retreat_start_date,
        end_date: formData.retreat_end_date,
        number_of_pax: formData.number_of_pax,

        // Richer fields — kept alongside for forward-compatibility; harmless if the
        // backend doesn't yet recognize them, and ready to use once the type is updated.
        ref_number: formData.ref_number.trim(),
        case_reference: formData.case_reference.trim(),
        conference_description: formData.conference_description.trim(),
        conference_type: formData.conference_type,
        retreat_start_date: formData.retreat_start_date,
        retreat_end_date: formData.retreat_end_date,
        facility_start_date: formData.facility_start_date,
        facility_end_date: formData.facility_end_date,
        venue: formData.venue.trim(),
        location: formData.location.trim(),
        judge_names: formData.judge_names.filter((n) => n.trim()),
        supporting_staff: formData.supporting_staff,
        drivers_and_guards_count: formData.drivers_and_guards_count,
        secretariat_pax: formData.secretariat_pax,
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

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Generating Word…',
    pdf: 'Generating PDF…',
  };

  const canGenerateMemo = !!memoDraft && !generatingFormat && !isSavingMemo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-[#1a3d1c]">
            {isEditing ? 'Edit Conference Request' : 'New Conference Request'}
          </h3>
          <div className="flex items-center gap-2">
            {/* Test button - remove in production */}
            <button
              onClick={handleTestPdf}
              disabled={isGeneratingTest}
              className="text-xs text-stone-400 hover:text-stone-600"
              title="Test PDF Generation"
            >
              {isGeneratingTest ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
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
              <span className="text-xs font-medium">Conference Details</span>
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
              {/* Registry reference */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Registry Ref Number *</label>
                  <input
                    type="text"
                    name="ref_number"
                    value={formData.ref_number}
                    onChange={handleChange}
                    placeholder="e.g., RHC/AIE/112"
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Conference Type *</label>
                  <input
                    type="text"
                    name="conference_type"
                    value={formData.conference_type}
                    onChange={handleChange}
                    placeholder="e.g., retreat"
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              {/* Case reference (subject) & description (body) */}
              <div>
                <label className={labelClasses}>Case Reference (used in Subject line) *</label>
                <input
                  type="text"
                  name="case_reference"
                  value={formData.case_reference}
                  onChange={handleChange}
                  placeholder="e.g., BENCH PETITION E051 OF 2026"
                  className={inputClasses}
                  required
                />
              </div>
              <div>
                <label className={labelClasses}>Conference Description (used in body sentence) *</label>
                <textarea
                  name="conference_description"
                  value={formData.conference_description}
                  onChange={handleChange}
                  placeholder="e.g., three-Judge bench handling Constitution Petition E051 of 2026"
                  rows={2}
                  className={`${inputClasses} resize-none`}
                  required
                />
              </div>

              {/* Retreat dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Retreat Start Date *</label>
                  <input
                    type="date"
                    name="retreat_start_date"
                    value={formData.retreat_start_date}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Retreat End Date *</label>
                  <input
                    type="date"
                    name="retreat_end_date"
                    value={formData.retreat_end_date}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              {/* Facility booking dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Facility Booking Start Date *</label>
                  <input
                    type="date"
                    name="facility_start_date"
                    value={formData.facility_start_date}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Facility Booking End Date *</label>
                  <input
                    type="date"
                    name="facility_end_date"
                    value={formData.facility_end_date}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-stone-400">
                Facility booking dates may be a narrower window than the overall retreat dates
                above — they populate the conference facilities table.
              </p>

              {/* Venue / Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Venue *</label>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    placeholder="e.g., Sarova Woodlands"
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Location *</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., Nakuru"
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              {/* Judges */}
              <div>
                <label className={labelClasses}>Bench (Judge Names) *</label>
                <div className="space-y-2">
                  {formData.judge_names.map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => updateJudgeName(i, e.target.value)}
                        placeholder="e.g., Hon. Justice Francis Gikonyo"
                        className={inputClasses}
                      />
                      <button
                        type="button"
                        onClick={() => removeJudgeName(i)}
                        className="shrink-0 text-stone-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addJudgeName}
                    className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-[#1a3d1c]"
                  >
                    <Plus size={12} /> Add judge
                  </button>
                </div>
              </div>

              {/* Headcounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Number of Participants (PAX) *</label>
                  <input
                    type="number"
                    name="number_of_pax"
                    value={formData.number_of_pax || ''}
                    onChange={handleNumberChange}
                    placeholder="e.g., 5"
                    min="1"
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Supporting Staff (body text) *</label>
                  <input
                    type="number"
                    name="supporting_staff"
                    value={formData.supporting_staff || ''}
                    onChange={handleNumberChange}
                    placeholder="e.g., 11"
                    min="0"
                    className={inputClasses}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Drivers &amp; Guards (table row) *</label>
                  <input
                    type="number"
                    name="drivers_and_guards_count"
                    value={formData.drivers_and_guards_count || ''}
                    onChange={handleNumberChange}
                    placeholder="e.g., 7"
                    min="0"
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Secretariat Pax</label>
                  <input
                    type="number"
                    name="secretariat_pax"
                    value={formData.secretariat_pax || ''}
                    onChange={handleNumberChange}
                    placeholder="2"
                    min="0"
                    className={inputClasses}
                  />
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-stone-400">
                Supporting Staff and Drivers &amp; Guards are separate counts — supporting staff
                appears in the body text, while drivers &amp; guards is its own table row and is
                not derived from the supporting staff count.
              </p>
            </div>
          )}

          {currentStep === 2 && memoDraft && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-400">
                  Edit any field directly in the letter below — it's exactly what gets saved.
                </p>
                <div className="relative">
                  <GoldButton
                    size="sm"
                    onClick={() => setShowDownloadMenu((v) => !v)}
                    disabled={!canGenerateMemo}
                    icon={generatingFormat ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
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
                      console.warn('Failed to load crest image');
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
                        REQUEST FOR PROCUREMENT OF CONFERENCE FACILITIES --
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
                    rows={2}
                    className={`${docFieldClasses} block w-full resize-none text-justify`}
                  />

                  <textarea
                    value={memoDraft.conferenceDetailsText}
                    onChange={(e) => updateDraft('conferenceDetailsText', e.target.value)}
                    rows={3}
                    className={`${docFieldClasses} block w-full resize-none text-justify`}
                  />
                </div>

                {/* Table */}
                <div className="my-4">
                  <p className="text-[11px] italic text-stone-400 mb-2">
                    Table generated from Step 1 data (facility booking dates):
                  </p>
                  <div className="border border-stone-300 rounded overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-[#c9a84c] text-[#1a3d1c]">
                        <tr>
                          <th className="border border-stone-300 px-3 py-1.5 text-left font-bold">S/No</th>
                          <th className="border border-stone-300 px-3 py-1.5 text-left font-bold">Particulars</th>
                          <th className="border border-stone-300 px-3 py-1.5 text-left font-bold">Dates</th>
                          <th className="border border-stone-300 px-3 py-1.5 text-left font-bold">Pax</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="odd:bg-white even:bg-[#faf9f6]">
                          <td className="border border-stone-300 px-3 py-1.5 text-center">1</td>
                          <td className="border border-stone-300 px-3 py-1.5">Full day conference facilities</td>
                          <td className="border border-stone-300 px-3 py-1.5">
                            {formatDateDisplay(formData.facility_start_date)} to {formatDateDisplay(formData.facility_end_date)}
                          </td>
                          <td className="border border-stone-300 px-3 py-1.5 text-center">{formData.number_of_pax}</td>
                        </tr>
                        <tr className="odd:bg-white even:bg-[#faf9f6]">
                          <td className="border border-stone-300 px-3 py-1.5 text-center">2</td>
                          <td className="border border-stone-300 px-3 py-1.5">Secretariat room</td>
                          <td className="border border-stone-300 px-3 py-1.5">
                            {formatDateDisplay(formData.facility_start_date)} to {formatDateDisplay(formData.facility_end_date)}
                          </td>
                          <td className="border border-stone-300 px-3 py-1.5 text-center">{formData.secretariat_pax}</td>
                        </tr>
                        <tr className="odd:bg-white even:bg-[#faf9f6]">
                          <td className="border border-stone-300 px-3 py-1.5 text-center">3</td>
                          <td className="border border-stone-300 px-3 py-1.5">Meals only (Drivers & Guards)</td>
                          <td className="border border-stone-300 px-3 py-1.5">
                            {formatDateDisplay(formData.facility_start_date)} to {formatDateDisplay(formData.facility_end_date)}
                          </td>
                          <td className="border border-stone-300 px-3 py-1.5 text-center">{formData.drivers_and_guards_count}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Closing */}
                <textarea
                  value={memoDraft.closingText}
                  onChange={(e) => updateDraft('closingText', e.target.value)}
                  rows={2}
                  className={`${docFieldClasses} block w-full resize-none text-justify mb-4`}
                />

                {/* Signature Block */}
                <div className="mt-8">
                  <div className="h-12" />
                  <input
                    value={memoDraft.fromName}
                    onChange={(e) => updateDraft('fromName', e.target.value)}
                    className={`${docFieldClasses} block w-full font-bold mb-0.5`}
                  />
                  <input
                    value={memoDraft.fromTitle}
                    onChange={(e) => updateDraft('fromTitle', e.target.value)}
                    className={`${docFieldClasses} block w-full text-sm underline`}
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
                      console.warn('Failed to load footer emblem');
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
                      icon={documentsUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
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
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${documentStatusColor(doc.status)}`}
                              >
                                {doc.status.replace('_', ' ')}
                              </span>
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

      {showDownloadMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowDownloadMenu(false)} />
      )}
    </div>
  );
};