import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchCourtsWithSupport,
  selectAllCourts,
  selectCourtIsLoading,
  selectCourtError,
} from '../../store/slices/successionCourts.slice';
import {
  createReport,
  selectIsSubmitting,
  selectError as selectReportError,
} from '../../store/slices/stationEngagement.slice';
import type { SuccessionCourtWithUser, SuccessionCourtCategory } from '../../types/succession-courts';
import type {
  EngagementInput,
  EscalationItemInput,
  CreateEngagementReportPayload,
  Urgency,
  EngagementMode,
  EngagementStatus,
  ReasonNotReached,
} from '../../types/station-engagement.types';
import type { SerializedError } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

// ============================================================
// src/pages/staff/RegistryNewReport.tsx
//
// Weekly Station Engagement Report — Sections A through F.
//
// This component now connects to the Redux store using the
// stationEngagement slice. The handleSave function dispatches
// createReport with the properly formatted payload.
// ============================================================

const MODES: EngagementMode[] = ['phone_call', 'whatsapp', 'email', 'physical_visit', 'webinar_followup', 'video_call'];
const STATUSES: EngagementStatus[] = ['resolved', 'ongoing', 'escalated'];
const URGENCIES: Urgency[] = ['high', 'medium', 'low'];
const REASONS: ReasonNotReached[] = ['no_response', 'wrong_contact', 'station_closed', 'staff_unavailable', 'technical_issues', 'other'];

interface Engagement {
  id: string;
  courtId: string; // FK into successionCourts — '' until a station is picked
  station: string; // denormalized court.station, filled on select for display
  category: SuccessionCourtCategory | '';
  date: string;
  contact: string;
  role: string; // contact role
  mode: EngagementMode | '';
  issue: string; // issues_raised as comma-separated or newline-separated
  status: EngagementStatus | '';
  action: string;
  followup: string;
  why: string;
  urgency: Urgency | '';
}

interface NotReached {
  courtId: string;
  station: string;
  category: SuccessionCourtCategory | '';
  reason: ReasonNotReached | '';
  reasonDetail: string; // free text for 'other'
  plannedDate: string;
}

interface EscalationItem {
  id: string;
  station: string; // free text — not necessarily one of the officer's assigned courts
  issue: string;
  why: string;
  action: string;
  urgency: Urgency | '';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const todayMonday = (offsetWeeks = 0): string => {
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMon + offsetWeeks * 7);
  return d.toISOString().slice(0, 10);
};

const fridayOf = (mondayISO: string): string => {
  const d = new Date(mondayISO);
  d.setDate(d.getDate() + 4);
  return d.toISOString().slice(0, 10);
};

const fmtDate = (iso: string): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const CATEGORY_BADGE_CLASSES: Record<SuccessionCourtCategory, string> = {
  A: 'bg-purple-100 text-purple-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-rose-100 text-rose-800',
};

const STATUS_LABELS: Record<EngagementStatus, string> = {
  resolved: 'Resolved',
  ongoing: 'Ongoing',
  escalated: 'Escalated',
};

const MODE_LABELS: Record<EngagementMode, string> = {
  phone_call: 'Phone Call',
  whatsapp: 'WhatsApp',
  email: 'Email',
  physical_visit: 'Physical Visit',
  webinar_followup: 'Webinar Follow-up',
  video_call: 'Video Call',
};

const URGENCY_LABELS: Record<Urgency, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// ─── Component ──────────────────────────────────────────────────────────────

const RegistryNewReport: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const courts = useAppSelector(selectAllCourts);
  const isLoadingCourts = useAppSelector(selectCourtIsLoading);
  const courtError = useAppSelector(selectCourtError);
  const isSubmitting = useAppSelector(selectIsSubmitting);
  const submitError = useAppSelector(selectReportError);

  // ─── Fetch the courts assigned to this officer ───────────────────────────
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchCourtsWithSupport({ support_person_id: user.id }));
    }
  }, [dispatch, user?.id]);

  const myCourts: SuccessionCourtWithUser[] = courts;

  const [weekKey, setWeekKey] = useState<string>(todayMonday());
  const [execSummary, setExecSummary] = useState<string>('');
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [notReached, setNotReached] = useState<NotReached[]>([]);
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [patterns, setPatterns] = useState<string>('');
  const [priorities, setPriorities] = useState<string>('');
  const [saveMsg, setSaveMsg] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  const engagedCourtIds = useMemo(
    () => new Set(engagements.map((e) => e.courtId).filter(Boolean)),
    [engagements]
  );
  const notReachedAuto = useMemo(
    () => myCourts.filter((c) => !engagedCourtIds.has(c.id)),
    [myCourts, engagedCourtIds]
  );

  // ─── Engagement row handlers ─────────────────────────────────────────────

  const addEngRow = () => {
    setEngagements((prev) => [
      ...prev,
      {
        id: uid(), courtId: '', station: '', category: '', date: weekKey, contact: '', role: '',
        mode: '', issue: '', status: '', action: '', followup: '', why: '', urgency: '',
      },
    ]);
  };

  const removeEngRow = (id: string) => {
    setEngagements((prev) => prev.filter((e) => e.id !== id));
  };

  const updEng = <K extends keyof Engagement>(id: string, field: K, value: Engagement[K]) => {
    setEngagements((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const selectEngCourt = (id: string, courtId: string) => {
    const court = myCourts.find((c) => c.id === courtId);
    setEngagements((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, courtId, station: court?.station ?? '', category: court?.category ?? '' }
          : e
      )
    );
  };

  // ─── Not-reached handlers ────────────────────────────────────────────────

  const getNotReached = (courtId: string, station: string, category: SuccessionCourtCategory): NotReached =>
    notReached.find((n) => n.courtId === courtId) ?? { 
      courtId, 
      station, 
      category,
      reason: '', 
      reasonDetail: '',
      plannedDate: '' 
    };

  const updNotReached = (
    courtId: string, 
    station: string, 
    category: SuccessionCourtCategory,
    field: keyof Omit<NotReached, 'courtId' | 'station' | 'category'>, 
    value: string
  ) => {
    setNotReached((prev) => {
      const existing = prev.find((n) => n.courtId === courtId);
      if (existing) {
        return prev.map((n) => (n.courtId === courtId ? { ...n, [field]: value } : n));
      }
      return [...prev, { courtId, station, category, reason: '', reasonDetail: '', plannedDate: '', [field]: value }];
    });
  };

  // ─── Escalation row handlers ─────────────────────────────────────────────

  const addEscRow = () => {
    setEscalations((prev) => [...prev, { id: uid(), station: '', issue: '', why: '', action: '', urgency: '' }]);
  };

  const removeEscRow = (id: string) => {
    setEscalations((prev) => prev.filter((e) => e.id !== id));
  };

  const updEsc = <K extends keyof EscalationItem>(id: string, field: K, value: EscalationItem[K]) => {
    setEscalations((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  // ─── Build payload and save ──────────────────────────────────────────────

// ─── Build payload and save ──────────────────────────────────────────────

const buildPayload = (): CreateEngagementReportPayload => {
  console.log('🔍 Building payload...');
  console.log('📊 Engagements:', engagements);
  console.log('📊 Not Reached:', notReached);
  console.log('📊 Escalations:', escalations);
  console.log('📊 My Courts:', myCourts.length);

  // Get unique categories from engagements
  const categories = new Set<SuccessionCourtCategory>();
  engagements.forEach(e => {
    if (e.category) categories.add(e.category as SuccessionCourtCategory);
  });
  // Also check not reached stations
  notReached.forEach(n => {
    if (n.category) categories.add(n.category);
  });

  // If no categories found, default to courts' categories
  if (categories.size === 0 && myCourts.length > 0) {
    myCourts.forEach(c => {
      categories.add(c.category);
    });
  }

  console.log('📂 Categories:', Array.from(categories));

  // Build engagements array
  const engagementInputs: EngagementInput[] = engagements
    .filter(e => e.courtId && e.station && e.mode && e.status)
    .map(e => {
      const issues = e.issue 
        ? e.issue.split(/[,\n]/).map(s => s.trim()).filter(Boolean) 
        : ['No specific issues raised'];
      
      return {
        station_id: e.courtId,
        station_name: e.station,
        station_category: e.category as SuccessionCourtCategory || 'A',
        date: e.date || weekKey,
        contact_person: e.contact || '',
        contact_role: e.role || undefined,
        mode: e.mode as EngagementMode,
        status: e.status as EngagementStatus,
        follow_up_date: e.followup || undefined,
        issues_raised: issues,
        action_taken: e.action || '',
        resolution: e.status === 'resolved' ? e.action || undefined : undefined,
        urgency: e.status === 'escalated' ? (e.urgency as Urgency || undefined) : undefined,
        why_needs_escalation: e.status === 'escalated' ? e.why || undefined : undefined,
      };
    });

  console.log('📋 Engagement Inputs:', engagementInputs.length);

  // Build unengaged stations array - ADD CATEGORY FIELD
  const unengagedInputs = notReachedAuto.map(c => {
    const nr = getNotReached(c.id, c.station, c.category);
    return {
      station_id: c.id,
      category: c.category, // ← ADD THIS - required by backend
      reason_not_reached: nr.reason || undefined,
      reason_not_reached_detail: nr.reason === 'other' ? nr.reasonDetail || undefined : undefined,
      planned_engagement_date: nr.plannedDate || undefined,
    };
  });

  console.log('📋 Unengaged Inputs:', unengagedInputs.length);

  // Build escalations array - FIX station_id
  const escalationInputs: EscalationItemInput[] = escalations
    .filter(e => e.station && e.issue && e.why && e.urgency)
    .map(e => {
      // Try to find a matching court by station name
      const matchingCourt = myCourts.find(c => 
        c.station.toLowerCase().includes(e.station.toLowerCase()) || 
        e.station.toLowerCase().includes(c.station.toLowerCase())
      );
      
      return {
        station_id: matchingCourt?.id || '00000000-0000-0000-0000-000000000000', // Use placeholder UUID
        station_name: e.station,
        issue: e.issue,
        why_needs_escalation: e.why,
        recommended_action: e.action || '',
        urgency: e.urgency as Urgency,
        source_engagement_id: null,
      };
    });

  console.log('📋 Escalation Inputs:', escalationInputs.length);

  const payload: CreateEngagementReportPayload = {
    week_start: weekKey,
    week_end: fridayOf(weekKey),
    categories: Array.from(categories).length > 0 ? Array.from(categories) : ['A'],
    support_person_id: user?.id || '',
    total_stations_assigned: myCourts.length,
    executive_summary: execSummary || 'No executive summary provided',
    engagements: engagementInputs,
    unengaged_stations: unengagedInputs,
    escalations: escalationInputs,
    additional_issues: '',
    recurring_patterns: patterns || '',
    priorities: priorities || '',
  };

  console.log('📦 Final Payload:', JSON.stringify(payload, null, 2));
  return payload;
};

  // ─── Error response type ──────────────────────────────────────────────────

  interface ErrorResponse {
    message?: string;
    errors?: Record<string, string | string[]>;
    statusCode?: number;
  }

  const handleSave = async () => {
    setSaveMsg('');
    setSaveError('');

    console.log('🚀 Starting save...');
    console.log('👤 User:', user?.id);

    // Validation
    if (!user?.id) {
      const msg = 'User not authenticated. Please log in again.';
      console.error('❌', msg);
      setSaveError(msg);
      return;
    }

    if (myCourts.length === 0) {
      const msg = 'No courts assigned to you. Cannot create a report.';
      console.error('❌', msg);
      setSaveError(msg);
      return;
    }

    // Check if there are any engagements or unengaged stations
    const hasValidEngagements = engagements.some(e => e.courtId && e.mode && e.status);
    if (!hasValidEngagements && notReachedAuto.length === 0) {
      const msg = 'Please add at least one engagement or acknowledge unengaged stations.';
      console.error('❌', msg);
      setSaveError(msg);
      return;
    }

    // Validate escalated engagements
    const invalidEscalations = engagements.filter(e => 
      e.status === 'escalated' && (!e.urgency || !e.why)
    );
    if (invalidEscalations.length > 0) {
      const msg = `Please provide urgency and reason for ${invalidEscalations.length} escalated engagement(s).`;
      console.error('❌', msg);
      setSaveError(msg);
      return;
    }

    try {
      const payload = buildPayload();
      console.log('📤 Sending to API...');
      
      const result = await dispatch(createReport(payload)).unwrap();
      console.log('✅ Success! Report created:', result);
      
      setSaveMsg(`✓ Report submitted successfully! ID: ${result.id.slice(0, 8)}`);
      
      // Optionally reset form or navigate to view
      // navigate(`/staff/reports/${result.id}`);
    } catch (err: unknown) {
      console.error('❌ Save error - Full error:', err);
      
      // Type guard for Axios error
      const isAxiosError = (error: unknown): error is AxiosError<ErrorResponse> => {
        return typeof error === 'object' && error !== null && 'isAxiosError' in error && (error as AxiosError).isAxiosError === true;
      };

      // Type guard for SerializedError
      const isSerializedError = (error: unknown): error is SerializedError => {
        return typeof error === 'object' && error !== null && 'message' in error;
      };

      if (isAxiosError(err) && err.response) {
        console.error('📄 Response data:', err.response.data);
        console.error('📊 Response status:', err.response.status);
        console.error('📋 Response headers:', err.response.headers);
        
        const errorData = err.response.data;
        let errorMessage = 'Failed to save report. ';
        
        if (errorData?.message) {
          errorMessage += errorData.message;
        } else if (errorData?.errors) {
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, msgs]) => {
              const messages = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
              return `${field}: ${messages}`;
            })
            .join('; ');
          errorMessage += `Validation errors: ${errorMessages}`;
        } else {
          errorMessage += `Server error: ${err.response.status} - ${err.response.statusText}`;
        }
        
        setSaveError(errorMessage);
      } else if (isAxiosError(err) && err.request) {
        console.error('📄 No response received:', err.request);
        setSaveError('No response from server. Please check your connection.');
      } else if (isSerializedError(err)) {
        setSaveError(err.message || 'Failed to save report. Please try again.');
      } else if (err instanceof Error) {
        setSaveError(err.message || 'Failed to save report. Please try again.');
      } else {
        setSaveError('An unknown error occurred. Please try again.');
      }
    }
  };

  // ─── Loading / error states for the courts fetch ─────────────────────────

  if (isLoadingCourts && courts.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent" />
      </div>
    );
  }

  if (courtError) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          Failed to load your assigned courts: {courtError}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-lg font-bold text-[#1E4620] m-0">Weekly Station Engagement Report</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-stone-700">Reporting Week (Monday)</label>
            <input
              type="date"
              value={weekKey}
              onChange={(e) => setWeekKey(e.target.value)}
              className="border border-stone-300 rounded-md px-2 py-1 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-stone-500 mb-5">
          Monday {fmtDate(weekKey)} to Friday {fmtDate(fridayOf(weekKey))} · {myCourts.length} court(s) assigned to you
        </p>

        {myCourts.length === 0 && (
          <div className="mb-5 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
            No succession courts are currently assigned to you. Station selection and gap detection below will be
            empty until courts are assigned via the support person workflow.
          </div>
        )}

        {/* A. Executive Summary */}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-4 mb-2">
          A. Executive Summary
        </h3>
        <textarea
          value={execSummary}
          onChange={(e) => setExecSummary(e.target.value)}
          rows={3}
          placeholder="Overall picture for the week..."
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm"
        />

        {/* B. Station Engagement Log */}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
          B. Station Engagement Log
        </h3>
        <p className="text-xs text-stone-500 mb-3">
          One row per engagement. Add a row for every contact you make, even repeat contact with the same station.
        </p>
        <div className="space-y-3">
          {engagements.length === 0 && (
            <div className="text-center text-sm text-stone-400 py-4">No engagements logged yet this week.</div>
          )}
          {engagements.map((e) => (
            <div key={e.id} className="relative border border-stone-200 rounded-lg p-4 bg-stone-50/40">
              <button
                type="button"
                onClick={() => removeEngRow(e.id)}
                className="absolute top-2 right-2 text-xs font-semibold text-red-600 border border-red-300 rounded-md px-2 py-1 hover:bg-red-50"
              >
                Remove
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 pr-20">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Station
                    {e.category && (
                      <span className={`ml-2 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_BADGE_CLASSES[e.category as SuccessionCourtCategory]}`}>
                        {e.category}
                      </span>
                    )}
                  </label>
                  <select
                    value={e.courtId}
                    onChange={(ev) => selectEngCourt(e.id, ev.target.value)}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="">Select station...</option>
                    {myCourts.map((c) => (
                      <option key={c.id} value={c.id}>{c.station} ({c.category})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={e.date}
                    onChange={(ev) => updEng(e.id, 'date', ev.target.value)}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={e.contact}
                    onChange={(ev) => updEng(e.id, 'contact', ev.target.value)}
                    placeholder="e.g. J. Rono"
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Contact Role</label>
                  <input
                    type="text"
                    value={e.role}
                    onChange={(ev) => updEng(e.id, 'role', ev.target.value)}
                    placeholder="e.g. Court Assistant"
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Mode of Engagement</label>
                  <select
                    value={e.mode}
                    onChange={(ev) => updEng(e.id, 'mode', ev.target.value as EngagementMode)}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="">Select...</option>
                    {MODES.map((m) => (
                      <option key={m} value={m}>{MODE_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Status</label>
                  <select
                    value={e.status}
                    onChange={(ev) => updEng(e.id, 'status', ev.target.value as EngagementStatus)}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="">Select...</option>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={e.followup}
                    onChange={(ev) => updEng(e.id, 'followup', ev.target.value)}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Issue(s) Raised</label>
                  <input
                    type="text"
                    value={e.issue}
                    onChange={(ev) => updEng(e.id, 'issue', ev.target.value)}
                    placeholder="Comma-separated issues"
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Action Taken</label>
                  <textarea
                    value={e.action}
                    onChange={(ev) => updEng(e.id, 'action', ev.target.value)}
                    rows={2}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Resolution (if Resolved)</label>
                  <textarea
                    value={e.action}
                    onChange={(ev) => updEng(e.id, 'action', ev.target.value)}
                    rows={2}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                    placeholder="Leave blank if not resolved"
                  />
                </div>
              </div>

              {e.status === 'escalated' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 bg-[#FBEFE9] rounded-md p-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Why It Needs Escalation</label>
                    <textarea
                      value={e.why}
                      onChange={(ev) => updEng(e.id, 'why', ev.target.value)}
                      rows={2}
                      className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Urgency</label>
                    <select
                      value={e.urgency}
                      onChange={(ev) => updEng(e.id, 'urgency', ev.target.value as Urgency)}
                      className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                    >
                      <option value="">Select...</option>
                      {URGENCIES.map((u) => (
                        <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addEngRow}
          disabled={myCourts.length === 0}
          className="mt-3 text-xs font-semibold text-[#1E4620] border border-[#1E4620] rounded-md px-3 py-1.5 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add Engagement
        </button>

        {/* C. Stations Not Yet Engaged */}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
          C. Stations Not Yet Engaged (auto-detected: {notReachedAuto.length} of {myCourts.length})
        </h3>
        <p className="text-xs text-stone-500 mb-3">
          Optionally note a reason and planned date for each — otherwise leave blank and update next week.
        </p>
        <div className="space-y-2">
          {notReachedAuto.length === 0 && (
            <div className="text-center text-sm text-stone-400 py-4">
              {myCourts.length === 0 ? 'No courts assigned to you yet.' : 'All assigned stations engaged this week.'}
            </div>
          )}
          {notReachedAuto.map((court) => {
            const row = getNotReached(court.id, court.station, court.category);
            return (
              <div key={court.id} className="border border-stone-200 rounded-lg p-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Station</label>
                    <input
                      type="text"
                      value={`${court.station} (${court.category})`}
                      disabled
                      className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm bg-stone-100 text-stone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Reason Not Reached</label>
                    <select
                      value={row.reason}
                      onChange={(ev) => updNotReached(court.id, court.station, court.category, 'reason', ev.target.value as ReasonNotReached)}
                      className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                    >
                      <option value="">Select reason...</option>
                      {REASONS.map((r) => (
                        <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  {row.reason === 'other' && (
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Please specify</label>
                      <input
                        type="text"
                        value={row.reasonDetail}
                        onChange={(ev) => updNotReached(court.id, court.station, court.category, 'reasonDetail', ev.target.value)}
                        className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Planned Engagement Date</label>
                    <input
                      type="date"
                      value={row.plannedDate}
                      onChange={(ev) => updNotReached(court.id, court.station, court.category, 'plannedDate', ev.target.value)}
                      className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* D. Additional Escalation Items */}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
          D. Additional Issues for the Registrar's Attention
        </h3>
        <p className="text-xs text-stone-500 mb-3">
          Escalated engagements above are pulled in automatically. Add anything else here that needs RHC attention
          but isn't tied to one station row.
        </p>
        <div className="space-y-3">
          {escalations.map((e) => (
            <div key={e.id} className="relative border border-stone-200 rounded-lg p-4 bg-stone-50/40">
              <button
                type="button"
                onClick={() => removeEscRow(e.id)}
                className="absolute top-2 right-2 text-xs font-semibold text-red-600 border border-red-300 rounded-md px-2 py-1 hover:bg-red-50"
              >
                Remove
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 pr-20">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Station</label>
                  <input
                    type="text"
                    value={e.station}
                    onChange={(ev) => updEsc(e.id, 'station', ev.target.value)}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Urgency</label>
                  <select
                    value={e.urgency}
                    onChange={(ev) => updEsc(e.id, 'urgency', ev.target.value as Urgency)}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="">Select...</option>
                    {URGENCIES.map((u) => (
                      <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-stone-700 mb-1">Issue</label>
                <textarea
                  value={e.issue}
                  onChange={(ev) => updEsc(e.id, 'issue', ev.target.value)}
                  rows={2}
                  className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Why It Needs Escalation</label>
                  <textarea
                    value={e.why}
                    onChange={(ev) => updEsc(e.id, 'why', ev.target.value)}
                    rows={2}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Recommended Action</label>
                  <textarea
                    value={e.action}
                    onChange={(ev) => updEsc(e.id, 'action', ev.target.value)}
                    rows={2}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addEscRow}
          className="mt-3 text-xs font-semibold text-[#1E4620] border border-[#1E4620] rounded-md px-3 py-1.5 hover:bg-stone-50"
        >
          + Add Escalation Item
        </button>

        {/* E. Patterns */}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
          E. Recurring or Cross-Station Patterns
        </h3>
        <textarea
          value={patterns}
          onChange={(e) => setPatterns(e.target.value)}
          rows={2}
          placeholder="Any issue seen at more than one station this week..."
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm"
        />

        {/* F. Priorities */}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
          F. Priorities for Next Week
        </h3>
        <textarea
          value={priorities}
          onChange={(e) => setPriorities(e.target.value)}
          rows={2}
          className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm"
        />

        {/* Save bar */}
        <div className="flex items-center gap-3 mt-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-[#1E4620] text-white text-sm font-semibold rounded-md px-4 py-2 hover:bg-[#132A1D] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Report'}
          </button>
          {saveMsg && <span className="text-sm font-semibold text-[#3F7A4E]">{saveMsg}</span>}
          {saveError && <span className="text-sm font-semibold text-red-600">{saveError}</span>}
          {submitError && <span className="text-sm font-semibold text-red-600">{submitError}</span>}
        </div>
      </div>
    </div>
  );
};

export default RegistryNewReport;