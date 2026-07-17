// src/store/slices/helpdeskSlice.ts
import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axiosClient from "../../api/api";
import type { AxiosError } from "axios";

/* ============================================================
   TYPES
============================================================ */

export type UtilityType =
  | "Electricity"
  | "Water"
  | "Internet"
  | "Fuel"
  | "Other";
export type RequestMode = "Letter" | "Email" | "Verbal" | "Other";
export type VisaType = "Official" | "Conference" | "Personal" | "Other";
export type Status =
  | "Pending"
  | "Signed"
  | "Rejected"
  | "In Progress"
  | "Completed"
  | "Active"
  | "Resolved"
  | "Cancelled";

// ─── Unified Request Types ──────────────────────────────────────────────────

export type RequestType =
  | "Driver"
  | "Bodyguard"
  | "Firearm"
  | "Current Station"
  | "Force Number"
  | "Residence Security"
  | "Sentry";

export type RemarkType = "Onboarding" | "Release";
export type GeneralRequestCategory = "Security" | "Personnel" | "Administrative";

// ─── Unified General Request ──────────────────────────────────────────────

export interface GeneralRequest {
  id: string;
  s_no: number | null;
  ticket_number: string | null;
  judge_name: string;
  request: string;
  request_type: RequestType;
  category: GeneralRequestCategory | null;
  date_received: string | null;
  officer_assigned: string | null;
  status: Status;
  remarks: string | null;
  remark_type: RemarkType | null;
  request_date: string | null;
  location: string | null;
  firearm_type: string | null;
  force_number: string | null;
  officer_name: string | null;
  assigned_to: string | null;
  priority: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGeneralRequestInput {
  judge_name: string;
  request: string;
  request_type: RequestType;
  category?: GeneralRequestCategory;
  date_received?: string;
  officer_assigned?: string;
  status?: Status;
  remarks?: string;
  remark_type?: RemarkType;
  request_date?: string;
  location?: string;
  firearm_type?: string;
  force_number?: string;
  officer_name?: string;
  assigned_to?: string;
  priority?: string;
  notes?: string;
  email?: string;
  send_email?: boolean;
}

export interface UpdateGeneralRequestInput {
  request?: string;
  request_type?: RequestType;
  category?: GeneralRequestCategory;
  date_received?: string;
  officer_assigned?: string;
  status?: Status;
  remarks?: string;
  remark_type?: RemarkType;
  request_date?: string;
  location?: string;
  firearm_type?: string;
  force_number?: string;
  officer_name?: string;
  assigned_to?: string;
  priority?: string;
  notes?: string;
}

// ─── Security Request (Deprecated) ─────────────────────────────────────────

/**
 * @deprecated Use GeneralRequest instead
 */
export interface SecurityRequest {
  id: string;
  s_no: number | null;
  judge_name: string;
  request_type: RequestType;
  request_date: string | null;
  officer_assigned: string | null;
  status: Status;
  remarks: string | null;
  remark_type: RemarkType | null;
  location: string | null;
  firearm_type: string | null;
  force_number: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Use CreateGeneralRequestInput instead
 */
export interface CreateSecurityRequestInput {
  judge_name: string;
  request_type: RequestType;
  request_date?: string;
  officer_assigned?: string;
  status?: Status;
  remarks?: string;
  remark_type?: RemarkType;
  location?: string;
  firearm_type?: string;
  force_number?: string;
  email?: string;
  send_email?: boolean;
}

/**
 * @deprecated Use UpdateGeneralRequestInput instead
 */
export interface UpdateSecurityRequestInput {
  request_type?: RequestType;
  request_date?: string;
  officer_assigned?: string;
  status?: Status;
  remarks?: string;
  remark_type?: RemarkType;
  location?: string;
  firearm_type?: string;
  force_number?: string;
}

// ─── DSA Payment Status ────────────────────────────────────────────────────

export type DSAPaymentStatus = "Pending" | "In Process" | "Paid" | "Payment NA";

// ─── Tickets ──────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  ticket_number: string;
  ticket_type: "Bench" | "Part-Heard" | "General";
  reference_id: string | null;
  date_of_travel: string | null;
  return_date: string | null;
  departure_from: string | null;
  destination: string | null;
  preferred_flight_time: string | null;
  passenger_name: string;
  passenger_pj_number: string | null;
  flight_details: string | null;
  amount: number | null;
  status: Status;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketInput {
  ticket_type: "Bench" | "Part-Heard" | "General";
  reference_id?: string;
  date_of_travel?: string;
  return_date?: string;
  departure_from?: string;
  destination?: string;
  preferred_flight_time?: string;
  passenger_name: string;
  passenger_pj_number?: string;
  flight_details?: string;
  amount?: number;
  remarks?: string;
}

export interface UpdateTicketInput {
  date_of_travel?: string;
  return_date?: string;
  departure_from?: string;
  destination?: string;
  preferred_flight_time?: string;
  passenger_name?: string;
  passenger_pj_number?: string;
  flight_details?: string;
  amount?: number;
  status?: Status;
  remarks?: string;
}

export interface TicketFilters {
  search?: string;
  status?: Status;
  ticket_type?: "Bench" | "Part-Heard" | "General";
  reference_id?: string;
  limit?: number;
  offset?: number;
}

// ─── Judge Utilities ──────────────────────────────────────────────────────────

export type UtilityStatus =
  | "Awaiting"
  | "Awaiting Documentation"
  | "Awaiting Funding"
  | "In Process"
  | "Approved"
  | "Paid"
  | "Payment NA";

export interface UtilityItem {
  id: string;
  request_id: string;
  utility_type: UtilityType;
  requisition_number: string | null;
  amount: number;
  period: string;
  description: string | null;
  date_received: string | null;
  date_forwarded_dass: string | null;
  date_paid: string | null;
  status: UtilityStatus;
  supporting_document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface JudgeUtility {
  id: string;
  judge_name: string;
  items: UtilityItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UtilityItemInput {
  utility_type: UtilityType;
  requisition_number?: string;
  amount: number;
  period: string;
  description?: string;
  date_received?: string;
  date_forwarded_dass?: string;
  date_paid?: string;
  status?: UtilityStatus;
}

export interface CreateUtilityInput {
  judge_name: string;
  items: UtilityItemInput[];
}

export interface AddUtilityItemInput {
  utility_type: UtilityType;
  requisition_number?: string;
  amount: number;
  period: string;
  description?: string;
  date_received?: string;
  date_forwarded_dass?: string;
  date_paid?: string;
  status?: UtilityStatus;
}

export interface UpdateUtilityItemInput {
  status?: UtilityStatus;
  date_received?: string;
  date_forwarded_dass?: string;
  date_paid?: string;
  amount?: number;
  period?: string;
  description?: string;
  utility_type?: UtilityType;
  requisition_number?: string;
}

export interface UtilityFilters {
  search?: string;
  judge_name?: string;
  status?: UtilityStatus;
  limit?: number;
  offset?: number;
}

// ─── Club Membership ──────────────────────────────────────────────────────────

export interface ClubMembership {
  id: string;
  pj_no: string | null;
  judge_name: string;
  club_name: string;
  entry_fee: number | null;
  annual_fee: number | null;
  date_submitted_dass: string | null;
  court: string | null;
  payment_date: string | null;
  remarks: string | null;
  status: Status;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClubMembershipInput {
  pj_no?: string;
  judge_name: string;
  club_name: string;
  entry_fee?: number;
  annual_fee?: number;
  date_submitted_dass?: string;
  court?: string;
  payment_date?: string;
  remarks?: string;
}

// ─── DSA Details ─────────────────────────────────────────────────────────────

export interface DSADetail {
  id: string;
  judge_name: string;
  pj_number: string;
  designation: string | null;
  dsa_per_day: number;
  days: number;
  total: number;
  notes: string | null;
  date_of_request: string | null;
  date_of_ticket_facilitation: string | null;
  date_of_conference_facilitation: string | null;
  travel_date: string | null;
  travel_back: string | null;
  requisition_number: string | null;
  requisition_initiation_date: string | null;
  payment_status: DSAPaymentStatus;
}

export interface DSADetailInput {
  judge_name: string;
  pj_number: string;
  designation?: string;
  dsa_per_day: number;
  days: number;
  notes?: string;
  date_of_request?: string;
  date_of_ticket_facilitation?: string;
  date_of_conference_facilitation?: string;
  travel_date?: string;
  travel_back?: string;
  requisition_number?: string;
  requisition_initiation_date?: string;
  payment_status?: DSAPaymentStatus;
}

// ─── Circuits ────────────────────────────────────────────────────────────────

export interface Circuit {
  id: string;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  total_dsa: number;
  status: Status;
  dsa_details?: DSADetail[];
  tickets?: Ticket[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCircuitInput {
  name: string;
  location?: string;
  start_date: string;
  end_date: string;
  dsa_details?: DSADetailInput[];
}

// ─── Other Payments ──────────────────────────────────────────────────────────

export interface OtherPayment {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  total_dsa: number;
  status: Status;
  dsa_details?: DSADetail[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOtherPaymentInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  dsa_details?: DSADetailInput[];
}

// ─── Special Benches ─────────────────────────────────────────────────────────

export interface SpecialBench {
  id: string;
  name: string;
  case_reference: string | null;
  start_date: string;
  end_date: string;
  total_dsa: number;
  status: Status;
  dsa_details?: DSADetail[];
  tickets?: Ticket[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSpecialBenchInput {
  name: string;
  case_reference?: string;
  start_date: string;
  end_date: string;
  dsa_details?: DSADetailInput[];
}

export interface UpdateBenchInput {
  name?: string;
  case_reference?: string;
  start_date?: string;
  end_date?: string;
  status?: Status;
  dsa_details?: DSADetailInput[];
}

// ─── Part-Heards ─────────────────────────────────────────────────────────────

export interface PartHeard {
  id: string;
  case_reference: string;
  approved_by: string | null;
  start_date: string;
  end_date: string;
  total_dsa: number;
  status: Status;
  dsa_details?: DSADetail[];
  tickets?: Ticket[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePartHeardInput {
  case_reference: string;
  approved_by?: string;
  start_date: string;
  end_date: string;
  dsa_details?: DSADetailInput[];
}

export interface UpdatePartHeardInput {
  case_reference?: string;
  approved_by?: string;
  start_date?: string;
  end_date?: string;
  status?: Status;
  dsa_details?: DSADetailInput[];
}

// ─── Service Weeks ───────────────────────────────────────────────────────────

export interface ServiceWeek {
  id: string;
  name: string;
  week_number: string;
  year: string;
  start_date: string;
  end_date: string;
  total_dsa: number;
  status: Status;
  dsa_details?: DSADetail[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceWeekInput {
  name: string;
  week_number: string;
  year: string;
  start_date: string;
  end_date: string;
  dsa_details?: DSADetailInput[];
}

// ─── Medical Expense Claims ──────────────────────────────────────────────────

export interface MedicalClaim {
  id: string;
  s_no: number | null;
  officer_name: string;
  claim_amount: number;
  date_forwarded_dhr: string | null;
  status: Status;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMedicalClaimInput {
  officer_name: string;
  claim_amount: number;
  date_forwarded_dhr?: string;
  status?: Status;
  remarks?: string;
}

// ─── Legacy General Request (Deprecated) ──────────────────────────────────

/**
 * @deprecated Use the new GeneralRequest with request_type instead
 */
export interface LegacyGeneralRequest {
  id: string;
  s_no: number | null;
  ticket_number: string | null;
  judge_name: string;
  request: string;
  date_received: string | null;
  officer_assigned: string | null;
  status: Status;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Use CreateGeneralRequestInput with request_type instead
 */
export interface CreateLegacyGeneralRequestInput {
  judge_name: string;
  request: string;
  date_received?: string;
  officer_assigned?: string;
  status?: Status;
  remarks?: string;
  email?: string;
  send_email?: boolean;
}

// ─── Visa Support ────────────────────────────────────────────────────────────

export interface VisaDocument {
  id: string;
  visa_request_id: string;
  document_name: string;
  document_url: string;
  viewed_at: string | null;
  view_count: number;
  created_at: string;
}

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

export interface VisaRequest {
  id: string;
  s_no: number | null;
  judge_name: string;
  destination_country: string;
  date_of_travel: string | null;
  date_of_return: string | null;
  visa_type: VisaType;
  purpose_of_travel: string | null;
  remarks: string | null;
  status: Status;
  notes: string | null;
  documents?: VisaDocument[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVisaRequestInput {
  judge_name: string;
  destination_country: string;
  date_of_travel?: string;
  request_date?: string;
  date_of_return?: string;
  visa_type: VisaType;
  purpose_of_travel?: string;
  remarks?: string;
  notes?: string;
}

// ─── Protocol Support ────────────────────────────────────────────────────────

export interface ProtocolEvent {
  id: string;
  s_no: number | null;
  activity: string;
  period_from: string | null;
  period_to: string | null;
  officers_assigned: string | null;
  remarks: string | null;
  status: Status;
  notes: string | null;
  dsa_required: boolean;
  total_dsa: number;
  dsa_details?: DSADetail[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProtocolEventInput {
  activity: string;
  period_from?: string;
  period_to?: string;
  officers_assigned?: string;
  remarks?: string;
  notes?: string;
  dsa_required?: boolean;
  dsa_details?: DSADetailInput[];
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export type ReportModule = "circuit" | "special_bench" | "part_heard" | "service_week" | "other_payment";

export interface DSAReportRow {
  module: ReportModule;
  parent_id: string;
  dsa_detail_id: string;
  activity: string;
  parent_status: Status;
  judge_name: string;
  pj_number: string;
  designation: string | null;
  date_of_request: string | null;
  date_of_ticket_facilitation: string | null;
  date_of_conference_facilitation: string | null;
  travel_date: string | null;
  travel_back: string | null;
  dsa_per_day: number;
  days: number;
  total: number;
  requisition_number: string | null;
  requisition_initiation_date: string | null;
  payment_status: DSAPaymentStatus;
}

export interface DSAReportFilters {
  modules?: ReportModule[];
  judge_name?: string;
  payment_status?: DSAPaymentStatus;
  travel_start?: string;
  travel_end?: string;
  limit?: number;
  offset?: number;
}

// ─── Audit & Stats ──────────────────────────────────────────────────────────

export interface HelpDeskAuditEntry {
  id: string;
  actor: string | null;
  actor_name: string | null;
  action: string;
  detail: string | null;
  entity_type: string | null;
  entity_id: string | null;
  timestamp: string;
}

export interface HelpDeskStats {
  total_records: number;
  in_progress: number;
  visa_active: number;
  protocol_pending: number;
  tickets: number;
}

// ─── Filters ────────────────────────────────────────────────────────────────

export interface HelpDeskFilters {
  search?: string;
  status?: Status;
  judge_name?: string;
  request_type?: RequestType;
  remark_type?: RemarkType;
  category?: GeneralRequestCategory;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateStatusInput {
  status: Status;
  notes?: string;
  remarks?: string;
  email?: string;
  resolvedBy?: string;
  rejectedBy?: string;
}

// ─── Tab Types ──────────────────────────────────────────────────────────────

export type HelpDeskTab =
  | "utilities"
  | "club"
  | "circuits"
  | "otherPayments"
  | "benches"
  | "partHeard"
  | "serviceWeek"
  | "medicalClaims"
  | "generalRequests"
  | "visa"
  | "protocol"
  | "tickets"
  | "security"
  | "reports";

/* ============================================================
   STATE INTERFACE
============================================================ */

interface HelpDeskState {
  // Data
  utilities: JudgeUtility[];
  clubMemberships: ClubMembership[];
  circuits: Circuit[];
  otherPayments: OtherPayment[];
  benches: SpecialBench[];
  partHeards: PartHeard[];
  serviceWeeks: ServiceWeek[];
  medicalClaims: MedicalClaim[];
  generalRequests: GeneralRequest[];
  visaRequests: VisaRequest[];
  protocolEvents: ProtocolEvent[];
  securityRequests: SecurityRequest[];
  tickets: Ticket[];
  auditLog: HelpDeskAuditEntry[];
  stats: HelpDeskStats | null;

  // Reports
  dsaReport: DSAReportRow[];
  dsaReportFilters: DSAReportFilters;

  // Selection
  selectedUtility: JudgeUtility | null;
  selectedClubMembership: ClubMembership | null;
  selectedCircuit: Circuit | null;
  selectedOtherPayment: OtherPayment | null;
  selectedBench: SpecialBench | null;
  selectedPartHeard: PartHeard | null;
  selectedServiceWeek: ServiceWeek | null;
  selectedMedicalClaim: MedicalClaim | null;
  selectedGeneralRequest: GeneralRequest | null;
  selectedVisaRequest: VisaRequest | null;
  selectedProtocolEvent: ProtocolEvent | null;
  selectedSecurityRequest: SecurityRequest | null;
  selectedTicket: Ticket | null;

  // Document Tracking
  documentViewStatus: DocumentWithViewStatus | null;

  // UI State
  activeTab: HelpDeskTab;
  filters: HelpDeskFilters;
  utilityFilters: UtilityFilters;
  ticketFilters: TicketFilters;
  searchQuery: string;

  // Pagination
  pagination: {
    utilities: { total: number; page: number; limit: number };
    club: { total: number; page: number; limit: number };
    circuits: { total: number; page: number; limit: number };
    otherPayments: { total: number; page: number; limit: number };
    benches: { total: number; page: number; limit: number };
    partHeards: { total: number; page: number; limit: number };
    serviceWeeks: { total: number; page: number; limit: number };
    medicalClaims: { total: number; page: number; limit: number };
    generalRequests: { total: number; page: number; limit: number };
    visa: { total: number; page: number; limit: number };
    protocol: { total: number; page: number; limit: number };
    security: { total: number; page: number; limit: number };
    tickets: { total: number; page: number; limit: number };
    reports: { total: number; page: number; limit: number };
  };

  // Loading States
  loading: {
    utilities: boolean;
    club: boolean;
    circuits: boolean;
    otherPayments: boolean;
    benches: boolean;
    partHeards: boolean;
    serviceWeeks: boolean;
    medicalClaims: boolean;
    generalRequests: boolean;
    visa: boolean;
    protocol: boolean;
    security: boolean;
    tickets: boolean;
    audit: boolean;
    stats: boolean;
    reports: boolean;
    mutating: boolean;
    documentTracking: boolean;
  };

  error: string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: HelpDeskState = {
  utilities: [],
  clubMemberships: [],
  circuits: [],
  otherPayments: [],
  benches: [],
  partHeards: [],
  serviceWeeks: [],
  medicalClaims: [],
  generalRequests: [],
  visaRequests: [],
  protocolEvents: [],
  securityRequests: [],
  tickets: [],
  auditLog: [],
  stats: null,

  dsaReport: [],
  dsaReportFilters: {},

  selectedUtility: null,
  selectedClubMembership: null,
  selectedCircuit: null,
  selectedOtherPayment: null,
  selectedBench: null,
  selectedPartHeard: null,
  selectedServiceWeek: null,
  selectedMedicalClaim: null,
  selectedGeneralRequest: null,
  selectedVisaRequest: null,
  selectedProtocolEvent: null,
  selectedSecurityRequest: null,
  selectedTicket: null,

  documentViewStatus: null,

  activeTab: "utilities",
  filters: {},
  utilityFilters: {},
  ticketFilters: {},
  searchQuery: "",

  pagination: {
    utilities: { total: 0, page: 1, limit: 20 },
    club: { total: 0, page: 1, limit: 20 },
    circuits: { total: 0, page: 1, limit: 20 },
    otherPayments: { total: 0, page: 1, limit: 20 },
    benches: { total: 0, page: 1, limit: 20 },
    partHeards: { total: 0, page: 1, limit: 20 },
    serviceWeeks: { total: 0, page: 1, limit: 20 },
    medicalClaims: { total: 0, page: 1, limit: 20 },
    generalRequests: { total: 0, page: 1, limit: 20 },
    visa: { total: 0, page: 1, limit: 20 },
    protocol: { total: 0, page: 1, limit: 20 },
    security: { total: 0, page: 1, limit: 20 },
    tickets: { total: 0, page: 1, limit: 20 },
    reports: { total: 0, page: 1, limit: 20 },
  },

  loading: {
    utilities: false,
    club: false,
    circuits: false,
    otherPayments: false,
    benches: false,
    partHeards: false,
    serviceWeeks: false,
    medicalClaims: false,
    generalRequests: false,
    visa: false,
    protocol: false,
    security: false,
    tickets: false,
    audit: false,
    stats: false,
    reports: false,
    mutating: false,
    documentTracking: false,
  },

  error: null,
  success: false,
};

/* ============================================================
   HELPERS
============================================================ */

const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError.response?.data?.message ??
    axiosError.message ??
    "An unexpected error occurred"
  );
};

const buildQueryString = (
  filters: HelpDeskFilters | UtilityFilters | TicketFilters | DSAReportFilters,
): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        params.append(key, value.join(","));
      } else {
        params.append(key, String(value));
      }
    }
  });
  return params.toString() ? `?${params.toString()}` : "";
};

/* ============================================================
   THUNKS - UNIFIED GENERAL REQUESTS
============================================================ */

export const fetchGeneralRequests = createAsyncThunk(
  "helpdesk/fetchGeneralRequests",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/general${query}`);
      return data.data as GeneralRequest[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchGeneralRequestById = createAsyncThunk(
  "helpdesk/fetchGeneralRequestById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/general/${id}`);
      return data.data as GeneralRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchGeneralRequestsByJudge = createAsyncThunk(
  "helpdesk/fetchGeneralRequestsByJudge",
  async (judgeName: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/general/judge/${encodeURIComponent(judgeName)}`);
      return data.data as GeneralRequest[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchGeneralRequestsByType = createAsyncThunk(
  "helpdesk/fetchGeneralRequestsByType",
  async (requestType: RequestType, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/general/type/${requestType}`);
      return data.data as GeneralRequest[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchGeneralRequestsByRemarkType = createAsyncThunk(
  "helpdesk/fetchGeneralRequestsByRemarkType",
  async (remarkType: RemarkType, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/general/remark/${remarkType}`);
      return data.data as GeneralRequest[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createGeneralRequest = createAsyncThunk(
  "helpdesk/createGeneralRequest",
  async (input: CreateGeneralRequestInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/general", input);
      return data.data as GeneralRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateGeneralRequest = createAsyncThunk(
  "helpdesk/updateGeneralRequest",
  async (
    { id, updates }: { id: string; updates: UpdateGeneralRequestInput },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/helpdesk/general/${id}`, updates);
      return data.data as GeneralRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateGeneralRequestStatus = createAsyncThunk(
  "helpdesk/updateGeneralRequestStatus",
  async (
    { id, status, notes, email, resolvedBy, rejectedBy }: 
    { id: string; status: Status; notes?: string; email?: string; resolvedBy?: string; rejectedBy?: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.patch(
        `/helpdesk/general/${id}/status`,
        { status, notes, email, resolvedBy, rejectedBy },
      );
      return data.data as GeneralRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteGeneralRequest = createAsyncThunk(
  "helpdesk/deleteGeneralRequest",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/general/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchGeneralRequestStats = createAsyncThunk(
  "helpdesk/fetchGeneralRequestStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get("/helpdesk/general/stats");
      return data.data as {
        total: number;
        byType: Record<RequestType, number>;
        byStatus: Record<string, number>;
        byRemarkType: Record<RemarkType, number>;
        byCategory: Record<GeneralRequestCategory, number>;
      };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const sendGeneralRequestEmail = createAsyncThunk(
  "helpdesk/sendGeneralRequestEmail",
  async (
    { id, email, type }: { id: string; email: string; type: 'acknowledgement' | 'resolved' | 'rejected' },
    { rejectWithValue },
  ) => {
    try {
      await axiosClient.post(`/helpdesk/general/${id}/email`, { email, type });
      return { id, email, type };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - LEGACY SECURITY REQUESTS (Deprecated)
============================================================ */

export const fetchSecurityRequests = createAsyncThunk(
  "helpdesk/fetchSecurityRequests",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/security${query}`);
      return data.data as SecurityRequest[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchSecurityRequestById = createAsyncThunk(
  "helpdesk/fetchSecurityRequestById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/security/${id}`);
      return data.data as SecurityRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchSecurityRequestsByJudge = createAsyncThunk(
  "helpdesk/fetchSecurityRequestsByJudge",
  async (judgeName: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/security/judge/${encodeURIComponent(judgeName)}`);
      return data.data as SecurityRequest[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchSecurityRequestsByType = createAsyncThunk(
  "helpdesk/fetchSecurityRequestsByType",
  async (requestType: RequestType, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/security/type/${requestType}`);
      return data.data as SecurityRequest[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createSecurityRequest = createAsyncThunk(
  "helpdesk/createSecurityRequest",
  async (input: CreateSecurityRequestInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/security", input);
      return data.data as SecurityRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateSecurityRequest = createAsyncThunk(
  "helpdesk/updateSecurityRequest",
  async (
    { id, updates }: { id: string; updates: UpdateSecurityRequestInput },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/helpdesk/security/${id}`, updates);
      return data.data as SecurityRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateSecurityRequestStatus = createAsyncThunk(
  "helpdesk/updateSecurityRequestStatus",
  async (
    { id, status, notes }: { id: string; status: Status; notes?: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.patch(`/helpdesk/security/${id}/status`, {
        status,
        notes,
      });
      return data.data as SecurityRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteSecurityRequest = createAsyncThunk(
  "helpdesk/deleteSecurityRequest",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/security/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchSecurityRequestStats = createAsyncThunk(
  "helpdesk/fetchSecurityRequestStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get("/helpdesk/security/stats");
      return data.data as {
        total: number;
        byType: Record<RequestType, number>;
        byStatus: Record<string, number>;
        byRemarkType: Record<RemarkType, number>;
      };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - REPORTS
============================================================ */

export const fetchDSAReport = createAsyncThunk(
  "helpdesk/fetchDSAReport",
  async (filters: DSAReportFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/reports/dsa${query}`);
      return data.data as DSAReportRow[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const exportDSAReport = createAsyncThunk(
  "helpdesk/exportDSAReport",
  async (filters: DSAReportFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const response = await axiosClient.get(`/helpdesk/reports/dsa/export${query}`, {
        responseType: "blob",
      });
      return response.data as Blob;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - STATS & AUDIT
============================================================ */

export const fetchHelpDeskStats = createAsyncThunk(
  "helpdesk/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get("/helpdesk/stats");
      return data.data as HelpDeskStats;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchHelpDeskAudit = createAsyncThunk(
  "helpdesk/fetchAudit",
  async (limit: number = 50, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/audit?limit=${limit}`);
      return data.data as HelpDeskAuditEntry[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - TICKETS
============================================================ */

export const fetchTickets = createAsyncThunk(
  "helpdesk/fetchTickets",
  async (filters: TicketFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/tickets${query}`);
      return data.data as Ticket[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchTicketById = createAsyncThunk(
  "helpdesk/fetchTicketById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/tickets/${id}`);
      return data.data as Ticket;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createTicket = createAsyncThunk(
  "helpdesk/createTicket",
  async (input: CreateTicketInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/tickets", input);
      return data.data as Ticket;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateTicket = createAsyncThunk(
  "helpdesk/updateTicket",
  async (
    { id, updates }: { id: string; updates: UpdateTicketInput },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/helpdesk/tickets/${id}`, updates);
      return data.data as Ticket;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteTicket = createAsyncThunk(
  "helpdesk/deleteTicket",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/tickets/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - JUDGE UTILITIES
============================================================ */

export const fetchUtilities = createAsyncThunk(
  "helpdesk/fetchUtilities",
  async (filters: UtilityFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/utilities${query}`);
      return data.data as JudgeUtility[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchUtilityById = createAsyncThunk(
  "helpdesk/fetchUtilityById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/utilities/${id}`);
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createUtility = createAsyncThunk(
  "helpdesk/createUtility",
  async (input: CreateUtilityInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/utilities", input);
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const addUtilityItem = createAsyncThunk(
  "helpdesk/addUtilityItem",
  async (
    { id, item }: { id: string; item: AddUtilityItemInput },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.post(
        `/helpdesk/utilities/${id}/items`,
        item,
      );
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateUtilityItem = createAsyncThunk(
  "helpdesk/updateUtilityItem",
  async (
    {
      id,
      itemId,
      updates,
    }: { id: string; itemId: string; updates: UpdateUtilityItemInput },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/utilities/${id}/items/${itemId}`,
        updates,
      );
      return data.data as JudgeUtility;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteUtilityItem = createAsyncThunk(
  "helpdesk/deleteUtilityItem",
  async (
    { id, itemId }: { id: string; itemId: string },
    { rejectWithValue },
  ) => {
    try {
      await axiosClient.delete(`/helpdesk/utilities/${id}/items/${itemId}`);
      return { id, itemId };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteUtility = createAsyncThunk(
  "helpdesk/deleteUtility",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/utilities/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - CLUB MEMBERSHIP
============================================================ */

export const fetchClubMemberships = createAsyncThunk(
  "helpdesk/fetchClubMemberships",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/club${query}`);
      return data.data as ClubMembership[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchClubMembershipById = createAsyncThunk(
  "helpdesk/fetchClubMembershipById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/club/${id}`);
      return data.data as ClubMembership;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createClubMembership = createAsyncThunk(
  "helpdesk/createClubMembership",
  async (input: CreateClubMembershipInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/club", input);
      return data.data as ClubMembership;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateClubMembershipStatus = createAsyncThunk(
  "helpdesk/updateClubMembershipStatus",
  async (
    { id, status }: { id: string; status: Status },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/helpdesk/club/${id}/status`, {
        status,
      });
      return data.data as ClubMembership;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteClubMembership = createAsyncThunk(
  "helpdesk/deleteClubMembership",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/club/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - CIRCUITS
============================================================ */

export const fetchCircuits = createAsyncThunk(
  "helpdesk/fetchCircuits",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/circuits${query}`);
      return data.data as Circuit[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchCircuitById = createAsyncThunk(
  "helpdesk/fetchCircuitById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/circuits/${id}`);
      return data.data as Circuit;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createCircuit = createAsyncThunk(
  "helpdesk/createCircuit",
  async (input: CreateCircuitInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/circuits", input);
      return data.data as Circuit;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateCircuitStatus = createAsyncThunk(
  "helpdesk/updateCircuitStatus",
  async (
    { id, status }: { id: string; status: Status },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/circuits/${id}/status`,
        { status },
      );
      return data.data as Circuit;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateCircuitDSADetails = createAsyncThunk(
  "helpdesk/updateCircuitDSADetails",
  async (
    { id, dsa_details }: { id: string; dsa_details: DSADetailInput[] },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/circuits/${id}/dsa-details`,
        { dsa_details },
      );
      return data.data as Circuit;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteCircuit = createAsyncThunk(
  "helpdesk/deleteCircuit",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/circuits/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - OTHER PAYMENTS
============================================================ */

export const fetchOtherPayments = createAsyncThunk(
  "helpdesk/fetchOtherPayments",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/other-payments${query}`);
      return data.data as OtherPayment[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchOtherPaymentById = createAsyncThunk(
  "helpdesk/fetchOtherPaymentById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/other-payments/${id}`);
      return data.data as OtherPayment;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createOtherPayment = createAsyncThunk(
  "helpdesk/createOtherPayment",
  async (input: CreateOtherPaymentInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/other-payments", input);
      return data.data as OtherPayment;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateOtherPaymentStatus = createAsyncThunk(
  "helpdesk/updateOtherPaymentStatus",
  async (
    { id, status }: { id: string; status: Status },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/other-payments/${id}/status`,
        { status },
      );
      return data.data as OtherPayment;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateOtherPaymentDSADetails = createAsyncThunk(
  "helpdesk/updateOtherPaymentDSADetails",
  async (
    { id, dsa_details }: { id: string; dsa_details: DSADetailInput[] },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/other-payments/${id}/dsa-details`,
        { dsa_details },
      );
      return data.data as OtherPayment;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteOtherPayment = createAsyncThunk(
  "helpdesk/deleteOtherPayment",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/other-payments/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - SPECIAL BENCHES
============================================================ */

export const fetchBenches = createAsyncThunk(
  "helpdesk/fetchBenches",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/benches${query}`);
      return data.data as SpecialBench[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchBenchById = createAsyncThunk(
  "helpdesk/fetchBenchById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/benches/${id}`);
      return data.data as SpecialBench;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createBench = createAsyncThunk(
  "helpdesk/createBench",
  async (input: CreateSpecialBenchInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/benches", input);
      return data.data as SpecialBench;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateBench = createAsyncThunk(
  "helpdesk/updateBench",
  async (
    { id, updates }: { id: string; updates: UpdateBenchInput },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/helpdesk/benches/${id}`, updates);
      return data.data as SpecialBench;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateBenchStatus = createAsyncThunk(
  "helpdesk/updateBenchStatus",
  async (
    { id, status }: { id: string; status: Status },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/helpdesk/benches/${id}/status`, {
        status,
      });
      return data.data as SpecialBench;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteBench = createAsyncThunk(
  "helpdesk/deleteBench",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/benches/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - PART-HEARDS
============================================================ */

export const fetchPartHeards = createAsyncThunk(
  "helpdesk/fetchPartHeards",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/part-heards${query}`);
      return data.data as PartHeard[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchPartHeardById = createAsyncThunk(
  "helpdesk/fetchPartHeardById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/part-heards/${id}`);
      return data.data as PartHeard;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createPartHeard = createAsyncThunk(
  "helpdesk/createPartHeard",
  async (input: CreatePartHeardInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/part-heards", input);
      return data.data as PartHeard;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updatePartHeard = createAsyncThunk(
  "helpdesk/updatePartHeard",
  async (
    { id, updates }: { id: string; updates: UpdatePartHeardInput },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/helpdesk/part-heards/${id}`, updates);
      return data.data as PartHeard;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updatePartHeardStatus = createAsyncThunk(
  "helpdesk/updatePartHeardStatus",
  async (
    { id, status }: { id: string; status: Status },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/part-heards/${id}/status`,
        { status },
      );
      return data.data as PartHeard;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deletePartHeard = createAsyncThunk(
  "helpdesk/deletePartHeard",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/part-heards/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - SERVICE WEEKS
============================================================ */

export const fetchServiceWeeks = createAsyncThunk(
  "helpdesk/fetchServiceWeeks",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/service-weeks${query}`);
      return data.data as ServiceWeek[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchServiceWeekById = createAsyncThunk(
  "helpdesk/fetchServiceWeekById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/service-weeks/${id}`);
      return data.data as ServiceWeek;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createServiceWeek = createAsyncThunk(
  "helpdesk/createServiceWeek",
  async (input: CreateServiceWeekInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/service-weeks", input);
      return data.data as ServiceWeek;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateServiceWeekStatus = createAsyncThunk(
  "helpdesk/updateServiceWeekStatus",
  async (
    { id, status }: { id: string; status: Status },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/service-weeks/${id}/status`,
        { status },
      );
      return data.data as ServiceWeek;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteServiceWeek = createAsyncThunk(
  "helpdesk/deleteServiceWeek",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/service-weeks/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - MEDICAL EXPENSE CLAIMS
============================================================ */

export const fetchMedicalClaims = createAsyncThunk(
  "helpdesk/fetchMedicalClaims",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/medical-claims${query}`);
      return data.data as MedicalClaim[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchMedicalClaimById = createAsyncThunk(
  "helpdesk/fetchMedicalClaimById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/medical-claims/${id}`);
      return data.data as MedicalClaim;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createMedicalClaim = createAsyncThunk(
  "helpdesk/createMedicalClaim",
  async (input: CreateMedicalClaimInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/medical-claims", input);
      return data.data as MedicalClaim;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateMedicalClaimStatus = createAsyncThunk(
  "helpdesk/updateMedicalClaimStatus",
  async (
    { id, status, remarks }: { id: string; status: Status; remarks?: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/medical-claims/${id}/status`,
        { status, remarks },
      );
      return data.data as MedicalClaim;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteMedicalClaim = createAsyncThunk(
  "helpdesk/deleteMedicalClaim",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/medical-claims/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - VISA SUPPORT
============================================================ */

export const fetchVisaRequests = createAsyncThunk(
  "helpdesk/fetchVisaRequests",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/visa${query}`);
      return data.data as VisaRequest[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchVisaRequestById = createAsyncThunk(
  "helpdesk/fetchVisaRequestById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/visa/${id}`);
      return data.data as VisaRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createVisaRequest = createAsyncThunk(
  "helpdesk/createVisaRequest",
  async (input: CreateVisaRequestInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/visa", input);
      return data.data as VisaRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateVisaStatus = createAsyncThunk(
  "helpdesk/updateVisaStatus",
  async (
    { id, status, notes }: { id: string; status: Status; notes?: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/helpdesk/visa/${id}/status`, {
        status,
        notes,
      });
      return data.data as VisaRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteVisaRequest = createAsyncThunk(
  "helpdesk/deleteVisaRequest",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/visa/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

// ─── Visa Document Tracking Thunks ──────────────────────────────────────────

export const markDocumentViewed = createAsyncThunk(
  "helpdesk/markDocumentViewed",
  async (documentId: string, { rejectWithValue }) => {
    try {
      await axiosClient.post(`/helpdesk/visa/documents/${documentId}/view`);
      return documentId;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchDocumentViewStatus = createAsyncThunk(
  "helpdesk/fetchDocumentViewStatus",
  async (
    { documentId, includeViewers = false }: { documentId: string; includeViewers?: boolean },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.get(
        `/helpdesk/visa/documents/${documentId}/status?include_viewers=${includeViewers}`
      );
      return data.data as DocumentWithViewStatus;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   THUNKS - PROTOCOL SUPPORT
============================================================ */

export const fetchProtocolEvents = createAsyncThunk(
  "helpdesk/fetchProtocolEvents",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/protocol${query}`);
      return data.data as ProtocolEvent[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchProtocolEventById = createAsyncThunk(
  "helpdesk/fetchProtocolEventById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/protocol/${id}`);
      return data.data as ProtocolEvent;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createProtocolEvent = createAsyncThunk(
  "helpdesk/createProtocolEvent",
  async (input: CreateProtocolEventInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/protocol", input);
      return data.data as ProtocolEvent;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateProtocolStatus = createAsyncThunk(
  "helpdesk/updateProtocolStatus",
  async (
    { id, status, notes }: { id: string; status: Status; notes?: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/protocol/${id}/status`,
        { status, notes },
      );
      return data.data as ProtocolEvent;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteProtocolEvent = createAsyncThunk(
  "helpdesk/deleteProtocolEvent",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/protocol/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

/* ============================================================
   SLICE
============================================================ */

const helpdeskSlice = createSlice({
  name: "helpdesk",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<HelpDeskTab>) {
      state.activeTab = action.payload;
    },

    setFilters(state, action: PayloadAction<Partial<HelpDeskFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setUtilityFilters(state, action: PayloadAction<Partial<UtilityFilters>>) {
      state.utilityFilters = { ...state.utilityFilters, ...action.payload };
    },
    setTicketFilters(state, action: PayloadAction<Partial<TicketFilters>>) {
      state.ticketFilters = { ...state.ticketFilters, ...action.payload };
    },
    setDSAReportFilters(state, action: PayloadAction<Partial<DSAReportFilters>>) {
      state.dsaReportFilters = { ...state.dsaReportFilters, ...action.payload };
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      state.filters.search = action.payload || undefined;
      state.utilityFilters.search = action.payload || undefined;
      state.ticketFilters.search = action.payload || undefined;
    },
    clearFilters(state) {
      state.filters = {};
      state.utilityFilters = {};
      state.ticketFilters = {};
      state.dsaReportFilters = {};
      state.searchQuery = "";
    },

    setPagination(
      state,
      action: PayloadAction<{
        module: keyof typeof state.pagination;
        page: number;
        limit?: number;
      }>,
    ) {
      const { module, page, limit } = action.payload;
      if (state.pagination[module]) {
        state.pagination[module].page = page;
        if (limit) state.pagination[module].limit = limit;
      }
    },

    setSelectedUtility(state, action: PayloadAction<JudgeUtility | null>) {
      state.selectedUtility = action.payload;
    },
    setSelectedClubMembership(
      state,
      action: PayloadAction<ClubMembership | null>,
    ) {
      state.selectedClubMembership = action.payload;
    },
    setSelectedCircuit(state, action: PayloadAction<Circuit | null>) {
      state.selectedCircuit = action.payload;
    },
    setSelectedOtherPayment(state, action: PayloadAction<OtherPayment | null>) {
      state.selectedOtherPayment = action.payload;
    },
    setSelectedBench(state, action: PayloadAction<SpecialBench | null>) {
      state.selectedBench = action.payload;
    },
    setSelectedPartHeard(state, action: PayloadAction<PartHeard | null>) {
      state.selectedPartHeard = action.payload;
    },
    setSelectedServiceWeek(state, action: PayloadAction<ServiceWeek | null>) {
      state.selectedServiceWeek = action.payload;
    },
    setSelectedMedicalClaim(state, action: PayloadAction<MedicalClaim | null>) {
      state.selectedMedicalClaim = action.payload;
    },
    setSelectedGeneralRequest(
      state,
      action: PayloadAction<GeneralRequest | null>,
    ) {
      state.selectedGeneralRequest = action.payload;
    },
    setSelectedVisaRequest(state, action: PayloadAction<VisaRequest | null>) {
      state.selectedVisaRequest = action.payload;
    },
    setSelectedProtocolEvent(
      state,
      action: PayloadAction<ProtocolEvent | null>,
    ) {
      state.selectedProtocolEvent = action.payload;
    },
    setSelectedSecurityRequest(
      state,
      action: PayloadAction<SecurityRequest | null>,
    ) {
      state.selectedSecurityRequest = action.payload;
    },
    setSelectedTicket(state, action: PayloadAction<Ticket | null>) {
      state.selectedTicket = action.payload;
    },
    setDocumentViewStatus(state, action: PayloadAction<DocumentWithViewStatus | null>) {
      state.documentViewStatus = action.payload;
    },

    // ─── Optimistic Updates ─────────────────────────────────────────────

    updateUtilityItemOptimistically(
      state,
      action: PayloadAction<{
        id: string;
        itemId: string;
        status: UtilityStatus;
      }>,
    ) {
      const { id, itemId, status } = action.payload;
      const utility = state.utilities.find((u) => u.id === id);
      const item = utility?.items.find((i) => i.id === itemId);
      if (item) item.status = status;
      if (state.selectedUtility?.id === id) {
        const selectedItem = state.selectedUtility.items.find(
          (i) => i.id === itemId,
        );
        if (selectedItem) selectedItem.status = status;
      }
    },
    updateClubOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status }>,
    ) {
      const { id, status } = action.payload;
      const membership = state.clubMemberships.find((c) => c.id === id);
      if (membership) membership.status = status;
      if (state.selectedClubMembership?.id === id)
        state.selectedClubMembership.status = status;
    },
    updateCircuitOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status }>,
    ) {
      const { id, status } = action.payload;
      const circuit = state.circuits.find((c) => c.id === id);
      if (circuit) circuit.status = status;
      if (state.selectedCircuit?.id === id)
        state.selectedCircuit.status = status;
    },
    updateOtherPaymentOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status }>,
    ) {
      const { id, status } = action.payload;
      const payment = state.otherPayments.find((p) => p.id === id);
      if (payment) payment.status = status;
      if (state.selectedOtherPayment?.id === id)
        state.selectedOtherPayment.status = status;
    },
    updateBenchOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status }>,
    ) {
      const { id, status } = action.payload;
      const bench = state.benches.find((b) => b.id === id);
      if (bench) bench.status = status;
      if (state.selectedBench?.id === id) state.selectedBench.status = status;
    },
    updatePartHeardOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status }>,
    ) {
      const { id, status } = action.payload;
      const partHeard = state.partHeards.find((p) => p.id === id);
      if (partHeard) partHeard.status = status;
      if (state.selectedPartHeard?.id === id)
        state.selectedPartHeard.status = status;
    },
    updateServiceWeekOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status }>,
    ) {
      const { id, status } = action.payload;
      const week = state.serviceWeeks.find((w) => w.id === id);
      if (week) week.status = status;
      if (state.selectedServiceWeek?.id === id)
        state.selectedServiceWeek.status = status;
    },
    updateMedicalClaimOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status; remarks?: string }>,
    ) {
      const { id, status, remarks } = action.payload;
      const claim = state.medicalClaims.find((c) => c.id === id);
      if (claim) {
        claim.status = status;
        if (remarks !== undefined) claim.remarks = remarks;
      }
      if (state.selectedMedicalClaim?.id === id) {
        state.selectedMedicalClaim.status = status;
        if (remarks !== undefined) state.selectedMedicalClaim.remarks = remarks;
      }
    },
    updateGeneralRequestOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status; remarks?: string }>,
    ) {
      const { id, status, remarks } = action.payload;
      const request = state.generalRequests.find((r) => r.id === id);
      if (request) {
        request.status = status;
        if (remarks !== undefined) request.remarks = remarks;
      }
      if (state.selectedGeneralRequest?.id === id) {
        state.selectedGeneralRequest.status = status;
        if (remarks !== undefined) state.selectedGeneralRequest.remarks = remarks;
      }
    },
    updateVisaOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status; notes?: string }>,
    ) {
      const { id, status, notes } = action.payload;
      const visa = state.visaRequests.find((v) => v.id === id);
      if (visa) {
        visa.status = status;
        if (notes !== undefined) visa.notes = notes;
      }
      if (state.selectedVisaRequest?.id === id) {
        state.selectedVisaRequest.status = status;
        if (notes !== undefined) state.selectedVisaRequest.notes = notes;
      }
    },
    updateProtocolOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status; notes?: string }>,
    ) {
      const { id, status, notes } = action.payload;
      const event = state.protocolEvents.find((p) => p.id === id);
      if (event) {
        event.status = status;
        if (notes !== undefined) event.notes = notes;
      }
      if (state.selectedProtocolEvent?.id === id) {
        state.selectedProtocolEvent.status = status;
        if (notes !== undefined) state.selectedProtocolEvent.notes = notes;
      }
    },
    updateSecurityRequestOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status; remarks?: string }>,
    ) {
      const { id, status, remarks } = action.payload;
      const request = state.securityRequests.find((r) => r.id === id);
      if (request) {
        request.status = status;
        if (remarks !== undefined) request.remarks = remarks;
      }
      if (state.selectedSecurityRequest?.id === id) {
        state.selectedSecurityRequest.status = status;
        if (remarks !== undefined) state.selectedSecurityRequest.remarks = remarks;
      }
    },
    updateTicketOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status; remarks?: string }>,
    ) {
      const { id, status, remarks } = action.payload;
      const ticket = state.tickets.find((t) => t.id === id);
      if (ticket) {
        ticket.status = status;
        if (remarks !== undefined) ticket.remarks = remarks;
      }
      if (state.selectedTicket?.id === id) {
        state.selectedTicket.status = status;
        if (remarks !== undefined) state.selectedTicket.remarks = remarks;
      }
    },

    clearError(state) {
      state.error = null;
    },
    clearSuccess(state) {
      state.success = false;
    },
    resetHelpDeskState: () => initialState,
  },
  extraReducers: (builder) => {
    /* ──────── UNIFIED GENERAL REQUESTS ────────────────────────────────── */
    builder
      .addCase(fetchGeneralRequests.pending, (state) => {
        state.loading.generalRequests = true;
        state.error = null;
      })
      .addCase(
        fetchGeneralRequests.fulfilled,
        (state, action: PayloadAction<GeneralRequest[]>) => {
          state.loading.generalRequests = false;
          state.generalRequests = action.payload;
          state.pagination.generalRequests.total = action.payload.length;
        },
      )
      .addCase(fetchGeneralRequests.rejected, (state, action) => {
        state.loading.generalRequests = false;
        state.error = action.payload as string;
      })
      .addCase(createGeneralRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createGeneralRequest.fulfilled,
        (state, action: PayloadAction<GeneralRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          state.generalRequests = [action.payload, ...state.generalRequests];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createGeneralRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateGeneralRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateGeneralRequest.fulfilled,
        (state, action: PayloadAction<GeneralRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.generalRequests.findIndex(
            (r) => r.id === action.payload.id,
          );
          if (index !== -1) state.generalRequests[index] = action.payload;
          if (state.selectedGeneralRequest?.id === action.payload.id)
            state.selectedGeneralRequest = action.payload;
        },
      )
      .addCase(updateGeneralRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateGeneralRequestStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateGeneralRequestStatus.fulfilled,
        (state, action: PayloadAction<GeneralRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.generalRequests.findIndex(
            (r) => r.id === action.payload.id,
          );
          if (index !== -1) state.generalRequests[index] = action.payload;
          if (state.selectedGeneralRequest?.id === action.payload.id)
            state.selectedGeneralRequest = action.payload;
        },
      )
      .addCase(updateGeneralRequestStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteGeneralRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteGeneralRequest.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.generalRequests = state.generalRequests.filter(
            (r) => r.id !== action.payload,
          );
          if (state.selectedGeneralRequest?.id === action.payload)
            state.selectedGeneralRequest = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteGeneralRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      })
      .addCase(fetchGeneralRequestsByJudge.pending, (state) => {
        state.loading.generalRequests = true;
        state.error = null;
      })
      .addCase(
        fetchGeneralRequestsByJudge.fulfilled,
        (state, action: PayloadAction<GeneralRequest[]>) => {
          state.loading.generalRequests = false;
          state.generalRequests = action.payload;
        },
      )
      .addCase(fetchGeneralRequestsByJudge.rejected, (state, action) => {
        state.loading.generalRequests = false;
        state.error = action.payload as string;
      })
      .addCase(fetchGeneralRequestsByType.pending, (state) => {
        state.loading.generalRequests = true;
        state.error = null;
      })
      .addCase(
        fetchGeneralRequestsByType.fulfilled,
        (state, action: PayloadAction<GeneralRequest[]>) => {
          state.loading.generalRequests = false;
          state.generalRequests = action.payload;
        },
      )
      .addCase(fetchGeneralRequestsByType.rejected, (state, action) => {
        state.loading.generalRequests = false;
        state.error = action.payload as string;
      })
      .addCase(fetchGeneralRequestsByRemarkType.pending, (state) => {
        state.loading.generalRequests = true;
        state.error = null;
      })
      .addCase(
        fetchGeneralRequestsByRemarkType.fulfilled,
        (state, action: PayloadAction<GeneralRequest[]>) => {
          state.loading.generalRequests = false;
          state.generalRequests = action.payload;
        },
      )
      .addCase(fetchGeneralRequestsByRemarkType.rejected, (state, action) => {
        state.loading.generalRequests = false;
        state.error = action.payload as string;
      });

    /* ──────── LEGACY SECURITY REQUESTS ────────────────────────────────── */
    builder
      .addCase(fetchSecurityRequests.pending, (state) => {
        state.loading.security = true;
        state.error = null;
      })
      .addCase(
        fetchSecurityRequests.fulfilled,
        (state, action: PayloadAction<SecurityRequest[]>) => {
          state.loading.security = false;
          state.securityRequests = action.payload;
          state.pagination.security.total = action.payload.length;
        },
      )
      .addCase(fetchSecurityRequests.rejected, (state, action) => {
        state.loading.security = false;
        state.error = action.payload as string;
      })
      .addCase(createSecurityRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createSecurityRequest.fulfilled,
        (state, action: PayloadAction<SecurityRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          state.securityRequests = [action.payload, ...state.securityRequests];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createSecurityRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateSecurityRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateSecurityRequest.fulfilled,
        (state, action: PayloadAction<SecurityRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.securityRequests.findIndex(
            (r) => r.id === action.payload.id,
          );
          if (index !== -1) state.securityRequests[index] = action.payload;
          if (state.selectedSecurityRequest?.id === action.payload.id)
            state.selectedSecurityRequest = action.payload;
        },
      )
      .addCase(updateSecurityRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateSecurityRequestStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateSecurityRequestStatus.fulfilled,
        (state, action: PayloadAction<SecurityRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.securityRequests.findIndex(
            (r) => r.id === action.payload.id,
          );
          if (index !== -1) state.securityRequests[index] = action.payload;
          if (state.selectedSecurityRequest?.id === action.payload.id)
            state.selectedSecurityRequest = action.payload;
        },
      )
      .addCase(updateSecurityRequestStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteSecurityRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteSecurityRequest.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.securityRequests = state.securityRequests.filter(
            (r) => r.id !== action.payload,
          );
          if (state.selectedSecurityRequest?.id === action.payload)
            state.selectedSecurityRequest = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteSecurityRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── REPORTS ────────────────────────────────────────────────── */
    builder
      .addCase(fetchDSAReport.pending, (state) => {
        state.loading.reports = true;
        state.error = null;
      })
      .addCase(
        fetchDSAReport.fulfilled,
        (state, action: PayloadAction<DSAReportRow[]>) => {
          state.loading.reports = false;
          state.dsaReport = action.payload;
          state.pagination.reports.total = action.payload.length;
        },
      )
      .addCase(fetchDSAReport.rejected, (state, action) => {
        state.loading.reports = false;
        state.error = action.payload as string;
      });

    /* ──────── STATS ───────────────────────────────────────────────────── */
    builder
      .addCase(fetchHelpDeskStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(
        fetchHelpDeskStats.fulfilled,
        (state, action: PayloadAction<HelpDeskStats>) => {
          state.loading.stats = false;
          state.stats = action.payload;
        },
      )
      .addCase(fetchHelpDeskStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload as string;
      });

    /* ──────── AUDIT ────────────────────────────────────────────────────── */
    builder
      .addCase(fetchHelpDeskAudit.pending, (state) => {
        state.loading.audit = true;
        state.error = null;
      })
      .addCase(
        fetchHelpDeskAudit.fulfilled,
        (state, action: PayloadAction<HelpDeskAuditEntry[]>) => {
          state.loading.audit = false;
          state.auditLog = action.payload;
        },
      )
      .addCase(fetchHelpDeskAudit.rejected, (state, action) => {
        state.loading.audit = false;
        state.error = action.payload as string;
      });

    /* ──────── DOCUMENT TRACKING ───────────────────────────────────────── */
    builder
      .addCase(markDocumentViewed.pending, (state) => {
        state.loading.documentTracking = true;
        state.error = null;
      })
      .addCase(
        markDocumentViewed.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.documentTracking = false;
          state.success = true;
          const docId = action.payload;
          for (const visa of state.visaRequests) {
            const doc = visa.documents?.find((d) => d.id === docId);
            if (doc) {
              doc.view_count = (doc.view_count || 0) + 1;
              doc.viewed_at = doc.viewed_at || new Date().toISOString();
              break;
            }
          }
          if (state.documentViewStatus && state.documentViewStatus.id === docId) {
            state.documentViewStatus.view_count += 1;
            state.documentViewStatus.viewed_at = state.documentViewStatus.viewed_at || new Date().toISOString();
          }
        },
      )
      .addCase(markDocumentViewed.rejected, (state, action) => {
        state.loading.documentTracking = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(fetchDocumentViewStatus.pending, (state) => {
        state.loading.documentTracking = true;
        state.error = null;
      })
      .addCase(
        fetchDocumentViewStatus.fulfilled,
        (state, action: PayloadAction<DocumentWithViewStatus>) => {
          state.loading.documentTracking = false;
          state.documentViewStatus = action.payload;
        },
      )
      .addCase(fetchDocumentViewStatus.rejected, (state, action) => {
        state.loading.documentTracking = false;
        state.error = action.payload as string;
      });

    /* ──────── TICKETS ──────────────────────────────────────────────────── */
    builder
      .addCase(fetchTickets.pending, (state) => {
        state.loading.tickets = true;
        state.error = null;
      })
      .addCase(
        fetchTickets.fulfilled,
        (state, action: PayloadAction<Ticket[]>) => {
          state.loading.tickets = false;
          state.tickets = action.payload;
          state.pagination.tickets.total = action.payload.length;
        },
      )
      .addCase(fetchTickets.rejected, (state, action) => {
        state.loading.tickets = false;
        state.error = action.payload as string;
      })
      .addCase(createTicket.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createTicket.fulfilled,
        (state, action: PayloadAction<Ticket>) => {
          state.loading.mutating = false;
          state.success = true;
          state.tickets = [action.payload, ...state.tickets];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createTicket.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateTicket.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateTicket.fulfilled,
        (state, action: PayloadAction<Ticket>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.tickets.findIndex((t) => t.id === action.payload.id);
          if (index !== -1) state.tickets[index] = action.payload;
          if (state.selectedTicket?.id === action.payload.id)
            state.selectedTicket = action.payload;
        },
      )
      .addCase(updateTicket.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteTicket.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteTicket.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.tickets = state.tickets.filter((t) => t.id !== action.payload);
          if (state.selectedTicket?.id === action.payload)
            state.selectedTicket = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteTicket.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── UTILITIES ───────────────────────────────────────────────── */
    builder
      .addCase(fetchUtilities.pending, (state) => {
        state.loading.utilities = true;
        state.error = null;
      })
      .addCase(
        fetchUtilities.fulfilled,
        (state, action: PayloadAction<JudgeUtility[]>) => {
          state.loading.utilities = false;
          state.utilities = action.payload;
          state.pagination.utilities.total = action.payload.length;
        },
      )
      .addCase(fetchUtilities.rejected, (state, action) => {
        state.loading.utilities = false;
        state.error = action.payload as string;
      })
      .addCase(createUtility.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createUtility.fulfilled,
        (state, action: PayloadAction<JudgeUtility>) => {
          state.loading.mutating = false;
          state.success = true;
          state.utilities = [action.payload, ...state.utilities];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createUtility.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(addUtilityItem.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        addUtilityItem.fulfilled,
        (state, action: PayloadAction<JudgeUtility>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.utilities.findIndex(
            (u) => u.id === action.payload.id,
          );
          if (index !== -1) state.utilities[index] = action.payload;
          if (state.selectedUtility?.id === action.payload.id)
            state.selectedUtility = action.payload;
        },
      )
      .addCase(addUtilityItem.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateUtilityItem.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateUtilityItem.fulfilled,
        (state, action: PayloadAction<JudgeUtility>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.utilities.findIndex(
            (u) => u.id === action.payload.id,
          );
          if (index !== -1) state.utilities[index] = action.payload;
          if (state.selectedUtility?.id === action.payload.id)
            state.selectedUtility = action.payload;
        },
      )
      .addCase(updateUtilityItem.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteUtilityItem.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteUtilityItem.fulfilled,
        (
          state,
          action: PayloadAction<{ id: string; itemId: string }>,
        ) => {
          state.loading.mutating = false;
          const { id, itemId } = action.payload;
          const utility = state.utilities.find((u) => u.id === id);
          if (utility) {
            utility.items = utility.items.filter((i) => i.id !== itemId);
          }
          if (state.selectedUtility?.id === id) {
            state.selectedUtility.items = state.selectedUtility.items.filter(
              (i) => i.id !== itemId,
            );
          }
        },
      )
      .addCase(deleteUtilityItem.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      })
      .addCase(deleteUtility.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteUtility.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.utilities = state.utilities.filter(
            (u) => u.id !== action.payload,
          );
          if (state.selectedUtility?.id === action.payload)
            state.selectedUtility = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteUtility.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── CLUB MEMBERSHIPS ────────────────────────────────────────── */
    builder
      .addCase(fetchClubMemberships.pending, (state) => {
        state.loading.club = true;
        state.error = null;
      })
      .addCase(
        fetchClubMemberships.fulfilled,
        (state, action: PayloadAction<ClubMembership[]>) => {
          state.loading.club = false;
          state.clubMemberships = action.payload;
          state.pagination.club.total = action.payload.length;
        },
      )
      .addCase(fetchClubMemberships.rejected, (state, action) => {
        state.loading.club = false;
        state.error = action.payload as string;
      })
      .addCase(createClubMembership.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createClubMembership.fulfilled,
        (state, action: PayloadAction<ClubMembership>) => {
          state.loading.mutating = false;
          state.success = true;
          state.clubMemberships = [action.payload, ...state.clubMemberships];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createClubMembership.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateClubMembershipStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateClubMembershipStatus.fulfilled,
        (state, action: PayloadAction<ClubMembership>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.clubMemberships.findIndex(
            (c) => c.id === action.payload.id,
          );
          if (index !== -1) state.clubMemberships[index] = action.payload;
          if (state.selectedClubMembership?.id === action.payload.id)
            state.selectedClubMembership = action.payload;
        },
      )
      .addCase(updateClubMembershipStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteClubMembership.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteClubMembership.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.clubMemberships = state.clubMemberships.filter(
            (c) => c.id !== action.payload,
          );
          if (state.selectedClubMembership?.id === action.payload)
            state.selectedClubMembership = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteClubMembership.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── CIRCUITS ─────────────────────────────────────────────────── */
    builder
      .addCase(fetchCircuits.pending, (state) => {
        state.loading.circuits = true;
        state.error = null;
      })
      .addCase(
        fetchCircuits.fulfilled,
        (state, action: PayloadAction<Circuit[]>) => {
          state.loading.circuits = false;
          state.circuits = action.payload;
          state.pagination.circuits.total = action.payload.length;
        },
      )
      .addCase(fetchCircuits.rejected, (state, action) => {
        state.loading.circuits = false;
        state.error = action.payload as string;
      })
      .addCase(createCircuit.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createCircuit.fulfilled,
        (state, action: PayloadAction<Circuit>) => {
          state.loading.mutating = false;
          state.success = true;
          state.circuits = [action.payload, ...state.circuits];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createCircuit.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateCircuitStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateCircuitStatus.fulfilled,
        (state, action: PayloadAction<Circuit>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.circuits.findIndex(
            (c) => c.id === action.payload.id,
          );
          if (index !== -1) state.circuits[index] = action.payload;
          if (state.selectedCircuit?.id === action.payload.id)
            state.selectedCircuit = action.payload;
        },
      )
      .addCase(updateCircuitStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateCircuitDSADetails.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateCircuitDSADetails.fulfilled,
        (state, action: PayloadAction<Circuit>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.circuits.findIndex(
            (c) => c.id === action.payload.id,
          );
          if (index !== -1) state.circuits[index] = action.payload;
          if (state.selectedCircuit?.id === action.payload.id)
            state.selectedCircuit = action.payload;
        },
      )
      .addCase(updateCircuitDSADetails.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteCircuit.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteCircuit.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.circuits = state.circuits.filter(
            (c) => c.id !== action.payload,
          );
          if (state.selectedCircuit?.id === action.payload)
            state.selectedCircuit = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteCircuit.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── OTHER PAYMENTS ───────────────────────────────────────────── */
    builder
      .addCase(fetchOtherPayments.pending, (state) => {
        state.loading.otherPayments = true;
        state.error = null;
      })
      .addCase(
        fetchOtherPayments.fulfilled,
        (state, action: PayloadAction<OtherPayment[]>) => {
          state.loading.otherPayments = false;
          state.otherPayments = action.payload;
          state.pagination.otherPayments.total = action.payload.length;
        },
      )
      .addCase(fetchOtherPayments.rejected, (state, action) => {
        state.loading.otherPayments = false;
        state.error = action.payload as string;
      })
      .addCase(createOtherPayment.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createOtherPayment.fulfilled,
        (state, action: PayloadAction<OtherPayment>) => {
          state.loading.mutating = false;
          state.success = true;
          state.otherPayments = [action.payload, ...state.otherPayments];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createOtherPayment.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateOtherPaymentStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateOtherPaymentStatus.fulfilled,
        (state, action: PayloadAction<OtherPayment>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.otherPayments.findIndex(
            (p) => p.id === action.payload.id,
          );
          if (index !== -1) state.otherPayments[index] = action.payload;
          if (state.selectedOtherPayment?.id === action.payload.id)
            state.selectedOtherPayment = action.payload;
        },
      )
      .addCase(updateOtherPaymentStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateOtherPaymentDSADetails.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateOtherPaymentDSADetails.fulfilled,
        (state, action: PayloadAction<OtherPayment>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.otherPayments.findIndex(
            (p) => p.id === action.payload.id,
          );
          if (index !== -1) state.otherPayments[index] = action.payload;
          if (state.selectedOtherPayment?.id === action.payload.id)
            state.selectedOtherPayment = action.payload;
        },
      )
      .addCase(updateOtherPaymentDSADetails.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteOtherPayment.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteOtherPayment.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.otherPayments = state.otherPayments.filter(
            (p) => p.id !== action.payload,
          );
          if (state.selectedOtherPayment?.id === action.payload)
            state.selectedOtherPayment = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteOtherPayment.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── BENCHES ──────────────────────────────────────────────────── */
    builder
      .addCase(fetchBenches.pending, (state) => {
        state.loading.benches = true;
        state.error = null;
      })
      .addCase(
        fetchBenches.fulfilled,
        (state, action: PayloadAction<SpecialBench[]>) => {
          state.loading.benches = false;
          state.benches = action.payload;
          state.pagination.benches.total = action.payload.length;
        },
      )
      .addCase(fetchBenches.rejected, (state, action) => {
        state.loading.benches = false;
        state.error = action.payload as string;
      })
      .addCase(createBench.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createBench.fulfilled,
        (state, action: PayloadAction<SpecialBench>) => {
          state.loading.mutating = false;
          state.success = true;
          state.benches = [action.payload, ...state.benches];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createBench.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateBench.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateBench.fulfilled,
        (state, action: PayloadAction<SpecialBench>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.benches.findIndex(
            (b) => b.id === action.payload.id,
          );
          if (index !== -1) state.benches[index] = action.payload;
          if (state.selectedBench?.id === action.payload.id)
            state.selectedBench = action.payload;
        },
      )
      .addCase(updateBench.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateBenchStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateBenchStatus.fulfilled,
        (state, action: PayloadAction<SpecialBench>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.benches.findIndex(
            (b) => b.id === action.payload.id,
          );
          if (index !== -1) state.benches[index] = action.payload;
          if (state.selectedBench?.id === action.payload.id)
            state.selectedBench = action.payload;
        },
      )
      .addCase(updateBenchStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteBench.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteBench.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.benches = state.benches.filter((b) => b.id !== action.payload);
          if (state.selectedBench?.id === action.payload)
            state.selectedBench = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteBench.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── PART-HEARDS ─────────────────────────────────────────────── */
    builder
      .addCase(fetchPartHeards.pending, (state) => {
        state.loading.partHeards = true;
        state.error = null;
      })
      .addCase(
        fetchPartHeards.fulfilled,
        (state, action: PayloadAction<PartHeard[]>) => {
          state.loading.partHeards = false;
          state.partHeards = action.payload;
          state.pagination.partHeards.total = action.payload.length;
        },
      )
      .addCase(fetchPartHeards.rejected, (state, action) => {
        state.loading.partHeards = false;
        state.error = action.payload as string;
      })
      .addCase(createPartHeard.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createPartHeard.fulfilled,
        (state, action: PayloadAction<PartHeard>) => {
          state.loading.mutating = false;
          state.success = true;
          state.partHeards = [action.payload, ...state.partHeards];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createPartHeard.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updatePartHeard.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updatePartHeard.fulfilled,
        (state, action: PayloadAction<PartHeard>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.partHeards.findIndex(
            (p) => p.id === action.payload.id,
          );
          if (index !== -1) state.partHeards[index] = action.payload;
          if (state.selectedPartHeard?.id === action.payload.id)
            state.selectedPartHeard = action.payload;
        },
      )
      .addCase(updatePartHeard.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updatePartHeardStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updatePartHeardStatus.fulfilled,
        (state, action: PayloadAction<PartHeard>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.partHeards.findIndex(
            (p) => p.id === action.payload.id,
          );
          if (index !== -1) state.partHeards[index] = action.payload;
          if (state.selectedPartHeard?.id === action.payload.id)
            state.selectedPartHeard = action.payload;
        },
      )
      .addCase(updatePartHeardStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deletePartHeard.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deletePartHeard.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.partHeards = state.partHeards.filter(
            (p) => p.id !== action.payload,
          );
          if (state.selectedPartHeard?.id === action.payload)
            state.selectedPartHeard = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deletePartHeard.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── SERVICE WEEKS ───────────────────────────────────────────── */
    builder
      .addCase(fetchServiceWeeks.pending, (state) => {
        state.loading.serviceWeeks = true;
        state.error = null;
      })
      .addCase(
        fetchServiceWeeks.fulfilled,
        (state, action: PayloadAction<ServiceWeek[]>) => {
          state.loading.serviceWeeks = false;
          state.serviceWeeks = action.payload;
          state.pagination.serviceWeeks.total = action.payload.length;
        },
      )
      .addCase(fetchServiceWeeks.rejected, (state, action) => {
        state.loading.serviceWeeks = false;
        state.error = action.payload as string;
      })
      .addCase(createServiceWeek.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createServiceWeek.fulfilled,
        (state, action: PayloadAction<ServiceWeek>) => {
          state.loading.mutating = false;
          state.success = true;
          state.serviceWeeks = [action.payload, ...state.serviceWeeks];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createServiceWeek.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateServiceWeekStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateServiceWeekStatus.fulfilled,
        (state, action: PayloadAction<ServiceWeek>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.serviceWeeks.findIndex(
            (w) => w.id === action.payload.id,
          );
          if (index !== -1) state.serviceWeeks[index] = action.payload;
          if (state.selectedServiceWeek?.id === action.payload.id)
            state.selectedServiceWeek = action.payload;
        },
      )
      .addCase(updateServiceWeekStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteServiceWeek.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteServiceWeek.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.serviceWeeks = state.serviceWeeks.filter(
            (w) => w.id !== action.payload,
          );
          if (state.selectedServiceWeek?.id === action.payload)
            state.selectedServiceWeek = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteServiceWeek.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── MEDICAL CLAIMS ───────────────────────────────────────────── */
    builder
      .addCase(fetchMedicalClaims.pending, (state) => {
        state.loading.medicalClaims = true;
        state.error = null;
      })
      .addCase(
        fetchMedicalClaims.fulfilled,
        (state, action: PayloadAction<MedicalClaim[]>) => {
          state.loading.medicalClaims = false;
          state.medicalClaims = action.payload;
          state.pagination.medicalClaims.total = action.payload.length;
        },
      )
      .addCase(fetchMedicalClaims.rejected, (state, action) => {
        state.loading.medicalClaims = false;
        state.error = action.payload as string;
      })
      .addCase(createMedicalClaim.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createMedicalClaim.fulfilled,
        (state, action: PayloadAction<MedicalClaim>) => {
          state.loading.mutating = false;
          state.success = true;
          state.medicalClaims = [action.payload, ...state.medicalClaims];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createMedicalClaim.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateMedicalClaimStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateMedicalClaimStatus.fulfilled,
        (state, action: PayloadAction<MedicalClaim>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.medicalClaims.findIndex(
            (c) => c.id === action.payload.id,
          );
          if (index !== -1) state.medicalClaims[index] = action.payload;
          if (state.selectedMedicalClaim?.id === action.payload.id)
            state.selectedMedicalClaim = action.payload;
        },
      )
      .addCase(updateMedicalClaimStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteMedicalClaim.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteMedicalClaim.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.medicalClaims = state.medicalClaims.filter(
            (c) => c.id !== action.payload,
          );
          if (state.selectedMedicalClaim?.id === action.payload)
            state.selectedMedicalClaim = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteMedicalClaim.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── VISA REQUESTS ───────────────────────────────────────────── */
    builder
      .addCase(fetchVisaRequests.pending, (state) => {
        state.loading.visa = true;
        state.error = null;
      })
      .addCase(
        fetchVisaRequests.fulfilled,
        (state, action: PayloadAction<VisaRequest[]>) => {
          state.loading.visa = false;
          state.visaRequests = action.payload;
          state.pagination.visa.total = action.payload.length;
        },
      )
      .addCase(fetchVisaRequests.rejected, (state, action) => {
        state.loading.visa = false;
        state.error = action.payload as string;
      })
      .addCase(createVisaRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createVisaRequest.fulfilled,
        (state, action: PayloadAction<VisaRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          state.visaRequests = [action.payload, ...state.visaRequests];
          if (state.stats) {
            state.stats.total_records += 1;
            if (action.payload.status === "Active")
              state.stats.visa_active += 1;
          }
        },
      )
      .addCase(createVisaRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateVisaStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateVisaStatus.fulfilled,
        (state, action: PayloadAction<VisaRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.visaRequests.findIndex(
            (v) => v.id === action.payload.id,
          );
          if (index !== -1) state.visaRequests[index] = action.payload;
          if (state.selectedVisaRequest?.id === action.payload.id)
            state.selectedVisaRequest = action.payload;
        },
      )
      .addCase(updateVisaStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteVisaRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteVisaRequest.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          const deleted = state.visaRequests.find(
            (v) => v.id === action.payload,
          );
          state.visaRequests = state.visaRequests.filter(
            (v) => v.id !== action.payload,
          );
          if (state.selectedVisaRequest?.id === action.payload)
            state.selectedVisaRequest = null;
          if (state.stats && deleted?.status === "Active")
            state.stats.visa_active -= 1;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteVisaRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ──────── PROTOCOL EVENTS ──────────────────────────────────────────── */
    builder
      .addCase(fetchProtocolEvents.pending, (state) => {
        state.loading.protocol = true;
        state.error = null;
      })
      .addCase(
        fetchProtocolEvents.fulfilled,
        (state, action: PayloadAction<ProtocolEvent[]>) => {
          state.loading.protocol = false;
          state.protocolEvents = action.payload;
          state.pagination.protocol.total = action.payload.length;
        },
      )
      .addCase(fetchProtocolEvents.rejected, (state, action) => {
        state.loading.protocol = false;
        state.error = action.payload as string;
      })
      .addCase(createProtocolEvent.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createProtocolEvent.fulfilled,
        (state, action: PayloadAction<ProtocolEvent>) => {
          state.loading.mutating = false;
          state.success = true;
          state.protocolEvents = [action.payload, ...state.protocolEvents];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createProtocolEvent.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateProtocolStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateProtocolStatus.fulfilled,
        (state, action: PayloadAction<ProtocolEvent>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.protocolEvents.findIndex(
            (p) => p.id === action.payload.id,
          );
          if (index !== -1) state.protocolEvents[index] = action.payload;
          if (state.selectedProtocolEvent?.id === action.payload.id)
            state.selectedProtocolEvent = action.payload;
        },
      )
      .addCase(updateProtocolStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteProtocolEvent.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteProtocolEvent.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          const deleted = state.protocolEvents.find(
            (p) => p.id === action.payload,
          );
          state.protocolEvents = state.protocolEvents.filter(
            (p) => p.id !== action.payload,
          );
          if (state.selectedProtocolEvent?.id === action.payload)
            state.selectedProtocolEvent = null;
          if (state.stats && deleted?.status === "Pending")
            state.stats.protocol_pending -= 1;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteProtocolEvent.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setActiveTab,
  setFilters,
  setUtilityFilters,
  setTicketFilters,
  setDSAReportFilters,
  setSearchQuery,
  clearFilters,
  setPagination,
  setSelectedUtility,
  setSelectedClubMembership,
  setSelectedCircuit,
  setSelectedOtherPayment,
  setSelectedBench,
  setSelectedPartHeard,
  setSelectedServiceWeek,
  setSelectedMedicalClaim,
  setSelectedGeneralRequest,
  setSelectedVisaRequest,
  setSelectedProtocolEvent,
  setSelectedSecurityRequest,
  setSelectedTicket,
  setDocumentViewStatus,
  updateUtilityItemOptimistically,
  updateClubOptimistically,
  updateCircuitOptimistically,
  updateOtherPaymentOptimistically,
  updateBenchOptimistically,
  updatePartHeardOptimistically,
  updateServiceWeekOptimistically,
  updateMedicalClaimOptimistically,
  updateGeneralRequestOptimistically,
  updateVisaOptimistically,
  updateProtocolOptimistically,
  updateSecurityRequestOptimistically,
  updateTicketOptimistically,
  clearError,
  clearSuccess,
  resetHelpDeskState,
} = helpdeskSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ─── All Data ──────────────────────────────────────────────────────────────
export const selectAllUtilities = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.utilities;
export const selectAllClubMemberships = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.clubMemberships;
export const selectAllCircuits = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.circuits;
export const selectAllOtherPayments = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.otherPayments;
export const selectAllBenches = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.benches;
export const selectAllPartHeards = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.partHeards;
export const selectAllServiceWeeks = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.serviceWeeks;
export const selectAllMedicalClaims = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.medicalClaims;
export const selectAllGeneralRequests = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.generalRequests;
export const selectAllVisaRequests = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.visaRequests;
export const selectAllProtocolEvents = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.protocolEvents;
export const selectAllSecurityRequests = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.securityRequests;
export const selectAllTickets = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.tickets;
export const selectHelpDeskAudit = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.auditLog;
export const selectHelpDeskStats = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.stats;

// ─── Reports ────────────────────────────────────────────────────────────────
export const selectDSAReport = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.dsaReport;
export const selectDSAReportFilters = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.dsaReportFilters;
export const selectDSAReportLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.reports;

// ─── Selected Items ────────────────────────────────────────────────────────
export const selectSelectedUtility = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedUtility;
export const selectSelectedClubMembership = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.selectedClubMembership;
export const selectSelectedCircuit = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedCircuit;
export const selectSelectedOtherPayment = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedOtherPayment;
export const selectSelectedBench = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedBench;
export const selectSelectedPartHeard = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedPartHeard;
export const selectSelectedServiceWeek = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedServiceWeek;
export const selectSelectedMedicalClaim = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedMedicalClaim;
export const selectSelectedGeneralRequest = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.selectedGeneralRequest;
export const selectSelectedVisaRequest = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedVisaRequest;
export const selectSelectedProtocolEvent = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.selectedProtocolEvent;
export const selectSelectedSecurityRequest = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.selectedSecurityRequest;
export const selectSelectedTicket = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedTicket;
export const selectDocumentViewStatus = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.documentViewStatus;

// ─── Filters & UI ──────────────────────────────────────────────────────────
export const selectActiveTab = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.activeTab;
export const selectHelpDeskFilters = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.filters;
export const selectUtilityFilters = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.utilityFilters;
export const selectTicketFilters = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.ticketFilters;
export const selectHelpDeskSearch = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.searchQuery;

// ─── Loading States ────────────────────────────────────────────────────────
export const selectUtilitiesLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.utilities;
export const selectClubLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.club;
export const selectCircuitsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.circuits;
export const selectOtherPaymentsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.otherPayments;
export const selectBenchesLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.benches;
export const selectPartHeardsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.partHeards;
export const selectServiceWeeksLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.serviceWeeks;
export const selectMedicalClaimsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.medicalClaims;
export const selectGeneralRequestsLoading = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.loading.generalRequests;
export const selectVisaLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.visa;
export const selectProtocolLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.protocol;
export const selectSecurityLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.security;
export const selectTicketsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.tickets;
export const selectAuditLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.audit;
export const selectStatsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.stats;
export const selectHelpDeskMutating = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.mutating;
export const selectDocumentTrackingLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.documentTracking;

// ─── Status ────────────────────────────────────────────────────────────────
export const selectHelpDeskError = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.error;
export const selectHelpDeskSuccess = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.success;

// ─── Pagination ────────────────────────────────────────────────────────────
export const selectUtilitiesPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.utilities;
export const selectClubPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.club;
export const selectCircuitsPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.circuits;
export const selectOtherPaymentsPagination = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.pagination.otherPayments;
export const selectBenchesPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.benches;
export const selectPartHeardsPagination = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.pagination.partHeards;
export const selectServiceWeeksPagination = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.pagination.serviceWeeks;
export const selectMedicalClaimsPagination = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.pagination.medicalClaims;
export const selectGeneralRequestsPagination = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.pagination.generalRequests;
export const selectVisaPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.visa;
export const selectProtocolPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.protocol;
export const selectSecurityPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.security;
export const selectTicketsPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.tickets;
export const selectReportsPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.reports;

// ─── Derived Selectors ──────────────────────────────────────────────────────

export const selectAllUtilityItems = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.utilities.flatMap((u) =>
    u.items.map((item) => ({ ...item, judge_name: u.judge_name })),
  );

export const selectUtilityItemsByStatus =
  (status: UtilityStatus) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.utilities.flatMap((u) =>
      u.items
        .filter((item) => item.status === status)
        .map((item) => ({ ...item, judge_name: u.judge_name })),
    );

export const selectCircuitsByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.circuits.filter((c) => c.status === status);

export const selectOtherPaymentsByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.otherPayments.filter((p) => p.status === status);

export const selectBenchesByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.benches.filter((b) => b.status === status);

export const selectPartHeardsByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.partHeards.filter((p) => p.status === status);

export const selectMedicalClaimsByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.medicalClaims.filter((c) => c.status === status);

export const selectGeneralRequestsByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.generalRequests.filter((r) => r.status === status);

export const selectGeneralRequestsByType =
  (requestType: RequestType) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.generalRequests.filter((r) => r.request_type === requestType);

export const selectGeneralRequestsByRemarkType =
  (remarkType: RemarkType) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.generalRequests.filter((r) => r.remark_type === remarkType);

export const selectGeneralRequestsByCategory =
  (category: GeneralRequestCategory) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.generalRequests.filter((r) => r.category === category);

// ─── Legacy Security Request Selectors ────────────────────────────────────

export const selectSecurityRequestsByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.securityRequests.filter((r) => r.status === status);

export const selectSecurityRequestsByType =
  (requestType: RequestType) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.securityRequests.filter((r) => r.request_type === requestType);

export const selectSecurityRequestsByRemarkType =
  (remarkType: RemarkType) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.securityRequests.filter((r) => r.remark_type === remarkType);

// ─── Ticket Selectors ──────────────────────────────────────────────────────

export const selectTicketsByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.tickets.filter((t) => t.status === status);

export const selectTicketsByType =
  (ticketType: "Bench" | "Part-Heard" | "General") =>
  (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.tickets.filter((t) => t.ticket_type === ticketType);

export const selectTicketsByReference =
  (referenceId: string) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.tickets.filter((t) => t.reference_id === referenceId);

// ─── Report Derived Selectors ──────────────────────────────────────────────

export const selectDSAReportByModule =
  (module: ReportModule) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.dsaReport.filter((row) => row.module === module);

export const selectDSAReportByPaymentStatus =
  (status: DSAPaymentStatus) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.dsaReport.filter((row) => row.payment_status === status);

export const selectDSAReportTotal = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.dsaReport.reduce((sum, row) => sum + row.total, 0);

export const selectDSAReportByJudge =
  (judgeName: string) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.dsaReport.filter(
      (row) => row.judge_name.toLowerCase().includes(judgeName.toLowerCase()),
    );

// ─── Document Tracking Selectors ───────────────────────────────────────────

export const selectDocumentViewCount = (documentId: string) => (state: { helpdesk: HelpDeskState }) => {
  const doc = state.helpdesk.visaRequests
    .flatMap(v => v.documents || [])
    .find(d => d.id === documentId);
  return doc?.view_count || 0;
};

export const selectDocumentViewedAt = (documentId: string) => (state: { helpdesk: HelpDeskState }) => {
  const doc = state.helpdesk.visaRequests
    .flatMap(v => v.documents || [])
    .find(d => d.id === documentId);
  return doc?.viewed_at || null;
};

export const selectDocumentViewers = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.documentViewStatus?.viewers || [];

// ─── Pending Counts ─────────────────────────────────────────────────────────

export const selectAwaitingUtilityItemsCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.utilities.reduce(
    (sum, u) =>
      sum +
      u.items.filter((item) =>
        [
          "Awaiting",
          "Awaiting Documentation",
          "Awaiting Funding",
          "In Process",
        ].includes(item.status),
      ).length,
    0,
  );

export const selectPendingClubCount = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.clubMemberships.filter((c) => c.status === "Pending").length;

export const selectPendingCircuitsCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.circuits.filter(
    (c) => c.status === "Pending" || c.status === "In Progress",
  ).length;

export const selectPendingOtherPaymentsCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.otherPayments.filter(
    (p) => p.status === "Pending" || p.status === "In Progress",
  ).length;

export const selectPendingMedicalClaimsCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.medicalClaims.filter(
    (c) => c.status === "Pending" || c.status === "In Progress",
  ).length;

export const selectPendingGeneralRequestsCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.generalRequests.filter(
    (r) => r.status === "Pending" || r.status === "In Progress",
  ).length;

export const selectPendingSecurityRequestsCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.securityRequests.filter(
    (r) => r.status === "Pending" || r.status === "In Progress",
  ).length;

export const selectPendingProtocolCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.protocolEvents.filter((p) => p.status === "Pending").length;

export const selectPendingTicketsCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.tickets.filter(
    (t) => t.status === "Pending" || t.status === "In Progress",
  ).length;

// ─── Unified General Request Stats ────────────────────────────────────────

export const selectGeneralRequestStats = (state: { helpdesk: HelpDeskState }) => {
  const requests = state.helpdesk.generalRequests;
  const byType = requests.reduce((acc, r) => {
    acc[r.request_type] = (acc[r.request_type] || 0) + 1;
    return acc;
  }, {} as Record<RequestType, number>);

  const byStatus = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byRemarkType = requests.reduce((acc, r) => {
    if (r.remark_type) {
      acc[r.remark_type] = (acc[r.remark_type] || 0) + 1;
    }
    return acc;
  }, {} as Record<RemarkType, number>);

  const byCategory = requests.reduce((acc, r) => {
    if (r.category) {
      acc[r.category] = (acc[r.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<GeneralRequestCategory, number>);

  return {
    total: requests.length,
    byType,
    byStatus,
    byRemarkType,
    byCategory,
  };
};

// ─── Legacy Security Request Stats ────────────────────────────────────────

export const selectSecurityRequestStats = (state: { helpdesk: HelpDeskState }) => {
  const requests = state.helpdesk.securityRequests;
  const byType = requests.reduce((acc, r) => {
    acc[r.request_type] = (acc[r.request_type] || 0) + 1;
    return acc;
  }, {} as Record<RequestType, number>);

  const byStatus = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byRemarkType = requests.reduce((acc, r) => {
    if (r.remark_type) {
      acc[r.remark_type] = (acc[r.remark_type] || 0) + 1;
    }
    return acc;
  }, {} as Record<RemarkType, number>);

  return {
    total: requests.length,
    byType,
    byStatus,
    byRemarkType,
  };
};

// ─── Total DSA ──────────────────────────────────────────────────────────────

export const selectTotalCircuitDSA = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.circuits.reduce((sum, c) => sum + c.total_dsa, 0);

export const selectTotalOtherPaymentDSA = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.otherPayments.reduce((sum, p) => sum + p.total_dsa, 0);

export const selectTotalBenchDSA = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.benches.reduce((sum, b) => sum + b.total_dsa, 0);

export const selectTotalPartHeardDSA = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.partHeards.reduce((sum, p) => sum + p.total_dsa, 0);

export const selectTotalServiceWeekDSA = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.serviceWeeks.reduce((sum, w) => sum + w.total_dsa, 0);

export const selectTotalProtocolDSA = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.protocolEvents.reduce((sum, p) => sum + p.total_dsa, 0);

export default helpdeskSlice.reducer;