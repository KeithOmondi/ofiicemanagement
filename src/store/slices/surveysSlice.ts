// src/features/surveys/surveysSlice.ts
import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import {
  emptyDraftField,
  toDraftField,
  type CreateSurveyPayload,
  type DraftSurveyField,
  type PublicSurveyView,
  type Survey,
  type SurveyResponseRecord,
  type SurveysState,
  type UpdateSurveyPayload,
} from "../../types/surveys.types";
import axiosClient from "../../api/api";
import type { RootState } from "../store";

// Get the API base URL from environment
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ---- thunks ----

// ADMIN: List all surveys
export const fetchSurveys = createAsyncThunk<Survey[]>(
  "surveys/fetchAll",
  async () => {
    const response = await axiosClient.get<Survey[]>("/surveys");
    return response.data;
  }
);

// ADMIN: Get single survey by ID
export const fetchSurvey = createAsyncThunk<Survey, string>(
  "surveys/fetchOne",
  async (id) => {
    const response = await axiosClient.get<Survey>(`/surveys/${id}`);
    return response.data;
  }
);

// PUBLIC: Get survey by permanent_slug (no auth required) - Use fetch directly
export const fetchPublicSurvey = createAsyncThunk<PublicSurveyView, string>(
  "surveys/fetchPublic",
  async (permanentSlug) => {
    const url = `${API_BASE}/surveys/public/${permanentSlug}`;
    console.log('[fetchPublicSurvey] Fetching from:', url);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('[fetchPublicSurvey] Response status:', response.status);

    if (!response.ok) {
      let errorMessage = `Failed to load survey (${response.status})`;
      try {
        const body = await response.json();
        errorMessage = body?.message || body?.error || errorMessage;
      } catch {
        // If we can't parse JSON, check if it's HTML
        const text = await response.text();
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          errorMessage = 'Server returned HTML. Please check your API configuration.';
        } else if (response.status === 404) {
          errorMessage = 'Survey not found. Please check the survey slug or create the survey.';
        } else {
          errorMessage = response.statusText || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('[fetchPublicSurvey] Non-JSON response:', text.substring(0, 200));
      throw new Error('Server returned non-JSON response. Please check API configuration.');
    }

    const data = await response.json();
    console.log('[fetchPublicSurvey] Survey loaded:', data.title);
    return data;
  }
);

// PUBLIC: Submit response to public survey - Use fetch directly
export const submitPublicResponse = createAsyncThunk<
  { success: boolean; message?: string; id?: string },
  { permanentSlug: string; response_data: Record<string, string | string[]> }
>("surveys/submitPublic", async ({ permanentSlug, response_data }) => {
  const url = `${API_BASE}/surveys/public/${permanentSlug}/responses`;
  console.log('[submitPublicResponse] Submitting to:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ response_data }),
  });

  console.log('[submitPublicResponse] Response status:', response.status);

  if (!response.ok) {
    let errorMessage = `Failed to submit response (${response.status})`;
    try {
      const body = await response.json();
      errorMessage = body?.message || body?.error || errorMessage;
    } catch {
      const text = await response.text();
      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
        errorMessage = 'Server returned HTML. Please check your API configuration.';
      } else {
        errorMessage = response.statusText || errorMessage;
      }
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Server returned non-JSON response. Please check API configuration.');
  }

  const data = await response.json();
  console.log('[submitPublicResponse] Submission successful:', data);
  return data;
});

// PUBLIC: Get draft for a survey
export const fetchDraft = createAsyncThunk<
  { draft_data: Record<string, string | string[]> | null },
  string
>("surveys/fetchDraft", async (permanentSlug) => {
  const url = `${API_BASE}/surveys/public/${permanentSlug}/draft`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load draft');
  }

  return response.json();
});

// PUBLIC: Save draft for a survey
export const saveDraft = createAsyncThunk<
  { message: string; id: string },
  { permanentSlug: string; draft_data: Record<string, string | string[]> }
>("surveys/saveDraft", async ({ permanentSlug, draft_data }) => {
  const url = `${API_BASE}/surveys/public/${permanentSlug}/draft`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ draft_data }),
  });

  if (!response.ok) {
    throw new Error('Failed to save draft');
  }

  return response.json();
});

// PUBLIC: Delete draft for a survey
export const deleteDraft = createAsyncThunk<string, string>(
  "surveys/deleteDraft",
  async (permanentSlug) => {
    const url = `${API_BASE}/surveys/public/${permanentSlug}/draft`;
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete draft');
    }

    return permanentSlug;
  }
);

// ADMIN: Create new survey
export const createSurvey = createAsyncThunk<Survey, CreateSurveyPayload>(
  "surveys/create",
  async (payload) => {
    const response = await axiosClient.post<Survey>("/surveys", payload);
    return response.data;
  }
);

// ADMIN: Update existing survey
export const updateSurvey = createAsyncThunk<
  Survey,
  { id: string; payload: UpdateSurveyPayload }
>("surveys/update", async ({ id, payload }) => {
  const response = await axiosClient.patch<Survey>(`/surveys/${id}`, payload);
  return response.data;
});

// ADMIN: Delete survey
export const deleteSurvey = createAsyncThunk<string, string>(
  "surveys/delete",
  async (id) => {
    await axiosClient.delete(`/surveys/${id}`);
    return id;
  }
);

// ADMIN: Fetch responses for a survey
export const fetchResponses = createAsyncThunk<
  { surveyId: string; responses: SurveyResponseRecord[] },
  string
>("surveys/fetchResponses", async (surveyId) => {
  const response = await axiosClient.get<SurveyResponseRecord[]>(
    `/surveys/${surveyId}/responses`
  );
  return { surveyId, responses: response.data };
});

// ADMIN: Export survey responses to Excel
export const exportExcel = createAsyncThunk<Blob, string>(
  "surveys/exportExcel",
  async (surveyId) => {
    const response = await axiosClient.get<Blob>(
      `/surveys/${surveyId}/export/excel`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  }
);

// ADMIN: Export survey responses to Word
export const exportWord = createAsyncThunk<Blob, string>(
  "surveys/exportWord",
  async (surveyId) => {
    const response = await axiosClient.get<Blob>(
      `/surveys/${surveyId}/export/word`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  }
);

// ---- initial state ----

const initialState: SurveysState = {
  byId: {},
  allIds: [],
  listStatus: "idle",
  listError: null,
  builder: {
    surveyId: null,
    title: "",
    description: "",
    fields: [],
    status: "draft",
    saveStatus: "idle",
    saveError: null,
    dirty: false,
  },
  responses: {
    bySurveyId: {},
    status: "idle",
    error: null,
  },
};

// ---- slice ----

const surveysSlice = createSlice({
  name: "surveys",
  initialState,
  reducers: {
    // ---- builder: local-only edits, no network call ----

    builderStartNew(state) {
      state.builder = { ...initialState.builder, fields: [emptyDraftField()] };
    },

    builderLoadFromSurvey(state, action: PayloadAction<string>) {
      const survey = state.byId[action.payload];
      if (!survey) return;
      state.builder = {
        surveyId: survey.id,
        title: survey.title,
        description: survey.description ?? "",
        fields: survey.fields.map(toDraftField),
        status: survey.status,
        saveStatus: "idle",
        saveError: null,
        dirty: false,
      };
    },

    builderSetTitle(state, action: PayloadAction<string>) {
      state.builder.title = action.payload;
      state.builder.dirty = true;
    },

    builderSetDescription(state, action: PayloadAction<string>) {
      state.builder.description = action.payload;
      state.builder.dirty = true;
    },

    builderSetStatus(state, action: PayloadAction<Survey["status"]>) {
      state.builder.status = action.payload;
      state.builder.dirty = true;
    },

    builderAddField(state) {
      state.builder.fields.push(emptyDraftField());
      state.builder.dirty = true;
    },

    builderRemoveField(state, action: PayloadAction<string>) {
      state.builder.fields = state.builder.fields.filter(
        (f) => f.localKey !== action.payload
      );
      state.builder.dirty = true;
    },

    builderReorderField(
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) {
      const { fromIndex, toIndex } = action.payload;
      const fields = state.builder.fields;
      if (
        fromIndex < 0 ||
        fromIndex >= fields.length ||
        toIndex < 0 ||
        toIndex >= fields.length
      )
        return;
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, moved);
      state.builder.dirty = true;
    },

    builderUpdateField(
      state,
      action: PayloadAction<{
        localKey: string;
        changes: Partial<Omit<DraftSurveyField, "localKey">>;
      }>
    ) {
      const field = state.builder.fields.find(
        (f) => f.localKey === action.payload.localKey
      );
      if (!field) return;
      Object.assign(field, action.payload.changes);

      // Switching away from dropdown/checkbox drops now-irrelevant options
      if (
        action.payload.changes.type &&
        !["dropdown", "checkbox"].includes(action.payload.changes.type)
      ) {
        field.options = undefined;
      }
      state.builder.dirty = true;
    },

    builderAddOption(
      state,
      action: PayloadAction<{ localKey: string; option: string }>
    ) {
      const field = state.builder.fields.find(
        (f) => f.localKey === action.payload.localKey
      );
      if (!field) return;
      const trimmed = action.payload.option.trim();
      if (!trimmed) return;
      field.options = [...(field.options ?? []), trimmed];
      state.builder.dirty = true;
    },

    builderRemoveOption(
      state,
      action: PayloadAction<{ localKey: string; option: string }>
    ) {
      const field = state.builder.fields.find(
        (f) => f.localKey === action.payload.localKey
      );
      if (!field || !field.options) return;
      field.options = field.options.filter((o) => o !== action.payload.option);
      state.builder.dirty = true;
    },

    builderReset(state) {
      state.builder = initialState.builder;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- list ----
      .addCase(fetchSurveys.pending, (state) => {
        state.listStatus = "loading";
        state.listError = null;
      })
      .addCase(fetchSurveys.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.byId = {};
        state.allIds = [];
        for (const survey of action.payload) {
          state.byId[survey.id] = survey;
          state.allIds.push(survey.id);
        }
      })
      .addCase(fetchSurveys.rejected, (state, action) => {
        state.listStatus = "failed";
        state.listError = action.error.message ?? "Failed to load surveys";
      })

      // ---- single fetch ----
      .addCase(fetchSurvey.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        if (!state.allIds.includes(action.payload.id))
          state.allIds.push(action.payload.id);
      })

      // ---- create ----
      .addCase(createSurvey.pending, (state) => {
        state.builder.saveStatus = "loading";
        state.builder.saveError = null;
      })
      .addCase(createSurvey.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        state.allIds.push(action.payload.id);
        state.builder.saveStatus = "succeeded";
        state.builder.surveyId = action.payload.id;
        state.builder.dirty = false;
      })
      .addCase(createSurvey.rejected, (state, action) => {
        state.builder.saveStatus = "failed";
        state.builder.saveError =
          action.error.message ?? "Failed to create survey";
      })

      // ---- update ----
      .addCase(updateSurvey.pending, (state) => {
        state.builder.saveStatus = "loading";
        state.builder.saveError = null;
      })
      .addCase(updateSurvey.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        state.builder.saveStatus = "succeeded";
        state.builder.dirty = false;
      })
      .addCase(updateSurvey.rejected, (state, action) => {
        state.builder.saveStatus = "failed";
        state.builder.saveError =
          action.error.message ?? "Failed to save changes";
      })

      // ---- delete ----
      .addCase(deleteSurvey.fulfilled, (state, action) => {
        delete state.byId[action.payload];
        state.allIds = state.allIds.filter((id) => id !== action.payload);
      })

      // ---- responses ----
      .addCase(fetchResponses.pending, (state) => {
        state.responses.status = "loading";
        state.responses.error = null;
      })
      .addCase(fetchResponses.fulfilled, (state, action) => {
        state.responses.status = "succeeded";
        state.responses.bySurveyId[action.payload.surveyId] =
          action.payload.responses;
      })
      .addCase(fetchResponses.rejected, (state, action) => {
        state.responses.status = "failed";
        state.responses.error =
          action.error.message ?? "Failed to load responses";
      });
  },
});

// ---- actions ----

export const {
  builderStartNew,
  builderLoadFromSurvey,
  builderSetTitle,
  builderSetDescription,
  builderSetStatus,
  builderAddField,
  builderRemoveField,
  builderReorderField,
  builderUpdateField,
  builderAddOption,
  builderRemoveOption,
  builderReset,
} = surveysSlice.actions;

export default surveysSlice.reducer;

// ---- selectors ----

export const selectAllSurveys = (state: RootState): Survey[] =>
  state.surveys.allIds.map((id) => state.surveys.byId[id]);

export const selectSurveyById =
  (id: string) =>
  (state: RootState): Survey | undefined =>
    state.surveys.byId[id];

export const selectBuilder = (state: RootState) => state.surveys.builder;

export const selectResponsesForSurvey =
  (surveyId: string) =>
  (state: RootState): SurveyResponseRecord[] =>
    state.surveys.responses.bySurveyId[surveyId] ?? [];

/** Converts the builder's local draft state into the payload shape the API expects. */
export function buildPayloadFromBuilder(
  builder: SurveysState["builder"]
): CreateSurveyPayload | UpdateSurveyPayload {
  const fields = builder.fields.map((field) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { localKey, ...rest } = field;
    return rest;
  });
  return builder.surveyId
    ? {
        title: builder.title,
        description: builder.description,
        fields,
        status: builder.status,
      }
    : { title: builder.title, description: builder.description, fields };
}