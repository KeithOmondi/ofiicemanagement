// src/pages/store/StoreStock.tsx
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
  createInventoryItem,
  updateInventoryItem,
  createProcurementRequest,
  updateProcurementRequest,
  issueStoreRequest,
  receiveStoreRequest,
  clearError,
  clearSuccess,
  updateItemQuantityLocally,
  selectInventoryItems,
  selectInventoryStats,
  selectStoreRequests,
  selectProcurementRequests,
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
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput,
  type CreateProcurementRequestInput,
} from "../../store/slices/inventorySlice";
import { hasRole } from "../../store/slices/authSlice";
import { format } from "date-fns";

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

const URGENCY_BADGE: Record<Urgency, string> = {
  Normal: "bg-stone-100 text-stone-600",
  Urgent: "bg-amber-100 text-amber-700",
  Critical: "bg-red-100 text-red-700",
};

const URGENCY_OPTIONS: Urgency[] = ["Normal", "Urgent", "Critical"];

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

// ─── Sub-Components ──────────────────────────────────────────────────────────

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
  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
    {children}
  </label>
);

const ModalShell: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ title, onClose, children, maxWidth = "max-w-md" }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className={`bg-white rounded-xl shadow-xl ${maxWidth} w-full p-6 max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-stone-900">{title}</h3>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ─── Inventory Tab ────────────────────────────────────────────────────────────

const InventoryTab: React.FC<{
  items: InventoryItem[];
  categories: Category[];
  loading: boolean;
  canManage: boolean;
  onAddItem: () => void;
  onUpdateStock: (item: InventoryItem) => void;
  onSendForProcurement: (item: InventoryItem) => void;
}> = ({ items, categories, loading, canManage, onAddItem, onUpdateStock, onSendForProcurement }) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string | "All">("All");
  const [search, setSearch] = useState("");

  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach(c => map[c.id] = c);
    return map;
  }, [categories]);

  const getCategoryHierarchy = useCallback((categoryId: string) => {
    const cat = categoryMap[categoryId];
    if (!cat) return { category: "Unknown", subcategory: "" };
    
    if (cat.parent_id) {
      const parent = categoryMap[cat.parent_id];
      return {
        category: parent ? parent.name : "Unknown",
        subcategory: cat.name
      };
    }
    return {
      category: cat.name,
      subcategory: ""
    };
  }, [categoryMap]);

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
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-48 rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          />
          {canManage && (
            <button
              onClick={onAddItem}
              className="flex items-center gap-1 text-xs font-medium bg-[#1E4620] text-white px-3 py-1.5 rounded-lg hover:bg-[#163a18] transition-colors whitespace-nowrap"
            >
              <span>＋</span> Add Item
            </button>
          )}
        </div>
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
              {["Item Name", "Category", "Subcategory", "Quantity", "Status", "Last Updated", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-2 font-semibold">{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filteredItems.length === 0 ? (
              <TableEmptyRow colSpan={7} message="No items match this filter." />
            ) : (
              filteredItems.map((item) => {
                const { category, subcategory } = getCategoryHierarchy(item.category_id);
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
                        {category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {subcategory ? (
                        <span className="inline-block text-[11px] font-medium bg-stone-50 text-stone-500 px-2 py-0.5 rounded-full border border-stone-200">
                          {subcategory}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
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
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateStock(item)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Update Stock
                          </button>
                          <button
                            onClick={() => onSendForProcurement(item)}
                            className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                              item.status === "out_of_stock"
                                ? "border-red-200 text-red-700 hover:bg-red-50"
                                : item.status === "low_stock"
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-stone-200 text-stone-600 hover:bg-stone-50"
                            }`}
                          >
                            Send for Procurement
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">View only</span>
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

// ─── Store Requests Tab ──────────────────────────────────────────────────────

const StoreRequestsTab: React.FC<{
  requests: ReturnType<typeof selectStoreRequests>;
  loading: boolean;
  canIssue: boolean;
  canReceive: boolean;
  userId: string | null;
  onIssue: (id: string) => void;
  onReceive: (id: string) => void;
}> = ({ requests, loading, canIssue, canReceive, userId, onIssue, onReceive }) => {
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
                const showIssue = canIssue && req.status === "Approved";
                const showReceive = canReceive && userId === req.requested_by && req.status === "Issued";
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
                      {showIssue && (
                        <button
                          onClick={() => onIssue(req.id)}
                          className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-200 mr-1"
                        >
                          Issue
                        </button>
                      )}
                      {showReceive && (
                        <button
                          onClick={() => onReceive(req.id)}
                          className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded hover:bg-emerald-200"
                        >
                          Receive
                        </button>
                      )}
                      {!showIssue && !showReceive && req.status !== "Pending" && (
                        <span className="text-[10px] text-stone-400">—</span>
                      )}
                      {req.status === "Pending" && !canIssue && (
                        <span className="text-[10px] text-amber-500">Awaiting approval</span>
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

// ─── Procurement Requests Tab ─────────────────────────────────────────────────

const ProcurementRequestsTab: React.FC<{
  requests: ReturnType<typeof selectProcurementRequests>;
  categories: Category[];
  loading: boolean;
  canManage: boolean;
  canApprove: boolean;
  onNewRequest: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ requests, categories, loading, canManage, canApprove, onNewRequest, onApprove, onReject }) => {
  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach(c => map[c.id] = c);
    return map;
  }, [categories]);

  const getCategoryHierarchy = useCallback((categoryId: string) => {
    const cat = categoryMap[categoryId];
    if (!cat) return { category: "Unknown", subcategory: "" };
    
    if (cat.parent_id) {
      const parent = categoryMap[cat.parent_id];
      return {
        category: parent ? parent.name : "Unknown",
        subcategory: cat.name
      };
    }
    return {
      category: cat.name,
      subcategory: ""
    };
  }, [categoryMap]);

  if (loading && requests.length === 0) return <Spinner />;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between gap-4">
        <h3 className="font-semibold text-stone-800 flex items-center gap-2">
          <span className="text-stone-500">📝</span> Procurement Requests
        </h3>
        {canManage && (
          <button
            onClick={onNewRequest}
            className="flex items-center gap-1 text-xs font-medium bg-[#1E4620] text-white px-3 py-1.5 rounded-lg hover:bg-[#163a18] transition-colors whitespace-nowrap"
          >
            <span>＋</span> New Request
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400 border-b border-stone-100">
              {["Item", "Category", "Subcategory", "Quantity", "Urgency", "Restock", "Status", "Requested By", "Actions"].map(
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
                const { category, subcategory } = getCategoryHierarchy(req.category_id);
                return (
                  <tr key={req.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800">{req.item_name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                        {category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {subcategory ? (
                        <span className="inline-block text-[11px] font-medium bg-stone-50 text-stone-500 px-2 py-0.5 rounded-full border border-stone-200">
                          {subcategory}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
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
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        req.status === "Pending" ? "bg-amber-100 text-amber-700" :
                        req.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {req.requested_by_name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      {req.status === "Pending" && canApprove && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onApprove(req.id)}
                            className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded hover:bg-emerald-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onReject(req.id)}
                            className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status === "Approved" && (
                        <span className="text-[10px] text-emerald-600">✓ Approved</span>
                      )}
                      {req.status === "Rejected" && (
                        <span className="text-[10px] text-red-600">✕ Rejected</span>
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

// ─── Add Item Modal ──────────────────────────────────────────────────────────

interface AddItemFormState {
  name: string;
  subtitle: string;
  category_id: string;
  subcategory_id: string;
  qty_available: number;
  unit: string;
  location: string;
  min_stock_threshold: number;
}

const emptyAddItemForm: AddItemFormState = {
  name: "",
  subtitle: "",
  category_id: "",
  subcategory_id: "",
  qty_available: 0,
  unit: "",
  location: "",
  min_stock_threshold: 5,
};

const AddItemModalBody: React.FC<{
  categories: Category[];
  onClose: () => void;
  onCreate: (input: CreateInventoryItemInput) => void;
  loading: boolean;
}> = ({ categories, onClose, onCreate, loading }) => {
  const topLevelCategories = useMemo(() => categories.filter(c => c.parent_id === null), [categories]);

  const initialForm = useMemo(() => {
    const defaultCategoryId = topLevelCategories.length > 0 ? topLevelCategories[0].id : "";
    return { ...emptyAddItemForm, category_id: defaultCategoryId };
  }, [topLevelCategories]);

  const [form, setForm] = useState<AddItemFormState>(initialForm);

  const subcategories = useMemo(
    () => categories.filter(c => c.parent_id === form.category_id),
    [categories, form.category_id]
  );

  const setField = <K extends keyof AddItemFormState>(key: K, value: AddItemFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const getFinalCategoryId = useCallback(() => {
    return form.subcategory_id || form.category_id;
  }, [form.category_id, form.subcategory_id]);

  const isValid = form.name.trim() !== "" && 
                  form.unit.trim() !== "" && 
                  form.category_id !== "" && 
                  getFinalCategoryId() !== "";

  const handleSubmit = () => {
    if (!isValid) return;
    const finalCategoryId = getFinalCategoryId();
    onCreate({
      name: form.name.trim(),
      subtitle: form.subtitle.trim() || undefined,
      category_id: finalCategoryId,
      qty_available: form.qty_available,
      unit: form.unit.trim(),
      location: form.location.trim() || undefined,
      min_stock_threshold: form.min_stock_threshold,
    });
  };

  return (
    <ModalShell title="Add New Inventory Item" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel>Item Name</FieldLabel>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="e.g. A4 Bond Paper"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          />
        </div>

        <div>
          <FieldLabel>Subtitle (optional)</FieldLabel>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => setField("subtitle", e.target.value)}
            placeholder="e.g. 80gsm, ream of 500"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          />
        </div>

        <div>
          <FieldLabel>Category</FieldLabel>
          <select
            value={form.category_id}
            onChange={(e) => {
              setField("category_id", e.target.value);
              setField("subcategory_id", "");
            }}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          >
            <option value="">Select category</option>
            {topLevelCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Subcategory (optional)</FieldLabel>
          <select
            value={form.subcategory_id}
            onChange={(e) => setField("subcategory_id", e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          >
            <option value="">{subcategories.length === 0 ? "No subcategories available" : "Select subcategory"}</option>
            {subcategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Unit</FieldLabel>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setField("unit", e.target.value)}
              placeholder="e.g. pcs, reams, boxes"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
          <div>
            <FieldLabel>Initial Quantity</FieldLabel>
            <input
              type="number"
              min={0}
              value={form.qty_available}
              onChange={(e) => setField("qty_available", Number(e.target.value))}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Low Stock Threshold</FieldLabel>
            <input
              type="number"
              min={0}
              value={form.min_stock_threshold}
              onChange={(e) => setField("min_stock_threshold", Number(e.target.value))}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
            <p className="text-xs text-stone-400 mt-1">Flags as "Low Stock" at or below this.</p>
          </div>
          <div>
            <FieldLabel>Location (optional)</FieldLabel>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="e.g. Store Room B, Shelf 3"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !isValid}
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] transition-colors disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add Item"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const AddItemModal: React.FC<{
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onCreate: (input: CreateInventoryItemInput) => void;
  loading: boolean;
}> = ({ isOpen, categories, onClose, onCreate, loading }) => {
  if (!isOpen) return null;

  return (
    <AddItemModalBody
      key="add-item"
      categories={categories}
      onClose={onClose}
      onCreate={onCreate}
      loading={loading}
    />
  );
};

// ─── Update Stock Modal ──────────────────────────────────────────────────────

const UpdateStockModalBody: React.FC<{
  item: InventoryItem;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateInventoryItemInput) => void;
  loading: boolean;
}> = ({ item, onClose, onUpdate, loading }) => {
  const [quantity, setQuantity] = useState(item.qty_available);
  const [adjustmentNote, setAdjustmentNote] = useState("");

  const handleSubmit = () => {
    if (quantity < 0) return;
    onUpdate(item.id, {
      qty_available: quantity,
    });
  };

  return (
    <ModalShell title={`Update Stock: ${item.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-stone-50 border border-stone-100 px-3 py-2">
          <p className="text-xs text-stone-500">Current Stock</p>
          <p className="text-lg font-bold text-stone-800">
            {item.qty_available} {item.unit}
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Status: <StatusBadge status={item.status} />
          </p>
        </div>

        <div>
          <FieldLabel>New Quantity</FieldLabel>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          />
          <p className="text-xs text-stone-400 mt-1">
            Enter the new total quantity. This will replace the current stock level.
          </p>
        </div>

        <div>
          <FieldLabel>Adjustment Note (optional)</FieldLabel>
          <textarea
            value={adjustmentNote}
            onChange={(e) => setAdjustmentNote(e.target.value)}
            rows={2}
            placeholder="Reason for stock adjustment (e.g., physical count, damaged items, etc.)"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] resize-none"
          />
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
          <p>⚠️ This action will be logged for audit purposes.</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || quantity < 0}
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update Stock"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const UpdateStockModal: React.FC<{
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateInventoryItemInput) => void;
  loading: boolean;
}> = ({ isOpen, item, onClose, onUpdate, loading }) => {
  if (!isOpen || !item) return null;

  return (
    <UpdateStockModalBody
      key={item.id}
      item={item}
      onClose={onClose}
      onUpdate={onUpdate}
      loading={loading}
    />
  );
};

// ─── Send for Procurement Modal ────────────────────────────────────────────────

// ─── Send for Procurement Modal ────────────────────────────────────────────────

interface ProcurementFormState {
  item_name: string;
  category_id: string;
  subcategory_id: string;
  quantity: number;
  unit: string;
  estimated_unit_cost: string;
  justification: string;
  urgency: Urgency;  // <- this is the type we need to match
}

// ✅ FIXED: Correctly auto-populates category and subcategory with proper Urgency type
const buildProcurementForm = (item: InventoryItem, categoryMap: Record<string, Category>): ProcurementFormState => {
  const cat = categoryMap[item.category_id];

  // Determine urgency with correct type
  let urgency: Urgency;
  if (item.status === "out_of_stock") {
    urgency = "Critical";
  } else if (item.status === "low_stock") {
    urgency = "Urgent";
  } else {
    urgency = "Normal";
  }

  const base = {
    item_name: item.name,
    quantity: Math.max(item.min_stock_threshold * 2 - item.qty_available, 1),
    unit: item.unit,
    estimated_unit_cost: "",
    justification:
      item.status === "out_of_stock"
        ? `${item.name} is out of stock and needs restocking.`
        : item.status === "low_stock"
        ? `${item.name} is running low (currently ${item.qty_available} ${item.unit}, threshold ${item.min_stock_threshold}).`
        : "",
    urgency,  // now correctly typed as Urgency
  };

  if (!cat) {
    return { ...base, category_id: "", subcategory_id: "" };
  }

  if (cat.parent_id) {
    // Item is a subcategory: set parent as category, leaf as subcategory
    return {
      ...base,
      category_id: cat.parent_id,
      subcategory_id: item.category_id,
    };
  } else {
    // Item is a top-level category: set it as category, subcategory empty
    return {
      ...base,
      category_id: item.category_id,
      subcategory_id: "",
    };
  }
};

const ProcurementFormModalBody: React.FC<{
  item: InventoryItem;
  categories: Category[];
  onClose: () => void;
  onSubmit: (input: CreateProcurementRequestInput) => void;
  loading: boolean;
}> = ({ item, categories, onClose, onSubmit, loading }) => {
  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach(c => map[c.id] = c);
    return map;
  }, [categories]);

  const topLevelCategories = useMemo(() => categories.filter(c => c.parent_id === null), [categories]);

  const [form, setForm] = useState<ProcurementFormState>(() => buildProcurementForm(item, categoryMap));

  const subcategories = useMemo(
    () => categories.filter(c => c.parent_id === form.category_id),
    [categories, form.category_id]
  );

  const setField = <K extends keyof ProcurementFormState>(key: K, value: ProcurementFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const getFinalCategoryId = useCallback(() => {
    return form.subcategory_id || form.category_id;
  }, [form.category_id, form.subcategory_id]);

  const isValid = form.item_name.trim() !== "" && 
                  form.unit.trim() !== "" && 
                  form.quantity > 0 && 
                  form.justification.trim() !== "" && 
                  form.category_id !== "" &&
                  getFinalCategoryId() !== "";

  const handleSubmit = () => {
    if (!isValid) return;
    const parsedCost = form.estimated_unit_cost.trim() === "" ? undefined : Number(form.estimated_unit_cost);
    onSubmit({
      item_name: form.item_name.trim(),
      category_id: getFinalCategoryId(),
      quantity: form.quantity,
      unit: form.unit.trim(),
      estimated_unit_cost: parsedCost,
      justification: form.justification.trim(),
      urgency: form.urgency,
    });
  };

  return (
    <ModalShell title="Send for Procurement" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-stone-50 border border-stone-100 px-3 py-2">
          <p className="text-xs text-stone-500">From inventory item</p>
          <p className="text-sm font-semibold text-stone-800">{item.name}</p>
          <p className="text-xs text-stone-400">
            Currently {item.qty_available} {item.unit} · <StatusBadge status={item.status} />
          </p>
        </div>

        <div>
          <FieldLabel>Category</FieldLabel>
          <select
            value={form.category_id}
            onChange={(e) => {
              setField("category_id", e.target.value);
              setField("subcategory_id", "");
            }}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          >
            <option value="">Select category</option>
            {topLevelCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Subcategory (optional)</FieldLabel>
          <select
            value={form.subcategory_id}
            onChange={(e) => setField("subcategory_id", e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          >
            <option value="">{subcategories.length === 0 ? "No subcategories available" : "Select subcategory"}</option>
            {subcategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Quantity Needed</FieldLabel>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setField("quantity", Number(e.target.value))}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
          <div>
            <FieldLabel>Unit</FieldLabel>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setField("unit", e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Urgency</FieldLabel>
            <select
              value={form.urgency}
              onChange={(e) => setField("urgency", e.target.value as Urgency)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            >
              {URGENCY_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Est. Unit Cost (KES, optional)</FieldLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.estimated_unit_cost}
              onChange={(e) => setField("estimated_unit_cost", e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Justification</FieldLabel>
          <textarea
            value={form.justification}
            onChange={(e) => setField("justification", e.target.value)}
            rows={3}
            placeholder="Why is this procurement needed?"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !isValid}
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] transition-colors disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send for Procurement"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const ProcurementFormModal: React.FC<{
  isOpen: boolean;
  item: InventoryItem | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (input: CreateProcurementRequestInput) => void;
  loading: boolean;
}> = ({ isOpen, item, categories, onClose, onSubmit, loading }) => {
  if (!isOpen || !item) return null;

  return (
    <ProcurementFormModalBody
      key={item.id}
      item={item}
      categories={categories}
      onClose={onClose}
      onSubmit={onSubmit}
      loading={loading}
    />
  );
};

// ─── Standalone "New Request" Modal ────────────────────────────────────────────

const emptyProcurementForm = {
  item_name: "",
  category_id: "",
  subcategory_id: "",
  quantity: 1,
  unit: "",
  estimated_unit_cost: "",
  justification: "",
  urgency: "Normal" as Urgency,
};

const NewProcurementModalBody: React.FC<{
  categories: Category[];
  onClose: () => void;
  onSubmit: (input: CreateProcurementRequestInput) => void;
  loading: boolean;
}> = ({ categories, onClose, onSubmit, loading }) => {
  const topLevelCategories = useMemo(() => categories.filter(c => c.parent_id === null), [categories]);

  const [form, setForm] = useState(emptyProcurementForm);

  const subcategories = useMemo(
    () => categories.filter(c => c.parent_id === form.category_id),
    [categories, form.category_id]
  );

  const setField = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const getFinalCategoryId = useCallback(() => {
    return form.subcategory_id || form.category_id;
  }, [form.category_id, form.subcategory_id]);

  const isValid = form.item_name.trim() !== "" && 
                  form.unit.trim() !== "" && 
                  form.quantity > 0 && 
                  form.justification.trim() !== "" && 
                  form.category_id !== "" &&
                  getFinalCategoryId() !== "";

  const handleSubmit = () => {
    if (!isValid) return;
    const parsedCost = form.estimated_unit_cost.trim() === "" ? undefined : Number(form.estimated_unit_cost);
    onSubmit({
      item_name: form.item_name.trim(),
      category_id: getFinalCategoryId(),
      quantity: form.quantity,
      unit: form.unit.trim(),
      estimated_unit_cost: parsedCost,
      justification: form.justification.trim(),
      urgency: form.urgency,
    });
  };

  return (
    <ModalShell title="New Procurement Request" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel>Item Name</FieldLabel>
          <input
            type="text"
            value={form.item_name}
            onChange={(e) => setField("item_name", e.target.value)}
            placeholder="e.g. Ergonomic Office Chairs"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          />
        </div>

        <div>
          <FieldLabel>Category</FieldLabel>
          <select
            value={form.category_id}
            onChange={(e) => {
              setField("category_id", e.target.value);
              setField("subcategory_id", "");
            }}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          >
            <option value="">Select category</option>
            {topLevelCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Subcategory (optional)</FieldLabel>
          <select
            value={form.subcategory_id}
            onChange={(e) => setField("subcategory_id", e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
          >
            <option value="">{subcategories.length === 0 ? "No subcategories available" : "Select subcategory"}</option>
            {subcategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Quantity Needed</FieldLabel>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setField("quantity", Number(e.target.value))}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
          <div>
            <FieldLabel>Unit</FieldLabel>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setField("unit", e.target.value)}
              placeholder="e.g. pcs, reams, boxes"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Urgency</FieldLabel>
            <select
              value={form.urgency}
              onChange={(e) => setField("urgency", e.target.value as Urgency)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            >
              {URGENCY_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Est. Unit Cost (KES, optional)</FieldLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.estimated_unit_cost}
              onChange={(e) => setField("estimated_unit_cost", e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Justification</FieldLabel>
          <textarea
            value={form.justification}
            onChange={(e) => setField("justification", e.target.value)}
            rows={3}
            placeholder="Why is this procurement needed?"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620] resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !isValid}
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-[#1E4620] px-4 py-2 text-sm font-medium text-white hover:bg-[#163a18] transition-colors disabled:opacity-50"
          >
            {loading ? "Sending…" : "Submit Request"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const NewProcurementModal: React.FC<{
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onSubmit: (input: CreateProcurementRequestInput) => void;
  loading: boolean;
}> = ({ isOpen, categories, onClose, onSubmit, loading }) => {
  if (!isOpen) return null;
  return <NewProcurementModalBody categories={categories} onClose={onClose} onSubmit={onSubmit} loading={loading} />;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const StoreStock: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Selectors ────────────────────────────────────────────────────────────
  const items               = useAppSelector(selectInventoryItems);
  const stats                = useAppSelector(selectInventoryStats);
  const storeRequests        = useAppSelector(selectStoreRequests);
  const procurementRequests  = useAppSelector(selectProcurementRequests);
  const categories           = useAppSelector(selectCategories);
  const error                = useAppSelector(selectInventoryError);
  const success              = useAppSelector(selectInventorySuccess);
  const loadingItems         = useAppSelector(selectInventoryItemsLoading);
  const loadingStats         = useAppSelector(selectInventoryStatsLoading);
  const loadingProc          = useAppSelector(selectProcurementRequestsLoading);
  const mutating             = useAppSelector(selectInventoryMutating);
  const currentUser          = useAppSelector(selectCurrentUser);

  const canManage = hasRole(currentUser, "dept_head");
  const canApprove = hasRole(currentUser, "super_admin");
  const canIssue = canManage;
  const userId = currentUser?.id ?? null;

  // ── Refs ──────────────────────────────────────────────────────────────────
  const clearTimers = useRef<{ success?: ReturnType<typeof setTimeout>; error?: ReturnType<typeof setTimeout> }>({});

  // ── Local state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("inventory");

  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [updateStockModalOpen, setUpdateStockModalOpen] = useState(false);
  const [itemBeingUpdated, setItemBeingUpdated] = useState<InventoryItem | null>(null);

  const [procModalOpen, setProcModalOpen] = useState(false);
  const [procSourceItem, setProcSourceItem] = useState<InventoryItem | null>(null);

  const [newProcModalOpen, setNewProcModalOpen] = useState(false);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const statCards = useMemo(() => {
    if (stats) {
      return {
        total:      stats.total_items,
        inStock:    stats.in_stock,
        lowStock:   stats.low_stock,
        outOfStock: stats.out_of_stock,
      };
    }
    return {
      total:      items.length,
      inStock:    items.filter((i) => i.status === "in_stock").length,
      lowStock:   items.filter((i) => i.status === "low_stock").length,
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
  const handleOpenAddItem = useCallback(() => {
    setAddItemModalOpen(true);
  }, []);

  const handleCloseAddItemModal = useCallback(() => {
    setAddItemModalOpen(false);
  }, []);

  const handleOpenUpdateStock = useCallback((item: InventoryItem) => {
    setItemBeingUpdated(item);
    setUpdateStockModalOpen(true);
  }, []);

  const handleCloseUpdateStockModal = useCallback(() => {
    setUpdateStockModalOpen(false);
    setItemBeingUpdated(null);
  }, []);

  const handleCreateItem = useCallback(
    (input: CreateInventoryItemInput) => {
      dispatch(createInventoryItem(input))
        .unwrap()
        .then(() => {
          dispatch(fetchInventoryStats());
          handleCloseAddItemModal();
          scheduleClear("success");
        })
        .catch(() => scheduleClear("error"));
    },
    [dispatch, handleCloseAddItemModal, scheduleClear]
  );

  const handleUpdateStock = useCallback(
    (id: string, input: UpdateInventoryItemInput) => {
      if (input.qty_available !== undefined) {
        dispatch(updateItemQuantityLocally({ itemId: id, quantity: input.qty_available }));
      }

      dispatch(updateInventoryItem({ id, input }))
        .unwrap()
        .then(() => {
          dispatch(fetchInventoryStats());
          handleCloseUpdateStockModal();
          scheduleClear("success");
        })
        .catch(() => {
          dispatch(fetchInventoryItems({}));
          scheduleClear("error");
        });
    },
    [dispatch, handleCloseUpdateStockModal, scheduleClear]
  );

  const handleOpenSendForProcurement = useCallback((item: InventoryItem) => {
    setProcSourceItem(item);
    setProcModalOpen(true);
  }, []);

  const handleCloseProcModal = useCallback(() => {
    setProcModalOpen(false);
    setProcSourceItem(null);
  }, []);

  const handleSubmitProcurement = useCallback(
    (input: CreateProcurementRequestInput) => {
      dispatch(createProcurementRequest(input))
        .unwrap()
        .then(() => {
          handleCloseProcModal();
          scheduleClear("success");
        })
        .catch(() => scheduleClear("error"));
    },
    [dispatch, handleCloseProcModal, scheduleClear]
  );

  const handleIssue = useCallback(
    (id: string) => {
      if (window.confirm("Issue this item to the requester?")) {
        dispatch(issueStoreRequest(id))
          .unwrap()
          .then(() => {
            dispatch(fetchAllStoreRequests());
            dispatch(fetchInventoryStats());
            scheduleClear("success");
          })
          .catch(() => scheduleClear("error"));
      }
    },
    [dispatch, scheduleClear]
  );

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
        dispatch(updateProcurementRequest({
          id,
          input: { status: "Approved" }
        })).unwrap().then(() => {
          dispatch(fetchAllProcurementRequests());
          dispatch(fetchInventoryStats());
          scheduleClear("success");
        }).catch(() => scheduleClear("error"));
      }
    },
    [dispatch, scheduleClear]
  );

  const handleRejectRequest = useCallback(
    (id: string) => {
      const reason = window.prompt("Enter rejection reason:");
      if (reason !== null) {
        dispatch(updateProcurementRequest({
          id,
          input: { status: "Rejected", rejection_reason: reason || undefined }
        })).unwrap().then(() => {
          dispatch(fetchAllProcurementRequests());
          dispatch(fetchInventoryStats());
          scheduleClear("success");
        }).catch(() => scheduleClear("error"));
      }
    },
    [dispatch, scheduleClear]
  );

  const handleOpenNewProcurement = useCallback(() => setNewProcModalOpen(true), []);
  const handleCloseNewProcurement = useCallback(() => setNewProcModalOpen(false), []);

  const handleSubmitNewProcurement = useCallback(
    (input: CreateProcurementRequestInput) => {
      dispatch(createProcurementRequest(input))
        .unwrap()
        .then(() => {
          handleCloseNewProcurement();
          scheduleClear("success");
        })
        .catch(() => scheduleClear("error"));
    },
    [dispatch, handleCloseNewProcurement, scheduleClear]
  );

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: "inventory",   label: "Inventory",          icon: "📦", count: statCards.total },
    { key: "requests",    label: "Store Requests",     icon: "🛒", count: storeRequests.length },
    { key: "procurement", label: "Procurement",        icon: "📝", count: procurementRequests.length },
  ];

  return (
    <div className="p-6 space-y-6 bg-stone-50 min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Inventory Management</h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage stock levels, requests, and procurement
        </p>
        <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2 text-xs text-blue-700">
          <span className="font-medium">📋 Audit Note:</span> All stock updates are logged for accountability and transparency.
          Only quantity adjustments are permitted. Item details cannot be modified after creation.
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600 ml-4 shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
          <span>✓ Done</span>
          <button onClick={() => dispatch(clearSuccess())} className="text-emerald-400 hover:text-emerald-600 ml-4 shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
        <span>🧑‍💼</span>
        <span>
          You are viewing as <span className="font-semibold">Department Head</span>. You can manage inventory, create procurement requests, view all requests, and issue items.
          {!canApprove && (
            <span className="ml-1 text-amber-600">(Approvals require Super Admin)</span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Items",   value: statCards.total,      color: "text-stone-900",   loading: loadingStats },
          { label: "In Stock",      value: statCards.inStock,    color: "text-emerald-600", loading: loadingStats },
          { label: "Low Stock",     value: statCards.lowStock,   color: "text-amber-600",   loading: loadingStats },
          { label: "Out of Stock",  value: statCards.outOfStock, color: "text-red-600",     loading: loadingStats },
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
          canManage={canManage}
          onAddItem={handleOpenAddItem}
          onUpdateStock={handleOpenUpdateStock}
          onSendForProcurement={handleOpenSendForProcurement}
        />
      )}
      {activeTab === "requests" && (
        <StoreRequestsTab
          requests={storeRequests}
          loading={loadingItems}
          canIssue={canIssue}
          canReceive={true}
          userId={userId}
          onIssue={handleIssue}
          onReceive={handleReceive}
        />
      )}
      {activeTab === "procurement" && (
        <ProcurementRequestsTab
          requests={procurementRequests}
          categories={categories}
          loading={loadingProc}
          canManage={canManage}
          canApprove={canApprove}
          onNewRequest={handleOpenNewProcurement}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
        />
      )}

      <AddItemModal
        isOpen={addItemModalOpen}
        categories={categories}
        onClose={handleCloseAddItemModal}
        onCreate={handleCreateItem}
        loading={mutating}
      />

      <UpdateStockModal
        isOpen={updateStockModalOpen}
        item={itemBeingUpdated}
        onClose={handleCloseUpdateStockModal}
        onUpdate={handleUpdateStock}
        loading={mutating}
      />

      <ProcurementFormModal
        isOpen={procModalOpen}
        item={procSourceItem}
        categories={categories}
        onClose={handleCloseProcModal}
        onSubmit={handleSubmitProcurement}
        loading={mutating}
      />

      <NewProcurementModal
        isOpen={newProcModalOpen}
        categories={categories}
        onClose={handleCloseNewProcurement}
        onSubmit={handleSubmitNewProcurement}
        loading={mutating}
      />
    </div>
  );
};

export default StoreStock;