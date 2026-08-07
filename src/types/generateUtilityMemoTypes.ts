// src/utils/generateUtilityMemoTypes.ts

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
  signatoryName?: string; // ✅ Made optional - backend handles this
  crestUrl: string;
  footerEmblemUrl: string;
  signatureUrl?: string;
  memoType: 'all' | 'fuel';
  
  // ✅ Added optional initials properties
  signatoryInitials?: string; // e.g., 'Coo'
  preparerInitials?: string;  // e.g., 'ko' or 'KO'
}