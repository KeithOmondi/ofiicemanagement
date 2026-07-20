// src/pages/procurement/PInventory.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchInventoryItems,
  fetchInventoryStats,
  fetchAllStoreRequests,
  fetchAllProcurementRequests,
  fetchApprovedProcurement,
  fetchActivityLog,
  fetchCategories,
  createStoreRequest,
  updateProcurementRequest,
  markProcurementPurchased,
  receiveStoreRequest,
  submitProcurementMemo,
  clearError,
  clearSuccess,
  selectInventoryItems,
  selectInventoryStats,
  selectStoreRequests,
  selectProcurementRequests,
  selectApprovedProcurement,
  selectInventoryError,
  selectInventorySuccess,
  selectInventoryItemsLoading,
  selectInventoryMutating,
  selectInventoryStatsLoading,
  selectProcurementRequestsLoading,
  selectCategories,
  type Category,
  type StoreRequestStatus,
  type InventoryItem,
  type Urgency,
  type CreateStoreRequestInput,
  type SubmitProcurementMemoInput,
  type ProcurementRequestStatus,
} from "../../store/slices/inventorySlice";
import { hasRole } from "../../store/slices/authSlice";
import { format } from "date-fns";
import {
  Check,
  X,
  Plus,
  Loader2,
  XCircle,
  FileText,
} from "lucide-react";
import ProcurementMemoModal from "../../components/modals/Procurementmemomodal";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "inventory" | "requests" | "procurement";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<"in_stock" | "low_stock" | "out_of_stock", string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

const STATUS_BADGE: Record<"in_stock" | "low_stock" | "out_of_stock", string> = {
  in_stock: "bg-emerald-100 text-emerald-700",
  low_stock: "bg-amber-100 text-amber-700",
  out_of_stock: "bg-red-100 text-red-700",
};

const REQUEST_BADGE: Record<StoreRequestStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-blue-100 text-blue-700",
  Issued: "bg-indigo-100 text-indigo-700",
  Received: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

const REQUEST_LABEL: Record<StoreRequestStatus, string> = {
  Pending: "Pending",
  Approved: "Approved",
  Issued: "Issued",
  Received: "Received",
  Rejected: "Rejected",
};

// Procurement status badge (includes Submitted)
const PROCUREMENT_BADGE: Record<ProcurementRequestStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Submitted: "bg-blue-100 text-blue-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

const URGENCY_BADGE: Record<Urgency, string> = {
  Normal: "bg-stone-100 text-stone-600",
  Urgent: "bg-amber-100 text-amber-700",
  Critical: "bg-red-100 text-red-700",
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "dd MMM yyyy");
  } catch {
    return dateString;
  }
};

// ─── Auth helper ──────────────────────────────────────────────────────────────

const selectCurrentUser = (state: { auth: { user: Parameters<typeof hasRole>[0] } }) =>
  state.auth.user;

// ─── UI Helpers ──────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: "in_stock" | "low_stock" | "out_of_stock" }> = ({ status }) => (
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}>
    {STATUS_LABEL[status]}
  </span>
);

const RequestStatusBadge: React.FC<{ status: StoreRequestStatus }> = ({ status }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REQUEST_BADGE[status]}`}>
    {REQUEST_LABEL[status]}
  </span>
);

const ProcurementStatusBadge: React.FC<{ status: ProcurementRequestStatus }> = ({ status }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PROCUREMENT_BADGE[status]}`}>
    {status}
  </span>
);

const TableEmptyRow: React.FC<{ colSpan: number; message: string }> = ({ colSpan, message }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-10 text-center text-stone-400 text-sm">
      {message}
    </td>
  </tr>
);

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent" />
  </div>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
    {children}
  </label>
);

const inputClasses =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#1a3d1c] focus:outline-none focus:ring-1 focus:ring-[#1a3d1c]";

const CategoryPill: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
      active
        ? "bg-[#1E4620] text-white border-[#1E4620]"
        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
    }`}
  >
    {label}
  </button>
);

// ─── Shared Modal Component ─────────────────────────────────────────────────

const ModalShell: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidth?: string;
}> = ({ title, onClose, children, footer, maxWidth = "max-w-lg" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className={`max-h-[90vh] w-full ${maxWidth} overflow-hidden rounded-xl bg-white`}>
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1a3d1c]">{title}</h3>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
          <X size={20} />
        </button>
      </div>
      <div className="max-h-[65vh] space-y-4 overflow-y-auto p-4">{children}</div>
      <div className="flex justify-end gap-2 border-t border-stone-100 px-4 py-3">{footer}</div>
    </div>
  </div>
);

// ─── Inventory Tab ──────────────────────────────────────────────────────────

const InventoryTab: React.FC<{
  items: InventoryItem[];
  categories: Category[];
  loading: boolean;
  onRequestItem: (item: InventoryItem) => void;
}> = ({ items, categories, loading, onRequestItem }) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string | "All">("All");
  const [search, setSearch] = useState("");

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach(c => map[c.id] = c);
    return map;
  }, [categories]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesCategory = activeCategoryId === "All" || item.category_id === activeCategoryId;
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [items, activeCategoryId, search]
  );

  if (loading && items.length === 0) return <Spinner />;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between gap-4">
        <h3 className="font-semibold text-stone-800 flex items-center gap-2">
          <span className="text-amber-500">📦</span> Store Inventory
        </h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="w-48 rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
        />
      </div>

      <div className="px-4 py-2.5 border-b border-stone-100 flex items-center gap-2 overflow-x-auto">
        <CategoryPill
          label="All"
          active={activeCategoryId === "All"}
          onClick={() => setActiveCategoryId("All")}
        />
        {categories.map((cat) => (
          <CategoryPill
            key={cat.id}
            label={cat.name}
            active={activeCategoryId === cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
          />
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              {["Item Name", "Category", "Quantity", "Status", "Last Updated", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-2 font-semibold">{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filteredItems.length === 0 ? (
              <TableEmptyRow colSpan={6} message="No items match this filter." />
            ) : (
              filteredItems.map((item) => {
                const category = categoryMap[item.category_id];
                return (
                  <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">{item.name}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-stone-400">{item.subtitle}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                        {category ? category.name : "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-800">
                      {item.qty_available}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {formatDate(item.updated_at)}
                      {item.location && (
                        <p className="text-stone-400">{item.location}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onRequestItem(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#c9a84c] px-3 py-1.5 text-xs font-semibold text-[#1a3d1c] hover:bg-[#b8973f] transition-colors"
                      >
                        <Plus size={12} />
                        Request
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Store Requests Tab ─────────────────────────────────────────────────────

const StoreRequestsTab: React.FC<{
  requests: ReturnType<typeof selectStoreRequests>;
  loading: boolean;
  userId: string | null;
  onReceive: (id: string) => void;
  mutating: boolean;
}> = ({ requests, loading, userId, onReceive, mutating }) => {
  if (loading && requests.length === 0) return <Spinner />;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100">
        <h3 className="font-semibold text-stone-800 flex items-center gap-2">
          <span className="text-amber-500">🛒</span> Store Requests
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              {["Item", "Quantity", "Requester", "Status", "Approved By", "Issued By", "Received By", "Date", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-2 font-semibold">{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {requests.length === 0 ? (
              <TableEmptyRow colSpan={9} message="No store requests." />
            ) : (
              requests.map((req) => {
                const showReceive = userId === req.requested_by && req.status === "Issued";
                return (
                  <tr key={req.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800">{req.item_name}</td>
                    <td className="px-4 py-3 text-stone-600">{req.quantity}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {req.requested_by_name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <RequestStatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {req.approved_by_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {req.issued_by_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {req.received_by_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {showReceive && (
                        <button
                          onClick={() => onReceive(req.id)}
                          disabled={mutating}
                          className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded hover:bg-emerald-200 disabled:opacity-50"
                        >
                          Receive
                        </button>
                      )}
                      {!showReceive && req.status !== "Pending" && (
                        <span className="text-[10px] text-stone-400">—</span>
                      )}
                      {req.status === "Pending" && (
                        <span className="text-[10px] text-amber-500">Awaiting approval</span>
                      )}
                      {req.status === "Approved" && (
                        <span className="text-[10px] text-blue-500">Awaiting issuance</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Procurement Requests Tab ──────────────────────────────────────────────

const ProcurementRequestsTab: React.FC<{
  requests: ReturnType<typeof selectProcurementRequests>;
  categories: Category[];
  loading: boolean;
  canApprove: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onGenerateMemo: (request: ReturnType<typeof selectProcurementRequests>[0]) => void;
}> = ({ requests, categories, loading, canApprove, onApprove, onReject, onGenerateMemo }) => {
  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach(c => map[c.id] = c);
    return map;
  }, [categories]);

  if (loading && requests.length === 0) return <Spinner />;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
        <h3 className="font-semibold text-stone-800 flex items-center gap-2">
          <span className="text-stone-500">📋</span> Procurement Requests
        </h3>
        <span className="text-xs text-stone-400">
          Total: {requests.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              {["Item", "Category", "Quantity", "Urgency", "Restock", "Status", "Memo", "Requested By", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-2 font-semibold">{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {requests.length === 0 ? (
              <TableEmptyRow colSpan={9} message="No procurement requests." />
            ) : (
              requests.map((req) => {
                const category = categoryMap[req.category_id];
                const isPending = req.status === "Pending";
                const isSubmitted = req.status === "Submitted";
                const canGenerateMemo = isPending && !req.memo_url;
                const memoAvailable = !!req.memo_url;

                return (
                  <tr key={req.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800">{req.item_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                        {category ? category.name : "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{req.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${URGENCY_BADGE[req.urgency]}`}>
                        {req.urgency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {req.is_restock ? (
                        <span className="text-blue-600">Restock</span>
                      ) : (
                        <span className="text-stone-400">New</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ProcurementStatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3">
                      {memoAvailable ? (
                        <a
                          href={req.memo_url!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FileText size={12} />
                          View Memo
                        </a>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {req.requested_by_name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {isPending && canGenerateMemo && (
                          <button
                            onClick={() => onGenerateMemo(req)}
                            className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200"
                          >
                            <FileText size={12} className="inline mr-1" />
                            Memo
                          </button>
                        )}
                        {isPending && canApprove && (
                          <>
                            <button
                              onClick={() => onApprove(req.id)}
                              className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded hover:bg-emerald-200"
                            >
                              <Check size={12} className="inline mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => onReject(req.id)}
                              className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200"
                            >
                              <X size={12} className="inline mr-1" />
                              Reject
                            </button>
                          </>
                        )}
                        {isSubmitted && canApprove && (
                          <>
                            <button
                              onClick={() => onApprove(req.id)}
                              className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded hover:bg-emerald-200"
                            >
                              <Check size={12} className="inline mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => onReject(req.id)}
                              className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200"
                            >
                              <X size={12} className="inline mr-1" />
                              Reject
                            </button>
                          </>
                        )}
                        {req.status === "Approved" && (
                          <span className="text-[10px] text-emerald-600">✓ Approved</span>
                        )}
                        {req.status === "Rejected" && (
                          <span className="text-[10px] text-red-600">✕ Rejected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Procurement List Tab ──────────────────────────────────────────────────

const ProcurementListTab: React.FC<{
  items: ReturnType<typeof selectApprovedProcurement>;
  categories: Category[];
  loading: boolean;
  onMarkPurchased: (id: string) => void;
  mutating: boolean;
}> = ({ items, categories, loading, onMarkPurchased, mutating }) => {
  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach(c => map[c.id] = c);
    return map;
  }, [categories]);

  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total_cost_kes, 0);
  }, [items]);

  if (loading && items.length === 0) return <Spinner />;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
        <h3 className="font-semibold text-stone-800 flex items-center gap-2">
          <span className="text-stone-500">🧾</span> Approved Procurement List
        </h3>
        <span className="text-xs font-medium text-stone-900">
          Total: KES {totalCost.toLocaleString()}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              {["Item", "Category", "Quantity", "Unit Cost", "Total", "Requested By", "Status", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-2 font-semibold">{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {items.length === 0 ? (
              <TableEmptyRow colSpan={8} message="No approved procurement items." />
            ) : (
              items.map((item) => {
                const category = categoryMap[item.category_id];
                return (
                  <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800">{item.item_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                        {category ? category.name : "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {item.unit_cost_kes.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-800">
                      {item.total_cost_kes.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {item.requested_by_name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.is_purchased ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {item.is_purchased ? "Purchased" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!item.is_purchased && (
                        <button
                          onClick={() => onMarkPurchased(item.id)}
                          disabled={mutating}
                          className="text-[10px] bg-[#1E4620] text-white px-2 py-1 rounded hover:bg-[#163a18] disabled:opacity-50"
                        >
                          Mark Purchased
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Request Item Modal ─────────────────────────────────────────────────────

interface RequestApiError {
  message?: string;
  field?: 'reason' | 'item_name' | 'quantity' | 'unit';
}

function isRequestApiError(err: unknown): err is RequestApiError {
  return typeof err === 'object' && err !== null && ('message' in err || 'field' in err);
}

const RequestModal: React.FC<{
  selectedItem: InventoryItem | null;
  onClose: () => void;
  onSubmit: (input: CreateStoreRequestInput) => Promise<void>;
  loading: boolean;
}> = ({ selectedItem, onClose, onSubmit, loading }) => {
  const [form, setForm] = useState<CreateStoreRequestInput>(() =>
    selectedItem
      ? {
          item_name: selectedItem.name,
          quantity: 1,
          unit: selectedItem.unit || '',
          reason: '',
        }
      : {
          item_name: '',
          quantity: 1,
          unit: '',
          reason: '',
        }
  );
  const [errors, setErrors] = useState<{ reason?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!form.reason || form.reason.trim().length === 0) {
      setErrors({ reason: 'A reason is required' });
      return;
    }
    if (!form.item_name.trim() || form.quantity < 1) return;

    try {
      await onSubmit({
        item_name: form.item_name.trim(),
        quantity: form.quantity,
        unit: form.unit?.trim() || undefined,
        reason: form.reason.trim(),
      });
    } catch (err: unknown) {
      const message = isRequestApiError(err) && err.message
        ? err.message
        : 'Failed to submit request. Please try again.';
      setSubmitError(message);
      if (isRequestApiError(err) && err.field === 'reason' && err.message) {
        setErrors({ reason: err.message });
      }
    }
  };

  const isItemNameDisabled = !!selectedItem;
  const isQuantityDisabled = !!selectedItem;

  return (
    <ModalShell
      title="Request Item"
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.item_name.trim() || form.quantity < 1}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] hover:bg-[#b8973f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={14} />}
            Submit Request
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {submitError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {selectedItem && (
          <div className="rounded-lg bg-stone-50 p-3">
            <p className="text-xs text-stone-500">Selected Item</p>
            <p className="text-sm font-semibold text-stone-900">{selectedItem.name}</p>
            <p className="text-xs text-stone-400">
              Available: {selectedItem.qty_available} {selectedItem.unit}
            </p>
          </div>
        )}
        <div>
          <FieldLabel>Item Name *</FieldLabel>
          <input
            type="text"
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
            placeholder="Enter item name"
            className={inputClasses}
            disabled={isItemNameDisabled}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Quantity *</FieldLabel>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
              className={inputClasses}
              disabled={isQuantityDisabled}
            />
          </div>
          <div>
            <FieldLabel>Unit</FieldLabel>
            <input
              type="text"
              value={form.unit || ''}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="e.g. pcs, boxes"
              className={inputClasses}
            />
          </div>
        </div>
        <div>
          <FieldLabel>Reason *</FieldLabel>
          <textarea
            value={form.reason || ''}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Please explain why you need this item..."
            rows={3}
            className={`${inputClasses} resize-none ${errors.reason ? 'border-red-300' : ''}`}
          />
          {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
        </div>
      </div>
    </ModalShell>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const PInventory: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ────────────────────────────────────────────────────────────
  const items = useAppSelector(selectInventoryItems);
  const stats = useAppSelector(selectInventoryStats);
  const storeRequests = useAppSelector(selectStoreRequests);
  const procurementRequests = useAppSelector(selectProcurementRequests);
  const approvedProcurement = useAppSelector(selectApprovedProcurement);
  const categories = useAppSelector(selectCategories);
  const error = useAppSelector(selectInventoryError);
  const success = useAppSelector(selectInventorySuccess);
  const loadingItems = useAppSelector(selectInventoryItemsLoading);
  const loadingStats = useAppSelector(selectInventoryStatsLoading);
  const loadingProc = useAppSelector(selectProcurementRequestsLoading);
  const mutating = useAppSelector(selectInventoryMutating);
  const currentUser = useAppSelector(selectCurrentUser);

  const canApprove = hasRole(currentUser, "super_admin");
  const userId = currentUser?.id ?? null;

  // ── Refs ──────────────────────────────────────────────────────────────────
  const clearTimers = useRef<{ success?: ReturnType<typeof setTimeout>; error?: ReturnType<typeof setTimeout> }>({});

  // ── Local state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("inventory");
  const [procSubTab, setProcSubTab] = useState<"requests" | "list">("requests");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  // Memo modal
  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [selectedRequestForMemo, setSelectedRequestForMemo] = useState<typeof procurementRequests[0] | null>(null);
  const [memoLoading, setMemoLoading] = useState(false);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const statCards = useMemo(() => {
    if (stats) {
      return {
        total: stats.total_items,
        inStock: stats.in_stock,
        lowStock: stats.low_stock,
        outOfStock: stats.out_of_stock,
      };
    }
    return {
      total: items.length,
      inStock: items.filter((i) => i.status === "in_stock").length,
      lowStock: items.filter((i) => i.status === "low_stock").length,
      outOfStock: items.filter((i) => i.status === "out_of_stock").length,
    };
  }, [stats, items]);

  // ── Initial fetches ───────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchInventoryItems({}));
    dispatch(fetchInventoryStats());
    dispatch(fetchAllStoreRequests());
    dispatch(fetchAllProcurementRequests());
    dispatch(fetchApprovedProcurement());
    dispatch(fetchActivityLog(20));
    dispatch(fetchCategories());
  }, [dispatch]);

  // ── Auto-clear banners ────────────────────────────────────────────────────
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

  const scheduleClear = useCallback(
    (type: "success" | "error", delay = type === "error" ? 5000 : 3000) => {
      if (clearTimers.current[type]) {
        clearTimeout(clearTimers.current[type]);
        delete clearTimers.current[type];
      }
      clearTimers.current[type] = setTimeout(() => {
        dispatch(type === "success" ? clearSuccess() : clearError());
        delete clearTimers.current[type];
      }, delay);
    },
    [dispatch]
  );

  useEffect(() => {
    const { success: successTimer, error: errorTimer } = clearTimers.current;
    return () => {
      if (successTimer) clearTimeout(successTimer);
      if (errorTimer) clearTimeout(errorTimer);
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenRequestModal = (item?: InventoryItem) => {
    setSelectedItem(item || null);
    setShowRequestModal(true);
  };

  const handleCloseRequestModal = () => {
    setShowRequestModal(false);
    setSelectedItem(null);
  };

  const handleSubmitStoreRequest = async (input: CreateStoreRequestInput) => {
    setRequestLoading(true);
    try {
      await dispatch(createStoreRequest(input)).unwrap();
      await dispatch(fetchAllStoreRequests());
      await dispatch(fetchInventoryStats());
      scheduleClear("success");
      handleCloseRequestModal();
    } catch {
      scheduleClear("error");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleReceive = useCallback(
    (id: string) => {
      if (window.confirm("Confirm you have received this item?")) {
        dispatch(receiveStoreRequest(id))
          .unwrap()
          .then(() => {
            dispatch(fetchAllStoreRequests());
            scheduleClear("success");
          })
          .catch(() => scheduleClear("error"));
      }
    },
    [dispatch, scheduleClear]
  );

  const handleApproveRequest = useCallback(
    (id: string) => {
      if (window.confirm("Approve this procurement request?")) {
        dispatch(
          updateProcurementRequest({
            id,
            input: { status: "Approved" },
          })
        )
          .unwrap()
          .then(() => {
            dispatch(fetchAllProcurementRequests());
            dispatch(fetchApprovedProcurement());
            dispatch(fetchInventoryStats());
            scheduleClear("success");
          })
          .catch(() => scheduleClear("error"));
      }
    },
    [dispatch, scheduleClear]
  );

  const handleRejectRequest = useCallback(
    (id: string) => {
      const reason = window.prompt("Enter rejection reason:");
      if (reason !== null) {
        dispatch(
          updateProcurementRequest({
            id,
            input: { status: "Rejected", rejection_reason: reason || undefined },
          })
        )
          .unwrap()
          .then(() => {
            dispatch(fetchAllProcurementRequests());
            dispatch(fetchInventoryStats());
            scheduleClear("success");
          })
          .catch(() => scheduleClear("error"));
      }
    },
    [dispatch, scheduleClear]
  );

  const handleMarkPurchased = useCallback(
    (id: string) => {
      if (window.confirm("Mark this item as purchased? This will add it to inventory.")) {
        dispatch(markProcurementPurchased({ id }))
          .unwrap()
          .then(() => {
            dispatch(fetchApprovedProcurement());
            dispatch(fetchInventoryItems({}));
            dispatch(fetchInventoryStats());
            scheduleClear("success");
          })
          .catch(() => scheduleClear("error"));
      }
    },
    [dispatch, scheduleClear]
  );

  const handleOpenMemoModal = useCallback(
    (request: typeof procurementRequests[0]) => {
      setSelectedRequestForMemo(request);
      setMemoModalOpen(true);
    },
    []
  );

  const handleCloseMemoModal = useCallback(() => {
    setMemoModalOpen(false);
    setSelectedRequestForMemo(null);
  }, []);

  const handleSubmitMemo = useCallback(
    async (memoData: SubmitProcurementMemoInput) => {
      if (!selectedRequestForMemo) return;
      setMemoLoading(true);
      try {
        await dispatch(
          submitProcurementMemo({
            id: selectedRequestForMemo.id,
            memoData,
          })
        ).unwrap();
        await dispatch(fetchAllProcurementRequests());
        scheduleClear("success");
        handleCloseMemoModal();
      } catch {
        scheduleClear("error");
      } finally {
        setMemoLoading(false);
      }
    },
    [dispatch, selectedRequestForMemo, scheduleClear, handleCloseMemoModal]
  );

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: "inventory", label: "Inventory", icon: "📦", count: statCards.total },
    { key: "requests", label: "Store Requests", icon: "🛒", count: storeRequests.length },
    { key: "procurement", label: "Procurement", icon: "📋", count: procurementRequests.length },
  ];

  return (
    <div className="p-6 space-y-6 bg-stone-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Procurement Management</h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage procurement requests, approved purchases, and request items from store
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600 ml-4 shrink-0">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
          <span>✓ Done</span>
          <button onClick={() => dispatch(clearSuccess())} className="text-emerald-400 hover:text-emerald-600 ml-4 shrink-0">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
        <span>🧑‍💼</span>
        <span>
          You are viewing as <span className="font-semibold">Procurement Officer</span>. You can generate memos for pending requests, approve/reject submitted requests, mark items as purchased, and also request items from the store.
          {!canApprove && (
            <span className="ml-1 text-amber-600">(Approvals require Super Admin)</span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Items", value: statCards.total, color: "text-stone-900", loading: loadingStats },
          { label: "In Stock", value: statCards.inStock, color: "text-emerald-600", loading: loadingStats },
          { label: "Low Stock", value: statCards.lowStock, color: "text-amber-600", loading: loadingStats },
          { label: "Out of Stock", value: statCards.outOfStock, color: "text-red-600", loading: loadingStats },
        ].map(({ label, value, color, loading: l }) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-500">{label}</p>
            {l ? (
              <div className="h-8 w-16 mt-1 animate-pulse rounded bg-stone-100" />
            ) : (
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            )}
          </div>
        ))}
      </div>

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
            {tab.count !== undefined && (
              <span className="ml-1 text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && (
        <InventoryTab
          items={items}
          categories={categories}
          loading={loadingItems}
          onRequestItem={handleOpenRequestModal}
        />
      )}
      {activeTab === "requests" && (
        <StoreRequestsTab
          requests={storeRequests}
          loading={loadingItems}
          userId={userId}
          onReceive={handleReceive}
          mutating={mutating}
        />
      )}
      {activeTab === "procurement" && (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-stone-200">
            <button
              onClick={() => setProcSubTab("requests")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                procSubTab === "requests"
                  ? "border-[#1E4620] text-[#1E4620]"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              Requests
            </button>
            <button
              onClick={() => setProcSubTab("list")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                procSubTab === "list"
                  ? "border-[#1E4620] text-[#1E4620]"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              Approved List
            </button>
          </div>

          {procSubTab === "requests" ? (
            <ProcurementRequestsTab
              requests={procurementRequests}
              categories={categories}
              loading={loadingProc}
              canApprove={canApprove}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
              onGenerateMemo={handleOpenMemoModal}
            />
          ) : (
            <ProcurementListTab
              items={approvedProcurement}
              categories={categories}
              loading={loadingProc}
              onMarkPurchased={handleMarkPurchased}
              mutating={mutating}
            />
          )}
        </div>
      )}

      {showRequestModal && (
        <RequestModal
          key={selectedItem?.id ?? "new"}
          selectedItem={selectedItem}
          onClose={handleCloseRequestModal}
          onSubmit={handleSubmitStoreRequest}
          loading={requestLoading}
        />
      )}

      {memoModalOpen && selectedRequestForMemo && (
        <ProcurementMemoModal
          request={selectedRequestForMemo}
          onClose={handleCloseMemoModal}
          onSubmit={handleSubmitMemo}
          loading={memoLoading}
        />
      )}
    </div>
  );
};

export default PInventory;