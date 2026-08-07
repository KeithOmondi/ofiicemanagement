// ============================================================
// utilities.types.ts - Export all types from the utilities slice
// ============================================================
// src/types/generateUtilityMemoTypes.ts

export interface UtilityMemoRow {
  judge_name: string;
  pj_number?: string | null;  // ← ADD THIS
  kplc: number;
  water: number;
  wifi: number;
  total: number;
}

export interface UtilityMemoData {
  to: string;
  from: string;
  ref: string;
  date: string;
  subject: string;
  bodyText: string;
  rows: UtilityMemoRow[];
  grandKplc: number;
  grandWater: number;
  grandWifi: number;
  grandTotal: number;
  amountInWords: string;
  crestUrl: string;
  footerEmblemUrl: string;
  memoType: 'all' | 'fuel';
  signatoryName?: string;  // ← ADD THIS (optional)
  signatureUrl?: string;   // ← ADD THIS (optional)
}

export type {
  UtilityType,
  UtilityStatus,
  UtilityApprovalStatus,
  MemoStatus,
  ConsolidatedMemoType,
  UtilityItem,
  JudgeUtility,
  ConsolidatedMemo,
  UtilityItemInput,
  CreateUtilityInput,
  AddUtilityItemInput,
  UpdateUtilityItemInput,
  UpdateUtilityInput,
  UtilityFilters,
  GenerateMemoInput,
  MemoFilters,
  BulkUpdateUtilityItemsInput,
  UtilityStats,
  MemoSummary,
} from "../store/slices/utilitiesSlice";

export {
  // Default export is the reducer
  default as utilitiesReducer,
  // Named exports for thunks
  fetchUtilities,
  fetchUtilityById,
  fetchUtilityByPjNumber,
  createUtility,
  addUtilityItem,
  updateUtilityItem,
  updateUtility,
  deleteUtilityItem,
  deleteUtility,
  fetchMemos,
  fetchMemoById,
  fetchMemoByEntityId,
  generateMemo,
  sendMemoForApproval,
  approveMemo,
  rejectMemo,
  cancelMemo,
  fetchPendingUtilities,
  fetchUtilitiesByApprovalStatus,
  fetchAvailablePeriods,
  fetchUtilitySummary,
  fetchUtilityStats,
  fetchUtilityEnums,
  bulkUpdateUtilityItems,
  // Actions
  setUtilityFilters,
  setMemoFilters,
  clearUtilityFilters,
  setUtilityPagination,
  setMemoPagination,
  setSelectedUtility,
  setSelectedMemo,
  updateUtilityItemOptimistically,
  updateMemoOptimistically,
  clearUtilityError,
  clearUtilitySuccess,
  resetUtilitiesState,
  // Selectors
  selectAllUtilities,
  selectAllMemos,
  selectAllUtilityItems,
  selectSelectedUtility,
  selectSelectedMemo,
  selectUtilityFilters,
  selectMemoFilters,
  selectUtilitiesLoading,
  selectMemosLoading,
  selectUtilitiesMutating,
  selectUtilitiesGenerating,
  selectUtilitiesStatsLoading,
  selectUtilityStats,
  selectMemoSummary,
  selectAvailablePeriods,
  selectUtilitiesByStatus,
  selectMemosByStatus,
  selectMemosByType,
  selectMemosByPeriod,
  selectPendingItemsCount,
  selectSentItemsCount,
  selectApprovedItemsCount,
  selectRejectedItemsCount,
  selectTotalUtilityAmount,
  selectUtilityItemsByPeriod,
  selectPendingUtilityItemsByPeriod,
  selectItemsByApprovalStatus,
  selectUtilitiesPagination,
  selectMemosPagination,
  selectUtilitiesError,
  selectUtilitiesSuccess,
} from "../store/slices/utilitiesSlice";