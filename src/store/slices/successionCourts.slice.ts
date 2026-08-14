// ============================================================
// src/features/succession-courts/store/successionCourts.slice.ts
// ============================================================

import { createSlice, createAsyncThunk, createSelector, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type {
  SuccessionCourtState,
  SuccessionCourtWithUser,
  SuccessionCourtFilters,
  CreateSuccessionCourtPayload,
  UpdateSuccessionCourtPayload,
  AssignSupportPersonPayload,
  BulkAssignSupportPersonPayload,
  BulkRemoveSupportPersonPayload,
  AssignSupportPersonByCategoryPayload,
  AssignSupportPersonByStationPayload,
  ReassignSupportPersonPayload,
  SeedCourtsPayload,
  GroupedSuccessionCourts,
  SupportPersonAssignment,
  User,
  SeedResult,
  BulkOperationResult,
  ValidationResult,
  DeleteResult,
} from '../../types/succession-courts';
import type { RootState } from '../store';

// ── Initial State ────────────────────────────────────────────────────────────

const initialState: SuccessionCourtState = {
  courts: [],
  groupedCourts: null,
  selectedCourt: null,
  availableSupportPersons: [],
  supportPersonAssignments: [],

  isLoading: false,
  isSubmitting: false,
  error: null,

  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,

  filters: {
    page: 1,
    limit: 20,
  },

  seedResult: null,
  isSeeding: false,
  isValidating: false,
  validationResult: null,
};

const BASE_URL = '/succession-courts';

// ── Async Thunks ─────────────────────────────────────────────────────────────

// ── Create ────────────────────────────────────────────────────────────────────

export const createCourt = createAsyncThunk(
  'successionCourts/createCourt',
  async (data: CreateSuccessionCourtPayload) => {
    const response = await axiosClient.post<{ success: boolean; data: SuccessionCourtWithUser }>(
      BASE_URL,
      data
    );
    return response.data.data;
  }
);

// ── Read ──────────────────────────────────────────────────────────────────────

export const fetchCourts = createAsyncThunk(
  'successionCourts/fetchCourts',
  async (filters: SuccessionCourtFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const url = params.toString() ? `${BASE_URL}?${params}` : BASE_URL;
    const response = await axiosClient.get<{ success: boolean; data: SuccessionCourtWithUser[] }>(url);
    return response.data.data;
  }
);

export const fetchCourtsWithSupport = createAsyncThunk(
  'successionCourts/fetchCourtsWithSupport',
  async (filters: SuccessionCourtFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const url = params.toString() ? `${BASE_URL}/with-support?${params}` : `${BASE_URL}/with-support`;
    const response = await axiosClient.get<{ success: boolean; data: SuccessionCourtWithUser[] }>(url);
    return response.data.data;
  }
);

export const fetchGroupedCourts = createAsyncThunk(
  'successionCourts/fetchGroupedCourts',
  async () => {
    const response = await axiosClient.get<{ success: boolean; data: GroupedSuccessionCourts }>(
      `${BASE_URL}/categories`
    );
    return response.data.data;
  }
);

export const fetchGroupedCourtsWithSupport = createAsyncThunk(
  'successionCourts/fetchGroupedCourtsWithSupport',
  async () => {
    const response = await axiosClient.get<{ success: boolean; data: GroupedSuccessionCourts }>(
      `${BASE_URL}/categories/with-support`
    );
    return response.data.data;
  }
);

export const fetchCourtById = createAsyncThunk(
  'successionCourts/fetchCourtById',
  async (id: string) => {
    const response = await axiosClient.get<{ success: boolean; data: SuccessionCourtWithUser }>(
      `${BASE_URL}/${id}`
    );
    return response.data.data;
  }
);

export const fetchCourtWithUser = createAsyncThunk(
  'successionCourts/fetchCourtWithUser',
  async (id: string) => {
    const response = await axiosClient.get<{ success: boolean; data: SuccessionCourtWithUser }>(
      `${BASE_URL}/${id}/with-user`
    );
    return response.data.data;
  }
);

export const fetchAvailableSupportPersons = createAsyncThunk(
  'successionCourts/fetchAvailableSupportPersons',
  async () => {
    const response = await axiosClient.get<{ success: boolean; data: User[] }>(
      `${BASE_URL}/available-support-persons`
    );
    return response.data.data;
  }
);

export const fetchSupportPersonAssignments = createAsyncThunk(
  'successionCourts/fetchSupportPersonAssignments',
  async (params: { userId?: string; category?: string } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.category) queryParams.append('category', params.category);
    const url = queryParams.toString()
      ? `${BASE_URL}/support-person-assignments?${queryParams}`
      : `${BASE_URL}/support-person-assignments`;
    const response = await axiosClient.get<{ success: boolean; data: SupportPersonAssignment[] }>(url);
    return response.data.data;
  }
);

// ── Update ────────────────────────────────────────────────────────────────────

export const updateCourt = createAsyncThunk(
  'successionCourts/updateCourt',
  async ({ id, data }: { id: string; data: UpdateSuccessionCourtPayload }) => {
    const response = await axiosClient.put<{ success: boolean; data: SuccessionCourtWithUser }>(
      `${BASE_URL}/${id}`,
      data
    );
    return response.data.data;
  }
);

// ── Delete ────────────────────────────────────────────────────────────────────

export const deleteCourt = createAsyncThunk(
  'successionCourts/deleteCourt',
  async (id: string) => {
    await axiosClient.delete(`${BASE_URL}/${id}`);
    return id;
  }
);

// ── Support Person Management ──────────────────────────────────────────────

export const assignSupportPerson = createAsyncThunk(
  'successionCourts/assignSupportPerson',
  async ({ courtId, data }: { courtId: string; data: AssignSupportPersonPayload }) => {
    const response = await axiosClient.post<{ success: boolean; data: SuccessionCourtWithUser }>(
      `${BASE_URL}/${courtId}/assign-support`,
      data
    );
    return response.data.data;
  }
);

export const bulkAssignSupportPerson = createAsyncThunk(
  'successionCourts/bulkAssignSupportPerson',
  async (data: BulkAssignSupportPersonPayload) => {
    const response = await axiosClient.post<{ success: boolean; data: BulkOperationResult }>(
      `${BASE_URL}/bulk-assign-support`,
      data
    );
    return response.data.data;
  }
);

// ─── NEW: Assign Support Person by Category ────────────────────────────────

export const assignSupportPersonByCategory = createAsyncThunk(
  'successionCourts/assignSupportPersonByCategory',
  async (data: AssignSupportPersonByCategoryPayload) => {
    const response = await axiosClient.post<{ success: boolean; data: BulkOperationResult }>(
      `${BASE_URL}/assign-by-category`,
      data
    );
    return response.data.data;
  }
);

// ─── NEW: Assign Support Person by Station ─────────────────────────────────

export const assignSupportPersonByStation = createAsyncThunk(
  'successionCourts/assignSupportPersonByStation',
  async (data: AssignSupportPersonByStationPayload) => {
    const response = await axiosClient.post<{ success: boolean; data: BulkOperationResult }>(
      `${BASE_URL}/assign-by-station`,
      data
    );
    return response.data.data;
  }
);

// ─── NEW: Reassign Support Person ──────────────────────────────────────────

export const reassignSupportPerson = createAsyncThunk(
  'successionCourts/reassignSupportPerson',
  async (data: ReassignSupportPersonPayload) => {
    const response = await axiosClient.post<{ success: boolean; data: BulkOperationResult }>(
      `${BASE_URL}/reassign`,
      data
    );
    return response.data.data;
  }
);

export const removeSupportPerson = createAsyncThunk(
  'successionCourts/removeSupportPerson',
  async (courtId: string) => {
    const response = await axiosClient.post<{ success: boolean; data: SuccessionCourtWithUser }>(
      `${BASE_URL}/${courtId}/remove-support`
    );
    return response.data.data;
  }
);

export const bulkRemoveSupportPerson = createAsyncThunk(
  'successionCourts/bulkRemoveSupportPerson',
  async (data: BulkRemoveSupportPersonPayload) => {
    const response = await axiosClient.post<{ success: boolean; data: BulkOperationResult }>(
      `${BASE_URL}/bulk-remove-support`,
      data
    );
    return response.data.data;
  }
);

// ── Seed Management ──────────────────────────────────────────────────────────

export const seedCourts = createAsyncThunk(
  'successionCourts/seedCourts',
  async (data: SeedCourtsPayload = {}) => {
    const response = await axiosClient.post<{ success: boolean; data: SeedResult }>(
      `${BASE_URL}/seed`,
      data
    );
    return response.data.data;
  }
);

export const validateSeedData = createAsyncThunk(
  'successionCourts/validateSeedData',
  async () => {
    const response = await axiosClient.get<{ success: boolean; data: ValidationResult }>(
      `${BASE_URL}/seed/validate`
    );
    return response.data.data;
  }
);

export const getSeedCount = createAsyncThunk(
  'successionCourts/getSeedCount',
  async () => {
    const response = await axiosClient.get<{ success: boolean; data: { count: number } }>(
      `${BASE_URL}/seed/count`
    );
    return response.data.data;
  }
);

export const clearSeedData = createAsyncThunk(
  'successionCourts/clearSeedData',
  async () => {
    const response = await axiosClient.post<{ success: boolean; data: DeleteResult }>(
      `${BASE_URL}/seed/clear`
    );
    return response.data.data;
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const successionCourtsSlice = createSlice({
  name: 'successionCourts',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<SuccessionCourtFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = {
        page: 1,
        limit: 20,
      };
    },
    clearSelectedCourt: (state) => {
      state.selectedCourt = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetStatus: (state) => {
      state.isLoading = false;
    },
    resetActions: (state) => {
      state.isSubmitting = false;
      state.isSeeding = false;
      state.isValidating = false;
    },
    updateCourtLocally: (state, action: PayloadAction<{ id: string; updates: Partial<SuccessionCourtWithUser> }>) => {
      const index = state.courts.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.courts[index] = { ...state.courts[index], ...action.payload.updates };
      }
      if (state.selectedCourt?.id === action.payload.id) {
        state.selectedCourt = { ...state.selectedCourt, ...action.payload.updates };
      }
    },
    removeCourtLocally: (state, action: PayloadAction<string>) => {
      state.courts = state.courts.filter(c => c.id !== action.payload);
      if (state.selectedCourt?.id === action.payload) {
        state.selectedCourt = null;
      }
    },
    addCourtLocally: (state, action: PayloadAction<SuccessionCourtWithUser>) => {
      state.courts = [action.payload, ...state.courts];
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch Courts ──────────────────────────────────────────────────────
      .addCase(fetchCourts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courts = action.payload;
      })
      .addCase(fetchCourts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch courts';
      })

      // ── Fetch Courts With Support ────────────────────────────────────────
      .addCase(fetchCourtsWithSupport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourtsWithSupport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courts = action.payload;
      })
      .addCase(fetchCourtsWithSupport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch courts with support';
      })

      // ── Fetch Grouped Courts ─────────────────────────────────────────────
      .addCase(fetchGroupedCourts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroupedCourts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groupedCourts = action.payload;
      })
      .addCase(fetchGroupedCourts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch grouped courts';
      })

      // ── Fetch Grouped Courts With Support ────────────────────────────────
      .addCase(fetchGroupedCourtsWithSupport.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroupedCourtsWithSupport.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groupedCourts = action.payload;
      })
      .addCase(fetchGroupedCourtsWithSupport.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch grouped courts with support';
      })

      // ── Fetch Court By ID ─────────────────────────────────────────────────
      .addCase(fetchCourtById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourtById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCourt = action.payload;
      })
      .addCase(fetchCourtById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch court';
      })

      // ── Fetch Court With User ─────────────────────────────────────────────
      .addCase(fetchCourtWithUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourtWithUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCourt = action.payload;
      })
      .addCase(fetchCourtWithUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch court with user';
      })

      // ── Fetch Available Support Persons ──────────────────────────────────
      .addCase(fetchAvailableSupportPersons.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAvailableSupportPersons.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableSupportPersons = action.payload;
      })
      .addCase(fetchAvailableSupportPersons.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch available support persons';
      })

      // ── Fetch Support Person Assignments ─────────────────────────────────
      .addCase(fetchSupportPersonAssignments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSupportPersonAssignments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.supportPersonAssignments = action.payload;
      })
      .addCase(fetchSupportPersonAssignments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch support person assignments';
      })

      // ── Create Court ──────────────────────────────────────────────────────
      .addCase(createCourt.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createCourt.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.courts = [action.payload, ...state.courts];
        state.total += 1;
      })
      .addCase(createCourt.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to create court';
      })

      // ── Update Court ──────────────────────────────────────────────────────
      .addCase(updateCourt.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateCourt.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const court = action.payload;
        const index = state.courts.findIndex(c => c.id === court.id);
        if (index !== -1) {
          state.courts[index] = court;
        }
        if (state.selectedCourt?.id === court.id) {
          state.selectedCourt = { ...state.selectedCourt, ...court };
        }
      })
      .addCase(updateCourt.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to update court';
      })

      // ── Delete Court ──────────────────────────────────────────────────────
      .addCase(deleteCourt.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(deleteCourt.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.courts = state.courts.filter(c => c.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        if (state.selectedCourt?.id === action.payload) {
          state.selectedCourt = null;
        }
      })
      .addCase(deleteCourt.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to delete court';
      })

      // ── Assign Support Person ────────────────────────────────────────────
      .addCase(assignSupportPerson.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(assignSupportPerson.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const court = action.payload;
        const index = state.courts.findIndex(c => c.id === court.id);
        if (index !== -1) {
          state.courts[index] = court;
        }
        if (state.selectedCourt?.id === court.id) {
          state.selectedCourt = { ...state.selectedCourt, ...court };
        }
      })
      .addCase(assignSupportPerson.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to assign support person';
      })

      // ── Bulk Assign Support Person ───────────────────────────────────────
      .addCase(bulkAssignSupportPerson.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(bulkAssignSupportPerson.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(bulkAssignSupportPerson.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to bulk assign support persons';
      })

      // ── NEW: Assign Support Person by Category ──────────────────────────
      .addCase(assignSupportPersonByCategory.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(assignSupportPersonByCategory.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(assignSupportPersonByCategory.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to assign support persons by category';
      })

      // ── NEW: Assign Support Person by Station ────────────────────────────
      .addCase(assignSupportPersonByStation.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(assignSupportPersonByStation.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(assignSupportPersonByStation.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to assign support persons by station';
      })

      // ── NEW: Reassign Support Person ─────────────────────────────────────
      .addCase(reassignSupportPerson.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(reassignSupportPerson.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(reassignSupportPerson.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to reassign support persons';
      })

      // ── Remove Support Person ────────────────────────────────────────────
      .addCase(removeSupportPerson.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(removeSupportPerson.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const court = action.payload;
        const index = state.courts.findIndex(c => c.id === court.id);
        if (index !== -1) {
          state.courts[index] = court;
        }
        if (state.selectedCourt?.id === court.id) {
          state.selectedCourt = { ...state.selectedCourt, ...court };
        }
      })
      .addCase(removeSupportPerson.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to remove support person';
      })

      // ── Bulk Remove Support Person ───────────────────────────────────────
      .addCase(bulkRemoveSupportPerson.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(bulkRemoveSupportPerson.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(bulkRemoveSupportPerson.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to bulk remove support persons';
      })

      // ── Seed Courts ──────────────────────────────────────────────────────
      .addCase(seedCourts.pending, (state) => {
        state.isSeeding = true;
        state.error = null;
      })
      .addCase(seedCourts.fulfilled, (state, action) => {
        state.isSeeding = false;
        state.seedResult = action.payload;
      })
      .addCase(seedCourts.rejected, (state, action) => {
        state.isSeeding = false;
        state.error = action.error.message || 'Failed to seed courts';
      })

      // ── Validate Seed Data ──────────────────────────────────────────────
      .addCase(validateSeedData.pending, (state) => {
        state.isValidating = true;
        state.error = null;
      })
      .addCase(validateSeedData.fulfilled, (state, action) => {
        state.isValidating = false;
        state.validationResult = action.payload;
      })
      .addCase(validateSeedData.rejected, (state, action) => {
        state.isValidating = false;
        state.error = action.error.message || 'Failed to validate seed data';
      })

      // ── Get Seed Count ───────────────────────────────────────────────────
      .addCase(getSeedCount.fulfilled, () => {})

      // ── Clear Seed Data ──────────────────────────────────────────────────
      .addCase(clearSeedData.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(clearSeedData.fulfilled, (state) => {
        state.isSubmitting = false;
        state.seedResult = null;
        state.validationResult = null;
      })
      .addCase(clearSeedData.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to clear seed data';
      });
  },
});

// ── Actions ─────────────────────────────────────────────────────────────────

export const {
  setFilters,
  resetFilters,
  clearSelectedCourt,
  clearError,
  resetStatus,
  resetActions,
  updateCourtLocally,
  removeCourtLocally,
  addCourtLocally,
} = successionCourtsSlice.actions;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectAllCourts = (state: RootState) => state.successionCourts.courts;
export const selectSelectedCourt = (state: RootState) => state.successionCourts.selectedCourt;
export const selectGroupedCourts = (state: RootState) => state.successionCourts.groupedCourts;
export const selectAvailableSupportPersons = (state: RootState) => state.successionCourts.availableSupportPersons;
export const selectSupportPersonAssignments = (state: RootState) => state.successionCourts.supportPersonAssignments;
export const selectCourtIsLoading = (state: RootState) => state.successionCourts.isLoading;
export const selectCourtIsSubmitting = (state: RootState) => state.successionCourts.isSubmitting;
export const selectCourtError = (state: RootState) => state.successionCourts.error;
export const selectCourtPagination = (state: RootState) => ({
  total: state.successionCourts.total,
  page: state.successionCourts.page,
  limit: state.successionCourts.limit,
  totalPages: state.successionCourts.totalPages,
});
export const selectCourtFilters = (state: RootState) => state.successionCourts.filters;
export const selectSeedResult = (state: RootState) => state.successionCourts.seedResult;
export const selectValidationResult = (state: RootState) => state.successionCourts.validationResult;
export const selectIsSeeding = (state: RootState) => state.successionCourts.isSeeding;
export const selectIsValidating = (state: RootState) => state.successionCourts.isValidating;

// ── Derived Selectors ──────────────────────────────────────────────────────

export const selectCourtsByCategory = createSelector(
  [selectAllCourts, (_state: RootState, category: string) => category],
  (courts, category) => courts.filter(c => c.category === category)
);

export const selectActiveCourts = createSelector(
  [selectAllCourts],
  (courts) => courts.filter(c => c.is_active)
);

export const selectInactiveCourts = createSelector(
  [selectAllCourts],
  (courts) => courts.filter(c => !c.is_active)
);

export const selectCourtsWithSupport = createSelector(
  [selectAllCourts],
  (courts) => courts.filter(c => c.support_person_id !== null)
);

export const selectCourtsWithoutSupport = createSelector(
  [selectAllCourts],
  (courts) => courts.filter(c => c.support_person_id === null)
);

export const selectCourtsBySupportPerson = createSelector(
  [selectAllCourts, (_state: RootState, supportPersonId: string) => supportPersonId],
  (courts, supportPersonId) => courts.filter(c => c.support_person_id === supportPersonId)
);

export const selectCourtCounts = createSelector(
  [selectAllCourts],
  (courts) => ({
    total: courts.length,
    active: courts.filter(c => c.is_active).length,
    inactive: courts.filter(c => !c.is_active).length,
    withSupport: courts.filter(c => c.support_person_id !== null).length,
    withoutSupport: courts.filter(c => c.support_person_id === null).length,
    categoryA: courts.filter(c => c.category === 'A').length,
    categoryB: courts.filter(c => c.category === 'B').length,
    categoryC: courts.filter(c => c.category === 'C').length,
    categoryD: courts.filter(c => c.category === 'D').length,
  })
);

export const selectFilteredCourts = createSelector(
  [selectAllCourts, selectCourtFilters],
  (courts, filters) => {
    let result = [...courts];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.station.toLowerCase().includes(search)
      );
    }
    if (filters.category) {
      result = result.filter(c => c.category === filters.category);
    }
    if (filters.station) {
      const station = filters.station.toLowerCase();
      result = result.filter(c => c.station.toLowerCase().includes(station));
    }
    if (filters.is_active !== undefined) {
      result = result.filter(c => c.is_active === filters.is_active);
    }
    if (filters.support_person_id) {
      result = result.filter(c => c.support_person_id === filters.support_person_id);
    }

    return result;
  }
);

export default successionCourtsSlice.reducer;