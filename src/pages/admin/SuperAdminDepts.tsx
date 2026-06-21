// src/pages/admin/SuperAdminDepts.tsx
import React, { useEffect, useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  setDepartmentFilters,
  resetDepartmentFilters,
  clearSelectedDepartment,
  clearError,
  clearSuccess,
  selectAllDepartments,
  selectDepartmentFilters,
  selectDepartmentsListLoading,
  selectDepartmentMutating,
  selectDepartmentsError,
  selectDepartmentsSuccess,
  type DepartmentWithUserCount,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from '../../store/slices/departmentsSlice';

/* ============================================================
   SPINNER
============================================================ */

const Spinner = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <svg
    className={`animate-spin ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-current`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

/* ============================================================
   DELETE MODAL
============================================================ */

interface DeleteModalProps {
  department: DepartmentWithUserCount;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteModal = ({ department, onConfirm, onCancel, loading }: DeleteModalProps) => {
  const hasUsers = department.user_count > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-100 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Delete Department</h3>
            <p className="mt-1 text-sm text-slate-500">
              {hasUsers
                ? `This department has ${department.user_count} active member(s). Reassign them first before deleting.`
                : `Are you sure you want to delete the department "${department.name}"? This action cannot be undone.`}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || hasUsers}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition"
          >
            {loading && <Spinner />}
            {hasUsers ? 'Cannot Delete' : 'Delete Department'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   DEPARTMENT MODAL (ADD/EDIT)
============================================================ */

interface DepartmentModalProps {
  initialDepartment: DepartmentWithUserCount | null;
  onSubmit: (data: CreateDepartmentInput | UpdateDepartmentInput) => void;
  onClose: () => void;
  loading: boolean;
}

// Local form type that includes optional is_active for both modes
interface DepartmentFormData {
  name: string;
  code: string;
  is_active?: boolean;
}

const DepartmentModal = ({ initialDepartment, onSubmit, onClose, loading }: DepartmentModalProps) => {
  const isEdit = !!initialDepartment;

  const [form, setForm] = useState<DepartmentFormData>(() => ({
    name: initialDepartment?.name || '',
    code: initialDepartment?.code || '',
    is_active: initialDepartment?.is_active ?? true,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (key: keyof DepartmentFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name?.trim()) {
      newErrors.name = 'Department name is required';
    } else if (form.name.length > 150) {
      newErrors.name = 'Name cannot exceed 150 characters';
    }
    if (form.code && form.code.length > 20) {
      newErrors.code = 'Code cannot exceed 20 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Build the appropriate payload
    if (isEdit) {
      const payload: UpdateDepartmentInput = {};
      if (form.name !== initialDepartment?.name) payload.name = form.name;
      if (form.code !== initialDepartment?.code) payload.code = form.code;
      if (form.is_active !== initialDepartment?.is_active) payload.is_active = form.is_active;
      onSubmit(payload);
    } else {
      const payload: CreateDepartmentInput = {
        name: form.name,
        code: form.code || undefined,
      };
      onSubmit(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg my-8 rounded-xl bg-white shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? 'Edit Department' : 'Add New Department'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? `Editing ${initialDepartment?.name}` : 'Create a new department'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Department Name *
              </label>
              <input
                className={`w-full rounded-md border ${
                  errors.name ? 'border-red-300' : 'border-slate-200'
                } bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g., Human Resources"
                required
              />
              {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
            </div>

            {/* Code */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                Department Code
              </label>
              <input
                className={`w-full rounded-md border ${
                  errors.code ? 'border-red-300' : 'border-slate-200'
                } bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase`}
                value={form.code}
                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                placeholder="e.g., HR"
              />
              {errors.code && <span className="text-xs text-red-500">{errors.code}</span>}
              <p className="text-xs text-slate-400">Optional, max 20 characters</p>
            </div>

            {/* Active status (only for edit) */}
            {isEdit && (
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Active
                </label>
                <input
                  type="checkbox"
                  checked={form.is_active ?? true}
                  onChange={(e) => setField('is_active', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading && <Spinner />}
              {isEdit ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const SuperAdminDepts = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const departments = useAppSelector(selectAllDepartments);
  const filters = useAppSelector(selectDepartmentFilters);
  const listLoading = useAppSelector(selectDepartmentsListLoading);
  const mutating = useAppSelector(selectDepartmentMutating);
  const error = useAppSelector(selectDepartmentsError);
  const success = useAppSelector(selectDepartmentsSuccess);

  // Local state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithUserCount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentWithUserCount | null>(null);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    filters.is_active === true ? 'active' : filters.is_active === false ? 'inactive' : 'all'
  );

  // Fetch departments on mount and filter changes
  useEffect(() => {
    const apiFilters: { search?: string; is_active?: boolean } = {};
    if (searchInput) apiFilters.search = searchInput;
    if (statusFilter === 'active') apiFilters.is_active = true;
    else if (statusFilter === 'inactive') apiFilters.is_active = false;
    dispatch(fetchDepartments(apiFilters));
  }, [dispatch, searchInput, statusFilter]);

  // Toast notifications
  useEffect(() => {
    if (success) {
      toast.success('Operation completed successfully');
      dispatch(clearSuccess());
    }
  }, [success, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        dispatch(setDepartmentFilters({ search: searchInput || undefined }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput, dispatch, filters.search]);

  const openAddModal = () => {
    setEditingDepartment(null);
    setModalOpen(true);
  };

  const openEditModal = (dept: DepartmentWithUserCount) => {
    setEditingDepartment(dept);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDepartment(null);
    dispatch(clearSelectedDepartment());
  };

  const handleCreate = async (data: CreateDepartmentInput | UpdateDepartmentInput) => {
    try {
      await dispatch(createDepartment(data as CreateDepartmentInput)).unwrap();
      closeModal();
    } catch (err) {
      console.error('Create department error:', err);
    }
  };

  const handleUpdate = async (data: CreateDepartmentInput | UpdateDepartmentInput) => {
    if (!editingDepartment) return;
    try {
      await dispatch(updateDepartment({ id: editingDepartment.id, data })).unwrap();
      closeModal();
    } catch (err) {
      console.error('Update department error:', err);
    }
  };

  const handleSubmit = (data: CreateDepartmentInput | UpdateDepartmentInput) => {
    if (editingDepartment) {
      handleUpdate(data);
    } else {
      handleCreate(data);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteDepartment(deleteTarget.id)).unwrap();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete department error:', err);
    }
  };

  const handleResetFilters = () => {
    dispatch(resetDepartmentFilters());
    setSearchInput('');
    setStatusFilter('all');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getStatusBadgeClass = (isActive: boolean) => {
    return isActive
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-red-100 text-red-700';
  };

  // Stats
  const totalDepts = departments.length;
  const activeDepts = departments.filter((d) => d.is_active).length;
  const totalUsers = departments.reduce((sum, d) => sum + d.user_count, 0);

  const headers = ['Name', 'Code', 'Members', 'Status', 'Created', 'Actions'];

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Modals */}
      {modalOpen && (
        <DepartmentModal
          initialDepartment={editingDepartment ?? null}
          onSubmit={handleSubmit}
          onClose={closeModal}
          loading={mutating}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          department={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={mutating}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Department Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {totalDepts} department{totalDepts !== 1 ? 's' : ''} found
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Department
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase">Total Departments</p>
            <p className="text-2xl font-bold text-slate-900">{totalDepts}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase">Active Departments</p>
            <p className="text-2xl font-bold text-emerald-600">{activeDepts}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase">Total Members</p>
            <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase">Inactive Departments</p>
            <p className="text-2xl font-bold text-red-600">{totalDepts - activeDepts}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or code..."
                className="pl-9 pr-3 py-2 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-slate-200 text-sm px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={handleResetFilters}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
            >
              Reset filters
            </button>
          </div>
        </div>

        {/* Departments Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {headers.map((header, idx) => (
                    <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center">
                      <div className="flex justify-center">
                        <Spinner size="md" />
                      </div>
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="py-20 text-center text-slate-400">
                      No departments found
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                            {dept.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{dept.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        {dept.code || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {dept.user_count}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(dept.is_active)}`}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {formatDate(dept.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(dept)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md transition"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(dept)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDepts;