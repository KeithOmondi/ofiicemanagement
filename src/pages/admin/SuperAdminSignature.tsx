// src/pages/admin/SuperAdminSignature.tsx
import React, { useState, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  uploadSignature,
  deleteSignature,
  clearSignatureError,
} from "../../store/slices/signatureSlice";

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminSignature: React.FC = () => {
  const dispatch = useAppDispatch();
  const { signature_url, loading, error } = useAppSelector((state) => state.signature);

  const [dragging,      setDragging]      = useState(false);
  const [preview,       setPreview]       = useState<string | null>(null);
  const [successMsg,    setSuccessMsg]    = useState<string | null>(null);
  const [pendingFile,   setPendingFile]   = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File validation ────────────────────────────────────────────────────────

  const isValidFile = (file: File): string | null => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.type)) return "Only PNG, JPG, or WEBP images are allowed.";
    if (file.size > 5 * 1024 * 1024)  return "File must be under 5MB.";
    return null;
  };

  const handleFile = useCallback((file: File) => {
    dispatch(clearSignatureError());
    setSuccessMsg(null);

    const validationError = isValidFile(file);
    if (validationError) {
      // Surface as a local error via the slice
      dispatch({ type: "signature/upload/rejected", payload: validationError });
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setPendingFile(file);
  }, [dispatch]);

  // ── Drag & drop ────────────────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [handleFile]);

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!pendingFile) return;
    const result = await dispatch(uploadSignature(pendingFile));
    if (uploadSignature.fulfilled.match(result)) {
      setSuccessMsg("Signature uploaded successfully.");
      setPendingFile(null);
      // Keep preview — it now matches the saved signature
    }
  };

  const handleCancelPending = () => {
    setPendingFile(null);
    setPreview(null);
    dispatch(clearSignatureError());
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    const result = await dispatch(deleteSignature());
    if (deleteSignature.fulfilled.match(result)) {
      setSuccessMsg("Signature removed.");
      setPreview(null);
      setPendingFile(null);
    }
  };

  // ── Displayed image: pending preview takes priority, then saved URL ────────
  const displayImage = preview ?? signature_url;
  const hasSaved     = !!signature_url;
  const hasPending   = !!pendingFile;

  return (
    <div className="flex flex-col h-full">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-stone-200 bg-white flex-wrap">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight truncate">
            E-Signature Management
          </h1>
          <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5 hidden sm:block">
            Upload and manage the official signature used to sign documents
          </p>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-stone-50 px-3 sm:px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* ── Info banner ─────────────────────────────────────────────── */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <svg className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              This signature will be automatically embedded into all documents when the <strong>E-Sign</strong> action is triggered. Use a clean image with a transparent or white background for best results.
            </p>
          </div>

          {/* ── Current signature card ───────────────────────────────────── */}
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-stone-900">Current Signature</h2>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {hasSaved ? "Active — used when signing documents" : "No signature on file"}
                </p>
              </div>
              {hasSaved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  Active
                </span>
              )}
            </div>

            <div className="px-4 sm:px-6 py-6">
              {displayImage ? (
                <div className="space-y-4">
                  {/* Preview area */}
                  <div className="relative flex items-center justify-center rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 p-6 min-h-[160px]">
                    {hasPending && (
                      <span className="absolute top-2 right-2 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-bold text-amber-700 tracking-widest uppercase">
                        Preview — Not saved
                      </span>
                    )}
                    <img
                      src={displayImage}
                      alt="Signature preview"
                      className="max-h-[120px] max-w-full object-contain"
                    />
                  </div>

                  {/* URL row — only show for saved signature */}
                  {hasSaved && !hasPending && (
                    <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                      <svg className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="text-[10px] text-stone-500 truncate flex-1">{signature_url}</span>
                      <a
                        href={signature_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-[10px] font-semibold text-[#1E4620] hover:underline"
                      >
                        Open ↗
                      </a>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasPending ? (
                      <>
                        <button
                          onClick={handleUpload}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E4620] px-4 py-2 text-xs font-semibold text-white hover:bg-[#163a18] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          )}
                          {loading ? "Uploading…" : "Save Signature"}
                        </button>
                        <button
                          onClick={handleCancelPending}
                          disabled={loading}
                          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Replace */}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Replace
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={loading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove Signature
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Empty state — no signature yet ───────────────────── */
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center mb-3">
                    <svg className="h-7 w-7 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-stone-500">No signature uploaded yet</p>
                  <p className="text-xs text-stone-400 mt-1">Upload one below to enable document e-signing.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Upload zone ─────────────────────────────────────────────── */}
          {!hasPending && (
            <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100">
                <h2 className="text-sm font-bold text-stone-900">
                  {hasSaved ? "Upload Replacement" : "Upload Signature"}
                </h2>
                <p className="text-[11px] text-stone-400 mt-0.5">PNG, JPG, or WEBP — max 5MB</p>
              </div>

              <div className="px-4 sm:px-6 py-5">
                {/* Drop zone */}
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
                    dragging
                      ? "border-[#1E4620] bg-[#1E4620]/5"
                      : "border-stone-300 bg-stone-50 hover:border-[#1E4620] hover:bg-[#1E4620]/5"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-[#1E4620]/10" : "bg-stone-100"}`}>
                    <svg className={`h-5 w-5 transition-colors ${dragging ? "text-[#1E4620]" : "text-stone-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold transition-colors ${dragging ? "text-[#1E4620]" : "text-stone-600"}`}>
                      {dragging ? "Drop to select" : "Drag & drop or click to browse"}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">Use a white or transparent background for best results</p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={onFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* ── Error ───────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <svg className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-700">Upload failed</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
              <button onClick={() => dispatch(clearSignatureError())} className="text-red-400 hover:text-red-600 flex-shrink-0 text-sm leading-none">✕</button>
            </div>
          )}

          {/* ── Success ─────────────────────────────────────────────────── */}
          {successMsg && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xs font-semibold text-emerald-700 flex-1">{successMsg}</p>
              <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600 flex-shrink-0 text-sm leading-none">✕</button>
            </div>
          )}

          {/* ── Guidelines ──────────────────────────────────────────────── */}
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-stone-100">
              <h2 className="text-sm font-bold text-stone-900">Signature Guidelines</h2>
            </div>
            <ul className="px-4 sm:px-6 py-4 space-y-2">
              {[
                "Use a white or transparent background — coloured backgrounds will appear in the signed document.",
                "Recommended size: at least 400×150px for sharp rendering in PDFs.",
                "The signature is placed at the bottom-right of the last page of every signed document.",
                "Replacing the signature only affects future signings — previously signed documents are not changed.",
                "Only the super admin can upload or remove the signature.",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-stone-500">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#C29B38] flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Delete confirmation modal ────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="h-4.5 w-4.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Remove Signature?</h3>
                <p className="text-xs text-stone-400 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-5">
              Removing the signature means <strong>no documents can be e-signed</strong> until a new one is uploaded. Previously signed documents are not affected.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Removing…" : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSignature;