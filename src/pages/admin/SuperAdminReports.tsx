// src/pages/SuperAdminReports.tsx
import { useEffect, useState, useMemo, useCallback } from 'react';
//import { useDispatch, useSelector } from 'react-redux';
import {
  fetchReports,
  reviewReport,
  archiveReport,
  selectAllReportsData,
  selectReportsLoading,
  selectReportsError,
} from '../../store/slices/principalRegistryReportSlice';
import {
  fetchDepartments,
  selectAllDepartments,
  selectDepartmentsListLoading,
} from '../../store/slices/departmentsSlice';
import type { PrincipalRegistryWeeklyReport } from '../../types/principal-registry-report.types';
import { getStatusLabel, type ReportStatus } from '../../types/principal-registry-report.types';
import { useAppDispatch, useAppSelector } from '../../store/hook';

// ─── Types ─────────────────────────────────────────────────────
interface Department {
  id: string;
  name: string;
}

interface GroupedReport {
  departmentName: string;
  reports: PrincipalRegistryWeeklyReport[];
}

// ─── Helper: Group reports by department ──────────────────────
const groupReportsByDepartment = (
  reports: PrincipalRegistryWeeklyReport[],
  departments: Department[]
): Map<string, GroupedReport> => {
  const grouped = new Map<string, GroupedReport>();

  const deptMap = new Map<string, string>();
  departments.forEach((dept) => {
    deptMap.set(dept.id, dept.name || 'Unnamed Department');
  });

  reports.forEach((report) => {
    const deptId = report.departmentId;
    if (!grouped.has(deptId)) {
      grouped.set(deptId, {
        departmentName: deptMap.get(deptId) || 'Unknown Department',
        reports: [],
      });
    }
    grouped.get(deptId)!.reports.push(report);
  });

  grouped.forEach((group) => {
    group.reports.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  return grouped;
};

const SuperAdminReports = () => {
  const dispatch = useAppDispatch();
  
  // ─── Redux State ─────────────────────────────────────────────
  const reports = useAppSelector(selectAllReportsData);
  const loading = useAppSelector(selectReportsLoading);
  const error = useAppSelector(selectReportsError);
  const departments = useAppSelector(selectAllDepartments);
  const deptsLoading = useAppSelector(selectDepartmentsListLoading);

  // ─── Local State ─────────────────────────────────────────────
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // ─── Effects ─────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchReports({}));
    dispatch(fetchDepartments({}));
  }, [dispatch]);

  // ─── Group Reports ────────────────────────────────────────────
  const groupedReports = useMemo(() => {
    return groupReportsByDepartment(reports, departments);
  }, [reports, departments]);

  // ─── Handlers ─────────────────────────────────────────────────
  const toggleDepartment = useCallback((deptId: string) => {
    setExpandedDepartments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  }, []);

  const handleViewPDF = useCallback((report: PrincipalRegistryWeeklyReport) => {
    if (report.pdfSecureUrl) {
      setPdfPreviewUrl(report.pdfSecureUrl);
      setIsPdfPreviewOpen(true);
    } else {
      alert('No PDF attached to this report.');
    }
  }, []);

  const handleClosePdfPreview = useCallback(() => {
    setIsPdfPreviewOpen(false);
    setPdfPreviewUrl(null);
  }, []);

  const handleApprove = useCallback((reportId: string) => {
    if (window.confirm('Approve this report? This will mark it as reviewed.')) {
      dispatch(reviewReport(reportId));
    }
  }, [dispatch]);

  const handleReject = useCallback((reportId: string) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (reason !== null) {
      dispatch(reviewReport(reportId));
      alert(`Report rejected: ${reason}`);
    }
  }, [dispatch]);

  const handleArchive = useCallback((reportId: string) => {
    if (window.confirm('Archive this report?')) {
      dispatch(archiveReport(reportId));
    }
  }, [dispatch]);

  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  // ─── Render Helpers ──────────────────────────────────────────
  const renderStatusBadge = useCallback((status: ReportStatus) => {
    const styles: Record<ReportStatus, string> = {
      draft: 'bg-slate-100 text-slate-700 ring-slate-600/10',
      submitted: 'bg-blue-50 text-blue-700 ring-blue-700/10',
      reviewed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      archived: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${styles[status] || styles.draft}`}>
        <span className="w-1.5 h-1.5 rounded-full fill-current mr-1.5 opacity-75"></span>
        {getStatusLabel(status)}
      </span>
    );
  }, []);

  // ─── Loading / Error States ─────────────────────────────────
  if (loading || deptsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 flex items-start gap-3">
          <svg className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-rose-900">Error loading reports</p>
            <p className="text-sm mt-0.5 text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => dispatch(fetchReports({}))}
              className="mt-3 px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Department Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and manage reports submitted by all departments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
            {reports.length} total reports
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['draft', 'submitted', 'reviewed', 'archived'] as ReportStatus[]).map((status) => {
          const count = reports.filter(r => r.status === status).length;
          const styles: Record<ReportStatus, string> = {
            draft: 'border-slate-200 bg-white',
            submitted: 'border-blue-200 bg-blue-50/30',
            reviewed: 'border-emerald-200 bg-emerald-50/30',
            archived: 'border-purple-200 bg-purple-50/30',
          };
          return (
            <div key={status} className={`p-4 rounded-xl border ${styles[status] || styles.draft}`}>
              <div className="text-xs font-medium text-slate-500 capitalize mb-1">
                {status}
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Department Folders */}
      {groupedReports.size === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm font-semibold text-slate-900">No reports found</p>
          <p className="text-xs text-slate-500 mt-1">Reports submitted by departments will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(groupedReports.entries()).map(([deptId, group]) => {
            const isExpanded = expandedDepartments.has(deptId);
            const submittedCount = group.reports.filter(r => r.status === 'submitted').length;
            const totalCount = group.reports.length;

            return (
              <div
                key={deptId}
                className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleDepartment(deptId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-amber-500 transition-transform duration-200 ${
                        isExpanded ? 'text-amber-600' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <div>
                      <span className="font-semibold text-slate-800">{group.departmentName}</span>
                      <span className="ml-2 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {totalCount} {totalCount === 1 ? 'report' : 'reports'}
                      </span>
                      {submittedCount > 0 && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {submittedCount} pending review
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Report Period
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Week Ending
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Submitted
                            </th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {group.reports.map((report) => (
                            <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">
                                  {formatDate(report.reportPeriodStart)} – {formatDate(report.reportPeriodEnd)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {renderStatusBadge(report.status)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-slate-600">
                                  {report.weekEndingDates?.map((date, i) => (
                                    <span key={i}>
                                      {formatDate(date)}
                                      {i < report.weekEndingDates.length - 1 && ', '}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-xs text-slate-500">
                                  {formatDate(report.createdAt)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleViewPDF(report)}
                                    className="px-2.5 py-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/60 rounded-lg transition-colors"
                                    disabled={!report.pdfSecureUrl}
                                  >
                                    View PDF
                                  </button>

                                  {report.status === 'submitted' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleApprove(report.id)}
                                        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleReject(report.id)}
                                        className="px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}

                                  {report.status === 'reviewed' && (
                                    <button
                                      type="button"
                                      onClick={() => handleArchive(report.id)}
                                      className="px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/60 rounded-lg transition-colors"
                                    >
                                      Archive
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── PDF Preview Modal - Full Screen ─────────────────── */}
      {isPdfPreviewOpen && pdfPreviewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 animate-in fade-in duration-200"
          onClick={(e) => {
            // Close modal when clicking backdrop, but not when clicking content
            if (e.target === e.currentTarget) {
              handleClosePdfPreview();
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-sm font-semibold text-slate-800">PDF Preview</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {pdfPreviewUrl.split('/').pop()?.slice(0, 30) || 'Document'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (pdfPreviewUrl) {
                      window.open(pdfPreviewUrl, '_blank');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={handleClosePdfPreview}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* PDF Viewer Body */}
            <div className="flex-1 overflow-hidden bg-slate-100 p-2">
              <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
                <object
                  data={pdfPreviewUrl}
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <div className="flex items-center justify-center h-full flex-col gap-4 p-8 text-center">
                    <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Unable to preview PDF directly</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Click the button below to open in a new tab
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (pdfPreviewUrl) {
                            window.open(pdfPreviewUrl, '_blank');
                          }
                        }}
                        className="mt-3 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                      >
                        Open PDF in New Tab
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 max-w-md">
                      Chrome may block PDF previews due to security restrictions. 
                      Using a new tab provides the best viewing experience.
                    </p>
                  </div>
                </object>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50/80 shrink-0">
              <p className="text-xs text-slate-500">
                Document generated on {new Date().toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClosePdfPreview}
                  className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminReports;