// ============================================================
// src/features/succession-courts/components/SuperAdminSuccessionCourts.tsx
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCourts,
  fetchAvailableSupportPersons,
  createCourt,
  updateCourt,
  deleteCourt,
  assignSupportPerson,
  removeSupportPerson,
  assignSupportPersonByCategory,
  assignSupportPersonByStation,
  reassignSupportPerson,
  setFilters,
  selectAllCourts,
  selectAvailableSupportPersons,
  selectCourtIsLoading,
  selectCourtIsSubmitting,
  selectCourtError,
  selectCourtCounts,
  selectFilteredCourts,
} from '../../store/slices/successionCourts.slice';
import type { 
  SuccessionCourtCategory, 
  SuccessionCourtWithUser,
  AssignSupportPersonByCategoryPayload,
  AssignSupportPersonByStationPayload,
  ReassignSupportPersonPayload,
} from '../../types/succession-courts';
import type { AppDispatch } from '../../store/store';

const CATEGORIES: SuccessionCourtCategory[] = ['A', 'B', 'C', 'D'];

const CATEGORY_DETAILS: Record<SuccessionCourtCategory, { label: string; badge: string; border: string }> = {
  A: { label: 'Category A', badge: 'bg-purple-100 text-purple-800 border-purple-200', border: 'border-l-purple-500' },
  B: { label: 'Category B', badge: 'bg-blue-100 text-blue-800 border-blue-200', border: 'border-l-blue-500' },
  C: { label: 'Category C', badge: 'bg-amber-100 text-amber-800 border-amber-200', border: 'border-l-amber-500' },
  D: { label: 'Category D', badge: 'bg-rose-100 text-rose-800 border-rose-200', border: 'border-l-rose-500' },
};

const SuperAdminSuccessionCourts: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // ── Selectors ──────────────────────────────────────────────────────────────
  const courts = useSelector(selectAllCourts);
  const availableSupportPersons = useSelector(selectAvailableSupportPersons);
  const isLoading = useSelector(selectCourtIsLoading);
  const isSubmitting = useSelector(selectCourtIsSubmitting);
  const error = useSelector(selectCourtError);
  const counts = useSelector(selectCourtCounts);
  const filteredCourts = useSelector(selectFilteredCourts);

  // ── Local State ────────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<SuccessionCourtCategory | 'ALL'>('ALL');
  
  // Folders expand/collapse state
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    A: true,
    B: true,
    C: true,
    D: true,
  });

  // ── Form State ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: '',
    station: '',
    category: '' as SuccessionCourtCategory | '',
    support_person_id: '',
    contact: '',
  });

  const [assignData, setAssignData] = useState({
    userId: '',
    contact: '',
  });

  // ── Bulk Assign State ──────────────────────────────────────────────────
  const [bulkAssignData, setBulkAssignData] = useState({
    category: '' as SuccessionCourtCategory | '',
    userId: '',
    contact: '',
  });

  // ── Bulk Assign by Station State ───────────────────────────────────────
  const [bulkAssignStationData, setBulkAssignStationData] = useState({
    station: '',
    userId: '',
    contact: '',
  });

  // ── Reassign State ──────────────────────────────────────────────────────
  const [reassignData, setReassignData] = useState({
    currentUserId: '',
    newUserId: '',
    category: '' as SuccessionCourtCategory | '',
    station: '',
  });

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchCourts({}));
    dispatch(fetchAvailableSupportPersons());
  }, [dispatch]);

  useEffect(() => {
    const filters = {
      search: searchTerm || undefined,
      category: activeCategoryTab !== 'ALL' ? activeCategoryTab : undefined,
    };
    dispatch(setFilters(filters));
  }, [searchTerm, activeCategoryTab, dispatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleFolder = (cat: SuccessionCourtCategory) => {
    setExpandedFolders((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleCreateCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(
        createCourt({
          name: formData.name,
          station: formData.station,
          category: formData.category as SuccessionCourtCategory,
          support_person_id: formData.support_person_id || undefined,
          contact: formData.contact || undefined,
        })
      ).unwrap();
      setShowCreateModal(false);
      setFormData({ name: '', station: '', category: '', support_person_id: '', contact: '' });
    } catch (err) {
      console.error('Failed to create court:', err);
    }
  };

  const handleAssignSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourtId) return;

    try {
      await dispatch(
        assignSupportPerson({
          courtId: selectedCourtId,
          data: {
            userId: assignData.userId,
            contact: assignData.contact || undefined,
          },
        })
      ).unwrap();
      setShowAssignModal(false);
      setAssignData({ userId: '', contact: '' });
      setSelectedCourtId(null);
    } catch (err) {
      console.error('Failed to assign support person:', err);
    }
  };

  const handleBulkAssignByCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAssignData.category || !bulkAssignData.userId) {
      alert('Please select a category and a support person');
      return;
    }

    if (!confirm(`Assign support person to ALL courts in Category ${bulkAssignData.category}?`)) {
      return;
    }

    try {
      const payload: AssignSupportPersonByCategoryPayload = {
        category: bulkAssignData.category as SuccessionCourtCategory,
        userId: bulkAssignData.userId,
        contact: bulkAssignData.contact || undefined,
      };

      const result = await dispatch(assignSupportPersonByCategory(payload)).unwrap();
      alert(`✅ ${result.updated} courts updated in Category ${bulkAssignData.category}`);
      setShowBulkAssignModal(false);
      setBulkAssignData({ category: '', userId: '', contact: '' });
      dispatch(fetchCourts({}));
    } catch (err) {
      console.error('Failed to assign support persons by category:', err);
      alert('❌ Failed to assign support persons. Check console for details.');
    }
  };

  const handleBulkAssignByStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAssignStationData.station || !bulkAssignStationData.userId) {
      alert('Please enter a station and select a support person');
      return;
    }

    if (!confirm(`Assign support person to ALL courts at station "${bulkAssignStationData.station}"?`)) {
      return;
    }

    try {
      const payload: AssignSupportPersonByStationPayload = {
        station: bulkAssignStationData.station,
        userId: bulkAssignStationData.userId,
        contact: bulkAssignStationData.contact || undefined,
      };

      const result = await dispatch(assignSupportPersonByStation(payload)).unwrap();
      alert(`✅ ${result.updated} courts updated at station "${bulkAssignStationData.station}"`);
      setShowBulkAssignModal(false);
      setBulkAssignStationData({ station: '', userId: '', contact: '' });
      dispatch(fetchCourts({}));
    } catch (err) {
      console.error('Failed to assign support persons by station:', err);
      alert('❌ Failed to assign support persons. Check console for details.');
    }
  };

  const handleReassignSupportPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignData.currentUserId || !reassignData.newUserId) {
      alert('Please select both current and new support persons');
      return;
    }

    if (reassignData.currentUserId === reassignData.newUserId) {
      alert('Current and new support person cannot be the same');
      return;
    }

    const filterMsg = reassignData.category ? ` in Category ${reassignData.category}` : '';
    const stationMsg = reassignData.station ? ` at station "${reassignData.station}"` : '';
    
    if (!confirm(`Reassign all courts${filterMsg}${stationMsg} from "${getUserName(reassignData.currentUserId)}" to "${getUserName(reassignData.newUserId)}"?`)) {
      return;
    }

    try {
      const payload: ReassignSupportPersonPayload = {
        currentUserId: reassignData.currentUserId,
        newUserId: reassignData.newUserId,
        category: reassignData.category || undefined,
        station: reassignData.station || undefined,
      };

      const result = await dispatch(reassignSupportPerson(payload)).unwrap();
      alert(`✅ ${result.updated} courts reassigned successfully`);
      setShowReassignModal(false);
      setReassignData({ currentUserId: '', newUserId: '', category: '', station: '' });
      dispatch(fetchCourts({}));
    } catch (err) {
      console.error('Failed to reassign support persons:', err);
      alert('❌ Failed to reassign support persons. Check console for details.');
    }
  };

  const getUserName = (userId: string): string => {
    const user = availableSupportPersons.find(u => u.id === userId);
    return user?.name || userId;
  };

  const handleRemoveSupport = async (courtId: string) => {
    if (!confirm('Are you sure you want to remove the support person from this court?')) return;
    try {
      await dispatch(removeSupportPerson(courtId)).unwrap();
    } catch (err) {
      console.error('Failed to remove support person:', err);
    }
  };

  const handleDeleteCourt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this court?')) return;
    try {
      await dispatch(deleteCourt(id)).unwrap();
    } catch (err) {
      console.error('Failed to delete court:', err);
    }
  };

  const handleToggleActive = (court: SuccessionCourtWithUser) => {
    dispatch(
      updateCourt({
        id: court.id,
        data: { is_active: !court.is_active },
      })
    );
  };

  // Group courts by Category
  const groupedCourts = useMemo(() => {
    const groups: Record<SuccessionCourtCategory, SuccessionCourtWithUser[]> = {
      A: [],
      B: [],
      C: [],
      D: [],
    };

    filteredCourts.forEach((court) => {
      if (groups[court.category as SuccessionCourtCategory]) {
        groups[court.category as SuccessionCourtCategory].push(court);
      }
    });

    return groups;
  }, [filteredCourts]);

  if (isLoading && courts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading succession courts...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Succession Courts Directory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage categories, court stations, and assigned support staff</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowReassignModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            🔄 Reassign Staff
          </button>
          <button
            onClick={() => setShowBulkAssignModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            📋 Bulk Assign
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            + Add New Court
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Stations</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{counts.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">With Support Staff</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{counts.withSupport}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Unassigned Staff</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{counts.withoutSupport}</p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
        <div className="flex items-center overflow-x-auto gap-1">
          <button
            onClick={() => setActiveCategoryTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeCategoryTab === 'ALL' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryTab(cat)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategoryTab === cat ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Folder {cat}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_DETAILS[cat].badge}`}>
                {groupedCourts[cat].length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search courts or stations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-4 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Folder Categories View */}
      <div className="space-y-4">
        {CATEGORIES.filter((cat) => activeCategoryTab === 'ALL' || activeCategoryTab === cat).map((cat) => {
          const catCourts = groupedCourts[cat];
          const isExpanded = expandedFolders[cat];

          return (
            <div key={cat} className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden border-l-4 ${CATEGORY_DETAILS[cat].border}`}>
              <div
                onClick={() => toggleFolder(cat)}
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📁</span>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Category {cat} Courts</h2>
                    <p className="text-xs text-gray-500">{catCourts.length} station(s) registered</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${CATEGORY_DETAILS[cat].badge}`}>
                    Cat {cat}
                  </span>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  {catCourts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">
                      No Category {cat} courts matching criteria.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 tracking-wider">
                          <tr>
                            <th className="px-6 py-3">Court Name</th>
                            <th className="px-6 py-3">Station</th>
                            <th className="px-6 py-3">Support Staff</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {catCourts.map((court) => (
                            <tr key={court.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900">{court.name}</td>
                              <td className="px-6 py-4">{court.station}</td>
                              <td className="px-6 py-4">
                                {court.support_person ? (
                                  <div className="inline-flex items-center gap-2 bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700">
                                    <span>👤 {court.support_person}</span>
                                    <button
                                      onClick={() => handleRemoveSupport(court.id)}
                                      className="text-rose-600 hover:text-rose-800 font-semibold"
                                      title="Remove staff"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedCourtId(court.id);
                                      setShowAssignModal(true);
                                    }}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100"
                                  >
                                    + Assign Staff
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    court.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {court.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-3">
                                <button
                                  onClick={() => handleToggleActive(court)}
                                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                >
                                  {court.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeleteCourt(court.id)}
                                  className="text-xs font-medium text-rose-600 hover:text-rose-800"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Create Modal ───────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Succession Court</h2>
            </div>
            <form onSubmit={handleCreateCourt} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Court Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Milimani Succession Court"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Station</label>
                <input
                  type="text"
                  required
                  value={formData.station}
                  onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. Nairobi"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Category</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as SuccessionCourtCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Category</option>
                  <option value="A">Category A</option>
                  <option value="B">Category B</option>
                  <option value="C">Category C</option>
                  <option value="D">Category D</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Support Person (Optional)</label>
                <select
                  value={formData.support_person_id}
                  onChange={(e) => setFormData({ ...formData, support_person_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">None</option>
                  {availableSupportPersons.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Contact (Optional)</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Court'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Assign Modal ───────────────────────────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Assign Support Staff</h2>
            </div>
            <form onSubmit={handleAssignSupport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Support Person</label>
                <select
                  required
                  value={assignData.userId}
                  onChange={(e) => setAssignData({ ...assignData, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Support Staff</option>
                  {availableSupportPersons.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Contact Details (Optional)</label>
                <input
                  type="text"
                  value={assignData.contact}
                  onChange={(e) => setAssignData({ ...assignData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Bulk Assign Modal ─────────────────────────────────────────────── */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Bulk Assign Support Staff</h2>
              <p className="text-sm text-gray-500">Assign a support person to multiple courts at once</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Option 1: By Category */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">By Category</h3>
                <form onSubmit={handleBulkAssignByCategory} className="space-y-3">
                  <select
                    required
                    value={bulkAssignData.category}
                    onChange={(e) => setBulkAssignData({ ...bulkAssignData, category: e.target.value as SuccessionCourtCategory })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    <option value="A">Category A</option>
                    <option value="B">Category B</option>
                    <option value="C">Category C</option>
                    <option value="D">Category D</option>
                  </select>
                  <select
                    required
                    value={bulkAssignData.userId}
                    onChange={(e) => setBulkAssignData({ ...bulkAssignData, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Support Person</option>
                    {availableSupportPersons.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Contact (Optional)"
                    value={bulkAssignData.contact}
                    onChange={(e) => setBulkAssignData({ ...bulkAssignData, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Assigning...' : 'Assign by Category'}
                  </button>
                </form>
              </div>

              <div className="border-t border-gray-200" />

              {/* Option 2: By Station */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">By Station</h3>
                <form onSubmit={handleBulkAssignByStation} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Station name (e.g., Nairobi)"
                    value={bulkAssignStationData.station}
                    onChange={(e) => setBulkAssignStationData({ ...bulkAssignStationData, station: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <select
                    required
                    value={bulkAssignStationData.userId}
                    onChange={(e) => setBulkAssignStationData({ ...bulkAssignStationData, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Support Person</option>
                    {availableSupportPersons.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Contact (Optional)"
                    value={bulkAssignStationData.contact}
                    onChange={(e) => setBulkAssignStationData({ ...bulkAssignStationData, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Assigning...' : 'Assign by Station'}
                  </button>
                </form>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBulkAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reassign Modal ─────────────────────────────────────────────────── */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Reassign Support Staff</h2>
              <p className="text-sm text-gray-500">Move all courts from one support person to another</p>
            </div>
            <form onSubmit={handleReassignSupportPerson} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Current Support Person</label>
                <select
                  required
                  value={reassignData.currentUserId}
                  onChange={(e) => setReassignData({ ...reassignData, currentUserId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Current Staff</option>
                  {availableSupportPersons.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">New Support Person</label>
                <select
                  required
                  value={reassignData.newUserId}
                  onChange={(e) => setReassignData({ ...reassignData, newUserId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select New Staff</option>
                  {availableSupportPersons
                    .filter(user => user.id !== reassignData.currentUserId)
                    .map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                </select>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 mb-2">Filter courts to reassign (optional):</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                    <select
                      value={reassignData.category}
                      onChange={(e) => setReassignData({ ...reassignData, category: e.target.value as SuccessionCourtCategory })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">All Categories</option>
                      <option value="A">Category A</option>
                      <option value="B">Category B</option>
                      <option value="C">Category C</option>
                      <option value="D">Category D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Station</label>
                    <input
                      type="text"
                      placeholder="e.g., Nairobi"
                      value={reassignData.station}
                      onChange={(e) => setReassignData({ ...reassignData, station: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Reassigning...' : 'Reassign Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSuccessionCourts;