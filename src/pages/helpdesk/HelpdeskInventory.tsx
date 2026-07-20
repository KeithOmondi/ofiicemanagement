import React, { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchInventoryItems,
  fetchInventoryStats,
  fetchMyStoreRequests,
  createStoreRequest,
  fetchCategories,
  clearError,
  clearSuccess,
  selectInventoryItems,
  selectInventoryStats,
  selectStoreRequests,
  selectCategories,
  selectInventoryItemsLoading,
  selectStoreRequestsLoading,
  selectInventoryStatsLoading,
  selectInventoryMutating,
  selectInventoryError,
  selectInventorySuccess,
  selectPendingStoreRequests,
  type InventoryItem,
  type StoreRequestStatus,
  type CreateStoreRequestInput,
} from '../../store/slices/inventorySlice';
import {
  Package,
  Plus,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ListTodo,
  X,
} from 'lucide-react';

// ─── UI Helpers ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: StoreRequestStatus }) => {
  const styles: Record<StoreRequestStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    Pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending', icon: <Clock size={12} /> },
    Approved: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Approved', icon: <CheckCircle size={12} /> },
    Issued: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Issued', icon: <Package size={12} /> },
    Received: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Received', icon: <CheckCircle size={12} /> },
    Rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected', icon: <XCircle size={12} /> },
  };
  const { bg, text, label, icon } = styles[status] || styles.Pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
};

const StockStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    in_stock: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'In Stock' },
    low_stock: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Low Stock' },
    out_of_stock: { bg: 'bg-red-50', text: 'text-red-700', label: 'Out of Stock' },
  };
  const { bg, text, label } = styles[status] || styles.in_stock;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      {children}
    </label>
  );
}

const inputClasses =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]';

function GoldButton({
  children,
  icon,
  type = 'button',
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

function GhostButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

function ErrorBanner() {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectInventoryError);
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
      <button onClick={() => dispatch(clearError())} className="text-red-500 hover:text-red-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function SuccessBanner() {
  const dispatch = useAppDispatch();
  const success = useAppSelector(selectInventorySuccess);
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
    return () => clearTimeout(timer);
  }, [success, dispatch]);
  if (!success) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <div className="flex items-start gap-2">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Request submitted successfully!</span>
      </div>
      <button onClick={() => dispatch(clearSuccess())} className="text-emerald-500 hover:text-emerald-700">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-lg',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-xl bg-white`}>
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#1a3d1c]">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-stone-100 px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const HelpdeskInventory: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const items = useAppSelector(selectInventoryItems);
  const stats = useAppSelector(selectInventoryStats);
  const storeRequests = useAppSelector(selectStoreRequests);
  const categories = useAppSelector(selectCategories);
  const itemsLoading = useAppSelector(selectInventoryItemsLoading);
  const storeRequestsLoading = useAppSelector(selectStoreRequestsLoading);
  const statsLoading = useAppSelector(selectInventoryStatsLoading);
  const mutating = useAppSelector(selectInventoryMutating);
  const pendingStoreRequests = useAppSelector(selectPendingStoreRequests);

  // ── Local State ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'items' | 'requests'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedItem, setSelectedItemState] = useState<InventoryItem | null>(null);
  const [requestForm, setRequestForm] = useState<CreateStoreRequestInput>({
    item_name: '',
    quantity: 1,
    unit: '',
    reason: '',
  });
  const [formErrors, setFormErrors] = useState<{ reason?: string }>({});

  // ── Derived Data ──────────────────────────────────────────────────────────
  // Build a map of category_id -> name for display
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => map[c.id] = c.name);
    return map;
  }, [categories]);

  // For filtering by category name (we'll use category_id in filter, but display names)
  const categoryNames = useMemo(() => {
    return categories.map(c => c.name);
  }, [categories]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchInventoryItems({}));
    dispatch(fetchInventoryStats());
    dispatch(fetchMyStoreRequests());
    dispatch(fetchCategories());
  }, [dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const resetRequestForm = () => {
    setRequestForm({
      item_name: '',
      quantity: 1,
      unit: '',
      reason: '',
    });
    setFormErrors({});
    setSelectedItemState(null);
  };

  const handleOpenRequestModal = (item?: InventoryItem) => {
    if (item) {
      setSelectedItemState(item);
      setRequestForm({
        item_name: item.name,
        quantity: 1,
        unit: item.unit,
        reason: '',
      });
    } else {
      resetRequestForm();
    }
    setFormErrors({});
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.reason || requestForm.reason.trim().length === 0) {
      setFormErrors({ reason: 'A reason for the request is required' });
      return;
    }

    if (!requestForm.item_name.trim() || requestForm.quantity < 1) {
      return;
    }

    try {
      await dispatch(createStoreRequest({
        ...requestForm,
        reason: requestForm.reason.trim(),
      })).unwrap();
      await dispatch(fetchMyStoreRequests());
      await dispatch(fetchInventoryStats());
      setShowRequestModal(false);
      resetRequestForm();
    } catch (err) {
      console.error('Failed to submit request:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredItems = items.filter(item => {
    const categoryName = categoryMap[item.category_id] || 'Unknown';
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesCategory = categoryFilter === 'all' || categoryName === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredRequests = storeRequests.filter(req =>
    req.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[640px] w-full bg-stone-50 p-6">
      <ErrorBanner />
      <SuccessBanner />

      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-stone-500">
            Request items and track your requests
            {pendingStoreRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {pendingStoreRequests.length} pending
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenRequestModal()}
          className="flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2.5 text-sm font-semibold text-[#1a3d1c] transition hover:bg-[#b8973f]"
        >
          <Plus size={16} />
          Request Item
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400">Total Items</p>
          {statsLoading ? (
            <div className="h-6 w-8 animate-pulse rounded bg-stone-100" />
          ) : (
            <p className="text-lg font-bold text-stone-900">{stats?.total_items || 0}</p>
          )}
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400">Pending Requests</p>
          {statsLoading ? (
            <div className="h-6 w-8 animate-pulse rounded bg-stone-100" />
          ) : (
            <p className="text-lg font-bold text-amber-600">{stats?.pending_store_requests || 0}</p>
          )}
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400">Procurement</p>
          {statsLoading ? (
            <div className="h-6 w-8 animate-pulse rounded bg-stone-100" />
          ) : (
            <p className="text-lg font-bold text-blue-600">{stats?.pending_procurement_requests || 0}</p>
          )}
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <p className="text-[10px] text-stone-400">Low Stock Items</p>
          {statsLoading ? (
            <div className="h-6 w-8 animate-pulse rounded bg-stone-100" />
          ) : (
            <p className="text-lg font-bold text-red-600">{stats?.low_stock || 0}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-stone-200 bg-white p-1">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
            activeTab === 'items' ? 'bg-[#1a3d1c] text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Package className="inline h-4 w-4 mr-2" />
          Inventory Items
          {itemsLoading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
            activeTab === 'requests' ? 'bg-[#1a3d1c] text-white' : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ListTodo className="inline h-4 w-4 mr-2" />
          My Requests
          {storeRequestsLoading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
          {pendingStoreRequests.length > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {pendingStoreRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
          />
        </div>

        {activeTab === 'items' && (
          <>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
            >
              <option value="all">All Categories</option>
              {categoryNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#C29B38]/40"
            >
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </>
        )}
      </div>

      {/* Content */}
      {activeTab === 'items' ? (
        // Inventory Items Table View
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          {itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-stone-300" />
              <p className="mt-3 text-sm text-stone-400">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-400">
                    <th className="px-4 py-3 font-medium">Item Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-center">Quantity</th>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-stone-800">{item.name}</p>
                          {item.subtitle && (
                            <p className="text-xs text-stone-400">{item.subtitle}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                          {categoryMap[item.category_id] || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-stone-700">
                        {item.qty_available}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{item.unit}</td>
                      <td className="px-4 py-3 text-stone-600">{item.location || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <StockStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenRequestModal(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-[#1a3d1c] hover:bg-[#b8973f] transition-colors"
                        >
                          <Plus size={12} />
                          Request
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredItems.length > 0 && (
            <div className="border-t border-stone-200 px-4 py-2.5 text-xs text-stone-400">
              Showing {filteredItems.length} of {items.length} items
            </div>
          )}
        </div>
      ) : (
        // My Requests View - Table Format (only user's own requests)
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          {storeRequestsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <ListTodo className="mx-auto h-12 w-12 text-stone-300" />
              <p className="mt-3 text-sm text-stone-400">You haven't made any requests yet</p>
              <button
                onClick={() => handleOpenRequestModal()}
                className="mt-2 text-sm font-medium text-[#c9a84c] hover:underline"
              >
                Request an item
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-400">
                    <th className="px-4 py-3 font-medium">Item Name</th>
                    <th className="px-4 py-3 font-medium text-center">Quantity</th>
                    <th className="px-4 py-3 font-medium">Unit</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-800">{request.item_name}</p>
                        {request.status === 'Rejected' && request.rejection_reason && (
                          <p className="text-xs text-red-500 truncate max-w-xs">
                            Rejected: {request.rejection_reason}
                          </p>
                        )}
                        {request.status === 'Approved' && request.approved_by_name && (
                          <p className="text-xs text-emerald-500">
                            Approved by: {request.approved_by_name}
                          </p>
                        )}
                        {request.status === 'Issued' && request.issued_by_name && (
                          <p className="text-xs text-indigo-500">
                            Issued by: {request.issued_by_name}
                          </p>
                        )}
                        {request.status === 'Received' && request.received_by_name && (
                          <p className="text-xs text-emerald-500">
                            Received by: {request.received_by_name}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-stone-700">
                        {request.quantity}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{request.unit}</td>
                      <td className="px-4 py-3 text-stone-600 max-w-xs">
                        <p className="truncate">{request.reason || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {formatDate(request.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={request.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredRequests.length > 0 && (
            <div className="border-t border-stone-200 px-4 py-2.5 text-xs text-stone-400">
              Showing {filteredRequests.length} of {storeRequests.length} requests
            </div>
          )}
        </div>
      )}

      {/* ─── Request Item Modal ───────────────────────────────────────────── */}
      {showRequestModal && (
        <ModalShell
          title="Request Item"
          onClose={() => { setShowRequestModal(false); resetRequestForm(); }}
          footer={
            <>
              <GhostButton onClick={() => { setShowRequestModal(false); resetRequestForm(); }}>
                Cancel
              </GhostButton>
              <GoldButton onClick={handleSubmitRequest} disabled={mutating || !requestForm.item_name.trim() || requestForm.quantity < 1}>
                {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={14} />}
                Submit Request
              </GoldButton>
            </>
          }
        >
          <div className="space-y-3">
            {selectedItem && (
              <div className="rounded-lg bg-stone-50 p-3">
                <p className="text-xs text-stone-500">Selected Item</p>
                <p className="text-sm font-semibold text-stone-900">{selectedItem.name}</p>
                <p className="text-xs text-stone-400">
                  Available: {selectedItem.qty_available} {selectedItem.unit} • {categoryMap[selectedItem.category_id] || 'Unknown'}
                </p>
              </div>
            )}

            <div>
              <FieldLabel>Item Name *</FieldLabel>
              <input
                type="text"
                value={requestForm.item_name}
                onChange={(e) => setRequestForm({ ...requestForm, item_name: e.target.value })}
                placeholder="Enter item name"
                className={inputClasses}
                disabled={!!selectedItem}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Quantity *</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={requestForm.quantity}
                  onChange={(e) => setRequestForm({ ...requestForm, quantity: parseInt(e.target.value) || 1 })}
                  className={inputClasses}
                />
              </div>
              <div>
                <FieldLabel>Unit</FieldLabel>
                <input
                  type="text"
                  value={requestForm.unit}
                  onChange={(e) => setRequestForm({ ...requestForm, unit: e.target.value })}
                  placeholder="e.g. pcs, boxes"
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Reason *</FieldLabel>
              <textarea
                value={requestForm.reason || ''}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                placeholder="Please explain why you need this item..."
                rows={3}
                className={`${inputClasses} resize-none ${
                  formErrors.reason ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
              />
              {formErrors.reason && (
                <p className="mt-1 text-xs text-red-600">{formErrors.reason}</p>
              )}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default HelpdeskInventory;