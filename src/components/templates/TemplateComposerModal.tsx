// src/components/templates/TemplateComposerModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { fetchActiveTemplate } from '../../store/slices/templatesSlice'; // ✅ removed fetchAllTemplates
import { type TemplateType } from '../../types/templates.types';
import { selectCurrentUser } from '../../store/slices/userSlice';
import { createMemo, createLetter } from '../../store/slices/documentSlice';
import type { ComposeMemoInput, ComposeLetterInput, Document } from '../../types/documents.types';
import toast from 'react-hot-toast';

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

export const TemplateComposerModal: React.FC<TemplateComposerModalProps> = ({
  type,
  departmentId,
  onClose,
  onCreated,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);

  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [title, setTitle] = useState(
    `${type === 'memo' ? 'Memo' : 'Letter'} — ${new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}`
  );
  const [toField, setToField] = useState('REGISTRAR, HIGH COURT / ORHC AIE HOLDER');
  const [fromField, setFromField] = useState('HIGH COURT SUPPORT OFFICE -ORHC');
  const [refField, setRefField] = useState('');
  const [dateField, setDateField] = useState(
    new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())
  );
  const [subjectField, setSubjectField] = useState('');
  const [signatoryName, setSignatoryName] = useState(currentUser?.full_name ?? '');
  const [senderTitleField, setSenderTitleField] = useState('Registrar, High Court');

  const [ccField, setCcField] = useState('');
  const [enclosuresField, setEnclosuresField] = useState('');

  const [footerImageUrl, setFooterImageUrl] = useState<string | null>(null);
  const [footerText, setFooterText] = useState<string>('');

  const editorRef = useRef<HTMLDivElement>(null);

  // Load template for footer
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingTemplate(true);
      setLoadError(null);
      try {
        // ✅ removed unused 'key' variable – just pass departmentId directly
        const result = await dispatch(fetchActiveTemplate({ departmentId, type }));
        if (fetchActiveTemplate.fulfilled.match(result) && result.payload.template) {
          const template = result.payload.template;
          if (!cancelled) {
            setFooterImageUrl(template.footer_image_url ?? null);
            setFooterText(template.footer_text ?? '');
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

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error('Please give this document a title');
      return;
    }
    const bodyHtml = editorRef.current?.innerHTML ?? '';
    if (!bodyHtml.trim()) {
      toast.error('Please write some content in the body');
      return;
    }

    setIsCreating(true);
    try {
      let result;
      if (type === 'memo') {
        const payload: ComposeMemoInput = {
          title: title.trim(),
          to: toField.trim(),
          date: new Date(dateField).toISOString(),
          body: bodyHtml,
          from: fromField.trim(),
          signatureTitle: senderTitleField.trim(),
          department_id: departmentId ?? undefined,
          reference_no: refField.trim() || undefined,
        };
        result = await dispatch(createMemo(payload));
      } else {
        const payload: ComposeLetterInput = {
          title: title.trim(),
          to: toField.trim(),
          date: new Date(dateField).toISOString(),
          body: bodyHtml,
          from: signatoryName.trim(),
          signatureTitle: senderTitleField.trim(),
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
    } catch {
      toast.error('An error occurred while saving');
    } finally {
      setIsCreating(false);
    }
  };

  const editableLineClasses =
    'flex-1 bg-transparent border-0 border-b border-dashed border-transparent px-0.5 -mx-0.5 hover:border-stone-300 focus:border-stone-500 focus:outline-none';

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
              placeholder="Document title (internal reference, not printed on the document)"
            />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loadingTemplate ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
            <Spinner size="md" />
            <p className="text-sm text-slate-400">Loading department letterhead…</p>
          </div>
        ) : (
          <>
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
                    <div className="mt-2">
                      {[
                        { label: 'TO', value: toField, set: setToField, upper: true },
                        { label: 'FROM', value: fromField, set: setFromField, upper: true },
                        { label: 'REF', value: refField, set: setRefField, upper: false, placeholder: 'RHC/AIE/___' },
                        { label: 'DATE', value: dateField, set: setDateField, upper: false },
                        { label: 'SUBJECT', value: subjectField, set: setSubjectField, upper: true, placeholder: 'Subject of this memo' },
                      ].map(({ label, value, set, upper, placeholder }) => (
                        <div key={label} className="flex text-[13.5px] font-bold" style={{ lineHeight: 2 }}>
                          <span className="w-24 shrink-0 uppercase">{label}</span>
                          <span className="w-5 shrink-0">:</span>
                          <input
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
                      data-placeholder="Start typing the body of the memo…"
                      className="min-h-[260px] text-[13.5px] leading-[1.8] text-justify focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300 empty:before:italic empty:before:pointer-events-none"
                    />
                    <div className="mt-10">
                      <input
                        value={fromField}
                        onChange={(e) => setFromField(e.target.value)}
                        className={`${editableLineClasses} block text-[13.5px] font-bold underline uppercase`}
                      />
                    </div>
                  </>
                ) : (
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
                          value={subjectField}
                          onChange={(e) => setSubjectField(e.target.value)}
                          placeholder="Subject of this letter"
                          className={`${editableLineClasses} font-bold underline`}
                        />
                      </div>
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
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
                    <div className="mt-8 space-y-2 border-t border-stone-300 pt-4">
                      <div className="flex">
                        <span className="w-24 shrink-0 font-bold text-xs">CC</span>
                        <span className="w-4 shrink-0 text-xs">:</span>
                        <input
                          value={ccField}
                          onChange={(e) => setCcField(e.target.value)}
                          placeholder="Carbon copy recipients"
                          className={`${editableLineClasses} text-xs`}
                        />
                      </div>
                      <div className="flex">
                        <span className="w-24 shrink-0 font-bold text-xs">Enclosures</span>
                        <span className="w-4 shrink-0 text-xs">:</span>
                        <input
                          value={enclosuresField}
                          onChange={(e) => setEnclosuresField(e.target.value)}
                          placeholder="List enclosures, e.g. 1. Affidavit"
                          className={`${editableLineClasses} text-xs`}
                        />
                      </div>
                    </div>
                  </>
                )}

                {(footerImageUrl || footerText) && (
                  <div className="mt-12 pt-3 border-t border-stone-300 flex items-center gap-3">
                    {footerImageUrl && (
                      <img src={footerImageUrl} alt="" className="h-10 w-auto object-contain" />
                    )}
                    {footerText && (
                      <p className="text-[10px] leading-tight text-stone-700 whitespace-pre-wrap">{footerText}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isCreating || loadingTemplate}
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