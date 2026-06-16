"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

interface Member {
  userId: string;
  projectId: string;
  role: string;
  workloadPercentage: number;
  user: User;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members: Member[];
  tasks: any[];
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [memberRole, setMemberRole] = useState("Member");
  const [memberWorkload, setMemberWorkload] = useState("40");
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;

    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
      });
      if (res.ok) {
        setNewProjectName("");
        setNewProjectDesc("");
        setShowCreateModal(false);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !selectedUser) return;

    setManaging(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser,
          role: memberRole,
          workloadPercentage: memberWorkload,
        }),
      });
      if (res.ok) {
        setSelectedUser("");
        // Refresh active project member list
        const updatedProjects = await fetch("/api/projects").then((r) => r.json());
        setProjects(updatedProjects);
        const freshProject = updatedProjects.find((p: Project) => p.id === activeProject.id);
        setActiveProject(freshProject || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setManaging(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeProject) return;
    if (confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi dự án?")) {
      try {
        const res = await fetch(`/api/projects/${activeProject.id}/members?userId=${userId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const updatedProjects = await fetch("/api/projects").then((r) => r.json());
          setProjects(updatedProjects);
          const freshProject = updatedProjects.find((p: Project) => p.id === activeProject.id);
          setActiveProject(freshProject || null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Dự án & Đội ngũ</h1>
          <p className="text-slate-500 text-xs mt-1">
            Quản lý danh sách các dự án đang triển khai và phân chia nhân lực làm việc.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-md shadow-blue-500/15 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tạo Dự Án Mới
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary animate-spin"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-dashed border-[#cfdaf2] rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-slate-300 text-[48px] mb-2">folder_open</span>
          <p className="text-slate-500 font-semibold text-sm">Chưa có dự án nào</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">Hãy bắt đầu bằng cách tạo một dự án mới đầu tiên.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              href={`/projects/${project.id}`}
              key={project.id}
              className="bg-white border border-[#cfdaf2] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer block"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[22px]">folder</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">
                    {project.tasks.length} Tác vụ
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#111c2d] mb-1 truncate">{project.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed min-h-[40px] line-clamp-2 mb-4">
                  {project.description || "Không có mô tả chi tiết."}
                </p>

                {/* Team members section */}
                <div className="border-t border-slate-100 pt-4 mb-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Đội ngũ ({project.members.length} người)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {project.members.map((member) => (
                      <div
                        key={member.userId}
                        title={`${member.user?.fullName || 'Ai đó'} (${member.role} - ${member.workloadPercentage}%)`}
                        className="relative group"
                      >
                        <img
                          src={member.user?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                          alt={member.user?.fullName || 'Ai đó'}
                          className="w-7 h-7 rounded-full object-cover border border-slate-100 ring-2 ring-slate-50"
                        />
                        {member.workloadPercentage > 100 && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-[#cfdaf2] text-slate-700 font-semibold text-xs py-2 rounded-lg transition-all">
                  Chi tiết Dự án
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal: Create Project */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#cfdaf2] rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_box</span>
                Tạo Dự Án Mới
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <span className="material-symbols-outlined block text-[22px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500" htmlFor="pName">
                  Tên Dự Án
                </label>
                <input
                  id="pName"
                  type="text"
                  placeholder="Ví dụ: App Mobile Khách Hàng"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="h-10 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] px-3 text-xs outline-none focus:border-primary focus:bg-white"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500" htmlFor="pDesc">
                  Mô tả Dự Án
                </label>
                <textarea
                  id="pDesc"
                  placeholder="Mô tả tóm tắt mục tiêu dự án..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="h-20 w-full rounded-lg bg-slate-50 border border-[#cfdaf2] p-3 text-xs outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full h-10 bg-primary hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-md active:scale-98 transition-all"
              >
                {creating ? "Đang tạo..." : "Xác Nhận Tạo"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
