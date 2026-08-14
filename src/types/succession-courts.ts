// ============================================================
// src/features/succession-courts/types/index.ts
// ============================================================

// ─── Enums ──────────────────────────────────────────────────────────────────

export type SuccessionCourtCategory = 'A' | 'B' | 'C' | 'D';

export const SUCCESSION_COURT_CATEGORIES: Record<SuccessionCourtCategory, string> = {
  A: 'Category A',
  B: 'Category B',
  C: 'Category C',
  D: 'Category D',
};

export const SUCCESSION_COURT_CATEGORY_OPTIONS = [
  { value: 'A', label: 'Category A' },
  { value: 'B', label: 'Category B' },
  { value: 'C', label: 'Category C' },
  { value: 'D', label: 'Category D' },
] as const;

// ─── User Types ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  full_name: string;
  name?: string; // Alias for full_name (for backward compatibility)
  email: string;
  role: 'super_admin' | 'dept_head' | 'staff' | 'viewer';
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Court Types ──────────────────────────────────────────────────────────

export interface SuccessionCourt {
  id: string;
  name: string;
  station: string;
  category: SuccessionCourtCategory;
  support_person_id: string | null;
  support_person: string | null;
  contact: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuccessionCourtWithUser extends SuccessionCourt {
  support_person_user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
  } | null;
}

// ─── Request/Response Types ──────────────────────────────────────────────

export interface CreateSuccessionCourtPayload {
  name: string;
  station: string;
  category: SuccessionCourtCategory;
  support_person_id?: string;
  contact?: string;
}

export interface UpdateSuccessionCourtPayload {
  name?: string;
  station?: string;
  category?: SuccessionCourtCategory;
  support_person_id?: string | null;
  contact?: string;
  is_active?: boolean;
}

export interface AssignSupportPersonPayload {
  userId: string;
  contact?: string;
}

export interface BulkAssignSupportPersonPayload {
  courtIds: string[];
  userId: string;
  contact?: string;
}

export interface BulkRemoveSupportPersonPayload {
  courtIds: string[];
}

export interface AssignSupportPersonByCategoryPayload {
  category: SuccessionCourtCategory;
  userId: string;
  contact?: string;
}

export interface AssignSupportPersonByStationPayload {
  station: string;
  userId: string;
  contact?: string;
}

export interface ReassignSupportPersonPayload {
  currentUserId: string;
  newUserId: string;
  category?: SuccessionCourtCategory;
  station?: string;
}

export interface SeedCourtsPayload {
  dryRun?: boolean;
  force?: boolean;
}

// ─── Filter Types ─────────────────────────────────────────────────────────

export interface SuccessionCourtFilters {
  search?: string;
  category?: SuccessionCourtCategory;
  station?: string;
  is_active?: boolean;
  support_person_id?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

// ─── API Response Types ──────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export type CourtsResponse = SuccessionCourtWithUser[];

export type GroupedCourtsResponse = GroupedSuccessionCourts;

export type AvailableSupportPersonsResponse = User[];

export type SupportPersonAssignmentsResponse = SupportPersonAssignment[];

// ─── Pagination Types ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupportPersonAssignment {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  assignedCourts: SuccessionCourt[];
  totalAssigned: number;
}

export interface SeedResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

export interface GroupedSuccessionCourts {
  [category: string]: SuccessionCourtWithUser[];
}

// ─── Form Types ───────────────────────────────────────────────────────────

export interface SuccessionCourtFormValues {
  name: string;
  station: string;
  category: SuccessionCourtCategory | '';
  support_person_id: string | '';
  contact: string;
}

export interface AssignSupportPersonFormValues {
  userId: string;
  contact: string;
}

export interface BulkAssignByCategoryFormValues {
  category: SuccessionCourtCategory | '';
  userId: string;
  contact: string;
}

export interface BulkAssignByStationFormValues {
  station: string;
  userId: string;
  contact: string;
}

export interface ReassignFormValues {
  currentUserId: string;
  newUserId: string;
  category: SuccessionCourtCategory | '';
  station: string;
}

// ─── Slice State ─────────────────────────────────────────────────────────

export interface SuccessionCourtState {
  courts: SuccessionCourtWithUser[];
  groupedCourts: GroupedSuccessionCourts | null;
  selectedCourt: SuccessionCourtWithUser | null;
  availableSupportPersons: User[];
  supportPersonAssignments: SupportPersonAssignment[];
  
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  
  filters: SuccessionCourtFilters;
  
  seedResult: SeedResult | null;
  isSeeding: boolean;
  isValidating: boolean;
  validationResult: { valid: boolean; errors: string[] } | null;
}

// ─── Bulk Operation Results ─────────────────────────────────────────────

export interface BulkOperationResult {
  updated: number;
  skipped: number;
  errors: string[];
}

// ─── Validation Types ────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Seed Count Types ────────────────────────────────────────────────────

export interface SeedCountResult {
  count: number;
}

// ─── Delete Result Types ─────────────────────────────────────────────────

export interface DeleteResult {
  deleted: number;
}

// ─── Component Props ─────────────────────────────────────────────────────

export interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: AssignSupportPersonByCategoryPayload | AssignSupportPersonByStationPayload) => void;
  isLoading: boolean;
  availableSupportPersons: User[];
  title: string;
  children?: React.ReactNode;
}

export interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ReassignFormValues) => void;
  isLoading: boolean;
  availableSupportPersons: User[];
  currentAssignments: SupportPersonAssignment[];
}

// ─── Hook Return Types ──────────────────────────────────────────────────

export interface UseSuccessionCourtsReturn {
  courts: SuccessionCourtWithUser[];
  groupedCourts: GroupedSuccessionCourts | null;
  selectedCourt: SuccessionCourtWithUser | null;
  availableSupportPersons: User[];
  supportPersonAssignments: SupportPersonAssignment[];
  filteredCourts: SuccessionCourtWithUser[];
  
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  isSeeding: boolean;
  isValidating: boolean;
  
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  
  filters: SuccessionCourtFilters;
  
  fetchCourts: (filters?: SuccessionCourtFilters) => Promise<void>;
  fetchCourtsWithSupport: (filters?: SuccessionCourtFilters) => Promise<void>;
  fetchGroupedCourts: () => Promise<void>;
  fetchGroupedCourtsWithSupport: () => Promise<void>;
  fetchCourtById: (id: string) => Promise<void>;
  fetchCourtWithUser: (id: string) => Promise<void>;
  fetchAvailableSupportPersons: () => Promise<void>;
  fetchSupportPersonAssignments: (params?: { userId?: string; category?: string }) => Promise<void>;
  
  createCourt: (data: CreateSuccessionCourtPayload) => Promise<SuccessionCourt>;
  updateCourt: (id: string, data: UpdateSuccessionCourtPayload) => Promise<SuccessionCourt>;
  deleteCourt: (id: string) => Promise<void>;
  
  assignSupportPerson: (courtId: string, data: AssignSupportPersonPayload) => Promise<SuccessionCourt>;
  bulkAssignSupportPerson: (data: BulkAssignSupportPersonPayload) => Promise<BulkOperationResult>;
  assignSupportPersonByCategory: (data: AssignSupportPersonByCategoryPayload) => Promise<BulkOperationResult>;
  assignSupportPersonByStation: (data: AssignSupportPersonByStationPayload) => Promise<BulkOperationResult>;
  reassignSupportPerson: (data: ReassignSupportPersonPayload) => Promise<BulkOperationResult>;
  
  removeSupportPerson: (courtId: string) => Promise<SuccessionCourt>;
  bulkRemoveSupportPerson: (data: BulkRemoveSupportPersonPayload) => Promise<BulkOperationResult>;
  
  seedCourts: (payload?: SeedCourtsPayload) => Promise<SeedResult>;
  validateSeedData: () => Promise<ValidationResult>;
  clearSeedData: () => Promise<DeleteResult>;
  
  setFilters: (filters: SuccessionCourtFilters) => void;
  clearFilters: () => void;
  resetFilters: () => void;
  
  setSelectedCourt: (court: SuccessionCourtWithUser | null) => void;
  clearSelectedCourt: () => void;
  clearError: () => void;
  resetState: () => void;
}