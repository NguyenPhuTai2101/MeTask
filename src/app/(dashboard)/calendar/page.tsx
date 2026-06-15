"use client";

import React, { useState, useEffect } from "react";
import TaskDetailModal from "@/components/TaskDetailModal";

interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

interface Task {
  id: string;
  taskCode: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  assignee: User | null;
  reporter: User | null;
  subtasks: any[];
  comments: any[];
}

interface Project {
  id: string;
  name: string;
  members: { user: User; role: string }[];
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "gantt">("calendar");

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Task Details Drawer State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/projects"),
      ]);

      if (tasksRes.ok && projectsRes.ok) {
        const tasksData = await tasksRes.json();
        const projectsData = await projectsRes.json();
        setTasks(tasksData);
        setProjects(projectsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Combine members of all projects for the detail modal
  const allProjectMembers = React.useMemo(() => {
    const map = new Map<string, { user: User; role: string }>();
    projects.forEach((proj) => {
      proj.members.forEach((m) => {
        map.set(m.user.id, m);
      });
    });
    return Array.from(map.values());
  }, [projects]);

  // Calendar calculations
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    
    // Fill previous month days
    const firstDayIndex = firstDay.getDay(); // 0 is Sunday
    // Map Sunday (0) to index 6, Monday (1) to index 0, etc. (European/Vietnamese standard starts on Monday)
    const prevDaysOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = prevDaysOffset; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i + 1),
        isCurrentMonth: false,
      });
    }

    // Fill current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Fill next month days to make a grid of 42 cells (6 rows of 7 days)
    const totalCells = 42;
    const nextDaysNeeded = totalCells - days.length;
    for (let i = 1; i <= nextDaysNeeded; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const daysGrid = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
  };

  // Gantt Calculations
  const getGanttTimelineDays = () => {
    // Return last 7 days and next 21 days (total 4 weeks timeline)
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const timeline = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      timeline.push(d);
    }
    return timeline;
  };

  const timelineDays = getGanttTimelineDays();

  // Helper to color tasks by priority
  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case "High":
        return "bg-red-500 text-white";
      case "Medium":
        return "bg-amber-500 text-white";
      default:
        return "bg-emerald-500 text-white";
    }
  };

  // Helper to color task bars by status in Gantt
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "Backlog":
        return "bg-blue-100 border-blue-200 text-blue-800";
      case "In Progress":
        return "bg-orange-100 border-orange-200 text-orange-800";
      case "Review":
        return "bg-amber-100 border-amber-200 text-amber-800";
      default:
        return "bg-emerald-100 border-emerald-200 text-emerald-800";
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Lịch công việc</h1>
          <p className="text-slate-500 text-xs mt-1">
            Xem kế hoạch công việc và phân bổ thời gian dưới dạng lịch biểu hoặc Gantt timeline.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-[#cfdaf2]/60">
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === "calendar" ? "bg-white text-primary shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            Lịch Tháng
          </button>
          <button
            onClick={() => setViewMode("gantt")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === "gantt" ? "bg-white text-primary shadow-xs" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">stacked_bar_chart</span>
            Tiến độ Gantt
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
        </div>
      ) : viewMode === "calendar" ? (
        /* CALENDAR VIEW */
        <div className="bg-white border border-[#cfdaf2] rounded-xl shadow-xs overflow-hidden">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#cfdaf2]">
            <h2 className="text-base font-bold text-[#111c2d]">
              Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-[#cfdaf2] hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined block text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-[#cfdaf2] hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined block text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Weekday Titles */}
          <div className="grid grid-cols-7 border-b border-slate-100 text-center py-2 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div>Thứ 2</div>
            <div>Thứ 3</div>
            <div>Thứ 4</div>
            <div>Thứ 5</div>
            <div>Thứ 6</div>
            <div>Thứ 7</div>
            <div className="text-red-500">Chủ Nhật</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 grid-rows-6 min-h-[500px]">
            {daysGrid.map((cell, idx) => {
              // Get tasks due on this date
              const dateString = cell.date.toISOString().split("T")[0];
              const daysTasks = tasks.filter((t) => t.dueDate && t.dueDate.split("T")[0] === dateString);

              return (
                <div
                  key={idx}
                  className={`border-r border-b border-slate-100 p-2 min-h-[80px] flex flex-col gap-1.5 ${
                    cell.isCurrentMonth ? "bg-white" : "bg-slate-50/30 text-slate-400"
                  }`}
                >
                  <span className={`text-xs font-bold ${!cell.isCurrentMonth ? "text-slate-350" : "text-[#111c2d]"}`}>
                    {cell.date.getDate()}
                  </span>
                  
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-24">
                    {daysTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleOpenTask(t.id)}
                        className={`text-[9px] font-semibold p-1 rounded truncate text-left w-full hover:brightness-95 transition-all ${getPriorityColor(
                          t.priority
                        )}`}
                      >
                        {t.taskCode}: {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* GANTT TIMELINE VIEW */
        <div className="bg-white border border-[#cfdaf2] rounded-xl shadow-xs overflow-x-auto p-6">
          <div className="min-w-[800px] flex flex-col">
            {/* Timeline Header Row */}
            <div className="flex border-b border-slate-100 pb-2 mb-4">
              <div className="w-1/3 font-bold text-xs text-slate-400 uppercase tracking-wider">Mã / Tiêu đề Công việc</div>
              <div className="w-2/3 grid grid-cols-28 text-center text-[9px] font-bold text-slate-400 uppercase">
                {timelineDays.map((d, idx) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={idx}
                      className={`py-1 ${isToday ? "bg-red-50 text-red-600 rounded font-black" : ""}`}
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gantt Rows */}
            <div className="flex flex-col gap-3">
              {tasks.map((task) => {
                // Calculate start and end offset indexes in timeline
                const creationDate = new Date(task.createdAt);
                const dueDate = task.dueDate ? new Date(task.dueDate) : new Date(creationDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                
                const startTimeline = timelineDays[0].getTime();
                const endTimeline = timelineDays[27].getTime();

                // If task starts after or ends before our 4-week window, don't render it or clip it
                const start = Math.max(creationDate.getTime(), startTimeline);
                const end = Math.min(dueDate.getTime(), endTimeline);

                if (start > endTimeline || end < startTimeline) return null;

                const startIdx = Math.floor((start - startTimeline) / (24 * 60 * 60 * 1000));
                const lengthDays = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));

                // CSS styles for positioning the bar
                const gridColumnStart = startIdx + 1;
                const gridColumnSpan = Math.min(lengthDays, 28 - startIdx);

                return (
                  <div key={task.id} className="flex items-center py-1.5 hover:bg-slate-55/20 rounded-lg transition-colors">
                    {/* Task Title Info */}
                    <div className="w-1/3 pr-4 truncate flex flex-col gap-0.5">
                      <button
                        onClick={() => handleOpenTask(task.id)}
                        className="text-left font-bold text-xs text-[#111c2d] hover:text-primary hover:underline truncate"
                      >
                        {task.taskCode}: {task.title}
                      </button>
                      <span className="text-[10px] text-slate-400">
                        {task.assignee ? task.assignee.fullName : "Chưa gán"}
                      </span>
                    </div>

                    {/* Task Bar */}
                    <div className="w-2/3 grid grid-cols-28 relative h-7 items-center">
                      <div
                        onClick={() => handleOpenTask(task.id)}
                        style={{
                          gridColumnStart: gridColumnStart,
                          gridColumnEnd: gridColumnStart + gridColumnSpan,
                        }}
                        className={`h-5 border rounded-md px-2 flex items-center justify-between text-[9px] font-bold shadow-xs truncate select-none cursor-pointer hover:shadow-md transition-all ${getStatusColorClass(
                          task.status
                        )}`}
                      >
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Task detail drawer */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={fetchData}
        projectMembers={allProjectMembers}
      />
    </div>
  );
}
