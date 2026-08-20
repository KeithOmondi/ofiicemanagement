// src/pages/super-admin/SuperAdminServiceWeek.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchReports,
  generatePDF,
  selectAllReports,
  selectIsLoading,
  selectError,
  selectPagination,
  downloadFile,
} from '../../store/slices/serviceweekSlice';
import {
  SERVICE_WEEK_STATUS_COLORS,
  SERVICE_WEEK_STATUS_LABELS,
  type ServiceWeekStatus,
  type ServiceWeekReport,
  type ServiceWeekFilters,
} from '../../types/service-week.types';
import type { AppDispatch } from '../../store/store';
import { Calendar, Download, Eye, FileSearch, FileSearch2 } from 'lucide-react';

const STATUS_OPTIONS: { value: ServiceWeekStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
];

function getTimestamp(): number {
  return Date.now();
}

// ─── Type for grouped reports ─────────────────────────────────────────────────
type GroupedReports = Record<string, ServiceWeekReport[]>;

// ─── Group reports by day ──────────────────────────────────────────────────
const groupReportsByDay = (reports: ServiceWeekReport[]): GroupedReports => {
  const groups: GroupedReports = {};
  
  reports.forEach((report) => {
    // Use created_at if available, otherwise fallback to week_start
    const dateStr = report.created_at || report.week_start;
    const dayKey = dateStr ? new Date(dateStr).toISOString().split('T')[0] : 'unknown';
    
    if (!groups[dayKey]) {
      groups[dayKey] = [];
    }
    groups[dayKey].push(report);
  });
  
  // Sort groups by date (newest first)
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });
  
  const sortedGroups: GroupedReports = {};
  sortedKeys.forEach((key) => {
    sortedGroups[key] = groups[key];
  });
  
  return sortedGroups;
};

// ─── Format date for display ──────────────────────────────────────────────────
const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

// ─── Check if date is today ──────────────────────────────────────────────────
const isToday = (dateStr: string): boolean => {
  const today = new Date();
  const date = new Date(dateStr);
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate();
};

// ─── Check if date is yesterday ──────────────────────────────────────────────
const isYesterday = (dateStr: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(dateStr);
  return date.getFullYear() === yesterday.getFullYear() &&
         date.getMonth() === yesterday.getMonth() &&
         date.getDate() === yesterday.getDate();
};

// ─── Get friendly date label ─────────────────────────────────────────────────
const getDateLabel = (dateStr: string): string => {
  if (dateStr === 'unknown') return 'Unknown Date';
  if (isToday(dateStr)) return '📌 Today';
  if (isYesterday(dateStr)) return '📅 Yesterday';
  return formatDateDisplay(dateStr);
};

// ─── Get status for a group ──────────────────────────────────────────────────
interface GroupStatus {
  label: string;
  color: string;
}

const getGroupStatus = (reportsInGroup: ServiceWeekReport[]): GroupStatus => {
  if (reportsInGroup.every((r) => r.status === 'submitted')) {
    return { label: 'All Submitted', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }
  if (reportsInGroup.some((r) => r.status === 'submitted')) {
    return { label: 'Partially Submitted', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
  return { label: 'All Draft', color: 'bg-gray-100 text-gray-600 border-gray-200' };
};

// ─── Read-only field display, matching the submitted-form's visual language ──
const ReadOnlyField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <label className="block text-xs font-semibold text-stone-500 mb-1">{label}</label>
    <div className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-800 min-h-[38px]">
      {value || <span className="text-gray-400">—</span>}
    </div>
  </div>
);

// ─── Full read-only report view — mirrors ServiceWeekForm's layout exactly ──
const ReportDetailView: React.FC<{ report: ServiceWeekReport }> = ({ report }) => {
  const cases = report.cases || [];

  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : null);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-6">
      {/* Report Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReadOnlyField label="Station" value={report.station} />
        <ReadOnlyField label="Division" value={report.division} />
        <ReadOnlyField label="Judge Name" value={report.judge_name} />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReadOnlyField label="Week Start" value={fmtDate(report.week_start)} />
        <ReadOnlyField label="Week End" value={fmtDate(report.week_end)} />
        <ReadOnlyField label="Report Date" value={fmtDate(report.date)} />
      </div>

      {/* Cases Table — matches the exported PDF's dark green / gold styling */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mb-2">
          Cases ({cases.length})
        </h4>
        <div className="overflow-x-auto border border-[#1E4620]/20 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[#1E4620]">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">Serial No.</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">Case Number</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">Cause - Listed Activity</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">Outcome</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-white">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-gray-400 text-sm border border-[#d6d3c4]">
                    No cases recorded
                  </td>
                </tr>
              ) : (
                cases.map((c, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? 'bg-[#f4f6f2]' : 'bg-white'}
                  >
                    <td className="px-3 py-2.5 text-gray-800 border border-[#d6d3c4]">{c.serial_number}</td>
                    <td className="px-3 py-2.5 text-gray-900 font-medium border border-[#d6d3c4]">{c.case_number}</td>
                    <td className="px-3 py-2.5 text-gray-800 border border-[#d6d3c4]">{c.cause_listed_activity}</td>
                    <td className="px-3 py-2.5 text-gray-800 border border-[#d6d3c4]">{c.outcome}</td>
                    <td className="px-3 py-2.5 text-gray-600 border border-[#d6d3c4]">{c.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submitted By — only remaining sign-off, matches the PDF's single footer block */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[#9C7A1E] mb-2">Submitted By</h4>
        <div className="p-3 border border-stone-200 rounded-lg bg-gray-50/50 max-w-md">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Name:</span> {report.prepared_by || '—'}</div>
            <div><span className="text-gray-500">Designation:</span> {report.prepared_designation || '—'}</div>
            <div><span className="text-gray-500">Date:</span> {fmtDate(report.prepared_date) || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuperAdminServiceWeek: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const reports = useSelector(selectAllReports);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const pagination = useSelector(selectPagination);

  const [selectedStatus, setSelectedStatus] = useState<ServiceWeekStatus | 'all'>('all');
  const [searchStation, setSearchStation] = useState('');
  const [searchJudge, setSearchJudge] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const filterParams: ServiceWeekFilters = {
      limit,
      offset: (currentPage - 1) * limit,
    };

    if (selectedStatus !== 'all') filterParams.status = selectedStatus;
    if (searchStation) filterParams.station = searchStation;
    if (searchJudge) filterParams.judge_name = searchJudge;

    dispatch(fetchReports(filterParams));
  }, [dispatch, selectedStatus, searchStation, searchJudge, currentPage, limit]);

  // ─── Group reports by day ──────────────────────────────────────────────────
  const groupedReports = useMemo(() => groupReportsByDay(reports), [reports]);

  const handleDownloadPDF = async (id: string, station: string) => {
    try {
      const blob = await dispatch(generatePDF(id)).unwrap();
      const timestamp = getTimestamp();
      downloadFile(blob, `service-week-${station}-${timestamp}.pdf`);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('❌ Failed to download PDF');
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const toggleExpanded = (id: string) => {
    setExpandedReportId((prev) => (prev === id ? null : id));
  };

  const toggleGroup = (dayKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [dayKey]: !prev[dayKey],
    }));
  };

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[#163328] font-medium animate-pulse">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#163328] p-6 rounded-2xl shadow-sm text-white gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#C48B28]">Daily Service Reports</h2>
          <p className="text-emerald-100/80 text-sm mt-1">Super Admin - View and manage all daily service week case returns</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as ServiceWeekStatus | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#C48B28] focus:border-transparent outline-none bg-gray-50"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[150px]">
          <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search station..."
            value={searchStation}
            onChange={(e) => setSearchStation(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#C48B28] focus:border-transparent outline-none bg-gray-50"
          />
        </div>

        <div className="relative flex-1 min-w-[150px]">
          <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search judge..."
            value={searchJudge}
            onChange={(e) => setSearchJudge(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#C48B28] focus:border-transparent outline-none bg-gray-50"
          />
        </div>

        <span className="text-sm text-gray-500 self-center ml-auto font-medium">
          Showing {reports.length} of {pagination.total} report(s)
        </span>
      </div>

      {/* ─── Grouped Reports by Day ──────────────────────────────────────── */}
      <div className="space-y-4">
        {Object.keys(groupedReports).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <FileSearch2 className="w-10 h-10 text-gray-300" />
              <p className="text-gray-500 font-medium">No reports found</p>
              <p className="text-xs text-gray-400">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          Object.entries(groupedReports).map(([dayKey, dayReports]) => {
            const isExpanded = expandedGroups[dayKey] !== false; // Default to expanded
            const groupStatus = getGroupStatus(dayReports);
            const totalCases = dayReports.reduce((sum, r) => sum + (r.cases?.length || 0), 0);
            const dateLabel = getDateLabel(dayKey);

            return (
              <div key={dayKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Group Header - Daily */}
                <div
                  className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 cursor-pointer hover:bg-gray-100/70 transition-colors"
                  onClick={() => toggleGroup(dayKey)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isToday(dayKey) ? 'bg-emerald-100 text-emerald-700' : 'bg-[#163328]/10 text-[#163328]'
                    }`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {dateLabel}
                        {isToday(dayKey) && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {dayReports.length} report{dayReports.length > 1 ? 's' : ''} · {totalCases} case{totalCases !== 1 ? 's' : ''}
                        {dayKey !== 'unknown' && (
                          <span className="ml-2 text-gray-300">· {new Date(dayKey).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${groupStatus.color}`}>
                      {groupStatus.label}
                    </span>
                    <button
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                      onClick={(e) => { e.stopPropagation(); toggleGroup(dayKey); }}
                    >
                      <svg
                        className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Group Body */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#163328] text-white">
                        <tr>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Station</th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Judge</th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Week</th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Cases</th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">Prepared By</th>
                          <th className="px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dayReports.map((report) => {
                          const isReportExpanded = expandedReportId === report.id;

                          return (
                            <React.Fragment key={report.id}>
                              <tr className="hover:bg-amber-50/40 transition-colors">
                                <td className="px-4 py-3 font-semibold text-gray-900">
                                  {report.station}
                                  {report.division && <span className="text-gray-400 text-xs ml-1 font-normal">({report.division})</span>}
                                </td>
                                <td className="px-4 py-3 text-gray-700">{report.judge_name}</td>
                                <td className="px-4 py-3 text-gray-600">
                                  {new Date(report.week_start).toLocaleDateString()} – {new Date(report.week_end).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-gray-700 font-medium">{report.cases?.length || 0}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${SERVICE_WEEK_STATUS_COLORS[report.status]}`}>
                                    {SERVICE_WEEK_STATUS_LABELS[report.status]}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{report.prepared_by}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <button
                                      onClick={() => handleDownloadPDF(report.id, report.station)}
                                      className="px-2.5 py-1 bg-[#C48B28] text-white text-xs font-medium rounded-lg hover:bg-[#A8741E] transition-colors inline-flex items-center gap-1"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      PDF
                                    </button>

                                    <button
                                      onClick={() => toggleExpanded(report.id)}
                                      aria-expanded={isReportExpanded}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-[#163328] text-white text-xs font-medium rounded-lg hover:bg-[#0f241c] transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      View
                                      <svg
                                        className={`w-3 h-3 transition-transform ${isReportExpanded ? 'rotate-180' : ''}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2.5}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {isReportExpanded && (
                                <tr>
                                  <td colSpan={7} className="px-4 py-4 bg-gray-50 border-t border-b border-gray-200">
                                    <ReportDetailView report={report} />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-3">
          <div className="text-sm text-gray-500 font-medium">
            Showing page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3.5 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3.5 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminServiceWeek;