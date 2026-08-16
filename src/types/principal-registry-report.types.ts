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
  base64?: string; // ✅ Added
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