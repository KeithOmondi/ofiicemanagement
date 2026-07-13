import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  fetchProjects,
  fetchTasks,
  selectAllProjects,
  selectStandaloneTasks,
  selectSelectedTask,
  selectStats,
  toggleTaskDone as toggleTaskDoneAction,
  createTask,
} from "../../store/slices/tasksSlice";
import {
  selectAllUsers,
  selectCurrentUser,
  fetchUsers,
  fetchCurrentUser,
} from "../../store/slices/userSlice";
import type { TaskStatus, Task, Project } from "../../types/tasks.types";
import type { User } from "../../store/slices/userSlice";
import AddProjectModal from "../admin/taskmodals/AddProjectModal";
import AddTaskModal from "../admin/taskmodals/AddTaskModal";
import AddStandaloneModal from "../admin/taskmodals/AddStandaloneModal";
import AddPersonalTaskModal from "../admin/taskmodals/AddPersonalTaskModal";
import ToDoModal from "../admin/taskmodals/ToDoModal";


// ─── Helpers ──────────────────────────────────────────────
const fmtDate = (dateStr: string): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
};

const daysUntil = (dateStr: string): number => {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
};

const getStatus = (task: Task): TaskStatus => {
  if (task.status === "done") return "done";
  if (task.status === "pending_approval") return "inprogress";
  const days = daysUntil(task.deadline);
  if (days < 0) return "overdue";
  return task.status;
};

const priorityBadge = (p: string) => {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    urgent: { label: "Urgent", color: "text-red-700 ring-red-600/20", bg: "bg-red-50" },
    high: { label: "High", color: "text-amber-700 ring-amber-600/20", bg: "bg-amber-50" },
    normal: { label: "Normal", color: "text-emerald-700 ring-emerald-600/20", bg: "bg-emerald-50" },
    low: { label: "Low", color: "text-slate-600 ring-slate-500/10", bg: "bg-slate-50" },
  };
  const info = map[p] || { label: p, color: "text-slate-700 ring-slate-600/10", bg: "bg-slate-50" };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${info.color} ${info.bg}`}>
      {p === "urgent" && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
      {p === "high" && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" />}
      {info.label}
    </span>
  );
};

const getColorFromId = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
};

const memberAvatar = (userId: string, size: number = 24, usersMap: Record<string, User>) => {
  const user = usersMap[userId];
  if (!user) return null;
  return (
    <div
      className="inline-flex items-center justify-center rounded-full ring-2 ring-white flex-shrink-0 select-none shadow-sm font-semibold transition-transform hover:scale-105 hover:z-10"
      style={{
        width: size,
        height: size,
        fontSize: Math.floor(size * 0.38),
        background: getColorFromId(userId),
        color: "#fff",
        marginRight: -6,
      }}
      title={user.full_name}
    >
      {user.pj_number || userId.slice(0, 2).toUpperCase()}
    </div>
  );
};

const deadlineTag = (dateStr: string, status: TaskStatus) => {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);
  const label = fmtDate(dateStr);
  if (status === "done")
    return <span className="inline-flex items-center text-emerald-600 font-medium">✓ {label}</span>;
  if (days < 0)
    return <span className="inline-flex items-center text-rose-500 font-medium animate-pulse">⚠ {label}</span>;
  if (days <= 3)
    return <span className="inline-flex items-center text-amber-600 font-medium">{days}d left</span>;
  return <span className="text-slate-500 font-medium">{label}</span>;
};

// ─── Main Component ──────────────────────────────────────────
const StaffTasks: React.FC = () => {
  const dispatch = useAppDispatch();
  const projects = useAppSelector(selectAllProjects);
  const standaloneTasks = useAppSelector(selectStandaloneTasks);
  const selectedTask = useAppSelector(selectSelectedTask);
  const stats = useAppSelector(selectStats);
  const users = useAppSelector(selectAllUsers);
  const currentUser = useAppSelector(selectCurrentUser);

  // ── Local UI state ──
  const [currentView, setCurrentView] = useState<"projects" | "board" | "independent" | "todo">("projects");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");

  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddStandaloneModal, setShowAddStandaloneModal] = useState(false);
  const [showAddPersonalModal, setShowAddPersonalModal] = useState(false);
  const [showToDoModal, setShowToDoModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // ── Fetch data on mount ──
  useEffect(() => {
    dispatch(fetchUsers({
      page: 1,
      limit: 100,
      sort_by: 'created_at',
      sort_order: 'DESC'
    }));
    dispatch(fetchCurrentUser());

    dispatch(fetchProjects())
      .then(() => {
        dispatch(fetchTasks({}));
      });
  }, [dispatch]);

  // ── Handlers ──
  const closeAllModals = () => {
    setShowAddProjectModal(false);
    setShowAddTaskModal(false);
    setShowAddStandaloneModal(false);
    setShowAddPersonalModal(false);
    setShowToDoModal(false);
  };

  const openAddTaskModal = (project: Project) => {
    closeAllModals();
    setSelectedProject(project);
    setShowAddTaskModal(true);
  };

  const openToDoModal = (taskId: string) => {
    closeAllModals();
    setSelectedTaskId(taskId);
    setShowToDoModal(true);
  };

  const toggleTaskDone = (taskId: string, projectId: string | null) => {
    dispatch(toggleTaskDoneAction({ taskId, projectId }));
  };

  const handleQuickAddTask = (projectId: string, title: string) => {
    if (!currentUser) return;
    dispatch(createTask({
      project_id: projectId,
      title,
      description: null,
      assignee: currentUser.id,
      priority: "normal",
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      start_date: null,
    }));
  };

  // ── Build user map for avatar lookups, ensure current user is included ──
  const usersMap = users.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {} as Record<string, User>);

  // ✅ Ensure current user is in the map (in case fetchUsers hasn't completed)
  if (currentUser && !usersMap[currentUser.id]) {
    usersMap[currentUser.id] = currentUser;
  }

  // ── Helper: render a single task row ──
  const renderTaskRow = (task: Task, projectId: string | null, projectMembers: string[] = []) => {
    const isSelected = selectedTask?.id === task.id;
    const status = getStatus(task);
    return (
      <div
        key={task.id}
        className={`flex items-center gap-4 px-6 py-3.5 border-b border-slate-100 cursor-pointer transition-all duration-150 group ${
          isSelected ? "bg-amber-50/50" : "hover:bg-slate-50"
        }`}
        onClick={() => openToDoModal(task.id)}
      >
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold cursor-pointer flex-shrink-0 border-2 transition-all duration-200 ${
            task.status === "done"
              ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200"
              : "border-slate-300 bg-white group-hover:border-slate-400"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleTaskDone(task.id, projectId);
          }}
        >
          {task.status === "done" && "✓"}
        </div>

        <div
          className="w-1.5 h-7 rounded-full flex-shrink-0"
          style={{
            background:
              task.priority === "urgent"
                ? "#ef4444"
                : task.priority === "high"
                ? "#f59e0b"
                : task.priority === "normal"
                ? "#10b981"
                : "#94a3b8",
          }}
        />

        <div className="flex-1 min-w-0">
          <h5
            className={`text-sm font-medium truncate ${
              task.status === "done" ? "line-through text-slate-400" : "text-slate-700"
            }`}
          >
            {task.title}
          </h5>
          {task.description && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 pl-2">
          {task.assignee === "GROUP"
            ? projectMembers.map((m) => memberAvatar(m, 24, usersMap))
            : memberAvatar(task.assignee, 24, usersMap)}
        </div>

        <div className="text-xs font-mono flex-shrink-0 w-24 text-right">
          {deadlineTag(task.deadline, status)}
        </div>
      </div>
    );
  };

  // ─── Render Views ──
  const renderStats = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {[
        { val: stats.todo, label: "Todo", icon: "📋", border: "border-slate-200", bg: "bg-slate-50" },
        { val: stats.inprogress, label: "In Progress", icon: "⏳", border: "border-amber-500", bg: "bg-amber-50/40" },
        { val: stats.overdue, label: "Overdue", icon: "🚨", border: "border-rose-500", bg: "bg-rose-50/30" },
        { val: stats.done, label: "Completed", icon: "✅", border: "border-emerald-500", bg: "bg-emerald-50/30" },
      ].map((card, i) => (
        <div key={i} className={`bg-white p-5 rounded-2xl border-l-4 ${card.border} shadow-sm ring-1 ring-slate-100 transition-transform hover:-translate-y-0.5`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center text-xl`}>{card.icon}</div>
            <div>
              <h4 className="text-2xl font-bold tracking-tight text-slate-800">{card.val}</h4>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-0.5">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderProjectsView = () => {
    return (
      <div id="projectsList" className="space-y-6">
        <div className="flex justify-end">
          <button
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold shadow-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            onClick={() => { closeAllModals(); setShowAddProjectModal(true); }}
          >
            + New Project
          </button>
        </div>
        {projects.map((proj) => {
          const prog = proj.tasks.length
            ? Math.round((proj.tasks.filter((t) => t.status === "done").length / proj.tasks.length) * 100)
            : 0;
          const projDays = daysUntil(proj.deadline);
          const isOverdue = projDays < 0;

          let tasks = proj.tasks;
          if (filterAssignee) {
            tasks = tasks.filter(
              (t) => t.assignee === filterAssignee || (t.assignee === "GROUP" && proj.members.includes(filterAssignee))
            );
          }
          if (filterStatus) {
            tasks = tasks.filter((t) => getStatus(t) === filterStatus);
          }

          return (
            <div
              key={proj.id}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden border border-slate-100 transition-shadow hover:shadow-md"
            >
              <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="text-3xl p-1 bg-white/10 rounded-xl select-none">📂</div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {proj.title}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{proj.description}</p>
                    <div className="flex items-center gap-3 flex-wrap mt-2.5">
                      {priorityBadge(proj.priority)}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded bg-white/10 text-slate-200 ${isOverdue ? 'text-rose-300 font-semibold' : ''}`}>
                        📅 Deadline: {fmtDate(proj.deadline)}
                        {isOverdue && " (OVERDUE)"}
                        {!isOverdue && projDays <= 3 && ` (${projDays}d left)`}
                      </span>
                      <span className="text-xs text-slate-400">
                        {prog}% complete · {proj.tasks.length} tasks
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 border-t border-white/10 md:border-none pt-3 md:pt-0">
                  <div className="flex pl-2">
                    {proj.members.map((m) => memberAvatar(m, 28, usersMap))}
                  </div>
                </div>
              </div>

              <div className="h-1.5 bg-slate-100 relative">
                <div 
                  className={`h-full transition-all duration-500 ease-out ${prog === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                  style={{ width: `${prog}%` }}
                />
              </div>

              <div className="project-tasks-section bg-white">
                <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tasks ({tasks.length})
                  </span>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); openAddTaskModal(proj); }}
                  >
                    + Add Task
                  </button>
                </div>
                <div id={`tasklist_${proj.id}`}>
                  {tasks.length === 0 && (
                    <div className="px-6 py-8 text-sm text-slate-400 text-center bg-slate-50/20">
                      No tasks matches the current configuration.
                    </div>
                  )}
                  {tasks.map((t) => renderTaskRow(t, proj.id, proj.members))}
                </div>
                <div className="px-6 py-3 flex items-center gap-3 border-t border-dashed border-slate-200 bg-slate-50/30">
                  <span className="text-slate-400 text-lg font-light select-none">+</span>
                  <input
                    className="flex-1 border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 font-medium"
                    placeholder="Quick add task — type and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          handleQuickAddTask(proj.id, input.value.trim());
                          input.value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-5xl mb-4">📂</div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Projects Yet</h3>
            <p className="text-sm text-slate-400 mb-5">Get started by building your structural project container.</p>
            <button className="bg-slate-900 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm hover:bg-slate-800 transition-colors" onClick={() => { closeAllModals(); setShowAddProjectModal(true); }}>
              Create First Project
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderBoardView = () => {
    const allTasks = [
      ...projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectTitle: p.title, projectId: p.id }))),
      ...standaloneTasks.map((t) => ({ ...t, projectTitle: "Standalone", projectId: null })),
    ];
    type ColKey = "todo" | "inprogress" | "overdue" | "done";
    const cols: Record<ColKey, { label: string; dotColor: string; bg: string; tasks: typeof allTasks }> = {
      todo: { label: "Todo", dotColor: "bg-slate-400", bg: "bg-slate-50/80 ring-slate-100", tasks: [] },
      inprogress: { label: "In Progress", dotColor: "bg-amber-500", bg: "bg-amber-50/20 ring-amber-100/50", tasks: [] },
      overdue: { label: "Overdue", dotColor: "bg-rose-500", bg: "bg-rose-50/20 ring-rose-100/50", tasks: [] },
      done: { label: "Completed", dotColor: "bg-emerald-500", bg: "bg-emerald-50/20 ring-emerald-100/50", tasks: [] },
    };
    allTasks.forEach((t) => {
      const s = getStatus(t);
      if (s in cols) cols[s as ColKey].tasks.push(t);
      else cols.todo.tasks.push(t);
    });
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {Object.entries(cols).map(([key, col]) => (
          <div key={key} className={`${col.bg} rounded-2xl p-4 min-h-[500px] ring-1 border border-transparent`}>
            <div className="flex justify-between items-center mb-4 px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                {col.label}
              </h4>
              <span className="text-slate-500 bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm ring-1 ring-slate-100">
                {col.tasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {col.tasks.map((t) => (
                <div
                  key={t.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border transition-all duration-200 hover:shadow-md hover:border-slate-300 ${
                    selectedTask?.id === t.id ? "border-amber-500 ring-2 ring-amber-100" : "border-slate-100"
                  }`}
                  onClick={() => openToDoModal(t.id)}
                >
                  <h5 className="text-sm font-semibold text-slate-700 leading-snug line-clamp-2">{t.title}</h5>
                  <div className="text-xs font-medium text-slate-400 mt-1 mb-3">{t.projectTitle}</div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-2">
                    <div className="flex">
                      {t.assignee === "GROUP"
                        ? <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Group</span>
                        : memberAvatar(t.assignee, 22, usersMap)}
                    </div>
                    <div className="text-[11px] font-mono">
                      {deadlineTag(t.deadline, getStatus(t))}
                    </div>
                  </div>
                </div>
              ))}
              {col.tasks.length === 0 && (
                <div className="text-center py-8 text-xs font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                  Empty column
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStandaloneView = () => {
    let tasks = standaloneTasks;
    if (filterAssignee) {
      tasks = tasks.filter((t) => t.assignee === filterAssignee);
    }
    if (filterStatus) {
      tasks = tasks.filter((t) => getStatus(t) === filterStatus);
    }
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 ring-1 ring-slate-100 overflow-hidden">
        <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Standalone Tasks</h3>
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            onClick={() => { closeAllModals(); setShowAddStandaloneModal(true); }}
          >
            + Add Task
          </button>
        </div>
        <div>
          {tasks.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">No standalone tasks currently registered.</div>
          ) : (
            tasks.map((t) => renderTaskRow(t, null, []))
          )}
        </div>
      </div>
    );
  };

  const renderTodoView = () => {
    const allTasks = [
      ...projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectTitle: p.title, projectId: p.id }))),
      ...standaloneTasks.map((t) => ({ ...t, projectTitle: "Standalone", projectId: null })),
    ];
    const todoTasks = allTasks.filter(
      (t) => getStatus(t) === "todo" && t.assignee === currentUser?.id
    );
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 ring-1 ring-slate-100 overflow-hidden">
        <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            📋 My To‑Do List <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold">{todoTasks.length}</span>
          </h3>
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => { closeAllModals(); setShowAddPersonalModal(true); }}
          >
            + Add Personal Task
          </button>
        </div>
        <div>
          {todoTasks.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400 font-medium">No pending personal tasks found. Great job! 🎉</div>
          ) : (
            todoTasks.map((t) => renderTaskRow(t, t.projectId, []))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 font-sans bg-slate-50/50 min-h-screen text-slate-600 antialiased">
      {renderStats()}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-slate-100">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1 self-start shadow-inner">
          {[
            { key: "projects", label: "📂 Projects" },
            { key: "board", label: "🗂 Board" },
            { key: "independent", label: "⚡ Standalone" },
            { key: "todo", label: "📋 To-Do" }
          ].map((view) => (
            <button
              key={view.key}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                currentView === view.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setCurrentView(view.key as typeof currentView)}
            >
              {view.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center flex-wrap sm:justify-end">
          {currentView !== "todo" && (
            <select
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="">All Members</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} {user.pj_number ? `(${user.pj_number})` : ''}
                </option>
              ))}
            </select>
          )}
          <select
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "")}
          >
            <option value="">All Statuses</option>
            <option value="todo">Todo</option>
            <option value="inprogress">In Progress</option>
            <option value="done">Done</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="transition-all duration-200">
        {currentView === "projects" && renderProjectsView()}
        {currentView === "board" && renderBoardView()}
        {currentView === "independent" && renderStandaloneView()}
        {currentView === "todo" && renderTodoView()}
      </div>

      <AddProjectModal show={showAddProjectModal} onClose={() => setShowAddProjectModal(false)} />
      <AddTaskModal show={showAddTaskModal} onClose={() => { setShowAddTaskModal(false); setSelectedProject(null); }} project={selectedProject} />
      <AddStandaloneModal show={showAddStandaloneModal} onClose={() => setShowAddStandaloneModal(false)} />
      <AddPersonalTaskModal show={showAddPersonalModal} onClose={() => setShowAddPersonalModal(false)} />

      {showToDoModal && selectedTaskId && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[1000] backdrop-blur-sm transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowToDoModal(false);
              setSelectedTaskId(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl w-[92%] max-w-[560px] max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <ToDoModal
              show={showToDoModal}
              onClose={() => { setShowToDoModal(false); setSelectedTaskId(null); }}
              taskId={selectedTaskId}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTasks;