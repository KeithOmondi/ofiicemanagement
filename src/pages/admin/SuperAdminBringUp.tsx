// src/pages/documents/SuperAdminBringUp.tsx

import React, { useEffect, useMemo } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { fetchDocuments, clearError } from '../../store/slices/documentSlice';
import { hasRole } from '../../store/slices/authSlice';
import type { Document as DocType, DocumentFilters } from '../../types/documents.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d: Date): Date => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const formatDateDisplay = (dateStr: string): string => {
  const d = parseDate(dateStr);
  if (!d) return 'Invalid date';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

type BringUpBucket = 'overdue' | 'today' | 'upcoming';

const getBucket = (dateStr: string): BringUpBucket => {
  const d = parseDate(dateStr);
  if (!d) return 'upcoming';
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  if (target.getTime() < today.getTime()) return 'overdue';
  if (target.getTime() === today.getTime()) return 'today';
  return 'upcoming';
};

const BUCKET_LABEL: Record<BringUpBucket, string> = {
  overdue: 'Overdue',
  today: 'Due Today',
  upcoming: 'Upcoming',
};

const BUCKET_COLOR: Record<BringUpBucket, string> = {
  overdue: 'bg-[#FFF5F5] text-[#E53E3E] border-[#FEB2B2]',
  today: 'bg-[#FFF9E6] text-[#A37F0C] border-[#FEEBC8]',
  upcoming: 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]',
};

// ─── Row ────────────────────────────────────────────────────────────────────

const BringUpRow: React.FC<{ document: DocType; bucket: BringUpBucket }> = ({ document, bucket }) => {
  const mark = document.active_mark;
  if (!mark?.bring_up_date) return null;

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white p-5 hover:shadow-md transition-all duration-200">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 truncate font-serif">{document.title}</p>
          <span
            className={`inline-flex items-center font-serif px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${BUCKET_COLOR[bucket]}`}
          >
            {BUCKET_LABEL[bucket]}
          </span>
        </div>

        {mark.instructions && (
          <p className="mt-1.5 text-xs text-slate-500 italic line-clamp-2 bg-slate-50 p-2 rounded-md border-l-2 border-[#A37F0C]/40">
            "{mark.instructions}"
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-serif bg-[#FFF9E6] px-2 py-0.5 rounded text-[#A37F0C] font-medium border border-[#FEEBC8]">
            📅 Bring up: <span>{formatDateDisplay(mark.bring_up_date)}</span>
          </span>
          {mark.marked_by_name && <span>Marked by: <span className="text-slate-700 font-medium">{mark.marked_by_name}</span></span>}
          {mark.marked_to_dept_name && <span>Dept: <span className="text-slate-700 font-medium">{mark.marked_to_dept_name}</span></span>}
          {mark.assigned_to_name && <span>Assigned to: <span className="text-slate-700 font-medium">{mark.assigned_to_name}</span></span>}
        </div>
      </div>

      {document.file_url && (
        <a
          href={document.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#A37F0C] hover:bg-[#856404] transition shadow-sm"
        >
          Open File
        </a>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminBringUp: React.FC = () => {
  const dispatch = useAppDispatch();

  // Same auth pattern as SuperAdminDocuments.tsx — pull directly from state.auth
  // and gate with hasRole, rather than the dept-head-side userSlice.
  const { user } = useAppSelector((state) => state.auth);
  const documents = useAppSelector((state) => state.documents.documents);
  const loading = useAppSelector((state) => state.documents.loading);
  const error = useAppSelector((state) => state.documents.error);

  const isSuperAdmin = hasRole(user, 'super_admin');
  const canView = !!user;

  useEffect(() => {
    if (!canView) return;

    // Super admins see every document with an active bring-up date — no
    // department or "for my action" scoping. `findAll` already grants full
    // visibility to super admins server-side; has_bring_up_date narrows it
    // down to just the marks that belong on this page.
    const params: DocumentFilters = {
      page: 1,
      limit: PAGE_SIZE,
      has_bring_up_date: true,
    };

    dispatch(fetchDocuments(params));
  }, [dispatch, canView]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const grouped = useMemo(() => {
    const withBringUp = documents.filter((d) => !!d.active_mark?.bring_up_date);

    const buckets: Record<BringUpBucket, DocType[]> = {
      overdue: [],
      today: [],
      upcoming: [],
    };

    withBringUp.forEach((doc) => {
      const bucket = getBucket(doc.active_mark!.bring_up_date!);
      buckets[bucket].push(doc);
    });

    (Object.keys(buckets) as BringUpBucket[]).forEach((key) => {
      buckets[key].sort((a, b) => {
        const aDate = parseDate(a.active_mark!.bring_up_date!)?.getTime() ?? 0;
        const bDate = parseDate(b.active_mark!.bring_up_date!)?.getTime() ?? 0;
        return aDate - bDate;
      });
    });

    return buckets;
  }, [documents]);

  const totalCount = grouped.overdue.length + grouped.today.length + grouped.upcoming.length;

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4 text-center">
        <p className="text-stone-400 text-sm">You don't have access to the Bring Up Portal.</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4 text-center">
        <p className="text-stone-400 text-sm">The Bring Up Portal is only available to super admins.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F4]">
      <Toaster position="top-right" />

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-[#1E3F20]">Bring Up Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? 'Loading internal documents…'
              : `${totalCount} active document${totalCount !== 1 ? 's' : ''} with an assigned bring-up date`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1E3F20]" />
          </div>
        ) : totalCount === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">No official documents currently have a bring-up target date assigned.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(['overdue', 'today', 'upcoming'] as BringUpBucket[]).map((bucket) =>
              grouped[bucket].length === 0 ? null : (
                <div key={bucket} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <h2 className="text-xs font-bold text-[#1E3F20] uppercase tracking-widest">
                      {BUCKET_LABEL[bucket]}
                    </h2>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                      {grouped[bucket].length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {grouped[bucket].map((doc) => (
                      <BringUpRow key={doc.id} document={doc} bucket={bucket} />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminBringUp;