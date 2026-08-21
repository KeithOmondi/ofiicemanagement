// src/features/station-engagement/components/StaffRegistryReports.tsx

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMatch, useNavigate } from 'react-router-dom';
import {
  fetchReports,
  fetchEngagementStats,
  deleteReport,
  generatePDFPreview,
  generateAndAttachPDF,
  sendToAdmin,
  setFilters,
  selectAllReports,
  selectEngagementStats,
  selectIsLoading,
  selectIsSubmitting,
  selectIsGeneratingPDF,
  selectIsGeneratingExcel,
  selectError,
  selectPagination,
} from '../../store/slices/stationEngagement.slice';
import type { SuccessionCourtCategory } from '../../types/succession-courts';
import type { AppDispatch } from '../../store/store';
import type {
  EngagementReportFilters,
  ReportStatus,
  Urgency,
  EngagementMode,
  EngagementStatus,
  StationEngagementReport,
  Engagement,
  EscalationItem,
} from '../../types/station-engagement.types';

// ─── Display maps ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ReportStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
};

const CATEGORY_COLORS: Record<SuccessionCourtCategory, string> = {
  A: 'bg-purple-100 text-purple-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-rose-100 text-rose-800',
};

const URGENCY_COLORS: Record<Urgency, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const URGENCY_LABELS: Record<Urgency, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
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

const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  resolved: 'Resolved',
  ongoing: 'Ongoing',
  escalated: 'Escalated',
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};



interface ReportWithDisplay extends StationEngagementReport {
  submitted_by_display?: string;
  reviewed_by_display?: string;
  approved_by_display?: string;
}

// ─── Read-only field primitives ────────────────────────────────────────────

const ReadField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <label className="block text-xs font-semibold text-stone-700 mb-1">{label}</label>
    <div className="w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm bg-stone-50 text-stone-800 min-h-[34px]">
      {value || <span className="text-stone-400">—</span>}
    </div>
  </div>
);

const ReadTextArea: React.FC<{ label: string; value: React.ReactNode; rows?: number }> = ({
  label,
  value,
  rows = 2,
}) => (
  <div>
    {label && <label className="block text-xs font-semibold text-stone-700 mb-1">{label}</label>}
    <div
      className="w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm bg-stone-50 text-stone-800 whitespace-pre-wrap"
      style={{ minHeight: `${rows * 1.5 + 1}rem` }}
    >
      {value || <span className="text-stone-400">—</span>}
    </div>
  </div>
);

// ─── Full rich report body ─────────────────────────────────────────────────

const ReportBody: React.FC<{ report: ReportWithDisplay }> = ({ report }) => {
  const engagements: Engagement[] = report.engagements ?? [];
  const escalations: EscalationItem[] = report.escalations ?? [];
  const unengaged = report.unengaged_stations ?? [];

  const submittedByDisplay = report.submitted_by_display || report.submitted_by || 'Unknown';

  const handleOpenPDF = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('PDF URL is not available');
    }
  };

  return (
    <div className="border-t border-stone-200 px-6 py-5 bg-white">
      <div className="mb-4 p-3 bg-stone-50 rounded-md border border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <ReadField label="Submitted By" value={submittedByDisplay} />
          <ReadField label="Submitted At" value={report.submitted_at ? fmtDate(report.submitted_at) : 'Not submitted'} />
          <ReadField label="Last Updated" value={report.updated_at ? fmtDate(report.updated_at) : fmtDate(report.created_at)} />
          <ReadField label="Status" value={STATUS_LABELS[report.status]} />
        </div>
        {report.pdfSecureUrl && (
          <div className="mt-2 text-xs text-green-600 flex items-center gap-2">
            <span>✅ PDF Attached:</span>
            <button
              onClick={() => handleOpenPDF(report.pdfSecureUrl!)}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
              title={`Click to open ${report.pdfFileName || 'report.pdf'}`}
            >
              {report.pdfFileName || 'report.pdf'}
            </button>
            <span className="text-stone-400 text-[10px]">(click to open)</span>
          </div>
        )}
        {(report.download_count !== undefined && report.download_count > 0) && (
          <div className="mt-2 text-xs text-stone-500">
            📥 Downloaded {report.download_count} time{report.download_count !== 1 ? 's' : ''}
            {report.last_downloaded_at && ` (last: ${fmtDate(report.last_downloaded_at)})`}
          </div>
        )}
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mb-2">
        A. Executive Summary
      </h3>
      <ReadTextArea label="" value={report.executive_summary} rows={3} />

      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
        B. Station Engagement Log ({engagements.length})
      </h3>
      <div className="space-y-3">
        {engagements.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-4">No engagements logged for this week.</div>
        )}
        {engagements.map((e) => (
          <div key={e.id} className="border border-stone-200 rounded-lg p-4 bg-stone-50/40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <ReadField
                label="Station"
                value={
                  <span className="flex items-center gap-2">
                    {e.station_name}
                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_COLORS[e.station_category]}`}>
                      {e.station_category}
                    </span>
                  </span>
                }
              />
              <ReadField label="Date" value={fmtDate(e.date)} />
              <ReadField label="Contact Person" value={e.contact_person} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <ReadField label="Contact Role" value={e.contact_role} />
              <ReadField label="Mode of Engagement" value={MODE_LABELS[e.mode]} />
              <ReadField label="Status" value={ENGAGEMENT_STATUS_LABELS[e.status]} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <ReadField label="Follow-up Date" value={fmtDate(e.follow_up_date)} />
              <ReadField label="Issue(s) Raised" value={e.issues_raised?.join(', ')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ReadTextArea label="Action Taken" value={e.action_taken} />
              <ReadTextArea label="Resolution (if Resolved)" value={e.resolution} />
            </div>
            {e.status === 'escalated' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 bg-[#FBEFE9] rounded-md p-3">
                <ReadTextArea label="Why It Needs Escalation" value={e.why_needs_escalation} />
                <ReadField
                  label="Urgency"
                  value={
                    e.urgency && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_COLORS[e.urgency]}`}>
                        {URGENCY_LABELS[e.urgency]}
                      </span>
                    )
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
        C. Stations Not Yet Engaged ({unengaged.length})
      </h3>
      <div className="space-y-2">
        {unengaged.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-4">All assigned stations were engaged this week.</div>
        )}
        {unengaged.map((n, idx) => (
          <div key={n.station_id ?? idx} className="border border-stone-200 rounded-lg p-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <ReadField
                label="Station"
                value={
                  <span className="flex items-center gap-2">
                    {n.station_name ?? n.station_id}
                    {n.category && (
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_COLORS[n.category]}`}>
                        {n.category}
                      </span>
                    )}
                  </span>
                }
              />
              <ReadField label="Reason Not Reached" value={n.reason_not_reached ? n.reason_not_reached.replace('_', ' ').toUpperCase() : undefined} />
              {n.reason_not_reached === 'other' && <ReadField label="Detail" value={n.reason_not_reached_detail} />}
              <ReadField label="Planned Engagement Date" value={fmtDate(n.planned_engagement_date)} />
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
        D. Additional Issues for the Registrar's Attention ({escalations.length})
      </h3>
      <div className="space-y-3">
        {escalations.length === 0 && <div className="text-center text-sm text-stone-400 py-4">No additional escalation items.</div>}
        {escalations.map((e) => (
          <div key={e.id} className="border border-stone-200 rounded-lg p-4 bg-stone-50/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <ReadField label="Station" value={e.station_name} />
              <ReadField
                label="Urgency"
                value={
                  e.urgency && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_COLORS[e.urgency]}`}>
                      {URGENCY_LABELS[e.urgency]}
                    </span>
                  )
                }
              />
            </div>
            <div className="mb-3"><ReadTextArea label="Issue" value={e.issue} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ReadTextArea label="Why It Needs Escalation" value={e.why_needs_escalation} />
              <ReadTextArea label="Recommended Action" value={e.recommended_action} />
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
        E. Recurring or Cross-Station Patterns
      </h3>
      <ReadTextArea label="" value={report.recurring_patterns} rows={2} />

      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
        F. Priorities for Next Week
      </h3>
      <ReadTextArea label="" value={report.priorities} rows={2} />

      {report.feedback && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">Registrar Feedback</h3>
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-md text-sm text-stone-800 whitespace-pre-wrap">
            {report.feedback}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

const StaffRegistryReports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // Registry routes are mounted under /dept/:deptId/... in DeptDeskGateway.tsx
  // (e.g. reports/new, reports/:id/edit), not under a standalone /staff/*
  // path. Compute the dept-scoped base the same way StaffSidebar.tsx does,
  // so navigate() calls below actually match a route instead of falling
  // through to the desk's catch-all and bouncing to the dashboard.
  const match = useMatch('/dept/:deptId/*');
  const base = match ? `/dept/${match.params.deptId}` : '';

  const reports = useSelector(selectAllReports) as ReportWithDisplay[];
  const stats = useSelector(selectEngagementStats);
  const isLoading = useSelector(selectIsLoading);
  const isSubmitting = useSelector(selectIsSubmitting);
  const isGeneratingPDF = useSelector(selectIsGeneratingPDF);
  const isGeneratingExcel = useSelector(selectIsGeneratingExcel);
  const error = useSelector(selectError);
  const pagination = useSelector(selectPagination);

  // ─── Local State ────────────────────────────────────────────────────────
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<SuccessionCourtCategory | 'all'>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<Urgency | 'all'>('all');
  const [showOnlyVisible, setShowOnlyVisible] = useState<boolean>(false); // Staff sees their drafts
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);

  // ─── Fetch reports when filters change ──────────────────────────────────
  useEffect(() => {
    const filterParams: EngagementReportFilters = {
      limit,
      offset: (currentPage - 1) * limit,
    };

    // Staff should see their own reports (including drafts)
    // visibleToAdmin: false shows drafts, true shows submitted
    if (showOnlyVisible) {
      filterParams.visibleToAdmin = true;
    } else {
      filterParams.visibleToAdmin = false;
    }

    if (selectedStatus !== 'all') filterParams.status = selectedStatus;
    if (selectedCategory !== 'all') filterParams.category = selectedCategory;
    if (selectedUrgency !== 'all') filterParams.urgency = selectedUrgency;

    dispatch(setFilters(filterParams));
    dispatch(fetchReports(filterParams));
    dispatch(fetchEngagementStats({}));
  }, [dispatch, selectedStatus, selectedCategory, selectedUrgency, currentPage, limit, showOnlyVisible]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await dispatch(deleteReport(id)).unwrap();
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  // ─── Send to Admin Handler ─────────────────────────────────────────────

  const handleSendToAdmin = async (id: string) => {
    if (!confirm('Are you sure you want to send this report to the Super Admin for review?')) return;
    
    setExportingReportId(id);
    try {
      await dispatch(sendToAdmin({
        reportId: id,
        sendNotification: true,
        notes: 'Report ready for review',
      })).unwrap();
      
      alert('✅ Report sent to Super Admin successfully!');
      
      // Refresh reports
      const filterParams: EngagementReportFilters = {
        limit,
        offset: (currentPage - 1) * limit,
      };
      if (showOnlyVisible) {
        filterParams.visibleToAdmin = true;
      } else {
        filterParams.visibleToAdmin = false;
      }
      if (selectedStatus !== 'all') filterParams.status = selectedStatus;
      if (selectedCategory !== 'all') filterParams.category = selectedCategory;
      if (selectedUrgency !== 'all') filterParams.urgency = selectedUrgency;
      dispatch(fetchReports(filterParams));
    } catch (err: unknown) {
      console.error('Failed to send report to admin:', err);
      let errorMsg = 'Failed to send report';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errorMsg = response.data.message;
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      alert(`❌ ${errorMsg}`);
    } finally {
      setExportingReportId(null);
    }
  };

  // ─── PDF Generation & Attachment Handlers ──────────────────────────────

  const handleGenerateAndAttachPDF = async (id: string) => {
    setExportingReportId(id);
    try {
      await dispatch(generateAndAttachPDF(id)).unwrap();
      alert('✅ PDF generated and attached successfully!');
      
      // Refresh reports
      const filterParams: EngagementReportFilters = {
        limit,
        offset: (currentPage - 1) * limit,
      };
      if (showOnlyVisible) {
        filterParams.visibleToAdmin = true;
      } else {
        filterParams.visibleToAdmin = false;
      }
      if (selectedStatus !== 'all') filterParams.status = selectedStatus;
      if (selectedCategory !== 'all') filterParams.category = selectedCategory;
      if (selectedUrgency !== 'all') filterParams.urgency = selectedUrgency;
      dispatch(fetchReports(filterParams));
    } catch (err: unknown) {
      console.error('Failed to generate and attach PDF:', err);
      let errorMsg = 'Failed to generate PDF';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errorMsg = response.data.message;
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      alert(`❌ ${errorMsg}`);
    } finally {
      setExportingReportId(null);
    }
  };

  const handleViewPDFPreview = async (id: string) => {
    setExportingReportId(id);
    try {
      const result = await dispatch(generatePDFPreview({ id })).unwrap();
      if (result.previewData) {
        const blob = new Blob(
          [Uint8Array.from(atob(result.previewData), c => c.charCodeAt(0))],
          { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (err: unknown) {
      console.error('Failed to view PDF preview:', err);
      let errorMsg = 'Failed to generate preview';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response: { data?: { message?: string } } }).response;
        if (response?.data?.message) {
          errorMsg = response.data.message;
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      alert(`❌ PDF Preview error: ${errorMsg}`);
    } finally {
      setExportingReportId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // ─── Helper functions ─────────────────────────────────────────────────

  const getEngagementCount = (report: StationEngagementReport): number => report.engagements?.length || 0;
  const getEscalationCount = (report: StationEngagementReport): number => report.escalations?.length || 0;

  const getHighestUrgency = (report: StationEngagementReport): Urgency | null => {
    const urgencies: Urgency[] = [];
    report.engagements?.forEach((e: Engagement) => {
      if (e.urgency) urgencies.push(e.urgency);
    });
    report.escalations?.forEach((e: EscalationItem) => {
      if (e.urgency) urgencies.push(e.urgency);
    });
    if (urgencies.length === 0) return null;
    const priority = { high: 3, medium: 2, low: 1 };
    return urgencies.reduce((a, b) => (priority[a] > priority[b] ? a : b));
  };

  const isExporting = (id: string) => exportingReportId === id || isGeneratingPDF || isGeneratingExcel;

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Engagement Reports</h2>
          <p className="text-gray-500">View and manage your station engagement reports</p>
        </div>
        <button
          onClick={() => navigate(`${base}/reports/new`)}
          className="px-4 py-2 bg-[#1E4620] text-white rounded-lg hover:bg-[#132A1D] transition-colors"
        >
          + New Report
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_reports}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Drafts</p>
            <p className="text-2xl font-bold text-gray-500">{stats.draft_count ?? stats.by_status.draft}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Submitted</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.submitted_count ?? stats.by_status.submitted}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Reviewed</p>
            <p className="text-2xl font-bold text-blue-600">{stats.by_status.reviewed}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Approved</p>
            <p className="text-2xl font-bold text-green-600">{stats.by_status.approved}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Rejected</p>
            <p className="text-2xl font-bold text-red-600">{stats.by_status.rejected}</p>
          </div>
        </div>
      )}

      {/* Category & Urgency Stats */}
      {stats && (
        <div className="flex flex-wrap gap-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Categories:</span>
            <span className="text-sm"><span className="font-medium text-purple-600">A:</span> {stats.by_category.A}</span>
            <span className="text-sm"><span className="font-medium text-blue-600">B:</span> {stats.by_category.B}</span>
            <span className="text-sm"><span className="font-medium text-amber-600">C:</span> {stats.by_category.C}</span>
            <span className="text-sm"><span className="font-medium text-rose-600">D:</span> {stats.by_category.D}</span>
          </div>
          {stats.by_urgency && (
            <div className="flex flex-wrap items-center gap-2 border-l border-gray-200 pl-4">
              <span className="text-sm font-medium text-gray-700">Urgency:</span>
              <span className="text-sm"><span className="font-medium text-red-600">High:</span> {stats.by_urgency.high}</span>
              <span className="text-sm"><span className="font-medium text-yellow-600">Medium:</span> {stats.by_urgency.medium}</span>
              <span className="text-sm"><span className="font-medium text-green-600">Low:</span> {stats.by_urgency.low}</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as ReportStatus | 'all')}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1E4620] focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as SuccessionCourtCategory | 'all')}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1E4620] focus:outline-none"
        >
          <option value="all">All Categories</option>
          <option value="A">Category A</option>
          <option value="B">Category B</option>
          <option value="C">Category C</option>
          <option value="D">Category D</option>
        </select>

        <select
          value={selectedUrgency}
          onChange={(e) => setSelectedUrgency(e.target.value as Urgency | 'all')}
          className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1E4620] focus:outline-none"
        >
          <option value="all">All Urgency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={showOnlyVisible}
            onChange={(e) => setShowOnlyVisible(e.target.checked)}
            className="rounded border-gray-300 text-[#1E4620] focus:ring-[#1E4620]"
          />
          <span>Show only submitted (hide drafts)</span>
        </label>

        <span className="text-sm text-gray-500 self-center">
          Showing {reports.length} of {pagination.total} report(s)
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Reports */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-8 text-center">
            <p className="text-gray-500">No reports found.</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a new report using the "New Report" button above.
            </p>
          </div>
        ) : (
          reports.map((report) => {
            const highestUrgency = getHighestUrgency(report);
            const isExpanded = expandedIds.has(report.id);
            const isExportingReport = isExporting(report.id);
            const isDraft = report.status === 'draft';
            //const isSubmitted = report.status === 'submitted';
            const isRejected = report.status === 'rejected';
            const isReviewed = report.status === 'reviewed' || report.status === 'approved';
            const hasPdf = !!report.pdfSecureUrl;
            
            const submittedByDisplay = report.submitted_by_display || report.submitted_by || 'Unknown';

            // ✅ Staff can send to admin if draft/rejected with PDF
            const canSendToAdmin = (isDraft || isRejected) && hasPdf;
            
            // ✅ Staff can edit if draft or rejected
            const canEdit = isDraft || isRejected;
            
            // ✅ Staff can delete if draft or rejected
            const canDelete = isDraft || isRejected;

            return (
              <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Summary header row */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(report.id)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(report.week_start).toLocaleDateString()} – {new Date(report.week_end).toLocaleDateString()}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {report.categories?.map((cat) => (
                        <span key={cat} className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[cat]}`}>
                          {cat}
                        </span>
                      ))}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[report.status]}`}>
                      {STATUS_LABELS[report.status]}
                    </span>
                    {isDraft && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                        Not Visible to Admin
                      </span>
                    )}
                    {hasPdf && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        📄 PDF Attached
                      </span>
                    )}
                    {highestUrgency && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${URGENCY_COLORS[highestUrgency]}`}>
                        {URGENCY_LABELS[highestUrgency]} urgency
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {getEngagementCount(report)} engagement(s) · {getEscalationCount(report)} escalation(s)
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      by {submittedByDisplay}
                    </span>
                    {(report.download_count ?? 0) > 0 && (
                      <span className="text-xs text-blue-600">
                        📥 {report.download_count}
                      </span>
                    )}
                    {isReviewed && report.feedback && (
                      <span className="text-xs text-purple-600">
                        💬 Has feedback
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {isExpanded ? '▲ Collapse' : '▼ View full report'}
                  </span>
                </button>

                {isExpanded && (
                  <>
                    <ReportBody report={report} />

                    {/* Actions */}
                    <div className="border-t border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2 bg-gray-50">
                      {/* Left side - Status info */}
                      <div className="flex items-center gap-2">
                        {isReviewed && (
                          <div className="flex items-center gap-1 text-xs text-stone-500">
                            <span>📋</span>
                            <span>Reviewed by {report.reviewed_by_display || 'Admin'}</span>
                          </div>
                        )}
                        {isRejected && report.feedback && (
                          <div className="flex items-center gap-1 text-xs text-red-600">
                            <span>💬</span>
                            <span>Feedback available</span>
                          </div>
                        )}
                      </div>

                      {/* Right side - Staff Actions */}
                      <div className="flex flex-wrap items-center gap-1">
                        {/* ✅ Edit - for drafts and rejected */}
                        {canEdit && (
                          <button
                            onClick={() => navigate(`${base}/reports/${report.id}/edit`)}
                            className="px-3 py-1.5 bg-stone-600 text-white text-xs font-medium rounded-md hover:bg-stone-700 transition-colors"
                          >
                            ✏️ Edit
                          </button>
                        )}

                        {/* ✅ Generate PDF - for drafts without PDF */}
                        {isDraft && !hasPdf && (
                          <button
                            onClick={() => handleGenerateAndAttachPDF(report.id)}
                            disabled={isExportingReport}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate and Attach PDF"
                          >
                            {isExportingReport && exportingReportId === report.id ? '...' : '📄 Generate PDF'}
                          </button>
                        )}

                        {/* ✅ Preview - for drafts with PDF */}
                        {isDraft && hasPdf && (
                          <button
                            onClick={() => handleViewPDFPreview(report.id)}
                            disabled={isExportingReport}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Preview PDF"
                          >
                            {isExportingReport && exportingReportId === report.id ? '...' : 'Preview'}
                          </button>
                        )}

                        {/* ✅ Send to Admin - for drafts/rejected with PDF */}
                        {canSendToAdmin && (
                          <button
                            onClick={() => handleSendToAdmin(report.id)}
                            disabled={isSubmitting || isExportingReport}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Send to Super Admin for review"
                          >
                            {isSubmitting ? 'Sending...' : '📤 Send to Admin'}
                          </button>
                        )}

                        {/* ✅ Delete - for draft and rejected */}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        )}

                        {/* ✅ View Feedback - for reviewed/approved/rejected with feedback */}
                        {isReviewed && report.feedback && (
                          <button
                            onClick={() => alert(`Feedback: ${report.feedback}`)}
                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors"
                          >
                            View Feedback
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-3">
          <div className="text-sm text-gray-500">
            Showing page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffRegistryReports;