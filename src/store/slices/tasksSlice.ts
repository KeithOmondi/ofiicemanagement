import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  Project,
  Task,
  Subtask,
  TaskNote,
  Reminder,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubtaskInput,
  UpdateSubtaskInput,
  CreateTaskNoteInput,
  CreateReminderInput,
  TaskFilters,
} from '../../types/tasks.types';
import axiosClient from '../../api/api';
import axios from 'axios';

// ─── State type ──────────────────────────────────────────────
interface TasksState {
  projects: Project[];
  standaloneTasks: Task[];
  selectedTask: Task | null;
  selectedTaskDetails: {
    subtasks: Subtask[];
    notes: TaskNote[];
    reminders: Reminder[];
  } | null;
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
}

const initialState: TasksState = {
  projects: [],
  standaloneTasks: [],
  selectedTask: null,
  selectedTaskDetails: null,
  loading: false,
  error: null,
  filters: {},
};

// ─── Helper to extract error message ───────────────────────
const extractErrorMessage = (error: unknown): string => {
  console.log('🔍 [extractErrorMessage] Processing error:', error);

  if (axios.isAxiosError(error)) {
    console.log('🔍 [extractErrorMessage] Axios error detected');
    const status = error.response?.status;
    const responseData = error.response?.data;
    
    console.log(`🔍 [extractErrorMessage] Status: ${status}`);
    console.log('🔍 [extractErrorMessage] Response data:', responseData);

    if (responseData) {
      if (typeof responseData === 'string') {
        return responseData;
      }
      if (typeof responseData === 'object') {
        if ('message' in responseData && typeof responseData.message === 'string') {
          return responseData.message;
        }
        if ('error' in responseData && typeof responseData.error === 'string') {
          return responseData.error;
        }
        if ('detail' in responseData && typeof responseData.detail === 'string') {
          return responseData.detail;
        }
        if ('errors' in responseData) {
          const errors = responseData.errors;
          if (Array.isArray(errors)) {
            return errors.map((e: unknown) => typeof e === 'string' ? e : JSON.stringify(e)).join(', ');
          }
          if (typeof errors === 'object') {
            return JSON.stringify(errors);
          }
        }
        try {
          return JSON.stringify(responseData);
        } catch {
          return 'Unknown server error';
        }
      }
    }
    return error.message || `Request failed with status ${status || 'unknown'}`;
  }

  if (error instanceof Error) {
    console.log('🔍 [extractErrorMessage] Error instance detected');
    return error.message;
  }

  if (typeof error === 'string') {
    console.log('🔍 [extractErrorMessage] String error detected');
    return error;
  }

  console.log('🔍 [extractErrorMessage] Unknown error type');
  return 'An unexpected error occurred';
};

// ─── Thunks ──────────────────────────────────────────────────

// ── Projects ──
export const fetchProjects = createAsyncThunk(
  'tasks/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📤 [fetchProjects] Fetching all projects...');
      const response = await axiosClient.get('/tasks/projects');
      console.log('✅ [fetchProjects] Projects fetched:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [fetchProjects] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const createProject = createAsyncThunk(
  'tasks/createProject',
  async (data: CreateProjectInput, { rejectWithValue }) => {
    try {
      console.log('📤 [createProject] Creating project:', data);
      const response = await axiosClient.post('/tasks/projects', data);
      console.log('✅ [createProject] Project created:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [createProject] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateProject = createAsyncThunk(
  'tasks/updateProject',
  async ({ id, data }: { id: string; data: UpdateProjectInput }, { rejectWithValue }) => {
    try {
      console.log(`📤 [updateProject] Updating project ${id}:`, data);
      const response = await axiosClient.put(`/tasks/projects/${id}`, data);
      console.log('✅ [updateProject] Project updated:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [updateProject] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteProject = createAsyncThunk(
  'tasks/deleteProject',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [deleteProject] Deleting project ${id}...`);
      await axiosClient.delete(`/tasks/projects/${id}`);
      console.log('✅ [deleteProject] Project deleted');
      return id;
    } catch (error) {
      console.error('❌ [deleteProject] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const getProject = createAsyncThunk(
  'tasks/getProject',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [getProject] Fetching project ${id}...`);
      const response = await axiosClient.get(`/tasks/projects/${id}`);
      console.log('✅ [getProject] Project fetched:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [getProject] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Tasks ──
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (filters: TaskFilters = {}, { rejectWithValue }) => {
    try {
      console.log('📤 [fetchTasks] Fetching tasks with filters:', filters);
      const response = await axiosClient.get('/tasks/tasks', { params: filters });
      console.log('✅ [fetchTasks] Tasks fetched:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [fetchTasks] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (data: CreateTaskInput, { rejectWithValue }) => {
    try {
      console.log('📤 [createTask] Creating task with data:', JSON.stringify(data, null, 2));
      
      // ✅ Ensure dates are in the correct format for the backend
      const payload = {
        ...data,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
      };
      
      console.log('📤 [createTask] Formatted payload:', JSON.stringify(payload, null, 2));
      
      const response = await axiosClient.post('/tasks/tasks', payload);
      console.log('✅ [createTask] Task created:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [createTask] Failed:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ [createTask] Response status:', error.response?.status);
        console.error('❌ [createTask] Response data:', JSON.stringify(error.response?.data, null, 2));
        console.error('❌ [createTask] Request config:', error.config);
      }
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, data }: { id: string; data: UpdateTaskInput }, { rejectWithValue }) => {
    try {
      console.log(`📤 [updateTask] Updating task ${id}:`, data);
      const response = await axiosClient.put(`/tasks/tasks/${id}`, data);
      console.log('✅ [updateTask] Task updated:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [updateTask] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [deleteTask] Deleting task ${id}...`);
      await axiosClient.delete(`/tasks/tasks/${id}`);
      console.log('✅ [deleteTask] Task deleted');
      return id;
    } catch (error) {
      console.error('❌ [deleteTask] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const fetchFullTask = createAsyncThunk(
  'tasks/fetchFullTask',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [fetchFullTask] Fetching full task ${id}...`);
      const response = await axiosClient.get(`/tasks/tasks/${id}`);
      console.log('✅ [fetchFullTask] Full task fetched:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [fetchFullTask] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Subtasks ──
export const createSubtask = createAsyncThunk(
  'tasks/createSubtask',
  async (data: CreateSubtaskInput, { rejectWithValue }) => {
    try {
      console.log('📤 [createSubtask] Creating subtask:', data);
      const response = await axiosClient.post('/tasks/subtasks', data);
      console.log('✅ [createSubtask] Subtask created:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [createSubtask] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const listSubtasks = createAsyncThunk(
  'tasks/listSubtasks',
  async (taskId: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [listSubtasks] Fetching subtasks for task ${taskId}...`);
      const response = await axiosClient.get(`/tasks/subtasks/task/${taskId}`);
      console.log('✅ [listSubtasks] Subtasks fetched:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [listSubtasks] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const updateSubtask = createAsyncThunk(
  'tasks/updateSubtask',
  async ({ id, data }: { id: string; data: UpdateSubtaskInput }, { rejectWithValue }) => {
    try {
      console.log(`📤 [updateSubtask] Updating subtask ${id}:`, data);
      const response = await axiosClient.put(`/tasks/subtasks/${id}`, data);
      console.log('✅ [updateSubtask] Subtask updated:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [updateSubtask] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteSubtask = createAsyncThunk(
  'tasks/deleteSubtask',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [deleteSubtask] Deleting subtask ${id}...`);
      await axiosClient.delete(`/tasks/subtasks/${id}`);
      console.log('✅ [deleteSubtask] Subtask deleted');
      return id;
    } catch (error) {
      console.error('❌ [deleteSubtask] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Task Notes ──
export const createTaskNote = createAsyncThunk(
  'tasks/createTaskNote',
  async (data: CreateTaskNoteInput, { rejectWithValue }) => {
    try {
      console.log('📤 [createTaskNote] Creating task note:', data);
      const response = await axiosClient.post('/tasks/task-notes', data);
      console.log('✅ [createTaskNote] Task note created:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [createTaskNote] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const listTaskNotes = createAsyncThunk(
  'tasks/listTaskNotes',
  async (taskId: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [listTaskNotes] Fetching notes for task ${taskId}...`);
      const response = await axiosClient.get(`/tasks/task-notes/task/${taskId}`);
      console.log('✅ [listTaskNotes] Notes fetched:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [listTaskNotes] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteTaskNote = createAsyncThunk(
  'tasks/deleteTaskNote',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [deleteTaskNote] Deleting task note ${id}...`);
      await axiosClient.delete(`/tasks/task-notes/${id}`);
      console.log('✅ [deleteTaskNote] Task note deleted');
      return id;
    } catch (error) {
      console.error('❌ [deleteTaskNote] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ── Reminders ──
export const createReminder = createAsyncThunk(
  'tasks/createReminder',
  async (data: CreateReminderInput, { rejectWithValue }) => {
    try {
      console.log('📤 [createReminder] Creating reminder:', data);
      const response = await axiosClient.post('/tasks/reminders', data);
      console.log('✅ [createReminder] Reminder created:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [createReminder] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const listReminders = createAsyncThunk(
  'tasks/listReminders',
  async (taskId: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [listReminders] Fetching reminders for task ${taskId}...`);
      const response = await axiosClient.get(`/tasks/reminders/task/${taskId}`);
      console.log('✅ [listReminders] Reminders fetched:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ [listReminders] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

export const deleteReminder = createAsyncThunk(
  'tasks/deleteReminder',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log(`📤 [deleteReminder] Deleting reminder ${id}...`);
      await axiosClient.delete(`/tasks/reminders/${id}`);
      console.log('✅ [deleteReminder] Reminder deleted');
      return id;
    } catch (error) {
      console.error('❌ [deleteReminder] Failed:', error);
      return rejectWithValue(extractErrorMessage(error));
    }
  }
);

// ─── Slice ──────────────────────────────────────────────────
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<TaskFilters>) => {
      state.filters = action.payload;
    },
    clearSelectedTask: (state) => {
      state.selectedTask = null;
      state.selectedTaskDetails = null;
    },
    toggleTaskDone: (state, action: PayloadAction<{ taskId: string; projectId: string | null }>) => {
      const { taskId, projectId } = action.payload;
      const findAndToggle = (tasks: Task[]) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.status = task.status === 'done' ? 'todo' : 'done';
          task.progress = task.status === 'done' ? 100 : 0;
          return true;
        }
        return false;
      };
      if (projectId) {
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
          findAndToggle(project.tasks);
        }
      } else {
        findAndToggle(state.standaloneTasks);
      }
      if (state.selectedTask?.id === taskId) {
        state.selectedTask.status = state.selectedTask.status === 'done' ? 'todo' : 'done';
        state.selectedTask.progress = state.selectedTask.status === 'done' ? 100 : 0;
      }
    },
    setTaskDetails: (state, action: PayloadAction<{
      subtasks?: Subtask[];
      notes?: TaskNote[];
      reminders?: Reminder[];
    }>) => {
      if (state.selectedTaskDetails) {
        if (action.payload.subtasks) {
          state.selectedTaskDetails.subtasks = action.payload.subtasks;
        }
        if (action.payload.notes) {
          state.selectedTaskDetails.notes = action.payload.notes;
        }
        if (action.payload.reminders) {
          state.selectedTaskDetails.reminders = action.payload.reminders;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Projects ──
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
        state.standaloneTasks = action.payload.flatMap((p: Project) =>
          p.tasks.filter((t: Task) => t.project_id === null)
        );
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getProject.fulfilled, (state, action) => {
        const project = action.payload;
        const index = state.projects.findIndex(p => p.id === project.id);
        if (index !== -1) {
          state.projects[index] = project;
        } else {
          state.projects.push(project);
        }
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects.push(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.projects.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        }
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(p => p.id !== action.payload);
      })
      
      // ── Tasks ──
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        const tasks = action.payload;
        const projectTasks = tasks.filter((t: Task) => t.project_id !== null);
        const standalone = tasks.filter((t: Task) => t.project_id === null);
        state.standaloneTasks = standalone;
        projectTasks.forEach((task: Task) => {
          const project = state.projects.find(p => p.id === task.project_id);
          if (project) {
            const existing = project.tasks.find(t => t.id === task.id);
            if (existing) {
              Object.assign(existing, task);
            } else {
              project.tasks.push(task);
            }
          }
        });
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        const task = action.payload;
        console.log('📦 [createTask] Adding task to state:', task);
        if (task.project_id) {
          const project = state.projects.find(p => p.id === task.project_id);
          if (project) {
            project.tasks.push(task);
          } else {
            console.warn('⚠️ [createTask] Project not found for task:', task);
          }
        } else {
          state.standaloneTasks.push(task);
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.error = action.payload as string;
        console.error('❌ [createTask] State error set:', state.error);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const task = action.payload;
        state.projects.forEach(p => {
          const idx = p.tasks.findIndex(t => t.id === task.id);
          if (idx !== -1) p.tasks[idx] = task;
        });
        const idx = state.standaloneTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) state.standaloneTasks[idx] = task;
        if (state.selectedTask?.id === task.id) {
          state.selectedTask = task;
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        const id = action.payload;
        state.projects.forEach(p => {
          p.tasks = p.tasks.filter(t => t.id !== id);
        });
        state.standaloneTasks = state.standaloneTasks.filter(t => t.id !== id);
        if (state.selectedTask?.id === id) {
          state.selectedTask = null;
          state.selectedTaskDetails = null;
        }
      })
      .addCase(fetchFullTask.fulfilled, (state, action) => {
        const { task, subtasks, notes, reminders } = action.payload;
        state.selectedTask = task;
        state.selectedTaskDetails = { subtasks, notes, reminders };
      })
      
      // ── Subtasks ──
      .addCase(listSubtasks.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.subtasks = action.payload;
        }
      })
      .addCase(createSubtask.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.subtasks.push(action.payload);
        }
      })
      .addCase(updateSubtask.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          const idx = state.selectedTaskDetails.subtasks.findIndex(s => s.id === action.payload.id);
          if (idx !== -1) state.selectedTaskDetails.subtasks[idx] = action.payload;
        }
      })
      .addCase(deleteSubtask.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.subtasks = state.selectedTaskDetails.subtasks.filter(
            s => s.id !== action.payload
          );
        }
      })
      
      // ── Task Notes ──
      .addCase(listTaskNotes.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.notes = action.payload;
        }
      })
      .addCase(createTaskNote.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.notes.push(action.payload);
        }
      })
      .addCase(deleteTaskNote.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.notes = state.selectedTaskDetails.notes.filter(
            n => n.id !== action.payload
          );
        }
      })
      
      // ── Reminders ──
      .addCase(listReminders.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.reminders = action.payload;
        }
      })
      .addCase(createReminder.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.reminders.push(action.payload);
        }
      })
      .addCase(deleteReminder.fulfilled, (state, action) => {
        if (state.selectedTaskDetails) {
          state.selectedTaskDetails.reminders = state.selectedTaskDetails.reminders.filter(
            r => r.id !== action.payload
          );
        }
      });
  },
});

// ─── Actions ─────────────────────────────────────────────────
export const { setFilters, clearSelectedTask, toggleTaskDone, setTaskDetails } = tasksSlice.actions;

// ─── Selectors ──────────────────────────────────────────────
export const selectAllProjects = (state: { tasks: TasksState }) => state.tasks.projects;
export const selectStandaloneTasks = (state: { tasks: TasksState }) => state.tasks.standaloneTasks;
export const selectSelectedTask = (state: { tasks: TasksState }) => state.tasks.selectedTask;
export const selectSelectedTaskDetails = (state: { tasks: TasksState }) => state.tasks.selectedTaskDetails;
export const selectTasksLoading = (state: { tasks: TasksState }) => state.tasks.loading;
export const selectTasksError = (state: { tasks: TasksState }) => state.tasks.error;
export const selectFilters = (state: { tasks: TasksState }) => state.tasks.filters;

export const selectStats = (state: { tasks: TasksState }) => {
  const allTasks = [
    ...state.tasks.projects.flatMap(p => p.tasks),
    ...state.tasks.standaloneTasks,
  ];
  let todo = 0,
    inprogress = 0,
    overdue = 0,
    done = 0;
  allTasks.forEach(t => {
    if (t.status === 'done') done++;
    else if (t.status === 'overdue') overdue++;
    else if (t.status === 'inprogress') inprogress++;
    else todo++;
  });
  return { todo, inprogress, overdue, done };
};

export const selectFilteredTasks = (state: { tasks: TasksState }) => {
  const { filters, projects, standaloneTasks } = state.tasks;
  const allTasks = [
    ...projects.flatMap(p => p.tasks.map(t => ({ ...t, projectTitle: p.title, projectId: p.id }))),
    ...standaloneTasks.map(t => ({ ...t, projectTitle: 'Standalone', projectId: null })),
  ];
  return allTasks.filter(t => {
    if (filters.assignee && t.assignee !== filters.assignee) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.project_id && t.projectId !== filters.project_id) return false;
    return true;
  });
};

export default tasksSlice.reducer;