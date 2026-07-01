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
  | "Resolved";

export interface DSADetail {
  id: string;
  judge_name: string;
  pj_number: string;
  dsa_per_day: number;
  days: number;
  total: number;
  notes: string | null;  // Added notes field
}

export interface DSADetailInput {
  judge_name: string;
  pj_number: string;
  dsa_per_day: number;
  days: number;
  notes?: string;  // Optional for input
}

export interface JudgeUtility {
  id: string;
  judge_name: string;
  utility_type: UtilityType;
  amount: number;
  period: string;
  description: string | null;
  supporting_document_url: string | null;
  status: Status;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClubMembership {
  id: string;
  judge_name: string;
  club_name: string;
  annual_fee: number;
  period: string;
  supporting_document_url: string | null;
  status: Status;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Circuit {
  id: string;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  total_dsa: number;
  status: Status;
  dsa_details?: DSADetail[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecialBench {
  id: string;
  name: string;
  case_reference: string | null;
  start_date: string;
  end_date: string;
  total_dsa: number;
  status: Status;
  dsa_details?: DSADetail[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartHeard {
  id: string;
  case_reference: string;
  approved_by: string | null;
  start_date: string;
  end_date: string;
  total_dsa: number;
  status: Status;
  dsa_details?: DSADetail[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JudgeRequest {
  id: string;
  judge_name: string;
  nature: string;
  mode: RequestMode;
  received_date: string;
  status: Status;
  resolution_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisaDocument {
  id: string;
  visa_request_id: string;
  document_name: string;
  document_url: string;
  created_at: string;
}

export interface VisaRequest {
  id: string;
  judge_name: string;
  request_date: string;
  destination_country: string;
  visa_type: VisaType;
  travel_date: string | null;
  status: Status;
  notes: string | null;
  documents?: VisaDocument[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProtocolEvent {
  id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  dsa_required: boolean;
  total_dsa: number;
  status: Status;
  notes: string | null;
  dsa_details?: DSADetail[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

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
}

export interface CreateUtilityInput {
  judge_name: string;
  utility_type: UtilityType;
  amount: number;
  period: string;
  description?: string;
}

export interface CreateClubMembershipInput {
  judge_name: string;
  club_name: string;
  annual_fee: number;
  period: string;
}

export interface CreateCircuitInput {
  name: string;
  location?: string;
  start_date: string;
  end_date: string;
  dsa_details?: DSADetailInput[];
}

export interface CreateSpecialBenchInput {
  name: string;
  case_reference?: string;
  start_date: string;
  end_date: string;
  dsa_details?: DSADetailInput[];
}

export interface CreatePartHeardInput {
  case_reference: string;
  approved_by?: string;
  start_date: string;
  end_date: string;
  dsa_details?: DSADetailInput[];
}

export interface CreateJudgeRequestInput {
  judge_name: string;
  nature: string;
  mode: RequestMode;
  received_date: string;
}

export interface CreateVisaRequestInput {
  judge_name: string;
  request_date: string;
  destination_country: string;
  visa_type: VisaType;
  travel_date?: string;
  notes?: string;
}

export interface CreateProtocolEventInput {
  event_name: string;
  start_date: string;
  end_date: string;
  dsa_required?: boolean;
  dsa_details?: DSADetailInput[];
  notes?: string;
}

export interface UpdateStatusInput {
  status: Status;
  notes?: string;
}

export interface UpdateCircuitDSADetailsInput {
  dsa_details: DSADetailInput[];
}

export interface HelpDeskFilters {
  search?: string;
  status?: Status;
  judge_name?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

// ─── Tab Types ──────────────────────────────────────────────────────────────

export type HelpDeskTab =
  | "utilities"
  | "club"
  | "circuits"
  | "benches"
  | "partHeard"
  | "requests"
  | "visa"
  | "protocol";

/* ============================================================
   STATE INTERFACE
============================================================ */

interface HelpDeskState {
  // Data
  utilities: JudgeUtility[];
  clubMemberships: ClubMembership[];
  circuits: Circuit[];
  benches: SpecialBench[];
  partHeards: PartHeard[];
  requests: JudgeRequest[];
  visaRequests: VisaRequest[];
  protocolEvents: ProtocolEvent[];
  auditLog: HelpDeskAuditEntry[];
  stats: HelpDeskStats | null;

  // Selection
  selectedUtility: JudgeUtility | null;
  selectedClubMembership: ClubMembership | null;
  selectedCircuit: Circuit | null;
  selectedBench: SpecialBench | null;
  selectedPartHeard: PartHeard | null;
  selectedRequest: JudgeRequest | null;
  selectedVisaRequest: VisaRequest | null;
  selectedProtocolEvent: ProtocolEvent | null;

  // UI State
  activeTab: HelpDeskTab;
  filters: HelpDeskFilters;
  searchQuery: string;

  // Pagination
  pagination: {
    utilities: { total: number; page: number; limit: number };
    club: { total: number; page: number; limit: number };
    circuits: { total: number; page: number; limit: number };
    benches: { total: number; page: number; limit: number };
    partHeards: { total: number; page: number; limit: number };
    requests: { total: number; page: number; limit: number };
    visa: { total: number; page: number; limit: number };
    protocol: { total: number; page: number; limit: number };
  };

  // Loading States
  loading: {
    utilities: boolean;
    club: boolean;
    circuits: boolean;
    benches: boolean;
    partHeards: boolean;
    requests: boolean;
    visa: boolean;
    protocol: boolean;
    audit: boolean;
    stats: boolean;
    mutating: boolean;
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
  benches: [],
  partHeards: [],
  requests: [],
  visaRequests: [],
  protocolEvents: [],
  auditLog: [],
  stats: null,

  selectedUtility: null,
  selectedClubMembership: null,
  selectedCircuit: null,
  selectedBench: null,
  selectedPartHeard: null,
  selectedRequest: null,
  selectedVisaRequest: null,
  selectedProtocolEvent: null,

  activeTab: "utilities",
  filters: {},
  searchQuery: "",

  pagination: {
    utilities: { total: 0, page: 1, limit: 20 },
    club: { total: 0, page: 1, limit: 20 },
    circuits: { total: 0, page: 1, limit: 20 },
    benches: { total: 0, page: 1, limit: 20 },
    partHeards: { total: 0, page: 1, limit: 20 },
    requests: { total: 0, page: 1, limit: 20 },
    visa: { total: 0, page: 1, limit: 20 },
    protocol: { total: 0, page: 1, limit: 20 },
  },

  loading: {
    utilities: false,
    club: false,
    circuits: false,
    benches: false,
    partHeards: false,
    requests: false,
    visa: false,
    protocol: false,
    audit: false,
    stats: false,
    mutating: false,
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

const buildQueryString = (filters: HelpDeskFilters): string => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  return params.toString() ? `?${params.toString()}` : "";
};

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
   THUNKS - JUDGE UTILITIES
============================================================ */

export const fetchUtilities = createAsyncThunk(
  "helpdesk/fetchUtilities",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
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

export const updateUtilityStatus = createAsyncThunk(
  "helpdesk/updateUtilityStatus",
  async (
    { id, status }: { id: string; status: Status },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(
        `/helpdesk/utilities/${id}/status`,
        { status },
      );
      return data.data as JudgeUtility;
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
   THUNKS - JUDGES' REQUESTS
============================================================ */

export const fetchRequests = createAsyncThunk(
  "helpdesk/fetchRequests",
  async (filters: HelpDeskFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const { data } = await axiosClient.get(`/helpdesk/requests${query}`);
      return data.data as JudgeRequest[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const fetchRequestById = createAsyncThunk(
  "helpdesk/fetchRequestById",
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/helpdesk/requests/${id}`);
      return data.data as JudgeRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createRequest = createAsyncThunk(
  "helpdesk/createRequest",
  async (input: CreateJudgeRequestInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/helpdesk/requests", input);
      return data.data as JudgeRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateRequest = createAsyncThunk(
  "helpdesk/updateRequest",
  async (
    {
      id,
      status,
      resolution_notes,
    }: { id: string; status: Status; resolution_notes?: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await axiosClient.put(`/helpdesk/requests/${id}`, {
        status,
        resolution_notes,
      });
      return data.data as JudgeRequest;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const deleteRequest = createAsyncThunk(
  "helpdesk/deleteRequest",
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/helpdesk/requests/${id}`);
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
    // ─── Tab Selection ──────────────────────────────────────────────────
    setActiveTab(state, action: PayloadAction<HelpDeskTab>) {
      state.activeTab = action.payload;
    },

    // ─── Filters ────────────────────────────────────────────────────────
    setFilters(state, action: PayloadAction<Partial<HelpDeskFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      state.filters.search = action.payload || undefined;
    },
    clearFilters(state) {
      state.filters = {};
      state.searchQuery = "";
    },

    // ─── Pagination ─────────────────────────────────────────────────────
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

    // ─── Selection ─────────────────────────────────────────────────────
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
    setSelectedBench(state, action: PayloadAction<SpecialBench | null>) {
      state.selectedBench = action.payload;
    },
    setSelectedPartHeard(state, action: PayloadAction<PartHeard | null>) {
      state.selectedPartHeard = action.payload;
    },
    setSelectedRequest(state, action: PayloadAction<JudgeRequest | null>) {
      state.selectedRequest = action.payload;
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

    // ─── Optimistic Updates ─────────────────────────────────────────────
    updateUtilityOptimistically(
      state,
      action: PayloadAction<{ id: string; status: Status }>,
    ) {
      const { id, status } = action.payload;
      const utility = state.utilities.find((u) => u.id === id);
      if (utility) utility.status = status;
      if (state.selectedUtility?.id === id)
        state.selectedUtility.status = status;
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
    updateRequestOptimistically(
      state,
      action: PayloadAction<{
        id: string;
        status: Status;
        resolution_notes?: string;
      }>,
    ) {
      const { id, status, resolution_notes } = action.payload;
      const request = state.requests.find((r) => r.id === id);
      if (request) {
        request.status = status;
        if (resolution_notes !== undefined)
          request.resolution_notes = resolution_notes;
      }
      if (state.selectedRequest?.id === id) {
        state.selectedRequest.status = status;
        if (resolution_notes !== undefined)
          state.selectedRequest.resolution_notes = resolution_notes;
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

    // ─── Status ─────────────────────────────────────────────────────────
    clearError(state) {
      state.error = null;
    },
    clearSuccess(state) {
      state.success = false;
    },
    resetHelpDeskState: () => initialState,
  },
  extraReducers: (builder) => {
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

    /* ──────── UTILITIES ────────────────────────────────────────────────── */
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
      .addCase(updateUtilityStatus.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateUtilityStatus.fulfilled,
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
      .addCase(updateUtilityStatus.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
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

    /* ──────── REQUESTS ─────────────────────────────────────────────────── */
    builder
      .addCase(fetchRequests.pending, (state) => {
        state.loading.requests = true;
        state.error = null;
      })
      .addCase(
        fetchRequests.fulfilled,
        (state, action: PayloadAction<JudgeRequest[]>) => {
          state.loading.requests = false;
          state.requests = action.payload;
          state.pagination.requests.total = action.payload.length;
        },
      )
      .addCase(fetchRequests.rejected, (state, action) => {
        state.loading.requests = false;
        state.error = action.payload as string;
      })
      .addCase(createRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        createRequest.fulfilled,
        (state, action: PayloadAction<JudgeRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          state.requests = [action.payload, ...state.requests];
          if (state.stats) state.stats.total_records += 1;
        },
      )
      .addCase(createRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(updateRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(
        updateRequest.fulfilled,
        (state, action: PayloadAction<JudgeRequest>) => {
          state.loading.mutating = false;
          state.success = true;
          const index = state.requests.findIndex(
            (r) => r.id === action.payload.id,
          );
          if (index !== -1) state.requests[index] = action.payload;
          if (state.selectedRequest?.id === action.payload.id)
            state.selectedRequest = action.payload;
        },
      )
      .addCase(updateRequest.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      })
      .addCase(deleteRequest.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(
        deleteRequest.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading.mutating = false;
          state.requests = state.requests.filter(
            (r) => r.id !== action.payload,
          );
          if (state.selectedRequest?.id === action.payload)
            state.selectedRequest = null;
          if (state.stats) state.stats.total_records -= 1;
        },
      )
      .addCase(deleteRequest.rejected, (state, action) => {
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
  setSearchQuery,
  clearFilters,
  setPagination,
  setSelectedUtility,
  setSelectedClubMembership,
  setSelectedCircuit,
  setSelectedBench,
  setSelectedPartHeard,
  setSelectedRequest,
  setSelectedVisaRequest,
  setSelectedProtocolEvent,
  updateUtilityOptimistically,
  updateClubOptimistically,
  updateCircuitOptimistically,
  updateBenchOptimistically,
  updatePartHeardOptimistically,
  updateRequestOptimistically,
  updateVisaOptimistically,
  updateProtocolOptimistically,
  clearError,
  clearSuccess,
  resetHelpDeskState,
} = helpdeskSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

// ─── All Data ──────────────────────────────────────────────────────────────────
export const selectAllUtilities = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.utilities;
export const selectAllClubMemberships = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.clubMemberships;
export const selectAllCircuits = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.circuits;
export const selectAllBenches = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.benches;
export const selectAllPartHeards = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.partHeards;
export const selectAllRequests = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.requests;
export const selectAllVisaRequests = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.visaRequests;
export const selectAllProtocolEvents = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.protocolEvents;
export const selectHelpDeskAudit = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.auditLog;
export const selectHelpDeskStats = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.stats;

// ─── Selected Items ────────────────────────────────────────────────────────────
export const selectSelectedUtility = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedUtility;
export const selectSelectedClubMembership = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.selectedClubMembership;
export const selectSelectedCircuit = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedCircuit;
export const selectSelectedBench = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedBench;
export const selectSelectedPartHeard = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedPartHeard;
export const selectSelectedRequest = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedRequest;
export const selectSelectedVisaRequest = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.selectedVisaRequest;
export const selectSelectedProtocolEvent = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.selectedProtocolEvent;

// ─── Filters & UI ──────────────────────────────────────────────────────────────
export const selectActiveTab = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.activeTab;
export const selectHelpDeskFilters = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.filters;
export const selectHelpDeskSearch = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.searchQuery;

// ─── Loading States ────────────────────────────────────────────────────────────
export const selectUtilitiesLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.utilities;
export const selectClubLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.club;
export const selectCircuitsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.circuits;
export const selectBenchesLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.benches;
export const selectPartHeardsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.partHeards;
export const selectRequestsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.requests;
export const selectVisaLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.visa;
export const selectProtocolLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.protocol;
export const selectAuditLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.audit;
export const selectStatsLoading = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.stats;
export const selectHelpDeskMutating = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.loading.mutating;

// ─── Status ────────────────────────────────────────────────────────────────────
export const selectHelpDeskError = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.error;
export const selectHelpDeskSuccess = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.success;

// ─── Pagination ────────────────────────────────────────────────────────────────
export const selectUtilitiesPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.utilities;
export const selectClubPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.club;
export const selectCircuitsPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.circuits;
export const selectBenchesPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.benches;
export const selectPartHeardsPagination = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.pagination.partHeards;
export const selectRequestsPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.requests;
export const selectVisaPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.visa;
export const selectProtocolPagination = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.pagination.protocol;

// ─── Derived Selectors ──────────────────────────────────────────────────────

// Get items by status
export const selectUtilitiesByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.utilities.filter((u) => u.status === status);

export const selectCircuitsByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.circuits.filter((c) => c.status === status);

export const selectBenchesByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.benches.filter((b) => b.status === status);

export const selectRequestsByStatus =
  (status: Status) => (state: { helpdesk: HelpDeskState }) =>
    state.helpdesk.requests.filter((r) => r.status === status);

// Get pending counts by module
export const selectPendingUtilitiesCount = (state: {
  helpdesk: HelpDeskState;
}) => state.helpdesk.utilities.filter((u) => u.status === "Pending").length;

export const selectPendingClubCount = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.clubMemberships.filter((c) => c.status === "Pending").length;

export const selectPendingCircuitsCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.circuits.filter(
    (c) => c.status === "Pending" || c.status === "In Progress",
  ).length;

export const selectPendingProtocolCount = (state: {
  helpdesk: HelpDeskState;
}) =>
  state.helpdesk.protocolEvents.filter((p) => p.status === "Pending").length;

// Get total DSA across all modules
export const selectTotalCircuitDSA = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.circuits.reduce((sum, c) => sum + c.total_dsa, 0);

export const selectTotalBenchDSA = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.benches.reduce((sum, b) => sum + b.total_dsa, 0);

export const selectTotalPartHeardDSA = (state: { helpdesk: HelpDeskState }) =>
  state.helpdesk.partHeards.reduce((sum, p) => sum + p.total_dsa, 0);

export default helpdeskSlice.reducer;