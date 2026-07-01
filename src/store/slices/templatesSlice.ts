// src/store/slices/templatesSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import { GLOBAL_KEY, type GroupedTemplates, type TemplatesState, type TemplateType } from '../../types/templates.types';
import { templatesApi } from '../../templates/templates.api';

const initialState: TemplatesState = {
  byDepartment: {},
  grouped: null,
  history: {},
  status: 'idle',
  uploadStatus: 'idle',
  error: null,
};

function getErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as AxiosError<{ message?: string }>;
  return axiosErr.response?.data?.message ?? fallback;
}

// helper: real department_id (or null) -> the key used in byDepartment/history
const keyFor = (departmentId: string | null) => departmentId ?? GLOBAL_KEY;

// ── Thunks ────────────────────────────────────────────────────────────────

export const fetchGroupedTemplates = createAsyncThunk(
  'templates/fetchGrouped',
  async (_: void, { rejectWithValue }) => {
    try {
      return await templatesApi.listAllGrouped();
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Failed to load templates'));
    }
  }
);

export const fetchDepartmentTemplates = createAsyncThunk(
  'templates/fetchForDepartment',
  async (departmentId: string, { rejectWithValue }) => {
    try {
      const templates = await templatesApi.listForDepartment(departmentId);
      return { departmentId, templates };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Failed to load department templates'));
    }
  }
);

export const fetchActiveTemplate = createAsyncThunk(
  'templates/fetchActive',
  async (
    { departmentId, type }: { departmentId: string | null; type: TemplateType },
    { rejectWithValue }
  ) => {
    try {
      const template = await templatesApi.getActive(departmentId, type);
      return { departmentId, type, template };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, `No ${type} template found`));
    }
  },
  {
    condition: ({ departmentId, type }, { getState }) => {
      const state = getState() as { templates: TemplatesState };
      const cached = state.templates.byDepartment[keyFor(departmentId)]?.[type];
      return !cached;
    },
  }
);

export const fetchTemplateHistory = createAsyncThunk(
  'templates/fetchHistory',
  async (
    { departmentId, type }: { departmentId: string | null; type: TemplateType },
    { rejectWithValue }
  ) => {
    try {
      const history = await templatesApi.getHistory(departmentId, type);
      return { departmentId, type, history };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Failed to load template history'));
    }
  }
);

export const uploadTemplate = createAsyncThunk(
  'templates/upload',
  async (
    { departmentId, type, file }: { departmentId: string | null; type: TemplateType; file: File },
    { rejectWithValue }
  ) => {
    try {
      const template = await templatesApi.upload(departmentId, type, file);
      return { departmentId, type, template };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Failed to upload template'));
    }
  }
);

export const deactivateTemplate = createAsyncThunk(
  'templates/deactivate',
  async (
    { id, departmentId, type }: { id: string; departmentId: string | null; type: TemplateType },
    { rejectWithValue }
  ) => {
    try {
      await templatesApi.deactivate(id);
      return { departmentId, type };
    } catch (err) {
      return rejectWithValue(getErrorMessage(err, 'Failed to deactivate template'));
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    clearTemplateError(state) {
      state.error = null;
    },
    invalidateTemplate(state, action: PayloadAction<{ departmentId: string | null; type: TemplateType }>) {
      const key = keyFor(action.payload.departmentId);
      delete state.byDepartment[key]?.[action.payload.type];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroupedTemplates.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchGroupedTemplates.fulfilled, (state, action: PayloadAction<GroupedTemplates>) => {
        state.status = 'succeeded';
        state.grouped = action.payload;
        Object.values(action.payload).flat().forEach((tpl) => {
          const key = keyFor(tpl.department_id);
          state.byDepartment[key] ??= {};
          state.byDepartment[key][tpl.type] = tpl;
        });
      })
      .addCase(fetchGroupedTemplates.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Failed to load templates';
      })

      .addCase(fetchDepartmentTemplates.fulfilled, (state, action) => {
        const { departmentId, templates } = action.payload;
        state.byDepartment[departmentId] ??= {};
        templates.forEach((tpl) => {
          state.byDepartment[departmentId][tpl.type] = tpl;
        });
      })

      .addCase(fetchActiveTemplate.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchActiveTemplate.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { departmentId, type, template } = action.payload;
        const key = keyFor(departmentId);
        state.byDepartment[key] ??= {};
        state.byDepartment[key][type] = template;
      })
      .addCase(fetchActiveTemplate.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Template not found';
      })

      .addCase(fetchTemplateHistory.fulfilled, (state, action) => {
        const { departmentId, type, history } = action.payload;
        state.history[`${keyFor(departmentId)}:${type}`] = history;
      })

      .addCase(uploadTemplate.pending, (state) => {
        state.uploadStatus = 'loading';
        state.error = null;
      })
      .addCase(uploadTemplate.fulfilled, (state, action) => {
        state.uploadStatus = 'succeeded';
        const { departmentId, type, template } = action.payload;
        const key = keyFor(departmentId);
        state.byDepartment[key] ??= {};
        state.byDepartment[key][type] = template;
      })
      .addCase(uploadTemplate.rejected, (state, action) => {
        state.uploadStatus = 'failed';
        state.error = (action.payload as string) ?? 'Failed to upload template';
      })

      .addCase(deactivateTemplate.fulfilled, (state, action) => {
        const { departmentId, type } = action.payload;
        delete state.byDepartment[keyFor(departmentId)]?.[type];
      });
  },
});

export const { clearTemplateError, invalidateTemplate } = templatesSlice.actions;
export default templatesSlice.reducer;