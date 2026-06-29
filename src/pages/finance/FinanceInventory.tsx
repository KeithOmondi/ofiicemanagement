// src/pages/staff/StaffInventory.tsx
import React, { useState, useEffect } from 'react';
import {
  fetchInventoryItems,
  fetchMyStoreRequests,
  createStoreRequest,
  selectInventoryItems,
  selectStoreRequests,
  selectInventoryItemsLoading,
  selectStoreRequestsLoading,
  selectInventoryMutating,
  type InventoryItem,
} from '../../store/slices/inventorySlice';
import {
  Search,
  Package,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  ShoppingCart,
  FileText,
  Send,
  ListTodo,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';

/* ─── TYPES ──────────────────────────────────────────────────────────────── */

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSubmit: (data: RequestFormData) => void;
  isLoading: boolean;
}

interface RequestFormData {
  item_name: string;
  quantity: number;
  unit: string;
  reason: string;
}

/* ─── REQUEST MODAL ──────────────────────────────────────────────────────── */

const RequestModal: React.FC<RequestModalProps> = ({
  isOpen,
  onClose,
  item,
  onSubmit,
  isLoading,
}) => {
  if (!isOpen || !item) return null;

  return (
    <RequestForm
      key={item.id}
      item={item}
      onClose={onClose}
      onSubmit={onSubmit}
      isLoading={isLoading}
    />
  );
};

interface RequestFormProps {
  item: InventoryItem;
  onClose: () => void;
  onSubmit: (data: RequestFormData) => void;
  isLoading: boolean;
}

const RequestForm: React.FC<RequestFormProps> = ({
  item,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<RequestFormData>({
    item_name: item.name,
    quantity: 1,
    unit: item.unit || 'unit',
    reason: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for the request');
      return;
    }
    onSubmit(formData);
  };

  const statusColors: Record<string, string> = {
    in_stock: 'bg-emerald-100 text-emerald-700',
    low_stock: 'bg-amber-100 text-amber-700',
    out_of_stock: 'bg-red-100 text-red-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#1d3331]">Request Item</h3>
              <p className="text-[10px] text-stone-400">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Info */}
          <div className="bg-stone-50 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white border border-stone-200">
              <Package size={16} className="text-stone-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-stone-700">{item.name}</p>
              <p className="text-[10px] text-stone-400">
                Available: {item.qty_available} {item.unit}
              </p>
            </div>
            <span className={`text-[8px] font-bold px-2 py-1 rounded-full ${statusColors[item.status]}`}>
              {item.status.replace('_', ' ')}
            </span>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
              Quantity *
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <ChevronDown size={16} className="text-stone-400" />
              </button>
              <input
                type="number"
                min="1"
                max={item.qty_available}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    quantity: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className="w-20 text-center py-2 border border-stone-200 rounded-xl text-sm font-bold outline-none focus:border-[#1d3331]"
              />
              <button
                type="button"
                onClick={() =>
                  setFormData(prev => ({
                    ...prev,
                    quantity: Math.min(item.qty_available, prev.quantity + 1),
                  }))
                }
                className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <ChevronUp size={16} className="text-stone-400" />
              </button>
              <span className="text-[11px] text-stone-400">{item.unit}</span>
            </div>
            {formData.quantity > item.qty_available && (
              <p className="text-[10px] text-red-500 mt-1">
                Quantity exceeds available stock ({item.qty_available})
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
              Reason for Request *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Please explain why you need this item..."
              className="w-full p-3 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] resize-none h-24"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-[11px] font-bold text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || formData.quantity > item.qty_available}
              className="flex-1 py-2.5 rounded-xl bg-[#1d3331] text-white text-[11px] font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Send size={14} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── REQUEST STATUS BADGE ────────────────────────────────────────────────── */

const RequestStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    Pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      icon: <Clock size={12} className="text-amber-500" />,
    },
    Approved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: <CheckCircle size={12} className="text-emerald-500" />,
    },
    Rejected: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      icon: <XCircle size={12} className="text-red-500" />,
    },
  };

  const style = styles[status] || styles.Pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
      {style.icon}
      {status}
    </span>
  );
};

/* ─── REASON TOAST ────────────────────────────────────────────────────────── */

const showReasonToast = (reason: string) => {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className="h-8 w-8 rounded-full bg-[#1d3331]/10 flex items-center justify-center">
                <FileText size={16} className="text-[#1d3331]" />
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-stone-900">Reason for Request</p>
              <p className="mt-1 text-sm text-stone-500">{reason}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-stone-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-[#1d3331] hover:text-[#1d3331]/80 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
};

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */

const CATEGORIES = [
  'all',
  'Furniture',
  'Catering Items',
  'Branded Materials',
  'Stationery',
  'Computer Accessories',
  'ICT Equipment',
] as const;

const STATUS_COLORS: Record<string, string> = {
  in_stock: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  low_stock: 'border-amber-200 bg-amber-50 text-amber-700',
  out_of_stock: 'border-red-200 bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

const FinanceInventory = () => {
  const dispatch = useAppDispatch();

  // ── Slice state ──────────────────────────────────────────────────────────
  const items = useAppSelector(selectInventoryItems);
  const myRequests = useAppSelector(selectStoreRequests);
  const loadingItems = useAppSelector(selectInventoryItemsLoading);
  const loadingRequests = useAppSelector(selectStoreRequestsLoading);
  const mutating = useAppSelector(selectInventoryMutating);

  // ── Local UI state ───────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'my_requests'>('inventory');

  // ── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      dispatch(fetchInventoryItems({})).unwrap(),
      dispatch(fetchMyStoreRequests()).unwrap(),
    ]).catch((err: string) => {
      if (!cancelled) setFetchError(err);
    });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRequestClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleSubmitRequest = async (data: RequestFormData) => {
    try {
      await dispatch(
        createStoreRequest({
          item_name: data.item_name,
          quantity: data.quantity,
          unit: data.unit || 'unit',
          reason: data.reason,
        })
      ).unwrap();

      toast.success('Request submitted successfully!');
      setIsModalOpen(false);
      setSelectedItem(null);
      dispatch(fetchInventoryItems({}));
      dispatch(fetchMyStoreRequests());
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to submit request');
    }
  };

  const isLoading = loadingItems || loadingRequests;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1d3331]">Inventory</h1>
            <p className="text-sm text-stone-500 mt-1">
              Browse items and track your requests
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Package size={16} className="text-stone-400" />
            <span>{items.length} items available</span>
            {myRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {myRequests.filter(r => r.status === 'Pending').length} pending
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-stone-200 bg-white p-1">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
            activeTab === 'inventory'
              ? 'bg-[#1d3331] text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Package className="inline h-4 w-4 mr-2" />
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('my_requests')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${
            activeTab === 'my_requests'
              ? 'bg-[#1d3331] text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ListTodo className="inline h-4 w-4 mr-2" />
          My Requests
          {myRequests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {myRequests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filters (only for inventory tab) */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                type="text"
                placeholder="Search inventory items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-[#1d3331] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <Filter size={14} className="text-stone-400 flex-shrink-0" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#1d3331] text-white'
                      : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {fetchError && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm flex items-center gap-3 mb-4">
          <AlertCircle size={18} />
          <span>{fetchError}</span>
        </div>
      )}

      {/* ─── INVENTORY TAB ────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <>
          {/* Loading State */}
          {loadingItems && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#1d3331]" size={32} />
            </div>
          )}

          {/* Empty State */}
          {!loadingItems && filteredItems.length === 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Package size={48} className="mx-auto text-stone-300 mb-4" />
              <h3 className="text-base font-serif font-bold text-stone-400">No items found</h3>
              <p className="text-sm text-stone-400 mt-1">
                {searchTerm ? 'Try adjusting your search' : 'Inventory is currently empty'}
              </p>
            </div>
          )}

          {/* Inventory Table */}
          {!loadingItems && filteredItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/60">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Item
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Category
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Available
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Location
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-[#1d3331]/5 text-[#1d3331] shrink-0">
                              <Package size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-[#1d3331] truncate">{item.name}</p>
                              {item.subtitle && (
                                <p className="text-[10px] text-stone-400 truncate">{item.subtitle}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="flex items-center gap-1.5 text-[11px] text-stone-500 whitespace-nowrap">
                            <FileText size={12} className="text-stone-400" />
                            {item.category}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-medium text-stone-700 whitespace-nowrap">
                            {item.qty_available} {item.unit}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="text-[11px] text-stone-400 whitespace-nowrap">
                            {item.location || '—'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className={`inline-block text-[8px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_COLORS[item.status]}`}>
                            {STATUS_LABELS[item.status]}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleRequestClick(item)}
                            disabled={item.status === 'out_of_stock'}
                            className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                              item.status === 'out_of_stock'
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                : 'bg-[#1d3331] text-white hover:bg-emerald-800'
                            }`}
                          >
                            {item.status === 'out_of_stock' ? (
                              'Out of Stock'
                            ) : (
                              <>
                                <ShoppingCart size={12} />
                                Request
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── MY REQUESTS TAB ────────────────────────────────────────────── */}
      {activeTab === 'my_requests' && (
        <>
          {/* Loading State */}
          {loadingRequests && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#1d3331]" size={32} />
            </div>
          )}

          {/* Empty State */}
          {!loadingRequests && myRequests.length === 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <ListTodo size={48} className="mx-auto text-stone-300 mb-4" />
              <h3 className="text-base font-serif font-bold text-stone-400">No requests yet</h3>
              <p className="text-sm text-stone-400 mt-1">
                Browse the inventory and request items you need
              </p>
              <button
                onClick={() => setActiveTab('inventory')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1d3331] px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
              >
                <Package size={16} />
                Browse Inventory
              </button>
            </div>
          )}

          {/* Requests Table */}
          {!loadingRequests && myRequests.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/60">
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Item
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Quantity
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Date Requested
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((request) => (
                      <tr
                        key={request.id}
                        className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-[#1d3331]/5 text-[#1d3331] shrink-0">
                              <Package size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-[#1d3331] truncate">{request.item_name}</p>
                              <p className="text-[10px] text-stone-400 truncate">{request.unit}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-medium text-stone-700 whitespace-nowrap">
                            {request.quantity} {request.unit}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="text-[11px] text-stone-400 whitespace-nowrap">
                            {new Date(request.created_at).toLocaleDateString('en-KE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <RequestStatusBadge status={request.status} />
                          {request.status === 'Rejected' && request.rejection_reason && (
                            <p className="text-[9px] text-red-400 mt-1 max-w-[150px] truncate" title={request.rejection_reason}>
                              Reason: {request.rejection_reason}
                            </p>
                          )}
                          {request.status === 'Approved' && request.approved_by_name && (
                            <p className="text-[9px] text-emerald-500 mt-1">
                              By: {request.approved_by_name}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {request.reason && (
                            <button
                              onClick={() => showReasonToast(request.reason)}
                              className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                            >
                              <Eye size={14} />
                              View Reason
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Request Modal */}
      <RequestModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        item={selectedItem}
        onSubmit={handleSubmitRequest}
        isLoading={mutating}
      />
    </div>
  );
};

export default FinanceInventory;