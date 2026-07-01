import axiosClient from "../api/api";
import type { DepartmentTemplate, GroupedTemplates, TemplateType } from "../types/templates.types";


const basePath = (departmentId: string | null, type: TemplateType) =>
  departmentId ? `/templates/${departmentId}/${type}` : `/templates/global/${type}`;

export const templatesApi = {
  listAllGrouped: () =>
    axiosClient.get<{ data: GroupedTemplates }>('/templates').then((r) => r.data.data),

  listForDepartment: (departmentId: string) =>
    axiosClient.get<{ data: DepartmentTemplate[] }>(`/templates/${departmentId}`).then((r) => r.data.data),

  getActive: (departmentId: string | null, type: TemplateType) =>
    axiosClient.get<{ data: DepartmentTemplate }>(basePath(departmentId, type)).then((r) => r.data.data),

  getHistory: (departmentId: string | null, type: TemplateType) =>
    axiosClient.get<{ data: DepartmentTemplate[] }>(`${basePath(departmentId, type)}/history`).then((r) => r.data.data),

  upload: (departmentId: string | null, type: TemplateType, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient
      .post<{ data: DepartmentTemplate }>(basePath(departmentId, type), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  deactivate: (id: string) => axiosClient.delete(`/templates/${id}`),
};