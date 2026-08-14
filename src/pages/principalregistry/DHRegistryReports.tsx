// ============================================================
// src/features/station-engagement/components/RegistryReports.tsx
// ============================================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchReportById,
  fetchReportSummary,
  submitReport,
  reviewReport,
  generatePDF,
  deleteReport,
  selectCurrentReport,
  selectReportSummary,
  selectIsLoading,
  selectIsSubmitting,
  selectIsGeneratingPDF,
  selectError,
  clearCurrentReport,
} from '../../store/slices/stationEngagement.slice';
import type { SuccessionCourtCategory } from '../../types/succession-courts';
import type { AppDispatch } from '../../store/store';
import { 
  REASON_NOT_REACHED_OPTIONS, 
  //URGENCY_OPTIONS,
  type ReviewReportPayload,
  type ReportStatus,
  type Urgency,
  type Engagement,
  type EscalationItem,
} from '../../types/station-engagement.types';

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

const MODE_ICONS: Record<string, string> = {
  phone_call: '📞',
  whatsapp: '💬',
  email: '📧',
  physical_visit: '🏢',
  webinar_followup: '💻',
  video_call: '🎥',
};

const MODE_LABELS: Record<string, string> = {
  phone_call: 'Phone Call',
  whatsapp: 'WhatsApp',
  email: 'Email',
  physical_visit: 'Physical Visit',
  webinar_followup: 'Webinar Follow-up',
  video_call: 'Video Call',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  resolved: 'bg-green-100 text-green-800',
  ongoing: 'bg-yellow-100 text-yellow-800',
  escalated: 'bg-red-100 text-red-800',
};

const STATUS_BADGE_LABELS: Record<string, string> = {
  resolved: 'Resolved',
  ongoing: 'Ongoing',
  escalated: 'Escalated',
};

const RegistryReports: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const report = useSelector(selectCurrentReport);
  const summary = useSelector(selectReportSummary);
  const isLoading = useSelector(selectIsLoading);
  const isSubmitting = useSelector(selectIsSubmitting);
  const isGeneratingPDF = useSelector(selectIsGeneratingPDF);
  const error = useSelector(selectError);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewReportPayload>({
    status: 'approved',
    feedback: '',
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchReportById(id));
      dispatch(fetchReportSummary(id));
    }

    return () => {
      dispatch(clearCurrentReport());
    };
  }, [dispatch, id]);

  const handleSubmit = async () => {
    if (!id) return;
    if (window.confirm('Submit this report for review?')) {
      try {
        await dispatch(submitReport(id)).unwrap();
      } catch (err) {
        console.error('Failed to submit report:', err);
      }
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      await dispatch(reviewReport({
        id,
        data: reviewData,
      })).unwrap();
      setShowReviewModal(false);
      setReviewData({ status: 'approved', feedback: '' });
      // Refresh the report
      dispatch(fetchReportById(id));
      dispatch(fetchReportSummary(id));
    } catch (err) {
      console.error('Failed to review report:', err);
    }
  };

  const handleGeneratePDF = async () => {
    if (!id) return;
    try {
      await dispatch(generatePDF(id)).unwrap();
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await dispatch(deleteReport(id)).unwrap();
        navigate('/registry/reports');
      } catch (err) {
        console.error('Failed to delete report:', err);
      }
    }
  };

  if (isLoading && !report) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Report not found</p>
        <button
          onClick={() => navigate('/registry/reports')}
          className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
        >
          ← Back to Reports
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/registry/reports')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Reports
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            Engagement Report
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-gray-500">
              Week: {new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}
            </p>
            <span className="text-gray-300">|</span>
            <div className="flex flex-wrap gap-1">
              {report.categories?.map((cat) => (
                <span 
                  key={cat} 
                  className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[cat]}`}
                >
                  Category {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Status Badge */}
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[report.status]}`}>
            {STATUS_LABELS[report.status]}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Total Stations</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total_stations}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Engaged</p>
            <p className="text-2xl font-bold text-green-600">{summary.engaged_count}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Unengaged</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.unengaged_count}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Escalated</p>
            <p className="text-2xl font-bold text-red-600">{summary.escalated_count}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Support Person</p>
            <p className="text-lg font-semibold text-gray-900">
              {report.support_person_id?.slice(0, 8) || '-'}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Executive Summary */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Executive Summary</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{report.executive_summary || 'No summary provided'}</p>
      </div>

      {/* Engagements */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagements ({report.engagements?.length || 0})</h3>
        {report.engagements?.length === 0 ? (
          <p className="text-gray-500 text-sm">No engagements recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Station</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Contact</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mode</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Urgency</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.engagements.map((engagement: Engagement, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{engagement.station_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[engagement.station_category]}`}>
                        {engagement.station_category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(engagement.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {engagement.contact_person}
                      {engagement.contact_role && <span className="text-gray-400 text-xs"> ({engagement.contact_role})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg">{MODE_ICONS[engagement.mode]}</span>
                      <span className="ml-1 text-xs text-gray-500">{MODE_LABELS[engagement.mode]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGE_CLASSES[engagement.status]}`}>
                        {STATUS_BADGE_LABELS[engagement.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {engagement.urgency ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${URGENCY_COLORS[engagement.urgency]}`}>
                          {URGENCY_LABELS[engagement.urgency]}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {engagement.issues_raised?.join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unengaged Stations */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Unengaged Stations ({report.unengaged_stations?.length || 0})</h3>
        {report.unengaged_stations?.length === 0 ? (
          <p className="text-gray-500 text-sm">All stations have been engaged</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Station</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Reason Not Reached</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Detail</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Planned Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.unengaged_stations.map((station, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{station.station_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[station.category]}`}>
                        {station.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {station.reason_not_reached ? 
                        REASON_NOT_REACHED_OPTIONS.find(r => r.value === station.reason_not_reached)?.label || station.reason_not_reached
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {station.reason_not_reached_detail || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {station.planned_engagement_date ? 
                        new Date(station.planned_engagement_date).toLocaleDateString() 
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Escalations */}
      {report.escalations && report.escalations.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Escalated Issues ({report.escalations.length})</h3>
          <div className="space-y-4">
            {report.escalations.map((escalation: EscalationItem, index: number) => (
              <div key={index} className="border-l-4 border-red-400 pl-4 py-2 bg-red-50 rounded-r-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{escalation.station_name}</p>
                      {escalation.urgency && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${URGENCY_COLORS[escalation.urgency]}`}>
                          {URGENCY_LABELS[escalation.urgency]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Issue:</span> {escalation.issue}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">Why:</span> {escalation.why_needs_escalation}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Recommended:</span> {escalation.recommended_action}
                    </p>
                    {escalation.source_engagement_id && (
                      <p className="text-xs text-gray-400 mt-1">
                        Source Engagement ID: {escalation.source_engagement_id.slice(0, 8)}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    escalation.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {escalation.status || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Sections */}
      {(report.additional_issues || report.recurring_patterns || report.priorities) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.additional_issues && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Issues</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.additional_issues}</p>
            </div>
          )}
          {report.recurring_patterns && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recurring Patterns</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.recurring_patterns}</p>
            </div>
          )}
        </div>
      )}

      {report.priorities && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Priorities for Next Week</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{report.priorities}</p>
        </div>
      )}

      {/* Feedback */}
      {report.feedback && (
        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">Review Feedback</h3>
          <p className="text-yellow-700 whitespace-pre-wrap">{report.feedback}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
        {report.status === 'draft' && (
          <>
            <button
              onClick={() => navigate(`/registry/reports/${id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Report
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Review'}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </>
        )}

        {report.status === 'submitted' && (
          <>
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Review Report
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isGeneratingPDF ? 'Generating...' : 'Generate PDF'}
            </button>
          </>
        )}

        {(report.status === 'approved' || report.status === 'reviewed') && (
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isGeneratingPDF ? 'Generating...' : 'Generate PDF'}
          </button>
        )}
      </div>

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
                  placeholder="Provide feedback for the report..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
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
    </div>
  );
};

export default RegistryReports;