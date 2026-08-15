// ============================================================
// src/features/station-engagement/components/SuperAdminRegistryReports.tsx
// ============================================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchReports,
  fetchEngagementStats,
  deleteReport,
  reviewReport,
  generatePDF,
  generateExcel,
  generateBoth,
  setFilters,
  selectAllReports,
  selectEngagementStats,
  selectIsLoading,
  selectIsSubmitting,
  selectIsGeneratingPDF,
  selectIsGeneratingExcel,
  selectError,
  selectPagination,
  downloadFile,
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

interface FeedbackData {
  reportId: string;
  feedback: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

// Extend the report type to include display fields from the backend
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

// ─── Full rich report body — mirrors RegistryNewReport Sections A–F ───────

const ReportBody: React.FC<{ report: ReportWithDisplay }> = ({ report }) => {
  const engagements: Engagement[] = report.engagements ?? [];
  const escalations: EscalationItem[] = report.escalations ?? [];
  const unengaged = report.unengaged_stations ?? [];

  const submittedByDisplay = report.submitted_by_display || report.submitted_by || 'Unknown';

  return (
    <div className="border-t border-stone-200 px-6 py-5 bg-white">
      {/* Report Metadata - Submitter Info */}
      <div className="mb-4 p-3 bg-stone-50 rounded-md border border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ReadField 
            label="Submitted By" 
            value={
              <span className="font-medium text-stone-900">
                {submittedByDisplay}
              </span>
            } 
          />
          <ReadField 
            label="Submitted At" 
            value={report.submitted_at ? fmtDate(report.submitted_at) : 'Not submitted'} 
          />
          <ReadField 
            label="Last Updated" 
            value={report.updated_at ? fmtDate(report.updated_at) : fmtDate(report.created_at)} 
          />
        </div>
      </div>

      {/* A. Executive Summary */}
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mb-2">
        A. Executive Summary
      </h3>
      <ReadTextArea label="" value={report.executive_summary} rows={3} />

      {/* B. Station Engagement Log */}
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
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_COLORS[e.station_category]}`}
                    >
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

      {/* C. Stations Not Yet Engaged */}
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
        C. Stations Not Yet Engaged ({unengaged.length})
      </h3>
      <div className="space-y-2">
        {unengaged.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-4">
            All assigned stations were engaged this week.
          </div>
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
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_COLORS[n.category]}`}
                      >
                        {n.category}
                      </span>
                    )}
                  </span>
                }
              />
              <ReadField
                label="Reason Not Reached"
                value={n.reason_not_reached ? n.reason_not_reached.replace('_', ' ').toUpperCase() : undefined}
              />
              {n.reason_not_reached === 'other' && (
                <ReadField label="Detail" value={n.reason_not_reached_detail} />
              )}
              <ReadField label="Planned Engagement Date" value={fmtDate(n.planned_engagement_date)} />
            </div>
          </div>
        ))}
      </div>

      {/* D. Additional Escalation Items */}
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
        D. Additional Issues for the Registrar's Attention ({escalations.length})
      </h3>
      <div className="space-y-3">
        {escalations.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-4">No additional escalation items.</div>
        )}
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
            <div className="mb-3">
              <ReadTextArea label="Issue" value={e.issue} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ReadTextArea label="Why It Needs Escalation" value={e.why_needs_escalation} />
              <ReadTextArea label="Recommended Action" value={e.recommended_action} />
            </div>
          </div>
        ))}
      </div>

      {/* E. Patterns */}
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
        E. Recurring or Cross-Station Patterns
      </h3>
      <ReadTextArea label="" value={report.recurring_patterns} rows={2} />

      {/* F. Priorities */}
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
        F. Priorities for Next Week
      </h3>
      <ReadTextArea label="" value={report.priorities} rows={2} />

      {report.feedback && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mt-6 mb-2">
            Registrar Feedback
          </h3>
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-md text-sm text-stone-800 whitespace-pre-wrap">
            {report.feedback}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────

const SuperAdminRegistryReports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState({
    status: 'approved' as 'approved' | 'rejected',
    feedback: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  // Which report cards are expanded to show the full A–F body
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Feedback state
  const [feedbackData, setFeedbackData] = useState<Record<string, FeedbackData>>({});
  const [editingFeedback, setEditingFeedback] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // ─── Export State ────────────────────────────────────────────────────────
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);

  // ─── Fetch reports when filters change ──────────────────────────────────
  useEffect(() => {
    const filterParams: EngagementReportFilters = {
      limit,
      offset: (currentPage - 1) * limit,
    };

    if (selectedStatus !== 'all') filterParams.status = selectedStatus;
    if (selectedCategory !== 'all') filterParams.category = selectedCategory;
    if (selectedUrgency !== 'all') filterParams.urgency = selectedUrgency;

    dispatch(setFilters(filterParams));
    dispatch(fetchReports(filterParams));
    dispatch(fetchEngagementStats({}));
  }, [dispatch, selectedStatus, selectedCategory, selectedUrgency, currentPage, limit]);

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

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId) return;

    try {
      await dispatch(reviewReport({
        id: selectedReportId,
        data: reviewData,
      })).unwrap();
      setShowReviewModal(false);
      setSelectedReportId(null);
      setReviewData({ status: 'approved', feedback: '' });
      const filterParams: EngagementReportFilters = {
        limit,
        offset: (currentPage - 1) * limit,
      };
      if (selectedStatus !== 'all') filterParams.status = selectedStatus;
      if (selectedCategory !== 'all') filterParams.category = selectedCategory;
      if (selectedUrgency !== 'all') filterParams.urgency = selectedUrgency;
      dispatch(fetchReports(filterParams));
    } catch (err) {
      console.error('Failed to review report:', err);
    }
  };

  // ─── Export Handlers ──────────────────────────────────────────────────

  const handleGeneratePDF = async (id: string) => {
    setExportingReportId(id);
    try {
      const result = await dispatch(generatePDF(id)).unwrap();
      if (result?.blob) {
        downloadFile(result.blob, `engagement-report-${id}.pdf`);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setExportingReportId(null);
    }
  };

  const handleGenerateExcel = async (id: string) => {
    setExportingReportId(id);
    try {
      const result = await dispatch(generateExcel(id)).unwrap();
      if (result?.blob) {
        downloadFile(result.blob, `engagement-report-${id}.xlsx`);
      }
    } catch (err) {
      console.error('Failed to generate Excel:', err);
    } finally {
      setExportingReportId(null);
    }
  };

  const handleGenerateBoth = async (id: string) => {
    setExportingReportId(id);
    try {
      const result = await dispatch(generateBoth(id)).unwrap();
      if (result?.blob) {
        downloadFile(result.blob, `engagement-report-${id}.zip`);
      }
    } catch (err) {
      console.error('Failed to generate exports:', err);
    } finally {
      setExportingReportId(null);
    }
  };

  const openReviewModal = (id: string) => {
    setSelectedReportId(id);
    setShowReviewModal(true);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // ─── Feedback Handlers ──────────────────────────────────────────────────

  const handleFeedbackSubmit = (reportId: string, feedback: string, rating: 1 | 2 | 3 | 4 | 5) => {
    setFeedbackData((prev) => ({
      ...prev,
      [reportId]: { reportId, feedback, rating },
    }));
    setShowFeedbackModal(false);
    setEditingFeedback(null);
  };

  const handleEditFeedback = (reportId: string) => {
    setEditingFeedback(reportId);
    setShowFeedbackModal(true);
  };

  const handleDeleteFeedback = (reportId: string) => {
    if (confirm('Delete this feedback?')) {
      setFeedbackData((prev) => {
        const newData = { ...prev };
        delete newData[reportId];
        return newData;
      });
    }
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

  const renderStars = (rating: number) => '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

  // Check if a report is currently being exported
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
          <h2 className="text-2xl font-bold text-gray-900">All Engagement Reports</h2>
          <p className="text-gray-500">Super Admin view - Review all station engagement reports</p>
        </div>
        <button
          onClick={() => navigate('/super-admin/reports/new')}
          className="px-4 py-2 bg-[#1E4620] text-white rounded-lg hover:bg-[#132A1D] transition-colors"
        >
          + New Report
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Total Reports</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_reports}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Draft</p>
            <p className="text-2xl font-bold text-gray-500">{stats.by_status.draft}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Submitted</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.by_status.submitted}</p>
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
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Engagement Rate</p>
            <p className="text-2xl font-bold text-blue-600">{stats.engagement_rate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Category Stats */}
      {stats && (
        <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <span className="text-sm font-medium text-gray-700">By Category:</span>
          <span className="text-sm"><span className="font-medium text-purple-600">A:</span> {stats.by_category.A}</span>
          <span className="text-sm"><span className="font-medium text-blue-600">B:</span> {stats.by_category.B}</span>
          <span className="text-sm"><span className="font-medium text-amber-600">C:</span> {stats.by_category.C}</span>
          <span className="text-sm"><span className="font-medium text-rose-600">D:</span> {stats.by_category.D}</span>
        </div>
      )}

      {/* Urgency Stats */}
      {stats && stats.by_urgency && (
        <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <span className="text-sm font-medium text-gray-700">By Urgency:</span>
          <span className="text-sm"><span className="font-medium text-red-600">High:</span> {stats.by_urgency.high}</span>
          <span className="text-sm"><span className="font-medium text-yellow-600">Medium:</span> {stats.by_urgency.medium}</span>
          <span className="text-sm"><span className="font-medium text-green-600">Low:</span> {stats.by_urgency.low}</span>
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

      {/* Reports — rich, read-only Section A–F layout per report */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-8 text-center text-gray-500">
            No reports found
          </div>
        ) : (
          reports.map((report) => {
            const highestUrgency = getHighestUrgency(report);
            const feedback = feedbackData[report.id];
            const isExpanded = expandedIds.has(report.id);
            const isExportingReport = isExporting(report.id);
            
            const submittedByDisplay = report.submitted_by_display || report.submitted_by || 'Unknown';

            return (
              <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Summary header row — click to expand the full rich report below */}
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
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {isExpanded ? '▲ Collapse' : '▼ View full report'}
                  </span>
                </button>

                {isExpanded && (
                  <>
                    <ReportBody report={report} />

                    {/* Actions - All buttons at the top for easier access */}
                    <div className="border-t border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2 bg-gray-50">
                      {/* Left side - Feedback */}
                      <div className="flex items-center gap-2">
                        {feedback ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm" title={`Rating: ${feedback.rating}/5`}>
                              {renderStars(feedback.rating)}
                            </span>
                            <button onClick={() => handleEditFeedback(report.id)} className="text-xs text-blue-600 hover:text-blue-800">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteFeedback(report.id)} className="text-xs text-red-600 hover:text-red-800">
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingFeedback(report.id);
                              setShowFeedbackModal(true);
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            + Add Feedback
                          </button>
                        )}
                      </div>

                      {/* Right side - All action buttons grouped */}
                      <div className="flex flex-wrap items-center gap-1">
                        {/* Review button - only for submitted reports */}
                        {report.status === 'submitted' && (
                          <button
                            onClick={() => openReviewModal(report.id)}
                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors"
                          >
                            Review
                          </button>
                        )}

                        {/* Delete button - for draft and rejected */}
                        {(report.status === 'draft' || report.status === 'rejected') && (
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        )}

                        {/* Divider */}
                        <span className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Export buttons */}
                        <button
                          onClick={() => handleGeneratePDF(report.id)}
                          disabled={isExportingReport}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download PDF"
                        >
                          {isExportingReport && exportingReportId === report.id && isGeneratingPDF ? '...' : 'PDF'}
                        </button>
                        <button
                          onClick={() => handleGenerateExcel(report.id)}
                          disabled={isExportingReport}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download Excel"
                        >
                          {isExportingReport && exportingReportId === report.id && isGeneratingExcel ? '...' : 'Excel'}
                        </button>
                        <button
                          onClick={() => handleGenerateBoth(report.id)}
                          disabled={isExportingReport}
                          className="px-3 py-1.5 bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download Both (ZIP)"
                        >
                          {isExportingReport && exportingReportId === report.id ? '...' : 'All'}
                        </button>
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

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Review Report</h3>
              <p className="text-sm text-gray-500">Approve or reject this engagement report</p>
            </div>
            <form onSubmit={handleReview} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                <select
                  value={reviewData.status}
                  onChange={(e) => setReviewData({ ...reviewData, status: e.target.value as 'approved' | 'rejected' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="approved">✅ Approve</option>
                  <option value="rejected">❌ Reject</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback (Optional)</label>
                <textarea
                  value={reviewData.feedback}
                  onChange={(e) => setReviewData({ ...reviewData, feedback: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                  placeholder="Provide feedback for the report submitter..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedReportId(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {feedbackData[editingFeedback || ''] ? 'Edit Feedback' : 'Add Feedback'}
              </h3>
              <p className="text-sm text-gray-500">Rate and provide feedback on this report</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        const current = feedbackData[editingFeedback || ''] || { reportId: editingFeedback || '', feedback: '', rating: 0 };
                        setFeedbackData((prev) => ({
                          ...prev,
                          [editingFeedback || '']: { ...current, reportId: editingFeedback || '', rating: star as 1 | 2 | 3 | 4 | 5 },
                        }));
                      }}
                      className={`text-2xl transition-colors ${
                        (feedbackData[editingFeedback || '']?.rating || 0) >= star
                          ? 'text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                <textarea
                  value={feedbackData[editingFeedback || '']?.feedback || ''}
                  onChange={(e) => {
                    const current = feedbackData[editingFeedback || ''] || { reportId: editingFeedback || '', feedback: '', rating: 0 };
                    setFeedbackData((prev) => ({
                      ...prev,
                      [editingFeedback || '']: { ...current, feedback: e.target.value },
                    }));
                  }}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                  placeholder="Provide detailed feedback for the report..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setEditingFeedback(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = feedbackData[editingFeedback || ''];
                    if (current && current.rating > 0) {
                      handleFeedbackSubmit(editingFeedback || '', current.feedback, current.rating);
                    } else {
                      alert('Please select a rating before submitting.');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {feedbackData[editingFeedback || ''] ? 'Update' : 'Submit'} Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminRegistryReports;