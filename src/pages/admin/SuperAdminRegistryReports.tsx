// src/features/station-engagement/components/SuperAdminRegistryReports.tsx

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchReports,
  fetchEngagementStats,
  reviewReport,
  //generatePDFPreview,
  setFilters,
  selectAllReports,
  selectEngagementStats,
  selectIsLoading,
  selectIsSubmitting,
  //selectIsGeneratingPDF,
  selectError,
  selectPagination,
} from '../../store/slices/stationEngagement.slice';
import type { SuccessionCourtCategory } from '../../types/succession-courts';
import type { AppDispatch } from '../../store/store';
import type {
  EngagementReportFilters,
  ReportStatus,
  Urgency,
  StationEngagementReport,
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

interface ReportWithDisplay extends StationEngagementReport {
  submitted_by_display?: string;
  reviewed_by_display?: string;
  approved_by_display?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

const SuperAdminRegistryReports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const reports = useSelector(selectAllReports) as ReportWithDisplay[];
  const stats = useSelector(selectEngagementStats);
  const isLoading = useSelector(selectIsLoading);
  const isSubmitting = useSelector(selectIsSubmitting);
  //const isGeneratingPDF = useSelector(selectIsGeneratingPDF);
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
  //const [viewingPDF, setViewingPDF] = useState<string | null>(null);

  // ─── Fetch reports when filters change ──────────────────────────────────
  useEffect(() => {
    const filterParams: EngagementReportFilters = {
      limit,
      offset: (currentPage - 1) * limit,
      visibleToAdmin: true,
    };

    if (selectedStatus !== 'all') filterParams.status = selectedStatus;
    if (selectedCategory !== 'all') filterParams.category = selectedCategory;
    if (selectedUrgency !== 'all') filterParams.urgency = selectedUrgency;

    dispatch(setFilters(filterParams));
    dispatch(fetchReports(filterParams));
    dispatch(fetchEngagementStats({}));
  }, [dispatch, selectedStatus, selectedCategory, selectedUrgency, currentPage, limit]);

  // ─── Handlers ──────────────────────────────────────────────────────────

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
        visibleToAdmin: true,
      };
      if (selectedStatus !== 'all') filterParams.status = selectedStatus;
      if (selectedCategory !== 'all') filterParams.category = selectedCategory;
      if (selectedUrgency !== 'all') filterParams.urgency = selectedUrgency;
      dispatch(fetchReports(filterParams));
    } catch (err) {
      console.error('Failed to review report:', err);
    }
  };



  const openReviewModal = (id: string) => {
    setSelectedReportId(id);
    setShowReviewModal(true);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // ─── Helper functions ─────────────────────────────────────────────────

  const getHighestUrgency = (report: StationEngagementReport): Urgency | null => {
    const urgencies: Urgency[] = [];
    report.engagements?.forEach((e) => {
      if (e.urgency) urgencies.push(e.urgency);
    });
    report.escalations?.forEach((e) => {
      if (e.urgency) urgencies.push(e.urgency);
    });
    if (urgencies.length === 0) return null;
    const priority = { high: 3, medium: 2, low: 1 };
    return urgencies.reduce((a, b) => (priority[a] > priority[b] ? a : b));
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Submitted Engagement Reports</h2>
          <p className="text-gray-500">Super Admin - Review and approve/reject submitted engagement reports</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_reports}</p>
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

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Week</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Categories</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Urgency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted By</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No submitted reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const highestUrgency = getHighestUrgency(report);
                  const submittedByDisplay = report.submitted_by_display || report.submitted_by || 'Unknown';
                  const hasPdf = !!report.pdfSecureUrl;
                  
                  const isSubmitted = report.status === 'submitted';
                  const isReviewed = report.status === 'reviewed';
                  const isApproved = report.status === 'approved';
                  const isRejected = report.status === 'rejected';

                  return (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {new Date(report.week_start).toLocaleDateString()} – {new Date(report.week_end).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {report.categories?.map((cat) => (
                            <span key={cat} className={`px-2 py-0.5 text-xs font-medium rounded-full ${CATEGORY_COLORS[cat]}`}>
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[report.status]}`}>
                          {STATUS_LABELS[report.status]}
                        </span>
                        {report.feedback && (
                          <span className="ml-1 text-xs text-purple-600" title="Has feedback">
                            💬
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {highestUrgency ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${URGENCY_COLORS[highestUrgency]}`}>
                            {URGENCY_LABELS[highestUrgency]}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{submittedByDisplay}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {/* ✅ View PDF - for reports with PDF attached */}
                     {hasPdf && (
  
    <a href={report.pdfSecureUrl!}
    target="_blank"
    rel="noopener noreferrer"
    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors inline-block"
    title="View PDF document"
  >
    📄 View PDF
  </a>
)}

                          {/* ✅ Review - only for submitted */}
                          {isSubmitted && (
                            <button
                              onClick={() => openReviewModal(report.id)}
                              className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors"
                              title="Review this report"
                            >
                              Review
                            </button>
                          )}

                          {/* ✅ View Feedback - for reviewed/approved/rejected with feedback */}
                          {(isReviewed || isApproved || isRejected) && report.feedback && (
                            <button
                              onClick={() => {
                                const reviewer = report.reviewed_by_display || 'Admin';
                                alert(`📋 Feedback from ${reviewer}:\n\n${report.feedback}`);
                              }}
                              className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-md hover:bg-purple-200 transition-colors"
                              title="View Feedback"
                            >
                              💬 Feedback
                            </button>
                          )}

                          {/* ✅ Status badge for reviewed/approved/rejected */}
                          {isReviewed && !report.feedback && (
                            <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md">
                              Reviewed
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-md">
                              ✅ Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md">
                              ❌ Rejected
                            </span>
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
    </div>
  );
};

export default SuperAdminRegistryReports;