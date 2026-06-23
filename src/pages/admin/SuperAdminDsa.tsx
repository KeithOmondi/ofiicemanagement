// src/pages/admin/SuperAdminDsa.tsx
import React, { useState, useMemo, useCallback, useEffect, useReducer } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchDsaStats,
  fetchActivities,
  fetchEntries,
  fetchEquitySuggestions,
  createActivity,
  updateActivity,
  deleteActivity,
  addStaffEntry,
  updateStaffEntry,
  removeStaffEntry,
  exportCsv,
  setSelectedActivity,
  clearError,
  clearSuccess,
  selectActivities,
  selectSelectedActivity,
  selectEntries,
  selectDsaStats,
  selectEquitySuggestions,
  selectDsaError,
  selectDsaSuccess,
  selectActivitiesLoading,
  selectEntriesLoading,
  selectDsaMutating,
  selectEquityLoading,
  selectExportLoading,
  selectDsaStatsLoading,
  type DsaActivity,
  type DsaStaffEntry,
  type StaffEquitySuggestion,
} from "../../store/slices/dsaSlice";
import { selectAllUsers, fetchUsers } from "../../store/slices/userSlice";
import { format, differenceInDays } from "date-fns";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat("en-KE").format(n);

const calcNights = (from: string, to: string): number =>
  Math.max(0, differenceInDays(new Date(to), new Date(from)));

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub: string;
  accent: string;
}> = ({ icon, value, label, sub, accent }) => (
  <div className={`bg-white rounded-xl border-l-4 ${accent} p-5 flex items-start gap-4 shadow-sm`}>
    <div className="flex-shrink-0 text-2xl">{icon}</div>
    <div className="min-w-0">
      <p className="text-2xl font-bold text-stone-900 leading-none">{value}</p>
      <p className="text-sm font-semibold text-stone-700 mt-0.5">{label}</p>
      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
    </div>
  </div>
);

// ─── Equity Card ─────────────────────────────────────────────────────────────

const EquityCard: React.FC<{ rank: number; suggestion: StaffEquitySuggestion }> = ({ rank, suggestion }) => {
  const neverSent = !suggestion.last_sent;
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${
        rank === 1 ? "bg-[#1E4620]" : "bg-stone-400"
      }`}>
        {rank}
      </div>
      <p className="text-xs font-semibold text-stone-800 text-center leading-tight max-w-[100px] truncate">
        {suggestion.full_name.split(" ").slice(0, 2).join(" ")}
      </p>
      <p className="text-[10px] text-stone-500">
        {suggestion.total_nights} nights · {suggestion.total_activities} activities
      </p>
      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
        neverSent
          ? "bg-stone-100 text-stone-500 border border-stone-200"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
      }`}>
        {neverSent ? "Never sent" : "Sent"}
      </span>
    </div>
  );
};

// ─── Participation Dot ────────────────────────────────────────────────────────

const ParticipationDot: React.FC<{
  name: string;
  status: "on" | "never" | "below" | "above";
}> = ({ name, status }) => {
  const colors = {
    on:    "bg-emerald-500",
    never: "bg-stone-300",
    below: "bg-amber-400",
    above: "bg-blue-500",
  };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-stone-700">
      <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />
      {name}
      <span className="text-stone-400 capitalize">
        {status === "on" ? "On" : status === "never" ? "Never sent" : status}
      </span>
    </span>
  );
};

// ─── Step Badge ───────────────────────────────────────────────────────────────

const StepBadge: React.FC<{ step: number; label: string; active: boolean; done: boolean }> = ({
  step, label, active, done,
}) => (
  <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${
    done ? "text-emerald-600" : active ? "text-[#1E4620]" : "text-stone-400"
  }`}>
    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
      done
        ? "bg-emerald-500 text-white"
        : active
          ? "bg-[#1E4620] text-white"
          : "bg-stone-200 text-stone-400"
    }`}>
      {done ? "✓" : step}
    </span>
    {label}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminDsa: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── Redux Selectors ──────────────────────────────────────────────────────────
  const activities        = useAppSelector(selectActivities);
  const selected          = useAppSelector(selectSelectedActivity);
  const entries           = useAppSelector(selectEntries);
  const stats             = useAppSelector(selectDsaStats);
  const equity            = useAppSelector(selectEquitySuggestions);
  const users             = useAppSelector(selectAllUsers);
  const error             = useAppSelector(selectDsaError);
  const success           = useAppSelector(selectDsaSuccess);
  const loadingActivities = useAppSelector(selectActivitiesLoading);
  const loadingEntries    = useAppSelector(selectEntriesLoading);
  const loadingStats      = useAppSelector(selectDsaStatsLoading);
  const loadingEquity     = useAppSelector(selectEquityLoading);
  const mutating          = useAppSelector(selectDsaMutating);
  const loadingExport     = useAppSelector(selectExportLoading);

  // ── Local UI State ───────────────────────────────────────────────────────────
  const [showEquity,  setShowEquity]  = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Form state via useReducer ────────────────────────────────────────────────
  // All form fields are managed together so we can reset them atomically without
  // triggering a cascade of individual setState calls inside a useEffect.
  //
  // The key insight: when `selected` changes we DON'T sync inside an effect.
  // Instead we pass `selected` as the `initialArg` to useReducer and use a
  // "RESET" action dispatched from event handlers (handleSelectActivity,
  // handleResetForm) that already run outside the render phase.

  type FormState = {
    activity:     string;
    dateFrom:     string;
    dateTo:       string;
    selectedUser: string;
    rate:         number;
    editingEntryId: string | null;
  };

  type FormAction =
    | { type: "SET_ACTIVITY";      value: string }
    | { type: "SET_DATE_FROM";     value: string }
    | { type: "SET_DATE_TO";       value: string }
    | { type: "SET_USER";          value: string }
    | { type: "SET_RATE";          value: number }
    | { type: "SET_EDITING_ENTRY"; value: string; rate: number; userId: string }
    | { type: "CLEAR_STAFF" }
    | { type: "RESET";             activity: DsaActivity | null };

  const formReducer = (state: FormState, action: FormAction): FormState => {
    switch (action.type) {
      case "SET_ACTIVITY":
        return { ...state, activity: action.value };
      case "SET_DATE_FROM":
        return { ...state, dateFrom: action.value };
      case "SET_DATE_TO":
        return { ...state, dateTo: action.value };
      case "SET_USER":
        return { ...state, selectedUser: action.value };
      case "SET_RATE":
        return { ...state, rate: action.value };
      case "SET_EDITING_ENTRY":
        return { ...state, editingEntryId: action.value, rate: action.rate, selectedUser: action.userId };
      case "CLEAR_STAFF":
        return { ...state, selectedUser: "", rate: 4000, editingEntryId: null };
      case "RESET":
        return {
          activity:       action.activity?.name      ?? "",
          dateFrom:       action.activity?.date_from ?? "",
          dateTo:         action.activity?.date_to   ?? "",
          selectedUser:   "",
          rate:           4000,
          editingEntryId: null,
        };
    }
  };

  const [form, formDispatch] = useReducer(formReducer, {
    activity:       selected?.name      ?? "",
    dateFrom:       selected?.date_from ?? "",
    dateTo:         selected?.date_to   ?? "",
    selectedUser:   "",
    rate:           4000,
    editingEntryId: null,
  });

  // ── Derived calculations ─────────────────────────────────────────────────────
  const formNights = form.dateFrom && form.dateTo ? calcNights(form.dateFrom, form.dateTo) : 0;
  const formTotal  = formNights * form.rate;

  const editingEntry = useMemo(
    () => (form.editingEntryId ? entries.find((e) => e.id === form.editingEntryId) ?? null : null),
    [form.editingEntryId, entries],
  );

  const averageNights = useMemo(() => {
    if (equity.length === 0) return 0;
    return equity.reduce((s, p) => s + p.total_nights, 0) / equity.length;
  }, [equity]);

  // ── Workflow state ───────────────────────────────────────────────────────────
  const activityFormFilled =
    form.activity.trim() !== "" && form.dateFrom !== "" && form.dateTo !== "";
  const activitySaved = selected !== null;
  const activityHasChanges =
    activitySaved && (
      form.activity !== selected!.name      ||
      form.dateFrom !== selected!.date_from  ||
      form.dateTo   !== selected!.date_to
    );

  // ── Initial Data Fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchDsaStats());
    dispatch(fetchActivities());
    dispatch(fetchEquitySuggestions());
    // Fetch enough users to fill the dropdown; adjust limit if needed
    dispatch(fetchUsers({ page: 1, limit: 100 }));
  }, [dispatch]);

  // ── Load entries when activity selected ──────────────────────────────────────
  useEffect(() => {
    if (selected) {
      dispatch(fetchEntries(selected.id));
    }
  }, [selected, dispatch]);

  // ── Clear success message ─────────────────────────────────────────────────────
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => dispatch(clearSuccess()), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, dispatch]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleResetForm = useCallback(() => {
    dispatch(setSelectedActivity(null));
    dispatch(clearError());
    dispatch(setSelectedActivity(null));
    formDispatch({ type: "RESET", activity: null });
  }, [dispatch]);

  const handleEditEntry = useCallback((entry: DsaStaffEntry) => {
    formDispatch({ type: "SET_EDITING_ENTRY", value: entry.id, rate: entry.rate_per_night, userId: entry.user_id });
  }, []);

  const handleSelectActivity = useCallback(
    (activity: DsaActivity | null) => {
      // Reset form synchronously in the event handler — safe, not inside an effect
      formDispatch({ type: "RESET", activity });
      dispatch(setSelectedActivity(activity));
    },
    [dispatch],
  );

  const handleCreateOrUpdateActivity = useCallback(async (): Promise<DsaActivity | null> => {
    if (!activityFormFilled) return null;
    try {
      if (selected) {
        const result = await dispatch(updateActivity({
          id:    selected.id,
          input: { name: form.activity, date_from: form.dateFrom, date_to: form.dateTo },
        })).unwrap();
        await dispatch(fetchEntries(selected.id)).unwrap();
        await dispatch(fetchDsaStats()).unwrap();
        await dispatch(fetchActivities()).unwrap();
        return result;
      } else {
        const result = await dispatch(createActivity({
          name:      form.activity,
          date_from: form.dateFrom,
          date_to:   form.dateTo,
        })).unwrap();
        dispatch(setSelectedActivity(result));
        await dispatch(fetchDsaStats()).unwrap();
        await dispatch(fetchActivities()).unwrap();
        return result;
      }
    } catch (err) {
      console.error("Error creating/updating activity:", err);
      return null;
    }
  }, [activityFormFilled, form.activity, form.dateFrom, form.dateTo, selected, dispatch]);

  const handleAddStaff = useCallback(async () => {
    if (!form.selectedUser || !activityFormFilled) return;

    let targetActivity = selected;

    if (!targetActivity) {
      targetActivity = await handleCreateOrUpdateActivity();
      if (!targetActivity) return;
    }

    try {
      if (editingEntry) {
        await dispatch(updateStaffEntry({
          activityId: targetActivity.id,
          entryId:    editingEntry.id,
          input:      { rate_per_night: form.rate },
        })).unwrap();
      } else {
        await dispatch(addStaffEntry({
          activityId: targetActivity.id,
          input:      { user_id: form.selectedUser, rate_per_night: form.rate },
        })).unwrap();
      }

      await dispatch(fetchEntries(targetActivity.id)).unwrap();
      await dispatch(fetchDsaStats()).unwrap();
      await dispatch(fetchEquitySuggestions()).unwrap();

      // Reset staff fields only — activity fields stay intact
      formDispatch({ type: "CLEAR_STAFF" });
    } catch (err) {
      console.error("Error adding/updating staff:", err);
    }
  }, [
    selected,
    form.selectedUser,
    form.rate,
    activityFormFilled,
    editingEntry,
    handleCreateOrUpdateActivity,
    dispatch,
  ]);

  const handleDeleteActivity = useCallback(
    async (activityId: string, activityName: string) => {
      if (!window.confirm(`Delete activity "${activityName}"?`)) return;
      try {
        await dispatch(deleteActivity(activityId)).unwrap();
        if (selected?.id === activityId) {
          dispatch(setSelectedActivity(null));
          formDispatch({ type: "RESET", activity: null });
        }
        await dispatch(fetchActivities()).unwrap();
        await dispatch(fetchDsaStats()).unwrap();
      } catch (err) {
        console.error("Error deleting activity:", err);
      }
    },
    [dispatch, selected],
  );

  const handleRemoveStaffEntry = useCallback(
    async (entryId: string) => {
      if (!selected || !window.confirm("Remove this staff member from the activity?")) return;
      try {
        await dispatch(removeStaffEntry({ activityId: selected.id, entryId })).unwrap();
        await dispatch(fetchEntries(selected.id)).unwrap();
        await dispatch(fetchDsaStats()).unwrap();
      } catch (err) {
        console.error("Error removing staff entry:", err);
      }
    },
    [selected, dispatch],
  );

  const handleExportCsv = useCallback(() => {
    dispatch(exportCsv());
  }, [dispatch]);

  // ── Filtered entries ──────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.activity_name.toLowerCase().includes(q),
    );
  }, [entries, searchQuery]);

  const participationStatus = useCallback(
    (p: StaffEquitySuggestion): "on" | "never" | "below" | "above" => {
      if (!p.last_sent || p.total_nights === 0) return "never";
      if (p.total_nights < averageNights)        return "below";
      if (p.total_nights > averageNights * 1.5)  return "above";
      return "on";
    },
    [averageNights],
  );

  // ── Loading state ─────────────────────────────────────────────────────────────
  const isLoading =
    loadingActivities || loadingStats || (loadingEntries && entries.length === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-stone-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-stone-500">Loading DSA data...</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden bg-stone-50">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
        <div>
          <h1 className="text-lg font-bold text-stone-900 tracking-tight">DSA Tracker</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Daily Subsistence Allowance — activity and expenditure log
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={loadingExport || entries.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {loadingExport ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── Error / Success ──────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => dispatch(clearError())} className="text-red-400 hover:text-red-600 ml-3">✕</button>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
            <span>✓ Operation completed successfully</span>
            <button onClick={() => dispatch(clearSuccess())} className="text-emerald-400 hover:text-emerald-600 ml-3">✕</button>
          </div>
        )}

        {/* ── Stat Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={<span className="text-emerald-500">📋</span>}
            value={stats?.total_activities ?? 0}
            label="Total Activities"
            sub={`${stats?.total_activities ?? 0} ${stats?.total_activities === 1 ? "activity" : "activities"}`}
            accent="border-emerald-500"
          />
          <StatCard
            icon={<span className="text-amber-400">🌙</span>}
            value={stats?.total_night_outs ?? 0}
            label="Total Night Outs"
            sub="Across all records"
            accent="border-amber-400"
          />
          <StatCard
            icon={<span className="text-violet-400">👥</span>}
            value={stats?.staff_involved ?? 0}
            label="Staff Involved"
            sub="Unique individuals"
            accent="border-violet-400"
          />
          <StatCard
            icon={<span className="text-rose-400">💰</span>}
            value={`KES ${fmt(stats?.total_kes_payable ?? 0)}`}
            label="Total DSA Payable"
            sub="All staff combined"
            accent="border-rose-400"
          />
        </div>

        {/* ── Main Body ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">

          {/* ── Left — Form ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">

            {/* Form header with workflow steps */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50">
              <span className="text-base text-rose-500">✏️</span>
              <span className="text-sm font-semibold text-stone-800 mr-2">
                {editingEntry ? "Edit Entry" : selected ? "Add Staff Entry" : "New Activity"}
              </span>
              {/* Step indicators */}
              <div className="flex items-center gap-2 ml-auto">
                <StepBadge step={1} label="Activity" active={!activitySaved} done={activitySaved} />
                <span className="text-stone-300 text-xs">›</span>
                <StepBadge step={2} label="Staff"    active={activitySaved} done={false} />
              </div>
            </div>

            <div className="p-4 space-y-4">

              {/* ── Step 1: Activity details ─────────────────────────────── */}
              <div className="rounded-lg border border-stone-200 bg-stone-50/60 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                    Activity Details{" "}
                    <span className="text-stone-400 normal-case font-normal">
                      — {selected ? "saved ✓" : "not saved yet"}
                    </span>
                  </p>
                  {/* Visual cue that activity details are locked once saved and unchanged */}
                  {activitySaved && !activityHasChanges && (
                    <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2 py-0.5 font-semibold">
                      Saved
                    </span>
                  )}
                  {activityHasChanges && (
                    <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">
                      Unsaved changes
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1.5">
                    Activity / Event
                  </label>
                  <input
                    type="text"
                    value={form.activity}
                    onChange={(e) => formDispatch({ type: "SET_ACTIVITY", value: e.target.value })}
                    placeholder="e.g. Spot Check, Training..."
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white focus:border-[#1E4620] focus:outline-none focus:ring-1 focus:ring-[#1E4620]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1.5">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={form.dateFrom}
                      onChange={(e) => formDispatch({ type: "SET_DATE_FROM", value: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white focus:border-[#1E4620] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1.5">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={form.dateTo}
                      onChange={(e) => formDispatch({ type: "SET_DATE_TO", value: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white focus:border-[#1E4620] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-stone-500 uppercase mb-1.5">
                    Night Outs —{" "}
                    <span className="text-stone-400 normal-case font-normal">Auto-calculated</span>
                  </label>
                  <div className="w-full rounded-lg border border-stone-100 bg-white px-3 py-2 text-sm text-stone-700 font-semibold">
                    {formNights}
                  </div>
                </div>

                {/* Save / Update activity button — inside the activity block */}
                {activityFormFilled && (
                  <button
                    onClick={handleCreateOrUpdateActivity}
                    disabled={mutating || (activitySaved && !activityHasChanges)}
                    className="w-full rounded-lg border border-[#1E4620] px-4 py-2 text-xs font-semibold text-[#1E4620] hover:bg-[#1E4620]/5 transition-colors disabled:opacity-40"
                  >
                    {mutating
                      ? "Saving..."
                      : activitySaved
                        ? activityHasChanges ? "Update Activity" : "Activity Saved ✓"
                        : "Create Activity"}
                  </button>
                )}
              </div>

              {/* ── Step 2: Staff member & rate ──────────────────────────── */}
              {activityFormFilled && (
                <div className="border-t border-stone-100 pt-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">
                      Staff Member &amp; Rate
                    </p>
                    {!activitySaved && (
                      <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                        Activity will be created automatically
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="block text-[10px] text-stone-500 mb-1.5">Name of Staff</label>
                    <select
                      value={form.selectedUser}
                      onChange={(e) => formDispatch({ type: "SET_USER", value: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
                    >
                      <option value="">— Select staff member —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1.5">
                        DSA Rate (KES/night)
                      </label>
                      <input
                        type="number"
                        value={form.rate}
                        onChange={(e) => formDispatch({ type: "SET_RATE", value: Number(e.target.value) })}
                        min={0}
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#1E4620] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1.5">
                        Total (KES) — <span className="text-stone-400">Auto</span>
                      </label>
                      <div className="w-full rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700">
                        {fmt(formTotal)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleAddStaff}
                    disabled={mutating || !form.selectedUser}
                    className="w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C29B38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a8832e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {mutating ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {editingEntry ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {editingEntry ? "Update Entry" : "Add Staff to Activity"}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── Reset ────────────────────────────────────────────────── */}
              <div className="pt-1">
                <button
                  onClick={handleResetForm}
                  disabled={mutating}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50 transition-colors disabled:opacity-40"
                >
                  ✕ Reset All
                </button>
              </div>
            </div>
          </div>

          {/* ── Right — Records ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">

              {/* Records header */}
              <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <span className="text-sm font-semibold text-stone-800">
                    {selected ? `Entries: ${selected.name}` : "DSA Records"}
                  </span>
                  {selected && (
                    <span className="text-[10px] text-stone-400">
                      {entries.length} {entries.length === 1 ? "entry" : "entries"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-lg border border-stone-200 bg-stone-50 pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#1E4620] w-36"
                    />
                    <svg
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button
                    onClick={() => setShowEquity((v) => !v)}
                    disabled={loadingEquity}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-40"
                  >
                    👥 {loadingEquity ? "Loading..." : "Suggest Team"}
                  </button>
                </div>
              </div>

              {/* Equity panel */}
              {showEquity && equity.length > 0 && (
                <div className="border-b border-stone-100 bg-amber-50/40 px-4 py-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div>
                      <p className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                        🤝 Equity-Based Team Suggestion
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        Staff ranked by nights away — those with fewest DSA days are prioritised for
                        the next activity. Average: {averageNights.toFixed(1)} nights.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowEquity(false)}
                      className="text-[10px] text-stone-400 hover:text-stone-600 whitespace-nowrap"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div className="flex items-start gap-4 overflow-x-auto pb-1">
                    {equity.slice(0, 8).map((s, i) => (
                      <EquityCard key={s.user_id} rank={i + 1} suggestion={s} />
                    ))}
                  </div>
                </div>
              )}

              {/* Participation overview */}
              {equity.length > 0 && (
                <div className="px-4 py-3 border-b border-stone-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Full Participation Overview — All {equity.length} Staff
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {equity.map((p) => (
                      <ParticipationDot
                        key={p.user_id}
                        name={p.full_name.split(" ")[0] ?? p.full_name}
                        status={participationStatus(p)}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100">
                    {[
                      { color: "bg-stone-300",   label: "Never sent" },
                      { color: "bg-amber-400",   label: "Below average" },
                      { color: "bg-emerald-500", label: "Average" },
                      { color: "bg-blue-500",    label: "Above avg ×1.5" },
                    ].map(({ color, label }) => (
                      <span key={label} className="inline-flex items-center gap-1.5 text-[10px] text-stone-500">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Records table */}
              <div className="overflow-x-auto">
                {loadingEntries && entries.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1E4620] border-t-transparent" />
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50">
                        {["Activity", "Staff Member", "From", "To", "Nights", "Rate (KES)", "Total (KES)", "Actions"].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-[10px] font-bold tracking-widest text-stone-500 uppercase whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-stone-400 text-sm">
                            {selected
                              ? "No staff added to this activity yet."
                              : "Select an activity from the list or create a new one."}
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry) => {
                          const activity = activities.find((a) => a.id === entry.activity_id);
                          return (
                            <tr key={entry.id} className="hover:bg-stone-50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-stone-800">{entry.activity_name}</p>
                                <p className="text-stone-400 text-[10px] mt-0.5">
                                  {activity
                                    ? `${activity.date_from} → ${activity.date_to}`
                                    : "—"}{" · "}
                                  {entry.night_outs} nights
                                </p>
                              </td>
                              <td className="px-4 py-3 font-medium text-stone-700">{entry.full_name}</td>
                              <td className="px-4 py-3 text-stone-500">
                                {activity?.date_from
                                  ? format(new Date(activity.date_from), "yyyy-MM-dd")
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-stone-500">
                                {activity?.date_to
                                  ? format(new Date(activity.date_to), "yyyy-MM-dd")
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-stone-800">{entry.night_outs}</td>
                              <td className="px-4 py-3 text-stone-600">{fmt(entry.rate_per_night)}</td>
                              <td className="px-4 py-3 font-bold text-stone-900">{fmt(entry.total_kes)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditEntry(entry)}
                                    disabled={mutating}
                                    className="rounded p-1 text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-40"
                                    title="Edit entry"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleRemoveStaffEntry(entry.id)}
                                    disabled={mutating}
                                    className="rounded p-1 text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                                    title="Remove entry"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {filteredEntries.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-stone-200 bg-stone-50">
                          <td colSpan={4} className="px-4 py-3 text-xs font-bold text-stone-600 uppercase tracking-wider">
                            Total — {filteredEntries.length} {filteredEntries.length === 1 ? "record" : "records"}
                          </td>
                          <td className="px-4 py-3 font-bold text-stone-900">
                            {filteredEntries.reduce((s, e) => s + e.night_outs, 0)}
                          </td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 font-bold text-stone-900">
                            {fmt(filteredEntries.reduce((s, e) => s + e.total_kes, 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>
            </div>

            {/* Activities list */}
            {activities.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-700 uppercase tracking-widest">
                    All Activities
                  </span>
                  <span className="text-xs text-stone-400">{activities.length} total</span>
                </div>
                <div className="divide-y divide-stone-50 max-h-48 overflow-y-auto">
                  {activities.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => handleSelectActivity(a)}
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                        selected?.id === a.id
                          ? "bg-[#1E4620]/5 border-l-2 border-[#1E4620]"
                          : "hover:bg-stone-50 border-l-2 border-transparent"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-stone-800">{a.name}</p>
                        <p className="text-[10px] text-stone-400">
                          {format(new Date(a.date_from), "dd MMM")} –{" "}
                          {format(new Date(a.date_to), "dd MMM yyyy")}
                          {" · "}{a.night_outs} nights · {a.staff_count} staff
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-stone-900">KES {fmt(a.total_kes)}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteActivity(a.id, a.name);
                          }}
                          disabled={mutating}
                          className="text-[10px] text-red-400 hover:text-red-600 mt-0.5 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDsa;