"use client";

import React, { useState, useEffect } from "react";
import { DndContext, useDroppable, useDraggable, DragEndEvent } from "@dnd-kit/core";
import TaskDetailModal from "@/components/TaskDetailModal";
import { useAuth } from "@/context/AuthContext";
import SearchableSelect from "@/components/SearchableSelect";
import {
  isOnline,
  setOfflineCache,
  getOfflineCache,
  queueOfflineAction,
  syncOfflineActions,
} from "@/lib/offline";
import { showNotification } from "@/lib/notifications";

interface User {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  email: string;
}

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface Feature {
  id: string;
  name: string;
  description: string | null;
}

interface Module {
  id: string;
  name: string;
  description: string | null;
  features: Feature[];
}

interface Task {
  id: string;
  taskCode: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: User | null;
  reporter: User | null;
  subtasks: Subtask[];
  comments: any[];
  projectId: string;
  moduleId: string | null;
  featureId: string | null;
  module?: { id: string; name: string } | null;
  feature?: { id: string; name: string } | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  members: { user: User; role: string }[];
  modules: Module[];
}

const COLUMNS = ["Backlog", "In Progress", "Review", "Completed"];

export default function KanbanBoard() {
  const { user: currentUser } = useAuth();
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Network & Sync State
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("All");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("All");

  // Modal State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Create Task Form State
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    status: "Backlog",
    assigneeId: "",
    moduleId: "",
    parentFeatureId: "",
    featureId: "",
    dueDate: "",
  });

  // Track online status & triggers sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    setOnlineStatus(isOnline());

    const handleOnline = async () => {
      setOnlineStatus(true);
      setSyncMessage("Đã có mạng trở lại. Đang đồng bộ...");
      await syncOfflineActions((msg) => setSyncMessage(msg));
      setTimeout(() => setSyncMessage(null), 3000);
      if (selectedProject) {
        fetchTasks(selectedProject.id);
      } else {
        fetchProjectsAndTasks();
      }
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync check on page load
    if (isOnline()) {
      syncOfflineActions((msg) => {
        setSyncMessage(msg);
        setTimeout(() => setSyncMessage(null), 3000);
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [selectedProject]);

  // Fetch initial project list and tasks
  useEffect(() => {
    fetchProjectsAndTasks();
  }, []);

  const fetchProjectsAndTasks = async () => {
    setLoading(true);
    try {
      if (isOnline()) {
        const pRes = await fetch("/api/projects");
        if (pRes.ok) {
          const projList: Project[] = await pRes.json();
          setProjects(projList);
          await setOfflineCache("projects", projList);
          
          if (projList.length > 0) {
            setSelectedProject(projList[0]);
            await fetchTasks(projList[0].id);
          }
        }
      } else {
        // Load offline projects cache
        const cachedProjects = await getOfflineCache<Project[]>("projects");
        if (cachedProjects && cachedProjects.length > 0) {
          setProjects(cachedProjects);
          setSelectedProject(cachedProjects[0]);
          // Load offline tasks cache
          const cachedTasks = await getOfflineCache<Task[]>(`tasks_${cachedProjects[0].id}`);
          if (cachedTasks) {
            setTasks(cachedTasks);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load initial data", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (projectId: string) => {
    try {
      if (isOnline()) {
        const tRes = await fetch(`/api/tasks?projectId=${projectId}`);
        if (tRes.ok) {
          const taskList = await tRes.json();
          setTasks(taskList);
          await setOfflineCache(`tasks_${projectId}`, taskList);
        }
      } else {
        const cachedTasks = await getOfflineCache<Task[]>(`tasks_${projectId}`);
        if (cachedTasks) {
          setTasks(cachedTasks);
        }
      }
    } catch (e) {
      console.error("Failed to fetch tasks", e);
    }
  };

  // Drag and Drop Handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || targetTask.status === newStatus) return;

    // Optimistic Update for UI instantly (both online and offline)
    const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    setTasks(updatedTasks);
    
    showNotification("Cập nhật trạng thái", {
      body: `Tác vụ ${targetTask.taskCode} đã được chuyển sang "${newStatus}"`,
    });
    
    // Save state in local cache immediately in case user closes tab offline
    if (selectedProject) {
      await setOfflineCache(`tasks_${selectedProject.id}`, updatedTasks);
    }

    if (isOnline()) {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok && selectedProject) {
          fetchTasks(selectedProject.id); // Revert
        }
      } catch (e) {
        console.error("Failed to update status on server:", e);
        if (selectedProject) fetchTasks(selectedProject.id);
      }
    } else {
      // Queue action offline
      await queueOfflineAction("TASK_UPDATE", `/api/tasks/${taskId}`, "PATCH", { status: newStatus });
    }
  };

  // Create Task Handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !selectedProject) return;

    const finalFeatureId = createForm.featureId || createForm.parentFeatureId || null;

    const requestBody = {
      ...createForm,
      projectId: selectedProject.id,
      reporterId: selectedProject.members[0]?.user.id,
      moduleId: createForm.moduleId || null,
      featureId: finalFeatureId,
      dueDate: createForm.dueDate || null,
    };

    if (isOnline()) {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (res.ok) {
          setCreateOpen(false);
          setCreateForm({
            title: "",
            description: "",
            priority: "Medium",
            status: "Backlog",
            assigneeId: "",
            moduleId: "",
            featureId: "",
            dueDate: "",
          });
          showNotification("Tác vụ mới", {
            body: `Đã tạo thành công tác vụ: ${requestBody.title}`,
          });
          fetchTasks(selectedProject.id);
        }
      } catch (e) {
        console.error("Failed to create task", e);
      }
    } else {
      // Queue creation offline
      await queueOfflineAction("TASK_CREATE", "/api/tasks", "POST", requestBody);
      
      // Optimistic Card generation for offline representation
      const tempTask: Task = {
        id: `temp-${Date.now()}`,
        taskCode: "TASK-TEMP",
        title: createForm.title,
        description: createForm.description,
        status: createForm.status,
        priority: createForm.priority,
        dueDate: null,
        assignee: selectedProject.members.find(m => m.user.id === createForm.assigneeId)?.user || null,
        reporter: selectedProject.members[0]?.user || null,
        subtasks: [],
        comments: [],
        projectId: selectedProject.id,
        moduleId: createForm.moduleId || null,
        featureId: finalFeatureId,
        module: createForm.moduleId ? { id: createForm.moduleId, name: selectedProject.modules.find(m => m.id === createForm.moduleId)?.name || "" } : null,
        feature: finalFeatureId ? { id: finalFeatureId, name: selectedProject.modules.find(m => m.id === createForm.moduleId)?.features.find(f => f.id === finalFeatureId)?.name || "" } : null,
      };
      
      const newTasks = [...tasks, tempTask];
      setTasks(newTasks);
      await setOfflineCache(`tasks_${selectedProject.id}`, newTasks);
      
      setCreateOpen(false);
      setCreateForm({
        title: "",
        description: "",
        priority: "Medium",
        status: "Backlog",
        assigneeId: "",
        moduleId: "",
        parentFeatureId: "",
        featureId: "",
        dueDate: "",
      });
      showNotification("Tác vụ ngoại tuyến", {
        body: `Đã lưu tạm tác vụ: ${createForm.title} (Sẽ đồng bộ khi có mạng)`,
      });
      alert("Đã lưu tác vụ ngoại tuyến. Tác vụ sẽ được đồng bộ khi kết nối mạng!");
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.taskCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = selectedPriority === "All" || task.priority === selectedPriority;
    const matchesModule = selectedModuleId === "All" || task.moduleId === selectedModuleId;
    const matchesFeature = selectedFeatureId === "All" || task.featureId === selectedFeatureId;
    return matchesSearch && matchesPriority && matchesModule && matchesFeature;
  });

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Network Alert Notification */}
      {!onlineStatus && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
          <span className="material-symbols-outlined text-amber-600 block text-[22px] select-none">
            wifi_off
          </span>
          <p className="text-xs font-semibold">
            Bạn đang ở chế độ ngoại tuyến. Các thay đổi sẽ được lưu tạm và đồng bộ tự động khi có kết nối mạng!
          </p>
        </div>
      )}

      {/* Sync Status Overlay Alert */}
      {syncMessage && (
        <div className="bg-blue-50 border border-blue-200 text-primary rounded-xl p-3.5 flex items-center gap-3 shadow-2xs transition-all duration-300">
          <span className="material-symbols-outlined text-primary block text-[22px] select-none animate-bounce">
            sync
          </span>
          <p className="text-xs font-semibold">{syncMessage}</p>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">
            Bảng Công Việc (Kanban)
          </h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-sm text-slate-500 font-medium">Dự án:</span>
            {projects.length > 0 ? (
              <select
                value={selectedProject?.id || ""}
                onChange={(e) => {
                  const proj = projects.find((p) => p.id === e.target.value);
                  if (proj) {
                    setSelectedProject(proj);
                    setSelectedModuleId("All");
                    setSelectedFeatureId("All");
                    fetchTasks(proj.id);
                  }
                }}
                className="bg-white border border-[#cfdaf2] text-slate-700 font-semibold text-sm py-1.5 px-3 rounded-lg shadow-xs cursor-pointer outline-none focus:border-primary"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-slate-400 font-semibold">Đang tải dự án...</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Tạo Tác Vụ
        </button>
      </div>

      {/* Filter Options */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center bg-white p-4 rounded-xl border border-[#cfdaf2] shadow-sm">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-slate-400">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tiêu đề hoặc mã TASK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#cfdaf2] rounded-lg text-sm bg-slate-50/50 outline-none focus:border-primary focus:bg-white placeholder-slate-400 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Module Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-505 uppercase tracking-wide text-slate-400">
              Phân hệ:
            </span>
            <select
              value={selectedModuleId}
              onChange={(e) => {
                setSelectedModuleId(e.target.value);
                setSelectedFeatureId("All");
              }}
              className="bg-white border border-[#cfdaf2] text-slate-600 text-xs font-semibold py-1.5 px-2.5 rounded-lg outline-none focus:border-primary cursor-pointer shadow-xs"
            >
              <option value="All">Tất cả</option>
              {selectedProject?.modules?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Feature Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-505 uppercase tracking-wide text-slate-400">
              Chức năng:
            </span>
            <select
              value={selectedFeatureId}
              onChange={(e) => setSelectedFeatureId(e.target.value)}
              disabled={selectedModuleId === "All"}
              className="bg-white border border-[#cfdaf2] text-slate-600 text-xs font-semibold py-1.5 px-2.5 rounded-lg outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              <option value="All">Tất cả</option>
              {selectedProject?.modules
                ?.find((m) => m.id === selectedModuleId)
                ?.features?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-505 uppercase tracking-wide text-slate-400">
              Ưu tiên:
            </span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-white border border-[#cfdaf2] text-slate-600 text-xs font-semibold py-1.5 px-2.5 rounded-lg outline-none focus:border-primary cursor-pointer shadow-xs"
            >
              <option value="All">Tất cả</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <span className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></span>
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start flex-1 overflow-x-auto pb-4">
            {COLUMNS.map((column) => {
              const columnTasks = filteredTasks.filter((t) => t.status === column);
              return (
                <BoardColumn
                  key={column}
                  id={column}
                  title={column}
                  count={columnTasks.length}
                >
                  <div className="flex flex-col gap-3 min-h-[300px]">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => {
                          // Allow opening details only when online, or alert user
                          if (isOnline()) {
                            setSelectedTaskId(task.id);
                            setDetailOpen(true);
                          } else {
                            alert("Vui lòng kết nối mạng để xem và chỉnh sửa chi tiết tác vụ, checklist và bình luận.");
                          }
                        }}
                      />
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="flex-1 border-2 border-dashed border-[#cfdaf2]/40 rounded-xl flex items-center justify-center p-6 text-slate-300 font-sans text-xs text-center select-none py-10">
                        Kéo thả tác vụ vào đây
                      </div>
                    )}
                  </div>
                </BoardColumn>
              );
            })}
          </div>
        </DndContext>
      )}

      {/* Task Detail Sidebar Drawer */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={() => selectedProject && fetchTasks(selectedProject.id)}
        projectMembers={selectedProject?.members || []}
      />

      {/* Create Task Center Modal */}
      {createOpen && selectedProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#cfdaf2] max-w-md w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-[#111c2d]">Tạo Tác Vụ Mới</h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <span className="material-symbols-outlined block text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Tiêu đề tác vụ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề công việc..."
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full border border-[#cfdaf2] rounded-lg px-3 py-2 outline-none focus:border-primary placeholder-slate-400 bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả chi tiết..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full border border-[#cfdaf2] rounded-lg p-3 outline-none focus:border-primary placeholder-slate-400 bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Phân hệ (Module)
                  </label>
                  <select
                    value={createForm.moduleId}
                    onChange={(e) => setCreateForm({ ...createForm, moduleId: e.target.value, parentFeatureId: "", featureId: "" })}
                    className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none text-slate-700"
                  >
                    <option value="">Không có</option>
                    {selectedProject.modules?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                      Chức năng cha
                    </label>
                    <select
                      value={createForm.parentFeatureId}
                      onChange={(e) => setCreateForm({ ...createForm, parentFeatureId: e.target.value, featureId: "" })}
                      disabled={!createForm.moduleId}
                      className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Không có</option>
                      {selectedProject.modules
                        ?.find((m) => m.id === createForm.moduleId)
                        ?.features?.filter((f) => !f.parentFeatureId)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                      Chức năng con
                    </label>
                    <select
                      value={createForm.featureId}
                      onChange={(e) => setCreateForm({ ...createForm, featureId: e.target.value })}
                      disabled={!createForm.parentFeatureId}
                      className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Không có</option>
                      {selectedProject.modules
                        ?.find((m) => m.id === createForm.moduleId)
                        ?.features?.filter((f) => f.parentFeatureId === createForm.parentFeatureId)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Độ ưu tiên
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none text-slate-700"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Trạng thái
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none text-slate-700"
                  >
                    <option value="Backlog">Backlog</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Giao cho (Assignee)
                  </label>
                  <SearchableSelect
                    value={createForm.assigneeId}
                    onChange={(val) => setCreateForm({ ...createForm, assigneeId: val })}
                    placeholder="Chọn người thực hiện..."
                    options={selectedProject.members.map((m: any) => ({
                      value: m.user?.id,
                      label: m.user?.fullName,
                      subLabel: m.user?.email,
                      avatarUrl: m.user?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">
                    Ngày hết hạn
                  </label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full bg-white border border-[#cfdaf2] rounded-lg p-2 outline-none text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md mt-2 transition-colors"
              >
                Tạo Tác Vụ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Droppable Column Component
interface ColumnProps {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}

function BoardColumn({ id, title, count, children }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const getColumnStyles = () => {
    switch (title) {
      case "Backlog":
        return { bg: "bg-slate-100/60 text-slate-700", dot: "bg-slate-400" };
      case "In Progress":
        return { bg: "bg-blue-50 text-blue-700", dot: "bg-blue-500" };
      case "Review":
        return { bg: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
      case "Completed":
        return { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
      default:
        return { bg: "bg-slate-100 text-slate-700", dot: "bg-slate-400" };
    }
  };

  const style = getColumnStyles();

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-4 bg-slate-50/50 border border-[#cfdaf2]/50 p-4 rounded-xl min-w-[270px] w-full flex-1 max-h-[80vh] overflow-y-auto transition-all ${
        isOver ? "bg-blue-50/20 border-primary border-2 border-dashed shadow-inner" : ""
      }`}
    >
      <div className="flex items-center justify-between font-sans">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
          <span className="font-bold text-sm text-[#111c2d] tracking-tight">{title}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-sans ${style.bg}`}>
          {count}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-3">{children}</div>
    </div>
  );
}

// Draggable Task Card Component
interface CardProps {
  task: Task;
  onClick: () => void;
}

function TaskCard({ task, onClick }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-50 text-red-600 border border-red-100";
      case "Medium":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      default:
        return "bg-emerald-50 text-emerald-600 border border-emerald-100";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const months = [
      "Th01", "Th02", "Th03", "Th04", "Th05", "Th06",
      "Th07", "Th08", "Th09", "Th10", "Th11", "Th12"
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white border border-[#cfdaf2] rounded-xl p-4 flex flex-col gap-3 shadow-xs cursor-default select-none hover:shadow-md hover:border-blue-200 transition-all duration-200 ${
        isDragging ? "opacity-30 shadow-none border-dashed border-[#cfdaf2]" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${getPriorityBadge(task.priority)}`}>
          {task.priority}
        </span>
        <div
          {...listeners}
          className="p-1 rounded hover:bg-slate-100 cursor-grab active:cursor-grabbing text-slate-400"
          title="Kéo để di chuyển"
        >
          <span className="material-symbols-outlined block text-[18px]">drag_indicator</span>
        </div>
      </div>

      <div onClick={onClick} className="cursor-pointer group flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
            {task.taskCode}
          </span>
          <h4 className="font-semibold text-[15px] text-[#111c2d] leading-snug group-hover:text-primary transition-colors">
            {task.title}
          </h4>
        </div>

        {(task.module || task.feature) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {task.module && (
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5 max-w-full overflow-hidden">
                <span className="material-symbols-outlined text-[13px] text-blue-500 shrink-0">folder_open</span>
                <span className="truncate" title={task.module.name}>
                  {task.module.name}
                </span>
              </div>
            )}
            {task.feature && (
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5 max-w-full overflow-hidden">
                <span className="material-symbols-outlined text-[13px] text-teal-500 shrink-0">extension</span>
                <span className="truncate" title={task.feature.name}>
                  {task.feature.name}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {task.dueDate && (
            <div className="flex items-center gap-1 font-medium bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}

          {totalSubtasks > 0 && (
            <div className="flex items-center gap-1 font-medium bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
              <span className="material-symbols-outlined text-[14px]">checklist</span>
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
          )}
        </div>

        <div>
          {task.assignee ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={task.assignee.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
              alt={task.assignee.fullName}
              title={task.assignee.fullName}
              className="w-6 h-6 rounded-full object-cover shadow-sm ring-1 ring-slate-150"
            />
          ) : (
            <span className="material-symbols-outlined text-[20px] text-slate-300" title="Chưa phân công">
              account_circle
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
