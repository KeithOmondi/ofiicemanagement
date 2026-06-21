// src/types/departments.types.ts

export interface Department {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DepartmentWithUserCount extends Department {
  user_count: number;
}

// 👇 Add these input types
export interface CreateDepartmentInput {
  name: string;
  code?: string;           // optional, backend will uppercase/trim
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  is_active?: boolean;
}

// Optional helpers (keep as is)
export type DepartmentFormData = Pick<Department, 'name' | 'code'> & {
  is_active?: boolean;
};

export type DepartmentOption = {
  value: string;
  label: string;
};