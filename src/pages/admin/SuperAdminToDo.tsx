// src/components/AnyDoDashboard.tsx (or SuperAdminToDo.tsx)
import { useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchTasks,
  fetchTaskLists,
  fetchTaskSummary,
  fetchTaskById,
  createTask,
  updateTask,
  toggleTaskStatus,
  createSubtask,
  updateSubtask,
  uploadTaskAttachments,
  selectAllTasks,
  selectTaskLists,
  selectTasksSummary,
  selectCurrentTask,
  selectTasksError,
  selectTasksByDay,
  selectMyDayTasks,
  selectTasksListLoading,
  selectTasksDetailLoading,
  resetTasksState,
  clearCurrentTask, // 👈 added
} from "../../store/slices/tasksSlice";
import type {
  Task,
  TaskDay,
  TaskStatus,
  TaskAttachment, // 👈 used for attachments
} from "../../types/tasks.types";
import {
  Sun,
  Calendar,
  Plus,
  ChevronRight,
  CheckSquare,
  CalendarDays,
  Lock,
  Circle,
  RotateCw,
  Headphones,
  Square,
  Search,
  UserPlus,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  MoreHorizontal,
  ArrowUpDown,
  Bell,
  Tag,
  Target,
  Archive,
  MoreVertical,
  X,
  ChevronLeft,
  RotateCcw,
  Menu,
  Upload,
} from "lucide-react";

const TAG_OPTIONS = [
  { id: "priority", name: "Priority", color: "bg-amber-400 text-white" },
  { id: "important", name: "important", color: "bg-rose-200 text-slate-700" },
  { id: "family", name: "family", color: "bg-orange-100 text-slate-700" },
  { id: "deadline", name: "deadline", color: "bg-amber-100 text-slate-700" },
  { id: "nothing", name: "nothing", color: "bg-yellow-100 text-slate-700" },
  { id: "trackback", name: "trackback", color: "bg-emerald-100 text-slate-700" },
  { id: "science-project", name: "science project", color: "bg-emerald-200 text-slate-700" },
];

// ─── Shared Task Detail Props ──────────────────────────────────────────────
interface TaskDetailContentProps {
  task: Task;
  completedSubtasksCount: number;
  newSubtaskInput: string;
  setNewSubtaskInput: (value: string) => void;
  handleAddSubtask: () => void;
  toggleSubtask: (subtaskId: string) => void;
  isReminderOpen: boolean;
  setIsReminderOpen: (open: boolean) => void;
  isTagsOpen: boolean;
  setIsTagsOpen: (open: boolean) => void;
  reminderDate: string;
  setReminderDate: (date: string) => void;
  reminderTime: string;
  setReminderTime: (time: string) => void;
  handleSaveReminder: () => void;
  selectedTags: string[];
  toggleTagSelection: (tagId: string) => void;
  handleSaveTags: () => void;
  onAttachmentUpload: (files: FileList | null) => void;
  TAG_OPTIONS: typeof TAG_OPTIONS;
}

// ─── TaskDetailContent (unchanged except attachment fields) ──────────────
const TaskDetailContent = ({
  task,
  completedSubtasksCount,
  newSubtaskInput,
  setNewSubtaskInput,
  handleAddSubtask,
  toggleSubtask,
  isReminderOpen,
  setIsReminderOpen,
  isTagsOpen,
  setIsTagsOpen,
  reminderDate,
  setReminderDate,
  reminderTime,
  setReminderTime,
  handleSaveReminder,
  selectedTags,
  toggleTagSelection,
  handleSaveTags,
  onAttachmentUpload,
  TAG_OPTIONS,
}: TaskDetailContentProps) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{task.title}</h1>

      {/* Reminder, Tags buttons (same as before) */}
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setIsReminderOpen(!isReminderOpen);
              setIsTagsOpen(false);
            }}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition ${
              isReminderOpen || task.reminder_date
                ? "border-sky-500 bg-sky-50 text-sky-600"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-rose-500" />
            <span className="truncate max-w-[120px] sm:max-w-none">
              {task.reminder_date
                ? `${task.reminder_date}, ${task.reminder_time}`
                : "Remind me"}
            </span>
          </button>

          <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
            <span className="w-3 h-3 rounded-md border border-amber-400 bg-amber-50 flex items-center justify-center text-[9px]">📄</span>
            <span>Personal</span>
          </button>

          <button
            onClick={() => {
              setIsTagsOpen(!isTagsOpen);
              setIsReminderOpen(false);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition ${
              isTagsOpen || (task.tags && task.tags.length > 0)
                ? "border-sky-500 bg-sky-50 text-sky-600"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-sky-500" />
            <span>Tags</span>
          </button>
        </div>

        {/* Reminder Popover (unchanged) */}
        {isReminderOpen && (
          <div className="absolute top-10 left-0 z-50 w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* ... same content ... */}
            <h3 className="text-center text-sm font-bold text-slate-800">Reminder</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DATE</label>
                <input
                  type="text"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 text-center outline-none focus:border-sky-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TIME</label>
                <input
                  type="text"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 text-center outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-12 gap-4 pt-1">
              <div className="col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">July 2026</span>
                  <div className="flex items-center space-x-1 text-slate-400">
                    <button className="p-0.5 hover:text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
                    <button className="p-0.5 hover:text-slate-600"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 gap-1">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
                <div className="grid grid-cols-7 text-center text-xs font-semibold gap-y-1 gap-x-1">
                  <span className="text-slate-300 py-1">29</span><span className="text-slate-300 py-1">30</span>
                  <span className="text-slate-300 py-1">1</span><span className="text-slate-300 py-1">2</span>
                  <span className="text-slate-300 py-1">3</span><span className="text-slate-300 py-1">4</span>
                  <span className="text-slate-300 py-1">5</span><span className="text-slate-300 py-1">6</span>
                  <span className="text-slate-300 py-1">7</span><span className="text-slate-300 py-1">8</span>
                  <span className="text-slate-300 py-1">9</span><span className="text-slate-300 py-1">10</span>
                  <span className="text-slate-300 py-1">11</span><span className="text-slate-300 py-1">12</span>
                  <span className="text-slate-300 py-1">13</span><span className="text-slate-300 py-1">14</span>
                  <span className="text-slate-300 py-1">15</span><span className="text-slate-300 py-1">16</span>
                  <span className="text-slate-300 py-1">17</span><span className="text-slate-300 py-1">18</span>
                  <span className="text-slate-300 py-1">19</span><span className="text-slate-300 py-1">20</span>
                  <span className="text-slate-300 py-1">21</span><span className="text-slate-300 py-1">22</span>
                  <span className="text-slate-300 py-1">23</span><span className="text-slate-300 py-1">24</span>
                  <span className="text-slate-300 py-1">25</span><span className="text-slate-300 py-1">26</span>
                  <button className="bg-sky-500 text-white rounded-full py-1 font-bold">27</button>
                  <button className="text-slate-700 py-1 hover:bg-slate-100 rounded-full">28</button>
                  <button className="text-slate-700 py-1 hover:bg-slate-100 rounded-full">29</button>
                  <button className="text-slate-700 py-1 hover:bg-slate-100 rounded-full">30</button>
                  <button className="text-slate-700 py-1 hover:bg-slate-100 rounded-full">31</button>
                </div>
              </div>
              <div className="col-span-5 flex flex-col justify-center space-y-1.5 pl-2 border-l border-slate-100">
                <button className="w-full py-1.5 px-3 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 text-center">Later today</button>
                <button className="w-full py-1.5 px-3 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 text-center">Tomorrow</button>
                <button className="w-full py-1.5 px-3 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 text-center">Next week</button>
                <button className="w-full py-1.5 px-3 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 text-center">Someday</button>
                <button className="w-full py-1.5 px-3 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center space-x-1 text-center">
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Recurring</span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button onClick={() => setIsReminderOpen(false)} className="w-1/2 text-xs font-bold text-slate-700 hover:text-slate-900 transition py-1 text-center">Cancel</button>
              <div className="h-4 w-px bg-slate-200" />
              <button onClick={handleSaveReminder} className="w-1/2 text-xs font-bold text-sky-500 hover:text-sky-600 transition py-1 text-center">Set</button>
            </div>
          </div>
        )}

        {/* Tags Popover (unchanged) */}
        {isTagsOpen && (
          <div className="absolute top-10 left-0 z-50 w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-center text-sm font-bold text-slate-800 py-3 border-b border-slate-100">Tags</h3>
            <div
              onClick={() => toggleTagSelection("priority")}
              className="p-3.5 bg-amber-400 text-white flex items-center space-x-3 cursor-pointer select-none font-semibold text-xs"
            >
              <div className={`w-4 h-4 rounded border border-white flex items-center justify-center ${selectedTags.includes("priority") ? "bg-white text-amber-500" : ""}`}>
                {selectedTags.includes("priority") && "✓"}
              </div>
              <span>Priority</span>
            </div>
            <div className="divide-y divide-slate-100/60 max-h-56 overflow-y-auto">
              {TAG_OPTIONS.slice(1).map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    onClick={() => toggleTagSelection(tag.id)}
                    className={`p-3 ${tag.color} flex items-center space-x-3 cursor-pointer select-none font-medium text-xs transition hover:opacity-90`}
                  >
                    <div className={`w-4 h-4 rounded border border-slate-400/40 bg-white/60 flex items-center justify-center ${isSelected ? "bg-slate-700 text-white" : ""}`}>
                      {isSelected && "✓"}
                    </div>
                    <span>{tag.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-white">
              <button
                onClick={() => setIsTagsOpen(false)}
                className="w-1/2 text-xs font-bold text-slate-700 hover:text-slate-900 transition py-1 text-center"
              >
                Cancel
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <button
                onClick={handleSaveTags}
                className="w-1/2 text-xs font-bold text-sky-500 hover:text-sky-600 transition py-1 text-center"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">NOTES</label>
        <textarea
          placeholder="Insert your notes here"
          rows={2}
          defaultValue={task.notes || ""}
          className="w-full text-xs text-slate-700 placeholder-slate-300 bg-transparent outline-none resize-none"
        />
      </div>

      {/* Subtasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            SUBTASKS {completedSubtasksCount}/{task.subtasks?.length || 0}
          </label>
          <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2">
          {task.subtasks?.map((st) => (
            <div key={st.id} className="flex items-center space-x-2 text-xs">
              <button onClick={() => toggleSubtask(st.id)}>
                <Circle className={`w-4 h-4 ${st.completed ? "fill-emerald-600 text-emerald-600" : "text-slate-300"}`} />
              </button>
              <span className={st.completed ? "line-through text-slate-400" : "text-slate-700"}>{st.title}</span>
            </div>
          ))}
          <div className="flex items-center space-x-2.5 pt-1">
            <Circle className="w-4 h-4 text-slate-300 shrink-0" />
            <input
              type="text"
              placeholder="Add a new subtask"
              value={newSubtaskInput}
              onChange={(e) => setNewSubtaskInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
              className="w-full bg-transparent outline-none text-xs text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Attachments - fixed field names */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">ATTACHMENTS</label>
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-slate-400 hover:border-slate-300 cursor-pointer transition">
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-6 h-6 text-slate-300 mb-2" />
            <span className="text-xs font-medium">Click to add / drop your files here</span>
            <input
              id="file-upload"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onAttachmentUpload(e.target.files)}
            />
          </label>
          {task.attachments && task.attachments.length > 0 && (
            <div className="mt-3 w-full space-y-1">
              {task.attachments.map((att: TaskAttachment) => (
                <div key={att.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                  <span className="truncate">{att.file_name}</span>
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">View</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Helper: greeting ──────────────────────────────────────────────────────
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────
const AnyDoDashboard = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const tasks = useAppSelector(selectAllTasks);
  const taskLists = useAppSelector(selectTaskLists);
  const summary = useAppSelector(selectTasksSummary);
  const loading = useAppSelector(selectTasksListLoading);
  const detailLoading = useAppSelector(selectTasksDetailLoading);
  const error = useAppSelector(selectTasksError);
  const currentTask = useAppSelector(selectCurrentTask);
  const myDayTasks = useAppSelector(selectMyDayTasks);
  const todayTasks = useAppSelector(selectTasksByDay('Today'));

  const user = useAppSelector((state) => state.auth.user);
  const userName = user?.full_name || 'Guest';
  const greeting = getGreeting();

  // Local state
  const [activeTab, setActiveTab] = useState<string>("Next 7 days");
  const [activeList, setActiveList] = useState<string>("Personal");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [columnInputs, setColumnInputs] = useState<Record<string, string>>({});
  const [allTasksInput, setAllTasksInput] = useState<string>("");
  const [myDayInput, setMyDayInput] = useState<string>("");
  const [newSubtaskInput, setNewSubtaskInput] = useState<string>("");
  const [isReminderOpen, setIsReminderOpen] = useState<boolean>(false);
  const [reminderDate, setReminderDate] = useState<string>("7.27.2026");
  const [reminderTime, setReminderTime] = useState<string>("12:54 AM");
  const [isTagsOpen, setIsTagsOpen] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(["priority"]);

  // Tracks which task's fields are currently reflected in the local state
  // above (selectedTags / reminderDate / reminderTime). Used to derive that
  // local state during render instead of via a useEffect — see note below.
  const [syncedTaskId, setSyncedTaskId] = useState<string | null>(null);

  // ── Load data (memoized) ──────────────────────────────────────────────────
  const loadData = useCallback(() => {
    dispatch(resetTasksState());
    dispatch(fetchTasks({}));
    dispatch(fetchTaskLists());
    dispatch(fetchTaskSummary());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadData]);

  // ── Sync local state with currentTask ────────────────────────────────────
  // This used to be a useEffect that called setState synchronously whenever
  // `currentTask` changed, which React flags as causing an extra cascading
  // render (commit → run effect → setState → re-render). Since this is a
  // "derive/reset local state when a prop/selector changes" pattern rather
  // than a real subscription to an external system, React's own guidance is
  // to do the comparison during render and call setState conditionally in
  // the render body. When the condition below is true, React discards the
  // in-progress render and re-renders immediately with the new state in the
  // same pass — no extra commit, no cascading render warning.
  if (currentTask && currentTask.id !== syncedTaskId) {
    setSyncedTaskId(currentTask.id);
    setSelectedTags(currentTask.tags || []);
    if (currentTask.reminder_date && currentTask.reminder_time) {
      setReminderDate(currentTask.reminder_date);
      setReminderTime(currentTask.reminder_time);
    }
  } else if (!currentTask && syncedTaskId !== null) {
    // currentTask was cleared (e.g. handleClearCurrentTask) — reset local
    // state back to defaults so stale values don't leak into the next task.
    setSyncedTaskId(null);
    setSelectedTags(["priority"]);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleTaskCompletion = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
      dispatch(toggleTaskStatus({ id: taskId, status: newStatus }));
    }
  };

  const handleAddColumnTask = (dayKey: string) => {
    const val = columnInputs[dayKey];
    if (!val?.trim()) return;
    dispatch(createTask({
      title: val.trim(),
      day: dayKey as TaskDay,
      in_my_day: dayKey === 'Today',
      priority: 'medium',
    }));
    setColumnInputs({ ...columnInputs, [dayKey]: "" });
  };

  const handleAddMyDayTask = () => {
    if (!myDayInput.trim()) return;
    dispatch(createTask({
      title: myDayInput.trim(),
      day: 'Today',
      in_my_day: true,
      priority: 'medium',
    }));
    setMyDayInput("");
  };

  const handleAddAllTasks = () => {
    if (!allTasksInput.trim()) return;
    dispatch(createTask({
      title: allTasksInput.trim(),
      day: 'Today',
      in_my_day: true,
      priority: 'medium',
    }));
    setAllTasksInput("");
  };

  const handleAddSubtask = () => {
    if (!currentTask || !newSubtaskInput.trim()) return;
    dispatch(createSubtask({
      taskId: currentTask.id,
      data: { task_id: currentTask.id, title: newSubtaskInput.trim() }
    }));
    setNewSubtaskInput("");
  };

  const toggleSubtask = (subtaskId: string) => {
    if (!currentTask) return;
    const subtask = currentTask.subtasks?.find(st => st.id === subtaskId);
    if (!subtask) return;
    dispatch(updateSubtask({
      taskId: currentTask.id,
      subtaskId,
      data: { completed: !subtask.completed }
    }));
  };

  const handleSaveReminder = () => {
    if (!currentTask) return;
    dispatch(updateTask({
      id: currentTask.id,
      data: { reminder_date: reminderDate, reminder_time: reminderTime }
    }));
    setIsReminderOpen(false);
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSaveTags = () => {
    if (!currentTask) return;
    dispatch(updateTask({
      id: currentTask.id,
      data: { tags: selectedTags }
    }));
    setIsTagsOpen(false);
  };

  const handleSelectTask = (taskId: string) => {
    dispatch(fetchTaskById(taskId));
    setIsReminderOpen(false);
    setIsTagsOpen(false);
  };

  const handleClearCurrentTask = () => {
    dispatch(clearCurrentTask());
    setIsReminderOpen(false);
    setIsTagsOpen(false);
  };

  const handleAttachmentUpload = (files: FileList | null) => {
    if (!files || !currentTask) return;
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('documents', file));
    dispatch(uploadTaskAttachments({ taskId: currentTask.id, formData }));
  };

  const completedSubtasksCount = currentTask?.subtasks?.filter(st => st.completed).length || 0;

  // ─── Loading & Error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f4f5f7]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f4f5f7]">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-200 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-red-600 mb-2">Error loading tasks</h3>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full bg-[#f4f5f7] font-sans overflow-hidden text-slate-800 relative">
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        className="absolute top-4 left-4 z-50 p-2 bg-white rounded-full shadow-md border border-slate-200 lg:hidden"
      >
        <Menu className="w-5 h-5 text-slate-600" />
      </button>

      {/* Sidebar */}
      <aside
        className={`
          bg-white border-r border-slate-200 flex flex-col justify-between p-3 shrink-0 transition-all duration-300 relative z-40
          ${isSidebarCollapsed ? "w-16" : "w-64"}
          ${isMobileSidebarOpen ? "absolute inset-y-0 left-0 shadow-2xl" : "hidden lg:flex"}
        `}
      >
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 min-h-[40px]">
            {!isSidebarCollapsed && (
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                  ⚙️
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{userName}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Free Plan</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition mx-auto hidden lg:block"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-slate-500" />
              ) : (
                <PanelLeftClose className="w-5 h-5 text-slate-500" />
              )}
            </button>
            {isMobileSidebarOpen && (
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {!isSidebarCollapsed ? (
            <button className="w-full py-2 px-3 border border-sky-400 text-sky-500 hover:bg-sky-50 rounded-full text-xs font-semibold transition text-center truncate">
              + Add Task
            </button>
          ) : (
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            </div>
          )}

          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab("My day");
                handleClearCurrentTask();
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
              } rounded-xl text-xs font-semibold transition ${
                activeTab === "My day"
                  ? "bg-sky-50 text-sky-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                {!isSidebarCollapsed && <span>My day</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">
                  {myDayTasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("Next 7 days");
                handleClearCurrentTask();
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
              } rounded-xl text-xs font-semibold transition ${
                activeTab === "Next 7 days"
                  ? "bg-sky-50 text-sky-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                {!isSidebarCollapsed && <span>Next 7 days</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                  {tasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("All my tasks");
                handleClearCurrentTask();
                if (tasks.length > 0) handleSelectTask(tasks[0].id);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
              } rounded-xl text-xs font-semibold transition ${
                activeTab === "All my tasks"
                  ? "bg-sky-50 text-sky-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <CheckSquare className="w-4 h-4 text-sky-500 shrink-0" />
                {!isSidebarCollapsed && <span>All my tasks</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="text-[10px] bg-sky-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                  {tasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("My Calendar");
                handleClearCurrentTask();
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2"
              } rounded-xl text-xs font-semibold transition ${
                activeTab === "My Calendar"
                  ? "bg-sky-50 text-sky-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <CalendarDays className="w-4 h-4 text-slate-500 shrink-0" />
                {!isSidebarCollapsed && <span>My Calendar</span>}
              </div>
            </button>
          </nav>

          {!isSidebarCollapsed && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between px-1 text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  My lists <Lock className="w-3 h-3 text-slate-400" />
                </span>
                <button className="hover:text-slate-600">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-0.5">
                {taskLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => setActiveList(list.name)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                      activeList === list.name
                        ? "bg-slate-100 text-slate-800"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{list.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {tasks.filter((t) => t.list_id === list.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          className={`flex items-center ${
            isSidebarCollapsed ? "justify-center w-full p-2" : "space-x-2 px-3 py-2"
          } text-sky-500 bg-sky-50 hover:bg-sky-100 rounded-full text-xs font-semibold transition`}
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          {!isSidebarCollapsed && <span>Add shared space</span>}
        </button>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="absolute inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === "My day" ? (
          <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-y-auto relative bg-gradient-to-br from-[#f8fafc] via-[#e0f2fe]/40 to-[#0284c7]/20">
            {/* ... My day content (unchanged) ... */}
            <div className="absolute right-0 top-1/4 w-96 h-96 rounded-full bg-sky-500/30 blur-2xl pointer-events-none" />
            <div className="absolute -right-10 top-1/2 w-80 h-80 rounded-full bg-blue-600/40 blur-xl pointer-events-none" />

            <div className="relative z-50 flex justify-end pb-2 sm:pb-4">
              <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-md px-2 sm:px-3 py-1 rounded-full border border-white/80 shadow-2xs text-slate-600">
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><RotateCw className="w-3 sm:w-4 h-3 sm:h-4" /></button>
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><Headphones className="w-3 sm:w-4 h-3 sm:h-4" /></button>
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><Square className="w-3 sm:w-4 h-3 sm:h-4" /></button>
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><Search className="w-3 sm:w-4 h-3 sm:h-4" /></button>
              </div>
            </div>

            <div className="relative z-50 space-y-1">
              <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 tracking-tight">
                {greeting}, {userName}<span className="text-sky-500">.</span>
              </h1>
              <p className="text-lg sm:text-xl font-serif font-medium text-slate-400">You can make magic happen</p>
              {summary && (
                <p className="text-sm text-slate-500 mt-2">
                  {summary.completed} of {summary.total} tasks completed
                </p>
              )}
            </div>

            <div className="relative z-10 space-y-4 my-4 sm:my-6 flex-1 max-w-4xl">
              <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
                <div className="flex flex-col items-center justify-center pr-0 sm:pr-6 border-r-0 sm:border-r border-slate-200/80 w-full sm:w-auto">
                  <span className="text-[10px] font-bold font-serif text-slate-400 uppercase tracking-widest">MON</span>
                  <span className="text-2xl sm:text-3xl font-black font-serif text-slate-800 leading-none my-0.5">27</span>
                  <span className="text-xs font-semibold font-serif text-slate-500">July</span>
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-xs font-bold font-serif text-slate-700">Join video meetings with one tap</h4>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold">
                    <button className="flex items-center space-x-1 text-sky-600 hover:underline">
                      <span>🗓️</span><span>Google</span>
                    </button>
                    <button className="flex items-center space-x-1 text-sky-600 hover:underline">
                      <span>📫</span><span>Outlook</span>
                    </button>
                    <button className="flex items-center space-x-1 text-sky-600 hover:underline">
                      <span>☁️</span><span>iCloud</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {myDayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      handleSelectTask(task.id);
                      setIsReminderOpen(false);
                      setIsTagsOpen(false);
                    }}
                    className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-3 sm:p-4 shadow-2xs flex items-center space-x-3 group transition hover:shadow-xs cursor-pointer"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompletion(task.id);
                      }}
                      className="text-slate-300 hover:text-emerald-600 transition"
                    >
                      <Circle className={`w-5 h-5 ${task.status === 'completed' ? "fill-emerald-600 text-emerald-600" : ""}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] font-medium text-slate-400 mb-0.5">
                        <Lock className="w-3 h-3 text-slate-300" />
                        <span>My lists</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-slate-500 font-semibold truncate">{task.list_name || 'Personal'}</span>
                      </div>
                      <h3 className={`text-sm font-semibold truncate ${task.status === 'completed' ? "line-through text-slate-400" : "text-slate-800"}`}>
                        {task.title}
                      </h3>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map((tag) => (
                            <span key={tag} className="text-[8px] px-1.5 py-0.5 bg-slate-100 rounded-full text-slate-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 flex items-center space-x-3 max-w-4xl">
              <div className="flex-1 bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm flex items-center space-x-2.5">
                <Plus className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Add task"
                  value={myDayInput}
                  onChange={(e) => setMyDayInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddMyDayTask(); }}
                  className="w-full bg-transparent outline-none text-xs text-slate-700 placeholder-slate-400"
                />
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                <Sun className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
            </div>
          </div>
        ) : activeTab === "Next 7 days" ? (
          /* Next 7 days Kanban (unchanged) */
          <div className="flex-1 flex flex-col overflow-hidden relative bg-[#f4f5f7]">
            {/* ... (same as before) ... */}
            <div className="absolute -right-20 -top-20 w-[600px] h-[600px] bg-sky-500/80 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-0 top-1/4 w-[500px] h-[500px] bg-blue-600/80 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 py-3 sm:py-5 gap-3 sm:gap-0">
              <div className="bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-xs border border-slate-200/80 flex items-center space-x-2 sm:space-x-3 text-xs">
                <div className="flex items-center space-x-1 font-bold text-slate-800 pr-2 sm:pr-3 border-r border-slate-200">
                  <Calendar className="w-4 h-4 text-slate-700" />
                  <span className="text-xs sm:text-sm font-semibold">Next 7 days</span>
                </div>
                <button className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 font-medium px-1 sm:px-2 border-r border-slate-200">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                <button className="text-slate-400 hover:text-slate-600 font-bold px-1">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-md px-2 sm:px-3 py-1 rounded-full border border-white/80 shadow-2xs text-slate-600">
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><RotateCw className="w-3 sm:w-4 h-3 sm:h-4" /></button>
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><Headphones className="w-3 sm:w-4 h-3 sm:h-4" /></button>
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><Square className="w-3 sm:w-4 h-3 sm:h-4" /></button>
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><Search className="w-3 sm:w-4 h-3 sm:h-4" /></button>
              </div>
            </div>

            <div className="relative z-10 flex-1 overflow-x-auto px-4 sm:px-8 pb-4 sm:pb-8">
              <div className="flex space-x-4 sm:space-x-5 min-w-max h-full items-start">
                {[
                  { key: "Today", label: "Today", sublabel: "Monday" },
                  { key: "Tomorrow", label: "Tomorrow", sublabel: "Tuesday" },
                  { key: "Wednesday", label: "Wednesday", sublabel: "" },
                  { key: "Thursday", label: "Thursday", sublabel: "" },
                  { key: "Friday", label: "Friday", sublabel: "" },
                  { key: "Saturday", label: "Saturday", sublabel: "" },
                  { key: "Sunday", label: "Sunday", sublabel: "" },
                ].map((col) => {
                  const dayTasks = tasks.filter((t) => t.day === col.key);
                  return (
                    <div
                      key={col.key}
                      className="w-56 sm:w-64 bg-white/80 backdrop-blur-sm border border-white/60 rounded-3xl p-3 sm:p-4 shadow-xs flex flex-col max-h-full"
                    >
                      <div className="flex items-baseline space-x-1.5 mb-3 px-1">
                        <h3 className="text-sm font-bold text-slate-800">{col.label}</h3>
                        {col.sublabel && (
                          <span className="text-xs font-semibold text-slate-400">{col.sublabel}</span>
                        )}
                        <span className="text-xs font-semibold text-slate-400 ml-auto">
                          {dayTasks.length}
                        </span>
                      </div>

                      <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                        {dayTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => {
                              handleSelectTask(task.id);
                              setIsReminderOpen(false);
                              setIsTagsOpen(false);
                            }}
                            className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs space-y-1 group transition hover:shadow-xs cursor-pointer"
                          >
                            <div className="flex items-center space-x-1 text-[10px] font-medium text-slate-400">
                              <Lock className="w-2.5 h-2.5 text-slate-300" />
                              <span>My lists</span>
                              <ChevronRight className="w-2.5 h-2.5 text-slate-300" />
                              <span className="font-semibold truncate">{task.list_name || 'Personal'}</span>
                            </div>
                            <div className="flex items-center space-x-2.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskCompletion(task.id);
                                }}
                                className="text-slate-300 hover:text-emerald-600 transition"
                              >
                                <Circle className={`w-4 h-4 ${task.status === 'completed' ? "fill-emerald-600 text-emerald-600" : ""}`} />
                              </button>
                              <span className={`text-xs font-semibold truncate ${task.status === 'completed' ? "line-through text-slate-400" : "text-slate-800"}`}>
                                {task.title}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 bg-white/90 rounded-2xl border border-slate-200/60 px-3 py-2 flex items-center space-x-2">
                        <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Add Task"
                          value={columnInputs[col.key] || ""}
                          onChange={(e) => setColumnInputs({ ...columnInputs, [col.key]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddColumnTask(col.key); }}
                          className="w-full bg-transparent outline-none text-xs text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* All my tasks */
          <div className="flex-1 flex flex-col overflow-hidden relative bg-[#f4f5f7]">
            <div className="absolute -right-20 -top-20 w-[600px] h-[600px] bg-sky-500/80 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-0 top-1/4 w-[500px] h-[500px] bg-blue-600/80 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 py-3 sm:py-5 gap-3 sm:gap-0">
              <div className="bg-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-xs border border-slate-200/80 flex flex-wrap items-center space-x-2 sm:space-x-3 text-xs">
                <div className="flex items-center space-x-1 font-bold text-slate-800 pr-2 sm:pr-3 border-r border-slate-200">
                  <CheckSquare className="w-4 h-4 text-slate-700" />
                  <span className="text-xs sm:text-sm font-semibold">All my tasks</span>
                </div>
                <button className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 font-medium px-1 sm:px-2 border-r border-slate-200">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">View</span>
                </button>
                <button className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 font-medium px-1 sm:px-2 border-r border-slate-200">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                <button className="text-slate-400 hover:text-slate-600 font-bold px-1">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-md px-2 sm:px-3 py-1 rounded-full border border-white/80 shadow-2xs text-slate-600">
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><RotateCw className="w-3 sm:w-4 h-3 sm:h-4" /></button>
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><Headphones className="w-3 sm:w-4 h-3 sm:h-4" /></button>
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><Square className="w-3 sm:w-4 h-3 sm:h-4" /></button>
                <button className="p-1 hover:bg-slate-100 rounded-full transition"><Search className="w-3 sm:w-4 h-3 sm:h-4" /></button>
              </div>
            </div>

            <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 px-4 sm:px-8 pb-4 sm:pb-8 overflow-hidden">
              {/* Left panel – task list */}
              <div className="lg:col-span-4 bg-white/90 backdrop-blur-md rounded-3xl border border-white/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between overflow-hidden">
                <div className="space-y-4 sm:space-y-6 overflow-y-auto pr-1">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-800 px-1">Today</h3>
                    <div className="space-y-1">
                      {todayTasks.map((task) => {
                        const isSelected = currentTask?.id === task.id;
                        return (
                          <div
                            key={task.id}
                            onClick={() => {
                              handleSelectTask(task.id);
                              setIsReminderOpen(false);
                              setIsTagsOpen(false);
                            }}
                            className={`flex items-start space-x-3 p-2 sm:p-3 rounded-2xl cursor-pointer transition ${
                              isSelected ? "bg-slate-50/90 shadow-2xs border border-slate-100" : "hover:bg-slate-50"
                            }`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskCompletion(task.id);
                              }}
                              className="mt-0.5 text-slate-300 hover:text-emerald-600 transition"
                            >
                              <Circle className={`w-4 h-4 ${task.status === 'completed' ? "fill-emerald-600 text-emerald-600" : ""}`} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-xs font-semibold truncate ${task.status === 'completed' ? "line-through text-slate-400" : "text-slate-800"}`}>
                                {task.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium truncate">{task.list_name || 'Personal'}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Add Task"
                    value={allTasksInput}
                    onChange={(e) => setAllTasksInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddAllTasks(); }}
                    className="w-full bg-transparent outline-none text-xs text-slate-700 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Right panel – detail view */}
              <div className="hidden lg:block lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between overflow-y-auto relative">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading task...
                  </div>
                ) : currentTask ? (
                  <TaskDetailContent
                    task={currentTask}
                    completedSubtasksCount={completedSubtasksCount}
                    newSubtaskInput={newSubtaskInput}
                    setNewSubtaskInput={setNewSubtaskInput}
                    handleAddSubtask={handleAddSubtask}
                    toggleSubtask={toggleSubtask}
                    isReminderOpen={isReminderOpen}
                    setIsReminderOpen={setIsReminderOpen}
                    isTagsOpen={isTagsOpen}
                    setIsTagsOpen={setIsTagsOpen}
                    reminderDate={reminderDate}
                    setReminderDate={setReminderDate}
                    reminderTime={reminderTime}
                    setReminderTime={setReminderTime}
                    handleSaveReminder={handleSaveReminder}
                    selectedTags={selectedTags}
                    toggleTagSelection={toggleTagSelection}
                    handleSaveTags={handleSaveTags}
                    onAttachmentUpload={handleAttachmentUpload}
                    TAG_OPTIONS={TAG_OPTIONS}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    Select a task to view details
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile bottom sheet for task detail */}
      {currentTask && activeTab === "All my tasks" && (
        <div className="absolute inset-0 z-50 flex items-end justify-center lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={handleClearCurrentTask} />
          <div className="relative bg-white w-full max-h-[80vh] rounded-t-3xl p-4 sm:p-6 overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-1 bg-slate-300 rounded-full" />
            </div>
            <button
              onClick={handleClearCurrentTask}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <TaskDetailContent
              task={currentTask}
              completedSubtasksCount={completedSubtasksCount}
              newSubtaskInput={newSubtaskInput}
              setNewSubtaskInput={setNewSubtaskInput}
              handleAddSubtask={handleAddSubtask}
              toggleSubtask={toggleSubtask}
              isReminderOpen={isReminderOpen}
              setIsReminderOpen={setIsReminderOpen}
              isTagsOpen={isTagsOpen}
              setIsTagsOpen={setIsTagsOpen}
              reminderDate={reminderDate}
              setReminderDate={setReminderDate}
              reminderTime={reminderTime}
              setReminderTime={setReminderTime}
              handleSaveReminder={handleSaveReminder}
              selectedTags={selectedTags}
              toggleTagSelection={toggleTagSelection}
              handleSaveTags={handleSaveTags}
              onAttachmentUpload={handleAttachmentUpload}
              TAG_OPTIONS={TAG_OPTIONS}
            />
          </div>
        </div>
      )}

      {/* Shared modal for My day / Next 7 days */}
      {currentTask && (activeTab === "Next 7 days" || activeTab === "My day") && (
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 w-full max-w-xl p-4 sm:p-7 shadow-2xl space-y-4 sm:space-y-6 relative max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-400">
                <Lock className="w-3 h-3 text-slate-300" />
                <span>My lists</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600 font-semibold">{currentTask.list_name || 'Personal'}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleTaskCompletion(currentTask.id)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-semibold text-slate-600 transition"
                >
                  {currentTask.status === 'completed' ? "Mark incomplete" : "Mark as complete"}
                </button>
                <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition">
                  <Target className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition">
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClearCurrentTask}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <TaskDetailContent
              task={currentTask}
              completedSubtasksCount={completedSubtasksCount}
              newSubtaskInput={newSubtaskInput}
              setNewSubtaskInput={setNewSubtaskInput}
              handleAddSubtask={handleAddSubtask}
              toggleSubtask={toggleSubtask}
              isReminderOpen={isReminderOpen}
              setIsReminderOpen={setIsReminderOpen}
              isTagsOpen={isTagsOpen}
              setIsTagsOpen={setIsTagsOpen}
              reminderDate={reminderDate}
              setReminderDate={setReminderDate}
              reminderTime={reminderTime}
              setReminderTime={setReminderTime}
              handleSaveReminder={handleSaveReminder}
              selectedTags={selectedTags}
              toggleTagSelection={toggleTagSelection}
              handleSaveTags={handleSaveTags}
              onAttachmentUpload={handleAttachmentUpload}
              TAG_OPTIONS={TAG_OPTIONS}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnyDoDashboard;