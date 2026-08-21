// src/types/principal-registry-report.types.ts

// ============================================================
// PRINCIPAL REGISTRY WEEKLY REPORT - FRONTEND TYPES
// ============================================================

// ─── Section 1: Administrative Overview ──────────────────────
export interface AdministrativeOverview {
  keyActivities: string[];
  notableIssues: string[];
  resolutionsStatus: string[];
}

// ─── Section 2: Case Management ──────────────────────────────
export interface CaseManagement {
  form30PendingCount: number;
  forwardedToGp: boolean;
  submissionDates?: string[] | null;
  noticesSubmittedCount?: number | null;
  nonSubmissionReason?: string | null;
  expectedSubmissionDate?: string | null;
}

// ─── Section 3: Automating the Principal Registry ────────────
export interface AutomationStatus {
  excelUpdateStatus: string;
  systemBuildStatus: string;
}

// ─── Section 4: Service Delivery Challenges ──────────────────
export interface ServiceDeliveryChallenges {
  hasChallenges: boolean;
  challengeDetails?: string[] | null;
  proposedSolutions: string[];
  needsRhcIntervention: boolean;
  interventionDetails?: string[] | null;
}

// ─── Section 5: Highlights / Achievements ────────────────────
export interface Highlights {
  achievements: string[];
}

// ─── Section 6: Any Other Information ────────────────────────
export interface SignOff {
  preparedDate: string;
  preparedByName: string;
  preparedByDesignation: string;
}

export interface OtherInformation {
  ctsEfilingChanges: string[];
  gpChanges: string[];
  signOff: SignOff;
}

// ─── Full Report ──────────────────────────────────────────────
export type ReportStatus = 'draft' | 'submitted' | 'reviewed' | 'archived';

export interface PrincipalRegistryWeeklyReport {
  id: string;
  weekEndingDates: string[];
  reportPeriodStart: string;
  reportPeriodEnd: string;
  departmentId: string;
  status: ReportStatus;

  administrativeOverview: AdministrativeOverview;
  caseManagement: CaseManagement;
  automationStatus: AutomationStatus;
  serviceDeliveryChallenges: ServiceDeliveryChallenges;
  highlights: Highlights;
  otherInformation: OtherInformation;

  // ✅ PDF attachment fields
  pdfPublicId?: string | null;
  pdfSecureUrl?: string | null;
  pdfFileName?: string | null;
  pdfGeneratedAt?: string | null;

  // ✅ Submission tracking fields
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Form State Types ─────────────────────────────────────────
export interface ReportFormData {
  weekEndingDates: string[];
  reportPeriodStart: string;
  reportPeriodEnd: string;
  departmentId: string;

  administrativeOverview: AdministrativeOverview;
  caseManagement: CaseManagement;
  automationStatus: AutomationStatus;
  serviceDeliveryChallenges: ServiceDeliveryChallenges;
  highlights: Highlights;
  otherInformation: OtherInformation;
}

// ─── API Request/Response Types ──────────────────────────────

export interface CreateReportRequest {
  weekEndingDates: string[];
  reportPeriodStart: string;
  reportPeriodEnd: string;
  departmentId: string;
  administrativeOverview: AdministrativeOverview;
  caseManagement: CaseManagement;
  automationStatus: AutomationStatus;
  serviceDeliveryChallenges: ServiceDeliveryChallenges;
  highlights: Highlights;
  otherInformation: OtherInformation;
  status?: ReportStatus;
}

export interface UpdateReportRequest {
  weekEndingDates?: string[];
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
  departmentId?: string;
  administrativeOverview?: AdministrativeOverview;
  caseManagement?: CaseManagement;
  automationStatus?: AutomationStatus;
  serviceDeliveryChallenges?: ServiceDeliveryChallenges;
  highlights?: Highlights;
  otherInformation?: OtherInformation;
  status?: ReportStatus;
  pdfPublicId?: string | null;
  pdfSecureUrl?: string | null;
  pdfFileName?: string | null;
  pdfGeneratedAt?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
}

export interface ReviewReportRequest {
  action: 'approve' | 'reject';
  reviewNotes?: string;
}

export interface GeneratePdfRequest {
  reportId: string;
  options?: PDFGenerationOptions;
}

export interface ReportListResponse {
  reports: PrincipalRegistryWeeklyReport[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReportFilters {
  departmentId?: string;
  status?: ReportStatus;
  page?: number;
  pageSize?: number;
}

// ─── PDF Generation Types ─────────────────────────────────────
export interface PDFGenerationOptions {
  title?: string;
  showWatermark?: boolean;
  watermarkText?: string;
  includeFooter?: boolean;
  footerText?: string;
  pageSize?: 'A4' | 'A3' | 'Legal' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

export interface PDFGenerationResult {
  success: boolean;
  pdfUrl?: string;
  pdfBlob?: Blob;
  error?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  publicId?: string;
  secureUrl?: string;
  base64?: string;
}

// ─── PDF Report Metadata ──────────────────────────────────────
export interface PDFReportMetadata {
  id: string;
  reportId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  publicId: string;
  secureUrl: string;
  createdAt: string;
  createdBy: string;
  status: 'generating' | 'ready' | 'failed';
  downloadCount: number;
  lastDownloadedAt?: string;
}

// ─── Report Submission ────────────────────────────────────────
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface ReportSubmission {
  id: string;
  reportId: string;
  submittedBy: string;
  submittedAt: string;
  status: SubmissionStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  pdfPublicId?: string;
  pdfSecureUrl?: string;
}

// ─── Question Catalog Types ──────────────────────────────────
export type QuestionType = 
  | 'text'
  | 'list'
  | 'number'
  | 'boolean'
  | 'date'
  | 'date_list'
  | 'group';

export interface ConditionalOn {
  questionKey: string;
  equals: boolean | string | number;
}

export interface ReportQuestion {
  id: string;
  questionKey: string;
  sectionNumber: number;
  sectionTitle: string;
  questionLabel: string;
  questionType: QuestionType;
  parentQuestionKey: string | null;
  displayOrder: number;
  isRequired: boolean;
  conditionalOn: ConditionalOn | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helper Types for UI ─────────────────────────────────────
export interface GroupedQuestions {
  sectionNumber: number;
  sectionTitle: string;
  questions: ReportQuestion[];
}

export type QuestionValueMap = {
  text: string;
  list: string[];
  number: number;
  boolean: boolean;
  date: string;
  date_list: string[];
  group: null;
};

// ─── Default Values ───────────────────────────────────────────
export const DEFAULT_REPORT_FORM: ReportFormData = {
  weekEndingDates: [],
  reportPeriodStart: '',
  reportPeriodEnd: '',
  departmentId: '',
  administrativeOverview: {
    keyActivities: [],
    notableIssues: [],
    resolutionsStatus: [],
  },
  caseManagement: {
    form30PendingCount: 0,
    forwardedToGp: false,
    submissionDates: null,
    noticesSubmittedCount: null,
    nonSubmissionReason: null,
    expectedSubmissionDate: null,
  },
  automationStatus: {
    excelUpdateStatus: '',
    systemBuildStatus: '',
  },
  serviceDeliveryChallenges: {
    hasChallenges: false,
    challengeDetails: null,
    proposedSolutions: [],
    needsRhcIntervention: false,
    interventionDetails: null,
  },
  highlights: {
    achievements: [],
  },
  otherInformation: {
    ctsEfilingChanges: [],
    gpChanges: [],
    signOff: {
      preparedDate: '',
      preparedByName: '',
      preparedByDesignation: '',
    },
  },
};

// ─── Validation Error Types ──────────────────────────────────
export interface ReportValidationError {
  path: string[];
  message: string;
}

// ─── Status Helpers ──────────────────────────────────────────
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  archived: 'Archived',
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  draft: 'gray',
  submitted: 'blue',
  reviewed: 'green',
  archived: 'purple',
};

export const REPORT_STATUS_ORDER = ['draft', 'submitted', 'reviewed', 'archived'] as const;

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
};

// ─── Date Utility Functions ──────────────────────────────────

/**
 * Normalizes a date string to YYYY-MM-DD format for API requests
 * Handles ISO strings, Date objects, and already-formatted strings
 */
export const normalizeDateForAPI = (date: string | Date | null | undefined): string | null => {
  if (!date) return null;
  
  let dateObj: Date;
  if (typeof date === 'string') {
    // If it's already YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
  } else if (date instanceof Date) {
    dateObj = date;
    if (isNaN(dateObj.getTime())) return null;
  } else {
    return null;
  }
  
  return dateObj.toISOString().split('T')[0];
};

/**
 * Normalizes an array of dates to YYYY-MM-DD format
 */
export const normalizeDateArrayForAPI = (dates: (string | Date | null | undefined)[] | null | undefined): string[] | null => {
  if (!dates || !Array.isArray(dates)) return null;
  const normalized = dates.map(d => normalizeDateForAPI(d)).filter((d): d is string => d !== null);
  return normalized.length > 0 ? normalized : null;
};

/**
 * Formats a date for display in the UI
 */
export const formatDateForDisplay = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return date;
  } else if (date instanceof Date) {
    dateObj = date;
    if (isNaN(dateObj.getTime())) return '';
  } else {
    return '';
  }
  
  return dateObj.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Formats a date for use in an input[type="date"] element
 */
export const formatDateForInput = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  let dateObj: Date;
  if (typeof date === 'string') {
    // If it's already YYYY-MM-DD, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
  } else if (date instanceof Date) {
    dateObj = date;
    if (isNaN(dateObj.getTime())) return '';
  } else {
    return '';
  }
  
  return dateObj.toISOString().split('T')[0];
};

// ─── Utility Functions ────────────────────────────────────────

/**
 * Check if a report can be edited (draft status only)
 */
export const canEdit = (report: PrincipalRegistryWeeklyReport): boolean => {
  return report.status === 'draft';
};

/**
 * Check if a report can be submitted (draft status + PDF must be attached)
 */
export const canSubmit = (report: PrincipalRegistryWeeklyReport): boolean => {
  return report.status === 'draft' && !!report.pdfSecureUrl;
};

/**
 * Check if a report can be reviewed (submitted status only)
 */
export const canReview = (report: PrincipalRegistryWeeklyReport): boolean => {
  return report.status === 'submitted';
};

/**
 * Check if a report can be archived (reviewed status only)
 */
export const canArchive = (report: PrincipalRegistryWeeklyReport): boolean => {
  return report.status === 'reviewed';
};

/**
 * Check if PDF can be generated (draft or submitted status)
 */
export const canGeneratePDF = (report: PrincipalRegistryWeeklyReport): boolean => {
  return report.status === 'draft' || report.status === 'submitted';
};

/**
 * Check if PDF can be viewed (must have PDF attached)
 */
export const canViewPDF = (report: PrincipalRegistryWeeklyReport): boolean => {
  return !!report.pdfSecureUrl;
};

/**
 * Check if PDF is attached to the report
 */
export const hasPDFAttached = (report: PrincipalRegistryWeeklyReport): boolean => {
  return !!report.pdfSecureUrl && !!report.pdfPublicId;
};

/**
 * Get the next available status for a report
 */
export const getNextStatus = (report: PrincipalRegistryWeeklyReport): ReportStatus | null => {
  const statusFlow: Record<ReportStatus, ReportStatus | null> = {
    draft: 'submitted',
    submitted: 'reviewed',
    reviewed: 'archived',
    archived: null,
  };
  return statusFlow[report.status];
};

/**
 * Get status label
 */
export const getStatusLabel = (status: ReportStatus): string => {
  return REPORT_STATUS_LABELS[status];
};

/**
 * Get status color
 */
export const getStatusColor = (status: ReportStatus): string => {
  return REPORT_STATUS_COLORS[status];
};

/**
 * Get submission status label
 */
export const getSubmissionStatusLabel = (status: SubmissionStatus): string => {
  return SUBMISSION_STATUS_LABELS[status];
};

/**
 * Get submission status color
 */
export const getSubmissionStatusColor = (status: SubmissionStatus): string => {
  return SUBMISSION_STATUS_COLORS[status];
};

/**
 * Check if a value has meaningful content (not empty)
 */
export const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0 && value.trim() !== 'Not provided';
  if (Array.isArray(value)) {
    return value.some(item => {
      if (typeof item === 'string') return item.trim().length > 0;
      return item !== null && item !== undefined;
    });
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(v => {
      if (typeof v === 'string') return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return v !== null && v !== undefined;
    });
  }
  return true;
};

/**
 * Check if a section has any data
 */
export const hasSectionData = <T extends Record<string, unknown>>(section: T | null | undefined): boolean => {
  if (!section) return false;
  if (typeof section !== 'object') return false;
  
  return Object.values(section).some(value => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') {
      return hasSectionData(value as Record<string, unknown>);
    }
    return true;
  });
};

/**
 * Type guard to check if a value is a non-empty string
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Type guard to check if a value is a non-empty array
 */
export const isNonEmptyArray = <T>(value: unknown): value is T[] => {
  return Array.isArray(value) && value.length > 0;
};