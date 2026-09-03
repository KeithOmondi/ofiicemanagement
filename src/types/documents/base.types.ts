// src/types/documents/base.types.ts

export interface BaseEntity {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  dsa_details?: DSADetail[];
  total_dsa?: number;
}

export interface DSADetail {
  id?: string;
  judge_name: string;
  pj_number: string;
  designation?: string;
  dsa_per_day: number;
  days: number;
  total?: number;
}