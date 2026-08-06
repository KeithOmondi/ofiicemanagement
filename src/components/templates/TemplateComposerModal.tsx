// src/components/templates/TemplateComposerModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { fetchActiveTemplate } from '../../store/slices/templatesSlice';
import { type TemplateType } from '../../types/templates.types';
import { selectCurrentUser } from '../../store/slices/userSlice';
import { createMemo, createLetter, createCertificate } from '../../store/slices/documentSlice';
import type { ComposeMemoInput, ComposeLetterInput, Document, DocumentAttachment } from '../../types/documents.types';
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

  // ─── Form state ──────────────────────────────────────────────────────────────

  // Common fields
  const [title, setTitle] = useState('');
  const [toField, setToField] = useState('REGISTRAR, HIGH COURT / ORHC AIE HOLDER');
  const [fromField, setFromField] = useState('HIGH COURT SUPPORT OFFICE');
  const [refField, setRefField] = useState('');
  const [dateField, setDateField] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [signatoryName, setSignatoryName] = useState(currentUser?.full_name ?? '');
  const [senderTitleField, setSenderTitleField] = useState('Registrar, High Court');
  const [fromFirst, setFromFirst] = useState(false);

  // Memo-specific fields
  const [ccField, setCcField] = useState('');
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);

  // Letter-specific fields
  const [letterCcField, setLetterCcField] = useState('');
  const [enclosuresField, setEnclosuresField] = useState('');

  // ─── Certificate-specific fields ────────────────────────────────────────────

  const [ruleReference, setRuleReference] = useState('(Order 5 Rule 32(e) of the Civil Procedure Rules)');
  const [datedLine, setDatedLine] = useState(() => {
    const now = new Date();
    const day = now.getDate();
    const suffix = ['th', 'st', 'nd', 'rd'][(day % 10 > 3 || Math.floor(day % 100 / 10) === 1) ? 0 : day % 10];
    const month = now.toLocaleString('en', { month: 'long' });
    return `Dated, Signed and Sealed this ${day}${suffix} ${month}, ${now.getFullYear()}.`;
  });
  const [signatoryLines, setSignatoryLines] = useState<string[]>(['REGISTRAR,', 'HIGH COURT OF KENYA']);
  const [draftedByInitials, setDraftedByInitials] = useState('lnu');

  const [footerImageUrl, setFooterImageUrl] = useState<string | null>(null);
  const [footerText, setFooterText] = useState<string>('');

  const editorRef = useRef<HTMLDivElement>(null);

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

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a temporary URL for the attachment
    const url = URL.createObjectURL(file);
    setAttachments(prev => [...prev, {
      name: file.name,
      url: url,
      size: file.size,
      mimeType: file.type,
    }]);
    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error(`Please enter a subject for this ${type === 'memo' ? 'memo' : type === 'letter' ? 'letter' : 'certificate'}`);
      return;
    }
    const bodyHtml = editorRef.current?.innerHTML ?? '';
    if (!bodyHtml.trim()) {
      toast.error('Please write some content in the body');
      return;
    }

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
          cc: ccField.trim() || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        };
        result = await dispatch(createMemo(payload));
      } else if (type === 'letter') {
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
          cc: letterCcField.trim() || undefined,
          enclosures: enclosuresField.trim() || undefined,
        };
        result = await dispatch(createLetter(payload));
      } else {
        const payload = {
          title: title.trim(),
          to: toField.trim(),
          from: fromField.trim(),
          body: bodyHtml,
          signatureName: signatoryName.trim() || currentUser?.full_name || fromField.trim(),
          signatureTitle: senderTitleField.trim() || 'Registrar, High Court',
          department_id: departmentId ?? undefined,
          reference_no: refField.trim() || undefined,
          ruleReference: ruleReference.trim() || undefined,
          datedLine: datedLine.trim() || `Dated, Signed and Sealed this ${new Date().toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
          signatoryLines: signatoryLines.length > 0 ? signatoryLines : ['REGISTRAR,', 'HIGH COURT OF KENYA'],
          draftedByInitials: draftedByInitials.trim() || undefined,
        };
        result = await dispatch(createCertificate(payload));
      }

      if (createMemo.fulfilled.match(result) || createLetter.fulfilled.match(result) || createCertificate.fulfilled.match(result)) {
        toast.success(`${type === 'memo' ? 'Memo' : type === 'letter' ? 'Letter' : 'Certificate'} saved as draft`);
        onCreated(result.payload as Document);
      } else {
        toast.error((result.payload as string) ?? 'Failed to save document');
      }
    } catch (err) {
      console.error('[TemplateComposerModal] Unexpected error while saving:', err);
      const message = err instanceof Error ? err.message : 'An error occurred while saving';
      toast.error(message);
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
              New {type === 'memo' ? 'Memo' : type === 'letter' ? 'Letter' : 'Certificate'}
            </p>
            {type === 'certificate' ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm font-semibold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none transition-colors text-center uppercase"
                placeholder="CERTIFICATE OF SERVICE OF FOREIGN PROCESS"
              />
            ) : (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm font-semibold text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
                placeholder={type === 'memo' ? 'Subject of this memo' : 'Subject of this letter'}
              />
            )}
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
              // ─── MEMO TEMPLATE ──────────────────────────────────────────────────
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
                    { label: 'CC', value: ccField, set: setCcField, upper: false, placeholder: 'Optional CC recipients', type: 'text' as const },
                    { label: 'REF', value: refField, set: setRefField, upper: false, placeholder: 'RHC/AIE/___', type: 'text' as const },
                    { label: 'DATE', value: dateField, set: setDateField, upper: false, type: 'date' as const },
                    { label: 'SUBJECT', value: title, set: setTitle, upper: true, placeholder: 'Subject of this memo', type: 'text' as const },
                  ]
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

                {/* ─── Attachments Section ───────────────────────────────────── */}
                <div className="mt-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[10.5pt] font-bold text-stone-700">Attachments:</span>
                    <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-[#1E4620] hover:text-[#c9a84c] border border-dashed border-[#c9a84c] rounded px-2 py-0.5 hover:border-[#1E4620] transition">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add File
                      <input
                        type="file"
                        onChange={handleAddAttachment}
                        className="hidden"
                        multiple={false}
                      />
                    </label>
                    <span className="text-[9px] text-stone-400">{attachments.length} file(s) attached</span>
                  </div>
                  {attachments.length > 0 && (
                    <ul className="mt-2 list-none p-0 space-y-1">
                      {attachments.map((att, index) => (
                        <li key={index} className="flex items-center justify-between py-1 px-2 bg-stone-50 rounded border border-stone-200">
                          <div className="flex items-center gap-2">
                            <svg className="h-3.5 w-3.5 text-[#c9a84c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                            <span className="text-xs text-stone-700">{att.name}</span>
                            {att.size && (
                              <span className="text-[9px] text-stone-400">({formatFileSize(att.size)})</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(index)}
                            className="text-stone-400 hover:text-red-500 transition p-0.5"
                            title="Remove attachment"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

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
            ) : type === 'letter' ? (
              // ─── LETTER TEMPLATE ─────────────────────────────────────────────────
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

                <div className="mt-8 border-t border-stone-300 pt-4">
                  <div className="mb-2">
                    <span className="font-bold text-xs italic underline">Copy to:</span>
                  </div>
                  <textarea
                    value={letterCcField}
                    onChange={(e) => setLetterCcField(e.target.value)}
                    placeholder={'Presiding Judge,\nCivil Division\nNAIROBI\n\nPresiding Judge,\nTribunals Appeal Division\nNAIROBI'}
                    rows={4}
                    className="w-full resize-y bg-transparent border border-dashed border-stone-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-stone-500 placeholder:text-stone-300 placeholder:italic"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Separate each recipient with a blank line. The last line of each entry (e.g. station) is rendered bold and uppercase (no underline).
                  </p>

                  {letterCcField && (
                    <div className="mt-3 text-[13px] leading-[1.5]">
                      <div className="ml-6">
                        {letterCcField.split('\n').filter(line => line.trim()).map((line, idx) => (
                          <div key={idx} className="flex mb-2 last:mb-0">
                            <span className="w-6 shrink-0">{idx + 1}.</span>
                            <span className="flex-1">{line}</span>
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
            ) : (
              // ─── CERTIFICATE TEMPLATE ─────────────────────────────────────────────
              <>
                <div className="flex justify-center mb-4">
                  <img 
                    src={JUDICIARY_CREST_SRC} 
                    alt="Judiciary of Kenya crest" 
                    className="h-[78px] w-auto object-contain" 
                  />
                </div>

                <div className="text-center mb-2">
                  <p className="text-[19px] font-bold uppercase leading-snug">
                    OFFICE OF THE REGISTRAR HIGH COURT
                  </p>
                </div>

                <div className="border-t-[2.5px] border-black mb-6" />

                {/* Certificate Title */}
                <div className="text-center mb-1">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="CERTIFICATE OF SERVICE OF FOREIGN PROCESS"
                    className={`${editableLineClasses} w-full text-center text-[16px] font-bold uppercase`}
                  />
                </div>

                {/* Rule Reference */}
                <div className="text-center mb-6">
                  <input
                    value={ruleReference}
                    onChange={(e) => setRuleReference(e.target.value)}
                    placeholder="(Order 5 Rule 32(e) of the Civil Procedure Rules)"
                    className={`${editableLineClasses} w-full text-center text-[13px] font-bold`}
                  />
                </div>

                {/* Certificate Body - ContentEditable */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onPaste={handlePaste}
                  data-placeholder="I, [NAME], Registrar of the High Court of Kenya, hereby certify that the documents annexed hereto are as follows:&#10;&#10;1. &#10;2. &#10;3. &#10;&#10;And I certify that such service so proved, and the proof thereof, are such as are required by the law and practice of the High Court of Kenya regulating the service of legal process in Kenya and the proof thereof."
                  className="min-h-[300px] text-[13px] leading-[1.8] text-justify focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-300 empty:before:italic empty:before:pointer-events-none"
                />

                {/* Dated Line */}
                <div className="text-center mt-6">
                  <input
                    value={datedLine}
                    onChange={(e) => setDatedLine(e.target.value)}
                    placeholder="Dated, Signed and Sealed this 23rd July, 2026."
                    className={`${editableLineClasses} w-full text-center text-[13px]`}
                  />
                </div>

                {/* Signature Block */}
                <div className="text-center mt-12">
                  {signatoryLines.map((line, index) => (
                    <input
                      key={index}
                      value={line}
                      onChange={(e) => {
                        const newLines = [...signatoryLines];
                        newLines[index] = e.target.value;
                        setSignatoryLines(newLines);
                      }}
                      placeholder={index === 0 ? "REGISTRAR," : "HIGH COURT OF KENYA"}
                      className={`${editableLineClasses} block w-full text-center text-[13px] font-bold uppercase`}
                    />
                  ))}
                </div>

                {/* Drafted By Initials */}
                <div className="text-right mt-2">
                  <input
                    value={draftedByInitials}
                    onChange={(e) => setDraftedByInitials(e.target.value)}
                    placeholder="rhc/lnu"
                    className={`${editableLineClasses} text-right text-[11px] italic underline lowercase w-24 ml-auto`}
                  />
                </div>
              </>
            )}

            {/* Footer strip */}
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

// ─── Helper for file size formatting ────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${Math.round(mb)} MB`;
}