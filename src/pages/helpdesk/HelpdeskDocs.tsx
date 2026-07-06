// src/components/helpdesk/HelpdeskDocs.tsx

import React, { useState, useRef } from 'react';
import { 
  selectAllHelpdeskDocuments, 
  selectDocumentsFetchLoading,
  selectDocumentError,
  selectDocumentsUploading,
  selectDeletingDocumentId,
  fetchHelpdeskDocuments,
  uploadHelpdeskDocument,
  deleteHelpdeskDocument,
  clearDocumentError,
  type DocumentEntityType,
  type DocumentFormat,
} from '../../store/slices/helpdeskDocumentsSlice';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { X, Loader2, Upload, FileText, Download, Trash2, Eye } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HelpdeskDocsProps {
  entityType?: DocumentEntityType;
  entityId?: string;
}

interface UploadFormData {
  ref: string;
  subject: string;
  format: DocumentFormat;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: DocumentFormat[] = ['pdf', 'docx', 'xlsx'];

// ─── Component ──────────────────────────────────────────────────────────────

const HelpdeskDocs: React.FC<HelpdeskDocsProps> = ({ entityType, entityId }) => {
  const dispatch = useAppDispatch();
  const documents = useAppSelector(selectAllHelpdeskDocuments);
  const isLoading = useAppSelector(selectDocumentsFetchLoading);
  const isUploading = useAppSelector(selectDocumentsUploading);
  const deletingId = useAppSelector(selectDeletingDocumentId);
  const error = useAppSelector(selectDocumentError);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFormData, setUploadFormData] = useState<UploadFormData>({
    ref: '',
    subject: '',
    format: 'pdf',
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Effects ──────────────────────────────────────────────────────────────

  React.useEffect(() => {
    dispatch(fetchHelpdeskDocuments({ 
      entity_type: entityType, 
      entity_id: entityId 
    }));
  }, [dispatch, entityType, entityId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
    e.target.value = '';
  };

  const handleUploadFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setUploadFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    if (!uploadFormData.ref.trim()) {
      setUploadError('Reference is required.');
      return;
    }

    if (!uploadFormData.subject.trim()) {
      setUploadError('Subject is required.');
      return;
    }

    try {
      await dispatch(uploadHelpdeskDocument({
        blob: selectedFile,
        filename: selectedFile.name,
        ref: uploadFormData.ref.trim(),
        subject: uploadFormData.subject.trim(),
        entity_type: entityType || 'circuit',
        entity_id: entityId || undefined,
        format: uploadFormData.format,
      })).unwrap();

      // Reset form and close modal
      setSelectedFile(null);
      setUploadFormData({ ref: '', subject: '', format: 'pdf' });
      setUploadError(null);
      setShowUploadModal(false);
      
      // Refresh the list
      dispatch(fetchHelpdeskDocuments({ 
        entity_type: entityType, 
        entity_id: entityId 
      }));
    } catch (err) {
      setUploadError(typeof err === 'string' ? err : 'Upload failed. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await dispatch(deleteHelpdeskDocument(id)).unwrap();
      } catch {
        // Error handled in slice
      }
    }
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadFormData({ ref: '', subject: '', format: 'pdf' });
    setUploadError(null);
  };

  const handleClearError = () => {
    dispatch(clearDocumentError());
  };

  // ─── Render States ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
        <span className="ml-3 text-sm text-stone-600">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-700">Error: {error}</p>
          <button
            onClick={handleClearError}
            className="text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Documents</h2>
          <p className="text-xs text-stone-500">
            {documents.length} document{documents.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>

      {/* Document List */}
      {documents.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 p-12 text-center">
          <FileText size={48} className="mx-auto text-stone-300" />
          <p className="mt-2 text-sm text-stone-500">No documents uploaded yet.</p>
          <p className="text-xs text-stone-400">Upload your first document using the button above.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 transition hover:shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-stone-100 p-2">
                  <FileText size={20} className="text-stone-600" />
                </div>
                <div>
                  <h3 className="font-medium text-stone-800">{doc.subject}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span>Ref: {doc.ref}</span>
                    <span className="inline-block rounded bg-stone-100 px-2 py-0.5 font-mono uppercase">
                      {doc.format}
                    </span>
                    <span>
                      Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    {doc.file_size && (
                      <span>
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
                  title="View document"
                >
                  <Eye size={16} />
                </a>
                <a
                  href={doc.file_url}
                  download
                  className="rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
                  title="Download document"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete document"
                >
                  {deletingId === doc.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-[#1a3d1c]">Upload Document</h3>
              <button
                onClick={handleCloseModal}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* File Input */}
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                />
                {selectedFile && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Reference */}
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  Reference *
                </label>
                <input
                  type="text"
                  name="ref"
                  value={uploadFormData.ref}
                  onChange={handleUploadFormChange}
                  placeholder="e.g. RHC/CIRCUIT/001"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={uploadFormData.subject}
                  onChange={handleUploadFormChange}
                  placeholder="e.g. MOMBASA CIRCUIT"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                />
              </div>

              {/* Format */}
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  Format *
                </label>
                <select
                  name="format"
                  value={uploadFormData.format}
                  onChange={handleUploadFormChange}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]"
                >
                  {FORMAT_OPTIONS.map((format) => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {uploadError && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-xs text-red-700">{uploadError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpdeskDocs;