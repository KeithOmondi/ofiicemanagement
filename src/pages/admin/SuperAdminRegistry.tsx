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

      setStationEntries(result.data);
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

  const routableDocuments = documents.filter((d) => d.status !== 'filed');

  const getStationName = (stationId: string | null) => {
    if (!stationId) return '';
    const station = stations.find(s => s.id === stationId);
    return station?.name || 'Unknown Station';
  };

  // ✅ FIX: formatDate now accepts Date or string
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
                className={`flex flex-col items-center py-6 px-4 text-center bg-white hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed ${activeStation === station.id ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/30' : ''
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
                <span className="text-[10px] text-amber-600 mt-2">Click to view files</span>
              </button>
            ))}
          </div>
        )
      )}

      {/* ── Modal: View Station Files ─────────────────────────────────────────── */}
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
                  Documents and files routed to this station
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
                  No documents or files have been routed to this station yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {stationEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {entry.document_title}
                            </span>
                            {entry.document_ref_no && (
                              <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                #{entry.document_ref_no}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">Priority:</span>
                              <span className="font-medium capitalize">
                                {entry.priority.replace(/_/g, ' ')}
                              </span>
                              {entry.priority === 'urgent' && (
                                <span className="ml-1 text-red-500">🔴</span>
                              )}
                              {entry.priority === 'confidential' && (
                                <span className="ml-1 text-amber-500">🔒</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">Status:</span>
                              <span className="font-medium capitalize">
                                {entry.status.replace(/_/g, ' ')}
                              </span>
                            </div>

                            {entry.routed_by_name && (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Routed by:</span>
                                <span className="font-medium">{entry.routed_by_name}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">Routed:</span>
                              <span className="font-medium">{formatDate(entry.routed_at)}</span>
                            </div>

                            {/* ✅ received_at – converted to string */}
                            {entry.received_at && (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Received:</span>
                                <span className="font-medium text-green-600">
                                  {formatDate(entry.received_at)}
                                </span>
                              </div>
                            )}

                            {/* ❌ filed_at removed – does not exist on RegistryEntry */}
                          </div>

                          {entry.note && (
                            <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100">
                              <span className="text-xs text-slate-500 italic">
                                📝 {entry.note}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {stationEntries.length} document{stationEntries.length !== 1 ? 's' : ''} found
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

export default SuperAdminRegistry;