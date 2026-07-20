// src/pages/admin/SuperAdminRegistry.tsx
import React, { useEffect, useState, useCallback } from 'react';
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
} from '../../store/slices/registrySlice';
import { fetchDocuments, clearError as clearDocumentError } from '../../store/slices/documentSlice';
import { deleteStation } from '../../store/slices/stationsSlice';
import type { RootState } from '../../store/store';
import type { RegistryPriority, RegistryEntry } from '../../types/registry.types';
import type { StationType } from '../../store/slices/stationsSlice';
import type { Document as DocType } from '../../types/documents.types';

// ─── Selectors ────────────────────────────────────────────────────────────────
const selectAllDocuments = (state: RootState): DocType[] => state.documents.documents;
const selectDocLoading = (state: RootState): boolean => state.documents.loading;
const selectDocumentError = (state: RootState): string | null => state.documents.error;

// ─── Display maps ─────────────────────────────────────────────────────────────
const STATION_TYPE_LABELS: Record<StationType, string> = {
  high_court: 'High Court Station',
  magistrate_court: 'Magistrate Court',
  environment_court: 'Environment & Land Court',
  kadhis_court: "Kadhi's Court",
  sub_registry: 'Sub-Registry Station',
};

const STATION_TYPE_ICONS: Record<StationType, string> = {
  high_court: '🏛',
  magistrate_court: '🏛',
  environment_court: '🏛',
  kadhis_court: '🏛',
  sub_registry: '📁',
};

const PRIORITY_OPTIONS: { value: RegistryPriority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'for_information_only', label: 'For Information Only' },
];

const SuperAdminRegistry = () => {
  const dispatch = useAppDispatch();

  // ── Registry ─────────────────────────────────────────────────────────────────
  const stations = useAppSelector(selectStationCounts);
  const countsLoading = useAppSelector(selectStationCountsLoading);
  const mutating = useAppSelector(selectRegistryMutating);
  const registryError = useAppSelector(selectRegistryError);

  // ── Documents ────────────────────────────────────────────────────────────────
  const documents = useAppSelector(selectAllDocuments);
  const docsLoading = useAppSelector(selectDocLoading);
  const docError = useAppSelector(selectDocumentError);

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

  // ── Delete confirmation state ──────────────────────────────────────────────
  const [stationToDelete, setStationToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ── Document view state ────────────────────────────────────────────────────
  const [selectedDocument, setSelectedDocument] = useState<RegistryEntry | null>(null);
  const [isDocViewModalOpen, setIsDocViewModalOpen] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

  // ── Initial data load ────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchStationCounts());
    dispatch(fetchDocuments({ page: 1, limit: 100, sort_by: 'created_at', sort_order: 'DESC' }));
  }, [dispatch]);

  const refreshCounts = useCallback(() => {
    dispatch(fetchStationCounts());
  }, [dispatch]);

  // ── Error toasts ──────────────────────────────────────────────────────────────
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

  // ── Submit: route the document to the chosen station ─────────────────────────
  const handleRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !routeTo) {
      toast.error('Choose both a document and a station before routing.');
      return;
    }

    try {
      await dispatch(
        routeFile({
          document_id: selectedDoc,
          station_id: routeTo,
          priority,
          note: note.trim() || undefined,
        })
      ).unwrap();

      toast.success('Document routed successfully');
      setSelectedDoc('');
      setRouteTo('');
      setPriority('normal');
      setNote('');
      refreshCounts();
    } catch {
      // error surfaced via the toast effect above
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

      // Ensure unique entries by using a Map with document_id as key
      const uniqueEntries = Array.from(
        new Map(result.data.map(entry => [entry.document_id, entry])).values()
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
  const handleViewDocument = async (entry: RegistryEntry) => {
    setSelectedDocument(entry);
    setIsDocViewModalOpen(true);
    setDocumentLoading(true);
    setDocumentUrl(null);
    setDocumentError(null);

    try {
      // Since you don't have a dedicated content endpoint, 
      // use the document ID to fetch the document from your documents list
      const doc = documents.find(d => d.id === entry.document_id);
      
      if (!doc) {
        throw new Error('Document not found in the system');
      }

      // If the document has a file_url, use it
      if (doc.file_url) {
        setDocumentUrl(doc.file_url);
      } 
      // If it has a file_public_id, construct the URL
      else if (doc.file_public_id) {
        // This depends on your file storage setup (Cloudinary, S3, etc.)
        setDocumentUrl(`/api/documents/${entry.document_id}/file`);
      } 
      // If it's a composed document with body text, display the body
      else if (doc.body) {
        setDocumentUrl(doc.body);
      } 
      else {
        // Try to fetch from the documents endpoint
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
        const documentData = data.data || data;
        
        if (documentData.file_url) {
          setDocumentUrl(documentData.file_url);
        } else if (documentData.body) {
          setDocumentUrl(documentData.body);
        } else {
          throw new Error('Document content not available');
        }
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
      
      // Try to download the file
      const response = await fetch(`/api/documents/${selectedDocument.document_id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If download endpoint doesn't exist, try to use the file URL
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
      // If download fails but we have a URL, try to open it
      if (documentUrl && documentUrl.startsWith('http')) {
        window.open(documentUrl, '_blank');
        toast.success('Document opened in new tab');
      } else {
        toast.error('Failed to download document');
        console.error('Download error:', error);
      }
    }
  };

  const routableDocuments = documents.filter((d) => d.status !== 'filed');

  const getStationName = (stationId: string | null) => {
    if (!stationId) return '';
    const station = stations.find(s => s.id === stationId);
    return station?.name || 'Unknown Station';
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

  // Helper to render the document based on content type
  const renderDocument = () => {
    if (!documentUrl) return null;

    // Check if it's a base64 image
    if (documentUrl.startsWith('data:image/')) {
      return (
        <div className="flex justify-center p-4">
          <img src={documentUrl} alt={selectedDocument?.document_title || 'Document'} className="max-w-full max-h-[600px] object-contain" />
        </div>
      );
    }
    
    // Check if it's a base64 PDF
    if (documentUrl.startsWith('data:application/pdf')) {
      return (
        <iframe src={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="PDF Document" />
      );
    }
    
    // Check if it's a URL
    if (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) {
      // For PDF URLs
      if (documentUrl.toLowerCase().includes('.pdf')) {
        return (
          <iframe src={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="PDF Document" />
        );
      }
      // For image URLs
      if (documentUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        return (
          <div className="flex justify-center p-4">
            <img src={documentUrl} alt={selectedDocument?.document_title || 'Document'} className="max-w-full max-h-[600px] object-contain" />
          </div>
        );
      }
      // For other URLs (Google Docs, etc.)
      return (
        <iframe src={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="Document" />
      );
    }
    
    // If it's a blob URL
    if (documentUrl.startsWith('blob:')) {
      return (
        <iframe src={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="Document" />
      );
    }

    // If it looks like HTML content
    if (documentUrl.includes('<html') || documentUrl.includes('<!DOCTYPE')) {
      return (
        <iframe srcDoc={documentUrl} className="w-full h-[600px] border-0 rounded-lg" title="Document" />
      );
    }

    // Default: show as text
    return (
      <div className="bg-white rounded-lg p-6">
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
          {documentUrl}
        </pre>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Toaster position="top-right" />

      {/* Route Document form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-900 mb-4">Route Document</h2>
        <form onSubmit={handleRoute}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {/* Select Document */}
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

            {/* Route To */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Route To</label>
              <select
                value={routeTo}
                onChange={(e) => setRouteTo(e.target.value)}
                disabled={countsLoading}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {countsLoading ? 'Loading stations…' : 'Select Station'}
                </option>
                {stations.filter((s) => s.is_active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
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
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Route File
          </button>
        </form>
      </div>

      {/* Stations grid */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <span>🏛</span>
          Court Stations
          <span className="text-slate-400 font-normal">
            ({countsLoading ? '…' : stations.length} stations)
          </span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
        >
          {collapsed ? '+ Expand' : '− Collapse'}
        </button>
      </div>

      {!collapsed && (
        countsLoading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : stations.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No stations found. Add stations under Station Management first.
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
                    className="text-3xl mb-2"
                    style={{ color: station.type === 'sub_registry' ? '#c9a84c' : '#94a3b8' }}
                  >
                    {STATION_TYPE_ICONS[station.type]}
                  </span>
                  <span className="text-xs font-medium" style={{ color: '#8B6914' }}>{station.name}</span>
                  <span className="text-[11px] text-slate-400 mb-3">
                    {STATION_TYPE_LABELS[station.type]}
                    {!station.is_active && ' · Inactive'}
                  </span>
                  <span className="text-xl font-medium text-slate-800">{station.file_count}</span>
                  <span className="text-[11px] text-slate-400">files on record</span>
                  <span className="text-[10px] text-amber-600 mt-2">Click to view files</span>
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteClick(e, station.id)}
                  className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                  title="Delete station"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Modal: View Station Files ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-medium text-slate-900">
                  {getStationName(selectedStationForModal)}
                </h3>
                <p className="text-sm text-slate-500">
                  Routed Documents
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {modalLoading ? (
                <div className="flex justify-center py-16">
                  <svg className="animate-spin h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : stationEntries.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  No documents have been routed to this station yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {stationEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {entry.document_title}
                          </span>
                          {entry.document_ref_no && (
                            <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              #{entry.document_ref_no}
                            </span>
                          )}
                          {entry.priority === 'urgent' && (
                            <span className="text-xs text-red-500 font-medium">🔴 Urgent</span>
                          )}
                          {entry.priority === 'confidential' && (
                            <span className="text-xs text-amber-500 font-medium">🔒 Confidential</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>
                            Routed: {formatDate(entry.routed_at)}
                          </span>
                          {entry.routed_by_name && (
                            <span>
                              By: {entry.routed_by_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* View Document Button */}
                      <button
                        onClick={() => handleViewDocument(entry)}
                        className="ml-4 px-3 py-1.5 text-xs font-medium text-white rounded-md transition hover:opacity-80"
                        style={{ background: '#8B6914' }}
                      >
                        View Document
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {stationEntries.length} document{stationEntries.length !== 1 ? 's' : ''} routed
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

      {/* ── Document View Modal ──────────────────────────────────────────────── */}
      {isDocViewModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Document View Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-medium text-slate-900">
                  {selectedDocument.document_title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  {selectedDocument.document_ref_no && (
                    <span className="text-sm text-slate-500">
                      Ref: #{selectedDocument.document_ref_no}
                    </span>
                  )}
                  <span className="text-sm text-slate-500">
                    Routed: {formatDate(selectedDocument.routed_at)}
                  </span>
                  {selectedDocument.routed_by_name && (
                    <span className="text-sm text-slate-500">
                      By: {selectedDocument.routed_by_name}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closeDocViewModal}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Document View Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50">
              {documentLoading ? (
                <div className="flex justify-center items-center h-[500px]">
                  <div className="text-center">
                    <svg className="animate-spin h-12 w-12 text-amber-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-slate-500">Loading document...</p>
                  </div>
                </div>
              ) : documentError ? (
                <div className="flex justify-center items-center h-[500px]">
                  <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <p className="text-red-500 mb-4">{documentError}</p>
                    <button
                      onClick={() => handleViewDocument(selectedDocument)}
                      className="px-4 py-2 text-sm text-white rounded-md hover:opacity-80"
                      style={{ background: '#8B6914' }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : documentUrl ? (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  {renderDocument()}
                </div>
              ) : (
                <div className="flex justify-center items-center h-[500px]">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <p className="text-slate-500">No document content available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Document View Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white rounded-b-xl">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={closeDocViewModal}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadDocument}
                  disabled={documentLoading || !documentUrl}
                  className="px-4 py-2 text-sm font-medium text-white rounded-md transition hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#8B6914' }}
                >
                  Download Document
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
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-center text-slate-900 mb-2">
                Delete Station
              </h3>
              <p className="text-sm text-center text-slate-500 mb-6">
                Are you sure you want to delete this station? This action cannot be undone.
                {stationToDelete && stations.find(s => s.id === stationToDelete)?.file_count === 0 && 
                  " This station has no files on record."
                }
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition"
                >
                  Delete Station
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminRegistry;