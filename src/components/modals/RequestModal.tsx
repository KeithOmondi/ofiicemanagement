// src/components/modals/RequestModal.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createMedicalClaim,
  updateMedicalClaimStatus,
  createGeneralRequest,
  updateGeneralRequest,
  fetchMedicalClaims,
  fetchGeneralRequests,
  fetchHelpDeskStats,
  type MedicalClaim,
  type GeneralRequest,
  type Status,
  type CreateMedicalClaimInput,
  type CreateGeneralRequestInput,
  type RequestType,
  type RemarkType,
} from '../../store/slices/helpdeskSlice';
import {
  selectCurrentUser,
  selectUsersSignatureLoading,
  uploadSignature,
  deleteSignature,
} from '../../store/slices/userSlice';
import {
  searchJudges,
  selectAllJudges,
  selectJudgesLoading,
} from '../../store/slices/JudgesSlice';
import {
  X,
  Loader2,
  Save,
  User,
  Calendar,
  FileSignature,
  Briefcase,
  Stethoscope,
  FileText,
  CreditCard,
  Mail,
  Shield,
  MapPin,
  Hash,
  FileSpreadsheet,
  Edit,
  Download,
  ChevronDown,
  Upload,
  Trash2,
  Image,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import {
  uploadHelpdeskDocument,
  linkHelpdeskDocument,
  type DocumentEntityType,
  type DocumentFormat,
} from '../../store/slices/helpdeskDocumentsSlice';
import type { Judge } from '../../types/judges.types';

// ─── Import memo generators ────────────────────────────────────────────────
// Medical claims
import { generateMemoDocx } from '../../utils/generateMemoDocx';
import { generateMemoPdf } from '../../utils/generateMemoPdf';
// General requests (Driver, Bodyguard, Firearm, etc.)
import { generateGRMemoDocx } from '../../utils/generateGRMemoDocx';
import { generateGRMemoPdf } from '../../utils/generateGRMemoPdf';
import type { GRMemoParams } from '../../utils/generateGRMemoPdf';

// ─── Constants ──────────────────────────────────────────────────────────────

const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1784363826/ORHC_L_crclut.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

// Updated request type labels & suggestions
const REQUEST_TYPE_LABELS: Record<string, string> = {
  Driver: 'Driver',
  Bodyguard: 'Bodyguard',
  'Residence Sentry': 'Residence Sentry',
  Firearm: 'Firearm',
};

const REQUEST_TYPE_SUGGESTIONS: string[] = ['Driver', 'Bodyguard', 'Residence Sentry', 'Firearm'];

// Types that trigger officer details (Name, Rank, Force Number, Station)
const OFFICER_DETAIL_TYPES = new Set(['Driver', 'Bodyguard', 'Residence Sentry']);

const REMARK_TYPE_LABELS: Record<RemarkType, string> = {
  Onboarding: 'Onboarding',
  Release: 'Release',
};

/*const POLICE_SERVICE_LABELS: Record<string, string> = {
  kenya: 'Kenya Police Service',
  administration: 'Administration Police Service',
};*/

const POLICE_SERVICE_ADDRESS: Record<string, string> = {
  kenya: 'The Deputy Inspector General,\nKenya Police Service,\nVigilance House,\nP.O. BOX 53258-00200-00100\nNAIROBI.',
  administration: 'The Deputy Inspector General,\nAdministration Police Service,\nJogoo House,\nP.O. BOX 53258-00200-00100\nNAIROBI.',
};

const DEFAULT_POLICE_SERVICE: 'kenya' | 'administration' = 'kenya';

// Allowed statuses – we now only use these three
const ALLOWED_STATUSES: Status[] = ['Active', 'Rejected', 'Resolved'];

// ─── Types ──────────────────────────────────────────────────────────────────

export type RequestModalMode = 'medical' | 'general' | 'security';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: RequestModalMode;
  editingItem?: MedicalClaim | GeneralRequest | null;
}

// Extended general form – updated fields
interface ExtendedGeneralForm extends Omit<CreateGeneralRequestInput, 'request_type' | 'request'> {
  request_type: string;
  request?: string;
  email?: string;
  send_email?: boolean;
  police_service: 'kenya' | 'administration';
  rank?: string;
  reporting_date?: string;
  officer_station?: string; // officer's current posting, distinct from the judge's station
}

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

// ─── Step 1: Basic Info Form ──────────────────────────────────────────────

