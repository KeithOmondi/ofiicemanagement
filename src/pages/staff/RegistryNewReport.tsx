// src/pages/staff/RegistryNewReport.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchCourtsWithSupport,
  selectAllCourts,
  selectCourtIsLoading,
  selectCourtError,
} from '../../store/slices/successionCourts.slice';
import {
  createReport,
  updateReport,
  fetchReportById,
  selectIsSubmitting,
  selectError as selectReportError,
  selectCurrentReport,
  generatePDFPreview,
  selectPDFPreview,
  selectIsGeneratingPDF,
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
  StationEngagementReport,
} from '../../types/station-engagement.types';

// ============================================================
// src/pages/staff/RegistryNewReport.tsx
//
// Weekly Station Engagement Report — Sections A through F.
// Supports: Draft saving, Submit to Admin, PDF Preview, Edit Mode
// ============================================================

const MODES: EngagementMode[] = [
  'phone_call',
  'whatsapp',
  'email',
  'physical_visit',
  'webinar_followup',
  'video_call',
  'walk_in',
];

const STATUSES: EngagementStatus[] = ['resolved', 'ongoing', 'escalated'];
const URGENCIES: Urgency[] = ['high', 'medium', 'low'];
const REASONS: ReasonNotReached[] = ['no_response', 'wrong_contact', 'station_closed', 'staff_unavailable', 'technical_issues', 'other'];

interface Engagement {
  id: string;
  courtId: string;
  station: string;
  category: SuccessionCourtCategory | '';
  date: string;
  contact: string;
  role: string;
  mode: EngagementMode | '';
  issue: string;
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
  reasonDetail: string;
  plannedDate: string;
}

interface EscalationItem {
  id: string;
  station: string;
  issue: string;
  why: string;
  action: string;
  urgency: Urgency | '';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const todayMonday = (offsetWeeks = 0): string => {
  const d = new Date();
  const day = d.getDay();
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
  walk_in: 'Walk-in',
};

const URGENCY_LABELS: Record<Urgency, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const REASON_LABELS: Record<ReasonNotReached, string> = {
  no_response: 'No Response',
  wrong_contact: 'Wrong Contact',
  station_closed: 'Station Closed',
  staff_unavailable: 'Staff Unavailable',
  technical_issues: 'Technical Issues',
  other: 'Other',
};

// ─── Component ──────────────────────────────────────────────────────────────

const RegistryNewReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const courts = useAppSelector(selectAllCourts);
  const isLoadingCourts = useAppSelector(selectCourtIsLoading);
  const courtError = useAppSelector(selectCourtError);
  const isSubmitting = useAppSelector(selectIsSubmitting);
  const submitError = useAppSelector(selectReportError);
  const pdfPreview = useAppSelector(selectPDFPreview);
  const isGeneratingPDF = useAppSelector(selectIsGeneratingPDF);
  
  // ✅ Fixed: Use the correct selector name
  const existingReport = useAppSelector(selectCurrentReport) as StationEngagementReport | null;

  // ─── Fetch the courts assigned to this officer ───────────────────────────
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchCourtsWithSupport({ support_person_id: user.id }));
    }
  }, [dispatch, user?.id]);

  // ─── Fetch existing report if in edit mode ──────────────────────────────
  useEffect(() => {
    if (isEditMode && id) {
      dispatch(fetchReportById(id));
    }
  }, [dispatch, id, isEditMode]);

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
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

 // Tracks which report id we've already hydrated the form for, so the
// mapping logic below runs exactly once per report — no separate
// "reset" effect needed, and no unconditional setState-on-every-render.
const loadedReportIdRef = React.useRef<string | null>(null);


// Shape of the raw data coming back from the API for an existing report.
// Loosely typed on purpose (fields are optional) since this is what gets mapped into local form state.
interface EngagementDTO {
  id?: string;
  station_id?: string;
  station_name?: string;
  station_category?: SuccessionCourtCategory;
  date?: string;
  contact_person?: string;
  contact_role?: string;
  mode?: EngagementMode;
  issues_raised?: string[];
  status?: EngagementStatus;
  action_taken?: string;
  follow_up_date?: string;
  why_needs_escalation?: string;
  urgency?: Urgency;
}

interface UnengagedStationDTO {
  station_id?: string;
  station_name?: string;
  station_category?: SuccessionCourtCategory;
  reason_not_reached?: ReasonNotReached;
  reason_not_reached_detail?: string;
  planned_engagement_date?: string;
}

interface EscalationDTO {
  id?: string;
  station_name?: string;
  issue?: string;
  why_needs_escalation?: string;
  recommended_action?: string;
  urgency?: Urgency;
}

useEffect(() => {
  if (!isEditMode) {
    loadedReportIdRef.current = null;
    return;
  }
  if (!id || !existingReport) return;
  if (loadedReportIdRef.current === id) return; // already hydrated for this id

  loadedReportIdRef.current = id;
  setIsLoadingReport(true);

  const mappedEngagements: Engagement[] = (existingReport.engagements ?? []).map(
    (e: EngagementDTO): Engagement => ({
      id: e.id || uid(),
      courtId: e.station_id || '',
      station: e.station_name || '',
      category: e.station_category || '',
      date: e.date || todayMonday(),
      contact: e.contact_person || '',
      role: e.contact_role || '',
      mode: e.mode || '',
      issue: (e.issues_raised || []).join(', '),
      status: e.status || '',
      action: e.action_taken || '',
      followup: e.follow_up_date || '',
      why: e.why_needs_escalation || '',
      urgency: e.urgency || '',
    })
  );

  const mappedNotReached: NotReached[] = (existingReport.unengaged_stations ?? []).map(
    (u: UnengagedStationDTO): NotReached => ({
      courtId: u.station_id || '',
      station: u.station_name || '',
      category: u.station_category || '',
      reason: u.reason_not_reached || '',
      reasonDetail: u.reason_not_reached_detail || '',
      plannedDate: u.planned_engagement_date || '',
    })
  );

  const mappedEscalations: EscalationItem[] = (existingReport.escalations ?? []).map(
    (e: EscalationDTO): EscalationItem => ({
      id: e.id || uid(),
      station: e.station_name || '',
      issue: e.issue || '',
      why: e.why_needs_escalation || '',
      action: e.recommended_action || '',
      urgency: e.urgency || '',
    })
  );

  setWeekKey(
  existingReport.week_start
    ? new Date(existingReport.week_start).toISOString().slice(0, 10)
    : todayMonday()
);
  setExecSummary(existingReport.executive_summary || '');
  setPatterns(existingReport.recurring_patterns || '');
  setPriorities(existingReport.priorities || '');
  setEngagements(mappedEngagements);
  setNotReached(mappedNotReached);
  setEscalations(mappedEscalations);
  setIsDataLoaded(true);
  setIsLoadingReport(false);
}, [existingReport, isEditMode, id]);

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
        id: uid(),
        courtId: '',
        station: '',
        category: '',
        date: weekKey,
        contact: '',
        role: '',
        mode: '',
        issue: '',
        status: '',
        action: '',
        followup: '',
        why: '',
        urgency: '',
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
      plannedDate: '',
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

  // ─── Build Payload ──────────────────────────────────────────────────────

  const buildPayload = (): CreateEngagementReportPayload => {
    console.log('🔍 Building payload...');

    // Get unique categories from engagements
    const categories = new Set<SuccessionCourtCategory>();
    engagements.forEach((e) => {
      if (e.category) categories.add(e.category as SuccessionCourtCategory);
    });
    notReached.forEach((n) => {
      if (n.category) categories.add(n.category);
    });
    if (categories.size === 0 && myCourts.length > 0) {
      myCourts.forEach((c) => {
        categories.add(c.category);
      });
    }

    // Build engagements array
    const engagementInputs: EngagementInput[] = engagements
      .filter((e) => e.courtId && e.station && e.mode && e.status)
      .map((e) => {
        const issues = e.issue
          ? e.issue.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
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

    // Build unengaged stations - only include those with a reason
    const unengagedInputs: Array<{
      station_id: string;
      reason_not_reached?: ReasonNotReached;
      reason_not_reached_detail?: string;
      planned_engagement_date?: string;
    }> = [];

    notReachedAuto.forEach((c) => {
      const nr = getNotReached(c.id, c.station, c.category);
      
      // Only include if a reason has been explicitly selected
      if (nr.reason) {
        unengagedInputs.push({
          station_id: c.id,
          reason_not_reached: nr.reason,
          reason_not_reached_detail: nr.reason === 'other' ? (nr.reasonDetail || undefined) : undefined,
          planned_engagement_date: nr.plannedDate || undefined,
        });
      }
    });

    // Build escalations - filter first, then map
    const escalationInputs: EscalationItemInput[] = [];

    escalations
      .filter((e) => e.station && e.issue && e.why && e.urgency)
      .forEach((e) => {
        const matchingCourt = myCourts.find(
          (c) =>
            c.station.toLowerCase().includes(e.station.toLowerCase()) ||
            e.station.toLowerCase().includes(c.station.toLowerCase())
        );

        const fallbackStationId = myCourts.length > 0 ? myCourts[0].id : undefined;

        if (!matchingCourt && !fallbackStationId) {
          console.warn('⚠️ Skipping escalation - no station found for:', e.station);
          return;
        }

        escalationInputs.push({
          station_id: matchingCourt?.id || fallbackStationId!,
          station_name: e.station,
          issue: e.issue,
          why_needs_escalation: e.why,
          recommended_action: e.action || 'No action specified',
          urgency: e.urgency as Urgency,
          source_engagement_id: null,
        });
      });

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

  // ─── Save Handler ──────────────────────────────────────────────────────

  const handleSave = async (saveAsDraft: boolean = false) => {
    setSaveMsg('');
    setSaveError('');
    setIsSavingDraft(saveAsDraft);

    // ─── Validation ──────────────────────────────────────────────────────────

    if (!user?.id) {
      setSaveError('User not authenticated. Please log in again.');
      setIsSavingDraft(false);
      return;
    }

    if (myCourts.length === 0) {
      setSaveError('No courts assigned to you. Cannot create a report.');
      setIsSavingDraft(false);
      return;
    }

    const hasValidEngagements = engagements.some((e) => e.courtId && e.mode && e.status);
    const hasUnengagedWithReason = notReachedAuto.some((c) => {
      const nr = getNotReached(c.id, c.station, c.category);
      return !!nr.reason;
    });
    
    if (!hasValidEngagements && !hasUnengagedWithReason) {
      setSaveError('Please add at least one engagement or provide a reason for unengaged stations.');
      setIsSavingDraft(false);
      return;
    }

    const incompleteUnengaged = notReachedAuto.filter((c) => {
      const nr = getNotReached(c.id, c.station, c.category);
      if (nr.reason === 'other' && !nr.reasonDetail?.trim()) {
        return true;
      }
      return false;
    });
    
    if (incompleteUnengaged.length > 0) {
      setSaveError(`Please provide details for ${incompleteUnengaged.length} station(s) where "Other" was selected as the reason.`);
      setIsSavingDraft(false);
      return;
    }

    const invalidEscalations = engagements.filter((e) => e.status === 'escalated' && (!e.urgency || !e.why));
    if (invalidEscalations.length > 0) {
      setSaveError(`Please provide urgency and reason for ${invalidEscalations.length} escalated engagement(s).`);
      setIsSavingDraft(false);
      return;
    }

    const invalidEscalationItems = escalations.filter((e) => e.station && e.issue && e.why && !e.urgency);
    if (invalidEscalationItems.length > 0) {
      setSaveError('Please provide urgency for all escalation items.');
      setIsSavingDraft(false);
      return;
    }

    const escalationWithoutAction = escalations.filter((e) => e.station && e.issue && e.why && e.urgency && !e.action);
    if (escalationWithoutAction.length > 0) {
      setSaveError('Please provide a recommended action for all escalation items.');
      setIsSavingDraft(false);
      return;
    }

    // ─── Build and Send Payload ─────────────────────────────────────────────

    try {
      const payload = buildPayload();
      const payloadWithDraftFlag = {
        ...payload,
        saveAsDraft,
      };

      let result;

      if (isEditMode && id) {
        // ✅ UPDATE existing report
        result = await dispatch(updateReport({ id, data: payloadWithDraftFlag })).unwrap();
        const message = saveAsDraft
          ? `✅ Draft updated successfully! ID: ${result.id.slice(0, 8)}`
          : `✅ Report submitted successfully! ID: ${result.id.slice(0, 8)}`;
        setSaveMsg(message);
      } else {
        // ✅ CREATE new report
        result = await dispatch(createReport(payloadWithDraftFlag)).unwrap();
        const message = saveAsDraft
          ? `✅ Draft saved successfully! ID: ${result.id.slice(0, 8)}`
          : `✅ Report submitted successfully! ID: ${result.id.slice(0, 8)}`;
        setSaveMsg(message);
      }

      // If not a draft, navigate back to list
      if (!saveAsDraft) {
        setTimeout(() => navigate('/staff/reports'), 1500);
      }

    } catch (err: unknown) {
      console.error('❌ Save error:', err);

      let errorMessage = 'Failed to save report. ';

      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response: { data: unknown; status: number; statusText: string } }).response;

        console.error('📄 Server response:', JSON.stringify(response?.data, null, 2));

        if (response?.data && typeof response.data === 'object') {
          const data = response.data as { message?: string; errors?: Record<string, string | string[]> };

          if (data.message) {
            errorMessage += data.message;
          } else if (data.errors) {
            const errorMessages = Object.entries(data.errors)
              .map(([field, msgs]) => {
                const messages = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
                return `${field}: ${messages}`;
              })
              .join('; ');
            errorMessage += `Validation errors: ${errorMessages}`;
          } else {
            errorMessage += `Server error: ${response.status} - ${response.statusText}`;
          }
        } else {
          errorMessage += `Server error: ${response?.status} - ${response?.statusText || 'Unknown error'}`;
        }
      } else if (err instanceof Error) {
        errorMessage += err.message;
      } else {
        errorMessage = 'An unknown error occurred. Please try again.';
      }

      setSaveError(errorMessage);

    } finally {
      setIsSavingDraft(false);
    }
  };

  // ─── Handle PDF Preview ──────────────────────────────────────────────────

  const handlePDFPreview = async () => {
    setSaveError('');
    setSaveMsg('');

    if (engagements.length === 0 && notReachedAuto.length === 0) {
      setSaveError('Please add at least one engagement before generating a preview.');
      return;
    }

    try {
      let reportId = id;

      // If in edit mode with existing report, use that ID
      if (!isEditMode || !reportId) {
        // Save as draft first
        const payload = buildPayload();
        const result = await dispatch(createReport({ ...payload, saveAsDraft: true })).unwrap();
        reportId = result.id;
      }

      // Generate preview
      const previewResult = await dispatch(generatePDFPreview({
        id: reportId!,
        options: { page: 1, scale: 1 }
      })).unwrap();

      if (previewResult.previewData) {
        const blob = new Blob(
          [Uint8Array.from(atob(previewResult.previewData), c => c.charCodeAt(0))],
          { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setSaveMsg('✓ PDF preview generated successfully!');
      }
    } catch (err) {
      console.error('❌ PDF Preview error:', err);
      setSaveError('Failed to generate PDF preview. Please try again.');
    }
  };

  // ─── Loading / error states ──────────────────────────────────────────────

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

  if (isEditMode && isLoadingReport) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#1E4620] border-t-transparent" />
        <span className="ml-3 text-sm text-stone-600">Loading report...</span>
      </div>
    );
  }

  if (isEditMode && !existingReport && !isLoadingReport && isDataLoaded === false) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          Report not found or you don't have permission to view it.
          <button
            onClick={() => navigate('/staff/reports')}
            className="ml-3 text-blue-600 hover:underline"
          >
            Back to reports
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-lg font-bold text-[#1E4620] m-0">
            {isEditMode ? 'Edit Weekly Station Engagement Report' : 'Weekly Station Engagement Report'}
          </h2>
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
          {isEditMode && ` · Editing report ${id?.slice(0, 8)}`}
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
          Select a reason for each unengaged station. This is required before submitting.
        </p>
        <div className="space-y-2">
          {notReachedAuto.length === 0 && (
            <div className="text-center text-sm text-stone-400 py-4">
              {myCourts.length === 0 ? 'No courts assigned to you yet.' : 'All assigned stations engaged this week.'}
            </div>
          )}
          {notReachedAuto.map((court) => {
            const row = getNotReached(court.id, court.station, court.category);
            const hasReason = !!row.reason;
            return (
              <div key={court.id} className={`border rounded-lg p-3 ${hasReason ? 'border-stone-200' : 'border-amber-200 bg-amber-50/30'}`}>
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
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Reason Not Reached
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={row.reason}
                      onChange={(ev) => updNotReached(court.id, court.station, court.category, 'reason', ev.target.value as ReasonNotReached)}
                      className={`w-full border rounded-md px-2 py-1.5 text-sm ${!hasReason ? 'border-amber-400 bg-amber-50' : 'border-stone-300'}`}
                    >
                      <option value="">Select reason...</option>
                      {REASONS.map((r) => (
                        <option key={r} value={r}>{REASON_LABELS[r]}</option>
                      ))}
                    </select>
                    {!hasReason && (
                      <p className="text-xs text-amber-600 mt-1">⚠️ Required</p>
                    )}
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
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Urgency
                    <span className="text-red-500 ml-1">*</span>
                  </label>
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
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Issue
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={e.issue}
                  onChange={(ev) => updEsc(e.id, 'issue', ev.target.value)}
                  rows={2}
                  className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Why It Needs Escalation
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    value={e.why}
                    onChange={(ev) => updEsc(e.id, 'why', ev.target.value)}
                    rows={2}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Recommended Action
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    value={e.action}
                    onChange={(ev) => updEsc(e.id, 'action', ev.target.value)}
                    rows={2}
                    className="w-full border border-stone-300 rounded-md px-2 py-1.5 text-sm"
                    placeholder="Required"
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
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSubmitting || isGeneratingPDF}
            className="bg-[#1E4620] text-white text-sm font-semibold rounded-md px-4 py-2 hover:bg-[#132A1D] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && !isSavingDraft 
              ? (isEditMode ? 'Updating...' : 'Submitting...') 
              : (isEditMode ? 'Update Report' : 'Submit to Admin')}
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSubmitting || isGeneratingPDF}
            className="bg-stone-600 text-white text-sm font-semibold rounded-md px-4 py-2 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingDraft 
              ? 'Saving Draft...' 
              : (isEditMode ? 'Save Changes' : 'Save as Draft')}
          </button>

          <button
            type="button"
            onClick={handlePDFPreview}
            disabled={isGeneratingPDF || engagements.length === 0}
            className="bg-[#9C7A1E] text-white text-sm font-semibold rounded-md px-4 py-2 hover:bg-[#7A5E18] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? 'Generating Preview...' : 'Preview PDF'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/staff/reports')}
            className="text-sm text-stone-500 hover:text-stone-700 px-3 py-2"
          >
            Cancel
          </button>

          {saveMsg && <span className="text-sm font-semibold text-[#3F7A4E]">{saveMsg}</span>}
          {saveError && <span className="text-sm font-semibold text-red-600">{saveError}</span>}
          {submitError && <span className="text-sm font-semibold text-red-600">{submitError}</span>}
        </div>

        {/* Preview status */}
        {pdfPreview.isGenerating && (
          <div className="mt-3 text-sm text-stone-600">
            Generating PDF preview...
          </div>
        )}
        {pdfPreview.url && (
          <div className="mt-3 text-sm text-[#3F7A4E]">
            ✅ PDF preview ready. Click "Preview PDF" to view.
          </div>
        )}
        {pdfPreview.error && (
          <div className="mt-3 text-sm text-red-600">
            ❌ {pdfPreview.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistryNewReport;