// src/components/templates/TemplateComposerModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { fetchActiveTemplate } from '../../store/slices/templatesSlice';
import { type TemplateType } from '../../types/templates.types';
import { selectCurrentUser } from '../../store/slices/userSlice';
import { createMemo, createLetter } from '../../store/slices/documentSlice';
import type { ComposeMemoInput, ComposeLetterInput, Document } from '../../types/documents.types';
import toast from 'react-hot-toast';
import { sanitizePastedHtml } from '../../utils/pasteSanitizer';

const JUDICIARY_CREST_SRC = '/JOB_LOGO.jpg';
const GOLD = '#C29B38';

interface TemplateComposerModalProps {
  type: TemplateType;
  departmentId: string | null;
  onClose: () => void;
  onCreated: (doc: Document) => void;
}

const Spinner: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'sm' }) => (
  <svg
    className={`animate-spin ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-current`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

// Splits the CC textarea value into "Copy to:" entries for the live
// preview, mirroring formatCC() in LetterTemplate.ts: entries separated
// by a blank line, last line of each entry treated as the station and
// rendered bold + uppercase (no underline).
interface CCPreviewEntry {
  bodyLines: string[];
  location: string;
}

const parseCCPreview = (cc: string): CCPreviewEntry[] => {
  return cc
    .split(/\n\s*\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const lines = entry.split('\n').map((l) => l.trim()).filter(Boolean);
      const location = lines[lines.length - 1] || '';
      const bodyLines = lines.slice(0, -1);
      return { bodyLines, location };
    });
};

export const TemplateComposerModal: React.FC<TemplateComposerModalProps> = ({
  type,
  departmentId,
  onClose,
  onCreated,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);

  // NOTE: loadingTemplate/loadError now ONLY control the small footer strip
  // at the bottom of the document preview — they no longer gate rendering
  // of the form, editor, or Save button. Previously the entire composer
  // (including the Save Draft & Continue button) was hidden behind a
  // full-screen spinner until fetchActiveTemplate resolved. If that request
  // hung, errored ambiguously, or a department had no configured template,
  // the user was stuck on a spinner with no way to type or save — which
  // looked exactly like "the Save button is inactive". The footer image/
  // text is cosmetic and non-blocking, so it should never be able to
  // prevent someone from composing and saving a memo/letter.
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [toField, setToField] = useState('REGISTRAR, HIGH COURT / ORHC AIE HOLDER');
  const [fromField, setFromField] = useState('HIGH COURT SUPPORT OFFICE');
  const [refField, setRefField] = useState('');
  // Stored as an unambiguous YYYY-MM-DD string (native <input type="date">
  // format) rather than a free-text display string like "20 Jul 2026".
  // The previous free-text field let the user type any format, and
  // `new Date(dateField).toISOString()` in handleSaveDraft would silently
  // throw RangeError: Invalid time value on unparseable input — caught by
  // the generic catch block and surfaced only as "An error occurred while
  // saving", with no way to trace it back to the date field. A native date
  // input makes that class of bug impossible.
  const [dateField, setDateField] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Signatory fields - separate from the FROM field
  const [signatoryName, setSignatoryName] = useState(currentUser?.full_name ?? '');
  const [senderTitleField, setSenderTitleField] = useState('Registrar, High Court');

  // Controls TO / FROM order in the memo header
  const [fromFirst, setFromFirst] = useState(false);

  const [ccField, setCcField] = useState('');
  const [enclosuresField, setEnclosuresField] = useState('');

  const [footerImageUrl, setFooterImageUrl] = useState<string | null>(null);
  const [footerText, setFooterText] = useState<string>('');

  const editorRef = useRef<HTMLDivElement>(null);

  // Load template for footer — runs in the background; never blocks the
  // rest of the modal from rendering or being usable.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingTemplate(true);
      setLoadError(null);
      try {
        const result = await dispatch(fetchActiveTemplate({ departmentId, type }));
        if (fetchActiveTemplate.fulfilled.match(result) && result.payload.template) {
          const template = result.payload.template;
          if (!cancelled) {
            setFooterImageUrl(template.footer_image_url ?? null);
            setFooterText(template.footer_text ?? '');
          }
        } else if (!fetchActiveTemplate.fulfilled.match(result)) {
          if (!cancelled) {
            setLoadError("Couldn't load the department's footer — continuing without it.");
          }
        }
      } catch (err) {
        console.error('[TemplateComposerModal] Failed to resolve template footer:', err);
        if (!cancelled) setLoadError("Couldn't load the department's footer — continuing without it.");
      } finally {
        if (!cancelled) setLoadingTemplate(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [type, departmentId, dispatch]);

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  // Intercepts paste into the body editor and strips Word/Excel clipboard
  // bloat (empty spacer paragraphs, mso-* styles, conditional comments)
  // before it's inserted — instead of letting the browser's default paste
  // behavior dump the raw clipboard HTML straight into the DOM. This is
  // what was producing the stray "." lines and extra vertical spacing
  // around pasted tables (e.g. the AIE-holder table) in generated PDFs.
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      const clean = sanitizePastedHtml(html);
      document.execCommand('insertHTML', false, clean);
    } else {
      document.execCommand('insertText', false, text);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error(`Please enter a subject for this ${type === 'memo' ? 'memo' : 'letter'}`);
      return;
    }
    const bodyHtml = editorRef.current?.innerHTML ?? '';
    if (!bodyHtml.trim()) {
      toast.error('Please write some content in the body');
      return;
    }

    // Build the submitted ISO datetime from the (now guaranteed well-formed)
    // YYYY-MM-DD field. Guarded defensively even though a native date input
    // should never produce an unparseable value.
    const parsedDate = new Date(`${dateField}T00:00:00`);
    if (isNaN(parsedDate.getTime())) {
      toast.error('The date field is invalid — please reselect a date.');
      return;
    }
    const dateIso = parsedDate.toISOString();

    setIsCreating(true);
    try {
      let result;
      if (type === 'memo') {
        const payload: ComposeMemoInput = {
          title: title.trim(),
          to: toField.trim(),
          date: dateIso,
          body: bodyHtml,
          from: fromField.trim(),
          signatureName: signatoryName.trim() || currentUser?.full_name || fromField.trim(),
          signatureTitle: senderTitleField.trim() || 'Registrar, High Court',
          department_id: departmentId ?? undefined,
          reference_no: refField.trim() || undefined,
          fromFirst,
        };
        result = await dispatch(createMemo(payload));
      } else {
        const payload: ComposeLetterInput = {
          title: title.trim(),
          to: toField.trim(),
          date: dateIso,
          body: bodyHtml,
          from: signatoryName.trim() || currentUser?.full_name || '',
          signatureName: signatoryName.trim() || currentUser?.full_name || '',
          signatureTitle: senderTitleField.trim() || 'Registrar, High Court',
          department_id: departmentId ?? undefined,
          reference_no: refField.trim() || undefined,
          cc: ccField.trim() || undefined,
          enclosures: enclosuresField.trim() || undefined,
        };
        result = await dispatch(createLetter(payload));
      }

      if (createMemo.fulfilled.match(result) || createLetter.fulfilled.match(result)) {
        toast.success(`${type === 'memo' ? 'Memo' : 'Letter'} saved as draft`);
        onCreated(result.payload as Document);
      } else {
        toast.error((result.payload as string) ?? 'Failed to save document');
      }
    } catch (err) {
      // Log the real error so this is traceable next time, instead of only
      // ever showing the generic "An error occurred while saving" toast.
      console.error('[TemplateComposerModal] Unexpected error while saving:', err);
      const message = err instanceof Error ? err.message : 'An error occurred while saving';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const editableLineClasses =
    'flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none';

  const ccPreviewEntries = parseCCPreview(ccField);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-xl overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50 shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              New {type === 'memo' ? 'Memo' : 'Letter'}
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder={type === 'memo' ? 'Subject of this memo' : 'Subject of this letter'}
            />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 flex-shrink-0">
          {([
            { label: 'B', command: 'bold', cls: 'font-extrabold' },
            { label: 'I', command: 'italic', cls: 'italic' },
            { label: 'U', command: 'underline', cls: 'underline' },
          ] as const).map(({ label, command, cls }) => (
            <button
              key={label}
              type="button"
              onClick={() => exec(command)}
              className={`w-6 h-6 rounded text-xs text-white/80 hover:bg-white/10 transition-colors ${cls}`}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-4 bg-white/20 mx-1" />
          <button type="button" onClick={() => exec('insertUnorderedList')} className="px-1.5 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors">
            • List
          </button>
          <button type="button" onClick={() => exec('insertOrderedList')} className="px-1.5 h-6 rounded text-[10px] text-white/80 hover:bg-white/10 transition-colors">
            1. List
          </button>
          <span className="ml-auto text-[10px] text-white/40">Formats the body only — header/footer are fixed</span>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 py-6 px-4 sm:px-6">
          <div
            className="mx-auto max-w-[794px] bg-white shadow-sm rounded-sm px-8 py-10 sm:px-16 sm:py-14 text-sm text-black"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {loadError && (
              <p className="mb-4 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                {loadError}
              </p>
            )}

            {type === 'memo' ? (
              <>
                <div className="flex justify-center mb-3">
                  <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="h-[78px] w-auto object-contain" />
                </div>
                <div className="text-center mt-4 mb-2">
                  <p className="text-[19px] font-bold uppercase leading-snug">
                    OFFICE OF THE REGISTRAR HIGH COURT<br />INTERNAL MEMO
                  </p>
                </div>
                <div className="border-t-[2.5px] border-black mb-2.5" />

                {/* Memo fields with TO/FROM swap control */}
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-stone-400 font-medium">Order:</span>
                    <button
                      type="button"
                      onClick={() => setFromFirst(!fromFirst)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-stone-600 bg-stone-100 rounded hover:bg-stone-200 transition"
                    >
                      <span>{fromFirst ? 'FROM → TO' : 'TO → FROM'}</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>
                    <span className="text-[10px] text-stone-400 italic">(swap TO / FROM)</span>
                  </div>

                  {[
                    { label: 'TO', value: toField, set: setToField, upper: true, type: 'text' as const },
                    { label: 'FROM', value: fromField, set: setFromField, upper: true, type: 'text' as const },
                    { label: 'REF', value: refField, set: setRefField, upper: false, placeholder: 'RHC/AIE/___', type: 'text' as const },
                    { label: 'DATE', value: dateField, set: setDateField, upper: false, type: 'date' as const },
                    { label: 'SUBJECT', value: title, set: setTitle, upper: true, placeholder: 'Subject of this memo', type: 'text' as const },
                  ]
                    // Reorder based on fromFirst: swap TO and FROM if true
                    .sort((a, b) => {
                      if (a.label === 'TO' && b.label === 'FROM') return fromFirst ? 1 : -1;
                      if (a.label === 'FROM' && b.label === 'TO') return fromFirst ? -1 : 1;
                      return 0;
                    })
                    .map(({ label, value, set, upper, placeholder, type: inputType }) => (
                      <div key={label} className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
                        <span className="w-24 shrink-0 uppercase">{label}</span>
                        <span className="w-5 shrink-0">:</span>
                        <input
                          type={inputType}
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          placeholder={placeholder}
                          className={`${editableLineClasses} ${upper ? 'uppercase' : ''}`}
                        />
                      </div>
                    ))}
                </div>

                <div className="border-t-[2.5px] border-black mt-3 mb-10" />
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onPaste={handlePaste}
                  data-placeholder="Start typing the body of the memo…"
                  className="min-h-[260px] text-[13.5px] leading-[1.8] text-justify focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300 empty:before:italic empty:before:pointer-events-none"
                />

                <div className="mt-10">
                  <div className="space-y-1">
                    <input
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="Signatory name"
                      className={`${editableLineClasses} block text-[13.5px] font-bold uppercase`}
                    />
                    <input
                      value={senderTitleField}
                      onChange={(e) => setSenderTitleField(e.target.value)}
                      placeholder="Title, e.g. Registrar, High Court"
                      className={`${editableLineClasses} block text-[13.5px] font-bold underline uppercase mt-0.5`}
                    />
                    {currentUser?.full_name && (
                      <div className="text-[11px] text-stone-400 mt-1 italic">
                        rhc/{currentUser.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              // Letter template
              <>
                <div className="flex items-center mb-1">
                  <div className="flex-shrink-0 mr-4">
                    <img src={JUDICIARY_CREST_SRC} alt="Judiciary of Kenya crest" className="w-[70px] h-auto object-contain" />
                  </div>
                  <div>
                    <p className="text-[18px] font-bold leading-tight">THE JUDICIARY</p>
                    <p className="text-[14px] font-bold uppercase leading-tight mt-0.5">
                      OFFICE OF THE REGISTRAR HIGH COURT
                    </p>
                  </div>
                </div>
                <div className="border-t-[1.5px] mb-7" style={{ borderColor: GOLD }} />
                <div className="flex justify-between text-[13px] font-bold mb-7">
                  <span className="flex items-baseline gap-1">
                    Ref:
                    <input
                      value={refField}
                      onChange={(e) => setRefField(e.target.value)}
                      placeholder="RHC/___"
                      className={editableLineClasses}
                    />
                  </span>
                  <input
                    type="date"
                    value={dateField}
                    onChange={(e) => setDateField(e.target.value)}
                    className={`${editableLineClasses} text-right`}
                  />
                </div>
                <div className="min-h-[340px] text-[13px] leading-[1.8] text-justify">
                  <div className="mb-4">
                    <textarea
                      value={toField}
                      onChange={(e) => setToField(e.target.value)}
                      placeholder="Recipient address block, e.g.\nThe Registrar,\nHigh Court of Kenya"
                      rows={3}
                      className="w-full resize-none bg-transparent border-0 focus:outline-none placeholder:text-stone-300 placeholder:italic"
                    />
                  </div>
                  <div className="mb-4">
                    <span className="font-bold underline">RE: </span>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Subject of this letter"
                      className={`${editableLineClasses} font-bold underline`}
                    />
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onPaste={handlePaste}
                    data-placeholder="Start typing the body of the letter…"
                    className="min-h-[220px] focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300 empty:before:italic empty:before:pointer-events-none"
                  />
                </div>
                <div className="mt-12">
                  <input
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Signatory name"
                    className={`${editableLineClasses} block text-[13px] font-bold uppercase`}
                  />
                  <input
                    value={senderTitleField}
                    onChange={(e) => setSenderTitleField(e.target.value)}
                    placeholder="Title, e.g. Registrar, High Court"
                    className={`${editableLineClasses} block text-[13px] font-bold underline uppercase mt-0.5`}
                  />
                </div>

                {/* CC block */}
                <div className="mt-8 border-t border-stone-300 pt-4">
                  <div className="mb-2">
                    <span className="font-bold text-xs italic underline">Copy to:</span>
                  </div>
                  <textarea
                    value={ccField}
                    onChange={(e) => setCcField(e.target.value)}
                    placeholder={'Presiding Judge,\nCivil Division\nNAIROBI\n\nPresiding Judge,\nTribunals Appeal Division\nNAIROBI'}
                    rows={4}
                    className="w-full resize-y bg-transparent border border-dashed border-stone-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-stone-500 placeholder:text-stone-300 placeholder:italic"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Separate each recipient with a blank line. The last line of each entry (e.g. station) is rendered bold and uppercase (no underline).
                  </p>

                  {ccPreviewEntries.length > 0 && (
                    <div className="mt-3 text-[13px] leading-[1.5]">
                      <div className="ml-6">
                        {ccPreviewEntries.map((entry, idx) => (
                          <div key={idx} className="flex mb-4 last:mb-0">
                            <span className="w-6 shrink-0">{idx + 1}.</span>
                            <div className="flex-1">
                              {entry.bodyLines.map((line, i) => (
                                <p key={i} className="m-0">{line}</p>
                              ))}
                              {entry.location && (
                                <p className="m-0 font-bold uppercase">{entry.location}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex">
                  <span className="w-24 shrink-0 font-bold text-xs">Enclosures</span>
                  <span className="w-4 shrink-0 text-xs">:</span>
                  <input
                    value={enclosuresField}
                    onChange={(e) => setEnclosuresField(e.target.value)}
                    placeholder="List enclosures, e.g. 1. Affidavit"
                    className={`${editableLineClasses} text-xs`}
                  />
                </div>
              </>
            )}

            {/* Footer strip — the only part gated by the template fetch.
                Shows a small inline spinner while loading, then the real
                footer once resolved, or a graceful fallback if it never
                loads. Never blocks the rest of the form. */}
            <div className="mt-12 pt-3 border-t border-stone-300 flex items-center gap-3">
              {loadingTemplate ? (
                <div className="flex items-center gap-2 text-stone-400">
                  <Spinner size="sm" />
                  <span className="text-[10px]">Loading department letterhead…</span>
                </div>
              ) : footerImageUrl ? (
                <img src={footerImageUrl} alt="" className="h-10 w-auto object-contain" />
              ) : (
                <div className="h-10 w-20 bg-stone-100 rounded flex items-center justify-center text-[9px] text-stone-400">
                  No image
                </div>
              )}
              {!loadingTemplate && (
                footerText ? (
                  <p className="text-[10px] leading-tight text-stone-700 whitespace-pre-wrap">{footerText}</p>
                ) : (
                  <p className="text-[10px] leading-tight text-stone-400 italic">
                    {departmentId ? 'No footer configured for this department' : 'No department selected'}
                  </p>
                )
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isCreating}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {isCreating && <Spinner />}
            {isCreating ? 'Saving…' : 'Save Draft & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateComposerModal;