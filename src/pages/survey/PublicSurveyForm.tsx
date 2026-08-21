// PublicSurveyForm.tsx
import { useEffect, useState, type FormEvent } from 'react';
import type { PublicSurveyView, SurveyField } from '../../types/surveys.types';

type FieldValue = string | string[];
type FormState = Record<string, FieldValue>;
type ErrorState = Record<string, string>;

interface Props {
  slug: string; // Permanent slug
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const isEmptyValue = (v: FieldValue | undefined): boolean => {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return true;
};

function defaultValueFor(field: SurveyField): FieldValue {
  if (field.type === 'checkbox') return [];
  if (field.type === 'numbered_list') return [];
  return '';
}

function draftStorageKey(slug: string): string {
  return `survey-draft:${slug}`;
}

function loadDraft(slug: string): FormState | null {
  try {
    const raw = sessionStorage.getItem(draftStorageKey(slug));
    if (!raw) return null;
    return JSON.parse(raw) as FormState;
  } catch {
    return null;
  }
}

function saveDraft(slug: string, values: FormState) {
  try {
    sessionStorage.setItem(draftStorageKey(slug), JSON.stringify(values));
  } catch {
    // no-op
  }
}

function clearDraft(slug: string) {
  try {
    sessionStorage.removeItem(draftStorageKey(slug));
  } catch {
    // no-op
  }
}

export default function PublicSurveyForm({ slug }: Props) {
  const [survey, setSurvey] = useState<PublicSurveyView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<FormState>({});
  const [errors, setErrors] = useState<ErrorState>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [isOtherSelected, setIsOtherSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const loadSurvey = async () => {
      setIsLoading(true);
      try {
        const url = `${API_BASE}/surveys/public/${slug}`;
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          let errorMessage = `Failed to load survey (${response.status})`;
          try {
            const body = await response.json();
            errorMessage = body?.message || errorMessage;
          } catch {
            const text = await response.text();
            if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
              errorMessage = `Server returned HTML (${response.status}). Please check API configuration.`;
            } else {
              errorMessage = response.statusText || errorMessage;
            }
          }
          throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error('Server returned non-JSON response.');
        }

        const data = (await response.json()) as PublicSurveyView;

        if (!cancelled) {
          setSurvey(data);
          const initial: FormState = {};
          for (const f of data.fields) {
            initial[f.id] = defaultValueFor(f);
          }

          const draft = loadDraft(slug);
          if (draft) {
            for (const f of data.fields) {
              if (draft[f.id] !== undefined) {
                // For numbered_list, ensure we always have an array
                if (f.type === 'numbered_list') {
                  const draftValue = draft[f.id];
                  if (Array.isArray(draftValue)) {
                    initial[f.id] = draftValue;
                  } else {
                    // If it's not an array, reset to empty array
                    initial[f.id] = [];
                  }
                } else {
                  initial[f.id] = draft[f.id];
                }
              }
            }
          }
          setValues(initial);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load survey';
          setLoadError(errorMessage);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSurvey();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  function setValue(fieldId: string, value: FieldValue) {
    setValues((prev) => {
      const next = { ...prev, [fieldId]: value };
      saveDraft(slug, next);
      return next;
    });
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  function handleOtherChange(fieldId: string, value: string) {
    setOtherValues(prev => ({ ...prev, [fieldId]: value }));
    setValue(fieldId, value);
  }

  function handleDropdownChange(fieldId: string, value: string) {
    if (value === '__other__') {
      setIsOtherSelected(prev => ({ ...prev, [fieldId]: true }));
      setValue(fieldId, '');
    } else {
      setIsOtherSelected(prev => ({ ...prev, [fieldId]: false }));
      setValue(fieldId, value);
    }
  }

  function toggleCheckboxOption(fieldId: string, option: string, checked: boolean) {
    const current = (values[fieldId] as string[]) ?? [];
    const next = checked ? [...current, option] : current.filter((o) => o !== option);
    setValue(fieldId, next);
  }

  function addNumberedListItem(fieldId: string) {
    const current = (values[fieldId] as string[]) ?? [];
    setValue(fieldId, [...current, '']);
  }

  function removeNumberedListItem(fieldId: string, index: number) {
    const current = (values[fieldId] as string[]) ?? [];
    const updated = current.filter((_, i) => i !== index);
    setValue(fieldId, updated);
  }

  function updateNumberedListItem(fieldId: string, index: number, value: string) {
    const current = (values[fieldId] as string[]) ?? [];
    const updated = [...current];
    updated[index] = value;
    setValue(fieldId, updated);
  }

  function validate(): boolean {
    if (!survey) return false;
    const nextErrors: ErrorState = {};

    for (const field of survey.fields) {
      const value = values[field.id];
      const isOther = isOtherSelected[field.id] && otherValues[field.id]?.trim();

      // Required validation
      if (field.required && isEmptyValue(value) && !isOther) {
        nextErrors[field.id] = `${field.label} is required`;
        continue;
      }

      // Skip further validation if empty and not required
      if (isEmptyValue(value) && !isOther) continue;

      // Min length validation for text/textarea
      if ((field.type === 'text' || field.type === 'textarea') && typeof value === 'string') {
        if (field.min !== undefined && value.length < field.min) {
          nextErrors[field.id] = `${field.label} must be at least ${field.min} characters`;
          continue;
        }
        if (field.max !== undefined && value.length > field.max) {
          nextErrors[field.id] = `${field.label} must be at most ${field.max} characters`;
          continue;
        }
      }

      // Validation for numbered_list
      if (field.type === 'numbered_list' && Array.isArray(value)) {
        const nonEmptyItems = value.filter((item) => item.trim().length > 0);
        if (field.min !== undefined && nonEmptyItems.length < field.min) {
          nextErrors[field.id] = `${field.label} requires at least ${field.min} item${field.min > 1 ? 's' : ''}`;
          continue;
        }
        if (field.max !== undefined && nonEmptyItems.length > field.max) {
          nextErrors[field.id] = `${field.label} allows at most ${field.max} item${field.max > 1 ? 's' : ''}`;
          continue;
        }
      }

      // For dropdown with "Other", validate the custom value
      if (field.type === 'dropdown' && field.allow_other && isOther) {
        const customValue = otherValues[field.id]?.trim();
        if (!customValue) {
          nextErrors[field.id] = `Please specify your custom answer for "${field.label}"`;
          continue;
        }
        if (customValue.length > 255) {
          nextErrors[field.id] = `Custom answer must be less than 255 characters`;
          continue;
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submitResponse() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const cleanedValues = { ...values };
      for (const field of survey?.fields ?? []) {
        if (field.type === 'dropdown' && field.allow_other && isOtherSelected[field.id]) {
          const otherText = otherValues[field.id]?.trim();
          if (otherText) {
            cleanedValues[field.id] = otherText;
          }
        }
      }

      const url = `${API_BASE}/surveys/public/${slug}/responses`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response_data: cleanedValues }),
      });

      if (!res.ok) {
        let errorMessage = `Failed to submit response (${res.status})`;
        try {
          const body = await res.json();
          errorMessage = body?.message || errorMessage;
        } catch {
          const text = await res.text();
          if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
            errorMessage = 'Server returned HTML. Please check your API configuration.';
          } else {
            errorMessage = res.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      clearDraft(slug);
      setSubmitted(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong.';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    await submitResponse();
  }

  async function handleRetry() {
    await submitResponse();
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-12 text-center bg-white rounded-2xl shadow-lg border border-[#c09d2a]/20">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#c09d2a] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#1b4332] font-medium text-lg">Loading survey details…</p>
          <p className="text-slate-400 text-sm">Please wait while we prepare your form</p>
        </div>
      </div>
    );
  }

  // Error State
  if (loadError) {
    const isNotFound = loadError.includes('404') || loadError.includes('not found');
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl shadow-lg border-t-8 border-amber-500">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-800">
            {isNotFound ? 'Form Not Available' : 'Something Went Wrong'}
          </h2>

          <p className="text-slate-600 max-w-md">
            {isNotFound 
              ? 'The form you are looking for is not available. Please check the URL or contact the administrator.'
              : loadError
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#1b4332] hover:bg-[#0f2e22] text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
            <a
              href="/"
              className="px-6 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors text-center"
            >
              Go Home
            </a>
          </div>

          {import.meta.env.DEV && (
            <details className="mt-6 w-full text-left bg-slate-50 rounded-lg p-4 text-xs text-slate-500 cursor-pointer">
              <summary className="font-medium hover:text-slate-700">Debug Information</summary>
              <div className="mt-3 space-y-1 font-mono bg-white p-3 rounded border border-slate-200">
                <p><span className="font-semibold">Slug:</span> {slug}</p>
                <p><span className="font-semibold">API URL:</span> {API_BASE}</p>
                <p><span className="font-semibold">Full URL:</span> {`${API_BASE}/surveys/public/${slug}`}</p>
                <p><span className="font-semibold">Error:</span> {loadError}</p>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-12 text-center bg-white rounded-2xl shadow-lg border border-[#c09d2a]/20">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[#1b4332] font-medium text-lg">No survey found</p>
          <p className="text-slate-400 text-sm">The survey you are looking for could not be found.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-10 bg-white rounded-2xl shadow-lg border-t-8 border-emerald-500 text-center space-y-4" role="status">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-[#1b4332]">Thank You!</h2>
        <p className="text-slate-600 text-lg">Your response has been successfully recorded.</p>
        <p className="text-slate-400 text-sm">We appreciate your feedback.</p>
      </div>
    );
  }

  return (
    <form className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-md border-t-8 border-[#1b4332] space-y-6" onSubmit={handleSubmit} noValidate>
      <header className="border-b border-slate-200 pb-4 space-y-2">
        <h1 className="text-2xl font-serif font-bold text-[#1b4332]">{survey.title}</h1>
        {survey.description && <p className="text-slate-600 text-sm leading-relaxed">{survey.description}</p>}
      </header>

      <div className="space-y-6">
        {survey.fields.map((field) => {
          const isInvalid = Boolean(errors[field.id]);

          return (
            <div key={field.id} className="space-y-1.5">
              <label htmlFor={field.id} id={`${field.id}-label`} className="block text-sm font-semibold text-slate-800">
                {field.label}
                {field.required && <span className="text-red-600 ml-0.5" aria-hidden="true">*</span>}
                {field.min !== undefined && field.type === 'numbered_list' && (
                  <span className="text-xs font-normal text-slate-500 ml-1.5">
                    (min {field.min} item{field.min > 1 ? 's' : ''})
                  </span>
                )}
                {field.max !== undefined && field.type === 'numbered_list' && (
                  <span className="text-xs font-normal text-slate-500 ml-1.5">
                    (max {field.max} item{field.max > 1 ? 's' : ''})
                  </span>
                )}
                {field.min !== undefined && field.type !== 'checkbox' && field.type !== 'numbered_list' && (
                  <span className="text-xs font-normal text-slate-500 ml-1.5">
                    (min {field.min} {field.type === 'textarea' ? 'characters' : 'characters'})
                  </span>
                )}
                {field.max !== undefined && field.type !== 'checkbox' && field.type !== 'numbered_list' && (
                  <span className="text-xs font-normal text-slate-500 ml-1.5">
                    (max {field.max} {field.type === 'textarea' ? 'characters' : 'characters'})
                  </span>
                )}
              </label>

              {field.type === 'text' && (
                <input
                  id={field.id}
                  type="text"
                  placeholder={field.placeholder}
                  value={(values[field.id] as string) ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  aria-invalid={isInvalid}
                  aria-describedby={isInvalid ? `${field.id}-error` : undefined}
                  minLength={field.min}
                  maxLength={field.max}
                  className={`w-full px-3.5 py-2 border rounded-lg outline-none transition-all text-sm ${
                    isInvalid
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20'
                      : 'border-slate-300 focus:ring-2 focus:ring-[#c09d2a] focus:border-[#c09d2a]'
                  }`}
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  id={field.id}
                  placeholder={field.placeholder}
                  value={(values[field.id] as string) ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  aria-invalid={isInvalid}
                  aria-describedby={isInvalid ? `${field.id}-error` : undefined}
                  rows={4}
                  minLength={field.min}
                  maxLength={field.max}
                  className={`w-full px-3.5 py-2 border rounded-lg outline-none transition-all text-sm ${
                    isInvalid
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20'
                      : 'border-slate-300 focus:ring-2 focus:ring-[#c09d2a] focus:border-[#c09d2a]'
                  }`}
                />
              )}

              {field.type === 'date' && (
                <input
                  id={field.id}
                  type="date"
                  value={(values[field.id] as string) ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  aria-invalid={isInvalid}
                  aria-describedby={isInvalid ? `${field.id}-error` : undefined}
                  className={`w-full px-3.5 py-2 border rounded-lg outline-none transition-all text-sm bg-white ${
                    isInvalid
                      ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20'
                      : 'border-slate-300 focus:ring-2 focus:ring-[#c09d2a] focus:border-[#c09d2a]'
                  }`}
                />
              )}

              {field.type === 'dropdown' && (
                <div className="space-y-2">
                  <select
                    id={field.id}
                    value={
                      isOtherSelected[field.id] 
                        ? '__other__' 
                        : ((values[field.id] as string) ?? '')
                    }
                    onChange={(e) => handleDropdownChange(field.id, e.target.value)}
                    aria-invalid={isInvalid}
                    aria-describedby={isInvalid ? `${field.id}-error` : undefined}
                    className={`w-full px-3.5 py-2 border rounded-lg outline-none transition-all text-sm bg-white ${
                      isInvalid
                        ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20'
                        : 'border-slate-300 focus:ring-2 focus:ring-[#c09d2a] focus:border-[#c09d2a]'
                    }`}
                  >
                    <option value="" disabled>
                      {field.placeholder ?? 'Select an option'}
                    </option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    {field.allow_other && (
                      <option value="__other__">Other...</option>
                    )}
                  </select>

                  {field.allow_other && isOtherSelected[field.id] && (
                    <input
                      type="text"
                      placeholder="Please specify..."
                      value={otherValues[field.id] ?? ''}
                      onChange={(e) => handleOtherChange(field.id, e.target.value)}
                      className={`w-full px-3.5 py-2 border rounded-lg outline-none transition-all text-sm ${
                        isInvalid
                          ? 'border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50/20'
                          : 'border-slate-300 focus:ring-2 focus:ring-[#c09d2a] focus:border-[#c09d2a]'
                      }`}
                    />
                  )}
                </div>
              )}

              {field.type === 'checkbox' && (
                <div
                  className="space-y-2 pt-1"
                  role="group"
                  aria-labelledby={`${field.id}-label`}
                >
                  {field.display_as_ordered ? (
                    <ol className="list-decimal pl-5 space-y-2">
                      {(field.options ?? []).map((opt) => {
                        const checkboxId = `${field.id}-${opt}`;
                        const checked = ((values[field.id] as string[]) ?? []).includes(opt);
                        return (
                          <li key={opt}>
                            <label htmlFor={checkboxId} className="flex items-center space-x-2.5 text-sm text-slate-700 cursor-pointer select-none">
                              <input
                                id={checkboxId}
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleCheckboxOption(field.id, opt, e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-[#1b4332] focus:ring-[#c09d2a]"
                              />
                              <span>{opt}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <ul className="list-disc pl-5 space-y-2">
                      {(field.options ?? []).map((opt) => {
                        const checkboxId = `${field.id}-${opt}`;
                        const checked = ((values[field.id] as string[]) ?? []).includes(opt);
                        return (
                          <li key={opt}>
                            <label htmlFor={checkboxId} className="flex items-center space-x-2.5 text-sm text-slate-700 cursor-pointer select-none">
                              <input
                                id={checkboxId}
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleCheckboxOption(field.id, opt, e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-[#1b4332] focus:ring-[#c09d2a]"
                              />
                              <span>{opt}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {field.type === 'numbered_list' && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-slate-500">
                    {field.min !== undefined && field.max !== undefined && (
                      <>Enter between {field.min} and {field.max} items</>
                    )}
                    {field.min !== undefined && field.max === undefined && (
                      <>Enter at least {field.min} item{field.min > 1 ? 's' : ''}</>
                    )}
                    {field.min === undefined && field.max !== undefined && (
                      <>Enter up to {field.max} item{field.max > 1 ? 's' : ''}</>
                    )}
                  </p>
                  <ol className="list-decimal pl-5 space-y-2">
                    {((values[field.id] as string[]) ?? []).map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={field.placeholder || `Item ${index + 1}`}
                          value={item}
                          onChange={(e) => updateNumberedListItem(field.id, index, e.target.value)}
                          className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg outline-none transition-all text-sm focus:ring-2 focus:ring-[#c09d2a] focus:border-[#c09d2a]"
                        />
                        <button
                          type="button"
                          onClick={() => removeNumberedListItem(field.id, index)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    onClick={() => addNumberedListItem(field.id)}
                    disabled={((values[field.id] as string[]) ?? []).length >= (field.max ?? Infinity)}
                    className="text-sm text-[#1b4332] font-medium hover:text-[#c09d2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add Item
                  </button>
                </div>
              )}

              {/* Help Text */}
              {field.help_text && (
                <p className="text-xs text-slate-500 italic mt-1" id={`${field.id}-help`}>
                  {field.help_text}
                </p>
              )}

              {isInvalid && (
                <p id={`${field.id}-error`} className="text-xs font-semibold text-red-600 mt-1" role="alert">
                  {errors[field.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2" role="alert">
          <p className="text-sm text-red-700 font-medium">{submitError}</p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={submitting}
            className="text-xs font-semibold text-red-800 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded transition-colors cursor-pointer"
          >
            {submitting ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 px-4 bg-[#1b4332] hover:bg-[#0f2e22] text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Response'}
      </button>
    </form>
  );
}