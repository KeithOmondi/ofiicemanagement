// src/pages/super-admin/SuperAdminServiceWeek.tsx

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchReports,
  selectAllReports,
  selectIsLoading,
  selectError,
  selectPagination,
} from '../../store/slices/serviceweekSlice';
import {
  SERVICE_WEEK_STATUS_COLORS,
  SERVICE_WEEK_STATUS_LABELS,
  type ServiceWeekStatus,
  type ServiceWeekReport,
} from '../../types/service-week.types';
import type { AppDispatch } from '../../store/store';
import type { ServiceWeekFilters } from '../../types/service-week.types';

const STATUS_OPTIONS: { value: ServiceWeekStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
];



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

const JOServiceWeek: React.FC = () => {
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



  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const toggleExpanded = (id: string) => {
    setExpandedReportId((prev) => (prev === id ? null : id));
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
          <h2 className="text-2xl font-bold tracking-tight text-[#C48B28]">Service Week Reports</h2>
          <p className="text-emerald-100/80 text-sm mt-1">Super Admin - View and manage all service week case returns</p>
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

        <input
          type="text"
          placeholder="Search station..."
          value={searchStation}
          onChange={(e) => setSearchStation(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#C48B28] focus:border-transparent outline-none bg-gray-50"
        />

        <input
          type="text"
          placeholder="Search judge..."
          value={searchJudge}
          onChange={(e) => setSearchJudge(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-[#C48B28] focus:border-transparent outline-none bg-gray-50"
        />

        <span className="text-sm text-gray-500 self-center ml-auto font-medium">
          Showing {reports.length} of {pagination.total} report(s)
        </span>
      </div>

      {/* Reports Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No reports found
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const isExpanded = expandedReportId === report.id;

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
                              onClick={() => toggleExpanded(report.id)}
                              aria-expanded={isExpanded}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#163328] text-white text-xs font-medium rounded-lg hover:bg-[#0f241c] transition-colors"
                            >
                              View
                              <svg
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 bg-gray-50 border-t border-b border-gray-200">
                            <ReportDetailView report={report} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

export default JOServiceWeek;