// src/pages/admin/SuperAdminRegistry.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  routeFile,
  fetchStationCounts,
  fetchRegistryEntries,
  receiveFile,
  markFiled,
  returnFile,
  selectStationCounts,
  selectStationCountsLoading,
  selectRegistryMutating,
  selectRegistryError,
  clearError as clearRegistryError,
} from '../../store/slices/registrySlice';
import { fetchDocuments, clearError as clearDocumentError } from '../../store/slices/documentSlice';
import type { RootState } from '../../store/store';
import type { RegistryPriority, RegistryStatus, RegistryEntry } from '../../types/registry.types';
import type { StationType } from '../../store/slices/stationsSlice';
import type { Document as DocType } from '../../types/documents.types';

// ─── Selectors ────────────────────────────────────────────────────────────────

const selectAllDocuments  = (state: RootState): DocType[] => state.documents.documents;
const selectDocLoading    = (state: RootState): boolean   => state.documents.loading;
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

const PRIORITY_OPTIONS: { value: RegistryPriority; label: string }[] = [
  { value: 'normal',                label: 'Normal' },
  { value: 'urgent',                 label: 'Urgent' },
  { value: 'confidential',           label: 'Confidential' },
  { value: 'for_information_only',   label: 'For Information Only' },
];

const STATUS_OPTIONS: { value: RegistryStatus; label: string }[] = [
  { value: 'in_transit', label: 'In Transit' },
  { value: 'received',   label: 'Received' },
  { value: 'filed',      label: 'Filed' },
  { value: 'returned',   label: 'Returned' },
];

const STATUS_COLORS: Record<RegistryStatus, string> = {
  in_transit: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  received:   'text-blue-600 bg-blue-50 border-blue-200',
  filed:      'text-green-600 bg-green-50 border-green-200',
  returned:   'text-red-600 bg-red-50 border-red-200',
};

const STATUS_ICONS: Record<RegistryStatus, string> = {
  in_transit: '🚚',
  received:   '✅',
  filed:      '📄',
  returned:   '↩️',
};

const STATUS_LABELS: Record<RegistryStatus, string> = {
  in_transit: 'In Transit',
  received:   'Received',
  filed:      'Filed',
  returned:   'Returned',
};

const AdminRegistry = () => {
  const dispatch = useAppDispatch();

  // ── Registry ─────────────────────────────────────────────────────────────────
  const stations         = useAppSelector(selectStationCounts);
  const countsLoading    = useAppSelector(selectStationCountsLoading);
  const mutating         = useAppSelector(selectRegistryMutating);
  const registryError    = useAppSelector(selectRegistryError);

  // ── Documents ────────────────────────────────────────────────────────────────
  const documents     = useAppSelector(selectAllDocuments);
  const docsLoading    = useAppSelector(selectDocLoading);
  const docError       = useAppSelector(selectDocumentError);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [selectedDoc,   setSelectedDoc]   = useState('');
  const [routeTo,       setRouteTo]       = useState('');
  const [priority,      setPriority]      = useState<RegistryPriority>('normal');
  const [note,          setNote]          = useState('');
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [collapsed,     setCollapsed]     = useState(false);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStationForModal, setSelectedStationForModal] = useState<string | null>(null);
  const [stationEntries, setStationEntries] = useState<RegistryEntry[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<RegistryStatus>('received');
  const [statusChangeNote, setStatusChangeNote] = useState('');

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
    
    // Open modal and fetch entries for this station
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
      
      setStationEntries(result.data);
    } catch {
      toast.error('Failed to load station entries');
      setStationEntries([]);
    } finally {
      setModalLoading(false);
    }
  };

  // ── Handle status change ─────────────────────────────────────────────────────
  const handleStatusChange = async () => {
    if (!selectedEntryId || !newStatus) {
      toast.error('Please select an entry and a status');
      return;
    }

    try {
      let result;
      switch (newStatus) {
        case 'received':
          result = await dispatch(receiveFile(selectedEntryId)).unwrap();
          toast.success('File marked as received');
          break;
        case 'filed':
          result = await dispatch(markFiled(selectedEntryId)).unwrap();
          toast.success('File marked as filed');
          break;
        case 'returned':
          result = await dispatch(returnFile({ 
            id: selectedEntryId, 
            input: { note: statusChangeNote || undefined }
          })).unwrap();
          toast.success('File returned to registry');
          break;
        case 'in_transit':
          toast.error('Cannot manually set status to "In Transit"');
          return;
        default:
          toast.error('Invalid status');
          return;
      }

      // Update the entry in the local list
      setStationEntries(prev => 
        prev.map(entry => 
          entry.id === selectedEntryId ? result : entry
        )
      );

      // Reset selection
      setSelectedEntryId(null);
      setNewStatus('received');
      setStatusChangeNote('');
      
      // Refresh counts
      refreshCounts();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── Close modal ──────────────────────────────────────────────────────────────
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStationForModal(null);
    setStationEntries([]);
    setSelectedEntryId(null);
    setNewStatus('received');
    setStatusChangeNote('');
    setModalLoading(false);
  };

  const routableDocuments = documents.filter((d) => d.status !== 'filed');

  // ── Get station name for modal ──────────────────────────────────────────────
  const getStationName = (stationId: string | null) => {
    if (!stationId) return '';
    const station = stations.find(s => s.id === stationId);
    return station?.name || 'Unknown Station';
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
              <button
                key={station.id}
                onClick={() => handleStationClick(station.id)}
                disabled={!station.is_active}
                className={`flex flex-col items-center py-6 px-4 text-center bg-white hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeStation === station.id ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/30' : ''
                }`}
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
            ))}
          </div>
        )
      )}

      {/* ── Status Change Modal ─────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-medium text-slate-900">
                  {getStationName(selectedStationForModal)}
                </h3>
                <p className="text-sm text-slate-500">
                  Manage registry entries for this station
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
                  No registry entries found for this station.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {stationEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-4 rounded-lg border-2 transition ${
                          selectedEntryId === entry.id
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-900 truncate">
                                {entry.document_title}
                              </span>
                              {entry.document_ref_no && (
                                <span className="text-xs text-slate-500 font-mono">
                                  #{entry.document_ref_no}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className={`px-2 py-0.5 rounded-full border ${STATUS_COLORS[entry.status]}`}>
                                {STATUS_ICONS[entry.status]} {STATUS_LABELS[entry.status]}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-500">
                                Priority: <span className="font-medium capitalize">{entry.priority.replace(/_/g, ' ')}</span>
                              </span>
                              {entry.routed_by_name && (
                                <>
                                  <span className="text-slate-400">·</span>
                                  <span className="text-slate-500">
                                    Routed by: <span className="font-medium">{entry.routed_by_name}</span>
                                  </span>
                                </>
                              )}
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-500">
                                {new Date(entry.routed_at).toLocaleDateString()}
                              </span>
                              {entry.received_at && (
                                <>
                                  <span className="text-slate-400">·</span>
                                  <span className="text-green-600">
                                    Received: {new Date(entry.received_at).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                            {entry.note && (
                              <p className="text-xs text-slate-500 mt-1 italic">{entry.note}</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedEntryId(entry.id);
                              // Pre-select the next logical status based on current
                              if (entry.status === 'in_transit') setNewStatus('received');
                              else if (entry.status === 'received') setNewStatus('filed');
                              else setNewStatus('received');
                            }}
                            className={`text-xs px-3 py-1 rounded transition ${
                              selectedEntryId === entry.id
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {selectedEntryId === entry.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Status Change Controls */}
                  {selectedEntryId && (
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="text-sm font-medium text-slate-700 mb-3">
                        Change Status for Selected Entry
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">New Status</label>
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as RegistryStatus)}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            {STATUS_OPTIONS
                              .filter(opt => opt.value !== 'in_transit')
                              .map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs text-slate-500 block mb-1">Note (optional)</label>
                          <input
                            type="text"
                            value={statusChangeNote}
                            onChange={(e) => setStatusChangeNote(e.target.value)}
                            placeholder="Add a note about this status change..."
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={handleStatusChange}
                          className="px-4 py-2 text-sm font-medium text-white rounded-md bg-amber-600 hover:bg-amber-700 transition"
                        >
                          Apply Status Change
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEntryId(null);
                            setNewStatus('received');
                            setStatusChangeNote('');
                          }}
                          className="px-4 py-2 text-sm font-medium text-slate-600 rounded-md border border-slate-200 hover:bg-slate-50 transition"
                        >
                          Cancel Selection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {stationEntries.length} entries found
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
    </div>
  );
};

export default AdminRegistry;