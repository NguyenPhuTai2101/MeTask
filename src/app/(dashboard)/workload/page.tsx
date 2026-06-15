"use client";

import React, { useState, useEffect } from "react";

interface User {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  email: string;
}

interface TeamMember {
  userId: string;
  projectId: string;
  role: string;
  workloadPercentage: number;
  user: User;
}

interface Task {
  id: string;
  taskCode: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  members: TeamMember[];
}

export default function TeamWorkload() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkloadData();
  }, []);

  const fetchWorkloadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Projects & Members
      const pRes = await fetch("/api/projects");
      if (pRes.ok) {
        const projList: Project[] = await pRes.json();
        setProjects(projList);
        if (projList.length > 0) {
          setSelectedProject(projList[0]);
          
          // 2. Fetch Tasks to calculate progress and show list
          const tRes = await fetch(`/api/tasks?projectId=${projList[0].id}`);
          if (tRes.ok) {
            const taskList: Task[] = await tRes.json();
            setTasks(taskList);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load workload data", e);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const overallProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Overloaded members
  const overloadedMembers = selectedProject?.members.filter(
    (m) => m.workloadPercentage > 100
  ) || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header Panel */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">
          Tải Trọng Đội Ngũ (Team Workload)
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Theo dõi phân bổ công việc và công suất làm việc của các thành viên.
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <span className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></span>
        </div>
      ) : (
        <>
          {/* Overcapacity Alerts (Cảnh báo quá tải) */}
          {overloadedMembers.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start animate-fade-in shadow-xs">
              <span className="material-symbols-outlined text-red-600 block text-[24px] select-none mt-0.5">
                warning
              </span>
              <div className="flex-1">
                <h4 className="font-bold text-red-800 text-sm">Cảnh Báo Quá Tải Công Việc!</h4>
                <p className="text-xs text-red-700 leading-normal mt-1">
                  Có {overloadedMembers.length} thành viên đang làm việc vượt quá 100% công suất
                  ước tính. Vui lòng cân nhắc điều chuyển bớt các tác vụ chưa bắt đầu để đảm bảo sức khỏe đội ngũ.
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {overloadedMembers.map((m) => (
                    <span
                      key={m.userId}
                      className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded-md border border-red-200"
                    >
                      {m.user.fullName}: {m.workloadPercentage}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Grid section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Column: Overall Progress Card */}
            <div className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-sm flex flex-col gap-5">
              <h3 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
                Tiến Độ Dự Án Tổng Thể
              </h3>

              {/* Progress Ring / Gauge style visual */}
              <div className="flex flex-col items-center justify-center py-6 gap-3 border-b border-slate-50">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* SVG Circle indicator */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-slate-100"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-primary transition-all duration-500"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={402}
                      strokeDashoffset={402 - (402 * overallProgressPercent) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold text-[#111c2d]">
                      {overallProgressPercent}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      Hoàn thành
                    </span>
                  </div>
                </div>
                
                <p className="text-xs font-semibold text-slate-500 mt-2 text-center">
                  Đã giải quyết {completedTasks} trên tổng số {totalTasks} tác vụ của dự án
                </p>
              </div>

              {/* Mini task metrics list */}
              <div className="flex justify-between items-center text-xs font-sans text-slate-600 px-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-bold text-base text-[#111c2d]">
                    {tasks.filter((t) => t.status === "Backlog").length}
                  </span>
                  <span>Backlog</span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="flex flex-col items-center gap-1">
                  <span className="font-bold text-base text-blue-600">
                    {tasks.filter((t) => t.status === "In Progress").length}
                  </span>
                  <span>In Progress</span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="flex flex-col items-center gap-1">
                  <span className="font-bold text-base text-amber-500">
                    {tasks.filter((t) => t.status === "Review").length}
                  </span>
                  <span>Review</span>
                </div>
              </div>
            </div>

            {/* Right Columns: Team Workload Progress bars list (Takes 2 columns) */}
            <div className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-sm lg:col-span-2 flex flex-col gap-6">
              <h3 className="font-bold text-[#111c2d] text-sm uppercase tracking-wider">
                Chi Tiết Tải Trọng Nhân Sự
              </h3>

              <div className="flex flex-col gap-6">
                {selectedProject?.members.map((member) => {
                  const memberTasks = tasks.filter(
                    (t) => t.assigneeId === member.userId && t.status !== "Completed"
                  );
                  const isOverload = member.workloadPercentage > 100;
                  
                  // Compute color tokens based on capacity
                  const barColor = isOverload
                    ? "bg-red-500"
                    : member.workloadPercentage > 80
                    ? "bg-amber-500"
                    : "bg-primary";
                    
                  const badgeStyle = isOverload
                    ? "bg-red-50 text-red-700 border-red-200"
                    : member.workloadPercentage > 80
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-blue-50 text-primary border-blue-200";

                  return (
                    <div
                      key={member.userId}
                      className="border border-[#cfdaf2]/50 rounded-xl p-4 flex flex-col gap-4 bg-slate-50/20"
                    >
                      {/* Member Info Row */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={member.user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                            alt={member.user.fullName}
                            className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-white"
                          />
                          <div>
                            <h4 className="font-bold text-sm text-[#111c2d]">
                              {member.user.fullName}
                            </h4>
                            <p className="text-xs text-slate-400 font-medium">
                              {member.role}
                            </p>
                          </div>
                        </div>

                        {/* Capacity Percentage Badge */}
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeStyle}`}>
                          {isOverload ? "⚠️ Quá tải" : "Định mức"}: {member.workloadPercentage}%
                        </span>
                      </div>

                      {/* Workload Progress Bar */}
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden w-full relative">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{
                              width: `${Math.min(member.workloadPercentage, 100)}%`,
                            }}
                          ></div>
                          {/* Indicator line for 100% capacity */}
                          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-red-600/40" title="100% Capacity limit"></div>
                        </div>
                      </div>

                      {/* Assigned Pending Tasks Details */}
                      {memberTasks.length > 0 ? (
                        <div className="flex flex-col gap-2 mt-1">
                          <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                            Tác vụ đang xử lý ({memberTasks.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {memberTasks.map((t) => (
                              <span
                                key={t.id}
                                className="inline-flex items-center text-[10px] font-sans font-semibold bg-white border border-[#cfdaf2] px-2.5 py-1 rounded-md text-slate-700 shadow-2xs"
                              >
                                {t.taskCode}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-medium italic mt-1">
                          Không có tác vụ đang chờ xử lý.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
