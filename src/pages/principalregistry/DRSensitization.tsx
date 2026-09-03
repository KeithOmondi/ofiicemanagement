// src/pages/principalregistry/DRSensitization.tsx

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchSensitizations,
  deleteSensitization,
  selectAllSensitizationsData,
  selectSensitizationsLoading,
  selectSensitizationsPagination,
} from '../../store/slices/principalRegistryReportSlice';
import {
  FileText,
  List as ListIcon,
  Users,
  Plus,
} from 'lucide-react';
import { SensitizationModal } from '../../components/modals/SensitizationModal';
import toast, { Toaster } from 'react-hot-toast';
import type { SensitizationResponse } from '../../types/principal-registry-report.types';
import DRDocs from './DRDocs';

// ─── Helper Functions ──────────────────────────────────────────────────────

const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

const sensitizationStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    draft: 'bg-stone-100 text-stone-600 ring-stone-200',
    submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
  };
  return map[status] || 'bg-stone-100 text-stone-600 ring-stone-200';
};

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function GoldButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c9a84c] px-4 py-2 text-sm font-semibold text-[#1a3d1c] hover:bg-[#b8973f] transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Tab Component ─────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
      active
        ? 'border-[#c9a84c] text-[#1a3d1c]'
        : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
    }`}
  >
    {icon}
    {label}
    {count !== undefined && count > 0 && (
      <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        active ? 'bg-[#c9a84c]/20 text-[#1a3d1c]' : 'bg-stone-100 text-stone-500'
      }`}>
        {count}
      </span>
    )}
  </button>
);

// ─── DRSensitization Page ────────────────────────────────────────────────

type TabType = 'list' | 'documents';

const DRSensitization: React.FC = () => {
  const dispatch = useAppDispatch();
  const sensitizations = useAppSelector(selectAllSensitizationsData);
  const loading = useAppSelector(selectSensitizationsLoading);
  const pagination = useAppSelector(selectSensitizationsPagination);

  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingSensitization, setEditingSensitization] = useState<SensitizationResponse | null>(null);

  useEffect(() => {
    dispatch(fetchSensitizations({}));
  }, [dispatch]);

  const handleOpenCreate = () => {
    setEditingSensitization(null);
    setShowModal(true);
  };

  const handleOpenEdit = (record: SensitizationResponse) => {
    setEditingSensitization(record);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSensitization(null);
    dispatch(fetchSensitizations({}));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this sensitization?')) {
      dispatch(deleteSensitization(id))
        .unwrap()
        .then(() => toast.success('Sensitization deleted.'))
        .catch((err) => toast.error(typeof err === 'string' ? err : 'Failed to delete sensitization.'));
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#1c1917' },
          success: { iconTheme: { primary: '#1a3d1c', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#1a3d1c] flex items-center gap-2">
              <Users size={20} className="text-[#c9a84c]" />
              Sensitization Memos
            </h1>
            <p className="mt-0.5 text-sm text-stone-500">
              {activeTab === 'list' 
                ? `${pagination.total} memo${pagination.total !== 1 ? 's' : ''}`
                : 'Manage sensitization documents'
              }
            </p>
          </div>
          <GoldButton onClick={handleOpenCreate} icon={<Plus size={14} />}>
            New Sensitization
          </GoldButton>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-stone-200 bg-white rounded-t-xl px-2">
          <div className="flex gap-1 overflow-x-auto">
            <TabButton
              active={activeTab === 'list'}
              onClick={() => setActiveTab('list')}
              icon={<ListIcon size={16} />}
              label="Sensitization Memos"
              count={pagination.total}
            />
            <TabButton
              active={activeTab === 'documents'}
              onClick={() => setActiveTab('documents')}
              icon={<FileText size={16} />}
              label="All Documents"
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'list' ? (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#c9a84c]/10 border-b border-stone-200">
                    <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Memo No.</th>
                    <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Location</th>
                    <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Travel Dates</th>
                    <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Status</th>
                    <th className="border border-stone-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700">Created</th>
                    <th className="border border-stone-200 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-stone-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && sensitizations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-stone-200 py-16 text-center text-sm text-stone-400">
                        Loading…
                      </td>
                    </tr>
                  ) : sensitizations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-stone-200 py-16 text-center text-sm text-stone-400">
                        No sensitization memos found
                      </td>
                    </tr>
                  ) : (
                    sensitizations.map((s) => (
                      <tr key={s.id} className="border-b border-stone-100 transition hover:bg-stone-50/60">
                        <td className="border border-stone-200 px-4 py-3 font-mono text-xs text-stone-500">{s.memoNumber}</td>
                        <td className="border border-stone-200 px-4 py-3 text-stone-800">{s.data.location}</td>
                        <td className="border border-stone-200 px-4 py-3 text-stone-600">
                          {formatDateForDisplay(s.data.travelStartDate)} – {formatDateForDisplay(s.data.travelEndDate)}
                        </td>
                        <td className="border border-stone-200 px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${sensitizationStatusColor(s.status)}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="border border-stone-200 px-4 py-3 text-sm text-stone-500">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td className="border border-stone-200 px-4 py-3">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => handleOpenEdit(s)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                              Edit
                            </button>
                            {s.status === 'draft' && (
                              <button onClick={() => handleDelete(s.id)} className="text-xs font-semibold text-red-600 hover:text-red-800">
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <DRDocs
              entityType="sensitization"
              userRole="dept_head"
              showAllDocuments={true}
            />
          </div>
        )}
      </div>

      <SensitizationModal
        isOpen={showModal}
        onClose={handleCloseModal}
        editingSensitization={editingSensitization}
      />
    </div>
  );
};

export default DRSensitization;