// src/pages/GenericEntityPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hook';
import { Loader2, Plus, Calendar, Users, Wallet, Edit, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import CircuitModal from '../components/modals/CircuitModal';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DsaDetail {
  judge_name?: string | null;
}

interface EntityItem {
  id: string | number;
  name: string;
  location?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_dsa?: number | null;
  dsa_details?: DsaDetail[];
}

// `TState` as a generic parameter doesn't work here: it only ever appears in
// *contravariant* (parameter) positions across `selectAll`/`loadingSelector`,
// and TypeScript's generic inference is unreliable for type parameters used
// only that way — it tends to fall back to `unknown` instead of unifying to
// the real state shape (which is exactly what caused the "not assignable to
// type '(state: unknown) => ...'" errors).
//
// Instead, derive the real `RootState` directly from the project's own
// `useAppSelector` hook, which is already correctly typed against the actual
// store. This avoids both the inference problem and guessing at where
// `RootState` is exported from.
type AppRootState = Parameters<typeof useAppSelector>[0] extends (state: infer S) => unknown
  ? S
  : never;

// `TAction` stays generic (see fetchAction below) because it only appears in
// a *covariant* (return) position, which TS infers reliably.
interface EntityConfig<T extends EntityItem = EntityItem, TAction = unknown> {
  title: string;
  icon: React.ReactNode;
  selectAll: (state: AppRootState) => T[];
  fetchAction: () => TAction;
  loadingSelector: (state: AppRootState) => boolean;
  modalMode: 'circuit' | 'bench' | 'partHeard' | 'serviceWeek' | 'otherPayment';
  columns: Array<{
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
  }>;
  // ─── Ownership filtering (optional) ─────────────────────────────────────
  // Both fields must be supplied together to enable filtering. `ownerField`
  // is the key on each entity that identifies who it belongs to (e.g.
  // `'created_by'`); `selectCurrentUserId` reads the logged-in user's id out
  // of this page's own auth slice, so GenericEntityPage never has to assume
  // a specific auth slice shape.
  //
  // Filtering happens client-side, after `selectAll` runs: if you'd rather
  // the backend only ever return the caller's own records, filter inside
  // `fetchAction`'s bound arguments instead and leave these two unset.
  ownerField?: keyof T;
  selectCurrentUserId?: (state: AppRootState) => string | number | null | undefined;
}

interface GenericEntityPageProps<T extends EntityItem = EntityItem, TAction = unknown> {
  config: EntityConfig<T, TAction>;
}

// Stable fallback selector so `useAppSelector` always has something to call
// (hooks can't be called conditionally) when a page doesn't opt into
// ownership filtering.
const selectNoCurrentUser = (): undefined => undefined;

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(amount)) return 'KES 0';
  return `KES ${amount.toLocaleString()}`;
};

// CircuitModal's `editingItem` prop is a union of concrete, mode-specific
// shapes (Circuit, ServiceWeek, ...) each carrying its own required fields
// (created_by, week_number, etc.) that our generic `EntityItem` can't know
// about statically. Rather than duplicating — and inevitably drifting from —
// that union here, derive it straight from the modal's own prop types.
type ModalEditingItem = React.ComponentProps<typeof CircuitModal>['editingItem'];

// ─── Component ──────────────────────────────────────────────────────────────
function GenericEntityPage<T extends EntityItem = EntityItem, TAction = unknown>({
  config,
}: GenericEntityPageProps<T, TAction>) {
  const dispatch = useAppDispatch();
  const data = useAppSelector(config.selectAll);
  const loading = useAppSelector(config.loadingSelector);
  // Always called (rules of hooks) — falls back to a no-op selector when a
  // page hasn't opted into ownership filtering.
  const currentUserId = useAppSelector(config.selectCurrentUserId ?? selectNoCurrentUser);

  const { ownerField } = config;

  // If ownership filtering is configured but we don't yet know who the
  // current user is (e.g. auth still hydrating), show nothing rather than
  // briefly flashing everyone's records.
  const filteredData = useMemo(() => {
    if (!ownerField) return data;
    if (currentUserId == null) return [];
    return data.filter((item) => item[ownerField] === currentUserId);
  }, [data, ownerField, currentUserId]);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ModalEditingItem>(null);

  // Destructure the pieces of `config` the effect actually uses so
  // exhaustive-deps can track them individually instead of demanding the
  // whole (frequently-recreated) `config` object as a dependency.
  const { fetchAction } = config;

  useEffect(() => {
    // `fetchAction`'s return type (TAction) is intentionally decoupled from
    // `AppDispatch`. `never` is the one cast that's honest here: it's the TS
    // bottom type, assignable to any parameter position, so it doesn't lie
    // about `fetchAction`'s result being some specific shape the way
    // `as any` or a fabricated action type would.
    dispatch(fetchAction() as never);
  }, [dispatch, fetchAction]);

  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: T) => {
    // Same reasoning as the modal's `editingItem` state above: `item` is our
    // generic `EntityItem`, but the modal wants the concrete per-mode shape.
    // The caller is responsible for pairing a `modalMode` with data that
    // actually has the fields that mode's modal expects.
    setEditingItem(item as unknown as ModalEditingItem);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    dispatch(fetchAction() as never);
  };

  // ─── Statistics ──────────────────────────────────────────────────────────
  const total = filteredData.length;
  const totalDSA = filteredData.reduce((sum: number, item: T) => sum + (item.total_dsa || 0), 0);
  const active = filteredData.filter(
    (item: T) => item.status === 'Active' || item.status === 'Signed'
  ).length;
  const pending = filteredData.filter(
    (item: T) => item.status === 'Pending' || item.status === 'In Progress'
  ).length;

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
              {config.icon}
              {config.title}
            </h1>
            <p className="text-sm text-stone-500">Manage {config.title.toLowerCase()} records</p>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1a3d1c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a4d2c] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add {config.title.slice(0, -1)}
          </button>
        </div>

        {/* ─── Stats ────────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c9a84c]/15">
                {config.icon}
              </div>
              <div>
                <p className="text-2xl font-semibold text-stone-900">{total}</p>
                <p className="text-sm text-stone-500">Total {config.title}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Users className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-stone-900">{active}</p>
                <p className="text-sm text-stone-500">Active</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Calendar className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-stone-900">{pending}</p>
                <p className="text-sm text-stone-500">Pending</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <Wallet className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-stone-900">{formatCurrency(totalDSA)}</p>
                <p className="text-sm text-stone-500">Total DSA</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Table ────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-stone-400">No {config.title.toLowerCase()} found.</p>
                <button
                  onClick={handleAdd}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#1a3d1c] hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add your first {config.title.slice(0, -1).toLowerCase()}
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/80">
                    {config.columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredData.map((item: T) => {
                    const judgeNames: string[] = item.dsa_details
                      ? [
                          ...new Set(
                            item.dsa_details
                              .map((d) => d.judge_name)
                              .filter((name): name is string => Boolean(name))
                          ),
                        ]
                      : [];

                    return (
                      <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                        {/* Name column */}
                        <td className="px-4 py-3 font-medium text-stone-800">{item.name}</td>

                        {/* Location column (only for circuit) */}
                        {config.modalMode === 'circuit' && (
                          <td className="px-4 py-3 text-stone-600">{item.location || '—'}</td>
                        )}

                        {/* Judges column */}
                        <td className="px-4 py-3">
                          {judgeNames.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {judgeNames.slice(0, 2).map((name, i) => (
                                <span key={i} className="text-sm text-stone-700">
                                  {name}
                                </span>
                              ))}
                              {judgeNames.length > 2 && (
                                <span className="text-xs text-stone-400">
                                  +{judgeNames.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>

                        {/* Period column */}
                        <td className="px-4 py-3 text-stone-600">
                          <div className="text-xs">
                            {formatDate(item.start_date)}
                            <span className="text-stone-400 mx-1">→</span>
                            {formatDate(item.end_date)}
                          </div>
                        </td>

                        {/* Total DSA column */}
                        <td className="px-4 py-3 text-right font-medium text-emerald-700">
                          {formatCurrency(item.total_dsa || 0)}
                        </td>

                        {/* Status column */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                              item.status === 'Active' || item.status === 'Signed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.status === 'Pending' || item.status === 'In Progress'
                                ? 'bg-amber-50 text-amber-700'
                                : item.status === 'Rejected'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {item.status || 'Draft'}
                          </span>
                        </td>

                        {/* Actions column */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-[#1a3d1c] hover:bg-[#c9a84c]/20 transition-colors"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                toast.success(`${config.title.slice(0, -1)}: ${item.name}`);
                              }}
                              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ─── CircuitModal ──────────────────────────────────────────────── */}
      <CircuitModal
        isOpen={showModal}
        onClose={handleCloseModal}
        mode={config.modalMode}
        editingItem={editingItem}
      />
    </div>
  );
}

export default GenericEntityPage;