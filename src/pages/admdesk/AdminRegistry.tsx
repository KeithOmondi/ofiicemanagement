// src/pages/admin/AdminRegistry.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  routeFile,
  fetchStationCounts,
  fetchRegistryEntries,
  selectStationCounts,
  selectStationCountsLoading,
  selectRegistryMutating,
  selectRegistryError,
  clearError as clearRegistryError,
  directUpload,
  bulkDirectUpload,
  selectIsUploading,
 
} from '../../store/slices/registrySlice';
import { fetchDocuments, clearError as clearDocumentError } from '../../store/slices/documentSlice';
import { 
  deleteStation,
  updateStation,
  createStation,
} from '../../store/slices/stationsSlice';
import type { RootState } from '../../store/store';
import type { 
  RegistryPriority, 
  RegistryEntry, 
  RegistryStatus,
  DirectDocumentUploadInput,
  BulkDirectDocumentUploadInput,
  DirectDocumentUploadResponse,
  StationWithFileCount,
} from '../../types/registry.types';
import type { StationType, CreateStationInput, UpdateStationInput } from '../../store/slices/stationsSlice';
import type { Document as DocType } from '../../types/documents.types';

// ─── Folder Slice Imports ──────────────────────────────────────────────────
import {
  fetchRHCFolders,
  fetchRHCFolderById,
  fetchRHCFolderChildren,
  fetchRHCFolderDocuments,
  createRHCFolder,
  updateRHCFolder,
  deleteRHCFolder,
  searchRHCFolders,
  moveRHCDocumentToFolder,
  addDocumentToFolder,
  selectAllRHCFolders,
  selectRHCFoldersLoading,
  selectRHCFoldersError,
  selectRHCFolderCategories,
  selectRHCFolderSearchResults,
  selectSelectedRHCFolder,
  selectRHCFolderHierarchy,
  selectRHCFolderDocuments,
  clearFolderError,
  clearSearchResults,
  clearSelectedFolder,
  clearHierarchy,
  clearFolderDocuments,
  selectRootFolders,
  type RHCFolder,
  type FolderCategory,
  type FolderStatus,
  type FolderDocument,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  fetchRHCFolderCategories,
} from '../../store/slices/rhcFoldersSlice';

// ─── Icons ──────────────────────────────────────────────────────────────────
import { 
  Download, 
  FileText, 
  X, 
  Loader2, 
  Edit, 
  Plus, 
  Folder, 
  FolderOpen, 
  Search, 
  ArrowLeft, 
  Home, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  Upload, 
  CheckCircle, 
  AlertCircle,
} from 'lucide-react';

// ─── Selectors ────────────────────────────────────────────────────────────────
const selectAllDocuments = (state: RootState): DocType[] => state.documents.documents;
const selectDocLoading = (state: RootState): boolean => state.documents.loading;
const selectDocumentError = (state: RootState): string | null => state.documents.error;

// ─── Display maps ─────────────────────────────────────────────────────────────
const STATION_TYPE_LABELS: Record<StationType, string> = {
  high_court: 'High Court',
  magistrate_court: 'Magistrate Court',
  environment_court: 'Environment & Land Court',
  kadhis_court: "Kadhi's Court",
  sub_registry: 'Sub-Registry',
};

const STATION_TYPE_ICONS: Record<StationType, string> = {
  high_court: '🏛',
  magistrate_court: '🏛',
  environment_court: '🏛',
  kadhis_court: '🏛',
  sub_registry: '📁',
};

const STATION_TYPE_OPTIONS: { value: StationType; label: string }[] = [
  { value: 'high_court', label: 'High Court' },
  { value: 'magistrate_court', label: 'Magistrate Court' },
  { value: 'environment_court', label: 'Environment & Land Court' },
  { value: 'kadhis_court', label: "Kadhi's Court" },
  { value: 'sub_registry', label: 'Sub-Registry' },
];

// ─── Registry Status Constants ──────────────────────────────────────────────
const REGISTRY_STATUS_LABEL: Record<RegistryStatus, string> = {
  active: 'Active',
  returned: 'Returned',
};

const REGISTRY_STATUS_BADGE: Record<RegistryStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  returned: 'bg-slate-100 text-slate-700',
};

const PRIORITY_OPTIONS: { value: RegistryPriority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'for_information_only', label: 'For Information Only' },
];

// ─── Registry View Types ──────────────────────────────────────────────────
type RegistryView = 'stations' | 'folder_detail';

// ─── File Upload Utilities ──────────────────────────────────────────────────
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// ─── Document Card Component ──────────────────────────────────────────────

const DocumentCard: React.FC<{ 
  entry: RegistryEntry; 
  onView: (entry: RegistryEntry) => void;
}> = ({ entry, onView }) => {
  return (
    <div 
      onClick={() => onView(entry)}
      className="relative flex flex-col items-center py-6 px-4 text-center bg-white transition cursor-pointer hover:shadow-md border border-slate-200 rounded-xl"
    >
      <span className="text-3xl mb-2">📄</span>
      <span className="text-xs font-mono font-medium text-[#8B6914]">{entry.document_ref_no || 'No ref'}</span>
      <span className="text-sm font-medium text-slate-800 truncate w-full">{entry.document_title}</span>
      <span className={`text-[11px] text-slate-400 mb-3 inline-flex items-center rounded-full px-2 py-0.5 ${REGISTRY_STATUS_BADGE[entry.status]}`}>
        {REGISTRY_STATUS_LABEL[entry.status]}
      </span>
      <span className="text-xs text-slate-400">{new Date(entry.routed_at).toLocaleDateString()}</span>
      {entry.priority === 'urgent' && (
        <span className="absolute top-2 left-2 text-xs text-red-500 font-medium">🔴</span>
      )}
      {entry.priority === 'confidential' && (
        <span className="absolute top-2 left-2 text-xs text-amber-500 font-medium">🔒</span>
      )}
      {entry.source === 'direct' && (
        <span className="absolute bottom-2 right-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
          Direct
        </span>
      )}
    </div>
  );
};

// ─── Folder Card Component ──────────────────────────────────────────────────

const FolderCard: React.FC<{
  folder: RHCFolder;
  onEdit: (folder: RHCFolder) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}> = ({ folder, onEdit, onDelete, onView }) => {
  const categoryColor = CATEGORY_COLORS[folder.category] || 'bg-slate-50 text-slate-700';

  return (
    <div
      onClick={() => onView(folder.id)}
      className="relative flex flex-col items-center py-6 px-4 text-center bg-white transition cursor-pointer hover:shadow-md hover:border-slate-300 border border-slate-200 rounded-xl"
    >
      <span className="text-3xl mb-2">
        {folder.status === 'active' ? '📁' : '📂'}
      </span>
      <span className="text-xs font-medium text-[#8B6914]">{folder.ref_no}</span>
      <span className="text-sm font-medium text-slate-800">{folder.name}</span>
      <span className={`text-[11px] text-slate-400 mb-3 inline-flex items-center rounded-full px-2 py-0.5 ${categoryColor}`}>
        {CATEGORY_LABELS[folder.category]}
      </span>
      <span className="text-xl font-medium text-slate-800">{folder.document_count || 0}</span>
      <span className="text-[11px] text-slate-400">documents on record</span>
      <span className="text-[10px] text-amber-600 mt-2">Click to view files</span>

      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(folder); }}
          className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
          title="Edit"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Folder Document Card Component ──────────────────────────────────────

// ─── Folder Document Card Component ──────────────────────────────────────

const FolderDocumentCard: React.FC<{ 
  document: FolderDocument; 
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}> = ({ document, isSelected, onSelect }) => {
  return (
    <div className="relative flex flex-col items-center py-6 px-4 text-center bg-white transition hover:shadow-md border border-slate-200 rounded-xl">
      {onSelect && (
        <div className="absolute top-2 left-2">
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={() => onSelect(document.id)}
            className="h-4 w-4 rounded border-slate-300 text-[#8B6914] focus:ring-[#8B6914]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <span className="text-3xl mb-2">📄</span>
      <span className="text-xs font-mono font-medium text-[#8B6914]">{document.ref || 'No ref'}</span>
      <span className="text-sm font-medium text-slate-800 truncate w-full max-w-[150px]">
        {document.ref || 'Document'}
      </span>
      <span className="text-[11px] text-slate-400 mb-3 uppercase">{document.format || 'Document'}</span>
      <span className="text-xs text-slate-400">{new Date(document.created_at).toLocaleDateString()}</span>

      <div className="absolute top-2 right-2 flex gap-1">
        {document.file_url && (
          <>
            <a
              href={document.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
              title="View"
            >
              <ExternalLink size={14} />
            </a>
            <a
              href={document.file_url}
              download
              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition"
              title="Download"
            >
              <Download size={14} />
            </a>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Folder Detail View ──────────────────────────────────────────────────

const FolderDetailView: React.FC<{
  folder: RHCFolder;
  children: RHCFolder[];
  documents: FolderDocument[];
  loading: boolean;
  onBack: () => void;
  onEdit: (folder: RHCFolder) => void;
  onDelete: (id: string) => void;
  onViewFolder: (id: string) => void;
  onRefresh: () => void;
  onMoveDocuments: () => void;
  selectedDocuments: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}> = ({ 
  folder, 
  children, 
  documents, 
  loading, 
  onBack, 
  onEdit, 
  onDelete, 
  onViewFolder,
  onRefresh,
  onMoveDocuments,
  selectedDocuments,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
}) => {
  const categoryColor = CATEGORY_COLORS[folder.category] || 'bg-slate-50 text-slate-700';
  const statusColor = STATUS_COLORS[folder.status] || 'bg-slate-50 text-slate-700';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <span className="text-slate-300">/</span>
        <Home size={16} className="text-slate-400" />
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-800">{folder.name}</span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen size={24} className="text-[#8B6914]" />
              <h2 className="text-xl font-bold text-slate-800">{folder.name}</h2>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm text-slate-400">{folder.ref_no}</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}>
                {CATEGORY_LABELS[folder.category]}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                {STATUS_LABELS[folder.status]}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <FileText size={14} />
                {folder.document_count || 0} documents
              </span>
            </div>
            {folder.description && (
              <p className="mt-2 text-sm text-slate-600">{folder.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(folder)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Edit size={16} className="inline mr-1" />
              Edit
            </button>
            <button
              onClick={() => onDelete(folder.id)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition"
            >
              <Trash2 size={16} className="inline mr-1" />
              Delete
            </button>
            <button
              onClick={onRefresh}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw size={16} className="inline mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-[#8B6914]" />
          <span className="ml-3 text-sm text-slate-600">Loading contents...</span>
        </div>
      ) : (
        <>
          {children.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Sub-folders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {children.map(child => (
                  <div
                    key={child.id}
                    onClick={() => onViewFolder(child.id)}
                    className="relative flex flex-col items-center py-6 px-4 text-center bg-white transition cursor-pointer hover:shadow-md"
                  >
                    <span className="text-3xl mb-2">📁</span>
                    <span className="text-xs font-medium text-[#8B6914]">{child.ref_no}</span>
                    <span className="text-sm font-medium text-slate-800">{child.name}</span>
                    <span className="text-[11px] text-slate-400">{child.document_count || 0} documents</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <FileText size={16} />
                Documents ({documents.length})
              </h3>
              <div className="flex items-center gap-2">
                {documents.length > 0 && (
                  <>
                    <button
                      onClick={onSelectAll}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      {selectedDocuments.size === documents.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selectedDocuments.size > 0 && (
                      <>
                        <span className="text-xs text-slate-400">
                          {selectedDocuments.size} selected
                        </span>
                        <button
                          onClick={onMoveDocuments}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#8B6914] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7A5E12] transition"
                        >
                          <FolderOpen size={14} />
                          Move to Folder
                        </button>
                        <button
                          onClick={onClearSelection}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            {documents.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                <p>No documents in this folder</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {documents.map(doc => (
                  <FolderDocumentCard 
                    key={doc.id} 
                    document={doc}
                    isSelected={selectedDocuments.has(doc.id)}
                    onSelect={onToggleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Move Documents Modal ──────────────────────────────────────────────────

const MoveDocumentsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetFolderId: string) => Promise<void>;
  folders: RHCFolder[];
  currentFolderId: string | null;
  selectedCount: number;
  isMoving: boolean;
}> = ({ isOpen, onClose, onMove, folders, currentFolderId, selectedCount, isMoving }) => {
  const [targetFolderId, setTargetFolderId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFolderId) {
      toast.error('Please select a target folder');
      return;
    }
    await onMove(targetFolderId);
    setTargetFolderId('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Move Documents
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({selectedCount} selected)
            </span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Select Target Folder *
            </label>
            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              required
            >
              <option value="">Select a folder...</option>
              {folders
                .filter(f => f.id !== currentFolderId)
                .map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.ref_no} - {folder.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="rounded-md bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              {selectedCount} document(s) will be moved to the selected folder.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!targetFolderId || isMoving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A5E12] disabled:opacity-50"
            >
              {isMoving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <span>Move Documents</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Station Upload Modal Component ────────────────────────────────────────

// ─── Station Upload Modal Component ────────────────────────────────────────

interface StationUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (input: DirectDocumentUploadInput, file: File) => Promise<void>;
  stationName: string;
  stationId: string;
  stations: StationWithFileCount[];  // Add this
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadError: string | null;
  uploadResult: DirectDocumentUploadResponse | null;
  onReset: () => void;
}

const StationUploadModal: React.FC<StationUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  //stationName,
  stationId,
  stations,  // Add this
  isUploading,
  uploadProgress,
  uploadStatus,
  uploadError,
  uploadResult,
  onReset,
}) => {
  const [title, setTitle] = useState('');
  const [refNo, setRefNo] = useState('');
  const [selectedStationId, setSelectedStationId] = useState(stationId || '');
  const [priority, setPriority] = useState<RegistryPriority>('normal');
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle('');
    setRefNo('');
    setSelectedStationId(stationId || '');
    setPriority('normal');
    setNote('');
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onReset();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 55 * 1024 * 1024) {
        setFileError('File size exceeds 55MB limit');
        setSelectedFile(null);
        return;
      }
      setFileError(null);
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFileError('Please select a file to upload');
      return;
    }
    if (!title.trim()) {
      toast.error('Document title is required');
      return;
    }
    if (!selectedStationId) {
      toast.error('Please select a destination station');
      return;
    }

    await onUpload(
      {
        title: title.trim(),
        ref_no: refNo.trim() || null,
        station_id: selectedStationId,
        priority,
        note: note.trim() || undefined,
      },
      selectedFile
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  if (uploadStatus === 'success' && uploadResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Upload Successful!</h3>
            <p className="mt-1 text-sm text-slate-500">
              {uploadResult.data?.entry.document_title} has been uploaded
            </p>
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-left">
              <p className="text-xs text-slate-500">File: {uploadResult.data?.file.file_name}</p>
              <p className="text-xs text-slate-500">Size: {formatFileSize(uploadResult.data?.file.file_size || 0)}</p>
            </div>
            <button
              onClick={handleClose}
              className="mt-4 w-full rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7A5E12]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (uploadStatus === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Upload Failed</h3>
            <p className="mt-1 text-sm text-red-600">{uploadError || 'An error occurred during upload'}</p>
            <button
              onClick={handleClose}
              className="mt-4 w-full rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7A5E12]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Upload size={20} className="text-[#8B6914]" />
            Upload Document
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Document Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Annual Report 2025"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              required
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Destination Station *
            </label>
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              required
              disabled={isUploading}
            >
              <option value="">Select a station...</option>
              {stations
                .filter(s => s.is_active)
                .map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.ref_no ? `${station.ref_no} — ` : ''}{station.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Reference Number (Optional)
            </label>
            <input
              type="text"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              placeholder="e.g., RHC/MSB/001"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as RegistryPriority)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              disabled={isUploading}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              File *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#8B6914]/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-[#8B6914] hover:file:bg-[#8B6914]/20 focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              disabled={isUploading}
            />
            {fileError && (
              <p className="mt-1 text-xs text-red-600">{fileError}</p>
            )}
            {selectedFile && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-slate-50 p-2">
                <span className="text-sm text-slate-700">{selectedFile.name}</span>
                <span className="text-xs text-slate-400">({formatFileSize(selectedFile.size)})</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add any additional notes..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914] resize-none"
              disabled={isUploading}
            />
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Uploading...</span>
                <span className="text-slate-400">{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#8B6914] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !title || !selectedStationId}
              className="inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A5E12] disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ─── Bulk Upload Modal Component ────────────────────────────────────────────

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (input: BulkDirectDocumentUploadInput, files: File[]) => Promise<void>;
  stations: StationWithFileCount[];
  isUploading: boolean;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  stations,
  isUploading,
}) => {
  const [stationId, setStationId] = useState('');
  const [priority, setPriority] = useState<RegistryPriority>('normal');
  const [note, setNote] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setStationId('');
    setPriority('normal');
    setNote('');
    setSelectedFiles([]);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const oversized = fileArray.some(f => f.size > 55 * 1024 * 1024);
      if (oversized) {
        setFileError('One or more files exceed the 55MB limit');
        return;
      }
      if (fileArray.length > 50) {
        setFileError('Maximum 50 files allowed per batch');
        return;
      }
      setFileError(null);
      setSelectedFiles(fileArray);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setFileError('Please select at least one file to upload');
      return;
    }
    if (!stationId) {
      toast.error('Please select a destination station');
      return;
    }

    await onUpload(
      {
        station_id: stationId,
        priority,
        note: note.trim() || undefined,
      },
      selectedFiles
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Upload size={20} className="text-[#8B6914]" />
            Bulk Upload
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Destination Station *
            </label>
            <select
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              required
              disabled={isUploading}
            >
              <option value="">Select a station...</option>
              {stations
                .filter(s => s.is_active)
                .map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.ref_no ? `${station.ref_no} — ` : ''}{station.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as RegistryPriority)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              disabled={isUploading}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Files * (Max 50, 55MB each)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#8B6914]/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-[#8B6914] hover:file:bg-[#8B6914]/20 focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
              disabled={isUploading}
            />
            {fileError && (
              <p className="mt-1 text-xs text-red-600">{fileError}</p>
            )}
            {selectedFiles.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-slate-200 p-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 py-1 text-sm">
                    <span className="text-slate-700">{file.name}</span>
                    <span className="text-xs text-slate-400">({formatFileSize(file.size)})</span>
                  </div>
                ))}
                <div className="mt-1 text-xs text-slate-400">
                  Total: {selectedFiles.length} file(s)
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add any additional notes..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914] resize-none"
              disabled={isUploading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || selectedFiles.length === 0 || !stationId}
              className="inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A5E12] disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const SuperAdminRegistry = () => {
  const dispatch = useAppDispatch();

  // ── Registry State ─────────────────────────────────────────────────────────
  const stations = useAppSelector(selectStationCounts);
  const countsLoading = useAppSelector(selectStationCountsLoading);
  const mutating = useAppSelector(selectRegistryMutating);
  const registryError = useAppSelector(selectRegistryError);

  // ── Documents ────────────────────────────────────────────────────────────────
  const documents = useAppSelector(selectAllDocuments);
  const docsLoading = useAppSelector(selectDocLoading);
  const docError = useAppSelector(selectDocumentError);

  // ── Folder State ────────────────────────────────────────────────────────────
  const folders = useAppSelector(selectAllRHCFolders);
  const rootFolders = useAppSelector(selectRootFolders);
  const categories = useAppSelector(selectRHCFolderCategories);
  const searchResults = useAppSelector(selectRHCFolderSearchResults);
  const selectedFolder = useAppSelector(selectSelectedRHCFolder);
  const hierarchy = useAppSelector(selectRHCFolderHierarchy);
  const folderDocuments = useAppSelector(selectRHCFolderDocuments);
  const foldersLoading = useAppSelector(selectRHCFoldersLoading);
  const foldersError = useAppSelector(selectRHCFoldersError);

  // ── Upload State ────────────────────────────────────────────────────────────
  const isUploading = useAppSelector(selectIsUploading);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [selectedDoc, setSelectedDoc] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [priority, setPriority] = useState<RegistryPriority>('normal');
  const [note, setNote] = useState('');
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStationForModal, setSelectedStationForModal] = useState<string | null>(null);
  const [stationEntries, setStationEntries] = useState<RegistryEntry[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Direct Upload Modal State ──────────────────────────────────────────────
  const [isDirectUploadModalOpen, setIsDirectUploadModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<DirectDocumentUploadResponse | null>(null);

  // ── Station Upload Modal State ─────────────────────────────────────────────
  const [isStationUploadModalOpen, setIsStationUploadModalOpen] = useState(false);
  const [selectedStationForUpload, setSelectedStationForUpload] = useState<StationWithFileCount | null>(null);

  // ── Delete confirmation state ──────────────────────────────────────────────
  const [stationToDelete, setStationToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ── Station Edit/Create State ─────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<typeof stations[0] | null>(null);
  const [stationFormData, setStationFormData] = useState<CreateStationInput & { ref_no?: string }>({
    ref_no: '',
    name: '',
    type: 'high_court',
    location: '',
  });
  const [submittingStation, setSubmittingStation] = useState(false);

  // ── Document view state ────────────────────────────────────────────────────
  const [selectedDocument, setSelectedDocument] = useState<RegistryEntry | null>(null);
  const [isDocViewModalOpen, setIsDocViewModalOpen] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  // ── Folder View State ──────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<RegistryView>('stations');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [selectedFolderCategory, setSelectedFolderCategory] = useState<FolderCategory | 'all'>('all');
  
  // ── Folder Document Selection ──────────────────────────────────────────────
  const [selectedFolderDocs, setSelectedFolderDocs] = useState<Set<string>>(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // ── Folder CRUD State ──────────────────────────────────────────────────────
  const [showFolderCreateModal, setShowFolderCreateModal] = useState(false);
  const [showFolderEditModal, setShowFolderEditModal] = useState(false);
  const [selectedFolderForEdit, setSelectedFolderForEdit] = useState<RHCFolder | null>(null);
  const [folderFormData, setFolderFormData] = useState({
    ref_no: '',
    name: '',
    category: 'court' as FolderCategory,
    description: '',
    status: 'active' as FolderStatus,
    parent_folder_id: '',
  });

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchStationCounts());
    dispatch(fetchDocuments({ page: 1, limit: 100, sort_by: 'created_at', sort_order: 'DESC' }));
    dispatch(fetchRHCFolders({ include_sub_folders: true }));
    dispatch(fetchRHCFolderCategories());
  }, [dispatch]);

  const refreshCounts = useCallback(() => {
    dispatch(fetchStationCounts());
  }, [dispatch]);

  // ── Error toasts ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (registryError) {
      toast.error(registryError);
      dispatch(clearRegistryError());
    }
  }, [registryError, dispatch]);

  useEffect(() => {
    if (docError) {
      toast.error(docError);
      dispatch(clearDocumentError());
    }
  }, [docError, dispatch]);

  useEffect(() => {
    if (foldersError) {
      toast.error(foldersError);
      dispatch(clearFolderError());
    }
  }, [foldersError, dispatch]);

  // ── Direct Upload Handler ──────────────────────────────────────────────────

  const handleDirectUpload = async (input: DirectDocumentUploadInput, file: File) => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError(null);
    setUploadResult(null);

    try {
      const result = await dispatch(directUpload({ input, file })).unwrap();
      setUploadStatus('success');
      setUploadResult(result);
      toast.success(`Document uploaded successfully!`);
      refreshCounts();
      dispatch(fetchRHCFolders({ include_sub_folders: true }));
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to upload document';
      setUploadStatus('error');
      setUploadError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // ── Station Upload Handler ─────────────────────────────────────────────────

  const handleStationUpload = async (input: DirectDocumentUploadInput, file: File) => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError(null);
    setUploadResult(null);

    try {
      const result = await dispatch(directUpload({ input, file })).unwrap();
      setUploadStatus('success');
      setUploadResult(result);
      toast.success(`Document uploaded to ${selectedStationForUpload?.name || 'station'} successfully!`);
      refreshCounts();
      
      // Refresh the station entries if the modal is open
      if (selectedStationForModal) {
        const result = await dispatch(fetchRegistryEntries({
          station_id: selectedStationForModal,
          limit: 100,
          sort_by: 'routed_at',
          sort_order: 'DESC'
        })).unwrap();
        const uniqueEntries = Array.from(
          new Map(result.data.map((entry: RegistryEntry) => [entry.document_id, entry])).values()
        );
        setStationEntries(uniqueEntries);
      }
      
      dispatch(fetchRHCFolders({ include_sub_folders: true }));
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to upload document';
      setUploadStatus('error');
      setUploadError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // ── Bulk Upload Handler ────────────────────────────────────────────────────

// ── Bulk Upload Handler ────────────────────────────────────────────────────

const handleBulkUpload = async (input: BulkDirectDocumentUploadInput, files: File[]) => {
  try {
    const result = await dispatch(bulkDirectUpload({ input, files })).unwrap();
    // Use result.data?.totalSuccess or result.data?.results?.length
    const successCount = result.data?.totalSuccess || result.data?.results?.length || 0;
    toast.success(`${successCount} documents uploaded successfully!`);
    refreshCounts();
    dispatch(fetchRHCFolders({ include_sub_folders: true }));
    setIsBulkUploadModalOpen(false);
  } catch (error) {
    const errorMessage = typeof error === 'string' ? error : 'Failed to upload documents';
    toast.error(errorMessage);
  }
};

  const resetUploadState = () => {
    setUploadStatus('idle');
    setUploadError(null);
    setUploadResult(null);
    setUploadProgress(0);
  };

  // ── Submit: route the document to the chosen station/folder ────────────────
  const handleRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !routeTo) {
      toast.error('Choose both a document and a destination before routing.');
      return;
    }

    try {
      const isStation = stations.some(s => s.id === routeTo);
      const isFolder = folders.some(f => f.id === routeTo);

      if (isStation) {
        await dispatch(
          routeFile({
            document_id: selectedDoc,
            station_id: routeTo,
            priority,
            note: note.trim() || undefined,
          })
        ).unwrap();
        toast.success('Document routed to station successfully');
        refreshCounts();
      } else if (isFolder) {
        await dispatch(
          addDocumentToFolder({
            folderId: routeTo,
            documentId: selectedDoc,
          })
        ).unwrap();
        toast.success('Document added to folder successfully');
        dispatch(fetchRHCFolders({ include_sub_folders: true }));
        if (currentFolderId) {
          await dispatch(fetchRHCFolderDocuments({ id: currentFolderId }));
        }
      } else {
        toast.error('Invalid destination selected');
        return;
      }

      setSelectedDoc('');
      setRouteTo('');
      setPriority('normal');
      setNote('');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to route document';
      toast.error(errorMessage);
      console.error('Routing error:', error);
    }
  };

  // ── Station click: open modal with entries ──────────────────────────────────
  const handleStationClick = async (stationId: string) => {
    setActiveStation(stationId);
    setRouteTo(stationId);

    setSelectedStationForModal(stationId);
    setIsModalOpen(true);
    setModalLoading(true);

    try {
      const result = await dispatch(fetchRegistryEntries({
        station_id: stationId,
        limit: 100,
        sort_by: 'routed_at',
        sort_order: 'DESC'
      })).unwrap();

      const uniqueEntries = Array.from(
        new Map(result.data.map((entry: RegistryEntry) => [entry.document_id, entry])).values()
      );
      setStationEntries(uniqueEntries);
    } catch {
      toast.error('Failed to load station entries');
      setStationEntries([]);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Close modal ──────────────────────────────────────────────────────────────
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStationForModal(null);
    setStationEntries([]);
    setModalLoading(false);
  };

  // ── Station Edit/Create Handlers ────────────────────────────────────────────

  const resetStationForm = () => {
    setStationFormData({
      ref_no: '',
      name: '',
      type: 'high_court',
      location: '',
    });
    setEditingStation(null);
  };

  const handleEditStation = (station: typeof stations[0]) => {
    setEditingStation(station);
    setStationFormData({
      ref_no: station.ref_no || '',
      name: station.name,
      type: station.type,
      location: station.location || '',
    });
    setIsEditModalOpen(true);
  };

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationFormData.name) {
      toast.error('Station name is required');
      return;
    }

    setSubmittingStation(true);
    try {
      await dispatch(createStation(stationFormData)).unwrap();
      toast.success('Station created successfully');
      setIsCreateModalOpen(false);
      resetStationForm();
      refreshCounts();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to create station');
    } finally {
      setSubmittingStation(false);
    }
  };

  const handleUpdateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation || !stationFormData.name) {
      toast.error('Station name is required');
      return;
    }

    setSubmittingStation(true);
    try {
      const updateData: UpdateStationInput = {
        name: stationFormData.name,
        type: stationFormData.type,
        location: stationFormData.location || undefined,
      };
      if (stationFormData.ref_no && stationFormData.ref_no !== editingStation.ref_no) {
        updateData.ref_no = stationFormData.ref_no;
      }
      await dispatch(updateStation({ id: editingStation.id, data: updateData })).unwrap();
      toast.success('Station updated successfully');
      setIsEditModalOpen(false);
      resetStationForm();
      refreshCounts();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to update station');
    } finally {
      setSubmittingStation(false);
    }
  };

  // ── Delete station handlers ──────────────────────────────────────────────────
  const handleDeleteClick = (e: React.MouseEvent, stationId: string) => {
    e.stopPropagation();
    const station = stations.find(s => s.id === stationId);
    if (station && station.file_count > 0) {
      toast.error(`Cannot delete station "${station.name}" because it has ${station.file_count} file(s) on record.`);
      return;
    }
    setStationToDelete(stationId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!stationToDelete) return;

    try {
      await dispatch(deleteStation(stationToDelete)).unwrap();
      toast.success('Station deleted successfully');
      refreshCounts();
    } catch {
      toast.error('Failed to delete station');
    } finally {
      setIsDeleteModalOpen(false);
      setStationToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setStationToDelete(null);
  };

  // ── Document view handlers ─────────────────────────────────────────────────
// ── Document view handlers ─────────────────────────────────────────────────
const handleViewDocument = async (entry: RegistryEntry) => {
  setSelectedDocument(entry);
  setIsDocViewModalOpen(true);
  setDocumentLoading(true);
  setDocumentUrl(null);
  setDocumentError(null);

  try {
    // First check if document exists in store
    let doc = documents.find(d => d.id === entry.document_id);
    
    // If not found in store, fetch it directly
    if (!doc) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/documents/${entry.document_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        doc = data.data || data;
        
        if (!doc) {
          throw new Error('Document not found in the system');
        }
      } catch (fetchError) {
        // If document has file_url directly, use it
        if (entry.file_url) {
          setDocumentUrl(entry.file_url);
          setDocumentLoading(false);
          return;
        }
        throw fetchError;
      }
    }

    if (!doc) {
      throw new Error('Document not found in the system');
    }

    // Use file_url from document or entry
    if (doc.file_url) {
      setDocumentUrl(doc.file_url);
    } else if (doc.file_public_id) {
      setDocumentUrl(`/api/documents/${entry.document_id}/file`);
    } else if (doc.body) {
      setDocumentUrl(doc.body);
    } else if (entry.file_url) {
      // Fallback to entry's file_url
      setDocumentUrl(entry.file_url);
    } else {
      throw new Error('Document content not available');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load document';
    setDocumentError(errorMessage);
    toast.error(errorMessage);
    console.error('Error fetching document:', error);
  } finally {
    setDocumentLoading(false);
  }
};
  const closeDocViewModal = () => {
    setIsDocViewModalOpen(false);
    setSelectedDocument(null);
    setDocumentUrl(null);
    setDocumentError(null);
  };

  // ── Document Download Handler ──────────────────────────────────────────────
  const handleDownloadDocument = async () => {
    if (!selectedDocument) return;
    
    try {
      toast.success('Preparing document for download...');
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/documents/${selectedDocument.document_id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (documentUrl && documentUrl.startsWith('http')) {
          window.open(documentUrl, '_blank');
          toast.success('Document opened in new tab');
          return;
        }
        throw new Error('Failed to download document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${selectedDocument.document_title || 'document'}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
    } catch (error) {
      if (documentUrl && documentUrl.startsWith('http')) {
        window.open(documentUrl, '_blank');
        toast.success('Document opened in new tab');
      } else {
        toast.error('Failed to download document');
        console.error('Download error:', error);
      }
    }
  };

  // ── Folder Handlers ──────────────────────────────────────────────────────

  const handleViewFolder = async (id: string) => {
    setCurrentFolderId(id);
    setViewMode('folder_detail');
    setSelectedFolderDocs(new Set());
    await dispatch(fetchRHCFolderById(id));
    await dispatch(fetchRHCFolderChildren({ id }));
    await dispatch(fetchRHCFolderDocuments({ id }));
  };

  const handleBackFromFolder = () => {
    setViewMode('stations');
    setCurrentFolderId(null);
    setSelectedFolderDocs(new Set());
    dispatch(clearSelectedFolder());
    dispatch(clearHierarchy());
    dispatch(clearFolderDocuments());
    dispatch(fetchRHCFolders({ include_sub_folders: true }));
  };

  const handleFolderSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setFolderSearchQuery(query);
    if (query.length >= 2) {
      dispatch(searchRHCFolders(query));
    } else {
      dispatch(clearSearchResults());
    }
  };

  const handleFolderFilter = (category: FolderCategory | 'all') => {
    setSelectedFolderCategory(category);
    dispatch(fetchRHCFolders({
      category: category === 'all' ? undefined : category,
      include_sub_folders: true,
    }));
  };

  // ── Folder Document Selection ──────────────────────────────────────────

  const toggleFolderDocumentSelection = (documentId: string) => {
    setSelectedFolderDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const selectAllFolderDocuments = () => {
    if (selectedFolderDocs.size === folderDocuments.length) {
      setSelectedFolderDocs(new Set());
    } else {
      setSelectedFolderDocs(new Set(folderDocuments.map(d => d.id)));
    }
  };

  const clearFolderSelection = () => {
    setSelectedFolderDocs(new Set());
  };

  const handleMoveDocuments = async (targetFolderId: string) => {
    if (selectedFolderDocs.size === 0) {
      toast.error('No documents selected');
      return;
    }

    setIsMoving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const documentId of Array.from(selectedFolderDocs)) {
        try {
          await dispatch(moveRHCDocumentToFolder({
            sourceFolderId: currentFolderId!,
            documentId,
            targetFolderId,
          })).unwrap();
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} document(s) moved successfully`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} document(s) failed to move`);
      }

      if (currentFolderId) {
        await handleViewFolder(currentFolderId);
      }
      dispatch(fetchRHCFolders({ include_sub_folders: true }));
      
      setSelectedFolderDocs(new Set());
      setIsMoveModalOpen(false);
    } catch (error) {
      toast.error('Failed to move documents');
      console.error('Move error:', error);
    } finally {
      setIsMoving(false);
    }
  };

  // ── Folder CRUD ─────────────────────────────────────────────────────────

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(createRHCFolder({
        ref_no: folderFormData.ref_no,
        name: folderFormData.name,
        category: folderFormData.category,
        description: folderFormData.description || undefined,
        parent_folder_id: currentFolderId || folderFormData.parent_folder_id || undefined,
        status: folderFormData.status,
      })).unwrap();
      toast.success('Folder created successfully!');
      setShowFolderCreateModal(false);
      resetFolderForm();
      if (viewMode === 'folder_detail' && currentFolderId) {
        await handleViewFolder(currentFolderId);
      }
      dispatch(fetchRHCFolders({ include_sub_folders: true }));
      dispatch(fetchRHCFolderCategories());
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to create folder');
    }
  };

  const handleUpdateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderForEdit) return;
    try {
      await dispatch(updateRHCFolder({
        id: selectedFolderForEdit.id,
        input: {
          name: folderFormData.name,
          description: folderFormData.description || undefined,
          status: folderFormData.status,
        },
      })).unwrap();
      toast.success('Folder updated successfully!');
      setShowFolderEditModal(false);
      setSelectedFolderForEdit(null);
      resetFolderForm();
      if (viewMode === 'folder_detail' && currentFolderId) {
        await handleViewFolder(currentFolderId);
      }
      dispatch(fetchRHCFolders({ include_sub_folders: true }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to update folder');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      return;
    }
    try {
      await dispatch(deleteRHCFolder(id)).unwrap();
      toast.success('Folder deleted successfully!');
      if (viewMode === 'folder_detail' && currentFolderId === id) {
        handleBackFromFolder();
      }
      dispatch(fetchRHCFolders({ include_sub_folders: true }));
      dispatch(fetchRHCFolderCategories());
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete folder');
    }
  };

  const handleEditFolderClick = (folder: RHCFolder) => {
    setSelectedFolderForEdit(folder);
    setFolderFormData({
      ref_no: folder.ref_no,
      name: folder.name,
      category: folder.category,
      description: folder.description || '',
      status: folder.status,
      parent_folder_id: folder.parent_folder_id || '',
    });
    setShowFolderEditModal(true);
  };

  const resetFolderForm = () => {
    setFolderFormData({
      ref_no: '',
      name: '',
      category: 'court',
      description: '',
      status: 'active',
      parent_folder_id: '',
    });
  };

  const handleFolderInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFolderFormData(prev => ({ ...prev, [name]: value }));
  };

  const routableDocuments = documents.filter((d) => d.status !== 'filed');

  const getStationName = (stationId: string | null) => {
    if (!stationId) return '';
    const station = stations.find(s => s.id === stationId);
    return station?.name || 'Unknown Station';
  };

  const getStationRef = (stationId: string | null) => {
    if (!stationId) return null;
    const station = stations.find(s => s.id === stationId);
    return station?.ref_no || null;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDocument = () => {
    if (!documentUrl) return null;

    if (documentUrl.startsWith('data:image/')) {
      return (
        <div className="flex justify-center p-4">
          <img src={documentUrl} alt={selectedDocument?.document_title || 'Document'} className="max-w-full max-h-[600px] object-contain" />
        </div>
      );
    }
    
    if (documentUrl.startsWith('data:application/pdf')) {
      return (
        <iframe src={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="PDF Document" />
      );
    }
    
    if (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) {
      if (documentUrl.toLowerCase().includes('.pdf')) {
        return (
          <iframe src={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="PDF Document" />
        );
      }
      if (documentUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        return (
          <div className="flex justify-center p-4">
            <img src={documentUrl} alt={selectedDocument?.document_title || 'Document'} className="max-w-full max-h-[600px] object-contain" />
          </div>
        );
      }
      return (
        <iframe src={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="Document" />
      );
    }
    
    if (documentUrl.startsWith('blob:')) {
      return (
        <iframe src={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="Document" />
      );
    }

    if (documentUrl.includes('<html') || documentUrl.includes('<!DOCTYPE')) {
      return (
        <iframe srcDoc={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="Document" />
      );
    }

    return (
      <div className="bg-white rounded-lg p-6">
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
          {documentUrl}
        </pre>
      </div>
    );
  };

  // ── Get combined destinations (stations + folders) for dropdown ──────────
  const getRouteDestinations = useCallback(() => {
    const destinations: Array<{
      id: string;
      name: string;
      ref_no: string | null;
      type: 'station' | 'folder';
      display: string;
    }> = [];
    
    for (const station of stations) {
      if (station.is_active) {
        destinations.push({
          id: station.id,
          name: station.name,
          ref_no: station.ref_no,
          type: 'station' as const,
          display: `${station.ref_no ? `${station.ref_no} — ` : ''}${station.name}`,
        });
      }
    }
    
    for (const folder of folders) {
      if (folder.status === 'active') {
        destinations.push({
          id: folder.id,
          name: folder.name,
          ref_no: folder.ref_no,
          type: 'folder' as const,
          display: `📁 ${folder.ref_no ? `${folder.ref_no} — ` : ''}${folder.name}`,
        });
      }
    }
    
    destinations.sort((a, b) => a.name.localeCompare(b.name));
    
    return destinations;
  }, [stations, folders]);

  // ─── Render Stations View ──────────────────────────────────────────────────

  const renderStationsView = () => {
    const destinations = getRouteDestinations();

    return (
      <>
        {/* Route Document form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-900">Route Document</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetUploadState();
                  setIsDirectUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 transition"
              >
                <Upload size={14} />
                Upload
              </button>
              <button
                onClick={() => {
                  setIsBulkUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-blue-600 hover:bg-blue-700 transition"
              >
                <Upload size={14} />
                Bulk Upload
              </button>
              <button
                onClick={() => {
                  resetStationForm();
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-[#8B6914] hover:bg-[#7A5E12] transition"
              >
                <Plus size={14} />
                New Station
              </button>
              <button
                onClick={() => setShowFolderCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 transition"
              >
                <Folder size={14} />
                New Folder
              </button>
            </div>
          </div>
          <form onSubmit={handleRoute}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Select Document</label>
                <select
                  value={selectedDoc}
                  onChange={(e) => setSelectedDoc(e.target.value)}
                  disabled={docsLoading}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {docsLoading
                      ? 'Loading documents…'
                      : routableDocuments.length === 0
                        ? 'No documents available'
                        : 'Choose Document'}
                  </option>
                  {routableDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.reference_no ? `${doc.reference_no} — ` : ''}{doc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Route To</label>
                <select
                  value={routeTo}
                  onChange={(e) => setRouteTo(e.target.value)}
                  disabled={countsLoading || destinations.length === 0}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {countsLoading
                      ? 'Loading destinations…'
                      : destinations.length === 0
                        ? 'No stations or folders available'
                        : 'Select Destination'}
                  </option>
                  
                  {destinations.filter(d => d.type === 'station').length > 0 && (
                    <optgroup label="🏛 Stations">
                      {destinations
                        .filter(d => d.type === 'station')
                        .map((dest) => (
                          <option key={`station-${dest.id}`} value={dest.id}>
                            {dest.display}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  
                  {destinations.filter(d => d.type === 'folder').length > 0 && (
                    <optgroup label="📁 Folders">
                      {destinations
                        .filter(d => d.type === 'folder')
                        .map((dest) => (
                          <option key={`folder-${dest.id}`} value={dest.id}>
                            {dest.display}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as RegistryPriority)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-4">
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Routing Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add any instructions or notes for the receiving office…"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={mutating || !selectedDoc || !routeTo}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#8B6914' }}
            >
              {mutating && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Route File
            </button>
          </form>
        </div>

        {/* ── Folders Section ────────────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderOpen size={20} className="text-[#8B6914]" />
              <h3 className="text-sm font-medium text-slate-800">RHC Folders</h3>
              <span className="text-xs text-slate-400">({folders.length} folders)</span>
            </div>
            <button
              onClick={() => {
                dispatch(fetchRHCFolders({ include_sub_folders: true }));
                toast.success('Folders refreshed');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              <RefreshCw size={14} className="inline mr-1" />
              Refresh
            </button>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map(({ category, count }) => (
                <button
                  key={category}
                  onClick={() => handleFolderFilter(category)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    selectedFolderCategory === category
                      ? `${CATEGORY_COLORS[category]} ring-2 ring-[#8B6914]`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px]">
                    {count}
                  </span>
                </button>
              ))}
              {selectedFolderCategory !== 'all' && (
                <button
                  onClick={() => handleFolderFilter('all')}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <X size={12} />
                  Clear Filter
                </button>
              )}
            </div>
          )}

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search folders by reference or name..."
              value={folderSearchQuery}
              onChange={handleFolderSearch}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-1.5 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
            />
            {folderSearchQuery && (
              <button
                onClick={() => {
                  setFolderSearchQuery('');
                  dispatch(clearSearchResults());
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {foldersLoading.fetch ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#8B6914]" />
              <span className="ml-2 text-sm text-slate-600">Loading folders...</span>
            </div>
          ) : foldersError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {foldersError}
            </div>
          ) : (folderSearchQuery.length >= 2 ? searchResults : rootFolders).length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <Folder size={32} className="mx-auto text-slate-300 mb-2" />
              <p>No folders found</p>
              <p className="text-xs mt-1">Create a folder using the "New Folder" button above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {(folderSearchQuery.length >= 2 ? searchResults : rootFolders).map(folder => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onEdit={handleEditFolderClick}
                  onDelete={handleDeleteFolder}
                  onView={handleViewFolder}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Stations Section ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <span>🏛</span>
            Court Stations
            <span className="text-slate-400 font-normal">
              ({countsLoading ? '…' : stations.length} stations)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetStationForm();
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-[#8B6914] hover:bg-[#7A5E12] transition"
            >
              <Plus size={14} />
              New Station
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
            >
              {collapsed ? '+ Expand' : '− Collapse'}
            </button>
          </div>
        </div>

        {!collapsed && (
          countsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : stations.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No stations found. Click "New Station" above to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {stations.map((station) => (
                <div
                  key={station.id}
                  className={`relative flex flex-col items-center py-6 px-4 text-center bg-white transition ${activeStation === station.id ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/30' : ''
                    }`}
                >
                  <button
                    onClick={() => handleStationClick(station.id)}
                    disabled={!station.is_active}
                    className="flex flex-col items-center w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span
                      className="text-3xl mb-1"
                      style={{ color: station.type === 'sub_registry' ? '#c9a84c' : '#94a3b8' }}
                    >
                      {STATION_TYPE_ICONS[station.type as StationType]}
                    </span>
                    
                    <span className="text-xs font-mono font-medium text-[#8B6914] mb-0.5 min-h-[16px]">
                      {station.ref_no || '—'}
                    </span>
                    
                    <span className="text-sm font-medium text-slate-800">{station.name}</span>
                    <span className="text-[11px] text-slate-400 mb-3">
                      {STATION_TYPE_LABELS[station.type as StationType]}
                      {!station.is_active && ' · Inactive'}
                    </span>
                    <span className="text-xl font-medium text-slate-800">{station.file_count}</span>
                    <span className="text-[11px] text-slate-400">files on record</span>
                    {station.direct_count && station.direct_count > 0 && (
                      <span className="text-[10px] text-green-600 mt-1">
                        {station.direct_count} direct uploads
                      </span>
                    )}
                    <span className="text-[10px] text-amber-600 mt-2">Click to view files</span>
                  </button>

                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStation(station);
                      }}
                      className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="Edit station"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, station.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                      title="Delete station"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Toaster position="top-right" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FolderOpen size={28} className="text-[#8B6914]" />
          Document Registry
        </h1>
        {viewMode === 'folder_detail' && (
          <button
            onClick={handleBackFromFolder}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={16} />
            Back to Registry
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {viewMode === 'folder_detail' && selectedFolder ? (
        <FolderDetailView
          folder={selectedFolder}
          children={hierarchy?.children || []}
          documents={folderDocuments}
          loading={foldersLoading.fetch || foldersLoading.fetchOne}
          onBack={handleBackFromFolder}
          onEdit={handleEditFolderClick}
          onDelete={handleDeleteFolder}
          onViewFolder={handleViewFolder}
          onRefresh={() => currentFolderId && handleViewFolder(currentFolderId)}
          onMoveDocuments={() => setIsMoveModalOpen(true)}
          selectedDocuments={selectedFolderDocs}
          onToggleSelect={toggleFolderDocumentSelection}
          onSelectAll={selectAllFolderDocuments}
          onClearSelection={clearFolderSelection}
        />
      ) : (
        renderStationsView()
      )}

      {/* ── Direct Upload Modal ────────────────────────────────────────────── */}
{/* ── Direct Upload Modal ────────────────────────────────────────────── */}
<StationUploadModal
  isOpen={isDirectUploadModalOpen}
  onClose={() => {
    setIsDirectUploadModalOpen(false);
    resetUploadState();
  }}
  onUpload={handleDirectUpload}
  stationName="Selected Station"
  stationId=""
  stations={stations}  // Add this
  isUploading={isUploading}
  uploadProgress={uploadProgress}
  uploadStatus={uploadStatus}
  uploadError={uploadError}
  uploadResult={uploadResult}
  onReset={resetUploadState}
/>

      {/* ── Bulk Upload Modal ──────────────────────────────────────────────── */}
      <BulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onUpload={handleBulkUpload}
        stations={stations}
        isUploading={isUploading}
      />

      {/* ── Create Station Modal ───────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Create New Station</h3>
              <button
                onClick={() => { setIsCreateModalOpen(false); resetStationForm(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateStation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reference Number <span className="text-slate-400 text-xs">(optional for sub-registries)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., RHC/MSB/22"
                  value={stationFormData.ref_no}
                  onChange={(e) => setStationFormData({ ...stationFormData, ref_no: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                />
                <p className="text-xs text-slate-400 mt-1">Format: RHC/[CODE]/[NUMBER]</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bomet High Court"
                  value={stationFormData.name}
                  onChange={(e) => setStationFormData({ ...stationFormData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                <select
                  value={stationFormData.type}
                  onChange={(e) => setStationFormData({ ...stationFormData, type: e.target.value as StationType })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                >
                  {STATION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g., Bomet Town"
                  value={stationFormData.location || ''}
                  onChange={(e) => setStationFormData({ ...stationFormData, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); resetStationForm(); }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStation || !stationFormData.name}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-[#8B6914] hover:bg-[#7A5E12] transition disabled:opacity-50"
                >
                  {submittingStation ? <Loader2 size={16} className="animate-spin inline" /> : 'Create Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Station Modal ─────────────────────────────────────────────── */}
      {isEditModalOpen && editingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Edit Station</h3>
              <button
                onClick={() => { setIsEditModalOpen(false); resetStationForm(); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateStation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reference Number <span className="text-slate-400 text-xs">(optional for sub-registries)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., RHC/MSB/22"
                  value={stationFormData.ref_no || ''}
                  onChange={(e) => setStationFormData({ ...stationFormData, ref_no: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                />
                <p className="text-xs text-slate-400 mt-1">Format: RHC/[CODE]/[NUMBER]</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bomet High Court"
                  value={stationFormData.name}
                  onChange={(e) => setStationFormData({ ...stationFormData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                <select
                  value={stationFormData.type}
                  onChange={(e) => setStationFormData({ ...stationFormData, type: e.target.value as StationType })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                >
                  {STATION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g., Bomet Town"
                  value={stationFormData.location || ''}
                  onChange={(e) => setStationFormData({ ...stationFormData, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); resetStationForm(); }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStation || !stationFormData.name}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-[#8B6914] hover:bg-[#7A5E12] transition disabled:opacity-50"
                >
                  {submittingStation ? <Loader2 size={16} className="animate-spin inline" /> : 'Update Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: View Station Files ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-medium text-slate-900">
                  {getStationName(selectedStationForModal)}
                </h3>
                {getStationRef(selectedStationForModal) && (
                  <p className="text-sm font-mono font-medium text-[#8B6914] mt-0.5">
                    {getStationRef(selectedStationForModal)}
                  </p>
                )}
                <p className="text-sm text-slate-500 mt-1">Routed Documents</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const station = stations.find(s => s.id === selectedStationForModal);
                    if (station) {
                      setSelectedStationForUpload(station);
                      resetUploadState();
                      setIsStationUploadModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-green-600 hover:bg-green-700 transition"
                >
                  <Upload size={14} />
                  Upload
                </button>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {modalLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={32} className="animate-spin text-[#8B6914]" />
                  <span className="ml-3 text-sm text-slate-600">Loading documents...</span>
                </div>
              ) : stationEntries.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                  <p>No documents have been routed to this station yet.</p>
                  <button
                    onClick={() => {
                      const station = stations.find(s => s.id === selectedStationForModal);
                      if (station) {
                        setSelectedStationForUpload(station);
                        resetUploadState();
                        setIsStationUploadModalOpen(true);
                      }
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-medium text-white hover:bg-[#7A5E12] transition"
                  >
                    <Upload size={16} />
                    Upload First Document
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                  {stationEntries.map((entry) => (
                    <DocumentCard key={entry.id} entry={entry} onView={handleViewDocument} />
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {stationEntries.length} document{stationEntries.length !== 1 ? 's' : ''} on record
                </span>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Station Upload Modal ────────────────────────────────────────────── */}
{/* ── Station Upload Modal ────────────────────────────────────────────── */}
<StationUploadModal
  isOpen={isStationUploadModalOpen}
  onClose={() => {
    setIsStationUploadModalOpen(false);
    setSelectedStationForUpload(null);
    resetUploadState();
  }}
  onUpload={handleStationUpload}
  stationName={selectedStationForUpload?.name || 'Station'}
  stationId={selectedStationForUpload?.id || ''}
  stations={stations}  // Add this
  isUploading={isUploading}
  uploadProgress={uploadProgress}
  uploadStatus={uploadStatus}
  uploadError={uploadError}
  uploadResult={uploadResult}
  onReset={resetUploadState}
/>

      {/* ── Document View Modal ──────────────────────────────────────────────── */}
      {isDocViewModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-medium text-slate-900">{selectedDocument.document_title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  {selectedDocument.document_ref_no && <span className="text-sm text-slate-500">Ref: #{selectedDocument.document_ref_no}</span>}
                  <span className="text-sm text-slate-500">Routed: {formatDate(selectedDocument.routed_at)}</span>
                  {selectedDocument.routed_by_name && <span className="text-sm text-slate-500">By: {selectedDocument.routed_by_name}</span>}
                  {selectedDocument.status && (
                    <span className={`text-sm px-2 py-0.5 rounded-full ${REGISTRY_STATUS_BADGE[selectedDocument.status]}`}>
                      {REGISTRY_STATUS_LABEL[selectedDocument.status]}
                    </span>
                  )}
                  {selectedDocument.source === 'direct' && (
                    <span className="text-sm px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Direct Upload
                    </span>
                  )}
                </div>
              </div>
              <button onClick={closeDocViewModal} className="text-slate-400 hover:text-slate-600 transition">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50">
              {documentLoading ? (
                <div className="flex justify-center items-center h-[500px]">
                  <div className="text-center">
                    <Loader2 size={32} className="animate-spin text-[#8B6914] mx-auto mb-4" />
                    <p className="text-slate-500">Loading document...</p>
                  </div>
                </div>
              ) : documentError ? (
                <div className="flex justify-center items-center h-[500px]">
                  <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-red-500 mb-4">{documentError}</p>
                    <button onClick={() => handleViewDocument(selectedDocument)} className="px-4 py-2 text-sm text-white rounded-md hover:opacity-80" style={{ background: '#8B6914' }}>
                      Retry
                    </button>
                  </div>
                </div>
              ) : documentUrl ? (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">{renderDocument()}</div>
              ) : (
                <div className="flex justify-center items-center h-[500px]">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <p className="text-slate-500">No document content available</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-white rounded-b-xl">
              <div className="flex items-center justify-end gap-3">
                <button onClick={closeDocViewModal} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition">
                  Close
                </button>
                <button
                  onClick={handleDownloadDocument}
                  disabled={documentLoading || !documentUrl}
                  className="px-4 py-2 text-sm font-medium text-white rounded-md transition hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#8B6914' }}
                >
                  <Download size={16} className="inline mr-1" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-center text-slate-900 mb-2">Delete Station</h3>
              <p className="text-sm text-center text-slate-500 mb-6">
                Are you sure you want to delete this station? This action cannot be undone.
                {stationToDelete && stations.find(s => s.id === stationToDelete)?.file_count === 0 && 
                  " This station has no files on record."
                }
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={handleCancelDelete} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition">
                  Cancel
                </button>
                <button onClick={handleConfirmDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition">
                  Delete Station
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Folder Create Modal ────────────────────────────────────────────── */}
      {showFolderCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Folder size={20} className="text-[#8B6914]" />
                Create New Folder
              </h2>
              <button
                onClick={() => setShowFolderCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
              {currentFolderId && viewMode === 'folder_detail' && (
                <div className="rounded-md bg-blue-50 p-3">
                  <p className="text-xs text-blue-700">
                    Creating sub-folder inside: <span className="font-semibold">{selectedFolder?.name}</span>
                  </p>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reference Number *
                </label>
                <input
                  type="text"
                  name="ref_no"
                  value={folderFormData.ref_no}
                  onChange={handleFolderInputChange}
                  placeholder="e.g. RHC/FOLDER/001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Folder Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={folderFormData.name}
                  onChange={handleFolderInputChange}
                  placeholder="e.g. Case Files 2024"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Category *
                </label>
                <select
                  name="category"
                  value={folderFormData.category}
                  onChange={handleFolderInputChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                  required
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={folderFormData.description}
                  onChange={handleFolderInputChange}
                  rows={3}
                  placeholder="Folder description..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914] resize-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  name="status"
                  value={folderFormData.status}
                  onChange={handleFolderInputChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderCreateModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={foldersLoading.create}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A5E12] disabled:opacity-50"
                >
                  {foldersLoading.create ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Folder Edit Modal ───────────────────────────────────────────────── */}
      {showFolderEditModal && selectedFolderForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Edit Folder</h2>
              <button
                onClick={() => {
                  setShowFolderEditModal(false);
                  setSelectedFolderForEdit(null);
                  resetFolderForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateFolder} className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={folderFormData.ref_no}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                  disabled
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Folder Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={folderFormData.name}
                  onChange={handleFolderInputChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  name="category"
                  value={folderFormData.category}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                  disabled
                >
                  <option value={folderFormData.category}>
                    {CATEGORY_LABELS[folderFormData.category]}
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={folderFormData.description}
                  onChange={handleFolderInputChange}
                  rows={3}
                  placeholder="Folder description..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914] resize-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  name="status"
                  value={folderFormData.status}
                  onChange={handleFolderInputChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#8B6914] focus:outline-none focus:ring-1 focus:ring-[#8B6914]"
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFolderEditModal(false);
                    setSelectedFolderForEdit(null);
                    resetFolderForm();
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={foldersLoading.update}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#8B6914] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A5E12] disabled:opacity-50"
                >
                  {foldersLoading.update ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>Update Folder</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Move Documents Modal ────────────────────────────────────────────── */}
      <MoveDocumentsModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setSelectedFolderDocs(new Set());
        }}
        onMove={handleMoveDocuments}
        folders={folders}
        currentFolderId={currentFolderId}
        selectedCount={selectedFolderDocs.size}
        isMoving={isMoving}
      />
    </div>
  );
};

export default SuperAdminRegistry;