// src/types/templates.types.ts

export type TemplateType = 'memo' | 'letter';

// Sentinel used as the Record key for global templates, since byDepartment
// is keyed by string and a real department_id is null for global ones.
export const GLOBAL_KEY = '__global__';

export interface DepartmentTemplate {
  id: string;
  department_id: string | null;
  department_name: string;
  type: TemplateType;
  file_url: string;
  file_public_id: string;
  original_name: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_by: string;
  uploaded_by_name: string;
  is_active: boolean;
  is_fallback?: boolean;
  created_at: string;
  updated_at: string;
}

export type GroupedTemplates = Record<string, DepartmentTemplate[]>;

export interface TemplatesState {
  byDepartment: Record<string, Partial<Record<TemplateType, DepartmentTemplate>>>;
  grouped: GroupedTemplates | null;
  history: Record<string, DepartmentTemplate[]>;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  uploadStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}