// src/types/registry.types.ts

import type { StationType } from "../store/slices/stationsSlice";

// ── Registry Types ──────────────────────────────────────────────────────────

export type RegistryPriority =
  | 'normal'
  | 'urgent'
  | 'confidential'
  | 'for_information_only';

// Simplified status - only 'active' and 'returned'
export type RegistryStatus =
  | 'active'     // document is currently at this station
  | 'returned';  // document has been returned to the registry

// ── Folder Types ────────────────────────────────────────────────────────────

export type FolderStatus = 'active' | 'archived';

export type FolderCategory = 
  | 'court'
  | 'registry'
  | 'administrative'
  | 'other';

// ── Registry Entry ──────────────────────────────────────────────────────────

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

// ── Station file counts (for the registry dashboard grid) ───────────────────

export interface StationWithFileCount {
  id:         string;
  ref_no:     string | null;  // e.g., "RHC/MSB/22" for courts, null for sub-registries
  name:       string;
  type:       StationType;
  location:   string | null;
  is_active:  boolean;
  file_count: number; // count of active (currently-on-record) registry entries
}

// ── Pagination ─────────────────────────────────────────────────────────────

export interface RegistryPaginationResponse {
  data:       RegistryEntry[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ── Folder Types ───────────────────────────────────────────────────────────

export interface RHCFolder {
  id: string;
  ref_no: string;              // e.g., "RHC/MSB/22"
  name: string;                // e.g., "Marasabi High Court"
  category: FolderCategory;
  description: string | null;
  status: FolderStatus;
  parent_folder_id: string | null;
  created_at: Date;
  updated_at: Date;
  sub_folder_count?: number;
  document_count?: number;
}

export interface FolderDocument {
  id: string;
  title: string;
  ref: string | null;
  format: string;
  file_url: string | null;
  file_public_id: string | null;
  created_at: Date;
  added_at: Date;
}

export interface FolderHierarchy extends RHCFolder {
  parent_chain: RHCFolder[];
  children: RHCFolder[];
}

export interface FolderStatistics {
  total: number;
  active: number;
  archived: number;
  byCategory: {
    category: FolderCategory;
    count: number;
  }[];
}

export interface FolderCategoryCount {
  category: FolderCategory;
  count: number;
}

export interface BulkAddDocumentsResult {
  added: number;
  skipped: number;
  errors: string[];
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

// ── Folder Inputs ────────────────────────────────────────────────────────────

export interface CreateFolderInput {
  ref_no: string;              // e.g., "RHC/MSB/22"
  name: string;                // e.g., "Marasabi High Court"
  category?: FolderCategory;   // defaults to 'court'
  description?: string;
  parent_folder_id?: string;
  status?: FolderStatus;       // defaults to 'active'
}

export interface UpdateFolderInput {
  name?: string;
  description?: string;
  status?: FolderStatus;
  // Note: ref_no should NOT be changeable once set
}

export interface MoveFolderInput {
  parent_folder_id: string | null;
}

export interface AddDocumentToFolderInput {
  document_id: string;
}

export interface BulkAddDocumentsInput {
  document_ids: string[];
}

export interface FolderFilters {
  category?: FolderCategory;
  status?: FolderStatus;
  search?: string;
  include_sub_folders?: boolean;
}

// ── Display Labels ──────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<FolderCategory, string> = {
  court: 'Court',
  registry: 'Registry',
  administrative: 'Administrative',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<FolderCategory, string> = {
  court: 'bg-amber-50 text-amber-700',
  registry: 'bg-blue-50 text-blue-700',
  administrative: 'bg-green-50 text-green-700',
  other: 'bg-stone-50 text-stone-700',
};

export const STATUS_LABELS: Record<FolderStatus, string> = {
  active: 'Active',
  archived: 'Archived',
};

export const STATUS_COLORS: Record<FolderStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-stone-50 text-stone-700',
};

export const PRIORITY_LABELS: Record<RegistryPriority, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
  confidential: 'Confidential',
  for_information_only: 'For Information Only',
};

export const PRIORITY_COLORS: Record<RegistryPriority, string> = {
  normal: 'bg-slate-100 text-slate-700',
  urgent: 'bg-red-100 text-red-700',
  confidential: 'bg-amber-100 text-amber-700',
  for_information_only: 'bg-blue-100 text-blue-700',
};

// ── Registry Status Labels ──────────────────────────────────────────────────

export const REGISTRY_STATUS_LABELS: Record<RegistryStatus, string> = {
  active: 'Active',
  returned: 'Returned',
};

export const REGISTRY_STATUS_COLORS: Record<RegistryStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  returned: 'bg-stone-50 text-stone-700',
};