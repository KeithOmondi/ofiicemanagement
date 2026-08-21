// src/pages/SuperAdminSurveyPage.tsx
import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  fetchSurveys,
  fetchResponses,
  createSurvey,
  updateSurvey,
  deleteSurvey,
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
  buildPayloadFromBuilder,
  selectAllSurveys,
  selectBuilder,
  selectResponsesForSurvey,
} from '../../store/slices/surveysSlice';
import type { Survey, SurveyFieldType, DraftSurveyField, SurveyField } from '../../types/surveys.types';
import { useAppDispatch, useAppSelector } from '../../store/hook';

type ViewMode = 'list' | 'builder' | 'responses';

const FIELD_TYPES: SurveyFieldType[] = ['text', 'textarea', 'dropdown', 'checkbox', 'date', 'numbered_list'];
const OPTIONS_TYPES: SurveyFieldType[] = ['dropdown', 'checkbox'];

export default function SuperAdminSurveyPage() {
  const dispatch = useAppDispatch();
  const surveys = useAppSelector(selectAllSurveys);
  const listStatus = useAppSelector((s) => s.surveys.listStatus);
  const listError = useAppSelector((s) => s.surveys.listError);
  const builderState = useAppSelector(selectBuilder);

  const [mode, setMode] = useState<ViewMode>('list');
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchSurveys());
  }, [dispatch]);

  function openCreate() {
    dispatch(builderStartNew());
    setMode('builder');
  }

  function openEdit(survey: Survey) {
    dispatch(builderLoadFromSurvey(survey.id));
    setMode('builder');
  }

  function openResponses(survey: Survey) {
    setActiveSurveyId(survey.id);
    dispatch(fetchResponses(survey.id));
    setMode('responses');
  }

  async function handleDelete(survey: Survey) {
    if (!window.confirm(`Delete "${survey.title}"? This cannot be undone.`)) return;
    await dispatch(deleteSurvey(survey.id));
  }

  async function handleSave() {
    const payload = buildPayloadFromBuilder(builderState);
    if (builderState.surveyId) {
      const result = await dispatch(updateSurvey({ id: builderState.surveyId, payload }));
      if (updateSurvey.fulfilled.match(result)) setMode('list');
    } else {
      const result = await dispatch(createSurvey(payload as Parameters<typeof createSurvey>[0]));
      if (createSurvey.fulfilled.match(result)) setMode('list');
    }
  }

  function handleCancel() {
    dispatch(builderReset());
    setMode('list');
  }

  return (
    <div className="bg-[#fcf8ed] min-h-screen text-slate-800 pb-12">
      {/* Top Judiciary Banner Header */}
      <header className="bg-white border-b-4 border-[#c09d2a] shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 border-r border-slate-200 pr-4">
              <span className="text-2xl font-bold tracking-tight text-[#1b4332]">REPUBLIC OF KENYA</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-[#1b4332] font-serif uppercase">
                THE JUDICIARY
              </h1>
              <p className="text-xs text-[#c09d2a] font-semibold tracking-widest uppercase">
                Social Transformation Through Access to Justice
              </p>
            </div>
          </div>
          <a 
            href="https://www.judiciary.go.ke" 
            target="_blank" 
            rel="noreferrer"
            className="text-xs font-medium text-slate-500 hover:text-[#1b4332] transition-colors"
          >
            www.judiciary.go.ke
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#c09d2a]/30">
          <h2 className="text-xl font-bold text-[#1b4332]">Survey Management</h2>
          {mode === 'list' && (
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-[#1b4332] hover:bg-[#0f2e22] text-white font-medium rounded-lg shadow transition-colors cursor-pointer"
            >
              + New Survey
            </button>
          )}
        </div>

        {mode === 'list' && (
          <SurveyList
            surveys={surveys}
            status={listStatus}
            error={listError}
            onEdit={openEdit}
            onDelete={handleDelete}
            onViewResponses={openResponses}
          />
        )}

        {mode === 'builder' && (
          <SurveyBuilder
            builder={builderState}
            dispatch={dispatch}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {mode === 'responses' && activeSurveyId && (
          <SurveyResponsesView
            surveyId={activeSurveyId}
            surveys={surveys}
            onBack={() => setMode('list')}
          />
        )}
      </main>
    </div>
  );
}

// ---- list ----

function SurveyList({
  surveys,
  status,
  error,
  onEdit,
  onDelete,
  onViewResponses,
}: {
  surveys: Survey[];
  status: string;
  error: string | null;
  onEdit: (s: Survey) => void;
  onDelete: (s: Survey) => void;
  onViewResponses: (s: Survey) => void;
}) {
  if (status === 'loading') return <p className="text-slate-600 py-4">Loading surveys…</p>;
  if (status === 'failed') return <p role="alert" className="text-red-700 py-4">{error ?? 'Failed to load surveys.'}</p>;
  if (surveys.length === 0) return <p className="text-slate-600 py-4">No surveys yet — create one to get started.</p>;

  const getStatusBadge = (statusValue: Survey['status']) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      draft: 'bg-[#fcf8ed] text-[#b59325] border-[#c09d2a]',
      closed: 'bg-slate-100 text-slate-600 border-slate-300',
    };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full border ${styles[statusValue] || styles.draft}`}>
        {statusValue}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-[#c09d2a]/20">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-[#1b4332] text-white font-medium">
          <tr>
            <th className="py-3 px-4">Title</th>
            <th className="py-3 px-4">Permanent Slug</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Created</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {surveys.map((survey) => (
            <tr key={survey.id} className="hover:bg-[#fcf8ed]/50 transition-colors">
              <td className="py-3 px-4 font-semibold text-slate-900">{survey.title}</td>
              <td className="py-3 px-4 text-slate-600 font-mono text-xs">{survey.permanent_slug}</td>
              <td className="py-3 px-4">{getStatusBadge(survey.status)}</td>
              <td className="py-3 px-4 text-slate-600">{new Date(survey.created_at).toLocaleDateString()}</td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => onEdit(survey)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#1b4332] bg-[#1b4332]/10 hover:bg-[#1b4332]/20 rounded border border-[#1b4332]/30 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewResponses(survey)}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-[#c09d2a] hover:bg-[#b59325] rounded transition-colors cursor-pointer"
                  >
                    Responses
                  </button>
                  <a
                    href={`/api/surveys/${survey.id}/export/excel`}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300 transition-colors"
                  >
                    Excel
                  </a>
                  <a
                    href={`/api/surveys/${survey.id}/export/word`}
                    className="px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-300 transition-colors"
                  >
                    Word
                  </a>
                  <button
                    type="button"
                    onClick={() => onDelete(survey)}
                    className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- builder ----

function SurveyBuilder({
  builder,
  dispatch,
  onSave,
  onCancel,
}: {
  builder: ReturnType<typeof selectBuilder>;
  dispatch: ReturnType<typeof useAppDispatch>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const canSave = builder.title.trim().length > 0 && builder.fields.length > 0 && builder.saveStatus !== 'loading';

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#c09d2a] space-y-4">
        <div>
          <label htmlFor="survey-title" className="block text-sm font-bold text-[#1b4332] mb-1">Title</label>
          <input
            id="survey-title"
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c09d2a] focus:border-[#c09d2a] outline-none transition-all"
            value={builder.title}
            onChange={(e: ChangeEvent<HTMLInputElement>) => dispatch(builderSetTitle(e.target.value))}
          />
        </div>

        <div>
          <label htmlFor="survey-description" className="block text-sm font-bold text-[#1b4332] mb-1">Description</label>
          <textarea
            id="survey-description"
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c09d2a] focus:border-[#c09d2a] outline-none transition-all"
            value={builder.description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => dispatch(builderSetDescription(e.target.value))}
          />
        </div>

        {builder.surveyId && (
          <div>
            <label htmlFor="survey-status" className="block text-sm font-bold text-[#1b4332] mb-1">Status</label>
            <select
              id="survey-status"
              className="w-full sm:w-48 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#c09d2a] focus:border-[#c09d2a] outline-none transition-all bg-white"
              value={builder.status}
              onChange={(e) => dispatch(builderSetStatus(e.target.value as Survey['status']))}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#1b4332] space-y-4">
        <h3 className="text-lg font-bold text-[#1b4332] border-b border-slate-200 pb-2">Questions</h3>
        <div className="space-y-4">
          {builder.fields.map((field, index) => (
            <FieldEditor
              key={field.localKey}
              field={field}
              index={index}
              fieldCount={builder.fields.length}
              dispatch={dispatch}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => dispatch(builderAddField())}
          className="w-full py-2 border-2 border-dashed border-[#c09d2a] hover:bg-[#fcf8ed] text-[#1b4332] font-semibold rounded-lg transition-colors cursor-pointer"
        >
          + Add Question
        </button>
      </div>

      {builder.saveError && <p role="alert" className="text-sm font-semibold text-red-600">{builder.saveError}</p>}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="px-4 py-2 bg-[#1b4332] hover:bg-[#0f2e22] disabled:opacity-50 text-white rounded-lg font-medium shadow transition-colors cursor-pointer"
        >
          {builder.saveStatus === 'loading' ? 'Saving…' : 'Save Survey'}
        </button>
      </div>
    </div>
  );
}

// ---- field editor ----

function FieldEditor({
  field,
  index,
  fieldCount,
  dispatch,
}: {
  field: DraftSurveyField;
  index: number;
  fieldCount: number;
  dispatch: ReturnType<typeof useAppDispatch>;
}) {
  const [newOption, setNewOption] = useState('');
  const needsOptions = OPTIONS_TYPES.includes(field.type);
  const isCheckbox = field.type === 'checkbox';
  const isDropdown = field.type === 'dropdown';
  const isTextType = field.type === 'text' || field.type === 'textarea';
  const isNumberedList = field.type === 'numbered_list';

  function addOption() {
    if (!newOption.trim()) return;
    dispatch(builderAddOption({ localKey: field.localKey, option: newOption }));
    setNewOption('');
  }

  return (
    <fieldset className="p-4 border border-slate-200 rounded-lg bg-[#fcf8ed]/40 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <input
          type="text"
          placeholder="Question label"
          className="sm:col-span-6 px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#c09d2a] outline-none text-sm"
          value={field.label}
          onChange={(e) => dispatch(builderUpdateField({ localKey: field.localKey, changes: { label: e.target.value } }))}
        />

        <select
          value={field.type}
          className="sm:col-span-4 px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#c09d2a] outline-none text-sm"
          onChange={(e) =>
            dispatch(
              builderUpdateField({
                localKey: field.localKey,
                changes: { type: e.target.value as SurveyFieldType },
              }),
            )
          }
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="sm:col-span-2 flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-[#1b4332] focus:ring-[#c09d2a]"
            checked={field.required}
            onChange={(e) => dispatch(builderUpdateField({ localKey: field.localKey, changes: { required: e.target.checked } }))}
          />
          <span className="font-medium text-slate-800">Required</span>
        </label>
      </div>

      {/* Help Text */}
      <div>
        <input
          type="text"
          placeholder="Help text (optional) - displayed below the field"
          className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#c09d2a] outline-none text-sm"
          value={field.help_text ?? ''}
          onChange={(e) =>
            dispatch(builderUpdateField({ localKey: field.localKey, changes: { help_text: e.target.value } }))
          }
        />
      </div>

      {/* Display as Ordered List - ONLY for checkbox */}
      {isCheckbox && (
        <div className="flex items-center space-x-4 pt-1">
          <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-[#1b4332] focus:ring-[#c09d2a]"
              checked={field.display_as_ordered ?? false}
              onChange={(e) =>
                dispatch(builderUpdateField({ 
                  localKey: field.localKey, 
                  changes: { display_as_ordered: e.target.checked } 
                }))
              }
            />
            <span className="font-medium text-slate-800">Display options as numbered list (1, 2, 3...)</span>
          </label>
        </div>
      )}

      {/* Allow Other option - ONLY for dropdown */}
      {isDropdown && (
        <div className="flex items-center space-x-4 pt-1 border-t border-slate-200 pt-2">
          <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-[#1b4332] focus:ring-[#c09d2a]"
              checked={field.allow_other ?? false}
              onChange={(e) =>
                dispatch(builderUpdateField({ 
                  localKey: field.localKey, 
                  changes: { allow_other: e.target.checked } 
                }))
              }
            />
            <span className="font-medium text-slate-800">Allow "Other" option</span>
          </label>
          <span className="text-xs text-slate-400">(Users can type a custom answer)</span>
        </div>
      )}

      {/* Min/Max for numbered_list */}
      {isNumberedList && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Minimum Items</label>
            <input
              type="number"
              placeholder="Min"
              min="0"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#c09d2a] outline-none text-sm"
              value={field.min ?? ''}
              onChange={(e) =>
                dispatch(builderUpdateField({ 
                  localKey: field.localKey, 
                  changes: { min: e.target.value ? parseInt(e.target.value) : undefined } 
                }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Maximum Items</label>
            <input
              type="number"
              placeholder="Max"
              min="0"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#c09d2a] outline-none text-sm"
              value={field.max ?? ''}
              onChange={(e) =>
                dispatch(builderUpdateField({ 
                  localKey: field.localKey, 
                  changes: { max: e.target.value ? parseInt(e.target.value) : undefined } 
                }))
              }
            />
          </div>
        </div>
      )}

      {/* Min/Max for text fields */}
      {isTextType && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Minimum Length</label>
            <input
              type="number"
              placeholder="Min"
              min="0"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#c09d2a] outline-none text-sm"
              value={field.min ?? ''}
              onChange={(e) =>
                dispatch(builderUpdateField({ 
                  localKey: field.localKey, 
                  changes: { min: e.target.value ? parseInt(e.target.value) : undefined } 
                }))
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Maximum Length</label>
            <input
              type="number"
              placeholder="Max"
              min="0"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#c09d2a] outline-none text-sm"
              value={field.max ?? ''}
              onChange={(e) =>
                dispatch(builderUpdateField({ 
                  localKey: field.localKey, 
                  changes: { max: e.target.value ? parseInt(e.target.value) : undefined } 
                }))
              }
            />
          </div>
        </div>
      )}

      {/* Placeholder - for all types except dropdown, checkbox, and numbered_list */}
      {!needsOptions && !isNumberedList && (
        <input
          type="text"
          placeholder="Placeholder text (optional)"
          className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#c09d2a] outline-none text-sm"
          value={field.placeholder ?? ''}
          onChange={(e) =>
            dispatch(builderUpdateField({ localKey: field.localKey, changes: { placeholder: e.target.value } }))
          }
        />
      )}

      {/* Options for dropdown and checkbox */}
      {needsOptions && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <label className="block text-xs font-medium text-slate-600">Options</label>
          <ul className="flex flex-wrap gap-2">
            {(field.options ?? []).map((opt) => (
              <li key={opt} className="inline-flex items-center space-x-1.5 bg-white border border-[#c09d2a] px-2.5 py-1 rounded-full text-xs font-semibold text-[#1b4332]">
                <span>{opt}</span>
                <button
                  type="button"
                  onClick={() => dispatch(builderRemoveOption({ localKey: field.localKey, option: opt }))}
                  aria-label={`Remove option ${opt}`}
                  className="text-slate-400 hover:text-red-600 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </li>
            ))}
            {/* Show "Other" indicator if allow_other is true */}
            {field.allow_other && (
              <li className="inline-flex items-center space-x-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full text-xs font-semibold text-amber-700">
                <span>Other... (custom)</span>
              </li>
            )}
          </ul>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Add option"
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#c09d2a] outline-none text-sm"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOption();
                }
              }}
            />
            <button
              type="button"
              onClick={addOption}
              className="px-3 py-1.5 bg-[#c09d2a] hover:bg-[#b59325] text-white text-sm font-semibold rounded-md transition-colors cursor-pointer"
            >
              Add
            </button>
          </div>
          {(field.options ?? []).length === 0 && !field.allow_other && (
            <p className="text-xs text-amber-700">Dropdown and checkbox fields need at least one option.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => dispatch(builderReorderField({ fromIndex: index, toIndex: index - 1 }))}
          className="px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
        >
          Move Up
        </button>
        <button
          type="button"
          disabled={index === fieldCount - 1}
          onClick={() => dispatch(builderReorderField({ fromIndex: index, toIndex: index + 1 }))}
          className="px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
        >
          Move Down
        </button>
        <button
          type="button"
          onClick={() => dispatch(builderRemoveField(field.localKey))}
          className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded font-medium cursor-pointer"
        >
          Remove Question
        </button>
      </div>
    </fieldset>
  );
}

// ---- responses ----

// ---- responses ----

function SurveyResponsesView({
  surveyId,
  surveys,
  onBack,
}: {
  surveyId: string;
  surveys: Survey[];
  onBack: () => void;
}) {
  const responses = useAppSelector(selectResponsesForSurvey(surveyId));
  const status = useAppSelector((s) => s.surveys.responses.status);
  const error = useAppSelector((s) => s.surveys.responses.error);
  const survey = surveys.find((s) => s.id === surveyId);

  if (!survey) return null;

  // Helper to render cell content based on field type
  const renderCellContent = (field: SurveyField, value: unknown) => {
    if (value === undefined || value === null || value === '') {
      return <span className="text-slate-400">—</span>;
    }

    // Handle array values (checkbox, numbered_list)
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-slate-400">—</span>;
      }

      // Check if it's a numbered_list field
      if (field.type === 'numbered_list') {
        return (
          <ol className="list-decimal pl-4 space-y-0.5 text-sm">
            {value.map((item, idx) => (
              <li key={idx} className="text-slate-800">
                {item || <span className="text-slate-400">Empty</span>}
              </li>
            ))}
          </ol>
        );
      }

      // For checkbox or other arrays, use bullet points
      return (
        <ul className="list-disc pl-4 space-y-0.5 text-sm">
          {value.map((item, idx) => (
            <li key={idx} className="text-slate-800">
              {item || <span className="text-slate-400">Empty</span>}
            </li>
          ))}
        </ul>
      );
    }

    // Handle string values
    if (typeof value === 'string') {
      // Check if it's a checkbox field with comma-separated values
      if (field.type === 'checkbox' && value.includes(',')) {
        const items = value.split(',').map(s => s.trim()).filter(Boolean);
        if (items.length > 1) {
          return (
            <ul className="list-disc pl-4 space-y-0.5 text-sm">
              {items.map((item, idx) => (
                <li key={idx} className="text-slate-800">{item}</li>
              ))}
            </ul>
          );
        }
      }
      return <span className="text-slate-800">{value}</span>;
    }

    return <span className="text-slate-800">{String(value)}</span>;
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center text-sm font-bold text-[#1b4332] hover:text-[#c09d2a] transition-colors cursor-pointer"
      >
        ← Back to surveys
      </button>

      <h3 className="text-xl font-bold text-[#1b4332]">{survey.title} — Responses</h3>

      {status === 'loading' && <p className="text-slate-600 py-4">Loading responses…</p>}
      {status === 'failed' && <p role="alert" className="text-red-700 py-4">{error}</p>}
      {status === 'succeeded' && responses.length === 0 && <p className="text-slate-600 py-4">No responses yet.</p>}

      {status === 'succeeded' && responses.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-[#c09d2a]/20">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#1b4332] text-white font-medium">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Submitted</th>
                {survey.fields.map((f) => (
                  <th key={f.id} className="py-3 px-4 min-w-[150px] max-w-[300px]">
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {responses.map((r) => (
                <tr key={r.id} className="hover:bg-[#fcf8ed]/50 transition-colors">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {new Date(r.submitted_at).toLocaleString()}
                  </td>
                  {survey.fields.map((f) => {
                    const val = r.response_data[f.id];
                    return (
                      <td key={f.id} className="py-3 px-4 align-top">
                        {renderCellContent(f, val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}