// src/components/registry/DirectDocumentUpload.tsx
import React, { useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  directUpload,
  bulkDirectUpload,
  selectIsUploading,
  clearUploadState,
} from '../../store/slices/registrySlice';
import { fetchStationCounts } from '../../store/slices/registrySlice';
import { toast } from 'react-hot-toast';
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import type { RegistryPriority } from '../../types/registry.types';
import { PRIORITY_LABELS } from '../../types/registry.types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

// ─── File Upload Zone ─────────────────────────────────────────────────────

const FileUploadZone: React.FC<{
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  files: UploadFile[];
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
}> = ({ onFilesSelected, onRemoveFile, files, maxFiles = 10, accept = '*/*', disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFilesSelected(droppedFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      {files.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition ${
            isDragging
              ? 'border-[#8B6914] bg-amber-50'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          <Upload size={40} className="mx-auto text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-700">Drop files here or click to browse</p>
          <p className="text-xs text-slate-400 mt-1">
            Supports all file types · Max {maxFiles} files
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <FileText size={20} className="text-[#8B6914] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {file.file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(file.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {file.status === 'uploading' && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-[#8B6914] transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{file.progress}%</span>
                </div>
              )}
              {file.status === 'success' && (
                <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              )}
              {file.status === 'error' && (
                <div className="flex items-center gap-1">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  {file.error && (
                    <span className="text-xs text-red-500 truncate max-w-[150px]">
                      {file.error}
                    </span>
                  )}
                </div>
              )}
              {!disabled && file.status === 'idle' && (
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="text-slate-400 hover:text-red-500 transition"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
          {files.length < maxFiles && !disabled && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 text-sm text-[#8B6914] hover:text-[#7A5E12] transition"
            >
              <Plus size={16} />
              Add more files
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────

interface DirectDocumentUploadProps {
  stationId?: string;
  stationName?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const DirectDocumentUpload: React.FC<DirectDocumentUploadProps> = ({
  stationId,
  stationName,
  onSuccess,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const isUploading = useAppSelector(selectIsUploading);

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [title, setTitle] = useState('');
  const [refNo, setRefNo] = useState('');
  const [priority, setPriority] = useState<RegistryPriority>('normal');
  const [note, setNote] = useState('');
  const [selectedStationId, setSelectedStationId] = useState(stationId || '');
  const [isBulkMode, setIsBulkMode] = useState(false);

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newFiles: UploadFile[] = selectedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'idle',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    if (!selectedStationId) {
      toast.error('Please select a station');
      return;
    }

    if (!isBulkMode && files.length > 1) {
      toast.error('Multiple files detected. Switch to Bulk Upload mode or upload one file at a time.');
      return;
    }

    try {
      if (isBulkMode || files.length > 1) {
        // Bulk upload
        const fileObjects = files.map((f) => f.file);
        const result = await dispatch(bulkDirectUpload({
          input: {
            station_id: selectedStationId,
            priority,
            note: note || undefined,
          },
          files: fileObjects,
        })).unwrap();

        if (result.success) {
          toast.success(result.message || 'Files uploaded successfully');
          dispatch(fetchStationCounts());
          onSuccess?.();
          resetForm();
        } else {
          toast.error(result.message || 'Upload failed');
        }
      } else {
        // Single upload
        const file = files[0].file;
        const result = await dispatch(directUpload({
          input: {
            title: title || file.name.split('.')[0] || 'Untitled',
            ref_no: refNo || undefined,
            station_id: selectedStationId,
            priority,
            note: note || undefined,
          },
          file,
        })).unwrap();

        if (result.success) {
          toast.success('Document uploaded successfully');
          dispatch(fetchStationCounts());
          onSuccess?.();
          resetForm();
        } else {
          toast.error(result.message || 'Upload failed');
        }
      }
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Upload failed');
    }
  };

  const resetForm = () => {
    setFiles([]);
    setTitle('');
    setRefNo('');
    setPriority('normal');
    setNote('');
    dispatch(clearUploadState());
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Upload Documents
            {stationName && <span className="ml-2 text-sm font-normal text-slate-500">to {stationName}</span>}
          </h2>
          <p className="text-sm text-slate-500">
            {isBulkMode ? 'Upload multiple documents at once' : 'Upload a single document'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkMode(!isBulkMode)}
            className={`text-sm font-medium transition ${
              isBulkMode ? 'text-[#8B6914]' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isBulkMode ? 'Switch to Single Upload' : 'Switch to Bulk Upload'}
          </button>
          {onClose && (
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Station Selector (if not provided) */}
        {!stationId && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Select Station *
            </label>
            <StationSelector
              value={selectedStationId}
              onChange={setSelectedStationId}
            />
          </div>
        )}

        {/* Document Details (only for single upload) */}
        {!isBulkMode && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Document Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reference Number
              </label>
              <input
                type="text"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="e.g. RHC/MSB/22"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              />
            </div>
          </>
        )}

        {/* Priority */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as RegistryPriority)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
          >
            {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Note */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional note about this document..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914] resize-none"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {isBulkMode ? 'Select Files' : 'Select File'} *
          </label>
          <FileUploadZone
            files={files}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleRemoveFile}
            maxFiles={isBulkMode ? 20 : 1}
            disabled={isUploading}
          />
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={isUploading || files.length === 0 || !selectedStationId}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7A5E12] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={18} />
              {isBulkMode ? `Upload ${files.length} File(s)` : 'Upload Document'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Station Selector ─────────────────────────────────────────────────────

const StationSelector: React.FC<{
  value: string;
  onChange: (id: string) => void;
}> = ({ value, onChange }) => {
  const stationCounts = useAppSelector((state) => state.registry.stationCounts);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (stationCounts.length === 0) {
      dispatch(fetchStationCounts());
    }
  }, [dispatch, stationCounts.length]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
      required
    >
      <option value="">Select a station...</option>
      {stationCounts.map((station) => (
        <option key={station.id} value={station.id}>
          {station.name} {station.ref_no ? `(${station.ref_no})` : ''}
        </option>
      ))}
    </select>
  );
};