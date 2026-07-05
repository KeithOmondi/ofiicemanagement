export type TemplateType = 'memo' | 'letter';
export const GLOBAL_KEY = '__global__';

export interface DocumentTemplate {
  id: string;
  type: TemplateType;
  department_id: string | null;
  department_name: string | null;
  file_url: string;
  original_name: string | null;
  footer_image_url: string | null;
  footer_text: string | null;
  is_active: boolean;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
}