// src/utils/generateUtilityMemoTypes.ts

export interface UtilityMemoRow {
  judge_name: string;
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
  signatoryName: string;
  crestUrl: string;
  footerEmblemUrl: string;
  signatureUrl?: string;
}