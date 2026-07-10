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
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_tasks?: number;
  members?: ProjectMember[];
}

// Updated Task interface to match new backend
export interface Task {
  id: string;
  project_id: string | null;
  project_name?: string;
  title: string;
  description: string | null;
  status: 'pending' | 'completed';                     // changed
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  assignee_name?: string;
  due_date: string;
  start_date: string | null;
  remind_at: string | null;                            // new
  reminder_sent: boolean;                              // new
  completed_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_overdue?: boolean;                                // computed
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string;
  uploader_name?: string;
  created_at: string;
}

// Updated TaskStats to match new backend
export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
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
  remind_at?: string;                                 // new
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'pending' | 'completed';                  // changed
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string | null;
  due_date?: string;
  start_date?: string | null;
  remind_at?: string | null;                         // new
  is_active?: boolean;
}

export interface AddProjectMemberInput {
  user_id: string;
  role?: string;
}

export interface AddAttachmentInput {
  file_name: string;
  file_url: string;
}

interface TasksState {
  projects: Project[];
  selectedProject: Project | null;
  tasks: Task[];
  standaloneTasks: Task[];
  selectedTask: Task | null;
  projectMembers: ProjectMember[];
  attachments: Record<string, TaskAttachment[]>;      // keyed by taskId
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
    attachments: boolean;
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
  attachments: {},
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
    attachments: false,
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

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (projectId: string | undefined, { rejectWithValue }) => {
    try {
      const url = projectId ? `/tasks?projectId=${projectId}` : '/tasks';
      const response = await axiosClient.get(url);
      console.log('🔍 [fetchTasks] raw response:', response.data);
      // Assume response.data might be { data: [...] } or just [...]
      const tasks = Array.isArray(response.data) 
        ? response.data 
        : Array.isArray(response.data?.data) 
          ? response.data.data 
          : [];
      return tasks as Task[];
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const fetchStandaloneTasks = createAsyncThunk(
  'tasks/fetchStandaloneTasks',
  async (_, { rejectWithValue }) => {
    try {
      // ✅ correct: /tasks/standalone
      const { data } = await axiosClient.get('/tasks/standalone');
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
      // ✅ correct: /tasks/:id
      const { data } = await axiosClient.get(`/tasks/${id}`);
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
      // ✅ correct: POST /tasks
      const { data } = await axiosClient.post('/tasks', input);
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
      // ✅ correct: PUT /tasks/:id
      const { data } = await axiosClient.put(`/tasks/${id}`, input);
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
      // ✅ correct: DELETE /tasks/:id
      await axiosClient.delete(`/tasks/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ============================================================
   THUNKS - ATTACHMENTS
============================================================ */

export const fetchAttachments = createAsyncThunk(
  'tasks/fetchAttachments',
  async (taskId: string, { rejectWithValue }) => {
    try {
      // ✅ correct: GET /tasks/:id/attachments
      const { data } = await axiosClient.get(`/tasks/${taskId}/attachments`);
      return { taskId, attachments: data.data as TaskAttachment[] };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const addAttachment = createAsyncThunk(
  'tasks/addAttachment',
  async ({ taskId, input }: { taskId: string; input: AddAttachmentInput }, { rejectWithValue }) => {
    try {
      // ✅ correct: POST /tasks/:id/attachments
      const { data } = await axiosClient.post(`/tasks/${taskId}/attachments`, input);
      return data.data as TaskAttachment;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);


export const deleteAttachment = createAsyncThunk(
  'tasks/deleteAttachment',
  async (attachmentId: string, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/tasks/attachments/${attachmentId}`);
      return attachmentId;
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
    // Optimistic status update (pending/completed)
    updateTaskStatusLocally(state, action: PayloadAction<{ taskId: string; status: Task['status'] }>) {
      const { taskId, status } = action.payload;

      const updateTask = (task: Task) => {
        task.status = status;
        if (status === 'completed') {
          task.completed_at = new Date().toISOString();
        } else {
          task.completed_at = null;
        }
      };

      const taskInTasks = state.tasks.find(t => t.id === taskId);
      if (taskInTasks) updateTask(taskInTasks);

      const taskInStandalone = state.standaloneTasks.find(t => t.id === taskId);
      if (taskInStandalone) updateTask(taskInStandalone);

      if (state.selectedTask?.id === taskId) {
        updateTask(state.selectedTask);
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
  state.tasks = action.payload || [];   // ensure array
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
          state.tasks = [action.payload, ...state.tasks];
          const projectIndex = state.projects.findIndex(p => p.id === action.payload.project_id);
          if (projectIndex !== -1) {
            state.projects[projectIndex].task_count = (state.projects[projectIndex].task_count || 0) + 1;
          }
          if (state.selectedProject?.id === action.payload.project_id) {
            state.selectedProject.task_count = (state.selectedProject.task_count || 0) + 1;
          }
        } else {
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

        const taskIndex = state.tasks.findIndex(t => t.id === action.payload.id);
        if (taskIndex !== -1) {
          state.tasks[taskIndex] = action.payload;
        }

        const standaloneIndex = state.standaloneTasks.findIndex(t => t.id === action.payload.id);
        if (standaloneIndex !== -1) {
          state.standaloneTasks[standaloneIndex] = action.payload;
        }

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

        const removed = state.tasks.find(t => t.id === action.payload);
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
        state.standaloneTasks = state.standaloneTasks.filter(t => t.id !== action.payload);

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
        // Also remove any cached attachments for this task
        delete state.attachments[action.payload];
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
      });

    /* ---------- FETCH ATTACHMENTS ---------- */
    builder
      .addCase(fetchAttachments.pending, (state) => {
        state.loading.attachments = true;
        state.error = null;
      })
      .addCase(fetchAttachments.fulfilled, (state, action: PayloadAction<{ taskId: string; attachments: TaskAttachment[] }>) => {
        state.loading.attachments = false;
        state.attachments[action.payload.taskId] = action.payload.attachments;
      })
      .addCase(fetchAttachments.rejected, (state, action) => {
        state.loading.attachments = false;
        state.error = action.payload as string;
      });

    /* ---------- ADD ATTACHMENT ---------- */
    builder
      .addCase(addAttachment.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
        state.success = false;
      })
      .addCase(addAttachment.fulfilled, (state, action: PayloadAction<TaskAttachment>) => {
        state.loading.mutating = false;
        state.success = true;
        const taskId = action.payload.task_id;
        if (state.attachments[taskId]) {
          state.attachments[taskId] = [action.payload, ...state.attachments[taskId]];
        } else {
          state.attachments[taskId] = [action.payload];
        }
      })
      .addCase(addAttachment.rejected, (state, action) => {
        state.loading.mutating = false;
        state.error = action.payload as string;
        state.success = false;
      });

    /* ---------- DELETE ATTACHMENT ---------- */
    builder
      .addCase(deleteAttachment.pending, (state) => {
        state.loading.mutating = true;
        state.error = null;
      })
      .addCase(deleteAttachment.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading.mutating = false;
        // Remove from all task attachment lists
        Object.keys(state.attachments).forEach(taskId => {
          state.attachments[taskId] = state.attachments[taskId].filter(a => a.id !== action.payload);
        });
      })
      .addCase(deleteAttachment.rejected, (state, action) => {
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
export const selectAttachments = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.attachments[taskId] || [];
export const selectTasksError = (state: { tasks: TasksState }) => state.tasks.error;
export const selectTasksSuccess = (state: { tasks: TasksState }) => state.tasks.success;

export const selectProjectsLoading = (state: { tasks: TasksState }) => state.tasks.loading.projects;
export const selectProjectLoading = (state: { tasks: TasksState }) => state.tasks.loading.project;
export const selectTasksLoading = (state: { tasks: TasksState }) => state.tasks.loading.tasks;
export const selectStandaloneTasksLoading = (state: { tasks: TasksState }) => state.tasks.loading.standaloneTasks;
export const selectTaskLoading = (state: { tasks: TasksState }) => state.tasks.loading.task;
export const selectMembersLoading = (state: { tasks: TasksState }) => state.tasks.loading.members;
export const selectStatsLoading = (state: { tasks: TasksState }) => state.tasks.loading.stats;
export const selectAttachmentsLoading = (state: { tasks: TasksState }) => state.tasks.loading.attachments;
export const selectTasksMutating = (state: { tasks: TasksState }) => state.tasks.loading.mutating;

// Derived selectors (updated for new statuses)
export const selectProjectTasks = (projectId: string) => (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(t => t.project_id === projectId);

export const selectTaskStatsForProject = (projectId: string) => (state: { tasks: TasksState }) => {
  const projectTasks = state.tasks.tasks.filter(t => t.project_id === projectId);
  return {
    pending: projectTasks.filter(t => t.status === 'pending').length,
    completed: projectTasks.filter(t => t.status === 'completed').length,
    total: projectTasks.length,
  };
};
export const selectAttachmentsMap = (state: { tasks: TasksState }) => state.tasks.attachments;

export default tasksSlice.reducer;