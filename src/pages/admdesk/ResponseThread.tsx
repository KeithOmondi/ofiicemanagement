// src/components/documents/ResponseThread.tsx
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { respondToDocument } from '../../store/slices/documentSlice';
import { Paperclip, Send, Loader2, FileText, User as UserIcon } from 'lucide-react';

interface ResponseThreadProps {
  documentId: string;
}

const formatDateTime = (date: string | Date) =>
  new Date(date).toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Numbered reply thread for a document (response #1, #2, #3...). This is the
 * piece that keeps a document's back-and-forth in one place: instead of
 * typing a reply into a brand new upload, whoever the document is currently
 * assigned to replies here — optionally with a file — and it's appended to
 * THIS document's trail for the reviewer to see in context.
 */
export const ResponseThread: React.FC<ResponseThreadProps> = ({ documentId }) => {
  const dispatch = useAppDispatch();
  const currentDocument = useAppSelector((state) => state.documents.currentDocument);
  const respondingId = useAppSelector((state) => state.documents.actionInProgress.responding);
  const currentUser = useAppSelector((state) => state.auth.user);

  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const responses = currentDocument?.responses ?? [];
  const isSubmitting = respondingId === documentId;

  // Only whoever the document is currently assigned to can reply — matches
  // the authorization check enforced server-side in addResponse.
  const canRespond = !!currentUser && currentDocument?.assigned_to === currentUser.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || isSubmitting) return;

    const result = await dispatch(
      respondToDocument({ id: documentId, input: { note: note.trim() }, file: file ?? undefined })
    );
    if (respondToDocument.fulfilled.match(result)) {
      setNote('');
      setFile(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-stone-800">Response Thread</h4>
        {responses.length > 0 && (
          <span className="text-xs text-stone-400">
            ({responses.length} {responses.length === 1 ? 'reply' : 'replies'})
          </span>
        )}
      </div>

      {/* ── Numbered thread ─────────────────────────────────────────────── */}
      {responses.length === 0 ? (
        <p className="text-sm text-stone-400 italic">No responses yet on this document.</p>
      ) : (
        <ol className="space-y-3">
          {responses.map((r) => (
            <li
              key={r.id}
              className="flex gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c9a84c] text-xs font-bold text-[#1a3d1c]">
                {r.response_number}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="flex items-center gap-1 text-xs font-semibold text-stone-700">
                    <UserIcon size={12} className="text-stone-400" />
                    {r.responded_by_name}
                  </span>
                  <span className="text-[11px] text-stone-400">{formatDateTime(r.created_at)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">{r.note}</p>
                {r.file_url && (
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
                  >
                    <FileText size={12} />
                    {r.original_name || 'View attachment'}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* ── Reply form ───────────────────────────────────────────────────── */}
      {canRespond ? (
        <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 p-3">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Add Response {responses.length > 0 ? `#${responses.length + 1}` : '#1'}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Type your response…"
            className="w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-800">
              <Paperclip size={14} />
              {file ? file.name : 'Attach a file (optional)'}
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="submit"
              disabled={!note.trim() || isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isSubmitting ? 'Sending…' : 'Send Response'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-stone-400">
          This document is not currently assigned to you, so you can't add a response.
        </p>
      )}
    </div>
  );
};

export default ResponseThread;