"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from "@/context/AuthContext";

interface Metric {
  activeProjects: number;
  pendingTasks: number;
  milestones: number;
}

interface TeamPerformance {
  name: string;
  "Hoàn thành": number;
  "Đang xử lý": number;
}

interface Activity {
  id: string;
  user: string;
  avatar: string | null;
  action: string;
  target: string;
  time: string;
}

interface Task {
  id: string;
  taskCode: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  
  // State variables
  const [metrics, setMetrics] = useState<Metric>({ activeProjects: 0, pendingTasks: 0, milestones: 0 });
  const [performanceData, setPerformanceData] = useState<TeamPerformance[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Pass user email or id to fetch tasks assigned to them
      const res = await fetch(`/api/dashboard?userId=${user?.email}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setPerformanceData(data.teamPerformance);
        setActivities(data.recentActivity);
        setMyTasks(data.myTasks);
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  // Toggle my task completion
  const handleToggleTask = async (taskId: string, isChecked: boolean) => {
    // Optimistic Update
    setMyTasks((prev) => prev.filter((t) => t.id !== taskId)); // Remove from pending list

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isChecked ? "Completed" : "In Progress" }),
      });

      if (res.ok) {
        // Refetch stats to keep metrics accurate
        const resStats = await fetch(`/api/dashboard?userId=${user?.email}`);
        if (resStats.ok) {
          const freshData = await resStats.json();
          setMetrics(freshData.metrics);
          setPerformanceData(freshData.teamPerformance);
        }
      } else {
        // Revert on error
        fetchDashboardData();
      }
    } catch (e) {
      console.error("Failed to update task status:", e);
      fetchDashboardData();
    }
  };

  const formatRelativeTime = (timeString: string) => {
    const date = new Date(timeString);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    const diffHr = Math.round(diffMs / 3600000);

    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHr < 24) return `${diffHr} giờ trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">
          Chào buổi sáng, {user?.fullName || "Thành viên"}!
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Dưới đây là tổng quan hiệu suất dự án và công việc cá nhân của bạn hôm nay.
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <span className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></span>
        </div>
      ) : (
        <>
          {/* Metrics Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Widget 1: Active Projects */}
            <div className="bg-white border border-[#cfdaf2] p-5 rounded-xl flex items-center gap-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[26px]">folder_open</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Dự Án Đang Chạy
                </p>
                <h3 className="text-2xl font-bold text-[#111c2d] mt-1">
                  {metrics.activeProjects}
                </h3>
              </div>
            </div>

            {/* Widget 2: Pending Tasks */}
            <div className="bg-white border border-[#cfdaf2] p-5 rounded-xl flex items-center gap-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                <span className="material-symbols-outlined text-[26px]">assignment_late</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Tác Vụ Đang Chờ
                </p>
                <h3 className="text-2xl font-bold text-[#111c2d] mt-1">
                  {metrics.pendingTasks}
                </h3>
              </div>
            </div>

            {/* Widget 3: Milestones / Completed */}
            <div className="bg-white border border-[#cfdaf2] p-5 rounded-xl flex items-center gap-4 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                <span className="material-symbols-outlined text-[26px]">emoji_events</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Tác Vụ Hoàn Thành
                </p>
                <h3 className="text-2xl font-bold text-[#111c2d] mt-1">
                  {metrics.milestones}
                </h3>
              </div>
            </div>
          </div>

          {/* Charts & Activities Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Chart: Team Performance (Takes 2 columns on large screens) */}
            <div className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col gap-4">
              <h3 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
                Hiệu Suất Đội Ngũ (Team Performance)
              </h3>
              <div className="h-[280px] w-full font-sans text-xs">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performanceData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip cursor={{ fill: "#f8fafc" }} />
                      <Legend wrapperStyle={{ paddingTop: "10px" }} />
                      <Bar dataKey="Hoàn thành" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Đang xử lý" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Sidebar: Recent Activity */}
            <div className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-sm flex flex-col gap-4 h-full">
              <h3 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
                Hoạt Động Gần Đây (Recent Activity)
              </h3>
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[280px] pr-1">
                {activities.map((act) => (
                  <div key={act.id} className="flex gap-3 text-xs items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={act.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                      alt={act.user}
                      className="w-7 h-7 rounded-full object-cover shadow-sm ring-1 ring-slate-100 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-slate-600 leading-normal">
                        <span className="font-bold text-[#111c2d]">{act.user}</span>{" "}
                        {act.action}{" "}
                        <span className="font-semibold text-primary">{act.target}</span>
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                        {formatRelativeTime(act.time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* My Tasks Checklist */}
          <div className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
                Công Việc Cá Nhân Đang Chờ (My Tasks - Checklist)
              </h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {myTasks.length} tác vụ
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {myTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group"
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      onChange={(e) => handleToggleTask(t.id, e.target.checked)}
                      className="rounded border-[#cfdaf2] text-primary focus:ring-primary h-4.5 w-4.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono font-bold text-slate-400 leading-none">
                        {t.taskCode}
                      </span>
                      <span className="font-bold text-sm text-[#111c2d] mt-1 group-hover:text-primary transition-colors">
                        {t.title}
                      </span>
                    </div>
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    t.priority === "High"
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : t.priority === "Medium"
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))}
              {myTasks.length === 0 && (
                <div className="border border-dashed border-[#cfdaf2]/40 rounded-lg p-8 text-center text-slate-400 text-sm py-10 font-sans">
                  Tuyệt vời! Bạn đã hoàn thành toàn bộ các tác vụ được giao.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
