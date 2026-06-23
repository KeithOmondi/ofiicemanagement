// src/store/slices/tasksSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axiosClient from '../../api/api';
import type { AxiosError } from 'axios';

/* ============================================================
   TYPES
============================================================ */

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string;
  progress: number;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_tasks?: number;
  members?: ProjectMember[];
}

export interface Task {
  id: string;
  project_id: string | null;
  project_name?: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  assignee_name?: string;
  due_date: string;
  start_date: string | null;
  completed_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskStats {
  todo: number;
  in_progress: number;
  done: number;
  overdue: number;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  archived: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string;
  member_ids?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: 'active' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  is_active?: boolean;
}

export interface CreateTaskInput {
  project_id?: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  due_date: string;
  start_date?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string | null;
  due_date?: string;
  start_date?: string | null;
  is_active?: boolean;
}

export interface AddProjectMemberInput {
  user_id: string;
  role?: string;
}

interface TasksState {
  projects: Project[];
  selectedProject: Project | null;
  tasks: Task[];
  standaloneTasks: Task[];
  selectedTask: Task | null;
  projectMembers: ProjectMember[];
  stats: {
    tasks: TaskStats | null;
    projects: ProjectStats | null;
  };
  loading: {
    projects: boolean;
    project: boolean;
    tasks: boolean;
    standaloneTasks: boolean;
    task: boolean;
    members: boolean;
    stats: boolean;
    mutating: boolean;
  };
  error: string | null;
  success: boolean;
}

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState: TasksState = {
  projects: [],
  selectedProject: null,
  tasks: [],
  standaloneTasks: [],
  selectedTask: null,
  projectMembers: [],
  stats: {
    tasks: null,
    projects: null,
  },
  loading: {
    projects: false,
    project: false,
    tasks: false,
    standaloneTasks: false,
    task: false,
    members: false,
    stats: false,
    mutating: false,
  },
  error: null,
  success: false,
};

/* ============================================================
   HELPERS
============================================================ */

const extractError = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.message ?? 'An unexpected error occurred';
};

/* ============================================================
   THUNKS - STATS
============================================================ */

export const fetchTaskStats = createAsyncThunk(
  'tasks/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/tasks/stats');
      return data.data as { tasks: TaskStats; projects: ProjectStats };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ============================================================
   THUNKS - PROJECTS
============================================================ */

export const fetchProjects = createAsyncThunk(
  'tasks/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/tasks/projects');
      return data.data as Project[];
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'tasks/fetchProjectById',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/tasks/projects/${id}`);
      return data.data as Project;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const createProject = createAsyncThunk(
  'tasks/createProject',
  async (input: CreateProjectInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post('/tasks/projects', input);
      return data.data as Project;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const updateProject = createAsyncThunk(
  'tasks/updateProject',
  async ({ id, input }: { id: string; input: UpdateProjectInput }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.put(`/tasks/projects/${id}`, input);
      return data.data as Project;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const deleteProject = createAsyncThunk(
  'tasks/deleteProject',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/projects/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ============================================================
   THUNKS - PROJECT MEMBERS
============================================================ */

export const fetchProjectMembers = createAsyncThunk(
  'tasks/fetchProjectMembers',
  async (projectId: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/tasks/projects/${projectId}/members`);
      return { projectId, members: data.data as ProjectMember[] };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const addProjectMember = createAsyncThunk(
  'tasks/addProjectMember',
  async ({ projectId, input }: { projectId: string; input: AddProjectMemberInput }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post(`/tasks/projects/${projectId}/members`, input);
      return data.data as ProjectMember;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const removeProjectMember = createAsyncThunk(
  'tasks/removeProjectMember',
  async ({ projectId, memberId }: { projectId: string; memberId: string }, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/projects/${projectId}/members/${memberId}`);
      return { projectId, memberId };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ============================================================
   THUNKS - TASKS
============================================================ */

// src/store/slices/tasksSlice.ts - Fix the fetchTasks thunk

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (projectId: string | undefined, { rejectWithValue }) => {
    try {
      const url = projectId ? `/tasks/tasks?projectId=${projectId}` : '/tasks/tasks';
      const { data } = await axiosClient.get(url);
      return data.data as Task[];
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const fetchStandaloneTasks = createAsyncThunk(
  'tasks/fetchStandaloneTasks',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get('/tasks/tasks/standalone');
      return data.data as Task[];
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (id: string, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get(`/tasks/tasks/${id}`);
      return data.data as Task;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (input: CreateTaskInput, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post('/tasks/tasks', input);
      return data.data as Task;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, input }: { id: string; input: UpdateTaskInput }, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.put(`/tasks/tasks/${id}`, input);
      return data.data as Task;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/tasks/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setSelectedProject(state, action: PayloadAction<Project | null>) {
      state.selectedProject = action.payload;
      state.error = null;
    },
    setSelectedTask(state, action: PayloadAction<Task | null>) {
      state.selectedTask = action.payload;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearSuccess(state) {
      state.success = false;
    },
    resetTasksState: () => initialState,
    // Helper to update task status locally (optimistic update)
    updateTaskStatusLocally(state, action: PayloadAction<{ taskId: string; status: Task['status'] }>) {
      const { taskId, status } = action.payload;
      
      // Update in tasks list
      const taskIndex = state.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex].status = status;
        if (status === 'done') {
          state.tasks[taskIndex].completed_at = new Date().toISOString();
        } else {
          state.tasks[taskIndex].completed_at = null;
        }
      }
      
      // Update in standalone tasks
      const standaloneIndex = state.standaloneTasks.findIndex(t => t.id === taskId);
      if (standaloneIndex !== -1) {
        state.standaloneTasks[standaloneIndex].status = status;
        if (status === 'done') {
          state.standaloneTasks[standaloneIndex].completed_at = new Date().toISOString();
        } else {
          state.standaloneTasks[standaloneIndex].completed_at = null;
        }
      }
      
      // Update selected task if it's the same
      if (state.selectedTask?.id === taskId) {
        state.selectedTask.status = status;
        if (status === 'done') {
          state.selectedTask.completed_at = new Date().toISOString();
        } else {
          state.selectedTask.completed_at = null;
        }
      }
    },
  },
  extraReducers: (builder) => {

    /* ---------- FETCH STATS ---------- */
    builder
      .addCase(fetchTaskStats.pending, (state) => {
        state.loading.stats = true;
        state.error = null;
      })
      .addCase(fetchTaskStats.fulfilled, (state, action: PayloadAction<{ tasks: TaskStats; projects: ProjectStats }>) => {
        state.loading.stats = false;
        state.stats.tasks = action.payload.tasks;
        state.stats.projects = action.payload.projects;
      })
      .addCase(fetchTaskStats.rejected, (state, action) => {
        state.loading.stats = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH PROJECTS ---------- */
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading.projects = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action: PayloadAction<Project[]>) => {
        state.loading.projects = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading.projects = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH PROJECT BY ID ---------- */
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.loading.project = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action: PayloadAction<Project>) => {
        state.loading.project = false;
        state.selectedProject = action.payload;
        // Update in projects list
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading.project = false;
        state.error = action.payload as string;
      });

    /* ---------- CREATE PROJECT ---------- */
    builder
      .addCase(createProject.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createProject.fulfilled, (state, action: PayloadAction<Project>) => {
        state.loading.mutating = false;
        state.success = true;
        state.projects = [action.payload, ...state.projects];
        state.selectedProject = action.payload;
        if (state.stats.projects) {
          state.stats.projects.total += 1;
          state.stats.projects.active += 1;
        }
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- UPDATE PROJECT ---------- */
    builder
      .addCase(updateProject.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateProject.fulfilled, (state, action: PayloadAction<Project>) => {
        state.loading.mutating = false;
        state.success = true;
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
        if (state.selectedProject?.id === action.payload.id) {
          state.selectedProject = action.payload;
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- DELETE PROJECT ---------- */
    builder
      .addCase(deleteProject.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        state.projects = state.projects.filter(p => p.id !== action.payload);
        if (state.selectedProject?.id === action.payload) {
          state.selectedProject = null;
        }
        if (state.stats.projects) {
          state.stats.projects.total -= 1;
          // Update status counts based on the deleted project
          // This is a simplification - in a real app you'd fetch fresh stats
        }
        // Remove all tasks associated with this project
        state.tasks = state.tasks.filter(t => t.project_id !== action.payload);
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH PROJECT MEMBERS ---------- */
    builder
      .addCase(fetchProjectMembers.pending, (state) => {
        state.loading.members = true;
        state.error = null;
      })
      .addCase(fetchProjectMembers.fulfilled, (state, action: PayloadAction<{ projectId: string; members: ProjectMember[] }>) => {
        state.loading.members = false;
        state.projectMembers = action.payload.members;
        // Update members in selected project
        if (state.selectedProject?.id === action.payload.projectId) {
          state.selectedProject.members = action.payload.members;
        }
      })
      .addCase(fetchProjectMembers.rejected, (state, action) => {
        state.loading.members = false;
        state.error = action.payload as string;
      });

    /* ---------- ADD PROJECT MEMBER ---------- */
    builder
      .addCase(addProjectMember.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(addProjectMember.fulfilled, (state, action: PayloadAction<ProjectMember>) => {
        state.loading.mutating = false;
        state.success = true;
        state.projectMembers = [...state.projectMembers, action.payload];
        if (state.selectedProject) {
          state.selectedProject.members = [...(state.selectedProject.members || []), action.payload];
        }
      })
      .addCase(addProjectMember.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- REMOVE PROJECT MEMBER ---------- */
    builder
      .addCase(removeProjectMember.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(removeProjectMember.fulfilled, (state, action: PayloadAction<{ projectId: string; memberId: string }>) => {
        state.loading.mutating = false;
        state.projectMembers = state.projectMembers.filter(m => m.id !== action.payload.memberId);
        if (state.selectedProject) {
          state.selectedProject.members = state.selectedProject.members?.filter(m => m.id !== action.payload.memberId);
        }
      })
      .addCase(removeProjectMember.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH TASKS ---------- */
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading.tasks = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading.tasks = false;
        state.tasks = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading.tasks = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH STANDALONE TASKS ---------- */
    builder
      .addCase(fetchStandaloneTasks.pending, (state) => {
        state.loading.standaloneTasks = true;
        state.error = null;
      })
      .addCase(fetchStandaloneTasks.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading.standaloneTasks = false;
        state.standaloneTasks = action.payload;
      })
      .addCase(fetchStandaloneTasks.rejected, (state, action) => {
        state.loading.standaloneTasks = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH TASK BY ID ---------- */
    builder
      .addCase(fetchTaskById.pending, (state) => {
        state.loading.task = true;
        state.error = null;
      })
      .addCase(fetchTaskById.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading.task = false;
        state.selectedTask = action.payload;
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.loading.task = false;
        state.error = action.payload as string;
      });

    /* ---------- CREATE TASK ---------- */
    builder
      .addCase(createTask.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading.mutating = false;
        state.success = true;
        
        if (action.payload.project_id) {
          // Project task
          state.tasks = [action.payload, ...state.tasks];
          // Update project task count
          const projectIndex = state.projects.findIndex(p => p.id === action.payload.project_id);
          if (projectIndex !== -1) {
            state.projects[projectIndex].task_count = (state.projects[projectIndex].task_count || 0) + 1;
          }
          if (state.selectedProject?.id === action.payload.project_id) {
            state.selectedProject.task_count = (state.selectedProject.task_count || 0) + 1;
          }
        } else {
          // Standalone task
          state.standaloneTasks = [action.payload, ...state.standaloneTasks];
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- UPDATE TASK ---------- */
    builder
      .addCase(updateTask.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.loading.mutating = false;
        state.success = true;
        
        // Update in tasks list
        const taskIndex = state.tasks.findIndex(t => t.id === action.payload.id);
        if (taskIndex !== -1) {
          state.tasks[taskIndex] = action.payload;
        }
        
        // Update in standalone tasks
        const standaloneIndex = state.standaloneTasks.findIndex(t => t.id === action.payload.id);
        if (standaloneIndex !== -1) {
          state.standaloneTasks[standaloneIndex] = action.payload;
        }
        
        // Update selected task
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- DELETE TASK ---------- */
    builder
      .addCase(deleteTask.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        
        // Remove from tasks list
        const removed = state.tasks.find(t => t.id === action.payload);
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
        
        // Remove from standalone tasks
        state.standaloneTasks = state.standaloneTasks.filter(t => t.id !== action.payload);
        
        // Update project task count if removed was a project task
        if (removed?.project_id) {
          const projectIndex = state.projects.findIndex(p => p.id === removed.project_id);
          if (projectIndex !== -1) {
            state.projects[projectIndex].task_count = Math.max(0, (state.projects[projectIndex].task_count || 0) - 1);
          }
          if (state.selectedProject?.id === removed.project_id) {
            state.selectedProject.task_count = Math.max(0, (state.selectedProject.task_count || 0) - 1);
          }
        }
        
        if (state.selectedTask?.id === action.payload) {
          state.selectedTask = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });
  },
});

/* ============================================================
   ACTIONS
============================================================ */

export const {
  setSelectedProject,
  setSelectedTask,
  clearError,
  clearSuccess,
  resetTasksState,
  updateTaskStatusLocally,
} = tasksSlice.actions;

/* ============================================================
   SELECTORS
============================================================ */

export const selectProjects = (state: { tasks: TasksState }) => state.tasks.projects;
export const selectSelectedProject = (state: { tasks: TasksState }) => state.tasks.selectedProject;
export const selectTasks = (state: { tasks: TasksState }) => state.tasks.tasks;
export const selectStandaloneTasks = (state: { tasks: TasksState }) => state.tasks.standaloneTasks;
export const selectSelectedTask = (state: { tasks: TasksState }) => state.tasks.selectedTask;
export const selectProjectMembers = (state: { tasks: TasksState }) => state.tasks.projectMembers;
export const selectTaskStats = (state: { tasks: TasksState }) => state.tasks.stats.tasks;
export const selectProjectStats = (state: { tasks: TasksState }) => state.tasks.stats.projects;
export const selectTasksError = (state: { tasks: TasksState }) => state.tasks.error;
export const selectTasksSuccess = (state: { tasks: TasksState }) => state.tasks.success;

export const selectProjectsLoading = (state: { tasks: TasksState }) => state.tasks.loading.projects;
export const selectProjectLoading = (state: { tasks: TasksState }) => state.tasks.loading.project;
export const selectTasksLoading = (state: { tasks: TasksState }) => state.tasks.loading.tasks;
export const selectStandaloneTasksLoading = (state: { tasks: TasksState }) => state.tasks.loading.standaloneTasks;
export const selectTaskLoading = (state: { tasks: TasksState }) => state.tasks.loading.task;
export const selectMembersLoading = (state: { tasks: TasksState }) => state.tasks.loading.members;
export const selectStatsLoading = (state: { tasks: TasksState }) => state.tasks.loading.stats;
export const selectTasksMutating = (state: { tasks: TasksState }) => state.tasks.loading.mutating;

// Derived selectors
export const selectProjectTasks = (projectId: string) => (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(t => t.project_id === projectId);

export const selectTaskStatsForProject = (projectId: string) => (state: { tasks: TasksState }) => {
  const projectTasks = state.tasks.tasks.filter(t => t.project_id === projectId);
  return {
    todo: projectTasks.filter(t => t.status === 'todo').length,
    in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
    done: projectTasks.filter(t => t.status === 'done').length,
    total: projectTasks.length,
  };
};

export default tasksSlice.reducer;