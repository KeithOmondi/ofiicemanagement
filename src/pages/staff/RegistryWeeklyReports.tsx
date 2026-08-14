// ============================================================
// src/features/station-engagement/components/RegistryWeeklyReports.tsx
// ============================================================

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchReports,
  fetchEngagementStats,
  deleteReport,
  submitReport,
  reviewReport,
  generatePDF,
  setFilters,
  selectAllReports,
  selectEngagementStats,
  selectIsLoading,
  selectIsSubmitting,
  selectIsGeneratingPDF,
  selectError,
  selectPagination,
} from '../../store/slices/stationEngagement.slice';
import type { AppDispatch } from '../../store/store';
import type { 
  ReportStatus, 
  EngagementReportFilters, 
  Urgency,
  StationEngagementReport,
  Engagement,
  EscalationItem,
} from '../../types/station-engagement.types';
import type { SuccessionCourtCategory } from '../../types/succession-courts';

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

// ─── Helper to format date to YYYY-MM-DD ──────────────────────────────────
const formatDateToYYYYMMDD = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

const RegistryWeeklyReports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const reports = useSelector(selectAllReports);
  const stats = useSelector(selectEngagementStats);
  const isLoading = useSelector(selectIsLoading);
  const isSubmitting = useSelector(selectIsSubmitting);
  const isGeneratingPDF = useSelector(selectIsGeneratingPDF);
  const error = useSelector(selectError);
  const pagination = useSelector(selectPagination);

  // ─── Local State ────────────────────────────────────────────────────────────
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<SuccessionCourtCategory | 'all'>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<Urgency | 'all'>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState({
    status: 'approved' as 'approved' | 'rejected',
    feedback: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  // ─── Get current week dates ──────────────────────────────────────────────
// ─── Get current week dates ──────────────────────────────────────────────
const getWeekDates = useCallback(() => {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  // Reset time to midnight UTC to avoid timezone issues
  monday.setUTCHours(0, 0, 0, 0);
  
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setUTCHours(0, 0, 0, 0);
  
  return {
    monday: monday.toISOString().split('T')[0],
    friday: friday.toISOString().split('T')[0],
  };
}, []);

  const currentWeek = useMemo(() => getWeekDates(), [getWeekDates]);

  // ─── Get available weeks from reports ────────────────────────────────────
  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    reports.forEach(r => {
      if (r.week_start) {
        weeks.add(formatDateToYYYYMMDD(r.week_start));
      }
    });
    return Array.from(weeks).sort().reverse();
  }, [reports]);

  // ─── Derived: the week actually in effect ────────────────────────────────
  const effectiveWeek = selectedWeek || availableWeeks[0] || currentWeek.monday;

  // ─── Fetch reports when filters change ──────────────────────────────────
// ─── Fetch reports when filters change ──────────────────────────────────
useEffect(() => {
  // Ensure dates are in YYYY-MM-DD format without timezone issues
  const weekStartStr = formatDateToYYYYMMDD(effectiveWeek);
  const weekEndStr = formatDateToYYYYMMDD(currentWeek.friday);

  const filterParams: EngagementReportFilters = {
    week_start: weekStartStr,
    week_end: weekEndStr,
    limit,
    offset: (currentPage - 1) * limit,
  };

  if (selectedStatus !== 'all') filterParams.status = selectedStatus;
  if (selectedCategory !== 'all') filterParams.category = selectedCategory;
  if (selectedUrgency !== 'all') filterParams.urgency = selectedUrgency;

  console.log('📅 Fetching reports with dates:', { 
    week_start: weekStartStr, 
    week_end: weekEndStr,
    effectiveWeek,
    currentWeekFriday: currentWeek.friday
  });

  dispatch(setFilters(filterParams));
  dispatch(fetchReports(filterParams));
}, [dispatch, selectedStatus, selectedCategory, selectedUrgency, effectiveWeek, currentWeek.friday, currentPage, limit]);

  // ─── Fetch stats ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchEngagementStats({}));
  }, [dispatch]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await dispatch(deleteReport(id)).unwrap();
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  const handleSubmit = async (id: string) => {
    if (!confirm('Submit this report for review?')) return;
    try {
      await dispatch(submitReport(id)).unwrap();
    } catch (err) {
      console.error('Failed to submit report:', err);
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
      // Refresh reports
      const weekStartStr = formatDateToYYYYMMDD(effectiveWeek);
      const weekEndStr = formatDateToYYYYMMDD(currentWeek.friday);
      
      const filterParams: EngagementReportFilters = {
        week_start: weekStartStr,
        week_end: weekEndStr,
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

  const handleGeneratePDF = async (id: string) => {
    try {
      await dispatch(generatePDF(id)).unwrap();
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  const openReviewModal = (id: string) => {
    setSelectedReportId(id);
    setShowReviewModal(true);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // ─── Helper functions ─────────────────────────────────────────────────────
  const getEngagementCount = (report: StationEngagementReport): number => {
    return report.engagements?.length || 0;
  };

  const getEscalationCount = (report: StationEngagementReport): number => {
    return report.escalations?.length || 0;
  };

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
    return urgencies.reduce((a, b) => priority[a] > priority[b] ? a : b);
  };

  // ─── Format date for display ─────────────────────────────────────────────
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading weekly reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Weekly Engagement Reports</h2>
          <p className="text-gray-500">
            Week: {effectiveWeek ? formatDisplayDate(effectiveWeek) : 'Select a week'} - {effectiveWeek ? formatDisplayDate(new Date(new Date(effectiveWeek).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString()) : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/registry/reports/new')}
            className="px-4 py-2 bg-[#1E4620] text-white rounded-lg hover:bg-[#132A1D] transition-colors"
          >
            + New Report
          </button>
        </div>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        {/* Week Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Week:</label>
          <select
            value={effectiveWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1E4620] focus:outline-none"
          >
            {availableWeeks.length > 0 ? (
              availableWeeks.map((week) => (
                <option key={week} value={week}>
                  {formatDisplayDate(week)} - {formatDisplayDate(new Date(new Date(week).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString())}
                </option>
              ))
            ) : (
              <option value={currentWeek.monday}>
                {formatDisplayDate(currentWeek.monday)} - {formatDisplayDate(currentWeek.friday)} (Current)
              </option>
            )}
          </select>
        </div>

        {/* Status Filter */}
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

        {/* Category Filter */}
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

        {/* Urgency Filter */}
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
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categories</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagements</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escalations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Highest Urgency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Support Person</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No reports found for this week
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const highestUrgency = getHighestUrgency(report);
                  return (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        {formatDisplayDate(report.week_start)} - {formatDisplayDate(report.week_end)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {report.categories?.map((cat) => (
                            <span 
                              key={cat} 
                              className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[cat]}`}
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{report.total_stations_assigned}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{getEngagementCount(report)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{getEscalationCount(report)}</td>
                      <td className="px-6 py-4">
                        {highestUrgency ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${URGENCY_COLORS[highestUrgency]}`}>
                            {URGENCY_LABELS[highestUrgency]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[report.status]}`}>
                          {STATUS_LABELS[report.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {report.support_person_id?.slice(0, 8) || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            onClick={() => navigate(`/registry/reports/${report.id}`)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1"
                          >
                            View
                          </button>

                          {report.status === 'draft' && (
                            <>
                              <button
                                onClick={() => navigate(`/registry/reports/${report.id}/edit`)}
                                className="text-gray-600 hover:text-gray-800 text-xs font-medium px-2 py-1"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleSubmit(report.id)}
                                disabled={isSubmitting}
                                className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 disabled:opacity-50"
                              >
                                Submit
                              </button>
                              <button
                                onClick={() => handleDelete(report.id)}
                                className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1"
                              >
                                Delete
                              </button>
                            </>
                          )}

                          {report.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => openReviewModal(report.id)}
                                className="text-purple-600 hover:text-purple-800 text-xs font-medium px-2 py-1"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => handleGeneratePDF(report.id)}
                                disabled={isGeneratingPDF}
                                className="text-gray-600 hover:text-gray-800 text-xs font-medium px-2 py-1 disabled:opacity-50"
                              >
                                PDF
                              </button>
                            </>
                          )}

                          {(report.status === 'approved' || report.status === 'reviewed') && (
                            <button
                              onClick={() => handleGeneratePDF(report.id)}
                              disabled={isGeneratingPDF}
                              className="text-gray-600 hover:text-gray-800 text-xs font-medium px-2 py-1 disabled:opacity-50"
                            >
                              PDF
                            </button>
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
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

export default RegistryWeeklyReports;