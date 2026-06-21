// src/types/registry.types.ts

import type { StationType } from "../store/slices/stationsSlice";


export type RegistryPriority =
  | 'normal'
  | 'urgent'
  | 'confidential'
  | 'for_information_only';

export type RegistryStatus =
  | 'in_transit'
  | 'received'
  | 'filed'
  | 'returned';

export interface RegistryEntry {
  id:               string;
  document_id:      string;
  document_title:   string;
  document_ref_no:  string | null;
  station_id:       string;
  station_name:     string;
  station_type:     StationType;
  routed_by:        string;
  routed_by_name:   string;
  priority:         RegistryPriority;
  note:             string | null;
  status:           RegistryStatus;
  routed_at:        Date;
  received_at:      Date | null;
  received_by:      string | null;
  received_by_name: string | null;
  is_active:        boolean;
  created_at:       Date;
}

export interface StationWithFileCount {
  id:         string;
  name:       string;
  type:       StationType;
  location:   string | null;
  is_active:  boolean;
  file_count: number;
}

export interface RegistryPaginationResponse {
  data:       RegistryEntry[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ── Inputs ────────────────────────────────────────────────────────────────────

export interface RouteFileInput {
  document_id: string;
  station_id:  string;
  priority:    RegistryPriority;
  note?:       string;
}

export interface ReturnFileInput {
  note?: string;
}

export interface RegistryFilters {
  document_id?: string;
  station_id?:  string;
  status?:      RegistryStatus;
  priority?:    RegistryPriority;
  page?:        number;
  limit?:       number;
  sort_by?:     'routed_at' | 'received_at' | 'created_at';
  sort_order?:  'ASC' | 'DESC';
}