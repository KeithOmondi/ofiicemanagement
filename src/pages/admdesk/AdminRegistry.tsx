// src/pages/admin/SuperAdminRegistry.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  routeFile,
  fetchStationCounts,
  fetchRegistryEntries,
  markFiled,
  selectStationCounts,
  selectStationCountsLoading,
  selectRegistryMutating,
  selectRegistryError,
  clearError as clearRegistryError,
} from '../../store/slices/registrySlice';
import {
  fetchDocuments,
  fetchDocumentById,
  clearError as clearDocumentError,
} from '../../store/slices/documentSlice';
import {
  createStation,
  updateStation,
  deleteStation,
  selectStationsMutating,
  selectStationsError,
  clearError as clearStationError,
  type StationType,
  type Station,
  type CreateStationInput,
  type UpdateStationInput,
} from '../../store/slices/stationsSlice';
import type { RootState } from '../../store/store';
import type { RegistryPriority, RegistryStatus, RegistryEntry } from '../../types/registry.types';
import type { Document as DocType } from '../../types/documents.types';

// ─── Selectors ────────────────────────────────────────────────────────────────
const selectAllDocuments = (state: RootState): DocType[] => state.documents.documents;
const selectDocLoading   = (state: RootState): boolean   => state.documents.loading;
const selectDocumentError = (state: RootState): string | null => state.documents.error;

// ─── Display maps ─────────────────────────────────────────────────────────────
const STATION_TYPE_LABELS: Record<StationType, string> = {
  high_court:         'High Court Station',
  magistrate_court:   'Magistrate Court',
  environment_court:  'Environment & Land Court',
  kadhis_court:       "Kadhi's Court",
  sub_registry:       'Sub-Registry Station',
};

const STATION_TYPE_ICONS: Record<StationType, string> = {
  high_court:        '🏛',
  magistrate_court:  '🏛',
  environment_court: '🏛',
  kadhis_court:      '🏛',
  sub_registry:      '📁',
};

const STATION_TYPE_OPTIONS: { value: StationType; label: string }[] = [
  { value: 'high_court', label: 'High Court Station' },
  { value: 'magistrate_court', label: 'Magistrate Court' },
  { value: 'environment_court', label: 'Environment & Land Court' },
  { value: 'kadhis_court', label: "Kadhi's Court" },
  { value: 'sub_registry', label: 'Sub-Registry Station' },
];

const PRIORITY_OPTIONS: { value: RegistryPriority; label: string }[] = [
  { value: 'normal',                label: 'Normal' },
  { value: 'urgent',                 label: 'Urgent' },
  { value: 'confidential',           label: 'Confidential' },
  { value: 'for_information_only',   label: 'For Information Only' },
];

// Simplified status display – we only show "Pending" (for in_transit/received) or "Filed"
const getStatusDisplay = (status: RegistryStatus): { label: string; className: string } => {
  if (status === 'filed') {
    return { label: 'Filed', className: 'bg-green-100 text-green-800 border-green-200' };
  }
  return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
};

// ─── Main Component ────────────────────────────────────────────────────────────

const AdminRegistry = () => {
  const dispatch = useAppDispatch();

  // ── Registry ─────────────────────────────────────────────────────────────────
  const stations         = useAppSelector(selectStationCounts);
  const countsLoading    = useAppSelector(selectStationCountsLoading);
  const mutating         = useAppSelector(selectRegistryMutating);
  const registryError    = useAppSelector(selectRegistryError);

  // ── Stations slice ──────────────────────────────────────────────────────────
  const stationMutating = useAppSelector(selectStationsMutating);
  const stationError    = useAppSelector(selectStationsError);

  // ── Documents ────────────────────────────────────────────────────────────────
  const documents     = useAppSelector(selectAllDocuments);
  const docsLoading   = useAppSelector(selectDocLoading);
  const docError      = useAppSelector(selectDocumentError);

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
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  // ── Station management state ────────────────────────────────────────────────
  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [stationForm, setStationForm] = useState<CreateStationInput & { id?: string }>({
    name: '',
    type: 'high_court',
    location: '',
  });

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

  useEffect(() => {
    if (stationError) {
      toast.error(stationError);
      dispatch(clearStationError());
    }
  }, [stationError, dispatch]);

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
          station_id:  routeTo,
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
    await refreshStationEntries(stationId);
  };

  // ── Refresh station entries ──────────────────────────────────────────────────
  const refreshStationEntries = useCallback(async (stationId: string) => {
    setModalLoading(true);
    try {
      const result = await dispatch(fetchRegistryEntries({
        station_id: stationId,
        limit: 100,
        sort_by: 'routed_at',
        sort_order: 'DESC'
      })).unwrap();
      setStationEntries(result.data);
    } catch {
      toast.error('Failed to load station entries');
      setStationEntries([]);
    } finally {
      setModalLoading(false);
    }
  }, [dispatch]);

  // ── File action: mark as filed ──────────────────────────────────────────────
  const handleFile = async (entryId: string) => {
    try {
      await dispatch(markFiled(entryId)).unwrap();
      toast.success('Document marked as filed');
      if (selectedStationForModal) {
        await refreshStationEntries(selectedStationForModal);
        refreshCounts();
      }
    } catch {
      toast.error('Failed to mark as filed');
    }
  };

  // ── View document: fetch and open in new tab ───────────────────────────────
  const handleViewDocument = async (documentId: string) => {
    if (viewingDocId === documentId) return;
    setViewingDocId(documentId);
    try {
      const doc = await dispatch(fetchDocumentById(documentId)).unwrap();
      if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      } else {
        toast.error('No file available for this document');
      }
    } catch {
      toast.error('Failed to load document');
    } finally {
      setViewingDocId(null);
    }
  };

  // ── Close registry entries modal ────────────────────────────────────────────
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStationForModal(null);
    setStationEntries([]);
    setModalLoading(false);
  };

  // ── Station management: open add modal ──────────────────────────────────────
  const openAddStation = () => {
    setEditingStationId(null);
    setStationForm({ name: '', type: 'high_court', location: '' });
    setShowStationModal(true);
  };

  // ── Station management: open edit modal ──────────────────────────────────────
 // ── Station management: open edit modal ──────────────────────────────────────
  const openEditStation = (station: Pick<Station, 'id' | 'name' | 'type' | 'location'>) => {
    setEditingStationId(station.id);
    setStationForm({
      name: station.name,
      type: station.type,
      location: station.location || '',
    });
    setShowStationModal(true);
  };

  // ── Station management: submit create/update ────────────────────────────────
  const handleStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationForm.name.trim()) {
      toast.error('Station name is required');
      return;
    }

    try {
      if (editingStationId) {
        // Update
        const input: UpdateStationInput = {
          name: stationForm.name.trim(),
          type: stationForm.type,
          location: (stationForm.location || '').trim() || undefined,
        };
        await dispatch(updateStation({ id: editingStationId, data: input })).unwrap();
        toast.success('Station updated successfully');
      } else {
        // Create
        const input: CreateStationInput = {
          name: stationForm.name.trim(),
          type: stationForm.type,
          location: (stationForm.location || '').trim() || undefined,
        };
        await dispatch(createStation(input)).unwrap();
        toast.success('Station created successfully');
      }
      setShowStationModal(false);
      refreshCounts();
    } catch {
      // error handled by toast effect
    }
  };

  // ── Station management: delete ──────────────────────────────────────────────
  const handleDeleteStation = async (stationId: string, stationName: string) => {
    if (!window.confirm(`Delete station "${stationName}"? This will remove it from the system.`)) return;
    try {
      await dispatch(deleteStation(stationId)).unwrap();
      toast.success('Station deleted');
      refreshCounts();
    } catch {
      toast.error('Failed to delete station');
    }
  };

  // ── Get station name for modal ──────────────────────────────────────────────
  const getStationName = (stationId: string | null) => {
    if (!stationId) return '';
    const station = stations.find(s => s.id === stationId);
    return station?.name || 'Unknown Station';
  };

  // ── Document selection dropdown ─────────────────────────────────────────────
  const routableDocuments = documents.filter((d) => d.status !== 'filed');

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
        <div className="flex items-center gap-2">
          <button
            onClick={openAddStation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Station
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
            <svg className="animate-spin h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : stations.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No stations found.
            <button
              onClick={openAddStation}
              className="ml-2 text-amber-600 hover:underline font-medium"
            >
              Add your first station
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {stations.map((station) => (
              <div
                key={station.id}
                className={`flex flex-col items-center py-6 px-4 text-center bg-white transition ${
                  activeStation === station.id ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/30' : ''
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
                  <span className="text-[10px] text-amber-600 mt-2">Click to manage</span>
                </button>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 w-full justify-center">
                  <button
                    onClick={() => openEditStation(station)}
                    className="text-xs text-blue-600 hover:text-blue-800 transition"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => handleDeleteStation(station.id, station.name)}
                    className="text-xs text-red-600 hover:text-red-800 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─── Station Registry Modal ──────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-medium text-slate-900">
                  {getStationName(selectedStationForModal)}
                </h3>
                <p className="text-sm text-slate-500">
                  {modalLoading ? 'Loading…' : `${stationEntries.length} routed document(s)`}
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

            {/* Body */}
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
                  No routed documents for this station.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Document</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ref No</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Routed At</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stationEntries.map((entry) => {
                        const statusDisplay = getStatusDisplay(entry.status);
                        const isFiled = entry.status === 'filed';
                        return (
                          <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800 truncate max-w-[180px]" title={entry.document_title}>
                                  {entry.document_title}
                                </span>
                                <button
                                  onClick={() => handleViewDocument(entry.document_id)}
                                  disabled={viewingDocId === entry.document_id}
                                  className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                  title="View document"
                                >
                                  {viewingDocId === entry.document_id ? (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                              {entry.document_ref_no || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusDisplay.className}`}>
                                {statusDisplay.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="capitalize text-xs text-slate-600">{entry.priority.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                              {new Date(entry.routed_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              {!isFiled ? (
                                <button
                                  onClick={() => handleFile(entry.id)}
                                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition"
                                >
                                  File
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">Completed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {stationEntries.length} entries
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
      )}

      {/* ─── Station Add/Edit Modal ────────────────────────────────────────────── */}
      {showStationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-900">
                {editingStationId ? 'Edit Station' : 'Add New Station'}
              </h3>
              <button
                onClick={() => setShowStationModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleStationSubmit}>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Station Name *
                  </label>
                  <input
                    type="text"
                    value={stationForm.name}
                    onChange={(e) => setStationForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Mombasa High Court"
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Station Type *
                  </label>
                  <select
                    value={stationForm.type}
                    onChange={(e) => setStationForm(prev => ({ ...prev, type: e.target.value as StationType }))}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    {STATION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={stationForm.location || ''}
                    onChange={(e) => setStationForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Mombasa CBD"
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setShowStationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stationMutating}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-60 transition"
                >
                  {stationMutating && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {editingStationId ? 'Update Station' : 'Add Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRegistry;