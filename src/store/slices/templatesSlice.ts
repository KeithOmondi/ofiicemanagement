// src/store/slices/templatesSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import { GLOBAL_KEY, type DocumentTemplate, type TemplateType } from "../../types/templates.types";
import axiosClient from "../../api/api";

interface TemplatesState {
  byDepartment: Record<string, Partial<Record<TemplateType, DocumentTemplate>>>;
  all: DocumentTemplate[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
}

const initialState: TemplatesState = {
  byDepartment: {},
  all: [],
  loading: false,
  uploading: false,
  error: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeTemplateList(payload: unknown): DocumentTemplate[] {
  console.log('[templatesSlice] normalizeTemplateList called with:', payload);
  
  if (Array.isArray(payload)) {
    console.log(`[templatesSlice] Payload is array with ${payload.length} items`);
    return payload;
  }

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    
    // Check for data array (backend response shape)
    if (Array.isArray(obj.data)) {
      console.log(`[templatesSlice] Found data array with ${obj.data.length} items`);
      return obj.data as DocumentTemplate[];
    }
    
    // Check for templates array
    if (Array.isArray(obj.templates)) {
      console.log(`[templatesSlice] Found templates array with ${obj.templates.length} items`);
      return obj.templates as DocumentTemplate[];
    }
    
    // Check for rows array
    if (Array.isArray(obj.rows)) {
      console.log(`[templatesSlice] Found rows array with ${obj.rows.length} items`);
      return obj.rows as DocumentTemplate[];
    }
  }

  console.log('[templatesSlice] No valid template list found, returning empty array');
  return [];
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchActiveTemplate = createAsyncThunk(
  "templates/fetchActive",
  async (
    { departmentId, type }: { departmentId: string | null; type: TemplateType },
    { rejectWithValue }
  ) => {
    console.log(`[templatesSlice] fetchActiveTemplate called: departmentId=${departmentId || 'global'}, type=${type}`);
    
    try {
      const params: Record<string, string> = { type };
      if (departmentId) {
        params.department_id = departmentId;
        console.log(`[templatesSlice] Including department_id: ${departmentId}`);
      }
      
      console.log(`[templatesSlice] Making request to /templates/active with params:`, params);
      const { data } = await axiosClient.get("/templates/active", { params });
      console.log(`[templatesSlice] fetchActiveTemplate response:`, data);
      
      // Backend returns: { success: true, data: { template: DocumentTemplate | null } }
      const template = data.data?.template as DocumentTemplate | null;
      console.log(`[templatesSlice] Template found:`, template ? `yes (${template.id})` : 'no');
      
      return { departmentId, type, template };
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      console.error(`[templatesSlice] fetchActiveTemplate error:`, error);
      console.error(`[templatesSlice] Error response:`, error.response?.data);
      return rejectWithValue(error.response?.data?.message ?? "Failed to fetch template");
    }
  },
);

export const fetchAllTemplates = createAsyncThunk(
  "templates/fetchAll",
  async (_, { rejectWithValue }) => {
    console.log('[templatesSlice] fetchAllTemplates called');
    
    try {
      console.log('[templatesSlice] Making request to /templates');
      const { data } = await axiosClient.get("/templates");
      console.log('[templatesSlice] fetchAllTemplates response:', data);
      
      // Backend returns: { success: true, data: DocumentTemplate[] }
      const templates = data.data || [];
      console.log(`[templatesSlice] fetchAllTemplates found ${templates.length} templates`);
      
      // Log each template for debugging
      templates.forEach((t: DocumentTemplate) => {
        console.log(`  Template: ${t.id} | ${t.type} | dept: ${t.department_id || 'global'} | active: ${t.is_active}`);
      });
      
      return templates;
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      console.error('[templatesSlice] fetchAllTemplates error:', error);
      return rejectWithValue(error.response?.data?.message ?? "Failed to fetch templates");
    }
  },
);

export const uploadTemplate = createAsyncThunk(
  "templates/upload",
  async (
    { file, type, departmentId }: { file: File; type: TemplateType; departmentId?: string },
    { rejectWithValue }
  ) => {
    console.log(`[templatesSlice] uploadTemplate called: type=${type}, departmentId=${departmentId || 'global'}`);
    console.log(`[templatesSlice] File: ${file.name}, size: ${file.size} bytes`);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      if (departmentId) {
        formData.append("department_id", departmentId);
        console.log(`[templatesSlice] Including department_id in form data: ${departmentId}`);
      }

      console.log('[templatesSlice] Making POST request to /templates');
      const { data } = await axiosClient.post("/templates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      console.log('[templatesSlice] uploadTemplate response:', data);
      // Backend returns: { success: true, data: DocumentTemplate }
      const template = data.data as DocumentTemplate;
      console.log(`[templatesSlice] Upload successful: template ID ${template.id}`);
      
      return template;
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      console.error('[templatesSlice] uploadTemplate error:', error);
      console.error('[templatesSlice] Error response:', error.response?.data);
      return rejectWithValue(error.response?.data?.message ?? "Failed to upload template");
    }
  },
);

export const deleteTemplate = createAsyncThunk(
  "templates/delete",
  async (id: string, { rejectWithValue }) => {
    console.log(`[templatesSlice] deleteTemplate called for ID: ${id}`);
    
    try {
      console.log(`[templatesSlice] Making DELETE request to /templates/${id}`);
      const { data } = await axiosClient.delete(`/templates/${id}`);
      console.log('[templatesSlice] deleteTemplate response:', data);
      console.log(`[templatesSlice] Template ${id} deleted successfully`);
      return id;
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      console.error(`[templatesSlice] deleteTemplate error for ${id}:`, error);
      return rejectWithValue(error.response?.data?.message ?? "Failed to delete template");
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const templatesSlice = createSlice({
  name: "templates",
  initialState,
  reducers: {
    clearTemplatesError: (state) => { 
      console.log('[templatesSlice] Clearing error');
      state.error = null; 
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch Active Template ──
      .addCase(fetchActiveTemplate.pending, (state) => {
        console.log('[templatesSlice] fetchActiveTemplate pending');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveTemplate.fulfilled, (state, action) => {
        console.log('[templatesSlice] fetchActiveTemplate fulfilled');
        state.loading = false;
        
        const { departmentId, type, template } = action.payload;
        const key = departmentId ?? GLOBAL_KEY;
        console.log(`[templatesSlice] Storing template for key: ${key}, type: ${type}`);
        
        if (!state.byDepartment[key]) {
          state.byDepartment[key] = {};
        }
        
        if (template) {
          console.log(`[templatesSlice] Template found: ${template.id}, active: ${template.is_active}`);
          state.byDepartment[key][type] = template;
        } else {
          console.log(`[templatesSlice] No template found, clearing stale entry`);
          delete state.byDepartment[key][type];
        }
      })
      .addCase(fetchActiveTemplate.rejected, (state, action) => {
        console.log('[templatesSlice] fetchActiveTemplate rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── Fetch All Templates ──
      .addCase(fetchAllTemplates.pending, (state) => { 
        console.log('[templatesSlice] fetchAllTemplates pending');
        state.loading = true; 
        state.error = null; 
      })
      .addCase(fetchAllTemplates.fulfilled, (state, action) => {
        console.log('[templatesSlice] fetchAllTemplates fulfilled');
        state.loading = false;
        state.all = normalizeTemplateList(action.payload);
        console.log(`[templatesSlice] State updated with ${state.all.length} templates`);
      })
      .addCase(fetchAllTemplates.rejected, (state, action) => {
        console.log('[templatesSlice] fetchAllTemplates rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── Upload Template ──
      .addCase(uploadTemplate.pending, (state) => { 
        console.log('[templatesSlice] uploadTemplate pending');
        state.uploading = true; 
        state.error = null; 
      })
      .addCase(uploadTemplate.fulfilled, (state, action) => {
        console.log('[templatesSlice] uploadTemplate fulfilled');
        state.uploading = false;
        
        const template = action.payload;
        console.log(`[templatesSlice] Adding template to state: ${template.id}`);
        
        // Add to all list, replacing any existing with same type/department
        state.all = [template, ...state.all.filter(
          (t) => !(t.type === template.type && t.department_id === template.department_id)
        )];
        
        // Update byDepartment
        const key = template.department_id ?? GLOBAL_KEY;
        if (!state.byDepartment[key]) {
          state.byDepartment[key] = {};
        }
        state.byDepartment[key][template.type] = template;
        
        console.log(`[templatesSlice] Template ${template.id} added to state`);
      })
      .addCase(uploadTemplate.rejected, (state, action) => {
        console.log('[templatesSlice] uploadTemplate rejected:', action.payload);
        state.uploading = false;
        state.error = action.payload as string;
      })

      // ── Delete Template ──
      .addCase(deleteTemplate.pending, (state) => {
        console.log('[templatesSlice] deleteTemplate pending');
        state.loading = true;
      })
      .addCase(deleteTemplate.fulfilled, (state, action) => {
        console.log(`[templatesSlice] deleteTemplate fulfilled for ID: ${action.payload}`);
        state.loading = false;
        state.all = state.all.filter((t) => t.id !== action.payload);
        console.log(`[templatesSlice] Remaining templates: ${state.all.length}`);
      })
      .addCase(deleteTemplate.rejected, (state, action) => {
        console.log('[templatesSlice] deleteTemplate rejected:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTemplatesError } = templatesSlice.actions;

// ─── Selectors ──────────────────────────────────────────────────────────────────

export const selectAllTemplates = (state: { templates: TemplatesState }) => {
  console.log('[templatesSlice] selectAllTemplates called');
  return state.templates.all;
};

export const selectTemplatesLoading = (state: { templates: TemplatesState }) => {
  return state.templates.loading;
};

export const selectTemplatesUploading = (state: { templates: TemplatesState }) => {
  return state.templates.uploading;
};

export const selectTemplatesError = (state: { templates: TemplatesState }) => {
  return state.templates.error;
};

export const selectTemplatesByDepartment = (state: { templates: TemplatesState }) => {
  console.log('[templatesSlice] selectTemplatesByDepartment called');
  return state.templates.byDepartment;
};

export default templatesSlice.reducer;