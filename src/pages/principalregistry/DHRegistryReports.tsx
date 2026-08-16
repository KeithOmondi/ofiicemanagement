// src/pages/DHRegistryReports.tsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchReports,
  submitReport,
  reviewReport,
  archiveReport,
  deleteReport,
  clearFilters,
  setPage,
  setPageSize,
  selectAllReportsData,
  selectReportsLoading,
  selectReportsError,
  selectReportsPagination,
  selectReportCounts,
  selectHasSelectedReports,
  selectSelectedCount,
  selectAreAllReportsSelected,
  fetchReportById,
  selectCurrentReportData,
  clearCurrentReport,
  selectSelectedReportIds,
  toggleSelectReport,
  selectAllReports,
  deselectAllReports,
  createReport,
  updateReport,
  generatePDF,
  selectGeneratingPDF,
  selectPDFResult,
  clearPDFResult,
} from '../../store/slices/principalRegistryReportSlice';
import type {
  ReportStatus,
  ReportFilters,
  PrincipalRegistryWeeklyReport,
  ReportFormData,
} from '../../types/principal-registry-report.types';
import {
  getStatusLabel,
  canSubmit as canSubmitReport,
  canReview,
  canArchive,
  canEdit,
  canGeneratePDF as canGeneratePDFReport,
  hasPDFAttached,
} from '../../types/principal-registry-report.types';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import DHReportQuestionsModal from './DHReportQuestionsModal';

const DHRegistryReports = () => {
  const dispatch = useAppDispatch();
  const { departmentId } = useParams<{ departmentId: string }>();

  // ─── Redux State ─────────────────────────────────────────────
  const reports = useAppSelector(selectAllReportsData);
  const loading = useAppSelector(selectReportsLoading);
  const error = useAppSelector(selectReportsError);
  const pagination = useAppSelector(selectReportsPagination);
  const counts = useAppSelector(selectReportCounts);
  const hasSelected = useAppSelector(selectHasSelectedReports);
  const selectedCount = useAppSelector(selectSelectedCount);
  const selectedReportIds = useAppSelector(selectSelectedReportIds);
  const allSelected = useAppSelector(selectAreAllReportsSelected);
  const currentReport = useAppSelector(selectCurrentReportData);
  const generatingPDF = useAppSelector(selectGeneratingPDF);
  const pdfResult = useAppSelector(selectPDFResult);

  // ─── Local State ─────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const initialFetchDone = useRef(false);
  const prevFiltersRef = useRef<ReportFilters>({});

  // ─── Memoized Filters ────────────────────────────────────────
// In DHRegistryReports.tsx - Update filtersToApply
const filtersToApply = useMemo(() => {
  const result: ReportFilters = {};
  if (statusFilter) result.status = statusFilter;
  // ✅ Only add departmentId if it's a valid UUID
  if (departmentId && departmentId !== 'pr' && departmentId.length === 36) {
    result.departmentId = departmentId;
  }
  return result;
}, [statusFilter, departmentId]);


  // ─── Effects ─────────────────────────────────────────────────
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      dispatch(fetchReports(filtersToApply));
    }
  }, [dispatch, filtersToApply]);

  useEffect(() => {
    if (!initialFetchDone.current) return;

    const currentFiltersStr = JSON.stringify(filtersToApply);
    const prevFiltersStr = JSON.stringify(prevFiltersRef.current);

    if (currentFiltersStr !== prevFiltersStr) {
      prevFiltersRef.current = filtersToApply;
      dispatch(fetchReports(filtersToApply));
    }
  }, [dispatch, filtersToApply]);

  // ─── Modal Handlers ──────────────────────────────────────────
  const handleViewReport = useCallback((id: string) => {
    setModalMode('view');
    dispatch(fetchReportById(id));
    setIsModalOpen(true);
  }, [dispatch]);

  const handleEditReport = useCallback((id: string) => {
    setModalMode('edit');
    dispatch(fetchReportById(id));
    setIsModalOpen(true);
  }, [dispatch]);

  const handleCreateReport = useCallback(() => {
    setModalMode('create');
    dispatch(clearCurrentReport());
    setIsModalOpen(true);
  }, [dispatch]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    dispatch(clearCurrentReport());
    dispatch(clearPDFResult());
  }, [dispatch]);

  const currentReportId = currentReport?.id;

  const handleModalSave = useCallback((data: ReportFormData) => {
    if (modalMode === 'create') {
      const payload = { ...data, departmentId: departmentId || data.departmentId };
      dispatch(createReport(payload));
    } else if (modalMode === 'edit' && currentReportId) {
      dispatch(updateReport({ id: currentReportId, data }));
    }

    setIsModalOpen(false);
    dispatch(clearCurrentReport());
    dispatch(fetchReports(filtersToApply));
  }, [dispatch, modalMode, currentReportId, filtersToApply, departmentId]);

  const initialModalData = useMemo((): ReportFormData => {
    const defaultData = {
      weekEndingDates: [],
      reportPeriodStart: new Date().toISOString().split('T')[0],
      reportPeriodEnd: new Date().toISOString().split('T')[0],
      departmentId: departmentId || '',
      administrativeOverview: {
        keyActivities: [],
        notableIssues: [],
        resolutionsStatus: [],
      },
      caseManagement: {
        form30PendingCount: 0,
        forwardedToGp: false,
        submissionDates: null,
        noticesSubmittedCount: null,
        nonSubmissionReason: null,
        expectedSubmissionDate: null,
      },
      automationStatus: {
        excelUpdateStatus: '',
        systemBuildStatus: '',
      },
      serviceDeliveryChallenges: {
        hasChallenges: false,
        challengeDetails: null,
        proposedSolutions: [],
        needsRhcIntervention: false,
        interventionDetails: null,
      },
      highlights: {
        achievements: [],
      },
      otherInformation: {
        ctsEfilingChanges: [],
        gpChanges: [],
        signOff: {
          preparedDate: new Date().toISOString().split('T')[0],
          preparedByName: '',
          preparedByDesignation: '',
        },
      },
    };

    if (modalMode === 'create' || !currentReport) {
      return defaultData;
    }

    return {
      weekEndingDates: currentReport.weekEndingDates || [],
      reportPeriodStart: currentReport.reportPeriodStart || defaultData.reportPeriodStart,
      reportPeriodEnd: currentReport.reportPeriodEnd || defaultData.reportPeriodEnd,
      departmentId: currentReport.departmentId || departmentId || '',
      administrativeOverview: currentReport.administrativeOverview || defaultData.administrativeOverview,
      caseManagement: currentReport.caseManagement || defaultData.caseManagement,
      automationStatus: currentReport.automationStatus || defaultData.automationStatus,
      serviceDeliveryChallenges: currentReport.serviceDeliveryChallenges || defaultData.serviceDeliveryChallenges,
      highlights: currentReport.highlights || defaultData.highlights,
      otherInformation: currentReport.otherInformation || defaultData.otherInformation,
    };
  }, [modalMode, currentReport, departmentId]);

  // ─── PDF Handlers ────────────────────────────────────────────

  const handleGeneratePDF = useCallback((reportId: string) => {
    if (window.confirm('Generate PDF for this report? The PDF will be attached to the report and available for preview.')) {
      dispatch(generatePDF({ reportId }));
    }
  }, [dispatch]);

  const handlePreviewPDF = useCallback((url: string) => {
    if (url) {
      setPdfPreviewUrl(url);
      setIsPdfPreviewOpen(true);
    } else {
      alert('PDF URL not available.');
    }
  }, []);

  const handleClosePdfPreview = useCallback(() => {
    setIsPdfPreviewOpen(false);
    setPdfPreviewUrl(null);
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    if (pdfPreviewUrl) {
      window.open(pdfPreviewUrl, '_blank');
    }
  }, [pdfPreviewUrl]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handlePageChange = useCallback((newPage: number) => {
    dispatch(setPage(newPage));
    dispatch(fetchReports({ ...filtersToApply, page: newPage }));
  }, [dispatch, filtersToApply]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    dispatch(setPageSize(newSize));
    dispatch(fetchReports({ ...filtersToApply, page: 1, pageSize: newSize }));
  }, [dispatch, filtersToApply]);

  const handleStatusFilterChange = useCallback((status: ReportStatus | '') => {
    setStatusFilter(status);
  }, []);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (allSelected) {
      dispatch(deselectAllReports());
    } else {
      dispatch(selectAllReports());
    }
  }, [dispatch, allSelected]);

  const handleToggleSelectReport = useCallback((reportId: string) => {
    dispatch(toggleSelectReport(reportId));
  }, [dispatch]);

  const handleSubmit = useCallback((reportId: string) => {
    if (window.confirm(
      'Are you sure you want to submit this report for review?\n\n' +
      'This will:\n' +
      '• Lock the report from further edits\n' +
      '• Send it to the admin for review\n' +
      '• The admin will review the attached PDF\n\n' +
      'Do you want to proceed?'
    )) {
      dispatch(submitReport(reportId))
        .unwrap()
        .then(() => {
          alert('Report submitted successfully! The admin has been notified.');
        })
        .catch((error: string) => {
          alert(error || 'Failed to submit report. Please ensure a PDF is attached.');
        });
    }
  }, [dispatch]);

  const handleReview = useCallback((reportId: string) => {
    const action = window.confirm(
      'Review this report?\n\n' +
      'Click OK to APPROVE\n' +
      'Click Cancel to REJECT'
    );
    
    if (action) {
      dispatch(reviewReport(reportId))
        .unwrap()
        .then(() => {
          alert('Report approved successfully!');
        })
        .catch((error: string) => {
          alert(error || 'Failed to approve report.');
        });
    } else {
      const reason = window.prompt('Please provide a reason for rejection:');
      if (reason !== null) {
        dispatch(reviewReport(reportId))
          .unwrap()
          .then(() => {
            alert(`Report rejected: ${reason}`);
          })
          .catch((error: string) => {
            alert(error || 'Failed to reject report.');
          });
      }
    }
  }, [dispatch]);

  const handleArchive = useCallback((reportId: string) => {
    if (window.confirm('Are you sure you want to archive this report?')) {
      dispatch(archiveReport(reportId));
    }
  }, [dispatch]);

  const handleDelete = useCallback((reportId: string) => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      dispatch(deleteReport(reportId));
    }
  }, [dispatch]);

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
    setStatusFilter('');
    setSearchTerm('');
    dispatch(fetchReports(departmentId ? { departmentId } : {}));
  }, [dispatch, departmentId]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // ─── Filtered Reports ─────────────────────────────────────────
  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;
    const term = searchTerm.toLowerCase();
    return reports.filter((report) =>
      report.weekEndingDates?.some((date) => formatDate(date).toLowerCase().includes(term)) ||
      formatDate(report.reportPeriodStart).toLowerCase().includes(term) ||
      formatDate(report.reportPeriodEnd).toLowerCase().includes(term) ||
      report.status.toLowerCase().includes(term)
    );
  }, [reports, searchTerm]);

  // ─── Render Helpers ──────────────────────────────────────────
  const renderStatusBadge = (status: ReportStatus) => {
    const label = getStatusLabel(status);
    const styles: Record<ReportStatus, string> = {
      draft: 'bg-slate-100 text-slate-700 ring-slate-600/10',
      submitted: 'bg-blue-50 text-blue-700 ring-blue-700/10',
      reviewed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      archived: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${styles[status] || styles.draft}`}>
        <span className="w-1.5 h-1.5 rounded-full fill-current mr-1.5 opacity-75"></span>
        {label}
      </span>
    );
  };

  const renderPDFBadge = (report: PrincipalRegistryWeeklyReport) => {
    if (report.pdfSecureUrl) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Attached
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/10">
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        Missing
      </span>
    );
  };

  const renderActionButtons = (report: PrincipalRegistryWeeklyReport) => {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => handleViewReport(report.id)}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors shadow-xs"
        >
          View
        </button>

        {canEdit(report) && (
          <button
            type="button"
            onClick={() => handleEditReport(report.id)}
            className="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          >
            Edit
          </button>
        )}

        {canGeneratePDFReport(report) && !hasPDFAttached(report) && (
          <button
            type="button"
            onClick={() => handleGeneratePDF(report.id)}
            className="px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-colors"
          >
            Generate PDF
          </button>
        )}

        {hasPDFAttached(report) && (
          <button
            type="button"
            onClick={() => {
              const url = report.pdfSecureUrl;
              if (url) {
                handlePreviewPDF(url);
              } else {
                alert('PDF URL not available.');
              }
            }}
            className="px-2.5 py-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-colors"
          >
            Preview
          </button>
        )}

        {canSubmitReport(report) && hasPDFAttached(report) && (
          <button
            type="button"
            onClick={() => handleSubmit(report.id)}
            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-colors"
          >
            Submit
          </button>
        )}

        {canReview(report) && (
          <button
            type="button"
            onClick={() => handleReview(report.id)}
            className="px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
          >
            Review
          </button>
        )}

        {canArchive(report) && (
          <button
            type="button"
            onClick={() => handleArchive(report.id)}
            className="px-2.5 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors"
          >
            Archive
          </button>
        )}

        <button
          type="button"
          onClick={() => handleDelete(report.id)}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Delete Report"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    );
  };

  const renderStatusCounts = () => {
    const statuses: ReportStatus[] = ['draft', 'submitted', 'reviewed', 'archived'];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statuses.map((status) => {
          const isActive = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => handleStatusFilterChange(isActive ? '' : status)}
              className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                isActive
                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
              }`}
            >
              <div className="text-xs font-medium text-slate-500 capitalize mb-1">
                {getStatusLabel(status)}
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {counts[status] || 0}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ─── Loading / Error States ─────────────────────────────────
  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading reports registry...</p>
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
              onClick={() => dispatch(fetchReports(filtersToApply))}
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
      {/* Dynamic Notifications */}
      {generatingPDF && (
        <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-4 text-blue-800 shadow-xs flex items-center gap-3 animate-pulse">
          <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
          <span className="text-sm font-medium">Generating official PDF report package...</span>
        </div>
      )}

      {pdfResult?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">PDF generated and attached successfully!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const url = pdfResult?.secureUrl || pdfResult?.pdfUrl;
                if (url) {
                  handlePreviewPDF(url);
                } else {
                  alert('PDF URL not available.');
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Preview PDF
            </button>
            <button
              type="button"
              onClick={() => dispatch(clearPDFResult())}
              className="p-1 text-emerald-600 hover:text-emerald-800 rounded-md hover:bg-emerald-100/50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Principal Registry Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage weekly department submissions and document workflows.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateReport}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs hover:shadow-md focus:ring-2 focus:ring-blue-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Weekly Report
        </button>
      </div>

      {renderStatusCounts()}

      {/* Search & Utility Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Show</label>
            <select
              value={pagination.pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {(statusFilter || searchTerm) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Header */}
      {hasSelected && (
        <div className="bg-slate-900 text-white rounded-xl p-3 px-4 flex items-center justify-between shadow-sm animate-in fade-in duration-150">
          <span className="text-sm font-medium">
            <span className="font-bold text-blue-400">{selectedCount}</span> {selectedCount === 1 ? 'report' : 'reports'} selected
          </span>
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
              Bulk Submit
            </button>
            <button type="button" className="px-3 py-1.5 text-xs font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors">
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3.5 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Report Period
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Week Ending
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  PDF
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-semibold text-slate-900">No reports found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting search query or active filter settings.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = selectedReportIds.includes(report.id);
                  return (
                    <tr
                      key={report.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectReport(report.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">
                          {formatDate(report.reportPeriodStart)} – {formatDate(report.reportPeriodEnd)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs text-slate-600 max-w-xs truncate">
                          {report.weekEndingDates?.map((date, i) => (
                            <span key={i}>
                              {formatDate(date)}
                              {i < report.weekEndingDates.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {renderStatusBadge(report.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {renderPDFBadge(report)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        {renderActionButtons(report)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{((pagination.page - 1) * pagination.pageSize) + 1}</span> to{' '}
            <span className="font-semibold text-slate-700">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of{' '}
            <span className="font-semibold text-slate-700">{pagination.total}</span> entries
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                pagination.page === 1
                  ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              {pagination.page}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                pagination.page * pagination.pageSize >= pagination.total
                  ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Report Questions Modal */}
      <DHReportQuestionsModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        departmentId={departmentId}
        initialData={initialModalData}
        onSave={handleModalSave}
        readOnly={modalMode === 'view'}
        title={
          modalMode === 'create'
            ? 'Create New Weekly Report'
            : modalMode === 'edit'
            ? 'Edit Weekly Report'
            : 'View Weekly Report'
        }
      />

      {/* ─── PDF Preview Modal - Full Screen ─────────────────── */}
      {isPdfPreviewOpen && pdfPreviewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 animate-in fade-in duration-200"
          onClick={(e) => {
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
                  {currentReport?.pdfFileName || pdfPreviewUrl.split('/').pop()?.slice(0, 30) || 'Document'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
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
                        onClick={handleOpenInNewTab}
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

export default DHRegistryReports;