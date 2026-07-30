// src/types/helpdesk-documents.types.ts

// ── Helpdesk-specific Document Entity Types ──────────────────────────────────

export type HelpdeskEntityType =
    | 'circuit'
    | 'bench'
    | 'partHeard'
    | 'serviceWeek'
    | 'otherPayment'
    | 'ticket'
    | 'medicalClaim'
    | 'generalRequest'
    | 'securityRequest'
    | 'visa'             // Visa support documents
    | 'protocol'         // Protocol event documents
    | 'club'             // Club membership documents
    | 'utility_memo'     // Single judge utility memo
    | 'consolidated_utility_memo'  // Consolidated memo covering all utilities
    | 'consolidated_fuel_memo'     // Consolidated memo covering fuel only
    | 'aide'             // Aide request documents
    | 'sentry';          // Sentry request documents ← ADDED THIS

export type HelpdeskDocumentFormat = 'pdf' | 'docx' | 'xlsx';

export type HelpdeskDocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'returned';
export type EStampStatus = 'pending' | 'stamped' | 'failed';

// ─── Consolidated Memo Helpers ──────────────────────────────────────────────

export type ConsolidatedMemoType = 'all' | 'fuel';

/**
 * Generates a stable, human-readable entity ID for a consolidated memo.
 * Format: "cons-{type}-{YYYY-MM}" e.g., "cons-all-2026-07"
 */
export function getConsolidatedMemoEntityId(
    type: ConsolidatedMemoType,
    date: Date = new Date()
): string {
    const month = date.toISOString().slice(0, 7); // YYYY-MM
    return `cons-${type}-${month}`;
}

/**
 * Returns the appropriate HelpdeskEntityType for a consolidated memo.
 */
export function getConsolidatedMemoEntityType(
    type: ConsolidatedMemoType
): HelpdeskEntityType {
    return type === 'fuel' ? 'consolidated_fuel_memo' : 'consolidated_utility_memo';
}

// ─── Request Types (Unified) ───────────────────────────────────────────────

export type RequestType =
    | 'Driver'
    | 'Bodyguard'
    | 'Firearm'
    | 'Current Station'
    | 'Force Number'
    | 'Residence Security'
    | 'Sentry';

export type RemarkType = 'Onboarding' | 'Release';
export type GeneralRequestCategory = 'Security' | 'Personnel' | 'Administrative';

// ─── Officer Ranks (Matching Backend) ──────────────────────────────────────

export type OfficerRank =
    | 'Police Constable (PC)'
    | 'Corporal (CPL)'
    | 'Sergeant (SGT)'
    | 'Inspector (IP)'
    | 'Chief Inspector (CIP)'
    | 'Assistant Superintendent (ASP)'
    | 'Superintendent (SP)'
    | 'Senior Superintendent (SSP)'
    | 'Assistant Commissioner (ACP)'
    | 'Senior Assistant Commissioner (SACP)'
    | 'Commissioner (CP)';

export type UnitType = 'KPS' | 'APS' | 'GSU' | 'DCI' | 'VIPPU' | 'Other';

export type AideStatus = 'pending' | 'in_progress' | 'rejected' | 'attached';
export type SentryStatus = 'pending' | 'active' | 'resolved' | 'rejected';

// ─── Approval History ──────────────────────────────────────────────────────

export interface ApprovalHistoryEntry {
    id: string;
    document_id: string;
    action: 'submitted' | 'approved' | 'rejected' | 'returned';
    from_user_id: string;
    from_user_name: string;
    to_user_id?: string;
    to_user_name?: string;
    comments?: string;
    created_at: string;
}

// ─── Comments ──────────────────────────────────────────────────────────────

export interface Comment {
    id: string;
    document_id: string;
    user_id: string;
    user_name: string;
    comment: string;
    is_internal: boolean;
    created_at: string;
}

// ─── Document View Tracking ──────────────────────────────────────────────

export interface DocumentView {
    id: string;
    document_id: string;
    document_type: string;
    viewer_id: string;
    viewer_name: string;
    viewed_at: string;
    ip_address: string | null;
    user_agent: string | null;
}

export interface DocumentWithViewStatus {
    id: string;
    document_name: string;
    document_url: string;
    created_at: string;
    viewed_at: string | null;
    view_count: number;
    last_viewed_by: string | null;
    last_viewed_at: string | null;
    viewers: DocumentView[];
}

/**
 * Extended document type for helpdesk-specific fields
 * Matches the backend's HelpdeskDocument interface
 */
export interface HelpdeskDocument {
    id: string;
    ref: string;
    subject: string;
    entity_type: HelpdeskEntityType;
    entity_id: string | null;   // can be UUID or custom ID (e.g., "cons-all-2026-07")
    format: HelpdeskDocumentFormat;
    file_url: string;
    public_id: string;
    file_size: number | null;
    uploaded_by: string | null;
    uploaded_by_name?: string | null;
    status: HelpdeskDocumentStatus;
    e_stamp_status: EStampStatus;
    e_stamp_url?: string | null;
    e_stamp_public_id?: string | null;
    approval_history: ApprovalHistoryEntry[];
    comments: Comment[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
    approved_at?: string;
    approved_by?: string;
    approved_by_name?: string;
    returned_at?: string;
    returned_by?: string;
    returned_by_name?: string;
    rejection_reason?: string;
    type: 'upload';
    category: 'general';

    // Unified General Request fields
    request_type?: RequestType;        // Driver, Bodyguard, etc.
    judge_name?: string;                // Associated judge name
    remark_type?: RemarkType;          // Onboarding or Release
    category_type?: GeneralRequestCategory; // Security, Personnel, Administrative

    // ─── Aide Request Fields ──────────────────────────────────────────────────
    officer_rank?: OfficerRank | null;
    officer_name?: string | null;
    employment_number?: string | null;
    current_station?: string | null;
    current_unit?: UnitType | null;
    proposed_assignment?: string | null;
    reporting_date?: string | null;
    aide_status?: AideStatus | null;
    
    // ─── Sentry Request Fields ──────────────────────────────────────────────
    residence_location?: string | null;
    sentry_status?: SentryStatus | null;
    
    // ─── Legacy fields ──────────────────────────────────────────────────────
    rank?: string | null;              // Officer's rank (deprecated, use officer_rank)
}

// ─── Helpdesk Document Filters ───────────────────────────────────────────────

export interface HelpdeskDocumentFilters {
    entity_type?: HelpdeskEntityType;
    entity_id?: string;   // can be UUID or custom ID
    format?: HelpdeskDocumentFormat;
    status?: HelpdeskDocumentStatus;
    search?: string;
    limit?: number;
    offset?: number;
    uploaded_by?: string;
    pending_my_approval?: boolean;
    unlinked?: boolean;

    // Unified General Request filters
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    date_from?: string;
    date_to?: string;

    // ─── Aide Request Filters ──────────────────────────────────────────────
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    aide_status?: AideStatus;
    reporting_date?: string;
    
    // ─── Sentry Request Filters ──────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;
    
    // ─── Legacy filters ──────────────────────────────────────────────────────
    rank?: string;
}

// ─── Helpdesk Document Upload Payload ────────────────────────────────────────

export interface UploadHelpdeskDocumentPayload {
    blob: Blob;
    filename: string;
    ref: string;
    subject: string;
    entity_type: HelpdeskEntityType;
    entity_id?: string;   // can be UUID or custom ID
    format: HelpdeskDocumentFormat;
    status?: HelpdeskDocumentStatus;

    // Unified General Request fields
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;

    // ─── Aide Request Fields ──────────────────────────────────────────────
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    proposed_assignment?: string;
    reporting_date?: string;
    aide_status?: AideStatus;
    
    // ─── Sentry Request Fields ──────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;
    
    // ─── Legacy fields ──────────────────────────────────────────────────────
    rank?: string;
}

// ─── Update Document File Payload ─────────────────────────────────────────────

export interface UpdateDocumentFilePayload {
    id: string;
    blob: Blob;
    filename: string;
    status?: HelpdeskDocumentStatus;
    e_stamp_url?: string;
    e_stamp_public_id?: string;
    e_stamp_status?: EStampStatus;
    comments?: string;
    approved_by?: string;
    approved_by_name?: string;
    rejection_reason?: string;
    returned_by?: string;
    returned_by_name?: string;
}

export interface SubmitForApprovalPayload {
    id: string;
    comments?: string;
    submitted_by?: string;
    submitted_by_name?: string;
}

export interface ApproveDocumentPayload {
    id: string;
    comments?: string;
    approved_by?: string;
    approved_by_name?: string;
    e_stamp_url?: string;
    e_stamp_public_id?: string;
}

export interface RejectDocumentPayload {
    id: string;
    reason: string;
    comments?: string;
    rejected_by?: string;
    rejected_by_name?: string;
}

export interface ReturnDocumentPayload {
    id: string;
    comments?: string;
    instructions?: string;
    returned_by?: string;
    returned_by_name?: string;
}

export interface AddCommentPayload {
    id: string;
    comment: string;
    is_internal?: boolean;
}

export interface DeleteCommentPayload {
    id: string;
    commentId: string;
}

export interface LinkHelpdeskDocumentPayload {
    id: string;
    entity_type: HelpdeskEntityType;
    entity_id: string;   // can be UUID or custom ID
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    
    // ─── Aide Request Fields ──────────────────────────────────────────────
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    proposed_assignment?: string;
    reporting_date?: string;
    aide_status?: AideStatus;
    
    // ─── Sentry Request Fields ──────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;
    
    // ─── Legacy fields ──────────────────────────────────────────────────────
    rank?: string;
}

export interface UpdateEStampPayload {
    id: string;
    e_stamp_url?: string;
    e_stamp_public_id?: string;
    e_stamp_status?: EStampStatus;
}

// ─── Bulk Operations ──────────────────────────────────────────────────────

export interface BulkLinkDocumentsPayload {
    document_ids: string[];
    entity_type: HelpdeskEntityType;
    entity_id: string;   // can be UUID or custom ID
    request_type?: RequestType;
    judge_name?: string;
    remark_type?: RemarkType;
    category_type?: GeneralRequestCategory;
    
    // ─── Aide Request Fields ──────────────────────────────────────────────
    officer_rank?: OfficerRank;
    officer_name?: string;
    employment_number?: string;
    current_station?: string;
    current_unit?: UnitType;
    proposed_assignment?: string;
    reporting_date?: string;
    aide_status?: AideStatus;
    
    // ─── Sentry Request Fields ──────────────────────────────────────────────
    residence_location?: string;
    sentry_status?: SentryStatus;
    
    // ─── Legacy fields ──────────────────────────────────────────────────────
    rank?: string;
}

export interface BulkUpdateStatusPayload {
    document_ids: string[];
    status: HelpdeskDocumentStatus;
    comments?: string;
}

export interface BatchUploadPayload {
    documents: Omit<UploadHelpdeskDocumentPayload, 'blob' | 'filename'>[];
}

// ─── Helpdesk Document Response ──────────────────────────────────────────────

export interface HelpdeskDocumentResponse {
    success: boolean;
    data: HelpdeskDocument;
    message?: string;
}

export interface HelpdeskDocumentsListResponse {
    success: boolean;
    data: HelpdeskDocument[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    message?: string;
}

export interface BulkOperationResult {
    success: string[];
    failed: string[];
}

// ─── Helpdesk Document State ──────────────────────────────────────────────────

export interface HelpdeskDocumentsState {
    items: HelpdeskDocument[];
    selectedDocument: HelpdeskDocument | null;
    loading: {
        fetch: boolean;
        upload: boolean;
        delete: boolean;
        submit: boolean;
        approve: boolean;
        reject: boolean;
        return: boolean;
        comment: boolean;
        link: boolean;
        batchUpload: boolean;
        bulkLink: boolean;
        bulkUpdate: boolean;
        stats: boolean;
    };
    error: string | null;
    deletingId: string | null;
    actionLoading: {
        [key: string]: {
            submitting?: boolean;
            approving?: boolean;
            rejecting?: boolean;
            returning?: boolean;
        };
    };
    stats: DocumentStats | null;
    summary: DocumentSummary | null;
}

// ─── Document Statistics ──────────────────────────────────────────────────

export interface DocumentStats {
    total: number;
    pending_approval: number;
    approved: number;
    rejected: number;
    returned: number;
    draft: number;
    by_entity: {
        entity_type: HelpdeskEntityType;
        count: number;
        pending: number;
        approved: number;
    }[];
    recent_activity: {
        id: string;
        ref: string;
        subject: string;
        action: string;
        user_name: string;
        created_at: string;
    }[];
}

export interface DocumentSummary {
    total: number;
    by_status: Record<HelpdeskDocumentStatus, number>;
    by_entity_type: Record<HelpdeskEntityType, number>;
    by_format: Record<HelpdeskDocumentFormat, number>;
    pending_approval: number;
    draft: number;
    approved: number;
    rejected: number;
    returned: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const HELPEDSK_ENTITY_LABELS: Record<HelpdeskEntityType, string> = {
    circuit: 'Circuit',
    bench: 'Bench',
    partHeard: 'Part-Heard',
    serviceWeek: 'Service Week',
    otherPayment: 'Other Payment',
    ticket: 'Travel Ticket',
    medicalClaim: 'Medical Claim',
    generalRequest: 'General Request',
    securityRequest: 'Security Request (Deprecated)',
    visa: 'Visa Support',
    protocol: 'Protocol Event',
    club: 'Club Membership',
    utility_memo: 'Utility Memo (Single Judge)',
    consolidated_utility_memo: 'Consolidated Utility Memo',
    consolidated_fuel_memo: 'Consolidated Fuel Memo',
    aide: 'Aide Request',
    sentry: 'Sentry Request', // ← ADDED
};

export const HELPEDSK_ENTITY_ICONS: Record<HelpdeskEntityType, string> = {
    circuit: 'MapPin',
    bench: 'Gavel',
    partHeard: 'FileCheck',
    serviceWeek: 'Calendar',
    otherPayment: 'CreditCard',
    ticket: 'Plane',
    medicalClaim: 'Stethoscope',
    generalRequest: 'FileText',
    securityRequest: 'Shield',
    visa: 'Plane',
    protocol: 'Calendar',
    club: 'Users',
    utility_memo: 'FileText',
    consolidated_utility_memo: 'FileSpreadsheet',
    consolidated_fuel_memo: 'Fuel',
    aide: 'Shield',
    sentry: 'Home', // ← ADDED
};

export const HELPEDSK_ENTITY_COLORS: Record<HelpdeskEntityType, string> = {
    circuit: 'text-purple-600 bg-purple-50',
    bench: 'text-blue-600 bg-blue-50',
    partHeard: 'text-indigo-600 bg-indigo-50',
    serviceWeek: 'text-teal-600 bg-teal-50',
    otherPayment: 'text-rose-600 bg-rose-50',
    ticket: 'text-cyan-600 bg-cyan-50',
    medicalClaim: 'text-emerald-600 bg-emerald-50',
    generalRequest: 'text-amber-600 bg-amber-50',
    securityRequest: 'text-gray-600 bg-gray-50',
    visa: 'text-indigo-600 bg-indigo-50',
    protocol: 'text-blue-600 bg-blue-50',
    club: 'text-purple-600 bg-purple-50',
    utility_memo: 'text-amber-600 bg-amber-50',
    consolidated_utility_memo: 'text-indigo-600 bg-indigo-50',
    consolidated_fuel_memo: 'text-orange-600 bg-orange-50',
    aide: 'text-blue-600 bg-blue-50',
    sentry: 'text-emerald-600 bg-emerald-50', // ← ADDED
};

export const DOCUMENT_STATUS_LABELS: Record<HelpdeskDocumentStatus, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    returned: 'Returned',
};

export const DOCUMENT_STATUS_COLORS: Record<HelpdeskDocumentStatus, string> = {
    draft: 'bg-stone-100 text-stone-600',
    pending_approval: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    returned: 'bg-blue-50 text-blue-700',
};

export const DOCUMENT_STATUS_BADGE_STYLES: Record<HelpdeskDocumentStatus, string> = {
    draft: 'badge-stone',
    pending_approval: 'badge-amber',
    approved: 'badge-emerald',
    rejected: 'badge-red',
    returned: 'badge-blue',
};

export const E_STAMP_STATUS_LABELS: Record<EStampStatus, string> = {
    pending: 'Pending',
    stamped: 'Stamped ✓',
    failed: 'Failed',
};

export const E_STAMP_STATUS_COLORS: Record<EStampStatus, string> = {
    pending: 'text-amber-600 bg-amber-50',
    stamped: 'text-emerald-600 bg-emerald-50',
    failed: 'text-red-600 bg-red-50',
};

// ─── Aide Status Constants ──────────────────────────────────────────────────

export const AIDE_STATUS_LABELS: Record<AideStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    rejected: 'Rejected',
    attached: 'Attached',
};

export const AIDE_STATUS_COLORS: Record<AideStatus, string> = {
    pending: 'text-amber-600 bg-amber-50',
    in_progress: 'text-blue-600 bg-blue-50',
    rejected: 'text-red-600 bg-red-50',
    attached: 'text-emerald-600 bg-emerald-50',
};

// ─── Sentry Status Constants ──────────────────────────────────────────────

export const SENTRY_STATUS_LABELS: Record<SentryStatus, string> = {
    pending: 'Pending',
    active: 'Active',
    resolved: 'Resolved',
    rejected: 'Rejected',
};

export const SENTRY_STATUS_COLORS: Record<SentryStatus, string> = {
    pending: 'text-amber-600 bg-amber-50',
    active: 'text-emerald-600 bg-emerald-50',
    resolved: 'text-blue-600 bg-blue-50',
    rejected: 'text-red-600 bg-red-50',
};

// ─── Officer Rank Constants ──────────────────────────────────────────────────

export const OFFICER_RANK_LABELS: Record<OfficerRank, string> = {
    'Police Constable (PC)': 'Police Constable (PC)',
    'Corporal (CPL)': 'Corporal (CPL)',
    'Sergeant (SGT)': 'Sergeant (SGT)',
    'Inspector (IP)': 'Inspector (IP)',
    'Chief Inspector (CIP)': 'Chief Inspector (CIP)',
    'Assistant Superintendent (ASP)': 'Assistant Superintendent (ASP)',
    'Superintendent (SP)': 'Superintendent (SP)',
    'Senior Superintendent (SSP)': 'Senior Superintendent (SSP)',
    'Assistant Commissioner (ACP)': 'Assistant Commissioner (ACP)',
    'Senior Assistant Commissioner (SACP)': 'Senior Assistant Commissioner (SACP)',
    'Commissioner (CP)': 'Commissioner (CP)',
};

// ─── Request Type Helpers ────────────────────────────────────────────────────

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
    Driver: 'Driver Request',
    Bodyguard: 'Bodyguard Request',
    Firearm: 'Firearm Request',
    'Current Station': 'Current Station Request',
    'Force Number': 'Force Number Request',
    'Residence Security': 'Residence Security Request',
    Sentry: 'Sentry Request',
};

export const REQUEST_TYPE_COLORS: Record<RequestType, string> = {
    Driver: 'text-blue-600 bg-blue-50',
    Bodyguard: 'text-purple-600 bg-purple-50',
    Firearm: 'text-red-600 bg-red-50',
    'Current Station': 'text-green-600 bg-green-50',
    'Force Number': 'text-orange-600 bg-orange-50',
    'Residence Security': 'text-indigo-600 bg-indigo-50',
    Sentry: 'text-gray-600 bg-gray-50',
};

export const REMARK_TYPE_LABELS: Record<RemarkType, string> = {
    Onboarding: 'Onboarding',
    Release: 'Release',
};

export const CATEGORY_TYPE_LABELS: Record<GeneralRequestCategory, string> = {
    Security: 'Security',
    Personnel: 'Personnel',
    Administrative: 'Administrative',
};

// ─── Helper Functions ──────────────────────────────────────────────────────

export function getEntityDisplayName(entityType: HelpdeskEntityType): string {
    return HELPEDSK_ENTITY_LABELS[entityType] || entityType;
}

export function getEntityIcon(entityType: HelpdeskEntityType): string {
    return HELPEDSK_ENTITY_ICONS[entityType] || 'File';
}

export function getEntityColor(entityType: HelpdeskEntityType): string {
    return HELPEDSK_ENTITY_COLORS[entityType] || 'text-gray-600 bg-gray-50';
}

export function getStatusDisplayName(status: HelpdeskDocumentStatus): string {
    return DOCUMENT_STATUS_LABELS[status] || status;
}

export function getStatusColor(status: HelpdeskDocumentStatus): string {
    return DOCUMENT_STATUS_COLORS[status] || '';
}

export function getStatusBadgeStyle(status: HelpdeskDocumentStatus): string {
    return DOCUMENT_STATUS_BADGE_STYLES[status] || '';
}

export function getEStampStatusLabel(status: EStampStatus): string {
    return E_STAMP_STATUS_LABELS[status] || status;
}

export function getEStampStatusColor(status: EStampStatus): string {
    return E_STAMP_STATUS_COLORS[status] || '';
}

export function getRequestTypeLabel(requestType: RequestType): string {
    return REQUEST_TYPE_LABELS[requestType] || requestType;
}

export function getRequestTypeColor(requestType: RequestType): string {
    return REQUEST_TYPE_COLORS[requestType] || 'text-gray-600 bg-gray-50';
}

export function getRemarkTypeLabel(remarkType: RemarkType): string {
    return REMARK_TYPE_LABELS[remarkType] || remarkType;
}

export function getCategoryTypeLabel(category: GeneralRequestCategory): string {
    return CATEGORY_TYPE_LABELS[category] || category;
}

export function getOfficerRankLabel(rank: OfficerRank): string {
    return OFFICER_RANK_LABELS[rank] || rank;
}

export function getAideStatusLabel(status: AideStatus): string {
    return AIDE_STATUS_LABELS[status] || status;
}

export function getAideStatusColor(status: AideStatus): string {
    return AIDE_STATUS_COLORS[status] || '';
}

export function getSentryStatusLabel(status: SentryStatus): string {
    return SENTRY_STATUS_LABELS[status] || status;
}

export function getSentryStatusColor(status: SentryStatus): string {
    return SENTRY_STATUS_COLORS[status] || '';
}

export function isRequestType(value: string): value is RequestType {
    return [
        'Driver',
        'Bodyguard',
        'Firearm',
        'Current Station',
        'Force Number',
        'Residence Security',
        'Sentry'
    ].includes(value);
}

export function isRemarkType(value: string): value is RemarkType {
    return ['Onboarding', 'Release'].includes(value);
}

export function isGeneralRequestCategory(value: string): value is GeneralRequestCategory {
    return ['Security', 'Personnel', 'Administrative'].includes(value);
}

export function isOfficerRank(value: string): value is OfficerRank {
    return [
        'Police Constable (PC)',
        'Corporal (CPL)',
        'Sergeant (SGT)',
        'Inspector (IP)',
        'Chief Inspector (CIP)',
        'Assistant Superintendent (ASP)',
        'Superintendent (SP)',
        'Senior Superintendent (SSP)',
        'Assistant Commissioner (ACP)',
        'Senior Assistant Commissioner (SACP)',
        'Commissioner (CP)'
    ].includes(value);
}

export function isUnitType(value: string): value is UnitType {
    return ['KPS', 'APS', 'GSU', 'DCI', 'VIPPU', 'Other'].includes(value);
}

export function isAideStatus(value: string): value is AideStatus {
    return ['pending', 'in_progress', 'rejected', 'attached'].includes(value);
}

export function isSentryStatus(value: string): value is SentryStatus {
    return ['pending', 'active', 'resolved', 'rejected'].includes(value);
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isHelpdeskEntityType(value: string): value is HelpdeskEntityType {
    return [
        'circuit',
        'bench',
        'partHeard',
        'serviceWeek',
        'otherPayment',
        'ticket',
        'medicalClaim',
        'generalRequest',
        'securityRequest',
        'visa',
        'protocol',
        'club',
        'utility_memo',
        'consolidated_utility_memo',
        'consolidated_fuel_memo',
        'aide',
        'sentry'  // ← ADDED
    ].includes(value);
}

export function isHelpdeskDocumentStatus(value: string): value is HelpdeskDocumentStatus {
    return ['draft', 'pending_approval', 'approved', 'rejected', 'returned'].includes(value);
}

export function isEStampStatus(value: string): value is EStampStatus {
    return ['pending', 'stamped', 'failed'].includes(value);
}

// ─── URL Helpers ─────────────────────────────────────────────────────────────

export function getDocumentDownloadUrl(documentId: string): string {
    return `/api/helpdesk/documents/${documentId}/download`;
}

export function getDocumentViewUrl(documentId: string): string {
    return `/api/helpdesk/documents/${documentId}/view`;
}

export function getEStampDownloadUrl(documentId: string): string {
    return `/api/helpdesk/documents/${documentId}/estampt/download`;
}

// ─── Status Transition Validation ───────────────────────────────────────────

export function validateDocumentStatusTransition(
    currentStatus: HelpdeskDocumentStatus,
    newStatus: HelpdeskDocumentStatus
): boolean {
    const validTransitions: Record<HelpdeskDocumentStatus, HelpdeskDocumentStatus[]> = {
        draft: ['pending_approval'],
        pending_approval: ['approved', 'rejected', 'returned'],
        approved: ['returned'],
        rejected: ['draft'],
        returned: ['draft'],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
}

export function getAvailableStatusTransitions(currentStatus: HelpdeskDocumentStatus): HelpdeskDocumentStatus[] {
    const transitions: Record<HelpdeskDocumentStatus, HelpdeskDocumentStatus[]> = {
        draft: ['pending_approval'],
        pending_approval: ['approved', 'rejected', 'returned'],
        approved: ['returned'],
        rejected: ['draft'],
        returned: ['draft'],
    };

    return transitions[currentStatus] || [];
}