import type { RootState } from "../store/store";
import type { TemplateType } from "../types/templates.types";


export const selectTemplate = (departmentId: string, type: TemplateType) => (state: RootState) =>
  state.templates.byDepartment[departmentId]?.[type] ?? null;

export const selectDepartmentTemplates = (departmentId: string) => (state: RootState) =>
  state.templates.byDepartment[departmentId] ?? {};

export const selectGroupedTemplates = (state: RootState) => state.templates.grouped;

export const selectTemplateHistory = (departmentId: string, type: TemplateType) => (state: RootState) =>
  state.templates.history[`${departmentId}:${type}`] ?? [];

export const selectTemplatesStatus = (state: RootState) => state.templates.status;
export const selectTemplateUploadStatus = (state: RootState) => state.templates.uploadStatus;
export const selectTemplatesError = (state: RootState) => state.templates.error;