interface BasicInfoFormProps {
  mode: RequestModalMode;
  medicalForm: CreateMedicalClaimInput;
  generalForm: ExtendedGeneralForm;
  onMedicalChange: (field: keyof CreateMedicalClaimInput, value: string | number) => void;
  onGeneralChange: (field: keyof ExtendedGeneralForm | 'email' | 'send_email', value: string | number | boolean) => void;
  // Judge autocomplete props
  judgeSearchTerm: string;
  onJudgeSearchTermChange: (term: string) => void;
  judgeSuggestions: Judge[];
  judgeSearchLoading: boolean;
  onJudgeSelect: (judge: Judge) => void;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  mode,
  medicalForm,
  generalForm,
  onMedicalChange,
  onGeneralChange,
  judgeSearchTerm,
  onJudgeSearchTermChange,
  judgeSuggestions,
  judgeSearchLoading,
  onJudgeSelect,
}) => {
  if (mode === 'medical') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope size={16} className="text-[#c9a84c]" />
            <h4 className="text-sm font-semibold text-stone-800">Medical Claim Details</h4>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <FieldLabel required>Officer's Name</FieldLabel>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={medicalForm.officer_name || ''}
                  onChange={(e) => onMedicalChange('officer_name', e.target.value)}
                  placeholder="e.g. Hon. Justice Mella"
                  className={`${inputClasses} pl-9`}
                  required
                />
              </div>
            </div>
            <div>
              <FieldLabel required>Claim Amount (KES)</FieldLabel>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={medicalForm.claim_amount || ''}
                  onChange={(e) => onMedicalChange('claim_amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className={`${inputClasses} pl-9`}
                  required
                />
              </div>
            </div>
            <div>
              <FieldLabel>Date Forwarded to DHR</FieldLabel>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="date"
                  value={medicalForm.date_forwarded_dhr || ''}
                  onChange={(e) => onMedicalChange('date_forwarded_dhr', e.target.value)}
                  className={`${inputClasses} pl-9`}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Remarks</FieldLabel>
              <div className="relative">
                <FileSignature size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={medicalForm.remarks || ''}
                  onChange={(e) => onMedicalChange('remarks', e.target.value)}
                  placeholder="Additional notes"
                  className={`${inputClasses} pl-9`}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <select
                  value={medicalForm.status || 'Active'}
                  onChange={(e) => onMedicalChange('status', e.target.value as Status)}
                  className={`${inputClasses} pl-9 appearance-none bg-white`}
                >
                  <option value="Active">Active</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── General / Security Request (updated layout) ────────────────────────

  const showOfficerDetails = OFFICER_DETAIL_TYPES.has(generalForm.request_type.trim());
  const isFirearm = generalForm.request_type.trim() === 'Firearm';

  return (
    <div className="space-y-4">
      {/* Section 1: Judge Info */}
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Judge Info</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FieldLabel required>Judge's Name</FieldLabel>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={judgeSearchTerm}
                onChange={(e) => onJudgeSearchTermChange(e.target.value)}
                placeholder="Search judge by name..."
                className={`${inputClasses} pl-9`}
                autoComplete="off"
              />
              {judgeSearchLoading && (
                <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
              )}
              {/* Suggestions dropdown */}
              {judgeSuggestions.length > 0 && judgeSearchTerm.trim() !== '' && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-stone-200 bg-white shadow-lg">
                  {judgeSuggestions.map((judge) => (
                    <li
                      key={judge.id}
                      className="cursor-pointer px-4 py-2 text-sm text-stone-800 hover:bg-stone-100"
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevent blur before click
                        onJudgeSelect(judge);
                      }}
                    >
                      {judge.name} {judge.pj_number && `(${judge.pj_number})`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-1 text-[10px] text-stone-400">
              Type to search from the judges list, or enter a name manually.
            </p>
          </div>
          <div>
            <FieldLabel>Station</FieldLabel>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={generalForm.location || ''}
                onChange={(e) => onGeneralChange('location', e.target.value)}
                placeholder="e.g. Milimani Law Courts"
                className={`${inputClasses} pl-9`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Request Details */}
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Request Details</h4>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <FieldLabel required>Type of Request</FieldLabel>
            <div className="relative">
              <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <select
                value={generalForm.request_type || ''}
                onChange={(e) => onGeneralChange('request_type', e.target.value)}
                className={`${inputClasses} pl-9 appearance-none bg-white`}
                required
              >
                <option value="">Select request type...</option>
                {REQUEST_TYPE_SUGGESTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[10px] text-stone-400">
              For Driver, Bodyguard, or Residence Sentry, please fill in the officer details below.
            </p>
          </div>

          {showOfficerDetails && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2 border-t border-stone-200 pt-4">
              <div>
                <FieldLabel>Name of Officer</FieldLabel>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={generalForm.officer_name || ''}
                    onChange={(e) => onGeneralChange('officer_name', e.target.value)}
                    placeholder="e.g. CPL. Leonard Michubu"
                    className={`${inputClasses} pl-9`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Rank</FieldLabel>
                <div className="relative">
                  <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={generalForm.rank || ''}
                    onChange={(e) => onGeneralChange('rank', e.target.value)}
                    placeholder="e.g. Corporal"
                    className={`${inputClasses} pl-9`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Force Number</FieldLabel>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={generalForm.force_number || ''}
                    onChange={(e) => onGeneralChange('force_number', e.target.value)}
                    placeholder="e.g. 122585"
                    className={`${inputClasses} pl-9`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Officer's Current Station</FieldLabel>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={generalForm.officer_station || ''}
                    onChange={(e) => onGeneralChange('officer_station', e.target.value)}
                    placeholder="e.g. Embakasi B. Campus"
                    className={`${inputClasses} pl-9`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Firearm details ── */}
          {isFirearm && (
            <div className="mt-2 border-t border-stone-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Officer Assigned</FieldLabel>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={generalForm.officer_assigned || ''}
                      onChange={(e) => onGeneralChange('officer_assigned', e.target.value)}
                      placeholder="Name of officer assigned (e.g., CPL. Otieno)"
                      className={`${inputClasses} pl-9`}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-stone-400">
                    If an officer is assigned, the firearm type becomes required.
                  </p>
                </div>
                <div>
                  <FieldLabel required={!!generalForm.officer_assigned}>Firearm Type</FieldLabel>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={generalForm.firearm_type || ''}
                      onChange={(e) => onGeneralChange('firearm_type', e.target.value)}
                      placeholder="e.g., G19, AK47, Shotgun"
                      className={`${inputClasses} pl-9 ${generalForm.officer_assigned ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500' : ''}`}
                    />
                  </div>
                  {generalForm.officer_assigned && !generalForm.firearm_type?.trim() && (
                    <p className="mt-1 text-[10px] text-red-500">Firearm type is required when an officer is assigned.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Tracking */}
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Tracking</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Request Date</FieldLabel>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="date"
                value={generalForm.request_date || ''}
                onChange={(e) => onGeneralChange('request_date', e.target.value)}
                className={`${inputClasses} pl-9`}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Reporting Date</FieldLabel>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="date"
                value={generalForm.reporting_date || ''}
                onChange={(e) => onGeneralChange('reporting_date', e.target.value)}
                className={`${inputClasses} pl-9`}
              />
            </div>
          </div>
          {!isFirearm && (
            <div>
              <FieldLabel>Officer Assigned (optional)</FieldLabel>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={generalForm.officer_assigned || ''}
                  onChange={(e) => onGeneralChange('officer_assigned', e.target.value)}
                  placeholder="Name of assigned officer"
                  className={`${inputClasses} pl-9`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Remarks + Email */}
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileSignature size={16} className="text-[#c9a84c]" />
          <h4 className="text-sm font-semibold text-stone-800">Remarks</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Remark Type</FieldLabel>
            <div className="relative">
              <FileSignature size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <select
                value={generalForm.remark_type || ''}
                onChange={(e) => onGeneralChange('remark_type', e.target.value as RemarkType | '')}
                className={`${inputClasses} pl-9 appearance-none bg-white`}
              >
                <option value="">Select...</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Release">Release</option>
              </select>
            </div>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <div className="relative">
              <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <select
                value={generalForm.status || 'Active'}
                onChange={(e) => onGeneralChange('status', e.target.value as Status)}
                className={`${inputClasses} pl-9 appearance-none bg-white`}
              >
                <option value="Active">Active</option>
                <option value="Rejected">Rejected</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Remarks (free text)</FieldLabel>
            <div className="relative">
              <FileSignature size={16} className="absolute left-3 top-3 text-stone-400" />
              <textarea
                value={generalForm.remarks || ''}
                onChange={(e) => onGeneralChange('remarks', e.target.value)}
                placeholder="Additional remarks"
                className={`${inputClasses} pl-9 min-h-[60px] resize-y`}
              />
            </div>
          </div>

          {/* Email Notification */}
          <div className="md:col-span-2 mt-2 border-t border-stone-200 pt-4">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="send_email_general"
                checked={generalForm.send_email || false}
                onChange={(e) => onGeneralChange('send_email', e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 text-[#c9a84c] focus:ring-[#c9a84c]"
              />
              <label htmlFor="send_email_general" className="text-sm font-medium text-stone-700 flex items-center gap-2">
                <Mail size={14} className="text-stone-400" />
                Send Acknowledgement Email
                <span className="text-xs text-stone-400 font-normal">
                  (Department Head control)
                </span>
              </label>
            </div>

            {generalForm.send_email && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <FieldLabel required>Recipient Email</FieldLabel>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    value={generalForm.email || ''}
                    onChange={(e) => onGeneralChange('email', e.target.value)}
                    placeholder="judge@court.go.ke"
                    className={`${inputClasses} pl-9 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500`}
                  />
                </div>
                <p className="mt-1 text-[10px] text-stone-400">
                  The judge will receive a confirmation email with their ticket number.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Step 2: Memo Preview ──────────────────────────────────────────────────

interface MemoPreviewProps {
  mode: RequestModalMode;
  medicalForm: CreateMedicalClaimInput;
  generalForm: ExtendedGeneralForm;
  onEdit: () => void;
  signatureUrl?: string | null;
  onDocumentUploaded?: (documentId: string) => void;
}

type DownloadFormat = 'docx' | 'pdf';

const MemoPreview: React.FC<MemoPreviewProps> = ({
  mode,
  medicalForm,
  generalForm,
  onEdit,
  signatureUrl,
  onDocumentUploaded,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [creationDetails] = useState(() => {
    const now = new Date();
    const day = now.getDate();
    const ordinal = (n: number) => {
      const v = n % 100;
      if (v >= 11 && v <= 13) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    const monthYear = now.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
    return {
      dateStr: `${day}${ordinal(day)} ${monthYear}`,
      refSuffix: (Date.now() % 1000).toString().padStart(3, '0'),
    };
  });

  const memoData = useMemo(() => {
    const { dateStr, refSuffix } = creationDetails;

    if (mode === 'medical') {
      return {
        to: 'DIRECTOR OF HUMAN RESOURCES',
        from: 'OFFICE OF THE REGISTRAR, HIGH COURT',
        ref: `RHC/MED/${refSuffix}`,
        date: dateStr,
        subject: `MEDICAL EXPENSE CLAIM FOR ${medicalForm.officer_name?.toUpperCase() || 'OFFICER'}`,
        body: `This is to request the processing of a medical expense claim for ${medicalForm.officer_name || 'the officer'} in the amount of KES ${(medicalForm.claim_amount || 0).toLocaleString()}. The claim was forwarded to DHR on ${medicalForm.date_forwarded_dhr || 'N/A'}.`,
        rows: [
          { label: 'Officer Name', value: medicalForm.officer_name || 'N/A' },
          { label: 'Claim Amount (KES)', value: (medicalForm.claim_amount || 0).toLocaleString() },
          { label: 'Date Forwarded to DHR', value: medicalForm.date_forwarded_dhr || 'N/A' },
          { label: 'Remarks', value: medicalForm.remarks || 'N/A' },
        ],
        grandTotal: medicalForm.claim_amount || 0,
        signatoryName: currentUser?.full_name || '',
        copyTo: [],
        policeService: '',
      };
    }

    // ─── General / Security letter ──────────────────────────────────────

    const requestTypeRaw = generalForm.request_type?.trim() || 'request';
    const requestTypeLabel = REQUEST_TYPE_LABELS[requestTypeRaw] || requestTypeRaw;
    const requestTypeLower = requestTypeLabel.toLowerCase();
    const judge = generalForm.judge_name || 'the Judge';
    const station = generalForm.location || 'the High Court';
    const officer = generalForm.officer_name || '';
    const rank = generalForm.rank || '';
    const force = generalForm.force_number || '';
    const officerStation = generalForm.officer_station?.trim() || '';
    //const policeService = POLICE_SERVICE_LABELS[generalForm.police_service] || 'Kenya Police Service';

    // ─── Build letter body with bold markers ──────────────────────────────
    let body = `Greetings from the Office of the Registrar, High Court.\n\n`;

    body += `Pursuant to our continued collaboration in facilitating judicial functions, we kindly request the posting of a ${requestTypeLower} to the ${judge} of the High Court at ${station}.\n\n`;

    if (officer || force) {
      body += `In this regard, we propose that **`;
      if (force) body += `No. ${force} `;
      body += `${officer}**`;
      if (rank) body += `, ${rank},`;
      if (officerStation) body += ` currently stationed at ${officerStation},`;
      body += ` be seconded to serve as the Judge's ${requestTypeLower}.\n\n`;
    }

    if (generalForm.reporting_date) {
      body += `The officer is expected to report on ${generalForm.reporting_date}.\n\n`;
    }

    body += `Your prompt consideration of this request will ensure continuity of essential judicial support services and the security of the Judge.\n\n`;
    body += `Please accept the assurances of my highest consideration`;

    // Subject — matches reference letter: type + judge + station, no officer name
    let subject = `REQUEST FOR ${requestTypeLabel.toUpperCase()} FOR ${judge.toUpperCase()}`;
    if (station) subject += ` – ${station.toUpperCase()}`;

    // Copy-to list — judge entry carries the station on its own indented continuation line
    const copyTo = [
      { label: '1.', value: `${judge}\n${station}` },
      { label: '2.', value: 'In-Charge, Judiciary Police Unit' },
    ];

    const toAddress = POLICE_SERVICE_ADDRESS[generalForm.police_service] || POLICE_SERVICE_ADDRESS.kenya;

    return {
      to: toAddress,
      from: 'REGISTRAR, HIGH COURT',
      ref: `RHC/10`,
      date: dateStr,
      subject,
      body,
      rows: [
        { label: 'Judge Name', value: generalForm.judge_name || 'N/A' },
        { label: 'Judge Station', value: generalForm.location || 'N/A' },
        { label: 'Request Type', value: requestTypeLabel },
        { label: 'Request Date', value: generalForm.request_date || 'N/A' },
        { label: 'Reporting Date', value: generalForm.reporting_date || 'N/A' },
        { label: 'Officer Name', value: generalForm.officer_name || 'N/A' },
        { label: 'Rank', value: generalForm.rank || 'N/A' },
        { label: 'Force Number', value: generalForm.force_number || 'N/A' },
        { label: "Officer's Station", value: officerStation || 'N/A' },
        { label: 'Remark Type', value: generalForm.remark_type ? REMARK_TYPE_LABELS[generalForm.remark_type] : 'N/A' },
        { label: 'Remarks', value: generalForm.remarks || 'N/A' },
      ],
      grandTotal: 0,
      signatoryName: currentUser?.full_name || '',
      copyTo,
      policeService: generalForm.police_service,
    };
  }, [mode, medicalForm, generalForm, currentUser?.full_name, creationDetails]);

  // ─── Editable fields ────────────────────────────────────────────────────
  const [toField, setToField] = useState(() => memoData.to);
  const [fromField, setFromField] = useState(() => memoData.from);
  const [refField, setRefField] = useState(() => memoData.ref);
  const [dateField, setDateField] = useState(() => memoData.date);
  const [subjectField, setSubjectField] = useState(() => memoData.subject);
  const [bodyText, setBodyText] = useState(() => memoData.body);
  const [signatoryName, setSignatoryName] = useState(() => memoData.signatoryName);
  const [copyToList, setCopyToList] = useState(() => memoData.copyTo.map(c => c.value).join('\n'));
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);

  const editableLineClasses =
    'flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none';

  const handleDownload = async (format: DownloadFormat) => {
    setShowDownloadMenu(false);
    setDownloadingFormat(format);

    try {
      const shared = {
        to: toField,
        from: fromField,
        ref: refField,
        date: dateField,
        subject: subjectField,
        bodyText,
        rows: memoData.rows.map((row) => ({
          judgeName: row.label,
          pjNumber: row.value,
          designation: '',
          rate: 0,
          days: 0,
          total: 0,
        })),
        grandTotal: memoData.grandTotal,
        amountInWords: '',
        signatoryName,
        copyTo: copyToList.split('\n').filter(line => line.trim()),
      };

      let blob: Blob | null = null;

      // ─── Choose generator based on mode ──────────────────────────────
      if (mode === 'medical') {
        // Medical claims use the generic memo generator with tables
        if (format === 'docx') {
          blob = await generateMemoDocx({
            ...shared,
            crestUrl: JUDICIARY_CREST_SRC,
            signatureUrl: signatureUrl || undefined,
          });
        } else if (format === 'pdf') {
          blob = await generateMemoPdf({
            ...shared,
            crestUrl: JUDICIARY_CREST_SRC,
            signatureUrl: signatureUrl || undefined,
          });
        }
      } else {
        // General / Security requests use the formal letter generator
        const grParams: GRMemoParams = {
          to: toField,
          from: fromField,
          ref: refField,
          date: dateField,
          subject: subjectField,
          bodyText: bodyText,
          copyTo: memoData.copyTo, // already array of { label, value }
          signatoryName: signatoryName,
          crestUrl: JUDICIARY_CREST_SRC,
          signatureUrl: signatureUrl || undefined,
          fromDepartment: fromField,
        };

        if (format === 'docx') {
          blob = await generateGRMemoDocx(grParams);
        } else if (format === 'pdf') {
          blob = await generateGRMemoPdf(grParams);
        }
      }

      if (!blob) throw new Error('Generator returned no blob');

      const safeRef = (refField || 'memo').replace(/[\\/:*?"<>|]/g, '-');
      const filename = `${safeRef}.${format}`;

      const entityTypeMap: Record<RequestModalMode, DocumentEntityType> = {
        medical: 'medicalClaim',
        general: 'generalRequest',
        security: 'generalRequest',
      };

      const result = await dispatch(
        uploadHelpdeskDocument({
          blob,
          filename,
          ref: refField,
          subject: subjectField,
          entity_type: entityTypeMap[mode],
          format: format as DocumentFormat,
          request_type: mode !== 'medical' ? (generalForm.request_type as unknown as RequestType) : undefined,
          judge_name: mode !== 'medical' ? generalForm.judge_name : undefined,
          remark_type: mode !== 'medical' ? (generalForm.remark_type as RemarkType) : undefined,
        })
      ).unwrap();

      onDocumentUploaded?.(result.id);
      toast.success(`${format.toUpperCase()} document saved to the system.`);
    } catch (err) {
      console.error(`Failed to generate/upload memo:`, err);
      toast.error('Failed to save document. Please try again.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const downloadLabels: Record<DownloadFormat, string> = {
    docx: 'Preparing Word…',
    pdf: 'Preparing PDF…',
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (mode === 'medical') {
    // Medical memo preview (unchanged)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-[#c9a84c]" />
            Memo Preview
          </h4>
          <div className="flex gap-2">
            <GhostButton onClick={onEdit} icon={<Edit size={12} />}>
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
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Internal memo layout (unchanged) */}
        <div className="border border-stone-300 bg-white shadow-sm font-serif text-black" style={{ minHeight: '297mm' }}>
          <div className="flex flex-col" style={{ minHeight: '297mm' }}>
            <div className="p-10">
              <div className="flex justify-center mb-3">
                <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-20 w-auto object-contain" />
              </div>
              <div className="text-center mb-6">
                <p className="text-lg font-bold uppercase leading-snug">OFFICE OF THE REGISTRAR HIGH COURT</p>
                <p className="text-lg font-bold uppercase leading-snug border-b-2 border-black inline-block pb-2 px-1">INTERNAL MEMO</p>
              </div>
              <div className="space-y-3 text-sm font-bold mb-8">
                <div className="flex"><span className="w-24 shrink-0">TO</span><span className="w-4 shrink-0">:</span><input type="text" value={toField} onChange={(e) => setToField(e.target.value)} className={`${editableLineClasses} uppercase`} /></div>
                <div className="flex"><span className="w-24 shrink-0">FROM</span><span className="w-4 shrink-0">:</span><input type="text" value={fromField} onChange={(e) => setFromField(e.target.value)} className={`${editableLineClasses} uppercase`} /></div>
                <div className="flex"><span className="w-24 shrink-0">REF</span><span className="w-4 shrink-0">:</span><input type="text" value={refField} onChange={(e) => setRefField(e.target.value)} className={editableLineClasses} /></div>
                <div className="flex"><span className="w-24 shrink-0">DATE</span><span className="w-4 shrink-0">:</span><input type="text" value={dateField} onChange={(e) => setDateField(e.target.value)} className={editableLineClasses} /></div>
                <div className="flex border-b-2 border-black pb-3"><span className="w-24 shrink-0">SUBJECT</span><span className="w-4 shrink-0">:</span><input type="text" value={subjectField} onChange={(e) => setSubjectField(e.target.value)} className={`${editableLineClasses} uppercase`} /></div>
              </div>
              <div className="space-y-4 text-sm">
                <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={6} className={`${editableLineClasses} block w-full resize-none leading-relaxed`} />
                {memoData.rows.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">Claim Details:</p>
                    <div className="border border-stone-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {memoData.rows.map((row, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                              <td className="px-3 py-1.5 font-medium text-stone-600 border-r border-stone-200 w-1/3">{row.label}</td>
                              <td className="px-3 py-1.5 text-stone-800">{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {memoData.grandTotal > 0 && (
                      <div className="mt-2 text-right font-bold text-[#1a3d1c]">Total: KES {memoData.grandTotal.toLocaleString()}</div>
                    )}
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-stone-200"><p className="text-sm font-bold mt-4">Yours sincerely,</p></div>
              </div>
            </div>
            <div className="flex-1"></div>
            <div className="p-10 pt-0">
              <div className="space-y-1">
                <input type="text" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} placeholder="Signatory name" className={`${editableLineClasses} block text-sm font-bold`} />
                {signatureUrl && <div className="py-1"><img src={signatureUrl} alt="Signature" className="max-h-12 w-auto object-contain" /></div>}
                <input type="text" value={fromField} onChange={(e) => setFromField(e.target.value)} className={`${editableLineClasses} block text-sm font-bold underline uppercase`} />
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
  }

  // ─── Standard Letter layout (general) ──────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-[#c9a84c]" />
          Memo Preview
        </h4>
        <div className="flex gap-2">
          <GhostButton onClick={onEdit} icon={<Edit size={12} />}>Edit Info</GhostButton>
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
                  <button onClick={() => handleDownload('docx')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50">
                    <FileText size={14} className="text-blue-600" /> Word (.docx)
                  </button>
                  <button onClick={() => handleDownload('pdf')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50">
                    <FileText size={14} className="text-red-600" /> PDF (.pdf)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border border-stone-300 bg-white shadow-sm text-black" style={{ minHeight: '297mm', fontFamily: '"Tahoma", sans-serif' }}>
        <div className="flex flex-col" style={{ minHeight: '297mm' }}>
          <div className="p-12">
            <div className="flex items-center gap-4 mb-6" style={{ fontFamily: '"Arial", sans-serif' }}>
              <div className="flex-shrink-0"><img src={JUDICIARY_CREST_SRC} alt="Judiciary crest" className="h-20 w-auto object-contain" /></div>
              <div><p className="text-xs font-bold uppercase tracking-wider text-stone-700">THE JUDICIARY</p><p className="text-base font-bold uppercase leading-tight tracking-wide whitespace-nowrap">OFFICE OF THE REGISTRAR HIGH COURT</p></div>
            </div>
            <div className="flex justify-between text-sm font-medium mb-6" style={{ fontFamily: '"Tahoma", sans-serif' }}>
              <div>Ref: <input type="text" value={refField} onChange={(e) => setRefField(e.target.value)} className={`${editableLineClasses} inline w-auto`} /></div>
              <div><input type="text" value={dateField} onChange={(e) => setDateField(e.target.value)} className={`${editableLineClasses} inline w-auto`} /></div>
            </div>
            <div className="mb-8 whitespace-pre-line text-sm leading-relaxed" style={{ fontFamily: '"Tahoma", sans-serif' }}>
              <textarea value={toField} onChange={(e) => setToField(e.target.value)} rows={4} className={`${editableLineClasses} block w-full resize-none leading-relaxed`} />
            </div>
            <div className="mb-8" style={{ fontFamily: '"Tahoma", sans-serif' }}>
              <p className="text-sm font-bold underline">RE: <input type="text" value={subjectField} onChange={(e) => setSubjectField(e.target.value)} className={`${editableLineClasses} inline w-full underline`} /></p>
            </div>
            <div className="space-y-4 text-sm leading-relaxed mb-10" style={{ fontFamily: '"Tahoma", sans-serif' }}>
              <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={10} className={`${editableLineClasses} block w-full resize-none leading-relaxed`} />
            </div>
            <div className="mt-10" style={{ fontFamily: '"Tahoma", sans-serif' }}>
              <p className="text-sm font-bold">Yours sincerely,</p>
              <div className="mt-10 space-y-1">
                <input type="text" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} placeholder="Signatory name" className={`${editableLineClasses} block text-sm font-bold`} />
                {signatureUrl && <div className="py-1"><img src={signatureUrl} alt="Signature" className="max-h-12 w-auto object-contain" /></div>}
                <input type="text" value={fromField} onChange={(e) => setFromField(e.target.value)} className={`${editableLineClasses} block text-sm font-bold uppercase`} />
              </div>
            </div>
            <div className="mt-16 pt-6 border-t border-stone-200" style={{ fontFamily: '"Tahoma", sans-serif' }}>
              <p className="text-sm font-semibold mb-2">Copy to.</p>
              <textarea value={copyToList} onChange={(e) => setCopyToList(e.target.value)} rows={4} className={`${editableLineClasses} block w-full resize-none text-sm`} />
            </div>
          </div>
          <div className="flex-1"></div>
          <div className="p-12 pt-0">
            <div className="mt-12 pt-3 border-t border-stone-300 flex items-center justify-between gap-3" style={{ fontFamily: '"Tahoma", sans-serif' }}>
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

// ─── Helper: normalise status to one of the three allowed ──────────────

function normaliseStatus(status?: Status): Status {
  if (status && ALLOWED_STATUSES.includes(status)) {
    return status;
  }
  return 'Active';
}

// ─── Main Request Modal ─────────────────────────────────────────────────────
const EMPTY_GENERAL_FORM: ExtendedGeneralForm = {
  judge_name: '',
  request_type: '',
  date_received: '',
  officer_assigned: '',
  status: 'Active',
  remarks: '',
  remark_type: undefined,
  request_date: '',
  location: '',
  force_number: '',
  firearm_type: '',
  officer_name: '',
  assigned_to: '',
  email: '',
  send_email: false,
  police_service: DEFAULT_POLICE_SERVICE,
  rank: '',
  reporting_date: '',
  officer_station: '',
};

export const RequestModal: React.FC<RequestModalProps> = ({
  isOpen,
  onClose,
  mode = 'medical',
  editingItem,
}) => {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector((state) => state.helpdesk.loading.mutating);
  const currentUser = useAppSelector(selectCurrentUser);
  const signatureLoading = useAppSelector(selectUsersSignatureLoading);

  // Judges autocomplete state
  const [judgeSearchTerm, setJudgeSearchTerm] = useState('');
  const judgeSuggestions = useAppSelector(selectAllJudges);
  const judgeSearchLoading = useAppSelector(selectJudgesLoading);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [medicalForm, setMedicalForm] = useState<CreateMedicalClaimInput>({
    officer_name: '',
    claim_amount: 0,
    date_forwarded_dhr: '',
    status: 'Active',
    remarks: '',
  });

  const [generalForm, setGeneralForm] = useState<ExtendedGeneralForm>({ ...EMPTY_GENERAL_FORM });

  const [pendingDocumentId, setPendingDocumentId] = useState<string | undefined>();
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Debounced search for judges
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (judgeSearchTerm.trim().length >= 2) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        dispatch(searchJudges(judgeSearchTerm.trim()));
      }, 300);
    } else {
      // Clear suggestions if search term is too short
      // We could clear the suggestions, but we keep the current list to avoid flickering.
      // Optionally, we can dispatch an action to clear, but we'll leave it.
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [judgeSearchTerm, dispatch]);

  // Reset/Load editing item
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen && editingItem) {
      if (mode === 'medical') {
        const item = editingItem as MedicalClaim;
        setMedicalForm({
          officer_name: item.officer_name || '',
          claim_amount: item.claim_amount || 0,
          date_forwarded_dhr: item.date_forwarded_dhr || '',
          status: normaliseStatus(item.status),
          remarks: item.remarks || '',
        });
        setCurrentStep(2);
      } else {
        const item = editingItem as GeneralRequest;
        setGeneralForm({
          judge_name: item.judge_name || '',
          request_type: item.request_type || '',
          date_received: item.date_received || '',
          officer_assigned: item.officer_assigned || '',
          status: normaliseStatus(item.status),
          remarks: item.remarks || '',
          remark_type: item.remark_type || undefined,
          request_date: item.request_date || '',
          location: item.location || '',
          force_number: item.force_number || '',
          firearm_type: item.firearm_type || '',
          officer_name: item.officer_name || '',
          assigned_to: item.assigned_to || '',
          email: '',
          send_email: false,
          police_service: DEFAULT_POLICE_SERVICE,
          rank: item.rank || '',
          reporting_date: item.reporting_date || '',
          officer_station: (item as unknown as { officer_station?: string }).officer_station || '',
        });
        // Set judge search term to the judge name so it appears in the input
        setJudgeSearchTerm(item.judge_name || '');
        setCurrentStep(2);
      }
    } else if (isOpen && !editingItem) {
      setMedicalForm({
        officer_name: '',
        claim_amount: 0,
        date_forwarded_dhr: '',
        status: 'Active',
        remarks: '',
      });
      setGeneralForm({ ...EMPTY_GENERAL_FORM });
      setJudgeSearchTerm('');
      setCurrentStep(1);
    }
    setPendingDocumentId(undefined);
  }

  const resetForm = () => {
    setMedicalForm({
      officer_name: '',
      claim_amount: 0,
      date_forwarded_dhr: '',
      status: 'Active',
      remarks: '',
    });
    setGeneralForm({ ...EMPTY_GENERAL_FORM });
    setJudgeSearchTerm('');
    setCurrentStep(1);
    setPendingDocumentId(undefined);
  };

  const handleMedicalChange = (field: keyof CreateMedicalClaimInput, value: string | number) => {
    setMedicalForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeneralChange = (field: keyof ExtendedGeneralForm | 'email' | 'send_email', value: string | number | boolean) => {
    setGeneralForm((prev) => ({ ...prev, [field]: value }));
  };

  // Handle judge selection from autocomplete
  const handleJudgeSelect = (judge: Judge) => {
    setJudgeSearchTerm(judge.name);
    setGeneralForm((prev) => ({
      ...prev,
      judge_name: judge.name,
      // Optionally, if judge has a station field, set it here, but we don't have it.
    }));
  };

  // When the user types in the judge field, we update the search term,
  // and also update the generalForm.judge_name to allow free-text entry.
  const handleJudgeSearchTermChange = (term: string) => {
    setJudgeSearchTerm(term);
    // Update the judge_name in the form so that it's always in sync
    setGeneralForm((prev) => ({
      ...prev,
      judge_name: term,
    }));
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

  const handleMemoUploaded = (docId: string) => {
    setPendingDocumentId(docId);
  };

  // ─── Validation helper for Firearm rule ──────────────────────────────
  const validateFirearmRule = (): boolean => {
    if (generalForm.request_type === 'Firearm') {
      const assigned = generalForm.officer_assigned?.trim();
      if (assigned && !generalForm.firearm_type?.trim()) {
        toast.error('Firearm type is required because an officer has been assigned.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (mode === 'medical') {
        if (!medicalForm.officer_name?.trim() || !(medicalForm.claim_amount > 0)) {
          toast.error('Please enter officer name and a valid claim amount.');
          return;
        }
      } else {
        // General validation
        if (!generalForm.judge_name?.trim()) {
          toast.error('Please enter judge name.');
          return;
        }
        if (!generalForm.request_type?.trim()) {
          toast.error('Please select the type of request.');
          return;
        }
        if (generalForm.send_email && !generalForm.email?.trim()) {
          toast.error('Please enter a recipient email address.');
          return;
        }
        if (generalForm.send_email && generalForm.email?.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(generalForm.email.trim())) {
            toast.error('Please enter a valid email address.');
            return;
          }
        }
        // Firearm rule
        if (!validateFirearmRule()) return;
      }
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) setCurrentStep(1);
  };

  const handleCreate = async () => {
    try {
      // Validate again before submit
      if (mode !== 'medical' && !validateFirearmRule()) return;

      let createdId: string | undefined;

      if (mode === 'medical') {
        if (!medicalForm.officer_name?.trim()) {
          toast.error('Please enter the officer name.');
          return;
        }
        if (!medicalForm.claim_amount || medicalForm.claim_amount <= 0) {
          toast.error('Please enter a valid claim amount.');
          return;
        }

        const input: CreateMedicalClaimInput = {
          officer_name: medicalForm.officer_name.trim(),
          claim_amount: medicalForm.claim_amount,
          date_forwarded_dhr: medicalForm.date_forwarded_dhr || undefined,
          status: medicalForm.status || 'Active',
          remarks: medicalForm.remarks?.trim() || undefined,
        };

        if (editingItem) {
          // Update status – ensure status is a string, cast as Status
          await dispatch(updateMedicalClaimStatus({
            id: editingItem.id,
            status: input.status as Status,
          })).unwrap();
          toast.success('Medical claim updated successfully.');
          createdId = editingItem.id;
        } else {
          const result = await dispatch(createMedicalClaim(input)).unwrap();
          toast.success('Medical claim created successfully.');
          createdId = result.id;
        }

        await dispatch(fetchMedicalClaims({}));
      } else {
        // General / Security
        if (!generalForm.judge_name?.trim()) {
          toast.error('Please enter the judge name.');
          return;
        }
        if (!generalForm.request_type?.trim()) {
          toast.error('Please select the type of request.');
          return;
        }

        if (generalForm.send_email && !generalForm.email?.trim()) {
          toast.error('Please enter a recipient email address.');
          return;
        }
        if (generalForm.send_email && generalForm.email?.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(generalForm.email.trim())) {
            toast.error('Please enter a valid email address.');
            return;
          }
        }

        const derivedRequest =
          generalForm.request?.trim() ||
          `${generalForm.request_type.trim()} request for ${generalForm.judge_name.trim()}`;

        const input: CreateGeneralRequestInput = {
          judge_name: generalForm.judge_name.trim(),
          request: derivedRequest,
          request_type: generalForm.request_type.trim() as unknown as RequestType,
          date_received: generalForm.date_received || undefined,
          officer_assigned: generalForm.officer_assigned?.trim() || undefined,
          status: generalForm.status || 'Active',
          remarks: generalForm.remarks?.trim() || undefined,
          remark_type: generalForm.remark_type || undefined,
          request_date: generalForm.request_date || undefined,
          location: generalForm.location?.trim() || undefined,
          force_number: generalForm.force_number?.trim() || undefined,
          firearm_type: generalForm.firearm_type?.trim() || undefined,
          officer_name: generalForm.officer_name?.trim() || undefined,
          assigned_to: generalForm.assigned_to?.trim() || undefined,
          email: generalForm.send_email ? generalForm.email?.trim() : undefined,
          send_email: generalForm.send_email,
          rank: generalForm.rank || undefined,
          reporting_date: generalForm.reporting_date || undefined,
          // @ts-expect-error — officer_station not yet added to CreateGeneralRequestInput; add it in helpdeskSlice.ts
          officer_station: generalForm.officer_station?.trim() || undefined,
        };

        if (editingItem) {
          await dispatch(updateGeneralRequest({
            id: editingItem.id,
            updates: input,
          })).unwrap();
          toast.success('Request updated successfully.');
          createdId = editingItem.id;
        } else {
          const result = await dispatch(createGeneralRequest(input)).unwrap();
          toast.success('Request created successfully.');
          createdId = result.id;
          if (generalForm.send_email && generalForm.email) {
            toast.success(`Notification email sent to ${generalForm.email}`);
          }
        }

        await dispatch(fetchGeneralRequests({}));
      }

      if (pendingDocumentId && createdId) {
        try {
          const entityTypeMap: Record<RequestModalMode, DocumentEntityType> = {
            medical: 'medicalClaim',
            general: 'generalRequest',
            security: 'generalRequest',
          };
          await dispatch(
            linkHelpdeskDocument({
              id: pendingDocumentId,
              entity_type: entityTypeMap[mode],
              entity_id: createdId,
              ...(mode !== 'medical' ? {
                request_type: generalForm.request_type as unknown as RequestType,
                judge_name: generalForm.judge_name,
                remark_type: generalForm.remark_type,
              } : {}),
            })
          ).unwrap();
          toast.success('Memo linked to the record.');
        } catch {
          toast.error('Record created, but failed to link the memo.');
        }
      }

      await dispatch(fetchHelpDeskStats());
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getTitle = () => {
    if (editingItem) {
      const modeMap = {
        medical: 'Medical Claim',
        general: 'General Request',
        security: 'Personnel / Security Request',
      };
      return `Edit ${modeMap[mode]}`;
    }
    const modeMap = {
      medical: 'Add Medical Claim',
      general: 'Add General Request',
      security: 'Add Personnel / Security Request',
    };
    return modeMap[mode];
  };

  const getIcon = () => {
    if (mode === 'medical') return <Stethoscope size={18} className="text-[#c9a84c]" />;
    if (mode === 'general') return <FileText size={18} className="text-[#c9a84c]" />;
    return <Shield size={18} className="text-[#c9a84c]" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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

      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div className="flex items-center gap-2">
            {getIcon()}
            <h3 className="text-sm font-semibold text-[#1a3d1c]">{getTitle()}</h3>
          </div>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 1 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>1</div>
                  <span className="text-xs font-medium">Details</span>
                </div>
                <div className={`h-0.5 w-8 ${currentStep >= 2 ? 'bg-[#c9a84c]' : 'bg-stone-200'}`} />
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#1a3d1c]' : 'text-stone-400'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${currentStep >= 2 ? 'bg-[#c9a84c] text-[#1a3d1c]' : 'bg-stone-200 text-stone-500'}`}>2</div>
                  <span className="text-xs font-medium">Preview</span>
                </div>
              </div>
              <span className="text-xs text-stone-400">Step {currentStep} of 2</span>
            </div>
          </div>

          {currentStep === 1 && (
            <BasicInfoForm
              mode={mode}
              medicalForm={medicalForm}
              generalForm={generalForm}
              onMedicalChange={handleMedicalChange}
              onGeneralChange={handleGeneralChange}
              judgeSearchTerm={judgeSearchTerm}
              onJudgeSearchTermChange={handleJudgeSearchTermChange}
              judgeSuggestions={judgeSuggestions}
              judgeSearchLoading={judgeSearchLoading}
              onJudgeSelect={handleJudgeSelect}
            />
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <SignatureSection
                userSignature={currentUser?.signature_url || null}
                onUpload={handleSignatureUpload}
                onRemove={handleSignatureRemove}
                isLoading={signatureLoading}
              />
              <MemoPreview
                mode={mode}
                medicalForm={medicalForm}
                generalForm={generalForm}
                onEdit={() => setCurrentStep(1)}
                signatureUrl={currentUser?.signature_url}
                onDocumentUploaded={handleMemoUploaded}
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
            {currentStep < 2 ? (
              <GoldButton onClick={handleNextStep} icon={<ArrowRight size={14} />}>Next</GoldButton>
            ) : (
              <GoldButton
                onClick={handleCreate}
                disabled={mutating}
                icon={mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />}
              >
                {editingItem ? 'Update' : 'Create'}
              </GoldButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestModal;