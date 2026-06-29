// src/pages/admin/SuperAdminInventory.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchInventoryStats,
  fetchInventoryItems,
  fetchAllStoreRequests,
  fetchAllProcurementRequests,
  fetchApprovedProcurement,
  fetchActivityLog,
  updateStoreRequest,
  updateProcurementRequest,
  markProcurementPurchased,
  clearError,
  clearSuccess,
  selectInventoryItems,
  selectStoreRequests,
  selectProcurementRequests,
  selectApprovedProcurement,
  selectActivityLog,
  selectInventoryError,
  selectInventorySuccess,
  selectInventoryItemsLoading,
  selectInventoryMutating,
  selectInventoryStatsLoading,
  selectPendingStoreRequests,
  selectPendingProcurementRequests,
  type InventoryCategory,
  type StockStatus,
  type RequestStatus,
  type Urgency,
  type InventoryItem,
  type StoreRequest,
  type ProcurementRequest,
  type ApprovedProcurementItem,
  type ActivityLogEntry,
} from "../../store/slices/inventorySlice";
import { fetchUsers } from "../../store/slices/userSlice";
import { format, parseISO } from "date-fns";
import { Eye, X, Check, Loader2 } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

const STATUS_BADGE: Record<StockStatus, string> = {
  in_stock: "bg-emerald-100 text-emerald-700",
  low_stock: "bg-amber-100 text-amber-700",
  out_of_stock: "bg-red-100 text-red-700",
};

const REQUEST_BADGE: Record<RequestStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

const STORE_REQUEST_BADGE: Record<RequestStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

const URGENCY_DOT: Record<Urgency, string> = {
  Normal: "bg-stone-400",
  Urgent: "bg-amber-500",
  Critical: "bg-red-500",
};

const formatKes = (value: number) =>
  `KES ${value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateString: string) => {
  try {
    return format(parseISO(dateString), "dd MMM yyyy");
  } catch {
    return dateString;
  }
};

const formatDateWithTime = (dateString: string) => {
  try {
    return format(parseISO(dateString), "dd MMM yyyy, HH:mm");
  } catch {
    return dateString;
  }
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: string;
  iconBg: string;
  value: number;
  label: string;
  sublabel: string;
}> = ({ icon, iconBg, value, label, sublabel }) => (
  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-3">
    <div className={`flex items-center justify-center w-9 h-9 rounded-lg text-base ${iconBg}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-stone-900 leading-tight">{value}</p>
      <p className="text-xs font-semibold text-stone-700">{label}</p>
      <p className="text-[11px] text-stone-400">{sublabel}</p>
    </div>
  </div>
);

const CategoryPill: React.FC<{
  label: string;
  icon?: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
      active
        ? "bg-[#1E4620] text-white border-[#1E4620]"
        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
    }`}
  >
    {icon && <span>{icon}</span>}
    {label}
  </button>
);

// ─── Tab: Store Inventory ────────────────────────────────────────────────────

const StoreInventoryTab: React.FC<{
  items: InventoryItem[];
  storeRequests: StoreRequest[];
  activityLog: ActivityLogEntry[];
  loading: boolean;
  categories: InventoryCategory[];
  onUpdateStoreRequest: (id: string, input: { status: RequestStatus; rejection_reason?: string }) => void;
  mutating: boolean;
}> = ({
  items,
  storeRequests,
  activityLog,
  loading,
  categories,
  onUpdateStoreRequest,
  mutating,
}) => {
  const [activeCategory, setActiveCategory] = useState<"All" | InventoryCategory>("All");
  const [search, setSearch] = useState("");

  const categoryIcons: Record<InventoryCategory, string> = {
    Furniture: "🪑",
    "Catering Items": "☕",
    "Branded Materials": "🏷️",
    Stationery: "✏️",
    "Computer Accessories": "🖱️",
    "ICT Equipment": "💻",
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, activeCategory, search]);

  const handleApproveStoreRequest = (id: string) => {
    if (window.confirm("Approve this store request?")) {
      onUpdateStoreRequest(id, { status: "Approved" });
    }
  };

  const handleRejectStoreRequest = (id: string) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason !== null) {
      onUpdateStoreRequest(id, { status: "Rejected", rejection_reason: reason || undefined });
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between gap-4">
          <h3 className="font-semibold text-stone-800 flex items-center gap-2">
            <span className="text-amber-500">📦</span> Store Inventory
          </h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search items..."
            className="w-48 rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          />
        </div>

        <div className="px-4 py-2.5 border-b border-stone-100 flex items-center gap-2 overflow-x-auto">
          <CategoryPill label="All" active={activeCategory === "All"} onClick={() => setActiveCategory("All")} />
          {categories.map((cat) => (
            <CategoryPill
              key={cat}
              label={cat}
              icon={categoryIcons[cat]}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
                <th className="px-4 py-2 font-semibold">Item Name</th>
                <th className="px-4 py-2 font-semibold">Category</th>
                <th className="px-4 py-2 font-semibold">Qty Available</th>
                <th className="px-4 py-2 font-semibold">Last Updated</th>
                <th className="px-4 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone-400 text-sm">
                    No items match this filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">{item.name}</p>
                      {item.subtitle && <p className="text-[11px] text-stone-400">{item.subtitle}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {item.qty_available} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      <p>{formatDate(item.updated_at)}</p>
                      {item.location && <p className="text-stone-400">{item.location}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2">
              <span className="text-amber-500">🛒</span> Store Requests
            </h3>
            {storeRequests.filter((r) => r.status === "Pending").length > 0 && (
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {storeRequests.filter((r) => r.status === "Pending").length} pending
              </span>
            )}
          </div>
          <div className="border-t border-stone-100 pt-3">
            {storeRequests.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-2">No requests.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {storeRequests.slice(0, 8).map((req) => (
                  <div key={req.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800">{req.item_name}</p>
                      <p className="text-[11px] text-stone-400">
                        {req.quantity} {req.unit} · {req.requested_by_name || "Unknown"}
                      </p>
                      {req.status === "Rejected" && req.rejection_reason && (
                        <p className="text-[11px] text-red-500 truncate" title={req.rejection_reason}>
                          Reason: {req.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STORE_REQUEST_BADGE[req.status]}`}>
                        {req.status}
                      </span>
                      {req.status === "Pending" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApproveStoreRequest(req.id)}
                            disabled={mutating}
                            className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded hover:bg-emerald-200 disabled:opacity-50"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleRejectStoreRequest(req.id)}
                            disabled={mutating}
                            className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {storeRequests.length > 8 && (
                  <p className="text-[10px] text-stone-400 text-center">+{storeRequests.length - 8} more</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
          <h3 className="font-semibold text-stone-800 flex items-center gap-2 mb-3">
            <span className="text-stone-500">🗒️</span> Activity Log
          </h3>
          <div className="border-t border-stone-100 pt-3 space-y-3 max-h-48 overflow-y-auto">
            {activityLog.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-2">No activity yet.</p>
            ) : (
              activityLog.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-start gap-2.5">
                  <span className="text-sm mt-0.5">{entry.icon || "📋"}</span>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{entry.title}</p>
                    {entry.description && <p className="text-[11px] text-stone-500">{entry.description}</p>}
                    <p className="text-[11px] text-stone-400 mt-0.5">{formatDateWithTime(entry.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Procurement Request Detail Modal ────────────────────────────────────────

const ProcurementRequestDetailModal: React.FC<{
  request: ProcurementRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  mutating: boolean;
}> = ({ request, isOpen, onClose, onApprove, onReject, mutating }) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleReject = () => {
    if (showRejectInput && !rejectionReason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }
    onReject(request?.id || "");
    setRejectionReason("");
    setShowRejectInput(false);
  };

  const handleApprove = () => {
    onApprove(request?.id || "");
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Procurement Request Details</h3>
            <p className="text-xs text-stone-400 mt-0.5">Review and take action on this procurement request</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status Banner */}
          <div className={`rounded-lg p-3 flex items-center gap-2 ${
            request.status === 'Pending' ? 'bg-amber-50 border border-amber-200' :
            request.status === 'Approved' ? 'bg-emerald-50 border border-emerald-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <span className={`text-sm ${
              request.status === 'Pending' ? 'text-amber-600' :
              request.status === 'Approved' ? 'text-emerald-600' :
              'text-red-600'
            }`}>
              {request.status === 'Pending' ? '⏳' : request.status === 'Approved' ? '✅' : '❌'}
            </span>
            <span className="text-sm font-medium">
              Status: <span className={`${
                request.status === 'Pending' ? 'text-amber-700' :
                request.status === 'Approved' ? 'text-emerald-700' :
                'text-red-700'
              }`}>{request.status}</span>
            </span>
            {request.status === 'Rejected' && request.rejection_reason && (
              <span className="text-sm text-red-600 ml-2">
                · Reason: {request.rejection_reason}
              </span>
            )}
            {request.status === 'Approved' && request.approved_by_name && (
              <span className="text-sm text-emerald-600 ml-2">
                · Approved by: {request.approved_by_name}
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-stone-500">Item Name</label>
              <p className="text-sm font-semibold text-stone-900">{request.item_name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500">Category</label>
              <p className="text-sm text-stone-700">
                <span className="inline-block text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                  {request.category}
                </span>
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500">Quantity</label>
              <p className="text-sm font-semibold text-stone-900">{request.quantity} {request.unit}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500">Urgency</label>
              <p className="text-sm flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${URGENCY_DOT[request.urgency]}`} />
                <span className="font-medium">{request.urgency}</span>
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500">Estimated Unit Cost</label>
              <p className="text-sm font-medium text-stone-900">
                {request.estimated_unit_cost ? formatKes(request.estimated_unit_cost) : 'Not provided'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500">Total Estimated Cost</label>
              <p className="text-sm font-bold text-stone-900">
                {request.estimated_unit_cost ? formatKes(request.estimated_unit_cost * request.quantity) : 'N/A'}
              </p>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-stone-500">Justification</label>
              <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-100">
                {request.justification}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500">Requested By</label>
              <p className="text-sm text-stone-700">{request.requested_by_name || 'Unknown'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500">Requested On</label>
              <p className="text-sm text-stone-700">{formatDateWithTime(request.created_at)}</p>
            </div>
          </div>

          {/* Rejection Reason Input */}
          {request.status === 'Pending' && (
            <div className="border-t border-stone-100 pt-4">
              {showRejectInput ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-stone-700">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this request..."
                    rows={2}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-1 focus:ring-red-300 resize-none"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Close
          </button>
          {request.status === 'Pending' && (
            <div className="flex gap-2">
              {showRejectInput ? (
                <>
                  <button
                    onClick={() => { setShowRejectInput(false); setRejectionReason(""); }}
                    className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={mutating}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <X size={16} />}
                    Confirm Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={mutating}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <X size={16} />
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={mutating}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] transition-colors disabled:opacity-50"
                  >
                    {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={16} />}
                    Approve
                  </button>
                </>
              )}
            </div>
          )}
          {request.status === 'Approved' && (
            <span className="text-sm text-emerald-600 font-medium">✓ Approved</span>
          )}
          {request.status === 'Rejected' && (
            <span className="text-sm text-red-600 font-medium">✕ Rejected</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Tab: Procurement Requests ────────────────────────────────────────────────

const ProcurementRequestsTab: React.FC<{
  requests: ProcurementRequest[];
  onUpdateRequest: (id: string, input: { status: RequestStatus; rejection_reason?: string }) => void;
  mutating: boolean;
}> = ({ requests, onUpdateRequest, mutating }) => {
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (request: ProcurementRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedRequest(null), 200);
  };

  const handleApprove = (id: string) => {
    onUpdateRequest(id, { status: "Approved" });
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleReject = (id: string) => {
    onUpdateRequest(id, { status: "Rejected", rejection_reason: undefined });
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const pendingCount = requests.filter(r => r.status === "Pending").length;

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-stone-800 flex items-center gap-2">
              <span className="text-stone-500">📋</span> Procurement Requests
            </h3>
            {pendingCount > 0 && (
              <span className="text-xs text-amber-600 ml-2">
                {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}
              </span>
            )}
          </div>
          <span className="text-xs text-stone-400">
            Total: {requests.length}
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="px-4 py-10 text-center text-stone-400 text-sm">No requests to show.</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {requests.map((req) => (
              <div key={req.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-stone-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-800 text-sm">{req.item_name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REQUEST_BADGE[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                    <span>{req.quantity} {req.unit}</span>
                    <span>·</span>
                    <span className="inline-block text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                      {req.category}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${URGENCY_DOT[req.urgency]}`} />
                      {req.urgency}
                    </span>
                    {req.estimated_unit_cost && (
                      <>
                        <span>·</span>
                        <span>{formatKes(req.estimated_unit_cost)}/unit</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1 line-clamp-1 max-w-md">
                    {req.justification}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Requested by {req.requested_by_name || "Unknown"} on {formatDate(req.created_at)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => handleViewDetails(req)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  {req.status === "Pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          if (window.confirm("Approve this procurement request?")) {
                            onUpdateRequest(req.id, { status: "Approved" });
                          }
                        }}
                        disabled={mutating}
                        className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded hover:bg-emerald-200 disabled:opacity-50"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = window.prompt("Enter rejection reason:");
                          if (reason !== null) {
                            onUpdateRequest(req.id, { status: "Rejected", rejection_reason: reason || undefined });
                          }
                        }}
                        disabled={mutating}
                        className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                  {req.status === "Approved" && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Approved</span>
                  )}
                  {req.status === "Rejected" && req.rejection_reason && (
                    <span className="text-[10px] text-red-500 max-w-[150px] truncate" title={req.rejection_reason}>
                      Reason: {req.rejection_reason}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <ProcurementRequestDetailModal
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onApprove={handleApprove}
        onReject={handleReject}
        mutating={mutating}
      />
    </>
  );
};

// ─── Tab: Procurement List ────────────────────────────────────────────────────

const ProcurementListTab: React.FC<{
  rows: ApprovedProcurementItem[];
  onMarkPurchased: (id: string) => void;
  mutating: boolean;
}> = ({ rows, onMarkPurchased, mutating }) => {
  const total = useMemo(
    () => rows.reduce((sum, r) => sum + r.total_cost_kes, 0),
    [rows]
  );

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-800 flex items-center gap-2">
            <span className="text-stone-500">🧾</span> Approved Procurement List
          </h3>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Items approved for procurement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-900">
            Total: {formatKes(total)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              <th className="px-4 py-2 font-semibold w-10">#</th>
              <th className="px-4 py-2 font-semibold">Item</th>
              <th className="px-4 py-2 font-semibold">Category</th>
              <th className="px-4 py-2 font-semibold">Qty</th>
              <th className="px-4 py-2 font-semibold">Unit</th>
              <th className="px-4 py-2 font-semibold">Unit Cost (KES)</th>
              <th className="px-4 py-2 font-semibold">Total (KES)</th>
              <th className="px-4 py-2 font-semibold">Requested By</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-stone-400 text-sm">
                  No approved items yet.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 text-stone-400">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">{row.item_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                      {row.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{row.quantity}</td>
                  <td className="px-4 py-3 text-stone-600">{row.unit}</td>
                  <td className="px-4 py-3 text-stone-600">{row.unit_cost_kes.toLocaleString("en-KE")}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {row.total_cost_kes.toLocaleString("en-KE")}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{row.requested_by_name || "Unknown"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      row.is_purchased ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {row.is_purchased ? "Purchased" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!row.is_purchased && (
                      <button
                        onClick={() => onMarkPurchased(row.id)}
                        disabled={mutating}
                        className="text-xs bg-[#1E4620] text-white px-2 py-1 rounded hover:bg-[#163a18] disabled:opacity-50"
                      >
                        Mark Purchased
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-stone-100">
                <td colSpan={6} className="px-4 py-2.5 text-right text-xs font-semibold text-stone-500">
                  Grand Total
                </td>
                <td colSpan={4} className="px-4 py-2.5 text-sm font-bold text-stone-900">
                  {formatKes(total)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type TabKey = "store" | "requests" | "list";

const CATEGORIES: InventoryCategory[] = [
  "Furniture",
  "Catering Items",
  "Branded Materials",
  "Stationery",
  "Computer Accessories",
  "ICT Equipment",
];

const SuperAdminInventory: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Redux Selectors ──────────────────────────────────────────────────────────
  const items = useAppSelector(selectInventoryItems);
  const storeRequests = useAppSelector(selectStoreRequests);
  const procurementRequests = useAppSelector(selectProcurementRequests);
  const approvedProcurement = useAppSelector(selectApprovedProcurement);
  const activityLog = useAppSelector(selectActivityLog);
  const error = useAppSelector(selectInventoryError);
  const success = useAppSelector(selectInventorySuccess);

  const loadingItems = useAppSelector(selectInventoryItemsLoading);
  const loadingStats = useAppSelector(selectInventoryStatsLoading);
  const mutating = useAppSelector(selectInventoryMutating);

  const pendingStoreRequests = useAppSelector(selectPendingStoreRequests);
  const pendingProcurementRequests = useAppSelector(selectPendingProcurementRequests);

  // ── Local State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("store");

  // ── Derived Stats ──────────────────────────────────────────────────────────
  const inStockCount = useMemo(() => items.filter((i) => i.status === "in_stock").length, [items]);
  const lowStockCount = useMemo(() => items.filter((i) => i.status === "low_stock").length, [items]);
  const outOfStockCount = useMemo(() => items.filter((i) => i.status === "out_of_stock").length, [items]);
  const totalItems = items.length;

  // ── Initial Data Fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchInventoryStats());
    dispatch(fetchInventoryItems({}));
    dispatch(fetchAllStoreRequests());
    dispatch(fetchAllProcurementRequests());
    dispatch(fetchApprovedProcurement());
    dispatch(fetchActivityLog(50));
    dispatch(fetchUsers({ limit: 100, is_active: true }));
  }, [dispatch]);

  // ── Clear success/error ────────────────────────────────────────────────────
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Store requests: approve/reject. Mirrors the procurement-request handler
  // below — both refresh stats + activity log so the dashboard stays in sync,
  // since the slice only auto-recomputes pending counts locally, not totals
  // that depend on cross-cutting stats.
  const handleUpdateStoreRequest = useCallback((
    id: string,
    input: { status: RequestStatus; rejection_reason?: string }
  ) => {
    dispatch(updateStoreRequest({ id, input })).unwrap().then(() => {
      dispatch(fetchAllStoreRequests());
      dispatch(fetchInventoryStats());
      dispatch(fetchActivityLog(50));
    });
  }, [dispatch]);

  const handleUpdateProcurementRequest = useCallback((
    id: string,
    input: { status: RequestStatus; rejection_reason?: string }
  ) => {
    dispatch(updateProcurementRequest({ id, input })).unwrap().then(() => {
      dispatch(fetchAllProcurementRequests());
      dispatch(fetchInventoryStats());
      dispatch(fetchActivityLog(50));
    });
  }, [dispatch]);

  const handleMarkPurchased = useCallback((id: string) => {
    if (window.confirm("Mark this item as purchased? This will add it to inventory.")) {
      dispatch(markProcurementPurchased({ id })).unwrap().then(() => {
        dispatch(fetchApprovedProcurement());
        dispatch(fetchInventoryItems({}));
        dispatch(fetchInventoryStats());
        dispatch(fetchActivityLog(50));
      });
    }
  }, [dispatch]);

  const isLoading = loadingItems || loadingStats;

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-stone-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-stone-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "store", label: "Store Inventory", icon: "📦" },
    { key: "requests", label: "Procurement Requests", icon: "📋" },
    { key: "list", label: "Procurement List", icon: "🧾" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
        <div>
          <h1 className="text-lg font-bold text-stone-900 tracking-tight">Inventory Management</h1>
          <p className="text-xs text-stone-400 mt-0.5">ORHC Store — stock levels, requests and approvals</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              dispatch(fetchInventoryStats());
              dispatch(fetchInventoryItems({}));
              dispatch(fetchAllStoreRequests());
              dispatch(fetchAllProcurementRequests());
              dispatch(fetchApprovedProcurement());
              dispatch(fetchActivityLog(50));
            }}
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* ── Error Message ────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        )}

        {/* ── Success Message ───────────────────────────────────────────── */}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
            <span>✓ Operation completed successfully</span>
            <button onClick={() => dispatch(clearSuccess())} className="text-emerald-400 hover:text-emerald-600">
              ✕
            </button>
          </div>
        )}

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon="✅"
            iconBg="bg-emerald-50 text-emerald-600"
            value={inStockCount}
            label="In Stock"
            sublabel={`${totalItems} total items`}
          />
          <StatCard
            icon="⚠️"
            iconBg="bg-amber-50 text-amber-600"
            value={lowStockCount}
            label="Low Stock"
            sublabel="Needs restocking"
          />
          <StatCard
            icon="✕"
            iconBg="bg-red-50 text-red-600"
            value={outOfStockCount}
            label="Out of Stock"
            sublabel="Unavailable"
          />
          <StatCard
            icon="🔔"
            iconBg="bg-amber-50 text-amber-600"
            value={pendingStoreRequests.length + pendingProcurementRequests.length}
            label="Pending Requests"
            sublabel={`${pendingStoreRequests.length} store · ${pendingProcurementRequests.length} procurement`}
          />
        </div>

        {/* ── Role banner ───────────────────────────────────────────────── */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
          <span>🧑‍⚖️</span>
          <span>
            You are viewing as <span className="font-semibold">Registrar</span>. You can approve or
            reject store and procurement requests and mark items as purchased.
          </span>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-stone-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? "border-[#1E4620] text-[#1E4620]"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ───────────────────────────────────────────────── */}
        {activeTab === "store" && (
          <StoreInventoryTab
            items={items}
            storeRequests={storeRequests}
            activityLog={activityLog}
            loading={loadingItems}
            categories={CATEGORIES}
            onUpdateStoreRequest={handleUpdateStoreRequest}
            mutating={mutating}
          />
        )}
        {activeTab === "requests" && (
          <ProcurementRequestsTab
            requests={procurementRequests}
            onUpdateRequest={handleUpdateProcurementRequest}
            mutating={mutating}
          />
        )}
        {activeTab === "list" && (
          <ProcurementListTab
            rows={approvedProcurement}
            onMarkPurchased={handleMarkPurchased}
            mutating={mutating}
          />
        )}
      </div>
    </div>
  );
};

export default SuperAdminInventory;