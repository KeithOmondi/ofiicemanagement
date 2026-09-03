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

// ── Document Source ────────────────────────────────────────────────────────

export type DocumentSource = 
  | 'routed'      // Document came through routing (sent from another station)
  | 'direct';     // Document was uploaded directly to this station

// ── Folder Types ────────────────────────────────────────────────────────────

export type FolderStatus = 'active' | 'archived';

export type FolderCategory = 
  | 'court'
  | 'registry'
  | 'administrative'
  | 'other';

// ── Cloudinary Types ────────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  format: string;
  resource_type: string;
  url: string;
  secure_url: string;
  bytes: number;
  original_filename: string;
  width?: number;
  height?: number;
  created_at?: string;
}

// ── Document File Info ──────────────────────────────────────────────────────

export interface DocumentFile {
  file_url: string;
  file_public_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;  // ISO date string
  format?: string;
  cloudinary_version?: number;
}

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
  routed_at:        string;      // ISO date string
  received_at:      string | null;
  received_by:      string | null;
  received_by_name: string | null;
  is_active:        boolean;
  created_at:       string;      // ISO date string
  source:           DocumentSource;
  uploaded_by:      string | null;
  uploaded_by_name: string | null;
  file_url:         string | null;
  file_public_id:   string | null;
  file_name:        string | null;
  file_size:        number | null;
  mime_type:        string | null;
  cloudinary_version?: number | null;
  file_format?: string | null;
}

// ─── Folder Registry Entry ─────────────────────────────────────────────────

export interface FolderRegistryEntry {
  id:                   string;
  document_id:          string;
  document_title:       string;
  document_ref_no:      string | null;
  station_id:           string;
  station_name:         string;
  station_type:         StationType;
  folder_id:            string;
  folder_ref_no:        string;
  folder_name:          string;
  is_folder_document:   boolean;
  created_at:           string;  // ISO date string
  file_url:             string | null;
  file_public_id:       string | null;
  file_name:            string | null;
  file_size:            number | null;
  mime_type:            string | null;
  source?:              DocumentSource;
  cloudinary_version?:  number | null;
  file_format?:         string | null;
}

// ── Station file counts ───────────────────────────────────────────────────

export interface StationWithFileCount {
  id:         string;
  ref_no:     string | null;
  name:       string;
  type:       StationType;
  location:   string | null;
  is_active:  boolean;
  file_count: number;
  routed_count?: number;
  direct_count?: number;
}

// ── Pagination ─────────────────────────────────────────────────────────────

export interface RegistryPaginationResponse {
  data:       RegistryEntry[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface FolderRegistryPaginationResponse {
  data:       FolderRegistryEntry[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ── Folder Types ───────────────────────────────────────────────────────────

export interface RHCFolder {
  id: string;
  ref_no: string;
  name: string;
  category: FolderCategory;
  description: string | null;
  status: FolderStatus;
  parent_folder_id: string | null;
  created_at: string;  // ISO date string
  updated_at: string;  // ISO date string
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
  created_at: string;  // ISO date string
  added_at: string;    // ISO date string
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  source?: DocumentSource;
  cloudinary_version?: number;
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
  source?:      DocumentSource;
  page?:        number;
  limit?:       number;
  sort_by?:     'routed_at' | 'received_at' | 'created_at';
  sort_order?:  'ASC' | 'DESC';
}

// ── Direct Document Upload Inputs ─────────────────────────────────────────

export interface DirectDocumentUploadInput {
  title: string;
  ref_no?: string | null;
  station_id: string;
  priority?: RegistryPriority;
  note?: string;
}

export interface BulkDirectDocumentUploadInput {
  station_id: string;
  priority?: RegistryPriority;
  note?: string;
}

export interface UploadDocumentToFolderInput {
  title: string;
  ref_no?: string | null;
  priority?: RegistryPriority;
  note?: string;
}

export interface UpdateDocumentMetadataInput {
  title?: string;
  ref_no?: string | null;
  priority?: RegistryPriority;
  note?: string;
}

export interface DeleteDocumentInput {
  delete_from_storage?: boolean;
}

// ── Direct Document Upload Responses ──────────────────────────────────────

export interface DirectDocumentUploadResponse {
  success: boolean;
  message: string;
  data?: {
    entry: RegistryEntry;
    file: DocumentFile;
    cloudinary_metadata?: CloudinaryUploadResult;
  };
}

export interface BulkDirectDocumentUploadResponse {
  success: boolean;
  message: string;
  data?: {
    results: BulkDirectDocumentUploadResultItem[];
    totalProcessed: number;
    totalSuccess: number;
    totalFailed: number;
  };
}

export interface BulkDirectDocumentUploadResultItem {
  success: boolean;
  entry?: RegistryEntry;
  file?: DocumentFile;
  error?: string;
  fileName?: string;
  cloudinary_metadata?: CloudinaryUploadResult;
}

// ── Document Details Response ─────────────────────────────────────────────

export interface DocumentDetailsResponse {
  current: RegistryEntry;
  history: RegistryEntry[];
}

// ── Folder Inputs ────────────────────────────────────────────────────────────

export interface CreateFolderInput {
  ref_no: string;
  name: string;
  category?: FolderCategory;
  description?: string;
  parent_folder_id?: string;
  status?: FolderStatus;
}

export interface UpdateFolderInput {
  name?: string;
  description?: string;
  status?: FolderStatus;
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

export interface GetStationFolderDocumentsQuery {
  page?: number;
  limit?: number;
  source?: DocumentSource;
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

// ── Document Source Labels ────────────────────────────────────────────────

export const SOURCE_LABELS: Record<DocumentSource, string> = {
  routed: 'Routed',
  direct: 'Direct Upload',
};

export const SOURCE_COLORS: Record<DocumentSource, string> = {
  routed: 'bg-blue-50 text-blue-700 border-blue-200',
  direct: 'bg-green-50 text-green-700 border-green-200',
};

export const SOURCE_BADGE_VARIANTS: Record<DocumentSource, string> = {
  routed: 'info',
  direct: 'success',
};

export const SOURCE_ICONS: Record<DocumentSource, string> = {
  routed: '📤',
  direct: '📤',
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

// ── File Type Utilities ────────────────────────────────────────────────────

export const getFileIcon = (mimeType: string | null): string => {
  if (!mimeType) return '📄';
  
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📙';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  
  return '📄';
};

export const getFileTypeLabel = (mimeType: string | null): string => {
  if (!mimeType) return 'Unknown';
  
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Word Document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'Archive';
  
  return 'File';
};

export const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(1);
  
  return `${size} ${sizes[i]}`;
};

export const getFileExtension = (fileName: string | null): string => {
  if (!fileName) return '';
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

export const isImageFile = (mimeType: string | null): boolean => {
  return !!mimeType?.startsWith('image/');
};

export const isVideoFile = (mimeType: string | null): boolean => {
  return !!mimeType?.startsWith('video/');
};

export const isPDFFile = (mimeType: string | null): boolean => {
  return mimeType === 'application/pdf';
};

export const isDocumentFile = (mimeType: string | null): boolean => {
  if (!mimeType) return false;
  return [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
  ].includes(mimeType);
};

export const isSpreadsheetFile = (mimeType: string | null): boolean => {
  if (!mimeType) return false;
  return [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
  ].includes(mimeType);
};

// ── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// ── Upload Status Types ────────────────────────────────────────────────────

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadProgress {
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  result?: DirectDocumentUploadResponse;
}

// ── Form Types ─────────────────────────────────────────────────────────────

export interface UploadFormValues {
  title: string;
  ref_no: string;
  station_id: string;
  priority: RegistryPriority;
  note: string;
}

export interface BulkUploadFormValues {
  station_id: string;
  priority: RegistryPriority;
  note: string;
}

export interface FolderUploadFormValues {
  title: string;
  ref_no: string;
  priority: RegistryPriority;
  note: string;
}

export interface DocumentMetadataFormValues {
  title: string;
  ref_no: string;
  priority: RegistryPriority;
  note: string;
}

// ── Query Parameter Types ─────────────────────────────────────────────────

export interface GetDocumentsBySourceQuery {
  source: DocumentSource;
  stationId?: string;
}

export interface GetStationFolderDocumentsParams {
  stationId: string;
  page?: number;
  limit?: number;
  source?: DocumentSource;
}

// ── Component Props Types ─────────────────────────────────────────────────

export interface RegistryEntryCardProps {
  entry: RegistryEntry;
  onView?: (entry: RegistryEntry) => void;
  onReceive?: (entry: RegistryEntry) => void;
  onReturn?: (entry: RegistryEntry) => void;
  onDelete?: (entry: RegistryEntry) => void;
  showActions?: boolean;
}

export interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response: DirectDocumentUploadResponse) => void;
  stationId?: string;
  folderId?: string;
}

export interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  isMultiple?: boolean;
}