// src/features/surveys/surveys.types.ts

export type SurveyFieldType = 'text' | 'textarea' | 'dropdown' | 'checkbox' | 'date' | 'numbered_list';
export type SurveyStatus = 'draft' | 'active' | 'closed';

/** A field as returned by the server — always has a stable id. */
export interface SurveyField {
  id: string;
  label: string;
  type: SurveyFieldType;
  required: boolean;
  options?: string[]; // used by 'dropdown' and 'checkbox'
  placeholder?: string;
  display_as_ordered?: boolean; // ONLY for 'checkbox' - renders as <ol> instead of <ul>
  help_text?: string; // Help text displayed below the field
  min?: number; // For text/textarea: min length. For numbered_list: min number of items
  max?: number; // For text/textarea: max length. For numbered_list: max number of items
  allow_other?: boolean; // ONLY for 'dropdown' - allows users to type a custom answer
}

/**
 * A field as edited in the builder, before/during save.
 * `id` is present for fields loaded from the server; absent for fields
 * just added in this session. `localKey` is always present and is what
 * the UI keys/reorders on — never the array index, since reordering an
 * index-keyed list scrambles input focus and controlled-input state.
 */
export interface DraftSurveyField extends Omit<SurveyField, 'id'> {
  id?: string;
  localKey: string;
}

export interface Survey {
  id: string;
  slug: string;           // Auto-generated from title (can change when title changes)
  permanent_slug: string; // NEVER changes - used for public URLs
  title: string;
  description: string | null;
  fields: SurveyField[];
  status: SurveyStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** What the public form endpoint returns — never trust this shape for admin views, it's intentionally thin. */
export interface PublicSurveyView {
  permanent_slug: string; // The permanent identifier for public URLs
  title: string;
  description: string | null;
  fields: SurveyField[];
}

export interface SurveyResponseRecord {
  id: string;
  survey_id: string;
  response_data: Record<string, string | string[]>;
  submitted_at: string;
  submitter_ip: string | null;
}

export interface SurveyDraftRecord {
  id: string;
  survey_id: string;
  draft_data: Record<string, string | string[]>;
  submitter_ip: string | null;
  created_at: string;
  updated_at: string;
}

// ---- request payload shapes (match surveys.validator.ts on the server) ----

export interface CreateSurveyPayload {
  title: string;
  description?: string;
  fields: Omit<DraftSurveyField, 'localKey' | 'id'>[];
  permanent_slug?: string; // Optional - auto-generated if not provided
}

export interface UpdateSurveyPayload {
  title?: string;
  description?: string;
  fields?: (Omit<DraftSurveyField, 'localKey'>)[];
  status?: SurveyStatus;
  // NOTE: permanent_slug is NOT in UpdateSurveyPayload - it can never be updated
}

// ---- async state shapes ----

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface SurveysState {
  /** Normalized by id — avoids array-scanning on every update/delete from the list view. */
  byId: Record<string, Survey>;
  allIds: string[];
  listStatus: RequestStatus;
  listError: string | null;

  /** The survey currently open in the builder, kept separate from `byId` so in-progress
   *  edits don't leak into the list view until an explicit save succeeds. */
  builder: {
    surveyId: string | null; // null while creating a brand-new survey
    title: string;
    description: string;
    fields: DraftSurveyField[];
    status: SurveyStatus;
    saveStatus: RequestStatus;
    saveError: string | null;
    dirty: boolean;
  };

  responses: {
    bySurveyId: Record<string, SurveyResponseRecord[]>;
    status: RequestStatus;
    error: string | null;
  };
}

export function emptyDraftField(): DraftSurveyField {
  return {
    localKey: crypto.randomUUID(),
    label: '',
    type: 'text',
    required: false,
    display_as_ordered: false,
    help_text: '',
    min: undefined,
    max: undefined,
    options: undefined,
    placeholder: undefined,
    allow_other: false,
  };
}

export function toDraftField(field: SurveyField): DraftSurveyField {
  return { ...field, localKey: field.id };
}